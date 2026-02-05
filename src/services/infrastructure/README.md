# 基础设施服务 (Infrastructure Services)

智能文档填充系统的核心基础设施层，提供缓存、事件总线和重试策略等服务。

## 目录

- [概述](#概述)
- [服务列表](#服务列表)
- [快速开始](#快速开始)
- [详细文档](#详细文档)
- [最佳实践](#最佳实践)
- [性能优化](#性能优化)
- [测试](#测试)

## 概述

基础设施服务为整个应用提供可靠、高性能的底层支持：

- **缓存服务**: 多层缓存策略，自动优化存储位置
- **事件总线**: 类型安全的发布-订阅系统
- **重试服务**: 智能重试和降级策略

## 服务列表

### 1. 缓存服务 (CacheService)

三级缓存系统，根据数据大小和访问模式自动选择最优存储层级。

**特性**:
- 内存缓存（< 10KB，最快）
- LocalStorage缓存（< 100KB，中等速度）
- IndexedDB缓存（>= 100KB，持久化）
- LRU淘汰策略
- 自动过期清理
- 缓存提升机制

**性能指标**:
- 内存缓存: < 1ms
- LocalStorage: < 10ms
- IndexedDB: < 50ms
- 命中率目标: > 80%

### 2. 事件总线 (EventBus)

类型安全的发布-订阅事件系统，支持组件间松耦合通信。

**特性**:
- TypeScript类型安全
- 优先级订阅
- 一次性订阅
- 事件历史记录（可重放）
- 事件聚合和批处理
- 异步事件处理

**使用场景**:
- 任务状态更新
- 进度通知
- 错误传播
- 缓存事件

### 3. 重试服务 (RetryService)

智能重试和降级策略，提高系统可靠性。

**特性**:
- 多种退避策略（指数、线性、固定）
- 随机抖动（避免雷击效应）
- 可重试错误识别
- 降级策略支持
- 组合弹性策略

**预定义策略**:
- 指数退避（推荐用于网络请求）
- 线性退避
- 快速重试（临时性错误）
- 慢速重试（严重错误）

## 快速开始

### 安装和初始化

```typescript
import { createInfrastructure } from './services/infrastructure';

// 创建完整的基础设施服务
const infrastructure = createInfrastructure({
  cache: {
    strategy: 'hybrid',
    maxSize: 100,
    ttl: 300  // 5分钟
  },
  eventBus: {
    maxHistorySize: 1000
  },
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    enableJitter: true
  }
});

// 访问各个服务
const { cache, eventBus, retry } = infrastructure;
```

### 基础使用示例

#### 缓存服务

```typescript
import { createCacheService } from './services/infrastructure';

const cache = createCacheService();

// 生成缓存键
const key = cache.generateKey('ai_response', {
  query: '分析数据',
  model: 'gpt-4'
});

// 设置缓存
await cache.set(key, { result: '分析结果' }, 600); // 10分钟

// 获取缓存
const cached = await cache.get(key);
if (cached) {
  console.log('缓存命中:', cached.value);
  console.log('命中次数:', cached.hitCount);
} else {
  console.log('缓存未命中');
}

// 删除缓存
await cache.delete(key);

// 清空所有缓存
await cache.clear();
```

#### 事件总线

```typescript
import { createTypedEventBus, EventType } from './services/infrastructure';

const eventBus = createTypedEventBus();

// 监听任务事件
eventBus.on(EventType.TASK_CREATED, (data) => {
  console.log('任务创建:', data.taskId);
});

// 监听进度更新
eventBus.on(EventType.TASK_PROGRESS, (data) => {
  console.log(`进度: ${data.progress}% - ${data.stage}`);
});

// 发布事件
eventBus.emit(EventType.TASK_CREATED, { taskId: 'task-001' });
eventBus.emit(EventType.TASK_PROGRESS, {
  taskId: 'task-001',
  progress: 50,
  stage: '处理中'
});

// 一次性订阅
const unsubscribe = eventBus.once(EventType.TASK_COMPLETED, (data) => {
  console.log('任务完成:', data.taskId);
});
```

#### 重试服务

```typescript
import { RetryStrategies, createResilienceStrategy } from './services/infrastructure';

// 使用预定义的重试策略
const retry = RetryStrategies.exponentialBackoff({
  maxRetries: 3,
  initialDelay: 1000,
  jitter: true
});

// 执行带重试的操作
try {
  const result = await retry.executeWithRetry(
    async () => {
      // 可能失败的操作
      return await fetchApiData();
    },
    (error, attempt, delay) => {
      console.log(`第 ${attempt + 1} 次重试，等待 ${delay}ms`);
    }
  );
  console.log('成功:', result);
} catch (error) {
  console.error('所有重试失败:', error);
}

// 使用完整的弹性策略（重试 + 降级）
const resilient = createResilienceStrategy(
  { maxRetries: 3, initialDelay: 1000 },
  fallbackStrategy
);

const result = await resilient.execute('api.call', async () => {
  return await fetchApiData();
});
```

## 详细文档

### 缓存服务 API

#### CacheService

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `get(key)` | `CacheKey` | `Promise<CacheEntry \| null>` | 获取缓存 |
| `set(key, value, ttl?)` | `CacheKey, T, number?` | `Promise<void>` | 设置缓存 |
| `delete(key)` | `CacheKey` | `Promise<boolean>` | 删除缓存 |
| `clear()` | - | `Promise<void>` | 清空缓存 |
| `generateKey(type, content)` | `string, any` | `CacheKey` | 生成缓存键 |

#### CacheEntry

```typescript
interface CacheEntry<T> {
  key: CacheKey;
  value: T;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  metadata: {
    size: number;
    tags: string[];
    source: 'memory' | 'localStorage' | 'indexedDB';
  };
}
```

### 事件总线 API

#### TypedEventBus

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `on(event, handler)` | `EventType, function` | `() => void` | 订阅事件 |
| `once(event, handler)` | `EventType, function` | `() => void` | 一次性订阅 |
| `emit(event, data)` | `EventType, data` | `void` | 发布事件 |
| `subscriberCount(event)` | `string` | `number` | 获取订阅者数量 |
| `registeredEvents()` | - | `string[]` | 获取所有事件 |
| `getHistory(event?, limit?)` | `string?, number?` | `Event[]` | 获取历史 |
| `clear()` | - | `void` | 清空订阅 |

#### 预定义事件类型

```typescript
enum EventType {
  // 任务事件
  TASK_CREATED = 'task:created',
  TASK_STARTED = 'task:started',
  TASK_COMPLETED = 'task:completed',
  TASK_FAILED = 'task:failed',
  TASK_PROGRESS = 'task:progress',

  // AI事件
  AI_ROUND_STARTED = 'ai:round_started',
  AI_ROUND_COMPLETED = 'ai:round_completed',

  // 缓存事件
  CACHE_HIT = 'cache:hit',
  CACHE_MISS = 'cache:miss',

  // 错误事件
  SERVICE_ERROR = 'service:error'
}
```

### 重试服务 API

#### RetryStrategy

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `executeWithRetry(fn, onRetry?)` | `function, function?` | `Promise<T>` | 执行带重试 |
| `shouldRetry(error, attempt)` | `Error, number` | `boolean` | 判断是否重试 |
| `getRetryDelay(attempt)` | `number` | `number` | 计算延迟时间 |

#### 预定义策略

```typescript
// 指数退避（推荐）
RetryStrategies.exponentialBackoff({
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  jitter: true
});

// 线性退避
RetryStrategies.linearBackoff({
  maxRetries: 5,
  initialDelay: 500
});

// 快速重试
RetryStrategies.fastRetry();

// 慢速重试
RetryStrategies.slowRetry();
```

#### 降级策略

```typescript
// 返回默认值
FallbackStrategies.defaultValue({ data: 'default' });

// 返回空数组
FallbackStrategies.emptyArray();

// 返回空对象
FallbackStrategies.emptyObject();

// 从缓存获取
FallbackStrategies.fromCache(cacheService, cacheKey);
```

## 最佳实践

### 1. 缓存使用

```typescript
// ✅ 好的做法
const key = cache.generateKey('sql_query', {
  sql: query,
  sheets: ['users', 'orders']
});

let result = await cache.get(key);
if (!result) {
  result = await executeQuery(query);
  await cache.set(key, result, 1800); // 30分钟
}

// ❌ 不好的做法
const data = await executeQuery(query);
await cache.set('key', data); // 使用固定键
```

### 2. 事件总线

```typescript
// ✅ 好的做法
const unsubscribe = eventBus.on(EventType.TASK_PROGRESS, (data) => {
  updateUI(data);
});

// 组件卸载时清理
onUnmounted(() => {
  unsubscribe();
});

// ❌ 不好的做法
eventBus.on(EventType.TASK_PROGRESS, (data) => {
  // 没有保存unsubscribe函数，导致内存泄漏
});
```

### 3. 错误处理

```typescript
// ✅ 好的做法
const resilient = createResilienceStrategy(
  RetryStrategies.exponentialBackoff(),
  fallbackStrategy
);

try {
  const result = await resilient.execute('api.call', operation);
} catch (error) {
  // 记录错误并通知用户
  logger.error('操作失败', error);
  notifyUser('操作失败，请稍后重试');
}

// ❌ 不好的做法
const result = await operation(); // 没有重试和降级
```

### 4. 性能优化

```typescript
// ✅ 批量处理
const aggregator = new EventAggregator(eventBus, 1000);

eventBus.subscribe('cache.batch:aggregated', async (data) => {
  // 批量处理，减少IO操作
  await batchUpdateCache(data.data);
});

// ❌ 单独处理
for (const item of items) {
  await cache.set(item.key, item.value); // 大量IO
}
```

## 性能优化

### 缓存优化

1. **合理设置TTL**
   - 热数据: 30-60分钟
   - 温数据: 10-30分钟
   - 冷数据: 5-10分钟

2. **监控命中率**
   ```typescript
   const hitRate = hits / (hits + misses);
   if (hitRate < 0.8) {
     // 调整缓存策略
   }
   ```

3. **内存限制**
   ```typescript
   const cache = createCacheService({
     memory: { maxSize: 100 } // 限制内存缓存条目数
   });
   ```

### 事件总线优化

1. **避免频繁事件**
   ```typescript
   // ❌ 不好的做法
   for (let i = 0; i < 1000; i++) {
     eventBus.emit('progress', { percent: i / 10 });
   }

   // ✅ 好的做法（节流）
   eventBus.emit('progress', { percent: 100 });
   ```

2. **清理订阅**
   ```typescript
   // 组件卸载时
   onUnmounted(() => {
     unsubscribe();
   });
   ```

### 重试优化

1. **合理的重试次数**
   - 网络请求: 3次
   - 数据库操作: 2次
   - 外部API: 3-5次

2. **使用抖动**
   ```typescript
   // 避免雷击效应
   const retry = RetryStrategies.exponentialBackoff({
     jitter: true  // 启用随机抖动
   });
   ```

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定服务测试
npm test cacheService
npm test eventBus
npm test retryService

# 查看覆盖率
npm test -- --coverage
```

### 测试示例

```typescript
import { createCacheService } from './cacheService';

describe('CacheService', () => {
  test('应该能够设置和获取缓存', async () => {
    const cache = createCacheService();
    const key = cache.generateKey('test', { id: 1 });

    await cache.set(key, { data: 'test' });
    const result = await cache.get(key);

    expect(result?.value).toEqual({ data: 'test' });
  });
});
```

## 性能基准

### 缓存服务

| 操作 | 内存 | LocalStorage | IndexedDB |
|------|------|--------------|-----------|
| 读取 | < 1ms | < 10ms | < 50ms |
| 写入 | < 1ms | < 15ms | < 100ms |
| 删除 | < 1ms | < 5ms | < 30ms |

### 事件总线

| 操作 | 性能 |
|------|------|
| 发布 | < 0.1ms |
| 订阅 | < 0.05ms |
| 10个订阅者通知 | < 1ms |

### 重试服务

| 策略 | 平均重试时间 |
|------|-------------|
| 快速重试 | < 500ms |
| 指数退避 | < 3s (3次) |
| 线性退避 | < 5s (5次) |

## 相关资源

- [完整示例](./examples/usage-examples.ts)
- [单元测试](./__tests__/)
- [API文档](../)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
