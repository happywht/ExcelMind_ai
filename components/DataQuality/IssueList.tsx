/**
 * 问题列表组件
 *
 * 显示检测到的数据质量问题
 *
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import IssueBadge from '../Shared/IssueBadge';
import { DataQualityIssue } from './types';

interface IssueListProps {
  issues: DataQualityIssue[];
  className?: string;
}

const IssueList: React.FC<IssueListProps> = ({ issues, className }) => {
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const toggleExpand = (issueId: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  };

  // 按严重程度分组
  const groupedIssues = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low'),
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'missing_value':
      case 'invalid_type':
        return <AlertCircle className="w-4 h-4" />;
      case 'duplicate':
      case 'outlier':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className || ''}`}>
      {/* 标题栏 */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">检测到的问题</h3>
          <span className="text-sm text-slate-500">共 {issues.length} 个问题</span>
        </div>
      </div>

      {/* 问题列表 */}
      <div className="divide-y divide-slate-100">
        {Object.entries(groupedIssues).map(([severity, severityIssues]) =>
          severityIssues.length > 0 ? (
            <div key={severity} className="p-6">
              {/* 严重程度标题 */}
              <div className="flex items-center gap-2 mb-4">
                <IssueBadge severity={severity as any} count={severityIssues.length} />
              </div>

              {/* 问题项 */}
              <div className="space-y-3">
                {severityIssues.map((issue) => {
                  const isExpanded = expandedIssues.has(issue.issueId);
                  return (
                    <div
                      key={issue.issueId}
                      className="border border-slate-200 rounded-lg overflow-hidden"
                    >
                      {/* 问题摘要 */}
                      <button
                        onClick={() => toggleExpand(issue.issueId)}
                        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="flex-shrink-0 mt-0.5 text-slate-500">
                          {getIssueIcon(issue.issueType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800">
                              {issue.description}
                            </p>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            影响: {issue.impact}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <IssueBadge severity={issue.severity} />
                        </div>
                      </button>

                      {/* 问题详情 */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                            {/* 影响位置 */}
                            <div>
                              <p className="text-xs text-slate-500 mb-1">影响位置</p>
                              <p className="text-slate-700">
                                {issue.location.column && `列: ${issue.location.column}`}
                                {issue.location.rows && ` 行: ${issue.location.rows.join(', ')}`}
                              </p>
                            </div>

                            {/* 影响比例 */}
                            <div>
                              <p className="text-xs text-slate-500 mb-1">影响比例</p>
                              <p className="text-slate-700">
                                {issue.affectedPercentage.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null
        )}
      </div>

      {/* 空状态 */}
      {issues.length === 0 && (
        <div className="px-6 py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            未检测到数据质量问题
          </h3>
          <p className="text-sm text-slate-500">
            您的数据质量很好，继续保持！
          </p>
        </div>
      )}
    </div>
  );
};

export default IssueList;
