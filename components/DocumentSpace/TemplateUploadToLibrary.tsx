/**
 * 上传模板到库组件
 * 用于上传和保存新模板到本地库
 */

import React, { useState } from 'react';
import { X, Upload, FileText, Tag, FolderOpen } from 'lucide-react';
import { templateStorage } from '../../services/templateStorage';
import { createTemplateFile } from '../../services/templateService';

interface TemplateUploadToLibraryProps {
    onClose: () => void;
    onSuccess: () => void;
}

const TemplateUploadToLibrary: React.FC<TemplateUploadToLibraryProps> = ({
    onClose,
    onSuccess
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState('');
    const [uploading, setUploading] = useState(false);

    // 处理文件选择
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.name.endsWith('.docx')) {
            setFile(selectedFile);
            // 自动填充名称
            if (!name) {
                setName(selectedFile.name.replace('.docx', ''));
            }
        } else {
            alert('请选择.docx格式的Word文档');
        }
    };

    // 处理上传
    const handleUpload = async () => {
        if (!file || !name.trim()) {
            alert('请选择文件并输入模板名称');
            return;
        }

        try {
            setUploading(true);

            // 解析模板以获取占位符
            const templateFile = await createTemplateFile(file);

            // 保存到库
            await templateStorage.saveTemplate(file, {
                name: name.trim(),
                fileName: file.name,
                description: description.trim() || undefined,
                category: category.trim() || undefined,
                tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
                placeholders: templateFile.placeholders
            });

            alert('模板上传成功!');
            onSuccess();
        } catch (error) {
            console.error('[TemplateUploadToLibrary] Upload failed:', error);
            alert('上传失败,请重试');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
                {/* 头部 */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">上传模板到库</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-6 space-y-4">
                    {/* 文件选择 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            选择模板文件 *
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".docx"
                                onChange={handleFileChange}
                                className="hidden"
                                id="template-file-input"
                            />
                            <label
                                htmlFor="template-file-input"
                                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all cursor-pointer"
                            >
                                <Upload className="w-5 h-5 text-slate-400" />
                                <span className="text-slate-600">
                                    {file ? file.name : '点击选择.docx文件'}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* 模板名称 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            模板名称 *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例如: 销售合同模板"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    {/* 描述 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            描述
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="简要描述这个模板的用途..."
                            rows={3}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* 分类 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <FolderOpen className="w-4 h-4 inline mr-1" />
                            分类
                        </label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="例如: 合同, 报告, 通知"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    {/* 标签 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Tag className="w-4 h-4 inline mr-1" />
                            标签
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="用逗号分隔,例如: 销售, 合同, 标准"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            多个标签请用逗号分隔
                        </p>
                    </div>
                </div>

                {/* 底部按钮 */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={uploading || !file || !name.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 hover:shadow-lg transition-all disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                上传中...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                上传到库
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TemplateUploadToLibrary;
