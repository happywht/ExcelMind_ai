/**
 * Task状态管理 - Zustand Store
 *
 * 管理批量生成任务的状态，包括任务列表、过滤、选择和WebSocket同步
 *
 * @version 2.0.0
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============ 类型定义 ============

export type TaskStatusType = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface Task {
  id: string;
  status: TaskStatusType;
  progress: number;
  summary: {
    templateIds: string[];
    totalDocuments: number;
    completedDocuments: number;
    failedDocuments: number;
    dataSourceId?: string;
    outputFormat?: string;
  };
  error?: any;
  timestamps: {
    created: number;
    started?: number;
    completed?: number;
  };
  downloadUrl?: string;
}

export interface TaskFilters {
  status: 'all' | TaskStatusType;
  search: string;
  sortBy: 'created' | 'progress' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface TaskStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  paused: number;
}

export interface TaskEvent {
  type: 'task:created' | 'task:updated' | 'task:deleted' | 'task:progress';
  taskId: string;
  task?: Task;
  updates?: Partial<Task>;
}

export interface TaskState {
  // 状态数据
  tasks: Map<string, Task>;
  activeTaskId: string | null;
  filters: TaskFilters;
  selectedTaskIds: Set<string>;
  lastSyncTime: number | null;

  // 操作 - 任务管理
  setActiveTask: (id: string | null) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  addTask: (task: Task) => void;
  addTasks: (tasks: Task[]) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;

  // 操作 - 批量选择
  toggleTaskSelection: (id: string) => void;
  selectAllTasks: () => void;
  clearSelection: () => void;
  deleteSelected: () => void;

  // 操作 - 过滤和排序
  setFilters: (filters: Partial<TaskFilters>) => void;
  resetFilters: () => void;

  // 操作 - WebSocket同步
  syncFromWebSocket: (event: TaskEvent) => void;
  syncTasks: (tasks: Task[]) => void;
  updateSyncTime: () => void;

  // 计算属性
  getFilteredTasks: () => Task[];
  getActiveTask: () => Task | null;
  getTaskStats: () => TaskStats;
  getTaskById: (id: string) => Task | undefined;
}

// ============ 辅助函数 ============

// 序列化Map为对象（用于持久化）
const mapToObj = (map: Map<string, Task>): Record<string, Task> => {
  const obj: Record<string, Task> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
};

// 对象反序列化为Map
const objToMap = (obj: Record<string, Task>): Map<string, Task> => {
  return new Map(Object.entries(obj));
};

// 序列化Set为数组（用于持久化）
const setToArr = (set: Set<string>): string[] => Array.from(set);

// 数组反序列化为Set
const arrToSet = (arr: string[]): Set<string> => new Set(arr);

// ============ Store创建 ============

export const useTaskStore = create<TaskState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        tasks: new Map(),
        activeTaskId: null,
        filters: {
          status: 'all',
          search: '',
          sortBy: 'created',
          sortOrder: 'desc'
        },
        selectedTaskIds: new Set(),
        lastSyncTime: null,

        // ============ 操作 - 任务管理 ============

        setActiveTask: (id) => set({ activeTaskId: id }, false, 'setActiveTask'),

        updateTask: (id, updates) => set((state) => {
          const tasks = new Map(state.tasks);
          const existing = tasks.get(id);

          if (existing) {
            tasks.set(id, {
              ...existing,
              ...updates,
              // 自动更新时间戳
              timestamps: {
                ...existing.timestamps,
                ...(updates.status === 'completed' && !existing.timestamps.completed && {
                  completed: Date.now()
                }),
                ...(updates.status === 'processing' && !existing.timestamps.started && {
                  started: Date.now()
                })
              }
            });
          }

          return { tasks };
        }, false, 'updateTask'),

        addTask: (task) => set((state) => {
          const tasks = new Map(state.tasks);
          tasks.set(task.id, task);
          return { tasks };
        }, false, 'addTask'),

        addTasks: (tasks) => set((state) => {
          const tasksMap = new Map(state.tasks);
          tasks.forEach(task => {
            tasksMap.set(task.id, task);
          });
          return { tasks: tasksMap };
        }, false, 'addTasks'),

        removeTask: (id) => set((state) => {
          const tasks = new Map(state.tasks);
          tasks.delete(id);

          // 如果删除的是当前激活任务，清除激活状态
          const activeTaskId = state.activeTaskId === id ? null : state.activeTaskId;

          // 从选择中移除
          const selectedTaskIds = new Set(state.selectedTaskIds);
          selectedTaskIds.delete(id);

          return { tasks, activeTaskId, selectedTaskIds };
        }, false, 'removeTask'),

        clearCompleted: () => set((state) => {
          const tasks = new Map(state.tasks);

          for (const [id, task] of tasks.entries()) {
            if (task.status === 'completed') {
              tasks.delete(id);
            }
          }

          return { tasks };
        }, false, 'clearCompleted'),

        clearAll: () => set({
          tasks: new Map(),
          activeTaskId: null,
          selectedTaskIds: new Set(),
          lastSyncTime: null
        }, false, 'clearAll'),

        // ============ 操作 - 批量选择 ============

        toggleTaskSelection: (id) => set((state) => {
          const selectedTaskIds = new Set(state.selectedTaskIds);

          if (selectedTaskIds.has(id)) {
            selectedTaskIds.delete(id);
          } else {
            selectedTaskIds.add(id);
          }

          return { selectedTaskIds };
        }, false, 'toggleTaskSelection'),

        selectAllTasks: () => set((state) => {
          const filteredTasks = get().getFilteredTasks();
          const selectedTaskIds = new Set(filteredTasks.map(t => t.id));
          return { selectedTaskIds };
        }, false, 'selectAllTasks'),

        clearSelection: () => set({ selectedTaskIds: new Set() }, false, 'clearSelection'),

        deleteSelected: () => set((state) => {
          const tasks = new Map(state.tasks);

          state.selectedTaskIds.forEach(id => tasks.delete(id));

          return {
            tasks,
            selectedTaskIds: new Set()
          };
        }, false, 'deleteSelected'),

        // ============ 操作 - 过滤和排序 ============

        setFilters: (newFilters) => set((state) => ({
          filters: { ...state.filters, ...newFilters }
        }), false, 'setFilters'),

        resetFilters: () => set({
          filters: {
            status: 'all',
            search: '',
            sortBy: 'created',
            sortOrder: 'desc'
          }
        }, false, 'resetFilters'),

        // ============ 操作 - WebSocket同步 ============

        syncFromWebSocket: (event) => set((state) => {
          const tasks = new Map(state.tasks);

          switch (event.type) {
            case 'task:created':
              if (event.task) {
                tasks.set(event.task.id, event.task);
              }
              break;

            case 'task:updated':
              if (event.taskId && event.updates) {
                const existing = tasks.get(event.taskId);
                if (existing) {
                  tasks.set(event.taskId, { ...existing, ...event.updates });
                }
              }
              break;

            case 'task:deleted':
              if (event.taskId) {
                tasks.delete(event.taskId);
              }
              break;

            case 'task:progress':
              if (event.taskId && event.updates) {
                const existing = tasks.get(event.taskId);
                if (existing) {
                  tasks.set(event.taskId, { ...existing, ...event.updates });
                }
              }
              break;
          }

          return {
            tasks,
            lastSyncTime: Date.now()
          };
        }, false, 'syncFromWebSocket'),

        syncTasks: (tasks) => set((state) => {
          const tasksMap = new Map(state.tasks);
          tasks.forEach(task => {
            tasksMap.set(task.id, task);
          });
          return {
            tasks: tasksMap,
            lastSyncTime: Date.now()
          };
        }, false, 'syncTasks'),

        updateSyncTime: () => set({ lastSyncTime: Date.now() }, false, 'updateSyncTime'),

        // ============ 计算属性 ============

        getFilteredTasks: () => {
          const state = get();
          let tasks = Array.from(state.tasks.values());

          // 状态过滤
          if (state.filters.status !== 'all') {
            tasks = tasks.filter(t => t.status === state.filters.status);
          }

          // 搜索过滤
          if (state.filters.search) {
            const search = state.filters.search.toLowerCase();
            tasks = tasks.filter(t =>
              t.id.toLowerCase().includes(search) ||
              JSON.stringify(t.summary).toLowerCase().includes(search)
            );
          }

          // 排序
          tasks.sort((a, b) => {
            let aVal: any, bVal: any;

            switch (state.filters.sortBy) {
              case 'progress':
                aVal = a.progress;
                bVal = b.progress;
                break;
              case 'status':
                const statusOrder = ['pending', 'paused', 'processing', 'failed', 'completed', 'cancelled'];
                aVal = statusOrder.indexOf(a.status);
                bVal = statusOrder.indexOf(b.status);
                break;
              case 'created':
              default:
                aVal = a.timestamps.created;
                bVal = b.timestamps.created;
                break;
            }

            if (state.filters.sortOrder === 'asc') {
              return aVal > bVal ? 1 : -1;
            } else {
              return aVal < bVal ? 1 : -1;
            }
          });

          return tasks;
        },

        getActiveTask: () => {
          const state = get();
          return state.activeTaskId ? state.tasks.get(state.activeTaskId) || null : null;
        },

        getTaskStats: () => {
          const state = get();
          const tasks = Array.from(state.tasks.values());

          return {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'pending').length,
            processing: tasks.filter(t => t.status === 'processing').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            failed: tasks.filter(t => t.status === 'failed').length,
            cancelled: tasks.filter(t => t.status === 'cancelled').length,
            paused: tasks.filter(t => t.status === 'paused').length
          };
        },

        getTaskById: (id) => {
          return get().tasks.get(id);
        }
      }),
      {
        name: 'task-storage',
        partialize: (state) => ({
          tasks: mapToObj(state.tasks),
          activeTaskId: state.activeTaskId,
          filters: state.filters,
          selectedTaskIds: setToArr(state.selectedTaskIds),
          lastSyncTime: state.lastSyncTime
        }),
        merge: (persistedState: any, currentState) => ({
          ...currentState,
          tasks: objToMap(persistedState.tasks || {}),
          selectedTaskIds: arrToSet(persistedState.selectedTaskIds || [])
        })
      }
    ),
    { name: 'TaskStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// ============ 便捷Hooks ============

/**
 * 获取过滤后的任务列表
 */
