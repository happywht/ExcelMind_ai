# ExcelMind AI - UI/UX 优化设计方案

## 📊 设计分析

### 当前状态评估

**优势**：
- ✅ 色彩系统清晰，7个功能模块使用不同颜色区分
- ✅ 卡片基础布局合理，使用响应式网格
- ✅ 悬停效果有渐变背景和边框变化
- ✅ 使用Lucide图标库，图标风格统一

**待优化问题**：
- ❌ **视觉层次不够丰富**：卡片只包含图标+标题+描述，缺乏更多视觉元素
- ❌ **交互反馈单一**：只有悬停效果，缺少点击反馈、加载状态等
- ❌ **布局不够灵活**：7个卡片在4列网格中最后一行只有1个，视觉不平衡
- ❌ **缺少元信息**：没有使用频率、最近使用时间、功能状态等信息
- ❌ **设计令牌缺失**：没有统一的颜色、间距、字体规范
- ❌ **组件库未标准化**：按钮、输入框等组件缺乏统一设计

---

## 🎨 任务1: 主界面卡片设计优化

### 1.1 视觉层次优化

#### 卡片信息层次重构

```
┌─────────────────────────────────────────────┐
│ [功能状态标签]          [功能图标]           │
│                                             │
│ 智能处理                        [使用频率]   │
│ 使用自然语言指令自动过滤、排序和转换          │
│                                             │
│ 最近使用: 2小时前          [→] 进入功能      │
└─────────────────────────────────────────────┘
```

**层次说明**：
1. **顶层**：功能状态（如"NEW"、"BETA"、"热门"）+ 功能图标
2. **中层**：功能标题 + 使用频率徽章
3. **底层**：功能描述 + 最近使用时间 + 行动按钮

#### 新增视觉元素

**功能状态标签**：
- **NEW** - 新功能：使用醒目的渐变背景
- **BETA** - 测试中：使用虚线边框
- **HOT** - 热门：添加火焰图标
- **PRO** - 专业版：使用金色徽章

**使用频率徽章**：
- 高频：显示"常用"标签
- 中频：显示使用次数
- 低频：不显示

**快速操作提示**：
- 键盘快捷键（如"按 1 打开"）
- 右键菜单提示

### 1.2 交互体验优化

#### 悬停状态增强

```css
/* 原有悬停效果 */
hover:shadow-xl hover:border-[color]/30

/* 优化后的悬停效果 */
hover:shadow-2xl hover:border-[color] hover:-translate-y-1
hover:from-[color]-50/80 (增强渐变)
```

**新增微动画**：
1. **图标动画**：悬停时图标轻微放大(1.1x) + 旋转
2. **边框动画**：边框颜色从左到右渐变填充
3. **阴影扩散**：阴影从下方向四周扩散
4. **卡片抬升**：整体向上移动4px

#### 点击反馈

```typescript
// 点击动画序列
const handleClick = () => {
  // 1. 瞬间缩小(0.95x)
  // 2. 快速回弹(1.05x)
  // 3. 恢复正常(1x)
  // 4. 页面切换
}
```

#### 加载状态

**骨架屏加载**：
```tsx
<div className="animate-pulse">
  <div className="h-10 w-10 bg-slate-200 rounded-lg mb-4"></div>
  <div className="h-6 w-24 bg-slate-200 rounded mb-2"></div>
  <div className="h-4 w-full bg-slate-200 rounded"></div>
</div>
```

**渐进式加载**：
1. 先显示卡片框架
2. 加载图标 → 加载标题 → 加载描述
3. 最后加载元信息（使用频率、时间）

### 1.3 布局优化

#### 网格布局重构

**当前问题**：7个卡片在4列网格中最后一行只有1个

**解决方案**：使用不规则网格

```
┌────────┬────────┬────────┬────────┐
│ 智能处理│ 公式生成│ 审计助手│ 文档空间│
│  2x1   │  1x1   │  1x1   │  1x1   │
├────────┼────────┼────────┼────────┤
│        │ 批量生成│ 模板管理│ 数据质量│
│        │  1x1   │  1x1   │  1x1   │
└────────┴────────┴────────┴────────┘
```

