/**
 * 智能数据处理模块 - 使用示例
 *
 * 本文件展示了如何使用 DataQualityAnalyzer 和 CleaningRecommendationEngine
 *
 * @module services/ai/USAGE_EXAMPLE
 * @version 1.0.0
 */

import {
  DataQualityAnalyzer,
  CleaningRecommendationEngine,
  createDataQualityAnalyzer,
  createCleaningRecommendationEngine
} from './index';
import { readExcelFile } from '../excelService';
import { AnalysisOptions, SuggestionOptions } from '../../types/dataQuality';

// ============================================================================
// 示例 1: 基本使用流程
// ============================================================================

/**
 * 示例 1: 完整的数据质量分析流程
 */
export async function example1_BasicWorkflow() {
  console.log('=== 示例 1: 基本使用流程 ===\n');

  // 1. 创建服务实例（使用现有的 AI 服务和缓存服务）
  const analyzer = createDataQualityAnalyzer(
    {
      async analyze(prompt: string): Promise<string> {
        // 这里应该使用实际的 AI 服务
        return 'AI response';
      }
    },
    {
      async set(key: string, value: any, ttl?: number): Promise<void> {
        // 缓存服务实现
      },
      async get(key: string): Promise<any> {
        // 缓存服务实现
        return null;
      },
      async delete(key: string): Promise<void> {
        // 缓存服务实现
      },
      async clear(): Promise<void> {
        // 缓存服务实现
      }
    }
  );

  const recommendationEngine = createCleaningRecommendationEngine(
    {
      async analyze(prompt: string): Promise<string> {
        return 'AI response';
      }
    }
  );

  // 2. 读取 Excel 文件
  // const file = /* File 对象 */;
  // const excelData = await readExcelFile(file);

  // 为了演示，使用模拟数据
  const mockExcelData = {
    id: 'test-1',
    fileName: 'sales_data.xlsx',
    sheets: {
      'Sheet1': [
        { id: 1, name: 'Alice', age: 25, email: 'alice@example.com', salary: 5000 },
        { id: 2, name: '', age: 30, email: 'bob@example.com', salary: 6000 },
        { id: 3, name: 'Charlie', age: null, email: 'charlie@example.com', salary: 999999 },
        { id: 4, name: 'Alice', age: 25, email: 'alice@example.com', salary: 5000 },
        { id: 5, name: 'Eve', age: 28, email: 'invalid-email', salary: 5800 }
      ]
    },
    currentSheetName: 'Sheet1',
    metadata: {}
  };

  // 3. 分析数据质量
  console.log('步骤 1: 分析数据质量...');
  const analysisOptions: AnalysisOptions = {
    detectMissing: true,
    detectOutliers: true,
    detectDuplicates: true,
    detectFormat: true,
    outlierMethod: 'iqr',
    outlierThreshold: 1.5
  };

  const report = await analyzer.analyze(mockExcelData, analysisOptions);

  console.log(`  - 质量评分: ${report.qualityScore.toFixed(2)}`);
  console.log(`  - 总行数: ${report.totalRows}`);
  console.log(`  - 总列数: ${report.totalColumns}`);
  console.log(`  - 发现问题: ${report.issues.length} 个`);

  // 4. 显示发现的问题
  console.log('\n步骤 2: 发现的问题详情:');
  report.issues.forEach((issue, index) => {
    console.log(`\n  问题 ${index + 1}:`);
    console.log(`    - 类型: ${issue.issueType}`);
    console.log(`    - 严重程度: ${issue.severity}`);
    console.log(`    - 影响列: ${issue.affectedColumns.join(', ')}`);
    console.log(`    - 影响行数: ${issue.statistics.affectedRowCount} (${issue.statistics.affectedPercentage.toFixed(2)}%)`);
    console.log(`    - 描述: ${issue.description}`);
  });

  // 5. 生成清洗建议
  console.log('\n步骤 3: 生成清洗建议...');
  const suggestionOptions: SuggestionOptions = {
    maxSuggestions: 3,
    explainReasoning: true,
    generateCode: true,
    userPreferences: {
      preferDataRetention: true,
      preferQualityImprovement: true,
      riskTolerance: 'medium'
    }
  };

  const suggestions = await recommendationEngine.generateRecommendations(
    report,
    suggestionOptions
  );

  console.log(`  生成了 ${suggestions.length} 个建议\n`);

  // 6. 显示清洗建议
  suggestions.forEach((suggestion, index) => {
    console.log(`\n  建议 ${index + 1}: ${suggestion.strategy.name}`);
    console.log(`    - 优先级: ${(suggestion.priority * 100).toFixed(1)}%`);
    console.log(`    - 风险等级: ${suggestion.riskLevel}`);
    console.log(`    - 预期改善: ${suggestion.expectedImpact.qualityImprovement.toFixed(1)} 分`);
    console.log(`    - 数据保留率: ${(suggestion.expectedImpact.dataRetentionRate * 100).toFixed(1)}%`);
    console.log(`    - 理由: ${suggestion.reasoning}`);
    if (suggestion.strategy.executionCode) {
      console.log(`    - 执行代码:\n${suggestion.strategy.executionCode.substring(0, 100)}...`);
    }
  });
}

