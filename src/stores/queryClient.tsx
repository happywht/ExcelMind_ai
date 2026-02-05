/**
 * React Query配置
 *
 * 提供服务端状态管理和缓存
 *
 * @module stores/queryClient
 * @version 2.0.0
 */

import { logger } from '@/utils/logger';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

// ============ QueryClient配置 ============

/**
 * 创建QueryClient实例
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 数据保持新鲜时间（5分钟）
        staleTime: 5 * 60 * 1000,

        // 缓存时间（10分钟）
        gcTime: 10 * 60 * 1000,

        // 重试次数
        retry: 3,

        // 重试延迟（指数退避）
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // 窗口焦点时自动重新获取
        refetchOnWindowFocus: true,

        // 组件挂载时自动重新获取
        refetchOnMount: true,

        // 网络重连时自动重新获取
        refetchOnReconnect: true,

        // 查询错误时抛出异常
        throwOnError: false,
      },
      mutations: {
        // 重试次数
        retry: 1,

        // 突变错误时抛出异常
        throwOnError: false,

        // 突变成功后自动重新获取相关查询
        onSettled: async (data, error, variables, context) => {
          // 这里可以添加全局的突变后逻辑
          if (error) {
            logger.error('[Mutation] Error:', error);
          }
        },
      },
    },
  });
}

// ============ Provider组件 ============

/**
 * QueryProvider组件
 *
 * 包装应用以提供React Query功能
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

// ============ Query Keys工厂 ============

/**
 * Query Keys工厂
 * 统一管理所有查询键
 */
export const queryKeys = {
  // 任务相关
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
    progress: (id: string) => [...queryKeys.tasks.detail(id), 'progress'] as const,
    stats: () => [...queryKeys.tasks.all, 'stats'] as const,
  },

  // 模板相关
  templates: {
    all: ['templates'] as const,
    lists: () => [...queryKeys.templates.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.templates.lists(), filters] as const,
    details: () => [...queryKeys.templates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.templates.details(), id] as const,
  },

  // 数据源相关
  dataSources: {
    all: ['dataSources'] as const,
    lists: () => [...queryKeys.dataSources.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.dataSources.lists(), filters] as const,
    details: () => [...queryKeys.dataSources.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.dataSources.details(), id] as const,
  },

  // 批量生成相关
  batchGeneration: {
    all: ['batchGeneration'] as const,
    tasks: () => [...queryKeys.batchGeneration.all, 'tasks'] as const,
    task: (id: string) => [...queryKeys.batchGeneration.tasks(), id] as const,
    progress: (id: string) => [...queryKeys.batchGeneration.task(id), 'progress'] as const,
    history: (filters: any) => [...queryKeys.batchGeneration.all, 'history', filters] as const,
  },

  // 数据质量相关
  dataQuality: {
    all: ['dataQuality'] as const,
    issues: () => [...queryKeys.dataQuality.all, 'issues'] as const,
    issue: (id: string) => [...queryKeys.dataQuality.issues(), id] as const,
    stats: () => [...queryKeys.dataQuality.all, 'stats'] as const,
    recommendations: () => [...queryKeys.dataQuality.all, 'recommendations'] as const,
  },

  // 文档空间相关
  documentSpace: {
    all: ['documentSpace'] as const,
    documents: () => [...queryKeys.documentSpace.all, 'documents'] as const,
    document: (id: string) => [...queryKeys.documentSpace.documents(), id] as const,
    templates: () => [...queryKeys.documentSpace.all, 'templates'] as const,
    template: (id: string) => [...queryKeys.documentSpace.templates(), id] as const,
    mappings: (templateId: string) => [...queryKeys.documentSpace.all, 'mappings', templateId] as const,
  },
};

// ============ 默认导出 ============

export default createQueryClient;
