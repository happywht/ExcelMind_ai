/**
 * 映射编辑对话框
 *
 * 用于编辑单个字段映射关系
 */

import React, { useState, useEffect, useMemo } from 'react';
import { FieldMapping } from '../../types/documentTypes';
import { TransformEditor } from './TransformEditor';

/**
 * 组件属性
 */
export interface MappingEditDialogProps {
  open: boolean;
  mapping: FieldMapping;
  excelHeaders: string[];
  templatePlaceholders: string[];
  sampleData?: any[];
  onSave: (mapping: FieldMapping) => void;
  onCancel: () => void;
}

/**
 * AI相似度建议
 */
interface SimilaritySuggestion {
  column: string;
  placeholder: string;
  similarity: number;
}

/**
 * 映射编辑对话框
 */
export const MappingEditDialog: React.FC<MappingEditDialogProps> = ({
  open,
  mapping,
  excelHeaders,
  templatePlaceholders,
  sampleData,
  onSave,
  onCancel
}) => {
  // 表单状态
  const [placeholder, setPlaceholder] = useState(mapping.placeholder);
  const [excelColumn, setExcelColumn] = useState(mapping.excelColumn);
  const [transform, setTransform] = useState(mapping.transform || '');
  const [required, setRequired] = useState(false);
  const [unique, setUnique] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 预览状态
  const [previewValue, setPreviewValue] = useState<string>('--');

  // 搜索状态
  const [placeholderSearch, setPlaceholderSearch] = useState('');
  const [columnSearch, setColumnSearch] = useState('');

  // 过滤后的选项
  const filteredPlaceholders = useMemo(() => {
    if (!placeholderSearch) return templatePlaceholders;
    return templatePlaceholders.filter(p =>
      p.toLowerCase().includes(placeholderSearch.toLowerCase())
    );
  }, [templatePlaceholders, placeholderSearch]);

  const filteredColumns = useMemo(() => {
    if (!columnSearch) return excelHeaders;
    return excelHeaders.filter(h =>
      h.toLowerCase().includes(columnSearch.toLowerCase())
    );
  }, [excelHeaders, columnSearch]);

  // AI相似度建议
  const suggestions = useMemo<SimilaritySuggestion[]>(() => {
    if (!placeholder) return [];

    // 简单的相似度计算（实际应用中可以使用更复杂的算法）
    const calculateSimilarity = (str1: string, str2: string): number => {
      const s1 = str1.toLowerCase().replace(/[{{}}]/g, '').trim();
      const s2 = str2.toLowerCase().trim();

      if (s1 === s2) return 1;
      if (s1.includes(s2) || s2.includes(s1)) return 0.8;

      // 简单的编辑距离计算
      const matrix = [];
      for (let i = 0; i <= s1.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= s2.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
          if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      const maxLen = Math.max(s1.length, s2.length);
      return 1 - matrix[s1.length][s2.length] / maxLen;
    };

    return excelHeaders
      .map(col => ({
        column: col,
        placeholder,
        similarity: calculateSimilarity(placeholder, col)
      }))
      .filter(s => s.similarity > 0.5 && s.column !== excelColumn)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }, [placeholder, excelHeaders, excelColumn]);

  // 更新预览
  useEffect(() => {
    if (!sampleData || sampleData.length === 0 || !excelColumn) {
      setPreviewValue('--');
      return;
    }

    const sampleValue = sampleData[0][excelColumn];
    if (sampleValue === undefined || sampleValue === null) {
      setPreviewValue('--');
      return;
    }

    try {
      if (transform) {
        const transformFn = new Function('value', `return ${transform}`);
        setPreviewValue(String(transformFn(sampleValue)));
      } else {
        setPreviewValue(String(sampleValue));
      }
    } catch (error) {
      setPreviewValue('转换错误');
    }
  }, [excelColumn, transform, sampleData]);

  // 重置表单
  useEffect(() => {
    if (open) {
      setPlaceholder(mapping.placeholder);
      setExcelColumn(mapping.excelColumn);
      setTransform(mapping.transform || '');
      setPlaceholderSearch('');
      setColumnSearch('');
    }
  }, [open, mapping]);

  /**
   * 处理保存
   */
  const handleSave = () => {
    const newMapping: FieldMapping = {
      placeholder,
      excelColumn,
      transform: transform || undefined
    };
    onSave(newMapping);
  };

  /**
   * 应用建议
   */
  const applySuggestion = (suggestion: SimilaritySuggestion) => {
    setExcelColumn(suggestion.column);
    setShowSuggestions(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* 背景遮罩 */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onCancel}
        />

        {/* 对话框 */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-auto">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">编辑字段映射</h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 表单内容 */}
          <div className="px-6 py-4 space-y-4">
            {/* 模板占位符 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模板占位符
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={placeholderSearch}
                  onChange={(e) => setPlaceholderSearch(e.target.value)}
                  placeholder="搜索或选择占位符..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {filteredPlaceholders.length > 0 && placeholderSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto">
                    {filteredPlaceholders.map(p => (
                      <button
                        key={p}
                        onClick={() => {
                          setPlaceholder(p);
                          setPlaceholderSearch('');
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="{{占位符}}"
              />
            </div>

            {/* Excel列 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Excel列
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                  placeholder="搜索或选择列..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {filteredColumns.length > 0 && columnSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto">
                    {filteredColumns.map(h => (
                      <button
                        key={h}
                        onClick={() => {
                          setExcelColumn(h);
                          setColumnSearch('');
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={excelColumn}
                onChange={(e) => setExcelColumn(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="列名"
              />
            </div>

            {/* 数据转换 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数据转换
              </label>
              <TransformEditor
                value={transform}
                sampleData={sampleData}
                onChange={setTransform}
              />
            </div>

            {/* 高级选项 */}
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                高级选项
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={required}
                    onChange={(e) => setRequired(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">必填字段</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={unique}
                    onChange={(e) => setUnique(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">唯一值</span>
                </label>
              </div>
            </div>

            {/* AI建议 */}
            {suggestions.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    AI相似度建议
                  </label>
                  <button
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {showSuggestions ? '隐藏' : '显示'}
                  </button>
                </div>
                {showSuggestions && (
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {suggestion.column}
                          </div>
                          <div className="text-xs text-gray-600">
                            相似度: {Math.round(suggestion.similarity * 100)}%
                          </div>
                        </div>
                        <button
                          onClick={() => applySuggestion(suggestion)}
                          className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                        >
                          应用
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 预览 */}
            {sampleData && sampleData.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  转换预览
                </label>
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">
                    原始值: {String(sampleData[0][excelColumn] || '--')}
                  </div>
                  <div className="text-sm font-mono text-gray-900">
                    转换后: {previewValue}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!placeholder || !excelColumn}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
