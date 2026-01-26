/**
 * ExcelMind AI - 优化后的功能卡片组件
 *
 * 特性：
 * - 增强的视觉层次（状态标签、使用频率、最近使用时间）
 * - 流畅的交互体验（悬停动画、点击反馈、键盘快捷键）
 * - 完整的可访问性支持（焦点管理、屏幕阅读器）
 * - 响应式设计（移动端适配）
 */

import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../utils/cn';
import {
  getFeatureCardColorClasses,
  getFeatureCardStatusBadge,
  FeatureCardColor,
  FeatureCardStatus,
} from '../tokens/design-tokens';

// ============================================
// 类型定义
// ============================================

interface FeatureCardProps {
  /** 卡片标题 */
  title: string;
  /** 卡片描述 */
  description: string;
  /** 图标名称（Lucide图标） */
  icon: keyof typeof LucideIcons;
  /** 功能颜色 */
  color: FeatureCardColor;
  /** 功能状态 */
  status?: FeatureCardStatus;
  /** 键盘快捷键 */
  shortcut?: string;
  /** 使用频率（可选） */
  usageCount?: number;
  /** 最近使用时间（可选） */
  lastUsed?: string;
  /** 点击回调 */
  onClick: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============================================
// 辅助组件
// ============================================

/**
 * 功能状态徽章
 */
const StatusBadge: React.FC<{ status: FeatureCardStatus }> = ({ status }) => {
  const badge = getFeatureCardStatusBadge(status);
  if (!badge) return null;

  return (
    <div className={cn('absolute top-4 right-4 z-20', badge.className)}>
      {badge.icon && <span className="mr-1">{badge.icon}</span>}
      {badge.text}
    </div>
  );
};

/**
 * 使用频率徽章
 */
const UsageBadge: React.FC<{ count?: number }> = ({ count }) => {
  if (!count || count < 5) return null;

  let text = '';
  let className = '';

  if (count >= 50) {
    text = '常用';
    className = 'bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full';
  } else if (count >= 20) {
    text = `${count}次`;
    className = 'bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded-full';
  } else {
    text = `${count}次`;
    className = 'bg-slate-50 text-slate-500 text-xs font-medium px-2 py-1 rounded-full';
  }

  return <span className={className}>{text}</span>;
};

/**
 * 快捷键提示
 */
const ShortcutHint: React.FC<{ shortcut?: string }> = ({ shortcut }) => {
  if (!shortcut) return null;

  return (
    <div className="flex items-center gap-1 text-slate-400 text-xs">
      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-500 font-mono">
        {shortcut}
      </kbd>
      <span>打开</span>
    </div>
  );
};

// ============================================
// 主组件
// ============================================

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  color,
  status = 'default',
  shortcut,
  usageCount,
  lastUsed,
  onClick,
  disabled = false,
  className,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // 获取颜色类名
  const colorClasses = getFeatureCardColorClasses(color);
  // 使用类型断言来处理Lucide图标的动态访问
  const IconComponent = LucideIcons[icon] as React.ComponentType<{ className?: string }>;

  // 处理点击
  const handleClick = () => {
    if (disabled) return;

    // 点击动画序列
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);

