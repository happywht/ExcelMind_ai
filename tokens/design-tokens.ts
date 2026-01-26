/**
 * ExcelMind AI - 设计令牌系统
 *
 * 完整的设计令牌定义，包括颜色、排版、间距等
 * 遵循 Tailwind CSS 的设计系统
 */

// ============================================
// 颜色系统 (Color System)
// ============================================

export const colors = {
  // 功能色 (Feature Colors)
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
    950: '#500724',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // 中性色 (Neutral Colors)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // 语义色 (Semantic Colors)
  success: {
    light: '#22c55e',
    DEFAULT: '#16a34a',
    dark: '#15803d',
  },
  error: {
    light: '#ef4444',
    DEFAULT: '#dc2626',
    dark: '#b91c1c',
  },
  warning: {
    light: '#eab308',
    DEFAULT: '#ca8a04',
    dark: '#a16207',
  },
  info: {
    light: '#0ea5e9',
    DEFAULT: '#0284c7',
    dark: '#0369a1',
  },
} as const;

// ============================================
// 渐变色系统 (Gradient System)
// ============================================

export const gradients = {
  // 功能卡片渐变
  emerald: 'from-emerald-50 to-transparent',
  blue: 'from-blue-50 to-transparent',
  purple: 'from-purple-50 to-transparent',
  orange: 'from-orange-50 to-transparent',
  cyan: 'from-cyan-50 to-transparent',
  pink: 'from-pink-50 to-transparent',
  amber: 'from-amber-50 to-transparent',

  // 悬停增强渐变
  emeraldHover: 'from-emerald-100/80 to-transparent',
  blueHover: 'from-blue-100/80 to-transparent',
  purpleHover: 'from-purple-100/80 to-transparent',
  orangeHover: 'from-orange-100/80 to-transparent',
  cyanHover: 'from-cyan-100/80 to-transparent',
  pinkHover: 'from-pink-100/80 to-transparent',
  amberHover: 'from-amber-100/80 to-transparent',

  // 按钮渐变
  primary: 'from-blue-500 to-blue-600',
  success: 'from-green-500 to-green-600',
  danger: 'from-red-500 to-red-600',
} as const;

// ============================================
// 排版系统 (Typography System)
// ============================================

export const typography = {
  // 字体家族
  fontFamily: {
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(', '),
    mono: [
      'JetBrains Mono',
      'Fira Code',
      'Consolas',
      'Monaco',
      'monospace',
    ].join(', '),
  },

  // 字号 (Font Sizes)
  fontSize: {
    h1: '2.5rem',      // 40px
    h2: '2rem',        // 32px
    h3: '1.5rem',      // 24px
    h4: '1.25rem',     // 20px
    h5: '1.125rem',    // 18px
    h6: '1rem',        // 16px
    body: '1rem',      // 16px
    bodySmall: '0.875rem', // 14px
    bodyXs: '0.75rem',     // 12px
    code: '0.875rem',      // 14px
    codeSmall: '0.75rem',  // 12px
  },

  // 行高 (Line Heights)
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  },

  // 字重 (Font Weights)
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

// ============================================
// 间距系统 (Spacing System)
// ============================================

export const spacing = {
  // 基础间距 (4px基准)
  0: '0',
  0.5: '2px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',

  // 应用规范
  cardPadding: {
    sm: '16px',
    md: '24px',
    lg: '32px',
  },
  elementGap: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  sectionGap: {
    sm: '24px',
    md: '32px',
    lg: '48px',
    xl: '64px',
  },
} as const;

// ============================================
// 圆角系统 (Border Radius System)
// ============================================

export const borderRadius = {
  none: '0',
  sm: '4px',
  DEFAULT: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const;

// ============================================
// 阴影系统 (Shadow System)
// ============================================

export const boxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

  // 彩色阴影
  emerald: '0 10px 15px -3px rgb(16 185 129 / 0.1)',
  blue: '0 10px 15px -3px rgb(59 130 246 / 0.1)',
  purple: '0 10px 15px -3px rgb(168 85 247 / 0.1)',
  orange: '0 10px 15px -3px rgb(249 115 22 / 0.1)',
  cyan: '0 10px 15px -3px rgb(6 182 212 / 0.1)',
  pink: '0 10px 15px -3px rgb(236 72 153 / 0.1)',
  amber: '0 10px 15px -3px rgb(245 158 11 / 0.1)',
} as const;

// ============================================
// 过渡动画系统 (Transition System)
// ============================================