export const useTasks = () => useTaskStore(state => state.getFilteredTasks());

/**
 * 获取当前激活的任务
 */
export const useActiveTask = () => useTaskStore(state => state.getActiveTask());

/**
 * 获取任务统计信息
 */
export const useTaskStats = () => useTaskStore(state => state.getTaskStats());

/**
 * 获取任务过滤器
 */
export const useTaskFilters = () => useTaskStore(state => state.filters);

/**
 * 获取选中的任务ID列表
 */
export const useSelectedTaskIds = () => useTaskStore(state => Array.from(state.selectedTaskIds));

/**
 * 获取任务操作方法
 */
export const useTaskActions = () => useTaskStore(state => ({
  setActiveTask: state.setActiveTask,
  updateTask: state.updateTask,
  addTask: state.addTask,
  addTasks: state.addTasks,
  removeTask: state.removeTask,
  clearCompleted: state.clearCompleted,
  clearAll: state.clearAll,
  toggleTaskSelection: state.toggleTaskSelection,
  selectAllTasks: state.selectAllTasks,
  clearSelection: state.clearSelection,
  deleteSelected: state.deleteSelected,
  setFilters: state.setFilters,
  resetFilters: state.resetFilters,
  syncFromWebSocket: state.syncFromWebSocket,
  syncTasks: state.syncTasks
}));
