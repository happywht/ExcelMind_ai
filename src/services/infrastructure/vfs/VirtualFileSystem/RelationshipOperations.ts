/**
 * 关系操作模块
 *
 * 核心职责：
 * 1. 添加文件关系
 * 2. 获取文件关系
 * 3. 删除所有关系
 *
 * @module infrastructure/vfs/VirtualFileSystem
 * @version 1.0.0
 */

import { VirtualFileSystem } from './core';
import type { FileRelationship } from './types';

/**
 * 添加文件关系
 */
export async function addRelationship(
  this: VirtualFileSystem,
  fromFileId: string,
  toFileId: string,
  type: import('./types').RelationType,
  metadata?: Record<string, any>
): Promise<FileRelationship> {
  this.ensureInitialized();

  if (!this.config.enableRelationships) {
    throw new Error('Relationship management is disabled');
  }

  // 验证文件存在
  if (!this.files.has(fromFileId)) {
    throw new Error(`Source file not found: ${fromFileId}`);
  }
  if (!this.files.has(toFileId)) {
    throw new Error(`Target file not found: ${toFileId}`);
  }

  // 检查循环依赖
  if (this.wouldCreateCircularDependency(fromFileId, toFileId)) {
    throw new Error(`Adding this relationship would create a circular dependency`);
  }

  console.log(`[VirtualFileSystem] Adding relationship: ${fromFileId} -> ${toFileId} (${type})`);

  const relationship: FileRelationship = {
    id: this.generateRelationshipId(),
    fromFileId,
    toFileId,
    type,
    metadata,
    createdAt: Date.now(),
  };

  // 添加到内存存储
  this.relationships.set(relationship.id, relationship);

  // 持久化到 Redis
  const redisService = this.getRedisService();
  if (redisService) {
    await this.persistRelationship(relationship);
  }

  console.log(`[VirtualFileSystem] ✅ Relationship added: ${relationship.id}`);

  // 发送事件
  this.emit('relationship:added', relationship);

  return relationship;
}

/**
 * 获取文件关系
 */
export async function getRelationships(
  this: VirtualFileSystem,
  vfsId: string
): Promise<FileRelationship[]> {
  this.ensureInitialized();

  const relationships: FileRelationship[] = [];

  for (const relationship of this.relationships.values()) {
    if (relationship.fromFileId === vfsId || relationship.toFileId === vfsId) {
      relationships.push(relationship);
    }
  }

  return relationships;
}

/**
 * 删除所有关系（内部方法）
 */
export async function removeAllRelationships(
  this: VirtualFileSystem,
  vfsId: string
): Promise<void> {
  const toRemove: string[] = [];

  for (const [id, relationship] of this.relationships.entries()) {
    if (relationship.fromFileId === vfsId || relationship.toFileId === vfsId) {
      toRemove.push(id);
    }
  }

  for (const id of toRemove) {
    this.relationships.delete(id);
    const redisService = this.getRedisService();
    if (redisService) {
      await redisService.del(`vfs:relationship:${id}`);
    }
  }
}
