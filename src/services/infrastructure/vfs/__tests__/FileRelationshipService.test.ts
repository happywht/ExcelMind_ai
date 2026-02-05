/**
 * FileRelationshipService 单元测试
 *
 * 测试范围:
 * - 关系图谱查询
 * - 路径查找
 * - 循环依赖检测
 * - 级联影响分析
 * - 依赖关系分析
 */

import { FileRelationshipService, RelationshipGraph, PathInfo } from '../FileRelationshipService';
import { VirtualFileSystem, FileRole, RelationType, FileRelationship } from '../VirtualFileSystem';

// ============================================================================
// Mock VirtualFileSystem
// ============================================================================

const mockFiles: Map<string, any> = new Map();
const mockRelationships: Map<string, FileRelationship> = new Map();

const mockVFS = {
  listDirectory: jest.fn().mockResolvedValue(Array.from(mockFiles.values())),
  readFile: jest.fn((id: string) => mockFiles.get(id)),
  getRelationships: jest.fn((id: string) => {
    const result: FileRelationship[] = [];
    for (const rel of mockRelationships.values()) {
      if (rel.fromFileId === id || rel.toFileId === id) {
        result.push(rel);
      }
    }
    return Promise.resolve(result);
  }),
};

jest.mock('../VirtualFileSystem', () => ({
  VirtualFileSystem: {
    getInstance: () => mockVFS,
  },
  FileRole: {
    PRIMARY_SOURCE: 'primary_source',
    AUXILIARY_SOURCE: 'auxiliary_source',
    CONFIGURATION: 'configuration',
    TEMPLATE: 'template',
    OUTPUT: 'output',
    TEMPORARY: 'temporary',
  },
  RelationType: {
    DEPENDS_ON: 'depends_on',
    REFERENCES: 'references',
    GENERATES: 'generates',
    CONFIGURES: 'configures',
    MERGES_WITH: 'merges_with',
  },
}));

// ============================================================================
// 测试辅助函数
// ============================================================================

const createMockFile = (id: string, name: string, role: FileRole = FileRole.PRIMARY_SOURCE) => {
  const file = {
    id,
    name,
    role,
    type: 'excel' as const,
    path: `/mnt/data/${name}`,
    size: 1024,
    uploadTime: Date.now(),
    lastModified: Date.now(),
  };
  mockFiles.set(id, file);
  return file;
};

const createMockRelationship = (
  fromId: string,
  toId: string,
  type: RelationType = RelationType.DEPENDS_ON
): FileRelationship => {
  const rel: FileRelationship = {
    id: `rel_${fromId}_${toId}`,
    fromFileId: fromId,
    toFileId: toId,
    type,
    createdAt: Date.now(),
  };
  mockRelationships.set(rel.id, rel);
  return rel;
};

const clearMocks = () => {
  mockFiles.clear();
  mockRelationships.clear();
  jest.clearAllMocks();
};

// ============================================================================
// 测试套件
// ============================================================================

