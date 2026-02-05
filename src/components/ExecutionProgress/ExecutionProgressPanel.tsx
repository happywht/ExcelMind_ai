/**
 * 执行进度面板组件
 *
 * 核心功能：
 * - 显示四阶段执行进度（侦察→预审→分析→生成）
 * - 实时日志输出
 * - 阶段详情展示
 * - 错误和警告提示
 *
 * @module ExecutionProgress
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Terminal,
  FileText,
  Zap,
} from 'lucide-react';
import type {
  ExecutionContext,
  ExecutionStage,
  StageInfo,
  LogEntry,
  ExecutionProgressPanelProps,
} from '../VirtualWorkspace/types';
import {
  getStageDisplayName,
  getStageIcon,
  getStatusColor,
  getLogLevelColor,
  formatDuration,
  formatTimestamp,
} from '../VirtualWorkspace/utils';

/**
 * 阶段卡片组件
 */
const StageCard: React.FC<{
  stage: StageInfo;
  isExpanded: boolean;
  onToggle: () => void;
  onClick: () => void;
}> = ({ stage, isExpanded, onToggle, onClick }) => {
  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-slate-400" />,
    running: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
    completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    failed: <XCircle className="w-4 h-4 text-red-500" />,
    paused: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  }[stage.status];

  return (
    <div
      className={`border rounded-lg transition-all ${
        stage.status === 'running'
          ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'
          : stage.status === 'failed'
          ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10'
          : stage.status === 'completed'
          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
      }`}
    >
      {/* 阶段头部 */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          {/* 阶段图标 */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">
            {getStageIcon(stage.stage)}
          </div>

          {/* 阶段信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {stage.name}
              </h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(stage.status)}`}>
                {stage.status === 'pending' && '等待中'}
                {stage.status === 'running' && '进行中'}
                {stage.status === 'completed' && '已完成'}
                {stage.status === 'failed' && '失败'}
                {stage.status === 'paused' && '已暂停'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              {stage.description}
            </p>

            {/* 进度条 */}
            {stage.status === 'running' && (
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>进度</span>
                  <span>{stage.progress.toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${stage.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 持续时间 */}
            {stage.duration && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(stage.duration)}</span>
              </div>
            )}
          </div>

          {/* 状态图标和展开按钮 */}
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">{statusIcon}</div>
            {(stage.details && stage.details.length > 0 ||
              stage.errors && stage.errors.length > 0 ||
              stage.warnings && stage.warnings.length > 0) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="flex-shrink-0 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700 pt-4">
          {/* 详情列表 */}
          {stage.details && stage.details.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">详情</h5>
              <ul className="space-y-1">
                {stage.details.map((detail, index) => (
                  <li key={index} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 警告列表 */}
          {stage.warnings && stage.warnings.length > 0 && (
            <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h5 className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-2">警告</h5>
              <ul className="space-y-1">
                {stage.warnings.map((warning, index) => (
                  <li key={index} className="text-xs text-yellow-600 dark:text-yellow-400 flex items-start gap-2">
                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 错误列表 */}
          {stage.errors && stage.errors.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h5 className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">错误</h5>
              <ul className="space-y-1">
                {stage.errors.map((error, index) => (
                  <li key={index} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                    <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 日志条目组件
 */
const LogEntryComponent: React.FC<{
  log: LogEntry;
  onClick: () => void;
}> = ({ log, onClick }) => {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* 时间戳 */}
      <span className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400 font-mono">
        {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
      </span>

      {/* 级别标签 */}
      <span className={`flex-shrink-0 px-1.5 py-0.5 text-xs font-medium rounded ${getLogLevelColor(log.level)}`}>
        {log.level.toUpperCase()}
      </span>

      {/* 消息 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-700 dark:text-slate-300 break-words">
          {log.message}
        </p>
        {log.details && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {log.details}
          </p>
        )}
      </div>

      {/* 来源 */}
      {log.source && (
        <span className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500">
          {log.source}
        </span>
      )}
    </div>
  );
};

/**
 * 执行进度面板组件
 */
export const ExecutionProgressPanel: React.FC<ExecutionProgressPanelProps> = ({
  executionId,
  progress: progressProp,
  showLogs = true,
  autoScroll = true,
  maxLogEntries = 100,
  compact = false,
  onStageClick,
  onLogEntryClick,
}) => {
  // ===== 状态管理 =====

  const [context, setContext] = useState<ExecutionContext | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<ExecutionStage>>(new Set());
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // ===== 模拟数据（实际应从服务获取） =====

  useEffect(() => {
    // 如果直接传入了progress prop，使用它
    if (progressProp) {
      setContext(progressProp);
      return;
    }

    // 模拟加载执行上下文
    const mockContext: ExecutionContext = {
      executionId,
      stages: [
        {
          stage: 'reconnaissance' as ExecutionStage,
          name: '侦察阶段',
          description: '扫描文件结构，识别数据源',
          status: 'completed',
          startTime: Date.now() - 10000,
          endTime: Date.now() - 8000,
          duration: 2000,
          progress: 100,
          details: [
            '已扫描 3 个 Sheet',
            '发现 15 个数据点',
            '识别 2 个数据源',
          ],
        },
        {
          stage: 'pre_audit' as ExecutionStage,
          name: '预审阶段',
          description: '验证数据完整性和一致性',
          status: 'completed',
          startTime: Date.now() - 8000,
          endTime: Date.now() - 5000,
          duration: 3000,
          progress: 100,
          details: [
            '已验证 10 个引用',
            '检测到 2 个警告',
          ],
          warnings: [
            '发现重复的数据引用',
            '部分字段缺少验证规则',
          ],
        },
        {
          stage: 'analysis' as ExecutionStage,
          name: '分析阶段',
          description: 'AI 智能分析数据并生成处理方案',
          status: 'running',
          startTime: Date.now() - 5000,
          progress: 75,
          details: [
            'AI 正在分析数据...',
            '已识别 5 个关键模式',
            '生成处理方案中...',
          ],
        },
        {
          stage: 'generation' as ExecutionStage,
          name: '生成阶段',
          description: '根据分析结果生成输出文件',
          status: 'pending',
          progress: 0,
        },
      ],
      logs: [
        {
          id: '1',
          timestamp: Date.now() - 10000,
          level: 'info',
          message: '开始执行任务',
          source: 'System',
        },
        {
          id: '2',
          timestamp: Date.now() - 9500,
          level: 'info',
          message: '正在扫描文件结构...',
          source: 'Reconnaissance',
        },
        {
          id: '3',
          timestamp: Date.now() - 8000,
          level: 'success',
          message: '侦察阶段完成',
          details: '扫描到 3 个 Sheet，15 个数据点',
          source: 'Reconnaissance',
        },
        {
          id: '4',
          timestamp: Date.now() - 7500,
          level: 'info',
          message: '开始预审数据...',
          source: 'PreAudit',
        },
        {
          id: '5',
          timestamp: Date.now() - 5000,
          level: 'warning',
          message: '发现重复的数据引用',
          source: 'PreAudit',
        },
        {
          id: '6',
          timestamp: Date.now() - 4500,
          level: 'success',
          message: '预审阶段完成',
          details: '验证 10 个引用，发现 2 个警告',
          source: 'PreAudit',
        },
        {
          id: '7',
          timestamp: Date.now() - 4000,
          level: 'info',
          message: 'AI 正在分析数据...',
          source: 'Analysis',
        },
        {
          id: '8',
          timestamp: Date.now() - 2000,
          level: 'info',
          message: '已识别 5 个关键模式',
          source: 'Analysis',
        },
      ],
      currentStage: 'analysis' as ExecutionStage,
      totalProgress: 68.75,
      status: 'running',
      startTime: Date.now() - 10000,
    };

    setContext(mockContext);
  }, [executionId, progressProp]);

  // ===== 自动滚动 =====

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [context?.logs, autoScroll]);

  // ===== 阶段操作 =====

  const handleStageToggle = useCallback((stage: ExecutionStage) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  }, []);

  const handleStageClick = useCallback((stage: ExecutionStage) => {
    if (onStageClick) {
      onStageClick(stage);
    }
  }, [onStageClick]);

  // ===== 日志操作 =====

  const handleLogClick = useCallback((log: LogEntry) => {
    setSelectedLog(log);
    if (onLogEntryClick) {
      onLogEntryClick(log);
    }
  }, [onLogEntryClick]);

  // ===== 渲染 =====

  if (!context) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>加载执行进度...</span>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col bg-white dark:bg-slate-900 ${compact ? 'p-4' : 'p-6'}`}>
      {/* 头部 */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              执行进度
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${getStatusColor(context.status)}`}>
              {context.status === 'running' && '执行中'}
              {context.status === 'completed' && '已完成'}
              {context.status === 'failed' && '失败'}
              {context.status === 'paused' && '已暂停'}
            </span>
          </div>
        </div>

        {/* 总体进度条 */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
            <span>总进度</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {context.totalProgress.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                context.status === 'failed'
                  ? 'bg-red-500'
                  : context.status === 'completed'
                  ? 'bg-emerald-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${context.totalProgress}%` }}
            />
          </div>
        </div>

        {/* 执行时间 */}
        {context.startTime && (
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>开始时间: {formatTimestamp(context.startTime)}</span>
            {context.totalDuration && (
              <span>持续时间: {formatDuration(context.totalDuration)}</span>
            )}
          </div>
        )}
      </div>

      {/* 阶段列表 */}
      <div className="flex-shrink-0 mb-6 space-y-3">
        {context.stages.map(stage => (
          <StageCard
            key={stage.stage}
            stage={stage}
            isExpanded={expandedStages.has(stage.stage)}
            onToggle={() => handleStageToggle(stage.stage)}
            onClick={() => handleStageClick(stage.stage)}
          />
        ))}
      </div>

      {/* 日志区域 */}
      {showLogs && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                实时日志
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {context.logs.length} 条
            </span>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            {context.logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400 text-sm">
                暂无日志
              </div>
            ) : (
              <div className="space-y-1">
                {context.logs.slice(-maxLogEntries).map(log => (
                  <LogEntryComponent
                    key={log.id}
                    log={log}
                    onClick={() => handleLogClick(log)}
                  />
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 日志详情面板 */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-2xl mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  日志详情
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {formatTimestamp(selectedLog.timestamp)}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <span className="text-slate-400 text-2xl">&times;</span>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">级别</span>
                <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded ${getLogLevelColor(selectedLog.level)}`}>
                  {selectedLog.level.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">消息</span>
                <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                  {selectedLog.message}
                </p>
              </div>
              {selectedLog.details && (
                <div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">详情</span>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {selectedLog.details}
                  </p>
                </div>
              )}
              {selectedLog.source && (
                <div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">来源</span>
                  <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                    {selectedLog.source}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionProgressPanel;
