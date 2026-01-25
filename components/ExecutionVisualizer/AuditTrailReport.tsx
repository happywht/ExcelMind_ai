/**
 * 审计轨迹报告组件
 * 用于展示 ExcelMind AI 的操作历史和审计轨迹
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import type { AuditTrailEntry, AuditTrailReport as AuditTrailReportType } from '../../types/auditTrailTypes';

export interface AuditTrailReportProps {
  report: AuditTrailReportType;
  onExport?: (format: 'txt' | 'json') => void;
  expanded?: boolean;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * 审计轨迹报告组件
 */
export const AuditTrailReport: React.FC<AuditTrailReportProps> = ({
  report,
  onExport,
  expanded = false,
  showDetails = true,
  compact = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  /**
   * 切换条目展开状态
   */
  const toggleEntry = (entryId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  /**
   * 获取状态颜色类
   */
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20';
      case 'warning':
        return 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20';
      case 'pending':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20';
      default:
        return 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/20';
    }
  };

  /**
   * 格式化持续时间
   */
  const formatDuration = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  /**
   * 格式化时间戳
   */
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  /**
   * 渲染详情项
   */
  const renderDetailItem = (key: string, value: any) => {
    if (key === 'code' && typeof value === 'string') {
      return (
        <div key={key} className="mt-2">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            {key}:
          </div>
          <pre className="text-xs bg-slate-900 text-slate-100 p-2 rounded overflow-x-auto">
            <code>{value}</code>
          </pre>
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div key={key} className="flex gap-2 text-xs">
          <span className="font-medium text-slate-600 dark:text-slate-400 min-w-[100px]">
            {key}:
          </span>
          <span className="text-slate-700 dark:text-slate-300 font-mono">
            {JSON.stringify(value, null, 2)}
          </span>
        </div>
      );
    }

    return (
      <div key={key} className="flex gap-2 text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-400 min-w-[100px]">
          {key}:
        </span>
        <span className="text-slate-700 dark:text-slate-300">
          {String(value)}
        </span>
      </div>
    );
  };

  /**
   * 渲染单个条目
   */
  const renderEntry = (entry: AuditTrailEntry) => {
    const isEntryExpanded = expandedEntries.has(entry.id);

    return (
      <div
        key={entry.id}
        className={`border rounded-lg mb-2 transition-all ${getStatusColorClass(entry.status)}`}
      >
        {/* 条目标题 */}
        <div
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/50 dark:hover:bg-slate-900/50 transition-colors"
          onClick={() => showDetails && toggleEntry(entry.id)}
        >
          {/* 步骤编号 */}
          {!compact && entry.stepNumber && (
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
              {entry.stepNumber}
            </div>
          )}

          {/* 状态图标 */}
          <div className="flex-shrink-0">
            {getStatusIcon(entry.status)}
          </div>

          {/* 时间戳 */}
          <div className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400 font-mono">
            {formatTimestamp(entry.timestamp)}
          </div>

          {/* 操作名称 */}
          <div className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            {entry.action}
          </div>

          {/* 展开按钮 */}
          {showDetails && (
            <div className="flex-shrink-0">
              {isEntryExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          )}
        </div>

        {/* 条目详情 */}
        {isEntryExpanded && showDetails && (
          <div className="px-3 pb-3 border-t border-slate-200/50 dark:border-slate-700/50 pt-3">
            <div className="space-y-2">
              {Object.entries(entry.details).map(([key, value]) =>
                renderDetailItem(key, value)
              )}
            </div>

            {/* 错误信息 */}
            {entry.errorMessage && (
              <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                <div className="font-medium mb-1">错误信息:</div>
                <div>{entry.errorMessage}</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /**
   * 计算成功率
   */
  const successRate = useMemo(() => {
    if (report.metadata.totalSteps === 0) return 100;
    return ((report.metadata.successfulSteps / report.metadata.totalSteps) * 100).toFixed(1);
  }, [report.metadata]);

  return (
    <div className={`audit-trail-report bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
      {/* 头部 */}
      <div className="p-4 bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950 dark:to-blue-950 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                审计轨迹报告
              </h3>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                生成于 {new Date(report.metadata.generatedAt).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 导出按钮 */}
            {onExport && (
              <>
                <button
                  onClick={() => onExport('txt')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                  title="导出为文本"
                >
                  <Download className="w-3.5 h-3.5" />
                  TXT
                </button>
                <button
                  onClick={() => onExport('json')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                  title="导出为 JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </button>
              </>
            )}

            {/* 展开/收起按钮 */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors"
              title={isExpanded ? '收起' : '展开'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {report.metadata.totalSteps}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">总步骤</div>
          </div>
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-2.5 border border-emerald-200 dark:border-emerald-800">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {report.metadata.successfulSteps}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400">成功</div>
          </div>
          <div className="bg-red-50/50 dark:bg-red-950/20 rounded-lg p-2.5 border border-red-200 dark:border-red-800">
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {report.metadata.failedSteps}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400">失败</div>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-2.5 border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {successRate}%
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">成功率</div>
          </div>
        </div>
      </div>

      {/* 内容 */}
      {isExpanded && (
        <div className="p-4">
          <div className="space-y-1">
            {report.entries.map(entry => renderEntry(entry))}
          </div>

          {/* 执行时间 */}
          {report.metadata.totalExecutionTime > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>总执行时间</span>
                <span className="font-mono font-medium">
                  {formatDuration(report.metadata.totalExecutionTime)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditTrailReport;
