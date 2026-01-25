/**
 * 测试辅助工具模块 - Phase 2
 *
 * 提供通用的测试辅助函数、Mock对象工厂和测试数据生成器
 *
 * @module tests/utils/testHelpers
 * @version 2.0.0
 */

import { DataQualityIssue, CleaningSuggestion, TemplateInfo, BatchGenerationTask } from '../../types';

// ============================================================================
// 数据质量测试工具
// ============================================================================

/**
 * 创建模拟数据质量问题
 */
export function createMockDataQualityIssue(overrides?: Partial<DataQualityIssue>): DataQualityIssue {
  return {
    issueId: `issue_${Date.now()}`,
    issueType: 'missing_value',
    severity: 'medium',
    affectedColumns: ['test_column'],
    affectedRows: [1, 2, 3],
    description: '测试质量问题',
    statistics: {
      affectedRowCount: 3,
      affectedPercentage: 30,
      distribution: { test_column: 3 }
    },
    ...overrides
  };
}

/**
 * 创建模拟清洗建议
 */
export function createMockCleaningSuggestion(overrides?: Partial<CleaningSuggestion>): CleaningSuggestion {
  return {
    suggestionId: `suggestion_${Date.now()}`,
    issueId: 'issue_test',
    strategy: {
      strategyId: 'fill_mean',
      name: '使用平均值填充',
      type: 'fill',
      description: '使用平均值填充缺失值',
      applicableIssues: ['missing_value'],
      estimatedComplexity: 'low',
      requiresCodeGeneration: true
    },
    priority: 'high',
    impactAssessment: {
      qualityImprovement: 85,
      dataLossRisk: 'low',
      executionTimeEstimate: 1000,
      sideEffects: []
    },
    code: 'data.fillna(data.mean())',
    explanation: '使用列的平均值填充缺失值',
    ...overrides
  };
}

// ============================================================================
// 模板管理测试工具
// ============================================================================

/**
 * 创建模拟模板信息
 */
export function createMockTemplateInfo(overrides?: Partial<TemplateInfo>): TemplateInfo {
  return {
    templateId: `template_${Date.now()}`,
    name: '测试模板',
    description: '测试模板描述',
    filePath: '/templates/test.docx',
    variables: [
      {
        name: 'name',
        type: 'text',
        description: '姓名',
        required: true,
        defaultValue: ''
      },
      {
        name: 'age',
        type: 'number',
        description: '年龄',
        required: true,
        defaultValue: ''
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  };
}

// ============================================================================
// 批量生成测试工具
// ============================================================================

/**
 * 创建模拟批量任务
 */
export function createMockBatchTask(overrides?: Partial<BatchGenerationTask>): BatchGenerationTask {
  return {
    taskId: `task_${Date.now()}`,
    name: '测试批量任务',
    templateId: 'template_test',
    dataSourceId: 'data_source_test',
    status: 'pending',
    progress: 0,
    totalItems: 100,
    completedItems: 0,
    failedItems: 0,
    outputDirectory: '/output/test',
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    error: null,
    ...overrides
  };
}

// ============================================================================
// Excel数据测试工具
// ============================================================================

/**
 * 创建模拟Excel数据
 */
export function createMockExcelData(data: any[], sheetName: string = 'Sheet1') {
  return {
    id: `file_${Date.now()}`,
    fileName: 'test_data.xlsx',
    sheets: {
      [sheetName]: data
    },
    currentSheetName: sheetName,
    metadata: {}
  };
}

/**
 * 创建包含缺失值的测试数据
 */
export function createTestDataWithMissingValues() {
  return [
    { id: 1, name: 'Alice', age: 25, email: 'alice@example.com' },
    { id: 2, name: '', age: 30, email: 'bob@example.com' },
    { id: 3, name: 'Charlie', age: null, email: 'charlie@example.com' },
    { id: 4, name: 'David', age: 35, email: '' },
    { id: 5, name: 'Eve', age: 28, email: 'eve@example.com' }
  ];
}

/**
 * 创建包含异常值的测试数据
 */
export function createTestDataWithOutliers() {
  return [
    { id: 1, name: 'Alice', salary: 5000 },
    { id: 2, name: 'Bob', salary: 6000 },
    { id: 3, name: 'Charlie', salary: 999999 }, // 异常值
    { id: 4, name: 'David', salary: 5500 },
    { id: 5, name: 'Eve', salary: 5800 }
  ];
}

/**
 * 创建包含重复行的测试数据
 */
export function createTestDataWithDuplicates() {
  return [
    { id: 1, name: 'Alice', age: 25 },
    { id: 2, name: 'Bob', age: 30 },
    { id: 3, name: 'Alice', age: 25 }, // 重复
    { id: 4, name: 'Charlie', age: 35 },
    { id: 5, name: 'Bob', age: 30 } // 重复
  ];
}

/**
 * 创建包含格式问题的测试数据
 */
export function createTestDataWithFormatIssues() {
  return [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'invalid-email' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
    { id: 4, name: 'David', email: 'not-an-email' },
    { id: 5, name: 'Eve', email: 'eve@example.com' }
  ];
}

/**
 * 创建完整的干净测试数据
 */
export function createCleanTestData() {
  return [
    { id: 1, name: 'Alice', age: 25, email: 'alice@example.com' },
    { id: 2, name: 'Bob', age: 30, email: 'bob@example.com' },
    { id: 3, name: 'Charlie', age: 35, email: 'charlie@example.com' },
    { id: 4, name: 'David', age: 28, email: 'david@example.com' },
    { id: 5, name: 'Eve', age: 32, email: 'eve@example.com' }
  ];
}

/**
 * 创建大型测试数据集（用于性能测试）
 */
export function createLargeTestData(rowCount: number = 10000) {
  return Array.from({ length: rowCount }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    age: Math.floor(Math.random() * 50) + 20,
    email: `user${i + 1}@example.com`,
    salary: Math.floor(Math.random() * 10000) + 3000,
    department: ['IT', 'HR', 'Finance', 'Sales'][i % 4]
  }));
}

