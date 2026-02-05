/**
 * 内存存储服务 - Phase 2 基础设施
 *
 * 职责：提供内存级别的键值存储，用于开发测试
 * 功能：数据存储、查询、索引管理
 *
 * @module services/storage/memoryStorageService
 * @version 1.0.0
 * @description 内存存储服务实现
 */

import { IStorageService } from '../../types/dataQuality';

/**
 * 内存存储服务
 *
 * 实现IStorageService接口，提供内存级别的数据存储
 * 注意：数据仅在进程运行期间保存，重启后丢失
 */
export class MemoryStorageService implements IStorageService {
  private storage: Map<string, any>;
  private sets: Map<string, Set<string>>;

  /**
   * 构造函数
   */
  constructor() {
    this.storage = new Map();
    this.sets = new Map();
  }

  /**
   * 设置值
   *
   * @param key 键
   * @param value 值
   */
  async set(key: string, value: any): Promise<void> {
    this.storage.set(key, value);
  }

  /**
   * 获取值
   *
   * @param key 键
   * @returns 值或undefined
   */
  async get(key: string): Promise<any> {
    return this.storage.get(key);
  }

  /**
   * 删除值
   *
   * @param key 键
   */
  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /**
   * 检查键是否存在
   *
   * @param key 键
   * @returns 是否存在
   */
  async has(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  /**
   * 查询
   *
   * @param collection 集合名称（前缀）
   * @param filters 筛选条件
   * @returns 匹配的数据数组
   */
  async query(collection: string, filters: any): Promise<any[]> {
    const results: any[] = [];

    // 遍历所有键，查找匹配的项
    for (const [key, value] of this.storage.entries()) {
      if (key.startsWith(collection)) {
        // 应用筛选条件
        if (this.matchFilters(value, filters)) {
          results.push(value);
        }
      }
    }

    // 排序（如果有时间戳字段）
    results.sort((a, b) => {
      const aTime = a.timestamp || 0;
      const bTime = b.timestamp || 0;
      return bTime - aTime; // 最新的在前
    });

    // 应用分页
    if (filters.limit) {
      const offset = filters.offset || 0;
      return results.slice(offset, offset + filters.limit);
    }

    return results;
  }

  /**
   * 添加到集合
   *
   * @param setName 集合名称
   * @param value 值
   */
  async addToSet(setName: string, value: string): Promise<void> {
    if (!this.sets.has(setName)) {
      this.sets.set(setName, new Set());
    }
    this.sets.get(setName)!.add(value);
  }

  /**
   * 从集合移除
   *
   * @param setName 集合名称
   * @param value 值
   */
  async removeFromSet(setName: string, value: string): Promise<void> {
    const set = this.sets.get(setName);
    if (set) {
      set.delete(value);
    }
  }

  /**
   * 获取集合所有成员
   *
   * @param setName 集合名称
   * @returns 集合成员数组
   */
  async getSetMembers(setName: string): Promise<string[]> {
    const set = this.sets.get(setName);
    return set ? Array.from(set) : [];
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    this.storage.clear();
    this.sets.clear();
  }

  /**
   * 获取存储大小
   *
   * @returns 存储的项数量
   */
  async size(): Promise<number> {
    return this.storage.size;
  }

  /**
   * 获取所有键
   *
   * @param pattern 键模式（前缀）
   * @returns 匹配的键数组
   */
  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.storage.keys());

    if (!pattern) {
      return allKeys;
    }

    return allKeys.filter(key => key.startsWith(pattern));
  }

  /**
   * 批量设置
   *
   * @param items 键值对数组
   */
  async mset(items: Array<{ key: string; value: any }>): Promise<void> {
    for (const item of items) {
      await this.set(item.key, item.value);
    }
  }

  /**
   * 批量获取
   *
   * @param keys 键数组
   * @returns 值数组
   */
  async mget(keys: string[]): Promise<any[]> {
    const results: any[] = [];
    for (const key of keys) {
      results.push(await this.get(key));
    }
    return results;
  }

  /**
   * 匹配筛选条件
   *
   * @param value 数据值
   * @param filters 筛选条件
   * @returns 是否匹配
   */
  private matchFilters(value: any, filters: any): boolean {
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }

    for (const [key, filterValue] of Object.entries(filters)) {
      if (value[key] !== filterValue) {
        return false;
      }
    }

    return true;
  }
}

/**
 * 创建内存存储服务实例
 */
export function createMemoryStorageService(): MemoryStorageService {
  return new MemoryStorageService();
}

// 导出默认实例（单例）
export const memoryStorageService = new MemoryStorageService();
