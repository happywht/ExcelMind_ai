/**
 * SQL History Component
 * SQL执行历史记录组件
 */

import React, { useState } from 'react';
import { Clock, Trash2, CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp, Search } from 'lucide-react';
import type { SQLHistoryProps, SQLHistoryEntry } from './types';

export const SQLHistory: React.FC<SQLHistoryProps> = ({
  history,
  onSelect,
  onDelete,
  onClear,
  maxDisplayItems = 10
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * 切换展开状态
   */
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /**
   * 格式化时间
   */
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return new Date(date).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * 格式化执行时间
   */
  const formatExecutionTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  /**
   * 截断SQL用于显示
   */
  const truncateSQL = (sql: string, maxLength = 100): string => {
    if (sql.length <= maxLength) return sql;
    return sql.substring(0, maxLength) + '...';
  };

  /**
   * 过滤历史记录
   */
  const filteredHistory = history
    .filter(entry => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        entry.sql.toLowerCase().includes(query) ||
        (entry.description && entry.description.toLowerCase().includes(query))
      );
    })
    .slice(0, maxDisplayItems);

  /**
   * 删除条目
   */
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  };

  /**
   * 选择历史记录
   */
  const handleSelect = (entry: SQLHistoryEntry) => {
    if (onSelect) {
      onSelect(entry);
    }
  };

  /**
   * 清空历史
   */
  const handleClear = () => {
    if (onClear && confirm('确定要清空所有历史记录吗？')) {
      onClear();
    }
  };

  return (
    <div className="sql-history-component bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            执行历史 ({history.length})
          </h3>
        </div>
        {onClear && history.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            清空
          </button>
        )}
      </div>

      {/* Search */}
      {history.length > 5 && (
        <div className="p-3 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索历史记录..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>
      )}

      {/* History List */}
      <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-600">
            {searchQuery ? '未找到匹配的历史记录' : '暂无执行历史'}
          </div>
        ) : (
          filteredHistory.map((entry) => {
            const isExpanded = expandedItems.has(entry.id);
            return (
              <div
                key={entry.id}
                className="group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {/* Main Row */}
                <div
                  className="flex items-start gap-3 p-3"
                  onClick={() => handleSelect(entry)}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {entry.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Description */}
                    {entry.description && (
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {entry.description}
                      </p>
                    )}

                    {/* SQL Preview */}
                    <div className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded mb-1.5">
                      {isExpanded ? entry.sql : truncateSQL(entry.sql)}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(entry.timestamp)}
                      </span>
                      {entry.success && (
                        <>
                          <span>{entry.rowCount} 行</span>
                          <span>{formatExecutionTime(entry.executionTime)}</span>
                        </>
                      )}
                    </div>

                    {/* Error Message */}
                    {!entry.success && entry.error && isExpanded && (
                      <div className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-950 px-2 py-1 rounded">
                        {entry.error}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(entry.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      title={isExpanded ? '收起' : '展开'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(entry);
                      }}
                      className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors"
                      title="重新执行"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    {onDelete && (
                      <button
                        onClick={(e) => handleDelete(entry.id, e)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* More Items Indicator */}
      {history.length > maxDisplayItems && (
        <div className="p-2 text-center text-xs text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          显示最近 {maxDisplayItems} 条，共 {history.length} 条记录
        </div>
      )}
    </div>
  );
};

export default SQLHistory;
