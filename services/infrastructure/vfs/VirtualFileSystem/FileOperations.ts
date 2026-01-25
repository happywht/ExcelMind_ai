/**
 * 文件操作模块
 *
 * 核心职责：
 * 1. 文件上传
 * 2. 文件读取
 * 3. 文件删除
 * 4. 文件更新
 *
 * @module infrastructure/vfs/VirtualFileSystem
 * @version 1.0.0
 */

import { VirtualFileSystem } from './core';
import type { VirtualFileInfo, FileUpdate, FileRole } from './types';

/**
 * 上传文件到 VFS
 */
export async function uploadFile(
  this: VirtualFileSystem,
  file: File,
  role: FileRole,
  options?: {
    targetPath?: string;
    comment?: string;
    metadata?: Record<string, any>;
  }
): Promise<VirtualFileInfo> {
  this.ensureInitialized();

  const {
    targetPath,
    comment,
    metadata = {},
  } = options || {};

  console.log(`[VirtualFileSystem] Uploading file: ${file.name} with role: ${role}`);

  // 验证文件大小
  if (file.size > this.config.maxFileSize) {
    throw new Error(
      `File size (${file.size}) exceeds maximum allowed size (${this.config.maxFileSize})`
    );
  }

  // 生成文件 ID
  const fileId = this.generateFileId();

  // 确定目标路径
  const finalPath = targetPath || this.getDefaultPath(role, file.name);

  try {
    // 将文件摆渡到 Pyodide 文件系统
    await this.ferryFileToPyodide(file, finalPath);

    // 创建文件元数据
    const fileInfo: VirtualFileInfo = {
      id: fileId,
      name: file.name,
      role,
      type: this.detectFileType(file.name),
      path: finalPath,
      size: file.size,
      uploadTime: Date.now(),
      lastModified: file.lastModified || Date.now(),
      metadata,
    };

    // 添加到内存存储
    this.files.set(fileId, fileInfo);

    // 持久化到 Redis
    const redisService = this.getRedisService();
    if (redisService) {
      await this.persistFileInfo(fileInfo);
    }

    // 创建初始版本
    if (this.config.enableVersioning) {
      const { createVersion } = require('./VersionOperations');
      await createVersion.call(this, fileId, comment || 'Initial version');
    }

    console.log(`[VirtualFileSystem] ✅ File uploaded: ${fileId}`);

    // 发送事件
    this.emit('file:uploaded', fileInfo);

    return fileInfo;
  } catch (error) {
    console.error(`[VirtualFileSystem] ❌ File upload failed: ${file.name}`, error);
    throw new Error(`Failed to upload file ${file.name}: ${error}`);
  }
}

/**
 * 读取文件
 */
export async function readFile(
  this: VirtualFileSystem,
  vfsId: string
): Promise<Blob> {
  this.ensureInitialized();

  const fileInfo = this.files.get(vfsId);
  if (!fileInfo) {
    throw new Error(`File not found: ${vfsId}`);
  }

  console.log(`[VirtualFileSystem] Reading file: ${vfsId}`);

  try {
    const pyodideService = this.getPyodideService();
    const data = pyodideService.readFile(fileInfo.path);
    const mimeType = this.getMimeType(fileInfo.name);
    const blob = new Blob([data], { type: mimeType });

    console.log(`[VirtualFileSystem] ✅ File read: ${vfsId}`);
    return blob;
  } catch (error) {
    console.error(`[VirtualFileSystem] ❌ Failed to read file: ${vfsId}`, error);
    throw error;
  }
}

/**
 * 删除文件
 */
export async function deleteFile(
  this: VirtualFileSystem,
  vfsId: string
): Promise<void> {
  this.ensureInitialized();

  const fileInfo = this.files.get(vfsId);
  if (!fileInfo) {
    throw new Error(`File not found: ${vfsId}`);
  }

  console.log(`[VirtualFileSystem] Deleting file: ${vfsId}`);

  try {
    // 检查是否有其他文件依赖此文件
    const dependents = this.getDependentFiles(vfsId);
    if (dependents.length > 0) {
      throw new Error(
        `Cannot delete file: ${vfsId}. It is referenced by ${dependents.length} other file(s)`
      );
    }

    // 从 Pyodide 文件系统删除
    const pyodideService = this.getPyodideService();
    pyodideService.unlinkFile(fileInfo.path);

    // 删除所有关系
    const { removeAllRelationships } = require('./RelationshipOperations');
    await removeAllRelationships.call(this, vfsId);

    // 删除所有版本
    if (this.config.enableVersioning) {
      const { deleteAllVersions } = require('./VersionOperations');
      await deleteAllVersions.call(this, vfsId);
    }

    // 从内存删除
    this.files.delete(vfsId);

    // 从 Redis 删除
    const redisService = this.getRedisService();
    if (redisService) {
      await redisService.del(`vfs:file:${vfsId}`);
    }

    console.log(`[VirtualFileSystem] ✅ File deleted: ${vfsId}`);

    // 发送事件
    this.emit('file:deleted', { vfsId, fileInfo });
  } catch (error) {
    console.error(`[VirtualFileSystem] ❌ Failed to delete file: ${vfsId}`, error);
    throw error;
  }
}

/**
 * 更新文件信息
 */
export async function updateFile(
  this: VirtualFileSystem,
  vfsId: string,
  updates: FileUpdate
): Promise<VirtualFileInfo> {
  this.ensureInitialized();

  const fileInfo = this.files.get(vfsId);
  if (!fileInfo) {
    throw new Error(`File not found: ${vfsId}`);
  }

  console.log(`[VirtualFileSystem] Updating file: ${vfsId}`);

  // 更新字段
  if (updates.role) {
    fileInfo.role = updates.role;
  }
  if (updates.metadata) {
    fileInfo.metadata = {
      ...fileInfo.metadata,
      ...updates.metadata,
    };
  }
  fileInfo.lastModified = Date.now();

  // 更新内存存储
  this.files.set(vfsId, fileInfo);

  // 持久化到 Redis
  const redisService = this.getRedisService();
  if (redisService) {
    await this.persistFileInfo(fileInfo);
  }

  console.log(`[VirtualFileSystem] ✅ File updated: ${vfsId}`);

  // 发送事件
  this.emit('file:updated', fileInfo);

  return fileInfo;
}
