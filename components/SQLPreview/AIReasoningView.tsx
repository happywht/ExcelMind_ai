/**
 * AI Reasoning View Component
 * AI推理过程展示组件
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Brain, Sparkles, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import type { AIReasoningViewProps } from './types';

export const AIReasoningView: React.FC<AIReasoningViewProps> = ({
  reasoning,
  confidence,
  naturalQuery,
  suggestions = [],
  onApplySuggestion,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [appliedSuggestion, setAppliedSuggestion] = useState<string | null>(null);

  /**
   * 获取置信度颜色
   */
  const getConfidenceColor = (conf: number): string => {
    if (conf >= 0.9) return 'bg-emerald-500';
    if (conf >= 0.7) return 'bg-blue-500';
    if (conf >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  /**
   * 获取置信度标签
   */
  const getConfidenceLabel = (conf: number): string => {
    if (conf >= 0.9) return '非常高';
    if (conf >= 0.7) return '高';
    if (conf >= 0.5) return '中等';
    return '低';
  };

  /**
   * 应用建议
   */
  const handleApplySuggestion = (suggestion: string) => {
    setAppliedSuggestion(suggestion);
    if (onApplySuggestion) {
      onApplySuggestion(suggestion);
    }

    // 3秒后重置应用状态
    setTimeout(() => {
      setAppliedSuggestion(null);
    }, 3000);
  };

  /**
   * 格式化推理过程
   */
  const formatReasoning = (text: string): string[] => {
    // 按步骤分割推理过程
    const steps = text
      .split(/\d+[\.\、]/)
      .filter(step => step.trim().length > 0);

    if (steps.length === 0) {
      return [text];
    }

    // 如果没有明确的步骤标记，返回整个文本
    if (steps.length === 1 && !text.match(/\d+[\.\、]/)) {
      return [text];
    }

    return steps;
  };

  const reasoningSteps = formatReasoning(reasoning);

  return (
    <div className="ai-reasoning-view bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-950 dark:to-blue-950 rounded-xl border border-violet-200 dark:border-violet-800 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-violet-100/50 dark:hover:bg-violet-900/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500 rounded-lg">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">AI 推理过程</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              置信度: {getConfidenceLabel(confidence)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 置信度指示器 */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getConfidenceColor(confidence)} transition-all duration-500`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {Math.round(confidence * 100)}%
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-violet-200 dark:border-violet-800">
          {/* 自然语言查询 */}
          {naturalQuery && (
            <div className="mb-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  自然语言查询
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                "{naturalQuery}"
              </p>
            </div>
          )}

          {/* 推理步骤 */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                推理步骤
              </span>
            </div>
            <div className="space-y-2">
              {reasoningSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex-1">
                    {step.trim()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* AI建议 */}
          {suggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  AI 建议
                </span>
              </div>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => {
                  const isApplied = appliedSuggestion === suggestion;
                  return (
                    <div
                      key={index}
                      className={`group relative p-3 rounded-lg border transition-all ${
                        isApplied
                          ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950 dark:border-emerald-700'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          {isApplied ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          )}
                          <p className={`text-sm flex-1 ${
                            isApplied
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}>
                            {suggestion}
                          </p>
                        </div>
                        {onApplySuggestion && !isApplied && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplySuggestion(suggestion);
                            }}
                            className="flex-shrink-0 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            应用
                          </button>
                        )}
                        {isApplied && (
                          <span className="flex-shrink-0 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg">
                            已应用
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIReasoningView;
