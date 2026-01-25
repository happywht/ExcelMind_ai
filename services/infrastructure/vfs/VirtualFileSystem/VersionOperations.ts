/**
 * 版本操作模块
 *
 * 核心职责：
 * 1. 创建文件版本
 * 2. 获取文件版本列表
 * 3. 恢复文件版本
 * 4. 删除所有版本
 *
 * @module infrastructure/vfs/VirtualFileSystem
 * @version 1.0.0
 */

import { VirtualFileSystem } from './core';
import type { VersionInfo } from './types';

/**
 * 创建文件版本
 */
export async function createVersion(
  this: VirtualFileSystem,
  vfsId: string,
  comment?: string,
  metadata?: Record<string, any>
): Promise<VersionInfo> {
  this.ensureInitialized();

  if (!this.config.enableVersioning) {
    throw new Error('Versioning is disabled');
  }

  const fileInfo = this.files.get(vfsId);
  if (!fileInfo) {
    throw new Error(`File not found: ${vfsId}`);
  }

  console.log(`[VirtualFileSystem] Creating version for file: ${vfsId}`);

  // 获取当前版本号
  const currentVersions = this.versions.get(vfsId) || [];
  const newVersion = currentVersions.length + 1;

  // 检查版本数量限制
  if (newVersion > this.config.maxVersions) {
    // 删除最旧的版本
    const oldestVersion = currentVersions.shift();
    if (oldestVersion) {
      const pyodideService = this.getPyodideService();
      pyodideService.unlinkFile(oldestVersion.path);
    }
  }

  // 创建版本文件路径
  const versionPath = `${fileInfo.path}.v${newVersion}`;

  // 复制文件
  const pyodideService = this.getPyodideService();
  const data = pyodideService.readFile(fileInfo.path);
  pyodideService.writeFile(versionPath, data);

  // 创建版本信息
  const versionInfo: VersionInfo = {
    id: this.generateVersionId(),
    fileId: vfsId,
    version: newVersion,
    path: versionPath,
    size: fileInfo.size,
    createdAt: Date.now(),
    comment,
    metadata,
  };

  // 添加到内存存储
  currentVersions.push(versionInfo);
  this.versions.set(vfsId, currentVersions);

  // 持久化到 Redis
  const redisService = this.getRedisService();
  if (redisService) {
    await this.persistVersion(versionInfo);
  }

  console.log(`[VirtualFileSystem] ✅ Version created: ${versionInfo.id}`);

  // 发送事件
  this.emit('version:created', versionInfo);

  return versionInfo;
}

/**
 * 获取文件版本列表
 */
export async function getVersions(
  this: VirtualFileSystem,
  vfsId: string
): Promise<VersionInfo[]> {
  this.ensureInitialized();

  return this.versions.get(vfsId) || [];
}

/**
 * 恢复文件版本
 */
export async function restoreVersion(
  this: VirtualFileSystem,
  vfsId: string,
  versionId: string
): Promise<void> {
  this.ensureInitialized();

  if (!this.config.enableVersioning) {
    throw new Error('Versioning is disabled');
  }

  const fileInfo = this.files.get(vfsId);
  if (!fileInfo) {
    throw new Error(`File not found: ${vfsId}`);
  }

  const versions = this.versions.get(vfsId) || [];
  const version = versions.find(v => v.id === versionId);

  if (!version) {
    throw new Error(`Version not found: ${versionId}`);
  }

  console.log(`[VirtualFileSystem] Restoring version: ${versionId}`);

  try {
    // 读取版本文件
    const pyodideService = this.getPyodideService();
    const data = pyodideService.readFile(version.path);

    // 创建当前文件的备份版本
    await createVersion.call(this, vfsId, `Backup before restore`);

    // 写入恢复的文件
    pyodideService.writeFile(fileInfo.path, data);

    // 更新文件元数据
    fileInfo.lastModified = Date.now();
    this.files.set(vfsId, fileInfo);

    const redisService = this.getRedisService();
    if (redisService) {
      await this.persistFileInfo(fileInfo);
    }

    console.log(`[VirtualFileSystem] ✅ Version restored: ${versionId}`);

    // 发送事件
    this.emit('version:restored', { vfsId, versionId });
  } catch (error) {
    console.error(`[VirtualFileSystem] ❌ Failed to restore version: ${versionId}`, error);
    throw error;
  }
}

/**
 * 删除所有版本（内部方法）
 */
export async function deleteAllVersions(
  this: VirtualFileSystem,
  vfsId: string
): Promise<void> {
  const versions = this.versions.get(vfsId) || [];

  const pyodideService = this.getPyodideService();
  const redisService = this.getRedisService();

  for (const version of versions) {
    pyodideService.unlinkFile(version.path);
    if (redisService) {
      await redisService.del(`vfs:version:${version.id}`);
    }
  }

  this.versions.delete(vfsId);
}
