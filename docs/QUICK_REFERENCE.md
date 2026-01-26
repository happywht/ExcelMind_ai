# 代码分割和懒加载 - 快速参考

## 核心命令

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 构建并分析Bundle
npm run build:analyze

# 查看可视化报告
# 打开 dist/stats.html
```

## 添加懒加载组件

### 1. 在App.tsx中注册
```typescript
const NewComponent = lazy(() => import('./components/NewComponent'));
```

### 2. 添加路由
```typescript
case AppView.NEW_VIEW:
  return <NewComponent />;
```

### 3. 添加视图类型
```typescript
// types/index.ts
export enum AppView {
  NEW_VIEW = 'new_view',
}
```

## 使用第三方库懒加载

```typescript
import { loadXLSX } from '@/utils/lazyImports';

const handleExport = async () => {
  const xlsx = await loadXLSX();
  // 使用xlsx
};
```

## 可用的加载组件

```typescript
import LoadingFallback, { SkeletonCard, InlineLoader } from '@/components/LoadingFallback';

// 全屏加载
<LoadingFallback message="加载中..." size="lg" />

// 骨架屏
<SkeletonCard count={3} />

// 内联加载
<InlineLoader message="处理中..." />
```

## 性能指标

| 指标 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| **首屏Bundle** | 2.5MB | 459KB | -81.6% |
| **首屏加载时间** | 3.0s | 1.5s | -50% |

## Bundle分割

### 首屏必需（459KB）
- react-vendor: 204 KB
- index: 28 KB
- ui-utils-vendor: 25 KB

### 按需加载（2.9MB）
- SmartExcel: 77 KB
- xlsx-vendor: 419 KB
- docx-vendor: 249 KB
- pdf-vendor: 437 KB

## 常用文件

| 文件 | 用途 |
|------|------|
| `App.tsx` | 懒加载实现 |
| `components/LoadingFallback.tsx` | 加载状态组件 |
| `components/LazyLoadErrorBoundary.tsx` | 错误边界 |
| `utils/lazyImports.ts` | 第三方库懒加载 |
| `vite.config.ts` | Bundle分割配置 |
| `scripts/analyze-bundle.js` | Bundle分析 |

## 快速诊断

### 问题：白屏时间过长
```typescript
// 优化加载状态UI
<Suspense fallback={
  <LoadingFallback message="正在加载..." size="lg" />
}>
  <LazyComponent />
</Suspense>
```

### 问题：Bundle太大
```bash
# 运行分析
npm run build:analyze

# 查看可视化报告
# 打开 dist/stats.html
```

### 问题：懒加载失败
```typescript
// 使用错误边界
<LazyLoadErrorBoundary>
  <Suspense fallback={<LoadingFallback />}>
    <LazyComponent />
  </Suspense>
</LazyLoadErrorBoundary>
```

## 最佳实践

✅ **DO**
- 所有页面组件使用lazy加载
- 大型第三方库动态导入
- 提供友好的加载状态
- 使用错误边界捕获错误

❌ **DON'T**
- 顶层导入大型库
- 忘记Suspense包裹
- 忽略错误处理
- 过度分割代码

## 性能优化检查清单

- [ ] 使用React.lazy()加载组件
- [ ] 使用Suspense包裹
- [ ] 提供加载状态
- [ ] 处理加载错误
- [ ] 第三方库按需加载
- [ ] 定期分析Bundle
- [ ] 监控首屏加载时间
- [ ] 优化大型chunk

## 相关文档

- 📖 [完整使用指南](./LAZY_LOADING_GUIDE.md)
- 📊 [性能优化报告](./PERFORMANCE_OPTIMIZATION_REPORT.md)
- 📝 [实施总结](./WEEK4_IMPLEMENTATION_SUMMARY.md)

---

**快速提示**: 需要帮助？查看完整文档或运行`npm run build:analyze`分析Bundle！
