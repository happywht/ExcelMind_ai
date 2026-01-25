/**
 * 文件树组件
 *
 * 用于显示虚拟文件系统的树形结构
 *
 * @module VirtualWorkspace
 * @version 1.0.0
 */

import React from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File as FileIcon,
} from 'lucide-react';
import type { FileTreeNode, ExtendedVirtualFileInfo } from './types';
import {
  getFileIcon,
  getFileRoleLabel,
  getFileRoleColor,
  formatFileSize
} from './utils';

interface FileTreeProps {
  nodes: FileTreeNode[];
  selectedNodeId?: string;
  expandedNodes?: Set<string>;
  onNodeClick?: (node: FileTreeNode) => void;
  onNodeToggle?: (nodeId: string) => void;
  level?: number;
}

/**
 * 文件树节点组件
 */
const FileTreeNodeComponent: React.FC<{
  node: FileTreeNode;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onToggle: () => void;
}> = ({ node, level, isSelected, isExpanded, onClick, onToggle }) => {
  const paddingLeft = `${level * 1.5 + 0.75}rem`;

  /**
   * 获取节点图标
   */
  const getNodeIcon = () => {
    if (node.type === 'directory') {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-blue-500" />
      ) : (
        <Folder className="w-4 h-4 text-blue-500" />
      );
    }

    return (
      <span className="text-sm">{getFileIcon(node.fileType || 'unknown')}</span>
    );
  };

  return (
    <div>
      {/* 节点行 */}
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-transparent'
        }`}
        style={{ paddingLeft }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {/* 展开/折叠按钮 */}
        {node.type === 'directory' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex-shrink-0 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        )}

        {/* 节点图标 */}
        <div className="flex-shrink-0">{getNodeIcon()}</div>

        {/* 节点名称 */}
        <span
          className={`text-sm truncate ${
            node.type === 'directory'
              ? 'font-medium text-slate-700 dark:text-slate-300'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {node.name}
        </span>

        {/* 文件大小 */}
        {node.type === 'file' && node.size && (
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
            {formatFileSize(node.size)}
          </span>
        )}

        {/* 角色标签 */}
        {node.role && (
          <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${getFileRoleColor(node.role)}`}>
            {getFileRoleLabel(node.role)}
          </span>
        )}
      </div>

      {/* 子节点 */}
      {node.type === 'directory' && isExpanded && node.children && (
        <div className="animate-in slide-in-from-top-1 duration-150">
          {node.children.map(child => (
            <FileTreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              isSelected={false}
              isExpanded={child.isExpanded || false}
              onClick={() => {}}
              onToggle={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 文件树组件
 */
export const FileTree: React.FC<FileTreeProps> = ({
  nodes,
  selectedNodeId,
  expandedNodes = new Set(),
  onNodeClick,
  onNodeToggle,
  level = 0,
}) => {
  /**
   * 处理节点点击
   */
  const handleNodeClick = (node: FileTreeNode) => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  /**
   * 处理节点展开/折叠
   */
  const handleNodeToggle = (nodeId: string) => {
    if (onNodeToggle) {
      onNodeToggle(nodeId);
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
        <FileIcon className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">暂无文件</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {nodes.map(node => (
        <FileTreeNodeComponent
          key={node.id}
          node={node}
          level={level}
          isSelected={node.id === selectedNodeId}
          isExpanded={expandedNodes.has(node.id) || node.isExpanded || false}
          onClick={() => handleNodeClick(node)}
          onToggle={() => handleNodeToggle(node.id)}
        />
      ))}
    </div>
  );
};

export default FileTree;
