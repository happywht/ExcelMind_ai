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
  Download,
  Eye
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

  const [searchTerm, setSearchTerm] = React.useState('');

  // 过滤占位符
  const filteredPlaceholders = useMemo(() => {
    if (!searchTerm) return templateFile.placeholders;
    return templateFile.placeholders.filter(p =>
      p.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templateFile.placeholders, searchTerm]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 头部信息 */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 text-lg">{templateFile.name}</span>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span>Word 模板</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>{templateFile.placeholders.length} 个占位符</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>{formatFileSize(templateFile.size)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 占位符列表 */}
        <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col">
          <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                占位符列表
              </h3>
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {filteredPlaceholders.length}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索占位符..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {filteredPlaceholders.length > 0 ? (
              filteredPlaceholders.map((placeholder, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-lg border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-orange-600 font-medium break-all">
                      {placeholder}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(placeholder)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-orange-500"
                      title="复制"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                未找到匹配的占位符
              </div>
            )}
          </div>

          <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
            <button
              onClick={copyPlaceholders}
              className="w-full py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              复制全部占位符
            </button>
          </div>
        </div>

        {/* 预览区 - 拟真文档样式 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
          <div className="flex-shrink-0 px-6 py-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm flex items-center justify-between z-10">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              文档预览
            </h3>
            <div className="text-xs text-slate-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-yellow-200 border border-orange-300 rounded-sm"></span>
                高亮显示
              </span>
              <span className="text-slate-300">|</span>
              <span>仅供参考，格式以最终生成的文档为准</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 relative">
            {/* 纸张效果容器 */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-xl min-h-[297mm] p-[25mm] relative ">
              <div
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: highlightedPreview }}
                style={{
                  lineHeight: '1.6',
                  fontSize: '10.5pt', // 五号字大小
                  color: '#334155',
                  fontFamily: '"Times New Roman", "SimSun", serif' //宋体/衬线体更像文档
                }}
              />
            </div>
            <div className="h-10"></div>{/* 底部留白 */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
