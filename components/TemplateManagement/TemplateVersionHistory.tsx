/**
 * 模板版本历史组件
 *
 * 显示模板版本列表，支持版本对比和回滚
 *
 * @version 2.0.0
 */

import React, { useState } from 'react';
import {
  History,
  GitCommit,
  Calendar,
  FileText,
  Eye,
  RotateCcw,
  Tag,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface TemplateVersion {
  id: string;
  version: string;
  createdAt: string;
  createdBy: string;
  changes: string[];
  tag?: string;
  notes?: string;
  file: {
    name: string;
    size: number;
    downloadUrl: string;
  };
}

interface TemplateVersionHistoryProps {
  versions: TemplateVersion[];
  currentVersion: string;
  onRollback?: (versionId: string) => Promise<void>;
  onViewVersion?: (versionId: string) => void;
  onDownloadVersion?: (versionId: string) => Promise<void>;
  onCompare?: (version1: string, version2: string) => void;
  className?: string;
}

const TemplateVersionHistory: React.FC<TemplateVersionHistoryProps> = ({
  versions,
  currentVersion,
  onRollback,
  onViewVersion,
  onDownloadVersion,
  onCompare,
  className,
}) => {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);

  const toggleExpand = (versionId: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  };

  const handleRollback = async (versionId: string) => {
    if (!onRollback) return;
    if (!confirm('确定要回滚到这个版本吗？当前版本将被替换。')) return;

    try {
      await onRollback(versionId);
    } catch (error) {
      console.error('回滚失败:', error);
      alert('回滚失败，请重试');
    }
  };

  const handleCompare = () => {
    if (!onCompare || selectedVersions.length !== 2) return;
    onCompare(selectedVersions[0], selectedVersions[1]);
  };

  const toggleCompareMode = () => {
    setCompareMode((prev) => !prev);
    setSelectedVersions([]);
  };

  const handleSelectForCompare = (versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((v) => v !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">版本历史</h3>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
            {versions.length} 个版本
          </span>
        </div>

        {/* 对比模式切换 */}
        <button
          onClick={toggleCompareMode}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
            compareMode
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
          type="button"
        >
          <Copy className="w-3.5 h-3.5" />
          {compareMode ? '退出对比' : '版本对比'}
        </button>
      </div>

      {/* 对比操作栏 */}
      {compareMode && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            已选择 {selectedVersions.length}/2 个版本
            {selectedVersions.length === 2 && ' - 准备对比'}
          </div>
          <button
            onClick={handleCompare}
            disabled={selectedVersions.length !== 2}
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors"
            type="button"
          >
            开始对比
          </button>
        </div>
      )}

      {/* 版本列表 */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {versions.map((version, index) => {
          const isExpanded = expandedVersions.has(version.id);
          const isCurrentVersion = version.version === currentVersion;
          const isSelected = selectedVersions.includes(version.id);

          return (
            <div
              key={version.id}
              className={cn(
                'bg-white border rounded-lg overflow-hidden transition-colors',
                isCurrentVersion && 'border-emerald-300 bg-emerald-50/30',
                compareMode && isSelected && 'border-blue-400 bg-blue-50/30',
                compareMode && 'cursor-pointer hover:border-blue-300'
              )}
              onClick={() => compareMode && handleSelectForCompare(version.id)}
            >
              {/* 版本头部 */}
              <div
                className={cn(
                  'flex items-center gap-3 p-4',
                  compareMode && 'cursor-pointer'
                )}
              >
                {/* 展开/收起按钮 */}
                {!compareMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(version.id);
                    }}
                    className="p-1 hover:bg-slate-100 rounded transition-colors flex-shrink-0"
                    type="button"
                    aria-label={isExpanded ? '收起' : '展开'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                )}

                {/* 版本信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <GitCommit className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-800">
                      v{version.version}
                    </span>
                    {isCurrentVersion && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                        当前版本
                      </span>
                    )}
                    {version.tag && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                        <Tag className="w-3 h-3" />
                        {version.tag}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(version.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>{formatFileSize(version.file.size)}</span>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                {!compareMode && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {onViewVersion && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewVersion(version.id);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                        type="button"
                        aria-label="查看版本"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                      </button>
                    )}
                    {onDownloadVersion && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadVersion(version.id);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                        type="button"
                        aria-label="下载版本"
                      >
                        <Download className="w-4 h-4 text-slate-500" />
                      </button>
                    )}
                    {onRollback && !isCurrentVersion && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRollback(version.id);
                        }}
                        className="p-1.5 hover:bg-orange-100 rounded transition-colors"
                        type="button"
                        aria-label="回滚到此版本"
                      >
                        <RotateCcw className="w-4 h-4 text-orange-500" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 版本详情（展开时显示） */}
              {isExpanded && !compareMode && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                  {/* 变更说明 */}
                  {version.changes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-700 mb-2">
                        变更内容:
                      </h4>
                      <ul className="space-y-1">
                        {version.changes.map((change, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-slate-600"
                          >
                            <span className="text-slate-400 mt-0.5">•</span>
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 备注 */}
                  {version.notes && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-700 mb-1">
                        备注:
                      </h4>
                      <div className="flex items-start gap-2 p-2 bg-slate-50 rounded text-xs text-slate-600">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <p>{version.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* 创建者信息 */}
                  <div className="text-xs text-slate-500">
                    创建者: {version.createdBy}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 空状态 */}
      {versions.length === 0 && (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">暂无版本历史</p>
          <p className="text-xs text-slate-400 mt-1">
            模板更新后将显示版本历史
          </p>
        </div>
      )}
    </div>
  );
};

export default TemplateVersionHistory;
