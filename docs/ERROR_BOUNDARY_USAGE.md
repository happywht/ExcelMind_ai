# 错误边界系统使用指南

## 概述

ExcelMind AI 的错误边界系统提供了完整的运行时错误捕获和处理机制，确保应用在遇到错误时能够优雅降级，而不是直接崩溃。

## 核心组件

### 1. ErrorBoundary（错误边界）

**位置**: `components/ErrorBoundary.tsx`

**功能**:
- 捕获组件树中的 JavaScript 错误
- 防止整个应用崩溃
- 提供错误回退界面
- 记录错误日志

**使用方式**:

```tsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Error caught:', error, errorInfo);
        // 可选：发送到错误监控服务
      }}
      showDetails={true} // 开发环境显示错误详情
    >
      <YourComponent />
    </ErrorBoundary>
  );
}
```

**Props**:
- `children`: ReactNode - 子组件
- `fallback?: React.ComponentType` - 自定义错误回退组件
- `onError?: (error, errorInfo) => void` - 错误回调函数
- `showDetails?: boolean` - 是否显示错误详情
- `errorLogger?: (error, errorInfo) => void` - 自定义错误日志记录器

### 2. ErrorFallback（错误回退UI）

**位置**: `components/ErrorFallback.tsx`

**功能**:
- 显示友好的错误提示界面
- 提供重试、刷新、返回主页等操作
- 支持查看和复制错误详情

**自定义错误回退组件**:

```tsx
import { ErrorFallbackProps } from './components/ErrorBoundary';

function CustomErrorFallback({
  error,
  errorInfo,
  retry,
  resetError,
  showDetails
}: ErrorFallbackProps) {
  return (
    <div className="custom-error-page">
      <h1>出错了</h1>
      <p>{error.message}</p>
      <button onClick={retry}>重试</button>
      <button onClick={resetError}>刷新页面</button>
    </div>
  );
}

// 使用自定义回退组件
<ErrorBoundary fallback={CustomErrorFallback}>
  <YourComponent />
</ErrorBoundary>
```

### 3. 错误日志服务

**位置**: `services/errorLoggingService.ts`

**功能**:
- 统一的错误日志记录
- 支持控制台、本地存储、远程上报
- 提供错误统计和导出功能

**使用方式**:

```tsx
import { logError, configureErrorLogging, getErrorLogs } from './services/errorLoggingService';

// 配置错误日志
configureErrorLogging({
  enableConsole: true,
  enableLocalStorage: true,
  enableRemote: true,
  remoteEndpoint: 'https://your-api.com/errors',
  customReporter: async (logEntry) => {
    // 自定义上报逻辑
    await fetch('/api/log-error', {
      method: 'POST',
      body: JSON.stringify(logEntry),
    });
  },
});

// 记录错误
try {
  // 可能出错的代码
} catch (error) {
  logError(error, {
    context: 'additional context',
    userInfo: { userId: '123' },
  });
}

// 获取错误日志
const logs = getErrorLogs();
console.log('Total errors:', logs.length);
```

**API**:
- `logError(error, context?)` - 记录错误
- `configureErrorLogging(config)` - 配置错误日志
- `getErrorLogs()` - 获取错误日志
- `clearErrorLogs()` - 清除错误日志
- `exportErrorLogs()` - 导出错误日志为 JSON
- `getErrorStats()` - 获取错误统计信息

### 4. 全局错误处理器

**位置**: `utils/globalErrorHandlers.ts`

**功能**:
- 捕获全局的未处理 JavaScript 错误
- 捕获未处理的 Promise rejection
- 自动记录所有全局错误

**使用方式**:

```tsx
import { startGlobalErrorHandlers, stopGlobalErrorHandlers, reportError } from './utils/globalErrorHandlers';

// 启动全局错误处理（通常在应用入口）
startGlobalErrorHandlers({
  showAlert: false, // 是否显示错误提示
  devMode: true, // 开发模式
  customHandler: (event) => {
    // 自定义错误处理
  },
});

// 停止全局错误处理
stopGlobalErrorHandlers();

// 手动报告错误
reportError(new Error('Something went wrong'), {
  context: 'user action',
});
```

## 最佳实践

### 1. 为不同模块添加错误边界

