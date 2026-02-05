/**
 * Stores统一导出
 *
 * 导出所有Zustand store和React Query配置
 *
 * @module stores
 * @version 2.0.0
 */

// ============ Task Store ============

export * from './taskStore';

// ============ UI Store ============

export * from './uiStore';

// ============ React Query ============

export {
  createQueryClient,
  QueryProvider,
  queryKeys
} from './queryClient.tsx';

// ============ 便捷导出 ============

// Task Store相关
export {
  useTaskStore,
  useTasks,
  useActiveTask,
  useTaskStats,
  useTaskFilters,
  useSelectedTaskIds,
  useTaskActions
} from './taskStore';

// UI Store相关
export {
  useUIStore,
  useTheme,
  usePrimaryColor,
  useSidebarCollapsed,
  useNotifications,
  useActiveModals,
  usePanels,
  useUIActions
} from './uiStore';
