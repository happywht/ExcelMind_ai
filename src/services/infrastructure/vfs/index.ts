/**
 * 虚拟文件系统 (VFS) 模块
 *
 * 提供 /mnt 虚拟工作台的完整文件系统功能，包括：
 * - 文件 CRUD 操作
 * - 文件角色管理
 * - 文件关系图谱
 * - 版本管理
 * - 跨Sheet访问
 *
 * @module infrastructure/vfs
 * @version 1.0.0
 */

// ============================================================================
// 核心服务
// ============================================================================

export {
  VirtualFileSystem,
  getVirtualFileSystem,
  FileRole,
  RelationType,
} from './VirtualFileSystem';

export type {
  VirtualFileInfo,
  ExtendedVirtualFileInfo,
  FileUpdate,
  FileRelationship,
  VersionInfo,
  DirectoryInfo,
  VFSStats,
  VFSConfig,
} from './VirtualFileSystem';

// ============================================================================
// 元数据服务
// ============================================================================

export {
  FileMetadataService,
  getFileMetadataService,
} from './FileMetadataService';

export type {
  FileTag,
  MetadataQuery,
  MetadataStats,
  SchemaInfo,
  ExtendedFileMetadata,
} from './FileMetadataService';

// ============================================================================
// 关系服务
// ============================================================================

export {
  FileRelationshipService,
  getFileRelationshipService,
} from './FileRelationshipService';

export type {
  GraphNode,
  GraphEdge,
  RelationshipGraph,
  PathInfo,
  DependencyAnalysis,
  CascadeImpact,
} from './FileRelationshipService';

// ============================================================================
// 跨Sheet服务
// ============================================================================

export {
  CrossSheetService,
  getCrossSheetService,
} from './CrossSheetService';

export type {
  SheetReference,
  ValidationResult,
  ResolvedReference,
  ReferenceAnalysis,
  SheetSnapshot,
} from './CrossSheetService';

// ============================================================================
// 工作台管理器
// ============================================================================

export {
  VirtualWorkspaceManager,
  getVirtualWorkspaceManager,
} from './VirtualWorkspaceManager';

export type {
  WorkspaceStatus,
  WorkspaceConfig,
  WorkspaceSnapshot,
  WorkspaceStats,
  BatchOperationResult,
} from './VirtualWorkspaceManager';

// ============================================================================
// 安全工具模块
// ============================================================================

export * from './utils';
