/**
 * 任务列表组件 - Zustand版本
 *
 * 使用Zustand store管理的任务列表组件
 *
 * @version 2.0.0
 */

import React, { useMemo } from 'react';
import { Search, Filter, Download, Eye, Trash2, RefreshCw } from 'lucide-react';
import { batchGenerationAPI, TaskStatus } from '../../services/batchGenerationAPI';
import StatusIndicator from '../Shared/StatusIndicator';
import { logger } from '@/utils/logger';
import {
  useTasks,
  useTaskFilters,
  useTaskStats,
  useSelectedTaskIds,
  useTaskActions,
  useUIStore
} from '../../stores';

interface TaskListProps {
  onSelectTask?: (taskId: string) => void;
  className?: string;
}

/**
 * 任务列表组件 - 使用Zustand状态管理
 */
const TaskListV2: React.FC<TaskListProps> = ({ onSelectTask, className }) => {
  // ============ Zustand Store ============

  // 只订阅需要的状态切片，避免不必要的重渲染
  const tasks = useTasks();
  const filters = useTaskFilters();
  const stats = useTaskStats();
  const selectedTaskIds = useSelectedTaskIds();

  // 操作方法
  const {
    setFilters,
    resetFilters,
    updateTask,
    removeTask,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    deleteSelected
  } = useTaskActions();

  // UI状态
  const isLoading = useUIStore(state => state.isLoading('tasks-loading'));
  const setLoading = useUIStore(state => state.setLoading);
  const showSuccess = useUIStore(state => state.showSuccess);
  const showError = useUIStore(state => state.showError);

  // ============ 计算属性 ============

  // 是否有选中的任务
  const hasSelection = useMemo(() => selectedTaskIds.length > 0, [selectedTaskIds]);

  // 是否所有任务都被选中
  const allSelected = useMemo(
    () => tasks.length > 0 && selectedTaskIds.length === tasks.length,
    [tasks.length, selectedTaskIds.length]
  );

  // ============ 事件处理 ============

  /**
   * 加载任务列表
   */
  const loadTasks = React.useCallback(async () => {
    setLoading('tasks-loading', true);
    try {
      const response = await batchGenerationAPI.getTaskHistory({
        status: filters.status === 'all' ? undefined : filters.status,
        page: 1,
        pageSize: 20,
      });

      // 将API数据转换为Task格式并添加到store
      const tasks = response.items.map(item => ({
        id: item.taskId,
        status: item.status as any,
        progress: Math.floor((item.completedDocuments / item.totalDocuments) * 100),
        summary: {
          templateIds: item.templateIds,
          totalDocuments: item.totalDocuments,
          completedDocuments: item.completedDocuments,
          failedDocuments: item.failedDocuments,
          dataSourceId: item.dataSourceId
        },
        timestamps: {
          created: new Date(item.createdAt).getTime(),
          completed: item.completedAt ? new Date(item.completedAt).getTime() : undefined
        },
        downloadUrl: item.downloadUrl
      }));

      // 使用批量添加方法
      useTaskActions.getState().addTasks(tasks);
    } catch (error) {
      logger.error('加载任务列表失败:', error);
      showError('加载失败', '无法加载任务列表，请稍后重试');
    } finally {
      setLoading('tasks-loading', false);
    }
  }, [filters.status, setLoading, showError]);

  /**
   * 组件挂载时加载任务
   */
  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  /**
   * 下载任务文件
   */
  const handleDownload = React.useCallback(async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const blob = await batchGenerationAPI.downloadZip(taskId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_${taskId}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      showSuccess('下载成功', '文件已开始下载');
    } catch (error) {
      logger.error('下载失败:', error);
      showError('下载失败', '无法下载文件，请稍后重试');
    }
  }, [showSuccess, showError]);

  /**
   * 删除任务
   */
  const handleDelete = React.useCallback(async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('确定要删除这个任务吗？')) {
      return;
    }

    try {
      await batchGenerationAPI.deleteTask(taskId);
      removeTask(taskId);
      showSuccess('删除成功', '任务已删除');
    } catch (error) {
      logger.error('删除失败:', error);
      showError('删除失败', '无法删除任务，请稍后重试');
    }
  }, [removeTask, showSuccess, showError]);

  /**
   * 批量删除选中的任务
   */
  const handleDeleteSelected = React.useCallback(async () => {
    if (selectedTaskIds.length === 0) {
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedTaskIds.length} 个任务吗？`)) {
      return;
    }

    setLoading('batch-delete', true);
    try {
      // 并发删除所有选中的任务
      await Promise.all(
        selectedTaskIds.map(id => batchGenerationAPI.deleteTask(id))
      );

      // 从store中删除
      deleteSelected();

      showSuccess('删除成功', `已删除 ${selectedTaskIds.length} 个任务`);
    } catch (error) {
      logger.error('批量删除失败:', error);
      showError('删除失败', '部分任务删除失败，请稍后重试');
    } finally {
      setLoading('batch-delete', false);
    }
  }, [selectedTaskIds, deleteSelected, setLoading, showSuccess, showError]);

  /**
   * 全选/取消全选
   */
  const handleSelectAll = React.useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAllTasks();
    }
  }, [allSelected, clearSelection, selectAllTasks]);

  /**
   * 刷新任务列表
   */
  const handleRefresh = React.useCallback(() => {
    loadTasks();
    showSuccess('刷新成功', '任务列表已更新');
  }, [loadTasks, showSuccess]);

  // ============ 渲染 ============

  if (isLoading && tasks.length === 0) {
    return (
      <div className={`flex items-center justify-center p-12 ${className || ''}`}>
        <StatusIndicator status="loading" text="加载任务列表..." />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* 搜索和筛选 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索任务ID..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value as any })}
            className="bg-transparent border-none text-sm focus:outline-none cursor-pointer"
          >
            <option value="all">所有状态</option>
            <option value="pending">等待中</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="cancelled">已取消</option>
            <option value="paused">已暂停</option>
          </select>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="刷新"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>

        {hasSelection && (
          <button
            onClick={handleDeleteSelected}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">删除选中 ({selectedTaskIds.length})</span>
          </button>
        )}
      </div>

      {/* 任务统计 */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-600">
          总计: <span className="font-semibold">{stats.total}</span>
        </span>
        <span className="text-slate-600">
          等待中: <span className="font-semibold">{stats.pending}</span>
        </span>
        <span className="text-slate-600">
          处理中: <span className="font-semibold">{stats.processing}</span>
        </span>
        <span className="text-slate-600">
          已完成: <span className="font-semibold">{stats.completed}</span>
        </span>
        <span className="text-red-600">
          失败: <span className="font-semibold">{stats.failed}</span>
        </span>
      </div>

      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">暂无任务记录</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">任务ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">进度</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">文档数</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">创建时间</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => {
                  const isSelected = selectedTaskIds.includes(task.id);

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onSelectTask?.(task.id)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTaskSelection(task.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-800">{task.id}</p>
                        <p className="text-xs text-slate-500 mt-1">{task.summary.templateIds.length} 个模板</p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusIndicator
                          status={
                            task.status === 'completed' ? 'success' :
                            task.status === 'failed' ? 'error' :
                            task.status === 'processing' ? 'loading' :
                            task.status === 'paused' ? 'paused' : 'pending'
                          }
                          text={getStatusLabel(task.status)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 w-10">{task.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-800">
                          {task.summary.completedDocuments} / {task.summary.totalDocuments}
                        </p>
                        {task.summary.failedDocuments > 0 && (
                          <p className="text-xs text-red-600 mt-1">{task.summary.failedDocuments} 失败</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">
                          {new Date(task.timestamps.created).toLocaleString()}
                        </p>
                        {task.timestamps.completed && (
                          <p className="text-xs text-slate-500 mt-1">
                            完成于 {new Date(task.timestamps.completed).toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {task.downloadUrl && (
                            <button
                              onClick={(e) => handleDownload(task.id, e)}
                              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              title="下载"
                            >
                              <Download className="w-4 h-4 text-slate-500" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(task.id, e)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                          <button
                            onClick={() => onSelectTask?.(task.id)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 获取状态标签
 */
function getStatusLabel(status: TaskStatusType): string {
  const labels = {
    pending: '等待中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
    paused: '已暂停',
  };
  return labels[status];
}

type TaskStatusType = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused';

export default TaskListV2;
