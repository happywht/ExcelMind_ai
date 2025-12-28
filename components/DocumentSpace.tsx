import React, { useState } from 'react';
import {
  Upload,
  FileText,
  Table,
  Wand2,
  Download,
  Loader2,
  FileEdit,
  AlertCircle
} from 'lucide-react';
import { readExcelFile } from '../services/excelService';
import { TemplateFile, MappingScheme, DocumentProcessingLog } from '../types/documentTypes';

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
  const [generatedDocs, setGeneratedDocs] = useState<Blob[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<DocumentProcessingLog[]>([]);

  // 处理模板上传
  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      alert('请上传.docx格式的Word文档');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const template: TemplateFile = {
        id: Date.now().toString(),
        file,
        name: file.name,
        size: file.size,
        arrayBuffer,
        htmlPreview: '', // 将由模板服务解析
        placeholders: [] // 将由模板服务解析
      };

      setTemplateFile(template);
      addLog('template_upload', 'success', `模板文件 "${file.name}" 上传成功`);
    } catch (error) {
      addLog('template_upload', 'error', `模板上传失败: ${error}`);
    }
  };

  // 处理数据上传
  const handleDataUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const file = files[0];
      const data = await readExcelFile(file);
      setDataFile(file);
      setExcelData(data);
      addLog('data_upload', 'success', `数据文件 "${file.name}" 上传成功，共${Object.keys(data.sheets).length}个工作表`);
    } catch (error) {
      addLog('data_upload', 'error', `数据上传失败: ${error}`);
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
      // TODO: 调用AI映射服务
      // const mapping = await generateMapping(...);

      // 模拟映射结果（暂时）
      const mockMapping: MappingScheme = {
        explanation: 'AI正在分析您的需求...',
        filterCondition: null,
        mappings: [],
        unmappedPlaceholders: templateFile.placeholders
      };

      setMappingScheme(mockMapping);
      addLog('mapping', 'success', 'AI映射方案生成完成');
    } catch (error) {
      addLog('mapping', 'error', `映射生成失败: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 生成文档
  const handleGenerateDocs = async () => {
    if (!mappingScheme) return;

    setIsProcessing(true);
    addLog('generating', 'pending', '正在生成Word文档...');

    try {
      // TODO: 调用文档生成服务
      addLog('generating', 'success', '文档生成完成');
    } catch (error) {
      addLog('generating', 'error', `文档生成失败: ${error}`);
    } finally {
      setIsProcessing(false);
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

          {/* 生成文档按钮 */}
          {mappingScheme && (
            <button
              onClick={handleGenerateDocs}
              disabled={isProcessing}
              className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              生成Word文档
            </button>
          )}

          {/* 日志输出 */}
          {logs.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700">处理日志</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`text-xs p-3 rounded-lg ${
                      log.status === 'success'
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