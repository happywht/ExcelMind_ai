# ExcelMind AI - 统一组件库设计规范

## 📋 目录

1. [Button（按钮）](#button按钮)
2. [Input（输入框）](#input输入框)
3. [Card（卡片）](#card卡片)
4. [Modal（模态框）](#modal模态框)
5. [Loading（加载状态）](#loading加载状态)
6. [Toast（提示消息）](#toast提示消息)

---

## Button（按钮）

### 类型（Variants）

#### Primary Button（主按钮）

**用途**：主要操作，如提交、确认、保存等

```tsx
<Button variant="primary" size="md">
  确认提交
</Button>
```

**样式规范**：
```
Background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)
Text Color: white
Border Radius: 8px (rounded-lg)
Padding: 10px 20px
Height: 40px
Font Size: 14px
Font Weight: 500 (medium)
Shadow: 0 1px 2px rgba(0, 0, 0, 0.05)
```

**交互状态**：
```tsx
// 悬停
hover:bg-blue-600
hover:shadow-md
hover:-translate-y-0.5

// 激活
active:scale-95

// 焦点
focus:ring-2 focus:ring-blue-500 focus:ring-offset-2

// 禁用
disabled:opacity-50
disabled:cursor-not-allowed
```

#### Secondary Button（次按钮）

**用途**：次要操作，如取消、返回等

```tsx
<Button variant="secondary" size="md">
  取消
</Button>
```

**样式规范**：
```
Background: white
Border: 1px solid #e2e8f0 (slate-200)
Text Color: #334155 (slate-700)
Border Radius: 8px
Padding: 10px 20px
Height: 40px
Font Size: 14px
Font Weight: 500
```

**交互状态**：
```tsx
hover:bg-slate-50
hover:border-slate-300
active:scale-95
focus:ring-2 focus:ring-slate-400 focus:ring-offset-2
```

#### Danger Button（危险按钮）

**用途**：破坏性操作，如删除、移除等

```tsx
<Button variant="danger" size="md">
  删除
</Button>
```

**样式规范**：
```
Background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%)
Text Color: white
Border Radius: 8px
Padding: 10px 20px
Height: 40px
Font Size: 14px
Font Weight: 500
```

#### Ghost Button（幽灵按钮）

**用途**：轻量操作，如关闭、跳过等

```tsx
<Button variant="ghost" size="md">
  关闭
</Button>
```

**样式规范**：
```
Background: transparent
Text Color: #64748b (slate-500)
Border Radius: 8px
Padding: 10px 20px
Height: 40px
Font Size: 14px
Font Weight: 500
```

#### Icon Button（图标按钮）

**用途**：工具栏操作，如搜索、设置等

```tsx
<Button variant="icon" size="md" icon={<Search className="w-4 h-4" />} />
```

**样式规范**：
```
Background: transparent
Text Color: #64748b (slate-500)
Border Radius: 8px
Padding: 10px
Width: 40px
Height: 40px
```

### 尺寸（Sizes）

| 尺寸 | 高度 | 内边距 | 字号 | 图标大小 |
|------|------|--------|------|----------|
| sm | 32px | 6px 12px | 13px | 16px |
| md | 40px | 10px 20px | 14px | 18px |
| lg | 48px | 14px 24px | 16px | 20px |

### 状态（States）

```tsx
// 默认
<Button>默认状态</Button>

// 加载中
<Button loading>
  <Spinner className="mr-2" />
  处理中...
</Button>

// 禁用
<Button disabled>禁用状态</Button>

// 带图标
<Button icon={<Plus className="w-4 h-4 mr-2" />}>
  新建项目
</Button>

// 全宽
<Button fullWidth>全宽按钮</Button>
```

### 完整代码实现

```tsx
import React from 'react';
import { cn } from '../utils/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-400 active:scale-95',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500 shadow-sm hover:shadow-md active:scale-95',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:ring-slate-400 active:scale-95',
    icon: 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:ring-slate-400',
  };

  const sizeStyles = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-5 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  const iconSizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        variant !== 'icon' && 'rounded-lg',
        variant === 'icon' && 'rounded-lg p-2.5',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className={cn('animate-spin', icon && 'mr-2', iconSizeStyles[size])} />}
      {!loading && icon && <span className={cn(children && 'mr-2', iconSizeStyles[size])}>{icon}</span>}
      {children}
    </button>
  );
};
```

---

## Input（输入框）

### 类型（Variants）

#### Default Input（默认输入框）

```tsx
<Input placeholder="请输入内容" />
```

**样式规范**：
```
Background: white
Border: 1px solid #e2e8f0 (slate-200)
Border Radius: 8px
Padding: 10px 12px
Height: 40px
Font Size: 14px
Text Color: #0f172a (slate-900)
Placeholder Color: #94a3b8 (slate-400)
```

#### Input with Label（带标签）

```tsx
<Input label="用户名" placeholder="请输入用户名" />
```

#### Input with Icon（带图标）

```tsx
<Input
  placeholder="搜索"
  icon={<Search className="w-4 h-4 text-slate-400" />}
/>
```

#### Input with Error（错误状态）

```tsx
<Input
  placeholder="请输入邮箱"
  error="请输入有效的邮箱地址"
/>
```

#### Password Input（密码输入）

```tsx
<Input type="password" placeholder="请输入密码" />
```

### 尺寸（Sizes）

| 尺寸 | 高度 | 内边距 | 字号 |
|------|------|--------|------|
| sm | 32px | 6px 12px | 13px |
| md | 40px | 10px 12px | 14px |
| lg | 48px | 14px 12px | 16px |

### 状态（States）

```tsx
// 默认
<Input placeholder="默认状态" />

// 焦点
<Input placeholder="焦点状态" className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />

// 错误
<Input placeholder="错误状态" error="请输入有效内容" />

// 禁用
<Input placeholder="禁用状态" disabled />

// 成功
<Input placeholder="成功状态" success="用户名可用" />
```

### 完整代码实现

```tsx
import React from 'react';
import { cn } from '../utils/cn';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  success,
  icon,
  size = 'md',
  className,
  type = 'text',
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === 'password';

  const sizeStyles = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}

        <input
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={cn(
            'w-full rounded-lg border transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'placeholder:text-slate-400',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeStyles[size],
            icon && 'pl-10',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : success
              ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
              : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500',
            className
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}

        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
        )}

        {success && !error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {success && !error && (
        <p className="mt-1.5 text-sm text-green-600 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {success}
        </p>
      )}
    </div>
  );
};
```

---

## Card（卡片）

### 类型（Variants）

#### Default Card（默认卡片）

```tsx
<Card>
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
    <CardDescription>卡片描述文本</CardDescription>
  </CardHeader>
  <CardContent>
    卡片内容区域
  </CardContent>
  <CardFooter>
    <Button>操作按钮</Button>
  </CardFooter>
</Card>
```

#### Interactive Card（交互卡片）

```tsx
<InteractiveCard onClick={handleClick}>
  <InteractiveCardHeader>
    <InteractiveCardTitle>可点击的卡片</InteractiveCardTitle>
  </InteractiveCardHeader>
  <InteractiveCardContent>
    点击此卡片执行操作
  </InteractiveCardContent>
</InteractiveCard>
```

### 样式规范

```
Background: white
Border: 1px solid #e2e8f0 (slate-200)
Border Radius: 16px (rounded-2xl)
Padding: 32px (p-8)
Shadow: 0 1px 2px rgba(0, 0, 0, 0.05)
```

### 交互状态

```tsx
// 悬停
hover:shadow-xl
hover:-translate-y-1

// 焦点
focus:ring-2 focus:ring-blue-500 focus:ring-offset-2

// 点击
active:scale-98
```

### 完整代码实现

```tsx
import React from 'react';
import { cn } from '../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200 shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn('p-6 pb-4', className)}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className }) => {
  return (
    <h3 className={cn('text-lg font-semibold text-slate-900', className)}>
      {children}
    </h3>
  );
};

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className }) => {
  return (
    <p className={cn('text-sm text-slate-500 mt-1', className)}>
      {children}
    </p>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => {
  return (
    <div className={cn('p-6 pt-0', className)}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => {
  return (
    <div className={cn('p-6 pt-0 flex items-center gap-2', className)}>
      {children}
    </div>
  );
};

// 交互式卡片
interface InteractiveCardProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  children,
  onClick,
  className,
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'group bg-white rounded-2xl border border-slate-200 shadow-sm',
        'cursor-pointer transition-all duration-300',
        'hover:shadow-xl hover:-translate-y-1',
        'active:scale-98',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
    >
      {children}
    </div>
  );
};

export const InteractiveCardHeader = CardHeader;
export const InteractiveCardContent = CardContent;
export const InteractiveCardTitle = CardTitle;
```

---

## Modal（模态框）

### 类型（Variants）

#### Default Modal（默认模态框）

```tsx
<Modal open={open} onClose={handleClose}>
  <ModalHeader>
    <ModalTitle>模态框标题</ModalTitle>
  </ModalHeader>
  <ModalBody>
    模态框内容区域
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={handleClose}>
      取消
    </Button>
    <Button onClick={handleConfirm}>
      确认
    </Button>
  </ModalFooter>
</Modal>
```

#### Confirm Modal（确认对话框）

```tsx
<ConfirmModal
  open={open}
  title="确认删除"
  message="此操作无法撤销，确定要删除吗？"
  confirmText="删除"
  cancelText="取消"
  onConfirm={handleConfirm}
  onCancel={handleClose}
/>
```

### 样式规范

```
Overlay Background: rgba(15, 23, 42, 0.5) (black/50)
Modal Background: white
Modal Border Radius: 16px (rounded-2xl)
Modal Max Width: 560px (max-w-lg)
Modal Padding: 32px (p-8)
Modal Shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)
```

### 动画效果

```tsx
// 淡入
animation: fadeIn 200ms ease-out

// 缩放
animation: scaleIn 200ms ease-out
```

### 完整代码实现

```tsx
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // 禁止背景滚动
      document.body.style.overflow = 'hidden';
      // 聚焦到模态框
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* 模态框内容 */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          'relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto',
          'animate-in zoom-in-95 fade-in duration-200',
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn('p-6 pb-4', className)}>
      {children}
    </div>
  );
};

interface ModalTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalTitle: React.FC<ModalTitleProps> = ({ children, className }) => {
  return (
    <h2 className={cn('text-xl font-semibold text-slate-900', className)}>
      {children}
    </h2>
  );
};

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className }) => {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
};

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => {
  return (
    <div className={cn('p-6 pt-0 flex items-center justify-end gap-2', className)}>
      {children}
    </div>
  );
};

// 带关闭按钮的模态框头
export const ModalHeaderWithClose: React.FC<{
  title: string;
  onClose: () => void;
}> = ({ title, onClose }) => {
  return (
    <div className="flex items-center justify-between p-6 pb-4">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
```

---

## Loading（加载状态）

### 类型（Variants）

#### Spinner（圆形加载器）

```tsx
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />
```

#### Progress Bar（进度条）

```tsx
<Progress value={33} size="sm" />
<Progress value={66} size="md" />
<Progress value={100} size="lg" />
```

#### Skeleton（骨架屏）

```tsx
<Skeleton className="h-4 w-full" />
<Skeleton className="h-10 w-10 rounded-full" />
<Skeleton className="h-32 w-full rounded-lg" />
```

#### Fullscreen Loading（全屏加载）

```tsx
<FullscreenLoading>
  <Spinner size="lg" />
  <p className="mt-4 text-slate-600">加载中...</p>
</FullscreenLoading>
```

### 样式规范

#### Spinner

| 尺寸 | 大小 | 边框宽度 |
|------|------|----------|
| sm | 16px | 2px |
| md | 24px | 3px |
| lg | 32px | 3px |

```tsx
color: #3b82f6 (blue-500)
animation: spin 1s linear infinite
```

#### Progress Bar

| 尺寸 | 高度 |
|------|------|
| sm | 4px |
| md | 8px |
| lg | 12px |

```tsx
background: #e2e8f0 (slate-200)
fill: #3b82f6 (blue-500)
border-radius: 9999px
transition: width 300ms ease-out
```

### 完整代码实现

```tsx
import React from 'react';
import { cn } from '../utils/cn';
import { Loader2 } from 'lucide-react';

// Spinner
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-3',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={cn(
        'border-blue-500 border-t-transparent rounded-full animate-spin',
        sizeStyles[size],
        className
      )}
    />
  );
};

// Progress Bar
interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  className,
}) => {
  const percentage = (value / max) * 100;

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full bg-slate-200 rounded-full overflow-hidden', sizeStyles[size], className)}>
      <div
        className="h-full bg-blue-500 transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

// Skeleton
interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn('bg-slate-200 animate-pulse rounded', className)}
      aria-hidden="true"
    />
  );
};

// Fullscreen Loading
interface FullscreenLoadingProps {
  children: React.ReactNode;
  className?: string;
}

export const FullscreenLoading: React.FC<FullscreenLoadingProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm',
        className
      )}
    >
      {children}
    </div>
  );
};

// 加载按钮
export const ButtonWithLoading: React.FC<{
  loading: boolean;
  children: React.ReactNode;
}> = ({ loading, children }) => {
  return (
    <button disabled={loading} className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      )}
      <span className={loading && 'opacity-0'}>{children}</span>
    </button>
  );
};
```

---

## Toast（提示消息）

### 类型（Variants）

```tsx
// 成功
<Toast type="success" message="操作成功" />

// 错误
<Toast type="error" message="操作失败" />

// 警告
<Toast type="warning" message="请注意" />

// 信息
<Toast type="info" message="提示信息" />

// 带操作
<Toast
  type="info"
  message="文件已准备好"
  action={{
    label: "下载",
    onClick: handleDownload,
  }}
/>
```

### 样式规范

```
Border Radius: 8px (rounded-lg)
Padding: 12px 16px
Shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
Duration: 3000ms (auto-dismiss)
Animation: slide-in-right + fade-in (200ms)
```

### 颜色规范

| 类型 | 背景色 | 图标颜色 |
|------|--------|----------|
| success | bg-green-50 | text-green-500 |
| error | bg-red-50 | text-red-500 |
| warning | bg-yellow-50 | text-yellow-500 |
| info | bg-blue-50 | text-blue-500 |

### 完整代码实现

```tsx
import React, { useEffect } from 'react';
import { cn } from '../utils/cn';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  type,
  message,
  duration = 3000,
  action,
  onClose,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeStyles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-500',
      iconComponent: CheckCircle2,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-500',
      iconComponent: XCircle,
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-500',
      iconComponent: AlertTriangle,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-500',
      iconComponent: Info,
    },
  };

  const styles = typeStyles[type];
  const IconComponent = styles.iconComponent;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
        'animate-in slide-in-from-right-full fade-in duration-200',
        styles.bg,
        styles.border
      )}
    >
      <IconComponent className={cn('w-5 h-5 flex-shrink-0 mt-0.5', styles.icon)} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{message}</p>
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex-shrink-0"
        >
          {action.label}
        </button>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Toast容器
export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {children}
    </div>
  );
};
```

---

## 📚 使用指南

### 安装依赖

确保项目已安装必要的依赖：

```bash
npm install lucide-react
npm install clsx tailwind-merge
```

### 创建工具函数

创建 `src/utils/cn.ts` 用于合并类名：

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 导入使用

```tsx
import { Button, Input, Card, Modal, Spinner, Toast } from '@/components/ui';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>示例标题</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="请输入内容" />
        <Button className="mt-4">提交</Button>
      </CardContent>
    </Card>
  );
}
```

---

**文档版本**: v1.0
**最后更新**: 2026-01-25
**维护者**: ExcelMind AI Team
