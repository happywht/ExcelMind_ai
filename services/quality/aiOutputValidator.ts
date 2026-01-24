/**
 * AI输出验证器 - 质量控制核心模块
 *
 * Phase 2 质量控制系统的核心组件
 * 负责验证AI生成的SQL查询和结果的正确性、安全性和合理性
 *
 * 功能特性：
 * - SQL语法验证（基于AlaSQL）
 * - SQL注入检测
 * - 表和字段存在性验证
 * - 查询复杂度评估
 * - AI幻觉检测
 * - 结果合理性验证
 * - 修复建议生成
 * - 质量门禁检查
 *
 * @module services/quality/aiOutputValidator
 * @author QA Team
 * @version 1.0.0
 */

import { SQLValidator } from './sqlValidator';
import { ResultValidator } from './resultValidator';
import { HallucinationDetector } from './hallucinationDetector';
import { FixSuggestionGenerator } from './fixSuggestionGenerator';
import { QualityGate } from './qualityGate';

// ============================================================
// 类型定义
// ============================================================

/**
 * 数据库Schema
 */
export interface DatabaseSchema {
  /** 表定义映射 */
  tables: Record<string, TableSchema>;
}

/**
 * 表Schema
 */
export interface TableSchema {
  /** 表名 */
  name: string;
  /** 列定义 */
  columns: ColumnSchema[];
  /** 行数（可选） */
  rowCount?: number;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 列Schema
 */
export interface ColumnSchema {
  /** 列名 */
  name: string;
  /** 数据类型 */
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'unknown';
  /** 是否可为空 */
  nullable?: boolean;
  /** 示例值 */
  sampleValues?: any[];
}

/**
 * AI输出
 */
export interface AIOutput {
  /** 生成的SQL查询 */
  sqlQuery: string;
  /** AI推理过程 */
  reasoning?: string;
  /** 置信度 (0-1) */
  confidence?: number;
  /** 执行结果（可选） */
  result?: QueryResult;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 查询结果
 */
export interface QueryResult {
  /** 结果数据 */
  data: any[];
  /** 行数 */
  rowCount: number;
  /** 列名 */
  columns?: string[];
  /** 执行时间（毫秒） */
  executionTime?: number;
}

/**
 * 查询上下文
 */
export interface QueryContext {
  /** 数据库Schema */
  schema: DatabaseSchema;
  /** 用户原始查询 */
  originalQuery?: string;
  /** 历史查询结果 */
  history?: QueryResult[];
  /** 验证配置 */
  config?: ValidationConfig;
}

/**
 * 验证配置
 */
export interface ValidationConfig {
  /** 是否启用SQL注入检测 */
  enableInjectionCheck?: boolean;
  /** 是否启用幻觉检测 */
  enableHallucinationCheck?: boolean;
  /** 是否启用复杂度检查 */
  enableComplexityCheck?: boolean;
  /** 最大查询复杂度 */
  maxComplexity?: number;
  /** 是否启用结果验证 */
  enableResultValidation?: boolean;
  /** 质量门禁阈值 */
  qualityGateThreshold?: number;
  /** 严格模式（失败即停止） */
  strictMode?: boolean;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  passed: boolean;
  /** 验证分数 (0-100) */
  score: number;
  /** SQL验证结果 */
  sqlValidation: SQLValidationResult;
  /** 结果验证结果 */
  resultValidation?: ResultValidationResult;
  /** 幻觉检测结果 */
  hallucinationDetection?: HallucinationDetectionResult;
  /** 修复建议 */
  suggestions: FixSuggestion[];
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
  /** 验证时间戳 */
  timestamp: Date;
  /** 验证耗时（毫秒） */
  duration: number;
}

/**
 * SQL验证结果
 */
export interface SQLValidationResult {
  /** 语法是否正确 */
  syntaxValid: boolean;
  /** 语法错误信息 */
  syntaxError?: string;
  /** 注入检测结果 */
  injectionCheck: InjectionCheckResult;
  /** 标识符验证结果 */
  identifierCheck: IdentifierValidationResult;
  /** 复杂度验证结果 */
  complexityCheck: ComplexityValidationResult;
  /** 危险操作检测结果 */
  dangerousOperations: DangerousOperation[];
}

/**
 * 注入检查结果
 */
export interface InjectionCheckResult {
  /** 是否检测到注入 */
  detected: boolean;
  /** 注入类型 */
  types: string[];
  /** 检测到的模式 */
  patterns: string[];
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 标识符验证结果
 */
export interface IdentifierValidationResult {
  /** 表名验证结果 */
  tables: IdentifierCheckItem[];
  /** 字段名验证结果 */
  columns: IdentifierCheckItem[];
  /** 未找到的表 */
  missingTables: string[];
  /** 未找到的字段 */
  missingColumns: string[];
}

/**
 * 标识符检查项
 */
export interface IdentifierCheckItem {
  /** 标识符名称 */
  name: string;
  /** 是否存在 */
  exists: boolean;
  /** 位置信息 */
  position?: string;
}

/**
 * 复杂度验证结果
 */
export interface ComplexityValidationResult {
  /** 复杂度分数 */
  score: number;
  /** 复杂度级别 */
  level: 'simple' | 'medium' | 'complex' | 'very_complex';
  /** 是否超出阈值 */
  exceedsThreshold: boolean;
  /** 复杂度因素 */
  factors: ComplexityFactor[];
}

/**
 * 复杂度因素
 */
export interface ComplexityFactor {
  /** 因素类型 */
  type: string;
  /** 分数贡献 */
  score: number;
  /** 描述 */
  description: string;
}

/**
 * 危险操作
 */
export interface DangerousOperation {
  /** 操作类型 */
  type: 'DROP' | 'TRUNCATE' | 'DELETE' | 'UPDATE' | 'INSERT' | 'ALTER' | 'CREATE';
  /** 严重程度 */
  severity: 'medium' | 'high';
  /** 位置 */
  position: string;
  /** 描述 */
  description: string;
}

/**
 * 结果验证结果
 */
export interface ResultValidationResult {
  /** 结构验证 */
  structure: StructureValidationResult;
  /** 范围验证 */
  range?: RangeValidationResult;
  /** 一致性验证 */
  consistency?: ConsistencyValidationResult;
  /** 异常值检测 */
  outliers?: OutlierDetectionResult;
}

/**
 * 结构验证结果
 */
export interface StructureValidationResult {
  /** 是否符合预期结构 */
  matches: boolean;
  /** 预期列 */
  expectedColumns?: string[];
  /** 实际列 */
  actualColumns?: string[];
  /** 缺失列 */
  missingColumns?: string[];
  /** 额外列 */
  extraColumns?: string[];
}

/**
 * 范围验证结果
 */
export interface RangeValidationResult {
  /** 是否在合理范围内 */
  inRange: boolean;
  /** 超出范围的值 */
  outOfRangeValues: OutOfRangeValue[];
}

/**
 * 超出范围的值
 */
export interface OutOfRangeValue {
  /** 列名 */
  column: string;
  /** 行索引 */
  rowIndex: number;
  /** 实际值 */
  actualValue: any;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
}

/**
 * 一致性验证结果
 */
export interface ConsistencyValidationResult {
  /** 是否一致 */
  consistent: boolean;
  /** 一致性分数 */
  score: number;
  /** 不一致项 */
  inconsistencies: InconsistencyItem[];
}

/**
 * 不一致项
 */
export interface InconsistencyItem {
  /** 列名 */
  column: string;
  /** 问题描述 */
  issue: string;
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high';
}

/**
 * 异常值检测结果
 */
export interface OutlierDetectionResult {
  /** 是否检测到异常值 */
  detected: boolean;
  /** 异常值列表 */
  outliers: OutlierValue[];
}

/**
 * 异常值
 */
export interface OutlierValue {
  /** 列名 */
  column: string;
  /** 行索引 */
  rowIndex: number;
  /** 值 */
  value: any;
  /** 偏离程度（标准差倍数） */
  deviation: number;
}

/**
 * 幻觉检测结果
 */
export interface HallucinationDetectionResult {
  /** 幻觉分数 (0-100, 越高越严重) */
  score: number;
  /** 字段名幻觉 */
  fieldHallucinations: Hallucination[];
  /** 表名幻觉 */
  tableHallucinations: Hallucination[];
  /** 数值幻觉 */
  valueHallucinations: Hallucination[];
  /** 逻辑幻觉 */
  logicHallucinations: Hallucination[];
}

/**
 * 幻觉项
 */
export interface Hallucination {
  /** 幻觉类型 */
  type: 'field' | 'table' | 'value' | 'logic';
  /** 问题描述 */
  issue: string;
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high';
  /** 位置 */
  position?: string;
  /** 建议 */
  suggestion?: string;
}

/**
 * 修复建议
 */
export interface FixSuggestion {
  /** 建议ID */
  id: string;
  /** 建议类型 */
  type: 'sql_syntax' | 'identifier' | 'injection' | 'complexity' | 'hallucination' | 'result';
  /** 优先级 */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 原始内容 */
  original?: string;
  /** 建议内容 */
  suggested?: string;
  /** 应用建议的代码 */
  applyCode?: string;
  /** 是否可以自动修复 */
  autoFixable: boolean;
}

/**
 * 幻觉报告
 */
export interface HallucinationReport {
  /** 幻觉分数 */
  score: number;
  /** 幻觉列表 */
  hallucinations: Hallucination[];
  /** 总体评估 */
  assessment: string;
  /** 是否需要人工审核 */
  requiresHumanReview: boolean;
}

/**
 * 质量报告
 */
export interface QualityReport {
  /** 质量分数 */
  score: number;
  /** 质量等级 */
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** 是否通过质量门禁 */
  passed: boolean;
  /** 指标详情 */
  metrics: QualityMetric[];
  /** 改进建议 */
  recommendations: string[];
  /** 报告时间 */
  timestamp: Date;
}

/**
 * 质量指标
 */
export interface QualityMetric {
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 目标值 */
  target: number;
  /** 是否达标 */
  passed: boolean;
  /** 权重 */
  weight: number;
}

/**
 * 修复向导
 */
export interface FixWizard {
  /** 向导步骤 */
  steps: FixWizardStep[];
  /** 当前步骤索引 */
  currentStep: number;
  /** 是否可以自动修复 */
  canAutoFix: boolean;
}

/**
 * 修复向导步骤
 */
export interface FixWizardStep {
  /** 步骤标题 */
  title: string;
  /** 步骤描述 */
  description: string;
  /** 选项 */
  options: FixWizardOption[];
  /** 默认选项 */
  defaultOption?: number;
}

/**
 * 修复向导选项
 */
export interface FixWizardOption {
  /** 选项标题 */
  title: string;
  /** 选项描述 */
  description: string;
  /** 修复代码 */
  fixCode?: string;
  /** 是否为自动修复 */
  isAutoFix?: boolean;
}

// ============================================================
// AI输出验证器主类
// ============================================================

/**
 * AI输出验证器
 *
 * 质量控制的核心组件，负责全面验证AI生成的SQL和结果
 */
export class AIOutputValidator {
  private sqlValidator: SQLValidator;
  private resultValidator: ResultValidator;
  private hallucinationDetector: HallucinationDetector;
  private fixGenerator: FixSuggestionGenerator;
  private qualityGate: QualityGate;
  private defaultConfig: Required<ValidationConfig>;