**响应式断点优化**：
```tsx
// 当前断点
grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

// 优化后的断点
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4
```

**特殊布局策略**：
- **智能处理**卡片：占据2x1位置（最重要的功能）
- **前4个卡片**：优先展示区域
- **新增3个卡片**：次级展示区域

#### 卡片分组

**按功能类型分组**：
```
┌─ 核心功能 ─────────────────────────┐
│ 智能处理 | 公式生成 | 审计助手      │
└───────────────────────────────────┘

┌─ 文档管理 ─────────────────────────┐
│ 文档空间 | 批量生成 | 模板管理      │
└───────────────────────────────────┘

┌─ 数据质量 ─────────────────────────┐
│ 数据质量                            │
└───────────────────────────────────┘
```

**分组样式**：
- 添加分组标题（小号、灰色）
- 组间添加更大间距（gap-8）
- 可折叠的分组区域

### 1.4 设计细节优化

#### 统一的设计参数

**圆角规范**：
```tsx
rounded-2xl // 卡片: 16px
rounded-xl  // 按钮: 12px
rounded-lg  // 输入框: 8px
rounded-md  // 标签: 6px
```

**阴影层级**：
```tsx
shadow-sm      // 默认状态
shadow-lg      // 悬停状态
shadow-2xl     // 激活状态
shadow-[0_0_0_2px] // 焦点状态
```

**间距系统**：
```tsx
p-8  // 卡片内边距: 32px
gap-6 // 卡片间距: 24px
mb-4 // 元素间距: 16px
mb-2 // 紧凑间距: 8px
```

#### 颜色对比度检查

**当前对比度**：
- 标题 `text-slate-800` vs `bg-white`: 对比度 > 7:1 ✅
- 描述 `text-slate-500` vs `bg-white`: 对比度 > 4.5:1 ✅
- 图标颜色 vs `bg-white`: 对比度 > 3:1 ⚠️

**优化方案**：
- 保持标题和描述颜色不变
- 增强图标颜色饱和度（使用500而不是400）
- 确保所有交互元素对比度 ≥ 3:1

#### 背景纹理添加

**微妙的网格背景**：
```css
background-image:
  linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px),
  linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px);
background-size: 20px 20px;
```

**装饰性图案**：
- 在主区域添加微妙的几何图案
- 使用SVG图案作为装饰元素
- 不影响可读性

---

## 🎯 任务2: 设计令牌系统建立

### 2.1 颜色系统

#### 主色（Primary）

```typescript
// 智能处理 - emerald
const emerald = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981', // 主色
  600: '#059669',
  700: '#047857',
  800: '#065f46',
  900: '#064e3b',
  950: '#022c22',
}

// 公式生成器 - blue
const blue = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6', // 主色
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
  950: '#172554',
}

// 审计助手 - purple
const purple = {
  50: '#faf5ff',
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',
  500: '#a855f7', // 主色
  600: '#9333ea',
  700: '#7e22ce',
  800: '#6b21a8',
  900: '#581c87',
  950: '#3b0764',
}

// 文档空间 - orange
const orange = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316', // 主色
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
  950: '#431407',
}

// 批量生成 - cyan
const cyan = {
  50: '#ecfeff',
  100: '#cffafe',
  200: '#a5f3fc',
  300: '#67e8f9',
  400: '#22d3ee',
  500: '#06b6d4', // 主色
  600: '#0891b2',
  700: '#0e7490',
  800: '#155e75',
  900: '#164e63',
  950: '#083344',
}

// 模板管理 - pink
const pink = {
  50: '#fdf2f8',
  100: '#fce7f3',
  200: '#fbcfe8',
  300: '#f9a8d4',
  400: '#f472b6',
  500: '#ec4899', // 主色
  600: '#db2777',
  700: '#be185d',
  800: '#9d174d',
  900: '#831843',
  950: '#500724',
}

// 数据质量 - amber
const amber = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b', // 主色
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
  950: '#451a03',
}
```

