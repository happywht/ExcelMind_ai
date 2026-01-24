/**
 * 质量门禁
 *
 * 负责检查AI输出是否通过质量门禁
 *
 * @module services/quality/qualityGate
 * @version 1.0.0
 */

import {
  ValidationResult,
  QualityReport,
  QualityMetric,
  GateResult
} from './aiOutputValidator';

// ============================================================
// 类型定义
// ============================================================

/**
 * 质量门禁标准
 */
export interface GateCriteria {
  /** 最低质量分数 */
  minScore: number;
  /** 必须通过的检查项 */
  requiredChecks: string[];
  /** 警告阈值 */
  warningThreshold: number;
  /** 错误阈值 */
  errorThreshold: number;
}

/**
 * 门禁结果
 */
interface GateResult {
  /** 是否通过 */
  passed: boolean;
  /** 分数 */
  score: number;
  /** 失败的检查项 */
  failedChecks: string[];
  /** 警告 */
  warnings: string[];
}

// ============================================================
// 质量门禁类
// ============================================================

/**
 * 质量门禁
 *
 * 定义和检查质量标准
 */
export class QualityGate {
  private criteria: GateCriteria;

  constructor(criteria: GateCriteria) {
    this.criteria = criteria;
  }

  /**
   * 检查是否通过质量门禁
   */
  check(validationResult: ValidationResult): GateResult {
    const failedChecks: string[] = [];
    const warnings: string[] = [];

    // 1. 检查语法
    if (!validationResult.sqlValidation.syntaxValid) {
      failedChecks.push('syntax');
    }

    // 2. 检查注入
    if (validationResult.sqlValidation.injectionCheck.detected) {
      failedChecks.push('injection');
    }

    // 3. 检查标识符
    const missingCount =
      validationResult.sqlValidation.identifierCheck.missingTables.length +
      validationResult.sqlValidation.identifierCheck.missingColumns.length;

    if (missingCount > 0) {
      if (this.criteria.requiredChecks.includes('identifiers')) {
        failedChecks.push('identifiers');
      } else {
        warnings.push(`有${missingCount}个缺失的表或字段`);
      }
    }

    // 4. 检查复杂度
    if (validationResult.sqlValidation.complexityCheck.exceedsThreshold) {
      warnings.push('查询复杂度超出阈值');
    }

    // 5. 检查危险操作
    if (validationResult.sqlValidation.dangerousOperations.length > 0) {
      if (this.criteria.requiredChecks.includes('safety')) {
        failedChecks.push('safety');
      } else {
        warnings.push('检测到危险操作');
      }
    }

    // 6. 检查幻觉
    if (validationResult.hallucinationDetection) {
      const hallucinationScore = validationResult.hallucinationDetection.score;
      if (hallucinationScore > 50) {
        failedChecks.push('hallucination');
      } else if (hallucinationScore > 20) {
        warnings.push('检测到可能的AI幻觉');
      }
    }

    // 7. 检查结果验证
    if (validationResult.resultValidation) {
      if (!validationResult.resultValidation.structure.matches) {
        warnings.push('结果结构与预期不符');
      }

      if (validationResult.resultValidation.outliers?.detected) {
        warnings.push('结果中存在异常值');
      }
    }

    // 8. 计算总体分数
    const passed = failedChecks.length === 0 && validationResult.score >= this.criteria.minScore;

    return {
      passed,
      score: validationResult.score,
      failedChecks,
      warnings
    };
  }

  /**
   * 获取质量分数
   */
  getScore(validationResult: ValidationResult): number {
    return validationResult.score;
  }

