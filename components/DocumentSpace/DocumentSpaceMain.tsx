/**
 * DocumentSpace右侧主内容区组件
 *
 * 功能：
 * - Tab导航
 * - 模板预览
 * - 数据预览
 * - 映射编辑器
 * - 文档列表
 *
 * @version 3.0.0 - Zustand状态管理版本
 *
 * 主要变更:
 * - 使用Zustand hooks获取状态
 * - Props从11个减少到5个（仅保留回调函数）
 * - 所有状态从Zustand store获取
 */

import React, { useMemo, useState } from 'react';
import {
  FileText,
  Table,
  GitBranch,
  Eye,
  FileDown,
  ChevronRight,
  Library
} from 'lucide-react';
import {
  TemplateFile,
  MappingScheme,
  GeneratedDocument
} from '../../types/documentTypes';
import { useDocumentSpace } from '../../stores/documentSpaceStore';
import { DocumentSpaceTab, PerformanceMetrics, TabConfig } from './types';

import TemplatePreview from './TemplatePreview';
import DataPreview from './DataPreview';
import MappingEditor from './MappingEditor';
import DocumentList from './DocumentList';
import DocumentPreview from './DocumentPreview';
import TemplateLibrary from './TemplateLibrary';
import TemplateUploadToLibrary from './TemplateUploadToLibrary';
import { LocalTemplateMetadata } from '../../types/templateStorage';
import { createTemplateFile } from '../../services/templateService';
import { templateStorage } from '../../services/templateStorage';

interface DocumentSpaceMainProps {
  onTabChange: (tab: DocumentSpaceTab) => void;
  onDocSelect: (doc: GeneratedDocument | null) => void;
  onSheetChange: (sheetName: string) => void;
  onTemplateFileChange: (templateFile: TemplateFile) => void;
}

/**
 * DocumentSpaceMain组件
 *
 * 使用Zustand hooks获取状态，减少props传递
 */
