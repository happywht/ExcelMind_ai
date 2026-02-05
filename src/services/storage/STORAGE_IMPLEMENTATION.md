# Phase 2 存储服务层实施文档

## 概述

本文档描述了Phase 2存储服务层的实现，该层为模板管理器和批量调度器提供统一的存储抽象。

## 版本信息

- **版本**: 2.0.0
- **构建日期**: 2025-01-25
- **阶段**: Day 2 - 存储服务层实现

## 架构设计

### 存储层次

```
┌─────────────────────────────────────┐
│   应用服务层                         │
│   - TemplateManager                 │
│   - BatchGenerationScheduler        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   存储服务工厂                       │
│   - 自动降级                         │
│   - 健康检查                         │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌─────▼──────┐
│ IndexedDB   │  │ LocalStorage│
│ (大文件)    │  │ (小数据)    │
└──────┬──────┘  └─────┬──────┘
       │                │
       └───────┬────────┘
               │
        ┌──────▼──────┐
        │ Memory Cache │
        │ (高性能)     │
        └─────────────┘
```

### 核心接口

所有存储服务实现 `IStorageService` 接口：

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

## 实现的服务

### 1. LocalStorageService

**位置**: `services/storage/LocalStorageService.ts`

**特性**:
- ✅ JSON 序列化/反序列化
- ✅ TTL 过期时间
- ✅ 命名空间隔离
- ✅ 容量检测和清理
- ✅ 错误降级到内存
- ✅ 事件监听

**使用场景**:
- 小数据量存储 (< 5MB)
- 用户偏好设置
- 临时数据缓存
- 简单键值对存储

**示例**:
```typescript
import { createLocalStorageService } from './services/storage';

const storage = createLocalStorageService({
  prefix: 'myapp_',
  defaultTTL: 3600,
  fallbackToMemory: true
});

await storage.set('user:1', { name: 'Alice' });
const user = await storage.get('user:1');
```

### 2. MemoryCacheService

**位置**: `services/storage/MemoryCacheService.ts`

**特性**:
- ✅ O(1) 时间复杂度的读写
- ✅ LRU/LFU/FIFO 淘汰策略
- ✅ TTL 自动过期
- ✅ 容量限制
- ✅ 访问统计
- ✅ 定期清理

**使用场景**:
- 高频访问数据
- 临时计算结果
- 会话数据
- 热点数据缓存

**示例**:
```typescript
import { createMemoryCacheService } from './services/storage';

const cache = createMemoryCacheService({
  maxEntries: 1000,
  evictionPolicy: 'lru',
  defaultTTL: 3600
});

await cache.set('hot:data', largeObject);
const data = await cache.get('hot:data');
```

### 3. IndexedDBStorageService

**位置**: `services/storage/IndexedDBStorageService.ts`

**特性**:
- ✅ 大文件存储支持
- ✅ 批量操作优化
- ✅ 索引查询
- ✅ 事务支持
- ✅ 自动数据库升级
- ✅ 命名空间隔离

**使用场景**:
- 模板文件存储
- 大数据量存储
- 离线数据持久化
- 复杂查询需求

**示例**:
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

await storage.set('template:1', fileBuffer);
const template = await storage.get('template:1');
```

### 4. StorageServiceFactory

**位置**: `services/storage/StorageServiceFactory.ts`

**特性**:
- ✅ 自动降级策略
- ✅ 健康检查
- ✅ 性能监控
- ✅ 统一错误处理

**降级链**: IndexedDB → LocalStorage → Memory

**示例**:
```typescript
import { createStorageServiceFactory } from './services/storage';

const factory = createStorageServiceFactory({
  preferred: 'indexedDB',
  fallbackChain: ['indexedDB', 'localStorage', 'memory'],
  enableAutoFallback: true,
  healthCheckInterval: 30000
});

const storage = factory.getDefaultService();
```

## 快捷方式

### 创建默认存储服务

```typescript
import { createDefaultStorageService } from './services/storage';

// 自动选择最佳可用存储
const storage = createDefaultStorageService();
```

### 直接使用特定存储

```typescript
import {
  createLocalStorageService,
  createMemoryCacheService,
  createIndexedDBStorageService
} from './services/storage';

// LocalStorage
const local = createLocalStorageService({ prefix: 'app_' });

// Memory Cache
const memory = createMemoryCacheService({ maxEntries: 500 });

// IndexedDB
const indexedDB = createIndexedDBStorageService({ dbName: 'AppDB' });
```

## 集成到现有服务

### TemplateManager 集成

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

// 初始化存储
await storage.initialize();

// 创建模板管理器
const templateManager = new TemplateManager(storage);
```

### BatchGenerationScheduler 集成

```typescript
import { BatchGenerationScheduler } from './services/BatchGenerationScheduler';
import { createMemoryCacheService } from './services/storage';

// 创建内存缓存用于任务状态
const taskCache = createMemoryCacheService({
  maxEntries: 10000,
  evictionPolicy: 'lru'
});

// 使用缓存存储任务状态
const scheduler = new BatchGenerationScheduler(
  templateManager,
  documentGenerator,
  websocketManager
);
```

## 配置选项

### LocalStorageConfig

```typescript
interface LocalStorageConfig {
  type: 'localStorage';
  prefix?: string;              // 存储前缀，默认 'ls_'
  namespacePrefix?: string;     // 命名空间前缀
  defaultTTL?: number;          // 默认TTL（秒），0 = 永不过期
  fallbackToMemory?: boolean;   // 错误时降级到内存
}
```

