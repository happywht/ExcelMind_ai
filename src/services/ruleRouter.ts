/**
 * 规则路由器
 * 智能选择执行器（本地或AI）并批量执行规则
 */

import {
  QualityRule,
  RuleExecutionResult,
  BatchExecutionResult,
  RuleExecutionOptions
} from '../types/qualityRule';
import { localRuleExecutor } from './localRuleExecutor';
import { aiRuleExecutor } from './aiRuleExecutor';
import { qualityRuleStorage } from './qualityRuleStorage';

/**
 * 规则路由器类
 */
export class RuleRouter {
  /**
   * 批量执行规则
   */
  async executeRules(
    rules: QualityRule[],
    data: any[],
    options: Partial<RuleExecutionOptions> = {}
  ): Promise<BatchExecutionResult> {
    const startTime = Date.now();

    // 过滤出启用的规则
    const enabledRules = rules.filter(r => r.isEnabled);

    if (enabledRules.length === 0) {
      return {
        totalRules: rules.length,
        executedRules: 0,
        skippedRules: rules.length,
        results: [],
        overallSummary: '没有启用的规则',
        totalExecutionTime: 0
      };
    }

    // 分组规则
    const localRules = enabledRules.filter(r => r.executionType === 'local');
    const aiRules = enabledRules.filter(r => r.executionType === 'ai');

    // 并行执行本地规则（快速）
    const localResults = await this.executeLocalRules(localRules, data, options);

    // 串行执行AI规则（有成本，需要控制）
    const aiResults = await this.executeAIRules(aiRules, data, options);

    // 合并结果
    const results = [...localResults, ...aiResults];

    // 更新使用次数
    for (const rule of enabledRules) {
      await qualityRuleStorage.incrementUsage(rule.id);
    }

    // 构建批量结果
    return {
      totalRules: rules.length,
      executedRules: enabledRules.length,
      skippedRules: rules.length - enabledRules.length,
      results,
      overallSummary: this.buildOverallSummary(results, data.length),
      totalExecutionTime: Date.now() - startTime
    };
  }

  /**
   * 执行本地规则
   */
  private async executeLocalRules(
    rules: QualityRule[],
    data: any[],
    options: Partial<RuleExecutionOptions>
  ): Promise<RuleExecutionResult[]> {
    if (rules.length === 0) return [];

    // 并行执行本地规则（它们很快且免费）
    const promises = rules.map(rule =>
      localRuleExecutor.executeRule(rule, data, options)
    );

    return Promise.all(promises);
  }

  /**
   * 执行AI规则
   */
  private async executeAIRules(
    rules: QualityRule[],
    data: any[],
    options: Partial<RuleExecutionOptions>
  ): Promise<RuleExecutionResult[]> {
    if (rules.length === 0) return [];

    // AI规则串行执行（控制成本和速率）
    const results: RuleExecutionResult[] = [];

    for (const rule of rules) {
      try {
        const result = await aiRuleExecutor.executeRule(rule, data, options);
        results.push(result);
      } catch (error) {
        // 单个规则失败不影响其他规则
        console.error(`AI规则执行失败 (${rule.name}):`, error);
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          pass: false,
          issues: [],
          summary: `执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
          suggestions: ['请稍后重试', '尝试使用本地规则'],
          executionTime: 0,
          checkedRows: 0,
          issueRows: 0
        });
      }
    }

    return results;
  }

  /**
   * 执行单个规则（智能选择执行器）
   */
  async executeSingleRule(
    rule: QualityRule,
    data: any[],
    options: Partial<RuleExecutionOptions> = {}
  ): Promise<RuleExecutionResult> {
    // 根据执行类型选择执行器
    if (rule.executionType === 'local') {
      return localRuleExecutor.executeRule(rule, data, options);
    } else if (rule.executionType === 'ai') {
      return aiRuleExecutor.executeRule(rule, data, options);
    } else {
      // hybrid模式：先本地检查，必要时再用AI
      return this.executeHybridRule(rule, data, options);
    }
  }

  /**
   * 执行混合规则
   */
  private async executeHybridRule(
    rule: QualityRule,
    data: any[],
    options: Partial<RuleExecutionOptions>
  ): Promise<RuleExecutionResult> {
    // 先尝试本地执行
    if (rule.localRule) {
      const localResult = await localRuleExecutor.executeRule(rule, data, options);

      // 如果本地执行发现问题，使用AI进行深度分析
      if (!localResult.pass && localResult.issues.length > 0) {
        console.log(`本地规则发现问题，使用AI深度分析: ${rule.name}`);
        const aiResult = await aiRuleExecutor.executeRule(rule, data, {
          ...options,
          sampleSize: Math.min(50, data.length) // 限制采样数量
        });

        // 合并结果
        return {
          ...localResult,
          issues: [...localResult.issues, ...aiResult.issues],
          suggestions: [
            ...localResult.suggestions,
            ...aiResult.suggestions
          ],
          summary: `${localResult.summary}，AI深度分析: ${aiResult.summary}`,
          executionTime: localResult.executionTime + aiResult.executionTime
        };
      }

      return localResult;
    }

    // 没有本地规则，直接使用AI
    return aiRuleExecutor.executeRule(rule, data, options);
  }

  /**
   * 构建总体摘要
   */
  private buildOverallSummary(results: RuleExecutionResult[], totalRows: number): string {
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const totalIssueRows = results.reduce((sum, r) => sum + r.issueRows, 0);

    const passRate = ((passed / results.length) * 100).toFixed(1);

    return `
执行完成！
- 总规则数：${results.length}
- 通过：${passed} (${passRate}%)
- 失败：${failed}
- 问题总数：${totalIssues}
- 问题行数：${totalIssueRows} / ${totalRows}
    `.trim();
  }

  /**
   * 获取规则执行建议
   */
  async getExecutionSuggestions(rules: QualityRule[], dataRowCount: number): Promise<string[]> {
    const suggestions: string[] = [];

    // 检查规则配置
    const localRules = rules.filter(r => r.executionType === 'local');
    const aiRules = rules.filter(r => r.executionType === 'ai');

    if (localRules.length === 0) {
      suggestions.push('建议添加本地规则以加快执行速度');
    }

    if (aiRules.length > 5) {
      suggestions.push('AI规则较多，执行可能较慢且有成本，建议优先使用本地规则');
    }

    if (dataRowCount > 10000) {
      suggestions.push('数据量较大，建议使用采样检查以加快速度');
    }

    // 检查规则覆盖
    const categories = new Set(rules.map(r => r.category));
    if (!categories.has('格式检查')) {
      suggestions.push('建议添加格式检查规则');
    }
    if (!categories.has('完整性检查')) {
      suggestions.push('建议添加完整性检查规则');
    }

    return suggestions;
  }

  /**
   * 清空所有执行器缓存
   */
  clearAllCaches(): void {
    localRuleExecutor.clearCache();
    aiRuleExecutor.clearCache();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { local: number; ai: number } {
    return {
      local: localRuleExecutor.getCacheSize(),
      ai: aiRuleExecutor.getCacheSize()
    };
  }
}

// 导出单例
export const ruleRouter = new RuleRouter();
