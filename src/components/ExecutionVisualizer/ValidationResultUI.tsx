/**
 * 智能验证结果 UI 组件
 * 用于展示 AI 执行结果的验证信息
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  TrendingUp,
  FileText,
  AlertOctagon
} from 'lucide-react';
import type { ValidationResult, ValidationWarning } from '../../types/validationTypes';

export interface ValidationResultUIProps {
  result: ValidationResult;
  onApplyFix?: (warningCode: string) => void;
  onIgnore?: (warningCode: string) => void;
  compact?: boolean;
  showScore?: boolean;
  className?: string;
}

/**
 * 警告级别颜色映射
 */
const WARNING_LEVEL_CONFIG = {
  info: {
    icon: <Info className="w-4 h-4" />,
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-500'
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-700 dark:text-amber-300',
    iconColor: 'text-amber-500'
  },
  error: {
    icon: <XCircle className="w-4 h-4" />,
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-700 dark:text-red-300',
    iconColor: 'text-red-500'
  },
  critical: {
    icon: <AlertOctagon className="w-4 h-4" />,
    bgColor: 'bg-red-100 dark:bg-red-900/40',
    borderColor: 'border-red-300 dark:border-red-700',
    textColor: 'text-red-800 dark:text-red-200',
    iconColor: 'text-red-600'
  }
};

/**
 * 验证结果 UI 组件
 */
export const ValidationResultUI: React.FC<ValidationResultUIProps> = ({
  result,
  onApplyFix,
  onIgnore,
  compact = false,
  showScore = true,
  className = ''
}) => {
  const [expandedWarnings, setExpandedWarnings] = useState<Set<string>>(new Set());

  /**
   * 切换警告展开状态
   */
  const toggleWarning = (code: string) => {
    setExpandedWarnings(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  /**
   * 获取得分颜色
   */
  const getScoreColor = () => {
    if (result.score >= 90) return 'text-emerald-600';
    if (result.score >= 70) return 'text-amber-600';
    if (result.score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  /**
   * 获取得分背景色
   */
  const getScoreBgColor = () => {
    if (result.score >= 90) return 'bg-emerald-100 dark:bg-emerald-900/30';
    if (result.score >= 70) return 'bg-amber-100 dark:bg-amber-900/30';
    if (result.score >= 50) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  /**
   * 按级别分组警告
   */
  const groupedWarnings = result.warnings.reduce((acc, warning) => {
    if (!acc[warning.level]) {
      acc[warning.level] = [];
    }
    acc[warning.level].push(warning);
    return acc;
  }, {} as Record<string, ValidationWarning[]>);

  /**
   * 渲染单个警告
   */
  const renderWarning = (warning: ValidationWarning) => {
    const config = WARNING_LEVEL_CONFIG[warning.level];
    const isExpanded = expandedWarnings.has(warning.code);

    return (
      <div
        key={warning.code}
        className={`border rounded-lg mb-2 ${config.bgColor} ${config.borderColor}`}
      >
        <div
          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/30 dark:hover:bg-slate-900/30 transition-colors"
          onClick={() => toggleWarning(warning.code)}
        >
          {/* 图标 */}
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            {config.icon}
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-medium ${config.textColor}`}>
                {warning.message}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                {warning.code}
              </span>
            </div>

            {warning.suggestion && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {warning.suggestion}
              </p>
            )}
          </div>

          {/* 展开按钮 */}
          {(warning.details || onApplyFix) && (
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          )}
        </div>

        {/* 展开内容 */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-current/20 pt-3">
            {/* 详细信息 */}
            {warning.details && (
              <div className="mb-3 p-2 bg-white/50 dark:bg-slate-900/50 rounded">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  详细信息
                </div>
                <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
                  {JSON.stringify(warning.details, null, 2)}
                </pre>
              </div>
            )}

            {/* 操作按钮 */}
            {onApplyFix && warning.level !== 'info' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyFix(warning.code);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  自动修复
                </button>
                {onIgnore && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onIgnore(warning.code);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    忽略
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className={`validation-result-compact ${className}`}>
        <div className="flex items-center gap-3">
          {/* 得分 */}
          {showScore && (
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${getScoreBgColor()}`}>
              <span className={`text-lg font-bold ${getScoreColor()}`}>
                {result.score}
              </span>
            </div>
          )}

          {/* 状态 */}
          <div className="flex-1">
            {result.valid ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">验证通过</span>
                {result.warnings.length > 0 && (
                  <span className="text-slate-500">
                    ({result.warnings.length} 个提示)
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <XCircle className="w-4 h-4" />
                <span className="font-medium">验证失败</span>
                <span className="text-slate-500">
                  ({result.warnings.length} 个问题)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`validation-result-ui bg-white dark:bg-slate-900 rounded-xl border overflow-hidden ${result.valid ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'} ${className}`}>
      {/* 头部 */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                验证结果
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {result.valid ? '所有检查通过' : '发现需要处理的问题'}
              </p>
            </div>
          </div>

          {/* 得分 */}
          {showScore && (
            <div className={`px-4 py-2 rounded-lg ${getScoreBgColor()}`}>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 opacity-70" />
                <span className={`text-2xl font-bold ${getScoreColor()}`}>
                  {result.score}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">/100</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 警告列表 */}
      <div className="p-4">
        {result.warnings.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <p className="text-sm font-medium">完美！没有发现问题</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* 按严重程度分组显示 */}
            {(['critical', 'error', 'warning', 'info'] as const).map(level => {
              const warnings = groupedWarnings[level];
              if (!warnings || warnings.length === 0) return null;

              return (
                <div key={level}>
                  <div className="flex items-center gap-2 mb-2">
                    {WARNING_LEVEL_CONFIG[level].icon}
                    <span className={`text-xs font-bold uppercase ${WARNING_LEVEL_CONFIG[level].textColor}`}>
                      {level === 'critical' && '严重错误'}
                      {level === 'error' && '错误'}
                      {level === 'warning' && '警告'}
                      {level === 'info' && '提示'}
                      ({warnings.length})
                    </span>
                  </div>
                  {warnings.map(warning => renderWarning(warning))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 指标 */}
      {result.metrics && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            <FileText className="w-4 h-4" />
            数据指标
          </div>
          <div className="grid grid-cols-3 gap-3">
            {result.metrics.rowCount !== undefined && (
              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {result.metrics.rowCount}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  行数
                </div>
              </div>
            )}
            {result.metrics.columnCount !== undefined && (
              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {result.metrics.columnCount}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  列数
                </div>
              </div>
            )}
            {result.metrics.numericSummary && (
              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {result.metrics.numericSummary.avg?.toFixed(2) || '-'}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  平均值
                </div>
              </div>
            )}
          </div>
          {result.metrics.dataQuality && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-600 dark:text-slate-400">缺失值</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {result.metrics.dataQuality.missingValues}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-600 dark:text-slate-400">重复行</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {result.metrics.dataQuality.duplicateRows}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-600 dark:text-slate-400">类型不一致</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {result.metrics.dataQuality.inconsistentTypes}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationResultUI;
