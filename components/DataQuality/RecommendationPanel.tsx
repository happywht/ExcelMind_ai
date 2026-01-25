/**
 * 建议面板组件
 *
 * 显示AI生成的清洗建议
 *
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { CheckCircle2, Zap, Clock, ArrowRight } from 'lucide-react';
import IssueBadge from '../Shared/IssueBadge';
import ProgressBar from '../Shared/ProgressBar';
import { CleaningSuggestion } from './types';

interface RecommendationPanelProps {
  suggestions: CleaningSuggestion[];
  onApply: (actions: Array<{
    suggestionId: string;
    action: 'auto_fix' | 'manual' | 'skip';
    manualValue?: any;
  }>) => void;
  className?: string;
}

const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  suggestions,
  onApply,
  className
}) => {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const toggleSuggestion = (suggestionId: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(suggestionId)) {
        next.delete(suggestionId);
      } else {
        next.add(suggestionId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedSuggestions(new Set(suggestions.map(s => s.id)));
  };

  const clearAll = () => {
    setSelectedSuggestions(new Set());
  };

  const handleApply = () => {
    const actions = suggestions
      .filter(s => selectedSuggestions.has(s.id))
      .map(s => ({
        suggestionId: s.id,
        action: (s.canAutoFix ? 'auto_fix' : 'manual') as 'auto_fix' | 'manual' | 'skip',
      }));

    onApply(actions);
  };

  const selectedCount = selectedSuggestions.size;
  const autoFixCount = suggestions.filter(s => selectedSuggestions.has(s.id) && s.canAutoFix).length;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className || ''}`}>
      {/* 标题栏 */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-slate-800">AI清洗建议</h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">已选 {selectedCount} 项</span>
            <button
              onClick={selectAll}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              全选
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={clearAll}
              className="text-slate-600 hover:text-slate-700"
            >
              清除
            </button>
          </div>
        </div>
      </div>

      {/* 建议列表 */}
      <div className="divide-y divide-slate-100">
        {suggestions.map((suggestion) => {
          const isSelected = selectedSuggestions.has(suggestion.id);
          return (
            <div
              key={suggestion.id}
              className={`p-6 transition-colors ${isSelected ? 'bg-emerald-50/50' : ''}`}
            >
              <div className="flex items-start gap-4">
                {/* 选择框 */}
                <button
                  onClick={() => toggleSuggestion(suggestion.id)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-600'
                      : 'border-slate-300 hover:border-emerald-400'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </button>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  {/* 标题和徽章 */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-base font-semibold text-slate-800">
                      {suggestion.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      {suggestion.canAutoFix && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          <Zap className="w-3 h-3" />
                          自动修复
                        </span>
                      )}
                      <IssueBadge severity={suggestion.priority === 'high' ? 'high' : suggestion.priority === 'medium' ? 'medium' : 'low'} />
                    </div>
                  </div>

                  {/* 描述 */}
                  <p className="text-sm text-slate-600 mb-3">
                    {suggestion.description}
                  </p>

                  {/* 影响和预估时间 */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      预计 {suggestion.estimatedTime}
                    </span>
                    <span>·</span>
                    <span>{suggestion.impact}</span>
                  </div>

                  {/* 预览 */}
                  {suggestion.preview && (
                    <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">预期效果:</p>
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-xs text-slate-500">影响行数:</span>
                          <span className="ml-1 text-sm font-medium text-slate-700">
                            {suggestion.preview.affectedRows}
                          </span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <div>
                          <span className="text-xs text-slate-500">处理后:</span>
                          <span className="ml-1 text-sm font-medium text-emerald-600">
                            {suggestion.preview.afterFixRows}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 步骤 */}
                  <div className="space-y-1">
                    {suggestion.steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="flex-shrink-0 w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部操作栏 */}
      {selectedCount > 0 && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-medium">{selectedCount}</span> 个建议已选择，
              其中 <span className="font-medium text-blue-600">{autoFixCount}</span> 个可自动修复
            </div>
            <button
              onClick={handleApply}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
            >
              <CheckCircle2 className="w-4 h-4" />
              应用修复
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationPanel;
