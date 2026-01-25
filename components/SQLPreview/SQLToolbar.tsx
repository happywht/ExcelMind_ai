/**
 * SQL Toolbar Component
 * SQL工具栏组件，包含格式化、保存等操作按钮
 */

import React from 'react';
import { Code, Save, FileDown, Copy, Check, Undo2, Redo2, Sparkles } from 'lucide-react';
import type { FormatButtonProps, SaveButtonProps } from './types';

/**
 * 格式化按钮
 */
export const FormatButton: React.FC<FormatButtonProps> = ({
  sql,
  onFormat,
  options,
  disabled = false
}) => {
  const handleClick = () => {
    onFormat(sql);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || !sql.trim()}
      className="toolbar-btn group relative px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 disabled:text-slate-300 dark:disabled:text-slate-700 disabled:cursor-not-allowed disabled:hover:bg-transparent rounded-lg transition-all flex items-center gap-2"
      title="格式化SQL (Ctrl+Shift+F)"
    >
      <Code className="w-4 h-4" />
      <span>格式化</span>
    </button>
  );
};

/**
 * 保存按钮
 */
export const SaveButton: React.FC<SaveButtonProps> = ({
  sql,
  onSave,
  disabled = false,
  isSaved = false
}) => {
  const handleClick = () => {
    onSave(sql);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || !sql.trim()}
      className="toolbar-btn group px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 disabled:text-slate-300 dark:disabled:text-slate-700 disabled:cursor-not-allowed disabled:hover:bg-transparent rounded-lg transition-all flex items-center gap-2"
      title="保存SQL (Ctrl+S)"
    >
      {isSaved ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <Save className="w-4 h-4" />
      )}
      <span>{isSaved ? '已保存' : '保存'}</span>
    </button>
  );
};

/**
 * 复制按钮
 */
interface CopyButtonProps {
  sql: string;
  disabled?: boolean;
  onCopy?: (sql: string) => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  sql,
  disabled = false,
  onCopy
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);

      if (onCopy) {
        onCopy(sql);
      }

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || !sql.trim()}
      className="toolbar-btn group px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 disabled:text-slate-300 dark:disabled:text-slate-700 disabled:cursor-not-allowed disabled:hover:bg-transparent rounded-lg transition-all flex items-center gap-2"
      title="复制SQL"
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
      <span>{copied ? '已复制' : '复制'}</span>
    </button>
  );
};

/**
 * 导出按钮
 */
interface ExportButtonProps {
  sql: string;
  filename?: string;
  disabled?: boolean;
  onExport?: (sql: string) => void;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  sql,
  filename = 'query.sql',
  disabled = false,
  onExport
}) => {
  const handleClick = () => {
    // 创建下载链接
    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (onExport) {
      onExport(sql);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || !sql.trim()}
      className="toolbar-btn group px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 disabled:text-slate-300 dark:disabled:text-slate-700 disabled:cursor-not-allowed disabled:hover:bg-transparent rounded-lg transition-all flex items-center gap-2"
      title="导出为文件"
    >
      <FileDown className="w-4 h-4" />
      <span>导出</span>
    </button>
  );
};

/**
 * 撤销/重做按钮组
 */
interface UndoRedoButtonsProps {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const UndoRedoButtons: React.FC<UndoRedoButtonsProps> = ({
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo
}) => {
  return (
    <div className="flex items-center gap-1 border-l border-r border-slate-200 dark:border-slate-700 px-2">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:text-slate-300 dark:disabled:text-slate-700 disabled:cursor-not-allowed disabled:hover:bg-transparent rounded transition-all"
        title="撤销 (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:text-slate-300 dark:disabled:text-slate-700 disabled:cursor-not-allowed disabled:hover:bg-transparent rounded transition-all"
        title="重做 (Ctrl+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * AI优化按钮
 */
interface AIOptimizeButtonProps {
  sql: string;
  onOptimize: (sql: string) => void;
  disabled?: boolean;
  isOptimizing?: boolean;
}

export const AIOptimizeButton: React.FC<AIOptimizeButtonProps> = ({
  sql,
  onOptimize,
  disabled = false,
  isOptimizing = false
}) => {
  return (
    <button
      onClick={() => onOptimize(sql)}
      disabled={disabled || !sql.trim() || isOptimizing}
      className="toolbar-btn group px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950 disabled:text-slate-300 dark:disabled:text-slate-700 disabled:cursor-not-allowed disabled:hover:bg-transparent rounded-lg transition-all flex items-center gap-2"
      title="AI优化SQL"
    >
      <Sparkles className={`w-4 h-4 ${isOptimizing ? 'animate-pulse' : ''}`} />
      <span>{isOptimizing ? '优化中...' : 'AI优化'}</span>
    </button>
  );
};

/**
 * 主工具栏组件
 */
interface SQLToolbarProps {
  sql: string;
  onFormat?: (sql: string) => void;
  onSave?: (sql: string) => void;
  onCopy?: (sql: string) => void;
  onExport?: (sql: string) => void;
  onOptimize?: (sql: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaved?: boolean;
  isOptimizing?: boolean;
  showFormat?: boolean;
  showSave?: boolean;
  showCopy?: boolean;
  showExport?: boolean;
  showOptimize?: boolean;
  showUndoRedo?: boolean;
  disabled?: boolean;
  exportFilename?: string;
}

export const SQLToolbar: React.FC<SQLToolbarProps> = ({
  sql,
  onFormat,
  onSave,
  onCopy,
  onExport,
  onOptimize,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isSaved = false,
  isOptimizing = false,
  showFormat = true,
  showSave = true,
  showCopy = true,
  showExport = true,
  showOptimize = true,
  showUndoRedo = true,
  disabled = false,
  exportFilename = 'query.sql'
}) => {
  return (
    <div className="sql-toolbar flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex-wrap">
      {showFormat && onFormat && (
        <FormatButton sql={sql} onFormat={onFormat} disabled={disabled} />
      )}

      {showUndoRedo && (onUndo || onRedo) && (
        <UndoRedoButtons
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
        />
      )}

      {showSave && onSave && (
        <SaveButton sql={sql} onSave={onSave} isSaved={isSaved} disabled={disabled} />
      )}

      {showCopy && (
        <CopyButton sql={sql} onCopy={onCopy} disabled={disabled} />
      )}

      {showExport && (
        <ExportButton sql={sql} filename={exportFilename} onExport={onExport} disabled={disabled} />
      )}

      {showOptimize && onOptimize && (
        <AIOptimizeButton
          sql={sql}
          onOptimize={onOptimize}
          isOptimizing={isOptimizing}
          disabled={disabled}
        />
      )}

      {/* 分隔线 */}
      <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
    </div>
  );
};

export default SQLToolbar;
