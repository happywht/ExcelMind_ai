/**
 * 任务列表组件
 *
 * 显示批量生成任务的历史记录
 *
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye } from 'lucide-react';
import { batchGenerationAPI, TaskHistoryItem, TaskStatus } from '../../api/batchGenerationAPI';
import StatusIndicator from '../Shared/StatusIndicator';

interface TaskListProps {
  onSelectTask?: (taskId: string) => void;
  className?: string;
}

const TaskList: React.FC<TaskListProps> = ({ onSelectTask, className }) => {
  const [tasks, setTasks] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    loadTasks();
  }, [statusFilter]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await batchGenerationAPI.getTaskHistory({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: 1,
        pageSize: 20,
      });
      setTasks(response.items);
    } catch (error) {
      console.error('加载任务列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const blob = await batchGenerationAPI.downloadZip(taskId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_${taskId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('下载失败');
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.taskId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusLabel = (status: TaskStatus): string => {
    const labels = {
      pending: '等待中',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消',
      paused: '已暂停',
    };
    return labels[status];
  };

  if (loading) {
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
            className="bg-transparent border-none text-sm focus:outline-none cursor-pointer"
          >
            <option value="all">所有状态</option>
            <option value="pending">等待中</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
      </div>

      {/* 任务列表 */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">暂无任务记录</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">任务ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">文档数</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">创建时间</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.taskId}
                    onClick={() => onSelectTask?.(task.taskId)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800">{task.taskId}</p>
                      <p className="text-xs text-slate-500 mt-1">{task.templateIds.length} 个模板</p>
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
                      <p className="text-sm text-slate-800">
                        {task.completedDocuments} / {task.totalDocuments}
                      </p>
                      {task.failedDocuments > 0 && (
                        <p className="text-xs text-red-600 mt-1">{task.failedDocuments} 失败</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">
                        {new Date(task.createdAt).toLocaleString()}
                      </p>
                      {task.completedAt && (
                        <p className="text-xs text-slate-500 mt-1">
                          完成于 {new Date(task.completedAt).toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {task.downloadUrl && (
                          <button
                            onClick={(e) => handleDownload(task.taskId, e)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="下载"
                          >
                            <Download className="w-4 h-4 text-slate-500" />
                          </button>
                        )}
                        <button
                          onClick={() => onSelectTask?.(task.taskId)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
