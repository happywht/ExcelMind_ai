/**
 * 外部化状态存储 - 类型定义
 *
 * 定义 Redis 和 IndexedDB 存储层的统一类型系统
 *
 * @module storage
 */

// ============================================================================
// Redis 配置类型
// ============================================================================

export interface RedisConfig {
  url: string;
  password?: string;
  keyPrefix: string;
  defaultTTL: number;
  retryStrategy?: {
    retries: number;
    delay: number;
    maxDelay: number;
  };
}

// ============================================================================
// IndexedDB 配置类型
// ============================================================================

export interface IDBConfig {
  dbName: string;
  version: number;
  stores: IDBStoreConfig[];
}

export interface IDBStoreConfig {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: Array<{
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }>;
}

// ============================================================================
// 状态快照类型
// ============================================================================

export interface StateSnapshot {
  sessionId: string;
  timestamp: Date;
  executionState: ExecutionState | null;
  userSettings: UserSettings | null;
  temporaryData: TemporaryData | null;
}

export interface ExecutionState {
  taskId: string;
  id?: string; // 新增字段：任务ID别名
  status: string;
  stage?: string; // 新增字段：当前阶段
  index?: number; // 新增字段：步骤索引
  progress: {
    percentage: number;
    currentPhase: string;
    message: string;
  };
  steps: any[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
  };
}

export interface UserSettings {
  userId: string;
  preferences: {
    theme?: string;
    language?: string;
    [key: string]: any;
  };
  recentFiles: string[];
  savedQueries: any[];
}

export interface TemporaryData {
  cache: Map<string, any>;
  drafts: Map<string, any>;
  clipboard: any;
}

// ============================================================================
// 存储操作类型
// ============================================================================

export interface StorageOperation<T = any> {
  key: string;
  value?: T;
  ttl?: number;
  timestamp: number;
}

export interface StorageResult<T = any> {
  success: boolean;
  data?: T;
  error?: StorageError;
}

export interface StorageError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}

// ============================================================================
// 同步类型
// ============================================================================

export interface SyncConfig {
  interval: number;
  batchSize: number;
  maxRetries: number;
  conflictResolution: 'local' | 'remote' | 'merge' | 'manual';
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  duration: number;
}

export interface SyncConflict {
  key: string;
  local: any;
  remote: any;
  timestamp: number;
  resolved?: boolean;
}

// ============================================================================
// 会话管理类型
// ============================================================================

export interface SessionInfo {
  sessionId: string;
  userId?: string;
  createdAt: number;
  lastActivity: number;
  expiry?: number;
  metadata: {
    userAgent?: string;
    platform?: string;
    [key: string]: any;
  };
}

export interface SessionData {
  info: SessionInfo;
  state: StateSnapshot;
  tasks: string[];
}

// ============================================================================
// 缓存类型
// ============================================================================

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  createdAt: number;
  accessedAt: number;
  expiry?: number;
  hits: number;
  size: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  expiredEntries: number;
}

// ============================================================================
// 存储事件类型
// ============================================================================

export interface StorageEvent {
  type: 'set' | 'delete' | 'clear' | 'expire';
  key: string;
  timestamp: number;
  source: 'local' | 'remote';
}

export interface StateChangeEvent {
  sessionId: string;
  changes: {
    added?: string[];
    updated?: string[];
    deleted?: string[];
  };
  timestamp: number;
}

// ============================================================================
// 批量操作类型
// ============================================================================

export interface BatchOperation<T = any> {
  type: 'set' | 'delete' | 'update';
  key: string;
  value?: T;
}

export interface BatchResult {
  successful: number;
  failed: number;
  errors: Array<{
    key: string;
    error: string;
  }>;
}

// ============================================================================
// 存储统计类型
// ============================================================================

export interface StorageStats {
  redis: {
    connected: boolean;
    memory: number;
    keys: number;
    uptime: number;
  };
  indexedDB: {
    databaseSize: number;
    entryCount: number;
    lastCleanup: number;
  };
  sync: {
    lastSync: number;
    syncCount: number;
    conflictCount: number;
  };
}

// ============================================================================
// 所有类型已在定义时导出，无需重复导出
// ============================================================================