#### 中性色（Neutral）

```typescript
const slate = {
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
}
```

#### 语义色（Semantic）

```typescript
// 成功 - green
const success = {
  light: '#22c55e',
  DEFAULT: '#16a34a',
  dark: '#15803d',
}

// 错误 - red
const error = {
  light: '#ef4444',
  DEFAULT: '#dc2626',
  dark: '#b91c1c',
}

// 警告 - yellow
const warning = {
  light: '#eab308',
  DEFAULT: '#ca8a04',
  dark: '#a16207',
}

// 信息 - sky
const info = {
  light: '#0ea5e9',
  DEFAULT: '#0284c7',
  dark: '#0369a1',
}
```

#### 渐变色（Gradients）

```typescript
const gradients = {
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
}
```

### 2.2 排版系统

#### 字体家族

```typescript
const fontFamily = {
  sans: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  mono: [
    'JetBrains Mono',
    'Fira Code',
    'Consolas',
    'Monaco',
    'monospace',
  ],
}
```

#### 字号规范

```typescript
const fontSize = {
  // 标题
  h1: '2.5rem',    // 40px - 主页面标题
  h2: '2rem',      // 32px - 区块标题
  h3: '1.5rem',    // 24px - 卡片标题
  h4: '1.25rem',   // 20px - 子标题
  h5: '1.125rem',  // 18px - 小标题
  h6: '1rem',      // 16px - 最小标题

  // 正文
  body: '1rem',        // 16px - 正文
  bodySmall: '0.875rem', // 14px - 小正文
  bodyXs: '0.75rem',     // 12px - 超小正文

  // 代码
  code: '0.875rem',  // 14px - 代码
  codeSmall: '0.75rem', // 12px - 小代码
}
```

#### 行高规范

```typescript
const lineHeight = {
  tight: 1.25,    // 标题
  normal: 1.5,    // 正文
  relaxed: 1.75,  // 阅读文本
  loose: 2,       // 代码
}
```

#### 字重规范

```typescript
const fontWeight = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
}
```

### 2.3 间距系统

#### 4px基准间距

```typescript
const spacing = {
  0: '0',
  0.5: '2px',   // 0.125rem
  1: '4px',     // 0.25rem
  1.5: '6px',   // 0.375rem
  2: '8px',     // 0.5rem
  2.5: '10px',  // 0.625rem
  3: '12px',    // 0.75rem
  3.5: '14px',  // 0.875rem
  4: '16px',    // 1rem
  5: '20px',    // 1.25rem
  6: '24px',    // 1.5rem
  7: '28px',    // 1.75rem
  8: '32px',    // 2rem
  9: '36px',    // 2.25rem
  10: '40px',   // 2.5rem
  12: '48px',   // 3rem
  16: '64px',   // 4rem
  20: '80px',   // 5rem
  24: '96px',   // 6rem
}
```

#### 应用规范

```typescript
// 卡片内边距
const cardPadding = {
  sm: '16px',   // p-4
  md: '24px',   // p-6
  lg: '32px',   // p-8
}

// 元素间距
const elementGap = {
  xs: '8px',    // gap-2
  sm: '12px',   // gap-3
  md: '16px',   // gap-4
  lg: '24px',   // gap-6
  xl: '32px',   // gap-8
}

// 分区间距
const sectionGap = {
  sm: '24px',   // mb-6
  md: '32px',   // mb-8
  lg: '48px',   // mb-12
  xl: '64px',   // mb-16
}
```

### 2.4 其他设计元素

#### 圆角规范

```typescript
const borderRadius = {
  none: '0',
  sm: '4px',      // rounded-sm - 小元素
  DEFAULT: '6px', // rounded - 默认
  md: '8px',      // rounded-md - 中等元素
  lg: '12px',     // rounded-lg - 大元素
  xl: '16px',     // rounded-xl - 卡片
  '2xl': '20px',  // rounded-2xl - 大卡片
  '3xl': '24px',  // rounded-3xl - 模态框
  full: '9999px', // rounded-full - 圆形
}
```