  constructor(config?: ValidationConfig) {
    // 初始化默认配置
    this.defaultConfig = {
      enableInjectionCheck: config?.enableInjectionCheck ?? true,
      enableHallucinationCheck: config?.enableHallucinationCheck ?? true,
      enableComplexityCheck: config?.enableComplexityCheck ?? true,
      maxComplexity: config?.maxComplexity ?? 50,
      enableResultValidation: config?.enableResultValidation ?? true,
      qualityGateThreshold: config?.qualityGateThreshold ?? 70,
      strictMode: config?.strictMode ?? false
    };

    // 初始化子组件
    this.sqlValidator = new SQLValidator();
    this.resultValidator = new ResultValidator();
    this.hallucinationDetector = new HallucinationDetector();
    this.fixGenerator = new FixSuggestionGenerator();
    this.qualityGate = new QualityGate({
      minScore: this.defaultConfig.qualityGateThreshold,
      requiredChecks: ['syntax', 'injection', 'identifiers'],
      warningThreshold: 50,
      errorThreshold: 30
    });
  }

  /**
   * 验证AI生成的SQL
   */
  validateSQL(sql: string, schema: DatabaseSchema): ValidationResult {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: FixSuggestion[] = [];

    try {
      // SQL语法验证
      const sqlValidation = this.sqlValidator.validateSyntax(sql);
      if (!sqlValidation.valid) {
        errors.push(`SQL语法错误: ${sqlValidation.error}`);
        suggestions.push(...this.fixGenerator.generateSQLFix({
          type: 'syntax',
          sql,
          error: sqlValidation.error
        }));
      }

      // SQL注入检测
      if (this.defaultConfig.enableInjectionCheck) {
        const injectionCheck = this.sqlValidator.checkInjection(sql);
        if (injectionCheck.detected) {
          const severityMap = { low: '低', medium: '中', high: '高', critical: '严重' };
          errors.push(`检测到SQL注入尝试 (${severityMap[injectionCheck.severity]}风险): ${injectionCheck.types.join(', ')}`);
          suggestions.push(...this.fixGenerator.generateSQLFix({
            type: 'injection',
            sql,
            patterns: injectionCheck.patterns
          }));
        }
      }

      // 表和字段验证
      const identifierCheck = this.sqlValidator.validateIdentifiers(sql, schema);
      if (identifierCheck.missingTables.length > 0) {
        errors.push(`不存在的表: ${identifierCheck.missingTables.join(', ')}`);
        suggestions.push(...this.fixGenerator.generateSQLFix({
          type: 'missing_table',
          sql,
          missing: identifierCheck.missingTables
        }));
      }
      if (identifierCheck.missingColumns.length > 0) {
        errors.push(`不存在的字段: ${identifierCheck.missingColumns.join(', ')}`);
        suggestions.push(...this.fixGenerator.generateSQLFix({
          type: 'missing_column',
          sql,
          missing: identifierCheck.missingColumns
        }));
      }

      // 复杂度检查
      if (this.defaultConfig.enableComplexityCheck) {
        const complexityCheck = this.sqlValidator.validateComplexity(sql);
        if (complexityCheck.exceedsThreshold) {
          warnings.push(`查询复杂度过高 (${complexityCheck.score}/${this.defaultConfig.maxComplexity})`);
          suggestions.push(...this.fixGenerator.generateSQLFix({
            type: 'complexity',
            sql,
            complexity: complexityCheck
          }));
        }
      }

      // 危险操作检测
      const dangerousOps = this.sqlValidator.detectDangerousOperations(sql);
      if (dangerousOps.length > 0) {
        const ops = dangerousOps.map(op => `${op.type}操作`).join(', ');
        warnings.push(`检测到危险操作: ${ops}`);
        suggestions.push(...this.fixGenerator.generateSQLFix({
          type: 'dangerous',
          sql,
          operations: dangerousOps
        }));
      }

      // 计算分数
      const score = this.calculateSQLValidationScore({
        syntaxValid: sqlValidation.valid,
        injectionDetected: this.defaultConfig.enableInjectionCheck ?
          this.sqlValidator.checkInjection(sql).detected : false,
        missingIdentifiers: identifierCheck.missingTables.length + identifierCheck.missingColumns.length,
        complexityExceeds: this.defaultConfig.enableComplexityCheck ?
          this.sqlValidator.validateComplexity(sql).exceedsThreshold : false,
        hasDangerousOps: dangerousOps.length > 0
      });

      const passed = score >= this.defaultConfig.qualityGateThreshold;

      return {
        passed,
        score,
        sqlValidation: {
          syntaxValid: sqlValidation.valid,
          syntaxError: sqlValidation.error,
          injectionCheck: this.sqlValidator.checkInjection(sql),
          identifierCheck,
          complexityCheck: this.sqlValidator.validateComplexity(sql),
          dangerousOperations: dangerousOps
        },
        suggestions,
        errors,
        warnings,
        timestamp: new Date(),
        duration: performance.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        score: 0,
        sqlValidation: {
          syntaxValid: false,
          syntaxError: error instanceof Error ? error.message : String(error),
          injectionCheck: { detected: false, types: [], patterns: [], severity: 'low' },
          identifierCheck: { tables: [], columns: [], missingTables: [], missingColumns: [] },
          complexityCheck: { score: 0, level: 'simple', exceedsThreshold: false, factors: [] },
          dangerousOperations: []
        },
        suggestions: [],
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        timestamp: new Date(),
        duration: performance.now() - startTime
      };
    }
  }

