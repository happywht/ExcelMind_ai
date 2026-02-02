/**
 * 模板预览组件
 *
 * 功能：
 * - 显示HTML预览
 * - 占位符高亮显示
 * - 占位符列表
 * - 模板统计信息
 *
 * @version 2.0.0
 */

import React, { useMemo } from 'react';
import {
  FileText,
  Hash,
  CheckCircle,
  AlertCircle,
  Search,
  Copy,
  Download
} from 'lucide-react';
import { TemplateFile } from '../../types/documentTypes';

interface TemplatePreviewProps {
  templateFile: TemplateFile;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ templateFile }) => {

  // 转义正则表达式（必须在useMemo之前定义）
  const escapeRegex = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // 高亮占位符
  const highlightedPreview = useMemo(() => {
    let html = templateFile.htmlPreview;

    // 替换换行符为<br>
    html = html.replace(/\n/g, '<br>');

    // 高亮占位符
    templateFile.placeholders.forEach(placeholder => {
      const regex = new RegExp(escapeRegex(placeholder), 'g');
      html = html.replace(
        regex,
        `<span class="bg-yellow-200 text-orange-700 px-2 py-1 rounded font-medium border-2 border-orange-300">${placeholder}</span>`
      );
    });

    return html;
  }, [templateFile]);

  // 复制占位符列表
  const copyPlaceholders = () => {
    const text = templateFile.placeholders.join('\n');
    navigator.clipboard.writeText(text);
  };

  // 转义正则表达式

  // 获取模板大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 头部信息 */}
      <div className="flex-shrink-0 bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-orange-500 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{templateFile.name}</h2>
                <p className="text-base text-slate-500">Word模板文件</p>
              </div>
            </div>

            {/* 统计信息 */}
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-xs text-slate-500">占位符数量</p>
                  <p className="text-lg font-bold text-slate-800">
                    {templateFile.placeholders.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-500">文件大小</p>
                  <p className="text-lg font-bold text-slate-800">
                    {formatFileSize(templateFile.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-slate-500">模板ID</p>
                  <p className="text-sm font-mono text-slate-700">
                    {templateFile.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 占位符列表 */}
        <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col">
          <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                占位符列表
              </h3>
              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">
                {templateFile.placeholders.length}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索占位符..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {templateFile.placeholders.map((placeholder, idx) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-lg border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <code className="text-base font-mono text-orange-600 font-medium">
                    {placeholder}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(placeholder)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-shrink-0 p-4 border-t border-slate-200 bg-white">
            <button
              onClick={copyPlaceholders}
              className="w-full py-2.5 bg-orange-500 text-white rounded-lg text-base font-medium hover:bg-orange-600 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              复制全部占位符
            </button>
          </div>
        </div>

        {/* 预览区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-700">模板预览</h3>
            <div className="text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-200 border-2 border-orange-300 rounded"></span>
                占位符
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-white">
            <div
              className="prose prose-base max-w-none"
              dangerouslySetInnerHTML={{ __html: highlightedPreview }}
              style={{
                lineHeight: '1.75',
                fontSize: '16px',
                color: '#334155'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
