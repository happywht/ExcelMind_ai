/**
 * 问题等级徽章组件
 *
 * 显示数据质量问题的严重程度徽章
 *
 * @version 2.0.0
 */

import React from 'react';
import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface IssueBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
  count?: number;
  showIcon?: boolean;
  className?: string;
}

const IssueBadge: React.FC<IssueBadgeProps> = ({
  severity,
  count,
  showIcon = true,
  className
}) => {
  const config = {
    critical: {
      label: '严重',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      icon: XCircle,
    },
    high: {
      label: '高',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      icon: AlertCircle,
    },
    medium: {
      label: '中',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
      icon: AlertTriangle,
    },
    low: {
      label: '低',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      icon: Info,
    },
  };

  const current = config[severity];
  const Icon = current.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        current.bgColor,
        current.textColor,
        current.borderColor,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{current.label}</span>
      {count !== undefined && (
        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/50 font-bold">
          {count}
        </span>
      )}
    </span>
  );
};

export default IssueBadge;
