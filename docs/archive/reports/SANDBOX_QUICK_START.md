# 无头沙箱系统 - 快速入门指南

## 5 分钟快速上手

### 第一步：验证环境

在应用启动后，检查沙箱是否可用：

```typescript
const validation = await window.electronAPI.sandbox.validateEnv();
if (!validation.valid) {
  console.error('沙箱环境验证失败:', validation.errors);
}
```

### 第二步：执行第一个命令

```typescript
// 执行简单命令
try {
  const result = await window.electronAPI.sandbox.execute({
    taskId: `task-${Date.now()}`,
    command: 'help',
    contextFiles: []
  });

  console.log('执行成功:', result);
} catch (error) {
  console.error('执行失败:', error);
}
```

### 第三步：监听进度和状态

```typescript
useEffect(() => {
  // 监听进度
  window.electronAPI.sandbox.onProgress((event) => {
    console.log(`进度: ${event.percentage}% - ${event.message}`);
  });

  // 监听完成
  window.electronAPI.sandbox.onComplete((event) => {
    console.log('任务完成:', event.status, event.message);
  });

  // 监听错误
  window.electronAPI.sandbox.onError((event) => {
    console.error('错误:', event.message);
  });

  return () => {
    window.electronAPI.sandbox.removeAllListeners();
  };
}, []);
```

### 第四步：中断任务（如果需要）

```typescript
await window.electronAPI.sandbox.interrupt({ taskId: 'task-123' });
```

## 常见使用场景

### 场景 1：分析代码文件

```typescript
const result = await window.electronAPI.sandbox.execute({
  taskId: `analyze-${Date.now()}`,
  command: 'analyze ./src/components',
  contextFiles: ['./src/App.tsx', './src/index.tsx']
});
```

### 场景 2：生成文档

```typescript
const result = await window.electronAPI.sandbox.execute({
  taskId: `docs-${Date.now()}`,
  command: 'generate-docs --format markdown',
  contextFiles: ['./src']
});
```

### 场景 3：运行测试

```typescript
const result = await window.electronAPI.sandbox.execute({
  taskId: `test-${Date.now()}`,
  command: 'test --coverage',
  contextFiles: []
});
```

## 获取任务状态

```typescript
// 查询当前状态
const status = await window.electronAPI.sandbox.getTaskStatus({
  taskId: 'task-123'
});

console.log('状态:', status.status);
console.log('持续时间:', status.duration, 'ms');
console.log('日志文件:', status.logFile);
```

## 查看沙箱统计

```typescript
const stats = await window.electronAPI.sandbox.getStats();

console.log('总任务数:', stats.total);
console.log('运行中:', stats.active);
console.log('已完成:', stats.completed);
console.log('磁盘使用:', stats.diskUsage.formatted);
```

## 读取任务日志

```typescript
// 获取日志文件路径
const status = await window.electronAPI.sandbox.getTaskStatus({ taskId: 'task-123' });

// 读取日志内容
const log = await window.electronAPI.sandbox.readLog({
  logFile: status.logFile,
  maxLines: 100
});

console.log(log.content);
```

## 清理缓存

```typescript
const result = await window.electronAPI.sandbox.cleanupCache();
console.log(result.message);  // "缓存已清理"
console.log(result.freedSpace);  // "12.34 MB"
```

## 完整示例：React 组件

```typescript
import { useState, useEffect } from 'react';

export function MySandboxComponent() {
  const [taskId] = useState(() => `task-${Date.now()}`);
  const [progress, setProgress] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // 监听进度
    const handleProgress = (event: any) => {
      if (event.taskId === taskId) {
        setProgress(event.percentage);
      }
    };

    // 监听输出
    const handleOutput = (event: any) => {
      if (event.taskId === taskId) {
        setOutput(prev => [...prev, event.content]);
      }
    };

    // 监听完成
    const handleComplete = (event: any) => {
      if (event.taskId === taskId) {
        setIsRunning(false);
        setProgress(100);
      }
    };

    window.electronAPI.sandbox.onProgress(handleProgress);
    window.electronAPI.sandbox.onOutput(handleOutput);
    window.electronAPI.sandbox.onComplete(handleComplete);

    return () => {
      window.electronAPI.sandbox.removeAllListeners();
    };
  }, [taskId]);

  const executeCommand = async () => {
    setIsRunning(true);
    setOutput([]);
    setProgress(0);

    await window.electronAPI.sandbox.execute({
      taskId,
      command: 'analyze ./src',
      contextFiles: []
    });
  };

  return (
    <div>
      <button onClick={executeCommand} disabled={isRunning}>
        {isRunning ? '运行中...' : '执行命令'}
      </button>

      <div>进度: {progress}%</div>

      <pre>
        {output.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </pre>
    </div>
  );
}
```