// ============================================================================
// API测试工具
// ============================================================================

/**
 * 创建模拟API请求
 */
export function createMockRequest(overrides?: any) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {
      'x-request-id': `req_${Date.now()}`
    },
    ...overrides
  };
}

/**
 * 创建模拟API响应
 */
export function createMockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    send(data: any) {
      this.body = data;
      return this;
    }
  };
  return res;
}

// ============================================================================
// 异步测试工具
// ============================================================================

/**
 * 创建延迟Promise
 */
export function createDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建模拟的异步函数
 */
export function createMockAsyncFunction<T>(
  result: T,
  delay: number = 0
): () => Promise<T> {
  return () =>
    new Promise(resolve => {
      if (delay > 0) {
        setTimeout(() => resolve(result), delay);
      } else {
        resolve(result);
      }
    });
}

/**
 * 创建模拟的错误函数
 */
export function createMockErrorFunction(
  error: Error,
  delay: number = 0
): () => Promise<never> {
  return () =>
    new Promise((_, reject) => {
      if (delay > 0) {
        setTimeout(() => reject(error), delay);
      } else {
        reject(error);
      }
    });
}

// ============================================================================
// 性能测试工具
// ============================================================================

/**
 * 测量函数执行时间
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * 多次执行并统计
 */
export async function measureMultipleRuns<T>(
  fn: () => Promise<T>,
  runs: number = 10
): Promise<{ results: T[]; durations: number[]; avgDuration: number }> {
  const results: T[] = [];
  const durations: number[] = [];

  for (let i = 0; i < runs; i++) {
    const { result, duration } = await measureExecutionTime(fn);
    results.push(result);
    durations.push(duration);
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

  return { results, durations, avgDuration };
}

// ============================================================================
// 类型断言工具
// ============================================================================

/**
 * 安全的类型断言（用于测试）
 */
export function asMock<T>(value: any): T {
  return value as T;
}

/**
 * 创建部分Mock对象
 */
export function createPartialMock<T>(
  base: T,
  overrides: Partial<T>
): T {
  return { ...base, ...overrides };
}

// ============================================================================
// 导出所有工具
// ============================================================================

export default {
  // 数据质量
  createMockDataQualityIssue,
  createMockCleaningSuggestion,

  // 模板管理
  createMockTemplateInfo,

  // 批量生成
  createMockBatchTask,

  // Excel数据
  createMockExcelData,
  createTestDataWithMissingValues,
  createTestDataWithOutliers,
  createTestDataWithDuplicates,
  createTestDataWithFormatIssues,
  createCleanTestData,
  createLargeTestData,

  // API
  createMockRequest,
  createMockResponse,

  // 异步
  createDelay,
  createMockAsyncFunction,
  createMockErrorFunction,

  // 性能
  measureExecutionTime,
  measureMultipleRuns,

  // 类型
  asMock,
  createPartialMock
};