  /**
   * 生成质量报告
   */
  generateReport(validationResult: ValidationResult): QualityReport {
    // 执行门禁检查
    const gateResult = this.check(validationResult);

    // 计算各项指标
    const metrics = this.calculateMetrics(validationResult);

    // 确定质量等级
    const grade = this.determineGrade(gateResult.score);

    // 生成改进建议
    const recommendations = this.generateRecommendations(validationResult, metrics);

    return {
      score: gateResult.score,
      grade,
      passed: gateResult.passed,
      metrics,
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * 更新门禁标准
   */
  updateCriteria(newCriteria: Partial<GateCriteria>): void {
    this.criteria = { ...this.criteria, ...newCriteria };
  }

  /**
   * 获取当前门禁标准
   */
  getCriteria(): GateCriteria {
    return { ...this.criteria };
  }

  // ============================================================
  // 私有方法
  // ============================================================

  /**
   * 计算质量指标
   */
  private calculateMetrics(validationResult: ValidationResult): QualityMetric[] {
    const metrics: QualityMetric[] = [];

    // 1. 语法正确性（权重30%）
    const syntaxScore = validationResult.sqlValidation.syntaxValid ? 100 : 0;
    metrics.push({
      name: '语法正确性',
      value: syntaxScore,
      target: 100,
      passed: validationResult.sqlValidation.syntaxValid,
      weight: 30
    });

    // 2. 安全性（权重25%）
    const injectionDetected = validationResult.sqlValidation.injectionCheck.detected;
    const dangerousOps = validationResult.sqlValidation.dangerousOperations.length > 0;
    const safetyScore = (!injectionDetected && !dangerousOps) ? 100 : (injectionDetected ? 0 : 50);
    metrics.push({
      name: '安全性',
      value: safetyScore,
      target: 100,
      passed: !injectionDetected,
      weight: 25
    });

    // 3. 标识符正确性（权重20%）
    const missingIdentifiers =
      validationResult.sqlValidation.identifierCheck.missingTables.length +
      validationResult.sqlValidation.identifierCheck.missingColumns.length;
    const identifierScore = Math.max(0, 100 - missingIdentifiers * 20);
    metrics.push({
      name: '标识符正确性',
      value: identifierScore,
      target: 100,
      passed: missingIdentifiers === 0,
      weight: 20
    });

    // 4. 复杂度合理性（权重10%）
    const complexityExceeds = validationResult.sqlValidation.complexityCheck.exceedsThreshold;
    const complexityScore = complexityExceeds ? 50 : 100;
    metrics.push({
      name: '复杂度合理性',
      value: complexityScore,
      target: 100,
      passed: !complexityExceeds,
      weight: 10
    });

    // 5. 幻觉检测（权重15%）
    let hallucinationScore = 100;
    if (validationResult.hallucinationDetection) {
      hallucinationScore = 100 - validationResult.hallucinationDetection.score;
    }
    metrics.push({
      name: 'AI可靠性',
      value: Math.max(0, hallucinationScore),
      target: 80,
      passed: (hallucinationScore >= 80),
      weight: 15
    });

    return metrics;
  }

  /**
   * 确定质量等级
   */
  private determineGrade(score: number): QualityReport['grade'] {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(
    validationResult: ValidationResult,
    metrics: QualityMetric[]
  ): string[] {
    const recommendations: string[] = [];

    // 基于未通过的指标生成建议
    const failedMetrics = metrics.filter(m => !m.passed);

    for (const metric of failedMetrics) {
      switch (metric.name) {
        case '语法正确性':
          recommendations.push(
            '检查SQL语法错误',
            '确保括号和引号匹配',
            '验证所有关键字拼写正确'
          );
          break;

        case '安全性':
          if (validationResult.sqlValidation.injectionCheck.detected) {
            recommendations.push(
              '移除SQL注入风险',
              '使用参数化查询代替字符串拼接',
              '对用户输入进行严格的验证和转义'
            );
          }
          if (validationResult.sqlValidation.dangerousOperations.length > 0) {
            recommendations.push(
              '审查所有危险操作',
              '考虑使用只读查询',
              '在生产环境中执行前进行完整备份'
            );
          }
          break;

        case '标识符正确性':
          recommendations.push(
            '检查所有表名和字段名',
            '使用数据库实际的表结构',
            '考虑使用相似名称的建议'
          );
          break;

        case '复杂度合理性':
          recommendations.push(
            '简化查询逻辑',
            '考虑拆分复杂查询',
            '使用临时表存储中间结果'
          );
          break;

        case 'AI可靠性':
          recommendations.push(
            '人工审核AI生成的结果',
            '验证AI的推理过程',
            '考虑使用更可靠的查询方法'
          );
          break;
      }
    }

    // 基于警告生成建议
    if (validationResult.warnings.length > 0) {
      recommendations.push(
        `注意以下警告: ${validationResult.warnings.slice(0, 3).join(', ')}`
      );
    }

    // 通用建议
    if (failedMetrics.length > 0) {
      recommendations.push(
        '建议在执行前进行完整测试',
        '考虑使用查询分析工具进一步优化'
      );
    }

    return [...new Set(recommendations)]; // 去重
  }
}

// ============================================================
// 预定义的质量门禁标准
// ============================================================

/**
 * 严格标准（生产环境）
 */
export const STRICT_GATE: GateCriteria = {
  minScore: 90,
  requiredChecks: ['syntax', 'injection', 'identifiers', 'safety'],
  warningThreshold: 70,
  errorThreshold: 50
};

/**
 * 标准标准（测试环境）
 */
export const STANDARD_GATE: GateCriteria = {
  minScore: 70,
  requiredChecks: ['syntax', 'injection', 'identifiers'],
  warningThreshold: 50,
  errorThreshold: 30
};

/**
 * 宽松标准（开发环境）
 */
export const LENIENT_GATE: GateCriteria = {
  minScore: 50,
  requiredChecks: ['syntax', 'injection'],
  warningThreshold: 30,
  errorThreshold: 20
};

/**
 * 只读标准（只读查询）
 */
export const READ_ONLY_GATE: GateCriteria = {
  minScore: 70,
  requiredChecks: ['syntax', 'injection', 'identifiers'],
  warningThreshold: 50,
  errorThreshold: 30
};

// ============================================================
// 默认导出
// ============================================================

export default QualityGate;