#### 阴影层级

```typescript
const boxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

  // 彩色阴影
  'emerald': '0 10px 15px -3px rgb(16 185 129 / 0.1)',
  'blue': '0 10px 15px -3px rgb(59 130 246 / 0.1)',
  'purple': '0 10px 15px -3px rgb(168 85 247 / 0.1)',
  'orange': '0 10px 15px -3px rgb(249 115 22 / 0.1)',
  'cyan': '0 10px 15px -3px rgb(6 182 212 / 0.1)',
  'pink': '0 10px 15px -3px rgb(236 72 153 / 0.1)',
  'amber': '0 10px 15px -3px rgb(245 158 11 / 0.1)',
}
```

#### 过渡动画时长

```typescript
const transitionDuration = {
  fast: '150ms',
  DEFAULT: '200ms',
  normal: '300ms',
  slow: '500ms',
}

const transitionTiming = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
}
```

---

## 🧩 任务3: 统一组件库设计规范

### 3.1 Button（按钮）

#### 类型

```tsx
// 主按钮
<Button variant="primary" size="md">
  确认
</Button>

// 次按钮
<Button variant="secondary" size="md">
  取消
</Button>

// 危险按钮
<Button variant="danger" size="md">
  删除
</Button>

// 幽灵按钮
<Button variant="ghost" size="md">
  关闭
</Button>

// 图标按钮
<Button variant="icon" size="md">
  <Icon name="search" />
</Button>
```

#### 尺寸

```tsx
// 小按钮
<Button size="sm">按钮</Button>
// height: 32px, padding: 6px 12px, font-size: 14px

// 中按钮
<Button size="md">按钮</Button>
// height: 40px, padding: 10px 16px, font-size: 14px

// 大按钮
<Button size="lg">按钮</Button>
// height: 48px, padding: 14px 20px, font-size: 16px
```

#### 状态

```tsx
// 默认状态
<Button>默认</Button>

// 悬停状态
<Button className="hover:bg-blue-600">悬停</Button>

// 激活状态
<Button className="active:scale-95">激活</Button>

// 禁用状态
<Button disabled>禁用</Button>

// 加载状态
<Button loading>
  <Spinner />
  处理中...
</Button>
```

#### 完整规范

| 属性 | 值 |
|------|-----|
| Border Radius | 8px (rounded-lg) |
| Font Weight | 500 (font-medium) |
| Transition | all 200ms cubic-bezier(0.4, 0, 0.2, 1) |
| Focus Ring | shadow-[0_0_0_2px_rgba(59,130,246,0.5)] |
| Disabled Opacity | 0.5 |

### 3.2 Input（输入框）

#### 类型

```tsx
// 默认输入框
<Input placeholder="请输入内容" />

// 带标签
<Input label="用户名" placeholder="请输入用户名" />

// 带图标
<Input
  placeholder="搜索"
  icon={<Search className="w-4 h-4" />}
/>

// 密码输入
<Input type="password" placeholder="请输入密码" />

// 错误状态
<Input
  placeholder="请输入邮箱"
  error="请输入有效的邮箱地址"
/>

// 成功状态
<Input
  placeholder="请输入用户名"
  success="用户名可用"
/>
```

#### 尺寸

```tsx
// 小输入框
<Input size="sm" />
// height: 32px, padding: 6px 12px

// 中输入框
<Input size="md" />
// height: 40px, padding: 10px 12px

// 大输入框
<Input size="lg" />
// height: 48px, padding: 14px 12px
```

#### 完整规范

| 属性 | 值 |
|------|-----|
| Border Radius | 8px (rounded-lg) |
| Border Width | 1px |
| Border Color | slate-200 → slate-400 (focus) |
| Background | white |
| Font Size | 14px (text-sm) |
| Placeholder Color | slate-400 |
| Focus Ring | shadow-[0_0_0_2px_rgba(59,130,246,0.2)] |
| Error Border | red-500 |
| Success Border | green-500 |