  /**
   * 验证查询结果的合理性
   */
  validateResult(result: QueryResult, expectedShape?: any): ValidationResult {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: FixSuggestion[] = [];

    try {
      // 结构验证
      const structureValidation = this.resultValidator.validateStructure(result, expectedShape);
      if (!structureValidation.matches) {
        warnings.push('结果结构不符合预期');
        suggestions.push(...this.fixGenerator.generateResultFix({
          type: 'structure',
          validation: structureValidation
        }));
      }

      // 范围验证
      const rangeValidation = this.resultValidator.validateRange(result, {});
      if (!rangeValidation.inRange && rangeValidation.outOfRangeValues.length > 0) {
        warnings.push(`发现${rangeValidation.outOfRangeValues.length}个超出范围的值`);
        suggestions.push(...this.fixGenerator.generateResultFix({
          type: 'range',
          validation: rangeValidation
        }));
      }

      // 异常值检测
      const outlierDetection = this.resultValidator.detectOutliers(result);
      if (outlierDetection.detected) {
        warnings.push(`检测到${outlierDetection.outliers.length}个异常值`);
        suggestions.push(...this.fixGenerator.generateResultFix({
          type: 'outlier',
          validation: outlierDetection
        }));
      }

      // 计算分数
      const score = this.calculateResultValidationScore({
        structureMatches: structureValidation.matches,
        inRange: rangeValidation.inRange,
        hasOutliers: outlierDetection.detected
      });

      const passed = score >= this.defaultConfig.qualityGateThreshold;

      return {
        passed,
        score,
        sqlValidation: {
          syntaxValid: true,
          injectionCheck: { detected: false, types: [], patterns: [], severity: 'low' },
          identifierCheck: { tables: [], columns: [], missingTables: [], missingColumns: [] },
          complexityCheck: { score: 0, level: 'simple', exceedsThreshold: false, factors: [] },
          dangerousOperations: []
        },
        resultValidation: {
          structure: structureValidation,
          range: rangeValidation,
          outliers: outlierDetection
        },
        suggestions,
        errors,
        warnings,
        timestamp: new Date(),
        duration: performance.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        score: 0,
        sqlValidation: {
          syntaxValid: true,
          injectionCheck: { detected: false, types: [], patterns: [], severity: 'low' },
          identifierCheck: { tables: [], columns: [], missingTables: [], missingColumns: [] },
          complexityCheck: { score: 0, level: 'simple', exceedsThreshold: false, factors: [] },
          dangerousOperations: []
        },
        suggestions: [],
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        timestamp: new Date(),
        duration: performance.now() - startTime
      };
    }
  }

