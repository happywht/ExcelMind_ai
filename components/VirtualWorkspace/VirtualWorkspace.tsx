/**
 * 虚拟工作区主组件
 *
 * 整合文件浏览器、关系图谱、执行进度监控和状态恢复功能
 *
 * @module VirtualWorkspace
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  FolderOpen,
  Network,
  Activity,
  History,
  X,
} from 'lucide-react';
import { getVirtualFileSystem, FileRole } from '../../services/infrastructure/vfs/VirtualFileSystem';
import { VirtualFileBrowser } from './VirtualFileBrowser';
import { RelationshipGraph } from './RelationshipGraph';
import { WorkspaceRecovery } from './WorkspaceRecovery';
import { ExecutionProgressPanel } from '../ExecutionProgress';

type WorkspaceTab = 'files' | 'graph' | 'progress' | 'recovery';

/**
 * 虚拟工作区组件
 */
export const VirtualWorkspace: React.FC<{
  workspaceId: string;
}> = ({ workspaceId }) => {
  // ===== 状态管理 =====

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('files');
  const [isInitialized, setIsInitialized] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);

  const vfs = useMemo(() => getVirtualFileSystem(), []);

  // ===== 初始化 =====

  useEffect(() => {
    const initVFS = async () => {
      try {
        await vfs.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize VFS:', error);
      }
    };

    initVFS();
  }, [vfs]);

  // ===== 文件操作处理 =====

  const handleFileUpload = useCallback(async (files: File[]) => {
    try {
      for (const file of files) {
        await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }, [vfs]);

  const handleFileDelete = useCallback(async (fileId: string) => {
    try {
      await vfs.deleteFile(fileId);
    } catch (error) {
      console.error('File delete failed:', error);
      throw error;
    }
  }, [vfs]);

  // ===== 会话恢复处理 =====

  const handleRestoreSession = useCallback(async (sessionId: string) => {
    // TODO: 实现会话恢复逻辑
    console.log('Restoring session:', sessionId);
  }, []);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    // TODO: 实现会话删除逻辑
    console.log('Deleting session:', sessionId);
  }, []);

  const handleClearAllSessions = useCallback(async () => {
    // TODO: 实现清除所有会话逻辑
    console.log('Clearing all sessions');
  }, []);

  // ===== 执行进度处理 =====

  const handleStageClick = useCallback((stage: any) => {
    console.log('Stage clicked:', stage);
  }, []);

  const handleLogEntryClick = useCallback((log: any) => {
    console.log('Log entry clicked:', log);
  }, []);

  // ===== 渲染 =====

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">正在初始化虚拟工作区...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* 标签页导航 */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center">
          {[
            { id: 'files' as WorkspaceTab, label: '文件浏览器', icon: FolderOpen },
            { id: 'graph' as WorkspaceTab, label: '关系图谱', icon: Network },
            { id: 'progress' as WorkspaceTab, label: '执行进度', icon: Activity },
            { id: 'recovery' as WorkspaceTab, label: '工作区恢复', icon: History },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'files' && (
          <VirtualFileBrowser
            workspaceId={workspaceId}
            onFileUpload={handleFileUpload}
            onFileDelete={handleFileDelete}
            selectable
            multiSelect
            dragAndDrop
          />
        )}

        {activeTab === 'graph' && (
          <RelationshipGraph
            onNodeClick={(node) => console.log('Node clicked:', node)}
            onEdgeClick={(edge) => console.log('Edge clicked:', edge)}
            onNodeDoubleClick={(node) => console.log('Node double clicked:', node)}
          />
        )}

        {activeTab === 'progress' && executionId ? (
          <ExecutionProgressPanel
            executionId={executionId}
            showLogs
            autoScroll
            onStageClick={handleStageClick}
            onLogEntryClick={handleLogEntryClick}
          />
        ) : activeTab === 'progress' ? (
          <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
            <p>暂无执行任务</p>
          </div>
        ) : null}

        {activeTab === 'recovery' && (
          <WorkspaceRecovery
            onRestore={handleRestoreSession}
            onDelete={handleDeleteSession}
            onClearAll={handleClearAllSessions}
          />
        )}
      </div>
    </div>
  );
};

export default VirtualWorkspace;
