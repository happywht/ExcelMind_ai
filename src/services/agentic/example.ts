/**
 * 多步分析和自我修复系统 - 使用示例
 *
 * 本文件展示如何使用 AgenticOrchestrator 进行多步数据分析
 */

import {
  AgenticOrchestrator,
  DataFileInfo,
  executeMultiStepAnalysis,
  executeMultiStepAnalysisWithProgress,
  createProgressLogger,
  generateTaskReport,
  validateDataFiles,
  TaskStatus
} from './index';

/**
 * 示例1: 基础使用
 */
async function basicExample() {
  console.log('=== 示例1: 基础使用 ===\n');

  // 准备数据文件
  const dataFiles: DataFileInfo[] = [
    {
      id: 'file-1',
      fileName: 'sales_data.xlsx',
      sheets: {
        'Sheet1': [
          { name: '产品A', sales: 1000, category: '电子' },
          { name: '产品B', sales: 1500, category: '电子' },
          { name: '产品C', sales: 800, category: '家居' }
        ]
      },
      currentSheetName: 'Sheet1',
      metadata: {
        'Sheet1': {
          comments: {},
          notes: {},
          rowCount: 3,
          columnCount: 3
        }
      }
    }
  ];

  // 用户指令
  const userPrompt = '请计算每个类别的总销售额，并按销售额降序排列';

  // 执行分析
  const result = await executeMultiStepAnalysis(userPrompt, dataFiles);

  // 输出结果
  console.log('执行结果:', result.success ? '成功' : '失败');
  console.log('执行时间:', result.executionSummary.totalTime, 'ms');
  console.log('输出数据:', result.data);
  console.log('\n完整报告:');
  console.log(generateTaskReport(result));
}

/**
 * 示例2: 带进度监控的使用
 */
async function withProgressExample() {
  console.log('=== 示例2: 带进度监控的使用 ===\n');

  const dataFiles: DataFileInfo[] = [
    {
      id: 'file-1',
      fileName: 'employee_data.xlsx',
      sheets: {
        '员工信息': [
          { id: 1, name: '张三', department: '技术部', salary: 8000 },
          { id: 2, name: '李四', department: '市场部', salary: 7000 },
          { id: 3, name: '王五', department: '技术部', salary: 9000 }
        ]
      },
      currentSheetName: '员工信息',
      metadata: {}
    }
  ];

  const userPrompt = '计算每个部门的平均薪资';

  // 创建进度日志器
  const progressLogger = createProgressLogger('[任务进度] ');

  // 执行分析并监控进度
  const result = await executeMultiStepAnalysisWithProgress(
    userPrompt,
    dataFiles,
    progressLogger,
    {
      logLevel: 'info',
      maxRetries: 3,
      qualityThreshold: 0.8
    }
  );

  console.log('\n最终结果:', result.success);
}

/**
 * 示例3: 使用编排器实例（更多控制）
 */
async function advancedExample() {
  console.log('=== 示例3: 高级使用 ===\n');

  // 创建编排器实例
  const orchestrator = new AgenticOrchestrator({
    maxRetries: 5,
    timeoutPerStep: 60000,
    qualityThreshold: 0.9,
    enableAutoRepair: true,
    logLevel: 'debug'
  });

  // 注册进度回调
  orchestrator.updateProgress((state) => {
    console.log(`[${state.status}] ${state.progress.message}`);

    // 如果达到某个里程碑，执行特定操作
    if (state.progress.percentage === 50) {
      console.log('已达到50%进度！');
    }

    // 检查是否需要用户干预
    if (state.status === TaskStatus.REPAIRING) {
      console.log('系统正在尝试自动修复...');
    }
  });

  // 准备复杂的多sheet数据
  const dataFiles: DataFileInfo[] = [
    {
      id: 'file-1',
      fileName: 'financial_report.xlsx',
      sheets: {
        '收入': [
          { month: '1月', amount: 100000 },
          { month: '2月', amount: 120000 },
          { month: '3月', amount: 110000 }
        ],
        '支出': [
          { month: '1月', amount: 80000 },
          { month: '2月', amount: 90000 },
          { month: '3月', amount: 85000 }
        ],
        '利润': [
          { month: '1月', amount: 20000 },
          { month: '2月', amount: 30000 },
          { month: '3月', amount: 25000 }
        ]
      },
      currentSheetName: '收入',
      metadata: {
        '收入': {
          comments: { 'A1': '月度收入数据' },
          notes: {},
          rowCount: 3,
          columnCount: 2
        }
      }
    }
  ];

  const userPrompt = '分析三个月的财务数据，计算利润率，并生成趋势分析';

  try {
    // 执行任务
    const result = await orchestrator.executeTask(userPrompt, dataFiles);

    // 获取执行日志
    const logs = orchestrator.getLogs();
    console.log('\n执行日志:');
    logs.forEach(log => {
      console.log(`[${log.level}] ${log.message}`);
    });

    // 获取统计信息
    const stats = orchestrator.getStatistics();
    console.log('\n统计信息:', stats);

  } catch (error) {
    console.error('任务执行失败:', error);
  }
}