  /**
   * 检测AI幻觉
   */
  detectHallucination(aiOutput: AIOutput, context: QueryContext): HallucinationReport {
    const startTime = performance.now();

    try {
      // 字段名幻觉
      const fieldHallucinations = this.hallucinationDetector.detectFieldHallucination(
        aiOutput,
        context.schema
      );

      // 表名幻觉
      const tableHallucinations = this.hallucinationDetector.detectTableHallucination(
        aiOutput,
        context.schema
      );

      // 数值幻觉
      const valueHallucinations = this.hallucinationDetector.detectValueHallucination(
        aiOutput,
        context
      );

      // 逻辑幻觉
      const logicHallucinations = this.hallucinationDetector.detectLogicHallucination(
        aiOutput,
        context
      );

      // 计算综合幻觉分数
      const score = this.hallucinationDetector.calculateHallucinationScore(
        aiOutput,
        context
      );

      const allHallucinations = [
        ...fieldHallucinations,
        ...tableHallucinations,
        ...valueHallucinations,
        ...logicHallucinations
      ];

      const requiresHumanReview = score > 50 || allHallucinations.some(h => h.severity === 'high');

      const assessment = this.generateHallucinationAssessment(score, allHallucinations);

      return {
        score,
        hallucinations: allHallucinations,
        assessment,
        requiresHumanReview,
        duration: performance.now() - startTime
      };
    } catch (error) {
      return {
        score: 100,
        hallucinations: [{
          type: 'logic',
          issue: '幻觉检测过程出错',
          severity: 'high',
          suggestion: '请人工审核AI输出'
        }],
        assessment: '幻觉检测失败',
        requiresHumanReview: true,
        duration: performance.now() - startTime
      };
    }
  }

