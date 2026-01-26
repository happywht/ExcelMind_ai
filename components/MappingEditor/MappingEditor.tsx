/**
 * 映射方案可视化编辑器 - 主组件
 *
 * 功能：
 * - 可视化编辑Excel到Word模板的字段映射
 * - 支持拖拽排序、快速编辑
 * - AI智能映射建议
 * - 实时验证和预览
 */

import React, { useState, useCallback } from 'react';
import { MappingScheme, FieldMapping } from '../../types/documentTypes';
import { MappingList } from './MappingList';
import { MappingEditDialog } from './MappingEditDialog';
import { UnmappedPanel } from './UnmappedPanel';
import { MappingValidator } from './MappingValidator';
import { AutoMapButton } from './AutoMapButton';
import { MappingPreview } from './MappingPreview';
import { logger } from '@/utils/logger';

/**
 * Excel数据信息
 */
export interface ExcelInfo {
  headers: string[];
  sheets: string[];
  sampleData: any[];
}

/**
 * 模板信息
 */
export interface TemplateInfo {
  placeholders: string[];
  textContent?: string;
}

/**
 * AI信息
 */
export interface AIInfo {
  explanation: string;
  confidence?: number;
}

/**
 * 配置选项
 */
export interface MappingEditorConfig {
  readonly?: boolean;
  showAiSuggestions?: boolean;
  allowManualAdd?: boolean;
  showPreview?: boolean;
  showValidation?: boolean;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  unmappedCount: number;
  mappedCount: number;
}

/**
 * 主组件属性
 */
export interface MappingEditorProps {
  mappingScheme: MappingScheme;
  excelInfo: ExcelInfo;
  templateInfo: TemplateInfo;
  aiInfo?: AIInfo;
  config?: MappingEditorConfig;
  onChange?: (mapping: MappingScheme) => void;
  onValidate?: () => ValidationResult;
  onAutoMap?: () => Promise<MappingScheme>;
}

/**
 * 映射方案可视化编辑器
 */
