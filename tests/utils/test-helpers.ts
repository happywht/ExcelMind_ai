/**
 * 测试工具模块
 *
 * 提供通用的测试辅助函数和Mock对象工厂
 *
 * @module tests/utils/test-helpers
 * @version 1.0.0
 */

import { ExecutionContext, ExtendedVirtualFileInfo, GraphNode, GraphEdge, ExecutionStage, StageInfo, LogEntry } from '../../components/VirtualWorkspace/types';
import { QueryResult } from '../../services/quality/aiOutputValidator';
import { FileRole, RelationType } from '../../services/infrastructure/vfs/VirtualFileSystem/types';

// ============================================================================
// ExecutionContext 工厂函数
// ============================================================================

/**
 * 创建模拟执行上下文
 */
export function createMockExecutionContext(
  overrides?: Partial<ExecutionContext>
): ExecutionContext {
  const defaultStages: StageInfo[] = [
    {
      stage: ExecutionStage.RECONNAISSANCE,
      name: '侦察阶段',
      description: '分析文件结构和数据',
      status: 'pending',
      progress: 0,
    },
    {
      stage: ExecutionStage.PRE_AUDIT,
      name: '预审阶段',
      description: '验证数据完整性',
      status: 'pending',
      progress: 0,
    },
    {
      stage: ExecutionStage.ANALYSIS,
      name: '分析阶段',
      description: 'AI分析和处理',
      status: 'pending',
      progress: 0,
    },
    {
      stage: ExecutionStage.GENERATION,
      name: '生成阶段',
      description: '生成输出结果',
      status: 'pending',
      progress: 0,
    },
  ];

  return {
    executionId: 'test-exec-1',
    stages: defaultStages,
    logs: [],
    totalProgress: 0,
    status: 'pending',
    startTime: Date.now(),
    ...overrides,
  };
}

/**
 * 创建模拟阶段信息
 */
export function createMockStageInfo(
  overrides?: Partial<StageInfo>
): StageInfo {
  return {
    stage: ExecutionStage.RECONNAISSANCE,
    name: '侦察阶段',
    description: '分析文件结构和数据',
    status: 'pending',
    progress: 0,
    ...overrides,
  };
}

/**
 * 创建模拟日志条目
 */
export function createMockLogEntry(
  overrides?: Partial<LogEntry>
): LogEntry {
  return {
    id: `log-${Date.now()}`,
    timestamp: Date.now(),
    level: 'info',
    message: '测试日志',
    ...overrides,
  };
}

// ============================================================================
// VirtualFile 工厂函数
// ============================================================================

/**
 * 创建模拟虚拟文件信息
 */
export function createMockVirtualFile(
  overrides?: Partial<ExtendedVirtualFileInfo>
): ExtendedVirtualFileInfo {
  return {
    id: `file-${Date.now()}`,
    name: 'test.xlsx',
    role: FileRole.PRIMARY_SOURCE,
    type: 'excel',
    path: '/data/test.xlsx',
    size: 1024,
    uploadTime: Date.now(),
    lastModified: Date.now(),
    checksum: 'abc123',
    metadata: {},
    referenceCount: 0,
    isSelected: false,
    ...overrides,
  };
}

/**
 * 创建模拟虚拟文件列表
 */
export function createMockVirtualFileList(
  count: number = 3,
  overrides?: Partial<ExtendedVirtualFileInfo>
): ExtendedVirtualFileInfo[] {
  return Array.from({ length: count }, (_, i) =>
    createMockVirtualFile({
      id: `file-${i}`,
      name: `test-${i}.xlsx`,
      path: `/data/test-${i}.xlsx`,
      ...overrides,
    })
  );
}

// ============================================================================
// Graph 工厂函数
// ============================================================================

/**
 * 创建模拟图节点
 */
export function createMockGraphNode(
  overrides?: Partial<GraphNode>
): GraphNode {
  return {
    id: `node-${Date.now()}`,
    label: '测试节点',
    type: 'excel',
    role: FileRole.PRIMARY_SOURCE,
    ...overrides,
  };
}

/**
 * 创建模拟图边
 */