  /**
   * 生成修复建议
   */
  generateFixSuggestion(validationResult: ValidationResult): FixSuggestion[] {
    return this.fixGenerator.generateFixWizard(validationResult).steps.flatMap(step =>
      step.options.map(option => ({
        id: `fix-${Date.now()}-${Math.random()}`,
        type: validationResult.sqlValidation.syntaxValid ? 'result' : 'sql_syntax',
        priority: option.isAutoFix ? 'high' : 'medium' as 'high' | 'medium',
        title: step.title,
        description: option.description,
        suggested: option.fixCode,
        applyCode: option.fixCode,
        autoFixable: option.isAutoFix ?? false
      }))
    );
  }

  /**
   * 执行完整的验证套件
   */
  runValidationSuite(aiOutput: AIOutput, context: QueryContext): ValidationResult {
    const startTime = performance.now();
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const allSuggestions: FixSuggestion[] = [];

    try {
      // 1. SQL验证
      const sqlValidation = this.validateSQL(aiOutput.sqlQuery, context.schema);
      allErrors.push(...sqlValidation.errors);
      allWarnings.push(...sqlValidation.warnings);
      allSuggestions.push(...sqlValidation.suggestions);

      // 2. 结果验证（如果有结果）
      let resultValidation: ResultValidationResult | undefined;
      if (this.defaultConfig.enableResultValidation && aiOutput.result) {
        const resultVal = this.validateResult(aiOutput.result);
        allErrors.push(...resultVal.errors);
        allWarnings.push(...resultVal.warnings);
        allSuggestions.push(...resultVal.suggestions);
        resultValidation = resultVal.resultValidation;
      }

      // 3. 幻觉检测
      let hallucinationDetection: HallucinationDetectionResult | undefined;
      if (this.defaultConfig.enableHallucinationCheck) {
        const hallucinationReport = this.detectHallucination(aiOutput, context);
        hallucinationDetection = {
          score: hallucinationReport.score,
          fieldHallucinations: hallucinationReport.hallucinations.filter(h => h.type === 'field'),
          tableHallucinations: hallucinationReport.hallucinations.filter(h => h.type === 'table'),
          valueHallucinations: hallucinationReport.hallucinations.filter(h => h.type === 'value'),
          logicHallucinations: hallucinationReport.hallucinations.filter(h => h.type === 'logic')
        };

        if (hallucinationReport.score > 30) {
          allWarnings.push(`检测到可能的AI幻觉 (分数: ${hallucinationReport.score}/100)`);
        }

        if (hallucinationReport.requiresHumanReview) {
          allWarnings.push('建议人工审核AI输出');
        }

        // 为幻觉生成修复建议
        hallucinationReport.hallucinations.forEach(h => {
          allSuggestions.push(...this.fixGenerator.generateHallucinationFix(h));
        });
      }

      // 计算总体分数
      const overallScore = this.calculateOverallScore({
        sqlScore: sqlValidation.score,
        resultScore: resultValidation ?
          this.calculateResultValidationScore({
            structureMatches: resultValidation.structure.matches,
            inRange: resultValidation.range?.inRange ?? true,
            hasOutliers: resultValidation.outliers?.detected ?? false
          }) : 100,
        hallucinationScore: hallucinationDetection ? (100 - hallucinationDetection.score) : 100
      });

      // 严格模式：有任何错误即失败
      const passed = this.defaultConfig.strictMode ?
        allErrors.length === 0 :
        overallScore >= this.defaultConfig.qualityGateThreshold;

      return {
        passed,
        score: overallScore,
        sqlValidation: sqlValidation.sqlValidation,
        resultValidation,
        hallucinationDetection,
        suggestions: allSuggestions,
        errors: allErrors,
        warnings: allWarnings,
        timestamp: new Date(),
        duration: performance.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        score: 0,
        sqlValidation: {
          syntaxValid: false,
          syntaxError: error instanceof Error ? error.message : String(error),
          injectionCheck: { detected: false, types: [], patterns: [], severity: 'low' },
          identifierCheck: { tables: [], columns: [], missingTables: [], missingColumns: [] },
          complexityCheck: { score: 0, level: 'simple', exceedsThreshold: false, factors: [] },
          dangerousOperations: []
        },
        suggestions: [],
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        timestamp: new Date(),
        duration: performance.now() - startTime
      };
    }
  }