// ============================================================================
// 示例 2: 自定义检测规则
// ============================================================================

/**
 * 示例 2: 使用自定义规则检测业务逻辑问题
 */
export async function example2_CustomRules() {
  console.log('=== 示例 2: 自定义检测规则 ===\n');

  const analyzer = createDataQualityAnalyzer(
    {
      async analyze(prompt: string): Promise<string> {
        return 'AI response';
      }
    }
  );

  const mockExcelData = {
    id: 'test-2',
    fileName: 'employee_data.xlsx',
    sheets: {
      'Sheet1': [
        { id: 1, name: 'Alice', age: 25, salary: 5000 },
        { id: 2, name: 'Bob', age: 17, salary: 4000 },  // 年龄不符合规定
        { id: 3, name: 'Charlie', age: 70, salary: 8000 },  // 年龄不符合规定
        { id: 4, name: 'David', age: 30, salary: 3000 },  // 薪资过低
        { id: 5, name: 'Eve', age: 28, salary: 6000 }
      ]
    },
    currentSheetName: 'Sheet1',
    metadata: {}
  };

  // 定义自定义规则
  const customRules = [
    {
      ruleId: 'age_validation',
      name: '年龄范围验证',
      description: '员工年龄必须在 18-65 岁之间',
      rule: (row: any) => row.age < 18 || row.age > 65,
      severity: 'high' as const
    },
    {
      ruleId: 'salary_validation',
      name: '最低工资验证',
      description: '员工薪资不能低于最低工资标准（3500元）',
      rule: (row: any) => row.salary < 3500,
      severity: 'medium' as const
    }
  ];

  const analysisOptions: AnalysisOptions = {
    detectMissing: false,
    detectOutliers: false,
    detectDuplicates: false,
    detectFormat: false,
    customRules: customRules
  };

  const report = await analyzer.analyze(mockExcelData, analysisOptions);

  console.log(`质量评分: ${report.qualityScore.toFixed(2)}`);
  console.log(`发现自定义规则问题: ${report.issues.length} 个\n`);

  report.issues.forEach((issue, index) => {
    console.log(`问题 ${index + 1}: ${issue.description}`);
    console.log(`  - 严重程度: ${issue.severity}`);
    console.log(`  - 影响行: ${issue.affectedRows.join(', ')}`);
  });
}

// ============================================================================
// 示例 3: 采样分析大数据集
// ============================================================================

/**
 * 示例 3: 对大数据集进行采样分析
 */
export async function example3_LargeDatasetSampling() {
  console.log('=== 示例 3: 采样分析大数据集 ===\n');

  const analyzer = createDataQualityAnalyzer(
    {
      async analyze(prompt: string): Promise<string> {
        return 'AI response';
      }
    },
    undefined,
    {
      enableCache: true,
      cacheTTL: 1800000,
      parallelDetection: true,
      maxSampleSize: 10000
    }
  );

  // 生成大数据集（100,000 行）
  const largeDataset = Array.from({ length: 100000 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    age: Math.floor(Math.random() * 50) + 20,
    email: `user${i + 1}@example.com`,
    salary: Math.floor(Math.random() * 10000) + 3000
  }));

  // 添加一些问题数据
  largeDataset[100].age = null;
  largeDataset[200].name = '';
  largeDataset[300].email = 'invalid';
  largeDataset[400].salary = 9999999;

  const mockExcelData = {
    id: 'test-3',
    fileName: 'large_dataset.xlsx',
    sheets: {
      'Sheet1': largeDataset
    },
    currentSheetName: 'Sheet1',
    metadata: {}
  };

  // 使用采样分析
  const analysisOptions: AnalysisOptions = {
    sampleSize: 10000,
    samplingMethod: 'random',
    detectMissing: true,
    detectOutliers: true
  };

  console.log('开始分析大数据集（100,000 行）...');
  const startTime = Date.now();

  const report = await analyzer.analyze(mockExcelData, analysisOptions);

  const duration = Date.now() - startTime;

  console.log(`\n分析完成！耗时: ${duration}ms`);
  console.log(`质量评分: ${report.qualityScore.toFixed(2)}`);
  console.log(`发现问题: ${report.issues.length} 个`);
  console.log(`列统计: ${report.columnStats.length} 个`);
}

// ============================================================================
// 示例 4: 过滤和分类问题
// ============================================================================

/**
 * 示例 4: 按严重程度和类型过滤问题
 */
