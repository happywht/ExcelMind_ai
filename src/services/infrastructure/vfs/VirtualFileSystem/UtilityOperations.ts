/**
 * 工具操作模块
 *
 * 核心职责：
 * 1. 获取VFS统计信息
 * 2. 清理临时文件
 * 3. 搜索文件
 *
 * @module infrastructure/vfs/VirtualFileSystem
 * @version 1.0.0
 */

import { VirtualFileSystem } from './core';
import type { VFSStats, VirtualFileInfo } from './types';
import { FileRole } from './types';

/**
 * 获取 VFS 统计信息
 */
export async function getStats(
  this: VirtualFileSystem
): Promise<VFSStats> {
  this.ensureInitialized();

  const stats: VFSStats = {
    totalFiles: this.files.size,
    totalSize: 0,
    filesByRole: {
      [FileRole.PRIMARY_SOURCE]: 0,
      [FileRole.AUXILIARY_SOURCE]: 0,
      [FileRole.CONFIGURATION]: 0,
      [FileRole.TEMPLATE]: 0,
      [FileRole.OUTPUT]: 0,
      [FileRole.TEMPORARY]: 0,
    },
    filesByType: {},
    totalRelationships: this.relationships.size,
    totalVersions: 0,
  };

  // 统计文件信息
  for (const fileInfo of this.files.values()) {
    stats.totalSize += fileInfo.size;
    stats.filesByRole[fileInfo.role]++;

    const type = fileInfo.type;
    stats.filesByType[type] = (stats.filesByType[type] || 0) + 1;
  }

  // 统计版本数量
  for (const versions of this.versions.values()) {
    stats.totalVersions += versions.length;
  }

  return stats;
}

/**
 * 清理临时文件
 */
export async function cleanupTempFiles(
  this: VirtualFileSystem,
  olderThan: number = 3600000
): Promise<number> {
  this.ensureInitialized();

  console.log(`[VirtualFileSystem] Cleaning up temp files older than ${olderThan}ms`);

  const now = Date.now();
  let cleaned = 0;

  for (const [vfsId, fileInfo] of this.files.entries()) {
    if (fileInfo.role === FileRole.TEMPORARY) {
      const age = now - fileInfo.uploadTime;
      if (age > olderThan) {
        try {
          const { deleteFile } = require('./FileOperations');
          await deleteFile.call(this, vfsId);
          cleaned++;
        } catch (error) {
          console.error(`[VirtualFileSystem] Failed to delete temp file: ${vfsId}`, error);
        }
      }
    }
  }

  console.log(`[VirtualFileSystem] ✅ Cleaned up ${cleaned} temp files`);
  return cleaned;
}

/**
 * 搜索文件
 */
export async function searchFiles(
  this: VirtualFileSystem,
  query: {
    name?: string;
    type?: string;
    role?: FileRole;
    minSize?: number;
    maxSize?: number;
    uploadedAfter?: number;
    uploadedBefore?: number;
  }
): Promise<VirtualFileInfo[]> {
  this.ensureInitialized();

  const results: VirtualFileInfo[] = [];

  for (const fileInfo of this.files.values()) {
    // 名称匹配（不区分大小写）
    if (query.name && !fileInfo.name.toLowerCase().includes(query.name.toLowerCase())) {
      continue;
    }

    // 类型匹配
    if (query.type && fileInfo.type !== query.type) {
      continue;
    }

    // 角色匹配
    if (query.role && fileInfo.role !== query.role) {
      continue;
    }

    // 大小范围
    if (query.minSize && fileInfo.size < query.minSize) {
      continue;
    }
    if (query.maxSize && fileInfo.size > query.maxSize) {
      continue;
    }

    // 上传时间范围
    if (query.uploadedAfter && fileInfo.uploadTime < query.uploadedAfter) {
      continue;
    }
    if (query.uploadedBefore && fileInfo.uploadTime > query.uploadedBefore) {
      continue;
    }

    results.push(fileInfo);
  }

  return results;
}
