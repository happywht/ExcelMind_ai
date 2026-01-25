/**
 * 目录操作模块
 *
 * 核心职责：
 * 1. 创建目录
 * 2. 列出目录内容
 *
 * @module infrastructure/vfs/VirtualFileSystem
 * @version 1.0.0
 */

import { VirtualFileSystem } from './core';
import type { VirtualFileInfo } from './types';

/**
 * 创建目录
 */
export async function createDirectory(
  this: VirtualFileSystem,
  path: string
): Promise<void> {
  this.ensureInitialized();

  console.log(`[VirtualFileSystem] Creating directory: ${path}`);

  try {
    // 在 Pyodide 文件系统中创建目录
    const pyodideService = this.getPyodideService();
    pyodideService.createDirectory(path);

    console.log(`[VirtualFileSystem] ✅ Directory created: ${path}`);
  } catch (error) {
    console.error(`[VirtualFileSystem] ❌ Failed to create directory: ${path}`, error);
    throw error;
  }
}

/**
 * 列出目录内容
 */
export async function listDirectory(
  this: VirtualFileSystem,
  path: string = this.STANDARD_PATHS.MNT
): Promise<VirtualFileInfo[]> {
  this.ensureInitialized();

  console.log(`[VirtualFileSystem] Listing directory: ${path}`);

  try {
    // 从内存中获取属于该路径的文件
    const files: VirtualFileInfo[] = [];

    for (const fileInfo of this.files.values()) {
      // 检查文件是否属于指定路径
      if (fileInfo.path.startsWith(path) || path === this.STANDARD_PATHS.MNT) {
        files.push(fileInfo);
      }
    }

    console.log(`[VirtualFileSystem] ✅ Listed ${files.length} files from: ${path}`);
    return files;
  } catch (error) {
    console.error(`[VirtualFileSystem] ❌ Failed to list directory: ${path}`, error);
    return [];
  }
}
