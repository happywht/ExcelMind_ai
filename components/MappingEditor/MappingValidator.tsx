/**
 * 映射验证器
 *
 * 显示映射验证结果，包括错误和警告信息
 */

import React from 'react';

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
 * 组件属性
 */
export interface MappingValidatorProps {
  validationResult: ValidationResult;
  onClose?: () => void;
}

/**
 * 映射验证器组件
 */
export const MappingValidator: React.FC<MappingValidatorProps> = ({
  validationResult,
  onClose
}) => {
  const { valid, errors, warnings, unmappedCount, mappedCount } = validationResult;

  return (
    <div className={`
      rounded-lg border p-4
      ${valid
        ? 'bg-green-50 border-green-200'
        : errors.length > 0
          ? 'bg-red-50 border-red-200'
          : 'bg-yellow-50 border-yellow-200'
      }
    `}>
      {/* 标题栏 */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {/* 状态图标 */}
          {valid ? (
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          ) : errors.length > 0 ? (
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          )}

          {/* 状态文本 */}
          <div>
            <h4 className={`
              text-sm font-medium
              ${valid
                ? 'text-green-900'
                : errors.length > 0
                  ? 'text-red-900'
                  : 'text-yellow-900'
              }
            `}>
              {valid ? '映射验证通过' : errors.length > 0 ? '映射验证失败' : '映射存在警告'}
            </h4>
            <p className={`
              text-sm mt-1
              ${valid
                ? 'text-green-700'
                : errors.length > 0
                  ? 'text-red-700'
                  : 'text-yellow-700'
              }
            `}>
              {mappedCount} 个占位符已映射
              {unmappedCount > 0 && `，${unmappedCount} 个未映射`}
            </p>
          </div>
        </div>

        {/* 关闭按钮 */}
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 统计信息 */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-900">{mappedCount}</div>
          <div className="text-xs text-gray-500 mt-1">已映射</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-semibold ${
            unmappedCount > 0 ? 'text-yellow-600' : 'text-gray-400'
          }`}>
            {unmappedCount}
          </div>
          <div className="text-xs text-gray-500 mt-1">未映射</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-semibold ${
            valid ? 'text-green-600' : 'text-red-600'
          }`}>
            {errors.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">错误</div>
        </div>
      </div>

      {/* 错误列表 */}
      {errors.length > 0 && (
        <div className="mt-4">
          <h5 className="text-xs font-medium text-red-900 uppercase tracking-wider mb-2">
            错误 ({errors.length})
          </h5>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm text-red-700">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 警告列表 */}
      {warnings.length > 0 && (
        <div className="mt-4">
          <h5 className="text-xs font-medium text-yellow-900 uppercase tracking-wider mb-2">
            警告 ({warnings.length})
          </h5>
          <ul className="space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm text-yellow-700">
                <svg className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 操作建议 */}
      {!valid && (
        <div className="mt-4 p-3 bg-white bg-opacity-50 rounded border border-current border-opacity-20">
          <h5 className="text-xs font-medium text-gray-900 mb-2">建议操作:</h5>
          <ul className="space-y-1 text-xs text-gray-700">
            {errors.length > 0 && (
              <li>• 检查并修复所有错误项</li>
            )}
            {unmappedCount > 0 && (
              <li>• 为未映射的占位符建立映射关系</li>
            )}
            <li>• 运行"AI自动映射"智能匹配字段</li>
          </ul>
        </div>
      )}
    </div>
  );
};
