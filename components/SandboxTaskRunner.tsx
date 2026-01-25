/**
 * SandboxTaskRunner.tsx - 沙箱任务运行器示例组件
 *
 * 展示如何在 React 组件中使用无头沙箱系统
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Square, RefreshCw, Trash2, FileText, AlertCircle } from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

interface SandboxTask {
  id: string;
  command: string;
  status: 'running' | 'completed' | 'failed' | 'interrupted';
  progress: number;
  output: string[];
  error: string | null;
  duration: number;
  logFile?: string;
}

interface SandboxStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
  diskUsage: {
    formatted: string;
  };
}

// ============================================================================
// 组件
// ============================================================================

export const SandboxTaskRunner: React.FC = () => {
  // ============================================================================
  // 状态管理
  // ============================================================================

  const [currentTask, setCurrentTask] = useState<SandboxTask | null>(null);
  const [command, setCommand] = useState('analyze ./src');
  const [contextFiles, setContextFiles] = useState<string[]>([]);
  const [stats, setStats] = useState<SandboxStats | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [showLogs, setShowLogs] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const outputEndRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // 自动滚动到底部
  // ============================================================================

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTask?.output]);

  // ============================================================================
  // 加载统计信息
  // ============================================================================

  const loadStats = useCallback(async () => {
    try {
      const result = await window.electronAPI.sandbox.getStats();
      setStats(result);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // ============================================================================
  // 验证环境
  // ============================================================================

  const validateEnvironment = useCallback(async () => {
    try {
      const result = await window.electronAPI.sandbox.validateEnv();
      setValidationResult(result);
      return result;
    } catch (error) {
      console.error('环境验证失败:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    validateEnvironment();
  }, [validateEnvironment]);

  // ============================================================================
  // 设置事件监听器
  // ============================================================================

  useEffect(() => {
    const handleProgress = (event: any) => {
      if (currentTask && event.taskId === currentTask.id) {
        setCurrentTask(prev => prev ? { ...prev, progress: event.percentage } : null);
      }
    };

    const handleComplete = (event: any) => {
      if (currentTask && event.taskId === currentTask.id) {
        setCurrentTask(prev => prev ? {
          ...prev,
          status: event.status === 'completed' ? 'completed' : 'failed',
          progress: 100,
          duration: event.duration,
          logFile: event.logFile
        } : null);
        loadStats();
      }
    };

    const handleOutput = (event: any) => {
      if (currentTask && event.taskId === currentTask.id) {
        setCurrentTask(prev => prev ? {
          ...prev,
          output: [...prev.output, event.content]
        } : null);
      }
    };

    const handleError = (event: any) => {
      if (currentTask && event.taskId === currentTask.id) {
        setCurrentTask(prev => prev ? {
          ...prev,
          error: event.message,
          status: event.isFatal ? 'failed' : prev.status
        } : null);
      }
    };

    const handleRequireInteraction = (event: any) => {
      if (currentTask && event.taskId === currentTask.id) {
        // 自动发送 "yes" 响应
        window.electronAPI.sandbox.sendInput({
          taskId: currentTask.id,
          input: 'yes'
        });
      }
    };

    window.electronAPI.sandbox.onProgress(handleProgress);
    window.electronAPI.sandbox.onComplete(handleComplete);
    window.electronAPI.sandbox.onOutput(handleOutput);
    window.electronAPI.sandbox.onError(handleError);
    window.electronAPI.sandbox.onRequireInteraction(handleRequireInteraction);

    return () => {
      window.electronAPI.sandbox.removeAllListeners();
    };
  }, [currentTask, loadStats]);

  // ============================================================================
  // 执行命令
  // ============================================================================

  const executeCommand = useCallback(async () => {
    if (!command.trim()) {
      return;
    }

    const taskId = `task-${Date.now()}`;
    const newTask: SandboxTask = {
      id: taskId,
      command,
      status: 'running',
      progress: 0,
      output: [],
      error: null,
      duration: 0
    };

    setCurrentTask(newTask);

    try {
      await window.electronAPI.sandbox.execute({
        taskId,
        command,
        contextFiles
      });
    } catch (error) {
      setCurrentTask(prev => prev ? {
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : '未知错误'
      } : null);
    }
  }, [command, contextFiles]);

  // ============================================================================
  // 中断任务
  // ============================================================================

  const interruptTask = useCallback(async () => {
    if (!currentTask) {
      return;
    }

    try {
      const result = await window.electronAPI.sandbox.interrupt({
        taskId: currentTask.id
      });

      if (result.success) {
        setCurrentTask(prev => prev ? {
          ...prev,
          status: 'interrupted'
        } : null);
      }
    } catch (error) {
      console.error('中断任务失败:', error);
    }
  }, [currentTask]);

  // ============================================================================
  // 加载日志
  // ============================================================================

  const loadLogs = useCallback(async () => {
    if (!currentTask?.logFile) {
      return;
    }

    try {
      const result = await window.electronAPI.sandbox.readLog({
        logFile: currentTask.logFile,
        maxLines: 500
      });
      setLogs(result.content);
      setShowLogs(true);
    } catch (error) {
      console.error('加载日志失败:', error);
    }
  }, [currentTask]);

  // ============================================================================
  // 清理缓存
  // ============================================================================

  const cleanupCache = useCallback(async () => {
    try {
      const result = await window.electronAPI.sandbox.cleanupCache();
      alert(`清理完成\n释放空间: ${result.freedSpace}`);
      loadStats();
    } catch (error) {
      console.error('清理缓存失败:', error);
    }
  }, [loadStats]);

  // ============================================================================
  // 渲染
  // ============================================================================

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">AI 沙箱任务运行器</h1>
        {stats && (
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>总任务: {stats.total}</span>
            <span>运行中: {stats.active}</span>
            <span>已完成: {stats.completed}</span>
            <span>失败: {stats.failed}</span>
            <span>磁盘: {stats.diskUsage.formatted}</span>
          </div>
        )}
      </div>

      {/* 环境验证结果 */}
      {validationResult && (
        <div className={`p-4 rounded-lg ${
          validationResult.valid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">
              {validationResult.valid ? '环境验证成功' : '环境验证失败'}
            </span>
          </div>
          {!validationResult.valid && (
            <ul className="mt-2 list-disc list-inside">
              {validationResult.errors.map((error: string, index: number) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 命令输入 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            要执行的命令
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              disabled={currentTask?.status === 'running'}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="输入要执行的命令..."
            />
            <button
              onClick={executeCommand}
              disabled={currentTask?.status === 'running' || !command.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>执行</span>
            </button>
            {currentTask?.status === 'running' && (
              <button
                onClick={interruptTask}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
              >
                <Square className="w-4 h-4" />
                <span>中断</span>
              </button>
            )}
          </div>
        </div>

        {/* 进度条 */}
        {currentTask && currentTask.status === 'running' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>执行中...</span>
              <span>{currentTask.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentTask.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 任务状态 */}
        {currentTask && currentTask.status !== 'running' && (
          <div className={`p-4 rounded-lg ${
            currentTask.status === 'completed' ? 'bg-green-50 text-green-800' :
            currentTask.status === 'failed' ? 'bg-red-50 text-red-800' :
            'bg-yellow-50 text-yellow-800'
          }`}>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">
                {currentTask.status === 'completed' ? '任务完成' :
                 currentTask.status === 'failed' ? '任务失败' :
                 '任务已中断'}
              </span>
              {currentTask.duration > 0 && (
                <span className="text-sm ml-2">
                  (耗时: {(currentTask.duration / 1000).toFixed(2)}s)
                </span>
              )}
            </div>
            {currentTask.error && (
              <p className="mt-2 text-sm">{currentTask.error}</p>
            )}
          </div>
        )}
      </div>

      {/* 输出显示 */}
      {currentTask && currentTask.output.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">任务输出</h2>
            {currentTask.logFile && (
              <button
                onClick={loadLogs}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>查看完整日志</span>
              </button>
            )}
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 font-mono text-sm">
            {currentTask.output.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
            <div ref={outputEndRef} />
          </div>
        </div>
      )}

      {/* 完整日志模态框 */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">完整任务日志</h2>
              <button
                onClick={() => setShowLogs(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[60vh]">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                {logs}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>刷新统计</span>
          </button>
          <button
            onClick={cleanupCache}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>清理缓存</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SandboxTaskRunner;
