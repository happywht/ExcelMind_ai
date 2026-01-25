/**
 * 文档预览组件
 *
 * 功能：
 * - 预览生成的Word文档
 * - 使用mammoth将docx转换为HTML显示
 * - 支持缩放和滚动
 * - 显示文档信息
 *
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Maximize2,
  Loader2
} from 'lucide-react';
import { GeneratedDocument } from '../../types/documentTypes';

interface DocumentPreviewProps {
  document: GeneratedDocument;
  onClose: () => void;
}

/**
 * 文档预览组件
 */
const DocumentPreview: React.FC<DocumentPreviewProps> = ({ document, onClose }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const previewRef = useRef<HTMLDivElement>(null);

  /**
   * 加载文档内容
   */
  useEffect(() => {
    loadDocument();
  }, [document]);

  /**
   * 加载并转换文档
   */
  const loadDocument = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await document.blob.arrayBuffer();

      // 动态导入mammoth（避免SSR问题）
      const mammoth = await import('mammoth');

      // 转换docx为HTML
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          // 转换选项
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Title'] => h1.title:fresh"
          ],
          // 包含默认样式
          includeDefaultStyleMap: true
        }
      );

      setHtmlContent(result.value);

      // 如果有警告信息
      if (result.messages && result.messages.length > 0) {
        console.warn('文档转换警告:', result.messages);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(`无法加载文档: ${errorMessage}`);
      console.error('文档预览错误:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 下载文档
   */
  const handleDownload = () => {
    const url = URL.createObjectURL(document.blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = document.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  /**
   * 缩放控制
   */
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* 头部工具栏 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 truncate max-w-md">
                {document.fileName}
              </h3>
              <p className="text-xs text-slate-500">
                {formatFileSize(document.blob.size)}
                {document.recordData && (
                  <span className="ml-2">
                    • 索引: {document.dataIndex + 1}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 缩放控制 */}
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="缩小"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700 min-w-[60px] text-center">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="放大"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                title="重置缩放"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* 分隔线 */}
            <div className="h-6 w-px bg-slate-200 mx-1" />

            {/* 下载按钮 */}
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载
            </button>

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden bg-slate-50">
          {isLoading ? (
            // 加载状态
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                <p className="text-lg font-medium mb-2">正在加载文档...</p>
                <p className="text-sm">请稍候</p>
              </div>
            </div>
          ) : error ? (
            // 错误状态
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-red-400">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">加载失败</p>
                <p className="text-sm mb-4">{error}</p>
                <button
                  onClick={loadDocument}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  重试
                </button>
              </div>
            </div>
          ) : htmlContent ? (
            // 预览内容
            <div
              ref={previewRef}
              className="flex-1 overflow-auto p-8"
              style={{ transformOrigin: 'top center' }}
            >
              <div
                className="bg-white shadow-lg rounded-lg p-8 mx-auto"
                style={{
                  maxWidth: '800px',
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center'
                }}
              >
                <div
                  className="prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            </div>
          ) : (
            // 空状态
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">无法预览此文档</p>
                <p className="text-sm mt-2">请下载后查看</p>
              </div>
            </div>
          )}
        </div>

        {/* 底部信息栏 */}
        {document.recordData && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-600">
              <span className="font-medium">文档数据：</span>
              <span className="ml-2">
                {Object.entries(document.recordData).slice(0, 5).map(([k, v], i) => (
                  <span key={k} className="inline-flex items-center">
                    {i > 0 && <span className="mx-1 text-slate-300">•</span>}
                    <span className="text-slate-700">{k}:</span>
                    <span className="text-slate-500 ml-1">{String(v)}</span>
                  </span>
                ))}
                {Object.keys(document.recordData).length > 5 && (
                  <span className="text-slate-400 ml-2">
                    ...等 {Object.keys(document.recordData).length} 个字段
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;
