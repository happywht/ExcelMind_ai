/**
 * 修复建议生成器
 *
 * 负责为验证发现的问题生成修复建议
 *
 * @module services/quality/fixSuggestionGenerator
 * @version 1.0.0
 */

import {
  FixSuggestion,
  FixWizard,
  ValidationResult,
  Hallucination,
  SQLValidationResult,
  ComplexityValidationResult,
  DangerousOperation
} from './aiOutputValidator';

// ============================================================
// 类型定义
// ============================================================

/**
 * SQL错误类型
 */
interface SQLError {
  /** 错误类型 */
  type: 'syntax' | 'injection' | 'missing_table' | 'missing_column' | 'complexity' | 'dangerous';
  /** SQL语句 */
  sql: string;
  /** 错误信息 */
  error?: string;
  /** 注入模式 */
  patterns?: string[];
  /** 缺失项 */
  missing?: string[];
  /** 复杂度信息 */
  complexity?: ComplexityValidationResult;
  /** 危险操作 */
  operations?: DangerousOperation[];
}

/**
 * 结果问题类型
 */
interface ResultIssue {
  /** 问题类型 */
  type: 'structure' | 'range' | 'outlier';
  /** 验证结果 */
  validation: any;
}

// ============================================================
// 修复建议生成器类
// ============================================================

/**
 * 修复建议生成器
 *
 * 为验证问题生成智能修复建议
 */
export class FixSuggestionGenerator {
  /**
   * 为SQL错误生成修复建议
   */
  generateSQLFix(sqlError: SQLError): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    switch (sqlError.type) {
      case 'syntax':
        suggestions.push(...this.generateSyntaxFix(sqlError));
        break;

      case 'injection':
        suggestions.push(...this.generateInjectionFix(sqlError));
        break;

      case 'missing_table':
        suggestions.push(...this.generateMissingTableFix(sqlError));
        break;

      case 'missing_column':
        suggestions.push(...this.generateMissingColumnFix(sqlError));
        break;

      case 'complexity':
        suggestions.push(...this.generateComplexityFix(sqlError));
        break;

      case 'dangerous':
        suggestions.push(...this.generateDangerousOpFix(sqlError));
        break;
    }

