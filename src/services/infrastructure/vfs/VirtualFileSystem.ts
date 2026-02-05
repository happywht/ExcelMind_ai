/**
 * 虚拟文件系统服务
 *
 * 核心职责：
 * 1. 管理虚拟文件系统（/mnt 目录）
 * 2. 支持文件 CRUD 操作
 * 3. 文件角色管理
 * 4. 文件关系管理
 * 5. 版本管理
 * 6. 与 Python 沙箱集成
 *
 * @module infrastructure/vfs
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { getPyodideService } from '@services/wasm/PyodideService';
import { RedisService } from '../storage/RedisService';
import { validateFileName, sanitizeFileName, validateFilePath } from './utils/FileNameValidator';
import { AccessControlService, FileOwner, FilePermissions, UnauthorizedError } from './utils/AccessControl';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 文件角色枚举
 */
export enum FileRole {
  PRIMARY_SOURCE = 'primary_source',      // 主数据源
  AUXILIARY_SOURCE = 'auxiliary_source',  // 辅助数据源
  CONFIGURATION = 'configuration',        // 配置文件
  TEMPLATE = 'template',                  // 模板文件
  OUTPUT = 'output',                      // 输出文件
  TEMPORARY = 'temporary',                // 临时文件
}

/**
 * 关系类型枚举
 */
export enum RelationType {
  DEPENDS_ON = 'depends_on',        // 依赖关系
  REFERENCES = 'references',        // 引用关系
  GENERATES = 'generates',          // 生成关系
  CONFIGURES = 'configures',        // 配置关系
  MERGES_WITH = 'merges_with',      // 合并关系
}

/**
 * 虚拟文件信息（扩展版）
 */
export interface ExtendedVirtualFileInfo {
  id: string;                       // VFS 文件ID
  name: string;                     // 文件名
  role: FileRole;                   // 文件角色
  type: 'excel' | 'word' | 'pdf' | 'json' | 'csv' | 'txt' | 'unknown';
  path: string;                     // VFS 路径
  size: number;                     // 文件大小（字节）
  uploadTime: number;               // 上传时间戳
  lastModified: number;             // 最后修改时间
  checksum?: string;                // 文件校验和
  metadata?: Record<string, any>;   // 额外元数据
  // UI相关字段（可选）
  referenceCount?: number;          // 被引用次数
  isSelected?: boolean;             // 是否被选中
  isExpanded?: boolean;             // 是否展开（目录）
  // 安全相关字段
  owner?: FileOwner;                // 文件所有者
  permissions?: FilePermissions;    // 文件权限
}

/**
 * 虚拟文件信息（向后兼容）
 */
export interface VirtualFileInfo {
  id: string;                       // VFS 文件ID
  name: string;                     // 文件名
  role: FileRole;                   // 文件角色
  type: 'excel' | 'word' | 'pdf' | 'json' | 'csv' | 'txt' | 'unknown';
  path: string;                     // VFS 路径
  size: number;                     // 文件大小（字节）
  uploadTime: number;               // 上传时间戳
  lastModified: number;             // 最后修改时间
  checksum?: string;                // 文件校验和
  metadata?: Record<string, any>;   // 额外元数据
  owner?: FileOwner;                // 文件所有者（可选）
  permissions?: FilePermissions;    // 文件权限（可选）
}

/**
 * 文件更新选项
 */
export interface FileUpdate {
  role?: FileRole;
  metadata?: Record<string, any>;
}

/**
 * 文件关系
 */
export interface FileRelationship {
  id: string;
  fromFileId: string;
  toFileId: string;
  type: RelationType;
  metadata?: Record<string, any>;
  createdAt: number;
}

/**
 * 版本信息
 */
export interface VersionInfo {
  id: string;
  fileId: string;
  version: number;
  path: string;
  size: number;
  createdAt: number;
  comment?: string;
  metadata?: Record<string, any>;
}

/**
 * 目录信息
 */
export interface DirectoryInfo {
  path: string;
  name: string;
  files: VirtualFileInfo[];
  subdirectories: DirectoryInfo[];
  createdAt: number;
}

/**
 * VFS 统计信息
 */
export interface VFSStats {
  totalFiles: number;
  totalSize: number;
  filesByRole: Record<FileRole, number>;
  filesByType: Record<string, number>;
  totalRelationships: number;
  totalVersions: number;
}

