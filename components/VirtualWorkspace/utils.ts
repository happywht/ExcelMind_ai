/**
 * 虚拟工作区工具函数
 *
 * @module VirtualWorkspace/utils
 * @version 1.0.0
 */

import { FileRole } from '../../services/infrastructure/vfs/VirtualFileSystem';
import {
import { logger } from '@/utils/logger';
  type ExtendedVirtualFileInfo,
  type FileTreeNode,
  type SortOption,
  type FilterOptions,
  type GraphNode,
  type GraphEdge,
  type LogEntry,
  type SessionInfo,
  ExecutionStage,
} from './types';

// ============================================================================
// 文件工具函数
// ============================================================================

/**
 * 获取文件图标
 */
export const getFileIcon = (fileType: string, size: number = 20): string => {
  const iconMap: Record<string, string> = {
    excel: '📊',
    word: '📄',
    pdf: '📕',
    json: '📋',
    csv: '📈',
    txt: '📝',
    unknown: '📁',
  };
  return iconMap[fileType] || iconMap.unknown;
};

/**
 * 获取文件角色标签
 */
export const getFileRoleLabel = (role: FileRole): string => {
  const labels: Record<FileRole, string> = {
    [FileRole.PRIMARY_SOURCE]: '主数据源',
    [FileRole.AUXILIARY_SOURCE]: '辅助数据源',
    [FileRole.CONFIGURATION]: '配置文件',
    [FileRole.TEMPLATE]: '模板文件',
    [FileRole.OUTPUT]: '输出文件',
    [FileRole.TEMPORARY]: '临时文件',
  };
  return labels[role] || '未知角色';
};

/**
 * 获取文件角色颜色
 */
export const getFileRoleColor = (role: FileRole): string => {
  const colors: Record<FileRole, string> = {
    [FileRole.PRIMARY_SOURCE]: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    [FileRole.AUXILIARY_SOURCE]: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
    [FileRole.CONFIGURATION]: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    [FileRole.TEMPLATE]: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    [FileRole.OUTPUT]: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    [FileRole.TEMPORARY]: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
  };
  return colors[role] || colors[FileRole.TEMPORARY];
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * 格式化时间戳
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 小于1分钟
  if (diff < 60000) {
    return '刚刚';
  }

  // 小于1小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分钟前`;
  }

  // 小于1天
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}小时前`;
  }

  // 小于1周
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}天前`;
  }

  // 格式化完整日期
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 格式化持续时间
 */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

// ============================================================================
// 文件树工具函数
// ============================================================================

/**
 * 构建文件树
 */
export const buildFileTree = (files: ExtendedVirtualFileInfo[]): FileTreeNode[] => {
  const root: FileTreeNode[] = [];
  const pathMap = new Map<string, FileTreeNode>();

  // 按路径排序，确保父节点先于子节点
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const parts = file.path.split('/').filter(p => p);
    let currentLevel = root;
    let currentPath = '';

    // 构建路径层级
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += (currentPath ? '/' : '') + part;
      const isFile = i === parts.length - 1;

      // 查找或创建节点
      let node = currentLevel.find(n => n.name === part);
      if (!node) {
        node = {
          id: isFile ? file.id : currentPath,
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          fileType: isFile ? file.type : undefined,
          role: isFile ? file.role : undefined,
          size: isFile ? file.size : undefined,
          uploadTime: isFile ? file.uploadTime : undefined,
          referenceCount: isFile ? file.referenceCount : undefined,
          children: isFile ? undefined : [],
          isExpanded: false,
          level: i,
        };
        currentLevel.push(node);
        pathMap.set(currentPath, node);
      }

      // 进入下一级
      if (node.children) {
        currentLevel = node.children;
      }
    }
  }

  return root;
};

/**
 * 展开所有节点
 */
export const expandAllNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
  return nodes.map(node => ({
    ...node,
    isExpanded: true,
    children: node.children ? expandAllNodes(node.children) : undefined,
  }));
};

/**
 * 折叠所有节点
 */
export const collapseAllNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
  return nodes.map(node => ({
    ...node,
    isExpanded: false,
    children: node.children ? collapseAllNodes(node.children) : undefined,
  }));
};

/**
 * 切换节点展开状态
 */
export const toggleNode = (
  nodes: FileTreeNode[],
  nodeId: string
): FileTreeNode[] => {
  const toggle = (nodeList: FileTreeNode[]): FileTreeNode[] => {
    return nodeList.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          isExpanded: !node.isExpanded,
        };
      }
      if (node.children) {
        return {
          ...node,
          children: toggle(node.children),
        };
      }
      return node;
    });
  };

  return toggle(nodes);
};

// ============================================================================
// 排序和过滤工具函数
// ============================================================================

/**
 * 排序文件
 */
export const sortFiles = (
  files: ExtendedVirtualFileInfo[],
  sortBy: SortOption,
  ascending: boolean = true
): ExtendedVirtualFileInfo[] => {
  const sorted = [...files];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name, 'zh-CN');
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'date':
        comparison = a.uploadTime - b.uploadTime;
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'role':
        comparison = a.role.localeCompare(b.role);
        break;
    }

    return ascending ? comparison : -comparison;
  });

  return sorted;
};

/**
 * 过滤文件
 */
export const filterFiles = (
  files: ExtendedVirtualFileInfo[],
  filters: FilterOptions
): ExtendedVirtualFileInfo[] => {
  let filtered = [...files];

  // 搜索查询
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(file =>
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
    );
  }

  // 文件类型过滤
  if (filters.fileTypes && filters.fileTypes.length > 0) {
    filtered = filtered.filter(file =>
      filters.fileTypes!.includes(file.type)
    );
  }

  // 角色过滤
  if (filters.roles && filters.roles.length > 0) {
    filtered = filtered.filter(file =>
      filters.roles!.includes(file.role)
    );
  }

  // 日期范围过滤
  if (filters.dateRange) {
    filtered = filtered.filter(file => {
      return file.uploadTime >= filters.dateRange!.start &&
             file.uploadTime <= filters.dateRange!.end;
    });
  }

  return filtered;
};

