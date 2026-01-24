/**
 * 错误自愈 UI 组件
 * 用于展示 AI 自动修复错误的进度和状态
 */

import React from 'react';
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

export interface ErrorSelfHealingProps {
  retryCount: number;
  maxRetries: number;
  currentError?: string;
  isRetrying: boolean;
  lastError?: string;
  repairStrategy?: string;
  onManualRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * 错误自愈 UI 组件
 */
export const ErrorSelfHealingUI: React.FC<ErrorSelfHealingProps> = ({
  retryCount,
  maxRetries,
  currentError,
  isRetrying,
  lastError,
  repairStrategy,
  onManualRetry,
  onCancel,
  className = ''
}) => {
  /**
   * 计算进度百分比
   */
  const progressPercentage = (retryCount / maxRetries) * 100;

  /**
   * 获取进度颜色
   */
  const getProgressColor = () => {
    if (retryCount === 0) return 'bg-amber-500';
    if (retryCount < maxRetries) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  /**
   * 获取状态信息
   */
  const getStatusInfo = () => {
    if (retryCount >= maxRetries) {
      return {
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        title: '修复失败',
        description: '已达到最大重试次数，请检查错误信息或尝试手动修复',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-700 dark:text-red-300'
      };
    }

    if (isRetrying) {
      return {
        icon: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
        title: '正在自动修复',
        description: `AI 正在分析并修复问题 (${retryCount}/${maxRetries})`,
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        textColor: 'text-blue-700 dark:text-blue-300'
      };
    }

    if (retryCount > 0) {
      return {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        title: '修复成功',
        description: `问题已解决，继续执行任务`,
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        textColor: 'text-emerald-700 dark:text-emerald-300'
      };
    }

    return {
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      title: '检测到问题',
      description: '正在准备自动修复...',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      textColor: 'text-amber-700 dark:text-amber-300'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`error-self-healing-ui rounded-xl border overflow-hidden ${statusInfo.bgColor} ${statusInfo.borderColor} ${className}`}>
      {/* 头部状态 */}
      <div className="p-4 border-b border-current/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {statusInfo.icon}
          </div>
          <div className="flex-1">
            <h4 className={`text-sm font-bold ${statusInfo.textColor} mb-1`}>
              {statusInfo.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {statusInfo.description}
            </p>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      {retryCount < maxRetries && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              修复进度
            </span>
            <span className="font-medium">
              {retryCount}/{maxRetries}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-500 ease-out`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* 修复策略 */}
      {repairStrategy && (
        <div className="px-4 pb-3">
          <div className="flex items-start gap-2 p-3 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                AI 修复策略
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {repairStrategy}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 错误详情 */}
      {(currentError || lastError) && (
        <div className="px-4 pb-3">
          <div className="p-3 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              <XCircle className="w-4 h-4 text-red-500" />
              错误信息
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 font-mono bg-red-50/50 dark:bg-red-900/20 p-2 rounded">
              {currentError || lastError}
            </p>
          </div>
        </div>
      )}

      {/* 动画提示 */}
      {isRetrying && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <div className="flex-1">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                AI 正在分析错误原因并生成修复方案...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50 border-t border-current/20">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {retryCount >= maxRetries ? (
              <span>已达到最大重试次数</span>
            ) : (
              <span>自动重试中，无需手动操作</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 取消按钮 */}
            {isRetrying && onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                取消重试
              </button>
            )}

            {/* 手动重试按钮 */}
            {retryCount >= maxRetries && onManualRetry && (
              <button
                onClick={onManualRetry}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                手动重试
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 修复历史 */}
      {retryCount > 0 && (
        <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="font-medium">修复历史</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {Array.from({ length: retryCount }, (_, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      i < retryCount ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`} />
                    <span className="text-xs">尝试 {i + 1}</span>
                  </div>
                  {i < retryCount - 1 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 紧凑版本（用于内联显示）
 */
export const ErrorSelfHealingCompact: React.FC<Omit<ErrorSelfHealingProps, 'onManualRetry' | 'onCancel'>> = ({
  retryCount,
  maxRetries,
  isRetrying
}) => {
  const progressPercentage = (retryCount / maxRetries) * 100;

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
      {isRetrying ? (
        <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
      ) : (
        <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
          <span>自动修复</span>
          <span className="font-medium">{retryCount}/{maxRetries}</span>
        </div>
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ErrorSelfHealingUI;
