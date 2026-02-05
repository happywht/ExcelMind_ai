/**
 * 模板列表组件
 *
 * 显示已上传的模板列表
 *
 * @version 2.0.0
 */

import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Eye,
  Plus,
  Search,
  Filter,
  Play // Added icon
} from 'lucide-react';
import { TemplateMetadata } from '../../services/templateAPI'; // Keeping this for type, or should verify type
// import { templateAPI } from '../../services/templateAPI'; // Remove legacy API
import { templateStorage } from '../../services/templateStorage';
import StatusIndicator from '../Shared/StatusIndicator';

interface TemplateListProps {
  onSelectTemplate: (templateId: string) => void;
  onUseTemplate?: (template: TemplateMetadata) => void; // New prop
  className?: string;
}

const TemplateList: React.FC<TemplateListProps> = ({ onSelectTemplate, onUseTemplate, className }) => {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showMenu, setShowMenu] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const allTemplates = await templateStorage.getAllTemplates();
      // Cast to match component state type if needed, or update state type
      // LocalTemplateMetadata is compatible enough for display
      setTemplates(allTemplates as unknown as TemplateMetadata[]);
    } catch (error) {
      logger.error('加载模板失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      await templateStorage.deleteTemplate(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
      setShowMenu(null);
    } catch (error) {
      logger.error('删除模板失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleDownload = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const buffer = await templateStorage.loadTemplateFile(templateId);
      if (!buffer) throw new Error('File not found');

      const template = templates.find(t => t.id === templateId);
      const fileName = template?.name ? `${template.name}.docx` : `template_${templateId}.docx`;

      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('下载模板失败:', error);
      alert('下载失败');
    }
    setShowMenu(null);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-12 ${className || ''}`}>
        <StatusIndicator status="loading" text="加载模板中..." />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* 搜索和筛选栏 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索模板..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-transparent border-none text-sm focus:outline-none cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? '所有分类' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 模板网格 */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">暂无模板</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer relative"
            >
              {/* 菜单按钮 */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(showMenu === template.id ? null : template.id);
                  }}
                  className="absolute top-0 right-0 p-1.5 hover:bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-slate-500" />
                </button>

                {/* 下拉菜单 */}
                {showMenu === template.id && (
                  <div className="absolute right-0 top-8 z-10 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[150px]">
                    {onUseTemplate && (
                      <button
                        onClick={() => {
                          setShowMenu(null);
                          onUseTemplate(template);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 text-emerald-600 flex items-center gap-2 font-medium"
                      >
                        <Play className="w-4 h-4" />
                        立即使用
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowMenu(null);
                        onSelectTemplate(template.id);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4 text-slate-400" />
                      查看详情
                    </button>
                    <button
                      onClick={(e) => handleDownload(template.id, e)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                      下载
                    </button>
                    <button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2">
                      <Edit className="w-4 h-4 text-slate-400" />
                      编辑
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={(e) => handleDelete(template.id, e)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </button>
                  </div>
                )}
              </div>

              {/* 模板图标 */}
              <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-lg mb-3">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>

              {/* 模板信息 */}
              <h4 className="font-semibold text-slate-800 mb-1 truncate">
                {template.name}
              </h4>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                {template.description}
              </p>

              {/* 标签 */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                  {template.category}
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                  {template.placeholderCount} 个变量
                </span>
              </div>

              {/* 状态和版本 */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>v{template.version}</span>
                <span>{template.usageCount || 0} 次使用</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateList;
