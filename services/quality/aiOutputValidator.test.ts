/**
 * AI输出验证器单元测试
 *
 * 全面测试质量控制系统的各个组件
 *
 * @module services/quality/__tests__
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  AIOutputValidator,
  SQLValidator,
  ResultValidator,
  HallucinationDetector,
  FixSuggestionGenerator,
  QualityGate,
  STRICT_GATE,
  STANDARD_GATE
} from '../index';
import type {
  DatabaseSchema,
  AIOutput,
  QueryContext,
  QueryResult
} from '../index';

// ============================================================
// 测试数据
// ============================================================

const mockSchema: DatabaseSchema = {
  tables: {
    '员工表': {
      name: '员工表',
      columns: [
        { name: '姓名', dataType: 'string', nullable: false },
        { name: '部门', dataType: 'string', nullable: true },
        { name: '销售额', dataType: 'number', nullable: true },
        { name: '入职日期', dataType: 'date', nullable: true }
      ]
    },
    '产品表': {
      name: '产品表',
      columns: [
        { name: '产品名称', dataType: 'string', nullable: false },
        { name: '价格', dataType: 'number', nullable: false },
        { name: '库存', dataType: 'number', nullable: true }
      ]
    }
  }
};

const mockQueryContext: QueryContext = {
  schema: mockSchema,
  originalQuery: '查找销售额大于10万的员工'
};

const mockValidAIOutput: AIOutput = {
  sqlQuery: 'SELECT 姓名, 部门 FROM 员工表 WHERE 销售额 > 100000',
  reasoning: '查找销售额大于10万的员工',
  confidence: 0.95
};

const mockQueryResult: QueryResult = {
  data: [
    { 姓名: '张三', 部门: '销售部', 销售额: 150000 },
    { 姓名: '李四', 部门: '市场部', 销售额: 120000 }
  ],
  rowCount: 2,
  columns: ['姓名', '部门', '销售额'],
  executionTime: 50
};

// ============================================================
// AIOutputValidator 测试套件
// ============================================================

describe('AIOutputValidator', () => {
  let validator: AIOutputValidator;

  beforeEach(() => {
    validator = new AIOutputValidator({
      enableInjectionCheck: true,
      enableHallucinationCheck: true,
      enableComplexityCheck: true,
      maxComplexity: 50,
      enableResultValidation: true,
      qualityGateThreshold: 70,
      strictMode: false
    });
  });

  describe('validateSQL', () => {
    it('应该验证正确的SQL', () => {
      const result = validator.validateSQL(
        'SELECT 姓名, 部门 FROM 员工表 WHERE 销售额 > 100000',
        mockSchema
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(70);
      expect(result.sqlValidation.syntaxValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测SQL语法错误', () => {
      const result = validator.validateSQL(
        'SELCT 姓名 FROM 员工表', // 拼写错误
        mockSchema
      );

      expect(result.sqlValidation.syntaxValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(70);
    });

    it('应该检测SQL注入尝试', () => {
      const result = validator.validateSQL(
        "SELECT 姓名 FROM 员工表 WHERE 姓名 = '张三' OR '1'='1'",
        mockSchema
      );

      expect(result.sqlValidation.injectionCheck.detected).toBe(true);
      expect(result.sqlValidation.injectionCheck.types).toContain('boolean_based');
      expect(result.score).toBeLessThan(70);
    });

    it('应该检测不存在的表', () => {
      const result = validator.validateSQL(
        'SELECT * FROM 不存在的表',
        mockSchema
      );

      expect(result.sqlValidation.identifierCheck.missingTables).toContain('不存在的表');
      expect(result.errors).toContain('不存在的表: 不存在的表');
    });

    it('应该检测不存在的字段', () => {
      const result = validator.validateSQL(
        'SELECT 不存在的字段 FROM 员工表',
        mockSchema
      );

      expect(result.sqlValidation.identifierCheck.missingColumns).toContain('不存在的字段');
      expect(result.errors).toContain('不存在的字段: 不存在的字段');
    });

    it('应该检测查询复杂度', () => {
      const complexSQL = `
        SELECT a.姓名, b.产品名称, c.价格
        FROM 员工表 a
        JOIN 产品表 b ON a.部门 = b.产品名称
        JOIN 产品表 c ON b.价格 = c.价格
        WHERE a.销售额 > (SELECT AVG(销售额) FROM 员工表)
        GROUP BY a.姓名, b.产品名称, c.价格
        HAVING COUNT(*) > 1
        ORDER BY a.姓名
        LIMIT 10
      `;

      const result = validator.validateSQL(complexSQL, mockSchema);

      expect(result.sqlValidation.complexityCheck.score).toBeGreaterThan(0);
      expect(result.sqlValidation.complexityCheck.level).not.toBe('simple');
    });

    it('应该检测危险操作', () => {
      const result = validator.validateSQL(
        'DROP TABLE 员工表',
        mockSchema
      );

      expect(result.sqlValidation.dangerousOperations.length).toBeGreaterThan(0);
      expect(result.sqlValidation.dangerousOperations[0].type).toBe('DROP');
      expect(result.warnings).toContain('检测到危险操作: DROP操作');
    });

    it('应该生成修复建议', () => {
      const result = validator.validateSQL(
        'SELCT 不存在的字段 FROM 不存在的表',
        mockSchema
      );

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toHaveProperty('type');
      expect(result.suggestions[0]).toHaveProperty('title');
      expect(result.suggestions[0]).toHaveProperty('priority');
    });
  });

  describe('validateResult', () => {
    it('应该验证有效的结果', () => {
      const result = validator.validateResult(mockQueryResult);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(70);
    });

    it('应该检测结构不匹配', () => {
      const result = validator.validateResult(mockQueryResult, ['姓名', '部门']);

      expect(result.resultValidation?.structure.matches).toBe(false);
      expect(result.resultValidation?.structure.extraColumns).toContain('销售额');
    });

    it('应该检测异常值', () => {
      const dataWithOutliers: QueryResult = {
        data: [
          { 姓名: '张三', 销售额: 100 },
          { 姓名: '李四', 销售额: 120 },
          { 姓名: '王五', 销售额: 999999 } // 异常值
        ],
        rowCount: 3
      };

      const result = validator.validateResult(dataWithOutliers);

      expect(result.resultValidation?.outliers?.detected).toBe(true);
      expect(result.resultValidation?.outliers?.outliers.length).toBeGreaterThan(0);
    });
  });

  describe('detectHallucination', () => {
    it('应该检测字段名幻觉', () => {
      const aiOutput: AIOutput = {
        sqlQuery: 'SELECT 不存在的字段 FROM 员工表'
      };

      const result = validator.detectHallucination(aiOutput, mockQueryContext);

      expect(result.score).toBeGreaterThan(0);
      expect(result.hallucinations.length).toBeGreaterThan(0);
      expect(result.hallucinations[0].type).toBe('field');
    });

    it('应该检测表名幻觉', () => {
      const aiOutput: AIOutput = {
        sqlQuery: 'SELECT * FROM 不存在的表'
      };

      const result = validator.detectHallucination(aiOutput, mockQueryContext);

      expect(result.score).toBeGreaterThan(0);
      expect(result.hallucinations.some(h => h.type === 'table')).toBe(true);
    });

    it('应该检测逻辑幻觉', () => {
      const aiOutput: AIOutput = {
        sqlQuery: 'SELECT * FROM 员工表 WHERE 姓名 = "张三" OR 姓名 = "李四"'
      };

      const context: QueryContext = {
        ...mockQueryContext,
        originalQuery: '查找姓名同时是张三和李四的员工' // 矛盾的查询
      };

      const result = validator.detectHallucination(aiOutput, context);

      expect(result.hallucinations.some(h => h.type === 'logic')).toBe(true);
    });

    it('应该在低置信度时警告', () => {
      const aiOutput: AIOutput = {
        sqlQuery: 'SELECT * FROM 员工表',
        confidence: 0.5
      };

      const result = validator.detectHallucination(aiOutput, mockQueryContext);

      expect(result.hallucinations.some(h => h.issue.includes('置信度'))).toBe(true);
    });
  });

  describe('runValidationSuite', () => {
    it('应该执行完整的验证套件', () => {
      const aiOutput: AIOutput = {
        ...mockValidAIOutput,
        result: mockQueryResult
      };

      const result = validator.runValidationSuite(aiOutput, mockQueryContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('sqlValidation');
      expect(result).toHaveProperty('resultValidation');
      expect(result).toHaveProperty('hallucinationDetection');
      expect(result).toHaveProperty('suggestions');
    });

    it('应该在严重错误时失败', () => {
      const aiOutput: AIOutput = {
        sqlQuery: "DROP TABLE 员工表; -- ' OR '1'='1",
        confidence: 0.3
      };

      const result = validator.runValidationSuite(aiOutput, mockQueryContext);

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(30);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该在完美情况下通过', () => {
      const aiOutput: AIOutput = {
        ...mockValidAIOutput,
        result: mockQueryResult
      };

      const result = validator.runValidationSuite(aiOutput, mockQueryContext);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(70);
    });
  });

  describe('checkQualityGate', () => {
    it('应该生成质量报告', () => {
      const aiOutput: AIOutput = {
        ...mockValidAIOutput,
        result: mockQueryResult
      };

      const validationResult = validator.runValidationSuite(aiOutput, mockQueryContext);
      const report = validator.checkQualityGate(validationResult);

      expect(report).toHaveProperty('score');
      expect(report).toHaveProperty('grade');
      expect(report).toHaveProperty('passed');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('recommendations');
      expect(['A', 'B', 'C', 'D', 'F']).toContain(report.grade);
    });

    it('应该根据分数给出正确等级', () => {
      const aiOutput: AIOutput = {
        ...mockValidAIOutput,
        result: mockQueryResult
      };

      const validationResult = validator.runValidationSuite(aiOutput, mockQueryContext);
      validationResult.score = 95; // 设置高分
      const report = validator.checkQualityGate(validationResult);

      expect(report.grade).toBe('A');
    });
  });
});

// ============================================================
// SQLValidator 测试套件
// ============================================================

describe('SQLValidator', () => {
  let validator: SQLValidator;

  beforeEach(() => {
    validator = new SQLValidator();
  });

  describe('validateSyntax', () => {
    it('应该验证正确的SELECT语法', () => {
      const result = validator.validateSyntax('SELECT * FROM 员工表');
      expect(result.valid).toBe(true);
    });

    it('应该拒绝空SQL', () => {
      const result = validator.validateSyntax('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('空');
    });

    it('应该检测括号不匹配', () => {
      const result = validator.validateSyntax('SELECT * FROM 员工表 WHERE (销售额 > 10000');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('括号');
    });

    it('应该检测引号不匹配', () => {
      const result = validator.validateSyntax("SELECT * FROM 员工表 WHERE 姓名 = '张三");
      expect(result.valid).toBe(false);
      expect(result.error).toContain('引号');
    });
  });

  describe('checkInjection', () => {
    it('应该检测UNION注入', () => {
      const result = validator.checkInjection("SELECT * FROM 员工表 WHERE 姓名 = 'x' UNION SELECT * FROM 产品表");
      expect(result.detected).toBe(true);
      expect(result.types).toContain('union_based');
    });

    it('应该检测布尔注入', () => {
      const result = validator.checkInjection("SELECT * FROM 员工表 WHERE 姓名 = 'x' OR '1'='1'");
      expect(result.detected).toBe(true);
      expect(result.types).toContain('boolean_based');
    });

    it('应该检测注释注入', () => {
      const result = validator.checkInjection("SELECT * FROM 员工表 WHERE 姓名 = 'x' -- 注释");
      expect(result.detected).toBe(true);
      expect(result.types).toContain('comment');
    });

    it('应该检测多语句注入', () => {
      const result = validator.checkInjection("SELECT * FROM 员工表; DROP TABLE 产品表");
      expect(result.detected).toBe(true);
      expect(result.types).toContain('multi_statement');
    });
  });

  describe('validateIdentifiers', () => {
    it('应该找到有效的表名', () => {
      const result = validator.validateIdentifiers('SELECT * FROM 员工表', mockSchema);
      expect(result.tables[0].exists).toBe(true);
      expect(result.missingTables.length).toBe(0);
    });

    it('应该检测不存在的表', () => {
      const result = validator.validateIdentifiers('SELECT * FROM 不存在的表', mockSchema);
      expect(result.missingTables).toContain('不存在的表');
    });

    it('应该找到有效的字段名', () => {
      const result = validator.validateIdentifiers('SELECT 姓名 FROM 员工表', mockSchema);
      expect(result.columns.some(c => c.name === '姓名' && c.exists)).toBe(true);
    });

    it('应该处理通配符', () => {
      const result = validator.validateIdentifiers('SELECT * FROM 员工表', mockSchema);
      expect(result.columns.some(c => c.name === '*')).toBe(true);
    });
  });

  describe('validateComplexity', () => {
    it('应该评估简单查询', () => {
      const result = validator.validateComplexity('SELECT * FROM 员工表');
      expect(result.level).toBe('simple');
      expect(result.score).toBeLessThan(20);
    });

    it('应该评估JOIN查询', () => {
      const result = validator.validateComplexity('SELECT * FROM 员工表 JOIN 产品表 ON 员工表.部门 = 产品表.产品名称');
      expect(result.factors.some(f => f.type === 'join')).toBe(true);
      expect(result.level).not.toBe('simple');
    });

    it('应该评估聚合查询', () => {
      const result = validator.validateComplexity('SELECT 部门, COUNT(*) FROM 员工表 GROUP BY 部门');
      expect(result.factors.some(f => f.type === 'aggregation')).toBe(true);
      expect(result.factors.some(f => f.type === 'groupBy')).toBe(true);
    });

    it('应该检测子查询', () => {
      const result = validator.validateComplexity('SELECT * FROM 员工表 WHERE 销售额 > (SELECT AVG(销售额) FROM 员工表)');
      expect(result.factors.some(f => f.type === 'subquery')).toBe(true);
    });
  });

  describe('detectDangerousOperations', () => {
    it('应该检测DROP操作', () => {
      const result = validator.detectDangerousOperations('DROP TABLE 员工表');
      expect(result[0].type).toBe('DROP');
      expect(result[0].severity).toBe('high');
    });

    it('应该检测DELETE操作', () => {
      const result = validator.detectDangerousOperations('DELETE FROM 员工表 WHERE 销售额 < 0');
      expect(result[0].type).toBe('DELETE');
    });

    it('应该检测UPDATE操作', () => {
      const result = validator.detectDangerousOperations('UPDATE 员工表 SET 销售额 = 0');
      expect(result[0].type).toBe('UPDATE');
    });
  });
});

// ============================================================
// ResultValidator 测试套件
// ============================================================

describe('ResultValidator', () => {
  let validator: ResultValidator;

  beforeEach(() => {
    validator = new ResultValidator();
  });

  describe('validateStructure', () => {
    it('应该验证匹配的结构', () => {
      const result = validator.validateStructure(mockQueryResult, ['姓名', '部门', '销售额']);
      expect(result.matches).toBe(true);
    });

    it('应该检测缺失的列', () => {
      const result = validator.validateStructure(mockQueryResult, ['姓名', '部门', '年龄']);
      expect(result.matches).toBe(false);
      expect(result.missingColumns).toContain('年龄');
    });

    it('应该检测额外的列', () => {
      const result = validator.validateStructure(mockQueryResult, ['姓名']);
      expect(result.extraColumns).toContain('部门');
    });
  });

  describe('validateRange', () => {
    it('应该检测超出范围的值', () => {
      const constraints = {
        销售额: { min: 0, max: 200000 }
      };

      const data: QueryResult = {
        data: [
          { 销售额: 150000 },
          { 销售额: 300000 } // 超出范围
        ],
        rowCount: 2
      };

      const result = validator.validateRange(data, constraints);
      expect(result.inRange).toBe(false);
      expect(result.outOfRangeValues.length).toBe(1);
      expect(result.outOfRangeValues[0].column).toBe('销售额');
    });
  });

  describe('detectOutliers', () => {
    it('应该检测统计异常值', () => {
      const data: QueryResult = {
        data: [
          { 值: 10 },
          { 值: 12 },
          { 值: 11 },
          { 值: 13 },
          { 值: 1000 } // 明显的异常值
        ],
        rowCount: 5
      };

      const result = validator.detectOutliers(data);
      expect(result.detected).toBe(true);
      expect(result.outliers.length).toBeGreaterThan(0);
    });

    it('应该处理空结果', () => {
      const data: QueryResult = {
        data: [],
        rowCount: 0
      };

      const result = validator.detectOutliers(data);
      expect(result.detected).toBe(false);
      expect(result.outliers).toHaveLength(0);
    });
  });

  describe('validateConsistency', () => {
    it('应该检测列数变化', () => {
      const history: QueryResult[] = [
        {
          data: [{ A: 1, B: 2, C: 3 }],
          rowCount: 1,
          columns: ['A', 'B', 'C']
        }
      ];

      const current: QueryResult = {
        data: [{ A: 1, B: 2 }],
        rowCount: 1,
        columns: ['A', 'B']
      };

      const result = validator.validateConsistency(current, history);
      expect(result.consistent).toBe(false);
      expect(result.inconsistencies.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================
// HallucinationDetector 测试套件
// ============================================================

describe('HallucinationDetector', () => {
  let detector: HallucinationDetector;

  beforeEach(() => {
    detector = new HallucinationDetector();
  });

  describe('detectFieldHallucination', () => {
    it('应该检测不存在的字段', () => {
      const aiOutput: AIOutput = {
        sqlQuery: 'SELECT 不存在的字段 FROM 员工表'
      };

      const result = detector.detectFieldHallucination(aiOutput, mockSchema);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('field');
      expect(result[0].severity).toBe('high');
    });

    it('应该建议相似的字段名', () => {
      const aiOutput: AIOutput = {
        sqlQuery: 'SELECT 销售额 FROM 员工表' // 假设只有"销售"字段
      };

      const result = detector.detectFieldHallucination(aiOutput, mockSchema);
      if (result.length > 0) {
        expect(result[0].suggestion).toBeDefined();
      }
    });
  });

  describe('calculateHallucinationScore', () => {
    it('应该计算合理的分数', () => {
      const aiOutput: AIOutput = {
        sqlQuery: 'SELECT 不存在的字段 FROM 不存在的表',
        confidence: 0.5
      };

      const score = detector.calculateHallucinationScore(aiOutput, mockQueryContext);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('应该在无幻觉时给出低分', () => {
      const aiOutput: AIOutput = mockValidAIOutput;

      const score = detector.calculateHallucinationScore(aiOutput, mockQueryContext);
      expect(score).toBeLessThan(30);
    });
  });
});

// ============================================================
// QualityGate 测试套件
// ============================================================

describe('QualityGate', () => {
  it('应该使用严格标准', () => {
    const gate = new QualityGate(STRICT_GATE);

    const mockValidation: any = {
      score: 85,
      sqlValidation: {
        syntaxValid: true,
        injectionCheck: { detected: false },
        identifierCheck: { missingTables: [], missingColumns: [] },
        complexityCheck: { exceedsThreshold: false },
        dangerousOperations: []
      },
      hallucinationDetection: { score: 10 }
    };

    const result = gate.check(mockValidation);
    expect(result.score).toBe(85);
  });

  it('应该使用标准标准', () => {
    const gate = new QualityGate(STANDARD_GATE);

    const mockValidation: any = {
      score: 75,
      sqlValidation: {
        syntaxValid: true,
        injectionCheck: { detected: false },
        identifierCheck: { missingTables: [], missingColumns: [] },
        complexityCheck: { exceedsThreshold: false },
        dangerousOperations: []
      }
    };

    const result = gate.check(mockValidation);
    expect(result.passed).toBe(true);
  });

  it('应该生成质量报告', () => {
    const gate = new QualityGate(STANDARD_GATE);

    const mockValidation: any = {
      score: 85,
      sqlValidation: {
        syntaxValid: true,
        injectionCheck: { detected: false },
        identifierCheck: { missingTables: [], missingColumns: [] },
        complexityCheck: { exceedsThreshold: false },
        dangerousOperations: []
      },
      warnings: []
    };

    const report = gate.generateReport(mockValidation);
    expect(report.score).toBe(85);
    expect(report.grade).toBeDefined();
    expect(report.metrics).toBeDefined();
    expect(report.recommendations).toBeDefined();
  });
});

// ============================================================
// 性能测试
// ============================================================

describe('Performance Tests', () => {
  it('应该在100ms内完成SQL验证', () => {
    const validator = new SQLValidator();

    const start = performance.now();
    validator.validateSyntax('SELECT * FROM 员工表 WHERE 销售额 > 10000');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('应该在100ms内完成完整验证', () => {
    const validator = new AIOutputValidator();

    const start = performance.now();
    validator.runValidationSuite(mockValidAIOutput, mockQueryContext);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});

// ============================================================
// 边界情况测试
// ============================================================

describe('Edge Cases', () => {
  let validator: AIOutputValidator;

  beforeEach(() => {
    validator = new AIOutputValidator();
  });

  it('应该处理空SQL', () => {
    const result = validator.validateSQL('', mockSchema);
    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('应该处理null结果', () => {
    const result = validator.validateResult({ data: null, rowCount: 0 } as any);
    expect(result.passed).toBe(true); // 空结果视为有效
  });

  it('应该处理超大SQL', () => {
    const largeSQL = 'SELECT * FROM 员工表 WHERE ' + '姓名 = ? AND '.repeat(1000);
    const result = validator.validateSQL(largeSQL, mockSchema);
    expect(result).toBeDefined();
  });

  it('应该处理特殊字符', () => {
    const result = validator.validateSQL(
      "SELECT * FROM 员工表 WHERE 姓名 = '张三\\'s数据'",
      mockSchema
    );
    expect(result).toBeDefined();
  });
});

// ============================================================
// 集成测试
// ============================================================

describe('Integration Tests', () => {
  it('应该完整处理实际场景', () => {
    const validator = new AIOutputValidator({
      strictMode: false
    });

    // 模拟实际使用场景
    const aiOutput: AIOutput = {
      sqlQuery: 'SELECT 姓名, SUM(销售额) as 总销售额 FROM 员工表 GROUP BY 姓名 HAVING 总销售额 > 100000',
      reasoning: '查找销售额大于10万的员工',
      confidence: 0.85,
      result: {
        data: [
          { 姓名: '张三', 总销售额: 150000 }
        ],
        rowCount: 1,
        executionTime: 45
      }
    };

    const result = validator.runValidationSuite(aiOutput, mockQueryContext);

    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThan(70);
    expect(result.suggestions.length).toBeGreaterThanOrEqual(0);

    const report = validator.checkQualityGate(result);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(report.grade);
  });
});
