# 错误边界系统 - 快速启动指南

## 快速开始

### 1. 验证安装

所有文件已成功创建：

```bash
# 验证核心文件存在
ls -la components/ErrorBoundary.tsx
ls -la components/ErrorFallback.tsx
ls -la services/errorLoggingService.ts
ls -la utils/globalErrorHandlers.ts
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 测试错误边界

#### 方法1: 在现有页面中测试

打开浏览器控制台（F12），执行以下代码：

```javascript
// 测试同步错误（会被ErrorBoundary捕获）
const testDiv = document.createElement('div');
testDiv.onclick = () => {
  throw new Error('测试同步错误');
};
testDiv.innerText = '点击触发错误';
document.body.appendChild(testDiv);
```

#### 方法2: 查看错误日志

```javascript
// 查看存储的错误日志
const logs = JSON.parse(localStorage.getItem('errordetails') || '[]');
console.table(logs);

// 清除错误日志
localStorage.removeItem('errordetails');
```

### 4. 集成到你的组件

```tsx
import ErrorBoundary from './components/ErrorBoundary';

function MyComponent() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Component error:', error);
      }}
    >
      <YourRiskyComponent />
    </ErrorBoundary>
  );
}
```

## 核心功能

### 错误边界（ErrorBoundary）
- 捕获React组件树中的JavaScript错误
- 防止整个应用崩溃
- 显示友好的错误提示界面

### 错误回退（ErrorFallback）
- 美观的错误提示UI
- 提供重试、刷新、返回主页等操作
- 可展开查看技术详情
- 一键复制错误信息

### 错误日志服务
- 自动记录所有错误到本地存储
- 控制台输出（开发环境）
- 支持自定义上报函数
- 提供错误统计和导出功能

### 全局错误处理
- 捕获全局JavaScript错误
- 捕获未处理的Promise rejection
- 自动记录到日志系统

## 配置选项

### 基础配置

```tsx
// App.tsx
import ErrorBoundary from './components/ErrorBoundary';
import { startGlobalErrorHandlers } from './utils/globalErrorHandlers';

function App() {
  // 启动全局错误处理
  React.useEffect(() => {
    startGlobalErrorHandlers({
      showAlert: false,
      devMode: import.meta.env.DEV,
    });
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // 自定义错误处理
      }}
      showDetails={import.meta.env.DEV}
    >
      <YourApp />
    </ErrorBoundary>
  );
}
```

### 高级配置

```tsx
import { configureErrorLogging } from './services/errorLoggingService';

// 配置错误日志服务
configureErrorLogging({
  enableConsole: true,
  enableLocalStorage: true,
  enableRemote: false,
  maxLocalStorageEntries: 50,
  customReporter: async (logEntry) => {
    // 自定义上报逻辑
    console.log('Error reported:', logEntry);
  },
});
```

## 常见用法

### 1. 为特定功能模块添加错误边界

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
      </main>
    </ErrorBoundary>
  );
}
```

### 2. 自定义错误回退组件

```tsx
import { ErrorFallbackProps } from './components/ErrorBoundary';

function CustomErrorFallback({
  error,
  retry,
  resetError
}: ErrorFallbackProps) {
  return (
    <div className="custom-error">
      <h1>出错了: {error.message}</h1>
      <button onClick={retry}>重试</button>
      <button onClick={resetError}>刷新</button>
    </div>
  );
}

// 使用自定义回退组件
<ErrorBoundary fallback={CustomErrorFallback}>
  <YourComponent />
</ErrorBoundary>
```

### 3. 手动记录错误

```tsx
import { logError } from './services/errorLoggingService';

function MyComponent() {
  const handleClick = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      logError(error, {
        component: 'MyComponent',
        action: 'handleClick',
      });
    }
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

## 调试技巧

### 1. 查看错误日志

```javascript
// 浏览器控制台
const logs = JSON.parse(localStorage.getItem('errordetails') || '[]');
console.log('Total errors:', logs.length);
console.table(logs);
```

### 2. 导出错误日志

```javascript
const logs = JSON.parse(localStorage.getItem('errordetails') || '[]');
const logsJson = JSON.stringify(logs, null, 2);
console.log(logsJson);

// 或者复制到剪贴板
copy(logsJson);
```

### 3. 清除错误日志

```javascript
localStorage.removeItem('errordetails');
```

### 4. 模拟错误

```tsx
function TestComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('测试错误');
  }

  return (
    <button onClick={() => setShouldThrow(true)}>
      触发错误
    </button>
  );
}

// 在ErrorBoundary中使用
<ErrorBoundary>
  <TestComponent />
</ErrorBoundary>
```

## 性能优化

### 1. 按需加载错误边界

```tsx
// 仅在生产环境启用错误边界详情
const showDetails = import.meta.env.DEV;

<ErrorBoundary showDetails={showDetails}>
  <App />
</ErrorBoundary>
```

### 2. 限制日志存储

```tsx
configureErrorLogging({
  maxLocalStorageEntries: 20, // 减少存储条目
});
```

### 3. 异步错误上报

```tsx
configureErrorLogging({
  customReporter: async (logEntry) => {
    // 使用requestIdleCallback或setTimeout延迟上报
    setTimeout(() => {
      sendToServer(logEntry);
    }, 0);
  },
});
```

## 故障排查

### 问题1: 错误边界没有捕获错误

**可能原因**:
- 错误发生在事件处理器中
- 错误发生在异步代码中
- 错误发生在错误边界本身

**解决方案**:
使用try-catch包裹事件处理器和异步代码：

```tsx
const handleClick = () => {
  try {
    riskyOperation();
  } catch (error) {
    logError(error);
  }
};
```

### 问题2: 错误日志没有保存

**可能原因**:
- localStorage不可用
- 存储空间已满

**解决方案**:
检查localStorage可用性：

```javascript
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (e) {
  console.error('localStorage not available');
}
```

### 问题3: 开发环境看不到错误详情

**解决方案**:
确保 `showDetails` 设置为 `true`：

```tsx
<ErrorBoundary showDetails={true}>
  <App />
</ErrorBoundary>
```

## 最佳实践

1. **分层错误边界**: 为不同的功能模块添加独立的错误边界
2. **友好提示**: 提供清晰的用户友好的错误信息
3. **日志记录**: 记录所有错误以便分析和改进
4. **环境区分**: 开发环境显示详细错误，生产环境简化显示
5. **监控集成**: 集成第三方错误监控服务（如Sentry）
6. **定期清理**: 定期清理错误日志，避免占用过多存储

## 获取帮助

- 查看完整文档: `docs/ERROR_BOUNDARY_USAGE.md`
- 查看实施报告: `ERROR_BOUNDARY_IMPLEMENTATION_REPORT.md`
- 查看测试示例: `components/ErrorBoundaryExample.tsx`

## 版本信息

- **版本**: 1.0.0
- **实施日期**: 2026-01-26
- **React版本**: 19.2.3
- **TypeScript版本**: 5.8.2

---

**注意**: 错误边界是React应用的重要组成部分，合理使用可以显著提升应用的健壮性和用户体验。
