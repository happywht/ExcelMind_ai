/**
 * 清洗建议引擎 - Phase 2 核心服务
 *
 * 职责：基于数据质量分析结果，生成AI驱动的清洗建议
 * 功能：策略生成、优先级排序、影响评估、执行代码生成
 *
 * @module services/ai/cleaningRecommendationEngine
 * @version 1.0.0
 * @description 智能数据处理增强模块的建议引擎
 */

import {
  DataQualityReport,
  DataQualityIssue,
  DataQualityIssueType,
  CleaningSuggestion,
  CleaningStrategy,
  StrategyType,
  ImpactAssessment,
  RiskLevel,
  ExecutionEstimate,
  ComplexityLevel,
  SuggestionOptions,
  UserPreferences,
  IAIService,
  ICacheService
} from '../../types/dataQuality';

// ============================================================================
// 策略模板库
// ============================================================================

/**
 * 策略模板
 */
interface StrategyTemplate {
  /** 策略ID */
  strategyId: string;
  /** 策略名称 */
  name: string;
  /** 策略类型 */
  type: StrategyType;
  /** 策略描述 */
  description: string;
  /** 适用的问题类型 */
  applicableIssues: DataQualityIssueType[];
  /** 默认参数模板 */
  defaultParameters: any;
  /** 是否需要AI生成代码 */
  requiresCodeGeneration: boolean;
}

/**
 * 内置策略库
 */
class BuiltInStrategyLibrary {
  private static readonly STRATEGIES: StrategyTemplate[] = [
    // 缺失值处理策略
    {
      strategyId: 'fill_mean',
      name: '使用平均值填充',
      type: StrategyType.FILL,
      description: '对于数值列，使用列的平均值填充缺失值',
      applicableIssues: [DataQualityIssueType.MISSING_VALUE],
      defaultParameters: { operation: 'fill_mean' },
      requiresCodeGeneration: true
    },
    {
      strategyId: 'fill_median',
      name: '使用中位数填充',
      type: StrategyType.FILL,
      description: '对于数值列，使用列的中位数填充缺失值（适用于偏态分布）',
      applicableIssues: [DataQualityIssueType.MISSING_VALUE],
      defaultParameters: { operation: 'fill_median' },
      requiresCodeGeneration: true
    },
    {
      strategyId: 'fill_mode',
      name: '使用众数填充',
      type: StrategyType.FILL,
      description: '使用列中出现频率最高的值填充缺失值',
      applicableIssues: [DataQualityIssueType.MISSING_VALUE],
      defaultParameters: { operation: 'fill_mode' },
      requiresCodeGeneration: true
    },
    {
      strategyId: 'fill_forward',
      name: '前向填充',
      type: StrategyType.FILL,
      description: '使用前一个有效值填充缺失值（适用于时间序列）',
      applicableIssues: [DataQualityIssueType.MISSING_VALUE],
      defaultParameters: { operation: 'fill_forward' },
      requiresCodeGeneration: true
    },
    {
      strategyId: 'fill_constant',
      name: '使用常量填充',
      type: StrategyType.FILL,
      description: '使用指定的常量值填充缺失值',
      applicableIssues: [DataQualityIssueType.MISSING_VALUE],
      defaultParameters: { operation: 'fill_constant', value: '' },
      requiresCodeGeneration: true
    },
    {
      strategyId: 'delete_rows',
      name: '删除包含缺失值的行',
      type: StrategyType.DELETE,
      description: '删除所有包含缺失值的行',
      applicableIssues: [DataQualityIssueType.MISSING_VALUE],
      defaultParameters: { operation: 'delete_rows' },
      requiresCodeGeneration: true
    },

    // 异常值处理策略
    {
      strategyId: 'remove_outliers',
      name: '删除异常值',
      type: StrategyType.DELETE,
      description: '删除检测到的异常值',
      applicableIssues: [DataQualityIssueType.OUTLIER],
      defaultParameters: { operation: 'remove_outliers' },
      requiresCodeGeneration: true
    },
    {
      strategyId: 'cap_outliers',
      name: '盖帽法处理异常值',
      type: StrategyType.REPLACE,
      description: '将异常值限制在合理范围内（如1.5倍IQR）',
      applicableIssues: [DataQualityIssueType.OUTLIER],
      defaultParameters: { operation: 'cap_outliers', method: 'iqr', multiplier: 1.5 },
      requiresCodeGeneration: true
    },
    {
      strategyId: 'replace_outlier_with_median',
      name: '用中位数替换异常值',
      type: StrategyType.REPLACE,
      description: '使用中位数替换异常值',
      applicableIssues: [DataQualityIssueType.OUTLIER],
      defaultParameters: { operation: 'replace_with_median' },
      requiresCodeGeneration: true
    },

    // 重复行处理策略
    {
      strategyId: 'delete_duplicates',
      name: '删除重复行',
      type: StrategyType.DELETE,
      description: '删除完全重复的行，保留第一次出现的行',
      applicableIssues: [DataQualityIssueType.DUPLICATE_ROW],
      defaultParameters: { operation: 'delete_duplicates', keep: 'first' },
      requiresCodeGeneration: true
    },
    {
      strategyId: 'delete_duplicates_last',
      name: '删除重复行（保留最后）',
      type: StrategyType.DELETE,
      description: '删除完全重复的行，保留最后一次出现的行',
      applicableIssues: [DataQualityIssueType.DUPLICATE_ROW],
      defaultParameters: { operation: 'delete_duplicates', keep: 'last' },
      requiresCodeGeneration: true
    },

    // 格式不一致处理策略
    {
      strategyId: 'standardize_format',
      name: '标准化格式',
      type: StrategyType.STANDARDIZE,
      description: '将数据转换为标准格式（如邮箱、电话、日期）',
      applicableIssues: [DataQualityIssueType.FORMAT_INCONSISTENCY],
      defaultParameters: { operation: 'standardize_format' },
      requiresCodeGeneration: true
    },
    {
      strategyId: 'remove_invalid_format',
      name: '删除无效格式',
      type: StrategyType.DELETE,
      description: '删除不符合格式的行',
      applicableIssues: [DataQualityIssueType.FORMAT_INCONSISTENCY],
      defaultParameters: { operation: 'remove_invalid' },
      requiresCodeGeneration: true
    },

    // 数据类型转换策略
    {
      strategyId: 'convert_type',
      name: '转换数据类型',
      type: StrategyType.TRANSFORM,
      description: '将列转换为正确的数据类型',
      applicableIssues: [DataQualityIssueType.INVALID_TYPE],
      defaultParameters: { operation: 'convert_type', target_type: 'string' },
      requiresCodeGeneration: true
    },

    // 数据一致性策略
    {
      strategyId: 'merge_similar',
      name: '合并相似数据',
      type: StrategyType.MERGE,
      description: '合并相似或重复的数据项',
      applicableIssues: [DataQualityIssueType.DATA_INCONSISTENCY],
      defaultParameters: { operation: 'merge_similar' },
      requiresCodeGeneration: true
    },
    {
      strategyId: 'split_column',
      name: '拆分列',
      type: StrategyType.SPLIT,
      description: '将单个列拆分为多个列（如"姓名"拆分为"姓"和"名"）',
      applicableIssues: [DataQualityIssueType.DATA_INCONSISTENCY],
      defaultParameters: { operation: 'split_column', separator: ' ' },
      requiresCodeGeneration: true
    }
  ];

