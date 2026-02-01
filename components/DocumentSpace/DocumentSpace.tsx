/**
 * DocumentSpace主组件
 *
 * 功能：智能文档填充和批量生成
 * - 上传Word模板和Excel数据
 * - AI智能生成字段映射
 * - 批量生成Word文档
 * - 实时性能监控
 *
 * @version 3.0.0 - Zustand状态管理版本
 *
 * 主要变更:
 * - 使用Zustand store管理所有状态
 * - 消除Props Drilling问题（从24个props减少到0个）
 * - 子组件直接使用Zustand hooks
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import {
  readExcelFile
} from '../../services/excelService';
import {
  createTemplateFile
} from '../../services/templateService';
import { generateFieldMappingV2 } from '../../services/documentMappingService';
import {
  DocxtemplaterService
} from '../../services/docxtemplaterService';
import {
  downloadDocument,
  downloadDocumentsAsZip
} from '../../services/docxGeneratorService';
import {
  FewShotEngine
} from '../../services/ai/fewShotEngine';
import {
  allQueryExamples
} from '../../services/ai/queryExamples';
import {
  AIOutputValidator
} from '../../services/quality';
import {
  PerformanceTracker,
  recordMetric,
  initPerformanceMonitoring
} from '../../services/monitoring';
import {
  DocumentProcessingLog,
  SheetInfo
} from '../../types/documentTypes';
import {
  useDocumentSpace,
  useDocumentSpaceActions,
  useDocumentSpaceFiles,
  useDocumentSpaceMapping,
  useDocumentSpaceSheets,
  useDocumentSpaceGeneration
} from '../../stores/documentSpaceStore';

import DocumentSpaceSidebar from './DocumentSpaceSidebar';
import DocumentSpaceMain from './DocumentSpaceMain';

/**
 * DocumentSpace组件
 *
 * 使用Zustand管理状态，不再需要传递props
 */
