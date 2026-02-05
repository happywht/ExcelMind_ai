/**
 * AI自动映射按钮
 *
 * 触发AI自动生成映射方案
 */

import React from 'react';

/**
 * 组件属性
 */
export interface AutoMapButtonProps {
  loading?: boolean;
  disabled?: boolean;
  onAutoMap: () => void;
}

/**
 * AI自动映射按钮
 */
export const AutoMapButton: React.FC<AutoMapButtonProps> = ({
  loading = false,
  disabled = false,
  onAutoMap
}) => {
  return (
    <button
      onClick={onAutoMap}
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg
        transition-all duration-200
        ${disabled || loading
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg'
        }
      `}
    >
      {/* AI图标 */}
      <span className="mr-2">
        {loading ? (
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
        )}
      </span>

      {/* 按钮文本 */}
      <span>
        {loading ? 'AI正在分析...' : 'AI自动映射'}
      </span>

      {/* 加载动画 */}
      {loading && (
        <span className="ml-2 flex space-x-0.5">
          <span className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
          <span className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
          <span className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
        </span>
      )}

      {/* 发光效果 */}
      {!disabled && !loading && (
        <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 animate-pulse" />
      )}
    </button>
  );
};
