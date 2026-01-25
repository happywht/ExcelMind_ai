# 无头沙箱系统使用指南

## 概述

无头沙箱系统允许在 Electron 应用中后台运行 AI CLI（如 Claude Code），不显示任何终端窗口。系统使用 node-pty 创建静默进程，并通过 IPC 进行通信。

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                    渲染进程 (React)                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           SandboxService (前端封装)               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │ IPC 通信
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    主进程 (Electron)                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           HeadlessSandbox.js                     │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │       OutputParser.js                    │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │       node-pty (静默进程)                 │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │   AI CLI      │
              │ (Claude Code) │
              └───────────────┘
```

## 文件结构

```
public/
├── electron.cjs                    # 主进程入口（集成沙箱）
├── preload.js                      # Preload 脚本（暴露沙箱 API）
└── electron/
    └── sandbox/
        ├── HeadlessSandbox.js      # 核心沙箱类
        └── OutputParser.js         # 输出解析器

types/
└── sandbox.d.ts                    # TypeScript 类型定义
```

## 渲染进程使用示例

### 基础使用

```typescript
import { useEffect, useState } from 'react';

export function MyComponent() {
  const [taskId] = useState(`task-${Date.now()}`);

  const executeCommand = async () => {
    try {
      // 执行命令
      const result = await window.electronAPI.sandbox.execute({
        taskId,
        command: 'analyze ./src',
        contextFiles: ['./file1.js', './file2.js']
      });

      console.log('执行结果:', result);
    } catch (error) {
      console.error('执行失败:', error);
    }
  };

  return (
    <button onClick={executeCommand}>
      执行分析
    </button>
  );
}
```

### 监听任务事件

```typescript
import { useEffect, useState } from 'react';

export function TaskMonitor() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [output, setOutput] = useState<string[]>([]);

  useEffect(() => {
    // 监听进度更新
    const handleProgress = (event: SandboxProgressEvent) => {
      setProgress(event.percentage);
      setStatus(event.message);
    };

    // 监听任务完成
    const handleComplete = (event: SandboxCompleteEvent) => {
      console.log('任务完成:', event);
      setProgress(100);
    };

    // 监听任务输出
    const handleOutput = (event: SandboxOutputEvent) => {
      setOutput(prev => [...prev, event.content]);
    };

    // 监听错误
    const handleError = (event: SandboxErrorEvent) => {
      console.error('任务错误:', event.message);
    };

    // 注册监听器
    window.electronAPI.sandbox.onProgress(handleProgress);
    window.electronAPI.sandbox.onComplete(handleComplete);
    window.electronAPI.sandbox.onOutput(handleOutput);
    window.electronAPI.sandbox.onError(handleError);

    // 清理监听器
    return () => {
      window.electronAPI.sandbox.removeAllListeners();
    };
  }, []);

  return (
    <div>
      <div>进度: {progress}%</div>
      <div>状态: {status}</div>
      <pre>{output.join('\n')}</pre>
    </div>
  );
}
```

### 处理用户交互

```typescript
import { useState } from 'react';

export function InteractionHandler() {
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [taskId] = useState(`task-${Date.now()}`);

  useEffect(() => {
    const handleInteraction = async (event: SandboxRequireInteractionEvent) => {
      if (event.taskId === taskId) {
        setPendingPrompt(event.prompt);

        // 如果需要文本输入，可以显示输入框
        if (event.requiresInput) {
          // 处理需要文本输入的情况
        } else {
          // 简单确认，自动发送 "yes"
          await window.electronAPI.sandbox.sendInput({
            taskId,
            input: 'yes'
          });
        }
      }
    };

    window.electronAPI.sandbox.onRequireInteraction(handleInteraction);

    return () => {
      window.electronAPI.sandbox.removeListener('require-interaction');
    };
  }, [taskId]);

  const handleConfirm = async (confirmed: boolean) => {
    await window.electronAPI.sandbox.sendInput({
      taskId,
      input: confirmed ? 'yes' : 'no'
    });
    setPendingPrompt(null);
  };

  return (
    <>
      {pendingPrompt && (
        <div className="modal">
          <p>{pendingPrompt}</p>
          <button onClick={() => handleConfirm(true)}>确认</button>
          <button onClick={() => handleConfirm(false)}>取消</button>
        </div>
      )}
    </>
  );
}
```

### 中断任务

```typescript
export function TaskControl({ taskId }: { taskId: string }) {
  const handleInterrupt = async () => {
    const result = await window.electronAPI.sandbox.interrupt({ taskId });
    console.log(result.message);
  };

  return (
    <button onClick={handleInterrupt}>
      中断任务
    </button>
  );
}
```

### 获取任务状态

```typescript
export function TaskStatus({ taskId }: { taskId: string }) {
  const [status, setStatus] = useState<SandboxTaskInfo | null>(null);

  const refreshStatus = async () => {
    const info = await window.electronAPI.sandbox.getTaskStatus({ taskId });
    setStatus(info);
  };

  return (
    <div>
      <button onClick={refreshStatus}>刷新状态</button>
      {status && (
        <div>
          <div>状态: {status.status}</div>
          <div>命令: {status.command}</div>
          <div>持续时间: {status.duration}ms</div>
        </div>
      )}
    </div>
  );
}
```

### 获取沙箱统计信息

```typescript
export function SandboxStats() {
  const [stats, setStats] = useState<SandboxStats | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      const info = await window.electronAPI.sandbox.getStats();
      setStats(info);
    };

    loadStats();
    const interval = setInterval(loadStats, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h3>沙箱统计</h3>
      {stats && (
        <div>
          <div>总任务数: {stats.total}</div>
          <div>运行中: {stats.active}</div>
          <div>已完成: {stats.completed}</div>
          <div>失败: {stats.failed}</div>
          <div>磁盘使用: {stats.diskUsage.formatted}</div>
        </div>
      )}
    </div>
  );
}
```

### 读取任务日志

```typescript
export function TaskLog({ logFile }: { logFile: string }) {
  const [log, setLog] = useState<string>('');

  const loadLog = async () => {
    const result = await window.electronAPI.sandbox.readLog({
      logFile,
      maxLines: 100
    });
    setLog(result.content);
  };

  return (
    <div>
      <button onClick={loadLog}>加载日志</button>
      <pre>{log}</pre>
    </div>
  );
}
```

### 清理缓存

```typescript
export function CleanupButton() {
  const handleCleanup = async () => {
    const result = await window.electronAPI.sandbox.cleanupCache();
    alert(`${result.message}\n释放空间: ${result.freedSpace}`);
  };

  return (
    <button onClick={handleCleanup}>
      清理缓存
    </button>
  );
}
```

## 完整的 React Hook 封装

```typescript
import { useState, useEffect, useCallback } from 'react';

