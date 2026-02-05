/**
 * 多步分析系统 - 集成演示
 *
 * 展示如何将 AgenticOrchestrator 集成到现有系统中
 */

import {
  AgenticOrchestrator,
  executeMultiStepAnalysis,
  createProgressLogger,
  generateTaskReport,
  DataFileInfo
} from './index';
import { TaskStatus } from '../../types/agenticTypes';

/**
 * 演示1: 与现有 DocumentSpace 集成
 */
export async function integrateWithDocumentSpace() {
  console.log('=== 演示1: 与 DocumentSpace 集成 ===\n');

  // 模拟从 DocumentSpace 获取的数据
  const excelData = {
    id: 'doc-123',
    fileName: '财务报表.xlsx',
    sheets: {
      '收入': [
        { 项目: '产品销售', 金额: 500000, 月份: '2025-01' },
        { 项目: '服务收入', 金额: 300000, 月份: '2025-01' }
      ],
      '支出': [
        { 项目: '人力成本', 金额: 200000, 月份: '2025-01' },
        { 项目: '运营成本', 金额: 150000, 月份: '2025-01' }
      ]
    },
    currentSheetName: '收入',
    metadata: {
      '收入': {
        comments: { 'A1': '月度收入汇总' },
        notes: {},
        rowCount: 2,
        columnCount: 3
      }
    }
  };

  // 用户分析需求
  const analysisRequest = '计算本月净利润，并分析收入支出结构';

  // 执行分析
  const result = await executeMultiStepAnalysis(
    analysisRequest,
    [excelData],
    {
      logLevel: 'info',
      qualityThreshold: 0.85
    }
  );

  // 处理结果
  if (result.success) {
    console.log('✅ 分析成功！');
    console.log('📊 结果数据:', result.data);
    console.log('📈 质量评分:', result.qualityReport?.overallQuality);

    // 生成报告
    console.log('\n📄 分析报告:');
    console.log(generateTaskReport(result));
  } else {
    console.log('❌ 分析失败');
    console.log('失败步骤:', result.executionSummary.failedSteps);
  }
}

/**
 * 演示2: React 组件集成
 */
export function createReactIntegrationHook() {
  console.log('=== 演示2: React Hook 集成示例 ===\n');

  // 这是一个示例 Hook，展示如何在 React 中使用
  const hookCode = `
import { useState, useCallback } from 'react';
import { AgenticOrchestrator, DataFileInfo, TaskResult } from './services/agentic';

export function useMultiStepAnalysis() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeData = useCallback(async (
    prompt: string,
    dataFiles: DataFileInfo[]
  ) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    const orchestrator = new AgenticOrchestrator({
      logLevel: 'info',
      qualityThreshold: 0.8
    });

    // 监控进度
    orchestrator.updateProgress((state) => {
      setProgress(state.progress.percentage);
      setCurrentPhase(state.progress.message);
    });

    try {
      const analysisResult = await orchestrator.executeTask(prompt, dataFiles);
      setResult(analysisResult);

      if (!analysisResult.success) {
        setError('分析失败，请查看日志');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    analyzeData,
    isProcessing,
    progress,
    currentPhase,
    result,
    error
  };
}

// 在组件中使用
function AnalysisComponent() {
  const { analyzeData, isProcessing, progress, currentPhase, result } = useMultiStepAnalysis();

  const handleAnalyze = async () => {
    const dataFiles = [/* 您的数据文件 */];
    await analyzeData('分析销售数据', dataFiles);
  };

  return (
    <div>
      <button onClick={handleAnalyze} disabled={isProcessing}>
        {isProcessing ? '分析中...' : '开始分析'}
      </button>

      {isProcessing && (
        <div>
          <div>进度: {progress}%</div>
          <div>当前阶段: {currentPhase}</div>
        </div>
      )}

      {result && (
        <div>
          <h3>分析结果</h3>
          <pre>{JSON.stringify(result.data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
  `;

  console.log('React Hook 示例代码:');
  console.log(hookCode);
}

/**
 * 演示3: 批量处理
 */
export async function batchProcessingDemo() {
  console.log('=== 演示3: 批量处理 ===\n');

  // 模拟多个文件需要分析
  const files = [
    {
      id: 'file-1',
      fileName: '1月数据.xlsx',
      sheets: {
        'Sheet1': [
          { 产品: 'A', 销量: 100, 金额: 10000 },
          { 产品: 'B', 销量: 200, 金额: 20000 }
        ]
      },
      currentSheetName: 'Sheet1'
    },
    {
      id: 'file-2',
      fileName: '2月数据.xlsx',
      sheets: {
        'Sheet1': [
          { 产品: 'A', 销量: 150, 金额: 15000 },
          { 产品: 'B', 销量: 250, 金额: 25000 }
        ]
      },
      currentSheetName: 'Sheet1'
    }
  ];

  console.log(`开始批量处理 ${files.length} 个文件...`);

  const orchestrator = new AgenticOrchestrator();
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\n处理文件 ${i + 1}/${files.length}: ${file.fileName}`);

    try {
      const result = await orchestrator.executeTask(
        '计算总销量和总金额',
        [file]
      );

      results.push({
        file: file.fileName,
        success: result.success,
        data: result.data
      });

      console.log(`✅ ${file.fileName} 处理完成`);
    } catch (error) {
      console.error(`❌ ${file.fileName} 处理失败:`, error);
      results.push({
        file: file.fileName,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  console.log('\n批量处理完成！');
  console.log('结果汇总:');
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.file}: ${result.success ? '成功' : '失败'}`);
  });

  return results;
}

/**
 * 演示4: 实时进度监控
 */
