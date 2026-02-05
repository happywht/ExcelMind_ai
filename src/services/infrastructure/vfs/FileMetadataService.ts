/**
 * 文件元数据服务
 *
 * 核心职责：
 * 1. 管理文件元数据
 * 2. 文件角色分配和验证
 * 3. 文件标签管理
 * 4. 搜索和过滤
 * 5. 元数据持久化
 *
 * @module infrastructure/vfs
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { VirtualFileSystem, FileRole, VirtualFileInfo } from './VirtualFileSystem';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 文件标签
 */
export interface FileTag {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

/**
 * 元数据查询条件
 */
export interface MetadataQuery {
  role?: FileRole | FileRole[];
  type?: string | string[];
  tags?: string[];
  search?: string;
  minSize?: number;
  maxSize?: number;
  uploadedAfter?: number;
  uploadedBefore?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'size' | 'uploadTime' | 'lastModified';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 元数据统计信息
 */
export interface MetadataStats {
  totalFiles: number;
  filesByRole: Record<FileRole, number>;
  filesByType: Record<string, number>;
  totalSize: number;
  averageSize: number;
  largestFile?: VirtualFileInfo;
  newestFile?: VirtualFileInfo;
  oldestFile?: VirtualFileInfo;
  tagsUsage: Record<string, number>;
}

/**
 * Schema 信息
 */
export interface SchemaInfo {
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    sampleValues?: any[];
  }>;
  rowCount?: number;
  sheetCount?: number;
  lastAnalyzed?: number;
}

/**
 * 扩展的文件元数据
 */
export interface ExtendedFileMetadata extends VirtualFileInfo {
  tags: FileTag[];
  schema?: SchemaInfo;
  accessCount: number;
  lastAccessed?: number;
  relationships: {
    incoming: number;
    outgoing: number;
  };
}

// ============================================================================
// 元数据服务实现
// ============================================================================

/**
 * 文件元数据服务类
 */
export class FileMetadataService extends EventEmitter {
  private static instance: FileMetadataService | null = null;
  private vfs: VirtualFileSystem;
  private tags: Map<string, FileTag> = new Map();
  private fileTags: Map<string, Set<string>> = new Map(); // fileId -> tagIds
  private accessCount: Map<string, number> = new Map();
  private schemas: Map<string, SchemaInfo> = new Map();

