/**
 * 日志面板组件 - 带分页和过滤功能
 *
 * 功能：
 * - 日志数量限制防止内存泄漏
 * - 按状态过滤日志（全部/成功/错误/警告/进行中）
 * - 分页加载更多日志
 * - 日志统计信息展示
 * - 清除所有日志功能
 *
 * @version 1.0.0
 */

import React, { useMemo, useState } from 'react';
import {
  Eye,
  Trash2,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { DocumentProcessingLog } from '../../types/documentTypes';

// 日志过滤类型
export type LogFilterType = 'all' | 'success' | 'error' | 'warning' | 'pending';

interface LogPanelProps {
  logs: DocumentProcessingLog[];
  logsPerPage: number;
  maxLogs: number;
  onClearLogs: () => void;
}

const LogPanel: React.FC<LogPanelProps> = ({
  logs,
  logsPerPage,
  maxLogs,
  onClearLogs
}) => {
  // 本地状态
  const [logPage, setLogPage] = useState(1);
  const [logFilter, setLogFilter] = useState<LogFilterType>('all');

  /**
   * 获取过滤后的日志列表 - 使用useMemo优化性能
   */
  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') {
      return logs;
    }
    return logs.filter(log => log.status === logFilter);
  }, [logs, logFilter]);

  /**
   * 获取当前页显示的日志列表 - 使用useMemo优化性能
   */
  const paginatedLogs = useMemo(() => {
    const startIndex = 0;
    const endIndex = logPage * logsPerPage;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, logPage, logsPerPage]);

  /**
   * 计算是否还有更多日志可以加载
   */
  const hasMoreLogs = useMemo(() => {
    return paginatedLogs.length < filteredLogs.length;
  }, [paginatedLogs.length, filteredLogs.length]);

  /**
   * 计算日志统计信息
   */
  const logStats = useMemo(() => {
    return {
      total: logs.length,
      success: logs.filter(l => l.status === 'success').length,
      error: logs.filter(l => l.status === 'error').length,
      warning: logs.filter(l => l.status === 'warning').length,
      pending: logs.filter(l => l.status === 'pending').length,
      filteredCount: filteredLogs.length,
      displayedCount: paginatedLogs.length
    };
  }, [logs, filteredLogs.length, paginatedLogs.length]);

  /**
   * 处理日志过滤变更
   */
  const handleFilterChange = (newFilter: LogFilterType) => {
    setLogFilter(newFilter);
    setLogPage(1); // 重置分页
  };

  /**
   * 处理加载更多日志
   */
  const handleLoadMore = () => {
    setLogPage(prev => prev + 1);
  };

  /**
   * 格式化时间
   */
  const formatTime = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  /**
   * 获取日志图标
   */
  const getLogIcon = (status: DocumentProcessingLog['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  /**
   * 获取日志样式
   */
  const getLogClassName = (status: DocumentProcessingLog['status']) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          处理日志
        </h3>
        <button
          onClick={onClearLogs}
          className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
          title="清除所有日志"
        >
          <Trash2 className="w-3 h-3" />
          清除
        </button>
      </div>

      {/* 日志统计信息 */}
      <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">
            总计: <span className="font-medium text-slate-800">{logStats.total}</span>
            {logFilter !== 'all' && (
              <span className="ml-2">
                (筛选: <span className="font-medium text-slate-800">{logStats.filteredCount}</span>)
              </span>
            )}
          </span>
          <span className="text-slate-500">
            显示: <span className="font-medium">{logStats.displayedCount}</span>/{logStats.filteredCount}
          </span>
        </div>
      </div>

      {/* 日志过滤按钮 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleFilterChange('all')}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            logFilter === 'all'
              ? 'bg-slate-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          全部 ({logStats.total})
        </button>
        <button
          onClick={() => handleFilterChange('success')}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            logFilter === 'success'
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
          }`}
        >
          成功 ({logStats.success})
        </button>
        <button
          onClick={() => handleFilterChange('error')}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            logFilter === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-red-50 text-red-600 hover:bg-red-100'
          }`}
        >
          错误 ({logStats.error})
        </button>
        <button
          onClick={() => handleFilterChange('warning')}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            logFilter === 'warning'
              ? 'bg-amber-500 text-white'
              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
          }`}
        >
          警告 ({logStats.warning})
        </button>
        <button
          onClick={() => handleFilterChange('pending')}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            logFilter === 'pending'
              ? 'bg-blue-500 text-white'
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          }`}
        >
          进行中 ({logStats.pending})
        </button>
      </div>

      {/* 日志列表 */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-slate-200">
            暂无处理日志
          </div>
        ) : paginatedLogs.length > 0 ? (
          paginatedLogs.map((log) => (
            <div
              key={log.id}
              className={`text-xs p-3 rounded-lg border transition-all ${getLogClassName(log.status)}`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">{getLogIcon(log.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="break-words">{log.message}</p>
                  {log.details?.duration && (
                    <p className="text-[10px] mt-1 opacity-75">
                      耗时: {formatTime(log.details.duration)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-500 text-center py-4">
            没有符合条件的日志
          </div>
        )}
      </div>

      {/* 加载更多按钮 */}
      {hasMoreLogs && (
        <button
          onClick={handleLoadMore}
          className="w-full text-xs bg-slate-100 text-slate-600 py-2 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
        >
          <ChevronDown className="w-3 h-3" />
          加载更多日志
        </button>
      )}

      {/* 日志数量限制提示 */}
      {logStats.total >= maxLogs && (
        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
          已显示最近 {maxLogs} 条日志，旧日志已被自动清理以优化性能
        </div>
      )}
    </div>
  );
};

export default LogPanel;
