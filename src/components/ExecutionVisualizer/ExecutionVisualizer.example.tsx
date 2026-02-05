/**
 * ExcelMind AI 前端优化组件使用示例
 *
 * 本文件展示如何使用新创建的前端优化组件：
 * - AuditTrailReport: 审计轨迹报告
 * - ExecutionVisualizer: 实时执行可视化
 * - ErrorSelfHealingUI: 错误自愈 UI
 * - ValidationResultUI: 智能验证结果
 */

import React, { useState, useEffect } from 'react';
import {
  AuditTrailReport,
  ExecutionVisualizer,
  ErrorSelfHealingUI,
  ValidationResultUI
} from './index';
import {
  AuditTrailLogger,
  validateResult,
  FileFerryService
} from '../../utils';
import type {
  ExecutionStep,
  ExecutionState
} from '../../types/executionTypes';
import type { AuditTrailReport as AuditTrailReportType } from '../../types/auditTrailTypes';
import type { ValidationResult } from '../../types/validationTypes';

/**
 * 示例组件：完整的执行流程展示
 */
export const ExcelMindExecutionFlow: React.FC = () => {
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [state, setState] = useState<ExecutionState>({
    currentStepId: null,
    totalSteps: 0,
    completedSteps: 0,
    percentage: 0,
    isRunning: false,
    isCompleted: false,
    isFailed: false,
    startTime: Date.now()
  });
  const [auditReport, setAuditReport] = useState<AuditTrailReportType | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [retryInfo, setRetryInfo] = useState({
    retryCount: 0,
    maxRetries: 3,
    currentError: '',
    isRetrying: false
  });

  // 初始化审计日志器
  const [auditLogger] = useState(() => new AuditTrailLogger('demo-task'));

  /**
   * 模拟执行流程
   */
  const simulateExecution = async () => {
    setState(prev => ({
      ...prev,
      isRunning: true,
      startTime: Date.now()
    }));

    // 定义执行步骤
    const executionSteps: ExecutionStep[] = [
      {
        id: 'step-1',
        type: 'observe',
        status: 'pending',
        title: '观察数据',
        description: '读取并分析 Excel 文件结构',
        metadata: { fileName: 'data.xlsx', sheetCount: 3 }
      },
      {
        id: 'step-2',
        type: 'think',
        status: 'pending',
        title: 'AI 思考',
        description: '分析需求并生成处理方案',
        metadata: { model: 'glm-4.6', confidence: 0.92 }
      },
      {
        id: 'step-3',
        type: 'act',
        status: 'pending',
        title: '执行操作',
        description: '运行生成的 Python 代码',
        code: 'import pandas as pd\ndf = pd.read_excel("/data/input.xlsx")\ndf["total"] = df["quantity"] * df["price"]\ndf.to_excel("/data/output.xlsx", index=False)'
      },
      {
        id: 'step-4',
        type: 'evaluate',
        status: 'pending',
        title: '评估结果',
        description: '验证输出结果的质量'
      },
      {
        id: 'step-5',
        type: 'complete',
        status: 'pending',
        title: '完成',
        description: '任务执行成功'
      }
    ];

    setSteps(executionSteps);
    setState(prev => ({ ...prev, totalSteps: executionSteps.length }));

    // 逐步执行
    for (let i = 0; i < executionSteps.length; i++) {
      const step = executionSteps[i];

      // 更新当前步骤
      setState(prev => ({
        ...prev,
        currentStepId: step.id,
        completedSteps: i
      }));

      // 更新步骤状态为运行中
      setSteps(prev => prev.map(s =>
        s.id === step.id ? { ...s, status: 'running', startTime: Date.now() } : s
      ));

      // 记录审计日志
      auditLogger.log(
        step.title,
        step.metadata || {},
        'pending'
      );

      // 模拟执行时间
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 更新步骤状态为成功
      setSteps(prev => prev.map(s =>
        s.id === step.id
          ? {
              ...s,
              status: 'success',
              endTime: Date.now(),
              duration: 1500,
              result: i === 3 ? { rows: 100, columns: 5 } : undefined
            }
          : s
      ));

      // 更新审计日志
      auditLogger.log(
        step.title,
        { ...step.metadata, executionTime: 1500 },
        'success'
      );
    }

    // 完成执行
    setState(prev => ({
      ...prev,
      isRunning: false,
      isCompleted: true,
      currentStepId: null,
      completedSteps: executionSteps.length,
      percentage: 100,
      endTime: Date.now(),
      totalDuration: Date.now() - prev.startTime
    }));

    // 生成审计报告
    setAuditReport(auditLogger.generateReport());

    // 模拟验证结果
    const mockValidation: ValidationResult = {
      valid: true,
      warnings: [
        {
          level: 'info',
          code: 'ROW_COUNT_MISMATCH',
          message: '输出行数与输入行数不完全一致',
          suggestion: '这可能是因为数据过滤或聚合操作',
          details: { inputRows: 105, outputRows: 100 }
        }
      ],
      score: 95,
      metrics: {
        rowCount: 100,
        columnCount: 5,
        numericSummary: { sum: 50000, min: 100, max: 1000, avg: 500 },
        dataQuality: { missingValues: 0, duplicateRows: 0, inconsistentTypes: 0 }
      }
    };
    setValidationResult(mockValidation);
  };

  /**
   * 模拟错误自愈流程
   */
  const simulateErrorHealing = async () => {
    setRetryInfo({
      retryCount: 0,
      maxRetries: 3,
      currentError: 'KeyError: "column_not_found"',
      isRetrying: true
    });

    // 模拟重试
    for (let i = 1; i <= 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (i === 2) {
        // 模拟修复成功
        setRetryInfo(prev => ({
          ...prev,
          retryCount: i,
          isRetrying: false,
          currentError: ''
        }));
        break;
      } else {
        setRetryInfo(prev => ({
          ...prev,
          retryCount: i,
          currentError: `KeyError: "column_not_found" (尝试 ${i} 失败)`
        }));
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          ExcelMind AI 前端优化组件示例
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          展示审计轨迹、执行可视化、错误自愈和智能验证功能
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3">
        <button
          onClick={simulateExecution}
          disabled={state.isRunning}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.isRunning ? '执行中...' : '模拟完整执行流程'}
        </button>
        <button
          onClick={simulateErrorHealing}
          disabled={retryInfo.isRetrying}
          className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          模拟错误自愈
        </button>
      </div>

      {/* 执行可视化 */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
          实时执行可视化
        </h2>
        <ExecutionVisualizer
          steps={steps}
          state={state}
          showCode={true}
          showResult={true}
        />
      </div>

      {/* 错误自愈 UI */}
      {retryInfo.isRetrying || retryInfo.retryCount > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
            错误自愈系统
          </h2>
          <ErrorSelfHealingUI
            retryCount={retryInfo.retryCount}
            maxRetries={retryInfo.maxRetries}
            currentError={retryInfo.currentError}
            isRetrying={retryInfo.isRetrying}
            repairStrategy="AI 正在重新分析列名并生成修复代码..."
          />
        </div>
      ) : null}

      {/* 验证结果 */}
      {validationResult && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
            智能验证结果
          </h2>
          <ValidationResultUI
            result={validationResult}
            onApplyFix={(code) => console.log('Apply fix:', code)}
            onIgnore={(code) => console.log('Ignore warning:', code)}
          />
        </div>
      )}

      {/* 审计轨迹报告 */}
      {auditReport && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
            审计轨迹报告
          </h2>
          <AuditTrailReport
            report={auditReport}
            onExport={(format) => console.log('Export report as:', format)}
            expanded={true}
          />
        </div>
      )}
    </div>
  );
};

