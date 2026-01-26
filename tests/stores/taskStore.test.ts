/**
 * Task Store单元测试
 *
 * 验证Zustand store的核心功能
 *
 * @version 2.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useTaskStore,
  useTasks,
  useTaskStats,
  useTaskActions
} from '../../stores';

describe('TaskStore', () => {
  beforeEach(() => {
    // 每个测试前重置store
    useTaskStore.getState().clearAll();
  });

  describe('任务管理', () => {
    it('应该能够添加任务', () => {
      const actions = useTaskActions.getState();

      const task = {
        id: 'task-1',
        status: 'pending' as const,
        progress: 0,
        summary: {
          templateIds: ['template-1'],
          totalDocuments: 10,
          completedDocuments: 0,
          failedDocuments: 0
        },
        timestamps: {
          created: Date.now()
        }
      };

      actions.addTask(task);

      const storedTask = useTaskStore.getState().getTaskById('task-1');
      expect(storedTask).toEqual(task);
    });

    it('应该能够更新任务', () => {
      const actions = useTaskActions.getState();

      const task = {
        id: 'task-1',
        status: 'pending' as const,
        progress: 0,
        summary: {
          templateIds: ['template-1'],
          totalDocuments: 10,
          completedDocuments: 0,
          failedDocuments: 0
        },
        timestamps: {
          created: Date.now()
        }
      };

      actions.addTask(task);
      actions.updateTask('task-1', {
        progress: 50,
        status: 'processing' as const
      });

      const storedTask = useTaskStore.getState().getTaskById('task-1');
      expect(storedTask?.progress).toBe(50);
      expect(storedTask?.status).toBe('processing');
      expect(storedTask?.timestamps.started).toBeDefined();
    });

    it('应该能够删除任务', () => {
      const actions = useTaskActions.getState();

      const task = {
        id: 'task-1',
        status: 'pending' as const,
        progress: 0,
        summary: {
          templateIds: ['template-1'],
          totalDocuments: 10,
          completedDocuments: 0,
          failedDocuments: 0
        },
        timestamps: {
          created: Date.now()
        }
      };

      actions.addTask(task);
      actions.removeTask('task-1');

      const storedTask = useTaskStore.getState().getTaskById('task-1');
      expect(storedTask).toBeUndefined();
    });

    it('应该能够批量添加任务', () => {
      const actions = useTaskActions.getState();

      const tasks = [
        {
          id: 'task-1',
          status: 'pending' as const,
          progress: 0,
          summary: {
            templateIds: ['template-1'],
            totalDocuments: 10,
            completedDocuments: 0,
            failedDocuments: 0
          },
          timestamps: {
            created: Date.now()
          }
        },
        {
          id: 'task-2',
          status: 'processing' as const,
          progress: 50,
          summary: {
            templateIds: ['template-2'],
            totalDocuments: 20,
            completedDocuments: 10,
            failedDocuments: 0
          },
          timestamps: {
            created: Date.now()
          }
        }
      ];

      actions.addTasks(tasks);

      const allTasks = useTaskStore.getState().tasks;
      expect(allTasks.size).toBe(2);
    });
  });

  describe('任务过滤和排序', () => {
    beforeEach(() => {
      const { addTasks } = useTaskStore.getState();

      addTasks([
        {
          id: 'task-1',
          status: 'pending',
          progress: 0,
          summary: {
            templateIds: ['template-1'],
            totalDocuments: 10,
            completedDocuments: 0,
            failedDocuments: 0
          },
          timestamps: {
            created: 1000
          }
        },
        {
          id: 'task-2',
          status: 'processing',
          progress: 50,
          summary: {
            templateIds: ['template-2'],
            totalDocuments: 20,
            completedDocuments: 10,
            failedDocuments: 0
          },
          timestamps: {
            created: 2000
          }
        },
        {
          id: 'task-3',
          status: 'completed',
          progress: 100,
          summary: {
            templateIds: ['template-3'],
            totalDocuments: 30,
            completedDocuments: 30,
            failedDocuments: 0
          },
          timestamps: {
            created: 3000
          }
        }
      ]);
    });

    it('应该能够按状态过滤任务', () => {
      const { setFilters } = useTaskActions.getState();
      setFilters({ status: 'processing' });

      const filteredTasks = useTaskStore.getState().getFilteredTasks();
      expect(filteredTasks.length).toBe(1);
      expect(filteredTasks[0].id).toBe('task-2');
    });

    it('应该能够搜索任务', () => {
      const { setFilters } = useTaskActions.getState();
      setFilters({ search: 'task-1' });

      const filteredTasks = useTaskStore.getState().getFilteredTasks();
      expect(filteredTasks.length).toBe(1);
      expect(filteredTasks[0].id).toBe('task-1');
    });

    it('应该能够按创建时间排序任务', () => {
      const { setFilters } = useTaskActions.getState();
      setFilters({ sortBy: 'created', sortOrder: 'asc' });

      const filteredTasks = useTaskStore.getState().getFilteredTasks();
      expect(filteredTasks[0].id).toBe('task-1');
      expect(filteredTasks[2].id).toBe('task-3');
    });
  });

  describe('任务统计', () => {
    it('应该能够计算任务统计', () => {
      const { addTasks } = useTaskStore.getState();

      addTasks([
        {
          id: 'task-1',
          status: 'pending',
          progress: 0,
          summary: {
            templateIds: ['template-1'],
            totalDocuments: 10,
            completedDocuments: 0,
            failedDocuments: 0
          },
          timestamps: {
            created: Date.now()
          }
        },
        {
          id: 'task-2',
          status: 'processing',
          progress: 50,
          summary: {
            templateIds: ['template-2'],
            totalDocuments: 20,
            completedDocuments: 10,
            failedDocuments: 0
          },
          timestamps: {
            created: Date.now()
          }
        },
        {
          id: 'task-3',
          status: 'completed',
          progress: 100,
          summary: {
            templateIds: ['template-3'],
            totalDocuments: 30,
            completedDocuments: 30,
            failedDocuments: 0
          },
          timestamps: {
            created: Date.now()
          }
        },
        {
          id: 'task-4',
          status: 'failed',
          progress: 25,
          summary: {
            templateIds: ['template-4'],
            totalDocuments: 40,
            completedDocuments: 10,
            failedDocuments: 5
          },
          timestamps: {
            created: Date.now()
          }
        }
      ]);

      const stats = useTaskStore.getState().getTaskStats();

      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(1);
      expect(stats.processing).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  describe('批量操作', () => {
    it('应该能够选择和取消选择任务', () => {
      const { addTasks, toggleTaskSelection } = useTaskStore.getState();

      addTasks([
        {
          id: 'task-1',
          status: 'pending',
          progress: 0,
          summary: {
            templateIds: ['template-1'],
            totalDocuments: 10,
            completedDocuments: 0,
            failedDocuments: 0
          },
          timestamps: {
            created: Date.now()
          }
        },
        {
          id: 'task-2',
          status: 'processing',
          progress: 50,
          summary: {
            templateIds: ['template-2'],
            totalDocuments: 20,
            completedDocuments: 10,
            failedDocuments: 0
          },
          timestamps: {
            created: Date.now()
          }
        }
      ]);

      toggleTaskSelection('task-1');

      expect(useTaskStore.getState().selectedTaskIds.has('task-1')).toBe(true);

      toggleTaskSelection('task-1');

      expect(useTaskStore.getState().selectedTaskIds.has('task-1')).toBe(false);
    });

    it('应该能够全选任务', () => {
      const { addTasks, selectAllTasks } = useTaskStore.getState();

      addTasks([
        {
          id: 'task-1',
          status: 'pending',
          progress: 0,
          summary: {
            templateIds: ['template-1'],
            totalDocuments: 10,
            completedDocuments: 0,
            failedDocuments: 0
          },
          timestamps: {
            created: Date.now()
          }
        },
        {
          id: 'task-2',
          status: 'processing',
          progress: 50,
          summary: {
            templateIds: ['template-2'],
            totalDocuments: 20,
            completedDocuments: 10,
            failedDocuments: 0
          },
          timestamps: {
            created: Date.now()
          }
        }
      ]);

      selectAllTasks();

      expect(useTaskStore.getState().selectedTaskIds.size).toBe(2);
    });

    it('应该能够批量删除选中的任务', () => {
      const { addTasks, selectAllTasks, deleteSelected } = useTaskStore.getState();

      addTasks([
        {
          id: 'task-1',
          status: 'pending',
          progress: 0,
          summary: {
            templateIds: ['template-1'],
            totalDocuments: 10,
            completedDocuments: 0,
            failedDocuments: 0
          },
          timestamps: {
            created: Date.now()
          }
        },
        {
          id: 'task-2',
          status: 'processing',
          progress: 50,
          summary: {
            templateIds: ['template-2'],
            totalDocuments: 20,
            completedDocuments: 10,
            failedDocuments: 0
          },
          timestamps: {
            created: Date.now()
          }
        }
      ]);

      selectAllTasks();
      deleteSelected();

      expect(useTaskStore.getState().tasks.size).toBe(0);
    });
  });

  describe('WebSocket同步', () => {
    it('应该能够同步任务创建事件', () => {
      const { syncFromWebSocket } = useTaskActions.getState();

      syncFromWebSocket({
        type: 'task:created',
        taskId: 'task-1',
        task: {
          id: 'task-1',
          status: 'pending',
          progress: 0,
          summary: {
            templateIds: ['template-1'],
            totalDocuments: 10,
            completedDocuments: 0,
            failedDocuments: 0
          },
          timestamps: {
            created: Date.now()
          }
        }
      });

      const task = useTaskStore.getState().getTaskById('task-1');
      expect(task).toBeDefined();
      expect(task?.id).toBe('task-1');
    });

    it('应该能够同步任务更新事件', () => {
      const { addTask, syncFromWebSocket } = useTaskStore.getState();

      addTask({
        id: 'task-1',
        status: 'pending',
        progress: 0,
        summary: {
          templateIds: ['template-1'],
          totalDocuments: 10,
          completedDocuments: 0,
          failedDocuments: 0
        },
        timestamps: {
          created: Date.now()
        }
      });

      syncFromWebSocket({
        type: 'task:updated',
        taskId: 'task-1',
        updates: {
          progress: 50,
          status: 'processing'
        }
      });

      const task = useTaskStore.getState().getTaskById('task-1');
      expect(task?.progress).toBe(50);
      expect(task?.status).toBe('processing');
    });

    it('应该能够同步任务删除事件', () => {
      const { addTask, syncFromWebSocket } = useTaskStore.getState();

      addTask({
        id: 'task-1',
        status: 'pending',
        progress: 0,
        summary: {
          templateIds: ['template-1'],
          totalDocuments: 10,
          completedDocuments: 0,
          failedDocuments: 0
        },
        timestamps: {
          created: Date.now()
        }
      });

      syncFromWebSocket({
        type: 'task:deleted',
        taskId: 'task-1'
      });

      const task = useTaskStore.getState().getTaskById('task-1');
      expect(task).toBeUndefined();
    });

    it('应该能够同步任务进度事件', () => {
      const { addTask, syncFromWebSocket } = useTaskStore.getState();

      addTask({
        id: 'task-1',
        status: 'processing',
        progress: 0,
        summary: {
          templateIds: ['template-1'],
          totalDocuments: 10,
          completedDocuments: 0,
          failedDocuments: 0
        },
        timestamps: {
          created: Date.now()
        }
      });

      syncFromWebSocket({
        type: 'task:progress',
        taskId: 'task-1',
        updates: {
          progress: 75
        }
      });

      const task = useTaskStore.getState().getTaskById('task-1');
      expect(task?.progress).toBe(75);
    });
  });
});
