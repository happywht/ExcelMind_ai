/**
 * 质量检查结果面板
 * 展示规则执行结果、问题列表、修复建议
 */

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Eye
} from 'lucide-react';
import { RuleExecutionResult, BatchExecutionResult, QualityIssue, RuleSeverity } from '../../types/qualityRule';

interface QualityResultPanelProps {
  results: RuleExecutionResult[];
  batchResult?: BatchExecutionResult;
  data: any[];
  onIssueClick?: (row: number, column: string) => void;
  onClose?: () => void;
}

export const QualityResultPanel: React.FC<QualityResultPanelProps> = ({
  results,
  batchResult,
  data,
  onIssueClick,
  onClose
}) => {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [selectedSeverity, setSelectedSeverity] = useState<RuleSeverity | 'all'>('all');
  const [showSuggestions, setShowSuggestions] = useState(true);

  // 统计信息
  const stats = {
    total: results.length,
    passed: results.filter(r => r.pass).length,
    failed: results.filter(r => !r.pass).length,
    totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
    totalIssueRows: results.reduce((sum, r) => sum + r.issueRows, 0)
  };

  // 获取所有问题
  const allIssues: Array<{ issue: QualityIssue; ruleName: string }> = [];
  results.forEach(result => {
    result.issues.forEach(issue => {
      allIssues.push({ issue, ruleName: result.ruleName });
    });
  });

  // 筛选问题
  const filteredIssues = selectedSeverity === 'all'
    ? allIssues
    : allIssues.filter(({ issue }) => issue.severity === selectedSeverity);

  // 按严重级别分组
  const issuesBySeverity: Record<RuleSeverity, typeof filteredIssues> = {
    P0: [],
    P1: [],
    P2: [],
    P3: []
  };
  filteredIssues.forEach(({ issue, ruleName }) => {
    issuesBySeverity[issue.severity].push({ issue, ruleName });
  });

  const toggleRule = (ruleId: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const getSeverityColor = (severity: RuleSeverity): string => {
    switch (severity) {
      case 'P0': return 'text-red-600 bg-red-50 border-red-200';
      case 'P1': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'P2': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'P3': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getSeverityIcon = (severity: RuleSeverity) => {
    switch (severity) {
      case 'P0': return <XCircle className="w-4 h-4" />;
      case 'P1': return <AlertTriangle className="w-4 h-4" />;
      case 'P2': return <Info className="w-4 h-4" />;
      case 'P3': return <Info className="w-4 h-4" />;
    }
  };

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: batchResult?.overallSummary || '',
      statistics: stats,
      results: results.map(r => ({
        ruleName: r.ruleName,
        pass: r.pass,
        summary: r.summary,
        issueCount: r.issues.length,
        issues: r.issues
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quality-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-800">检查结果</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={exportReport}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="导出报告"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">通过</span>
            </div>
            <div className="text-2xl font-bold text-emerald-800">{stats.passed}</div>
          </div>

          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-red-700 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">失败</span>
            </div>
            <div className="text-2xl font-bold text-red-800">{stats.failed}</div>
          </div>

          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 text-orange-700 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-semibold">问题数</span>
            </div>
            <div className="text-2xl font-bold text-orange-800">{stats.totalIssues}</div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-semibold">问题行</span>
            </div>
            <div className="text-2xl font-bold text-blue-800">{stats.totalIssueRows}</div>
          </div>
        </div>

        {/* 总体摘要 */}
        {batchResult?.overallSummary && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-700 whitespace-pre-line">{batchResult.overallSummary}</p>
          </div>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">筛选：</span>
          <button
            onClick={() => setSelectedSeverity('all')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              selectedSeverity === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部 ({stats.totalIssues})
          </button>
          <button
            onClick={() => setSelectedSeverity('P0')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              selectedSeverity === 'P0'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            P0 ({issuesBySeverity.P0.length})
          </button>
          <button
            onClick={() => setSelectedSeverity('P1')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              selectedSeverity === 'P1'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
            }`}
          >
            P1 ({issuesBySeverity.P1.length})
          </button>
          <button
            onClick={() => setSelectedSeverity('P2')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              selectedSeverity === 'P2'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
            }`}
          >
            P2 ({issuesBySeverity.P2.length})
          </button>
          <button
            onClick={() => setSelectedSeverity('P3')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              selectedSeverity === 'P3'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            P3 ({issuesBySeverity.P3.length})
          </button>
        </div>

        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-sm text-slate-600 hover:text-slate-800"
        >
          {showSuggestions ? '隐藏' : '显示'}建议
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {/* 规则结果 */}
        <div className="p-4 space-y-3">
          {results.map(result => (
            <div
              key={result.ruleId}
              className={`border rounded-lg overflow-hidden ${
                result.pass
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              {/* 规则头部 */}
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-opacity-80"
                onClick={() => toggleRule(result.ruleId)}
              >
                <div className="flex items-center gap-3">
                  {result.pass ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <div className="font-semibold text-slate-800">{result.ruleName}</div>
                    <div className="text-xs text-slate-600">{result.summary}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500">
                    {result.issues.length} 个问题 • {result.executionTime}ms
                  </div>
                  {expandedRules.has(result.ruleId) ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* 问题列表 */}
              {expandedRules.has(result.ruleId) && result.issues.length > 0 && (
                <div className="border-t border-slate-200 p-3 bg-white">
                  <div className="space-y-2">
                    {result.issues.slice(0, 20).map((issue, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded border text-sm cursor-pointer hover:bg-slate-50 ${getSeverityColor(issue.severity)}`}
                        onClick={() => onIssueClick?.(issue.row, issue.column)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(issue.severity)}
                            <span className="font-medium">行 {issue.row} - {issue.column}</span>
                          </div>
                          {onIssueClick && (
                            <Eye className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                        <div className="text-slate-700 mb-1">{issue.description}</div>
                        {issue.suggestion && (
                          <div className="text-xs text-slate-500 mt-1">
                            💡 {issue.suggestion}
                          </div>
                        )}
                      </div>
                    ))}
                    {result.issues.length > 20 && (
                      <div className="text-center text-xs text-slate-500 pt-2">
                        还有 {result.issues.length - 20} 个问题...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 修复建议 */}
              {expandedRules.has(result.ruleId) && showSuggestions && result.suggestions.length > 0 && (
                <div className="border-t border-slate-200 p-3 bg-blue-50">
                  <div className="text-sm font-medium text-blue-800 mb-2">修复建议：</div>
                  <ul className="space-y-1">
                    {result.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                        <span>•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 无问题 */}
        {stats.totalIssues === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <CheckCircle className="w-16 h-16 mb-4 text-emerald-500" />
            <p className="text-lg font-medium">数据质量良好</p>
            <p className="text-sm">所有规则都已通过</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QualityResultPanel;