/**
 * 示例：使用审计日志器
 */
export const AuditLoggerExample: React.FC = () => {
  const [logger] = useState(() => new AuditTrailLogger());

  const logExample = () => {
    // 记录文件上传
    logger.log('文件上传', {
      inputFile: 'data.xlsx',
      fileSize: 1024000,
      operation: 'upload'
    }, 'success');

    // 记录代码生成
    logger.log('代码生成', {
      model: 'glm-4.6',
      tokens: 1500,
      operation: 'generate',
      code: 'import pandas as pd\n...'
    }, 'success');

    // 记录错误
    logger.log('代码执行', {
      operation: 'execute',
      errorMessage: 'KeyError: "column_not_found"'
    }, 'error');

    // 生成报告
    const report = logger.generateReport();
    console.log('审计报告:', report);
  };

  return (
    <button onClick={logExample} className="px-4 py-2 bg-blue-600 text-white rounded">
      记录审计日志示例
    </button>
  );
};

/**
 * 示例：使用结果验证器
 */
export const ResultValidatorExample: React.FC = () => {
  const validateExample = async () => {
    // 模拟 Excel 元数据
    const metadata: ExcelMetadata = {
      fileName: 'data.xlsx',
      sheetNames: ['Sheet1', 'Sheet2'],
      sheets: {
        Sheet1: {
          rowCount: 100,
          columnCount: 5,
          columns: [
            { name: 'id', type: 'number', nullable: false, sampleValues: [1, 2, 3] },
            { name: 'name', type: 'string', nullable: true, sampleValues: ['Alice', 'Bob'] }
          ],
          hasEmptyValues: true
        },
        Sheet2: {
          rowCount: 50,
          columnCount: 3,
          columns: [],
          hasEmptyValues: false
        }
      }
    };

    // 模拟执行结果
    const result = {
      data: Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        value: Math.random() * 1000
      }))
    };

    // 验证结果
    const validation = await validateResult(result, metadata);
    console.log('验证结果:', validation);
  };

  return (
    <button onClick={validateExample} className="px-4 py-2 bg-emerald-600 text-white rounded">
      验证结果示例
    </button>
  );
};

/**
 * 示例：使用文件摆渡服务
 */
export const FileFerryExample: React.FC = () => {
  const ferryExample = async () => {
    // 创建文件摆渡服务
    const ferry = new FileFerryService();

    // TODO: 需要等待 Pyodide 初始化
    // ferry.setPyodideInstance(pyodide);

    // 初始化文件系统
    // await ferry.initFileSystem();

    // 挂载文件
    // const result = await ferry.mountFile(file, '/data/input.xlsx', {
    //   onProgress: (progress) => console.log(`Progress: ${progress}%`),
    //   onLog: (message) => console.log(message)
    // });

    console.log('文件摆渡服务需要 Pyodide 支持');
  };

  return (
    <button onClick={ferryExample} className="px-4 py-2 bg-purple-600 text-white rounded">
      文件摆渡示例（需要 Pyodide）
    </button>
  );
};

export default ExcelMindExecutionFlow;
