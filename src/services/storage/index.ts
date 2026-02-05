/**
 * 存储服务模块入口
 *
 * 统一导出所有存储服务相关的内容
 *
 * @module storage
 * @version 2.0.0
 */

// ============================================================================
// 类型定义导出
// ============================================================================

export * from '../../types/storage';

// ============================================================================
// 存储服务实现导出
// ============================================================================

export { LocalStorageService, createLocalStorageService } from './LocalStorageService';
export { MemoryCacheService, createMemoryCacheService } from './MemoryCacheService';
export { IndexedDBStorageService, createIndexedDBStorageService } from './IndexedDBStorageService';
export {
  StorageServiceFactory,
  createStorageServiceFactory,
  createDefaultStorageService
} from './StorageServiceFactory';

// ============================================================================
// 默认导出
// ============================================================================

import { createDefaultStorageService } from './StorageServiceFactory';
export default createDefaultStorageService;
