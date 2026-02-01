/**
 * 模板库组件
 * 显示和管理本地保存的模板
 */

import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, Calendar, FileType } from 'lucide-react';
import { LocalTemplateMetadata } from '../../types/templateStorage';
import { templateStorage } from '../../services/templateStorage';

interface TemplateLibraryProps {
    onUseTemplate: (template: LocalTemplateMetadata) => void;
    onUploadTemplate: () => void;
}

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
    onUseTemplate,
    onUploadTemplate
}) => {
    const [templates, setTemplates] = useState<LocalTemplateMetadata[]>([]);
    const [loading, setLoading] = useState(true);

    // 加载模板列表
    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await templateStorage.getAllTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('[TemplateLibrary] Failed to load templates:', error);
        } finally {
            setLoading(false);
        }
    };

    // 删除模板
    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!confirm('确定要删除这个模板吗?')) {
            return;
        }

        try {
            await templateStorage.deleteTemplate(id);
            await loadTemplates();
        } catch (error) {
            console.error('[TemplateLibrary] Failed to delete template:', error);
            alert('删除失败,请重试');
        }
    };

    // 格式化文件大小
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // 格式化日期
    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-slate-400">加载中...</div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            {/* 头部 */}
            <div className="p-6 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">模板库</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            管理和使用您保存的Word模板
                        </p>
                    </div>
                    <button
                        onClick={onUploadTemplate}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 hover:shadow-lg transition-all"
                    >
                        <Upload className="w-4 h-4" />
                        上传模板
                    </button>
                </div>
            </div>

            {/* 模板列表 */}
            <div className="flex-1 overflow-y-auto p-6">
                {templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-600 mb-2">
                            暂无模板
                        </h3>
                        <p className="text-sm text-slate-400 mb-6">
                            点击上方按钮上传您的第一个模板
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                onClick={() => onUseTemplate(template)}
                                className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer group"
                            >
                                {/* 模板图标 */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-orange-500" />
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(template.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                                        title="删除模板"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>

                                {/* 模板信息 */}
                                <h3 className="font-medium text-slate-800 mb-1 truncate">
                                    {template.name}
                                </h3>

                                {template.description && (
                                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                                        {template.description}
                                    </p>
                                )}

                                {/* 元数据 */}
                                <div className="space-y-1 text-xs text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <FileType className="w-3 h-3" />
                                        <span>{template.fileName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        <span>{formatDate(template.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>大小: {formatFileSize(template.fileSize)}</span>
                                    </div>
                                    {template.placeholders && template.placeholders.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span>{template.placeholders.length} 个占位符</span>
                                        </div>
                                    )}
                                </div>

                                {/* 标签 */}
                                {template.tags && template.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {template.tags.slice(0, 3).map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TemplateLibrary;
