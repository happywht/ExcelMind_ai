/**
 * DocumentSpace左侧边栏组件
 *
 * 功能：
 * - 文件上传（模板和数据）
 * - 多Sheet选择和配置
 * - AI指令输入
 * - 操作按钮（生成映射、生成文档）
 * - 实时日志显示
 * - 性能监控小卡片
 *
 * @version 2.1.0 - 集成多Sheet支持
 */

import React, { ChangeEvent } from 'react';
import {
  Upload,
  FileText,
  Table,
  Wand2,
  Download,
  Loader2,
  FileEdit,
  AlertCircle,
  CheckCircle,
  Eye,
  Activity,
  Clock,
  Zap,
  Terminal
} from 'lucide-react';
import {
  TemplateFile,
  MappingScheme,
  GeneratedDocument,
  DocumentProcessingLog
} from '../../types/documentTypes';
import { PerformanceMetrics } from './types';
import SheetSelector from './SheetSelector';
import GenerationModeSelector from './GenerationModeSelector'; import { GenerationMode, AggregateConfig } from '../../types/documentTypes';
import CollapsibleSection from './CollapsibleSection';

interface DocumentSpaceSidebarProps {
  templateFile: TemplateFile | null;
  dataFile: File | null;
  excelData: any;
  userInstruction: string;
  mappingScheme: MappingScheme | null;
  generatedDocs: GeneratedDocument[];
  isProcessing: boolean;
  processingStage: string;
  progress: number;
  logs: DocumentProcessingLog[];
  performanceMetrics: PerformanceMetrics;
  primarySheet: string;
  enabledSheets: string[];
  onTemplateUpload: (file: File) => Promise<void>;
  onDataUpload: (file: File) => Promise<void>;
  onInstructionChange: (instruction: string) => void;
  onPrimarySheetChange: (sheet: string) => void;
  onEnabledSheetsChange: (sheets: string[]) => void;
  onGenerateMapping: () => void;
  onGenerateDocs: () => void;
  onDownloadDoc: (doc: GeneratedDocument) => void;
  generationMode: GenerationMode;
  aggregateConfig: AggregateConfig;
  availableFields: string[];
  onGenerationModeChange: (mode: GenerationMode) => void;
  onAggregateConfigChange: (config: AggregateConfig) => void;
  onDownloadAll: () => Promise<void>;
  onImportScheme?: (file: File) => Promise<void>;
}

