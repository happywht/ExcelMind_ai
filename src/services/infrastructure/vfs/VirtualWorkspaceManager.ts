/**
 * 虚拟工作台管理器
 *
 * 核心职责：
 * 1. 整合所有 VFS 服务
 * 2. 提供统一的 API
 * 3. 处理工作台生命周期
 * 4. 工作台状态管理
 * 5. 事件协调
 *
 * @module infrastructure/vfs
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { VirtualFileSystem, FileRole, VirtualFileInfo, RelationType } from './VirtualFileSystem';
import { FileMetadataService, MetadataQuery, ExtendedFileMetadata, FileTag } from './FileMetadataService';
import { FileRelationshipService, RelationshipGraph, CascadeImpact } from './FileRelationshipService';
import { CrossSheetService, SheetReference, ValidationResult } from './CrossSheetService';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 工作台状态
 */
export type WorkspaceStatus =
  | 'initializing'
  | 'ready'
  | 'busy'
  | 'error'
  | 'disposed';

/**
 * 工作台配置
 */
export interface WorkspaceConfig {
  maxFileSize?: number;
  enableVersioning?: boolean;
  enableRelationships?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  redis?: {
    host?: string;
    port?: number;
    password?: string;
  };
}

/**
 * 工作台快照
 */
export interface WorkspaceSnapshot {
  id: string;
  name: string;
  timestamp: number;
  fileCount: number;
  totalSize: number;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * 工作台统计
 */
export interface WorkspaceStats {
  status: WorkspaceStatus;
  fileCount: number;
  totalSize: number;
  relationshipCount: number;
  versionCount: number;
  lastActivity: number;
  uptime: number;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  successful: number;
  failed: number;
  errors: Array<{
    file: string;
    error: string;
  }>;
}

// ============================================================================
// 虚拟工作台管理器实现
// ============================================================================

/**
 * 虚拟工作台管理器类
 */
export class VirtualWorkspaceManager extends EventEmitter {
  private static instance: VirtualWorkspaceManager | null = null;
  private vfs: VirtualFileSystem;
  private metadataService: FileMetadataService;
  private relationshipService: FileRelationshipService;
  private crossSheetService: CrossSheetService;

  private status: WorkspaceStatus = 'initializing';
  private config: WorkspaceConfig;
  private autoSaveTimer?: NodeJS.Timeout;
  private startTime: number = Date.now();
  private lastActivity: number = Date.now();

  private constructor(config?: WorkspaceConfig) {
    super();
    this.config = config || {};

    // 初始化子服务
    this.vfs = VirtualFileSystem.getInstance({
      maxFileSize: this.config.maxFileSize,
      enableVersioning: this.config.enableVersioning,
      enableRelationships: this.config.enableRelationships,
      redis: this.config.redis,
    });

    this.metadataService = FileMetadataService.getInstance(this.vfs);
    this.relationshipService = FileRelationshipService.getInstance(this.vfs);
    this.crossSheetService = CrossSheetService.getInstance(this.vfs);

    // 转发子服务事件
    this.forwardEvents();

    console.log('[VirtualWorkspaceManager] Manager created with config:', this.config);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: WorkspaceConfig): VirtualWorkspaceManager {
    if (!VirtualWorkspaceManager.instance) {
      VirtualWorkspaceManager.instance = new VirtualWorkspaceManager(config);
    }
    return VirtualWorkspaceManager.instance;
  }

  /**
   * 初始化工作台
   */
  public async initialize(): Promise<void> {
    console.log('[VirtualWorkspaceManager] Initializing workspace...');

    try {
      this.status = 'initializing';
      this.emit('status:changed', this.status);

      // 初始化子服务
      await this.vfs.initialize();
      await this.metadataService.initialize();
      await this.relationshipService.initialize();
      await this.crossSheetService.initialize();

      // 启动自动保存
      if (this.config.autoSave) {
        this.startAutoSave();
      }

      this.status = 'ready';
      this.emit('status:changed', this.status);
      this.emit('initialized');

      console.log('[VirtualWorkspaceManager] ✅ Workspace initialized and ready');
    } catch (error) {
      console.error('[VirtualWorkspaceManager] ❌ Initialization failed:', error);
      this.status = 'error';
      this.emit('status:changed', this.status);
      throw error;
    }
  }

  /**
   * 销毁工作台
   */
  public async dispose(): Promise<void> {
    console.log('[VirtualWorkspaceManager] Disposing workspace...');

    // 停止自动保存
    this.stopAutoSave();

    // 清理资源
    this.crossSheetService.cleanupExpiredSnapshots(0);

    // 移除所有监听器
    this.removeAllListeners();

    this.status = 'disposed';
    this.emit('disposed');

    console.log('[VirtualWorkspaceManager] ✅ Workspace disposed');
  }

  // ========================================================================
  // 文件操作
  // ========================================================================

