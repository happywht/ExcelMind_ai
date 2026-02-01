/**
 * 文档列表组件
 *
 * 功能：
 * - 文档列表（可搜索、筛选）
 * - 单个下载
 * - 批量下载（ZIP）
 * - 文档预览
 * - 文档统计
 *
 * @version 2.0.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileDown,
  Download,
  Search,
  Eye,
  Archive,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  FileArchive
} from 'lucide-react';
import { GeneratedDocument } from '../../types/documentTypes';
import { PerformanceMetrics } from './types';

interface DocumentListProps {
  documents: GeneratedDocument[];
  selectedDoc: GeneratedDocument | null;
  onSelect: (doc: GeneratedDocument) => void;
  onDownload: (doc: GeneratedDocument) => void;
  onDownloadAll: () => Promise<void>;
  performanceMetrics?: PerformanceMetrics;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDoc,
  onSelect,
  onDownload,
  onDownloadAll,
  performanceMetrics
}) => {

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // 过滤后的文档
  const filteredDocs = useMemo(() => {
    if (!searchTerm) return documents;
    return documents.filter(doc =>
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  // 统计信息
  const statistics = useMemo(() => {
    const totalSize = documents.reduce((sum, doc) => sum + doc.blob.size, 0);
    const avgSize = documents.length > 0 ? totalSize / documents.length : 0;

    return {
      totalDocs: documents.length,
      totalSize,
      avgSize,
      avgGenerationTime: performanceMetrics?.documentGeneration
        ? performanceMetrics.documentGeneration / documents.length
        : 0
    };
  }, [documents, performanceMetrics]);

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // 格式化时间
  const formatTime = (ms: number) => {
    if (ms < 1000) return ms + 'ms';
    return (ms / 1000).toFixed(2) + 's';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 头部信息 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-500 p-2 rounded-lg">
                <FileArchive className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">生成文档</h2>
                <p className="text-sm text-slate-500">批量生成的Word文档</p>
              </div>
            </div>

            {/* 统计信息 */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-xs text-slate-500">文档数量</p>
                  <p className="text-lg font-bold text-slate-800">{statistics.totalDocs}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-slate-500">总大小</p>
                  <p className="text-lg font-bold text-slate-800">
                    {formatFileSize(statistics.totalSize)}
                  </p>
                </div>
              </div>

              {statistics.avgGenerationTime > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-xs text-slate-500">平均生成时间</p>
                    <p className="text-lg font-bold text-slate-800">
                      {formatTime(statistics.avgGenerationTime)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 批量下载按钮 */}
          <button
            onClick={onDownloadAll}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Archive className="w-5 h-5" />
            下载全部(ZIP)
          </button>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索文档..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* 视图切换 */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'list'
                    ? 'bg-white text-slate-800 shadow-md'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
              >
                列表
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'grid'
                    ? 'bg-white text-slate-800 shadow-md'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
              >
                网格
              </button>
            </div>

            <div className="text-sm text-slate-500">
              {searchTerm && (
                <span>
                  找到 <span className="font-bold text-purple-600">{filteredDocs.length}</span> 个文档
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 文档列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredDocs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {searchTerm ? '没有找到匹配的文档' : '暂无文档'}
              </p>
              <p className="text-sm">
                {searchTerm ? '请尝试其他搜索词' : '请先生成文档'}
              </p>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* 列表视图 */
          <div className="space-y-3">
            {filteredDocs.map((doc, idx) => (
              <div
                key={idx}
                className={`
                  bg-white border rounded-lg p-4 transition-all hover:shadow-md
                  ${selectedDoc === doc ? 'border-purple-400 shadow-md ring-2 ring-purple-100' : 'border-slate-200 hover:border-purple-300'}
                `}
              >
                <div className="flex items-center gap-4">
                  {/* 文档图标 */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>

                  {/* 文档信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 truncate">
                      {doc.fileName}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{formatFileSize(doc.blob.size)}</span>
                      <span>•</span>
                      <span>索引: {doc.dataIndex + 1}</span>
                      {doc.recordData && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">
                            {Object.entries(doc.recordData).slice(0, 2).map(([k, v]) =>
                              `${k}: ${v}`
                            ).join(' | ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelect(doc)}
                      className="p-2 text-blue-600 bg-blue-50 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-all shadow-sm"
                      title="预览"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDownload(doc)}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 hover:shadow-md transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      下载
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 网格视图 */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDocs.map((doc, idx) => (
              <div
                key={idx}
                className={`
                  bg-white border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer
                  ${selectedDoc === doc ? 'border-purple-400 shadow-md ring-2 ring-purple-100' : 'border-slate-200 hover:border-purple-300'}
                `}
                onClick={() => onSelect(doc)}
              >
                <div className="flex flex-col items-center text-center">
                  {/* 文档图标 */}
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mb-3">
                    <FileText className="w-8 h-8 text-purple-600" />
                  </div>

                  {/* 文档名称 */}
                  <h3 className="text-sm font-semibold text-slate-800 mb-2 line-clamp-2">
                    {doc.fileName}
                  </h3>

                  {/* 文档信息 */}
                  <div className="text-xs text-slate-500 mb-3">
                    <div>{formatFileSize(doc.blob.size)}</div>
                    <div>索引: {doc.dataIndex + 1}</div>
                  </div>

                  {/* 下载按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(doc);
                    }}
                    className="w-full py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    下载
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部统计栏 */}
      {documents.length > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-slate-500">
                总计 <span className="font-bold text-slate-700">{documents.length}</span> 个文档
              </span>
              <span className="text-slate-500">
                总大小 <span className="font-bold text-slate-700">{formatFileSize(statistics.totalSize)}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">全部生成完成</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
