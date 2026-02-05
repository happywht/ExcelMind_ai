/**
 * 文件卡片组件
 *
 * 用于显示单个文件的信息和操作按钮
 *
 * @module VirtualWorkspace
 * @version 1.0.0
 */

import React, { useState } from 'react';
import {
  File,
  Download,
  Trash2,
  Eye,
  Copy,
  MoreVertical,
  FileSpreadsheet,
  FileText,
  FileJson,
  AlertCircle
} from 'lucide-react';
import type { ExtendedVirtualFileInfo, FileOperation } from './types';
import {
  getFileIcon,
  getFileRoleLabel,
  getFileRoleColor,
  formatFileSize,
  formatTimestamp
} from './utils';

interface FileCardProps {
  file: ExtendedVirtualFileInfo;
  isSelected?: boolean;
  selectable?: boolean;
  showActions?: boolean;
  compact?: boolean;
  onSelect?: (file: ExtendedVirtualFileInfo) => void;
  onOperation?: (operation: FileOperation, file: ExtendedVirtualFileInfo) => void;
}

/**
 * 文件卡片组件
 */
export const FileCard: React.FC<FileCardProps> = ({
  file,
  isSelected = false,
  selectable = false,
  showActions = true,
  compact = false,
  onSelect,
  onOperation,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  /**
   * 处理文件选择
   */
  const handleSelect = () => {
    if (selectable && onSelect) {
      onSelect(file);
    }
  };

  /**
   * 处理操作点击
   */
  const handleOperation = (operation: FileOperation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOperation) {
      onOperation(operation, file);
    }
    setShowMenu(false);
  };

  /**
   * 获取文件类型图标
   */
  const getFileTypeIcon = () => {
    const iconClass = compact ? 'w-4 h-4' : 'w-6 h-6';

    switch (file.type) {
      case 'excel':
        return <FileSpreadsheet className={iconClass} />;
      case 'word':
        return <FileText className={iconClass} />;
      case 'json':
        return <FileJson className={iconClass} />;
      default:
        return <File className={iconClass} />;
    }
  };

  /**
   * 渲染操作菜单
   */
  const renderActionMenu = () => {
    if (!showActions) return null;

    const menuItems = [
      { operation: 'view' as FileOperation, icon: Eye, label: '查看详情' },
      { operation: 'download' as FileOperation, icon: Download, label: '下载' },
      { operation: 'copy' as FileOperation, icon: Copy, label: '复制' },
      { operation: 'delete' as FileOperation, icon: Trash2, label: '删除', danger: true },
    ];

    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="更多操作"
        >
          <MoreVertical className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[150px]">
              {menuItems.map(item => (
                <button
                  key={item.operation}
                  onClick={(e) => handleOperation(item.operation, e)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                    item.danger
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  /**
   * 紧凑模式渲染
   */
  if (compact) {
    return (
      <div
        className={`group flex items-center gap-3 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleSelect}
      >
        {/* 选择框 */}
        {selectable && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelect}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* 文件图标 */}
        <div className="flex-shrink-0 text-slate-600 dark:text-slate-400">
          {getFileTypeIcon()}
        </div>

        {/* 文件信息 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
            {file.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatFileSize(file.size)}
          </p>
        </div>

        {/* 角色标签 */}
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFileRoleColor(file.role)}`}>
          {getFileRoleLabel(file.role)}
        </span>

        {/* 操作按钮 */}
        {isHovered && renderActionMenu()}
      </div>
    );
  }

  /**
   * 标准模式渲染
   */
  return (
    <div
      className={`group bg-white dark:bg-slate-800 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
        isSelected
          ? 'border-blue-300 dark:border-blue-700 shadow-sm'
          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleSelect}
    >
      {/* 文件头部 */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          {/* 文件图标和名称 */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 flex items-center justify-center text-2xl">
              {getFileIcon(file.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {file.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {file.path}
              </p>
            </div>
          </div>

          {/* 操作按钮 */}
          {isHovered && renderActionMenu()}
        </div>

        {/* 角色标签 */}
        <div className="mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getFileRoleColor(file.role)}`}>
            {getFileRoleLabel(file.role)}
          </span>
          {(file.referenceCount || 0) > 0 && (
            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
              {file.referenceCount} 个引用
            </span>
          )}
        </div>
      </div>

      {/* 文件元数据 */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <File className="w-3.5 h-3.5" />
            <span>{formatFileSize(file.size)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{formatTimestamp(file.uploadTime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileCard;
