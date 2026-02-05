/**
 * 清洗建议引擎 - 单元测试
 *
 * @module tests/unit/services/cleaningRecommendationEngine
 * @version 2.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CleaningRecommendationEngine } from '../../../src/services/ai/cleaningRecommendationEngine';
import { DataQualityIssue, AnalysisOptions } from '../../../src/types/dataQuality';
import { MockAIService, MockCacheService } from '../../../src/utils/apiMock';
import {
  createMockDataQualityIssue,
  createTestDataWithMissingValues,
  createTestDataWithOutliers
} from '../../../src/utils/testHelpers';

// ============================================================================
// 测试数据
// ============================================================================

const mockIssues: DataQualityIssue[] = [
  {
    issueId: 'issue_missing_1',
    issueType: 'missing_value',
    severity: 'high',
    affectedColumns: ['age', 'email'],
    affectedRows: [1, 2, 3],
    description: '发现3个缺失值',
    statistics: {
      affectedRowCount: 3,
      affectedPercentage: 60,
      distribution: { age: 2, email: 1 }
    }
  },
  {
    issueId: 'issue_outlier_1',
    issueType: 'outlier',
    severity: 'medium',
    affectedColumns: ['salary'],
    affectedRows: [2],
    description: '发现1个异常值',
    statistics: {
      affectedRowCount: 1,
      affectedPercentage: 20,
      distribution: { salary: 1 }
    }
  }
];

// ============================================================================
// 测试套件
// ============================================================================

describe('CleaningRecommendationEngine', () => {
  let engine: CleaningRecommendationEngine;
  let mockAIService: MockAIService;
  let mockCacheService: MockCacheService;

  beforeEach(() => {
    mockAIService = new MockAIService();
    mockCacheService = new MockCacheService();
    engine = new CleaningRecommendationEngine(mockAIService as any, mockCacheService as any);
  });

  afterEach(() => {
    mockCacheService.reset();
    mockAIService.reset();
  });

  describe('基本功能测试', () => {
    it('应该成功初始化引擎', () => {
      expect(engine).toBeDefined();
      expect(engine.generateSuggestions).toBeInstanceOf(Function);
    });

    it('应该处理空问题列表', async () => {
      const suggestions = await engine.generateSuggestions([]);

      expect(suggestions).toBeDefined();
      expect(suggestions).toHaveLength(0);
    });

    it('应该为单个问题生成建议', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'missing_value'
      });

      const suggestions = await engine.generateSuggestions([issue]);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].issueId).toBe(issue.issueId);
    });
  });

  describe('缺失值处理建议', () => {
    it('应该为缺失值生成填充建议', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'missing_value',
        severity: 'high',
        statistics: {
          affectedRowCount: 10,
          affectedPercentage: 20,
          distribution: { age: 10 }
        }
      });

      const suggestions = await engine.generateSuggestions([issue]);

      expect(suggestions.length).toBeGreaterThan(0);

      const fillSuggestions = suggestions.filter(s =>
        s.strategy.type === 'fill' || s.strategy.strategyId.includes('fill')
      );
      expect(fillSuggestions.length).toBeGreaterThan(0);
    });

    it('应该根据严重程度调整建议优先级', async () => {
      const highSeverityIssue = createMockDataQualityIssue({
        issueType: 'missing_value',
        severity: 'critical',
        statistics: {
          affectedRowCount: 50,
          affectedPercentage: 50,
          distribution: { email: 50 }
        }
      });

      const lowSeverityIssue = createMockDataQualityIssue({
        issueType: 'missing_value',
        severity: 'low',
        statistics: {
          affectedRowCount: 2,
          affectedPercentage: 2,
          distribution: { name: 2 }
        }
      });

      const suggestions = await engine.generateSuggestions([highSeverityIssue, lowSeverityIssue]);

      const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high' || s.priority === 'critical');
      expect(highPrioritySuggestions.length).toBeGreaterThan(0);
    });

    it('应该为数值列生成平均值填充建议', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'missing_value',
        affectedColumns: ['age'],
        statistics: {
          affectedRowCount: 5,
          affectedPercentage: 10,
          distribution: { age: 5 }
        }
      });

      const suggestions = await engine.generateSuggestions([issue]);

      const meanFillSuggestion = suggestions.find(s =>
        s.strategy.strategyId === 'fill_mean'
      );

      expect(meanFillSuggestion).toBeDefined();
      expect(meanFillSuggestion?.strategy.type).toBe('fill');
    });

    it('应该为文本列生成众数填充建议', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'missing_value',
        affectedColumns: ['name'],
        statistics: {
          affectedRowCount: 3,
          affectedPercentage: 6,
          distribution: { name: 3 }
        }
      });

      const suggestions = await engine.generateSuggestions([issue]);

      const modeFillSuggestion = suggestions.find(s =>
        s.strategy.strategyId === 'fill_mode'
      );

      expect(modeFillSuggestion).toBeDefined();
    });
  });

  describe('异常值处理建议', () => {
    it('应该为异常值生成删除建议', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'outlier',
        severity: 'medium',
        affectedColumns: ['salary'],
        statistics: {
          affectedRowCount: 2,
          affectedPercentage: 4,
          distribution: { salary: 2 }
        }
      });

      const suggestions = await engine.generateSuggestions([issue]);

      const removeSuggestion = suggestions.find(s =>
        s.strategy.strategyId === 'remove_outliers'
      );

      expect(removeSuggestion).toBeDefined();
      expect(removeSuggestion?.strategy.type).toBe('delete');
    });

    it('应该为异常值生成替换建议', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'outlier',
        severity: 'low',
        affectedColumns: ['age'],
        statistics: {
          affectedRowCount: 1,
          affectedPercentage: 2,
          distribution: { age: 1 }
        }
      });

      const suggestions = await engine.generateSuggestions([issue]);

      const replaceSuggestion = suggestions.find(s =>
        s.strategy.strategyId === 'replace_outlier_with_median' ||
        s.strategy.strategyId === 'cap_outliers'
      );

      expect(replaceSuggestion).toBeDefined();
      expect(replaceSuggestion?.strategy.type).toBe('replace' || 'delete');
    });
  });

  describe('重复行处理建议', () => {
    it('应该为重复行生成删除建议', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'duplicate_row',
        severity: 'medium',
        affectedColumns: [],
        affectedRows: [2, 4],
        statistics: {
          affectedRowCount: 2,
          affectedPercentage: 10,
          distribution: {}
        }
      });

      const suggestions = await engine.generateSuggestions([issue]);

      const deleteDuplicateSuggestion = suggestions.find(s =>
        s.strategy.strategyId === 'delete_duplicates'
      );

      expect(deleteDuplicateSuggestion).toBeDefined();
    });
  });

  describe('格式一致性建议', () => {
    it('应该为格式问题生成标准化建议', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'format_inconsistency',
        severity: 'low',
        affectedColumns: ['email'],
        affectedRows: [1, 3],
        statistics: {
          affectedRowCount: 2,
          affectedPercentage: 4,
          distribution: { email: 2 }
        }
      });

      const suggestions = await engine.generateSuggestions([issue]);

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('影响评估', () => {
    it('应该正确评估建议的影响', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'missing_value',
        severity: 'medium',
        statistics: {
          affectedRowCount: 5,
          affectedPercentage: 10,
          distribution: { age: 5 }
        }
      });

      const suggestions = await engine.generateSuggestions([issue]);

      suggestions.forEach(suggestion => {
        expect(suggestion.impactAssessment).toBeDefined();
        expect(suggestion.impactAssessment.qualityImprovement).toBeGreaterThanOrEqual(0);
        expect(suggestion.impactAssessment.qualityImprovement).toBeLessThanOrEqual(100);
        expect(suggestion.impactAssessment.dataLossRisk).toBeDefined();
        expect(suggestion.impactAssessment.executionTimeEstimate).toBeGreaterThan(0);
      });
    });

    it('应该为高风险操作提供警告', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'outlier',
        severity: 'high',
        statistics: {
          affectedRowCount: 100,
          affectedPercentage: 50,
          distribution: { salary: 100 }
        }
      });

      const suggestions = await engine.generateSuggestions([issue]);

      const deleteSuggestion = suggestions.find(s =>
        s.strategy.strategyId === 'remove_outliers'
      );

      if (deleteSuggestion) {
        expect(deleteSuggestion.impactAssessment.dataLossRisk).toBe('high' || 'medium');
        expect(deleteSuggestion.impactAssessment.sideEffects.length).toBeGreaterThan(0);
      }
    });
  });

  describe('代码生成', () => {
    it('应该生成可执行的清洗代码', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'missing_value',
        affectedColumns: ['age'],
        statistics: {
          affectedRowCount: 3,
          affectedPercentage: 6,
          distribution: { age: 3 }
        }
      });

      const suggestions = await engine.generateSuggestions([issue]);

      suggestions.forEach(suggestion => {
        expect(suggestion.code).toBeDefined();
        expect(typeof suggestion.code).toBe('string');
        expect(suggestion.code.length).toBeGreaterThan(0);
      });
    });

    it('应该提供代码解释', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'missing_value',
        affectedColumns: ['email'],
        statistics: {
          affectedRowCount: 5,
          affectedPercentage: 10,
          distribution: { email: 5 }
        }
      });

      const suggestions = await engine.generateSuggestions([issue]);

      suggestions.forEach(suggestion => {
        expect(suggestion.explanation).toBeDefined();
        expect(typeof suggestion.explanation).toBe('string');
        expect(suggestion.explanation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('缓存功能', () => {
    it('应该缓存生成的建议', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'missing_value',
        statistics: {
          affectedRowCount: 5,
          affectedPercentage: 10,
          distribution: { age: 5 }
        }
      });

      // 第一次生成
      const suggestions1 = await engine.generateSuggestions([issue]);

      // 第二次生成（应该使用缓存）
      const suggestions2 = await engine.generateSuggestions([issue]);

      expect(suggestions1.length).toBe(suggestions2.length);
    });
  });

  describe('复杂度评估', () => {
    it('应该正确评估建议的复杂度', async () => {
      const issue = createMockDataQualityIssue({
        issueType: 'missing_value',
        statistics: {
          affectedRowCount: 1000,
          affectedPercentage: 20,
          distribution: { age: 1000 }
        }
      });

      const suggestions = await engine.generateSuggestions([issue]);

      suggestions.forEach(suggestion => {
        expect(suggestion.strategy.estimatedComplexity).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(suggestion.strategy.estimatedComplexity);
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理AI服务错误', async () => {
      mockAIService.setShouldFail(true);

      const issue = createMockDataQualityIssue({
        issueType: 'missing_value',
        statistics: {
          affectedRowCount: 5,
          affectedPercentage: 10,
          distribution: { age: 5 }
        }
      });

      // 应该有回退机制，使用内置策略
      const suggestions = await engine.generateSuggestions([issue]);

      expect(suggestions).toBeDefined();
    });

    it('应该处理无效的问题类型', async () => {
      const invalidIssue = createMockDataQualityIssue({
        issueType: 'invalid_type' as any,
        statistics: {
          affectedRowCount: 0,
          affectedPercentage: 0,
          distribution: {}
        }
      });

      const suggestions = await engine.generateSuggestions([invalidIssue]);

      // 应该返回空建议或错误处理
      expect(suggestions).toBeDefined();
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内生成建议', async () => {
      const issues = Array.from({ length: 50 }, (_, i) =>
        createMockDataQualityIssue({
          issueId: `issue_${i}`,
          issueType: 'missing_value',
          statistics: {
            affectedRowCount: 10,
            affectedPercentage: 2,
            distribution: { column: 10 }
          }
        })
      );

      const startTime = Date.now();
      const suggestions = await engine.generateSuggestions(issues);
      const duration = Date.now() - startTime;

      expect(suggestions).toBeDefined();
      expect(duration).toBeLessThan(5000); // 5秒内完成
    });
  });
});

// ============================================================================
// 集成测试
// ============================================================================

describe('CleaningRecommendationEngine 集成测试', () => {
  let engine: CleaningRecommendationEngine;
  let mockAIService: MockAIService;
  let mockCacheService: MockCacheService;

  beforeEach(() => {
    mockAIService = new MockAIService();
    mockCacheService = new MockCacheService();
    engine = new CleaningRecommendationEngine(mockAIService as any, mockCacheService as any);
  });

  afterEach(() => {
    mockCacheService.reset();
    mockAIService.reset();
  });

  it('应该为多种问题类型生成综合建议', async () => {
    const mixedIssues = [
      createMockDataQualityIssue({
        issueId: 'issue_1',
        issueType: 'missing_value',
        severity: 'high',
        statistics: {
          affectedRowCount: 10,
          affectedPercentage: 20,
          distribution: { age: 10 }
        }
      }),
      createMockDataQualityIssue({
        issueId: 'issue_2',
        issueType: 'outlier',
        severity: 'medium',
        statistics: {
          affectedRowCount: 2,
          affectedPercentage: 4,
          distribution: { salary: 2 }
        }
      }),
      createMockDataQualityIssue({
        issueId: 'issue_3',
        issueType: 'duplicate_row',
        severity: 'low',
        statistics: {
          affectedRowCount: 5,
          affectedPercentage: 10,
          distribution: {}
        }
      })
    ];

    const suggestions = await engine.generateSuggestions(mixedIssues);

    expect(suggestions.length).toBeGreaterThan(0);

    // 验证每种问题类型都有对应的建议
    const missingValueSuggestions = suggestions.filter(s => s.strategy.applicableIssues.includes('missing_value'));
    const outlierSuggestions = suggestions.filter(s => s.strategy.applicableIssues.includes('outlier'));
    const duplicateSuggestions = suggestions.filter(s => s.strategy.applicableIssues.includes('duplicate_row'));

    expect(missingValueSuggestions.length).toBeGreaterThan(0);
    expect(outlierSuggestions.length).toBeGreaterThan(0);
    expect(duplicateSuggestions.length).toBeGreaterThan(0);
  });

  it('应该按优先级排序建议', async () => {
    const issues = [
      createMockDataQualityIssue({
        issueId: 'issue_low',
        issueType: 'missing_value',
        severity: 'low',
        statistics: {
          affectedRowCount: 1,
          affectedPercentage: 1,
          distribution: { name: 1 }
        }
      }),
      createMockDataQualityIssue({
        issueId: 'issue_high',
        issueType: 'missing_value',
        severity: 'critical',
        statistics: {
          affectedRowCount: 50,
          affectedPercentage: 50,
          distribution: { email: 50 }
        }
      })
    ];

    const suggestions = await engine.generateSuggestions(issues);

    // 高优先级的建议应该排在前面
    const firstSuggestion = suggestions[0];
    expect(['high', 'critical']).toContain(firstSuggestion.priority);
  });
});