export const transition = {
  duration: {
    fast: '150ms',
    DEFAULT: '200ms',
    normal: '300ms',
    slow: '500ms',
  },
  timing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================
// 响应式断点 (Breakpoints)
// ============================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================
// 功能卡片配置 (Feature Card Config)
// ============================================

export const featureCards = {
  smartProcessing: {
    id: 'smart-processing',
    title: '智能处理',
    description: '使用自然语言指令自动过滤、排序和转换您的 Excel 文件。',
    color: 'emerald',
    icon: 'Zap',
    status: 'hot',
    shortcut: '1',
  },
  formulaGenerator: {
    id: 'formula-generator',
    title: '公式生成器',
    description: '无需手动搜索。只需描述您的逻辑，即可一键复制生成的 Excel 公式。',
    color: 'blue',
    icon: 'Activity',
    status: 'default',
    shortcut: '2',
  },
  auditAssistant: {
    id: 'audit-assistant',
    title: '审计助手',
    description: '上传审计准则或财务政策文件，与您的专属知识库进行对话问答。',
    color: 'purple',
    icon: 'ShieldCheck',
    status: 'default',
    shortcut: '3',
  },
  documentSpace: {
    id: 'document-space',
    title: '文档空间',
    description: '智能填充Word模板，结合Excel数据和AI理解，批量生成文档。',
    color: 'orange',
    icon: 'FileEdit',
    status: 'new',
    shortcut: '4',
  },
  batchGeneration: {
    id: 'batch-generation',
    title: '批量生成',
    description: '批量处理文档生成任务，支持并发生成和实时进度跟踪。',
    color: 'cyan',
    icon: 'Package',
    status: 'new',
    shortcut: '5',
  },
  templateManagement: {
    id: 'template-management',
    title: '模板管理',
    description: '管理和编辑Word模板，支持变量映射和模板预览。',
    color: 'pink',
    icon: 'FolderOpen',
    status: 'new',
    shortcut: '6',
  },
  dataQuality: {
    id: 'data-quality',
    title: '数据质量',
    description: '智能数据质量检查，自动识别数据异常并提供清洗建议。',
    color: 'amber',
    icon: 'CheckCircle',
    status: 'new',
    shortcut: '7',
  },
} as const;

// ============================================
// Z-index 层级 (Z-index Scale)
// ============================================

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// ============================================
// 类型定义 (Type Definitions)
// ============================================

export type ColorName = keyof typeof colors;
export type FeatureCardColor = 'emerald' | 'blue' | 'purple' | 'orange' | 'cyan' | 'pink' | 'amber';
export type FeatureCardStatus = 'default' | 'new' | 'hot' | 'beta' | 'pro';
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type InputSize = 'sm' | 'md' | 'lg';
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// ============================================
// 工具函数 (Utility Functions)
// ============================================

/**
 * 获取功能卡片的颜色类名
 */
export function getFeatureCardColorClasses(color: FeatureCardColor) {
  const colorMap = {
    emerald: {
      icon: 'text-emerald-500',
      border: 'hover:border-emerald-500/30',
      gradient: 'from-emerald-50 to-transparent',
      gradientHover: 'hover:from-emerald-100',
      shadow: 'hover:shadow-emerald',
    },
    blue: {
      icon: 'text-blue-500',
      border: 'hover:border-blue-500/30',
      gradient: 'from-blue-50 to-transparent',
      gradientHover: 'hover:from-blue-100',
      shadow: 'hover:shadow-blue',
    },
    purple: {
      icon: 'text-purple-500',
      border: 'hover:border-purple-500/30',
      gradient: 'from-purple-50 to-transparent',
      gradientHover: 'hover:from-purple-100',
      shadow: 'hover:shadow-purple',
    },
    orange: {
      icon: 'text-orange-500',
      border: 'hover:border-orange-500/30',
      gradient: 'from-orange-50 to-transparent',
      gradientHover: 'hover:from-orange-100',
      shadow: 'hover:shadow-orange',
    },
    cyan: {
      icon: 'text-cyan-500',
      border: 'hover:border-cyan-500/30',
      gradient: 'from-cyan-50 to-transparent',
      gradientHover: 'hover:from-cyan-100',
      shadow: 'hover:shadow-cyan',
    },
    pink: {
      icon: 'text-pink-500',
      border: 'hover:border-pink-500/30',
      gradient: 'from-pink-50 to-transparent',
      gradientHover: 'hover:from-pink-100',
      shadow: 'hover:shadow-pink',
    },
    amber: {
      icon: 'text-amber-500',
      border: 'hover:border-amber-500/30',
      gradient: 'from-amber-50 to-transparent',
      gradientHover: 'hover:from-amber-100',
      shadow: 'hover:shadow-amber',
    },
  };

  return colorMap[color];
}

/**
 * 获取功能卡片的样式标签
 */
export function getFeatureCardStatusBadge(status: FeatureCardStatus) {
  const statusMap = {
    default: null,
    new: {
      text: 'NEW',
      className: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-2 py-1 rounded-md',
    },
    hot: {
      text: 'HOT',
      className: 'bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1',
      icon: '🔥',
    },
    beta: {
      text: 'BETA',
      className: 'border-2 border-dashed border-slate-300 text-slate-500 text-xs font-bold px-2 py-1 rounded-md',
    },
    pro: {
      text: 'PRO',
      className: 'bg-gradient-to-r from-amber-400 to-amber-600 text-white text-xs font-bold px-2 py-1 rounded-md',
    },
  };

  return statusMap[status];
}