// ============================================================================
// VFS 配置
// ============================================================================

export interface VFSConfig {
  maxFileSize?: number;           // 最大文件大小（字节）
  maxVersions?: number;           // 最大版本数
  enableVersioning?: boolean;     // 是否启用版本管理
  enableRelationships?: boolean;  // 是否启用关系管理
  enableAccessControl?: boolean;  // 是否启用访问控制
  enableFileNameValidation?: boolean; // 是否启用文件名验证
  redis?: {
    url?: string;                 // Redis连接URL（优先使用）
    host?: string;
    port?: number;
    password?: string;
  };
}

// ============================================================================
// VFS 服务实现
// ============================================================================

/**
 * 虚拟文件系统服务类
 */
export class VirtualFileSystem extends EventEmitter {
  private static instance: VirtualFileSystem | null = null;
  private pyodideService = getPyodideService();
  private redisService: RedisService | null = null;
  private accessControlService: AccessControlService;
  private files: Map<string, VirtualFileInfo> = new Map();
  private relationships: Map<string, FileRelationship> = new Map();
  private versions: Map<string, VersionInfo[]> = new Map();

  private readonly STANDARD_PATHS = {
    MNT: '/mnt',
    DATA: '/mnt/data',
    TEMP: '/mnt/temp',
    OUTPUT: '/mnt/output',
    CONFIG: '/mnt/config',
    TEMPLATE: '/mnt/template',
  };

  private readonly DEFAULT_CONFIG: Required<VFSConfig> = {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxVersions: 10,
    enableVersioning: true,
    enableRelationships: true,
    enableAccessControl: true,
    enableFileNameValidation: true,
    redis: {
      host: 'localhost',
      port: 6379,
      password: undefined,
    },
  };

  private config: Required<VFSConfig>;
  private initialized: boolean = false;

