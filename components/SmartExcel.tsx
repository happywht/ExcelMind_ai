import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileDown, Play, Loader2, FileSpreadsheet, Layers, Trash2, Code, Plus, Archive, CheckSquare, Square, Search, Eye, Terminal, Info, ChevronRight, MessageSquare } from 'lucide-react';
import { readExcelFile, exportMultipleSheetsToExcel, exportToExcel } from '../services/excelService';
import { runAgenticLoop } from '../services/zhipuService';
import { runPython } from '../services/pyodideService';
import { ExcelData, ProcessingLog, AgenticStep } from '../types';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

export const SmartExcel: React.FC = () => {
  const [filesData, setFilesData] = useState<ExcelData[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [command, setCommand] = useState('');

  // Ref to keep track of the latest data during the async loop to avoid stale closures
  const filesDataRef = useRef<ExcelData[]>(filesData);
  useEffect(() => {
    filesDataRef.current = filesData;
  }, [filesData]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [agentSteps, setAgentSteps] = useState<AgenticStep[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [lastGeneratedCode, setLastGeneratedCode] = useState('');

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
    setAgentSteps([]);
    addLog('System', 'pending', '🚀 启动智能推理中枢 (Observe-Think-Act-Verify)...');

    try {
      // 1. Initial Context
      const initialContext = filesData.map(f => ({
        fileName: f.fileName,
        sheets: Object.keys(f.sheets),
        summary: f.metadata ? Object.entries(f.metadata).map(([s, meta]) => `${s}: ${meta.rowCount}行, ${meta.columnCount}列`) : []
      }));

      // 2. Define Tool Executor
      const executeTool = async (tool: string, params: any): Promise<string> => {
        console.log(`[AI Tool] Executing ${tool}`, params);
        addLog('AI Tool', 'pending', `执行工具 ${tool}: ${JSON.stringify(params)}`);

        const currentFiles = filesDataRef.current;
        switch (tool) {
          case 'inspect_sheet': {
            const { fileName, sheetName } = params;
            const file = currentFiles.find(f => f.fileName === fileName);
            if (!file) throw new Error(`找不到文件: ${fileName}`);
            const data = file.sheets[sheetName] || [];
            return `Headers: ${Object.keys(data[0] || {}).join(', ')}\nSample: ${JSON.stringify(data.slice(0, 3))}`;
          }
          case 'execute_python': {
            const currentDataMap = Object.fromEntries(currentFiles.map(f => [f.fileName, f.sheets]));
            const newData = await runPython(params.code, currentDataMap);
            setFilesData(prev => {
              const updated = [...prev];
              Object.entries(newData).forEach(([fn, sheets]) => {
                const f = updated.find(x => x.fileName === fn);
                if (f) {
                  f.sheets = typeof sheets === 'object' && !Array.isArray(sheets) ? sheets : { 'Result': sheets };
                } else {
                  const s = typeof sheets === 'object' && !Array.isArray(sheets) ? sheets : { 'Result': sheets };
                  updated.push({ id: fn + Date.now(), fileName: fn, sheets: s, currentSheetName: Object.keys(s)[0] });
                }
              });
              filesDataRef.current = updated;
              return updated;
            });
            setLastGeneratedCode(params.code);
            return "Execution successful.";
          }
          default: return "Tool executed.";
        }
      };
      // 3. Start Agent Loop (Continuous)
      const onStep = (step: AgenticStep) => {
        setAgentSteps(prev => [...prev, step]);
        addLog('Agent Phase', 'success', step.thought);
        console.log('[Agent Thought]', step.thought);
      };

      const result = await runAgenticLoop(command, initialContext, onStep, executeTool);

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

  const activeSheetData = activeFile ? activeFile.sheets[activeFile.currentSheetName] : null;
  const activeSheetMeta = activeFile?.metadata ? activeFile.metadata[activeFile.currentSheetName] : null;

  return (
    <div className="h-full flex flex-col bg-slate-50 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-200">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">SmartExcel 智能工坊 <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded ml-2 uppercase tracking-wider">v2.0 Agentic</span></h1>
            <p className="text-xs text-slate-500 font-medium">支持多表核对、单元格批注与 Python 沙箱处理</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input type="file" multiple accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" ref={fileInputRef} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group flex items-center gap-2 px-4 py-2 bg-white text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all font-semibold text-sm border border-slate-200 hover:border-emerald-200 shadow-sm"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            添加文件
          </button>
          <button
            disabled={selectedFileIds.size === 0}
            onClick={handleBatchExport}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${selectedFileIds.size > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
          >
            <Archive className="w-4 h-4" />
            导出选中 ({selectedFileIds.size})
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Panel */}
        <aside className="w-[420px] flex flex-col border-r border-slate-200 bg-white z-10">
          {/* File Storage Section */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">文件存储库 ({filesData.length})</span>
              <button
                onClick={() => setSelectedFileIds(filesData.length === selectedFileIds.size ? new Set() : new Set(filesData.map(f => f.id)))}
                className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded hover:bg-slate-300 transition-colors font-bold"
              >
                {selectedFileIds.size === filesData.length ? '取消全选' : '全部选择'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filesData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl m-2">
                  <Upload className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">点击上方按钮导入 Excel</p>
                </div>
              ) : (
                filesData.map(f => (
                  <div
                    key={f.id}
                    onClick={() => setActiveFileId(f.id)}
                    className={`group relative p-3 rounded-2xl cursor-pointer transition-all border-2 ${activeFileId === f.id ? 'bg-emerald-50/50 border-emerald-500/30' : 'bg-white border-transparent hover:border-slate-100 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div draggable="true" onClick={(e) => { e.stopPropagation(); setSelectedFileIds(prev => { const n = new Set(prev); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; }); }}>
                        {selectedFileIds.has(f.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                      </div>
                      <div className={`p-2 rounded-xl ${activeFileId === f.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${activeFileId === f.id ? 'text-emerald-900' : 'text-slate-700'}`}>{f.fileName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">{Object.keys(f.sheets).length} Sheets</span>
                          {f.metadata && Object.values(f.metadata).some(m => Object.keys(m.comments).length > 0) && (
                            <span className="text-[10px] flex items-center gap-0.5 text-blue-500 font-bold bg-blue-50 px-1 rounded">
                              <MessageSquare className="w-2.5 h-2.5" /> 包含批注
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={(e) => removeFile(f.id, e)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-300 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Reasoning Loop Display */}
          <div className="h-[300px] border-t border-slate-200 flex flex-col bg-slate-900">
            <div className="px-4 py-2 bg-slate-800 flex justify-between items-center border-b border-white/10">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal className="w-3 h-3" /> 推理控制台 / OTAV Loop
              </span>
              <button onClick={() => setShowCode(!showCode)} className="text-[10px] text-emerald-400 hover:underline">
                {showCode ? '隐藏预览代码' : '查看代码'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-3 custom-scrollbar">
              {agentSteps.length === 0 && logs.length === 0 ? (
                <div className="flex items-center gap-2 text-slate-600 italic">
                  <ChevronRight className="w-3 h-3" /> 等待 AI 指令执行任务...
                </div>
              ) : (
                <>
                  {agentSteps.map((step, idx) => (
                    <div key={idx} className="border-l-2 border-emerald-500/50 pl-3 py-1 bg-white/5 rounded-r-lg">
                      <div className="text-emerald-400 font-bold flex items-center gap-1.5 mb-1">
                        <Eye className="w-3 h-3" /> Step {idx + 1}: THINKING
                      </div>
                      <p className="text-white/80 leading-relaxed">{step.thought}</p>
                      <div className="mt-2 text-blue-400 flex items-center gap-1.5 bg-blue-400/10 px-2 py-1 rounded">
                        <Play className="w-3 h-3" /> ACTION: <span className="font-bold">{step.action.tool}({JSON.stringify(step.action.params)})</span>
                      </div>
                    </div>
                  ))}
                  {logs.map(log => (
                    <div key={log.id} className="flex gap-2">
                      <span className={`font-bold ${log.status === 'success' ? 'text-emerald-400' : log.status === 'error' ? 'text-rose-400' : 'text-blue-400'}`}>
                        [{log.status}]
                      </span>
                      <span className="text-slate-300 leading-snug">{log.message}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Command Entry Area */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="relative group">
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="在此输入您的宏观指令... &#10;如：'根据表A的姓名在表B中查找生日并补充，缺失的行标记红色'"
                className="w-full h-32 p-4 pt-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 outline-none text-slate-700 resize-none text-sm transition-all bg-slate-50 group-hover:bg-white"
              />
              <div className="absolute top-4 right-4 text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                <Search className="w-5 h-5" />
              </div>
            </div>

            <button
              onClick={handleRun}
              disabled={isProcessing || !command || filesData.length === 0}
              className={`mt-4 w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-lg active:scale-[0.98] ${isProcessing || !command || filesData.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-none'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/50'
                }`}
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              开始 AI 推理与自动化处理
            </button>
          </div>
        </aside>

        {/* Right Data Preview Area */}
        <main className="flex-1 bg-slate-100 relative flex flex-col p-6 overflow-hidden">
          {activeFile ? (
            <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-white overflow-hidden">
              {/* Data Header: Title and Sheet Tabs */}
              <div className="px-6 py-5 bg-white border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 flex items-center justify-center rounded-xl text-emerald-700">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-800">{activeFile.fileName}</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">数据实时预览器 / {activeFile.currentSheetName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => exportToExcel(activeSheetData || [], activeFile.fileName)} className="text-xs flex items-center gap-2 text-slate-600 hover:text-emerald-700 font-bold px-4 py-2 rounded-xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all">
                      <FileDown className="w-4 h-4" /> 导出本表
                    </button>
                  </div>
                </div>

                {/* Sheet Tabs */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl w-fit border border-slate-100">
                  {Object.keys(activeFile.sheets).map(sheetName => (
                    <button
                      key={sheetName}
                      onClick={() => {
                        const updated = [...filesData];
                        const f = updated.find(x => x.id === activeFileId);
                        if (f) f.currentSheetName = sheetName;
                        setFilesData(updated);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFile.currentSheetName === sheetName
                        ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                        }`}
                    >
                      {sheetName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Content */}
              <div className="flex-1 overflow-auto bg-white custom-scrollbar">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                  <thead className="sticky top-0 z-20 bg-white">
                    <tr>
                      <th className="w-12 p-3 bg-slate-50/80 border-b border-r border-slate-100 text-center text-slate-400 text-[10px] font-mono backdrop-blur-md">#</th>
                      {activeSheetData && activeSheetData.length > 0 && Object.keys(activeSheetData[0]).map((header) => (
                        <th key={header} className="p-3 border-b border-r border-slate-50 bg-slate-50/80 backdrop-blur-md font-bold text-slate-500 whitespace-nowrap min-w-[120px]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeSheetData && activeSheetData.slice(0, 500).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-emerald-50/30 transition-colors group">
                        <td className="p-3 bg-slate-50/30 border-r border-slate-50 text-center text-slate-400 text-[10px] font-mono group-hover:bg-emerald-50/50">{rIdx + 1}</td>
                        {Object.entries(row).map(([key, cell], cIdx) => {
                          const address = XLSX.utils.encode_cell({ r: rIdx + 1, c: cIdx });
                          const comment = activeSheetMeta?.comments[address];
                          return (
                            <td key={cIdx} className="p-3 border-r border-slate-50 text-slate-600 whitespace-nowrap max-w-sm overflow-hidden text-ellipsis border-b border-slate-50 relative">
                              {String(cell)}
                              {comment && (
                                <div className="absolute top-0 right-0 p-1 cursor-help group/comment">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-500/50" />
                                  <div className="hidden group-hover/comment:block absolute z-30 bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-2xl backdrop-blur-md border border-white/10 leading-relaxed font-medium">
                                    <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-white/10 text-blue-400 font-bold uppercase tracking-wider">
                                      <MessageSquare className="w-3 h-3" /> 单元格批注 ({address})
                                    </div>
                                    {comment}
                                    <div className="absolute -bottom-1 right-2 w-2 h-2 bg-slate-900 rotate-45" />
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
                {(!activeSheetData || activeSheetData.length === 0) && (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                      <Eye className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="font-bold text-slate-300 tracking-wide uppercase text-xs">此工作表没有可供预览的数据</p>
                  </div>
                )}
              </div>

              {/* Table Footer Stats */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    数据总行数: <span className="text-slate-800">{activeSheetData?.length || 0}</span>
                  </div>
                  {activeSheetMeta && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      批注总计: <span className="text-slate-800">{Object.keys(activeSheetMeta.comments).length}</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase italic">Preview limited to top 500 rows for performance</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-emerald-200 blur-3xl rounded-full opacity-20" />
                <Layers className="w-24 h-24 relative opacity-10 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-400 mb-2">等待数据载入</h3>
              <p className="text-sm">请点击左侧存储库中的文件进行预览</p>
            </div>
          )}
        </main>
      </div>

      {/* Global Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-white flex flex-col items-center max-w-sm w-full">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
              <Layers className="absolute inset-0 m-auto w-8 h-8 text-emerald-600 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">AI 智能处理中</h3>
            <p className="text-sm text-slate-500 text-center leading-relaxed">Agent 正在沙箱环境分析并转换您的 Excel 记录。请稍候，由于涉及 Python 解释器初始化，在大文件上可能需要数秒时间。</p>
          </div>
        </div>
      )}
    </div>
  );
};
