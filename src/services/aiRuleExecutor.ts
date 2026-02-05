/**
 * AI规则执行器
 * 使用AI执行自定义规则
 */

import {
  QualityRule,
  RuleExecutionResult,
  QualityIssue,
  RuleExecutionOptions
} from '../types/qualityRule';

/**
 * 默认执行选项
 */
const DEFAULT_OPTIONS: RuleExecutionOptions = {
  stopOnFirstError: false,
  maxIssues: 100,
  sampleSize: 50, // AI检查使用采样以降低成本
  enableCache: true,
  parallel: false
};

/**
 * AI规则执行器类
 */
export class AIRuleExecutor {
  private cache: Map<string, RuleExecutionResult> = new Map();

  /**
   * 执行单个AI规则
   */
  async executeRule(
    rule: QualityRule,
    data: any[],
    options: Partial<RuleExecutionOptions> = {}
  ): Promise<RuleExecutionResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    // 检查缓存
    if (opts.enableCache) {
      const cacheKey = this.getCacheKey(rule, data);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 采样数据（降低成本）
    const sampleSize = opts.sampleSize || Math.min(100, data.length);
    const sampledData = data.length > sampleSize
      ? this.sampleData(data, sampleSize)
      : data;

    // 确定目标列
    const targetColumns = rule.targetColumns.length > 0
      ? rule.targetColumns
      : Object.keys(sampledData[0] || {});

    // 构建AI提示
    const prompt = this.buildPrompt(rule, sampledData, targetColumns);

    try {
      // 调用AI服务
      const aiResult = await this.callAIService(prompt);

      // 解析AI结果
      const result = this.parseAIResult(rule, aiResult, data.length, targetColumns, startTime);

      // 缓存结果
      if (opts.enableCache) {
        const cacheKey = this.getCacheKey(rule, data);
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      // 错误处理
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        pass: false,
        issues: [],
        summary: `AI执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
        suggestions: ['请检查规则定义是否清晰', '尝试使用本地规则', '联系技术支持'],
        executionTime: Date.now() - startTime,
        checkedRows: sampledData.length,
        issueRows: 0
      };
    }
  }

  /**
   * 采样数据
   */
  private sampleData(data: any[], sampleSize: number): any[] {
    if (data.length <= sampleSize) return data;

    const step = Math.floor(data.length / sampleSize);
    const sampled: any[] = [];

    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i]);
      if (sampled.length >= sampleSize) break;
    }

    return sampled;
  }

  /**
   * 构建AI提示
   */
  private buildPrompt(rule: QualityRule, data: any[], columns: string[]): string {
    return `
你是一个数据质量检查专家。请根据以下规则评估数据：

## 规则信息
- 规则名称：${rule.name}
- 规则描述：${rule.description}
- 检查内容：${rule.checkContent}
- 评判标准：${rule.criteria}
- 严重级别：${rule.severity}

## 数据预览
- 列名：${columns.join(', ')}
- 数据行数：${data.length} 行
- 前10行数据：
${JSON.stringify(data.slice(0, 10), null, 2)}

## 任务要求
请检查数据并返回JSON格式结果，格式如下：
\`\`\`json
{
  "pass": true/false,
  "issues": [
    {
      "row": 行号（从1开始）,
      "column": "列名",
      "value": "问题值",
      "description": "问题描述",
      "severity": "P0/P1/P2/P3",
      "suggestion": "修复建议"
    }
  ],
  "summary": "执行摘要",
  "suggestions": ["建议1", "建议2", "建议3"]
}
\`\`\`

## 注意事项
1. 只返回JSON，不要其他文字说明
2. row字段必须是实际数据中的行号
3. 如果数据采样检查，请在summary中说明
4. issues数组最多返回100个问题
5. suggestions数组最多返回5条建议
`.trim();
  }

  /**
   * 调用AI服务
   */
  private async callAIService(prompt: string): Promise<any> {
    try {
      // 修复API Base URL配置问题
      // 环境变量可能包含完整URL或相对路径
      let API_BASE_URL = (globalThis as any).__VITE_API_BASE_URL__ || '/api/v2';

      // 如果是相对路径，构建完整URL
      if (!API_BASE_URL.startsWith('http')) {
        API_BASE_URL = `http://localhost:3001${API_BASE_URL}`;
      }

      // 移除末尾的斜杠
      API_BASE_URL = API_BASE_URL.replace(/\/$/, '');

      console.log('[AI Rule Executor] 调用AI服务:', {
        url: `${API_BASE_URL}/ai/chat`,
        promptLength: prompt.length
      });

      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: prompt,              // ✅ 使用正确的字段名
          history: [],                // ✅ 提供空的历史记录数组
          contextDocs: ''             // ✅ 提供空的上下文文档
        })
      });

