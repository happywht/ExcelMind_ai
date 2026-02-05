/**
 * 质量控制模块 - 索引文件
 *
 * 导出所有质量控制相关的类和接口
 *
 * @module services/quality
 * @version 1.0.0
 */

// 主验证器
export { AIOutputValidator } from './aiOutputValidator';

// 子组件
export { SQLValidator } from './sqlValidator';
export { ResultValidator } from './resultValidator';
export { HallucinationDetector } from './hallucinationDetector';
export { FixSuggestionGenerator } from './fixSuggestionGenerator';
export { QualityGate, STRICT_GATE, STANDARD_GATE, LENIENT_GATE, READ_ONLY_GATE } from './qualityGate';

// 类型定义
export type {
  // 核心类型
  DatabaseSchema,
  TableSchema,
  ColumnSchema,
  AIOutput,
  QueryResult,
  QueryContext,
  ValidationConfig,
  ValidationResult,

  // SQL验证类型
  SQLValidationResult,
  InjectionCheckResult,
  IdentifierValidationResult,
  IdentifierCheckItem,
  ComplexityValidationResult,
  ComplexityFactor,
  DangerousOperation,

  // 结果验证类型
  ResultValidationResult,
  StructureValidationResult,
  RangeValidationResult,
  OutOfRangeValue,
  ConsistencyValidationResult,
  InconsistencyItem,
  OutlierDetectionResult,
  OutlierValue,

  // 幻觉检测类型
  HallucinationDetectionResult,
  Hallucination,
  HallucinationReport,

  // 修复建议类型
  FixSuggestion,
  FixWizard,
  FixWizardStep,
  FixWizardOption,

  // 质量报告类型
  QualityReport,
  QualityMetric
} from './aiOutputValidator';

// 质量门禁类型
export type {
  GateCriteria,
  GateResult
} from './qualityGate';

// 默认导出
export { AIOutputValidator as default } from './aiOutputValidator';