```tsx
function App() {
  return (
    <ErrorBoundary>
      <Sidebar />
      <main>
        <ErrorBoundary key="dashboard">
          <Dashboard />
        </ErrorBoundary>

        <ErrorBoundary key="smart-excel">
          <SmartExcel />
        </ErrorBoundary>

        <ErrorBoundary key="formula-gen">
          <FormulaGen />
        </ErrorBoundary>
      </main>
    </ErrorBoundary>
  );
}
```

### 2. 异步操作错误处理

```tsx
function MyComponent() {
  const handleClick = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      logError(error, {
        component: 'MyComponent',
        action: 'handleClick',
      });
      // 显示用户友好的错误提示
      showErrorToast('操作失败，请稍后重试');
    }
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

### 3. 集成错误监控服务

```tsx
import { configureErrorLogging } from './services/errorLoggingService';

// 配置 Sentry（示例）
import * as Sentry from '@sentry/react';

configureErrorLogging({
  customReporter: async (logEntry) => {
    Sentry.captureException(logEntry.error, {
      contexts: {
        component: { stack: logEntry.componentStack },
        custom: logEntry.context as Record<string, string>,
      },
    });
  },
});
```

### 4. 开发环境 vs 生产环境

```tsx
const isDev = import.meta.env.DEV;

<ErrorBoundary
  showDetails={isDev}
  onError={(error, errorInfo) => {
    if (isDev) {
      console.error('Error:', error, errorInfo);
    } else {
      // 生产环境：发送到监控服务
      sendToMonitoringService(error, errorInfo);
    }
  }}
>
  <App />
</ErrorBoundary>
```

## 测试错误边界

### 1. 测试组件错误

```tsx
function ThrowError() {
  throw new Error('This is a test error');
}

function TestComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    return <ThrowError />;
  }

  return (
    <button onClick={() => setShouldThrow(true)}>
      触发错误
    </button>
  );
}

// 在 ErrorBoundary 中使用
<ErrorBoundary>
  <TestComponent />
</ErrorBoundary>
```

### 2. 测试异步错误

```tsx
function TestAsyncError() {
  const handleClick = () => {
    Promise.reject(new Error('Unhandled Promise Rejection'));
  };

  return <button onClick={handleClick}>触发异步错误</button>;
}
```

### 3. 测试全局错误

```tsx
function TestGlobalError() {
  const handleClick = () => {
    // 触发全局错误
    setTimeout(() => {
      throw new Error('Global error');
    }, 100);
  };

  return <button onClick={handleClick}>触发全局错误</button>;
}
```

## 错误日志查看

### 浏览器控制台

打开浏览器开发者工具（F12），查看 Console 标签页：

```bash
❌ Error Logged
  Message: ...
  Time: ...
  URL: ...
  Component Stack: ...
  Stack Trace: ...
```

### 本地存储

```javascript
// 在浏览器控制台中执行
const logs = JSON.parse(localStorage.getItem('errordetails') || '[]');
console.table(logs);
```

### 导出错误日志

```javascript
import { exportErrorLogs } from './services/errorLoggingService';

// 导出为 JSON 字符串
const logsJson = exportErrorLogs();
console.log(logsJson);

// 下载为文件
const blob = new Blob([logsJson], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'error-logs.json';
a.click();
```

## 常见问题

### Q: 错误边界捕获不了哪些错误？

A: 错误边界无法捕获以下错误：
- 事件处理器中的错误
- 异步代码（如 `setTimeout`、`Promise`）
- 服务端渲染错误
- 错误边界本身的错误

对于这些错误，应该使用全局错误处理器或 try-catch。

### Q: 如何区分开发和生产环境？

A: 使用 `import.meta.env.DEV`:

```tsx
const isDev = import.meta.env.DEV;

<ErrorBoundary
  showDetails={isDev}
  onError={isDev ? devErrorHandler : prodErrorHandler}
>
  <App />
</ErrorBoundary>
```

### Q: 错误日志会占用多少存储空间？

A: 默认情况下，本地存储最多保存 50 条错误日志。可以通过配置调整：

```tsx
configureErrorLogging({
  maxLocalStorageEntries: 100, // 增加到 100 条
});
```

## 总结

ExcelMind AI 的错误边界系统提供了：

✅ 完整的错误捕获机制
✅ 友好的用户错误提示
✅ 灵活的配置选项
✅ 强大的日志记录功能
✅ 易于集成和扩展

通过合理使用错误边界，可以显著提升应用的健壮性和用户体验。
