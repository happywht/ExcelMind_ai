/**
 * 数据质量分析器 - 单元测试
 *
 * @module services/ai/dataQualityAnalyzer.test
 * @version 1.0.0
 */

import { DataQualityAnalyzer } from './dataQualityAnalyzer';
import { AnalysisOptions } from '../../types/dataQuality';
import { ExcelData } from '../../types';

// ============================================================================
// Mock 服务实现
// ============================================================================

class MockAIService {
  async analyze(prompt: string): Promise<string> {
    return 'Mock AI response';
  }
}

class MockCacheService {
  private cache = new Map<string, any>();

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value);
  }

  async get(key: string): Promise<any> {
    return this.cache.get(key);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// ============================================================================
// 测试数据
// ============================================================================

const createMockExcelData = (data: any[]): ExcelData => {
  return {
    id: 'test-file-1',
    fileName: 'test_data.xlsx',
    sheets: {
      'Sheet1': data
    },
    currentSheetName: 'Sheet1',
    metadata: {}
  };
};

const testCases = {
  // 包含缺失值的数据
  withMissingValues: [
    { id: 1, name: 'Alice', age: 25, email: 'alice@example.com' },
    { id: 2, name: '', age: 30, email: 'bob@example.com' },
    { id: 3, name: 'Charlie', age: null, email: 'charlie@example.com' },
    { id: 4, name: 'David', age: 35, email: '' },
    { id: 5, name: 'Eve', age: 28, email: 'eve@example.com' }
  ],

  // 包含异常值的数据
  withOutliers: [
    { id: 1, name: 'Alice', salary: 5000 },
    { id: 2, name: 'Bob', salary: 6000 },
    { id: 3, name: 'Charlie', salary: 999999 }, // 异常值
    { id: 4, name: 'David', salary: 5500 },
    { id: 5, name: 'Eve', salary: 5800 }
  ],

  // 包含重复行的数据
  withDuplicates: [
    { id: 1, name: 'Alice', age: 25 },
    { id: 2, name: 'Bob', age: 30 },
    { id: 3, name: 'Alice', age: 25 }, // 重复
    { id: 4, name: 'Charlie', age: 35 },
    { id: 5, name: 'Bob', age: 30 } // 重复
  ],

  // 包含格式不一致的数据
  withFormatIssues: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'invalid-email' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
    { id: 4, name: 'David', email: 'not-an-email' },
    { id: 5, name: 'Eve', email: 'eve@example.com' }
  ],

  // 完整数据（无问题）
  cleanData: [
    { id: 1, name: 'Alice', age: 25, email: 'alice@example.com' },
    { id: 2, name: 'Bob', age: 30, email: 'bob@example.com' },
    { id: 3, name: 'Charlie', age: 35, email: 'charlie@example.com' },
    { id: 4, name: 'David', age: 28, email: 'david@example.com' },
    { id: 5, name: 'Eve', age: 32, email: 'eve@example.com' }
  ]
};

// ============================================================================
// 测试套件
// ============================================================================

