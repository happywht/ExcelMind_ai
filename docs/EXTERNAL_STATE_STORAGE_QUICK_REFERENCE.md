# 外部化状态存储 - 快速参考

## 快速开始

### 安装依赖

```bash
pnpm add redis
```

### 后端使用

```typescript
import { createBackendStorageSystem, AgenticOrchestrator } from './services';

async function main() {
  // 创建后端存储系统
  const { stateManager } = await createBackendStorageSystem();

  // 创建编排器，传入状态管理器
  const orchestrator = new AgenticOrchestrator({}, stateManager);

  // 执行任务（状态会自动持久化到 Redis）
  const result = await orchestrator.executeTask('分析销售数据', dataFiles);

  // 清理
  await stateManager.destroy();
}
```

### 前端使用

```typescript
import { createFrontendStorageSystem } from './services';

async function init() {
  // 创建前端存储系统
  const { clientManager } = await createFrontendStorageSystem();

  // 保存执行进度
  await clientManager.saveProgress('task-123', executionState);

  // 获取进度
  const progress = await clientManager.getProgress('task-123');

  // 添加最近文件
  await clientManager.addRecentFile('/path/to/file.xlsx');

  // 缓存结果
  await clientManager.cacheResult('query-result', data, 3600);
}
```

### 完整系统（包含同步）

```typescript
import { createStorageSystem } from './services';

async function init() {
  // 创建完整的存储系统（包含同步功能）
  const storage = await createStorageSystem();

  // 执行双向同步
  const result = await storage.syncService.bidirectionalSync('task-123');

  console.log(`Synced: ${result.synced}, Failed: ${result.failed}`);

  // 清理
  await storage.stateManager.destroy();
  await storage.clientManager.destroy();
  await storage.syncService.destroy();
}
```

## 核心 API

### StateManager（后端）

| 方法 | 说明 |
|------|------|
| `createSession(userId)` | 创建新会话 |
| `getSession(sessionId)` | 获取会话信息 |
| `deleteSession(sessionId)` | 删除会话 |
| `saveExecutionState(id, state)` | 保存执行状态 |
| `getExecutionState(id)` | 获取执行状态 |
| `updateExecutionProgress(id, progress)` | 更新执行进度 |
| `saveUserSettings(userId, settings)` | 保存用户设置 |
| `getUserSettings(userId)` | 获取用户设置 |

### ClientStateManager（前端）

| 方法 | 说明 |
|------|------|
| `saveProgress(id, state)` | 保存执行进度 |
| `getProgress(id)` | 获取执行进度 |
| `getAllProgress()` | 获取所有进度 |
| `getSessionExecutions()` | 获取当前会话的执行 |
| `saveSettings(settings)` | 保存用户设置 |
| `updatePreferences(prefs)` | 更新用户偏好 |
| `addRecentFile(path)` | 添加最近文件 |
| `cacheResult(key, value, ttl)` | 缓存结果 |
| `getCachedResult(key)` | 获取缓存结果 |

### SyncService（同步）

| 方法 | 说明 |
|------|------|
| `bidirectionalSync(id)` | 双向同步单个数据 |
| `batchBidirectionalSync(ids)` | 批量双向同步 |
| `syncToServer(id, data)` | 同步到服务器 |
| `syncFromServer(id)` | 从服务器同步 |
| `triggerSync(ids?)` | 手动触发同步 |
| `isSyncOnline()` | 检查在线状态 |
| `getPendingSync()` | 获取待同步列表 |

## 配置

### Redis 配置

```typescript
// config/storage.config.ts
export const storageConfig = {
  redis: {
    url: 'redis://localhost:6379',
    password: undefined,
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
      { name: 'executions', keyPath: 'id' },
      { name: 'settings', keyPath: 'userId' },
      { name: 'cache', keyPath: 'key' },
      { name: 'sessions', keyPath: 'sessionId' },
      { name: 'temporary', keyPath: 'key' },
    ]
  }
};
```

### 同步配置

```typescript
export const storageConfig = {
  sync: {
    interval: 5000, // 5秒同步一次
    batchSize: 100,
    maxRetries: 3,
    conflictResolution: 'merge', // 'local' | 'remote' | 'merge' | 'manual'
  }
};
```

## 冲突解决策略

| 策略 | 说明 |
|------|------|
| `local` | 使用本地版本 |
| `remote` | 使用远程版本 |
| `merge` | 合并两个版本 |
| `manual` | 手动解决冲突 |

## 错误处理

```typescript
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

## React 集成示例

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

      // 监听变化
      const unsubscribe = manager.addListener(() => {
        loadProgress();
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
    const interval = setInterval(loadProgress, 1000);
    return () => clearInterval(interval);
  }, [clientManager]);

  return (
    <div>
      {progress && (
        <>
          <p>状态: {progress.status}</p>
          <p>进度: {progress.progress.percentage}%</p>
        </>
      )}
    </div>
  );
}
```

## 文件路径

| 文件 | 路径 |
|------|------|
| 类型定义 | `types/storageTypes.ts` |
| 配置文件 | `config/storage.config.ts` |
| Redis 服务 | `services/infrastructure/storage/RedisService.ts` |
| 状态管理器 | `services/infrastructure/storage/StateManager.ts` |
| IndexedDB 服务 | `services/infrastructure/storage/IndexedDBService.ts` |
| 客户端管理器 | `services/infrastructure/storage/ClientStateManager.ts` |
| 同步服务 | `services/infrastructure/storage/SyncService.ts` |
| 统一导出 | `services/infrastructure/storage/index.ts` |
| 使用指南 | `docs/EXTERNAL_STATE_STORAGE_USAGE.md` |
| 实施总结 | `EXTERNAL_STATE_STORAGE_IMPLEMENTATION.md` |

## 常见问题

### Q: Redis 连接失败怎么办？

A: Redis 是可选依赖，连接失败会自动降级到内存存储。

### Q: IndexedDB 不可用怎么办？

A: 可以降级到 localStorage，注意容量限制。

### Q: 如何处理同步冲突？

A: 配置 `conflictResolution` 策略，默认为 `merge`。

### Q: 如何清理过期数据？

A: 系统会自动清理，也可以手动调用 `clearExpiredCache()`。

### Q: 性能开销如何？

A: 预期性能开销 < 5%，批量操作可提高效率。
