/**
 * 模式切换器
 * 在数据处理模式和质量检查模式之间切换
 */

import React from 'react';
import { RotateCcw, CheckSquare } from 'lucide-react';

export type WorkMode = 'processing' | 'quality';

interface ModeSwitcherProps {
  currentMode: WorkMode;
  onModeChange: (mode: WorkMode) => void;
  disabled?: boolean;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({
  currentMode,
  onModeChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
      <button
        onClick={() => onModeChange('processing')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all
          ${currentMode === 'processing'
            ? 'bg-white text-emerald-700 shadow-sm'
            : 'text-slate-600 hover:bg-slate-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title="数据处理模式：使用AI进行数据转换、合并等操作"
      >
        <RotateCcw className="w-4 h-4" />
        数据处理模式
      </button>

      <button
        onClick={() => onModeChange('quality')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all
          ${currentMode === 'quality'
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-slate-600 hover:bg-slate-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title="质量检查模式：使用规则检查数据质量"
      >
        <CheckSquare className="w-4 h-4" />
        质量检查模式
      </button>
    </div>
  );
};

export default ModeSwitcher;
