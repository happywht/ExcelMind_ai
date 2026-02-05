/**
 * 映射预览
 *
 * 显示映射应用后的数据预览
 */

import React from 'react';
import { MappingScheme } from '../../types/documentTypes';

/**
 * 组件属性
 */
export interface MappingPreviewProps {
  mappingScheme: MappingScheme;
  excelSampleData: any[];
}

/**
 * 映射预览组件
 */
export const MappingPreview: React.FC<MappingPreviewProps> = ({
  mappingScheme,
  excelSampleData
}) => {
  /**
   * 应用转换函数
   */
  const applyTransform = (value: any, transform?: string): string => {
    if (value === undefined || value === null) return '--';

    let result: any = value;

    if (transform) {
      try {
        const fn = new Function('value', `return ${transform}`);
        result = fn(value);
      } catch (error) {
        return `错误: ${error instanceof Error ? error.message : '未知错误'}`;
      }
    }

    return String(result);
  };

  /**
   * 获取数据类型指示器颜色
   */
  const getDataTypeColor = (value: any): string => {
    if (typeof value === 'number') return 'text-blue-600 bg-blue-50';
    if (typeof value === 'boolean') return 'text-purple-600 bg-purple-50';
    if (value instanceof Date) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  /**
   * 获取数据类型标签
   */
  const getDataTypeLabel = (value: any): string => {
    if (typeof value === 'number') return '数字';
    if (typeof value === 'boolean') return '布尔';
    if (value instanceof Date) return '日期';
    if (typeof value === 'string') return '文本';
    return '未知';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900">映射预览</h3>
          </div>
          <div className="text-xs text-gray-500">
            显示前 {Math.min(3, excelSampleData.length)} 行数据
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {excelSampleData.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">暂无数据预览</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 表头 */}
            <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="w-16 flex-shrink-0">行号</div>
              {mappingScheme.mappings.map((mapping, index) => (
                <div key={index} className="flex-1 min-w-0 px-2 truncate">
                  {mapping.placeholder}
                </div>
              ))}
            </div>

            {/* 数据行 */}
            {excelSampleData.slice(0, 3).map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="flex items-center py-2 border-t border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {/* 行号 */}
                <div className="w-16 flex-shrink-0 px-2 text-sm text-gray-500">
                  #{rowIndex + 1}
                </div>

                {/* 映射数据 */}
                {mappingScheme.mappings.map((mapping, mappingIndex) => {
                  const rawValue = row[mapping.excelColumn];
                  const transformedValue = applyTransform(rawValue, mapping.transform);
                  const isUnmapped = rawValue === undefined || rawValue === null;

                  return (
                    <div key={mappingIndex} className="flex-1 min-w-0 px-2">
                      <div className={`
                        relative p-2 rounded border transition-colors
                        ${isUnmapped
                          ? 'bg-gray-100 border-gray-200 text-gray-400'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                        }
                      `}>
                        {/* 值 */}
                        <div className={`
                          text-sm font-mono truncate
                          ${isUnmapped ? '' : 'text-gray-900'}
                        `}>
                          {transformedValue}
                        </div>

                        {/* 数据类型和转换信息 */}
                        {!isUnmapped && (
                          <div className="flex items-center justify-between mt-1">
                            {/* 数据类型 */}
                            <span className={`
                              text-xs px-1.5 py-0.5 rounded
                              ${getDataTypeColor(rawValue)}
                            `}>
                              {getDataTypeLabel(rawValue)}
                            </span>

                            {/* 转换指示器 */}
                            {mapping.transform && (
                              <span className="text-xs text-blue-600">
                                <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Excel列名 */}
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          {mapping.excelColumn}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* 图例 */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 bg-white border border-gray-300 rounded"></span>
              <span>已映射</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></span>
              <span>未映射</span>
            </div>
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>已转换</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
