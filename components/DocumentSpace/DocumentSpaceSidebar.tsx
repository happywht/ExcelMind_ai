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
  Zap
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
  generationMode,
  aggregateConfig,
  availableFields,
  onGenerationModeChange,
  onAggregateConfigChange
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
    <div className="w-96 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
      {/* 标题 */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-orange-500 p-2 rounded-lg shadow-lg">
            <FileEdit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">文档空间</h2>
            <p className="text-sm text-slate-500">智能文档填充</p>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">


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

        {/* 模板上传 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Word模板
          </h3>
          <label className="flex items-center justify-center gap-3 w-full h-24 border-2 border-dashed border-orange-300 bg-orange-50 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-100 transition-all duration-200 shadow-sm">
            <input
              type="file"
              accept=".docx"
              onChange={handleTemplateChange}
              className="hidden"
              disabled={isProcessing}
            />
            <Upload className="w-6 h-6 text-orange-500" />
            <span className="text-sm text-slate-700 font-medium">
              {templateFile ? templateFile.name : '点击上传.docx模板'}
            </span>
          </label>
          {templateFile && (
            <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-200">
              <span>检测到 {templateFile.placeholders.length} 个占位符</span>
              <CheckCircle className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* 数据上传 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <Table className="w-4 h-4" />
            Excel数据
          </h3>
          <label className="flex items-center justify-center gap-3 w-full h-24 border-2 border-dashed border-emerald-300 bg-emerald-50 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-100 transition-all duration-200 shadow-sm">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleDataChange}
              className="hidden"
              disabled={isProcessing}
            />
            <Upload className="w-6 h-6 text-emerald-500" />
            <span className="text-sm text-slate-700 font-medium">
              {dataFile ? dataFile.name : '点击上传Excel数据'}
            </span>
          </label>
          {dataFile && (
            <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-200">
              <span>{dataFile.name}</span>
              <CheckCircle className="w-4 h-4" />
            </div>
          )}
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

        {/* AI指令输入 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            AI指令
          </h3>
          <textarea
            value={userInstruction}
            onChange={(e) => onInstructionChange(e.target.value)}
            placeholder="例如：把销售额大于10万的产品信息填入模板，生成产品介绍文档"
            className="w-full h-32 px-4 py-3 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm hover:border-orange-400"
            disabled={isProcessing}
          />
          <button
            onClick={onGenerateMapping}
            disabled={!templateFile || !dataFile || !userInstruction.trim() || isProcessing}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-600 disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
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
        {/* 映射方案显示 */}
        {mappingScheme && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              映射方案
            </h3>
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
          </div>
        )}

        {/* 生成文档按钮 */}
        {mappingScheme && (
          <button
            onClick={onGenerateDocs}
            disabled={isProcessing}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
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

        {/* 已生成文档列表 */}
        {generatedDocs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700">已生成文档</h3>
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
        )}

        {/* 日志输出 */}
        {logs.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              处理日志
            </h3>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentSpaceSidebar;
