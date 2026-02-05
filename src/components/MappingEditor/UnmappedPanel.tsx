/**
 * 未映射字段面板
 *
 * 显示未映射的模板占位符和Excel列，提供快速映射功能
 */

import React, { useState } from 'react';

/**
 * 组件属性
 */
export interface UnmappedPanelProps {
  unmappedPlaceholders: string[];
  unmappedColumns: string[];
  onMapPlaceholder: (placeholder: string, column: string) => void;
  onMapColumn: (column: string, placeholder: string) => void;
}

/**
 * 未映射字段面板
 */
export const UnmappedPanel: React.FC<UnmappedPanelProps> = ({
  unmappedPlaceholders,
  unmappedColumns,
  onMapPlaceholder,
  onMapColumn
}) => {
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);

  /**
   * 处理占位符选择
   */
  const handlePlaceholderClick = (placeholder: string) => {
    setSelectedPlaceholder(placeholder);
    if (selectedColumn) {
      onMapPlaceholder(placeholder, selectedColumn);
      setSelectedColumn(null);
    } else {
      setShowMappingDialog(true);
    }
  };

  /**
   * 处理列选择
   */
  const handleColumnClick = (column: string) => {
    setSelectedColumn(column);
    if (selectedPlaceholder) {
      onMapColumn(column, selectedPlaceholder);
      setSelectedPlaceholder(null);
    } else {
      setShowMappingDialog(true);
    }
  };

  /**
   * 手动映射
   */
  const handleManualMap = () => {
    if (selectedPlaceholder && selectedColumn) {
      onMapPlaceholder(selectedPlaceholder, selectedColumn);
      setSelectedPlaceholder(null);
      setSelectedColumn(false as unknown as string);
      setShowMappingDialog(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-gray-200 bg-yellow-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-medium text-yellow-900">未映射字段</h3>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded">
              {unmappedPlaceholders.length} 个占位符
            </span>
            <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded">
              {unmappedColumns.length} 个列
            </span>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {unmappedPlaceholders.length === 0 && unmappedColumns.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">所有字段已映射</h3>
            <p className="mt-1 text-sm text-gray-500">所有模板占位符和Excel列都已建立映射关系</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 未映射占位符 */}
            {unmappedPlaceholders.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  未映射的模板占位符
                </h4>
                <div className="space-y-2">
                  {unmappedPlaceholders.map((placeholder, index) => (
                    <div
                      key={index}
                      onClick={() => handlePlaceholderClick(placeholder)}
                      className={`
                        group flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${selectedPlaceholder === placeholder
                          ? 'border-yellow-400 bg-yellow-50'
                          : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                        }
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {placeholder}
                          </span>
                          <span className="text-xs text-gray-400">模板占位符</span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 未映射列 */}
            {unmappedColumns.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  未映射的Excel列
                </h4>
                <div className="space-y-2">
                  {unmappedColumns.map((column, index) => (
                    <div
                      key={index}
                      onClick={() => handleColumnClick(column)}
                      className={`
                        group flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${selectedColumn === column
                          ? 'border-gray-400 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {column}
                          </span>
                          <span className="text-xs text-gray-400">Excel列</span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 映射提示 */}
        {(unmappedPlaceholders.length > 0 || unmappedColumns.length > 0) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900">快速映射指南</h4>
                <p className="mt-1 text-xs text-blue-700">
                  点击任意未映射字段可快速建立映射关系。也可以点击"AI智能匹配"让系统自动匹配相似字段。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 映射对话框 */}
      {showMappingDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowMappingDialog(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">手动映射字段</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    选择模板占位符
                  </label>
                  <select
                    value={selectedPlaceholder || ''}
                    onChange={(e) => setSelectedPlaceholder(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择...</option>
                    {unmappedPlaceholders.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    选择Excel列
                  </label>
                  <select
                    value={selectedColumn || ''}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择...</option>
                    {unmappedColumns.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowMappingDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleManualMap}
                  disabled={!selectedPlaceholder || !selectedColumn}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  确认映射
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
