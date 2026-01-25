# 基础设施服务 - 快速参考指南

## 快速导入

```typescript
// 导入所有基础设施服务
import {
  createInfrastructure,
  createCacheService,
  createTypedEventBus,
  createResilienceStrategy,
  EventType,
  RetryStrategies,
  FallbackStrategies
} from '@/services/infrastructure';
```

## 常用操作速查

### 缓存服务 (CacheService)

```typescript
// 创建服务
const cache = createCacheService();

// 生成缓存键
const key = cache.generateKey('type', { content });

// 基本操作
await cache.set(key, value, ttl);        // 设置
const result = await cache.get(key);     // 获取
await cache.delete(key);                 // 删除
await cache.clear();                     // 清空

// 检查缓存
if (!result) {
  // 缓存未命中，执行查询
  const data = await fetchData();
  await cache.set(key, data, 1800);  // 缓存 30 分钟
}
```

### 事件总线 (EventBus)

```typescript
// 创建类型安全的事件总线
const eventBus = createTypedEventBus();

// 监听事件
const unsubscribe = eventBus.on(EventType.TASK_CREATED, (data) => {
  console.log('任务创建:', data.taskId);
});

// 发布事件
eventBus.emit(EventType.TASK_CREATED, { taskId: 'task-001' });

// 取消订阅
unsubscribe();

// 一次性订阅
eventBus.once(EventType.TASK_COMPLETED, (data) => {
  console.log('任务完成');
});
```

### 重试服务 (RetryService)

```typescript
// 使用预定义策略
const retry = RetryStrategies.exponentialBackoff({
  maxRetries: 3,
  initialDelay: 1000,
  jitter: true
});

// 执行带重试的操作
const result = await retry.executeWithRetry(
  async () => await fetchData(),
  (error, attempt, delay) => {
    console.log(`重试 ${attempt + 1}, 等待 ${delay}ms`);
  }
);

// 使用完整弹性策略
const resilient = createResilienceStrategy();
const result = await resilient.execute('api.call', async () => {
  return await fetchApiData();
});
```

## 预定义事件类型

```typescript
// 任务事件
EventType.TASK_CREATED      // 任务创建
EventType.TASK_STARTED      // 任务开始
EventType.TASK_PROGRESS     // 任务进度
EventType.TASK_COMPLETED    // 任务完成
EventType.TASK_FAILED       // 任务失败

// AI 事件
EventType.AI_ROUND_STARTED     // AI 回合开始
EventType.AI_ROUND_COMPLETED   // AI 回合完成

// 缓存事件
EventType.CACHE_HIT         // 缓存命中
EventType.CACHE_MISS        // 缓存未命中

// 错误事件
EventType.SERVICE_ERROR     // 服务错误
```

## 预定义重试策略

```typescript
// 指数退避（推荐，用于网络请求）
RetryStrategies.exponentialBackoff({ maxRetries: 3, initialDelay: 1000 })

// 线性退避
RetryStrategies.linearBackoff({ maxRetries: 5, initialDelay: 500 })

// 固定延迟
RetryStrategies.fixedDelay({ initialDelay: 2000 })

// 快速重试（临时性错误）
RetryStrategies.fastRetry()

// 慢速重试（严重错误）
RetryStrategies.slowRetry()
```

## 预定义降级策略

```typescript
// 返回默认值
FallbackStrategies.defaultValue({ data: 'default' })

// 返回空数组
FallbackStrategies.emptyArray()

// 返回空对象
FallbackStrategies.emptyObject()

// 从缓存获取
FallbackStrategies.fromCache(cacheService, cacheKey)
```

## 常见使用模式

### 模式 1: 带缓存的 API 调用

```typescript
async function fetchWithCache<T>(
  cache: CacheService,
  key: CacheKey,
  fn: () => Promise<T>,
  ttl: number = 1800
): Promise<T> {
  let result = await cache.get(key);
  if (result) {
    return result.value as T;
  }

  const data = await fn();
  await cache.set(key, data, ttl);
  return data;
}

// 使用
const key = cache.generateKey('api', { endpoint: '/users' });
const users = await fetchWithCache(cache, key, () => fetchUsers());
```

### 模式 2: 带重试和降级的操作

```typescript
const resilient = createResilienceStrategy(
  RetryStrategies.exponentialBackoff(),
  fallbackStrategy
);

async function robustOperation() {
  try {
    return await resilient.execute('api.call', async () => {
      return await fetchApiData();
    });
  } catch (error) {
    console.error('操作失败，包括降级:', error);
    throw error;
  }
}
```

### 模式 3: 事件驱动的任务处理

```typescript
class TaskProcessor {
  constructor(
    private cache: CacheService,
    private eventBus: TypedEventBus
  ) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.eventBus.on(EventType.TASK_CREATED, async (data) => {
      await this.processTask(data.taskId);
    });

    this.eventBus.on(EventType.TASK_PROGRESS, (data) => {
      this.updateProgress(data.taskId, data.progress);
    });
  }

  private async processTask(taskId: string) {
    // 任务处理逻辑
  }

  private updateProgress(taskId: string, progress: number) {
    // 更新进度 UI
  }
}
```