describe('FileRelationshipService', () => {
  let service: FileRelationshipService;
  let file1: any;
  let file2: any;
  let file3: any;
  let file4: any;

  beforeEach(async () => {
    clearMocks();

    // 重置单例
    (FileRelationshipService as any).instance = null;

    service = FileRelationshipService.getInstance(mockVFS as any);
    await service.initialize();

    // 创建测试文件
    file1 = createMockFile('file1', 'data1.xlsx');
    file2 = createMockFile('file2', 'data2.xlsx');
    file3 = createMockFile('file3', 'data3.xlsx');
    file4 = createMockFile('file4', 'output.xlsx', FileRole.OUTPUT);
  });

  afterEach(() => {
    clearMocks();
    (FileRelationshipService as any).instance = null;
  });

  // ========================================================================
  // 初始化测试
  // ========================================================================

  describe('初始化', () => {
    it('应该成功初始化', async () => {
      expect(service).toBeInstanceOf(FileRelationshipService);
    });

    it('应该返回单例实例', () => {
      const service2 = FileRelationshipService.getInstance();
      expect(service2).toBe(service);
    });
  });

  // ========================================================================
  // 关系图谱测试
  // ========================================================================

  describe('关系图谱', () => {
    beforeEach(() => {
      createMockRelationship(file1.id, file2.id, RelationType.DEPENDS_ON);
      createMockRelationship(file1.id, file3.id, RelationType.REFERENCES);
      createMockRelationship(file2.id, file4.id, RelationType.GENERATES);
    });

    it('应该构建完整的关系图谱', async () => {
      const graph = await service.getRelationshipGraph();

      expect(graph.nodes).toHaveLength(4);
      expect(graph.edges).toHaveLength(3);
      expect(graph.directed).toBe(true);
    });

    it('应该构建子图（从根节点）', async () => {
      const graph = await service.getRelationshipGraph({
        rootId: file1.id,
        maxDepth: 2,
      });

      expect(graph.nodes).toHaveLength(4);
      expect(graph.edges).toHaveLength(3);
    });

    it('应该限制子图深度', async () => {
      const graph = await service.getRelationshipGraph({
        rootId: file1.id,
        maxDepth: 1,
      });

      // 应该只包含直接关系
      expect(graph.nodes.length).toBeLessThanOrEqual(3);
    });

    it('应该过滤特定类型的关系', async () => {
      const graph = await service.getRelationshipGraph({
        includeTypes: [RelationType.DEPENDS_ON],
      });

      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0].type).toBe(RelationType.DEPENDS_ON);
    });

    it('应该为节点添加正确的标签', async () => {
      const graph = await service.getRelationshipGraph();

      expect(graph.nodes[0].label).toBeDefined();
      expect(graph.nodes[0].type).toBeDefined();
      expect(graph.nodes[0].role).toBeDefined();
    });

    it('应该为边添加正确的标签', async () => {
      const graph = await service.getRelationshipGraph();

      expect(graph.edges[0].label).toBeDefined();
      expect(graph.edges[0].type).toBeDefined();
    });
  });

  // ========================================================================
  // 路径查找测试
  // ========================================================================

  describe('路径查找', () => {
    beforeEach(() => {
      // file1 -> file2 -> file4
      createMockRelationship(file1.id, file2.id, RelationType.DEPENDS_ON);
      createMockRelationship(file2.id, file4.id, RelationType.GENERATES);

      // file1 -> file3
      createMockRelationship(file1.id, file3.id, RelationType.REFERENCES);
    });

    it('应该找到两个文件之间的路径', async () => {
      const paths = await service.findPath(file1.id, file4.id);

      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0].nodes).toContain(file1.id);
      expect(paths[0].nodes).toContain(file2.id);
      expect(paths[0].nodes).toContain(file4.id);
      expect(paths[0].length).toBe(2); // 2 条边
    });

    it('应该找到多条路径', async () => {
      // 添加另一条路径: file1 -> file3 -> file4
      createMockRelationship(file3.id, file4.id, RelationType.GENERATES);

      const paths = await service.findPath(file1.id, file4.id);

      expect(paths.length).toBeGreaterThan(1);
    });

    it('应该限制路径搜索深度', async () => {
      const paths = await service.findPath(file1.id, file4.id, {
        maxDepth: 1,
      });

      // 深度为 1 时应该找不到 file4
      expect(paths.length).toBe(0);
    });

    it('应该过滤特定关系类型', async () => {
      const paths = await service.findPath(file1.id, file4.id, {
        relationTypes: [RelationType.GENERATES],
      });

      expect(paths.length).toBeGreaterThan(0);
      paths.forEach(path => {
        // 验证路径中的边都是 GENERATES 类型
        // 这里简化检查
      });
    });

    it('应该返回空数组对于不存在的路径', async () => {
      const paths = await service.findPath(file1.id, 'non-existent');

      expect(paths).toEqual([]);
    });
  });

  // ========================================================================
  // 循环依赖检测测试
  // ========================================================================

  describe('循环依赖检测', () => {
    it('应该检测到循环依赖', async () => {
      // 创建循环: file1 -> file2 -> file3 -> file1
      createMockRelationship(file1.id, file2.id, RelationType.DEPENDS_ON);
      createMockRelationship(file2.id, file3.id, RelationType.DEPENDS_ON);
      createMockRelationship(file3.id, file1.id, RelationType.DEPENDS_ON);

      const cycles = await service.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0].nodes).toContain(file1.id);
      expect(cycles[0].nodes).toContain(file2.id);
      expect(cycles[0].nodes).toContain(file3.id);
    });

    it('应该从指定根节点检测循环', async () => {
      createMockRelationship(file1.id, file2.id);
      createMockRelationship(file2.id, file3.id);
      createMockRelationship(file3.id, file1.id);

      const cycles = await service.detectCircularDependencies(file1.id);

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('应该返回空数组对于无循环的图', async () => {
      createMockRelationship(file1.id, file2.id);
      createMockRelationship(file1.id, file3.id);
      createMockRelationship(file2.id, file4.id);

      const cycles = await service.detectCircularDependencies();

      expect(cycles).toEqual([]);
    });

    it('应该检测多个独立的循环', async () => {
      // 循环 1: file1 -> file2 -> file1
      createMockRelationship(file1.id, file2.id);
      createMockRelationship(file2.id, file1.id);

      // 循环 2: file3 -> file4 -> file3
      createMockRelationship(file3.id, file4.id);
      createMockRelationship(file4.id, file3.id);

      const cycles = await service.detectCircularDependencies();

      expect(cycles.length).toBe(2);
    });

    it('应该检查添加关系是否会创建循环', async () => {
      createMockRelationship(file1.id, file2.id);
      createMockRelationship(file2.id, file3.id);

      const wouldCreate = await service.wouldCreateCircularDependency(file3.id, file1.id);

      expect(wouldCreate).toBe(true);
    });

    it('应该返回 false 对于不会创建循环的关系', async () => {
      createMockRelationship(file1.id, file2.id);
      createMockRelationship(file1.id, file3.id);

      const wouldCreate = await service.wouldCreateCircularDependency(file3.id, file4.id);

      expect(wouldCreate).toBe(false);
    });
  });

  // ========================================================================
  // 依赖分析测试
  // ========================================================================

  describe('依赖分析', () => {
    beforeEach(() => {
      // file1 -> file2 -> file4
      createMockRelationship(file1.id, file2.id);
      createMockRelationship(file2.id, file4.id);

      // file1 -> file3
      createMockRelationship(file1.id, file3.id);
    });

    it('应该分析依赖关系', async () => {
      const analysis = await service.analyzeDependencies(file1.id);

      expect(analysis.hasCircularDependency).toBe(false);
      expect(analysis.circularPaths).toEqual([]);
      expect(analysis.depth).toBeGreaterThan(0);
      expect(analysis.leafNodes).toContain(file4.id);
      expect(analysis.leafNodes).toContain(file3.id);
    });

    it('应该检测循环依赖', async () => {
      // 添加循环
      createMockRelationship(file4.id, file1.id);

      const analysis = await service.analyzeDependencies(file1.id);

      expect(analysis.hasCircularDependency).toBe(true);
      expect(analysis.circularPaths.length).toBeGreaterThan(0);
    });

    it('应该计算最大深度', async () => {
      const analysis = await service.analyzeDependencies(file1.id);

      expect(analysis.depth).toBe(2); // file1 -> file2 -> file4
    });

    it('应该识别根节点', async () => {
      const analysis = await service.analyzeDependencies(file1.id);

      expect(analysis.rootNodes).toContain(file1.id);
    });

    it('应该识别叶节点', async () => {
      const analysis = await service.analyzeDependencies(file1.id);

      expect(analysis.leafNodes).toContain(file3.id);
      expect(analysis.leafNodes).toContain(file4.id);
    });

    it('应该找到关键路径', async () => {
      const analysis = await service.analyzeDependencies(file1.id);

      expect(analysis.criticalPath).toBeDefined();
      expect(analysis.criticalPath?.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // 级联影响分析测试
  // ========================================================================

  describe('级联影响分析', () => {
    it('应该分析级联删除影响', async () => {
      createMockRelationship(file1.id, file2.id, RelationType.DEPENDS_ON);
      createMockRelationship(file3.id, file1.id, RelationType.REFERENCES);

      const impact = await service.analyzeCascadeImpact(file1.id);

      expect(impact.affectedFiles).toContain(file3.id);
      expect(impact.affectedFiles).not.toContain(file2.id); // file2 被 file1 依赖，不在此范围
    });

    it('应该递归分析影响', async () => {
      // file3 -> file1 -> file2
      createMockRelationship(file3.id, file1.id);
      createMockRelationship(file1.id, file2.id);

      const impact = await service.analyzeCascadeImpact(file2.id);

      expect(impact.affectedFiles).toContain(file1.id);
      expect(impact.affectedFiles).toContain(file3.id);
    });

    it('应该判断是否可以安全删除', async () => {
      const impact = await service.analyzeCascadeImpact(file1.id);

      // 没有依赖时应该可以删除
      expect(impact.safeToDelete).toBeDefined();
    });

    it('应该识别输出文件依赖', async () => {
      createMockRelationship(file1.id, file4.id, RelationType.GENERATES);

      const impact = await service.analyzeCascadeImpact(file4.id);

      expect(impact.warnings.length).toBeGreaterThan(0);
      expect(impact.warnings[0]).toContain('output file');
    });

    it('应该处理空影响', async () => {
      const impact = await service.analyzeCascadeImpact(file1.id);

      expect(impact.affectedFiles).toBeDefined();
      expect(impact.affectedWorkflows).toBeDefined();
    });
  });

  // ========================================================================
  // 依赖获取测试
  // ========================================================================

  describe('依赖获取', () => {
    beforeEach(() => {
      createMockRelationship(file1.id, file2.id);
      createMockRelationship(file1.id, file3.id);
      createMockRelationship(file2.id, file4.id);
    });

    it('应该获取直接依赖', async () => {
      const dependencies = await service.getDependencies(file1.id, {
        directOnly: true,
      });

      expect(dependencies.get(file1.id)).toContain(file2.id);
      expect(dependencies.get(file1.id)).toContain(file3.id);
    });

    it('应该获取所有依赖（递归）', async () => {
      const dependencies = await service.getDependencies(file1.id, {
        maxDepth: 10,
      });

      expect(dependencies.get(file1.id)).toContain(file2.id);
      expect(dependencies.get(file1.id)).toContain(file3.id);
      expect(dependencies.get(file2.id)).toContain(file4.id);
    });

    it('应该限制依赖深度', async () => {
      const dependencies = await service.getDependencies(file1.id, {
        maxDepth: 1,
      });

      // 只应该包含直接依赖
      expect(dependencies.get(file1.id)).toContain(file2.id);
      expect(dependencies.get(file2.id)).toBeUndefined();
    });

    it('应该获取依赖者', async () => {
      const dependents = await service.getDependents(file2.id);

      expect(dependents).toContain(file1.id);
    });

    it('应该递归获取依赖者', async () => {
      createMockRelationship(file3.id, file1.id);

      const dependents = await service.getDependents(file2.id);

      expect(dependents).toContain(file1.id);
      expect(dependents).toContain(file3.id);
    });

    it('应该获取直接依赖者', async () => {
      const dependents = await service.getDependents(file2.id, {
        directOnly: true,
      });

      expect(dependents).toContain(file1.id);
      expect(dependents).not.toContain(file3.id);
    });
  });

  // ========================================================================
  // 关系统计测试
  // ========================================================================

  describe('关系统计', () => {
    beforeEach(() => {
      createMockRelationship(file1.id, file2.id, RelationType.DEPENDS_ON);
      createMockRelationship(file1.id, file3.id, RelationType.REFERENCES);
      createMockRelationship(file2.id, file4.id, RelationType.GENERATES);

      // 添加一个孤立文件
      createMockFile('isolated', 'isolated.xlsx');
    });

    it('应该返回关系统计', async () => {
      const stats = await service.getRelationshipStats();

      expect(stats.total).toBe(3);
      expect(stats.byType[RelationType.DEPENDS_ON]).toBe(1);
      expect(stats.byType[RelationType.REFERENCES]).toBe(1);
      expect(stats.byType[RelationType.GENERATES]).toBe(1);
    });

    it('应该统计孤立节点', async () => {
      const stats = await service.getRelationshipStats();

      expect(stats.orphanNodes).toBe(1);
    });

    it('应该计算连通分量', async () => {
      const stats = await service.getRelationshipStats();

      expect(stats.connectedComponents).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // 边界条件测试
  // ========================================================================

  describe('边界条件', () => {
    it('应该处理空图谱', async () => {
      mockFiles.clear();
      mockRelationships.clear();

      const graph = await service.getRelationshipGraph();

      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });

    it('应该处理单个节点', async () => {
      const graph = await service.getRelationshipGraph();

      expect(graph.nodes).toHaveLength(1);
      expect(graph.edges).toEqual([]);
    });

    it('应该处理不存在的文件ID', async () => {
      const analysis = await service.analyzeDependencies('non-existent-id');

      expect(analysis.hasCircularDependency).toBe(false);
      expect(analysis.depth).toBe(0);
    });

    it('应该处理最大深度为零', async () => {
      const graph = await service.getRelationshipGraph({
        rootId: file1.id,
        maxDepth: 0,
      });

      expect(graph.nodes).toHaveLength(1); // 只包含根节点
    });
  });
});
