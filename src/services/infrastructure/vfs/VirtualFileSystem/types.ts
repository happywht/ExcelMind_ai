/**
 * 虚拟文件系统类型定义
 *
 * @module infrastructure/vfs/VirtualFileSystem
 * @version 1.0.0
 */

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
 * 虚拟文件信息
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

/**
 * VFS 配置
 */
export interface VFSConfig {
  maxFileSize?: number;           // 最大文件大小（字节）
  maxVersions?: number;           // 最大版本数
  enableVersioning?: boolean;     // 是否启用版本管理
  enableRelationships?: boolean;  // 是否启用关系管理
  redis?: {
    url?: string;                 // Redis连接URL（优先使用）
    host?: string;
    port?: number;
    password?: string;
  };
}