const DocumentSpaceSidebar: React.FC<DocumentSpaceSidebarProps> = ({
  templateFile,
  dataFile,
  excelData,
  userInstruction,
  mappingScheme,
  generatedDocs,
  isProcessing,
  processingStage,
  progress,
  logs,
  performanceMetrics,
  primarySheet,
  enabledSheets,
  onTemplateUpload,
  onDataUpload,
  onInstructionChange,
  onPrimarySheetChange,
  onEnabledSheetsChange,
  onGenerateMapping,
  onGenerateDocs,
  onDownloadDoc,
  onDownloadAll,
  onImportScheme,
  generationMode,
  aggregateConfig,
  onAggregateConfigChange,
  availableFields,
  onGenerationModeChange,
  isCollapsed = false,
  onToggleCollapse
}) => {

  // 处理模板上传
  const handleTemplateChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onTemplateUpload(file);
    }
  };

  // 处理数据上传
  const handleDataChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onDataUpload(file);
    }
  };

  // 格式化时间
  const formatTime = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // 获取日志图标
  const getLogIcon = (status: DocumentProcessingLog['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  // 获取日志样式
  const getLogClassName = (status: DocumentProcessingLog['status']) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative group/sidebar">
      {/* 侧边栏头部 */}
      <div className={`bg-white border-b border-slate-200 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg flex-shrink-0 relative group">
              <FileEdit className="w-5 h-5 text-white" />
              {isCollapsed && (
                <div className="absolute left-full top-0 ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                  文档空间
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="text-lg font-bold text-slate-800">文档空间</h2>
                <p className="text-xs text-slate-500">智能文档填充工作台</p>
              </div>
            )}
          </div>

          {/* 折叠切换按钮 */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`text-slate-400 hover:text-emerald-500 hover:bg-slate-50 rounded-lg transition-colors flex-shrink-0 ${isCollapsed ? 'p-1 mt-2' : 'p-2'}`}
              title={isCollapsed ? "展开侧边栏" : "折叠侧边栏"}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {isCollapsed ? (
                  <Terminal className="w-4 h-4 rotate-180" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                )}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-4' : 'p-6'} space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent`}>


        {isCollapsed ? (
          <div className="flex flex-col items-center gap-6">
            {/* Template Upload Icon */}
            <div className="relative group">
              <label className="cursor-pointer w-10 h-10 flex items-center justify-center bg-orange-50 text-orange-500 hover:bg-orange-100 rounded-xl transition-colors">
                <input type="file" className="hidden" accept=".docx" onChange={handleTemplateChange} />
                <FileText className="w-5 h-5" />
              </label>
              <div className="absolute left-full top-0 ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                {templateFile ? '更换模板' : '上传模板'}
              </div>
              {templateFile && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
            </div>

            {/* Data Upload Icon */}
            <div className="relative group">
              <label className="cursor-pointer w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors">
                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleDataChange} />
                <Table className="w-5 h-5" />
              </label>
              <div className="absolute left-full top-0 ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                {dataFile ? '更换数据' : '上传数据'}
              </div>
              {dataFile && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
            </div>

            <div className="w-8 h-px bg-slate-200"></div>

            {/* Instruction Icon */}
            <div className="relative group">
              <div className="w-10 h-10 flex items-center justify-center bg-purple-50 text-purple-600 rounded-xl">
                <Wand2 className="w-5 h-5" />
              </div>
              <div className="absolute left-full top-0 ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                {userInstruction ? '指令已输入' : '展开以输入指令'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 mt-auto">
              <button
                onClick={onGenerateMapping}
                disabled={!templateFile || !excelData || isProcessing}
                className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed group relative"
              >
                {isProcessing && processingStage === 'ai_mapping' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                <div className="absolute left-full top-0 ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">生成映射</div>
              </button>

              <button
                onClick={onGenerateDocs}
                disabled={!mappingScheme || isProcessing}
                className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed group relative"
              >
                {isProcessing && processingStage === 'document_generation' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileEdit className="w-5 h-5" />}
                <div className="absolute left-full top-0 ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">生成文档</div>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 性能监控卡片 - 可折叠 */}
            {(performanceMetrics.templateUpload ||
              performanceMetrics.aiMapping ||
              performanceMetrics.documentGeneration) && (
                <CollapsibleSection
                  title="性能监控"
                  icon={<Activity className="w-4 h-4 text-blue-500" />}
                  defaultOpen={false}
                >
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200">
                    <div className="space-y-2 text-xs">
                      {performanceMetrics.templateUpload && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">模板解析</span>
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <span className="font-medium text-slate-800">
                              {formatTime(performanceMetrics.templateUpload)}
                            </span>
                          </div>
                        </div>
                      )}
                      {performanceMetrics.aiMapping && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">AI映射</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span className="font-medium text-slate-800">
                              {formatTime(performanceMetrics.aiMapping)}
                            </span>
                          </div>
                        </div>
                      )}
                      {performanceMetrics.documentGeneration && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">文档生成</span>
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-green-500" />
                            <span className="font-medium text-slate-800">
                              {formatTime(performanceMetrics.documentGeneration)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>
              )}

            {/* 进度条 */}
            {isProcessing && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <span className="text-sm font-medium text-blue-700">
                      {processingStage === 'template_upload' && '正在解析模板...'}
                      {processingStage === 'data_upload' && '正在读取数据...'}
                      {processingStage === 'ai_mapping' && 'AI正在生成映射...'}
                      {processingStage === 'ai_batch_processing' && 'AI 深度处理中...'}
                      {processingStage === 'document_generation' && '正在生成文档...'}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-blue-700">{progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 模板上传 - SmartExcel风格 */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div className="bg-slate-100 p-1.5 rounded-lg">
                  <FileText className="w-4 h-4 text-slate-500" />
                </div>
                Word模板文件
              </h3>
              <label className={`
            group relative flex items-center justify-center w-full h-24 
            border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
            ${templateFile
                  ? 'bg-emerald-50 border-emerald-300 hover:border-emerald-500'
                  : 'bg-slate-50/50 border-slate-200 hover:border-emerald-400 hover:bg-white'}
          `}>
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleTemplateChange}
                  className="hidden"
                  disabled={isProcessing}
                />

                {templateFile ? (
                  <div className="flex items-center gap-3 w-full px-4">
                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-slate-800 truncate">{templateFile.name}</p>
                      <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                        <CheckCircle className="w-3 h-3" />
                        {templateFile.placeholders.length} 个占位符
                      </p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-200/50 text-emerald-700">
                      <FileEdit className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-emerald-600 transition-colors">
                    <Upload className="w-6 h-6" />
                    <span className="text-sm font-medium">点击上传 Word 模板</span>
                  </div>
                )}
              </label>
            </div>

            {/* 数据上传 - SmartExcel风格 */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div className="bg-slate-100 p-1.5 rounded-lg">
                  <Table className="w-4 h-4 text-slate-500" />
                </div>
                Excel数据源
              </h3>
              <label className={`
            group relative flex items-center justify-center w-full h-24 
            border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
            ${dataFile
                  ? 'bg-emerald-50 border-emerald-300 hover:border-emerald-500'
                  : 'bg-slate-50/50 border-slate-200 hover:border-emerald-400 hover:bg-white'}
          `}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleDataChange}
                  className="hidden"
                  disabled={isProcessing}
                />

                {dataFile ? (
                  <div className="flex items-center gap-3 w-full px-4">
                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                      <Table className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-slate-800 truncate">{dataFile.name}</p>
                      <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                        <CheckCircle className="w-3 h-3" />
                        已加载
                      </p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-200/50 text-emerald-700">
                      <FileEdit className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-emerald-600 transition-colors">
                    <Upload className="w-6 h-6" />
                    <span className="text-sm font-medium">点击上传 Excel 数据</span>
                  </div>
                )}
              </label>
            </div>

            {/* 导入配置按钮 */}
            <div className="flex justify-end px-1 -mt-2">
              <label className="text-xs text-slate-500 hover:text-emerald-600 cursor-pointer flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-emerald-50" title="导入已保存的映射配置 (.ems)">
                <Upload className="w-3 h-3" />
                导入配置
                <input
                  type="file"
                  accept=".ems,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onImportScheme) {
                      onImportScheme(file);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>
            </div>

            {/* Sheet选择器 - 多Sheet支持 */}
            {excelData && excelData.sheets && Object.keys(excelData.sheets).length > 0 && (
              <SheetSelector
                sheets={excelData.sheets}
                primarySheet={primarySheet}
                onPrimarySheetChange={onPrimarySheetChange}
                enabledSheets={enabledSheets}
                onEnabledSheetsChange={onEnabledSheetsChange}
                disabled={isProcessing}
              />
            )}

            {/* AI指令 - SmartExcel风格 */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div className="bg-slate-100 p-1.5 rounded-lg">
                  <Wand2 className="w-4 h-4 text-slate-500" />
                </div>
                AI 智能指令
              </h3>
              <div className="relative group">
                <textarea
                  value={userInstruction}
                  onChange={(e) => onInstructionChange(e.target.value)}
                  placeholder="请输入处理指令，例如：&#10;“把销售额大于10万的产品信息填入模板，生成产品介绍文档”"
                  className="w-full h-32 px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 group-hover:bg-white"
                  disabled={isProcessing}
                />
                <div className="absolute right-3 bottom-3">
                  <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-400 group-hover:text-emerald-500 group-focus-within:text-emerald-600 transition-colors">
                    <Terminal className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Generation Mode Selector */}
            {mappingScheme && (
              <GenerationModeSelector
                mode={generationMode}
                aggregateConfig={aggregateConfig}
                availableFields={availableFields}
                onModeChange={onGenerationModeChange}
                onAggregateConfigChange={onAggregateConfigChange}
                disabled={isProcessing}
              />
            )}
            {/* 映射方案显示 - 可折叠 */}
            {mappingScheme && (
              <CollapsibleSection
                title="映射方案"
                icon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
                defaultOpen={true}
              >
                <div className="bg-slate-50 rounded-lg p-3 space-y-3 border border-slate-200">
                  {/* 主Sheet信息 */}
                  {mappingScheme.primarySheet && (
                    <div className="text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2">
                        <Table className="w-3 h-3" />
                        <span className="font-medium">主数据表: {mappingScheme.primarySheet}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed">{mappingScheme.explanation}</p>

                  {/* 已映射字段 */}
                  {mappingScheme.mappings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        已映射 ({mappingScheme.mappings.length})
                      </p>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {mappingScheme.mappings.map((m, idx) => (
                          <div key={idx} className="text-xs bg-white p-2 rounded border border-emerald-200 shadow-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-orange-600">{m.placeholder}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-emerald-600 font-medium">{m.excelColumn}</span>
                            </div>
                            {m.transform && (
                              <span className="text-slate-400 block mt-1 text-[10px] italic">
                                转换: {m.transform}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 跨Sheet映射 */}
                  {mappingScheme.crossSheetMappings && mappingScheme.crossSheetMappings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-purple-600 mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        跨Sheet查找 ({mappingScheme.crossSheetMappings.length})
                      </p>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {mappingScheme.crossSheetMappings.map((m, idx) => (
                          <div key={idx} className="text-xs bg-purple-50 p-2 rounded border border-purple-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-orange-600">{m.placeholder}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-purple-600 font-medium">{m.sourceSheet}.{m.sourceColumn}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              关联字段: {m.lookupKey} ({m.relationshipType})
                            </div>
                            {m.transform && (
                              <span className="text-slate-400 block mt-1 text-[10px] italic">
                                转换: {m.transform}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 筛选条件 */}
                  {mappingScheme.filterCondition && (
                    <div>
                      <p className="text-xs font-semibold text-blue-600 mb-1">筛选条件</p>
                      <code className="text-xs bg-blue-50 text-blue-700 p-2 rounded block border border-blue-200">
                        {mappingScheme.filterCondition}
                      </code>
                    </div>
                  )}

                  {/* 未映射字段 */}
                  {mappingScheme.unmappedPlaceholders.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        未映射 ({mappingScheme.unmappedPlaceholders.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {mappingScheme.unmappedPlaceholders.map((p, idx) => (
                          <span key={idx} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 置信度 */}
                  {mappingScheme.confidence !== undefined && (
                    <div className="text-xs text-slate-500">
                      置信度: {Math.round(mappingScheme.confidence * 100)}%
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* 已生成文档列表 - 可折叠 */}
            {generatedDocs.length > 0 && (
              <CollapsibleSection
                title="已生成文档"
                icon={<FileText className="w-4 h-4 text-emerald-500" />}
                defaultOpen={true}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-end">
                    <button
                      onClick={onDownloadAll}
                      className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Download className="w-3 h-3" />
                      下载全部
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {generatedDocs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 transition-all group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span className="text-sm text-slate-700 truncate">{doc.fileName}</span>
                        </div>
                        <button
                          onClick={() => onDownloadDoc(doc)}
                          className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 hover:shadow-md transition-all flex items-center gap-1 shadow-sm"
                        >
                          <Download className="w-3 h-3" />
                          下载
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* 日志输出 - 可折叠 */}
            {logs.length > 0 && (
              <CollapsibleSection
                title="处理日志"
                icon={<Terminal className="w-4 h-4 text-slate-500" />}
                defaultOpen={false}
              >
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {logs.slice(0, 20).map((log) => (
                    <div
                      key={log.id}
                      className={`text-xs p-3 rounded-lg border transition-all ${getLogClassName(log.status)}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">{getLogIcon(log.status)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="break-words">{log.message}</p>
                          {log.details?.duration && (
                            <p className="text-[10px] mt-1 opacity-75">
                              耗时: {formatTime(log.details.duration)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </>
        )}
      </div>

      {/* 固定底部操作栏 */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-200 bg-white space-y-2 shadow-lg">
          {/* 生成映射方案按钮 */}
          <button
            onClick={onGenerateMapping}
            disabled={!templateFile || !dataFile || !userInstruction.trim() || isProcessing}
            className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            {isProcessing && processingStage === 'ai_mapping' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AI分析中...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                生成映射方案
              </>
            )}
          </button>

          {/* 生成Word文档按钮 */}
          {mappingScheme && (
            <button
              onClick={onGenerateDocs}
              disabled={isProcessing}
              className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {isProcessing && processingStage === 'document_generation' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中... ({progress}%)
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  生成Word文档
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentSpaceSidebar;
