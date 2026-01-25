# 外部化状态存储 - 使用指南

## 概述

外部化状态存储系统提供了将应用状态持久化到 Redis（后端）和 IndexedDB（前端）的完整解决方案。

## 快速开始

### 后端使用（服务器端）

```typescript
import { createBackendStorageSystem, AgenticOrchestrator } from './services';

async function main() {
  // 创建后端存储系统
  const { stateManager } = await createBackendStorageSystem();

  // 创建编排器，传入状态管理器
  const orchestrator = new AgenticOrchestrator({}, stateManager);

  // 执行任务（状态会自动持久化到 Redis）
  const result = await orchestrator.executeTask(
    '分析销售数据',
    dataFiles
  );

  // 清理
  await stateManager.destroy();
}
```

### 前端使用（客户端）

```typescript
import { createFrontendStorageSystem } from './services';

async function init() {
  // 创建前端存储系统
  const { clientManager } = await createFrontendStorageSystem();

  // 保存执行进度
  await clientManager.saveProgress('task-123', {
    taskId: 'task-123',
    status: 'in_progress',
    progress: {
      percentage: 50,
      currentPhase: 'EXECUTING',
      message: 'Processing data...'
    },
    steps: [],
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  });

  // 获取进度
  const progress = await clientManager.getProgress('task-123');
  console.log(progress.data);
}
```

### 完整系统（包含同步）

```typescript
import { createStorageSystem } from './services';

async function init() {
  // 创建完整的存储系统（包含同步功能）
  const storage = await createStorageSystem();

  // 使用各个组件
  const { stateManager, clientManager, syncService } = storage;

  // 执行双向同步
  await syncService.bidirectionalSync('task-123');

  // 清理
  await storage.stateManager.destroy();
  await storage.clientManager.destroy();
  await storage.syncService.destroy();
}
```

## API 参考

### StateManager（后端）

#### 会话管理

```typescript
// 创建会话
const sessionInfo = await stateManager.createSession('user123', {
  userAgent: navigator.userAgent,
  platform: navigator.platform
});

// 获取会话
const session = await stateManager.getSession(sessionId);

// 删除会话
await stateManager.deleteSession(sessionId);
```

#### 执行状态管理

```typescript
// 保存执行状态
await stateManager.saveExecutionState('task-123', {
  taskId: 'task-123',
  status: 'in_progress',
  progress: { percentage: 50, currentPhase: 'EXECUTING', message: 'Processing...' },
  steps: [],
  metadata: { createdAt: Date.now(), updatedAt: Date.now() }
});

// 获取执行状态
const state = await stateManager.getExecutionState('task-123');

// 更新执行进度
await stateManager.updateExecutionProgress('task-123', {
  percentage: 75,
  currentPhase: 'EVALUATING',
  message: 'Evaluating results...'
});
```

#### 用户设置管理

```typescript
// 保存用户设置
await stateManager.saveUserSettings('user123', {
  userId: 'user123',
  preferences: { theme: 'dark', language: 'zh-CN' },
  recentFiles: [],
  savedQueries: []
});

// 获取用户设置
const settings = await stateManager.getUserSettings('user123');

// 更新用户偏好
await stateManager.updateUserPreferences('user123', { theme: 'light' });
```

### ClientStateManager（前端）

#### 执行进度管理

```typescript
// 保存进度
await clientManager.saveProgress('task-123', executionState);

// 获取进度
const progress = await clientManager.getProgress('task-123');

// 获取当前会话的所有执行
const executions = await clientManager.getSessionExecutions();
```

#### 缓存管理

```typescript
// 缓存结果（1小时过期）
await clientManager.cacheResult('query-result-123', data, 3600);

// 获取缓存结果
const cached = await clientManager.getCachedResult('query-result-123');

// 清除过期缓存
const count = await clientManager.clearExpiredCache();
```

#### 用户设置管理

```typescript
// 保存设置
await clientManager.saveSettings({
  userId: 'user123',
  preferences: { theme: 'dark' },
  recentFiles: [],
  savedQueries: []
});

// 更新偏好
await clientManager.updatePreferences({ language: 'en' });

// 添加最近文件
await clientManager.addRecentFile('/path/to/file.xlsx');
```

### SyncService（同步服务）

#### 双向同步

```typescript
// 同步单个执行
const result = await syncService.bidirectionalSync('task-123');
console.log(`Synced: ${result.synced}, Failed: ${result.failed}, Conflicts: ${result.conflicts}`);

// 批量同步
const batchResult = await syncService.batchBidirectionalSync(['task-1', 'task-2', 'task-3']);
```

#### 冲突解决策略

```typescript
import { createSyncService } from './services';

const syncService = createSyncService({
  conflictResolution: 'merge' // 'local' | 'remote' | 'merge' | 'manual'
});
```

