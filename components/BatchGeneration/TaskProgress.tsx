/**
 * 任务进度组件
 *
 * 显示批量生成任务的实时进度
 *
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Pause,
  Play,
  X,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { batchGenerationAPI, TaskProgress, WebSocketEvent } from '../../api/batchGenerationAPI';
import StatusIndicator from '../Shared/StatusIndicator';
import ProgressBar from '../Shared/ProgressBar';

interface TaskProgressProps {
  taskId: string;
  onComplete?: () => void;
  className?: string;
}

const TaskProgress: React.FC<TaskProgressProps> = ({ taskId, onComplete, className }) => {
  const [progress, setProgress] = useState<TaskProgress | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载任务进度
  const loadProgress = useCallback(async () => {
    try {
      const data = await batchGenerationAPI.getTaskProgress(taskId);
      setProgress(data);

      if (data.status === 'completed') {
        onComplete?.();
      }
    } catch (err) {
      setError('加载进度失败');
    }
  }, [taskId, onComplete]);

  // 初始化WebSocket连接
  useEffect(() => {
    loadProgress();

    const websocket = batchGenerationAPI.createWebSocketConnection(taskId);
    setWs(websocket);

    websocket.onmessage = (event) => {
      const data: WebSocketEvent = JSON.parse(event.data);

      if (data.type === 'task_progress') {
        setProgress(prev => prev ? {
          ...prev,
          progress: data.data.progress,
          currentStep: data.data.currentStep,
        } : null);
      } else if (data.type === 'generation_status') {
        // 更新模板状态
        setProgress(prev => {
          if (!prev) return null;
          return {
            ...prev,
            items: prev.items.map(item =>
              item.templateId === data.data.templateId
                ? { ...item, ...data.data }
                : item
            ),
          };
        });
      } else if (data.type === 'error') {
        if (data.data.fatal) {
          setError(data.data.error);
        }
      }
    };

    websocket.onerror = () => {
      setError('WebSocket连接失败');
    };

    return () => {
      websocket.close();
    };
  }, [taskId, loadProgress, onComplete]);

  // 控制任务
  const handlePause = async () => {
    try {
      await batchGenerationAPI.pauseTask(taskId);
      await loadProgress();
    } catch (err) {
      alert('暂停失败');
    }
  };

  const handleResume = async () => {
    try {
      await batchGenerationAPI.resumeTask(taskId);
      await loadProgress();
    } catch (err) {
      alert('恢复失败');
    }
  };

  const handleCancel = async () => {
    if (!confirm('确定要取消这个任务吗？')) return;

    try {
      await batchGenerationAPI.cancelTask(taskId);
    } catch (err) {
      alert('取消失败');
    }
  };

  const handleDownloadZip = async () => {
    try {
      const blob = await batchGenerationAPI.downloadZip(taskId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_${taskId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('下载失败');
    }
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl p-6 ${className || ''}`}>
        <div className="flex items-center gap-3 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">任务执行失败</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className={`flex items-center justify-center p-12 ${className || ''}`}>
        <StatusIndicator status="loading" text="加载任务信息..." />
      </div>
    );
  }

  const isRunning = progress.status === 'processing';
  const isPaused = progress.status === 'paused';
  const isCompleted = progress.status === 'completed';
  const isFailed = progress.status === 'failed';

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className || ''}`}>
      {/* 标题栏 */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">批量生成任务</h3>
            <p className="text-sm text-slate-500 mt-1">任务ID: {taskId}</p>
          </div>
          <div className="flex items-center gap-2">
            {isCompleted && (
              <button
                onClick={handleDownloadZip}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                下载ZIP
              </button>
            )}
            {isFailed && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                重新开始
              </button>
            )}
            {!isCompleted && !isFailed && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 进度概览 */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusIndicator
              status={isRunning ? 'loading' : isCompleted ? 'success' : isPaused ? 'paused' : isFailed ? 'error' : 'pending'}
              text={progress.currentStep}
            />
            {isPaused && (
              <button
                onClick={handleResume}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                继续
              </button>
            )}
            {isRunning && (
              <button
                onClick={handlePause}
                className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium flex items-center gap-1"
              >
                <Pause className="w-3 h-3" />
                暂停
              </button>
            )}
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-semibold">{progress.summary.completedDocuments}</span>
            / {progress.summary.totalDocuments} 文档
          </div>
        </div>

        <ProgressBar
          progress={progress.progress}
          size="lg"
          color={isCompleted ? 'green' : isFailed ? 'red' : 'blue'}
          showLabel
        />

        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{progress.summary.totalDocuments}</p>
            <p className="text-xs text-slate-500 mt-1">总数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{progress.summary.completedDocuments}</p>
            <p className="text-xs text-slate-500 mt-1">完成</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{progress.summary.pendingDocuments}</p>
            <p className="text-xs text-slate-500 mt-1">待处理</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{progress.summary.failedDocuments}</p>
            <p className="text-xs text-slate-500 mt-1">失败</p>
          </div>
        </div>
      </div>

      {/* 模板进度列表 */}
      <div className="divide-y divide-slate-100">
        {progress.items.map((item) => (
          <div key={item.templateId} className="px-6 py-4 hover:bg-slate-50">
            <div className="flex items-center gap-4">
              <FileText className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-800">{item.templateName}</h4>
                  <div className="flex items-center gap-2">
                    <StatusIndicator
                      status={item.status === 'completed' ? 'success' : item.status === 'failed' ? 'error' : 'loading'}
                      size={14}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>{item.completedCount} / {item.totalCount} 文档</span>
                  {item.failedCount > 0 && (
                    <span className="text-red-600">{item.failedCount} 失败</span>
                  )}
                </div>
                <ProgressBar
                  progress={item.progress}
                  size="sm"
                  color={item.status === 'completed' ? 'green' : item.status === 'failed' ? 'red' : 'blue'}
                  className="mt-2"
                />
              </div>
              {item.downloads?.completedUrl && (
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Download className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 时间信息 */}
      <div className="px-6 py-4 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>开始时间: {new Date(progress.startedAt).toLocaleString()}</span>
        </div>
        {progress.estimatedEndTime && (
          <span>预计完成: {new Date(progress.estimatedEndTime).toLocaleString()}</span>
        )}
      </div>
    </div>
  );
};

export default TaskProgress;
