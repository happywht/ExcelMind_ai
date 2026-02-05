/**
 * 状态指示器组件
 *
 * 显示任务状态的指示器
 *
 * @version 2.0.0
 */

import React from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, Pause, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

type Status = 'loading' | 'success' | 'error' | 'pending' | 'paused' | 'warning';

interface StatusIndicatorProps {
  status: Status;
  text?: string;
  size?: number;
  className?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  text,
  size = 16,
  className
}) => {
  const config = {
    loading: {
      icon: Loader2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      spin: true,
    },
    success: {
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
      spin: false,
    },
    error: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      spin: false,
    },
    pending: {
      icon: Clock,
      color: 'text-slate-400',
      bgColor: 'bg-slate-50',
      spin: false,
    },
    paused: {
      icon: Pause,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      spin: false,
    },
    warning: {
      icon: AlertCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      spin: false,
    },
  };

  const current = config[status];
  const Icon = current.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Icon
        className={cn(current.color, current.spin && 'animate-spin')}
        style={{ width: size, height: size }}
      />
      {text && (
        <span className={cn('text-sm font-medium', current.color)}>
          {text}
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;