export function useSandboxTask(command: string, contextFiles: string[] = []) {
  const [taskId] = useState(`task-${Date.now()}`);
  const [status, setStatus] = useState<SandboxTaskInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // 执行命令
  const execute = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setOutput([]);
    setProgress(0);

    try {
      await window.electronAPI.sandbox.execute({
        taskId,
        command,
        contextFiles
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      setIsRunning(false);
    }
  }, [taskId, command, contextFiles]);

  // 中断任务
  const interrupt = useCallback(async () => {
    const result = await window.electronAPI.sandbox.interrupt({ taskId });
    setIsRunning(false);
    return result;
  }, [taskId]);

  // 发送输入
  const sendInput = useCallback(async (input: string) => {
    const result = await window.electronAPI.sandbox.sendInput({ taskId, input });
    return result;
  }, [taskId]);

  // 刷新状态
  const refreshStatus = useCallback(async () => {
    const info = await window.electronAPI.sandbox.getTaskStatus({ taskId });
    setStatus(info);
    return info;
  }, [taskId]);

  // 设置事件监听
  useEffect(() => {
    const handleProgress = (event: SandboxProgressEvent) => {
      if (event.taskId === taskId) {
        setProgress(event.percentage);
      }
    };

    const handleComplete = (event: SandboxCompleteEvent) => {
      if (event.taskId === taskId) {
        setIsRunning(false);
        refreshStatus();
      }
    };

    const handleOutput = (event: SandboxOutputEvent) => {
      if (event.taskId === taskId) {
        setOutput(prev => [...prev, event.content]);
      }
    };

    const handleError = (event: SandboxErrorEvent) => {
      if (event.taskId === taskId) {
        setError(event.message);
        if (event.isFatal) {
          setIsRunning(false);
        }
      }
    };

    window.electronAPI.sandbox.onProgress(handleProgress);
    window.electronAPI.sandbox.onComplete(handleComplete);
    window.electronAPI.sandbox.onOutput(handleOutput);
    window.electronAPI.sandbox.onError(handleError);

    return () => {
      window.electronAPI.sandbox.removeAllListeners();
    };
  }, [taskId, refreshStatus]);

  return {
    taskId,
    status,
    progress,
    output,
    error,
    isRunning,
    execute,
    interrupt,
    sendInput,
    refreshStatus
  };
}
```

## 注意事项

### 1. 资源清理

确保在组件卸载时清理监听器：

```typescript
useEffect(() => {
  // 注册监听器

  return () => {
    window.electronAPI.sandbox.removeAllListeners();
  };
}, []);
```

### 2. 任务 ID 唯一性

每个任务需要唯一的 ID：

```typescript
const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

### 3. 错误处理

始终处理可能的错误：

```typescript
try {
  await window.electronAPI.sandbox.execute({ taskId, command });
} catch (error) {
  console.error('执行失败:', error);
  // 显示错误信息给用户
}
```

### 4. 性能考虑

- 避免在输出处理中进行重计算
- 使用虚拟滚动处理大量输出
- 定期清理已完成任务的日志

### 5. 安全性

- 验证用户输入的命令
- 限制可执行的命令类型
- 监控资源使用情况

## 常见问题

### Q: 如何知道沙箱是否可用？

```typescript
const validation = await window.electronAPI.sandbox.validateEnv();
if (!validation.valid) {
  console.error('沙箱不可用:', validation.errors);
}
```

### Q: 如何查看任务的详细日志？

```typescript
const status = await window.electronAPI.sandbox.getTaskStatus({ taskId });
if (status?.logFile) {
  const log = await window.electronAPI.sandbox.readLog({
    logFile: status.logFile
  });
  console.log(log.content);
}
```

### Q: 如何处理长时间运行的任务？

```typescript
// 使用轮询获取状态
const interval = setInterval(async () => {
  const status = await window.electronAPI.sandbox.getTaskStatus({ taskId });
  console.log('任务状态:', status);
}, 5000);

// 清理
return () => clearInterval(interval);
```

## 测试

在开发环境中，如果缺少 CLI 可执行文件，系统会显示警告但不会退出应用。在生产环境中，如果环境验证失败，应用会退出并显示错误对话框。

测试建议：

1. 验证环境完整性
2. 测试命令执行和进度更新
3. 测试用户交互处理
4. 测试任务中断
5. 测试错误处理
6. 测试资源清理

## 未来改进

- [ ] 支持多任务并行执行
- [ ] 添加任务优先级队列
- [ ] 实现任务依赖管理
- [ ] 添加更详细的性能指标
- [ ] 支持自定义输出解析器
- [ ] 添加任务超时控制
- [ ] 实现任务持久化和恢复
