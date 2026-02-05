/**
 * 文件关系服务
 *
 * 核心职责：
 * 1. 管理文件关系
 * 2. 关系图谱查询
 * 3. 循环依赖检测
 * 4. 级联操作
 * 5. 关系可视化支持
 *
 * @module infrastructure/vfs
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { VirtualFileSystem, FileRelationship, RelationType } from './VirtualFileSystem';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 关系图节点
 */
export interface GraphNode {
  id: string;
  label: string;
  type: string;
  role: string;
  metadata?: Record<string, any>;
}

/**
 * 关系图边
 */
export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  label?: string;
  metadata?: Record<string, any>;
}

/**
 * 关系图谱
 */
export interface RelationshipGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed: boolean;
}

/**
 * 路径信息
 */
export interface PathInfo {
  nodes: string[];
  edges: string[];
  length: number;
  type?: RelationType;
}

/**
 * 依赖分析结果
 */
export interface DependencyAnalysis {
  hasCircularDependency: boolean;
  circularPaths: PathInfo[];
  depth: number;
  leafNodes: string[];
  rootNodes: string[];
  criticalPath?: PathInfo;
}

/**
 * 级联删除影响分析
 */
export interface CascadeImpact {
  affectedFiles: string[];
  affectedWorkflows: string[];
  safeToDelete: boolean;
  warnings: string[];
}

// ============================================================================
// 关系服务实现
// ============================================================================

/**
 * 文件关系服务类
 */
export class FileRelationshipService extends EventEmitter {
  private static instance: FileRelationshipService | null = null;
  private vfs: VirtualFileSystem;

