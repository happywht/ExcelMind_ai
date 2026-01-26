/**
 * 状态管理测试
 *
 * 测试Zustand store和WebSocket同步功能
 *
 * @version 2.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useTaskStore,
  useTasks,
  useTaskStats,
  useTaskFilters,
  useTaskActions,
  useUIStore,
  useTheme,
  useNotifications,
  useUIActions
} from '../../stores';

// ============ Task Store测试 ============

describe('TaskStore', () => {
  beforeEach(() => {
    // 每个测试前重置store
    useTaskStore.getState().clearAll();
  });

  describe('任务管理', () => {
    it('应该能够添加任务', () => {
      const { result } = renderHook(() => useTaskActions());

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

      act(() => {
        result.current.addTask(task);
      });

      const storedTask = useTaskStore.getState().getTaskById('task-1');
      expect(storedTask).toEqual(task);
    });

    it('应该能够更新任务', () => {
      const { result } = renderHook(() => useTaskActions());

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

      act(() => {
        result.current.addTask(task);
      });

      act(() => {
        result.current.updateTask('task-1', {
          progress: 50,
          status: 'processing' as const
        });
      });

      const storedTask = useTaskStore.getState().getTaskById('task-1');
      expect(storedTask?.progress).toBe(50);
      expect(storedTask?.status).toBe('processing');
      expect(storedTask?.timestamps.started).toBeDefined();
    });

    it('应该能够删除任务', () => {
      const { result } = renderHook(() => useTaskActions());

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

      act(() => {
        result.current.addTask(task);
      });

      act(() => {
        result.current.removeTask('task-1');
      });

      const storedTask = useTaskStore.getState().getTaskById('task-1');
      expect(storedTask).toBeUndefined();
    });

    it('应该能够批量添加任务', () => {
      const { result } = renderHook(() => useTaskActions());

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

      act(() => {
        result.current.addTasks(tasks);
      });

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
      const { result } = renderHook(() => useTasks());
      const { setFilters } = renderHook(() => useTaskActions()).result.current;

      act(() => {
        setFilters({ status: 'processing' });
      });

      expect(result.current.length).toBe(1);
      expect(result.current[0].id).toBe('task-2');
    });

    it('应该能够搜索任务', () => {
      const { result } = renderHook(() => useTasks());
      const { setFilters } = renderHook(() => useTaskActions()).result.current;

      act(() => {
        setFilters({ search: 'task-1' });
      });

      expect(result.current.length).toBe(1);
      expect(result.current[0].id).toBe('task-1');
    });

    it('应该能够按创建时间排序任务', () => {
      const { result } = renderHook(() => useTasks());
      const { setFilters } = renderHook(() => useTaskActions()).result.current;

      act(() => {
        setFilters({ sortBy: 'created', sortOrder: 'asc' });
      });

      expect(result.current[0].id).toBe('task-1');
      expect(result.current[2].id).toBe('task-3');
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

      const { result } = renderHook(() => useTaskStats());

      expect(result.current.total).toBe(4);
      expect(result.current.pending).toBe(1);
      expect(result.current.processing).toBe(1);
      expect(result.current.completed).toBe(1);
      expect(result.current.failed).toBe(1);
    });
  });

  describe('批量操作', () => {
    it('应该能够选择和取消选择任务', () => {
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
        }
      ]);

      const { result } = renderHook(() => useTaskActions());

      act(() => {
        result.current.toggleTaskSelection('task-1');
      });

      expect(useTaskStore.getState().selectedTaskIds.has('task-1')).toBe(true);

      act(() => {
        result.current.toggleTaskSelection('task-1');
      });

      expect(useTaskStore.getState().selectedTaskIds.has('task-1')).toBe(false);
    });

    it('应该能够全选任务', () => {
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
        }
      ]);

      const { result } = renderHook(() => useTaskActions());

      act(() => {
        result.current.selectAllTasks();
      });

      expect(useTaskStore.getState().selectedTaskIds.size).toBe(2);
    });

    it('应该能够批量删除选中的任务', () => {
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
        }
      ]);

      const { result } = renderHook(() => useTaskActions());

      act(() => {
        result.current.selectAllTasks();
      });

      act(() => {
        result.current.deleteSelected();
      });

      expect(useTaskStore.getState().tasks.size).toBe(0);
    });
  });

  describe('WebSocket同步', () => {
    it('应该能够同步任务创建事件', () => {
      const { result } = renderHook(() => useTaskActions());

      act(() => {
        result.current.syncFromWebSocket({
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

      act(() => {
        syncFromWebSocket({
          type: 'task:updated',
          taskId: 'task-1',
          updates: {
            progress: 50,
            status: 'processing'
          }
        });
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

      act(() => {
        syncFromWebSocket({
          type: 'task:deleted',
          taskId: 'task-1'
        });
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

      act(() => {
        syncFromWebSocket({
          type: 'task:progress',
          taskId: 'task-1',
          updates: {
            progress: 75
          }
        });
      });

      const task = useTaskStore.getState().getTaskById('task-1');
      expect(task?.progress).toBe(75);
    });
  });
});

// ============ UI Store测试 ============

describe('UIStore', () => {
  describe('主题管理', () => {
    it('应该能够设置主题', () => {
      const { result } = renderHook(() => useUIActions());

      act(() => {
        result.current.setTheme('dark');
      });

      const theme = useUIStore.getState().theme;
      expect(theme).toBe('dark');
    });

    it('应该能够切换主题', () => {
      const { result } = renderHook(() => useUIActions());

      const initialTheme = useUIStore.getState().theme;

      act(() => {
        result.current.toggleTheme();
      });

      const newTheme = useUIStore.getState().theme;
      expect(newTheme).not.toBe(initialTheme);
    });
  });

  describe('通知管理', () => {
    it('应该能够添加通知', () => {
      const { result } = renderHook(() => useUIActions());

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: '测试通知',
          message: '这是一条测试通知'
        });
      });

      const notifications = useUIStore.getState().notifications;
      expect(notifications.length).toBe(1);
      expect(notifications[0].title).toBe('测试通知');
    });

    it('应该能够显示成功通知', () => {
      const { result } = renderHook(() => useUIActions());

      act(() => {
        result.current.showSuccess('成功', '操作成功');
      });

      const notifications = useUIStore.getState().notifications;
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('success');
    });

    it('应该能够显示错误通知', () => {
      const { result } = renderHook(() => useUIActions());

      act(() => {
        result.current.showError('错误', '操作失败');
      });

      const notifications = useUIStore.getState().notifications;
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('error');
    });

    it('应该能够移除通知', () => {
      const { result } = renderHook(() => useUIActions());

      let notificationId: string;

      act(() => {
        notificationId = result.current.addNotification({
          type: 'success',
          title: '测试通知',
          message: '这是一条测试通知'
        });
      });

      act(() => {
        result.current.removeNotification(notificationId);
      });

      const notifications = useUIStore.getState().notifications;
      expect(notifications.length).toBe(0);
    });

    it('应该能够清除所有通知', () => {
      const { result } = renderHook(() => useUIActions());

      act(() => {
        result.current.showSuccess('成功1', '消息1');
        result.current.showError('错误1', '消息2');
      });

      expect(useUIStore.getState().notifications.length).toBe(2);

      act(() => {
        result.current.clearNotifications();
      });

      expect(useUIStore.getState().notifications.length).toBe(0);
    });
  });

  describe('模态框管理', () => {
    it('应该能够打开模态框', () => {
      const { result } = renderHook(() => useUIActions());

      act(() => {
        result.current.openModal('test-modal');
      });

      const isOpen = useUIStore.getState().isModalOpen('test-modal');
      expect(isOpen).toBe(true);
    });

    it('应该能够关闭模态框', () => {
      const { result } = renderHook(() => useUIActions());

      act(() => {
        result.current.openModal('test-modal');
      });

      expect(useUIStore.getState().isModalOpen('test-modal')).toBe(true);

      act(() => {
        result.current.closeModal('test-modal');
      });

      expect(useUIStore.getState().isModalOpen('test-modal')).toBe(false);
    });

    it('应该能够关闭所有模态框', () => {
      const { result } = renderHook(() => useUIActions());

      act(() => {
        result.current.openModal('modal-1');
        result.current.openModal('modal-2');
        result.current.openModal('modal-3');
      });

      expect(useUIStore.getState().activeModals.size).toBe(3);

      act(() => {
        result.current.closeAllModals();
      });

      expect(useUIStore.getState().activeModals.size).toBe(0);
    });
  });

  describe('加载状态管理', () => {
    it('应该能够设置加载状态', () => {
      const { result } = renderHook(() => useUIActions());

      act(() => {
        result.current.setLoading('test-key', true);
      });

      expect(useUIStore.getState().isLoading('test-key')).toBe(true);

      act(() => {
        result.current.setLoading('test-key', false);
      });

      expect(useUIStore.getState().isLoading('test-key')).toBe(false);
    });

    it('应该能够清除所有加载状态', () => {
      const { result } = renderHook(() => useUIActions());

      act(() => {
        result.current.setLoading('key-1', true);
        result.current.setLoading('key-2', true);
        result.current.setLoading('key-3', true);
      });

      expect(useUIStore.getState().loadingStates.size).toBe(3);

      act(() => {
        result.current.clearLoadingStates();
      });

      expect(useUIStore.getState().loadingStates.size).toBe(0);
    });
  });

  describe('面板管理', () => {
    it('应该能够切换面板状态', () => {
      const { result } = renderHook(() => useUIActions());

      const initialState = useUIStore.getState().panels.dataQuality;

      act(() => {
        result.current.togglePanel('dataQuality');
      });

      const newState = useUIStore.getState().panels.dataQuality;
      expect(newState).not.toBe(initialState);
    });

    it('应该能够设置面板状态', () => {
      const { result } = renderHook(() => useUIActions());

      act(() => {
        result.current.setPanelOpen('batchProgress', true);
      });

      expect(useUIStore.getState().panels.batchProgress).toBe(true);

      act(() => {
        result.current.setPanelOpen('batchProgress', false);
      });

      expect(useUIStore.getState().panels.batchProgress).toBe(false);
    });
  });
});
