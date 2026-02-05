import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Upload, FileDown, Play, Loader2, FileSpreadsheet, Layers, Trash2, Code, Plus, Archive, CheckSquare, Square, Download, AlertCircle, CheckCircle, Zap, Send } from 'lucide-react';
import { readExcelFile, exportToExcel, exportMultipleSheetsToExcel } from '../services/excelService';
import { ExcelData, ProcessingLog, AppView } from '../types';
import { useWorkspace } from '../contexts/WorkspaceContext';
// ✅ 修复：不再直接导入 AgenticOrchestrator（它应该在服务器端运行）
// ✅ 改为使用 API 客户端调用后端服务
import { smartProcessApi } from '../services/api/smartProcessApi';
import type { MultiStepTask, TaskResult, TaskStatus, LogEntry as AgenticLogEntry } from '../types/agenticTypes';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { SAMPLING_CONFIG } from '../config/samplingConfig';
import { logger } from '@/utils/logger';

// 数据质量功能导入
import { ModeSwitcher, WorkMode } from './SmartExcel/ModeSwitcher';
import { QualityRulePanel } from './SmartExcel/QualityRulePanel';
import { QualityResultPanel } from './SmartExcel/QualityResultPanel';
import { IssueHighlighter } from './SmartExcel/IssueHighlighter';
import { QualityRule, RuleExecutionResult, BatchExecutionResult } from '../types/qualityRule';
import { ruleRouter } from '../services/ruleRouter';