  private constructor(vfs?: VirtualFileSystem) {
    super();
    this.vfs = vfs || VirtualFileSystem.getInstance();
    console.log('[FileRelationshipService] Service created');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(vfs?: VirtualFileSystem): FileRelationshipService {
    if (!FileRelationshipService.instance) {
      FileRelationshipService.instance = new FileRelationshipService(vfs);
    }
    return FileRelationshipService.instance;
  }

  /**
   * 初始化关系服务
   */
  public async initialize(): Promise<void> {
    console.log('[FileRelationshipService] Initializing...');

    // TODO: 从持久化存储恢复关系

    console.log('[FileRelationshipService] ✅ Initialization complete');
    this.emit('initialized');
  }

  // ========================================================================
  // 关系查询
  // ========================================================================

  /**
   * 获取文件关系图谱
   */
  public async getRelationshipGraph(options?: {
    rootId?: string;
    maxDepth?: number;
    includeTypes?: RelationType[];
  }): Promise<RelationshipGraph> {
    console.log('[FileRelationshipService] Building relationship graph');

    const { rootId, maxDepth = 3, includeTypes } = options || {};

    const nodes: Map<string, GraphNode> = new Map();
    const edges: GraphEdge[] = [];

    // 获取所有文件
    const allFiles = await this.vfs.listDirectory();

    // 如果指定了根节点，只获取相关的子图
    if (rootId) {
      await this.buildSubgraph(rootId, nodes, edges, maxDepth, 0, includeTypes);
    } else {
      // 构建完整图谱
      for (const file of allFiles) {
        if (!nodes.has(file.id)) {
          nodes.set(file.id, {
            id: file.id,
            label: file.name,
            type: file.type,
            role: file.role,
            metadata: file.metadata,
          });
        }

        const relationships = await this.vfs.getRelationships(file.id);
        for (const rel of relationships) {
          if (includeTypes && !includeTypes.includes(rel.type)) {
            continue;
          }

          edges.push({
            id: rel.id,
            from: rel.fromFileId,
            to: rel.toFileId,
            type: rel.type,
            label: this.getRelationLabel(rel.type),
            metadata: rel.metadata,
          });
        }
      }
    }

    const graph: RelationshipGraph = {
      nodes: Array.from(nodes.values()),
      edges,
      directed: true,
    };

    console.log(`[FileRelationshipService] Graph built: ${nodes.size} nodes, ${edges.length} edges`);

    return graph;
  }

  /**
   * 查找文件间的路径
   */
  public async findPath(
    fromId: string,
    toId: string,
    options?: {
      maxDepth?: number;
      relationTypes?: RelationType[];
    }
  ): Promise<PathInfo[]> {
    console.log(`[FileRelationshipService] Finding path from ${fromId} to ${toId}`);

    const { maxDepth = 10, relationTypes } = options || {};

    const paths: PathInfo[] = [];
    const visited = new Set<string>();
    const currentPath: string[] = [fromId];
    const currentEdges: string[] = [];

    await this.dfsFindPath(fromId, toId, visited, currentPath, currentEdges, paths, maxDepth, 0, relationTypes);

    console.log(`[FileRelationshipService] Found ${paths.length} paths`);
    return paths;
  }

  /**
   * 分析依赖关系
   */
  public async analyzeDependencies(fileId: string): Promise<DependencyAnalysis> {
    console.log(`[FileRelationshipService] Analyzing dependencies for: ${fileId}`);

    const graph = await this.getRelationshipGraph({ rootId: fileId });
    const nodeIds = new Set(graph.nodes.map(n => n.id));

    // 检测循环依赖
    const circularPaths = await this.detectCircularDependencies(fileId);

    // 找出叶节点（没有依赖其他文件的文件）
    const leafNodes: string[] = [];
    for (const node of graph.nodes) {
      const hasOutgoing = graph.edges.some(e => e.from === node.id);
      if (!hasOutgoing && node.id !== fileId) {
        leafNodes.push(node.id);
      }
    }

    // 找出根节点（不被任何文件依赖的文件）
    const rootNodes: string[] = [];
    for (const node of graph.nodes) {
      const hasIncoming = graph.edges.some(e => e.to === node.id);
      if (!hasIncoming && node.id !== fileId) {
        rootNodes.push(node.id);
      }
    }

    // 计算最大深度
    const depth = await this.calculateMaxDepth(fileId);

    // 找关键路径
    const criticalPath = await this.findCriticalPath(fileId);

    return {
      hasCircularDependency: circularPaths.length > 0,
      circularPaths,
      depth,
      leafNodes,
      rootNodes,
      criticalPath,
    };
  }

  /**
   * 分析级联删除影响
   */
  public async analyzeCascadeImpact(fileId: string): Promise<CascadeImpact> {
    console.log(`[FileRelationshipService] Analyzing cascade impact for: ${fileId}`);

    const affectedFiles: string[] = [];
    const warnings: string[] = [];

    // 获取所有依赖此文件的其他文件
    const relationships = await this.vfs.getRelationships(fileId);
    const dependents = relationships.filter(r => r.toFileId === fileId);

    for (const dep of dependents) {
      affectedFiles.push(dep.fromFileId);

      // 检查是否有输出文件
      const depFileInfo = await this.vfs.readFile(dep.fromFileId) as any;
      if (depFileInfo?.role === 'output') {
        warnings.push(`Deleting ${fileId} will affect output file: ${depFileInfo.name}`);
      }
    }

    // 递归获取受影响的文件
    const allAffected = new Set<string>(affectedFiles);
    for (const dependentId of affectedFiles) {
      const subImpact = await this.analyzeCascadeImpact(dependentId);
      for (const subFileId of subImpact.affectedFiles) {
        allAffected.add(subFileId);
      }
    }

    return {
      affectedFiles: Array.from(allAffected),
      affectedWorkflows: [], // TODO: 识别受影响的工作流
      safeToDelete: affectedFiles.length === 0,
      warnings,
    };
  }

  /**
   * 获取文件的所有依赖
   */
  public async getDependencies(fileId: string, options?: {
    maxDepth?: number;
    directOnly?: boolean;
  }): Promise<Map<string, string[]>> {
    const { maxDepth = 5, directOnly = false } = options || {};

    const dependencies = new Map<string, string[]>();
    const visited = new Set<string>();

    await this.collectDependencies(fileId, dependencies, visited, 0, maxDepth, directOnly);

    return dependencies;
  }

  /**
   * 获取所有依赖此文件的其他文件
   */
  public async getDependents(fileId: string, options?: {
    maxDepth?: number;
    directOnly?: boolean;
  }): Promise<string[]> {
    const { maxDepth = 5, directOnly = false } = options || {};

    const dependents: string[] = [];
    const visited = new Set<string>();

    await this.collectDependents(fileId, dependents, visited, 0, maxDepth, directOnly);

    return dependents;
  }

  // ========================================================================
  // 循环依赖检测
  // ========================================================================

  /**
   * 检测所有循环依赖
   */
  public async detectCircularDependencies(rootId?: string): Promise<PathInfo[]> {
    console.log('[FileRelationshipService] Detecting circular dependencies');

    const circularPaths: PathInfo[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const startNodes = rootId ? [rootId] : (await this.vfs.listDirectory()).map(f => f.id);

    for (const nodeId of startNodes) {
      if (!visited.has(nodeId)) {
        await this.detectCycles(nodeId, visited, recursionStack, [], [], circularPaths);
      }
    }

    console.log(`[FileRelationshipService] Found ${circularPaths.length} circular dependencies`);

    return circularPaths;
  }

  /**
   * 检查添加关系是否会创建循环
   */
  public async wouldCreateCircularDependency(
    fromId: string,
    toId: string
  ): Promise<boolean> {
    // 临时添加关系
    const tempRelationship: FileRelationship = {
      id: 'temp',
      fromFileId: fromId,
      toFileId: toId,
      type: RelationType.DEPENDS_ON,
      createdAt: Date.now(),
    };

    // 检查是否会创建循环
    const visited = new Set<string>();
    const hasCycle = await this.checkCycleFrom(toId, fromId, visited);

    return hasCycle;
  }

  // ========================================================================
  // 关系统计
  // ========================================================================

  /**
   * 获取关系统计
   */
  public async getRelationshipStats(): Promise<{
    total: number;
    byType: Record<RelationType, number>;
    orphanNodes: number;
    connectedComponents: number;
  }> {
    const graph = await this.getRelationshipGraph();

    const stats = {
      total: graph.edges.length,
      byType: {
        [RelationType.DEPENDS_ON]: 0,
        [RelationType.REFERENCES]: 0,
        [RelationType.GENERATES]: 0,
        [RelationType.CONFIGURES]: 0,
        [RelationType.MERGES_WITH]: 0,
      },
      orphanNodes: 0,
      connectedComponents: 0,
    };

    // 统计关系类型
    for (const edge of graph.edges) {
      stats.byType[edge.type]++;
    }

    // 统计孤立节点
    for (const node of graph.nodes) {
      const hasEdge = graph.edges.some(e => e.from === node.id || e.to === node.id);
      if (!hasEdge) {
        stats.orphanNodes++;
      }
    }

    // 计算连通分量
    stats.connectedComponents = this.countConnectedComponents(graph);

    return stats;
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 构建子图
   */
  private async buildSubgraph(
    nodeId: string,
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[],
    maxDepth: number,
    currentDepth: number,
    includeTypes?: RelationType[]
  ): Promise<void> {
    if (currentDepth >= maxDepth || nodes.has(nodeId)) {
      return;
    }

    // 添加节点
    const fileInfo = await this.vfs.readFile(nodeId) as any;
    if (fileInfo) {
      nodes.set(nodeId, {
        id: nodeId,
        label: fileInfo.name,
        type: fileInfo.type,
        role: fileInfo.role,
        metadata: fileInfo.metadata,
      });
    }

    // 获取关系
    const relationships = await this.vfs.getRelationships(nodeId);

    for (const rel of relationships) {
      if (includeTypes && !includeTypes.includes(rel.type)) {
        continue;
      }

      // 添加边
      edges.push({
        id: rel.id,
        from: rel.fromFileId,
        to: rel.toFileId,
        type: rel.type,
        label: this.getRelationLabel(rel.type),
        metadata: rel.metadata,
      });

      // 递归处理相邻节点
      await this.buildSubgraph(
        rel.toFileId,
        nodes,
        edges,
        maxDepth,
        currentDepth + 1,
        includeTypes
      );
    }
  }

  /**
   * DFS 查找路径
   */
  private async dfsFindPath(
    currentId: string,
    targetId: string,
    visited: Set<string>,
    currentPath: string[],
    currentEdges: string[],
    paths: PathInfo[],
    maxDepth: number,
    currentDepth: number,
    relationTypes?: RelationType[]
  ): Promise<void> {
    if (currentDepth > maxDepth) {
      return;
    }

    if (currentId === targetId && currentPath.length > 1) {
      paths.push({
        nodes: [...currentPath],
        edges: [...currentEdges],
        length: currentPath.length - 1,
      });
      return;
    }

    visited.add(currentId);

    const relationships = await this.vfs.getRelationships(currentId);

    for (const rel of relationships) {
      if (relationTypes && !relationTypes.includes(rel.type)) {
        continue;
      }

      const nextId = rel.toFileId;

      if (!visited.has(nextId) || nextId === targetId) {
        currentPath.push(nextId);
        currentEdges.push(rel.id);

        await this.dfsFindPath(
          nextId,
          targetId,
          visited,
          currentPath,
          currentEdges,
          paths,
          maxDepth,
          currentDepth + 1,
          relationTypes
        );

        currentPath.pop();
        currentEdges.pop();
      }
    }

    visited.delete(currentId);
  }

  /**
   * 检测循环（DFS）
   */
  private async detectCycles(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    currentPath: string[],
    currentEdges: string[],
    cycles: PathInfo[]
  ): Promise<void> {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    currentPath.push(nodeId);

    const relationships = await this.vfs.getRelationships(nodeId);

    for (const rel of relationships) {
      const nextId = rel.toFileId;

      if (!visited.has(nextId)) {
        currentEdges.push(rel.id);
        await this.detectCycles(
          nextId,
          visited,
          recursionStack,
          currentPath,
          currentEdges,
          cycles
        );
        currentEdges.pop();
      } else if (recursionStack.has(nextId)) {
        // 找到循环
        const cycleStart = currentPath.indexOf(nextId);
        const cycleNodes = currentPath.slice(cycleStart);
        const cycleEdges = currentEdges.slice(cycleStart);

        cycles.push({
          nodes: [...cycleNodes, nextId],
          edges: [...cycleEdges, rel.id],
          length: cycleNodes.length + 1,
        });
      }
    }

    currentPath.pop();
    recursionStack.delete(nodeId);
  }

  /**
   * 检查从 fromId 开始是否能到达 toId
   */
  private async checkCycleFrom(
    fromId: string,
    targetId: string,
    visited: Set<string>
  ): Promise<boolean> {
    if (fromId === targetId) {
      return true;
    }

    visited.add(fromId);

    const relationships = await this.vfs.getRelationships(fromId);

    for (const rel of relationships) {
      const nextId = rel.toFileId;

      if (!visited.has(nextId)) {
        if (await this.checkCycleFrom(nextId, targetId, visited)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 收集依赖
   */
  private async collectDependencies(
    fileId: string,
    dependencies: Map<string, string[]>,
    visited: Set<string>,
    currentDepth: number,
    maxDepth: number,
    directOnly: boolean
  ): Promise<void> {
    if (currentDepth >= maxDepth || visited.has(fileId)) {
      return;
    }

    visited.add(fileId);

    const relationships = await this.vfs.getRelationships(fileId);
    const deps = relationships
      .filter(r => r.fromFileId === fileId)
      .map(r => r.toFileId);

    if (deps.length > 0) {
      dependencies.set(fileId, deps);

      if (!directOnly) {
        for (const depId of deps) {
          await this.collectDependencies(
            depId,
            dependencies,
            visited,
            currentDepth + 1,
            maxDepth,
            directOnly
          );
        }
      }
    }
  }

  /**
   * 收集依赖者
   */
  private async collectDependents(
    fileId: string,
    dependents: string[],
    visited: Set<string>,
    currentDepth: number,
    maxDepth: number,
    directOnly: boolean
  ): Promise<void> {
    if (currentDepth >= maxDepth || visited.has(fileId)) {
      return;
    }

    visited.add(fileId);

    const relationships = await this.vfs.getRelationships(fileId);
    const deps = relationships
      .filter(r => r.toFileId === fileId)
      .map(r => r.fromFileId);

    for (const depId of deps) {
      if (!dependents.includes(depId)) {
        dependents.push(depId);

        if (!directOnly) {
          await this.collectDependents(
            depId,
            dependents,
            visited,
            currentDepth + 1,
            maxDepth,
            directOnly
          );
        }
      }
    }
  }

  /**
   * 计算最大深度
   */
  private async calculateMaxDepth(fileId: string): Promise<number> {
    const visited = new Set<string>();

    const dfs = async (id: string, depth: number): Promise<number> => {
      if (visited.has(id)) {
        return depth;
      }

      visited.add(id);

      const relationships = await this.vfs.getRelationships(id);
      const deps = relationships.filter(r => r.fromFileId === id).map(r => r.toFileId);

      if (deps.length === 0) {
        return depth;
      }

      let maxChildDepth = depth;
      for (const depId of deps) {
        const childDepth = await dfs(depId, depth + 1);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }

      return maxChildDepth;
    };

    return await dfs(fileId, 0);
  }

  /**
   * 查找关键路径
   */
  private async findCriticalPath(fileId: string): Promise<PathInfo | undefined> {
    // 使用最长路径算法找关键路径
    const allPaths = await this.findPath(
      fileId,
      '', // 空目标表示找所有路径
      { maxDepth: 100 }
    );

    if (allPaths.length === 0) {
      return undefined;
    }

    // 返回最长的路径
    return allPaths.reduce((longest, current) =>
      current.length > longest.length ? current : longest
    );
  }

  /**
   * 计算连通分量
   */
  private countConnectedComponents(graph: RelationshipGraph): number {
    const visited = new Set<string>();
    let components = 0;

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        components++;
        this.dfsComponent(node.id, graph, visited);
      }
    }

    return components;
  }

  /**
   * DFS 遍历连通分量
   */
  private dfsComponent(
    nodeId: string,
    graph: RelationshipGraph,
    visited: Set<string>
  ): void {
    visited.add(nodeId);

    for (const edge of graph.edges) {
      if (edge.from === nodeId && !visited.has(edge.to)) {
        this.dfsComponent(edge.to, graph, visited);
      }
      if (edge.to === nodeId && !visited.has(edge.from)) {
        this.dfsComponent(edge.from, graph, visited);
      }
    }
  }

  /**
   * 获取关系标签
   */
  private getRelationLabel(type: RelationType): string {
    const labels: Record<RelationType, string> = {
      [RelationType.DEPENDS_ON]: 'depends on',
      [RelationType.REFERENCES]: 'references',
      [RelationType.GENERATES]: 'generates',
      [RelationType.CONFIGURES]: 'configures',
      [RelationType.MERGES_WITH]: 'merges with',
    };

    return labels[type] || type;
  }
}

// ============================================================================
// 导出
// ============================================================================

/**
 * 导出单例获取函数
 */
export const getFileRelationshipService = (vfs?: VirtualFileSystem): FileRelationshipService => {
  return FileRelationshipService.getInstance(vfs);
};

/**
 * 默认导出
 */
export default FileRelationshipService;