// ============================================================================
// 关系图谱工具函数
// ============================================================================

/**
 * 构建图节点
 */
export const buildGraphNodes = (files: ExtendedVirtualFileInfo[]): GraphNode[] => {
  return files.map(file => ({
    id: file.id,
    label: file.name,
    type: file.type,
    role: file.role,
    size: calculateNodeSize(file),
    color: getNodeColor(file.role),
    metadata: {
      path: file.path,
      size: file.size,
      uploadTime: file.uploadTime,
    },
  }));
};

/**
 * 计算节点大小
 */
export const calculateNodeSize = (file: ExtendedVirtualFileInfo): number => {
  const baseSize = 20;
  const referenceBonus = (file.referenceCount || 0) * 5;
  const sizeBonus = Math.log10(file.size + 1) * 2;

  return baseSize + referenceBonus + sizeBonus;
};

/**
 * 获取节点颜色
 */
export const getNodeColor = (role: FileRole): string => {
  const colors: Record<FileRole, string> = {
    [FileRole.PRIMARY_SOURCE]: '#3b82f6',
    [FileRole.AUXILIARY_SOURCE]: '#06b6d4',
    [FileRole.CONFIGURATION]: '#8b5cf6',
    [FileRole.TEMPLATE]: '#f97316',
    [FileRole.OUTPUT]: '#22c55e',
    [FileRole.TEMPORARY]: '#6b7280',
  };
  return colors[role] || colors[FileRole.TEMPORARY];
};

/**
 * 获取关系类型颜色
 */
export const getRelationTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    depends_on: '#ef4444',
    references: '#f59e0b',
    generates: '#22c55e',
    configures: '#8b5cf6',
    merges_with: '#06b6d4',
  };
  return colors[type] || '#6b7280';
};

// ============================================================================
// 执行进度工具函数
// ============================================================================

/**
 * 获取阶段显示名称
 */
export const getStageDisplayName = (stage: ExecutionStage): string => {
  const names: Record<ExecutionStage, string> = {
    [ExecutionStage.RECONNAISSANCE]: '侦察阶段',
    [ExecutionStage.PRE_AUDIT]: '预审阶段',
    [ExecutionStage.ANALYSIS]: '分析阶段',
    [ExecutionStage.GENERATION]: '生成阶段',
  };
  return names[stage];
};

/**
 * 获取阶段图标
 */
export const getStageIcon = (stage: ExecutionStage): string => {
  const icons: Record<ExecutionStage, string> = {
    [ExecutionStage.RECONNAISSANCE]: '🔍',
    [ExecutionStage.PRE_AUDIT]: '✓',
    [ExecutionStage.ANALYSIS]: '🧠',
    [ExecutionStage.GENERATION]: '⚡',
  };
  return icons[stage];
};

/**
 * 获取状态颜色
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
    running: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  };
  return colors[status] || colors.pending;
};

/**
 * 获取日志级别颜色
 */
export const getLogLevelColor = (level: LogEntry['level']): string => {
  const colors: Record<LogEntry['level'], string> = {
    info: 'text-blue-600 dark:text-blue-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    success: 'text-green-600 dark:text-green-400',
    debug: 'text-gray-600 dark:text-gray-400',
  };
  return colors[level];
};

// ============================================================================
// 会话管理工具函数
// ============================================================================

/**
 * 生成会话名称
 */
export const generateSessionName = (files: { name: string }[]): string => {
  if (files.length === 0) {
    return '空会话';
  }

  if (files.length === 1) {
    return files[0].name;
  }

  if (files.length <= 3) {
    return files.map(f => f.name).join(' + ');
  }

  return `${files[0].name} + ${files.length - 1} 个文件`;
};

/**
 * 保存会话到本地存储
 */
export const saveSession = (session: SessionInfo): void => {
  try {
    const sessions = getSessions();
    const index = sessions.findIndex(s => s.id === session.id);

    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }

    // 限制会话数量
    const maxSessions = 50;
    const limitedSessions = sessions.slice(0, maxSessions);

    localStorage.setItem('workspace_sessions', JSON.stringify(limitedSessions));
  } catch (error) {
    logger.error('Failed to save session:', error);
  }
};

/**
 * 获取所有会话
 */
export const getSessions = (): SessionInfo[] => {
  try {
    const data = localStorage.getItem('workspace_sessions');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logger.error('Failed to get sessions:', error);
    return [];
  }
};

/**
 * 删除会话
 */
export const deleteSession = (sessionId: string): void => {
  try {
    const sessions = getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem('workspace_sessions', JSON.stringify(filtered));
  } catch (error) {
    logger.error('Failed to delete session:', error);
  }
};

/**
 * 清除所有会话
 */
export const clearAllSessions = (): void => {
  try {
    localStorage.removeItem('workspace_sessions');
  } catch (error) {
    logger.error('Failed to clear sessions:', error);
  }
};

/**
 * 清理过期会话
 */
export const cleanupExpiredSessions = (maxAge: number = 7 * 24 * 60 * 60 * 1000): void => {
  try {
    const sessions = getSessions();
    const now = Date.now();
    const valid = sessions.filter(s => now - s.timestamp < maxAge);
    localStorage.setItem('workspace_sessions', JSON.stringify(valid));
  } catch (error) {
    logger.error('Failed to cleanup sessions:', error);
  }
};