  private constructor(vfs?: VirtualFileSystem) {
    super();
    this.vfs = vfs || VirtualFileSystem.getInstance();
    console.log('[FileMetadataService] Service created');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(vfs?: VirtualFileSystem): FileMetadataService {
    if (!FileMetadataService.instance) {
      FileMetadataService.instance = new FileMetadataService(vfs);
    }
    return FileMetadataService.instance;
  }

  /**
   * 初始化元数据服务
   */
  public async initialize(): Promise<void> {
    console.log('[FileMetadataService] Initializing...');

    // TODO: 从持久化存储恢复标签、访问计数等

    console.log('[FileMetadataService] ✅ Initialization complete');
    this.emit('initialized');
  }

  // ========================================================================
  // 元数据查询
  // ========================================================================

  /**
   * 获取扩展的文件元数据
   */
  public async getExtendedMetadata(vfsId: string): Promise<ExtendedFileMetadata | null> {
    const fileInfo = await this.vfs.readFile(vfsId) as any;
    if (!fileInfo) {
      return null;
    }

    const tags = this.getFileTags(vfsId);
    const relationships = await this.vfs.getRelationships(vfsId);

    const incoming = relationships.filter(r => r.toFileId === vfsId).length;
    const outgoing = relationships.filter(r => r.fromFileId === vfsId).length;

    return {
      ...fileInfo,
      tags,
      schema: this.schemas.get(vfsId),
      accessCount: this.accessCount.get(vfsId) || 0,
      lastAccessed: undefined, // TODO: 跟踪最后访问时间
      relationships: {
        incoming,
        outgoing,
      },
    };
  }

  /**
   * 批量获取扩展元数据
   */
  public async getBatchExtendedMetadata(vfsIds: string[]): Promise<Map<string, ExtendedFileMetadata>> {
    const result = new Map<string, ExtendedFileMetadata>();

    for (const vfsId of vfsIds) {
      const metadata = await this.getExtendedMetadata(vfsId);
      if (metadata) {
        result.set(vfsId, metadata);
      }
    }

    return result;
  }

  /**
   * 搜索文件
   */
  public async searchFiles(query: MetadataQuery): Promise<ExtendedFileMetadata[]> {
    console.log('[FileMetadataService] Searching files with query:', query);

    // 获取所有文件
    const allFiles = await this.vfs.listDirectory();
    let results: ExtendedFileMetadata[] = [];

    for (const file of allFiles) {
      const metadata = await this.getExtendedMetadata(file.id);
      if (!metadata) {
        continue;
      }

      // 应用过滤条件
      if (this.matchesQuery(metadata, query)) {
        results.push(metadata);
      }
    }

    // 排序
    if (query.sortBy) {
      results = this.sortResults(results, query.sortBy, query.sortOrder || 'asc');
    }

    // 分页
    if (query.offset || query.limit) {
      const offset = query.offset || 0;
      const limit = query.limit || results.length;
      results = results.slice(offset, offset + limit);
    }

    console.log(`[FileMetadataService] Found ${results.length} files`);
    return results;
  }

  /**
   * 获取元数据统计
   */
  public async getStats(): Promise<MetadataStats> {
    const allFiles = await this.vfs.listDirectory();

    const stats: MetadataStats = {
      totalFiles: allFiles.length,
      filesByRole: {
        [FileRole.PRIMARY_SOURCE]: 0,
        [FileRole.AUXILIARY_SOURCE]: 0,
        [FileRole.CONFIGURATION]: 0,
        [FileRole.TEMPLATE]: 0,
        [FileRole.OUTPUT]: 0,
        [FileRole.TEMPORARY]: 0,
      },
      filesByType: {},
      totalSize: 0,
      averageSize: 0,
      tagsUsage: {},
    };

    let maxSize = 0;
    let newestTime = 0;
    let oldestTime = Date.now();

    for (const file of allFiles) {
      // 统计角色
      stats.filesByRole[file.role]++;

      // 统计类型
      stats.filesByType[file.type] = (stats.filesByType[file.type] || 0) + 1;

      // 统计大小
      stats.totalSize += file.size;

      // 找最大文件
      if (file.size > maxSize) {
        maxSize = file.size;
        stats.largestFile = file;
      }

      // 找最新文件
      if (file.uploadTime > newestTime) {
        newestTime = file.uploadTime;
        stats.newestFile = file;
      }

      // 找最旧文件
      if (file.uploadTime < oldestTime) {
        oldestTime = file.uploadTime;
        stats.oldestFile = file;
      }

      // 统计标签使用
      const tags = this.getFileTags(file.id);
      for (const tag of tags) {
        stats.tagsUsage[tag.name] = (stats.tagsUsage[tag.name] || 0) + 1;
      }
    }

    // 计算平均大小
    if (allFiles.length > 0) {
      stats.averageSize = stats.totalSize / allFiles.length;
    }

    return stats;
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
    console.log(`[FileMetadataService] Creating tag: ${name}`);

    const tag: FileTag = {
      id: this.generateTagId(),
      name,
      color: options?.color || this.generateRandomColor(),
      description: options?.description,
    };

    this.tags.set(tag.id, tag);

    console.log(`[FileMetadataService] ✅ Tag created: ${tag.id}`);

    // 发送事件
    this.emit('tag:created', tag);

    return tag;
  }

  /**
   * 删除标签
   */
  public async deleteTag(tagId: string): Promise<void> {
    if (!this.tags.has(tagId)) {
      throw new Error(`Tag not found: ${tagId}`);
    }

    console.log(`[FileMetadataService] Deleting tag: ${tagId}`);

    // 从所有文件中移除此标签
    for (const [fileId, tagIds] of this.fileTags.entries()) {
      tagIds.delete(tagId);
    }

    // 删除标签
    this.tags.delete(tagId);

    console.log(`[FileMetadataService] ✅ Tag deleted: ${tagId}`);

    // 发送事件
    this.emit('tag:deleted', { tagId });
  }

  /**
   * 为文件添加标签
   */
  public async addTagToFile(fileId: string, tagId: string): Promise<void> {
    if (!this.tags.has(tagId)) {
      throw new Error(`Tag not found: ${tagId}`);
    }

    console.log(`[FileMetadataService] Adding tag ${tagId} to file ${fileId}`);

    if (!this.fileTags.has(fileId)) {
      this.fileTags.set(fileId, new Set());
    }

    this.fileTags.get(fileId)!.add(tagId);

    console.log(`[FileMetadataService] ✅ Tag added to file`);

    // 发送事件
    this.emit('file:tagged', { fileId, tagId });
  }

  /**
   * 从文件移除标签
   */
  public async removeTagFromFile(fileId: string, tagId: string): Promise<void> {
    console.log(`[FileMetadataService] Removing tag ${tagId} from file ${fileId}`);

    const tagIds = this.fileTags.get(fileId);
    if (tagIds) {
      tagIds.delete(tagId);
    }

    console.log(`[FileMetadataService] ✅ Tag removed from file`);

    // 发送事件
    this.emit('file:untagged', { fileId, tagId });
  }

  /**
   * 获取文件标签
   */
  public getFileTags(fileId: string): FileTag[] {
    const tagIds = this.fileTags.get(fileId);
    if (!tagIds) {
      return [];
    }

    const tags: FileTag[] = [];
    for (const tagId of tagIds) {
      const tag = this.tags.get(tagId);
      if (tag) {
        tags.push(tag);
      }
    }

    return tags;
  }

  /**
   * 获取所有标签
   */
  public async getAllTags(): Promise<FileTag[]> {
    return Array.from(this.tags.values());
  }

  // ========================================================================
  // Schema 管理
  // ========================================================================

  /**
   * 设置文件 Schema
   */
  public async setSchema(fileId: string, schema: SchemaInfo): Promise<void> {
    console.log(`[FileMetadataService] Setting schema for file: ${fileId}`);

    this.schemas.set(fileId, {
      ...schema,
      lastAnalyzed: Date.now(),
    });

    console.log(`[FileMetadataService] ✅ Schema set for file`);

    // 发送事件
    this.emit('file:schemaUpdated', { fileId, schema });
  }

  /**
   * 获取文件 Schema
   */
  public getSchema(fileId: string): SchemaInfo | undefined {
    return this.schemas.get(fileId);
  }

  /**
   * 删除文件 Schema
   */
  public async deleteSchema(fileId: string): Promise<void> {
    console.log(`[FileMetadataService] Deleting schema for file: ${fileId}`);

    this.schemas.delete(fileId);

    console.log(`[FileMetadataService] ✅ Schema deleted for file`);
  }

  // ========================================================================
  // 访问跟踪
  // ========================================================================

  /**
   * 记录文件访问
   */
  public async recordAccess(fileId: string): Promise<void> {
    const count = this.accessCount.get(fileId) || 0;
    this.accessCount.set(fileId, count + 1);
  }

  /**
   * 获取文件访问计数
   */
  public getAccessCount(fileId: string): number {
    return this.accessCount.get(fileId) || 0;
  }

  /**
   * 重置访问计数
   */
  public async resetAccessCount(fileId: string): Promise<void> {
    this.accessCount.set(fileId, 0);
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 检查文件是否匹配查询条件
   */
  private matchesQuery(metadata: ExtendedFileMetadata, query: MetadataQuery): boolean {
    // 角色过滤
    if (query.role) {
      const roles = Array.isArray(query.role) ? query.role : [query.role];
      if (!roles.includes(metadata.role)) {
        return false;
      }
    }

    // 类型过滤
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      if (!types.includes(metadata.type)) {
        return false;
      }
    }

    // 标签过滤
    if (query.tags && query.tags.length > 0) {
      const fileTagIds = new Set(this.fileTags.get(metadata.id) || []);
      const hasAllTags = query.tags.every(tagId => fileTagIds.has(tagId));
      if (!hasAllTags) {
        return false;
      }
    }

    // 搜索关键词
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      const matchName = metadata.name.toLowerCase().includes(searchLower);
      const matchMetadata = JSON.stringify(metadata.metadata || {}).toLowerCase().includes(searchLower);
      if (!matchName && !matchMetadata) {
        return false;
      }
    }

    // 大小过滤
    if (query.minSize && metadata.size < query.minSize) {
      return false;
    }
    if (query.maxSize && metadata.size > query.maxSize) {
      return false;
    }

    // 时间过滤
    if (query.uploadedAfter && metadata.uploadTime < query.uploadedAfter) {
      return false;
    }
    if (query.uploadedBefore && metadata.uploadTime > query.uploadedBefore) {
      return false;
    }

    return true;
  }

  /**
   * 排序结果
   */
  private sortResults(
    results: ExtendedFileMetadata[],
    sortBy: 'name' | 'size' | 'uploadTime' | 'lastModified',
    order: 'asc' | 'desc'
  ): ExtendedFileMetadata[] {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'uploadTime':
          comparison = a.uploadTime - b.uploadTime;
          break;
        case 'lastModified':
          comparison = a.lastModified - b.lastModified;
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * 生成标签 ID
   */
  private generateTagId(): string {
    return `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成随机颜色
   */
  private generateRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#C06C84',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// ============================================================================
// 导出
// ============================================================================

/**
 * 导出单例获取函数
 */
export const getFileMetadataService = (vfs?: VirtualFileSystem): FileMetadataService => {
  return FileMetadataService.getInstance(vfs);
};

/**
 * 默认导出
 */
export default FileMetadataService;