const DocumentSpaceMain: React.FC<DocumentSpaceMainProps> = ({
  onTabChange,
  onDocSelect,
  onSheetChange,
  onTemplateFileChange
}) => {
  // ===== 从Zustand Store获取状态 =====

  const {
    // UI状态
    activeTab,
    selectedDoc,

    // 文件状态
    templateFile,
    excelData,

    // 映射状态
    mappingScheme,

    // 文档状态
    generatedDocs,

    // 性能指标
    performanceMetrics
  } = useDocumentSpace();

  // 模板上传弹窗状态
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // 处理从模板库使用模板
  const handleUseTemplateFromLibrary = async (templateMetadata: LocalTemplateMetadata) => {
    try {
      // 从存储加载模板文件数据
      const arrayBuffer = await templateStorage.loadTemplateFile(templateMetadata.id);

      if (!arrayBuffer) {
        console.error('[DocumentSpaceMain] Failed to load template file');
        return;
      }

      // 创建File对象
      const file = new File([arrayBuffer], templateMetadata.fileName, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // 创建TemplateFile对象
      const template = await createTemplateFile(file);

      // 设置为当前模板文件
      onTemplateFileChange(template);

      // 自动跳转到upload Tab
      onTabChange('upload');

      // 显示成功提示（可选）
      console.log('[DocumentSpaceMain] Template loaded from library:', templateMetadata.name);
    } catch (error) {
      console.error('[DocumentSpaceMain] Failed to use template from library:', error);
    }
  };

  // 处理上传模板到库
  const handleUploadTemplateToLibrary = () => {
    setShowUploadDialog(true);
  };

  // 处理上传成功
  const handleUploadSuccess = () => {
    setShowUploadDialog(false);
    // 可以在这里刷新模板库
  };

  // Tab配置
  const tabs: TabConfig[] = [
    {
      id: 'templates',
      label: '模板库',
      icon: Library
    },
    {
      id: 'template',
      label: '模板预览',
      icon: FileText,
      disabled: !templateFile
    },
    {
      id: 'data',
      label: '数据预览',
      icon: Table,
      disabled: !excelData
    },
    {
      id: 'mapping',
      label: '映射方案',
      icon: GitBranch,
      disabled: !mappingScheme
    },
    {
      id: 'generate',
      label: '生成文档',
      icon: FileDown,
      disabled: generatedDocs.length === 0,
      badge: generatedDocs.length > 0 ? generatedDocs.length : undefined
    }
  ];

  // 当前可用的Tab
  const availableTabs = useMemo(() => {
    return tabs.filter(tab => activeTab === tab.id || !tab.disabled);
  }, [tabs, activeTab]);

  // 渲染Tab内容
  const renderTabContent = () => {
    // 🔍 调试日志：追踪Tab渲染状态
    console.log('[DocumentSpaceMain] Rendering tab:', activeTab, {
      hasTemplateFile: !!templateFile,
      hasExcelData: !!excelData,
      templateFileName: templateFile?.name,
      excelDataFileName: excelData?.fileName,
      currentSheet: excelData?.currentSheetName
    });

    switch (activeTab) {
      case 'templates':
        return (
          <TemplateLibrary
            onUseTemplate={handleUseTemplateFromLibrary}
            onUploadTemplate={handleUploadTemplateToLibrary}
          />
        );

      case 'template':
        // ✅ 修复：添加更详细的条件检查
        if (!templateFile) {
          console.warn('[DocumentSpaceMain] Template tab active but no template file');
          return renderEmptyState('模板', FileText, '请先上传Word模板文件');
        }
        console.log('[DocumentSpaceMain] Rendering TemplatePreview with:', templateFile.name);
        return <TemplatePreview templateFile={templateFile} />;

      case 'data':
        // ✅ 修复：添加更详细的条件检查
        if (!excelData) {
          console.warn('[DocumentSpaceMain] Data tab active but no excel data');
          return renderEmptyState('数据', Table, '请先上传Excel数据文件');
        }
        console.log('[DocumentSpaceMain] Rendering DataPreview with:', excelData.fileName);
        return (
          <DataPreview
            excelData={excelData}
            currentSheetName={excelData.currentSheetName}
            onSheetChange={onSheetChange}
          />
        );

      case 'mapping':
        return mappingScheme ? (
          <MappingEditor
            mappingScheme={mappingScheme}
            templatePlaceholders={templateFile?.placeholders || []}
            excelHeaders={excelData ? Object.keys(excelData.sheets[excelData.currentSheetName]?.[0] || {}) : []}
            onMappingChange={() => {}}
          />
        ) : (
          renderEmptyState('映射方案', GitBranch, '请先生成映射方案')
        );

      case 'generate':
        return generatedDocs.length > 0 ? (
          <DocumentList
            documents={generatedDocs}
            selectedDoc={selectedDoc}
            onSelect={onDocSelect}
            onDownload={(doc) => {
              // 处理下载
              const url = URL.createObjectURL(doc.blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = doc.fileName;
              a.click();
              URL.revokeObjectURL(url);
            }}
            onDownloadAll={async () => {
              // 处理批量下载
              const JSZip = (await import('jszip')).default;
              const zip = new JSZip();
              generatedDocs.forEach(doc => {
                zip.file(doc.fileName, doc.blob);
              });
              const content = await zip.generateAsync({ type: 'blob' });
              const url = URL.createObjectURL(content);
              const a = document.createElement('a');
              a.href = url;
              a.download = `批量文档_${Date.now()}.zip`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            performanceMetrics={performanceMetrics}
          />
        ) : (
          renderEmptyState('生成文档', FileDown, '请先生成文档')
        );

      default:
        return renderDefaultState();
    }
  };

  // 渲染空状态
  const renderEmptyState = (
    title: string,
    Icon: React.ComponentType<{ className?: string }>,
    message: string
  ) => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-slate-400">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-4">
          <Icon className="w-10 h-10 opacity-50" />
        </div>
        <h3 className="text-lg font-medium text-slate-600 mb-2">{title}</h3>
        <p className="text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );

  // 渲染默认状态
  const renderDefaultState = () => (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-100 to-red-100 rounded-full mb-6">
          <FileText className="w-12 h-12 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-700 mb-3">
          智能文档填充
        </h2>
        <p className="text-slate-500 mb-6 leading-relaxed">
          上传Word模板和Excel数据，AI将自动生成映射方案并批量生成文档
        </p>
        <div className="space-y-3 text-sm text-left bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs">1</div>
            <div>
              <p className="font-medium text-slate-700">上传Word模板</p>
              <p className="text-slate-500">支持.docx格式，占位符使用双花括号格式，如：&lbrace;&lbrace;字段名&rbrace;&rbrace;</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-xs">2</div>
            <div>
              <p className="font-medium text-slate-700">上传Excel数据</p>
              <p className="text-slate-500">支持.xlsx/.xls/.csv格式，可包含多个工作表</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">3</div>
            <div>
              <p className="font-medium text-slate-700">AI智能映射</p>
              <p className="text-slate-500">输入自然语言指令，AI自动生成映射方案</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">4</div>
            <div>
              <p className="font-medium text-slate-700">批量生成文档</p>
              <p className="text-slate-500">一键生成所有文档，支持单个或批量下载</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 文档预览弹窗 */}
      {selectedDoc && (
        <DocumentPreview
          document={selectedDoc}
          onClose={() => onDocSelect(null)}
        />
      )}

      {/* 模板上传弹窗 */}
      {showUploadDialog && (
        <TemplateUploadToLibrary
          onClose={() => setShowUploadDialog(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Tab导航 */}
        <div className="border-b border-slate-200 bg-white">
          <div className="flex items-center gap-1 px-6 py-3">
            {availableTabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && onTabChange(tab.id)}
                  disabled={tab.disabled}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100'
                    }
                    ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`
                      ml-1 px-2 py-0.5 rounded-full text-xs font-bold
                      ${isActive ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-600'}
                    `}>
                      {tab.badge}
                    </span>
                  )}
                  {idx < availableTabs.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden">
          {renderTabContent()}
        </div>
      </div>
    </>
  );
};

export default DocumentSpaceMain;
