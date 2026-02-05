/**
 * 数据质量规则类型定义
 * 支持自定义规则 + AI评估的创新方案
 */

/**
 * 严重级别
 * P0: 阻塞性问题，必须修复
 * P1: 严重问题，应该修复
 * P2: 一般问题，建议修复
 * P3: 提示性问题，可选修复
 */
export type RuleSeverity = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * 执行类型
 * local: 本地规则执行（快速、免费）
 * ai: AI规则执行（灵活、有成本）
 * hybrid: 混合执行（本地预处理+AI评估）
 */
export type ExecutionType = 'local' | 'ai' | 'hybrid';

/**
 * 本地规则类型
 */
export type LocalRuleType =
  | 'not_null'    // 非空检查
  | 'format'      // 格式检查（正则）
  | 'range'       // 范围检查（数值/日期）
  | 'unique'      // 唯一性检查
  | 'reference'   // 引用完整性检查
  | 'custom';     // 自定义JavaScript表达式

/**
 * 本地规则定义
 */
export interface LocalRule {
  type: LocalRuleType;
  params: Record<string, any>;
}

/**
 * 质量规则
 */
export interface QualityRule {
  // 基础信息
  id: string;
  name: string;
  description: string;
  category: string;  // 如：格式检查、完整性检查、一致性检查等

  // 规则定义（自然语言）
  checkContent: string;    // 规则检查内容（用户可理解）
  criteria: string;         // 规则评判标准（用户可理解）

  // 执行配置
  severity: RuleSeverity;
  executionType: ExecutionType;
  localRule?: LocalRule;    // 本地规则的具体定义
  targetColumns: string[];  // 目标列（空数组表示自动检测）

  // 元数据
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  isOfficial: boolean;      // 是否为官方模板
  isEnabled: boolean;       // 是否启用
}

/**
 * 质量问题
 */
export interface QualityIssue {
  row: number;              // 行号（从1开始）
  column: string;           // 列名
  value: any;               // 问题值
  description: string;      // 问题描述
  severity: RuleSeverity;   // 严重级别
  suggestion?: string;      // 修复建议
}

/**
 * 规则执行结果
 */
export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  pass: boolean;
  issues: QualityIssue[];
  summary: string;          // 执行摘要
  suggestions: string[];    // 修复建议列表
  executionTime: number;    // 执行耗时（ms）
  checkedRows: number;      // 检查的行数
  issueRows: number;        // 有问题的行数
}

/**
 * 批量规则执行结果
 */
export interface BatchExecutionResult {
  totalRules: number;
  executedRules: number;
  skippedRules: number;
  results: RuleExecutionResult[];
  overallSummary: string;
  totalExecutionTime: number;
}

/**
 * 规则筛选条件
 */
export interface RuleFilter {
  category?: string;
  severity?: RuleSeverity;
  executionType?: ExecutionType;
  isOfficial?: boolean;
  isEnabled?: boolean;
  searchTerm?: string;
}

/**
 * 规则统计信息
 */
export interface RuleStatistics {
  totalRules: number;
  officialRules: number;
  customRules: number;
  enabledRules: number;
  rulesByCategory: Record<string, number>;
  rulesBySeverity: Record<RuleSeverity, number>;
  mostUsedRules: Array<{ ruleId: string; name: string; usageCount: number }>;
}

/**
 * 规则模板
 * 用于创建新规则的预设模板
 */
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  checkContent: string;
  criteria: string;
  severity: RuleSeverity;
  executionType: ExecutionType;
  localRule?: LocalRule;
  exampleColumns: string[];  // 示例目标列
}

/**
 * 规则验证结果
 */
export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 规则执行选项
 */
export interface RuleExecutionOptions {
  stopOnFirstError?: boolean;    // 遇到第一个错误是否停止
  maxIssues?: number;            // 每个规则最多记录的问题数
  sampleSize?: number;           // 采样大小（0表示全量检查）
  enableCache?: boolean;         // 是否启用结果缓存
  parallel?: boolean;            // 是否并行执行
}

/**
 * 规则测试结果
 * 用于规则创建时的测试
 */
export interface RuleTestResult {
  pass: boolean;
  testCases: Array<{
    input: any;
    expected: boolean;
    actual: boolean;
    pass: boolean;
  }>;
  summary: string;
}
