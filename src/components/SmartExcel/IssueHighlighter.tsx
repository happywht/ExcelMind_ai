/**
 * 问题高亮组件
 * 在数据表格中高亮显示有问题的单元格
 */

import React, { useMemo } from 'react';
import { QualityIssue, RuleSeverity } from '../../types/qualityRule';

interface IssueHighlighterProps {
  data: any[];
  issues: QualityIssue[];
  highlightedCell?: { row: number; column: string } | null;
  onCellClick?: (row: number, column: string) => void;
  children: (props: {
    getCellStyle: (rowIndex: number, columnName: string) => React.CSSProperties;
    getCellClassName: (rowIndex: number, columnName: string) => string;
    handleCellClick: (rowIndex: number, columnName: string) => void;
  }) => React.ReactNode;
}

export const IssueHighlighter: React.FC<IssueHighlighterProps> = ({
  data,
  issues,
  highlightedCell,
  onCellClick,
  children
}) => {
  // 构建问题映射
  const issuesMap = useMemo(() => {
    const map = new Map<string, QualityIssue[]>();

    issues.forEach(issue => {
      const key = `${issue.row}_${issue.column}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(issue);
    });

    return map;
  }, [issues]);

  // 获取单元格样式
  const getCellStyle = (rowIndex: number, columnName: string): React.CSSProperties => {
    const row = rowIndex + 1; // 转换为1-based
    const key = `${row}_${columnName}`;
    const cellIssues = issuesMap.get(key);

    if (!cellIssues || cellIssues.length === 0) {
      return {};
    }

    // 根据最高严重级别返回样式
    const maxSeverity = cellIssues.reduce((max, issue) => {
      const severityOrder = ['P0', 'P1', 'P2', 'P3'];
      return Math.max(severityOrder.indexOf(issue.severity), severityOrder.indexOf(max));
    }, 'P3');

    const colors = {
      P0: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444' },
      P1: { bg: 'rgba(249, 115, 22, 0.2)', border: '#f97316' },
      P2: { bg: 'rgba(234, 179, 8, 0.2)', border: '#eab308' },
      P3: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6' }
    };

    const color = colors[maxSeverity as RuleSeverity];

    return {
      backgroundColor: color.bg,
      border: `2px solid ${color.border}`,
      cursor: 'pointer'
    };
  };

  // 获取单元格类名
  const getCellClassName = (rowIndex: number, columnName: string): string => {
    const row = rowIndex + 1;
    const key = `${row}_${columnName}`;
    const cellIssues = issuesMap.get(key);

    const baseClasses = 'transition-all hover:opacity-80';

    if (!cellIssues || cellIssues.length === 0) {
      return baseClasses;
    }

    // 如果是高亮单元格
    if (highlightedCell?.row === row && highlightedCell?.column === columnName) {
      return `${baseClasses} ring-2 ring-offset-1 ring-emerald-500`;
    }

    return baseClasses;
  };

  // 处理单元格点击
  const handleCellClick = (rowIndex: number, columnName: string) => {
    const row = rowIndex + 1;
    const key = `${row}_${columnName}`;
    const cellIssues = issuesMap.get(key);

    if (cellIssues && cellIssues.length > 0) {
      onCellClick?.(row, columnName);
    }
  };

  return <>{children({ getCellStyle, getCellClassName, handleCellClick })}</>;
};

/**
 * 问题提示组件
 * 显示单元格的问题详情
 */
interface IssueTooltipProps {
  issues: QualityIssue[];
  position: { x: number; y: number };
  onClose: () => void;
}

export const IssueTooltip: React.FC<IssueTooltipProps> = ({ issues, position, onClose }) => {
  const getSeverityColor = (severity: RuleSeverity): string => {
    switch (severity) {
      case 'P0': return 'bg-red-100 text-red-700 border-red-300';
      case 'P1': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'P2': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'P3': return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-3 max-w-sm"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-slate-800">
          发现 {issues.length} 个问题
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {issues.map((issue, idx) => (
          <div
            key={idx}
            className={`p-2 rounded border ${getSeverityColor(issue.severity)}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold">{issue.severity}</span>
              <span className="text-xs">行 {issue.row} - {issue.column}</span>
            </div>
            <div className="text-sm">{issue.description}</div>
            {issue.suggestion && (
              <div className="text-xs mt-1 opacity-80">
                💡 {issue.suggestion}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 问题统计徽章
 */
interface IssueBadgeProps {
  issues: QualityIssue[];
  onClick?: () => void;
}

export const IssueBadge: React.FC<IssueBadgeProps> = ({ issues, onClick }) => {
  const severityCount = issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {} as Record<RuleSeverity, number>);

  const total = issues.length;

  if (total === 0) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium hover:bg-red-200 transition-colors"
      title="点击查看问题"
    >
      <span>⚠️</span>
      <span>{total}</span>
    </button>
  );
};

export default IssueHighlighter;
