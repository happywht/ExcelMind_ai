/**
 * 状态管理功能演示脚本
 *
 * 演示Zustand store的核心功能
 *
 * @version 2.0.0
 */

import {
  useTaskStore,
  useTaskActions,
  useUIStore,
  useUIActions
} from '../stores';

/**
 * 演示Task Store功能
 */
function demoTaskStore() {
  console.log('=== Task Store 演示 ===\n');

  const actions = useTaskActions.getState();

  // 1. 添加任务
  console.log('1. 添加任务...');
  actions.addTasks([
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
    }
  ]);
  console.log(`✓ 已添加3个任务\n`);

  // 2. 获取任务列表
  console.log('2. 获取所有任务...');
  const allTasks = useTaskStore.getState().getFilteredTasks();
  console.log(`✓ 共有${allTasks.length}个任务`);
  allTasks.forEach(task => {
    console.log(`  - ${task.id}: ${task.status} (${task.progress}%)`);
  });
  console.log('');

  // 3. 过滤任务
  console.log('3. 按状态过滤任务...');
  actions.setFilters({ status: 'processing' });
  const filteredTasks = useTaskStore.getState().getFilteredTasks();
  console.log(`✓ 处理中的任务: ${filteredTasks.length}个`);
  filteredTasks.forEach(task => {
    console.log(`  - ${task.id}: ${task.status}`);
  });
  console.log('');

  // 4. 任务统计
  console.log('4. 任务统计...');
  const stats = useTaskStore.getState().getTaskStats();
  console.log('✓ 统计信息:');
  console.log(`  - 总计: ${stats.total}`);
  console.log(`  - 等待中: ${stats.pending}`);
  console.log(`  - 处理中: ${stats.processing}`);
  console.log(`  - 已完成: ${stats.completed}`);
  console.log(`  - 失败: ${stats.failed}`);
  console.log('');

  // 5. 更新任务
  console.log('5. 更新任务进度...');
  actions.updateTask('task-1', {
    progress: 25,
    status: 'processing'
  });
  const updatedTask = useTaskStore.getState().getTaskById('task-1');
  console.log(`✓ 任务 ${updatedTask?.id} 进度更新为 ${updatedTask?.progress}%`);
  console.log('');

  // 6. WebSocket同步
  console.log('6. WebSocket同步模拟...');
  actions.syncFromWebSocket({
    type: 'task:progress',
    taskId: 'task-2',
    updates: {
      progress: 75
    }
  });
  const syncedTask = useTaskStore.getState().getTaskById('task-2');
  console.log(`✓ 任务 ${syncedTask?.id} 通过WebSocket同步进度为 ${syncedTask?.progress}%`);
  console.log('');

  // 7. 批量操作
  console.log('7. 批量选择和删除...');
  actions.selectAllTasks();
  const selectedCount = useTaskStore.getState().selectedTaskIds.size;
  console.log(`✓ 已选中${selectedCount}个任务`);

  actions.clearSelection();
  console.log(`✓ 已清除选择`);
  console.log('');

  // 8. 清理
  actions.clearAll();
  console.log('✓ 已清理所有任务\n');
}

/**
 * 演示UI Store功能
 */
function demoUIStore() {
  console.log('=== UI Store 演示 ===\n');

  const actions = useUIActions.getState();

  // 1. 主题设置
  console.log('1. 主题设置...');
  console.log(`当前主题: ${useUIStore.getState().theme}`);
  actions.setTheme('dark');
  console.log(`✓ 已切换为dark主题`);
  console.log('');

  // 2. 通知管理
  console.log('2. 通知管理...');
  actions.showSuccess('成功', '操作成功完成！');
  actions.showError('错误', '操作失败，请重试。');
  actions.showWarning('警告', '请注意检查输入。');
  actions.showInfo('信息', '这是一条提示信息。');

  const notifications = useUIStore.getState().notifications;
  console.log(`✓ 已添加${notifications.length}条通知:`);
  notifications.forEach(notif => {
    console.log(`  - [${notif.type}] ${notif.title}: ${notif.message}`);
  });
  console.log('');

  // 3. 模态框管理
  console.log('3. 模态框管理...');
  actions.openModal('modal-1');
  actions.openModal('modal-2');
  console.log(`✓ 已打开2个模态框`);

  console.log(`modal-1是否打开: ${useUIStore.getState().isModalOpen('modal-1')}`);
  console.log(`modal-2是否打开: ${useUIStore.getState().isModalOpen('modal-2')}`);

  actions.closeAllModals();
  console.log(`✓ 已关闭所有模态框`);
  console.log('');

  // 4. 加载状态
  console.log('4. 加载状态管理...');
  actions.setLoading('loading-1', true);
  actions.setLoading('loading-2', true);
  console.log(`✓ 已设置2个加载状态`);

  console.log(`loading-1是否加载中: ${useUIStore.getState().isLoading('loading-1')}`);

  actions.clearLoadingStates();
  console.log(`✓ 已清除所有加载状态`);
  console.log('');

  // 5. 面板管理
  console.log('5. 面板管理...');
  actions.togglePanel('dataQuality');
  console.log(`✓ dataQuality面板已切换`);

  actions.setPanelOpen('batchProgress', true);
  console.log(`✓ batchProgress面板已打开`);

  console.log('');
  console.log('当前面板状态:');
  const panels = useUIStore.getState().panels;
  console.log(`  - dataQuality: ${panels.dataQuality}`);
  console.log(`  - batchProgress: ${panels.batchProgress}`);
  console.log(`  - documentPreview: ${panels.documentPreview}`);
  console.log('');
}

/**
 * 运行所有演示
 */
export function runDemo() {
  console.clear();
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     ExcelMind AI - 状态管理功能演示                ║');
  console.log('║     Zustand + React Query                          ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  demoTaskStore();
  demoUIStore();

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     演示完成！                                      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
}

// 如果直接运行此脚本
if (require.main === module) {
  runDemo();
}
