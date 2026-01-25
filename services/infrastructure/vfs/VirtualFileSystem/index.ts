/**
 * 虚拟文件系统统一导出
 *
 * @module infrastructure/vfs/VirtualFileSystem
 * @version 1.0.0
 */

// 导出核心类
import { VirtualFileSystem, getVirtualFileSystem } from './core';
export { VirtualFileSystem, getVirtualFileSystem } from './core';
export { VirtualFileSystem as default };

// 导出所有类型
export * from './types';