export async function realTimeProgressDemo() {
  console.log('=== 演示4: 实时进度监控 ===\n');

  const dataFiles: DataFileInfo[] = [
    {
      id: 'demo-file',
      fileName: 'demo_data.xlsx',
      sheets: {
        'Sheet1': [
          { id: 1, name: 'Item 1', value: 100 },
          { id: 2, name: 'Item 2', value: 200 },
          { id: 3, name: 'Item 3', value: 300 }
        ]
      },
      currentSheetName: 'Sheet1'
    }
  ];

  const orchestrator = new AgenticOrchestrator({
    logLevel: 'debug'
  });

  // 创建进度条
  let lastProgress = 0;

  orchestrator.updateProgress((state) => {
    const currentProgress = state.progress.percentage;

    // 只在进度有明显变化时更新
    if (currentProgress !== lastProgress) {
      const bar = '█'.repeat(Math.floor(currentProgress / 5));
      const empty = '░'.repeat(20 - Math.floor(currentProgress / 5));

      console.log(`\r[${bar}${empty}] ${currentProgress}% - ${state.progress.message}`);
      lastProgress = currentProgress;
    }

    // 特定阶段的处理
    if (state.status === TaskStatus.REPAIRING) {
      console.log('\n⚠️  检测到错误，正在尝试自动修复...');
    }

    if (state.status === TaskStatus.COMPLETED) {
      console.log('\n✅ 任务完成！');
    }

    if (state.status === TaskStatus.FAILED) {
      console.log('\n❌ 任务失败');
    }
  });

  console.log('开始任务...');

  try {
    const result = await orchestrator.executeTask(
      '计算所有项目的总价值',
      dataFiles
    );

    console.log('\n任务结果:', result.success ? '成功' : '失败');
  } catch (error) {
    console.error('\n执行出错:', error);
  }
}

/**
 * 演示5: 错误处理和恢复
 */
export async function errorHandlingDemo() {
  console.log('=== 演示5: 错误处理和恢复 ===\n');

  // 故意提供有问题的数据
  const problematicData: DataFileInfo[] = [
    {
      id: 'problematic',
      fileName: 'bad_data.xlsx',
      sheets: {
        'Sheet1': [
          { name: 'Item 1', quantity: 'invalid', price: 100 }, // 无效数量
          { name: 'Item 2', quantity: 5, price: 200 }
        ]
      },
      currentSheetName: 'Sheet1'
    }
  ];

  const orchestrator = new AgenticOrchestrator({
    enableAutoRepair: true,
    maxRetries: 3,
    logLevel: 'info'
  });

  console.log('开始处理有问题的数据...');

  orchestrator.updateProgress((state) => {
    if (state.status === TaskStatus.REPAIRING) {
      console.log('🔧 正在尝试修复错误...');
    }
  });

  try {
    const result = await orchestrator.executeTask(
      '计算总价（quantity * price）',
      problematicData
    );

    if (result.success) {
      console.log('✅ 任务成功（可能经过自动修复）');
      console.log('修复次数:', result.executionSummary.retriedSteps);
    } else {
      console.log('❌ 任务失败，无法自动修复');
      console.log('建议：检查数据格式');
    }

    // 显示日志
    console.log('\n执行日志:');
    const logs = orchestrator.getLogs();
    logs.slice(-5).forEach(log => {
      console.log(`[${log.level}] ${log.message}`);
    });

  } catch (error) {
    console.error('执行异常:', error);
  }
}

/**
 * 演示6: 与现有工作流集成
 */
export async function workflowIntegrationDemo() {
  console.log('=== 演示6: 工作流集成 ===\n');

  // 模拟一个完整的工作流
  async function completeWorkflow() {
    console.log('步骤1: 数据上传');
    // 这里可以集成现有的文件上传功能
    const uploadedFile: DataFileInfo = {
      id: 'workflow-1',
      fileName: 'workflow_data.xlsx',
      sheets: {
        'Data': [
          { category: 'A', value: 100 },
          { category: 'B', value: 200 }
        ]
      },
      currentSheetName: 'Data'
    };
    console.log('✅ 数据上传完成');

    console.log('\n步骤2: 数据验证');
    // 这里可以集成数据验证逻辑
    console.log('✅ 数据验证通过');

    console.log('\n步骤3: 执行分析');
    const result = await executeMultiStepAnalysis(
      '按类别汇总数值',
      [uploadedFile]
    );

    if (result.success) {
      console.log('✅ 分析完成');

      console.log('\n步骤4: 生成报告');
      const report = generateTaskReport(result);
      console.log(report);

      console.log('\n步骤5: 导出结果');
      // 这里可以集成结果导出功能
      console.log('✅ 结果已导出');

      return result;
    } else {
      throw new Error('工作流失败');
    }
  }

  try {
    await completeWorkflow();
    console.log('\n🎉 工作流完成！');
  } catch (error) {
    console.error('\n❌ 工作流失败:', error);
  }
}

/**
 * 主函数 - 运行所有演示
 */
export async function runAllDemos() {
  console.log('🚀 多步分析系统 - 集成演示\n');
  console.log('='.repeat(60));

  try {
    await integrateWithDocumentSpace();
    console.log('\n' + '='.repeat(60) + '\n');

    createReactIntegrationHook();
    console.log('\n' + '='.repeat(60) + '\n');

    await batchProcessingDemo();
    console.log('\n' + '='.repeat(60) + '\n');

    await realTimeProgressDemo();
    console.log('\n' + '='.repeat(60) + '\n');

    await errorHandlingDemo();
    console.log('\n' + '='.repeat(60) + '\n');

    await workflowIntegrationDemo();

    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有演示完成！\n');

  } catch (error) {
    console.error('❌ 演示执行出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllDemos().catch(console.error);
}
