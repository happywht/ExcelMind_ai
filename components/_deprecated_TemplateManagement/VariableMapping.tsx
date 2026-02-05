/**
 * 变量映射组件
 *
 * 显示模板变量列表并支持映射到 Excel 数据源字段
 *
 * @version 2.0.0
 */

import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Zap,
  Undo2,
  Save,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { VariableMapping as VariableMappingType, MappingValidation } from './types';

interface VariableMappingProps {
  variables: Array<{
    key: string;
    rawPlaceholder: string;
    dataType: string;
    required: boolean;
  }>;
  dataFields: string[];
  mappings: VariableMappingType[];
  onChange: (mappings: VariableMappingType[]) => void;
  onAutoMap?: () => void;
  className?: string;
}

const VariableMapping: React.FC<VariableMappingProps> = ({
  variables,
  dataFields,
  mappings,
  onChange,
  onAutoMap,
  className,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showTransformEditor, setShowTransformEditor] = useState<string | null>(null);

  // 验证映射
  const validation = useMemo<MappingValidation>(() => {
    const errors: Array<{ placeholder: string; message: string }> = [];
    const warnings: Array<{ placeholder: string; message: string }> = [];

    // 检查必填字段是否已映射
    variables.forEach((variable) => {
      const mapping = mappings.find((m) => m.placeholder === variable.key);
      if (variable.required && !mapping?.excelColumn) {
        errors.push({
          placeholder: variable.key,
          message: '必填字段未映射',
        });
      }
    });

    // 检查类型兼容性
    mappings.forEach((mapping) => {
      const variable = variables.find((v) => v.key === mapping.placeholder);
      if (!variable) return;

      // 简单类型检查（可以扩展）
      if (variable.dataType === 'number') {
        const fieldLower = mapping.excelColumn.toLowerCase();
        if (
          !fieldLower.includes('amount') &&
          !fieldLower.includes('price') &&
          !fieldLower.includes('quantity') &&
          !fieldLower.includes('count') &&
          !fieldLower.includes('num') &&
          !fieldLower.includes('总计') &&
          !fieldLower.includes('数量')
        ) {
          warnings.push({
            placeholder: mapping.placeholder,
            message: '可能是数字类型字段',
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }, [variables, mappings]);

  const handleMappingChange = (placeholder: string, excelColumn: string) => {
    const newMappings = mappings.map((m) =>
      m.placeholder === placeholder ? { ...m, excelColumn } : m
    );
    onChange(newMappings);
  };

  const handleTransformChange = (placeholder: string, transform: string) => {
    const newMappings = mappings.map((m) =>
      m.placeholder === placeholder ? { ...m, transform } : m
    );
    onChange(newMappings);
  };

  const handleDefaultValueChange = (placeholder: string, defaultValue: any) => {
    const newMappings = mappings.map((m) =>
      m.placeholder === placeholder ? { ...m, defaultValue } : m
    );
    onChange(newMappings);
  };

  const handleAutoMap = () => {
    if (onAutoMap) {
      onAutoMap();
    }
  };

  const getMappingStatus = (placeholder: string) => {
    const mapping = mappings.find((m) => m.placeholder === placeholder);
    const error = validation.errors.find((e) => e.placeholder === placeholder);
    const warning = validation.warnings.find((w) => w.placeholder === placeholder);

    if (error) return 'error';
    if (warning) return 'warning';
    if (mapping?.excelColumn) return 'mapped';
    return 'unmapped';
  };

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'string':
        return <span className="text-xs text-slate-400">T</span>;
      case 'number':
        return <span className="text-xs text-blue-500">#</span>;
      case 'date':
        return <span className="text-xs text-emerald-500">D</span>;
      case 'boolean':
        return <span className="text-xs text-purple-500">B</span>;
      case 'image':
        return <span className="text-xs text-pink-500">IMG</span>;
      default:
        return <span className="text-xs text-slate-400">?</span>;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">变量映射</h3>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
            {mappings.filter((m) => m.excelColumn).length}/{variables.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 验证状态 */}
          {validation.valid ? (
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>映射有效</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {validation.errors.length} 个错误
              </span>
            </div>
          )}

          {/* 自动映射按钮 */}
          {onAutoMap && (
            <button
              onClick={handleAutoMap}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
              type="button"
            >
              <Zap className="w-3.5 h-3.5" />
              智能映射
            </button>
          )}
        </div>
      </div>

      {/* 映射列表 */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {variables.map((variable, index) => {
          const mapping = mappings.find((m) => m.placeholder === variable.key) || {
            placeholder: variable.key,
            excelColumn: '',
            dataType: variable.dataType,
            required: variable.required,
          };
          const status = getMappingStatus(variable.key);
          const error = validation.errors.find((e) => e.placeholder === variable.key);
          const warning = validation.warnings.find((w) => w.placeholder === variable.key);

          return (
            <div
              key={variable.key}
              className={cn(
                'flex items-center gap-3 p-3 bg-white border rounded-lg transition-colors',
                status === 'error' && 'border-red-300 bg-red-50',
                status === 'warning' && 'border-yellow-300 bg-yellow-50',
                status === 'mapped' && 'border-emerald-200 bg-emerald-50/50',
                status === 'unmapped' && 'border-slate-200'
              )}
            >
              {/* 变量信息 */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1.5">
                  {variable.required && (
                    <span className="text-red-500 text-xs">*</span>
                  )}
                  {getDataTypeIcon(variable.dataType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {variable.key}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {variable.rawPlaceholder}
                  </p>
                </div>
              </div>

              {/* 箭头 */}
              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

              {/* 映射选择器 */}
              <div className="flex-1">
                <select
                  value={mapping.excelColumn}
                  onChange={(e) => handleMappingChange(variable.key, e.target.value)}
                  className={cn(
                    'w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2',
                    status === 'error' && 'border-red-300 focus:ring-red-500',
                    status === 'warning' && 'border-yellow-300 focus:ring-yellow-500',
                    status === 'mapped' && 'border-emerald-300 focus:ring-emerald-500',
                    status === 'unmapped' && 'border-slate-300 focus:ring-emerald-500'
                  )}
                >
                  <option value="">-- 选择字段 --</option>
                  {dataFields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>

                {/* 错误/警告信息 */}
                {error && (
                  <p className="text-xs text-red-600 mt-1">{error.message}</p>
                )}
                {warning && (
                  <p className="text-xs text-yellow-600 mt-1">{warning.message}</p>
                )}
              </div>

              {/* 高级选项 */}
              <button
                onClick={() =>
                  setShowTransformEditor(
                    showTransformEditor === variable.key ? null : variable.key
                  )
                }
                className={cn(
                  'p-1.5 rounded transition-colors flex-shrink-0',
                  showTransformEditor === variable.key
                    ? 'bg-slate-200'
                    : 'hover:bg-slate-100'
                )}
                type="button"
                aria-label="高级选项"
              >
                <Settings className="w-4 h-4 text-slate-500" />
              </button>

              {/* 高级选项面板 */}
              {showTransformEditor === variable.key && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-10">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        默认值
                      </label>
                      <input
                        type="text"
                        value={mapping.defaultValue || ''}
                        onChange={(e) =>
                          handleDefaultValueChange(variable.key, e.target.value)
                        }
                        placeholder="可选"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        数据转换
                      </label>
                      <select
                        value={mapping.transform || ''}
                        onChange={(e) =>
                          handleTransformChange(variable.key, e.target.value)
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">无转换</option>
                        <option value="toUpperCase">转大写</option>
                        <option value="toLowerCase">转小写</option>
                        <option value="trim">去空格</option>
                        <option value="date">格式化日期</option>
                        <option value="currency">格式化货币</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 批量操作 */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          {validation.errors.length > 0 && (
            <span className="text-red-600">
              {validation.errors.length} 个必填字段未映射
            </span>
          )}
          {validation.warnings.length > 0 && (
            <span className="ml-2 text-yellow-600">
              {validation.warnings.length} 个警告
            </span>
          )}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange([])}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
            type="button"
          >
            <Undo2 className="w-3.5 h-3.5" />
            重置
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariableMapping;
