import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileDown, Play, Loader2, FileSpreadsheet, Layers, Trash2, Code, Plus, Archive, CheckSquare, Square, Search, Eye, Terminal, Info, ChevronRight, MessageSquare, PanelLeft, PanelRight, X, ChevronLeft, Sparkles, Send, Bot, Zap, ShieldCheck, Check, RotateCcw, ShieldQuestion, Ban } from 'lucide-react';
import { readExcelFile, exportMultipleSheetsToExcel, exportToExcel } from '../services/excelService';
import { runAgenticLoop } from '../services/zhipuService';
import { auditExportService } from '../services/excelExportService';
import { createToolExecutor } from '../services/agent/executor';
import { ClipboardList } from 'lucide-react';
import { runPython } from '../services/pyodideService';
import { ExcelData, ProcessingLog, AgenticStep, TraceSession } from '../types';
import { usePyodide } from '../hooks/usePyodide';
import { useTraceLogger } from '../hooks/useTraceLogger';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

export const SmartExcel: React.FC = () => {
  // Use Pyodide Hook
  const {
    filesData,
    setFilesData,
    filesDataRef,
    isSandboxDirty,
    executeCodeInSandbox,
    resetFiles,
    addFiles,
    removeFile: removeFileFromSandbox,
    selectedFileIds,
    setSelectedFileIds
  } = usePyodide();

  // Use Trace Logger Hook
  const { lastTrace, setLastTrace, downloadTrace } = useTraceLogger();

  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [command, setCommand] = useState('');

  // UI Panels states
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false); // Default closed, opens on run

  const [isCommandBarCollapsed, setIsCommandBarCollapsed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [agentSteps, setAgentSteps] = useState<AgenticStep[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [lastGeneratedCode, setLastGeneratedCode] = useState('');
  const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(true);
  const [pendingStepApproval, setPendingStepApproval] = useState<{
    step: AgenticStep;
    resolve: (approved: boolean, feedback?: string) => void;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Multi-tab persistence: Sync UI filesData with Sandbox on mount
  // Sync UI filesData with Sandbox on mount is now handled by usePyodide's internal state init if needed,
  // but for now, we rely on the specific sync logic.
  // Actually, let's keep the sync logic here but use the hook's setters.
  useEffect(() => {
    const syncFilesFromSandbox = async () => {
      try {
        const { listFiles } = await import('../services/pyodideService');
        const sandboxFiles = await listFiles();
        if (Object.keys(sandboxFiles).length > 0) {
          addLog('System', 'success', `已自动恢复沙箱中的 ${Object.keys(sandboxFiles).length} 个存量文件`);
          const restoredFiles: ExcelData[] = [];
          Object.entries(sandboxFiles).forEach(([fn, sheets]) => {
            // Only restore if it looks like an Excel file (or has actual sheets data)
            const isExcel = fn.endsWith('.xlsx') || fn.endsWith('.xls') || fn.endsWith('.csv');
            if (!isExcel && Object.keys(sheets).length === 0) return;

            // Basic restoration
            restoredFiles.push({
              id: fn + '-' + Date.now(),
              fileName: fn,
              sheets: sheets,
              metadata: {},
              currentSheetName: Object.keys(sheets)[0]
            });
          });
          // Use hook's addFiles to update state and ref
          addFiles(restoredFiles);
        }
      } catch (err) {
        console.warn('[Sync] Failed to list sandbox files:', err);
      }
    };
    syncFilesFromSandbox();
  }, [addFiles]);

  const handleResetSandbox = async () => {
    if (!confirm("确定要清空沙箱及其所有临时文件吗？此操作不可撤销。")) return;
    try {
      await resetFiles();
      setActiveFileId(null);
      setAgentSteps([]);
      setLogs([]);
      addLog('System', 'success', '沙箱环境已完全重置');
    } catch (err: any) {
      addLog('System', 'error', `重置失败: ${err.message}`);
    }
  };

  const stopAgent = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addLog('System', 'error', '用户手动终止了 AI 任务');
      setIsProcessing(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFile = useMemo(() => filesData.find(f => f.id === activeFileId), [filesData, activeFileId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: ExcelData[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        try {
          const data = await readExcelFile(e.target.files[i]);
          newFiles.push(data);
        } catch (err) {
          console.error(`Error reading file ${e.target.files[i].name}`, err);
        }
      }
      setFilesData(prev => [...prev, ...newFiles]);
      isSandboxDirty.current = true;
      if (!activeFileId && newFiles.length > 0) {
        setActiveFileId(newFiles[0].id);
      }
    }
  };

  const addLog = (fileName: string, status: 'pending' | 'success' | 'error', message: string) => {
    setLogs(prev => [{ id: Date.now().toString() + Math.random(), fileName, status, message }, ...prev]);
  };


  const handleRun = async () => {
    if (filesData.length === 0 || !command.trim()) return;
    setIsProcessing(true);
    setRightPanelOpen(true); // Auto-open thinking hub
    setAgentSteps([]);
    abortControllerRef.current = new AbortController();
    addLog('System', 'pending', `🚀 启动智能推理中枢 (Privacy Mode: ${isPrivacyEnabled ? 'ON' : 'OFF'})...`);

    try {
      // 1. Initial Context
      const initialContext = filesData.map(f => ({
        fileName: f.fileName,
        sheets: Object.keys(f.sheets).map(sheetName => {
          const rows = f.sheets[sheetName] || [];
          const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
          const meta = f.metadata?.[sheetName];
          return {
            sheetName,
            headers,
            rowCount: meta?.rowCount || rows.length,
            columnCount: meta?.columnCount || headers.length
          };
        })
      }));

      // 2. Define Tool Executor (Phase 13 Shared Facade)
      const executeTool = createToolExecutor({
        currentFiles: filesDataRef.current,
        isSandboxDirty,
        setFilesData: (updater) => {
          setFilesData((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            filesDataRef.current = next;

            // Auto-select new files
            const currentIds = new Set(prev.map(f => f.id));
            const newIds = next.filter(f => !currentIds.has(f.id)).map(f => f.id);
            if (newIds.length > 0) {
              setSelectedFileIds(sel => new Set([...sel, ...newIds]));
              if (!activeFileId) setActiveFileId(newIds[0]);
            }
            return next;
          });
        },
        addLog,
        setAgentSteps,
      });
      // 3. Start Agent Loop (Continuous)
      const onStep = (step: AgenticStep) => {
        setAgentSteps(prev => [...prev, step]);
        addLog('Agent Phase', 'success', step.thought);
        console.log('[Agent Thought]', step.thought);
      };

      const result = await runAgenticLoop(
        command,
        initialContext,
        onStep,
        executeTool,
        isPrivacyEnabled,
        async (step) => {
          // AUTO MODE: Automatically approve if enabled
          if (isAutoMode) {
            console.log('[Auto Mode] Auto-approving step:', step.thought);
            return { approved: true };
          }

          return new Promise((resolve) => {
            // Mark step as awaiting approval
            setAgentSteps(prev => {
              const next = [...prev];
              if (next.length > 0) {
                next[next.length - 1] = { ...next[next.length - 1], status: 'approving' };
              }
              return next;
            });

            setPendingStepApproval({
              step,
              resolve: (approved: boolean, feedback?: string) => {
                setPendingStepApproval(null);
                setAgentSteps(prev => {
                  const next = [...prev];
                  if (next.length > 0) {
                    next[next.length - 1] = {
                      ...next[next.length - 1],
                      status: approved ? 'executing' : 'rejected'
                    };
                  }
                  return next;
                });
                resolve({ approved, feedback });
              }
            });
          });
        },
        abortControllerRef.current?.signal
      );

      setLastTrace(result.trace || null);
      addLog('System', 'success', `任务完成: ${result.explanation}`);
      console.log('[System] Agentic Loop finished successfully.');

    } catch (e: any) {
      console.error("Agentic Loop Error in UI:", e);
      addLog('System', 'error', `核心引擎报错: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFilesData(prev => prev.filter(f => f.id !== id));
    isSandboxDirty.current = true;
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (activeFileId === id) setActiveFileId(null);
  };

  const handleBatchExport = async () => {
    if (selectedFileIds.size === 0) return;
    setIsProcessing(true);
    const zip = new JSZip();
    let count = 0;

    filesData.forEach(file => {
      if (selectedFileIds.has(file.id)) {
        const workbook = XLSX.utils.book_new();
        Object.entries(file.sheets).forEach(([sheetName, data]) => {
          const worksheet = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        });
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        zip.file(file.fileName.endsWith('.xlsx') ? file.fileName : `${file.fileName}.xlsx`, excelBuffer);
        count++;
      }
    });

    if (count > 0) {
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `excelmind_export_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setIsProcessing(false);
  };

  const handleAuditStandardExport = async () => {
    if (selectedFileIds.size === 0) return;
    setIsProcessing(true);
    addLog('System', 'pending', '正在生成审计标准底稿...');

    try {
      const zip = new JSZip();
      let count = 0;

      for (const file of filesData) {
        if (selectedFileIds.has(file.id)) {
          // Prepare multi-sheet data for this file
          const sheetsData = Object.entries(file.sheets).map(([name, data]) => {
            const headers = data.length > 0 ? Object.keys(data[0]) : [];
            return { name, headers, data };
          });

          const auditBlob = await auditExportService.generateMultiSheetAuditReport(
            file.fileName,
            sheetsData
          );

          zip.file(file.fileName.endsWith('.xlsx') ? file.fileName : `${file.fileName}.xlsx`, auditBlob);
          count++;
        }
      }

      if (count > 0) {
        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit_workpapers_${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        addLog('System', 'success', '审计标准底稿导出成功！');
      }
    } catch (err: any) {
      addLog('System', 'error', `导出失败: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const activeSheetData = activeFile ? activeFile.sheets[activeFile.currentSheetName] : null;
  const activeSheetMeta = activeFile?.metadata ? activeFile.metadata[activeFile.currentSheetName] : null;

  return (
    <div className="h-full flex flex-col bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900 transition-all duration-500">
      {/* Top Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-200 ring-4 ring-emerald-50">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-800 tracking-tight">SmartExcel 智能工坊</h1>
                <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest shadow-sm shadow-emerald-100 italic">v3.0 Premium</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Industrial Data Workbench</p>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

          <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className={`p-2 rounded-lg transition-all ${leftPanelOpen ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="文件库"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={`p-2 rounded-lg transition-all ${rightPanelOpen ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="推理枢纽"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-1 hidden lg:block" />

          {/* Privacy Toggle */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm hover:border-emerald-200 transition-colors group">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">Privacy Shield</span>
              <span className={`text-[10px] font-bold ${isPrivacyEnabled ? 'text-emerald-600' : 'text-slate-400'} transition-colors`}>{isPrivacyEnabled ? '已开启脱敏' : '关闭中'}</span>
            </div>
            <button
              onClick={() => setIsPrivacyEnabled(!isPrivacyEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ring-offset-2 focus:ring-2 focus:ring-emerald-500 ${isPrivacyEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPrivacyEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <ShieldCheck className={`w-4 h-4 transition-all ${isPrivacyEnabled ? 'text-emerald-500 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'text-slate-300'}`} />
          </div>
        </div>

        <div className="flex gap-3">
          <input type="file" multiple accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" ref={fileInputRef} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group flex items-center gap-2 px-4 py-2 bg-white text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all font-bold text-xs border border-slate-200 hover:border-emerald-200 shadow-sm"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            导入数据
          </button>

          <div className="h-8 w-px bg-slate-200 mx-1" />

          <div className="flex items-center gap-2">
            <button
              disabled={selectedFileIds.size === 0}
              onClick={handleBatchExport}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all shadow-lg ${selectedFileIds.size > 0 ? 'bg-slate-800 text-white hover:bg-slate-900 hover:scale-[1.02] active:scale-[0.98]' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                }`}
            >
              <Archive className="w-4 h-4" />
              快速打包({selectedFileIds.size})
            </button>
            <button
              disabled={selectedFileIds.size === 0}
              onClick={handleAuditStandardExport}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all shadow-lg ${selectedFileIds.size > 0 ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-emerald-200 hover:scale-[1.05] active:scale-[0.98] ring-2 ring-emerald-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              title="生成带专业格式和公式链接的审计底稿"
            >
              <ClipboardList className="w-4 h-4" />
              审计出口
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: File Library */}
        <aside
          className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-500 ease-in-out z-30 ${leftPanelOpen ? 'w-[420px] opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full overflow-hidden border-none'
            }`}
        >
          <div className="flex-1 flex flex-col min-w-[420px]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">文件存储库 ({filesData.length})</span>
              </div>
              <button
                onClick={() => setSelectedFileIds(filesData.length === selectedFileIds.size ? new Set() : new Set(filesData.map(f => f.id)))}
                className="text-[10px] bg-slate-200/50 text-slate-600 px-2.5 py-1 rounded-lg hover:bg-slate-200 transition-colors font-black uppercase tracking-tight"
              >
                {selectedFileIds.size === filesData.length ? '取消全选' : '全部选择'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filesData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2.5rem] m-2">
                  <div className="bg-slate-50 p-6 rounded-full mb-4">
                    <Upload className="w-10 h-10 opacity-40 text-emerald-600" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">资源库为空</p>
                  <p className="text-[10px] text-slate-300 mt-1">导入 Excel 开始智能工作</p>
                </div>
              ) : (
                filesData.map(f => (
                  <div
                    key={f.id}
                    onClick={() => setActiveFileId(f.id)}
                    className={`group relative p-4 rounded-3xl cursor-pointer transition-all border-2 shadow-sm ${activeFileId === f.id
                      ? 'bg-emerald-50/80 border-emerald-500/40 shadow-emerald-100/50 scale-[1.02]'
                      : 'bg-white border-slate-100/50 hover:border-emerald-200/50 hover:bg-slate-50/80'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div draggable="true" onClick={(e) => { e.stopPropagation(); setSelectedFileIds(prev => { const n = new Set(prev); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; }); }}>
                        {selectedFileIds.has(f.id) ? (
                          <div className="w-5 h-5 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-200 animate-in zoom-in-50 duration-200">
                            <CheckSquare className="w-3.5 h-3.5 text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-slate-200 rounded-lg hover:border-emerald-400 transition-colors bg-white" />
                        )}
                      </div>
                      <div className={`p-2.5 rounded-2xl transition-all shadow-md ${activeFileId === f.id ? 'bg-emerald-600 text-white rotate-6' : 'bg-slate-100 text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50'}`}>
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black truncate leading-tight ${activeFileId === f.id ? 'text-emerald-900' : 'text-slate-700'}`}>{f.fileName}</p>
                        <div className="flex items-center gap-3 mt-1.5 opacity-60">
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <Layers className="w-3 h-3" /> {Object.keys(f.sheets).length} Sheets
                          </span>
                          {f.metadata && Object.values(f.metadata).some(m => (m as any).comments && Object.keys((m as any).comments).length > 0) && (
                            <span className="text-[10px] flex items-center gap-1 text-blue-600 font-black">
                              <MessageSquare className="w-3 h-3 text-blue-400" /> ANNOTATED
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => removeFile(f.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-500 hover:text-white rounded-xl text-slate-300 transition-all hover:shadow-lg hover:shadow-rose-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Center Panel: Main Data Display & Floating Command Bar */}
        <main className="flex-1 bg-slate-50 relative flex flex-col p-4 md:p-6 overflow-hidden transition-all duration-500">
          {!leftPanelOpen && (
            <button
              onClick={() => setLeftPanelOpen(true)}
              className="absolute left-6 top-10 bg-white/80 backdrop-blur shadow-xl border border-slate-100 p-3 rounded-2xl text-slate-400 hover:text-emerald-600 hover:scale-110 transition-all z-40 group"
            >
              <PanelLeft className="w-5 h-5 group-hover:rotate-12" />
            </button>
          )}

          {activeFile ? (
            <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-white/60 overflow-hidden relative group/preview">
              {/* Data Header: Title and Sheet Tabs */}
              <div className="px-8 py-6 bg-white border-b border-slate-100/60">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 flex items-center justify-center rounded-[1.25rem] text-emerald-600 shadow-inner">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800 tracking-tight">{activeFile.fileName}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-emerald-600 font-black px-2 py-0.5 bg-emerald-100/50 rounded-full lowercase tracking-widest">{activeFile.currentSheetName}</span>
                        <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest leading-none">REAL-TIME DATA PREVIEW</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => exportToExcel(activeSheetData || [], activeFile.fileName)} className="text-[11px] flex items-center gap-2.5 text-slate-600 hover:text-white bg-white hover:bg-emerald-600 font-black px-5 py-2.5 rounded-2xl border border-slate-200 hover:border-emerald-600 transition-all shadow-sm hover:shadow-emerald-200">
                      <FileDown className="w-4 h-4" /> 导出本表
                    </button>
                  </div>
                </div>

                {/* Sheet Tabs */}
                <div className="flex items-center gap-1.5 bg-slate-100/60 p-1.5 rounded-[1.2rem] w-fit border border-slate-200/50">
                  {Object.keys(activeFile.sheets).map(sheetName => (
                    <button
                      key={sheetName}
                      onClick={() => {
                        const updated = [...filesData];
                        const f = updated.find(x => x.id === activeFileId);
                        if (f) f.currentSheetName = sheetName;
                        setFilesData(updated);
                      }}
                      className={`px-5 py-2 rounded-[0.9rem] text-xs font-black transition-all ${activeFile.currentSheetName === sheetName
                        ? 'bg-white text-emerald-700 shadow-md border border-slate-100 scale-[1.05]'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                        }`}
                    >
                      {sheetName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Content */}
              <div className="flex-1 overflow-auto bg-white custom-scrollbar pb-32">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                  <thead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">
                    <tr>
                      <th className="w-14 p-4 bg-slate-50/50 border-b border-r border-slate-100 text-center text-slate-400 text-[10px] font-black font-mono">ID</th>
                      {activeSheetData && activeSheetData.length > 0 && Object.keys(activeSheetData[0]).map((header) => (
                        <th key={header} className="p-4 border-b border-r border-slate-100/50 bg-slate-50/50 font-black text-slate-500 whitespace-nowrap min-w-[140px] uppercase tracking-wider text-[11px]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activeSheetData && activeSheetData.slice(0, 500).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-emerald-50/20 transition-colors group/row">
                        <td className="p-4 bg-slate-50/10 border-r border-slate-50 text-center text-slate-400 text-[10px] font-black font-mono group-hover/row:bg-emerald-50/30">{rIdx + 1}</td>
                        {Object.entries(row).map(([key, cell], cIdx) => {
                          const address = XLSX.utils.encode_cell({ r: rIdx + 1, c: cIdx });
                          const comment = activeSheetMeta?.comments[address];
                          return (
                            <td key={cIdx} className="p-4 border-r border-slate-50 text-slate-600 whitespace-nowrap max-w-sm overflow-hidden text-ellipsis relative">
                              {String(cell)}
                              {comment && (
                                <div className="absolute top-0 right-0 p-1.5 cursor-help group/comment">
                                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-500/50" />
                                  <div className="hidden group-hover/comment:block absolute z-30 bottom-full right-0 mb-3 w-72 p-4 bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl border border-white/10 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10 text-blue-400 font-black text-[10px] uppercase tracking-widest">
                                      <MessageSquare className="w-3.5 h-3.5" /> 单元格批注 ({address})
                                    </div>
                                    <p className="text-white/90 text-xs leading-relaxed font-medium">{comment}</p>
                                    <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-slate-900 rotate-45" />
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Stats */}
              <div className="px-8 py-5 bg-slate-50/50 backdrop-blur-md border-t border-slate-100 flex items-center justify-between absolute bottom-0 left-0 right-0 z-10 transition-transform duration-500">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-tighter">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-sm shadow-emerald-400" />
                    TOTAL ROWS: <span className="text-slate-900">{activeSheetData?.length || 0}</span>
                  </div>
                  {activeSheetMeta && Object.keys(activeSheetMeta.comments).length > 0 && (
                    <div className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-tighter">
                      <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm shadow-blue-400" />
                      ANNOTATIONS: <span className="text-slate-900">{Object.keys(activeSheetMeta.comments).length}</span>
                    </div>
                  )}
                </div>
                <p className="text-[9px] font-black text-slate-300 tracking-[0.2em] uppercase italic bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">Preview performance mode enabled</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-emerald-500 blur-[100px] rounded-full opacity-10 animate-pulse" />
                <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-white/50 relative z-10">
                  <Layers className="w-24 h-24 text-emerald-500/20 animate-bounce duration-[3000ms]" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-400 mb-2 uppercase tracking-[0.3em]">等待载入</h3>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">请选择一个数据集进行工作</p>
            </div>
          )}

          {/* Floating Command Bar - Fixed Clipping & Multi-line (v3.2) + Minimizable (v3.3) */}
          <div className="absolute bottom-6 inset-x-0 z-40 px-4 md:px-8 pointer-events-none flex justify-center">
            {isCommandBarCollapsed ? (
              /* Minimized Bubble */
              <button
                onClick={() => setIsCommandBarCollapsed(false)}
                className="pointer-events-auto w-14 h-14 bg-slate-900 shadow-2xl rounded-full border border-white/10 flex items-center justify-center text-emerald-400 hover:scale-110 active:scale-95 transition-all group relative animate-in zoom-in duration-300 ring-4 ring-emerald-500/10"
                title="展开指令栏"
              >
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-20" />
                <MessageSquare className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
              </button>
            ) : (
              /* Expanded Bar */
              <div className={`pointer-events-auto transition-all duration-500 w-full max-w-4xl animate-in slide-in-from-bottom-4 ${!leftPanelOpen && !rightPanelOpen ? 'scale-105' : 'scale-100'
                }`}>
                <div className="bg-slate-900/90 backdrop-blur-3xl p-2.5 md:p-3 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 flex items-end gap-2 md:gap-4 ring-1 ring-white/5 hover:ring-emerald-500/30 transition-all group-focus-within/cmd:ring-emerald-500 group-focus-within/cmd:shadow-emerald-500/20 group/cmd relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none" />

                  <button
                    onClick={() => setIsCommandBarCollapsed(true)}
                    className="bg-emerald-500/10 p-3 md:p-3.5 rounded-2xl md:rounded-[1.8rem] text-emerald-400 shadow-inner mb-0.5 flex-shrink-0 relative z-10 hover:bg-emerald-500/20 transition-colors group/mini"
                    title="收起指令栏"
                  >
                    <ChevronLeft className="w-5 h-5 group-hover/mini:scale-90 transition-transform" />
                  </button>

                  <div className="flex-1 min-w-0 py-1 relative z-10 mb-0.5">
                    <textarea
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleRun();
                        }
                      }}
                      rows={1}
                      placeholder="在此输入数据处理指令... (Enter 发送, Shift+Enter 换行)"
                      className="w-full bg-transparent border-none outline-none text-white text-sm md:text-base font-medium placeholder:text-slate-500 placeholder:font-bold py-2 px-1 resize-none max-h-[40vh] custom-scrollbar leading-relaxed"
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2 mb-0.5 ml-1 relative z-10">
                    {command.includes('\n') && (
                      <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest hidden lg:block mr-2 mb-1.5 whitespace-nowrap">
                        {command.split('\n').length} LINES
                      </span>
                    )}
                    <button
                      onClick={handleRun}
                      disabled={isProcessing || !command || filesData.length === 0}
                      className={`p-3 md:p-3.5 rounded-2xl md:rounded-[1.8rem] transition-all flex items-center justify-center gap-2 group/btn active:scale-95 flex-shrink-0 ${isProcessing || !command || filesData.length === 0
                        ? 'bg-slate-800 text-slate-600'
                        : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-500'
                        }`}
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scoped Processing Overlay (V5.4.1 Fix) */}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[45] flex flex-col items-center justify-center animate-in fade-in duration-300 rounded-[2.5rem] m-4 md:m-6">
              <div className="bg-white/90 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl border border-white/50 flex flex-col items-center max-w-sm w-full relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-50" />
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                  <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin duration-1000" />
                  <div className="absolute inset-0 m-auto w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 animate-bounce">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1 uppercase tracking-tight text-center">AI 智能处理中</h3>
                <p className="text-[10px] text-slate-500 text-center leading-relaxed font-bold uppercase tracking-widest px-4 mb-6">
                  Agent 正在沙箱环境进行深度分析...
                </p>
                <button
                  onClick={stopAgent}
                  className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black py-2.5 rounded-xl text-[9px] uppercase tracking-widest transition-all active:scale-95 border border-rose-200/50"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 立即终止任务 / STOP AGENT
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Right Panel: Thinking Hub */}
        <aside
          className={`flex flex-col border-l border-slate-200 bg-white transition-all duration-500 ease-in-out z-30 shadow-2xl h-full min-h-0 ${rightPanelOpen ? 'w-[480px] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full overflow-hidden border-none'
            }`}
        >
          <div className="flex-1 flex flex-col min-w-[480px] bg-slate-900 overflow-hidden h-full min-h-0">
            <div className="px-6 py-5 bg-slate-800/80 backdrop-blur-md border-b border-white/5 z-10 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] leading-none block">思维枢纽 / Reasoning Hub</span>
                    <span className="text-[9px] text-emerald-400 font-bold tracking-widest mt-1 block">AGENT OTAV LOGS v3.5</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetSandbox}
                    className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                    title="重置并清空沙箱"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setRightPanelOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Auto Mode Toggle */}
                  <div className="flex items-center gap-2.5 bg-slate-950/50 px-3 py-1.5 rounded-xl border border-white/5 group hover:border-emerald-500/30 transition-all">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-white/30 uppercase tracking-tighter leading-none">Autonomous</span>
                      <span className={`text-[9px] font-bold ${isAutoMode ? 'text-emerald-400' : 'text-slate-500'} transition-colors`}>{isAutoMode ? '自动模式 ON' : '手动模式'}</span>
                    </div>
                    <button
                      onClick={() => setIsAutoMode(!isAutoMode)}
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAutoMode ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAutoMode ? 'translate-x-3' : 'translate-x-0'}`} />
                    </button>
                    <Zap className={`w-3 h-3 transition-all ${isAutoMode ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCode(!showCode)}
                    className={`text-[9px] font-black transition-all border px-3 py-1.5 rounded-lg uppercase tracking-widest ${showCode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'text-slate-400 border-slate-700/50 hover:border-emerald-500/30'}`}
                  >
                    {showCode ? 'HIDE PARAMS' : 'SHOW PARAMS'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-6 custom-scrollbar pb-24 min-h-0">
              {agentSteps.length === 0 && logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                  <div className="bg-slate-800 p-8 rounded-full border border-white/5">
                    <Bot className="w-12 h-12 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">等待指令执行任务...</p>
                    <p className="text-[9px] text-slate-700 font-bold mt-2 italic">Waiting for connection to Agent Engine</p>
                  </div>
                </div>
              ) : (
                <React.Fragment>
                  {agentSteps.map((step, idx) => (
                    <div key={idx} className="group/step animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center text-slate-900 font-black text-[10px] shadow-lg shadow-emerald-500/20">
                          {idx + 1}
                        </div>
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">Thought Node</span>
                      </div>

                      <div className="border-l-2 border-emerald-500/30 pl-4 py-2 bg-gradient-to-r from-emerald-500/5 to-transparent rounded-r-2xl border-t border-b border-white/[0.02]">
                        <div className="text-emerald-400 font-black flex items-center gap-2 mb-2 uppercase tracking-widest text-[10px]">
                          <Zap className="w-3.5 h-3.5 fill-current" /> THINKING
                        </div>
                        <p className="text-white/90 leading-[1.8] text-[12px] font-sans font-medium">{step.thought}</p>

                        <div className="mt-4 p-4 bg-slate-950/80 rounded-2xl border border-blue-500/20 shadow-inner group/action transition-all hover:border-blue-500/40">
                          <div className="text-blue-400 flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[9px]">
                              <Play className="w-3 h-3 fill-current" /> ACTION
                            </div>
                            <code className="text-[10px] text-blue-200/60 font-black">{step.action?.tool || 'Unknown'}</code>
                          </div>
                          {step.action?.tool === 'execute_python' && (
                            <button
                              onClick={() => setShowCode(!showCode)}
                              className="text-[9px] font-black text-blue-400 opacity-60 hover:opacity-100 transition-all hover:underline uppercase"
                            >
                              {showCode ? 'Hide Code' : 'View Code'}
                            </button>
                          )}
                          {showCode && (
                            <div className="mt-2.5 text-[10px] text-slate-500 bg-black/30 p-2.5 rounded-xl border border-white/5 font-mono overflow-x-auto whitespace-pre">
                              {JSON.stringify(step.action.params, null, 2)}
                            </div>
                          )}

                          {/* Streamed Console Logs */}
                          {step.logs && (
                            <div className="mt-4 p-3 bg-black/60 rounded-xl border border-white/5 font-mono text-[10px] text-slate-400 overflow-x-auto whitespace-pre-wrap shadow-inner animate-in fade-in duration-300">
                              <div className="flex items-center gap-2 mb-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1">
                                <Terminal className="w-3 h-3" /> 沙箱实时输出 / SANDBOX STDOUT
                              </div>
                              <div className="leading-relaxed">
                                {step.logs}
                                {isProcessing && idx === agentSteps.length - 1 && (
                                  <span className="inline-block w-1 h-3 bg-emerald-500 ml-1 animate-pulse" />
                                )}
                              </div>
                            </div>
                          )}

                          {/* Approval Card (V5.4 HITL) */}
                          {step.status === 'approving' && pendingStepApproval && (
                            <div className="mt-4 p-5 bg-gradient-to-br from-indigo-500/10 to-blue-600/10 rounded-2xl border border-indigo-500/30 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden group/approval">
                              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/approval:opacity-20 transition-opacity">
                                <ShieldQuestion className="w-12 h-12 text-indigo-400" />
                              </div>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">需人工干预 / Approval Required</span>
                              </div>
                              <p className="text-[11px] text-indigo-100/80 mb-5 leading-relaxed font-medium">
                                AI 计划执行上述操作。请核对逻辑是否准确，确认后开始正式计算。
                              </p>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => pendingStepApproval.resolve(true)}
                                  className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 border-t border-white/20"
                                >
                                  <Check className="w-3.5 h-3.5" /> 核对无误 / APPROVE
                                </button>
                                <button
                                  onClick={() => {
                                    const fb = prompt("请输入改进建议 (Feedback):");
                                    if (fb !== null) pendingStepApproval.resolve(false, fb);
                                  }}
                                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95 flex items-center gap-2"
                                >
                                  <Ban className="w-3.5 h-3.5" /> 调整 / REJECT
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Status Badge */}
                          {step.status === 'rejected' && (
                            <div className="mt-4 p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center gap-2">
                              <Ban className="w-3.5 h-3.5" /> 计划已被人工驳回，正在等待 AI 重新规划方案...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              )}

              {/* Enhanced Collapsible Logs Section */}
              <div className="mt-8 pt-4 border-t border-white/5 space-y-4">
                <button
                  onClick={() => setIsLogsCollapsed(!isLogsCollapsed)}
                  className="w-full flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`} />
                    SYSTEM LOGS & STREAM OUTPUT ({logs.length})
                  </div>
                  {isLogsCollapsed ? <ChevronLeft className="w-3 h-3 rotate-180" /> : <ChevronLeft className="w-3 h-3 -rotate-90" />}
                </button>

                {!isLogsCollapsed && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    {logs.length === 0 ? (
                      <p className="text-[10px] text-slate-700 italic text-center py-4">No system logs recorded.</p>
                    ) : (
                      logs.map(log => (
                        <div key={log.id} className="flex gap-3 items-start group/log">
                          <div className={`mt-1 flex-shrink-0 w-1 rounded-full self-stretch border-l-2 ${log.status === 'success' ? 'border-emerald-500/40' :
                            log.status === 'error' ? 'border-rose-500/40' :
                              'border-blue-500/40'
                            }`} />
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-black uppercase text-[8px] tracking-tight ${log.status === 'success' ? 'text-emerald-500' :
                                log.status === 'error' ? 'text-rose-500' :
                                  'text-blue-500'
                                }`}>
                                {log.status}
                              </span>
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider opacity-40">{log.fileName}</span>
                            </div>
                            <span className="text-white/40 leading-relaxed text-[10px] font-medium break-words px-1">{log.message}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div >
    </div >
  );
};
