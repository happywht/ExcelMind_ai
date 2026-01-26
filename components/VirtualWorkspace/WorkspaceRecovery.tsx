/**
 * 工作区恢复组件
 *
 * 核心功能：
 * - 显示历史会话列表
 * - 会话详情和状态
 * - 恢复和删除会话
 * - 自动清理过期会话
 *
 * @module VirtualWorkspace
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  RotateCcw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { SessionInfo, RecoveryOptions, WorkspaceRecoveryProps } from './types';
import {
  getSessions,
  deleteSession,
  clearAllSessions,
  cleanupExpiredSessions,
  generateSessionName,
  formatTimestamp,
  getFileIcon,
  getFileRoleLabel,
  getFileRoleColor,
} from './utils';

/**
 * 会话卡片组件
 */
const SessionCard: React.FC<{
  session: SessionInfo;
  onRestore: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}> = ({ session, onRestore, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * 获取状态图标
   */
  const getStatusIcon = () => {
    switch (session.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'interrupted':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  /**
   * 获取状态标签
   */
  const getStatusLabel = () => {
    const labels = {
      completed: '已完成',
      failed: '失败',
      in_progress: '进行中',
      interrupted: '已中断',
    };
    return labels[session.status];
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {session.name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatTimestamp(session.timestamp)}
            </p>
          </div>
        </div>
      </div>

      {/* 文件列表 */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mb-2">
          <FileText className="w-3.5 h-3.5" />
          <span>{session.files.length} 个文件</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {session.files.slice(0, 3).map(file => (
            <span
              key={file.id}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getFileRoleColor(file.role)}`}
            >
              <span className="text-xs">{getFileIcon(file.type)}</span>
              <span className="max-w-[120px] truncate">{file.name}</span>
            </span>
          ))}
          {session.files.length > 3 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1">
              +{session.files.length - 3} 更多
            </span>
          )}
        </div>
      </div>

      {/* 执行状态 */}
      {session.executionState && (
        <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">执行进度</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {session.executionState.totalProgress?.toFixed(0)}%
            </span>
          </div>
          <div className="mt-1 w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${session.executionState.totalProgress || 0}%` }}
            />
          </div>
          {session.error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              错误: {session.error}
            </p>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onRestore(session.id)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          恢复会话
        </button>
        <button
          onClick={() => {
            setIsDeleting(true);
            onDelete(session.id);
          }}
          disabled={isDeleting}
          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50"
          title="删除会话"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * 工作区恢复组件
 */
export const WorkspaceRecovery: React.FC<WorkspaceRecoveryProps> = ({
  maxSessions = 20,
  autoCleanup = true,
  onRestore,
  onDelete,
  onClearAll,
}) => {
  // ===== 状态管理 =====

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionInfo[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'in_progress'>('all');
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // ===== 数据加载 =====

  /**
   * 加载会话列表
   */
  const loadSessions = useCallback(() => {
    const loaded = getSessions();
    const sorted = loaded.sort((a, b) => b.timestamp - a.timestamp);
    setSessions(sorted.slice(0, maxSessions));
  }, [maxSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  /**
   * 自动清理过期会话
   */
  useEffect(() => {
    if (autoCleanup) {
      cleanupExpiredSessions();
    }
  }, [autoCleanup]);

  /**
   * 过滤会话
   */
  useEffect(() => {
    let filtered = [...sessions];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    setFilteredSessions(filtered);
  }, [sessions, statusFilter]);

  // ===== 会话操作 =====

  /**
   * 处理会话恢复
   */
  const handleRestore = useCallback(async (sessionId: string) => {
    if (!onRestore) return;

    try {
      const options: RecoveryOptions = {
        restoreFiles: true,
        restoreExecutionState: true,
        restoreMappings: true,
        restoreConfig: true,
      };

      await onRestore(sessionId, options);
    } catch (error) {
      logger.error('Failed to restore session:', error);
    }
  }, [onRestore]);

  /**
   * 处理会话删除
   */
  const handleDelete = useCallback(async (sessionId: string) => {
    try {
      if (onDelete) {
        await onDelete(sessionId);
      } else {
        deleteSession(sessionId);
      }
      loadSessions();
    } catch (error) {
      logger.error('Failed to delete session:', error);
    }
  }, [onDelete, loadSessions]);

  /**
   * 处理清除所有会话
   */
  const handleClearAll = useCallback(async () => {
    setIsClearing(true);
    try {
      if (onClearAll) {
        await onClearAll();
      } else {
        clearAllSessions();
      }
      loadSessions();
      setShowConfirmDialog(false);
    } catch (error) {
      logger.error('Failed to clear sessions:', error);
    } finally {
      setIsClearing(false);
    }
  }, [onClearAll, loadSessions]);

  // ===== 渲染 =====

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* 头部 */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              工作区恢复
            </h2>
          </div>
          <button
            onClick={() => setShowConfirmDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            清除全部
          </button>
        </div>

        {/* 过滤器 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === 'completed'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            已完成
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === 'failed'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            失败
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === 'in_progress'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            进行中
          </button>
        </div>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredSessions.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
            <Sparkles className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-1">暂无历史会话</p>
            <p className="text-sm">开始处理文件后，会话将自动保存</p>
          </div>
        ) : (
          /* 会话列表 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onRestore={handleRestore}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* 确认对话框 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  确认清除全部会话
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  此操作将删除所有历史会话记录，无法恢复
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClearAll}
                disabled={isClearing}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isClearing ? '清除中...' : '确认清除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceRecovery;
