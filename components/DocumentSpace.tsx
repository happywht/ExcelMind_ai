import React, { useState } from 'react';
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
  Eye
} from 'lucide-react';
import { readExcelFile } from '../services/excelService';
import { parseWordTemplate, createTemplateFile, highlightPlaceholdersInHtml } from '../services/templateService';
import { generateFieldMapping } from '../services/documentMappingService';
import { generateMultipleDocuments, downloadDocumentsAsZip, downloadDocument } from '../services/docxGeneratorService';
import { TemplateFile, MappingScheme, DocumentProcessingLog, GeneratedDocument } from '../types/documentTypes';

/**
 * 文档空间主组件
 * 功能：智能填充Word模板，结合Excel数据和AI理解批量生成文档
 */
export const DocumentSpace: React.FC = () => {
  // 状态管理
  const [templateFile, setTemplateFile] = useState<TemplateFile | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any>(null);

  const [userInstruction, setUserInstruction] = useState('');
  const [mappingScheme, setMappingScheme] = useState<MappingScheme | null>(null);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<DocumentProcessingLog[]>([]);

  // 新增：预览状态
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState<'template' | 'mapping' | 'data'>('template');

  // 处理模板上传
  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      alert('请上传.docx格式的Word文档');
      return;
    }

    setIsProcessing(true);
    addLog('template_upload', 'pending', '正在解析Word模板...');

    try {
      // 使用模板服务解析模板
      const template = await createTemplateFile(file);

      setTemplateFile(template);
      addLog('template_upload', 'success', `模板文件 "${file.name}" 解析成功，检测到 ${template.placeholders.length} 个占位符`);
    } catch (error) {
      addLog('template_upload', 'error', `模板解析失败: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理数据上传
  const handleDataUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    addLog('data_upload', 'pending', '正在读取Excel数据...');

    try {
      const file = files[0];
      const data = await readExcelFile(file);
      setDataFile(file);
      setExcelData(data);

      const sheetCount = Object.keys(data.sheets).length;
      const currentSheetData = data.sheets[data.currentSheetName] || [];
      addLog('data_upload', 'success', `数据文件 "${file.name}" 读取成功，共${sheetCount}个工作表，当前工作表${currentSheetData.length}行数据`);
    } catch (error) {
      addLog('data_upload', 'error', `数据读取失败: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 执行AI映射
  const handleGenerateMapping = async () => {
    if (!templateFile || !excelData || !userInstruction.trim()) {
      alert('请先上传模板和数据文件，并输入指令');
      return;
    }

    setIsProcessing(true);
    addLog('mapping', 'pending', 'AI正在分析模板和数据...');

    try {
      // 获取当前工作表数据
      const currentSheetData = excelData.sheets[excelData.currentSheetName] || [];
      const sampleData = currentSheetData.slice(0, 3); // 取前3行作为样本
      const headers = currentSheetData.length > 0 ? Object.keys(currentSheetData[0]) : [];

      // 调用AI映射服务
      const mapping = await generateFieldMapping({
        excelHeaders: headers,
        excelSampleData: sampleData,
        templatePlaceholders: templateFile.placeholders,
        userInstruction: userInstruction.trim()
      });

      setMappingScheme(mapping);
      addLog('mapping', 'success', `AI映射方案生成完成：${mapping.mappings.length}个字段映射，${mapping.unmappedPlaceholders.length}个未映射`);
    } catch (error) {
      addLog('mapping', 'error', `映射生成失败: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // AI 处理进度
  const [aiProgress, setAiProgress] = useState<{ current: number; total: number } | null>(null);

  // 生成文档
  const handleGenerateDocs = async () => {
    if (!templateFile || !excelData || !mappingScheme) {
      alert('请先生成映射方案');
      return;
    }

    setIsProcessing(true);

    try {
      // 获取当前工作表数据
      const currentSheetData = excelData.sheets[excelData.currentSheetName] || [];
      const baseFileName = templateFile.name.replace('.docx', '');

      // 1. AI 批量预处理
      // 检查是否有 AI 规则
      const hasAIRules = mappingScheme.mappings.some(
        m => m.ruleType === 'ai' || (m.transform && m.transform.trim().startsWith('// AI'))
      );

      let dataToProcess = currentSheetData;
      let mappingToUse = mappingScheme;

      if (hasAIRules) {
        addLog('generating', 'pending', '正在执行 AI 批量处理 (这可能需要一些时间)...');
        setAiProgress({ current: 0, total: currentSheetData.length });

        // 动态导入 AI 批量服务
        const { aiBatchService } = await import('../services/aiBatchService');

        const result = await aiBatchService.processBatch(
          currentSheetData,
          mappingScheme,
          (current, total) => {
            setAiProgress({ current, total });
          }
        );

        dataToProcess = result.enrichedData;
        mappingToUse = result.runtimeMapping;

        addLog('generating', 'success', `AI 处理完成，已增强 ${dataToProcess.length} 条数据`);
        setAiProgress(null); // 清除进度条
      }

      addLog('generating', 'pending', '正在批量生成Word文档...');

      // 2. 调用文档生成服务
      const documents = await generateMultipleDocuments({
        templateBuffer: templateFile.arrayBuffer,
        excelData: dataToProcess, // 使用增强后的数据
        mappingScheme: mappingToUse, // 使用运行时映射
        baseFileName: baseFileName
      });

      setGeneratedDocs(documents);
      addLog('generating', 'success', `成功生成 ${documents.length} 个Word文档`);
    } catch (error) {
      addLog('generating', 'error', `文档生成失败: ${error}`);
      setAiProgress(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // 下载单个文档
  const handleDownloadSingle = (doc: GeneratedDocument) => {
    downloadDocument(doc.blob, doc.fileName);
    addLog('download', 'success', `已下载 ${doc.fileName}`);
  };

  // 下载全部文档（ZIP）
  const handleDownloadAll = async () => {
    if (generatedDocs.length === 0) return;

    try {
      const zipName = `批量文档_${Date.now()}.zip`;
      await downloadDocumentsAsZip(generatedDocs, zipName);
      addLog('download', 'success', `已下载打包的 ${generatedDocs.length} 个文档`);
    } catch (error) {
      addLog('download', 'error', `下载失败: ${error}`);
    }
  };

  // 添加日志
  const addLog = (
    stage: DocumentProcessingLog['stage'],
    status: DocumentProcessingLog['status'],
    message: string
  ) => {
    const log: DocumentProcessingLog = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      stage,
      status,
      message
    };
    setLogs(prev => [log, ...prev]);
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* 左侧控制面板 */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col">
        {/* 标题 */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-orange-500 p-2 rounded-lg">
              <FileEdit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">文档空间</h2>
              <p className="text-sm text-slate-500">智能文档填充</p>
            </div>
          </div>
        </div>

        {/* 文件上传区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 模板上传 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Word模板
            </h3>
            <label className="flex items-center justify-center gap-3 w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
              <input
                type="file"
                accept=".docx"
                onChange={handleTemplateUpload}
                className="hidden"
              />
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-500">
                {templateFile ? templateFile.name : '点击上传.docx模板'}
              </span>
            </label>
            {templateFile && (
              <div className="text-xs text-slate-500">
                检测到 {templateFile.placeholders.length} 个占位符
              </div>
            )}
          </div>

          {/* 数据上传 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Table className="w-4 h-4" />
              Excel数据
            </h3>
            <label className="flex items-center justify-center gap-3 w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleDataUpload}
                className="hidden"
              />
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-500">
                {dataFile ? dataFile.name : '点击上传Excel数据'}
              </span>
            </label>
          </div>

          {/* AI指令输入 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              AI指令
            </h3>
            <textarea
              value={userInstruction}
              onChange={(e) => setUserInstruction(e.target.value)}
              placeholder="例如：把销售额大于10万的产品信息填入模板，生成产品介绍文档"
              className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              onClick={handleGenerateMapping}
              disabled={!templateFile || !excelData || !userInstruction.trim() || isProcessing}
              className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  生成映射方案
                </>
              )}
            </button>
          </div>

          {/* 映射方案显示 */}
          {mappingScheme && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                映射方案
              </h3>
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <p className="text-xs text-slate-600 mb-2">{mappingScheme.explanation}</p>

                {/* 已映射字段 */}
                {mappingScheme.mappings.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-1">已映射字段 ({mappingScheme.mappings.length})</p>
                    <div className="space-y-1">
                      {mappingScheme.mappings.map((m, idx) => (
                        <div key={idx} className="text-xs bg-white p-2 rounded border border-emerald-200">
                          <span className="font-medium text-orange-600">{m.placeholder}</span>
                          <span className="text-slate-400 mx-2">←</span>
                          <span className="text-emerald-600">{m.excelColumn}</span>
                          {m.transform && <span className="text-slate-400 block mt-1 text-[10px]">转换: {m.transform}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 筛选条件 */}
                {mappingScheme.filterCondition && (
                  <div>
                    <p className="text-xs font-semibold text-blue-600 mb-1">筛选条件</p>
                    <code className="text-xs bg-blue-50 text-blue-700 p-2 rounded block">{mappingScheme.filterCondition}</code>
                  </div>
                )}

                {/* 未映射字段 */}
                {mappingScheme.unmappedPlaceholders.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 mb-1">未映射字段 ({mappingScheme.unmappedPlaceholders.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {mappingScheme.unmappedPlaceholders.map((p, idx) => (
                        <span key={idx} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 生成文档按钮 */}
          {mappingScheme && (
            <>
              {/* AI 进度条 */}
              {aiProgress && (
                <div className="mb-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-600 font-medium flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      AI 深度处理中...
                    </span>
                    <span className="text-slate-500 font-mono">
                      {aiProgress.current}/{aiProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                    <div
                      className="bg-orange-500 h-full transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${Math.round((aiProgress.current / aiProgress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerateDocs}
                disabled={isProcessing}
                className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    生成Word文档
                  </>
                )}
              </button>
            </>
          )}

          {/* 已生成文档列表 */}
          {generatedDocs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">已生成文档 ({generatedDocs.length})</h3>
                <button
                  onClick={handleDownloadAll}
                  className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  下载全部(ZIP)
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {generatedDocs.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-slate-700">{doc.fileName}</span>
                    </div>
                    <button
                      onClick={() => handleDownloadSingle(doc)}
                      className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded hover:bg-emerald-600 transition-colors flex items-center gap-1"
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
              <h3 className="font-semibold text-slate-700">处理日志</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`text-xs p-3 rounded-lg ${log.status === 'success'
                      ? 'bg-emerald-50 text-emerald-700'
                      : log.status === 'error'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-blue-50 text-blue-700'
                      }`}
                  >
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧预览区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 占位符 - 预览功能待实现 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <FileEdit className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">文档预览区域</p>
            <p className="text-sm">上传模板和数据后，这里将显示预览内容</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 添加默认导出以支持React.lazy()
export default DocumentSpace;