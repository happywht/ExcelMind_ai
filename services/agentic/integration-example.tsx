/**
 * 多步分析系统 - React 组件集成示例
 *
 * 展示如何在现有的 React 组件中使用 AgenticOrchestrator
 */

import React, { useState, useCallback } from 'react';
import {
  AgenticOrchestrator,
  DataFileInfo,
  TaskResult,
  TaskStatus
} from './agentic';

/**
 * 自定义 Hook: useMultiStepAnalysis
 *
 * 封装多步分析逻辑，方便在组件中使用
 */
export function useMultiStepAnalysis() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orchestrator, setOrchestrator] = useState<AgenticOrchestrator | null>(null);

  /**
   * 执行多步分析
   */
  const analyzeData = useCallback(async (
    prompt: string,
    dataFiles: DataFileInfo[],
    config?: any
  ) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);

    // 创建编排器实例
    const orc = new AgenticOrchestrator(config);
    setOrchestrator(orc);

    // 监控进度
    orc.updateProgress((state) => {
      setProgress(state.progress.percentage);
      setCurrentPhase(state.progress.message);
    });

    try {
      const analysisResult = await orc.executeTask(prompt, dataFiles);
      setResult(analysisResult);

      if (!analysisResult.success) {
        setError('分析失败，请查看日志了解详情');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      console.error('分析执行出错:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * 取消当前任务
   */
  const cancelTask = useCallback(() => {
    if (orchestrator) {
      orchestrator.cancelTask();
      setIsProcessing(false);
      setError('任务已取消');
    }
  }, [orchestrator]);

  /**
   * 获取执行日志
   */
  const getLogs = useCallback(() => {
    return orchestrator ? orchestrator.getLogs() : [];
  }, [orchestrator]);

  /**
   * 清除结果
   */
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(0);
    setCurrentPhase('');
  }, []);

  return {
    analyzeData,
    cancelTask,
    isProcessing,
    progress,
    currentPhase,
    result,
    error,
    getLogs,
    clearResult
  };
}

/**
 * 分析组件示例
 */
export function MultiStepAnalysisComponent() {
  const {
    analyzeData,
    cancelTask,
    isProcessing,
    progress,
    currentPhase,
    result,
    error,
    getLogs,
    clearResult
  } = useMultiStepAnalysis();

  const [prompt, setPrompt] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<DataFileInfo[]>([]);

  /**
   * 处理分析请求
   */
  const handleAnalyze = async () => {
    if (!prompt.trim()) {
      alert('请输入分析指令');
      return;
    }

    if (selectedFiles.length === 0) {
      alert('请选择至少一个数据文件');
      return;
    }

    await analyzeData(prompt, selectedFiles, {
      logLevel: 'info',
      qualityThreshold: 0.8,
      enableAutoRepair: true
    });
  };

  /**
   * 渲染进度条
   */
  const renderProgressBar = () => {
    if (!isProcessing) return null;

    return (
      <div style={{ margin: '20px 0' }}>
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{currentPhase}</span>
          <span>{progress}%</span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#4caf50',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    );
  };

  /**
   * 渲染结果
   */
  const renderResult = () => {
    if (!result) return null;

    return (
      <div style={{ marginTop: '20px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>分析结果</h3>

        <div style={{ marginBottom: '16px' }}>
          <strong>状态:</strong> {result.success ? '✅ 成功' : '❌ 失败'}
        </div>

        {result.qualityReport && (
          <div style={{ marginBottom: '16px' }}>
            <strong>质量评分:</strong> {(result.qualityReport.overallQuality * 100).toFixed(1)}%
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <strong>执行统计:</strong>
          <ul>
            <li>总步骤: {result.executionSummary.totalSteps}</li>
            <li>成功: {result.executionSummary.successfulSteps}</li>
            <li>失败: {result.executionSummary.failedSteps}</li>
            <li>重试: {result.executionSummary.retriedSteps}</li>
            <li>总时间: {(result.executionSummary.totalTime / 1000).toFixed(2)}秒</li>
          </ul>
        </div>

        {result.data && (
          <div>
            <strong>输出数据:</strong>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '300px'
            }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  /**
   * 渲染错误
   */
  const renderError = () => {
    if (!error) return null;

    return (
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#ffebee',
        border: '1px solid #f44336',
        borderRadius: '8px',
        color: '#c62828'
      }}>
        <strong>错误:</strong> {error}
      </div>
    );
  };

  /**
   * 渲染日志
   */
  const renderLogs = () => {
    const logs = getLogs();
    if (logs.length === 0) return null;

    return (
      <details style={{ marginTop: '20px' }}>
        <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
          查看执行日志 ({logs.length} 条)
        </summary>
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '12px',
          borderRadius: '4px',
          maxHeight: '300px',
          overflow: 'auto'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '4px', fontSize: '12px' }}>
              <span style={{ color: log.level === 'error' ? '#f44336' : '#666' }}>
                [{log.level.toUpperCase()}]
              </span>
              <span style={{ marginLeft: '8px' }}>{log.message}</span>
            </div>
          ))}
        </div>
      </details>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>多步数据分析</h2>

      {/* 输入区域 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          分析指令:
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例如：计算每个部门的平均薪资，并按薪资降序排列"
          disabled={isProcessing}
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* 文件选择（模拟） */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          数据文件:
        </label>
        <div style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <div style={{ color: '#666', fontSize: '14px' }}>
            {selectedFiles.length > 0
              ? `已选择 ${selectedFiles.length} 个文件`
              : '请从左侧面板选择数据文件'}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleAnalyze}
          disabled={isProcessing || !prompt.trim()}
          style={{
            padding: '12px 24px',
            backgroundColor: isProcessing ? '#ccc' : '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: isProcessing ? 'not-allowed' : 'pointer'
          }}
        >
          {isProcessing ? '分析中...' : '开始分析'}
        </button>

        {isProcessing && (
          <button
            onClick={cancelTask}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            取消
          </button>
        )}

        {result && (
          <button
            onClick={clearResult}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            清除结果
          </button>
        )}
      </div>

      {/* 进度条 */}
      {renderProgressBar()}

      {/* 结果显示 */}
      {renderResult()}

      {/* 错误显示 */}
      {renderError()}

      {/* 日志显示 */}
      {renderLogs()}
    </div>
  );
}

/**
 * 使用示例（在 App.tsx 中）
 */
export function exampleAppIntegration() {
  return `
// 在 App.tsx 中集成
import { MultiStepAnalysisComponent } from './components/MultiStepAnalysis';

function App() {
  return (
    <div className="App">
      {/* 其他组件 */}
      <DocumentSpace />

      {/* 多步分析组件 */}
      <MultiStepAnalysisComponent />
    </div>
  );
}
  `;
}

export default MultiStepAnalysisComponent;