export function createMockGraphEdge(
  overrides?: Partial<GraphEdge>
): GraphEdge {
  return {
    id: `edge-${Date.now()}`,
    source: 'node-1',
    target: 'node-2',
    type: RelationType.REFERENCES,
    ...overrides,
  };
}

/**
 * 创建模拟图数据
 */
export function createMockGraphData(
  nodeCount: number = 3,
  edgeCount: number = 2
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = Array.from({ length: nodeCount }, (_, i) =>
    createMockGraphNode({
      id: `node-${i}`,
      label: `节点${i}`,
    })
  );

  const edges = Array.from({ length: edgeCount }, (_, i) =>
    createMockGraphEdge({
      id: `edge-${i}`,
      source: `node-${i}`,
      target: `node-${(i + 1) % nodeCount}`,
    })
  );

  return { nodes, edges };
}

// ============================================================================
// QueryResult 工厂函数
// ============================================================================

/**
 * 创建模拟查询结果
 */
export function createMockQueryResult(
  overrides?: Partial<QueryResult>
): QueryResult {
  return {
    data: [{ 姓名: '张三', 销售额: 1000 }],
    rowCount: 1,
    sql: 'SELECT * FROM test',
    executionTime: 100,
    success: true,
    ...overrides,
  };
}

/**
 * 创建空查询结果
 */
export function createEmptyQueryResult(): QueryResult {
  return {
    data: [],
    rowCount: 0,
    sql: 'SELECT * FROM test WHERE 1=0',
    executionTime: 50,
    success: true,
  };
}

// ============================================================================
// AccessControl 工厂函数
// ============================================================================

/**
 * 创建模拟访问控制规则
 */
export function createMockAccessControlRule(overrides?: any): any {
  return {
    name: '测试规则',
    applyTo: ['user-1'],
    priority: 1,
    enabled: true,
    allow: {
      readRoles: ['primary_source'],
    },
    ...overrides,
  };
}

// ============================================================================
// 通用辅助函数
// ============================================================================

/**
 * 创建延迟Promise（用于测试异步操作）
 */
export function createDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建模拟的异步函数
 */
export function createMockAsyncFunction<T>(
  result: T,
  delay: number = 0
): () => Promise<T> {
  return () =>
    new Promise(resolve => {
      if (delay > 0) {
        setTimeout(() => resolve(result), delay);
      } else {
        resolve(result);
      }
    });
}

/**
 * 创建模拟的错误函数
 */
export function createMockErrorFunction(
  error: Error,
  delay: number = 0
): () => Promise<never> {
  return () =>
    new Promise((_, reject) => {
      if (delay > 0) {
        setTimeout(() => reject(error), delay);
      } else {
        reject(error);
      }
    });
}

/**
 * 安全的类型断言（用于测试）
 */
export function asMock<T>(value: any): T {
  return value as T;
}

/**
 * 创建部分Mock对象
 */
export function createPartialMock<T>(
  base: T,
  overrides: Partial<T>
): T {
  return { ...base, ...overrides };
}

// ============================================================================
// 性能测试辅助函数
// ============================================================================

/**
 * 测量函数执行时间
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * 多次执行并统计
 */
export async function measureMultipleRuns<T>(
  fn: () => Promise<T>,
  runs: number = 10
): Promise<{ results: T[]; durations: number[]; avgDuration: number }> {
  const results: T[] = [];
  const durations: number[] = [];

  for (let i = 0; i < runs; i++) {
    const { result, duration } = await measureExecutionTime(fn);
    results.push(result);
    durations.push(duration);
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

  return { results, durations, avgDuration };
}

// ============================================================================
// 导出所有工具
// ============================================================================

export default {
  // ExecutionContext
  createMockExecutionContext,
  createMockStageInfo,
  createMockLogEntry,

  // VirtualFile
  createMockVirtualFile,
  createMockVirtualFileList,

  // Graph
  createMockGraphNode,
  createMockGraphEdge,
  createMockGraphData,

  // QueryResult
  createMockQueryResult,
  createEmptyQueryResult,

  // AccessControl
  createMockAccessControlRule,

  // 通用
  createDelay,
  createMockAsyncFunction,
  createMockErrorFunction,
  asMock,
  createPartialMock,

  // 性能
  measureExecutionTime,
  measureMultipleRuns,
};