export const DocumentSpace: React.FC = () => {
  // ===== 从Zustand Store获取状态和操作 =====

  const {
    // 状态
    templateFile,
    dataFile,
    excelData,
    userInstruction,
    mappingScheme,
    generatedDocs,
    primarySheet,
    enabledSheets,
    generationMode,
    aggregateConfig,
    activeTab,
    selectedDoc,
    isProcessing,
    processingStage,
    progress,
    logs,
    performanceMetrics,
    logsPerPage,
    maxLogs
  } = useDocumentSpace();

  const {
    // 操作方法
    setTemplateFile,
    setDataFile,
    setExcelData,
    setUserInstruction,
    setMappingScheme,
    setGeneratedDocs,
    setActiveTab,
    setSelectedDoc,
    setPrimarySheet,
    setEnabledSheets,
    setGenerationMode,
    setAggregateConfig,
    startProcessing,
    finishProcessing,
    updateProgress,
    addLog,
    clearLogs,
    updatePerformanceMetric
  } = useDocumentSpaceActions();

  // Few-Shot引擎实例
  const fewShotEngine = useMemo(() => {
    const engine = new FewShotEngine();
    engine.addExamples(allQueryExamples);
    return engine;
  }, []);

  // ===== 辅助函数：添加日志并记录性能 =====

  /**
   * 添加日志并记录性能指标
   */
  const addLogWithMetrics = useCallback((
    stage: DocumentProcessingLog['stage'],
    status: DocumentProcessingLog['status'],
    message: string,
    details?: any
  ) => {
    addLog({ stage, status, message, details });

    // 记录性能指标
    if (status === 'success' && details?.duration) {
      updatePerformanceMetric(stage as keyof typeof performanceMetrics, details.duration);
    }
  }, [addLog, updatePerformanceMetric, performanceMetrics]);

  // ===== 1. 模板上传处理 =====

  const handleTemplateUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.docx')) {
      addLogWithMetrics('template_upload', 'error', '请上传.docx格式的Word文档');
      return;
    }

    startProcessing('template_upload');
    updateProgress(0);
    addLogWithMetrics('template_upload', 'pending', '正在解析Word模板...');

    const trackerId = PerformanceTracker.startTracking('template.upload');
    const startTime = performance.now();

    try {
      // 解析模板
      const template = await createTemplateFile(file);

      // ✅ 修复：先更新templateFile，再切换Tab
      setTemplateFile(template);

      // 等待状态更新后再切换Tab
      await new Promise(resolve => setTimeout(resolve, 0));

      setActiveTab('template');

      console.log('[DocumentSpace] Template uploaded and tab switched:', {
        templateName: template.name,
        placeholderCount: template.placeholders.length,
        activeTab: 'template'
      });

      const duration = performance.now() - startTime;
      PerformanceTracker.stopTracking(trackerId, duration);

      addLogWithMetrics('template_upload', 'success',
        `模板 "${file.name}" 解析成功，检测到 ${template.placeholders.length} 个占位符`,
        { duration, placeholderCount: template.placeholders.length }
      );

      // 记录性能指标
      recordMetric({
        type: 'custom',
        name: 'template.parse',
        value: duration,
        unit: 'ms',
        timestamp: Date.now()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLogWithMetrics('template_upload', 'error', `模板解析失败: ${errorMessage}`);
    } finally {
      finishProcessing();
      updateProgress(100);
    }
  }, [addLogWithMetrics, startProcessing, updateProgress, setTemplateFile, setActiveTab, finishProcessing]);

  // ===== 2. 数据上传处理 =====

  const handleDataUpload = useCallback(async (file: File) => {
    startProcessing('data_upload');
    updateProgress(0);
    addLogWithMetrics('data_upload', 'pending', '正在读取Excel数据...');

    const trackerId = PerformanceTracker.startTracking('data.upload');
    const startTime = performance.now();

    try {
      const data = await readExcelFile(file);

      // ✅ 修复：先更新数据状态，再切换Tab
      setDataFile(file);
      setExcelData(data);

      // 等待状态更新后再切换Tab
      await new Promise(resolve => setTimeout(resolve, 0));

      setActiveTab('data');

      // 自动设置主Sheet为第一个Sheet
      const sheetNames = Object.keys(data.sheets);
      if (sheetNames.length > 0 && !primarySheet) {
        setPrimarySheet(data.currentSheetName || sheetNames[0]);
      }

      console.log('[DocumentSpace] Excel data uploaded and tab switched:', {
        fileName: file.name,
        sheetCount: sheetNames.length,
        currentSheet: data.currentSheetName,
        rowCount: data.sheets[data.currentSheetName]?.length || 0,
        activeTab: 'data'
      });

      const duration = performance.now() - startTime;
      PerformanceTracker.stopTracking(trackerId, duration);
      const sheetCount = Object.keys(data.sheets).length;
      const currentSheetData = data.sheets[data.currentSheetName] || [];

      addLogWithMetrics('data_upload', 'success',
        `数据 "${file.name}" 读取成功，共${sheetCount}个工作表，当前工作表${currentSheetData.length}行数据`,
        { duration, sheetCount, rowCount: currentSheetData.length }
      );

      // 记录性能指标
      recordMetric({
        type: 'custom',
        name: 'excel.parse',
        value: duration,
        unit: 'ms',
        timestamp: Date.now()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLogWithMetrics('data_upload', 'error', `数据读取失败: ${errorMessage}`);
    } finally {
      finishProcessing();
      updateProgress(100);
    }
  }, [addLogWithMetrics, startProcessing, updateProgress, setDataFile, setExcelData, setActiveTab, setPrimarySheet, primarySheet, finishProcessing]);

  // ===== 3. AI生成映射 =====

  const handleGenerateMapping = useCallback(async () => {
    if (!templateFile || !excelData || !userInstruction.trim()) {
      addLogWithMetrics('mapping', 'error', '请先上传模板和数据，并输入指令');
      return;
    }

    startProcessing('ai_mapping');
    updateProgress(0);
    addLogWithMetrics('mapping', 'pending', 'AI正在分析并生成映射方案...');

    const trackerId = PerformanceTracker.startTracking('ai.mapping');
    const startTime = performance.now();

    try {
      // 构建所有Sheet的信息（支持多Sheet）
      const allSheetsInfo: SheetInfo[] = Object.entries(excelData.sheets).map(([sheetName, data]) => ({
        sheetName,
        headers: Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : [],
        rowCount: Array.isArray(data) ? data.length : 0,
        sampleData: Array.isArray(data) ? data.slice(0, 5) : []
      }));

      // 获取当前工作表数据（用于Few-Shot检索）
      const currentSheetData = excelData.sheets[excelData.currentSheetName] || [];
      const headers = Array.isArray(currentSheetData) && currentSheetData.length > 0
        ? Object.keys(currentSheetData[0])
        : [];

      // 使用Few-Shot引擎检索相关示例
      const relevantExamples = fewShotEngine.findRelevantExamples(
        userInstruction,
        headers,
        5
      );

      addLogWithMetrics('mapping', 'pending',
        `检索到 ${relevantExamples.length} 个相关示例，正在分析 ${allSheetsInfo.length} 个工作表...`
      );

      // 调用AI生成映射（使用新的V2 API支持多Sheet）
      const mapping = await generateFieldMappingV2({
        allSheetsInfo,
        primarySheet: primarySheet || undefined,
        templatePlaceholders: templateFile.placeholders,
        userInstruction: userInstruction.trim()
      });

      // 使用质量验证器检查结果
      const validator = new AIOutputValidator();
      const validationResult = validator.validateMappingResult(mapping, {
        templatePlaceholders: templateFile.placeholders,
        excelHeaders: headers
      });

      if (!validationResult.isValid) {
        addLogWithMetrics('mapping', 'warning',
          `映射生成完成，但存在警告: ${validationResult.warnings.join(', ')}`
        );
      }

      setMappingScheme(mapping);
      setActiveTab('mapping');

      // 更新主Sheet状态（如果AI返回了不同的主Sheet选择）
      if (mapping.primarySheet && mapping.primarySheet !== primarySheet) {
        setPrimarySheet(mapping.primarySheet);
        addLogWithMetrics('mapping', 'pending',
          `AI建议使用 "${mapping.primarySheet}" 作为主数据表`
        );
      }

      const duration = performance.now() - startTime;
      PerformanceTracker.stopTracking(trackerId, duration);

      // 构建跨Sheet映射信息
      const crossSheetCount = mapping.crossSheetMappings?.length || 0;
      const successMessage = crossSheetCount > 0
        ? `AI映射完成：${mapping.mappings.length}个映射，${crossSheetCount}个跨Sheet查找，${mapping.unmappedPlaceholders.length}个未映射`
        : `AI映射完成：${mapping.mappings.length}个映射，${mapping.unmappedPlaceholders.length}个未映射`;

      addLogWithMetrics('mapping', 'success', successMessage,
        {
          duration,
          mappingCount: mapping.mappings.length,
          crossSheetCount,
          unmappedCount: mapping.unmappedPlaceholders.length,
          exampleCount: relevantExamples.length,
          confidence: mapping.confidence,
          primarySheet: mapping.primarySheet
        }
      );

      // 记录性能指标
      recordMetric({
        type: 'custom',
        name: 'mapping.generation',
        value: duration,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: {
          mappingCount: mapping.mappings.length,
          exampleCount: relevantExamples.length
        }
      });

      // 更新性能指标
      updatePerformanceMetric('aiMapping', duration);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLogWithMetrics('mapping', 'error', `映射生成失败: ${errorMessage}`);
    } finally {
      finishProcessing();
      updateProgress(100);
    }
  }, [templateFile, excelData, userInstruction, fewShotEngine, addLogWithMetrics, startProcessing, updateProgress, setMappingScheme, setActiveTab, setPrimarySheet, primarySheet, finishProcessing, updatePerformanceMetric]);

  // ===== 4. 生成文档 =====

  /**
   * 构建查找索引 - 用于跨Sheet数据查找的优化
   * @param data 数据数组
   * @param keyField 作为键的字段名
   * @returns Map<键值, 数据行>
   *
   * 注意：此函数不依赖组件状态，因此使用空依赖数组
   * 这样可以避免不必要的函数重新创建，提升性能
   */
  const buildLookupIndex = useCallback((data: any[], keyField: string): Map<string, any> => {
    const index = new Map<string, any>();
    data.forEach(row => {
      const keyValue = String(row[keyField] || '');
      if (keyValue) {
        index.set(keyValue, row);
      }
    });
    return index;
  }, []); // 空依赖数组：函数逻辑仅依赖参数，不依赖组件状态

  // Aggregate mode document generation handler
  const handleAggregateGeneration = useCallback(async () => {
    if (!templateFile || !excelData || !mappingScheme) {
      addLogWithMetrics('generating', 'error', 'Please generate mapping first');
      return;
    }

    startProcessing('aggregate_generation');
    updateProgress(0);
    addLogWithMetrics('generating', 'pending', 'Using aggregate mode to generate documents...');

    const trackerId = PerformanceTracker.startTracking('document.generation');
    const startTime = performance.now();

    try {
      const sheetToUse = mappingScheme.primarySheet || excelData.currentSheetName;
      const primarySheetData = excelData.sheets[sheetToUse] || [];
      const baseFileName = templateFile.name.replace('.docx', '');

      // Check aggregate config
      let configToUse = aggregateConfig;
      if (!configToUse.rules || configToUse.rules.length === 0) {
        const headers = primarySheetData.length > 0 ? Object.keys(primarySheetData[0]) : [];
        configToUse = {
          ...aggregateConfig,
          rules: headers.filter(h => h.includes('销售额') || h.includes('金额') || h.includes('数量'))
            .map(field => ({ field, operation: 'sum' as const, alias: `总${field}` }))
        };
        if (configToUse.rules.length === 0) {
          configToUse.rules.push({ field: headers[0] || 'id', operation: 'count' as const, alias: '总数' });
        }
        setAggregateConfig(configToUse);
        addLogWithMetrics('generating', 'info', `Auto-inferred aggregate config: ${configToUse.rules.length} rules`);
      }

      addLogWithMetrics('generating', 'pending',
        `Aggregate config: ${configToUse.rules.length} rules, ${primarySheetData.length} rows`
      );

      // Execute aggregate calculation
      const { executeAggregate } = await import('../../services/aggregateService');
      const aggregateResults = executeAggregate(primarySheetData, configToUse);

      addLogWithMetrics('generating', 'pending',
        `Aggregation complete, will generate ${aggregateResults.length} summary documents`
      );

      // Generate document for each aggregate result
      const documents = [];

      for (let i = 0; i < aggregateResults.length; i++) {
        const aggregateData = aggregateResults[i];

        // Build mapped data
        const mappedData: any = {};

        mappingScheme.mappings.forEach(mapping => {
          const key = mapping.placeholder.replace(/\{\{|\}\}/g, '').trim();
          if (aggregateData[key] !== undefined) {
            mappedData[key] = aggregateData[key];
          } else if (aggregateData[mapping.excelColumn] !== undefined) {
            mappedData[key] = aggregateData[mapping.excelColumn];
          }
        });

        // Add all aggregate result fields
        Object.keys(aggregateData).forEach(field => {
          if (mappedData[field] === undefined) {
            mappedData[field] = aggregateData[field];
          }
        });

        // Generate single document
        const docBlob = await DocxtemplaterService.generateDocument({
          templateBuffer: templateFile.arrayBuffer,
          data: mappedData
        });

        const fileName = aggregateResults.length === 1
          ? `${baseFileName}_汇总.docx`
          : `${baseFileName}_汇总_${i + 1}.docx`;

        documents.push({
          blob: docBlob,
          fileName,
          dataIndex: i,
          recordData: aggregateData
        });

        const percentage = Math.round(((i + 1) / aggregateResults.length) * 100);
        updateProgress(percentage);
        addLogWithMetrics('generating', 'pending',
          `Generating summary document: ${i + 1}/${aggregateResults.length} (${percentage}%)`
        );
      }

      setGeneratedDocs(documents);
      setActiveTab('generate');

      const duration = performance.now() - startTime;
      PerformanceTracker.stopTracking(trackerId, duration);

      addLogWithMetrics('generating', 'success',
        `Aggregate mode: Successfully generated ${documents.length} summary documents`,
        {
          duration,
          documentCount: documents.length,
          avgTime: duration / documents.length
        }
      );

      recordMetric({
        type: 'custom',
        name: 'aggregate.generate',
        value: duration,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: {
          mode: 'aggregate',
          documentCount: documents.length,
          aggregateRules: configToUse.rules.length
        }
      });

      updatePerformanceMetric('documentGeneration', duration);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLogWithMetrics('generating', 'error', `Aggregate document generation failed: ${errorMessage}`);
    } finally {
      finishProcessing();
      updateProgress(100);
    }
  }, [templateFile, excelData, mappingScheme, aggregateConfig, addLogWithMetrics, startProcessing, updateProgress, setAggregateConfig, setGeneratedDocs, setActiveTab, finishProcessing, updatePerformanceMetric]);


  const handleGenerateDocs = useCallback(async () => {
    // Route to appropriate handler based on generation mode
    if (generationMode === 'aggregate') {
      return handleAggregateGeneration();
    }

    if (!templateFile || !excelData || !mappingScheme) {
      addLogWithMetrics('generating', 'error', '请先生成映射方案');
      return;
    }

    startProcessing('document_generation');
    updateProgress(0);
    addLogWithMetrics('generating', 'pending', '正在批量生成Word文档...');

    const trackerId = PerformanceTracker.startTracking('document.generation');
    const startTime = performance.now();

    try {
      // 使用映射方案中的主Sheet
      const sheetToUse = mappingScheme.primarySheet || excelData.currentSheetName;
      const primarySheetData = excelData.sheets[sheetToUse] || [];
      const baseFileName = templateFile.name.replace('.docx', '');

      addLogWithMetrics('generating', 'pending',
        `使用主数据表 "${sheetToUse}" (${primarySheetData.length}行) 生成文档...`
      );

      // 跨Sheet映射处理
      const hasCrossSheetMappings = mappingScheme.crossSheetMappings &&
                                     mappingScheme.crossSheetMappings.length > 0;

      if (hasCrossSheetMappings) {
        addLogWithMetrics('generating', 'info',
          `检测到 ${mappingScheme.crossSheetMappings!.length} 个跨Sheet映射，正在构建查找索引...`
        );
      }

      // 为跨Sheet映射构建查找索引（性能优化）
      const crossSheetIndexes = new Map<string, Map<string, any>>();
      let totalIndexedRows = 0;

      if (hasCrossSheetMappings) {
        mappingScheme.crossSheetMappings!.forEach(crossMapping => {
          const sourceSheet = excelData.sheets[crossMapping.sourceSheet];
          if (sourceSheet) {
            const index = buildLookupIndex(sourceSheet, crossMapping.lookupKey);
            crossSheetIndexes.set(crossMapping.sourceSheet, index);
            totalIndexedRows += sourceSheet.length;
            addLogWithMetrics('generating', 'info',
              `为Sheet "${crossMapping.sourceSheet}" 构建索引 (${sourceSheet.length}行，键字段: ${crossMapping.lookupKey})`
            );
          } else {
            addLogWithMetrics('generating', 'warning',
              `找不到来源Sheet: ${crossMapping.sourceSheet}`
            );
          }
        });
      }

      // 统计跨Sheet查找的成功率
      let crossSheetLookupSuccess = 0;
      let crossSheetLookupTotal = 0;

      // 构建映射数据
      const mappedDataList = primarySheetData.map((row: any, rowIndex: number) => {
        const mappedData: any = {};

        // 1. 处理主Sheet的字段映射
        mappingScheme.mappings.forEach(mapping => {
          const key = mapping.placeholder.replace(/\{\{|\}\}/g, '').trim();
          mappedData[key] = row[mapping.excelColumn];
        });

        // 2. 处理跨Sheet映射
        if (hasCrossSheetMappings) {
          mappingScheme.crossSheetMappings!.forEach(crossMapping => {
            const lookupValue = String(row[crossMapping.lookupKey] || '');
            const key = crossMapping.placeholder.replace(/\{\{|\}\}/g, '').trim();

            if (!lookupValue) {
              // 关联字段不存在或为空
              addLogWithMetrics('generating', 'warning',
                `第${rowIndex + 1}行: 关联字段 "${crossMapping.lookupKey}" 为空，无法查找跨Sheet数据`
              );
              mappedData[key] = '';
              return;
            }

            crossSheetLookupTotal++;

            // 使用预构建的索引进行快速查找
            const sourceIndex = crossSheetIndexes.get(crossMapping.sourceSheet);
            let matchedRow: any = null;

            if (sourceIndex) {
              matchedRow = sourceIndex.get(lookupValue);
            }

            if (matchedRow) {
              // 找到匹配数据
              mappedData[key] = matchedRow[crossMapping.sourceColumn];
              crossSheetLookupSuccess++;
            } else {
              // 未找到匹配数据
              if (rowIndex < 3) {
                // 只在前几行记录警告，避免日志过多
                addLogWithMetrics('generating', 'warning',
                  `第${rowIndex + 1}行: 在Sheet "${crossMapping.sourceSheet}" 中找不到关联键 "${lookupValue}" 对应的数据`
                );
              }
              mappedData[key] = '';
            }
          });
        }

        return mappedData;
      });

      // 报告跨Sheet查找统计
      if (hasCrossSheetMappings && crossSheetLookupTotal > 0) {
        const successRate = ((crossSheetLookupSuccess / crossSheetLookupTotal) * 100).toFixed(1);
        addLogWithMetrics('generating', 'info',
          `跨Sheet查找统计: 成功 ${crossSheetLookupSuccess}/${crossSheetLookupTotal} (${successRate}%)`
        );
      }

      // 使用docxtemplater批量生成
      const documents = await DocxtemplaterService.batchGenerate({
        templateBuffer: templateFile.arrayBuffer,
        dataList: mappedDataList,
        baseFileName: baseFileName,
        options: {
          concurrency: 3,
          batchSize: 10,
          onProgress: (current, total) => {
            const percentage = Math.round((current / total) * 100);
            updateProgress(percentage);
            addLogWithMetrics('generating', 'pending',
              `正在生成文档: ${current}/${total} (${percentage}%)`
            );
          }
        }
      });

      setGeneratedDocs(documents);
      setActiveTab('generate');

      const duration = performance.now() - startTime;
      PerformanceTracker.stopTracking(trackerId, duration);

      // 构建成功消息
      let successMessage = `成功生成 ${documents.length} 个Word文档`;
      if (hasCrossSheetMappings) {
        const successRate = crossSheetLookupTotal > 0
          ? `，跨Sheet查找成功率 ${((crossSheetLookupSuccess / crossSheetLookupTotal) * 100).toFixed(1)}%`
          : '';
        successMessage += ` (使用 ${mappingScheme.crossSheetMappings!.length} 个跨Sheet映射${successRate})`;
      }

      addLogWithMetrics('generating', 'success', successMessage,
        {
          duration,
          documentCount: documents.length,
          avgTime: duration / documents.length,
          crossSheetMappingCount: hasCrossSheetMappings ? mappingScheme.crossSheetMappings!.length : 0,
          crossSheetLookupSuccess,
          crossSheetLookupTotal,
          indexedRows: totalIndexedRows
        }
      );

      // 记录性能指标
      recordMetric({
        type: 'custom',
        name: 'batch.generate',
        value: duration,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: {
          documentCount: documents.length,
          avgTime: duration / documents.length,
          crossSheetMappings: hasCrossSheetMappings ? mappingScheme.crossSheetMappings!.length : 0,
          lookupSuccessRate: crossSheetLookupTotal > 0
            ? (crossSheetLookupSuccess / crossSheetLookupTotal) * 100
            : 100
        }
      });

      // 更新性能指标
      updatePerformanceMetric('documentGeneration', duration);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLogWithMetrics('generating', 'error', `文档生成失败: ${errorMessage}`);
    } finally {
      finishProcessing();
      updateProgress(100);
    }
  }, [templateFile, excelData, mappingScheme, generationMode, buildLookupIndex, addLogWithMetrics, startProcessing, updateProgress, setGeneratedDocs, setActiveTab, finishProcessing, updatePerformanceMetric, handleAggregateGeneration]);

  // ===== 5. 下载单个文档 =====

  const handleDownloadDoc = useCallback((doc: typeof generatedDocs[0]) => {
    downloadDocument(doc.blob, doc.fileName);
    addLogWithMetrics('download', 'success', `已下载 ${doc.fileName}`);
  }, [addLogWithMetrics]);

  // ===== 6. 批量下载 =====

  const handleDownloadAll = useCallback(async () => {
    if (generatedDocs.length === 0) return;

    try {
      const zipName = `批量文档_${Date.now()}.zip`;
      await downloadDocumentsAsZip(generatedDocs, zipName);
      addLogWithMetrics('download', 'success', `已下载打包的 ${generatedDocs.length} 个文档`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLogWithMetrics('download', 'error', `下载失败: ${errorMessage}`);
    }
  }, [generatedDocs, addLogWithMetrics]);

  // ===== 7. Tab切换 =====

  const handleTabChange = useCallback((tab: typeof activeTab) => {
    setActiveTab(tab);
  }, [setActiveTab]);

  // ===== 8. 文档选择 =====

  const handleDocSelect = useCallback((doc: typeof selectedDoc) => {
    setSelectedDoc(doc);
  }, [setSelectedDoc]);

  // ===== 9. 工作表切换 =====

  const handleSheetChange = useCallback((sheetName: string) => {
    if (excelData) {
      setExcelData({
        ...excelData,
        currentSheetName: sheetName
      });
      addLogWithMetrics('sheet_change', 'success', `切换到工作表: ${sheetName}`);
    }
  }, [excelData, setExcelData, addLogWithMetrics]);

  // ===== 10. 设置模板文件（用于模板库） =====

  const handleTemplateFileChange = useCallback((template: typeof templateFile) => {
    if (template) {
      setTemplateFile(template);
    }
  }, [setTemplateFile]);

  // ===== 计算可用字段 =====

  const availableFields = useMemo(() => {
    if (!excelData?.sheets || !excelData.currentSheetName) {
      return [];
    }

    const currentSheet = excelData.sheets[excelData.currentSheetName];
    if (!currentSheet || currentSheet.length === 0) {
      return [];
    }

    return Object.keys(currentSheet[0] || {});
  }, [excelData]);

  // ===== 渲染 =====

  return (
    <div className="flex h-full bg-slate-50">
      {/* 左侧边栏 - 无需传递任何props */}
      <DocumentSpaceSidebar
        onTemplateUpload={handleTemplateUpload}
        onDataUpload={handleDataUpload}
        onInstructionChange={setUserInstruction}
        onPrimarySheetChange={setPrimarySheet}
        onEnabledSheetsChange={setEnabledSheets}
        onGenerateMapping={handleGenerateMapping}
        onGenerateDocs={handleGenerateDocs}
        onDownloadDoc={handleDownloadDoc}
        onDownloadAll={handleDownloadAll}
        onGenerationModeChange={setGenerationMode}
        onAggregateConfigChange={setAggregateConfig}
        onClearLogs={clearLogs}
        logsPerPage={logsPerPage}
        maxLogs={maxLogs}
        availableFields={availableFields}
      />

      {/* 右侧主内容区 - 无需传递任何props */}
      <DocumentSpaceMain
        onTabChange={handleTabChange}
        onDocSelect={handleDocSelect}
        onSheetChange={handleSheetChange}
        onTemplateFileChange={handleTemplateFileChange}
      />
    </div>
  );
};

export default DocumentSpace;
