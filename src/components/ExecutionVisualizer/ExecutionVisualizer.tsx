/**
 * 实时执行可视化组件
 * 用于展示 AI 执行过程的实时状态
 */

import React, { useState, useEffect } from 'react';
import {
  Eye,
  Brain,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Code,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import type {
  ExecutionStep,
  ExecutionState,
  ExecutionVisualizerProps
} from '../../types/executionTypes';

/**
 * 获取步骤类型图标
 */
const getStepIcon = (type: string) => {
  switch (type) {
    case 'observe':
      return <Eye className="w-5 h-5" />;
    case 'think':
      return <Brain className="w-5 h-5" />;
    case 'act':
      return <PlayCircle className="w-5 h-5" />;
    case 'evaluate':
      return <CheckCircle2 className="w-5 h-5" />;
    case 'repair':
      return <AlertCircle className="w-5 h-5" />;
    case 'complete':
      return <CheckCircle2 className="w-5 h-5" />;
    default:
      return <Clock className="w-5 h-5" />;
  }
};

/**
 * 获取步骤类型颜色
 */
const getStepTypeColor = (type: string) => {
  switch (type) {
    case 'observe':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400';
    case 'think':
      return 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400';
    case 'act':
      return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400';
    case 'evaluate':
      return 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400';
    case 'repair':
      return 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400';
    case 'complete':
      return 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400';
    default:
      return 'text-slate-600 bg-slate-50 dark:bg-slate-950 dark:text-slate-400';
  }
};

/**
 * 获取状态图标
 */
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4 text-slate-400" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'skipped':
      return <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />;
    default:
      return <Clock className="w-4 h-4 text-slate-400" />;
  }
};

/**
 * 格式化持续时间
 */
const formatDuration = (ms?: number) => {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * 代码块组件
 */
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'python' }) => {
  return (
    <div className="mt-3 bg-slate-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs font-medium text-slate-300">{language}</span>
        <Code className="w-4 h-4 text-slate-400" />
      </div>
      <pre className="p-3 overflow-x-auto">
        <code className="text-xs text-slate-100 font-mono">{code}</code>
      </pre>
    </div>
  );
};

/**
 * 数据表格组件
 */
const DataTable: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
        无数据
      </div>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="mt-3 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {columns.map(col => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {data.slice(0, 10).map((row, idx) => (
              <tr key={idx} className="bg-white dark:bg-slate-900">
                {columns.map(col => (
                  <td
                    key={col}
                    className="px-3 py-2 text-slate-600 dark:text-slate-400"
                  >
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 10 && (
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
          显示前 10 行，共 {data.length} 行
        </div>
      )}
    </div>
  );
};

/**
 * 执行步骤卡片
 */
const StepCard: React.FC<{
  step: ExecutionStep;
  index: number;
  isCurrent: boolean;
  showCode: boolean;
  showResult: boolean;
  onToggleExpand: () => void;
  isExpanded: boolean;
}> = ({ step, index, isCurrent, showCode, showResult, onToggleExpand, isExpanded }) => {
  const typeColor = getStepTypeColor(step.type);

  return (
    <div
      className={`relative border rounded-lg transition-all ${
        isCurrent
          ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
          : step.status === 'error'
          ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10'
          : step.status === 'success'
          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
      }`}
    >
      {/* 连接线 */}
      {index > 0 && (
        <div className="absolute -top-3 left-6 w-0.5 h-3 bg-slate-300 dark:bg-slate-700" />
      )}

      <div
        className="p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-3">
          {/* 步骤图标 */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${typeColor}`}>
            {getStepIcon(step.type)}
          </div>

          {/* 步骤内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {step.title}
              </h4>
              {isCurrent && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                  进行中
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              {step.description}
            </p>

            {/* 元数据 */}
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
              {step.startTime && step.endTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(step.duration)}
                </span>
              )}
              {step.metadata && Object.keys(step.metadata).length > 0 && (
                <span className="text-slate-400">
                  {Object.keys(step.metadata).length} 项元数据
                </span>
              )}
            </div>
          </div>

          {/* 状态图标和展开按钮 */}
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">{getStatusIcon(step.status)}</div>
            {(step.code || step.result) && (
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700 pt-4">
          {/* 错误信息 */}
          {step.error && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                <AlertCircle className="w-4 h-4" />
                错误
              </div>
              <p className="text-xs text-red-600 dark:text-red-400">{step.error}</p>
            </div>
          )}

          {/* 代码 */}
          {showCode && step.code && (
            <CodeBlock code={step.code} language="python" />
          )}

          {/* 结果 */}
          {showResult && step.result && (
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                <FileText className="w-4 h-4" />
                执行结果
              </div>
              {Array.isArray(step.result) ? (
                <DataTable data={step.result} />
              ) : typeof step.result === 'object' ? (
                <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto">
                  <code className="text-slate-700 dark:text-slate-300">
                    {JSON.stringify(step.result, null, 2)}
                  </code>
                </pre>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {String(step.result)}
                </p>
              )}
            </div>
          )}

          {/* 元数据 */}
          {step.metadata && Object.keys(step.metadata).length > 0 && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                元数据
              </div>
              <div className="space-y-1">
                {Object.entries(step.metadata).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-400 min-w-[100px]">
                      {key}:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 主组件
 */
export const ExecutionVisualizer: React.FC<ExecutionVisualizerProps> = ({
  steps,
  state,
  showCode = true,
  showResult = true,
  compact = false,
  theme = 'light'
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // 自动展开当前运行的步骤
  useEffect(() => {
    if (state.currentStepId && state.isRunning) {
      setExpandedSteps(prev => new Set([...prev, state.currentStepId!]));
    }
  }, [state.currentStepId, state.isRunning]);

  /**
   * 切换步骤展开状态
   */
  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  /**
   * 获取进度条颜色
   */
  const getProgressColor = () => {
    if (state.isFailed) return 'bg-red-500';
    if (state.isCompleted) return 'bg-emerald-500';
    return 'bg-blue-500';
  };

  return (
    <div className={`execution-visualizer bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
      {/* 头部 */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950 dark:to-violet-950 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              执行可视化
            </h3>
          </div>

          {/* 状态标签 */}
          <div className="flex items-center gap-2">
            {state.isRunning && (
              <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" />
                运行中
              </span>
            )}
            {state.isCompleted && (
              <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                已完成
              </span>
            )}
            {state.isFailed && (
              <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" />
                失败
              </span>
            )}
          </div>
        </div>

        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>进度: {state.completedSteps}/{state.totalSteps}</span>
            <span>{state.percentage.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-300 ease-out`}
              style={{ width: `${state.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 步骤列表 */}
      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
        {steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            isCurrent={step.id === state.currentStepId}
            showCode={showCode}
            showResult={showResult}
            onToggleExpand={() => toggleStep(step.id)}
            isExpanded={expandedSteps.has(step.id)}
          />
        ))}

        {/* 空状态 */}
        {steps.length === 0 && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">等待执行开始...</p>
          </div>
        )}
      </div>

      {/* 底部信息 */}
      {state.totalDuration > 0 && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>总执行时间</span>
            <span className="font-mono font-medium">
              {formatDuration(state.totalDuration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionVisualizer;