    return suggestions;
  }

  /**
   * 为幻觉问题生成修复建议
   */
  generateHallucinationFix(hallucination: Hallucination): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    switch (hallucination.type) {
      case 'field':
        suggestions.push({
          id: `halluc-field-${Date.now()}`,
          type: 'hallucination',
          priority: hallucination.severity === 'high' ? 'high' : 'medium',
          title: '字段名幻觉',
          description: hallucination.issue,
          suggested: hallucination.suggestion,
          autoFixable: false
        });
        break;

      case 'table':
        suggestions.push({
          id: `halluc-table-${Date.now()}`,
          type: 'hallucination',
          priority: hallucination.severity === 'high' ? 'high' : 'medium',
          title: '表名幻觉',
          description: hallucination.issue,
          suggested: hallucination.suggestion,
          autoFixable: false
        });
        break;

      case 'value':
        suggestions.push({
          id: `halluc-value-${Date.now()}`,
          type: 'hallucination',
          priority: 'medium',
          title: '数值幻觉',
          description: hallucination.issue,
          suggested: hallucination.suggestion,
          autoFixable: false
        });
        break;

      case 'logic':
        suggestions.push({
          id: `halluc-logic-${Date.now()}`,
          type: 'hallucination',
          priority: hallucination.severity === 'high' ? 'high' : 'medium',
          title: '逻辑幻觉',
          description: hallucination.issue,
          suggested: hallucination.suggestion,
          autoFixable: false
        });
        break;
    }

    return suggestions;
  }

  /**
   * 为结果问题生成修复建议
   */
  generateResultFix(resultIssue: ResultIssue): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    switch (resultIssue.type) {
      case 'structure':
        suggestions.push(...this.generateStructureFix(resultIssue.validation));
        break;

      case 'range':
        suggestions.push(...this.generateRangeFix(resultIssue.validation));
        break;

      case 'outlier':
        suggestions.push(...this.generateOutlierFix(resultIssue.validation));
        break;
    }

    return suggestions;
  }

  /**
   * 生成交互式修复向导
   */
  generateFixWizard(validationResult: ValidationResult): FixWizard {
    const steps: FixWizardStep[] = [];
    let canAutoFix = true;

    // 1. 处理SQL语法错误
    if (!validationResult.sqlValidation.syntaxValid) {
      steps.push({
        title: '修复SQL语法错误',
        description: validationResult.sqlValidation.syntaxError || 'SQL语句存在语法错误',
        options: [
          {
            title: '查看错误详情',
            description: '显示具体的语法错误位置和原因',
            isAutoFix: false
          },
          {
            title: '重新生成SQL',
            description: '让AI重新生成正确的SQL语句',
            isAutoFix: true,
            fixCode: 'REGENERATE_SQL'
          }
        ]
      });
      canAutoFix = false;
    }

    // 2. 处理SQL注入
    if (validationResult.sqlValidation.injectionCheck.detected) {
      steps.push({
        title: '处理SQL注入风险',
        description: `检测到${validationResult.sqlValidation.injectionCheck.types.length}种注入模式`,
        options: [
          {
            title: '移除危险字符',
            description: '自动移除或转义可能导致注入的字符',
            isAutoFix: true,
            fixCode: 'SANITIZE_SQL'
          },
          {
            title: '使用参数化查询',
            description: '改用参数化查询防止注入',
            isAutoFix: false
          }
        ]
      });
    }

    // 3. 处理缺失的表或字段
    const missingTables = validationResult.sqlValidation.identifierCheck.missingTables;
    const missingColumns = validationResult.sqlValidation.identifierCheck.missingColumns;

    if (missingTables.length > 0 || missingColumns.length > 0) {
      steps.push({
        title: '修复缺失的表或字段',
        description: `缺失: ${[...missingTables, ...missingColumns].join(', ')}`,
        options: [
          {
            title: '使用相似名称',
            description: '尝试使用相似的表名或字段名',
            isAutoFix: true,
            fixCode: 'SUGGEST_SIMILAR'
          },
          {
            title: '移除缺失项',
            description: '从查询中移除不存在的表或字段',
            isAutoFix: true,
            fixCode: 'REMOVE_MISSING'
          },
          {
            title: '手动修复',
            description: '手动指定正确的表名或字段名',
            isAutoFix: false
          }
        ]
      });
      canAutoFix = false;
    }

    // 4. 处理复杂度问题
    if (validationResult.sqlValidation.complexityCheck.exceedsThreshold) {
      steps.push({
        title: '降低查询复杂度',
        description: `当前复杂度: ${validationResult.sqlValidation.complexityCheck.score}`,
        options: [
          {
            title: '拆分查询',
            description: '将复杂查询拆分为多个简单查询',
            isAutoFix: false
          },
          {
            title: '使用临时表',
            description: '使用临时表存储中间结果',
            isAutoFix: false
          },
          {
            title: '保持原样',
            description: '接受当前复杂度，继续执行',
            isAutoFix: true,
            fixCode: 'ACCEPT_COMPLEXITY'
          }
        ]
      });
    }

    // 5. 处理危险操作
    if (validationResult.sqlValidation.dangerousOperations.length > 0) {
      steps.push({
        title: '审查危险操作',
        description: `检测到${validationResult.sqlValidation.dangerousOperations.length}个危险操作`,
        options: validationResult.sqlValidation.dangerousOperations.map(op => ({
          title: `审查${op.type}操作`,
          description: op.description,
          isAutoFix: false
        }))
      });
      canAutoFix = false;
    }

    // 6. 处理幻觉
    if (validationResult.hallucinationDetection) {
      const allHallucinations = [
        ...validationResult.hallucinationDetection.fieldHallucinations,
        ...validationResult.hallucinationDetection.tableHallucinations,
        ...validationResult.hallucinationDetection.valueHallucinations,
        ...validationResult.hallucinationDetection.logicHallucinations
      ];

      if (allHallucinations.length > 0) {
        steps.push({
          title: '处理AI幻觉',
          description: `检测到${allHallucinations.length}个可能的幻觉`,
          options: [
            {
              title: '人工审核',
              description: '仔细审查AI生成的输出',
              isAutoFix: false
            },
            {
              title: '重新生成',
              description: '让AI重新生成输出',
              isAutoFix: true,
              fixCode: 'REGENERATE_OUTPUT'
            },
            {
              title: '应用建议',
              description: '应用AI的修复建议',
              isAutoFix: false
            }
          ]
        });
        canAutoFix = false;
      }
    }

    // 7. 处理结果问题
    if (validationResult.resultValidation) {
      const { structure, range, outliers } = validationResult.resultValidation;

      if (!structure.matches) {
        steps.push({
          title: '调整结果结构',
          description: '结果结构与预期不符',
          options: [
            {
              title: '调整查询',
              description: '修改SQL以返回正确的列',
              isAutoFix: false
            },
            {
              title: '调整预期',
              description: '更新预期的结果结构',
              isAutoFix: true,
              fixCode: 'UPDATE_EXPECTATION'
            }
          ]
        });
      }

      if (range && !range.inRange) {
        steps.push({
          title: '处理超出范围的值',
          description: `发现${range.outOfRangeValues.length}个超出范围的值`,
          options: [
            {
              title: '筛选异常值',
              description: '添加WHERE条件过滤异常值',
              isAutoFix: false
            },
            {
              title: '标记异常值',
              description: '在结果中标记异常值',
              isAutoFix: true,
              fixCode: 'FLAG_OUTLIERS'
            },
            {
              title: '保持原样',
              description: '保留所有值，不做处理',
              isAutoFix: true,
              fixCode: 'KEEP_ALL'
            }
          ]
        });
      }

      if (outliers && outliers.detected) {
        steps.push({
          title: '处理异常值',
          description: `检测到${outliers.outliers.length}个异常值`,
          options: [
            {
              title: '移除异常值',
              description: '从结果中移除异常值',
              isAutoFix: true,
              fixCode: 'REMOVE_OUTLIERS'
            },
            {
              title: '替换异常值',
              description: '用平均值或中位数替换',
              isAutoFix: true,
              fixCode: 'REPLACE_OUTLIERS'
            },
            {
              title: '保留并标记',
              description: '保留异常值但进行标记',
              isAutoFix: true,
              fixCode: 'FLAG_OUTLIERS'
            }
          ]
        });
      }
    }

    return {
      steps,
      currentStep: 0,
      canAutoFix
    };
  }

  // ============================================================
  // 私有方法
  // ============================================================

  /**
   * 生成语法修复建议
   */
  private generateSyntaxFix(sqlError: SQLError): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    const error = sqlError.error || '';

    if (error.includes('括号')) {
      suggestions.push({
        id: `fix-syntax-bracket-${Date.now()}`,
        type: 'sql_syntax',
        priority: 'high',
        title: '修复括号匹配',
        description: 'SQL语句中的括号不匹配',
        autoFixable: true,
        applyCode: 'FIX_BRACKETS'
      });
    }

    if (error.includes('引号')) {
      suggestions.push({
        id: `fix-syntax-quote-${Date.now()}`,
        type: 'sql_syntax',
        priority: 'high',
        title: '修复引号匹配',
        description: 'SQL语句中的引号不匹配',
        autoFixable: true,
        applyCode: 'FIX_QUOTES'
      });
    }

    if (error.includes('FROM') || error.includes('SELECT')) {
      suggestions.push({
        id: `fix-syntax-structure-${Date.now()}`,
        type: 'sql_syntax',
        priority: 'high',
        title: '修复SQL结构',
        description: 'SQL语句缺少必要的子句',
        autoFixable: false,
        suggested: '确保包含SELECT和FROM子句'
      });
    }

    // 通用建议
    suggestions.push({
      id: `fix-syntax-generic-${Date.now()}`,
      type: 'sql_syntax',
      priority: 'high',
      title: '重新生成SQL',
      description: '让AI重新生成正确的SQL语句',
      autoFixable: true,
      applyCode: 'REGENERATE_SQL'
    });

    return suggestions;
  }

  /**
   * 生成注入修复建议
   */
  private generateInjectionFix(sqlError: SQLError): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    suggestions.push({
      id: `fix-injection-sanitize-${Date.now()}`,
      type: 'injection',
      priority: 'critical',
      title: '清理SQL注入',
      description: `检测到${sqlError.patterns?.length || 0}个注入模式`,
      autoFixable: true,
      applyCode: 'SANITIZE_SQL',
      suggested: '移除或转义危险字符'
    });

    suggestions.push({
      id: `fix-injection-param-${Date.now()}`,
      type: 'injection',
      priority: 'high',
      title: '使用参数化查询',
      description: '改用参数化查询防止SQL注入',
      autoFixable: false,
      suggested: '使用?或@param代替直接拼接值'
    });

    return suggestions;
  }

  /**
   * 生成缺失表修复建议
   */
  private generateMissingTableFix(sqlError: SQLError): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    const missing = sqlError.missing || [];

    missing.forEach(table => {
      suggestions.push({
        id: `fix-table-${table}-${Date.now()}`,
        type: 'identifier',
        priority: 'high',
        title: `表 "${table}" 不存在`,
        description: `数据库中找不到表 ${table}`,
        autoFixable: false,
        suggested: '检查表名是否正确或使用相似的表名'
      });
    });

    // 批量修复建议
    if (missing.length > 1) {
      suggestions.push({
        id: `fix-tables-all-${Date.now()}`,
        type: 'identifier',
        priority: 'high',
        title: '修复所有缺失表',
        description: `批量处理${missing.length}个缺失表`,
        autoFixable: true,
        applyCode: 'FIX_ALL_TABLES'
      });
    }

    return suggestions;
  }

  /**
   * 生成缺失字段修复建议
   */
  private generateMissingColumnFix(sqlError: SQLError): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    const missing = sqlError.missing || [];

    missing.forEach(column => {
      suggestions.push({
        id: `fix-column-${column}-${Date.now()}`,
        type: 'identifier',
        priority: 'medium',
        title: `字段 "${column}" 不存在`,
        description: `表中找不到字段 ${column}`,
        autoFixable: false,
        suggested: '检查字段名是否正确或使用相似的字段名'
      });
    });

    // 批量修复建议
    if (missing.length > 1) {
      suggestions.push({
        id: `fix-columns-all-${Date.now()}`,
        type: 'identifier',
        priority: 'medium',
        title: '修复所有缺失字段',
        description: `批量处理${missing.length}个缺失字段`,
        autoFixable: true,
        applyCode: 'FIX_ALL_COLUMNS'
      });
    }

    return suggestions;
  }

  /**
   * 生成复杂度修复建议
   */
  private generateComplexityFix(sqlError: SQLError): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    const complexity = sqlError.complexity;

    if (!complexity) {
      return suggestions;
    }

    suggestions.push({
      id: `fix-complexity-${Date.now()}`,
      type: 'complexity',
      priority: 'low',
      title: '降低查询复杂度',
      description: `当前复杂度为 ${complexity.score} (${complexity.level})`,
      autoFixable: false,
      suggested: '考虑拆分查询或使用临时表'
    });

    // 根据复杂度因素提供具体建议
    complexity.factors.forEach(factor => {
      let specificSuggestion = '';

      switch (factor.type) {
        case 'join':
          specificSuggestion = '考虑减少JOIN数量或使用子查询';
          break;
        case 'subquery':
          specificSuggestion = '考虑将子查询改为JOIN';
          break;
        case 'aggregation':
          specificSuggestion = '考虑减少聚合函数的使用';
          break;
        case 'groupBy':
          specificSuggestion = '考虑减少分组列数';
          break;
        default:
          specificSuggestion = factor.description;
      }

      suggestions.push({
        id: `fix-complexity-${factor.type}-${Date.now()}`,
        type: 'complexity',
        priority: 'low',
        title: `优化${factor.type}`,
        description: factor.description,
        autoFixable: false,
        suggested: specificSuggestion
      });
    });

    return suggestions;
  }

  /**
   * 生成危险操作修复建议
   */
  private generateDangerousOpFix(sqlError: SQLError): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    const operations = sqlError.operations || [];

    operations.forEach(op => {
      const isHigh = op.severity === 'high';

      suggestions.push({
        id: `fix-dangerous-${op.type}-${Date.now()}`,
        type: 'injection',
        priority: isHigh ? 'critical' : 'high',
        title: `${op.type}操作需要确认`,
        description: op.description,
        autoFixable: false,
        suggested: isHigh ? '强烈建议取消或修改此操作' : '请确认是否要执行此操作'
      });
    });

    return suggestions;
  }

  /**
   * 生成结构修复建议
   */
  private generateStructureFix(validation: any): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (validation.missingColumns && validation.missingColumns.length > 0) {
      suggestions.push({
        id: `fix-structure-missing-${Date.now()}`,
        type: 'result',
        priority: 'medium',
        title: '添加缺失列',
        description: `缺失列: ${validation.missingColumns.join(', ')}`,
        autoFixable: false,
        suggested: '在SELECT子句中添加缺失的列'
      });
    }

    if (validation.extraColumns && validation.extraColumns.length > 0) {
      suggestions.push({
        id: `fix-structure-extra-${Date.now()}`,
        type: 'result',
        priority: 'low',
        title: '移除额外列',
        description: `额外列: ${validation.extraColumns.join(', ')}`,
        autoFixable: true,
        applyCode: 'REMOVE_EXTRA_COLUMNS'
      });
    }

    return suggestions;
  }

  /**
   * 生成范围修复建议
   */
  private generateRangeFix(validation: any): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    suggestions.push({
      id: `fix-range-${Date.now()}`,
      type: 'result',
      priority: 'medium',
      title: '处理超出范围的值',
      description: `发现${validation.outOfRangeValues?.length || 0}个超出范围的值`,
      autoFixable: true,
      applyCode: 'FILTER_OUT_OF_RANGE'
    });

    return suggestions;
  }

  /**
   * 生成异常值修复建议
   */
  private generateOutlierFix(validation: any): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    suggestions.push({
      id: `fix-outlier-${Date.now()}`,
      type: 'result',
      priority: 'low',
      title: '处理异常值',
      description: `检测到${validation.outliers?.length || 0}个异常值`,
      autoFixable: true,
      applyCode: 'HANDLE_OUTLIERS'
    });

    return suggestions;
  }
}

// ============================================================
// 默认导出
// ============================================================

export default FixSuggestionGenerator;