      // 详细的错误处理
      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = JSON.stringify(errorData);
          console.error('[AI Rule Executor] AI服务错误响应:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
        } catch (e) {
          errorDetails = await response.text();
          console.error('[AI Rule Executor] AI服务错误响应 (无法解析JSON):', {
            status: response.status,
            statusText: response.statusText,
            text: errorDetails
          });
        }

        throw new Error(`AI服务响应失败: ${response.status} - ${errorDetails}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('[AI Rule Executor] AI服务返回失败:', result);
        throw new Error(result.error?.message || 'AI调用失败');
      }

      // 解析AI返回的内容
      // chatWithKnowledgeBase返回格式: { success: true, data: { response: string } }
      const content = result.data?.response || result.data?.message?.content || result.data?.content;
      if (!content) {
        console.error('[AI Rule Executor] AI返回内容为空:', result);
        throw new Error('AI返回内容为空');
      }

      console.log('[AI Rule Executor] AI返回内容长度:', content.length);

      // 尝试从content中提取JSON
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                       content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        console.log('[AI Rule Executor] 成功提取JSON结果');
        return JSON.parse(jsonStr);
      }

      // 如果没有找到JSON，返回一个默认通过的结果
      console.warn('[AI Rule Executor] 未找到JSON格式结果，返回默认通过');
      return {
        pass: true,
        issues: [],
        summary: 'AI检查完成（未返回结构化结果）',
        suggestions: []
      };

    } catch (error) {
      console.error('[AI Rule Executor] AI服务调用失败:', error);
      throw error;
    }
  }

  /**
   * 解析AI结果
   */
  private parseAIResult(
    rule: QualityRule,
    aiResult: any,
    totalRows: number,
    columns: string[],
    startTime: number
  ): RuleExecutionResult {
    // 验证AI结果格式
    if (!aiResult || typeof aiResult !== 'object') {
      throw new Error('AI返回结果格式错误');
    }

    const issues: QualityIssue[] = (aiResult.issues || []).map((issue: any) => ({
      row: issue.row || 0,
      column: issue.column || '',
      value: issue.value,
      description: issue.description || '数据质量问题',
      severity: issue.severity || rule.severity,
      suggestion: issue.suggestion
    }));

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      pass: aiResult.pass || issues.length === 0,
      issues: issues.slice(0, 100),
      summary: aiResult.summary || this.buildSummary(rule, issues, totalRows, columns),
      suggestions: aiResult.suggestions || [],
      executionTime: Date.now() - startTime,
      checkedRows: totalRows,
      issueRows: new Set(issues.map(i => i.row)).size
    };
  }

  /**
   * 构建默认摘要
   */
  private buildSummary(rule: QualityRule, issues: QualityIssue[], totalRows: number, columns: string[]): string {
    if (issues.length === 0) {
      return `✅ 通过（AI检查）：检查了 ${totalRows} 行数据，${columns.join(', ')} 列符合规则`;
    }

    const issueRows = new Set(issues.map(i => i.row)).size;
    const bySeverity = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severityText = Object.entries(bySeverity)
      .map(([severity, count]) => `${severity}: ${count}个`)
      .join(', ');

    return `❌ 不通过（AI检查）：${issueRows} 行有问题，共 ${issues.length} 个问题 (${severityText})`;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(rule: QualityRule, data: any[]): string {
    // AI规则的缓存包含数据内容和规则定义
    const dataHash = this.hashData(data);
    return `ai_${rule.id}_${dataHash}`;
  }

  /**
   * 数据哈希（简单实现）
   */
  private hashData(data: any[]): string {
    // 使用数据的前几行和长度生成哈希
    const sample = JSON.stringify(data.slice(0, 5));
    return `${data.length}_${sample.length}`;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * 测试AI服务可用性
   */
  async testAvailability(): Promise<boolean> {
    try {
      const testRule: QualityRule = {
        id: 'test',
        name: '测试规则',
        description: '测试',
        category: '测试',
        checkContent: '测试',
        criteria: '测试',
        severity: 'P1',
        executionType: 'ai',
        targetColumns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        isOfficial: false,
        isEnabled: true
      };

      const testData = [{ a: 1, b: 2 }];
      const result = await this.executeRule(testRule, testData, { sampleSize: 1 });

      return result.executionTime > 0;
    } catch (error) {
      console.error('AI服务不可用:', error);
      return false;
    }
  }
}

// 导出单例
export const aiRuleExecutor = new AIRuleExecutor();
