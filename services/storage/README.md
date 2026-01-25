# Phase 2 存储服务层 - 快速开始

## 概述

Phase 2存储服务层为ExcelMind AI提供统一的存储抽象，支持多种存储后端，具有自动降级、健康检查和性能监控功能。

## 快速开始

### 1. 基本使用

```typescript
import { createDefaultStorageService } from './services/storage';

// 创建默认存储服务（自动选择最佳可用存储）
const storage = createDefaultStorageService();

// 存储数据
await storage.set('user:1', { name: 'Alice', age: 30 });

// 获取数据
const user = await storage.get('user:1');

// 删除数据
await storage.delete('user:1');

// 检查是否存在
const exists = await storage.exists('user:1');
```

### 2. 使用特定存储类型

#### LocalStorage（小数据）

```typescript
import { createLocalStorageService } from './services/storage';

const storage = createLocalStorageService({
  prefix: 'myapp_',
  defaultTTL: 3600
});
```

#### Memory Cache（高性能）

```typescript
import { createMemoryCacheService } from './services/storage';

const cache = createMemoryCacheService({
  maxEntries: 1000,
  evictionPolicy: 'lru'
});
```

#### IndexedDB（大文件）

```typescript
import { createIndexedDBStorageService } from './services/storage';

const storage = createIndexedDBStorageService({
  dbName: 'MyAppDB',
  stores: [
    {
      name: 'templates',
      keyPath: 'id',
      indexes: [
        { name: 'category', keyPath: 'category' }
      ]
    }
  ]
});

await storage.initialize();
```

### 3. 高级功能

#### TTL 过期

```typescript
// 5分钟后过期
await storage.set('temp:data', value, { ttl: 300 });

// 永不过期
await storage.set('config', value, { ttl: 0 });
```

#### 命名空间隔离

```typescript
// 在不同命名空间中存储
await storage.set('key', value1, { namespace: 'module1' });
await storage.set('key', value2, { namespace: 'module2' });

// 清空特定命名空间
await storage.clear('module1');
```

#### 批量操作

```typescript
// 批量设置
await storage.batchSet([
  { key: 'key1', value: value1 },
  { key: 'key2', value: value2 },
  { key: 'key3', value: value3 }
]);

// 批量获取
const data = await storage.batchGet(['key1', 'key2', 'key3']);
```

#### 模式匹配查询

```typescript
// 获取所有用户相关的键
const userKeys = await storage.keys('user:*');

// 获取所有配置
const configKeys = await storage.keys('config:*');
```

### 4. 存储服务工厂

```typescript
import { createStorageServiceFactory } from './services/storage';

const factory = createStorageServiceFactory({
  preferred: 'indexedDB',
  fallbackChain: ['indexedDB', 'localStorage', 'memory'],
  enableAutoFallback: true,
  healthCheckInterval: 30000
});

// 获取默认存储
const storage = factory.getDefaultService();

// 获取特定类型的存储
const memoryStorage = factory.getService('memory');

// 获取统计信息
const stats = await factory.getStats();
```

### 5. 集成到TemplateManager

```typescript
import { TemplateManager } from './services/TemplateManager';
import { createIndexedDBStorageService } from './services/storage';

// 创建存储服务
const storage = createIndexedDBStorageService({
  dbName: 'TemplateDB',
  stores: [
    {
      name: 'templates',
      keyPath: 'id',
      indexes: [
        { name: 'category', keyPath: 'category' },
        { name: 'status', keyPath: 'status' }
      ]
    }
  ]
});

await storage.initialize();

// 创建模板管理器
const templateManager = new TemplateManager(storage);

// 使用模板管理器
const template = await templateManager.createTemplate({
  name: '合同模板',
  fileBuffer: arrayBuffer,
  category: '法务'
});
```

## API 参考

### 核心接口

```typescript
interface IStorageService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, options?: StorageOptions): Promise<void>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  keys(pattern?: string): Promise<string[]>
  clear(namespace?: string): Promise<void>
  getWithMetadata<T>(key: string): Promise<StoredItem<T> | null>
  batchSet<T>(items: Array<{key: string, value: T}>): Promise<void>
  batchGet<T>(keys: string[]): Promise<Map<string, T>>
  getStats?(): Promise<StorageStats>
}
```

### 存储选项

```typescript
interface StorageOptions {
  ttl?: number;           // 过期时间（秒）
  namespace?: string;     // 命名空间
  metadata?: Record<string, any>; // 自定义元数据
}
```

## 存储类型对比

| 特性 | Memory | LocalStorage | IndexedDB |
|-----|--------|--------------|-----------|
| 容量 | 有限 | ~5MB | 无限 |
| 持久化 | 否 | 是 | 是 |
| 性能 | 极高 | 中 | 中 |
| 复杂度 | 低 | 低 | 中 |
| 适用场景 | 临时缓存 | 简单数据 | 大文件/复杂数据 |

## 性能特性

- ✅ O(1) 时间复杂度的读写（Memory）
- ✅ 自动LRU淘汰策略
- ✅ TTL自动过期清理
- ✅ 批量操作优化
- ✅ 健康检查和自动降级
- ✅ 统计信息收集

## 错误处理

```typescript
// 自动降级：IndexedDB → LocalStorage → Memory
const factory = createStorageServiceFactory({
  enableAutoFallback: true
});

// 手动错误处理
try {
  await storage.set('key', value);
} catch (error) {
  if (error instanceof StorageCapacityError) {
    console.error('存储容量不足');
  }
}
```

## 最佳实践

1. **小数据用LocalStorage**：用户设置、配置信息
2. **大文件用IndexedDB**：模板文件、文档数据
3. **热数据用Memory**：临时计算结果、会话数据
4. **合理设置TTL**：避免数据过期或浪费存储空间
5. **使用命名空间**：隔离不同模块的数据
6. **批量操作**：提高性能

## 测试

```bash
# 运行所有测试
pnpm test services/storage

# 运行特定测试
pnpm test LocalStorageService.test.ts
```

## 文件结构

```
services/storage/
├── index.ts                      # 统一导出
├── LocalStorageService.ts        # LocalStorage 实现
├── MemoryCacheService.ts         # 内存缓存实现
├── IndexedDBStorageService.ts    # IndexedDB 实现
├── StorageServiceFactory.ts      # 存储服务工厂
├── LocalStorageService.test.ts   # 测试文件
├── IndexedDBStorageService.test.ts # 测试文件
├── STORAGE_IMPLEMENTATION.md     # 实施文档
└── README.md                     # 本文件
```

## 更多信息

详细实施文档请参阅：[STORAGE_IMPLEMENTATION.md](./STORAGE_IMPLEMENTATION.md)

---

**版本**: 2.0.0
**状态**: ✅ 已完成
**最后更新**: 2025-01-25