    // 延迟执行回调，让动画完成
    setTimeout(() => {
      onClick();
    }, 100);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title} - ${description}${shortcut ? ` (快捷键: ${shortcut})` : ''}`}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={cn(
        // 基础样式
        'group relative bg-white p-6 rounded-2xl border border-slate-200',
        'transition-all duration-300 ease-out',
        'cursor-pointer overflow-hidden',

        // 悬停效果
        'hover:shadow-2xl hover:-translate-y-1',
        colorClasses.border,
        colorClasses.gradientHover,

        // 焦点状态
        isFocused && 'ring-2 ring-offset-2 ring-blue-500',

        // 点击动画
        isPressed && 'scale-95',

        // 禁用状态
        disabled && 'opacity-50 cursor-not-allowed hover:shadow-sm hover:translate-y-0',

        // 自定义类名
        className
      )}
    >
      {/* ==================== 背景装饰 ==================== */}
      <div
        className={cn(
          'absolute top-0 right-0 w-48 h-48 rounded-full',
          '-mr-16 -mt-16 transition-colors duration-300',
          'bg-gradient-to-br',
          colorClasses.gradient,
          'group-hover:opacity-80'
        )}
      />

      {/* ==================== 状态标签 ==================== */}
      <StatusBadge status={status} />

      {/* ==================== 主要内容 ==================== */}
      <div className="relative z-10">
        {/* 图标和快捷键 */}
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            {/* 图标背景 */}
            <div className="absolute inset-0 bg-current opacity-10 rounded-xl blur-xl" />

            {/* 图标 */}
            <IconComponent
              className={cn(
                'w-12 h-12 relative z-10 transition-transform duration-300',
                colorClasses.icon,
                'group-hover:scale-110 group-hover:rotate-3'
              )}
            />
          </div>

          <ShortcutHint shortcut={shortcut} />
        </div>

        {/* 标题和徽章 */}
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
            {title}
          </h3>
          <UsageBadge count={usageCount} />
        </div>

        {/* 描述 */}
        <p className="text-slate-500 text-sm leading-relaxed mb-4 group-hover:text-slate-600 transition-colors">
          {description}
        </p>

        {/* 底部信息 */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {/* 最近使用时间 */}
          {lastUsed && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <LucideIcons.Clock className="w-3 h-3" />
              {lastUsed}
            </span>
          )}

          {/* 进入按钮 */}
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium transition-all duration-200',
              colorClasses.icon.replace('text-', 'text-'),
              'group-hover:gap-2'
            )}
          >
            进入
            <LucideIcons.ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        </div>
      </div>

      {/* ==================== 装饰性边框动画 ==================== */}
      <div
        className={cn(
          'absolute bottom-0 left-0 h-0.5 bg-gradient-to-r',
          colorClasses.icon.replace('text-', 'from-').replace('-500', '-400'),
          'to-transparent transition-all duration-300 group-hover:w-full',
          'w-0'
        )}
      />
    </div>
  );
};

// ============================================
// 卡片网格容器
// ============================================

interface FeatureCardGridProps {
  children: React.ReactNode;
  className?: string;
}

export const FeatureCardGrid: React.FC<FeatureCardGridProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        // 基础网格布局
        'grid grid-cols-1 gap-6',

        // 响应式断点
        'sm:grid-cols-2',
        'lg:grid-cols-3',
        'xl:grid-cols-4',

        // 自定义类名
        className
      )}
    >
      {children}
    </div>
  );
};

// ============================================
// 使用示例
// ============================================

export const ExampleUsage: React.FC = () => {
  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">
          欢迎使用 ExcelMind AI
        </h1>
        <p className="text-xl text-slate-500">您的智能数据处理、财务与审计助手。</p>
      </div>

      <FeatureCardGrid>
        <FeatureCard
          title="智能处理"
          description="使用自然语言指令自动过滤、排序和转换您的 Excel 文件。"
          icon="Zap"
          color="emerald"
          status="hot"
          shortcut="1"
          usageCount={156}
          lastUsed="2小时前"
          onClick={() => logger.debug('打开智能处理')}
        />

        <FeatureCard
          title="公式生成器"
          description="无需手动搜索。只需描述您的逻辑，即可一键复制生成的 Excel 公式。"
          icon="Activity"
          color="blue"
          shortcut="2"
          usageCount={89}
          lastUsed="昨天"
          onClick={() => logger.debug('打开公式生成器')}
        />

        <FeatureCard
          title="审计助手"
          description="上传审计准则或财务政策文件，与您的专属知识库进行对话问答。"
          icon="ShieldCheck"
          color="purple"
          shortcut="3"
          usageCount={45}
          lastUsed="3天前"
          onClick={() => logger.debug('打开审计助手')}
        />

        <FeatureCard
          title="文档空间"
          description="智能填充Word模板，结合Excel数据和AI理解，批量生成文档。"
          icon="FileEdit"
          color="orange"
          status="new"
          shortcut="4"
          lastUsed="从未使用"
          onClick={() => logger.debug('打开文档空间')}
        />
      </FeatureCardGrid>
    </div>
  );
};

export default FeatureCard;