/**
 * 示例4: 错误处理和恢复
 */
async function errorHandlingExample() {
  console.log('=== 示例4: 错误处理 ===\n');

  const orchestrator = new AgenticOrchestrator({
    enableAutoRepair: true,
    maxRetries: 3
  });

  // 包含问题的数据
  const dataFiles: DataFileInfo[] = [
    {
      id: 'file-1',
      fileName: 'problematic_data.xlsx',
      sheets: {
        'Sheet1': [
          { name: '产品A', quantity: 'invalid', price: 100 }, // 无效数据
          { name: '产品B', quantity: 5, price: 200 }
        ]
      },
      currentSheetName: 'Sheet1',
      metadata: {}
    }
  ];

  const userPrompt = '计算总价（quantity * price）';

  orchestrator.updateProgress((state) => {
    if (state.status === TaskStatus.REPAIRING) {
      console.log('检测到错误，正在尝试修复...');
    }
  });

  try {
    const result = await orchestrator.executeTask(userPrompt, dataFiles);

    if (result.success) {
      console.log('任务成功完成（可能经过自动修复）');
    } else {
      console.log('任务失败，无法自动修复');
      console.log('失败原因:', result.executionSummary.failedSteps);
    }
  } catch (error) {
    console.error('任务执行异常:', error);
  }
}

/**
 * 示例5: 数据验证
 */
async function validationExample() {
  console.log('=== 示例5: 数据验证 ===\n');

  // 准备有问题的数据
  const dataFiles: DataFileInfo[] = [
    {
      id: '', // 缺少ID
      fileName: '', // 缺少文件名
      sheets: {}, // 空数据
      currentSheetName: undefined
    } as any
  ];

  // 验证数据
  const validation = validateDataFiles(dataFiles);

  if (!validation.valid) {
    console.log('数据验证失败:');
    validation.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  } else {
    console.log('数据验证通过');
  }
}

/**
 * 示例6: 实际应用场景 - 审计数据分析
 */
async function realWorldExample() {
  console.log('=== 示例6: 实际应用 - 审计数据分析 ===\n');

  const orchestrator = new AgenticOrchestrator({
    maxRetries: 3,
    qualityThreshold: 0.85,
    logLevel: 'info'
  });

  // 模拟审计数据
  const auditFiles: DataFileInfo[] = [
    {
      id: 'audit-1',
      fileName: 'transactions.xlsx',
      sheets: {
        '交易记录': [
          {
            id: 'TX001',
            date: '2025-01-01',
            amount: 50000,
            department: '采购部',
            vendor: '供应商A',
            approval: '已审批'
          },
          {
            id: 'TX002',
            date: '2025-01-02',
            amount: 75000,
            department: '采购部',
            vendor: '供应商B',
            approval: '已审批'
          }
        ]
      },
      currentSheetName: '交易记录',
      metadata: {
        '交易记录': {
          comments: {
            'A2': '大额交易，需要特别关注',
            'B2': '元旦假期交易'
          },
          notes: {},
          rowCount: 2,
          columnCount: 6
        }
      }
    }
  ];

  const auditPrompt = `
  请分析这些交易数据，执行以下审计程序：
  1. 识别所有大于50000元的交易
  2. 按部门分组统计总金额
  3. 检查是否有未审批的交易
  4. 标记需要进一步调查的交易
  `;

  try {
    const result = await orchestrator.executeTask(auditPrompt, auditFiles);

    if (result.success) {
      console.log('审计分析完成');
      console.log('\n审计发现:');

      // 输出结果数据
      if (result.data) {
        Object.entries(result.data).forEach(([fileName, data]) => {
          console.log(`\n文件: ${fileName}`);
          console.log(JSON.stringify(data, null, 2));
        });
      }

      console.log('\n质量评估:');
      console.log(`总体质量: ${(result.qualityReport?.overallQuality || 0) * 100}%`);
      console.log(`发现问题: ${result.qualityReport?.totalIssues || 0}个`);

      if (result.qualityReport?.suggestions.length) {
        console.log('\n改进建议:');
        result.qualityReport.suggestions.forEach((suggestion, i) => {
          console.log(`${i + 1}. ${suggestion}`);
        });
      }
    }
  } catch (error) {
    console.error('审计分析失败:', error);
  }
}

/**
 * 主函数 - 运行所有示例
 */
async function main() {
  console.log('🚀 多步分析和自我修复系统 - 使用示例\n');

  try {
    // 运行示例
    await basicExample();
    console.log('\n');

    await withProgressExample();
    console.log('\n');

    await advancedExample();
    console.log('\n');

    await errorHandlingExample();
    console.log('\n');

    await validationExample();
    console.log('\n');

    await realWorldExample();

  } catch (error) {
    console.error('示例执行出错:', error);
  }
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  main().catch(console.error);
}

// 导出示例函数供外部使用
export {
  basicExample,
  withProgressExample,
  advancedExample,
  errorHandlingExample,
  validationExample,
  realWorldExample
};