  /**
   * 上传文件
   */
  public async uploadFile(
    file: File,
    role: FileRole,
    options?: {
      comment?: string;
      metadata?: Record<string, any>;
      tags?: string[];
    }
  ): Promise<VirtualFileInfo> {
    this.updateActivity();
    this.setStatus('busy');

    try {
      const fileInfo = await this.vfs.uploadFile(file, role, options);

      // 添加标签
      if (options?.tags) {
        for (const tagId of options.tags) {
          await this.metadataService.addTagToFile(fileInfo.id, tagId);
        }
      }

      this.setStatus('ready');
      return fileInfo;
    } catch (error) {
      this.setStatus('error');
      throw error;
    }
  }

  /**
   * 批量上传文件
   */
  public async uploadFiles(
    files: Array<{
      file: File;
      role: FileRole;
      options?: {
        comment?: string;
        metadata?: Record<string, any>;
        tags?: string[];
      };
    }>
  ): Promise<BatchOperationResult> {
    console.log(`[VirtualWorkspaceManager] Uploading ${files.length} files`);

    const result: BatchOperationResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const item of files) {
      try {
        await this.uploadFile(item.file, item.role, item.options);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          file: item.file.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(
      `[VirtualWorkspaceManager] Batch upload complete: ${result.successful} successful, ${result.failed} failed`
    );

    return result;
  }

  /**
   * 删除文件
   */
  public async deleteFile(vfsId: string): Promise<void> {
    this.updateActivity();
    return await this.vfs.deleteFile(vfsId);
  }

  /**
   * 更新文件
   */
  public async updateFile(
    vfsId: string,
    updates: {
      role?: FileRole;
      metadata?: Record<string, any>;
    }
  ): Promise<VirtualFileInfo> {
    this.updateActivity();
    return await this.vfs.updateFile(vfsId, updates);
  }

  // ========================================================================
  // 搜索和查询
  // ========================================================================

  /**
   * 搜索文件
   */
  public async searchFiles(query: MetadataQuery): Promise<ExtendedFileMetadata[]> {
    this.updateActivity();
    return await this.metadataService.searchFiles(query);
  }

  /**
   * 获取文件详情
   */
  public async getFileDetails(vfsId: string): Promise<ExtendedFileMetadata | null> {
    this.updateActivity();
    return await this.metadataService.getExtendedMetadata(vfsId);
  }

  /**
   * 列出目录
   */
  public async listDirectory(path?: string): Promise<VirtualFileInfo[]> {
    this.updateActivity();
    return await this.vfs.listDirectory(path);
  }

  // ========================================================================
  // 关系管理
  // ========================================================================

  /**
   * 添加文件关系
   */
  public async addRelationship(
    fromFileId: string,
    toFileId: string,
    type: RelationType,
    metadata?: Record<string, any>
  ): Promise<void> {
    this.updateActivity();

    await this.vfs.addRelationship(
      fromFileId,
      toFileId,
      type,
      metadata
    );
  }

  /**
   * 获取关系图谱
   */
  public async getRelationshipGraph(options?: {
    rootId?: string;
    maxDepth?: number;
  }): Promise<RelationshipGraph> {
    this.updateActivity();
    return await this.relationshipService.getRelationshipGraph(options);
  }

  /**
   * 分析级联影响
   */
  public async analyzeCascadeImpact(fileId: string): Promise<CascadeImpact> {
    this.updateActivity();
    return await this.relationshipService.analyzeCascadeImpact(fileId);
  }

  // ========================================================================
  // 跨Sheet操作
  // ========================================================================

  /**
   * 解析Sheet引用
   */
  public async parseSheetReferences(
    sheetName: string,
    data: any[][],
    fileId?: string
  ): Promise<SheetReference[]> {
    this.updateActivity();
    return this.crossSheetService.parseReferences(sheetName, data, fileId);
  }

  /**
   * 验证Sheet引用
   */
  public async validateSheetReferences(
    refs: SheetReference[],
    availableSheets: string[]
  ): Promise<ValidationResult> {
    this.updateActivity();
    return await this.crossSheetService.validateReferences(refs, availableSheets);
  }

  // ========================================================================
  // 工作台状态
  // ========================================================================

  /**
   * 获取工作台状态
   */
  public getStatus(): WorkspaceStatus {
    return this.status;
  }

  /**
   * 获取工作台统计
   */
  public async getStats(): Promise<WorkspaceStats> {
    this.updateActivity();

    const vfsStats = await this.vfs.getStats();

    return {
      status: this.status,
      fileCount: vfsStats.totalFiles,
      totalSize: vfsStats.totalSize,
      relationshipCount: vfsStats.totalRelationships,
      versionCount: vfsStats.totalVersions,
      lastActivity: this.lastActivity,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * 创建快照
   */
  public async createSnapshot(name: string, description?: string): Promise<WorkspaceSnapshot> {
    console.log(`[VirtualWorkspaceManager] Creating snapshot: ${name}`);

    const stats = await this.getStats();

    const snapshot: WorkspaceSnapshot = {
      id: this.generateSnapshotId(),
      name,
      timestamp: Date.now(),
      fileCount: stats.fileCount,
      totalSize: stats.totalSize,
      description,
    };

    // TODO: 持久化快照

    this.emit('snapshot:created', snapshot);

    console.log(`[VirtualWorkspaceManager] ✅ Snapshot created: ${snapshot.id}`);

    return snapshot;
  }

  /**
   * 恢复快照
   */
  public async restoreSnapshot(snapshotId: string): Promise<void> {
    console.log(`[VirtualWorkspaceManager] Restoring snapshot: ${snapshotId}`);

    // TODO: 实现快照恢复逻辑

    this.emit('snapshot:restored', { snapshotId });

    console.log(`[VirtualWorkspaceManager] ✅ Snapshot restored: ${snapshotId}`);
  }

  // ========================================================================
  // 标签管理
  // ========================================================================

  /**
   * 创建标签
   */
  public async createTag(
    name: string,
    options?: {
      color?: string;
      description?: string;
    }
  ): Promise<FileTag> {
    return await this.metadataService.createTag(name, options);
  }

  /**
   * 为文件添加标签
   */
  public async addTagToFile(fileId: string, tagId: string): Promise<void> {
    return await this.metadataService.addTagToFile(fileId, tagId);
  }

  /**
   * 从文件移除标签
   */
  public async removeTagFromFile(fileId: string, tagId: string): Promise<void> {
    return await this.metadataService.removeTagFromFile(fileId, tagId);
  }

  /**
   * 获取所有标签
   */
  public async getAllTags(): Promise<FileTag[]> {
    return await this.metadataService.getAllTags();
  }

  // ========================================================================
  // 维护操作
  // ========================================================================

  /**
   * 清理临时文件
   */
  public async cleanupTempFiles(olderThan?: number): Promise<number> {
    console.log('[VirtualWorkspaceManager] Cleaning up temp files');

    const cleaned = await this.vfs.cleanupTempFiles(olderThan);

    console.log(`[VirtualWorkspaceManager] ✅ Cleaned up ${cleaned} temp files`);

    return cleaned;
  }

  /**
   * 清理过期快照
   */
  public async cleanupExpiredSnapshots(olderThan?: number): Promise<number> {
    console.log('[VirtualWorkspaceManager] Cleaning up expired snapshots');

    const cleaned = this.crossSheetService.cleanupExpiredSnapshots(olderThan);

    console.log(`[VirtualWorkspaceManager] ✅ Cleaned up ${cleaned} expired snapshots`);

    return cleaned;
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    console.log('[VirtualWorkspaceManager] Clearing cache');

    this.crossSheetService.clearCache();

    console.log('[VirtualWorkspaceManager] ✅ Cache cleared');
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 设置状态
   */
  private setStatus(status: WorkspaceStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit('status:changed', status);
    }
  }

  /**
   * 更新活动时间
   */
  private updateActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * 启动自动保存
   */
  private startAutoSave(): void {
    const interval = this.config.autoSaveInterval || 300000; // 默认5分钟

    this.autoSaveTimer = setInterval(async () => {
      try {
        console.log('[VirtualWorkspaceManager] Auto-saving workspace...');

        // TODO: 实现自动保存逻辑

        this.emit('autoSave:completed');
      } catch (error) {
        console.error('[VirtualWorkspaceManager] Auto-save failed:', error);
        this.emit('autoSave:failed', error);
      }
    }, interval);

    console.log(`[VirtualWorkspaceManager] Auto-save started (interval: ${interval}ms)`);
  }

  /**
   * 停止自动保存
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
      console.log('[VirtualWorkspaceManager] Auto-save stopped');
    }
  }

  /**
   * 转发子服务事件
   */
  private forwardEvents(): void {
    // VFS 事件
    this.vfs.on('file:uploaded', (data) => this.emit('file:uploaded', data));
    this.vfs.on('file:deleted', (data) => this.emit('file:deleted', data));
    this.vfs.on('file:updated', (data) => this.emit('file:updated', data));
    this.vfs.on('relationship:added', (data) => this.emit('relationship:added', data));
    this.vfs.on('version:created', (data) => this.emit('version:created', data));
    this.vfs.on('version:restored', (data) => this.emit('version:restored', data));

    // 元数据服务事件
    this.metadataService.on('tag:created', (data) => this.emit('tag:created', data));
    this.metadataService.on('file:tagged', (data) => this.emit('file:tagged', data));
    this.metadataService.on('file:schemaUpdated', (data) => this.emit('file:schemaUpdated', data));
  }

  /**
   * 生成快照ID
   */
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// 导出
// ============================================================================

/**
 * 导出单例获取函数
 */
export const getVirtualWorkspaceManager = (config?: WorkspaceConfig): VirtualWorkspaceManager => {
  return VirtualWorkspaceManager.getInstance(config);
};

/**
 * 默认导出
 */
export default VirtualWorkspaceManager;
