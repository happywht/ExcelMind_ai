/**
 * 虚拟文件系统核心模块
 *
 * 核心职责：
 * 1. VFS 主类定义和单例模式
 * 2. 初始化和生命周期管理
 * 3. 标准目录结构管理
 * 4. 配置管理
 *
 * @module infrastructure/vfs/VirtualFileSystem
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { getPyodideService } from '../../../wasm/PyodideService';
import { RedisService } from '../../storage/RedisService';
import { FileRole, RelationType } from './types';
import type {
  VirtualFileInfo,
  FileUpdate,
  FileRelationship,
  VersionInfo,
  DirectoryInfo,
  VFSStats,
  VFSConfig,
} from './types';

export { FileRole, RelationType };
export type {
  VirtualFileInfo,
  FileUpdate,
  FileRelationship,
  VersionInfo,
  DirectoryInfo,
  VFSStats,
  VFSConfig,
};

// 导入操作模块
import {
  uploadFile as opUploadFile,
  readFile as opReadFile,
  deleteFile as opDeleteFile,
  updateFile as opUpdateFile,
} from './FileOperations';

import {
  createDirectory as opCreateDirectory,
  listDirectory as opListDirectory,
} from './DirectoryOperations';

import {
  createVersion as opCreateVersion,
  getVersions as opGetVersions,
  restoreVersion as opRestoreVersion,
} from './VersionOperations';

import {
  addRelationship as opAddRelationship,
  getRelationships as opGetRelationships,
  removeAllRelationships as opRemoveAllRelationships,
} from './RelationshipOperations';

import {
  getStats as opGetStats,
  cleanupTempFiles as opCleanupTempFiles,
  searchFiles as opSearchFiles,
} from './UtilityOperations';

/**
 * 虚拟文件系统服务类
 */
export class VirtualFileSystem extends EventEmitter {
  private static instance: VirtualFileSystem | null = null;
  private pyodideService = getPyodideService();
  private redisService: RedisService | null = null;

  // 公共存储（操作模块需要访问）
  public files: Map<string, import('./types').VirtualFileInfo> = new Map();
  public relationships: Map<string, import('./types').FileRelationship> = new Map();
  public versions: Map<string, import('./types').VersionInfo[]> = new Map();

  public readonly STANDARD_PATHS = {
    MNT: '/mnt',
    DATA: '/mnt/data',
    TEMP: '/mnt/temp',
    OUTPUT: '/mnt/output',
    CONFIG: '/mnt/config',
    TEMPLATE: '/mnt/template',
  };

  private readonly DEFAULT_CONFIG: Required<import('./types').VFSConfig> = {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxVersions: 10,
    enableVersioning: true,
    enableRelationships: true,
    redis: {
      host: 'localhost',
      port: 6379,
      password: undefined,
    },
  };

  public config: Required<import('./types').VFSConfig>;
  public initialized: boolean = false;

  private constructor(config: import('./types').VFSConfig = {}) {
    super();
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    console.log('[VirtualFileSystem] Service created with config:', this.config);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: import('./types').VFSConfig): VirtualFileSystem {
    if (!VirtualFileSystem.instance) {
      VirtualFileSystem.instance = new VirtualFileSystem(config);
    }
    return VirtualFileSystem.instance;
  }