describe('DataQualityAnalyzer', () => {
  let analyzer: DataQualityAnalyzer;
  let mockAIService: MockAIService;
  let mockCacheService: MockCacheService;

  beforeEach(() => {
    mockAIService = new MockAIService();
    mockCacheService = new MockCacheService();
    analyzer = new DataQualityAnalyzer(mockAIService, mockCacheService);
  });

  afterEach(() => {
    mockCacheService.clear();
  });

  describe('基本功能测试', () => {
    test('应该成功分析空数据', async () => {
      const data = createMockExcelData([]);
      const report = await analyzer.analyze(data);

      expect(report).toBeDefined();
      expect(report.totalRows).toBe(0);
      expect(report.qualityScore).toBe(100);
    });

    test('应该成功分析完整数据', async () => {
      const data = createMockExcelData(testCases.cleanData);
      const report = await analyzer.analyze(data);

      expect(report).toBeDefined();
      expect(report.totalRows).toBe(5);
      expect(report.totalColumns).toBe(4);
      expect(report.issues).toHaveLength(0);
      expect(report.qualityScore).toBe(100);
    });
  });

  describe('缺失值检测', () => {
    test('应该检测到缺失值', async () => {
      const options: AnalysisOptions = {
        detectMissing: true,
        detectOutliers: false,
        detectDuplicates: false,
        detectFormat: false
      };

      const data = createMockExcelData(testCases.withMissingValues);
      const report = await analyzer.analyze(data, options);

      expect(report.issues.length).toBeGreaterThan(0);

      const missingIssues = report.issues.filter(
        issue => issue.issueType === 'missing_value'
      );
      expect(missingIssues.length).toBeGreaterThan(0);
    });

    test('应该正确计算缺失值的严重程度', async () => {
      const data = createMockExcelData(testCases.withMissingValues);
      const report = await analyzer.analyze(data);

      report.issues.forEach(issue => {
        if (issue.issueType === 'missing_value') {
          expect(['low', 'medium', 'high', 'critical']).toContain(issue.severity);
          expect(issue.statistics.affectedRowCount).toBeGreaterThan(0);
          expect(issue.statistics.affectedPercentage).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('异常值检测', () => {
    test('应该检测到异常值', async () => {
      const options: AnalysisOptions = {
        detectMissing: false,
        detectOutliers: true,
        detectDuplicates: false,
        detectFormat: false,
        outlierMethod: 'iqr',
        outlierThreshold: 1.5
      };

      const data = createMockExcelData(testCases.withOutliers);
      const report = await analyzer.analyze(data, options);

      const outlierIssues = report.issues.filter(
        issue => issue.issueType === 'outlier'
      );
      expect(outlierIssues.length).toBeGreaterThan(0);
    });
  });

  describe('重复行检测', () => {
    test('应该检测到重复行', async () => {
      const options: AnalysisOptions = {
        detectMissing: false,
        detectOutliers: false,
        detectDuplicates: true,
        detectFormat: false
      };

      const data = createMockExcelData(testCases.withDuplicates);
      const report = await analyzer.analyze(data, options);

      const duplicateIssues = report.issues.filter(
        issue => issue.issueType === 'duplicate_row'
      );
      expect(duplicateIssues.length).toBe(1);
      expect(duplicateIssues[0].affectedRows.length).toBe(2);
    });
  });

  describe('格式一致性检测', () => {
    test('应该检测到格式不一致', async () => {
      const options: AnalysisOptions = {
        detectMissing: false,
        detectOutliers: false,
        detectDuplicates: false,
        detectFormat: true
      };

      const data = createMockExcelData(testCases.withFormatIssues);
      const report = await analyzer.analyze(data, options);

      const formatIssues = report.issues.filter(
        issue => issue.issueType === 'format_inconsistency'
      );
      expect(formatIssues.length).toBeGreaterThan(0);
    });
  });

  describe('质量评分计算', () => {
    test('完整数据应该得到100分', async () => {
      const data = createMockExcelData(testCases.cleanData);
      const report = await analyzer.analyze(data);

      expect(report.qualityScore).toBe(100);
    });

    test('有问题的数据应该得到较低分数', async () => {
      const data = createMockExcelData(testCases.withMissingValues);
      const report = await analyzer.analyze(data);

      expect(report.qualityScore).toBeLessThan(100);
      expect(report.qualityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('列统计信息', () => {
    test('应该生成正确的列统计信息', async () => {
      const data = createMockExcelData(testCases.cleanData);
      const report = await analyzer.analyze(data);

      expect(report.columnStats).toBeDefined();
      expect(report.columnStats.length).toBe(4);

      report.columnStats.forEach(stat => {
        expect(stat.columnName).toBeDefined();
        expect(stat.dataType).toBeDefined();
        expect(stat.nullCount).toBeGreaterThanOrEqual(0);
        expect(stat.uniqueCount).toBeGreaterThan(0);
      });
    });

    test('应该正确推断数据类型', async () => {
      const data = createMockExcelData(testCases.cleanData);
      const report = await analyzer.analyze(data);

      const idStat = report.columnStats.find(s => s.columnName === 'id');
      expect(idStat?.dataType).toBe('number');

      const nameStat = report.columnStats.find(s => s.columnName === 'name');
      expect(nameStat?.dataType).toBe('string');
    });
  });

  describe('缓存功能', () => {
    test('应该使用缓存的结果', async () => {
      const data = createMockExcelData(testCases.cleanData);

      // 第一次分析
      const report1 = await analyzer.analyze(data);

      // 第二次分析（应该使用缓存）
      const report2 = await analyzer.analyze(data);

      expect(report1.reportId).toBe(report2.reportId);
    });
  });

  describe('自定义规则', () => {
    test('应该执行自定义规则', async () => {
      const customRule = {
        ruleId: 'age_gt_30',
        name: '年龄大于30',
        description: '检测年龄大于30的记录',
        rule: (row: any) => row.age > 30,
        severity: 'low' as const
      };

      const options: AnalysisOptions = {
        detectMissing: false,
        detectOutliers: false,
        detectDuplicates: false,
        detectFormat: false,
        customRules: [customRule]
      };

      const data = createMockExcelData(testCases.cleanData);
      const report = await analyzer.analyze(data, options);

      const customIssues = report.issues.filter(
        issue => issue.issueType === 'data_inconsistency'
      );
      expect(customIssues.length).toBeGreaterThan(0);
    });
  });

  describe('数据样本提取', () => {
    test('应该提取数据样本', async () => {
      const data = createMockExcelData(testCases.cleanData);
      const report = await analyzer.analyze(data);

      expect(report.dataSample).toBeDefined();
      expect(report.dataSample?.length).toBeGreaterThan(0);
      expect(report.dataSample?.length).toBeLessThanOrEqual(10);
    });
  });

  describe('错误处理', () => {
    test('应该处理无效的数据', async () => {
      const data = createMockExcelData([]);

      const report = await analyzer.analyze(data);

      expect(report).toBeDefined();
      expect(report.totalRows).toBe(0);
    });

    test('应该处理分析选项中的异常情况', async () => {
      const data = createMockExcelData(testCases.cleanData);
      const options: AnalysisOptions = {
        outlierThreshold: -1 // 无效的阈值
      };

      // 不应该抛出异常
      const report = await analyzer.analyze(data, options);

      expect(report).toBeDefined();
    });
  });
});

// ============================================================================
// 性能测试
// ============================================================================

describe('DataQualityAnalyzer 性能测试', () => {
  let analyzer: DataQualityAnalyzer;
  let mockAIService: MockAIService;
  let mockCacheService: MockCacheService;

  beforeEach(() => {
    mockAIService = new MockAIService();
    mockCacheService = new MockCacheService();
    analyzer = new DataQualityAnalyzer(mockAIService, mockCacheService);
  });

  test('应该能在合理时间内分析大数据集', async () => {
    // 创建大数据集（10000行）
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      age: Math.floor(Math.random() * 50) + 20,
      email: `user${i + 1}@example.com`
    }));

    const data = createMockExcelData(largeData);
    const startTime = Date.now();

    const report = await analyzer.analyze(data);

    const duration = Date.now() - startTime;

    expect(report).toBeDefined();
    expect(duration).toBeLessThan(5000); // 应该在5秒内完成
  });
});

// ============================================================================
// 集成测试
// ============================================================================

describe('DataQualityAnalyzer 集成测试', () => {
  let analyzer: DataQualityAnalyzer;
  let mockAIService: MockAIService;
  let mockCacheService: MockCacheService;

  beforeEach(() => {
    mockAIService = new MockAIService();
    mockCacheService = new MockCacheService();
    analyzer = new DataQualityAnalyzer(mockAIService, mockCacheService);
  });

  test('应该检测多种问题并生成完整报告', async () => {
    const mixedData = [
      { id: 1, name: 'Alice', age: 25, email: 'alice@example.com' },
      { id: 2, name: '', age: 30, email: 'bob@example.com' },
      { id: 3, name: 'Alice', age: 25, email: 'alice@example.com' }, // 重复
      { id: 4, name: 'David', age: 999, email: 'invalid-email' },
      { id: 5, name: 'Eve', age: 28, email: 'eve@example.com' }
    ];

    const data = createMockExcelData(mixedData);
    const report = await analyzer.analyze(data);

    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.qualityScore).toBeLessThan(100);
    expect(report.columnStats).toBeDefined();
    expect(report.dataSample).toBeDefined();
  });
});