  /**
   * 获取适用于特定问题的策略
   */
  static getStrategiesForIssue(issueType: DataQualityIssueType): StrategyTemplate[] {
    return this.STRATEGIES.filter(s => s.applicableIssues.includes(issueType));
  }

  /**
   * 获取所有策略
   */
  static getAllStrategies(): StrategyTemplate[] {
    return [...this.STRATEGIES];
  }

  /**
   * 根据策略ID获取策略
   */
  static getStrategyById(strategyId: string): StrategyTemplate | undefined {
    return this.STRATEGIES.find(s => s.strategyId === strategyId);
  }
}

// ============================================================================
// 清洗建议引擎
// ============================================================================

/**
 * 清洗建议引擎
 *
 * 核心职责：
 * 1. 基于数据质量报告生成清洗建议
 * 2. 使用AI分析数据特征，生成个性化建议
 * 3. 评估策略影响和风险
 * 4. 生成执行代码
 */
export class CleaningRecommendationEngine {
  private readonly strategyLibrary: typeof BuiltInStrategyLibrary;

  /**
   * 构造函数
   */
  constructor(
    private readonly aiService: IAIService,
    private readonly cacheService?: ICacheService
  ) {
    this.strategyLibrary = BuiltInStrategyLibrary;
  }

  /**
   * 生成清洗建议
   *
   * @param report 数据质量报告
   * @param options 建议生成选项
   * @returns 清洗建议列表
   */
  async generateRecommendations(
    report: DataQualityReport,
    options?: SuggestionOptions
  ): Promise<CleaningSuggestion[]> {
    const startTime = Date.now();

    try {
      // 1. 检查缓存
      if (this.cacheService) {
        const cacheKey = this.generateCacheKey(report, options);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
          console.log('[CleaningRecommendationEngine] 使用缓存的建议');
          return cached;
        }
      }

      const suggestions: CleaningSuggestion[] = [];
      const maxSuggestions = options?.maxSuggestions || 3;

      // 2. 为每个问题生成建议
      for (const issue of report.issues) {
        // 获取适用的策略模板
        const strategyTemplates = this.strategyLibrary.getStrategiesForIssue(issue.issueType);

        // 为每个策略生成建议
        for (const template of strategyTemplates) {
          if (suggestions.length >= maxSuggestions) break;

          const suggestion = await this.generateSuggestionForStrategy(
            issue,
            report,
            template,
            options
          );

          if (suggestion) {
            suggestions.push(suggestion);
          }
        }

        if (suggestions.length >= maxSuggestions) break;
      }

      // 3. 排序建议（按优先级）
      suggestions.sort((a, b) => b.priority - a.priority);

      // 4. 缓存结果
      if (this.cacheService) {
        const cacheKey = this.generateCacheKey(report, options);
        await this.cacheService.set(cacheKey, suggestions, 1800000); // 30分钟
      }

      const duration = Date.now() - startTime;
      console.log(`[CleaningRecommendationEngine] 生成了 ${suggestions.length} 个建议，耗时 ${duration}ms`);

      return suggestions;
    } catch (error) {
      console.error('[CleaningRecommendationEngine] 生成建议失败:', error);
      throw error;
    }
  }

  /**
   * 为特定策略生成建议
   */
  private async generateSuggestionForStrategy(
    issue: DataQualityIssue,
    report: DataQualityReport,
    template: any,
    options?: SuggestionOptions
  ): Promise<CleaningSuggestion | null> {
    try {
      // 1. 构建策略对象
      const strategy: CleaningStrategy = {
        strategyId: template.strategyId,
        name: template.name,
        type: template.type,
        description: template.description,
        parameters: {
          ...template.defaultParameters,
          targetColumn: issue.affectedColumns[0] || 'all',
          condition: this.buildCondition(issue)
        }
      };

      // 2. 使用AI生成推荐理由
      let reasoning = template.description;
      if (options?.explainReasoning) {
        reasoning = await this.generateReasoning(issue, report, strategy);
      }

      // 3. 评估影响
      const expectedImpact = this.estimateImpact(issue, strategy, report);

      // 4. 评估风险
      const riskLevel = this.assessRisk(issue, strategy, report);

      // 5. 估算执行复杂度
      const executionEstimate = this.estimateExecution(issue, strategy);

      // 6. 计算优先级
      const priority = this.calculatePriority(issue, expectedImpact, riskLevel, options?.userPreferences);

      // 7. 生成执行代码（如果需要）
      if (template.requiresCodeGeneration && options?.generateCode) {
        strategy.executionCode = await this.generateExecutionCode(strategy, report);
      }

      return {
        suggestionId: this.generateSuggestionId(),
        issueId: issue.issueId,
        strategy,
        priority,
        reasoning,
        expectedImpact,
        riskLevel,
        executionEstimate
      };
    } catch (error) {
      console.error(`[CleaningRecommendationEngine] 生成策略建议失败: ${template.name}`, error);
      return null;
    }
  }

  /**
   * 使用AI生成推荐理由
   */
  private async generateReasoning(
    issue: DataQualityIssue,
    report: DataQualityReport,
    strategy: CleaningStrategy
  ): Promise<string> {
    try {
      const prompt = this.buildReasoningPrompt(issue, report, strategy);

      const response = await this.aiService.analyze(prompt);
      return response || strategy.description;
    } catch (error) {
      console.error('[CleaningRecommendationEngine] AI生成理由失败:', error);
      return strategy.description;
    }
  }

  /**
   * 构建AI提示词
   */
  private buildReasoningPrompt(
    issue: DataQualityIssue,
    report: DataQualityReport,
    strategy: CleaningStrategy
  ): string {
    const columnStats = report.columnStats.find(col =>
      issue.affectedColumns.includes(col.columnName)
    );

    return `
你是数据清洗专家。请为以下数据质量问题推荐清洗策略。

**问题描述**:
- 问题类型: ${issue.issueType}
- 严重程度: ${issue.severity}
- 影响列: ${issue.affectedColumns.join(', ')}
- 影响行数: ${issue.statistics.affectedRowCount} (${issue.statistics.affectedPercentage.toFixed(2)}%)

**列统计信息**:
${columnStats ? JSON.stringify(columnStats, null, 2) : '无'}

**推荐策略**: ${strategy.name}
**策略描述**: ${strategy.description}

**数据样本**:
${JSON.stringify(report.dataSample?.slice(0, 5), null, 2)}

请分析并解释为什么这个策略适合解决这个问题。请考虑：
1. 数据的特征和分布
2. 问题的严重程度
3. 策略的优缺点
4. 对数据完整性的影响

请用中文简要说明（不超过200字）。
`;
  }

  /**
   * 估算影响
   */
  private estimateImpact(
    issue: DataQualityIssue,
    strategy: CleaningStrategy,
    report: DataQualityReport
  ): ImpactAssessment {
    const affectedRows = issue.statistics.affectedRowCount;
    const totalRows = report.totalRows;

    let dataRetentionRate = 1.0;
    let qualityImprovement = 0;
    const sideEffects: string[] = [];

    // 根据策略类型估算影响
    switch (strategy.type) {
      case StrategyType.DELETE:
        dataRetentionRate = (totalRows - affectedRows) / totalRows;
        qualityImprovement = 20 * (affectedRows / totalRows);
        sideEffects.push('数据量减少');
        break;

      case StrategyType.FILL:
        dataRetentionRate = 1.0;
        qualityImprovement = 15 * (affectedRows / totalRows);
        sideEffects.push('可能引入轻微偏差');
        break;

      case StrategyType.REPLACE:
        dataRetentionRate = 1.0;
        qualityImprovement = 12 * (affectedRows / totalRows);
        sideEffects.push('原始值被修改');
        break;

      case StrategyType.STANDARDIZE:
        dataRetentionRate = 1.0;
        qualityImprovement = 18;
        break;

      case StrategyType.TRANSFORM:
        dataRetentionRate = 1.0;
        qualityImprovement = 15;
        break;

      default:
        dataRetentionRate = 1.0;
        qualityImprovement = 10;
    }

    // 考虑严重程度
    const severityMultiplier = {
      'critical': 1.5,
      'high': 1.3,
      'medium': 1.0,
      'low': 0.8
    };
    qualityImprovement *= severityMultiplier[issue.severity];

    return {
      dataRetentionRate,
      qualityImprovement: Math.min(100, qualityImprovement),
      affectedRows,
      sideEffects: sideEffects.length > 0 ? sideEffects : undefined
    };
  }

  /**
   * 评估风险
   */
  private assessRisk(
    issue: DataQualityIssue,
    strategy: CleaningStrategy,
    report: DataQualityReport
  ): RiskLevel {
    // 删除类策略风险较高
    if (strategy.type === StrategyType.DELETE) {
      if (issue.statistics.affectedPercentage > 10) return 'high';
      if (issue.statistics.affectedPercentage > 5) return 'medium';
      return 'low';
    }

    // 替换类策略中等风险
    if (strategy.type === StrategyType.REPLACE) {
      if (issue.severity === 'critical') return 'high';
      return 'medium';
    }

    // 填充类策略较低风险
    if (strategy.type === StrategyType.FILL) {
      return 'low';
    }

    // 标准化和转换类策略低风险
    if (strategy.type === StrategyType.STANDARDIZE || strategy.type === StrategyType.TRANSFORM) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * 估算执行复杂度
   */
  private estimateExecution(
    issue: DataQualityIssue,
    strategy: CleaningStrategy
  ): ExecutionEstimate {
    let complexity: ComplexityLevel = 'simple';
    let estimatedTime = 500; // 基础时间：500ms

    // 根据策略类型调整
    switch (strategy.type) {
      case StrategyType.DELETE:
        complexity = 'simple';
        estimatedTime = 300;
        break;

      case StrategyType.FILL:
        complexity = 'moderate';
        estimatedTime = 800;
        break;

      case StrategyType.REPLACE:
        complexity = 'moderate';
        estimatedTime = 1000;
        break;

      case StrategyType.STANDARDIZE:
        complexity = 'moderate';
        estimatedTime = 1200;
        break;

      case StrategyType.TRANSFORM:
        complexity = 'complex';
        estimatedTime = 1500;
        break;

      case StrategyType.MERGE:
      case StrategyType.SPLIT:
        complexity = 'complex';
        estimatedTime = 2000;
        break;
    }

    // 根据影响行数调整
    estimatedTime *= (1 + issue.statistics.affectedPercentage / 100);

    return {
      estimatedTime: Math.round(estimatedTime),
      complexity
    };
  }

  /**
   * 计算优先级
   */
  private calculatePriority(
    issue: DataQualityIssue,
    expectedImpact: ImpactAssessment,
    riskLevel: RiskLevel,
    userPreferences?: UserPreferences
  ): number {
    let priority = 0.5; // 基础优先级

    // 考虑严重程度
    const severityScore = {
      'critical': 0.4,
      'high': 0.3,
      'medium': 0.2,
      'low': 0.1
    };
    priority += severityScore[issue.severity];

    // 考虑质量改善度
    priority += (expectedImpact.qualityImprovement / 100) * 0.3;

    // 考虑数据保留率
    priority += expectedImpact.dataRetentionRate * 0.1;

    // 考虑风险
    const riskPenalty = {
      'low': 0,
      'medium': -0.1,
      'high': -0.2
    };
    priority += riskPenalty[riskLevel];

    // 考虑用户偏好
    if (userPreferences) {
      if (userPreferences.preferDataRetention) {
        priority += expectedImpact.dataRetentionRate * 0.2;
      }
      if (userPreferences.preferQualityImprovement) {
        priority += (expectedImpact.qualityImprovement / 100) * 0.2;
      }
      if (userPreferences.riskTolerance === 'low' && riskLevel === 'high') {
        priority -= 0.3;
      }
    }

    return Math.max(0, Math.min(1, priority));
  }

  /**
   * 生成执行代码
   */
  private async generateExecutionCode(
    strategy: CleaningStrategy,
    report: DataQualityReport
  ): Promise<string> {
    try {
      const prompt = this.buildCodePrompt(strategy, report);
      const response = await this.aiService.analyze(prompt);

      // 提取代码部分
      return this.extractCode(response);
    } catch (error) {
      console.error('[CleaningRecommendationEngine] 生成执行代码失败:', error);
      return '';
    }
  }

  /**
   * 构建代码生成提示词
   */
  private buildCodePrompt(
    strategy: CleaningStrategy,
    report: DataQualityReport
  ): string {
    return `
生成Python代码来执行以下数据清洗策略：

**策略**: ${strategy.name}
**类型**: ${strategy.type}
**参数**: ${JSON.stringify(strategy.parameters)}

**数据结构**:
- 变量 files 是字典，key是文件名，value是数据数组
- 每行数据是字典，key是列名

**要求**:
1. 使用pandas进行数据处理
2. 修改files字典中的数据
3. 最后输出JSON格式的files字典
4. 添加错误处理

**数据样本**:
${JSON.stringify(report.dataSample?.slice(0, 3), null, 2)}

**示例代码结构**:
\`\`\`python
import pandas as pd
import json

def clean_data(files):
    try:
        # 获取数据
        df = pd.DataFrame(files['${report.fileName}']['${report.sheetName}'])

        # 执行清洗操作
        # 根据策略类型和参数处理数据

        # 保存结果
        files['${report.fileName}']['${report.sheetName}'] = df.to_dict('records')
        return json.dumps(files, ensure_ascii=False, default=str)
    except Exception as e:
        print(f"Error: {e}")
        return json.dumps(files, ensure_ascii=False, default=str)

print(clean_data(files))
\`\`\`

请生成完整的、可直接执行的Python代码。只返回代码，不要包含任何解释。
`;
  }

  /**
   * 从AI响应中提取代码
   */
  private extractCode(response: string): string {
    // 移除markdown代码块标记
    let code = response.trim();

    // 移除 ```python 和 ```
    code = code.replace(/^```python\s*\n?/i, '').replace(/```\s*$/, '');
    code = code.replace(/^```\s*\n?/i, '').replace(/```\s*$/, '');

    // 如果响应包含JSON格式，提取code字段
    const jsonMatch = code.match(/"code"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
    if (jsonMatch) {
      code = jsonMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }

    return code.trim();
  }

  /**
   * 构建条件表达式
   */
  private buildCondition(issue: DataQualityIssue): string {
    if (issue.affectedColumns.length === 0) return '';

    const column = issue.affectedColumns[0];

    switch (issue.issueType) {
      case DataQualityIssueType.MISSING_VALUE:
        return `${column} is null or ${column} == ''`;

      case DataQualityIssueType.OUTLIER:
        return `${column} is outlier`;

      case DataQualityIssueType.DUPLICATE_ROW:
        return 'row is duplicate';

      case DataQualityIssueType.FORMAT_INCONSISTENCY:
        return `${column} format is invalid`;

      default:
        return `${column} is invalid`;
    }
  }

  /**
   * 生成建议ID
   */
  private generateSuggestionId(): string {
    return `sugg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(report: DataQualityReport, options?: SuggestionOptions): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `cleaning_suggestions:${report.reportId}:${optionsStr}`;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建清洗建议引擎
 */
export function createCleaningRecommendationEngine(
  aiService: IAIService,
  cacheService?: ICacheService
): CleaningRecommendationEngine {
  return new CleaningRecommendationEngine(aiService, cacheService);
}
