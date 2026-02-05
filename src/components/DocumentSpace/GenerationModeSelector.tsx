/**
 * 生成模式选择器组件
 *
 * 功能：
 * - 选择生成模式（逐行/聚合）
 * - 配置聚合规则
 * - 选择分组字段
 *
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  ChevronDown,
  Info,
  Check
} from 'lucide-react';
import { GenerationMode, AggregateConfig, AggregateRule, AggregateOperation } from '../../types/documentTypes';

interface GenerationModeSelectorProps {
  mode: GenerationMode;
  aggregateConfig: AggregateConfig;
  availableFields: string[];
  onModeChange: (mode: GenerationMode) => void;
  onAggregateConfigChange: (config: AggregateConfig) => void;
  disabled?: boolean;
}

const OPERATION_LABELS: Record<AggregateOperation, string> = {
  sum: '求和',
  avg: '平均值',
  count: '计数',
  max: '最大值',
  min: '最小值',
  first: '第一个',
  last: '最后一个',
  join: '连接'
};

const GenerationModeSelector: React.FC<GenerationModeSelectorProps> = ({
  mode,
  aggregateConfig,
  availableFields,
  onModeChange,
  onAggregateConfigChange,
  disabled = false
}) => {
  const [showAggregateConfig, setShowAggregateConfig] = useState(false);

  // 添加聚合规则
  const addRule = () => {
    if (availableFields.length === 0) return;

    const newRule: AggregateRule = {
      field: availableFields[0],
      operation: 'sum',
      alias: ''
    };

    onAggregateConfigChange({
      ...aggregateConfig,
      rules: [...aggregateConfig.rules, newRule]
    });
  };

  // 删除聚合规则
  const removeRule = (index: number) => {
    onAggregateConfigChange({
      ...aggregateConfig,
      rules: aggregateConfig.rules.filter((_, i) => i !== index)
    });
  };

  // 更新聚合规则
  const updateRule = (index: number, updates: Partial<AggregateRule>) => {
    const newRules = [...aggregateConfig.rules];
    newRules[index] = { ...newRules[index], ...updates };
    onAggregateConfigChange({
      ...aggregateConfig,
      rules: newRules
    });
  };

  // 切换分组字段
  const toggleGroupByField = (field: string) => {
    const currentGroupBy = aggregateConfig.groupBy || [];
    const newGroupBy = currentGroupBy.includes(field)
      ? currentGroupBy.filter(f => f !== field)
      : [...currentGroupBy, field];

    onAggregateConfigChange({
      ...aggregateConfig,
      groupBy: newGroupBy
    });
  };

  return (
    <div className="space-y-3">
      {/* 模式选择 */}
      <div>
        <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4" />
          生成模式
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onModeChange('individual')}
            disabled={disabled}
            className={`
              relative px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border
              ${mode === 'individual'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-slate-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <Layers className={`w-4 h-4 ${mode === 'individual' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>逐行生成</span>
              {mode === 'individual' && <Check className="w-4 h-4 ml-auto text-emerald-600" />}
            </div>
            <p className={`text-xs mt-1 text-left ${mode === 'individual' ? 'text-emerald-600/80' : 'text-slate-400'}`}>
              为每一行数据生成一个文档
            </p>
          </button>

          <button
            onClick={() => onModeChange('aggregate')}
            disabled={disabled}
            className={`
              relative px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border
              ${mode === 'aggregate'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-slate-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <Layers className={`w-4 h-4 ${mode === 'aggregate' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>聚合汇总</span>
              {mode === 'aggregate' && <Check className="w-4 h-4 ml-auto text-emerald-600" />}
            </div>
            <p className={`text-xs mt-1 text-left ${mode === 'aggregate' ? 'text-emerald-600/80' : 'text-slate-400'}`}>
              生成统计汇总文档
            </p>
          </button>
        </div>
      </div>

      {mode === 'aggregate' && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-500" />
              聚合规则配置
            </h4>
            <button
              onClick={() => setShowAggregateConfig(!showAggregateConfig)}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              {showAggregateConfig ? '收起' : '展开'}
              <ChevronDown className={`w-3 h-3 inline ml-1 transition-transform ${showAggregateConfig ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showAggregateConfig && (
            <div className="space-y-3">
              {/* 聚合规则列表 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-600">聚合规则</span>
                  <button
                    onClick={addRule}
                    disabled={disabled || availableFields.length === 0}
                    className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    添加规则
                  </button>
                </div>

                {aggregateConfig.rules.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-4 bg-white rounded border border-slate-200">
                    暂无聚合规则，点击上方按钮添加
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {aggregateConfig.rules.map((rule, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            {/* 字段选择 */}
                            <select
                              value={rule.field}
                              onChange={(e) => updateRule(index, { field: e.target.value })}
                              disabled={disabled}
                              className="px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                            >
                              {availableFields.map(field => (
                                <option key={field} value={field}>{field}</option>
                              ))}
                            </select>

                            {/* 操作选择 */}
                            <select
                              value={rule.operation}
                              onChange={(e) => updateRule(index, { operation: e.target.value as AggregateOperation })}
                              disabled={disabled}
                              className="px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                            >
                              {Object.entries(OPERATION_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>

                            {/* 别名输入 */}
                            <input
                              type="text"
                              value={rule.alias || ''}
                              onChange={(e) => updateRule(index, { alias: e.target.value })}
                              placeholder="别名(可选)"
                              disabled={disabled}
                              className="px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                            />
                          </div>

                          <button
                            onClick={() => removeRule(index)}
                            disabled={disabled}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {rule.operation === 'join' && (
                          <input
                            type="text"
                            value={rule.delimiter || ', '}
                            onChange={(e) => updateRule(index, { delimiter: e.target.value })}
                            placeholder="分隔符(默认: , )"
                            disabled={disabled}
                            className="mt-2 px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 w-full"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 分组字段选择 */}
              <div>
                <span className="text-xs font-medium text-slate-600 block mb-2">
                  分组字段（可选）
                </span>
                {availableFields.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-2 bg-white rounded border border-slate-200">
                    请先上传数据文件
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {availableFields.map(field => {
                      const isSelected = (aggregateConfig.groupBy || []).includes(field);
                      return (
                        <button
                          key={field}
                          onClick={() => toggleGroupByField(field)}
                          disabled={disabled}
                          className={`
                            px-2.5 py-1.5 text-xs rounded-lg border transition-all
                            ${isSelected
                              ? 'bg-purple-500 text-white border-purple-500 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400'
                            }
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          {field}
                          {isSelected && <Check className="w-3 h-3 inline ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 配置说明 */}
              <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200">
                <p className="text-xs leading-relaxed">
                  <Info className="w-3 h-3 inline mr-1" />
                  <strong>提示：</strong>
                  {aggregateConfig.rules.length === 0
                    ? '请至少添加一条聚合规则。'
                    : aggregateConfig.groupBy && aggregateConfig.groupBy.length > 0
                      ? `已配置${aggregateConfig.rules.length}条聚合规则，按${aggregateConfig.groupBy.join('、')}分组，将生成多个汇总文档。`
                      : `已配置${aggregateConfig.rules.length}条聚合规则，将生成单个汇总文档。`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GenerationModeSelector;
