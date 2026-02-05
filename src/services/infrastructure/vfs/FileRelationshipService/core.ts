/**
 * 文件关系服务核心模块
 *
 * @module infrastructure/vfs/FileRelationshipService/core
 * @version 1.0.0
 * @deprecated This file is deprecated. Use ../FileRelationshipService.ts instead.
 */

// Re-export everything from the main FileRelationshipService file
export {
  FileRelationshipService,
  getFileRelationshipService,
  type GraphNode,
  type GraphEdge,
  type RelationshipGraph,
  type PathInfo,
  type DependencyAnalysis,
  type CascadeImpact,
} from '../FileRelationshipService';