### 3.3 Card（卡片）

#### 类型

```tsx
// 默认卡片
<Card>
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
    <CardDescription>卡片描述</CardDescription>
  </CardHeader>
  <CardContent>
    卡片内容
  </CardContent>
  <CardFooter>
    卡片底部
  </CardFooter>
</Card>

// 功能卡片
<FeatureCard
  icon={<Zap className="w-10 h-10" />}
  title="智能处理"
  description="使用自然语言指令自动处理Excel文件"
  color="emerald"
  status="hot"
/>

// 可交互卡片
<InteractiveCard
  onClick={handleClick}
  hoverEffect="lift"
>
  卡片内容
</InteractiveCard>
```

#### 完整规范

| 属性 | 值 |
|------|-----|
| Border Radius | 16px (rounded-2xl) |
| Border Width | 1px |
| Border Color | slate-200 → [color]-500/30 (hover) |
| Background | white |
| Padding | 32px (p-8) |
| Shadow | sm → xl (hover) |
| Transition | all 300ms cubic-bezier(0.4, 0, 0.2, 1) |

### 3.4 Modal（模态框）

#### 类型

```tsx
// 默认模态框
<Modal open={open} onClose={handleClose}>
  <ModalHeader>
    <ModalTitle>模态框标题</ModalTitle>
  </ModalHeader>
  <ModalBody>
    模态框内容
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={handleClose}>
      取消
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      确认
    </Button>
  </ModalFooter>
</Modal>

// 确认对话框
<ConfirmModal
  open={open}
  title="确认删除"
  message="此操作无法撤销，确定要删除吗？"
  onConfirm={handleConfirm}
  onCancel={handleClose}
/>

// 表单模态框
<FormModal
  open={open}
  title="新建项目"
  onSubmit={handleSubmit}
>
  <FormFields>{/* 表单字段 */}</FormFields>
</FormModal>
```

#### 完整规范

| 属性 | 值 |
|------|-----|
| Overlay Background | rgba(15, 23, 42, 0.5) / black/50 |
| Modal Background | white |
| Border Radius | 16px (rounded-2xl) |
| Max Width | 560px (max-w-lg) |
| Padding | 32px (p-8) |
| Shadow | 2xl |
| Animation | fade-in + scale-in (200ms) |

### 3.5 Loading（加载状态）

#### 类型

```tsx
// 圆形加载器
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />

// 进度条
<Progress value={33} />

// 骨架屏
<Skeleton className="h-4 w-full" />
<Skeleton className="h-10 w-10 rounded-full" />

// 全屏加载
<FullscreenLoading>
  <Spinner size="lg" />
  <p>加载中...</p>
</FullscreenLoading>
```

#### 完整规范

| 属性 | 值 |
|------|-----|
| Spinner Color | blue-500 |
| Spinner Size | sm: 16px, md: 24px, lg: 32px |
| Progress Height | 8px |
| Progress Color | blue-500 |
| Skeleton Background | slate-200 |
| Animation Duration | 1.5s (infinite) |

### 3.6 Toast（提示消息）

#### 类型

```tsx
// 成功提示
<Toast type="success" message="操作成功" />

// 错误提示
<Toast type="error" message="操作失败" />

// 警告提示
<Toast type="warning" message="请注意" />

// 信息提示
<Toast type="info" message="提示信息" />

// 自定义操作
<Toast
  type="info"
  message="文件已准备好"
  action={{
    label: "下载",
    onClick: handleDownload,
  }}
/>
```

#### 完整规范

| 属性 | 值 |
|------|-----|
| Border Radius | 8px (rounded-lg) |
| Padding | 12px 16px |
| Shadow | lg |
| Duration | 3000ms (auto-dismiss) |
| Animation | slide-in-right + fade-in (200ms) |
| Success Color | green-500 |
| Error Color | red-500 |
| Warning Color | yellow-500 |
| Info Color | blue-500 |

---

## 📱 响应式设计规范

### 断点系统

