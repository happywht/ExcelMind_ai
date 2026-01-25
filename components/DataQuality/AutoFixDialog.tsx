/**
 * 自动修复对话框组件
 *
 * 显示即将执行的修复操作，让用户确认
 *
 * @version 2.0.0
 */

import React from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import IssueBadge from '../Shared/IssueBadge';
import { CleaningSuggestion } from './types';

interface AutoFixDialogProps {
  suggestions: CleaningSuggestion[];
  onApply: (actions: Array<{
    suggestionId: string;
    action: 'auto_fix' | 'manual' | 'skip';
    manualValue?: any;
  }>) => void;
  onClose: () => void;
}

const AutoFixDialog: React.FC<AutoFixDialogProps> = ({
  suggestions,
  onApply,
  onClose
}) => {
  const autoFixCount = suggestions.filter(s => s.canAutoFix).length;
  const manualCount = suggestions.length - autoFixCount;
  const estimatedTime = suggestions.reduce((sum, s) => {
    const minutes = parseInt(s.estimatedTime) || 0;
    return sum + minutes;
  }, 0);

  const handleApply = () => {
    const actions = suggestions.map(s => ({
      suggestionId: s.id,
      action: 'auto_fix' as const,
    }));
    onApply(actions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">确认自动修复</h2>
            <p className="text-sm text-slate-500 mt-1">
              即将执行 {suggestions.length} 个修复操作
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{autoFixCount}</div>
              <div className="text-xs text-emerald-700 mt-1">自动修复</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{manualCount}</div>
              <div className="text-xs text-orange-700 mt-1">需手动处理</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{estimatedTime}分钟</div>
              <div className="text-xs text-blue-700 mt-1">预计耗时</div>
            </div>
          </div>

          {/* 修复列表 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-700 mb-3">修复详情</h3>
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg"
              >
                <div className="flex-shrink-0 w-6 h-6 bg-white rounded-full flex items-center justify-center text-sm font-bold text-slate-600 shadow-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-slate-800">
                      {suggestion.title}
                    </h4>
                    {suggestion.canAutoFix ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        自动
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        手动
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{suggestion.description}</p>
                </div>
                <IssueBadge severity={suggestion.priority === 'high' ? 'high' : 'medium'} showIcon={false} />
              </div>
            ))}
          </div>

          {/* 提示信息 */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">重要提示</p>
              <ul className="space-y-1 text-blue-700">
                <li>• 系统将自动创建备份，可在执行后恢复</li>
                <li>• 自动修复将立即执行，无法撤销</li>
                <li>• 建议先在小样本数据上测试</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoFixDialog;
