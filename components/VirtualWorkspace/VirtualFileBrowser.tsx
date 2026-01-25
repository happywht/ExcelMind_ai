/**
 * 虚拟文件浏览器组件
 *
 * 核心功能：
 * - 显示虚拟文件系统的文件列表
 * - 支持树形视图和网格视图切换
 * - 文件搜索和过滤
 * - 文件上传和删除
 * - 文件选择和多选
 *
 * @module VirtualWorkspace
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Upload,
  Folder,
  Grid3x3,
  List,
  Filter,
  SortAsc,
  X,
  ChevronDown,
} from 'lucide-react';
import { getVirtualFileSystem } from '../../services/infrastructure/vfs/VirtualFileSystem';
import type {
  ExtendedVirtualFileInfo,
  FileTreeNode,
  SortOption,
  FilterOptions,
  FileOperation,
  VirtualFileBrowserProps,
} from './types';
import {
  buildFileTree,
  sortFiles,
  filterFiles,
  getFileRoleLabel,
} from './utils';
import { FileCard } from './FileCard';
import { FileTree } from './FileTree';

/**
 * 虚拟文件浏览器组件
 */
export const VirtualFileBrowser: React.FC<VirtualFileBrowserProps> = ({
  workspaceId,
  rootPath,
  files: filesProp,
  onFileSelect,
  onFileUpload,
  onFileDelete,
  onFileUpdate,
  selectable = false,
  multiSelect = false,
  dragAndDrop = true,
}) => {
  // ===== 状态管理 =====

  const [files, setFiles] = useState<ExtendedVirtualFileInfo[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<ExtendedVirtualFileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'tree'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortAscending, setSortAscending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 过滤选项
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    searchQuery: '',
    fileTypes: [],
    roles: [],
  });

  // VFS 服务实例
  const vfs = useMemo(() => getVirtualFileSystem(), []);

  // ===== 数据加载 =====

  /**
   * 加载文件列表
   */
  const loadFiles = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const vfsFiles = await vfs.listDirectory(rootPath);
      const extended: ExtendedVirtualFileInfo[] = vfsFiles.map(f => ({
        ...f,
        referenceCount: 0,
        isSelected: false,
      }));

      setFiles(extended);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [vfs, rootPath]);

  /**
   * 初始化加载
   */
  useEffect(() => {
    // 如果直接传入了files prop，使用它而不是从VFS加载
    if (filesProp) {
      setFiles(filesProp);
    } else {
      loadFiles();
    }
  }, [loadFiles, filesProp]);

  // ===== 数据处理 =====

  /**
   * 应用过滤和排序
   */
  useEffect(() => {
    let result = [...files];

    // 应用搜索
    if (searchQuery.trim()) {
      result = filterFiles(result, { searchQuery: searchQuery.trim() });
    }

    // 应用过滤选项
    result = filterFiles(result, filterOptions);

    // 应用排序
    result = sortFiles(result, sortBy, sortAscending);

    setFilteredFiles(result);
  }, [files, searchQuery, filterOptions, sortBy, sortAscending]);

  /**
   * 构建文件树
   */
  const fileTree = useMemo(() => {
    return buildFileTree(filteredFiles);
  }, [filteredFiles]);

  // ===== 文件操作 =====

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback((file: ExtendedVirtualFileInfo) => {
    if (!selectable) return;

    setSelectedFiles(prev => {
      const next = new Set(prev);

      if (multiSelect) {
        if (next.has(file.id)) {
          next.delete(file.id);
        } else {
          next.add(file.id);
        }
      } else {
        next.clear();
        next.add(file.id);
      }

      return next;
    });

    if (onFileSelect) {
      onFileSelect(file);
    }
  }, [selectable, multiSelect, onFileSelect]);

  /**
   * 处理文件上传
   */
  const handleFileUpload = useCallback(async (uploadedFiles: File[]) => {
    if (!onFileUpload) return;

    setIsUploading(true);
    try {
      await onFileUpload(uploadedFiles);
      await loadFiles(); // 刷新文件列表
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  }, [onFileUpload, loadFiles]);

  /**
   * 处理文件删除
   */
  const handleFileDelete = useCallback(async (fileId: string) => {
    if (!onFileDelete) return;

    try {
      await onFileDelete(fileId);
      await loadFiles(); // 刷新文件列表
    } catch (error) {
      console.error('File delete failed:', error);
    }
  }, [onFileDelete, loadFiles]);

  /**
   * 处理文件操作
   */
  const handleFileOperation = useCallback(async (operation: FileOperation, file: ExtendedVirtualFileInfo) => {
    switch (operation) {
      case 'delete':
        await handleFileDelete(file.id);
        break;
      case 'download':
        try {
          const blob = await vfs.readFile(file.id);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Download failed:', error);
        }
        break;
      default:
        console.log('Operation:', operation, file);
    }
  }, [vfs, handleFileDelete]);

  // ===== 拖拽上传 =====

  /**
   * 处理拖拽事件
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!dragAndDrop || !onFileUpload) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles);
    }
  }, [dragAndDrop, onFileUpload, handleFileUpload]);

  // ===== 节点操作 =====

  /**
   * 处理节点点击
   */
  const handleNodeClick = useCallback((node: FileTreeNode) => {
    if (node.type === 'file' && onFileSelect) {
      const file = files.find(f => f.id === node.id);
      if (file) {
        handleFileSelect(file);
      }
    }
  }, [files, onFileSelect, handleFileSelect]);

  /**
   * 处理节点展开/折叠
   */
  const handleNodeToggle = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // ===== 渲染 =====

  return (
    <div
      className={`h-full flex flex-col bg-white dark:bg-slate-900 ${dragAndDrop ? 'transition-colors' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 工具栏 */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-slate-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 刷新按钮 */}
          <button
            onClick={loadFiles}
            disabled={isRefreshing}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* 左侧操作 */}
          <div className="flex items-center gap-2">
            {/* 视图切换 */}
            <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
                title="网格视图"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`p-2 transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
                title="树形视图"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* 排序 */}
            <button
              onClick={() => setSortAscending(!sortAscending)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
            >
              <SortAsc className={`w-4 h-4 ${!sortAscending ? 'rotate-180' : ''}`} />
              <span>{sortBy === 'date' ? '日期' : sortBy === 'name' ? '名称' : '大小'}</span>
            </button>

            {/* 过滤器 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Filter className="w-4 h-4" />
              过滤
            </button>
          </div>

          {/* 右侧操作 */}
          <div className="flex items-center gap-2">
            {/* 上传按钮 */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>上传文件</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  if (selected.length > 0) {
                    handleFileUpload(selected);
                  }
                  e.target.value = '';
                }}
              />
            </label>

            {/* 文件计数 */}
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {filteredFiles.length} 个文件
            </span>
          </div>
        </div>

        {/* 过滤器面板 */}
        {showFilters && (
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">角色:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {['primary_source', 'auxiliary_source', 'configuration', 'template', 'output'].map(role => (
                  <label key={role} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterOptions.roles?.includes(role as any)}
                      onChange={(e) => {
                        setFilterOptions(prev => ({
                          ...prev,
                          roles: e.target.checked
                            ? [...(prev.roles || []), role as any]
                            : (prev.roles || []).filter(r => r !== role),
                        }));
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {getFileRoleLabel(role as any)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 文件列表区域 */}
      <div className="flex-1 overflow-auto p-4">
        {filteredFiles.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
            <Folder className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-1">暂无文件</p>
            <p className="text-sm mb-4">上传文件开始使用虚拟工作区</p>
            <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>选择文件</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  if (selected.length > 0) {
                    handleFileUpload(selected);
                  }
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        ) : viewMode === 'grid' ? (
          /* 网格视图 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFiles.map(file => (
              <FileCard
                key={file.id}
                file={file}
                isSelected={selectedFiles.has(file.id)}
                selectable={selectable}
                onSelect={handleFileSelect}
                onOperation={handleFileOperation}
              />
            ))}
          </div>
        ) : (
          /* 树形视图 */
          <FileTree
            nodes={fileTree}
            selectedNodeId={Array.from(selectedFiles)[0]}
            expandedNodes={expandedNodes}
            onNodeClick={handleNodeClick}
            onNodeToggle={handleNodeToggle}
          />
        )}
      </div>

      {/* 上传中的遮罩 */}
      {isUploading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              上传中...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualFileBrowser;