  /**
   * 检查质量门禁
   */
  checkQualityGate(validationResult: ValidationResult): QualityReport {
    return this.qualityGate.generateReport(validationResult);
  }

  /**
   * 计算SQL验证分数
   */
  private calculateSQLValidationScore(params: {
    syntaxValid: boolean;
    injectionDetected: boolean;
    missingIdentifiers: number;
    complexityExceeds: boolean;
    hasDangerousOps: boolean;
  }): number {
    let score = 100;

    if (!params.syntaxValid) score -= 40; // 语法错误重扣
    if (params.injectionDetected) score -= 50; // 注入严重
    score -= params.missingIdentifiers * 10; // 每个缺失标识符扣10分
    if (params.complexityExceeds) score -= 15; // 复杂度超标
    if (params.hasDangerousOps) score -= 20; // 危险操作

    return Math.max(0, score);
  }

  /**
   * 计算结果验证分数
   */
  private calculateResultValidationScore(params: {
    structureMatches: boolean;
    inRange: boolean;
    hasOutliers: boolean;
  }): number {
    let score = 100;

    if (!params.structureMatches) score -= 30;
    if (!params.inRange) score -= 20;
    if (params.hasOutliers) score -= 10;

    return Math.max(0, score);
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(params: {
    sqlScore: number;
    resultScore: number;
    hallucinationScore: number;
  }): number {
    // SQL验证占50%，结果验证占30%，幻觉分数占20%
    return Math.round(
      params.sqlScore * 0.5 +
      params.resultScore * 0.3 +
      params.hallucinationScore * 0.2
    );
  }

  /**
   * 生成幻觉评估
   */
  private generateHallucinationAssessment(score: number, hallucinations: Hallucination[]): string {
    if (score >= 80) {
      return '严重幻觉：AI输出包含大量错误信息，强烈建议人工审核';
    } else if (score >= 50) {
      return '中度幻觉：AI输出可能包含不准确信息，建议人工审核';
    } else if (score >= 20) {
      return '轻度幻觉：AI输出基本可靠，但存在少量不确定信息';
    } else {
      return '无明显幻觉：AI输出可靠';
    }
  }

  /**
   * 验证字段映射结果
   *
   * @param mapping - AI生成的字段映射方案
   * @param context - 验证上下文
   * @returns 映射验证结果
   */
  validateMappingResult(
    mapping: any,
    context: {
      templatePlaceholders: string[];
      excelHeaders: string[];
    }
  ): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
    missingPlaceholders: string[];
    invalidFields: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const missingPlaceholders: string[] = [];
    const invalidFields: string[] = [];

    try {
      // 1. 检查所有模板占位符是否都被映射
      const mappedPlaceholders = Object.keys(mapping.fieldMapping || {});
      for (const placeholder of context.templatePlaceholders) {
        if (!mappedPlaceholders.includes(placeholder)) {
          missingPlaceholders.push(placeholder);
          warnings.push(`占位符 "${placeholder}" 未被映射`);
        }
      }

      // 2. 检查映射的字段是否存在于 Excel 中
      for (const [placeholder, field] of Object.entries(mapping.fieldMapping || {})) {
        const fieldValue = typeof field === 'string' ? field : (field as any).fieldName;
        if (typeof fieldValue === 'string' && !context.excelHeaders.includes(fieldValue)) {
          invalidFields.push(fieldValue);
          errors.push(`占位符 "${placeholder}" 映射到不存在的字段: "${fieldValue}"`);
        }
      }

      // 3. 验证辅助数据表引用
      if (mapping.auxiliarySheetMappings) {
        for (const [placeholder, auxMapping] of Object.entries(mapping.auxiliarySheetMappings)) {
          const auxInfo = auxMapping as any;
          if (auxInfo.lookupField && !context.excelHeaders.includes(auxInfo.lookupField)) {
            warnings.push(`占位符 "${placeholder}" 的查找字段 "${auxInfo.lookupField}" 可能不存在`);
          }
        }
      }

      // 计算是否有效（无错误即为有效）
      const isValid = errors.length === 0;

      return {
        isValid,
        warnings,
        errors,
        missingPlaceholders,
        invalidFields
      };
    } catch (error) {
      return {
        isValid: false,
        warnings: [],
        errors: [error instanceof Error ? error.message : String(error)],
        missingPlaceholders: [],
        invalidFields: []
      };
    }
  }

  /**
   * 修复拼写错误
   */
  private hallucinationDetectorRef = this.hallucinationDetector;
}

// ============================================================
// 导出
// ============================================================

export default AIOutputValidator;
