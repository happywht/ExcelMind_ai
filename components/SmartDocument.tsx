import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, File, Loader2, Play, Trash2, Eye, PanelRight, Terminal, RotateCcw, ChevronRight, Zap, Bot, ShieldQuestion, Check, Ban, ChevronLeft, MessageSquare, Send, Sparkles } from 'lucide-react';
import { writeFileToSandbox, extractText, runPython } from '../services/pyodideService';
import { runAgenticLoop } from '../services/agent/loop';
import { useTraceLogger } from '../hooks/useTraceLogger';
import { AgenticStep, ProcessingLog } from '../types';

interface DocumentFile {
    id: string;
    name: string;
    type: 'docx' | 'pdf';
    text: string;
    tables: any[][][]; // 3D array: tables -> rows -> cells
    structure?: any[]; // For Headings
    meta: any;
    status: 'processing' | 'ready' | 'error';
    errorMessage?: string;
}

export const SmartDocument: React.FC = () => {
    const [documents, setDocuments] = useState<DocumentFile[]>([]);
    const [activeDocId, setActiveDocId] = useState<string | null>(null);
    const [command, setCommand] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [rightPanelOpen, setRightPanelOpen] = useState(false);
    const [isAutoMode, setIsAutoMode] = useState(false);

    // Agent State
    const [logs, setLogs] = useState<ProcessingLog[]>([]);
    const [agentSteps, setAgentSteps] = useState<AgenticStep[]>([]);
    const [showCode, setShowCode] = useState(false);
    const [isLogsCollapsed, setIsLogsCollapsed] = useState(true);
    const [pendingStepApproval, setPendingStepApproval] = useState<{
        step: AgenticStep;
        resolve: (approved: boolean, feedback?: string) => void;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const { setLastTrace } = useTraceLogger();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsProcessing(true);

            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                const fileType = file.name.endsWith('.docx') ? 'docx' : file.name.endsWith('.pdf') ? 'pdf' : null;

                if (!fileType) {
                    alert(`不支持的文件类型: ${file.name}`);
                    continue;
                }

                const docId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                const newDoc: DocumentFile = {
                    id: docId,
                    name: file.name,
                    type: fileType,
                    text: '',
                    tables: [],
                    meta: {},
                    status: 'processing'
                };

                setDocuments(prev => [...prev, newDoc]);
                if (!activeDocId && i === 0) setActiveDocId(docId);

                try {
                    const arrayBuffer = await file.arrayBuffer();
                    await writeFileToSandbox(file.name, arrayBuffer);

                    const result = await extractText(file.name);

                    setDocuments(prev => prev.map(d => d.id === docId ? {
                        ...d,
                        status: 'ready',
                        text: result.text,
                        tables: result.tables || [],
                        structure: result.structure || [],
                        meta: result.meta
                    } : d));

                    addLog('System', 'success', `文档解析成功: ${file.name}`);

                } catch (err: any) {
                    console.error(err);
                    setDocuments(prev => prev.map(d => d.id === docId ? {
                        ...d,
                        status: 'error',
                        errorMessage: err.message
                    } : d));
                    addLog('System', 'error', `文档解析失败: ${file.name} - ${err.message}`);
                }
            }
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const addLog = (fileName: string, status: 'pending' | 'success' | 'error', message: string) => {
        setLogs(prev => [{ id: Date.now().toString() + Math.random(), fileName, status, message }, ...prev]);
    };

    const stopAgent = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            addLog('System', 'error', '用户手动终止了 AI 任务');
            setIsProcessing(false);
        }
    };

    const activeDoc = documents.find(d => d.id === activeDocId);

    const handleRun = async () => {
        if (documents.length === 0 || !command.trim()) return;
        setIsProcessing(true);
        setRightPanelOpen(true);
        setAgentSteps([]);
        abortControllerRef.current = new AbortController();
        addLog('System', 'pending', '🚀 启动文档智能分析中枢...');

        try {
            // 1. Initial Context (Metadata & Preview)
            const initialContext = documents.map(doc => ({
                fileName: doc.name,
                type: doc.type,
                status: doc.status,
                textPreview: (doc.text || "").substring(0, 1000) + "...",
                tableCount: (doc.tables || []).length,
                structure: doc.structure || []
            }));

            // 2. Define Tool Executor
            const executeTool = async (tool: string, params: any): Promise<string> => {
                console.log(`[AI Tool] Executing ${tool}`, params);
                addLog('AI Tool', 'pending', `执行工具 ${tool}: ${JSON.stringify(params)}`);

                switch (tool) {
                    case 'execute_python': {
                        addLog('Sandbox', 'pending', '正在沙箱中执行 Python 代码...');
                        const { data: newData, logs, result } = await runPython(params.code, {}, (streamedLog) => {
                            setAgentSteps(prev => {
                                const next = [...prev];
                                if (next.length > 0) {
                                    const last = { ...next[next.length - 1] };
                                    last.logs = (last.logs || "") + streamedLog;
                                    next[next.length - 1] = last;
                                }
                                return next;
                            });
                        });

                        let observation = "Execution successful.";
                        if (logs) observation += `\nLogs:\n${logs}`;
                        if (result !== null && result !== undefined) {
                            const resultStr = typeof result === 'object' ? JSON.stringify(result).slice(0, 1000) : String(result);
                            observation += `\nResult of last expression:\n${resultStr}`;
                        }
                        return observation;
                    }
                    case 'read_document_page': {
                        const { fileName, page_number } = params;
                        const code = `
import pdfplumber
with pdfplumber.open('/mnt/${fileName}') as pdf:
    # pdfplumber is 0-indexed in code usually, but we accept 1-based page_number?
    # Let's assume 1-based from Agent
    page = pdf.pages[${page_number} - 1]
    res = page.extract_text()
res
`;
                        const { result } = await runPython(code, {});
                        return String(result || "No text on this page.");
                    }
                    case 'search_document': {
                        const { fileName, keyword } = params;
                        const code = `
import re
target = '/mnt/${fileName}'
# Simple search in the already extracted text if available in globals or re-read
with open(target, 'rb') as f:
    # This might be slow for large PDFs if we re-read. 
    # For now, let's use a smarter search if we have the full text in JS and pass it?
    # Actually, let's just do a simple search for this demo.
    pass

# For now, let's use the text in memory if possible or re-extract
import pdfplumber
results = []
with pdfplumber.open(target) as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ""
        if "${keyword}".lower() in text.lower():
            results.append(f"Page {i+1}: ... {text[:200]} ...")
"\\n".join(results[:10]) # Limit to 10 findings
`;
                        const { result } = await runPython(code, {});
                        return String(result || "No matches found.");
                    }
                    case 'finish':
                        return "Task Completed.";
                    default:
                        return "Unknown tool.";
                }
            };

            // 3. Start Agent Loop
            const onStep = (step: AgenticStep) => {
                setAgentSteps(prev => [...prev, step]);
                addLog('Agent Phase', 'success', step.thought);
            };

            const result = await runAgenticLoop(
                command,
                initialContext,
                onStep,
                executeTool,
                false, // Privacy not wired up yet
                async (step) => {
                    if (isAutoMode) return { approved: true };
                    return new Promise((resolve) => {
                        setAgentSteps(prev => {
                            const next = [...prev];
                            if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], status: 'approving' };
                            return next;
                        });
                        setPendingStepApproval({
                            step,
                            resolve: (approved, feedback) => {
                                setPendingStepApproval(null);
                                setAgentSteps(prev => {
                                    const next = [...prev];
                                    if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], status: approved ? 'executing' : 'rejected' };
                                    return next;
                                });
                                resolve({ approved, feedback });
                            }
                        });
                    });
                },
                abortControllerRef.current?.signal,
                'document' // Enable Document Mode
            );

            setLastTrace(result.trace || null);
            addLog('System', 'success', `任务完成: ${result.explanation}`);

        } catch (e: any) {
            console.error("Agentic Loop Error:", e);
            addLog('System', 'error', `错误: ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Left Panel: Document List */}
            <div className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 flex-shrink-0">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm tracking-tight">
                        <div className="bg-blue-100 p-1.5 rounded-md">
                            <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        智能文档
                    </h2>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm active:scale-95"
                        title="上传文档"
                    >
                        <Upload className="w-4 h-4" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".docx,.pdf"
                        multiple
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    <div className="mb-6">
                        <div className="px-2 mb-2 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>文档列表</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded-full">{documents.length}</span>
                        </div>
                        {documents.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 text-xs border-2 border-dashed border-slate-100 rounded-xl m-2">
                                <Upload className="w-8 h-8 mb-2 text-slate-200" />
                                <p>暂无文档</p>
                                <p className="mt-1 opacity-70">点击上方按钮上传</p>
                            </div>
                        )}
                        {documents.map(doc => (
                            <div
                                key={doc.id}
                                onClick={() => setActiveDocId(doc.id)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 group ${activeDocId === doc.id
                                    ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                                    : 'bg-white border-slate-100 hover:border-blue-200/60 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <File className={`w-8 h-8 flex-shrink-0 p-1.5 rounded-lg ${doc.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`} />
                                        <div className="min-w-0">
                                            <span className="font-semibold text-sm text-slate-700 truncate block">{doc.name}</span>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{doc.type}</span>
                                        </div>
                                    </div>
                                    <div className="mt-1">
                                        {doc.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                                        {doc.status === 'error' && <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                                        {doc.status === 'ready' && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Document Map Section (Dynamic) */}
                    {activeDoc && activeDoc.status === 'ready' && activeDoc.structure && activeDoc.structure.length > 0 && (
                        <div className="mt-8 border-t border-slate-100 pt-6 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="px-2 mb-3 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <ChevronRight className="w-3 h-3 text-blue-500" />
                                <span>文档大纲 (Map)</span>
                            </div>
                            <div className="space-y-1">
                                {activeDoc.structure.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-slate-50 cursor-pointer flex items-start gap-2 ${item.level === 1 ? 'font-bold text-slate-700' :
                                                item.level === 2 ? 'pl-6 text-slate-600' :
                                                    'pl-9 text-slate-500'
                                            }`}
                                    >
                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-blue-400/50 flex-shrink-0" />
                                        <span className="truncate">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Panel: Preview */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 relative">
                {activeDoc ? (
                    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500 relative">
                        <div className="h-16 px-6 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
                            <div>
                                <h1 className="text-lg font-bold text-slate-800 tracking-tight">{activeDoc.name}</h1>
                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                    {activeDoc.status === 'ready' ? (
                                        <>
                                            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold">READY</span>
                                            <span>{(activeDoc.text || "").length.toLocaleString()} chars</span>
                                        </>
                                    ) : (
                                        <span className="flex items-center gap-1">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            处理中...
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setRightPanelOpen(!rightPanelOpen)}
                                    className={`p-2 rounded-lg transition-all ${rightPanelOpen ? 'bg-slate-100 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <PanelRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar pb-32">
                            <div className="max-w-4xl mx-auto bg-white shadow-sm border border-slate-200 rounded-xl min-h-[600px] p-12 relative">
                                {activeDoc.status === 'processing' ? (
                                    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                                        <div className="bg-blue-50 p-4 rounded-full mb-4">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                        </div>
                                        <p className="font-medium text-slate-600">正在智能解析文档结构...</p>
                                        <p className="text-xs mt-1">加载 Pyodide / 提取文本 / 识别表格</p>
                                    </div>
                                ) : activeDoc.status === 'error' ? (
                                    <div className="text-center text-red-500 mt-32">
                                        <div className="bg-red-50 p-4 rounded-full inline-block mb-4">
                                            <Trash2 className="w-8 h-8 text-red-500" />
                                        </div>
                                        <p className="font-bold text-lg">解析失败</p>
                                        <p className="text-sm mt-2 text-slate-500 bg-slate-50 p-2 rounded border border-slate-200 inline-block max-w-md">{activeDoc.errorMessage}</p>
                                    </div>
                                ) : (
                                    <div className="prose prose-slate max-w-none">
                                        <div className="text-right border-b border-slate-100 pb-4 mb-8">
                                            <span className="text-[10px] font-bold text-slate-300 tracking-[0.2em] uppercase">Document Preview</span>
                                        </div>
                                        <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-serif text-justify selection:bg-blue-100 selection:text-blue-900">
                                            {activeDoc.text || <span className="italic text-slate-400">无文本内容提取</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Floating Command Bar */}
                        <div className="absolute bottom-6 inset-x-0 z-40 px-4 md:px-8 pointer-events-none flex justify-center">
                            <div className={`pointer-events-auto transition-all duration-500 w-full max-w-3xl animate-in slide-in-from-bottom-4`}>
                                <div className="bg-slate-900/90 backdrop-blur-3xl p-2.5 md:p-3 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 flex items-end gap-2 md:gap-4 ring-1 ring-white/5 hover:ring-emerald-500/30 transition-all group-focus-within/cmd:ring-emerald-500 group-focus-within/cmd:shadow-emerald-500/20 group/cmd relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none" />

                                    <div className="flex-1 min-w-0 py-1 relative z-10 mb-0.5 ml-2">
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
                                            placeholder="在此输入指令 (例如: 总结这份文档的关键条款...)"
                                            className="w-full bg-transparent border-none outline-none text-white text-sm md:text-base font-medium placeholder:text-slate-500 placeholder:font-bold py-2 px-1 resize-none max-h-[40vh] custom-scrollbar leading-relaxed"
                                        />
                                    </div>
                                    <button
                                        onClick={handleRun}
                                        disabled={isProcessing || !command || documents.length === 0}
                                        className={`p-3 md:p-3.5 rounded-[1.5rem] transition-all flex items-center justify-center gap-2 group/btn active:scale-95 flex-shrink-0 ${isProcessing || !command || documents.length === 0
                                            ? 'bg-slate-800 text-slate-600'
                                            : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-500'
                                            }`}
                                    >
                                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center flex-col text-slate-300 select-none">
                        <div className="bg-slate-100 p-8 rounded-full mb-6">
                            <FileText className="w-16 h-16 text-slate-300" />
                        </div>
                        <p className="font-medium text-lg text-slate-400">请选择或上传文档</p>
                        <p className="text-sm mt-2 max-w-xs text-center leading-relaxed opacity-60">支持 .docx Word 文档与 .pdf 便携式文档。所有解析均在本地完成，保障数据隐私。</p>
                    </div>
                )}

                {isProcessing && (
                    <div className="absolute top-4 right-4 z-[45] animate-in fade-in duration-300">
                        <div className="bg-slate-900/90 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/10">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-100">AI Processing...</span>
                            <button onClick={stopAgent} className="text-slate-400 hover:text-white transition-colors"><RotateCcw className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel: Thinking Hub */}
            <aside
                className={`flex flex-col border-l border-slate-200 bg-white transition-all duration-500 ease-in-out z-30 shadow-2xl h-full min-h-0 ${rightPanelOpen ? 'w-[450px] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full overflow-hidden border-none'
                    }`}
            >
                <div className="flex-1 flex flex-col min-w-[450px] bg-slate-900 overflow-hidden h-full min-h-0">
                    {/* Thinking Hub Header */}
                    <div className="px-5 py-4 bg-slate-800/80 backdrop-blur-md border-b border-white/5 z-10 flex-shrink-0">
                        <div className="flex items-center justify-between mb-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
                                    <Terminal className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] leading-none block">思维枢纽 / Document Brain</span>
                                    <span className="text-[9px] text-emerald-400 font-bold tracking-widest mt-1 block">DOC-INTEL v1.0</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Auto Mode Toggle */}
                                <button
                                    onClick={() => setIsAutoMode(!isAutoMode)}
                                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAutoMode ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                    title="自动模式开关"
                                >
                                    <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAutoMode ? 'translate-x-3' : 'translate-x-0'}`} />
                                </button>
                                <button onClick={() => setRightPanelOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-6 custom-scrollbar pb-24 min-h-0">
                        {agentSteps.length === 0 && logs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                                <div className="bg-slate-800 p-8 rounded-full border border-white/5">
                                    <Bot className="w-12 h-12 opacity-20" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">等待指令执行任务...</p>
                                    <p className="text-[9px] text-slate-700 font-bold mt-2 italic">Ready for Document Analysis</p>
                                </div>
                            </div>
                        ) : (
                            <React.Fragment>
                                {agentSteps.map((step, idx) => (
                                    <div key={idx} className="group/step animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-5 h-5 bg-emerald-500 rounded-md flex items-center justify-center text-slate-900 font-black text-[10px] shadow-lg shadow-emerald-500/20">
                                                {idx + 1}
                                            </div>
                                            <div className="h-px bg-white/10 flex-1" />
                                            <span className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">Step</span>
                                        </div>

                                        <div className="pl-4 py-2 border-l border-emerald-500/20">
                                            <div className="text-emerald-400 font-black flex items-center gap-2 mb-2 uppercase tracking-widest text-[10px]">
                                                <Zap className="w-3 h-3 fill-current" /> THINKING
                                            </div>
                                            <p className="text-white/90 leading-[1.8] text-[11px] font-sans font-medium">{step.thought}</p>

                                            <div className="mt-3 p-3 bg-slate-950/50 rounded-xl border border-blue-500/20 shadow-inner group/action transition-all">
                                                <div className="text-blue-400 flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[9px]">
                                                        <Play className="w-3 h-3 fill-current" /> ACTION
                                                    </div>
                                                    <code className="text-[10px] text-blue-200/60 font-black">{step.action?.tool || 'Unknown'}</code>
                                                </div>

                                                {/* Streamed Console Logs */}
                                                {step.logs && (
                                                    <div className="mt-2 p-2 bg-black/40 rounded-lg border border-white/5 font-mono text-[10px] text-slate-400 overflow-x-auto whitespace-pre-wrap shadow-inner">
                                                        {step.logs}
                                                    </div>
                                                )}

                                                {/* Approval Card (HITL) */}
                                                {step.status === 'approving' && pendingStepApproval && (
                                                    <div className="mt-4 p-4 bg-indigo-900/30 rounded-xl border border-indigo-500/30 animate-in zoom-in-95 duration-300">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <ShieldQuestion className="w-4 h-4 text-indigo-400" />
                                                            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">Approval Required</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => pendingStepApproval.resolve(true)}
                                                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-[10px] flex items-center justify-center gap-1"
                                                            >
                                                                <Check className="w-3 h-3" /> APPROVE
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const fb = prompt("改进建议:");
                                                                    if (fb !== null) pendingStepApproval.resolve(false, fb);
                                                                }}
                                                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px]"
                                                            >
                                                                <Ban className="w-3 h-3" /> REJECT
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </React.Fragment>
                        )}
                    </div>
                </div>
            </aside>
        </div>
    );
};