```typescript
const breakpoints = {
  sm: '640px',   // 小屏幕
  md: '768px',   // 平板
  lg: '1024px',  // 桌面
  xl: '1280px',  // 大桌面
  '2xl': '1536px', // 超大桌面
}
```

### 响应式策略

#### 卡片布局

```tsx
// 移动设备 (< 640px)
grid-cols-1

// 小屏幕 (640px - 768px)
grid-cols-2

// 平板 (768px - 1024px)
grid-cols-2 lg:grid-cols-3

// 桌面 (1024px+)
grid-cols-3 xl:grid-cols-4
```

#### 字体响应式

```tsx
// 标题
text-2xl md:text-3xl lg:text-4xl

// 正文
text-sm md:text-base lg:text-lg
```

#### 间距响应式

```tsx
// 内边距
p-4 md:p-6 lg:p-8

// 外边距
m-4 md:m-6 lg:m-8

// 间隙
gap-4 md:gap-6 lg:gap-8
```

---

## ♿ 可访问性考虑

### 颜色对比度

- **正文文本**：对比度 ≥ 4.5:1 (WCAG AA)
- **大文本**：对比度 ≥ 3:1 (WCAG AA)
- **交互元素**：对比度 ≥ 3:1 (WCAG AA)

### 键盘导航

- **Tab键**：可访问所有交互元素
- **焦点指示器**：清晰的焦点环
- **快捷键**：功能卡片支持数字键(1-7)

### 屏幕阅读器

- **ARIA标签**：所有交互元素有明确标签
- **语义化HTML**：使用正确的HTML标签
- **alt文本**：所有图标有描述性alt

### 焦点管理

```tsx
// 焦点陷阱（模态框）
useFocusTrap(open)

// 焦点恢复
useFocusRestorer()

// 焦点指示器
focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
```

---

## 🎬 动画和过渡

### 原则

1. **有目的**：动画应该传达信息或引导注意力
2. **流畅**：使用缓动函数，避免线性动画
3. **快速**：过渡时间 ≤ 300ms（除非有特定目的）
4. **可禁用**：尊重用户的动画偏好设置

### 过渡效果

```tsx
// 标准过渡
transition-all duration-200 ease-in-out

// 颜色过渡
transition-colors duration-150

// 变换过渡
transition-transform duration-200 ease-out

// 阴影过渡
transition-shadow duration-300
```

### 动画关键帧

```tsx
// 淡入
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

// 缩放
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

// 滑入
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

---

## 📊 实施优先级

### Phase 1 (Week 2 Day 1-2) - 主界面卡片优化
- ✅ 视觉层次优化
- ✅ 交互体验增强
- ✅ 布局优化
- ✅ 设计细节统一

### Phase 2 (Week 2 Day 3-4) - 设计令牌系统
- ✅ 颜色系统建立
- ✅ 排版系统建立
- ✅ 间距系统建立
- ✅ 其他设计元素定义

### Phase 3 (Week 2 Day 5) - 组件库规范
- ✅ Button组件
- ✅ Input组件
- ✅ Card组件
- ✅ Modal组件
- ✅ Loading组件
- ✅ Toast组件

### Phase 4 (Week 2 后续) - 实施和测试
- ✅ 代码实现
- ✅ 跨浏览器测试
- ✅ 可访问性测试
- ✅ 性能优化

---

## 🎯 设计原则总结

1. **清晰**：信息层次清晰，用户能快速理解
2. **一致**：统一的设计语言，降低学习成本
3. **高效**：减少操作步骤，提高工作效率
4. **美观**：现代简约风格，专业而不失亲和力
5. **可访问**：确保所有用户都能使用

---

## 📚 参考资料

- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [Material Design 3](https://m3.material.io/)
- [WCAG 2.1指南](https://www.w3.org/WAI/WCAG21/quickref/)
- [Lucide图标库](https://lucide.dev/)

---

**文档版本**: v1.0
**最后更新**: 2026-01-25
**设计师**: Claude Code (UI/UX Expert)