export async function example4_FilterIssues() {
  console.log('=== 示例 4: 过滤和分类问题 ===\n');

  const analyzer = createDataQualityAnalyzer(
    {
      async analyze(prompt: string): Promise<string> {
        return 'AI response';
      }
    }
  );

  const mockExcelData = {
    id: 'test-4',
    fileName: 'mixed_issues.xlsx',
    sheets: {
      'Sheet1': [
        { id: 1, name: 'Alice', age: 25, email: 'alice@example.com' },
        { id: 2, name: '', age: 30, email: 'bob@example.com' },
        { id: 3, name: 'Alice', age: 25, email: 'alice@example.com' },
        { id: 4, name: 'David', age: 999, email: 'invalid' }
      ]
    },
    currentSheetName: 'Sheet1',
    metadata: {}
  };

  const report = await analyzer.analyze(mockExcelData);

  // 按严重程度分组
  const issuesBySeverity = {
    critical: report.issues.filter(i => i.severity === 'critical'),
    high: report.issues.filter(i => i.severity === 'high'),
    medium: report.issues.filter(i => i.severity === 'medium'),
    low: report.issues.filter(i => i.severity === 'low')
  };

  console.log('按严重程度分组:');
  console.log(`  - Critical: ${issuesBySeverity.critical.length} 个`);
  console.log(`  - High: ${issuesBySeverity.high.length} 个`);
  console.log(`  - Medium: ${issuesBySeverity.medium.length} 个`);
  console.log(`  - Low: ${issuesBySeverity.low.length} 个`);

  // 按问题类型分组
  const issuesByType = new Map<string, any[]>();
  report.issues.forEach(issue => {
    if (!issuesByType.has(issue.issueType)) {
      issuesByType.set(issue.issueType, []);
    }
    issuesByType.get(issue.issueType)!.push(issue);
  });

  console.log('\n按问题类型分组:');
  issuesByType.forEach((issues, type) => {
    console.log(`  - ${type}: ${issues.length} 个`);
  });

  // 只关注特定列的问题
  const nameIssues = report.issues.filter(
    issue => issue.affectedColumns.includes('name')
  );

  console.log(`\n涉及 "name" 列的问题: ${nameIssues.length} 个`);
}

// ============================================================================
// 示例 5: 查看列统计信息
// ============================================================================

/**
 * 示例 5: 分析列统计信息
 */
export async function example5_ColumnStatistics() {
  console.log('=== 示例 5: 列统计信息分析 ===\n');

  const analyzer = createDataQualityAnalyzer(
    {
      async analyze(prompt: string): Promise<string> {
        return 'AI response';
      }
    }
  );

  const mockExcelData = {
    id: 'test-5',
    fileName: 'numeric_data.xlsx',
    sheets: {
      'Sheet1': [
        { id: 1, name: 'Alice', age: 25, salary: 5000 },
        { id: 2, name: 'Bob', age: 30, salary: 6000 },
        { id: 3, name: 'Charlie', age: 35, salary: 7000 },
        { id: 4, name: 'David', age: 28, salary: 5500 },
        { id: 5, name: 'Eve', age: 32, salary: 5800 }
      ]
    },
    currentSheetName: 'Sheet1',
    metadata: {}
  };

  const report = await analyzer.analyze(mockExcelData);

  console.log('列统计信息:\n');

  report.columnStats.forEach(stat => {
    console.log(`列名: ${stat.columnName}`);
    console.log(`  - 数据类型: ${stat.dataType}`);
    console.log(`  - 空值数量: ${stat.nullCount}`);
    console.log(`  - 唯一值数量: ${stat.uniqueCount}`);

    if (stat.dataType === 'number') {
      console.log(`  - 最小值: ${stat.min}`);
      console.log(`  - 最大值: ${stat.max}`);
      console.log(`  - 平均值: ${stat.mean?.toFixed(2)}`);
      console.log(`  - 中位数: ${stat.median}`);
      console.log(`  - 标准差: ${stat.stdDev?.toFixed(2)}`);
    }

    if (stat.mode !== undefined) {
      console.log(`  - 众数: ${stat.mode}`);
    }

    console.log(`  - 样本值: ${stat.sampleValues?.slice(0, 3).join(', ')}...`);
    console.log('');
  });
}

// ============================================================================
// 运行所有示例
// ============================================================================

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  智能数据处理模块 - 使用示例                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    await example1_BasicWorkflow();
    console.log('\n' + '='.repeat(60) + '\n');

    await example2_CustomRules();
    console.log('\n' + '='.repeat(60) + '\n');

    await example3_LargeDatasetSampling();
    console.log('\n' + '='.repeat(60) + '\n');

    await example4_FilterIssues();
    console.log('\n' + '='.repeat(60) + '\n');

    await example5_ColumnStatistics();
    console.log('\n' + '='.repeat(60) + '\n');

    console.log('✅ 所有示例运行完成！');
  } catch (error) {
    console.error('❌ 示例运行失败:', error);
  }
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples();
}