export const MappingEditor: React.FC<MappingEditorProps> = ({
  mappingScheme,
  excelInfo,
  templateInfo,
  aiInfo,
  config = {},
  onChange,
  onValidate,
  onAutoMap
}) => {
  // 状态管理
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [autoMappingLoading, setAutoMappingLoading] = useState(false);
  const [showUnmappedPanel, setShowUnmappedPanel] = useState(false);

  // 计算未映射字段
  const unmappedPlaceholders = React.useMemo(() => {
    const mappedPlaceholders = new Set(
      mappingScheme.mappings.map(m => m.placeholder)
    );
    return templateInfo.placeholders.filter(p => !mappedPlaceholders.has(p));
  }, [mappingScheme.mappings, templateInfo.placeholders]);

  const unmappedColumns = React.useMemo(() => {
    const mappedColumns = new Set(
      mappingScheme.mappings.map(m => m.excelColumn)
    );
    return excelInfo.headers.filter(h => !mappedColumns.has(h));
  }, [mappingScheme.mappings, excelInfo.headers]);

  /**
   * 处理映射变更
   */
  const handleMappingChange = useCallback((index: number, newMapping: FieldMapping) => {
    const newMappings = [...mappingScheme.mappings];
    newMappings[index] = newMapping;

    const updatedScheme: MappingScheme = {
      ...mappingScheme,
      mappings: newMappings
    };

    onChange?.(updatedScheme);
  }, [mappingScheme, onChange]);

  /**
   * 处理映射删除
   */
  const handleMappingDelete = useCallback((index: number) => {
    const newMappings = mappingScheme.mappings.filter((_, i) => i !== index);

    const updatedScheme: MappingScheme = {
      ...mappingScheme,
      mappings: newMappings,
      unmappedPlaceholders: [
        ...mappingScheme.unmappedPlaceholders,
        mappingScheme.mappings[index].placeholder
      ]
    };

    onChange?.(updatedScheme);
  }, [mappingScheme, onChange]);

  /**
   * 处理映射重排序
   */
  const handleMappingReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newMappings = [...mappingScheme.mappings];
    const [removed] = newMappings.splice(fromIndex, 1);
    newMappings.splice(toIndex, 0, removed);

    const updatedScheme: MappingScheme = {
      ...mappingScheme,
      mappings: newMappings
    };

    onChange?.(updatedScheme);
  }, [mappingScheme, onChange]);

  /**
   * 处理添加新映射
   */
  const handleAddMapping = useCallback(() => {
    setEditingIndex(-1); // -1 表示新增
    setEditDialogOpen(true);
  }, []);

  /**
   * 处理编辑映射
   */
  const handleEditMapping = useCallback((index: number) => {
    setEditingIndex(index);
    setEditDialogOpen(true);
  }, []);

  /**
   * 保存映射编辑
   */
  const handleSaveMapping = useCallback((mapping: FieldMapping) => {
    let newMappings: FieldMapping[];
    let newUnmapped: string[] = [...mappingScheme.unmappedPlaceholders];

    if (editingIndex === -1) {
      // 新增映射
      newMappings = [...mappingScheme.mappings, mapping];
      // 从未映射列表中移除
      newUnmapped = newUnmapped.filter(p => p !== mapping.placeholder);
    } else {
      // 编辑现有映射
      newMappings = [...mappingScheme.mappings];
      newMappings[editingIndex] = mapping;
    }

    const updatedScheme: MappingScheme = {
      ...mappingScheme,
      mappings: newMappings,
      unmappedPlaceholders: newUnmapped
    };

    onChange?.(updatedScheme);
    setEditDialogOpen(false);
  }, [mappingScheme, editingIndex, onChange]);

  /**
   * 处理快速映射
   */
  const handleQuickMap = useCallback((placeholder: string, column: string) => {
    const newMapping: FieldMapping = {
      placeholder,
      excelColumn: column
    };

    const newMappings = [...mappingScheme.mappings, newMapping];
    const newUnmapped = mappingScheme.unmappedPlaceholders.filter(p => p !== placeholder);

    const updatedScheme: MappingScheme = {
      ...mappingScheme,
      mappings: newMappings,
      unmappedPlaceholders: newUnmapped
    };

    onChange?.(updatedScheme);
  }, [mappingScheme, onChange]);

  /**
   * 处理AI自动映射
   */
  const handleAutoMap = useCallback(async () => {
    if (!onAutoMap) return;

    setAutoMappingLoading(true);
    try {
      const newScheme = await onAutoMap();
      onChange?.(newScheme);
    } catch (error) {
      logger.error('AI自动映射失败:', error);
    } finally {
      setAutoMappingLoading(false);
    }
  }, [onAutoMap, onChange]);

  /**
   * 处理验证
   */
  const handleValidate = useCallback(() => {
    const result = onValidate?.() || validateMapping();
    setValidationResult(result);
    return result;
  }, [onValidate]);

  /**
   * 内部验证逻辑
   */
  const validateMapping = (): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必填占位符
    const requiredPlaceholders = templateInfo.placeholders;
    const mappedPlaceholders = new Set(mappingScheme.mappings.map(m => m.placeholder));

    requiredPlaceholders.forEach(p => {
      if (!mappedPlaceholders.has(p)) {
        errors.push(`必填占位符 ${p} 未映射`);
      }
    });

    // 检查Excel列是否存在
    mappingScheme.mappings.forEach(mapping => {
      if (!excelInfo.headers.includes(mapping.excelColumn)) {
        errors.push(`映射的Excel列 "${mapping.excelColumn}" 不存在`);
      }
    });

    // 检查转换函数语法
    mappingScheme.mappings.forEach((mapping, index) => {
      if (mapping.transform) {
        try {
          // 简单语法检查
          new Function('value', `return ${mapping.transform}`);
        } catch (error) {
          errors.push(`映射 ${index + 1} 的转换函数语法错误: ${error}`);
        }
      }
    });

    // 检查重复映射
    const placeholderCount = new Map<string, number>();
    mappingScheme.mappings.forEach(m => {
      placeholderCount.set(m.placeholder, (placeholderCount.get(m.placeholder) || 0) + 1);
    });

    placeholderCount.forEach((count, placeholder) => {
      if (count > 1) {
        warnings.push(`占位符 ${placeholder} 被映射了 ${count} 次`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      unmappedCount: unmappedPlaceholders.length,
      mappedCount: mappingScheme.mappings.length
    };
  };

  return (
    <div className="mapping-editor space-y-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">字段映射编辑器</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {mappingScheme.mappings.length} 个映射
            </span>
            {unmappedPlaceholders.length > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                {unmappedPlaceholders.length} 个未映射
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {config.showAiSuggestions !== false && onAutoMap && (
            <AutoMapButton
              loading={autoMappingLoading}
              disabled={config.readonly}
              onAutoMap={handleAutoMap}
            />
          )}

          <button
            onClick={() => setShowUnmappedPanel(!showUnmappedPanel)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showUnmappedPanel ? '隐藏' : '显示'}未映射字段
          </button>

          {config.showValidation !== false && (
            <button
              onClick={handleValidate}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              验证映射
            </button>
          )}
        </div>
      </div>

      {/* AI说明 */}
      {aiInfo && config.showAiSuggestions !== false && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">AI 映射说明</h3>
              <p className="mt-1 text-sm text-blue-700">{aiInfo.explanation}</p>
              {aiInfo.confidence !== undefined && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-blue-600">
                    <span>匹配置信度</span>
                    <span>{Math.round(aiInfo.confidence * 100)}%</span>
                  </div>
                  <div className="mt-1 w-full bg-blue-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${aiInfo.confidence * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 验证结果 */}
      {validationResult && (
        <MappingValidator
          validationResult={validationResult}
          onClose={() => setValidationResult(null)}
        />
      )}

      {/* 未映射字段面板 */}
      {showUnmappedPanel && (unmappedPlaceholders.length > 0 || unmappedColumns.length > 0) && (
        <UnmappedPanel
          unmappedPlaceholders={unmappedPlaceholders}
          unmappedColumns={unmappedColumns}
          onMapPlaceholder={handleQuickMap}
          onMapColumn={(column, placeholder) => handleQuickMap(placeholder, column)}
        />
      )}

      {/* 映射列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">映射关系</h3>
            {config.allowManualAdd !== false && !config.readonly && (
              <button
                onClick={handleAddMapping}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + 添加映射
              </button>
            )}
          </div>
        </div>

        <MappingList
          mappings={mappingScheme.mappings}
          excelHeaders={excelInfo.headers}
          templatePlaceholders={templateInfo.placeholders}
          onMappingChange={handleMappingChange}
          onMappingDelete={handleMappingDelete}
          onMappingReorder={handleMappingReorder}
          onMappingEdit={handleEditMapping}
          readonly={config.readonly}
        />
      </div>

      {/* 映射预览 */}
      {config.showPreview !== false && (
        <MappingPreview
          mappingScheme={mappingScheme}
          excelSampleData={excelInfo.sampleData}
        />
      )}

      {/* 编辑对话框 */}
      <MappingEditDialog
        open={editDialogOpen}
        mapping={editingIndex === -1 || editingIndex === null ? {
          placeholder: '',
          excelColumn: '',
          transform: ''
        } : mappingScheme.mappings[editingIndex]}
        excelHeaders={excelInfo.headers}
        templatePlaceholders={templateInfo.placeholders}
        sampleData={excelInfo.sampleData}
        onSave={handleSaveMapping}
        onCancel={() => setEditDialogOpen(false)}
      />
    </div>
  );
};
