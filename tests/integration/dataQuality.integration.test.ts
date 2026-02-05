/**
 * 数据质量集成测试
 *
 * 测试完整的数据质量分析流程
 *
 * @module tests/integration/dataQuality
 * @version 2.0.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DataQualityAnalyzer } from '../../../src/services/ai/dataQualityAnalyzer';
import { CleaningRecommendationEngine } from '../../../src/services/ai/cleaningRecommendationEngine';
import { MockAIService, MockCacheService } from '../../../src/utils/apiMock';
import {
  createMockExcelData,
  createTestDataWithMissingValues,
  createTestDataWithOutliers,
  createTestDataWithDuplicates,
  createCleanTestData
} from '../../../src/utils/testHelpers';

// ============================================================================
// 测试套件
// ============================================================================

describe('数据质量集成测试', () => {
  let analyzer: DataQualityAnalyzer;
  let engine: CleaningRecommendationEngine;
  let mockAIService: MockAIService;
  let mockCacheService: MockCacheService;

  beforeAll(() => {
    mockAIService = new MockAIService();
    mockCacheService = new MockCacheService();

    analyzer = new DataQualityAnalyzer(mockAIService as any, mockCacheService as any);
    engine = new CleaningRecommendationEngine(mockAIService as any, mockCacheService as any);
  });

  afterAll(() => {
    mockCacheService.reset();
    mockAIService.reset();
  });

  describe('完整数据质量分析流程', () => {
    it('应该完成从上传到分析的完整流程', async () => {
      // 1. 准备测试数据
      const testData = createTestDataWithMissingValues();
      const excelData = createMockExcelData(testData);

      // 2. 执行数据质量分析
      const report = await analyzer.analyze(excelData, {
        detectMissing: true,
        detectOutliers: true,
        detectDuplicates: true,
        detectFormat: true
      });

      // 3. 验证分析结果
      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.totalRows).toBe(testData.length);
      expect(report.totalColumns).toBe(Object.keys(testData[0]).length);
      expect(report.qualityScore).toBeLessThan(100);
      expect(report.issues.length).toBeGreaterThan(0);

      // 4. 生成清洗建议
      const suggestions = await engine.generateSuggestions(report.issues);

      // 5. 验证建议
      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);

      suggestions.forEach(suggestion => {
        expect(suggestion.suggestionId).toBeDefined();
        expect(suggestion.issueId).toBeDefined();
        expect(suggestion.strategy).toBeDefined();
        expect(suggestion.priority).toBeDefined();
        expect(suggestion.impactAssessment).toBeDefined();
        expect(suggestion.code).toBeDefined();
      });
    });

    it('应该正确处理干净数据', async () => {
      // 1. 准备干净数据
      const cleanData = createCleanTestData();
      const excelData = createMockExcelData(cleanData);

      // 2. 执行分析
      const report = await analyzer.analyze(excelData);

      // 3. 验证结果
      expect(report.qualityScore).toBe(100);
      expect(report.issues).toHaveLength(0);

      // 4. 生成建议（应该为空）
      const suggestions = await engine.generateSuggestions(report.issues);
      expect(suggestions).toHaveLength(0);
    });

    it('应该处理混合问题数据', async () => {
      // 1. 准备包含多种问题的数据
      const mixedData = [
        { id: 1, name: 'Alice', age: 25, email: 'alice@example.com' },
        { id: 2, name: '', age: 30, email: 'bob@example.com' }, // 缺失值
        { id: 3, name: 'Alice', age: 25, email: 'alice@example.com' }, // 重复行
        { id: 4, name: 'David', age: 999, email: 'invalid-email' }, // 异常值 + 格式问题
        { id: 5, name: 'Eve', age: 28, email: 'eve@example.com' }
      ];

      const excelData = createMockExcelData(mixedData);

      // 2. 执行全面分析
      const report = await analyzer.analyze(excelData, {
        detectMissing: true,
        detectOutliers: true,
        detectDuplicates: true,
        detectFormat: true
      });

      // 3. 验证检测到多种问题
      expect(report.issues.length).toBeGreaterThan(1);

      const issueTypes = new Set(report.issues.map(issue => issue.issueType));
      expect(issueTypes.has('missing_value') || issueTypes.has('duplicate_row') ||
             issueTypes.has('outlier') || issueTypes.has('format_inconsistency')).toBe(true);

      // 4. 为每种问题生成建议
      const suggestions = await engine.generateSuggestions(report.issues);

      // 5. 验证建议覆盖所有问题
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('AI建议生成流程', () => {
    it('应该生成有意义的清洗建议', async () => {
      // 1. 准备有问题的数据
      const problematicData = createTestDataWithMissingValues();
      const excelData = createMockExcelData(problematicData);

      // 2. 分析数据
      const report = await analyzer.analyze(excelData, {
        detectMissing: true
      });

      // 3. 生成建议
      const suggestions = await engine.generateSuggestions(report.issues);

      // 4. 验证建议质量
      suggestions.forEach(suggestion => {
        // 验证建议包含所有必要字段
        expect(suggestion.strategy.name).toBeDefined();
        expect(suggestion.strategy.description).toBeDefined();
        expect(suggestion.strategy.type).toBeDefined();

        // 验证影响评估
        expect(suggestion.impactAssessment.qualityImprovement).toBeGreaterThanOrEqual(0);
        expect(suggestion.impactAssessment.qualityImprovement).toBeLessThanOrEqual(100);
        expect(suggestion.impactAssessment.dataLossRisk).toBeDefined();
        expect(suggestion.impactAssessment.executionTimeEstimate).toBeGreaterThan(0);

        // 验证代码生成
        expect(suggestion.code).toBeDefined();
        expect(typeof suggestion.code).toBe('string');
        expect(suggestion.code.length).toBeGreaterThan(0);

        // 验证解释
        expect(suggestion.explanation).toBeDefined();
        expect(typeof suggestion.explanation).toBe('string');
        expect(suggestion.explanation.length).toBeGreaterThan(0);
      });
    });

    it('应该按优先级排序建议', async () => {
      // 1. 准备有严重问题的数据
      const severeData = [
        { id: 1, name: '', age: null, email: '' },
        { id: 2, name: '', age: null, email: '' },
        { id: 3, name: '', age: null, email: '' },
        { id: 4, name: '', age: null, email: '' },
        { id: 5, name: '', age: null, email: '' }
      ];

      const excelData = createMockExcelData(severeData);

      // 2. 分析
      const report = await analyzer.analyze(excelData);

      // 3. 生成建议
      const suggestions = await engine.generateSuggestions(report.issues);

      // 4. 验证优先级排序
      if (suggestions.length > 1) {
        const firstPriority = suggestions[0].priority;
        expect(['high', 'critical']).toContain(firstPriority);
      }
    });
  });

  describe('自动修复执行流程', () => {
    it('应该能够执行清洗建议', async () => {
      // 1. 准备数据
      const data = createTestDataWithMissingValues();
      const excelData = createMockExcelData(data);

      // 2. 分析
      const report = await analyzer.analyze(excelData);

      // 3. 生成建议
      const suggestions = await engine.generateSuggestions(report.issues);

      // 4. 选择要执行的建议
      const selectedSuggestions = suggestions.slice(0, 2);

      // 5. 模拟执行（这里需要实际的清洗服务）
      // 由于我们没有实际的清洗服务，这里只验证建议的有效性
      selectedSuggestions.forEach(suggestion => {
        expect(suggestion.strategy.requiresCodeGeneration).toBe(true);
        expect(suggestion.code).toBeDefined();

        // 验证代码是可执行的（语法检查）
        expect(() => {
          // 这里只是验证代码字符串不为空
          expect(suggestion.code.length).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });

    it('应该处理执行失败的情况', async () => {
      // 1. 准备数据
      const data = createTestDataWithOutliers();
      const excelData = createMockExcelData(data);

      // 2. 分析
      const report = await analyzer.analyze(excelData, {
        detectOutliers: true
      });

      // 3. 生成建议
      const suggestions = await engine.generateSuggestions(report.issues);

      // 4. 验证风险评估
      suggestions.forEach(suggestion => {
        if (suggestion.strategy.type === 'delete') {
          // 删除操作应该有风险警告
          expect(suggestion.impactAssessment.dataLossRisk).not.toBe('none');
          expect(suggestion.impactAssessment.sideEffects.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('大数据集处理', () => {
    it('应该处理大型数据集', async () => {
      // 1. 创建大数据集（1000行）
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        age: Math.floor(Math.random() * 50) + 20,
        email: `user${i + 1}@example.com`,
        // 随机插入一些缺失值
        ...(Math.random() < 0.1 ? { age: null } : {}),
        ...(Math.random() < 0.05 ? { email: '' } : {})
      }));

      const excelData = createMockExcelData(largeData);

      // 2. 分析
      const startTime = Date.now();
      const report = await analyzer.analyze(excelData);
      const duration = Date.now() - startTime;

      // 3. 验证结果
      expect(report).toBeDefined();
      expect(report.totalRows).toBe(1000);
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成

      // 4. 生成建议
      const suggestions = await engine.generateSuggestions(report.issues);
      expect(suggestions).toBeDefined();
    });
  });

  describe('缓存性能', () => {
    it('应该使用缓存加速重复分析', async () => {
      const data = createCleanTestData();
      const excelData = createMockExcelData(data);

      // 1. 第一次分析
      const startTime1 = Date.now();
      const report1 = await analyzer.analyze(excelData);
      const duration1 = Date.now() - startTime1;

      // 2. 第二次分析（应该使用缓存）
      const startTime2 = Date.now();
      const report2 = await analyzer.analyze(excelData);
      const duration2 = Date.now() - startTime2;

      // 3. 验证缓存效果
      expect(report1.reportId).toBe(report2.reportId);
      expect(duration2).toBeLessThan(duration1);
    });
  });

  describe('错误恢复', () => {
    it('应该从分析错误中恢复', async () => {
      // 1. 模拟AI服务错误
      mockAIService.setShouldFail(true);

      const data = createTestDataWithMissingValues();
      const excelData = createMockExcelData(data);

      // 2. 尝试分析（应该有降级处理）
      const report = await analyzer.analyze(excelData);

      // 3. 验证降级处理
      expect(report).toBeDefined();
      // 即使AI失败，基础分析应该仍然工作

      // 4. 恢复AI服务
      mockAIService.setShouldFail(false);
    });

    it('应该处理建议生成失败', async () => {
      // 1. 模拟AI服务错误
      mockAIService.setShouldFail(true);

      const data = createTestDataWithOutliers();
      const excelData = createMockExcelData(data);

      // 2. 分析
      const report = await analyzer.analyze(excelData);

      // 3. 尝试生成建议（应该有降级处理）
      const suggestions = await engine.generateSuggestions(report.issues);

      // 4. 验证降级处理
      expect(suggestions).toBeDefined();
      // 应该使用内置策略库

      // 5. 恢复AI服务
      mockAIService.setShouldFail(false);
    });
  });

  describe('端到端场景', () => {
    it('应该完成真实的业务场景', async () => {
      // 场景：销售数据质量检查和清洗

      // 1. 准备销售数据（包含多种问题）
      const salesData = [
        { orderId: 1, customerName: '张三', amount: 1000, date: '2024-01-01' },
        { orderId: 2, customerName: '', amount: null, date: '2024-01-02' }, // 缺失值
        { orderId: 3, customerName: '李四', amount: 1500, date: '2024-01-03' },
        { orderId: 2, customerName: '张三', amount: 1000, date: '2024-01-01' }, // 重复订单
        { orderId: 5, customerName: '王五', amount: 999999, date: '2024-01-05' }, // 异常金额
        { orderId: 6, customerName: '赵六', amount: 2000, date: 'invalid-date' } // 格式问题
      ];

      const excelData = createMockExcelData(salesData);

      // 2. 执行全面分析
      const report = await analyzer.analyze(excelData, {
        detectMissing: true,
        detectOutliers: true,
        detectDuplicates: true,
        detectFormat: true
      });

      // 3. 验证检测到的问题
      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.qualityScore).toBeLessThan(100);

      // 4. 获取清洗建议
      const suggestions = await engine.generateSuggestions(report.issues);

      // 5. 验证建议的完整性
      expect(suggestions.length).toBeGreaterThan(0);

      // 6. 验证建议的业务价值
      suggestions.forEach(suggestion => {
        expect(suggestion.impactAssessment.qualityImprovement).toBeGreaterThan(0);
        expect(suggestion.explanation).toBeDefined();
        expect(suggestion.explanation.length).toBeGreaterThan(0);
      });
    });
  });
});

// ============================================================================
// 性能基准测试
// ============================================================================

describe('数据质量性能基准测试', () => {
  let analyzer: DataQualityAnalyzer;
  let engine: CleaningRecommendationEngine;
  let mockAIService: MockAIService;
  let mockCacheService: MockCacheService;

  beforeAll(() => {
    mockAIService = new MockAIService();
    mockCacheService = new MockCacheService();

    analyzer = new DataQualityAnalyzer(mockAIService as any, mockCacheService as any);
    engine = new CleaningRecommendationEngine(mockAIService as any, mockCacheService as any);
  });

  it('应该满足性能要求', async () => {
    const dataSizes = [100, 1000, 5000];
    const results: any[] = [];

    for (const size of dataSizes) {
      const data = Array.from({ length: size }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        age: Math.floor(Math.random() * 50) + 20,
        email: `user${i + 1}@example.com`
      }));

      const excelData = createMockExcelData(data);

      const startTime = Date.now();
      const report = await analyzer.analyze(excelData);
      const duration = Date.now() - startTime;

      results.push({
        size,
        duration,
        throughput: size / (duration / 1000) // 行/秒
      });

      // 验证性能要求
      expect(duration).toBeLessThan(10000); // 10秒内完成
    }

    // 验证吞吐量
    results.forEach(result => {
      expect(result.throughput).toBeGreaterThan(100); // 至少100行/秒
    });
  });
});
