/**
 * 批量任务创建器组件
 *
 * 创建批量文档生成任务
 *
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  FileText,
  Database,
  Settings,
  Play,
  Zap,
  AlertCircle
} from 'lucide-react';
import { batchGenerationAPI } from '../../api/batchGenerationAPI';
import { useWebSocket } from '../../hooks/useWebSocket';
import { WS_BASE_URL } from '../../api/config';
import { BatchTaskConfig, TaskStatus, TaskProgress } from './types';
import StatusIndicator from '../Shared/StatusIndicator';
import ProgressBar from '../Shared/ProgressBar';

interface BatchTaskCreatorProps {
  onTaskCreated: (taskId: string) => void;
  className?: string;
}

const BatchTaskCreator: React.FC<BatchTaskCreatorProps> = ({ onTaskCreated, className }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [config, setConfig] = useState<Partial<BatchTaskConfig>>({
    outputFormat: 'docx',
    parallelProcessing: true,
    createZip: true,
    batchSize: 100,
  });
  const [creating, setCreating] = useState(false);
  const [createdTask, setCreatedTask] = useState<CreateTaskResponse | null>(null);
  const [taskProgress, setTaskProgress] = useState<TaskProgress | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // WebSocket连接
  const { client, connected: wsConnected, subscribe, on } = useWebSocket(
    WS_BASE_URL,
    {
      onConnect: () => {
        console.log('[BatchTaskCreator] WebSocket已连接');
      },
      onDisconnect: () => {
        console.log('[BatchTaskCreator] WebSocket已断开');
      },
    }
  );

  // 订阅任务进度
  useEffect(() => {
    if (client && wsConnected && currentTaskId) {
      const channel = `task:${currentTaskId}`;
      subscribe(channel);

      const handleProgress = (message: any) => {
        if (message.type === 'task_progress') {
          setTaskProgress(prev => ({
            ...prev,
            progress: message.payload.progress,
            currentStep: message.payload.currentStep,
            items: prev?.items || [],
          } as TaskProgress));
        } else if (message.type === 'generation_status') {
          setTaskProgress(prev => ({
            ...prev,
            items: message.payload.items || prev?.items || [],
          } as TaskProgress));
        } else if (message.type === 'task_completed') {
          setTaskProgress(prev => ({
            ...prev,
            status: 'completed',
            progress: 100,
          } as TaskProgress));
          setStep(3); // 完成页
        } else if (message.type === 'task_failed') {
          setTaskProgress(prev => ({
            ...prev,
            status: 'failed',
          } as TaskProgress));
        }
      };

      on(channel, handleProgress);

      return () => {
        // 清理
      };
    }
  }, [client, wsConnected, currentTaskId, subscribe, on]);

  const availableTemplates = [
    { id: 'tpl_1', name: '销售合同模板', category: '合同' },
    { id: 'tpl_2', name: '采购订单模板', category: '订单' },
    { id: 'tpl_3', name: '发票模板', category: '发票' },
  ];

  const availableDataSources = [
    { id: 'ds_1', name: '客户数据表.xlsx', rows: 1250 },
    { id: 'ds_2', name: '产品列表.csv', rows: 500 },
    { id: 'ds_3', name: '订单数据.xlsx', rows: 3200 },
  ];

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleCreateTask = async () => {
    if (!selectedDataSource || selectedTemplates.length === 0) {
      alert('请选择数据源和模板');
      return;
    }

    setCreating(true);
    try {
      const taskConfig: BatchTaskConfig = {
        dataSourceId: selectedDataSource,
        templateIds: selectedTemplates,
        outputFormat: config.outputFormat || 'docx',
        options: {
          batchSize: config.batchSize,
          parallelProcessing: config.parallelProcessing,
          createZip: config.createZip,
        },
      };

      const response = await batchGenerationAPI.createTask(taskConfig);
      setCreatedTask(response);
      setCurrentTaskId(response.taskId);
      onTaskCreated(response.taskId);

      // 初始化任务进度状态
      setTaskProgress({
        taskId: response.taskId,
        status: 'pending',
        progress: 0,
        currentStep: '等待启动',
        startedAt: new Date().toISOString(),
        items: response.items.map(item => ({
          templateId: item.templateId,
          templateName: item.templateName,
          status: 'pending',
          progress: 0,
          completedCount: 0,
          totalCount: item.estimatedCount,
          failedCount: 0,
        })),
        summary: {
          totalDocuments: response.estimatedDocumentCount,
          completedDocuments: 0,
          failedDocuments: 0,
          pendingDocuments: response.estimatedDocumentCount,
        },
      });

      // 自动启动任务
      setTimeout(async () => {
        try {
          await handleStartTask();
        } catch (error) {
          console.error('启动任务失败:', error);
        }
      }, 500);
    } catch (error) {
      console.error('创建任务失败:', error);
      alert('创建任务失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleStartTask = useCallback(async () => {
    if (!currentTaskId) return;

    try {
      // 这里应该调用启动任务的API
      // await batchGenerationAPI.startTask(currentTaskId);

      setTaskProgress(prev => prev ? {
        ...prev,
        status: 'processing',
        currentStep: '处理中',
      } : null);
    } catch (error) {
      console.error('启动任务失败:', error);
      alert('启动任务失败');
    }
  }, [currentTaskId]);

  const handlePauseTask = useCallback(async () => {
    if (!currentTaskId) return;

    try {
      await batchGenerationAPI.pauseTask(currentTaskId);
      setTaskProgress(prev => prev ? {
        ...prev,
        status: 'paused',
      } : null);
    } catch (error) {
      console.error('暂停任务失败:', error);
      alert('暂停任务失败');
    }
  }, [currentTaskId]);

  const handleResumeTask = useCallback(async () => {
    if (!currentTaskId) return;

    try {
      await batchGenerationAPI.resumeTask(currentTaskId);
      setTaskProgress(prev => prev ? {
        ...prev,
        status: 'processing',
      } : null);
    } catch (error) {
      console.error('恢复任务失败:', error);
      alert('恢复任务失败');
    }
  }, [currentTaskId]);

  const handleDownloadResults = useCallback(async () => {
    if (!currentTaskId) return;

    try {
      const blob = await batchGenerationAPI.downloadZip(currentTaskId);

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-${currentTaskId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败');
    }
  }, [currentTaskId]);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className || ''}`}>
      {/* 步骤指示器 */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {s}
                </div>
                <span className={`text-sm font-medium ${
                  step >= s ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {s === 1 ? '选择模板' : s === 2 ? '选择数据' : '配置选项'}
                </span>
              </div>
              {s < 3 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  step > s ? 'bg-emerald-600' : 'bg-slate-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-6">
        {/* 步骤1: 选择模板 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">选择模板</h3>
              <span className="text-sm text-slate-500">
                已选 {selectedTemplates.length} 个模板
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => toggleTemplate(template.id)}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedTemplates.includes(template.id)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">{template.name}</h4>
                      <p className="text-xs text-slate-500">{template.category}</p>
                    </div>
                    {selectedTemplates.includes(template.id) && (
                      <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={selectedTemplates.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                下一步
              </button>
            </div>
          </div>
        )}

        {/* 步骤2: 选择数据源 */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">选择数据源</h3>

            <div className="space-y-3">
              {availableDataSources.map((dataSource) => (
                <div
                  key={dataSource.id}
                  onClick={() => setSelectedDataSource(dataSource.id)}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex items-center gap-4 ${
                    selectedDataSource === dataSource.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <Database className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800">{dataSource.name}</h4>
                    <p className="text-xs text-slate-500">{dataSource.rows.toLocaleString()} 行数据</p>
                  </div>
                  {selectedDataSource === dataSource.id && (
                    <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                上一步
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedDataSource}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                下一步
              </button>
            </div>
          </div>
        )}

        {/* 步骤3: 配置选项 */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">配置选项</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 输出格式 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">输出格式</label>
                <div className="flex gap-3">
                  {(['docx', 'pdf', 'html'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => setConfig(prev => ({ ...prev, outputFormat: format }))}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        config.outputFormat === format
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* 批次大小 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">批次大小</label>
                <input
                  type="number"
                  value={config.batchSize || 100}
                  onChange={(e) => setConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="10"
                  max="1000"
                />
              </div>

              {/* 并行处理 */}
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">并行处理</p>
                  <p className="text-xs text-slate-500">同时处理多个文档</p>
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, parallelProcessing: !prev.parallelProcessing }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    config.parallelProcessing ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    config.parallelProcessing ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* 创建ZIP */}
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">创建ZIP压缩包</p>
                  <p className="text-xs text-slate-500">将所有文档打包为ZIP</p>
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, createZip: !prev.createZip }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    config.createZip ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    config.createZip ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* 任务预览 */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <h4 className="font-medium text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                任务预览
              </h4>
              <div className="text-sm text-slate-600 space-y-1">
                <p>• 模板数量: <span className="font-semibold">{selectedTemplates.length}</span></p>
                <p>• 数据源: <span className="font-semibold">
                  {availableDataSources.find(ds => ds.id === selectedDataSource)?.name}
                </span></p>
                <p>• 预计文档: <span className="font-semibold">
                  {selectedTemplates.length * (availableDataSources.find(ds => ds.id === selectedDataSource)?.rows || 0)}
                </span></p>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                上一步
              </button>
              <button
                onClick={handleCreateTask}
                disabled={creating}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <StatusIndicator status="loading" size={16} />
                    创建中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    创建任务
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 创建成功 */}
        {createdTask && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <Zap className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">任务创建成功！</h3>
            <p className="text-slate-500 mb-6">
              任务ID: {createdTask.taskId}
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-slate-600 mb-6">
              <span>预计文档: {createdTask.estimatedDocumentCount}</span>
              <span>·</span>
              <span>预计耗时: {Math.round(createdTask.estimatedTime / 60)} 分钟</span>
            </div>
            <button
              onClick={() => {
                setCreatedTask(null);
                setStep(1);
                setSelectedTemplates([]);
                setSelectedDataSource('');
              }}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
            >
              创建新任务
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchTaskCreator;
