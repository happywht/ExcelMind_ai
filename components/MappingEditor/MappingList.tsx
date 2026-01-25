/**
 * 映射列表组件
 *
 * 显示所有字段映射关系，支持拖拽排序、编辑和删除
 */

import React, { useState } from 'react';
import { FieldMapping } from '../../types/documentTypes';

/**
 * 组件属性
 */
export interface MappingListProps {
  mappings: FieldMapping[];
  excelHeaders: string[];
  templatePlaceholders: string[];
  onMappingChange: (index: number, mapping: FieldMapping) => void;
  onMappingDelete: (index: number) => void;
  onMappingReorder: (fromIndex: number, toIndex: number) => void;
  onMappingEdit: (index: number) => void;
  readonly?: boolean;
}

/**
 * 映射列表组件
 */
export const MappingList: React.FC<MappingListProps> = ({
  mappings,
  excelHeaders,
  templatePlaceholders,
  onMappingChange,
  onMappingDelete,
  onMappingReorder,
  onMappingEdit,
  readonly = false
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  /**
   * 处理拖拽开始
   */
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  /**
   * 处理拖拽结束
   */
  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      onMappingReorder(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  /**
   * 验证映射状态
   */
  const getMappingStatus = (mapping: FieldMapping): 'valid' | 'warning' | 'error' => {
    // 检查占位符是否有效
    if (!templatePlaceholders.includes(mapping.placeholder)) {
      return 'error';
    }

    // 检查Excel列是否存在
    if (!excelHeaders.includes(mapping.excelColumn)) {
      return 'error';
    }

    // 检查转换函数
    if (mapping.transform) {
      try {
        new Function('value', `return ${mapping.transform}`);
      } catch {
        return 'error';
      }
    }

    return 'valid';
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  /**
   * 渲染映射项
   */
  const renderMappingItem = (mapping: FieldMapping, index: number) => {
    const status = getMappingStatus(mapping);
    const isDragging = draggedIndex === index;
    const isDragOver = dragOverIndex === index;

    return (
      <div
        key={index}
        draggable={!readonly}
        onDragStart={() => handleDragStart(index)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, index)}
        className={`
          group relative flex items-center justify-between p-4 border-b border-gray-100
          transition-all duration-200
          ${isDragging ? 'opacity-50 bg-blue-50' : ''}
          ${isDragOver ? 'border-t-2 border-t-blue-500' : ''}
          ${!readonly ? 'hover:bg-gray-50 cursor-move' : ''}
        `}
      >
        {/* 拖拽手柄 */}
        {!readonly && (
          <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          </div>
        )}

        {/* 映射内容 */}
        <div className="flex-1 flex items-center space-x-4 pl-8">
          {/* 占位符 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 truncate">
                {mapping.placeholder}
              </span>
              <span className="text-xs text-gray-400">→</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">模板占位符</div>
          </div>

          {/* 箭头 */}
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>

          {/* Excel列 */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {mapping.excelColumn}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Excel列</div>
          </div>

          {/* 转换函数 */}
          {mapping.transform && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-mono text-gray-700 truncate bg-gray-100 px-2 py-1 rounded">
                {mapping.transform}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">转换函数</div>
            </div>
          )}

          {/* 状态指示器 */}
          <div className="flex items-center space-x-2">
            {getStatusIcon(status)}
            <span className={`text-xs ${
              status === 'valid' ? 'text-green-600' :
              status === 'warning' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {status === 'valid' ? '已匹配' :
               status === 'warning' ? '警告' :
               '错误'}
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        {!readonly && (
          <div className="flex items-center space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onMappingEdit(index)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="编辑"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onMappingDelete(index)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="删除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  };

  if (mappings.length === 0) {
    return (
      <div className="p-12 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">暂无映射关系</h3>
        <p className="mt-1 text-sm text-gray-500">
          点击"AI自动映射"或手动添加映射关系
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {mappings.map((mapping, index) => renderMappingItem(mapping, index))}
    </div>
  );
};
