/**
 * 质量评分仪表盘组件
 *
 * 显示数据质量评分的圆形仪表盘
 *
 * @version 2.0.0
 */

import React from 'react';
import { cn } from '../../utils/cn';

interface QualityGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

const QualityGauge: React.FC<QualityGaugeProps> = ({
  score,
  size = 120,
  strokeWidth = 8,
  showLabel = true,
  className
}) => {
  const normalizedScore = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedScore / 100) * circumference;

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 75) return 'text-blue-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return '优秀';
    if (score >= 75) return '良好';
    if (score >= 60) return '中等';
    if (score >= 40) return '较差';
    return '差';
  };

  const scoreColor = getScoreColor(normalizedScore);
  const scoreLabel = getScoreLabel(normalizedScore);

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* 背景圆 */}
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-slate-200"
          />
          {/* 进度圆 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn('transition-all duration-700 ease-out', scoreColor)}
          />
        </svg>

        {/* 中心内容 */}
        {showLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-3xl font-bold', scoreColor)}>
              {Math.round(normalizedScore)}
            </span>
            <span className="text-xs text-slate-500 mt-1">{scoreLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default QualityGauge;
