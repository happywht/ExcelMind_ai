/**
 * 文档空间组件 - 高级版
 * 集成智能数据查询引擎
 */

import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Upload, FileText, Database, Zap, Loader2 } from 'lucide-react';
import { DataQueryEngine } from '../services/queryEngine';
import { parseWordTemplate } from '../services/templateService';
import { generateFieldMapping } from '../services/documentMappingService';
import { generateMultipleDocuments } from '../services/docxGeneratorService';
import { TemplateFile, MappingScheme } from '../types/documentTypes';
import { ExcelData } from '../types';

interface DocumentSpaceAdvancedProps {
  excelData: ExcelData;
}

type ProcessingStage = 'idle' | 'analyzing' | 'mapping' | 'generating' | 'completed' | 'error';

export const DocumentSpaceAdvanced: React.FC<DocumentSpaceAdvancedProps> = ({ excelData }) => {
  // 状态管理
  const [templateFile, setTemplateFile] = useState<TemplateFile | null>(null);
  const [userInstruction, setUserInstruction] = useState('');
  const [mappingScheme, setMappingScheme] = useState<MappingScheme | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [stageMessage, setStageMessage] = useState('');
  const [generatedCount, setGeneratedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 查询引擎实例
  const [queryEngine, setQueryEngine] = useState<DataQueryEngine | null>(null);

  // 初始化查询引擎
  useEffect(() => {
    const initEngine = async () => {
      const engine = new DataQueryEngine(
        undefined, // dataSource参数，使用undefined以使用全局数据源
        {
          enableCache: true,
          enableAI: true,
          debugMode: true
        }
      );
      await engine.initialize();
      engine.loadExcelData(excelData);
      setQueryEngine(engine);
    };

    initEngine();
  }, [excelData]);

  // 处理模板上传
  const handleTemplateUpload = async (file: File) => {
    try {
      setProcessingStage('analyzing');
      setStageMessage('正在解析模板...');

      // 解析Word模板
      const parseResult = await parseWordTemplate(file);

      const template: TemplateFile = {
        id: Date.now().toString(),
        file,
        name: file.name,
        size: file.size,
        arrayBuffer: await file.arrayBuffer(),
        htmlPreview: parseResult.textContent,
        placeholders: parseResult.placeholders
      };

      setTemplateFile(template);
      setProcessingStage('idle');
      setStageMessage('');

    } catch (err) {
      setError(`模板解析失败: ${err instanceof Error ? err.message : String(err)}`);
      setProcessingStage('error');
    }
  };

  // 生成智能映射（增强版）
  const handleGenerateMapping = async () => {
    if (!templateFile || !queryEngine) return;

    try {
      setProcessingStage('mapping');
      setStageMessage('AI正在分析数据结构并生成映射方案...');

      // 获取Excel数据结构
      const sheetNames = queryEngine.getTableNames();
      const allColumns = sheetNames.length > 0
        ? queryEngine.getColumns(sheetNames[0])
        : [];

      // 获取样本数据
      const sampleData = excelData.sheets[sheetNames[0]]?.slice(0, 3) || [];

      // 调用增强的映射服务
      const scheme = await generateFieldMapping({
        excelHeaders: allColumns,
        excelSampleData: sampleData,
        templatePlaceholders: templateFile.placeholders,
        userInstruction: userInstruction || '自动映射'
      });

      // 验证复杂查询
      const validatedMappings = [];
      for (const mapping of scheme.mappings) {
        if (mapping.transform && needsQueryValidation(mapping.transform)) {
          // 使用查询引擎验证
          const testResult = await queryEngine.query(mapping.transform);

          if (testResult.success) {
            validatedMappings.push({
              ...mapping,
              validated: true,
              sql: testResult.sql
            });
          } else {
            // 查询验证失败，尝试修正
            const fixedMapping = await fixMappingWithAI(mapping, testResult.error);
            validatedMappings.push(fixedMapping);
          }
        } else {
          validatedMappings.push(mapping);
        }
      }

      setMappingScheme({
        ...scheme,
        mappings: validatedMappings
      });

      setProcessingStage('idle');
      setStageMessage('');

    } catch (err) {
      setError(`映射生成失败: ${err instanceof Error ? err.message : String(err)}`);
      setProcessingStage('error');
    }
  };

  // 生成文档
  const handleGenerateDocuments = async () => {
    if (!templateFile || !mappingScheme) return;

    try {
      setProcessingStage('generating');
      setStageMessage('正在生成文档...');

      // 确定要使用的数据源
      const primarySheet = Object.keys(excelData.sheets)[0];
      const sourceData = excelData.sheets[primarySheet] || [];

      // 生成文档
      const documents = await generateMultipleDocuments({
        templateBuffer: templateFile.arrayBuffer,
        excelData: sourceData,
        mappingScheme,
        baseFileName: templateFile.name.replace('.docx', '')
      });

      setGeneratedCount(documents.length);
      setProcessingStage('completed');
      setStageMessage(`成功生成 ${documents.length} 个文档！`);

    } catch (err) {
      setError(`文档生成失败: ${err instanceof Error ? err.message : String(err)}`);
      setProcessingStage('error');
    }
  };

  // 判断是否需要查询验证
  const needsQueryValidation = (transform: string): boolean => {
    return transform.includes('SELECT') ||
           transform.includes('SUM') ||
           transform.includes('AVG') ||
           transform.includes('COUNT');
  };

  // 使用AI修正失败的映射
  const fixMappingWithAI = async (
    mapping: any,
    error: string | undefined
  ): Promise<any> => {
    // TODO: 实现AI修正逻辑
    console.warn('映射验证失败，需要AI修正:', mapping, error);
    return mapping;
  };

  // 渲染处理状态
  const renderProcessingStatus = () => {
    if (processingStage === 'idle') return null;

    const stageConfig = {
      analyzing: { icon: Database, color: 'text-blue-500', text: '分析中' },
      mapping: { icon: Zap, color: 'text-yellow-500', text: 'AI映射中' },
      generating: { icon: FileText, color: 'text-purple-500', text: '生成中' },
      completed: { icon: '✓', color: 'text-green-500', text: '完成' },
      error: { icon: '✗', color: 'text-red-500', text: '错误' }
    };

    const config = stageConfig[processingStage];

    return (
      <div className={`flex items-center gap-2 ${config.color}`}>
        {processingStage !== 'completed' && processingStage !== 'error' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <span className="text-lg">{config.icon as ReactNode}</span>
        )}
        <span className="font-medium">{stageMessage}</span>
      </div>
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Database className="w-6 h-6" />
        智能文档空间（增强版）
      </h2>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-red-500 hover:text-red-700 underline"
          >
            关闭
          </button>
        </div>
      )}

      {/* 步骤1: 上传模板 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">步骤1: 上传Word模板</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 mb-2">拖拽文件到此处或点击上传</p>
          <p className="text-sm text-gray-400">支持 .docx 格式</p>
          <input
            type="file"
            accept=".docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleTemplateUpload(file);
            }}
            className="hidden"
            id="template-upload"
          />
          <label
            htmlFor="template-upload"
            className="mt-4 inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer"
          >
            选择文件
          </label>
        </div>

        {/* 模板信息 */}
        {templateFile && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <FileText className="w-5 h-5" />
              <span className="font-medium">{templateFile.name}</span>
              <span className="text-sm text-green-600">
                ({templateFile.placeholders.length} 个占位符)
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {templateFile.placeholders.map((placeholder, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-mono"
                >
                  {placeholder}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 步骤2: AI映射 */}
      {templateFile && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">步骤2: AI智能映射</h3>

          <textarea
            value={userInstruction}
            onChange={(e) => setUserInstruction(e.target.value)}
            placeholder="输入自然语言指令，例如：&#10;- 绩效从Sheet2取&#10;- 总销售额需要聚合计算&#10;- 联系方式中提取电话号码"
            className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />

          <button
            onClick={handleGenerateMapping}
            disabled={processingStage !== 'idle'}
            className={`mt-3 px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
              processingStage !== 'idle'
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-yellow-500 hover:bg-yellow-600 text-white'
            }`}
          >
            <Zap className="w-5 h-5" />
            AI生成映射方案
          </button>

          {/* 映射结果 */}
          {mappingScheme && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-700 mb-2">AI映射方案</h4>
              <p className="text-sm text-blue-600 mb-3">{mappingScheme.explanation}</p>

              <div className="space-y-2">
                {mappingScheme.mappings.map((mapping, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-white rounded border border-blue-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono">
                        {mapping.placeholder}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span className="font-medium text-gray-700">{mapping.excelColumn}</span>
                      {(mapping as any).sql && (
                        <span className="text-xs text-gray-400 font-mono">
                          {(mapping as any).sql.substring(0, 50)}...
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {mappingScheme.unmappedPlaceholders.length > 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-700 font-medium">未映射的占位符:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {mappingScheme.unmappedPlaceholders.map((placeholder, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm"
                        >
                          {placeholder}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 步骤3: 生成文档 */}
      {mappingScheme && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">步骤3: 生成文档</h3>

          <button
            onClick={handleGenerateDocuments}
            disabled={processingStage !== 'idle'}
            className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
              processingStage !== 'idle'
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
          >
            <FileText className="w-5 h-5" />
            批量生成文档
          </button>

          {/* 处理状态 */}
          {renderProcessingStatus()}
        </div>
      )}

      {/* 查询引擎信息 */}
      {queryEngine && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">数据源统计</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">表数量:</span>
              <span className="ml-2 font-medium">{queryEngine.getStatistics().sheetCount}</span>
            </div>
            <div>
              <span className="text-gray-500">总行数:</span>
              <span className="ml-2 font-medium">{queryEngine.getStatistics().totalRows}</span>
            </div>
            <div>
              <span className="text-gray-500">总列数:</span>
              <span className="ml-2 font-medium">{queryEngine.getStatistics().totalColumns}</span>
            </div>
            <div>
              <span className="text-gray-500">关联关系:</span>
              <span className="ml-2 font-medium">{queryEngine.getStatistics().relationshipCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentSpaceAdvanced;
