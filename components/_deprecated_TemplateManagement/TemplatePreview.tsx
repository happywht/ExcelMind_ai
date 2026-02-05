/**
 * 模板预览组件
 *
 * 显示模板内容，高亮变量占位符，支持缩放和下载
 *
 * @version 2.0.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface TemplatePreviewProps {
  template: {
    content?: string;
    previewHtml?: string;
    placeholders?: Array<{
      key: string;
      rawPlaceholder: string;
      dataType: string;
      required: boolean;
    }>;
  } | null;
  data?: Record<string, any>;
  className?: string;
  onDownload?: () => void;
  onRefresh?: () => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  data = {},
  className,
  onDownload,
  onRefresh,
}) => {
  const [zoom, setZoom] = useState(100);
  const [showPlaceholders, setShowPlaceholders] = useState(true);
  const [showData, setShowData] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理缩放
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  // 渲染带高亮的 HTML
  const renderContent = useMemo(() => {
    if (!template?.previewHtml) {
      return (
        <div className="flex items-center justify-center h-full text-slate-400">
          <div className="text-center">
            <p className="text-sm">暂无预览</p>
            <p className="text-xs mt-1">请先上传模板文件</p>
          </div>
        </div>
      );
    }

    let html = template.previewHtml;

    // 高亮占位符
    if (showPlaceholders && template.placeholders) {
      template.placeholders.forEach((placeholder) => {
        const regex = new RegExp(
          `{${placeholder.rawPlaceholder}}`,
          'g'
        );
        const bgColor = placeholder.required
          ? 'bg-amber-100'
          : 'bg-blue-100';
        const textColor = placeholder.required
          ? 'text-amber-800'
          : 'text-blue-800';
        html = html.replace(
          regex,
          `<span class="${bgColor} ${textColor} px-1 py-0.5 rounded text-xs font-mono border border-${placeholder.required ? 'amber' : 'blue'}-300" data-placeholder="${placeholder.key}">{${placeholder.rawPlaceholder}}</span>`
        );
      });
    }

    // 替换数据
    if (showData && Object.keys(data).length > 0) {
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{${key}}`, 'g');
        html = html.replace(regex, String(value));
      });
    }

    return html;
  }, [template, showPlaceholders, showData, data]);

  // 全屏切换
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // 下载预览
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    }
  };

  // 刷新预览
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col bg-slate-50 border border-slate-200 rounded-xl overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
    >
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-800">模板预览</h3>

          {/* 缩放控制 */}
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              aria-label="缩小"
            >
              <ZoomOut className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs text-slate-600 min-w-[50px] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              aria-label="放大"
            >
              <ZoomIn className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors ml-1"
              type="button"
              aria-label="重置缩放"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 显示选项 */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => setShowPlaceholders((prev) => !prev)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                showPlaceholders
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
              type="button"
            >
              <Eye className="w-3.5 h-3.5" />
              占位符
            </button>
            <button
              onClick={() => setShowData((prev) => !prev)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                showData
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
              type="button"
            >
              <Eye className="w-3.5 h-3.5" />
              数据
            </button>
          </div>

          {/* 操作按钮 */}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
              type="button"
              aria-label="刷新预览"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </button>
          )}
          {onDownload && (
            <button
              onClick={handleDownload}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
              type="button"
              aria-label="下载预览"
            >
              <Download className="w-4 h-4 text-slate-600" />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            type="button"
            aria-label={isFullscreen ? '退出全屏' : '全屏'}
          >
            <Maximize2 className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* 预览内容区 */}
      <div className="flex-1 overflow-auto bg-white">
        <div
          className="min-h-full p-8 transition-transform origin-top"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          <div
            className="bg-white shadow-lg rounded-lg mx-auto"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '25mm',
              fontSize: '11pt',
              lineHeight: '1.6',
            }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: renderContent }}
              className="prose prose-sm max-w-none"
            />

            {/* 占位符图例 */}
            {showPlaceholders && template?.placeholders && template.placeholders.length > 0 && (
              <div className="mt-8 pt-4 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">占位符图例：</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></span>
                    <span className="text-xs text-slate-600">必填字段</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span>
                    <span className="text-xs text-slate-600">可选字段</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>
            变量: {template?.placeholders?.length || 0}
          </span>
          <span>
            已映射: {Object.keys(data).length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            缩放: {zoom}%
          </span>
          <span>
            {isFullscreen ? '按 ESC 退出全屏' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
