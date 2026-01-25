/**
 * SQL Preview Component
 * 主组件：SQL预览和编辑组件
 * 集成SQL编辑器、格式化、验证、执行、历史记录等功能
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, FileCode, History, Eye, EyeOff } from 'lucide-react';
import SQLEditor from './SQLEditor';
import { AIReasoningView } from './AIReasoningView';
import { ExecuteButton } from './ExecuteButton';
import { SQLHistory } from './SQLHistory';
import { SQLValidator } from './SQLValidator';
import { SQLToolbar } from './SQLToolbar';
import { SQLFormatter } from './SQLFormatter';
import type {
  SQLPreviewProps,
  SQLHistoryEntry,
  QueryResult,
  AIMetadata
} from './types';

export const SQLPreview: React.FC<SQLPreviewProps> = ({
  sql: initialSql = '',
  metadata,
  config = {},
  onExecute,
  onSave,
  onFormat,
  onSQLChange
}) => {
  // 解构配置，设置默认值
  const {
    editable = true,
    executable = true,
    formatOnLoad = false,
    showLineNumbers = true,
    theme = 'light',
    language = 'sql',
    minHeight = '300px',
    maxHeight = '600px',
    showAIReasoning = true,
    showHistory = true
  } = config;

  // 状态管理
  const [sql, setSQL] = useState(initialSql);
  const [formattedSQL, setFormattedSQL] = useState(initialSql);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<SQLHistoryEntry[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showAIReasoningPanel, setShowAIReasoningPanel] = useState(!!metadata?.reasoning);
  const [isSaved, setIsSaved] = useState(false);
  const [editorTheme, setEditorTheme] = useState<'vs-light' | 'vs-dark'>(theme === 'dark' ? 'vs-dark' : 'vs-light');

  // 编辑器引用
  const editorRef = useRef<any>(null);

  /**
   * 处理SQL变化
   */
  const handleSQLChange = useCallback((newSQL: string) => {
    setSQL(newSQL);
    setIsSaved(false);

    if (onSQLChange) {
      onSQLChange(newSQL);
    }
  }, [onSQLChange]);

  /**
   * 格式化SQL
   */
  const handleFormat = useCallback((sqlToFormat: string) => {
    const formatted = onFormat
      ? onFormat(sqlToFormat)
      : SQLFormatter.format(sqlToFormat, { language });

    setSQL(formatted);
    setFormattedSQL(formatted);

    // 如果编辑器存在，直接更新编辑器内容
    if (editorRef.current) {
      editorRef.current.setValue(formatted);
    }
  }, [onFormat, language]);

  /**
   * 保存SQL
   */
  const handleSave = useCallback((sqlToSave: string) => {
    if (onSave) {
      onSave(sqlToSave);
      setIsSaved(true);
    }
  }, [onSave]);

  /**
   * 执行SQL
   */
  const handleExecute = useCallback(async (sqlToExecute: string): Promise<QueryResult> => {
    if (!onExecute) {
      throw new Error('未提供执行函数');
    }

    setIsExecuting(true);

    try {
      const startTime = Date.now();
      const result = await onExecute(sqlToExecute);
      const executionTime = Date.now() - startTime;

      // 确保返回结果包含执行时间
      const finalResult = {
        ...result,
        executionTime: result.executionTime || executionTime
      };

      setLastResult(finalResult);

      // 添加到历史记录
      const historyEntry: SQLHistoryEntry = {
        id: Date.now().toString(),
        sql: sqlToExecute,
        timestamp: new Date(),
        executionTime: finalResult.executionTime,
        rowCount: finalResult.rowCount,
        success: finalResult.success,
        error: finalResult.error,
        description: metadata?.naturalQuery
      };

      setHistory(prev => [historyEntry, ...prev].slice(0, 50)); // 保留最近50条

      return finalResult;
    } finally {
      setIsExecuting(false);
    }
  }, [onExecute, metadata]);

  /**
   * 从历史记录选择
   */
  const handleHistorySelect = useCallback((entry: SQLHistoryEntry) => {
    setSQL(entry.sql);
    if (onSQLChange) {
      onSQLChange(entry.sql);
    }
  }, [onSQLChange]);

  /**
   * 从历史记录删除
   */
  const handleHistoryDelete = useCallback((id: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== id));
  }, []);

  /**
   * 清空历史记录
   */
  const handleHistoryClear = useCallback(() => {
    setHistory([]);
  }, []);

  /**
   * 编辑器挂载回调
   */
  const handleEditorDidMount = useCallback((editor: any) => {
    editorRef.current = editor;

    // 设置自动格式化
    if (formatOnLoad && sql) {
      handleFormat(sql);
    }
  }, [formatOnLoad, sql, handleFormat]);

  /**
   * 初始化SQL
   */
  useEffect(() => {
    if (initialSql && initialSql !== sql) {
      setSQL(initialSql);

      if (formatOnLoad) {
        handleFormat(initialSql);
      }
    }
  }, [initialSql, formatOnLoad, handleFormat]);

  /**
   * 监听主题变化
   */
  useEffect(() => {
    setEditorTheme(theme === 'dark' ? 'vs-dark' : 'vs-light');
  }, [theme]);

  /**
   * 监听键盘快捷键
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter: 执行
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && executable && onExecute) {
        e.preventDefault();
        handleExecute(sql);
      }

      // Ctrl/Cmd + S: 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave(sql);
      }

      // Ctrl/Cmd + Shift + F: 格式化
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        handleFormat(sql);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sql, executable, onExecute, handleSave, handleFormat]);

  /**
   * 计算复杂度
   */
  const complexity = SQLFormatter.calculateComplexity(sql);

  /**
   * 获取复杂度标签颜色
   */
  const getComplexityColor = () => {
    if (complexity < 30) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950';
    if (complexity < 60) return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
    if (complexity < 80) return 'text-amber-600 bg-amber-50 dark:bg-amber-950';
    return 'text-red-600 bg-red-50 dark:bg-red-950';
  };

  return (
    <div className="sql-preview-component flex flex-col gap-4">
      {/* 自然语言查询显示 */}
      {metadata?.naturalQuery && (
        <div className="p-3 bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950 dark:to-blue-950 rounded-lg border border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            <FileCode className="w-3.5 h-3.5" />
            自然语言查询
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
            "{metadata.naturalQuery}"
          </p>
        </div>
      )}

      {/* 工具栏 */}
      <SQLToolbar
        sql={sql}
        onFormat={editable ? handleFormat : undefined}
        onSave={editable ? handleSave : undefined}
        isSaved={isSaved}
        showFormat={editable}
        showSave={editable}
        showCopy={true}
        showExport={true}
        disabled={!editable}
      />

      {/* SQL编辑器 */}
      <div className="sql-editor-container bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* 编辑器头部 */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">SQL 编辑器</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getComplexityColor()}`}>
              复杂度: {complexity}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* 切换AI推理面板 */}
            {showAIReasoning && metadata?.reasoning && (
              <button
                onClick={() => setShowAIReasoningPanel(!showAIReasoningPanel)}
                className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950 rounded transition-colors"
                title={showAIReasoningPanel ? '隐藏AI推理' : '显示AI推理'}
              >
                {showAIReasoningPanel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
            {/* 切换历史记录面板 */}
            {showHistory && (
              <button
                onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors relative"
                title={showHistoryPanel ? '隐藏历史记录' : '显示历史记录'}
              >
                <History className="w-4 h-4" />
                {history.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {history.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 编辑器主体 */}
        <div className="relative">
          <SQLEditor
            value={sql}
            onChange={handleSQLChange}
            readOnly={!editable}
            language={language}
            theme={editorTheme}
            height={minHeight}
            options={{
              readOnly: !editable,
              lineNumbers: showLineNumbers ? 'on' : 'off',
            }}
            onEditorDidMount={handleEditorDidMount}
          />

          {/* 加载遮罩 */}
          {isExecuting && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  正在执行SQL查询...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 编辑器底部 */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <SQLValidator
            sql={sql}
            realTime={true}
            validationDelay={500}
          />
          {executable && onExecute && (
            <ExecuteButton
              sql={sql}
              onExecute={handleExecute}
              loading={isExecuting}
            />
          )}
        </div>
      </div>

      {/* AI推理面板 */}
      {showAIReasoningPanel && metadata && (
        <AIReasoningView
          reasoning={metadata.reasoning || ''}
          confidence={metadata.confidence || 0}
          naturalQuery={metadata.naturalQuery || ''}
          suggestions={metadata.suggestions}
          defaultExpanded={true}
        />
      )}

      {/* 历史记录面板 */}
      {showHistoryPanel && showHistory && (
        <SQLHistory
          history={history}
          onSelect={handleHistorySelect}
          onDelete={handleHistoryDelete}
          onClear={handleHistoryClear}
          maxDisplayItems={10}
        />
      )}

      {/* 执行结果 */}
      {lastResult && (
        <div className={`p-4 rounded-lg border ${
          lastResult.success
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
            : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {lastResult.success ? (
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                执行成功
              </span>
            ) : (
              <span className="text-sm font-bold text-red-700 dark:text-red-300">
                执行失败
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {lastResult.executionTime}ms
            </span>
          </div>
          {lastResult.success && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              返回 {lastResult.rowCount} 行数据
            </p>
          )}
          {!lastResult.success && lastResult.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {lastResult.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SQLPreview;