#### 在线状态处理

```typescript
// 检查在线状态
if (syncService.isSyncOnline()) {
  await syncService.triggerSync();
}

// 获取待同步列表
const pending = syncService.getPendingSync();
```

## 配置

### Redis 配置

```typescript
// config/storage.config.ts
export const storageConfig = {
  redis: {
    url: 'redis://localhost:6379',
    password: undefined, // 如果需要密码
    keyPrefix: 'excelmind:',
    defaultTTL: 3600, // 1小时
  }
};
```

### IndexedDB 配置

```typescript
export const storageConfig = {
  indexedDB: {
    dbName: 'ExcelMindDB',
    version: 1,
    stores: [
      {
        name: 'executions',
        keyPath: 'id',
        indexes: [
          { name: 'sessionId', keyPath: 'sessionId' },
          { name: 'timestamp', keyPath: 'timestamp' }
        ]
      }
    ]
  }
};
```

## 集成示例

### React 组件集成

```typescript
import { useEffect, useState } from 'react';
import { createClientStateManager } from './services';

function TaskProgress({ taskId }: { taskId: string }) {
  const [progress, setProgress] = useState(null);
  const [clientManager, setClientManager] = useState(null);

  useEffect(() => {
    async function init() {
      const manager = createClientStateManager();
      await manager.initialize();
      setClientManager(manager);

      // 监听进度变化
      const unsubscribe = manager.addListener((event) => {
        if (event.key === taskId) {
          loadProgress();
        }
      });

      return () => {
        unsubscribe();
        manager.destroy();
      };
    }

    init();
  }, []);

  async function loadProgress() {
    if (!clientManager) return;
    const result = await clientManager.getProgress(taskId);
    if (result.success) {
      setProgress(result.data);
    }
  }

  useEffect(() => {
    loadProgress();

    // 定期刷新
    const interval = setInterval(loadProgress, 1000);
    return () => clearInterval(interval);
  }, [clientManager, taskId]);

  return (
    <div>
      <h2>任务进度</h2>
      {progress && (
        <>
          <p>状态: {progress.status}</p>
          <p>进度: {progress.progress.percentage}%</p>
          <p>阶段: {progress.progress.message}</p>
        </>
      )}
    </div>
  );
}
```

### AgenticOrchestrator 集成

```typescript
import { AgenticOrchestrator } from './services/agentic/AgenticOrchestrator';
import { createStateManager } from './services/infrastructure/storage';

async function executeWithPersistence() {
  // 创建状态管理器
  const stateManager = await createStateManager();

  // 创建编排器，传入状态管理器
  const orchestrator = new AgenticOrchestrator({
    maxRetries: 3,
    timeoutPerStep: 30000
  }, stateManager);

  // 执行任务（状态会自动持久化）
  const result = await orchestrator.executeTask(
    '分析销售数据趋势',
    dataFiles
  );

  // 清理
  await stateManager.destroy();

  return result;
}
```

## 错误处理

所有存储操作都返回 `StorageResult<T>` 类型：

```typescript
interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: StorageError;
}

// 使用示例
const result = await stateManager.getExecutionState('task-123');

if (result.success) {
  console.log('State:', result.data);
} else {
  console.error('Error:', result.error?.message);

  if (result.error?.retryable) {
    // 可以重试
  }
}
```

## 最佳实践

1. **始终清理资源**：使用完毕后调用 `destroy()` 方法

2. **处理离线场景**：检查 `syncService.isSyncOnline()` 并处理离线情况

3. **批量操作**：对于多个操作，使用批量方法以提高性能

4. **设置合理的 TTL**：根据数据重要性设置适当的过期时间

5. **监控同步状态**：定期检查 `syncService.getPendingSync()`

6. **错误恢复**：实现重试逻辑处理 `retryable` 错误

## 故障排除

### Redis 连接失败

```typescript
// Redis 是可选依赖，如果没有 Redis 会降级到内存存储
// 检查连接状态
if (!stateManager.redis.isConnectionActive()) {
  console.warn('Redis not available, using in-memory storage');
}
```

### IndexedDB 不可用

```typescript
try {
  await clientManager.initialize();
} catch (error) {
  console.error('IndexedDB not available:', error);
  // 降级到 localStorage
}
```

### 同步冲突

```typescript
// 设置手动冲突解决
const syncService = createSyncService({
  conflictResolution: 'manual'
});

// 检查冲突
const conflicts = await syncService.getPendingSync();
```

## 性能优化

1. **使用批量操作**：`mget`, `mset`, `bulkAdd` 等

2. **启用压缩**：在配置中设置 `enableCompression: true`

3. **调整批量大小**：根据网络条件调整 `batchSize`

4. **定期清理**：启用自动清理过期数据

5. **监控性能**：使用 `getStats()` 监控存储使用情况