  /**
   * 初始化 VFS
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[VirtualFileSystem] Already initialized');
      return;
    }

    try {
      console.log('[VirtualFileSystem] Initializing...');

      // 等待 Pyodide 服务就绪
      await this.pyodideService.initialize();

      // 创建标准目录结构
      await this.createStandardDirectories();

      // 初始化 Redis 服务（可选）
      try {
        const redisOpts = this.config.redis;
        const redisConfig = {
          url: redisOpts.url || `redis://${redisOpts.host || 'localhost'}:${redisOpts.port || 6379}`,
          keyPrefix: 'vfs:',
          defaultTTL: 3600,
          password: redisOpts.password,
        };
        this.redisService = new RedisService(redisConfig);
        await this.redisService.connect();
        console.log('[VirtualFileSystem] Redis connected');
      } catch (error) {
        console.warn('[VirtualFileSystem] Redis connection failed, using in-memory storage:', error);
        this.redisService = null;
      }

      // 从持久化存储恢复文件元数据
      await this.restoreMetadata();

      this.initialized = true;
      console.log('[VirtualFileSystem] ✅ Initialization complete');
      this.emit('initialized');
    } catch (error) {
      console.error('[VirtualFileSystem] ❌ Initialization failed:', error);
      throw error;
    }
  }

  // ========================================================================
  // 文件操作 (委托给 FileOperations)
  // ========================================================================

  public async uploadFile(
    file: File,
    role: import('./types').FileRole,
    options?: {
      targetPath?: string;
      comment?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<import('./types').VirtualFileInfo> {
    return opUploadFile.call(this, file, role, options);
  }

  public async readFile(vfsId: string): Promise<Blob> {
    return opReadFile.call(this, vfsId);
  }

  public async deleteFile(vfsId: string): Promise<void> {
    return opDeleteFile.call(this, vfsId);
  }

  public async updateFile(
    vfsId: string,
    updates: import('./types').FileUpdate
  ): Promise<import('./types').VirtualFileInfo> {
    return opUpdateFile.call(this, vfsId, updates);
  }

  // ========================================================================
  // 目录操作 (委托给 DirectoryOperations)
  // ========================================================================

  public async createDirectory(path: string): Promise<void> {
    return opCreateDirectory.call(this, path);
  }

  public async listDirectory(path: string = this.STANDARD_PATHS.MNT): Promise<import('./types').VirtualFileInfo[]> {
    return opListDirectory.call(this, path);
  }

  // ========================================================================
  // 关系操作 (委托给 RelationshipOperations)
  // ========================================================================

  public async addRelationship(
    fromFileId: string,
    toFileId: string,
    type: import('./types').RelationType,
    metadata?: Record<string, any>
  ): Promise<import('./types').FileRelationship> {
    return opAddRelationship.call(this, fromFileId, toFileId, type, metadata);
  }

  public async getRelationships(vfsId: string): Promise<import('./types').FileRelationship[]> {
    return opGetRelationships.call(this, vfsId);
  }

  // ========================================================================
  // 版本操作 (委托给 VersionOperations)
  // ========================================================================

  public async createVersion(
    vfsId: string,
    comment?: string,
    metadata?: Record<string, any>
  ): Promise<import('./types').VersionInfo> {
    return opCreateVersion.call(this, vfsId, comment, metadata);
  }

  public async getVersions(vfsId: string): Promise<import('./types').VersionInfo[]> {
    return opGetVersions.call(this, vfsId);
  }

  public async restoreVersion(vfsId: string, versionId: string): Promise<void> {
    return opRestoreVersion.call(this, vfsId, versionId);
  }

  // ========================================================================
  // 工具操作 (委托给 UtilityOperations)
  // ========================================================================

  public async getStats(): Promise<import('./types').VFSStats> {
    return opGetStats.call(this);
  }

  public async cleanupTempFiles(olderThan: number = 3600000): Promise<number> {
    return opCleanupTempFiles.call(this, olderThan);
  }

  public async searchFiles(query: {
    name?: string;
    type?: string;
    role?: import('./types').FileRole;
    minSize?: number;
    maxSize?: number;
    uploadedAfter?: number;
    uploadedBefore?: number;
  }): Promise<import('./types').VirtualFileInfo[]> {
    return opSearchFiles.call(this, query);
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 确保已初始化
   */
  public ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('VirtualFileSystem is not initialized. Call initialize() first.');
    }
  }

  /**
   * 创建标准目录结构
   */
  private async createStandardDirectories(): Promise<void> {
    const directories = Object.values(this.STANDARD_PATHS);

    for (const dir of directories) {
      try {
        this.pyodideService.createDirectory(dir);
        console.log(`[VirtualFileSystem] Created directory: ${dir}`);
      } catch (error) {
        // 目录可能已存在，忽略错误
        console.debug(`[VirtualFileSystem] Directory ${dir} may already exist`);
      }
    }
  }

  /**
   * 恢复文件元数据
   */
  private async restoreMetadata(): Promise<void> {
    if (!this.redisService) {
      return;
    }

    try {
      // TODO: 从 Redis 恢复文件元数据
      console.log('[VirtualFileSystem] Metadata restoration not implemented yet');
    } catch (error) {
      console.error('[VirtualFileSystem] Failed to restore metadata:', error);
    }
  }

  /**
   * 持久化文件信息到 Redis
   */
  public async persistFileInfo(fileInfo: import('./types').VirtualFileInfo): Promise<void> {
    if (!this.redisService) {
      return;
    }

    await this.redisService.set(`vfs:file:${fileInfo.id}`, fileInfo, 0);
  }

  /**
   * 持久化关系到 Redis
   */
  public async persistRelationship(relationship: import('./types').FileRelationship): Promise<void> {
    if (!this.redisService) {
      return;
    }

    await this.redisService.set(`vfs:relationship:${relationship.id}`, relationship, 0);
  }

  /**
   * 持久化版本到 Redis
   */
  public async persistVersion(version: import('./types').VersionInfo): Promise<void> {
    if (!this.redisService) {
      return;
    }

    await this.redisService.set(`vfs:version:${version.id}`, version, 0);
  }

  /**
   * 生成文件 ID
   */
  public generateFileId(): string {
    return `vfs_file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成关系 ID
   */
  public generateRelationshipId(): string {
    return `vfs_rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成版本 ID
   */
  public generateVersionId(): string {
    return `vfs_ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取默认路径
   */
  public getDefaultPath(role: FileRole, fileName: string): string {
    switch (role) {
      case FileRole.PRIMARY_SOURCE:
      case FileRole.AUXILIARY_SOURCE:
        return `${this.STANDARD_PATHS.DATA}/${fileName}`;
      case FileRole.CONFIGURATION:
        return `${this.STANDARD_PATHS.CONFIG}/${fileName}`;
      case FileRole.TEMPLATE:
        return `${this.STANDARD_PATHS.TEMPLATE}/${fileName}`;
      case FileRole.OUTPUT:
        return `${this.STANDARD_PATHS.OUTPUT}/${fileName}`;
      case FileRole.TEMPORARY:
        return `${this.STANDARD_PATHS.TEMP}/${fileName}`;
      default:
        return `${this.STANDARD_PATHS.DATA}/${fileName}`;
    }
  }

  /**
   * 检测文件类型
   */
  public detectFileType(fileName: string): VirtualFileInfo['type'] {
    const ext = fileName.toLowerCase().split('.').pop();

    switch (ext) {
      case 'xlsx':
      case 'xls':
        return 'excel';
      case 'docx':
      case 'doc':
        return 'word';
      case 'pdf':
        return 'pdf';
      case 'json':
        return 'json';
      case 'csv':
        return 'csv';
      case 'txt':
        return 'txt';
      default:
        return 'unknown';
    }
  }

  /**
   * 获取 MIME 类型
   */
  public getMimeType(fileName: string): string {
    const type = this.detectFileType(fileName);

    const mimeMap: Record<import('./types').VirtualFileInfo['type'], string> = {
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf: 'application/pdf',
      json: 'application/json',
      csv: 'text/csv',
      txt: 'text/plain',
      unknown: 'application/octet-stream',
    };

    return mimeMap[type];
  }

  /**
   * 将文件摆渡到 Pyodide 文件系统
   */
  public async ferryFileToPyodide(file: File, targetPath: string): Promise<void> {
    // File → ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // ArrayBuffer → Uint8Array
    const uint8Array = new Uint8Array(arrayBuffer);

    // Uint8Array → Pyodide FS
    this.pyodideService.mountFile(file.name, uint8Array, targetPath);
  }

  /**
   * 获取依赖文件列表
   */
  public getDependentFiles(vfsId: string): string[] {
    const dependents: string[] = [];

    for (const relationship of this.relationships.values()) {
      if (relationship.toFileId === vfsId) {
        dependents.push(relationship.fromFileId);
      }
    }

    return dependents;
  }

  /**
   * 检查是否会创建循环依赖
   */
  public wouldCreateCircularDependency(fromFileId: string, toFileId: string): boolean {
    // 使用 DFS 检查循环
    const visited = new Set<string>();
    const stack = [toFileId];

    while (stack.length > 0) {
      const current = stack.pop()!;

      if (current === fromFileId) {
        return true; // 发现循环
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      // 添加当前文件的依赖
      for (const relationship of this.relationships.values()) {
        if (relationship.fromFileId === current) {
          stack.push(relationship.toFileId);
        }
      }
    }

    return false;
  }

  // ========================================================================
  // 服务访问器 (提供受控的访问)
  // ========================================================================

  /**
   * 获取 Redis 服务实例
   *
   * @deprecated 使用公共API方法代替直接访问Redis服务
   * 此方法仅用于向后兼容和特定集成场景
   */
  public getRedisService(): RedisService | null {
    return this.redisService;
  }

  /**
   * 获取 Pyodide 服务实例
   *
   * @deprecated 使用公共API方法代替直接访问Pyodide服务
   * 此方法仅用于向后兼容和特定集成场景
   */
  public getPyodideService() {
    return this.pyodideService;
  }

  /**
   * 检查 Redis 服务是否可用
   */
  public hasRedisService(): boolean {
    return this.redisService !== null;
  }

  /**
   * 执行 Redis 操作（带空值检查）
   */
  public async withRedis<T>(operation: (redis: RedisService) => Promise<T>): Promise<T | null> {
    if (!this.redisService) {
      console.warn('[VirtualFileSystem] Redis service not available');
      return null;
    }
    return operation(this.redisService);
  }
}

/**
 * 导出单例获取函数
 */
export const getVirtualFileSystem = (config?: import('./types').VFSConfig): VirtualFileSystem => {
  return VirtualFileSystem.getInstance(config);
};

/**
 * 默认导出
 */
export default VirtualFileSystem;