  private constructor(config: VFSConfig = {}) {
    super();
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.accessControlService = AccessControlService.getInstance({
      enabled: this.config.enableAccessControl,
      enableLogging: true,
      defaultPolicy: 'deny',
    });
    console.log('[VirtualFileSystem] Service created with config:', this.config);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: VFSConfig): VirtualFileSystem {
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

  /**
   * 上传文件到 VFS
   */
  public async uploadFile(
    file: File,
    role: FileRole,
    options?: {
      targetPath?: string;
      comment?: string;
      metadata?: Record<string, any>;
      userId?: string;
      sessionId?: string;
    }
  ): Promise<VirtualFileInfo> {
    this.ensureInitialized();

    const {
      targetPath,
      comment,
      metadata = {},
      userId = 'anonymous',
      sessionId = 'default',
    } = options || {};

    console.log(`[VirtualFileSystem] Uploading file: ${file.name} with role: ${role}`);

    // ========== 安全增强：文件名验证 ==========
    if (this.config.enableFileNameValidation) {
      const validationResult = validateFileName(file.name);
      if (!validationResult.valid) {
        throw new Error(`文件名验证失败: ${validationResult.error}`);
      }
      console.log(`[VirtualFileSystem] ✅ 文件名验证通过: ${file.name}`);
    }

    // 验证文件大小
    if (file.size > this.config.maxFileSize) {
      throw new Error(
        `File size (${file.size}) exceeds maximum allowed size (${this.config.maxFileSize})`
      );
    }

    // 验证目标路径
    if (targetPath && this.config.enableFileNameValidation) {
      const pathValidation = validateFilePath(targetPath);
      if (!pathValidation.valid) {
        throw new Error(`路径验证失败: ${pathValidation.error}`);
      }
    }

    // 生成文件 ID
    const fileId = this.generateFileId();

    // 确定目标路径
    const finalPath = targetPath || this.getDefaultPath(role, file.name);

    try {
      // 将文件摆渡到 Pyodide 文件系统
      await this.ferryFileToPyodide(file, finalPath);

      // ========== 安全增强：创建访问控制信息 ==========
      const { owner, permissions } = this.accessControlService.createDefaultPermissions(userId, sessionId);

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
        owner,
        permissions,
      };

      // 添加到内存存储
      this.files.set(fileId, fileInfo);

      // 持久化到 Redis
      if (this.redisService) {
        await this.persistFileInfo(fileInfo);
      }

      // 创建初始版本
      if (this.config.enableVersioning) {
        await this.createVersion(fileId, comment || 'Initial version');
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
  public async readFile(
    vfsId: string,
    options?: {
      userId?: string;
      sessionId?: string;
    }
  ): Promise<Blob> {
    this.ensureInitialized();

    const { userId = 'anonymous', sessionId = 'default' } = options || {};

    const fileInfo = this.files.get(vfsId);
    if (!fileInfo) {
      throw new Error(`File not found: ${vfsId}`);
    }

    // ========== 安全增强：访问控制检查 ==========
    if (this.config.enableAccessControl) {
      const hasPermission = this.accessControlService.checkReadPermission(
        vfsId,
        userId,
        fileInfo.owner,
        fileInfo.permissions
      );

      if (!hasPermission) {
        throw new UnauthorizedError(
          `无权读取文件: ${vfsId}`,
          userId,
          'read',
          vfsId
        );
      }
      console.log(`[VirtualFileSystem] ✅ 访问控制检查通过: 用户 ${userId} 可读取文件 ${vfsId}`);
    }

    console.log(`[VirtualFileSystem] Reading file: ${vfsId}`);

    try {
      const data = this.pyodideService.readFile(fileInfo.path);
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
  public async deleteFile(
    vfsId: string,
    options?: {
      userId?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    this.ensureInitialized();

    const { userId = 'anonymous', sessionId = 'default' } = options || {};

    const fileInfo = this.files.get(vfsId);
    if (!fileInfo) {
      throw new Error(`File not found: ${vfsId}`);
    }

    // ========== 安全增强：访问控制检查 ==========
    if (this.config.enableAccessControl) {
      const hasPermission = this.accessControlService.checkDeletePermission(
        vfsId,
        userId,
        fileInfo.owner,
        fileInfo.permissions
      );

      if (!hasPermission) {
        throw new UnauthorizedError(
          `无权删除文件: ${vfsId}`,
          userId,
          'delete',
          vfsId
        );
      }
      console.log(`[VirtualFileSystem] ✅ 访问控制检查通过: 用户 ${userId} 可删除文件 ${vfsId}`);
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
      this.pyodideService.unlinkFile(fileInfo.path);

      // 删除所有关系
      await this.removeAllRelationships(vfsId);

      // 删除所有版本
      if (this.config.enableVersioning) {
        await this.deleteAllVersions(vfsId);
      }

      // 从内存删除
      this.files.delete(vfsId);

      // 从 Redis 删除
      if (this.redisService) {
        await this.redisService.del(`vfs:file:${vfsId}`);
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
  public async updateFile(
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
    if (this.redisService) {
      await this.persistFileInfo(fileInfo);
    }

    console.log(`[VirtualFileSystem] ✅ File updated: ${vfsId}`);

    // 发送事件
    this.emit('file:updated', fileInfo);

    return fileInfo;
  }

  /**
   * 创建目录
   */
  public async createDirectory(path: string): Promise<void> {
    this.ensureInitialized();

    console.log(`[VirtualFileSystem] Creating directory: ${path}`);

    try {
      // 在 Pyodide 文件系统中创建目录
      this.pyodideService.createDirectory(path);

      console.log(`[VirtualFileSystem] ✅ Directory created: ${path}`);
    } catch (error) {
      console.error(`[VirtualFileSystem] ❌ Failed to create directory: ${path}`, error);
      throw error;
    }
  }

  /**
   * 列出目录内容
   */
  public async listDirectory(path: string = this.STANDARD_PATHS.MNT): Promise<VirtualFileInfo[]> {
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

  /**
   * 添加文件关系
   */
  public async addRelationship(
    fromFileId: string,
    toFileId: string,
    type: RelationType,
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
    if (this.redisService) {
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
  public async getRelationships(vfsId: string): Promise<FileRelationship[]> {
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
   * 创建文件版本
   */
  public async createVersion(
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
        this.pyodideService.unlinkFile(oldestVersion.path);
      }
    }

    // 创建版本文件路径
    const versionPath = `${fileInfo.path}.v${newVersion}`;

    // 复制文件
    const data = this.pyodideService.readFile(fileInfo.path);
    this.pyodideService.writeFile(versionPath, data);

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
    if (this.redisService) {
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
  public async getVersions(vfsId: string): Promise<VersionInfo[]> {
    this.ensureInitialized();

    return this.versions.get(vfsId) || [];
  }

  /**
   * 恢复文件版本
   */
  public async restoreVersion(vfsId: string, versionId: string): Promise<void> {
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
      const data = this.pyodideService.readFile(version.path);

      // 创建当前文件的备份版本
      await this.createVersion(vfsId, `Backup before restore`);

      // 写入恢复的文件
      this.pyodideService.writeFile(fileInfo.path, data);

      // 更新文件元数据
      fileInfo.lastModified = Date.now();
      this.files.set(vfsId, fileInfo);

      if (this.redisService) {
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
   * 获取 VFS 统计信息
   */
  public async getStats(): Promise<VFSStats> {
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
  public async cleanupTempFiles(olderThan: number = 3600000): Promise<number> {
    this.ensureInitialized();

    console.log(`[VirtualFileSystem] Cleaning up temp files older than ${olderThan}ms`);

    const now = Date.now();
    let cleaned = 0;

    for (const [vfsId, fileInfo] of this.files.entries()) {
      if (fileInfo.role === FileRole.TEMPORARY) {
        const age = now - fileInfo.uploadTime;
        if (age > olderThan) {
          try {
            await this.deleteFile(vfsId);
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

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
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
   * 将文件摆渡到 Pyodide 文件系统
   */
  private async ferryFileToPyodide(file: File, targetPath: string): Promise<void> {
    // File → ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // ArrayBuffer → Uint8Array
    const uint8Array = new Uint8Array(arrayBuffer);

    // Uint8Array → Pyodide FS
    this.pyodideService.mountFile(file.name, uint8Array, targetPath);
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
  private async persistFileInfo(fileInfo: VirtualFileInfo): Promise<void> {
    if (!this.redisService) {
      return;
    }

    await this.redisService.set(`vfs:file:${fileInfo.id}`, fileInfo, 0);
  }

  /**
   * 持久化关系到 Redis
   */
  private async persistRelationship(relationship: FileRelationship): Promise<void> {
    if (!this.redisService) {
      return;
    }

    await this.redisService.set(`vfs:relationship:${relationship.id}`, relationship, 0);
  }

  /**
   * 持久化版本到 Redis
   */
  private async persistVersion(version: VersionInfo): Promise<void> {
    if (!this.redisService) {
      return;
    }

    await this.redisService.set(`vfs:version:${version.id}`, version, 0);
  }

  /**
   * 获取依赖文件列表
   */
  private getDependentFiles(vfsId: string): string[] {
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
  private wouldCreateCircularDependency(fromFileId: string, toFileId: string): boolean {
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

  /**
   * 删除所有关系
   */
  private async removeAllRelationships(vfsId: string): Promise<void> {
    const toRemove: string[] = [];

    for (const [id, relationship] of this.relationships.entries()) {
      if (relationship.fromFileId === vfsId || relationship.toFileId === vfsId) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.relationships.delete(id);
      if (this.redisService) {
        await this.redisService.del(`vfs:relationship:${id}`);
      }
    }
  }

  /**
   * 删除所有版本
   */
  private async deleteAllVersions(vfsId: string): Promise<void> {
    const versions = this.versions.get(vfsId) || [];

    for (const version of versions) {
      this.pyodideService.unlinkFile(version.path);
      if (this.redisService) {
        await this.redisService.del(`vfs:version:${version.id}`);
      }
    }

    this.versions.delete(vfsId);
  }

  /**
   * 生成文件 ID
   */
  private generateFileId(): string {
    return `vfs_file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成关系 ID
   */
  private generateRelationshipId(): string {
    return `vfs_rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成版本 ID
   */
  private generateVersionId(): string {
    return `vfs_ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取默认路径
   */
  private getDefaultPath(role: FileRole, fileName: string): string {
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
  private detectFileType(fileName: string): VirtualFileInfo['type'] {
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
  private getMimeType(fileName: string): string {
    const type = this.detectFileType(fileName);

    const mimeMap: Record<VirtualFileInfo['type'], string> = {
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
}

// ============================================================================
// 导出
// ============================================================================

/**
 * 导出单例获取函数
 */
export const getVirtualFileSystem = (config?: VFSConfig): VirtualFileSystem => {
  return VirtualFileSystem.getInstance(config);
};

/**
 * 默认导出
 */
export default VirtualFileSystem;