## 错误处理

```typescript
try {
  const result = await window.electronAPI.sandbox.execute({
    taskId: 'task-123',
    command: 'some-command',
    contextFiles: []
  });
} catch (error) {
  if (error.message.includes('沙箱系统未初始化')) {
    console.error('请确保应用正确启动');
  } else if (error.message.includes('环境验证失败')) {
    console.error('请检查 CLI 是否已安装');
  } else {
    console.error('未知错误:', error.message);
  }
}
```

## 调试技巧

### 1. 检查环境

```typescript
const validation = await window.electronAPI.sandbox.validateEnv();
console.log('验证结果:', validation);
console.log('路径:', validation.paths);
```

### 2. 监控所有事件

```typescript
// 临时启用所有事件监听以进行调试
window.electronAPI.sandbox.onStatus(console.log);
window.electronAPI.sandbox.onProgress(console.log);
window.electronAPI.sandbox.onComplete(console.log);
window.electronAPI.sandbox.onOutput(console.log);
window.electronAPI.sandbox.onError(console.log);
window.electronAPI.sandbox.onWarning(console.log);
window.electronAPI.sandbox.onRequireInteraction(console.log);
```

### 3. 查看详细日志

```typescript
const status = await window.electronAPI.sandbox.getTaskStatus({ taskId });
const log = await window.electronAPI.sandbox.readLog({
  logFile: status.logFile,
  maxLines: Infinity
});
console.log('完整日志:', log.content);
```

## 最佳实践

### 1. 任务 ID 唯一性

```typescript
// 好的做法
const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 避免
const taskId = 'task-123';  // 可能重复
```

### 2. 清理监听器

```typescript
useEffect(() => {
  const handler = (event) => console.log(event);
  window.electronAPI.sandbox.onProgress(handler);

  // 重要：清理监听器
  return () => {
    window.electronAPI.sandbox.removeAllListeners();
  };
}, []);
```

### 3. 错误边界

```typescript
const [error, setError] = useState<string | null>(null);

if (error) {
  return <div className="error">{error}</div>;
}
```

### 4. 加载状态

```typescript
const [isLoading, setIsLoading] = useState(false);

<button disabled={isLoading} onClick={executeCommand}>
  {isLoading ? <Spinner /> : '执行'}
</button>
```

## 故障排除

### 问题：沙箱未初始化

**解决方案**：确保应用已完全启动，并在 `app.whenReady()` 后再调用

### 问题：环境验证失败

**解决方案**：
1. 开发环境：检查 CLI 是否在项目目录中
2. 生产环境：检查 resources/bin/ 目录

### 问题：任务无响应

**解决方案**：
1. 检查命令是否正确
2. 查看日志文件获取详细错误
3. 使用 `interrupt()` 中断任务

### 问题：内存占用过高

**解决方案**：
1. 调用 `cleanupCache()` 清理缓存
2. 清理已完成任务的资源
3. 限制并发任务数量

## 下一步

- 阅读完整文档：`public/electron/sandbox/README.md`
- 查看使用示例：`public/electron/sandbox/SANDBOX_USAGE.md`
- 查看示例组件：`components/SandboxTaskRunner.tsx`
- 了解类型定义：`types/sandbox.d.ts`

## 获取帮助

- 查看实现总结：`SANDBOX_IMPLEMENTATION_SUMMARY.md`
- 运行测试：`npm test -- public/electron/sandbox/sandbox.test.js`
- 查看日志：`~/.config/excelmind-ai/logic_sandbox/logs/`

祝使用愉快！🚀
