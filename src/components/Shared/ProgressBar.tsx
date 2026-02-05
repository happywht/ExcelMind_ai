/**
 * 进度条组件
 *
 * 显示任务进度的通用进度条
 *
 * @version 2.0.0
 */

import React from 'react';
import { cn } from '../../utils/cn';

interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'orange' | 'red';
  showLabel?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  color = 'blue',
  showLabel = false,
  label,
  className,
  animated = true
}) => {
  const normalizedProgress = Math.max(0, Math.min(100, progress));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showLabel) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-slate-700">{label}</span>
          )}
          {showLabel && (
            <span className="text-sm font-medium text-slate-600">
              {Math.round(normalizedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className={cn(
        'w-full bg-slate-200 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            colorClasses[color],
            animated && 'animate-pulse'
          )}
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
