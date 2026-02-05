/**
 * AgenticOrchestrator 单元测试
 *
 * 验证核心功能是否正常工作
 */

import {
  AgenticOrchestrator,
  executeMultiStepAnalysis,
  validateDataFiles,
  formatExecutionTime,
  formatQualityScore,
  isTaskSuccessful,
  getTaskSummary,
  generateTaskReport,
  createProgressLogger,
  analyzeError,
  estimateExecutionTime
} from './index';
import { DataFileInfo, TaskStatus, ErrorCategory } from '../../types/agenticTypes';

// 简单的测试辅助函数
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message || ''}\nExpected: ${expected}\nActual: ${actual}`
    );
  }
}

/**
 * 测试数据
 */
const createMockDataFiles = (): DataFileInfo[] => {
  return [
    {
      id: 'test-file-1',
      fileName: 'test_data.xlsx',
      sheets: {
        'Sheet1': [
          { id: 1, name: 'Item A', value: 100 },
          { id: 2, name: 'Item B', value: 200 },
          { id: 3, name: 'Item C', value: 300 }
        ]
      },
      currentSheetName: 'Sheet1',
      metadata: {
        'Sheet1': {
          comments: { 'A1': 'Test comment' },
          notes: {},
          rowCount: 3,
          columnCount: 3
        }
      }
    }
  ];
};

/**
 * 测试1: 编排器初始化
 */
export function testOrchestratorInitialization() {
  console.log('测试1: 编排器初始化');

  const orchestrator = new AgenticOrchestrator();

  assert(orchestrator !== null, '编排器应该成功创建');
  assert(orchestrator.getTaskState() === null, '初始状态应该没有任务');

  console.log('✓ 编排器初始化成功');
}

/**
 * 测试2: 配置验证
 */
export function testConfiguration() {
  console.log('\n测试2: 配置验证');

  const customConfig = {
    maxRetries: 5,
    timeoutPerStep: 60000,
    qualityThreshold: 0.9
  };

  const orchestrator = new AgenticOrchestrator(customConfig);

  assert(orchestrator !== null, '带配置的编排器应该成功创建');

  console.log('✓ 配置验证成功');
}

/**
 * 测试3: 数据文件验证
 */
export function testDataValidation() {
  console.log('\n测试3: 数据文件验证');

  // 有效数据
  const validData = createMockDataFiles();
  const validResult = validateDataFiles(validData);
  assert(validResult.valid === true, '有效数据应该通过验证');
  assert(validResult.errors.length === 0, '有效数据不应该有错误');

  // 无效数据
  const invalidData: DataFileInfo[] = [
    {
      id: '',
      fileName: '',
      sheets: {},
      currentSheetName: undefined
    } as any
  ];

  const invalidResult = validateDataFiles(invalidData);
  assert(invalidResult.valid === false, '无效数据应该验证失败');
  assert(invalidResult.errors.length > 0, '无效数据应该有错误信息');

  console.log('✓ 数据验证测试成功');
}

/**
 * 测试4: 工具函数
 */
export function testUtilityFunctions() {
  console.log('\n测试4: 工具函数');

  // 测试时间格式化
  assertEquals(formatExecutionTime(500), '500ms', '毫秒格式化');
  assertEquals(formatExecutionTime(5000), '5s', '秒格式化');
  assertEquals(formatExecutionTime(65000), '1m 5s', '分钟格式化');

  // 测试质量分数格式化
  assertEquals(formatQualityScore(0.85), '85%', '质量分数格式化');
  assertEquals(formatQualityScore(1.0), '100%', '满分格式化');
  assertEquals(formatQualityScore(0.5), '50%', '半分格式化');

  // 测试错误分析
  const columnError = analyzeError('Column not found: name');
  assertEquals(columnError.category, 'COLUMN_ERROR', '列错误分类');

  const aiError = analyzeError('AI service timeout');
  assertEquals(aiError.category, 'AI_SERVICE_ERROR', 'AI错误分类');

  // 测试执行时间估算
  const estimatedTime = estimateExecutionTime(2, 1000, 5);
  assert(estimatedTime > 0, '估算时间应该大于0');

  console.log('✓ 工具函数测试成功');
}

/**
 * 测试5: 任务结果分析
 */
export function testTaskResultAnalysis() {
  console.log('\n测试5: 任务结果分析');

  const mockResult = {
    success: true,
    data: { 'output.xlsx': [{ result: 'data' }] },
    logs: ['Log 1', 'Log 2'],
    executionSummary: {
      totalSteps: 5,
      successfulSteps: 5,
      failedSteps: 0,
      retriedSteps: 0,
      totalTime: 10000,
      averageStepTime: 2000
    },
    metadata: {
      completedAt: Date.now(),
      sessionId: 'test-session',
      taskId: 'test-task'
    }
  };

  // 测试成功判断
  assert(isTaskSuccessful(mockResult) === true, '任务应该被判定为成功');

  // 测试摘要生成
  const summary = getTaskSummary(mockResult);
  assert(summary.success === true, '摘要应该显示成功');
  assert(summary.steps === 5, '摘要应该显示正确的步骤数');

  // 测试报告生成
  const report = generateTaskReport(mockResult);
  assert(report.includes('任务执行报告'), '报告应该包含标题');
  assert(report.includes('成功'), '报告应该显示成功状态');

  console.log('✓ 任务结果分析测试成功');
}

/**
 * 测试6: 进度日志器
 */
export function testProgressLogger() {
  console.log('\n测试6: 进度日志器');

  const logger = createProgressLogger('[测试] ');

  // 模拟进度更新
  const mockState = {
    status: TaskStatus.ACTING,
    progress: {
      percentage: 50,
      currentPhase: 'acting',
      message: 'Processing data'
    }
  };

  // 应该不抛出错误
  try {
    logger(mockState);
    console.log('✓ 进度日志器测试成功');
  } catch (error) {
    throw new Error(`进度日志器失败: ${error}`);
  }
}

/**
 * 测试7: 任务状态管理
 */
export function testTaskStateManagement() {
  console.log('\n测试7: 任务状态管理');

  const orchestrator = new AgenticOrchestrator();
  const dataFiles = createMockDataFiles();

  // 注册进度回调
  let progressReceived = false;
  orchestrator.updateProgress((state) => {
    progressReceived = true;
    assert(state.id !== undefined, '任务应该有ID');
    assert(state.status !== undefined, '任务应该有状态');
  });

  // 获取初始状态
  const initialState = orchestrator.getTaskState();
  assert(initialState === null, '初始应该没有任务');

  console.log('✓ 任务状态管理测试成功');
}

/**
 * 测试8: 日志管理
 */
export function testLogManagement() {
  console.log('\n测试8: 日志管理');

  const orchestrator = new AgenticOrchestrator({ logLevel: 'debug' });

  // 获取初始日志
  const initialLogs = orchestrator.getLogs();
  assert(Array.isArray(initialLogs), '日志应该是数组');

  // 清除日志
  orchestrator.clearLogs();
  const clearedLogs = orchestrator.getLogs();
  assert(clearedLogs.length === 0, '清除后日志应该为空');

  console.log('✓ 日志管理测试成功');
}

/**
 * 测试9: 错误创建
 */
export function testErrorCreation() {
  console.log('\n测试9: 错误创建');

  // 这个测试验证错误类型系统的完整性
  const errorCategories = Object.values(ErrorCategory);

  assert(errorCategories.length > 0, '应该定义了错误类别');
  assert(errorCategories.includes(ErrorCategory.VALIDATION_ERROR), '应该有验证错误类别');
  assert(errorCategories.includes(ErrorCategory.AI_SERVICE_ERROR), '应该有AI服务错误类别');

  console.log('✓ 错误创建测试成功');
}

/**
 * 测试10: 类型系统验证
 */
export function testTypeSystem() {
  console.log('\n测试10: 类型系统验证');

  // 验证状态枚举
  const statuses = Object.values(TaskStatus);
  assert(statuses.includes(TaskStatus.IDLE), '应该有IDLE状态');
  assert(statuses.includes(TaskStatus.COMPLETED), '应该有COMPLETED状态');
  assert(statuses.includes(TaskStatus.FAILED), '应该有FAILED状态');

  console.log('✓ 类型系统验证成功');
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
  console.log('🧪 开始运行 AgenticOrchestrator 测试套件\n');
  console.log('='.repeat(50));

  try {
    testOrchestratorInitialization();
    testConfiguration();
    testDataValidation();
    testUtilityFunctions();
    testTaskResultAnalysis();
    testProgressLogger();
    testTaskStateManagement();
    testLogManagement();
    testErrorCreation();
    testTypeSystem();

    console.log('\n' + '='.repeat(50));
    console.log('✅ 所有测试通过！\n');

    return true;
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ 测试失败！');
    console.error(error);
    console.error('='.repeat(50) + '\n');

    return false;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试运行出错:', error);
      process.exit(1);
    });
}