export const SmartExcel: React.FC = () => {
  const [filesData, setFilesData] = useState<ExcelData[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [lastGeneratedCode, setLastGeneratedCode] = useState('');

  const { setExcelData, setView } = useWorkspace();

  // 多步分析系统状态
  const [taskState, setTaskState] = useState<MultiStepTask | null>(null);
  const [agenticLogs, setAgenticLogs] = useState<AgenticLogEntry[]>([]);
  const [useAgenticMode, setUseAgenticMode] = useState(true); // 默认使用多步分析模式
  // ✅ 修复：移除 orchestrator 状态，现在通过 API 调用后端服务
  // const [orchestrator, setOrchestrator] = useState<AgenticOrchestrator | null>(null);

  // 数据质量检查状态
  const [workMode, setWorkMode] = useState<WorkMode>('processing'); // 工作模式：数据处理 | 质量检查
  const [qualityRules, setQualityRules] = useState<QualityRule[]>([]); // 质量规则列表
  const [qualityResults, setQualityResults] = useState<RuleExecutionResult[]>([]); // 规则执行结果
  const [batchResult, setBatchResult] = useState<BatchExecutionResult | null>(null); // 批量执行结果
  const [executingQualityCheck, setExecutingQualityCheck] = useState(false); // 质量检查执行中
  const [selectedIssue, setSelectedIssue] = useState<{ row: number, column: string } | null>(null); // 选中的问题

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 进度监控回调
  const handleProgressUpdate = useCallback((state: MultiStepTask) => {
    setTaskState(state);

    // ✅ 修复：不再需要从 orchestrator 获取日志（日志现在通过 API 返回）
    // 日志将通过 API 轮询或在结果中返回

    // 更新进度日志
    if (state.progress.percentage > 0) {
      setLogs(prev => [{
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: 'System',
        status: 'pending',
        message: `进度: ${state.progress.percentage}% - ${state.progress.message}`
      }, ...prev]);
    }
  }, []);

  // 任务状态显示文本映射
  const statusTextMap: Record<TaskStatus, string> = useMemo(() => ({
    idle: '空闲',
    observing: '观察数据...',
    thinking: 'AI思考中...',
    acting: '执行转换...',
    evaluating: '评估结果...',
    repairing: '修复错误...',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }), []);

  // 格式化质量分数
  const formatQualityScore = useCallback((score: number): string => {
    return `${Math.round(score * 100)}%`;
  }, []);

  // ==================== 数据质量检查功能 ====================

  /**
   * 处理规则执行
   */
  const handleExecuteQualityRules = useCallback(async (rules: QualityRule[]) => {
    if (filesData.length === 0) {
      alert('请先上传文件');
      return;
    }

    // 获取当前活动文件的数据
    const activeFile = filesData.find(f => f.id === activeFileId);
    if (!activeFile || !activeSheetName) {
      alert('请选择文件和工作表');
      return;
    }

    const data = activeFile.sheets[activeSheetName];
    if (!data || data.length === 0) {
      alert('当前工作表没有数据');
      return;
    }

    setExecutingQualityCheck(true);
    setQualityResults([]);
    setBatchResult(null);
    setSelectedIssue(null);

    // 添加日志
    setLogs(prev => [{
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: 'System',
      status: 'pending',
      message: `开始执行质量检查，共 ${rules.length} 条规则...`
    }, ...prev]);

    try {
      const result = await ruleRouter.executeRules(rules, data, {
        sampleSize: data.length > 1000 ? 100 : 0, // 大数据量时采样
        maxIssues: 100
      });

      setQualityResults(result.results);
      setBatchResult(result);

      // 统计结果
      const passed = result.results.filter(r => r.pass).length;
      const failed = result.results.filter(r => !r.pass).length;
      const totalIssues = result.results.reduce((sum, r) => sum + r.issues.length, 0);

      setLogs(prev => [{
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: 'System',
        status: failed === 0 ? 'success' : 'error',
        message: `质量检查完成！通过 ${passed}/${result.results.length}，发现 ${totalIssues} 个问题，耗时 ${Math.round(result.totalExecutionTime / 1000)}s`
      }, ...prev]);
    } catch (error) {
      console.error('质量检查失败:', error);
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      setLogs(prev => [{
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: 'System',
        status: 'error',
        message: `质量检查失败: ${errorMsg}`
      }, ...prev]);
      alert(`质量检查失败: ${errorMsg}`);
    } finally {
      setExecutingQualityCheck(false);
    }
  }, [filesData, activeFileId, activeSheetName]);

  /**
   * 处理问题点击
   */
  const handleIssueClick = useCallback((row: number, column: string) => {
    setSelectedIssue({ row, column });

    // 滚动到该行
    const tableRow = document.querySelector(`tr[data-row="${row}"]`);
    if (tableRow) {
      tableRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 添加日志
    setLogs(prev => [{
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: 'System',
      status: 'pending',
      message: `跳转到问题位置：行 ${row}，列 ${column}`
    }, ...prev]);
  }, []);

  /**
   * 处理规则变化
   */
  const handleRulesChange = useCallback((rules: QualityRule[]) => {
    setQualityRules(rules);
  }, []);

  /**
   * 关闭质量检查结果
   */
  const handleCloseQualityResults = useCallback(() => {
    setQualityResults([]);
    setBatchResult(null);
    setSelectedIssue(null);
  }, []);

  // 取消执行
  const cancelExecution = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // ✅ 修复：取消逻辑现在通过任务ID和 API 实现
    // 如果有当前运行的任务，可以通过 API 取消
    // TODO: 实现通过 API 取消任务的逻辑
    // if (currentTaskId) {
    //   try {
    //     await smartProcessApi.cancel(currentTaskId);
    //   } catch (error) {
    //     logger.error('Failed to cancel task via API', error);
    //   }
    // }

    setIsProcessing(false);
    setLogs(prev => [{
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: 'System',
      status: 'error',
      message: '用户取消了执行'
    }, ...prev]);
  }, []);

  // 当activeFileId改变时，设置activeSheetName为该文件的第一个sheet
  useEffect(() => {
    if (activeFileId) {
      const activeFile = filesData.find(f => f.id === activeFileId);
      if (activeFile && !activeSheetName) {
        setActiveSheetName(activeFile.currentSheetName);
      }
    } else {
      setActiveSheetName('');
    }
  }, [activeFileId, filesData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: ExcelData[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        try {
          const data = await readExcelFile(e.target.files[i]);
          newFiles.push(data);
        } catch (err) {
          logger.error(`Error reading file ${e.target.files[i].name}`, err);
        }
      }
      setFilesData(prev => [...prev, ...newFiles]);
      if (!activeFileId && newFiles.length > 0) {
        setActiveFileId(newFiles[0].id);
        setActiveSheetName(newFiles[0].currentSheetName);
      }
    }
  };

  const handleRun = async () => {
    if (filesData.length === 0 || !command.trim()) return;

    setIsProcessing(true);
    setLastGeneratedCode('');
    setTaskState(null);

    try {
      // 准备数据文件信息
      const dataFiles = filesData.map(f => ({
        id: f.id,
        fileName: f.fileName,
        sheets: f.sheets,
        currentSheetName: f.currentSheetName,
        metadata: f.metadata
      }));

      if (useAgenticMode) {
        // ✅ 修复：使用后端 API 调用智能处理服务（不再在前端实例化 AgenticOrchestrator）
        setLogs(prev => [{
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fileName: 'System',
          status: 'pending',
          message: '启动多步分析系统 (Observe-Think-Act-Evaluate)... 通过后端API服务'
        }, ...prev]);

        // ✅ 调用后端 API（AgenticOrchestrator 在服务器端运行）
        const apiResponse = await smartProcessApi.execute({
          command: command,
          files: dataFiles,
          options: {
            useAgenticMode: true,
            maxRetries: 3,
            qualityThreshold: 0.7,
            enableAutoRepair: true
          }
        });

        setLogs(prev => [{
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fileName: 'System',
          status: 'pending',
          message: `任务已创建 (ID: ${apiResponse.taskId})，正在处理...`
        }, ...prev]);

        // ✅ 等待任务完成（使用轮询）
        const result: TaskResult = await smartProcessApi.waitForCompletion(
          apiResponse.taskId,
          {
            pollInterval: 2000, // 每2秒轮询一次
            timeout: 300000, // 5分钟超时
            onProgress: (status) => {
              // 更新进度日志
              if (status.status === 'processing') {
                setLogs(prev => [{
                  id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  fileName: 'System',
                  status: 'pending',
                  message: `处理中... (已用时: ${Math.round((status.elapsed || 0) / 1000)}s)`
                }, ...prev]);
              }
            }
          }
        );

        // 处理结果
        if (result.success && result.data) {
          // 更新文件数据
          const updatedFilesData = [...filesData];
          let processedFiles = 0;

          Object.entries(result.data).forEach(([fileName, data]) => {
            // 处理多sheet结果（对象格式）
            if (typeof data === 'object' && !Array.isArray(data)) {
              const sheetsData = data as { [sheetName: string]: any[] };
              const existingIndex = updatedFilesData.findIndex(f => f.fileName === fileName);

              if (existingIndex >= 0) {
                const f = updatedFilesData[existingIndex];
                Object.entries(sheetsData).forEach(([sheetName, sheetData]) => {
                  if (Array.isArray(sheetData)) {
                    f.sheets[sheetName] = sheetData;
                  }
                });
                processedFiles++;
              } else {
                const firstSheetName = Object.keys(sheetsData)[0];
                updatedFilesData.push({
                  id: fileName + '-' + Date.now(),
                  fileName: fileName,
                  sheets: sheetsData,
                  currentSheetName: firstSheetName
                });
                processedFiles++;
              }
            }
            // 处理单sheet结果（数组格式）
            else if (Array.isArray(data)) {
              const existingIndex = updatedFilesData.findIndex(f => f.fileName === fileName);
              if (existingIndex >= 0) {
                const f = updatedFilesData[existingIndex];
                f.sheets[f.currentSheetName] = data;
                processedFiles++;
              } else {
                updatedFilesData.push({
                  id: fileName + '-' + Date.now(),
                  fileName: fileName,
                  sheets: { 'Sheet1': data },
                  currentSheetName: 'Sheet1'
                });
                processedFiles++;
              }
            }
          });

          setFilesData(updatedFilesData);

          // 显示质量报告
          if (result.qualityReport) {
            const qualityScore = formatQualityScore(result.qualityReport.overallQuality);
            setLogs(prev => [{
              id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              fileName: 'System',
              status: 'success',
              message: `执行完成！质量评分: ${qualityScore}，处理了 ${processedFiles} 个文件，耗时 ${Math.round(result.executionSummary.totalTime / 1000)}s`
            }, ...prev]);
          } else {
            setLogs(prev => [{
              id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              fileName: 'System',
              status: 'success',
              message: `执行完成。处理了 ${processedFiles} 个文件。`
            }, ...prev]);
          }
        } else {
          throw new Error('多步分析失败，尝试降级到单步执行');
        }
      } else {
        // 降级到单步执行模式（原有逻辑）
        await handleLegacyExecution(dataFiles);
      }
    } catch (e: any) {
      // 如果多步分析失败，尝试降级到单步执行
      if (useAgenticMode) {
        setLogs(prev => [{
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fileName: 'System',
          status: 'error',
          message: `多步分析失败: ${e.message}，降级到单步执行...`
        }, ...prev]);

        try {
          const dataFiles = filesData.map(f => ({
            id: f.id,
            fileName: f.fileName,
            sheets: f.sheets,
            currentSheetName: f.currentSheetName,
            metadata: f.metadata
          }));
          await handleLegacyExecution(dataFiles);
        } catch (legacyError: any) {
          setLogs(prev => [{
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fileName: 'System',
            status: 'error',
            message: `执行失败: ${legacyError.message}`
          }, ...prev]);
        }
      } else {
        setLogs(prev => [{
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fileName: 'System',
          status: 'error',
          message: e.message
        }, ...prev]);
      }
    } finally {
      setIsProcessing(false);
      // ✅ 修复：移除 setOrchestrator 调用（架构重构后不再需要）
    }
  };

  // ✅ 修复：单步执行模式现在也使用 API（不再直接调用 executeTransformation）
  const handleLegacyExecution = async (dataFiles: any[]) => {
    setLogs(prev => [{
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: 'System',
      status: 'pending',
      message: '使用快速执行模式（通过API）...'
    }, ...prev]);

    // ✅ 修复：直接调用 API，让后端处理所有逻辑（不再在前端生成代码）
    setLogs(prev => [{
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: 'System',
      status: 'pending',
      message: '正在通过 API 执行任务...'
    }, ...prev]);

    // ✅ 调用后端 API（快速模式：禁用多步分析和自动修复）
    const apiResponse = await smartProcessApi.execute({
      command: command,
      files: dataFiles,
      options: {
        maxRetries: 1, // 快速模式：只尝试1次，不重试
        qualityThreshold: 0.0, // 快速模式：不做质量评估
        enableAutoRepair: false, // 快速模式：不自动修复
        logLevel: 'warn' // 减少日志输出
      }
    });

    setLogs(prev => [{
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: 'System',
      status: 'pending',
      message: `任务已创建 (ID: ${apiResponse.taskId})，正在执行...`
    }, ...prev]);

    // ✅ 等待任务完成
    const result: TaskResult = await smartProcessApi.waitForCompletion(
      apiResponse.taskId,
      {
        pollInterval: 1000, // 每1秒轮询一次
        timeout: 60000, // 1分钟超时
        onProgress: (status) => {
          // 更新进度日志
          if (status.status === 'processing') {
            setLogs(prev => [{
              id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              fileName: 'System',
              status: 'pending',
              message: `执行中... (已用时: ${Math.round((status.elapsed || 0) / 1000)}s)`
            }, ...prev]);
          }
        }
      }
    );

    // 处理结果（与智能模式相同的逻辑）
    if (result.success && result.data) {
      const updatedFilesData = [...filesData];
      let processedFiles = 0;

      Object.entries(result.data).forEach(([fileName, data]) => {
        // 处理多sheet结果（对象格式）
        if (typeof data === 'object' && !Array.isArray(data)) {
          const sheetsData = data as { [sheetName: string]: any[] };
          const existingIndex = updatedFilesData.findIndex(f => f.fileName === fileName);

          if (existingIndex >= 0) {
            const f = updatedFilesData[existingIndex];
            Object.entries(sheetsData).forEach(([sheetName, sheetData]) => {
              if (Array.isArray(sheetData)) {
                f.sheets[sheetName] = sheetData;
              }
            });
            processedFiles++;
          } else {
            const firstSheetName = Object.keys(sheetsData)[0];
            updatedFilesData.push({
              id: fileName + '-' + Date.now(),
              fileName: fileName,
              sheets: sheetsData,
              currentSheetName: firstSheetName
            });
            processedFiles++;
          }
        }
        // 处理单sheet结果（数组格式）
        else if (Array.isArray(data)) {
          const existingIndex = updatedFilesData.findIndex(f => f.fileName === fileName);
          if (existingIndex >= 0) {
            const f = updatedFilesData[existingIndex];
            f.sheets[f.currentSheetName] = data;
            processedFiles++;
          } else {
            updatedFilesData.push({
              id: fileName + '-' + Date.now(),
              fileName: fileName,
              sheets: { 'Sheet1': data },
              currentSheetName: 'Sheet1'
            });
            processedFiles++;
          }
        }
      });

      if (processedFiles === 0) {
        throw new Error('没有成功处理任何文件数据');
      }

      setFilesData(updatedFilesData);
      setLogs(prev => [{
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: 'System',
        status: 'success',
        message: `执行完成。处理了 ${processedFiles} 个文件。`
      }, ...prev]);
    } else {
      throw new Error(result.error || '快速执行失败');
    }
  };

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFilesData(prev => prev.filter(f => f.id !== id));
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (activeFileId === id) {
      setActiveFileId(null);
      setActiveSheetName('');
    }
  };

  // 下载单个文件（所有sheets）
  const downloadSingleFile = (file: ExcelData, e: React.MouseEvent) => {
    e.stopPropagation();
    exportMultipleSheetsToExcel(file.sheets, file.fileName);
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };



  const handleSendToGenerator = (file: ExcelData, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExcelData(file);
    // Auto-select the active sheet if not set? 
    // WorkspaceContext doesn't treat sheets specially, just passes data. DocumentSpace handles it.
    setView(AppView.DOCUMENT_SPACE);
  };

  const handleSelectAll = () => {
    if (selectedFileIds.size === filesData.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filesData.map(f => f.id)));
    }
  };

  const handleBatchExport = async () => {
    if (selectedFileIds.size === 0) return;

    setIsProcessing(true);
    const zip = new JSZip();
    let count = 0;

    filesData.forEach(file => {
      if (selectedFileIds.has(file.id)) {
        // 为每个sheet创建worksheet
        const workbook = XLSX.utils.book_new();
        Object.entries(file.sheets).forEach(([sheetName, data]) => {
          const worksheet = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        });

        // Generate buffer
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

        let fileName = file.fileName;
        if (!fileName.endsWith('.xlsx')) fileName += '.xlsx';

        zip.file(fileName, excelBuffer);
        count++;
      }
    });

    if (count > 0) {
      try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `excelmind_batch_export_${Date.now()}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
        setLogs(prev => [{ id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, fileName: 'System', status: 'success', message: `成功打包并下载 ${count} 个文件。` }, ...prev]);
      } catch (e) {
        logger.error(e);
        setLogs(prev => [{ id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, fileName: 'System', status: 'error', message: '打包失败。' }, ...prev]);
      }
    }
    setIsProcessing(false);
  };

  const activeFile = filesData.find(f => f.id === activeFileId);
  const activeSheetData = activeFile && activeSheetName ? activeFile.sheets[activeSheetName] : null;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {workMode === 'processing' ? '智能多文件处理工作区' : '数据质量检查工作区'}
          </h2>
          <p className="text-sm text-slate-500">
            {workMode === 'processing'
              ? '上传多个文件，进行跨表核对、合并或筛选'
              : '使用质量规则检查数据，发现并修复问题'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 模式切换器 */}
          <ModeSwitcher
            currentMode={workMode}
            onModeChange={setWorkMode}
            disabled={filesData.length === 0}
          />

          <input
            type="file"
            multiple
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
            ref={fileInputRef}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors font-medium text-sm border border-emerald-200"
          >
            <Plus className="w-4 h-4" />
            添加文件
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* Left Panel */}
        <div className="w-[400px] flex flex-col border-r border-slate-200 bg-white shadow-sm z-10">
          {workMode === 'processing' ? (
            <>
              {/* 数据处理模式：文件列表和控制台 */}
              {/* File List Header Actions */}
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <button onClick={handleSelectAll} className="text-slate-500 hover:text-emerald-600 transition-colors" title="全选/取消全选">
                    {filesData.length > 0 && selectedFileIds.size === filesData.length ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                  <span className="text-sm font-semibold text-slate-700">文件列表 ({filesData.length})</span>
                </div>
                {selectedFileIds.size > 0 && (
                  <button
                    onClick={handleBatchExport}
                    className="text-xs flex items-center gap-1 bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    下载选中 ({selectedFileIds.size})
                  </button>
                )}
              </div>

              {/* File List */}
              <div className="flex-1 overflow-y-auto p-4 border-b border-slate-100">
                {filesData.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                    <p>工作区为空</p>
                    <p className="text-xs mt-1">请添加 Excel 文件</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {filesData.map((f) => (
                      <li
                        key={f.id}
                        onClick={() => setActiveFileId(f.id)}
                        className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${activeFileId === f.id
                          ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                          : 'bg-white border-slate-100 hover:bg-slate-50'
                          }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            onClick={(e) => toggleSelection(f.id, e)}
                            className="flex-shrink-0 text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            {selectedFileIds.has(f.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                          </div>
                          <div className={`p-2 rounded-lg ${activeFileId === f.id ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className={`text-sm font-medium truncate ${activeFileId === f.id ? 'text-slate-800' : 'text-slate-600'}`}>{f.fileName}</p>
                            <p className="text-xs text-slate-400">{Object.keys(f.sheets).length} 个工作表</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleSendToGenerator(f, e)}
                            className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="发送到文档生成"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => downloadSingleFile(f, e)}
                            className="text-slate-300 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="下载文件"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => removeFile(f.id, e)}
                            className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="删除文件"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* AI Command Area */}
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                {/* 多步分析状态显示 */}
                {taskState && isProcessing && (
                  <div className="mb-3 p-3 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">多步分析系统</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">
                          {taskState.progress.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${taskState.progress.percentage}%` }}
                      />
                    </div>

                    {/* 当前阶段 */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">
                        {statusTextMap[taskState.status as TaskStatus] || taskState.status}
                      </span>
                      {taskState.qualityReport && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className={`w-3 h-3 ${taskState.qualityReport.overallQuality >= 0.8 ? 'text-green-500' : 'text-yellow-500'}`} />
                          <span className="font-semibold text-slate-600">
                            质量: {formatQualityScore(taskState.qualityReport.overallQuality)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* OTAE 步骤指示器 */}
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      {[
                        { key: 'observing', label: '观察', icon: '👁️' },
                        { key: 'thinking', label: '思考', icon: '🧠' },
                        { key: 'acting', label: '执行', icon: '⚡' },
                        { key: 'evaluating', label: '评估', icon: '✅' }
                      ].map((step) => {
                        const isActive = taskState.status === step.key;
                        const isCompleted = ['observing', 'thinking'].includes(step.key) &&
                          ['acting', 'evaluating', 'completed'].includes(taskState.status);

                        return (
                          <div
                            key={step.key}
                            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg transition-all ${isActive ? 'bg-emerald-500 text-white font-bold' :
                              isCompleted ? 'bg-emerald-100 text-emerald-700' :
                                'bg-slate-100 text-slate-400'
                              }`}
                          >
                            <span>{step.icon}</span>
                            <span className="hidden sm:inline">{step.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* 错误重试信息 */}
                    {taskState.status === 'repairing' && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                        <AlertCircle className="w-3 h-3" />
                        <span className="font-medium">检测到错误，正在自动修复...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 模式切换和工具栏 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-700">AI 指令</span>
                  <div className="flex items-center gap-2">
                    {/* 模式切换 */}
                    <button
                      onClick={() => setUseAgenticMode(!useAgenticMode)}
                      className={`text-xs px-2 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${useAgenticMode
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      title={useAgenticMode ? '多步分析模式：支持自我修复和质量评估' : '单步执行模式：快速执行'}
                    >
                      <Zap className="w-3 h-3" />
                      {useAgenticMode ? '智能模式' : '快速模式'}
                    </button>
                    <button
                      onClick={() => setShowCode(!showCode)}
                      className="text-xs font-normal text-slate-400 hover:text-emerald-600 flex items-center gap-1"
                    >
                      <Code className="w-3 h-3" /> {showCode ? '隐藏代码' : '查看代码'}
                    </button>
                  </div>
                </div>

                {showCode && lastGeneratedCode && (
                  <div className="mb-3 p-2 bg-slate-900 text-green-400 text-xs font-mono rounded-lg max-h-32 overflow-y-auto">
                    <pre>{lastGeneratedCode}</pre>
                  </div>
                )}

                <textarea
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="描述您的跨文件需求... &#10;例如：'对比表A和表B，找出金额不一致的行，存为新文件差异表'"
                  className="w-full h-24 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 resize-none bg-white text-sm shadow-sm"
                />

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleRun}
                    disabled={isProcessing || !command || filesData.length === 0}
                    className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all text-sm ${isProcessing || !command || filesData.length === 0
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-emerald-900/20'
                      }`}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    执行智能处理
                  </button>

                  {isProcessing && (
                    <button
                      onClick={cancelExecution}
                      className="px-4 py-2.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-all font-bold text-sm flex items-center gap-2"
                      title="取消执行"
                    >
                      <AlertCircle className="w-4 h-4" />
                      取消
                    </button>
                  )}
                </div>

                {/* 执行统计信息 */}
                {taskState && !isProcessing && taskState.status === 'completed' && (
                  <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 font-bold text-sm mb-2">
                      <CheckCircle className="w-4 h-4" />
                      执行完成
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      {taskState.result?.executionSummary && (
                        <>
                          <div>总步骤: {taskState.result.executionSummary.totalSteps}</div>
                          <div>成功: {taskState.result.executionSummary.successfulSteps}</div>
                          <div>耗时: {Math.round(taskState.result.executionSummary.totalTime / 1000)}s</div>
                          <div>失败: {taskState.result.executionSummary.failedSteps}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Logs */}
              <div className="h-32 bg-slate-900 overflow-y-auto p-3 text-xs font-mono">
                {logs.length === 0 ? (
                  <span className="text-slate-600">等待指令...</span>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="mb-1.5 flex gap-2">
                      <span className={`uppercase font-bold ${log.status === 'success' ? 'text-green-400' :
                        log.status === 'error' ? 'text-red-400' : 'text-yellow-400'
                        }`}>[{log.status}]</span>
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* 质量检查模式：规则管理面板 */}
              <QualityRulePanel
                onRulesChange={handleRulesChange}
                onExecuteRules={handleExecuteQualityRules}
                executing={executingQualityCheck}
              />

              {/* 质量检查日志（简化版） */}
              <div className="h-32 bg-slate-900 overflow-y-auto p-3 text-xs font-mono border-t border-slate-200">
                {logs.length === 0 ? (
                  <span className="text-slate-600">等待质量检查...</span>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="mb-1.5 flex gap-2">
                      <span className={`uppercase font-bold ${log.status === 'success' ? 'text-green-400' :
                        log.status === 'error' ? 'text-red-400' : 'text-yellow-400'
                        }`}>[{log.status}]</span>
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
          {/* 质量检查模式：优先显示结果面板 */}
          {workMode === 'quality' && qualityResults.length > 0 ? (
            <QualityResultPanel
              results={qualityResults}
              batchResult={batchResult || undefined}
              data={activeSheetData || []}
              onIssueClick={handleIssueClick}
              onClose={handleCloseQualityResults}
            />
          ) : activeFile && activeSheetData ? (
            /* 数据预览（包裹在 IssueHighlighter 中） */
            <IssueHighlighter
              data={activeSheetData}
              issues={qualityResults.flatMap(r => r.issues)}
              highlightedCell={selectedIssue}
              onCellClick={handleIssueClick}
            >
              {({ getCellStyle, getCellClassName, handleCellClick: handleClick }) => (
                <div className="flex-1 flex flex-col m-4 bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                  <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-700">{activeFile.fileName}</h3>
                      {Object.keys(activeFile.sheets).length > 1 && (
                        <select
                          value={activeSheetName}
                          onChange={(e) => setActiveSheetName(e.target.value)}
                          className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 outline-none cursor-pointer hover:bg-emerald-100 transition-colors"
                        >
                          {Object.keys(activeFile.sheets).map(sheetName => (
                            <option key={sheetName} value={sheetName}>{sheetName}</option>
                          ))}
                        </select>
                      )}
                      {Object.keys(activeFile.sheets).length === 1 && (
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{activeSheetName}</span>
                      )}
                      <span className="text-xs text-slate-400">({activeSheetData.length} 行)</span>
                      {workMode === 'quality' && qualityResults.length > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                          {qualityResults.reduce((sum, r) => sum + r.issues.length, 0)} 个问题
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSendToGenerator(activeFile)}
                        className="text-xs flex items-center gap-1 text-white bg-blue-600 hover:bg-blue-700 font-medium px-3 py-1.5 rounded-lg shadow-sm transition-all"
                        title="使用此数据生成文档"
                      >
                        <Send className="w-3.5 h-3.5" /> 发送到生成器
                      </button>
                      <button
                        onClick={() => exportMultipleSheetsToExcel(activeFile.sheets, activeFile.fileName)}
                        className="text-xs flex items-center gap-1 text-slate-600 hover:text-emerald-600 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 transition-all"
                        title="导出所有工作表"
                      >
                        <FileDown className="w-3.5 h-3.5" /> 导出文件 {Object.keys(activeFile.sheets).length > 1 && `(${Object.keys(activeFile.sheets).length}个工作表)`}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto w-full">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="w-12 p-2 bg-slate-50 border-b border-r border-slate-200 text-center text-slate-400 text-xs font-mono sticky top-0 z-10">#</th>
                          {activeSheetData.length > 0 && Object.keys(activeSheetData[0]).map((header) => (
                            <th key={header} className="p-2 border-b border-r border-slate-100 bg-slate-50 sticky top-0 font-semibold text-slate-600 whitespace-nowrap min-w-[100px] z-10">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeSheetData.slice(0, 200).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-blue-50/30 border-b border-slate-50 last:border-0 group">
                            <td className="p-2 bg-slate-50 border-r border-slate-100 text-center text-slate-400 text-xs font-mono group-hover:bg-blue-50/30">{rIdx + 1}</td>
                            {Object.entries(row).map(([col, cell], cIdx) => (
                              <td
                                key={cIdx}
                                style={getCellStyle(rIdx, col)}
                                className={getCellClassName(rIdx, col)}
                                onClick={() => handleClick(rIdx, col)}
                              >
                                {String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {activeSheetData.length === 0 && (
                      <div className="p-10 text-center text-slate-400">
                        此表无数据
                      </div>
                    )}
                    {activeSheetData.length > 200 && (
                      <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                        预览前 200 行 (共 {activeSheetData.length} 行)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </IssueHighlighter>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
              <Layers className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">选择左侧文件以预览数据</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 添加默认导出以支持React.lazy()
export default SmartExcel;