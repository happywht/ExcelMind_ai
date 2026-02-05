import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * 加载状态组件
 *
 * 功能特性：
 * 1. 美观的加载动画
 * 2. 响应式布局
 * 3. 使用项目设计令牌
 * 4. 支持自定义加载文本
 */
interface LoadingFallbackProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = '加载中...',
  size = 'lg'
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-center space-y-4">
        {/* 旋转加载器 */}
        <Loader2 className={`${sizeClasses[size]} text-emerald-500 animate-spin mx-auto`} />

        {/* 加载文本 */}
        <p className={`${textSizeClasses[size]} text-slate-600 font-medium`}>
          {message}
        </p>

        {/* 进度提示 */}
        <div className="space-y-2">
          <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full animate-pulse" />
          </div>
          <p className="text-xs text-slate-400">
            正在加载资源，请稍候...
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * 骨架屏组件
 * 用于内容加载时显示占位符
 */
export const SkeletonCard: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      ))}
    </div>
  );
};

/**
 * 内联加载组件
 * 用于组件内部的加载状态
 */
export const InlineLoader: React.FC<{ message?: string }> = ({ message = '处理中...' }) => {
  return (
    <div className="flex items-center justify-center p-8 space-x-3">
      <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
      <span className="text-sm text-slate-600">{message}</span>
    </div>
  );
};

export default LoadingFallback;