### MemoryCacheConfig

```typescript
interface MemoryCacheConfig {
  type: 'memory';
  namespacePrefix?: string;
  defaultTTL?: number;          // 默认TTL（秒）
  maxEntries?: number;          // 最大条目数
  evictionPolicy?: 'lru' | 'lfu' | 'fifo';
  enableStats?: boolean;
}
```

### IndexedDBConfig

```typescript
interface IndexedDBConfig {
  type: 'indexedDB';
  dbName: string;
  version: number;
  namespacePrefix?: string;
  defaultTTL?: number;
  stores: IndexedDBStoreConfig[];
}

interface IndexedDBStoreConfig {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: Array<{
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }>;
}
```

## 性能特性

### 读写性能

| 存储类型 | 读性能 | 写性能 | 容量 | 持久化 |
|---------|--------|--------|------|--------|
| Memory  | ~1μs   | ~1μs   | 有限 | 否 |
| LocalStorage | ~100μs | ~200μs | ~5MB | 是 |
| IndexedDB   | ~500μs | ~1ms   | 无限 | 是 |

### 内存使用

- **MemoryCacheService**: 默认最大1000条目，可配置
- **LocalStorageService**: 自动清理过期数据
- **IndexedDBStorageService**: 浏览器限制，通常50MB+

## 测试

### 运行测试

```bash
# 运行所有存储服务测试
pnpm test services/storage

# 运行特定测试
pnpm test LocalStorageService.test.ts
pnpm test IndexedDBStorageService.test.ts
```

### 测试覆盖

- ✅ 基础CRUD操作
- ✅ TTL过期机制
- ✅ 命名空间隔离
- ✅ 批量操作
- ✅ 键查询和模式匹配
- ✅ 元数据管理
- ✅ 统计信息收集
- ✅ 事件监听
- ✅ 工厂函数

## 错误处理

### 自动降级

```typescript
// IndexedDB 不可用时自动降级到 LocalStorage
const factory = createStorageServiceFactory({
  preferred: 'indexedDB',
  fallbackChain: ['indexedDB', 'localStorage', 'memory'],
  enableAutoFallback: true
});
```

### 错误类型

```typescript
// 存储未找到
throw new StorageNotFoundError(key);

// 容量不足
throw new StorageCapacityError(required, available);

// 序列化失败
throw new StorageSerializationError(value, error);

// 通用存储错误
throw new StorageError(message, code, retryable, details);
```

## 最佳实践

### 1. 选择合适的存储类型

```typescript
// 小数据、简单键值对 -> LocalStorage
const config = createLocalStorageService();

// 大文件、复杂数据 -> IndexedDB
const templates = createIndexedDBStorageService();

// 高频访问、临时数据 -> Memory
const cache = createMemoryCacheService();
```

### 2. 使用命名空间隔离

```typescript
await storage.set('key', value, { namespace: 'module1' });
await storage.clear('module1');
```

### 3. 设置合理的TTL

```typescript
// 短期缓存（5分钟）
await storage.set('temp', data, { ttl: 300 });

// 长期存储（1天）
await storage.set('config', config, { ttl: 86400 });

// 永久存储
await storage.set('user', profile, { ttl: 0 });
```

### 4. 批量操作优化

```typescript
// 批量设置比单个设置更快
await storage.batchSet([
  { key: 'key1', value: value1 },
  { key: 'key2', value: value2 },
  { key: 'key3', value: value3 }
]);
```

## 文件结构

```
services/storage/
├── index.ts                      # 统一导出
├── LocalStorageService.ts        # LocalStorage 实现
├── MemoryCacheService.ts         # 内存缓存实现
├── IndexedDBStorageService.ts    # IndexedDB 实现
├── StorageServiceFactory.ts      # 存储服务工厂
├── LocalStorageService.test.ts   # LocalStorage 测试
├── IndexedDBStorageService.test.ts # IndexedDB 测试
└── STORAGE_IMPLEMENTATION.md     # 本文档

types/
└── storage.ts                    # 存储类型定义
```

## 依赖关系

### 外部依赖

- 无（纯 TypeScript 实现）

### 内部依赖

```typescript
import type {
  IStorageService,
  StorageOptions,
  StoredItem,
  // ... 其他类型
} from '../../types/storage';
```

## 迁移指南

### 从旧的存储系统迁移

**旧代码**:
```typescript
localStorage.setItem('key', JSON.stringify(value));
const value = JSON.parse(localStorage.getItem('key'));
```

**新代码**:
```typescript
await storage.set('key', value);
const value = await storage.get('key');
```

### 替换现有的存储服务

```typescript
// 旧代码
class MyService {
  private storage = localStorage;
}

// 新代码
import { createDefaultStorageService } from './services/storage';

class MyService {
  private storage = createDefaultStorageService();
}
```

## 未来增强

### 计划功能

- [ ] Redis 支持（服务端）
- [ ] 压缩支持
- [ ] 加密支持
- [ ] 多标签页同步
- [ ] 离线同步
- [ ] 版本控制

### 性能优化

- [ ] 批量操作管道化
- [ ] 预取策略
- [ ] 智能缓存预热
- [ ] 写入缓冲区

## 维护者

- **模块**: Phase 2 存储服务层
- **状态**: ✅ 已完成
- **最后更新**: 2025-01-25

## 许可证

内部项目 - ExcelMind AI

---

**注意**: 此存储服务层是Phase 2实施的关键组件，为模板管理和批量生成提供可靠的存储基础设施。