### 模式 4: 批量缓存预热

```typescript
async function warmupCache(cache: CacheService) {
  const commonData = [
    { key: 'config', data: defaultConfig },
    { key: 'users', data: defaultUsers }
  ];

  await Promise.all(
    commonData.map(({ key, data }) =>
      cache.set(cache.generateKey('preload', { key }), data, 3600)
    )
  );
}
```

## 性能优化提示

### 缓存优化

```typescript
// ✅ 使用合适的 TTL
await cache.set(key, data, 1800);  // 热数据 30 分钟
await cache.set(key, data, 600);   // 温数据 10 分钟
await cache.set(key, data, 300);   // 冷数据 5 分钟

// ✅ 监控命中率
const hitRate = hits / (hits + misses);
if (hitRate < 0.8) {
  // 调整策略
}
```

### 事件优化

```typescript
// ✅ 清理订阅
const unsubscribe = eventBus.on(EventType.TASK_CREATED, handler);
// 组件卸载时
onUnmounted(unsubscribe);

// ✅ 批量处理事件
const aggregator = new EventAggregator(eventBus, 1000);
```

### 重试优化

```typescript
// ✅ 使用抖动避免雷击效应
const retry = RetryStrategies.exponentialBackoff({
  jitter: true
});

// ✅ 设置合理的最大延迟
const retry = RetryStrategies.exponentialBackoff({
  maxDelay: 30000  // 最大 30 秒
});
```

## 调试技巧

### 启用详细日志

```typescript
// 开发环境启用事件日志
if (process.env.NODE_ENV === 'development') {
  eventBus.subscribe('*', (data, event) => {
    console.log(`[Event] ${event}:`, data);
  });
}
```

### 检查缓存状态

```typescript
// 检查缓存条目详情
const entry = await cache.get(key);
if (entry) {
  console.log({
    命中次数: entry.hitCount,
    创建时间: new Date(entry.createdAt),
    过期时间: new Date(entry.expiresAt),
    存储位置: entry.metadata?.source,
    数据大小: entry.metadata?.size
  });
}
```

### 监控重试行为

```typescript
const retry = RetryStrategies.exponentialBackoff();

await retry.executeWithRetry(
  operation,
  (error, attempt, delay) => {
    console.log({
      错误: error.message,
      重试次数: attempt + 1,
      等待时间: delay + 'ms'
    });
  }
);
```

## 常见错误处理

### 缓存错误

```typescript
try {
  await cache.set(key, largeData);
} catch (error) {
  if (error.message.includes('容量不足')) {
    // 清理旧缓存或使用其他存储
    await cache.clear();
  }
}
```

### 事件总线错误

```typescript
// 处理器错误不会影响其他处理器
eventBus.subscribe('test.event', (data) => {
  try {
    // 可能失败的操作
  } catch (error) {
    console.error('处理器错误:', error);
    // 不会阻止其他处理器执行
  }
});
```

### 重试失败处理

```typescript
try {
  const result = await resilient.execute('api.call', operation);
} catch (error) {
  // 所有重试和降级都失败了
  logger.error('operation', '最终失败', error);
  // 通知用户或使用默认值
}
```

## 配置示例

### 开发环境

```typescript
const devInfrastructure = createInfrastructure({
  cache: {
    strategy: 'memory',      // 仅内存缓存
    maxSize: 100,
    ttl: 300
  },
  eventBus: {
    maxHistorySize: 100      // 保留最近 100 条事件
  },
  retry: {
    maxRetries: 2,           // 减少重试次数
    initialDelay: 500,       // 快速重试
    enableJitter: false      // 禁用抖动
  }
});
```

### 生产环境

```typescript
const prodInfrastructure = createInfrastructure({
  cache: {
    strategy: 'hybrid',      // 使用混合策略
    maxSize: 1000,
    ttl: 1800               // 30 分钟
  },
  eventBus: {
    maxHistorySize: 1000     // 保留更多历史
  },
  retry: {
    maxRetries: 5,           // 更多重试次数
    initialDelay: 1000,      // 标准延迟
    enableJitter: true       // 启用抖动
  }
});
```

## 测试辅助函数

```typescript
// 创建测试用的缓存服务
export function createTestCache() {
  return createCacheService({
    memory: { maxSize: 10, ttl: 60 },
    localStorage: { enabled: false, maxSize: 0, ttl: 0 },
    indexedDB: { enabled: false, dbName: '', storeName: '' },
    strategy: 'memory'
  });
}

// 创建测试用的事件总线
export function createTestEventBus() {
  return createTypedEventBus({ maxHistorySize: 50 });
}

// 创建测试用的重试策略
export function createTestRetry() {
  return RetryStrategies.fixedDelay({ maxRetries: 2, initialDelay: 10 });
}
```

## 更多资源

- [完整文档](./README.md)
- [使用示例](./examples/usage-examples.ts)
- [单元测试](./__tests__/)
- [DevOps 指南](./DEVOPS_GUIDE.md)
- [运行脚本](./package-scripts.md)
