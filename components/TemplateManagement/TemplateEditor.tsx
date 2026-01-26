/**
 * 模板编辑器组件
 *
 * 集成模板上传、变量映射和预览功能
 *
 * @version 2.0.0
 */

import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  X,
  FileText,
  Settings,
  Eye,
  Upload as UploadIcon,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { templateAPI } from '../../services/templateAPI';
import TemplateUpload from './TemplateUpload';
import VariableMapping from './VariableMapping';
import TemplatePreview from './TemplatePreview';
import TemplateVersionHistory from './TemplateVersionHistory';
import {
  VariableMapping as VariableMappingType,
  TemplateUploadProgress,
  TemplatePlaceholder,
  TemplateMetadata,
} from './types';

interface TemplateEditorProps {
  templateId?: string;
  onSave?: (template: TemplateMetadata) => void;
  onCancel?: () => void;
  className?: string;
  mode?: 'create' | 'edit';
}

type TabType = 'upload' | 'mapping' | 'preview' | 'history';

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  templateId,
  onSave,
  onCancel,
  className,
  mode = 'create',
}) => {
  // 状态管理
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState<TemplatePlaceholder[]>([]);
  const [mappings, setMappings] = useState<VariableMappingType[]>([]);
  const [uploadProgress, setUploadProgress] = useState<TemplateUploadProgress | null>(null);
  const [excelFields, setExcelFields] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateMetadata, setTemplateMetadata] = useState<Partial<TemplateMetadata>>({
    name: '',
    description: '',
    category: '',
    tags: [],
  });

  // 加载模板数据（编辑模式）
  useEffect(() => {
    if (mode === 'edit' && templateId) {
      loadTemplate(templateId);
    }
  }, [mode, templateId]);

  const loadTemplate = async (id: string) => {
    try {
      const template = await templateAPI.getTemplate(id);
      setTemplateMetadata({
        name: template.name,
        description: template.description,
        category: template.category,
        tags: template.tags,
      });
      setPlaceholders(template.metadata.placeholders);
      setPreviewData({});
      setActiveTab('mapping');
    } catch (err) {
      setError('加载模板失败');
      logger.error(err);
    }
  };

  // 处理文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    setTemplateFile(file);
    setError(null);

    try {
      // 提取占位符
      setUploadProgress({
        stage: 'processing',
        progress: 50,
        message: '提取变量中...',
      });

      const extractedPlaceholders = await templateAPI.extractPlaceholders(file);
      setPlaceholders(extractedPlaceholders);

      // 初始化映射
      const initialMappings = extractedPlaceholders.map((p) => ({
        placeholder: p.key,
        excelColumn: '',
        dataType: p.dataType,
        required: p.required,
      }));
      setMappings(initialMappings);

      // 自动建议文件名
      if (!templateMetadata.name) {
        setTemplateMetadata((prev) => ({
          ...prev,
          name: file.name.replace('.docx', ''),
        }));
      }

      setUploadProgress({
        stage: 'completed',
        progress: 100,
        message: '上传成功！',
      });

      // 切换到映射标签页
      setTimeout(() => {
        setActiveTab('mapping');
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      setUploadProgress({
        stage: 'error',
        progress: 0,
        message: err instanceof Error ? err.message : '上传失败',
      });
    }
  }, [templateMetadata.name]);

  // 处理提取变量
  const handleExtractVariables = useCallback(async (file: File) => {
    // 变量提取已在 handleFileUpload 中处理
  }, []);

  // 智能映射
  const handleAutoMap = useCallback(() => {
    if (excelFields.length === 0) {
      alert('请先上传 Excel 文件或添加数据字段');
      return;
    }

    const autoMapped = mappings.map((mapping) => {
      // 简单的模糊匹配算法
      const placeholder = mapping.placeholder.toLowerCase();
      const bestMatch = excelFields.find((field) => {
        const fieldLower = field.toLowerCase();
        return (
          fieldLower === placeholder ||
          fieldLower.includes(placeholder) ||
          placeholder.includes(fieldLower)
        );
      });

      return {
        ...mapping,
        excelColumn: bestMatch || mapping.excelColumn,
      };
    });

    setMappings(autoMapped);
  }, [excelFields, mappings]);

  // 保存模板
  const handleSave = async () => {
    if (!templateFile && mode === 'create') {
      setError('请先上传模板文件');
      return;
    }

    if (!templateMetadata.name) {
      setError('请输入模板名称');
      return;
    }

    if (!templateMetadata.category) {
      setError('请选择分类');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (mode === 'create' && templateFile) {
        const response = await templateAPI.uploadTemplate(templateFile, {
          name: templateMetadata.name,
          description: templateMetadata.description || '',
          category: templateMetadata.category,
          tags: templateMetadata.tags,
          mappings: { placeholders },
        });

        if (onSave) {
          onSave(response);
        }
      } else if (mode === 'edit' && templateId) {
        await templateAPI.updateTemplate(templateId, {
          name: templateMetadata.name,
          description: templateMetadata.description,
          category: templateMetadata.category,
          tags: templateMetadata.tags,
        });

        if (onSave) {
          onSave({
            id: templateId,
            ...templateMetadata,
            status: 'active',
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            fileSize: templateFile?.size || 0,
            placeholderCount: placeholders.length,
            complexity: placeholders.length > 10 ? 'complex' : 'simple',
            hasLoops: false,
            hasConditionals: false,
            hasTables: false,
            pageCount: 1,
            wordCount: 0,
          } as TemplateMetadata);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 标签页配置
  const tabs: Array<{
    id: TabType;
    label: string;
    icon: any;
    disabled?: boolean;
    badge?: number;
  }> = [
    {
      id: 'upload',
      label: '上传模板',
      icon: UploadIcon,
    },
    {
      id: 'mapping',
      label: '变量映射',
      icon: Settings,
      disabled: placeholders.length === 0,
      badge: mappings.filter((m) => m.excelColumn).length,
    },
    {
      id: 'preview',
      label: '预览',
      icon: Eye,
      disabled: placeholders.length === 0,
    },
    {
      id: 'history',
      label: '版本历史',
      icon: FileText,
      disabled: mode === 'create',
    },
  ];

  return (
    <div className={cn('bg-white border border-slate-200 rounded-xl overflow-hidden', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">
          {mode === 'create' ? '创建模板' : '编辑模板'}
        </h2>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              type="button"
            >
              <X className="w-4 h-4" />
              取消
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || (mode === 'create' && !templateFile)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              saving || (mode === 'create' && !templateFile)
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            )}
            type="button"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存
              </>
            )}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">错误</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-100 rounded transition-colors"
            type="button"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* 标签页导航 */}
      <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative',
                isActive && 'text-emerald-600',
                !isActive && !isDisabled && 'text-slate-600 hover:text-slate-800 hover:bg-slate-50',
                isDisabled && 'text-slate-400 cursor-not-allowed'
              )}
              type="button"
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs',
                    isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {tab.badge}/{placeholders.length}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {/* 上传标签页 */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <TemplateUpload
              onUpload={handleFileUpload}
              onExtractVariables={handleExtractVariables}
            />

            {/* 元数据表单 */}
            {templateFile && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800">模板信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      模板名称 *
                    </label>
                    <input
                      type="text"
                      value={templateMetadata.name}
                      onChange={(e) =>
                        setTemplateMetadata((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="输入模板名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      分类 *
                    </label>
                    <select
                      value={templateMetadata.category}
                      onChange={(e) =>
                        setTemplateMetadata((prev) => ({ ...prev, category: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">选择分类</option>
                      <option value="合同">合同</option>
                      <option value="报告">报告</option>
                      <option value="证书">证书</option>
                      <option value="信函">信函</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    描述
                  </label>
                  <textarea
                    value={templateMetadata.description}
                    onChange={(e) =>
                      setTemplateMetadata((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="输入模板描述"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 变量映射标签页 */}
        {activeTab === 'mapping' && (
          <div className="space-y-6">
            {/* Excel 字段输入 */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Excel 数据字段（每行一个字段名）
              </label>
              <textarea
                value={excelFields.join('\n')}
                onChange={(e) => setExcelFields(e.target.value.split('\n').filter(Boolean))}
                rows={5}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                placeholder="例如：&#10;姓名&#10;身份证号&#10;联系电话"
              />
              <p className="text-xs text-slate-500 mt-2">
                已输入 {excelFields.length} 个字段
              </p>
            </div>

            {/* 变量映射 */}
            <VariableMapping
              variables={placeholders}
              dataFields={excelFields}
              mappings={mappings}
              onChange={setMappings}
              onAutoMap={handleAutoMap}
            />
          </div>
        )}

        {/* 预览标签页 */}
        {activeTab === 'preview' && (
          <TemplatePreview
            template={{
              placeholders,
              previewHtml: undefined,
            }}
            data={previewData}
          />
        )}

        {/* 版本历史标签页 */}
        {activeTab === 'history' && (
          <TemplateVersionHistory
            versions={[]}
            currentVersion="1.0.0"
          />
        )}
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          {placeholders.length > 0 && (
            <>
              <span>变量数量: {placeholders.length}</span>
              <span>必填: {placeholders.filter((p) => p.required).length}</span>
              <span>已映射: {mappings.filter((m) => m.excelColumn).length}</span>
            </>
          )}
        </div>
        {placeholders.length > 0 && (
          <div className="flex items-center gap-2">
            {mappings.filter((m) => m.excelColumn).length === placeholders.length ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600">映射完成</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-amber-600">需要完成映射</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateEditor;
