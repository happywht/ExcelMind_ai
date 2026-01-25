/**
 * Execute Button Component
 * SQL执行按钮组件，支持多种状态显示
 */

import React, { useState, useEffect } from 'react';
import { Play, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { ExecuteButtonProps, ExecuteButtonState } from './types';

export const ExecuteButton: React.FC<ExecuteButtonProps> = ({
  sql,
  onExecute,
  disabled = false,
  loading: externalLoading = false,
  label = '执行',
  successResetDelay = 3000
}) => {
  const [state, setState] = useState<ExecuteButtonState>('idle');
  const [internalLoading, setInternalLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string>('');

  const isLoading = externalLoading || internalLoading;

  /**
   * 执行SQL
   */
  const handleExecute = async () => {
    if (!sql.trim() || isLoading) return;

    setState('loading');
    setInternalLoading(true);

    try {
      const result = await onExecute(sql);

      if (result.success) {
        setState('success');
        setResultMessage(`${result.rowCount} 行 (${result.executionTime}ms)`);

        // 自动重置状态
        setTimeout(() => {
          setState('ready');
          setResultMessage('');
        }, successResetDelay);
      } else {
        setState('error');
        setResultMessage(result.error || '执行失败');
      }
    } catch (error: any) {
      setState('error');
      setResultMessage(error.message || '未知错误');
    } finally {
      setInternalLoading(false);

      // 错误状态延迟重置
      if (state === 'error') {
        setTimeout(() => {
          setState('idle');
          setResultMessage('');
        }, 5000);
      }
    }
  };

  /**
   * 检查SQL是否有效
   */
  useEffect(() => {
    if (sql.trim() && !disabled) {
      setState('ready');
    } else {
      setState('idle');
    }
  }, [sql, disabled]);

  /**
   * 获取按钮样式
   */
  const getButtonStyles = (): string => {
    const baseStyles = 'px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 border';

    switch (state) {
      case 'idle':
        return `${baseStyles} bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed`;

      case 'ready':
        return `${baseStyles} bg-blue-500 hover:bg-blue-600 text-white border-blue-600 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0`;

      case 'loading':
        return `${baseStyles} bg-blue-500 text-white border-blue-600 cursor-wait`;

      case 'success':
        return `${baseStyles} bg-emerald-500 text-white border-emerald-600 shadow-sm`;

      case 'error':
        return `${baseStyles} bg-red-500 hover:bg-red-600 text-white border-red-600 shadow-sm`;

      default:
        return baseStyles;
    }
  };

  /**
   * 获取按钮图标
   */
  const getButtonIcon = () => {
    switch (state) {
      case 'idle':
        return <Play className="w-4 h-4" />;

      case 'ready':
        return <Play className="w-4 h-4" />;

      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin" />;

      case 'success':
        return <CheckCircle className="w-4 h-4" />;

      case 'error':
        return <XCircle className="w-4 h-4" />;

      default:
        return <Play className="w-4 h-4" />;
    }
  };

  /**
   * 获取按钮文本
   */
  const getButtonText = () => {
    switch (state) {
      case 'idle':
        return '执行';

      case 'ready':
        return label;

      case 'loading':
        return '执行中...';

      case 'success':
        return '执行成功';

      case 'error':
        return '执行失败';

      default:
        return label;
    }
  };

  /**
   * 获取工具提示
   */
  const getTooltip = () => {
    if (disabled) {
      return '请输入有效的SQL语句';
    }

    switch (state) {
      case 'idle':
        return '请输入SQL语句';

      case 'ready':
        return 'Ctrl/Cmd + Enter 执行';

      case 'loading':
        return '正在执行...';

      case 'success':
        return resultMessage;

      case 'error':
        return resultMessage;

      default:
        return '';
    }
  };

  const isButtonDisabled = disabled || state === 'idle' || isLoading;

  return (
    <div className="execute-button-wrapper">
      <button
        onClick={handleExecute}
        disabled={isButtonDisabled}
        className={getButtonStyles()}
        title={getTooltip()}
      >
        {getButtonIcon()}
        <span>{getButtonText()}</span>
      </button>

      {/* 结果消息 */}
      {resultMessage && (state === 'success' || state === 'error') && (
        <div className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${
          state === 'success' ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {state === 'error' && <AlertTriangle className="w-3 h-3" />}
          {resultMessage}
        </div>
      )}

      {/* 快捷键提示 */}
      {state === 'ready' && (
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">
            Enter
          </kbd>
        </div>
      )}
    </div>
  );
};

export default ExecuteButton;
