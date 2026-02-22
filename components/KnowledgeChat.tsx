import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Book, Paperclip, Bot, User, Trash2, FileText,
  Cpu, Search, BarChart3, Loader2, ChevronDown, ChevronRight,
  Sparkles, AlertCircle, CheckCircle2, BrainCircuit, Database, Zap, RefreshCw,
  EyeOff, Eye, NotebookPen
} from 'lucide-react';
import { ChatMessage, OrchestratorStep, ExcelData } from '../types';
import { chatWithKnowledgeBase } from '../services/zhipuService';
import { runOrchestrator, OrchestratorContext } from '../services/agent/orchestrator';
import { runAgenticLoop } from '../services/agent/loop';
import { createToolExecutor } from '../services/agent/executor';
import {
  loadAnalysisWorker, loadDocWorker, runPython,
  writeFileToSandbox, extractText, resetSandbox, clearContext
} from '../services/pyodideService';
import ReactMarkdown from 'react-markdown';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Handle PDF.js export structure differences (ESM vs CJS interop)
const pdfjs = (pdfjsLib as any).default ? (pdfjsLib as any).default : pdfjsLib;
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

interface KnowledgeFile {
  id: string;
  name: string;
  content: string;
  type: string;
  size: number;
  uploadTime: Date;
  rawBuffer?: ArrayBuffer; // Phase 12: 保留原始二进制供沙箱使用
}

// ---------------------------------------------------------------
// Thought Bubble: renders a single Orchestrator step
// Phase 11.2: supports zenMode (simple capsule vs full geek view)
// ---------------------------------------------------------------
const OrchestratorThoughtBubble: React.FC<{ step: OrchestratorStep; index: number; zenMode: boolean }> = ({ step, index, zenMode }) => {
  const [expanded, setExpanded] = useState(false);

  const agentIcons: Record<string, React.ReactNode> = {
    excel: <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />,
    document: <FileText className="w-3.5 h-3.5 text-blue-400" />,
    search: <Search className="w-3.5 h-3.5 text-purple-400" />,
    orchestrator: <BrainCircuit className="w-3.5 h-3.5 text-amber-400" />,
    parallel: <Zap className="w-3.5 h-3.5 text-yellow-400" />,
  };

  const statusColors: Record<string, string> = {
    thinking: 'border-amber-500/30 bg-amber-500/5',
    delegating: 'border-blue-500/30 bg-blue-500/5',
    observing: 'border-emerald-500/30 bg-emerald-500/5',
    finished: 'border-emerald-600/40 bg-emerald-600/8',
    error: 'border-red-500/30 bg-red-500/5',
    parallel: 'border-yellow-500/40 bg-yellow-500/5',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    thinking: <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />,
    delegating: <Cpu className="w-3 h-3 text-blue-400 animate-pulse" />,
    observing: <Database className="w-3 h-3 text-emerald-400" />,
    finished: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
    error: <AlertCircle className="w-3 h-3 text-red-400" />,
    parallel: <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />,
  };

  const toolLabels: Record<string, string> = {
    analyze_excel: '📊 分析 Excel',
    read_document: '📄 读取文档',
    read_document_page: '📖 读取页面',
    search_document: '🔍 搜索文档',
    parallel_dispatch: '⚙️ 并行调度',
    sync_context: '🔄 同步上下文',
    search_context: '🔎 搜索上下文',
    write_memo: '📝 写备忘录',
    read_memo: '📖 读备忘录',
    generate_report: '📄 生成报告',
    generate_rich_text: '✍️ 富文本输出',
    execute_python: '🐍 执行代码',
    finish: '✅ 完成',
  };

  // Phase 11.2: Zen Mode — show minimal capsule only
  if (zenMode) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] border w-fit ${statusColors[step.status] || statusColors.thinking
        }`}>
        {statusIcons[step.status]}
        <span className="text-slate-400">
          {toolLabels[step.action.tool] || step.action.tool}
        </span>
        {step.speak && (
          <span className="text-slate-300 italic truncate max-w-[220px]"> — {step.speak}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border rounded-lg text-xs transition-all duration-200 ${statusColors[step.status] || statusColors.thinking}`}
      style={{ fontFamily: 'monospace' }}
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0">
          {statusIcons[step.status]}
        </div>
        <div className="flex-1 flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-bold text-slate-300 uppercase tracking-tighter text-[10px]">
              {step.status}
            </span>
            <span className="text-slate-500">
              {toolLabels[step.action.tool] || step.action.tool}
            </span>
          </div>
          {expanded ? <ChevronDown className="w-3 h-3 text-slate-600" /> : <ChevronRight className="w-3 h-3 text-slate-600" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-800/50 space-y-2.5">
          {step.action && (
            <div className="bg-slate-900/50 p-2 rounded border border-slate-800 flex items-start gap-2">
              <div className="mt-0.5 p-1 bg-blue-500/10 rounded">
                <Cpu className="w-3 h-3 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="text-[10px] text-slate-500 mb-1">ACTION 调用</div>
                <div className="text-emerald-400 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                  {step.action.tool}({Object.keys(step.action.params).length > 0 ? '...' : ''})
                </div>
                {Object.keys(step.action.params).length > 0 && (
                  <pre className="text-[10px] text-slate-400 mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap leading-tight">
                    {(() => {
                      // Phase 12: 对超长内容做智能截断，防止极客模式气泡撑爆
                      const raw = JSON.stringify(step.action.params, null, 2);
                      if (raw.length > 500) {
                        const keys = Object.keys(step.action.params);
                        const preview = keys.map(k => {
                          const v = String(step.action.params[k] || '');
                          return `"${k}": ${v.length > 80 ? `"${v.substring(0, 80)}..." (${v.length}字)` : JSON.stringify(step.action.params[k])}`;
                        }).join(',\n');
                        return `{\n${preview}\n}`;
                      }
                      return raw;
                    })()}
                  </pre>
                )}
              </div>
            </div>
          )}

          {step.observation && (
            <div className="bg-slate-900/50 p-2 rounded border border-slate-800 flex items-start gap-2">
              <div className="mt-0.5 p-1 bg-emerald-500/10 rounded">
                <Database className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-slate-500 mb-1">OBSERVATION 结果</div>
                <div className="text-slate-300 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                  {step.observation}
                </div>
              </div>
            </div>
          )}

          {step.speak && (
            <div className="bg-amber-500/5 p-2 rounded border border-amber-500/20 flex items-start gap-2">
              <div className="mt-0.5 p-1 bg-amber-500/10 rounded">
                <Bot className="w-3 h-3 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-amber-500/60 mb-1 font-bold">SPEAK 旁白</div>
                <div className="text-amber-200/90 italic leading-relaxed">
                  {step.speak}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const KnowledgeChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: '你好！我是**ExcelMind 审计指挥官**。\n\n我现在拥有更强大的能力——不仅能回答问题，还能**自动驱动后台专业代理**（Smart Excel & Smart Document）来帮你精准分析数据，无需手动切换工具。\n\n请上传文件，然后告诉我你的审计任务！',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [showKB, setShowKB] = useState(true);
  const [useOrchestrator, setUseOrchestrator] = useState(true);
  const [liveSteps, setLiveSteps] = useState<OrchestratorStep[]>([]);
  const [zenMode, setZenMode] = useState(true); // Phase 11.2: true = Zen (simple capsules)
  const [reportContent, setReportContent] = useState(''); // Phase 11.3: Deep Report
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, liveSteps]);

  // Build OrchestratorContext from loaded KB files
  const buildContext = useCallback((): OrchestratorContext => {
    const excelFiles: OrchestratorContext['excelFiles'] = [];
    const documentFiles: string[] = [];

    knowledgeFiles.forEach(f => {
      if (f.type === 'excel') {
        excelFiles.push({ fileName: f.name, sheets: ['Sheet1'], rowCount: 0 });
      } else {
        documentFiles.push(f.name);
      }
    });

    return { excelFiles, documentFiles };
  }, [knowledgeFiles]);

  // Worker executor: invokes the REAL sandbox engines (Phase 4 Bridge)
  const executeWorker = useCallback(async (
    agentType: 'excel' | 'document',
    instruction: string,
    fileName?: string
  ): Promise<string> => {
    const targetFile = fileName
      ? knowledgeFiles.find(f => f.name === fileName)
      : knowledgeFiles.find(f => agentType === 'excel' ? f.type === 'excel' : f.type !== 'excel') || knowledgeFiles[0];

    if (!targetFile) {
      return 'No file available for this task. Please upload a file first.';
    }

    try {
      // Phase 12: 确保物理文件已注入沙箱（修复数据断层 Bug）
      if (targetFile.rawBuffer) {
        await Promise.all([loadAnalysisWorker(), loadDocWorker()]);
        await writeFileToSandbox(targetFile.name, targetFile.rawBuffer);
        console.log(`[KnowledgeChat] Injected ${targetFile.name} (${(targetFile.rawBuffer.byteLength / 1024).toFixed(1)}KB) into sandbox`);
      }

      // Phase 13: 挂载统一执行器，彻底修复指挥官只能"想"不能"做"的截断 Bug
      let capturedReport = '';
      const executor = createToolExecutor({
        // Minimal context for CLI mode
        currentFiles: agentType === 'excel' ? [{ fileName: targetFile.name, sheets: { 'Sheet1': [] } }] : [],
        documents: agentType === 'document' ? [{ name: targetFile.name, text: targetFile.content }] : [],
        addLog: (module, status, message) => console.log(`[WorkerExecutor][${module}] ${status}: ${message}`),
        setAgentSteps: () => { }, // sub-steps inner logging is muted
        setAiReportContent: (content) => {
          capturedReport = content;
          setReportContent(content);
        }
      });

      if (agentType === 'excel') {
        // ── Excel path: load worker, push file binary, run Python via AgenticLoop ──
        await loadAnalysisWorker();

        // Build a lightweight context for the loop
        const initialCtx = [{ fileName: targetFile.name, sheets: ['Sheet1'] }];

        // Run the real agentic loop with sandbox execution
        const result = await runAgenticLoop(
          instruction,
          initialCtx,
          () => { }, // onStep: silent in sub-worker mode
          executor,  // Phase 13: The shared executor replaces 'undefined'
          false,     // isPrivacyEnabled
          undefined, // onApprovalRequired
          undefined, // signal
          'excel'
        );

        return result.explanation || result.finalCode || 'Excel analysis completed.';

      } else {
        // ── Phase 12: Document path now uses the REAL dual-track Agent Loop ──
        await loadDocWorker();

        // Build document context with extracted text for Agent prompt injection
        const docText = targetFile.content || '';
        const initialCtx = [{
          fileName: targetFile.name,
          sheets: [],
          textPreview: docText.substring(0, 5000),
        }];

        // Use runAgenticLoop in 'document' mode: leverages Phase 11's generate_report etc.
        const result = await runAgenticLoop(
          instruction,
          initialCtx,
          () => { }, // onStep: silent in sub-worker mode
          executor,  // Phase 13: Provide the executor here too
          false,     // isPrivacyEnabled
          undefined, // onApprovalRequired
          undefined, // signal
          'document'
        );

        return capturedReport
          ? `[Report Successfully Generated by Sub-Agent]:\n${capturedReport}`
          : (result.explanation || result.finalCode || 'Document analysis completed.');
      }
    } catch (e: any) {
      console.error(`[ExecuteWorker] ${agentType} failed:`, e);
      return `Worker execution failed: ${e.message}. Please try with a simpler instruction.`;
    }
  }, [knowledgeFiles]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setLiveSteps([]);
    abortControllerRef.current = new AbortController();

    // Add a streaming placeholder
    const streamingMsgId = Date.now() + Math.random();
    const streamingMsg: ChatMessage = {
      role: 'model',
      text: '',
      timestamp: streamingMsgId,
      isStreaming: true,
      orchestrationSteps: []
    };
    setMessages(prev => [...prev, streamingMsg]);

    try {
      let finalText = '';

      if (useOrchestrator && knowledgeFiles.length > 0) {
        // ── Orchestrator Mode ──
        const orchestratorSteps: OrchestratorStep[] = [];

        finalText = await runOrchestrator(
          userMsg.text,
          buildContext(),
          (step) => {
            orchestratorSteps.push({ ...step });
            setLiveSteps([...orchestratorSteps]);

            // Phase 10.3: Append speak to message bubble
            setMessages(prev => prev.map(m => {
              if (m.timestamp === streamingMsgId) {
                let newText = m.text;
                if (step.speak) {
                  newText = newText ? `${newText}\n\n${step.speak}` : step.speak;
                }
                return { ...m, text: newText, orchestrationSteps: [...orchestratorSteps] };
              }
              return m;
            }));

            // Phase 12: If finish/generate_report, write to report panel (兼容 summary 和 content)
            if ((step.action.tool === 'finish' || step.action.tool === 'generate_report') && (step.action.params?.summary || step.action.params?.content)) {
              setReportContent(step.action.params.summary || step.action.params.content);
            }
          },
          executeWorker,
          abortControllerRef.current.signal
        );

        // Finalize message
        setMessages(prev => prev.map(m => {
          if (m.timestamp === streamingMsgId) {
            const currentText = m.text.trim();
            const finalizedText = (finalText && finalText !== currentText)
              ? (currentText ? `${currentText}\n\n${finalText}` : finalText)
              : currentText;

            return { ...m, text: finalizedText, isStreaming: false, orchestrationSteps: [...orchestratorSteps] };
          }
          return m;
        }));
      } else {
        // ── Simple RAG mode (no files or orchestrator off) ──
        // Phase 12: OOM 防护 - 每个文件最多取前 3000 字
        const MAX_CHARS_PER_FILE = 3000;
        const combinedKnowledgeText = knowledgeFiles.map(file => {
          const truncated = file.content.length > MAX_CHARS_PER_FILE
            ? file.content.substring(0, MAX_CHARS_PER_FILE) + `...[截断，全文共${file.content.length}字]`
            : file.content;
          return `--- 文件: ${file.name} (${file.type}) ---\n${truncated}`;
        }).join('\n\n');

        finalText = await chatWithKnowledgeBase(
          userMsg.text,
          messages.map(m => ({ role: m.role, text: m.text })),
          combinedKnowledgeText
        );

        setMessages(prev => prev.map(m =>
          m.timestamp === streamingMsgId
            ? { ...m, text: finalText, isStreaming: false }
            : m
        ));
      }
    } catch (err: any) {
      const errText = err.name === 'AbortError' ? '已取消请求。' : `分析出错：${err.message}`;
      setMessages(prev => prev.map(m =>
        m.timestamp === streamingMsgId
          ? { ...m, text: errText, isStreaming: false }
          : m
      ));
    } finally {
      setLoading(false);
      setLiveSteps([]);
    }
  };

  const processFileContent = async (file: File): Promise<{ content: string; type: string }> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    let textContent = '';
    let fileType = 'text';
    try {
      if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
        fileType = 'excel';
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        let fileContent = '';
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          if (csv.trim()) fileContent += `\n[Sheet: ${sheetName}]\n${csv}\n`;
        });
        textContent = fileContent;
      } else if (extension === 'docx') {
        fileType = 'word';
        const buffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        textContent = result.value;
      } else if (extension === 'pdf') {
        fileType = 'pdf';
        const buffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: buffer });
        const pdf = await loadingTask.promise;
        let pdfText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContentObj = await page.getTextContent();
          pdfText += `\n[Page ${i}]\n${textContentObj.items.map((item: any) => item.str).join(' ')}\n`;
        }
        textContent = pdfText;
      } else {
        textContent = await file.text();
      }
      return { content: textContent.trim(), type: fileType };
    } catch (err) {
      throw new Error(`解析文件失败: ${file.name}`);
    }
  };

  const handleKBFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (knowledgeFiles.length + files.length > 5) {
      alert(`最多只能上传5个文件。`); return;
    }
    const maxSize = 10 * 1024 * 1024;
    const existingFileNames = new Set(knowledgeFiles.map(f => f.name));
    const newFiles: KnowledgeFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSize) { alert(`文件 ${file.name} 大小超过10MB限制。`); continue; }
      if (existingFileNames.has(file.name)) { alert(`文件 "${file.name}" 已经上传过了。`); continue; }
      try {
        const { content, type } = await processFileContent(file);
        // Phase 12: 保留原始二进制，供后续沙箱注入使用
        const rawBuffer = await file.arrayBuffer();
        if (content) {
          newFiles.push({
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
            name: file.name, content, type, size: file.size, uploadTime: new Date(),
            rawBuffer,
          });
        }
      } catch (err: any) {
        alert(`处理文件 "${file.name}" 时出错: ${err.message}`);
      }
    }
    if (newFiles.length > 0) setKnowledgeFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => setKnowledgeFiles(prev => prev.filter(file => file.id !== id));
  const clearAllFiles = () => setKnowledgeFiles([]);

  return (
    <div className="h-full flex bg-slate-950 text-slate-100">

      {/* ── Chat Area ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative min-w-0">

        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-800/60 flex justify-between items-center bg-slate-900/80 backdrop-blur-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <BrainCircuit className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">审计指挥官</h2>
              <p className="text-xs text-slate-500">Brain + Hands Mode Active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Phase 11.2: Zen Mode Toggle */}
            <button
              onClick={() => setZenMode(!zenMode)}
              title={zenMode ? '当前：简约模式 (点击切换为极客模式)' : '当前：极客模式 (点击切换为简约模式)'}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${zenMode
                ? 'bg-slate-800 border-slate-700 text-slate-400'
                : 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                }`}
            >
              {zenMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {zenMode ? '简约' : '极客'}
            </button>
            <button
              onClick={() => setUseOrchestrator(!useOrchestrator)}
              title={useOrchestrator ? '当前：指挥家模式' : '当前：简单模式'}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${useOrchestrator
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
            >
              <Sparkles className="w-3 h-3" />
              {useOrchestrator ? '指挥家' : '简单'}
            </button>
            <button
              onClick={() => setShowKB(!showKB)}
              className={`p-2 rounded-lg transition-colors ${showKB ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Book className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-emerald-600/80'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-slate-300" /> : <BrainCircuit className="w-5 h-5 text-white" />}
              </div>
              <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                {/* Orchestration Thought Bubbles */}
                {msg.orchestrationSteps && msg.orchestrationSteps.length > 0 && (
                  <div className="w-full space-y-1.5">
                    {msg.orchestrationSteps.map((step, si) => (
                      <OrchestratorThoughtBubble key={si} step={step} index={si} zenMode={zenMode} />
                    ))}
                  </div>
                )}

                {/* Message bubble */}
                {(msg.text || msg.isStreaming) && (
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                    ? 'bg-slate-700 text-slate-100 rounded-tr-none'
                    : 'bg-slate-800 border border-slate-700/50 text-slate-200 rounded-tl-none'
                    }`}>
                    {msg.isStreaming && !msg.text ? (
                      <div className="flex gap-1.5 items-center text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>正在分析中...</span>
                      </div>
                    ) : (
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-2 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50 focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
              placeholder={useOrchestrator ? '告知审计任务，指挥官将自动驱动专业代理...' : '询问关于审计规范或财务数据的问题...'}
              className="flex-1 bg-transparent border-none outline-none px-2 text-slate-200 placeholder:text-slate-500"
            />
            {loading && (
              <button
                onClick={() => abortControllerRef.current?.abort()}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="停止"
              >
                <AlertCircle className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>{/* end Chat Area */}

      {/* ── Knowledge Base Sidebar ─────────────────── */}
      {showKB && (
        <div className="w-72 border-l border-slate-800 bg-slate-900 flex flex-col shadow-xl z-20 flex-shrink-0">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-semibold text-slate-300 flex items-center gap-2 text-sm">
              <Database className="w-4 h-4 text-emerald-400" />
              知识库 & 文件
            </h3>
            <p className="text-xs text-slate-500 mt-1">上传文件后，指挥官将自动感知并在分析时调用。</p>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            <label className="block w-full border-2 border-dashed border-slate-700 rounded-xl p-5 text-center cursor-pointer hover:bg-slate-800/50 hover:border-emerald-500/40 transition-colors group">
              <input
                type="file"
                accept=".txt,.md,.json,.xml,.csv,.xlsx,.xls,.docx,.pdf"
                multiple
                onChange={handleKBFiles}
                className="hidden"
              />
              <Paperclip className="w-7 h-7 text-slate-600 mx-auto mb-2 group-hover:text-emerald-400 transition-colors" />
              <span className="text-sm text-slate-400 font-medium">添加文件</span>
              <p className="text-[10px] text-slate-600 mt-1">Excel, PDF, Word, CSV, TXT (最多5个)</p>
            </label>

            {knowledgeFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> 文件 ({knowledgeFiles.length}/5)
                  </span>
                  {knowledgeFiles.length > 1 && (
                    <button onClick={clearAllFiles} className="text-red-400 hover:text-red-300 font-normal">清空</button>
                  )}
                </div>

                {knowledgeFiles.map((file) => (
                  <div key={file.id} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 relative group hover:border-emerald-500/30 transition-colors">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => removeFile(file.id)} className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-slate-200 truncate" title={file.name}>{file.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 capitalize">{file.type}</span>
                          <span className="text-[10px] text-slate-600">{(file.size / 1024).toFixed(1)}KB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="text-[10px] text-slate-600 text-right pt-1">
                  总计 {knowledgeFiles.reduce((sum, f) => sum + f.content.length, 0).toLocaleString()} 字符
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Phase 11.3: Deep Report Sidebar ─────────── */}
      {reportContent && (
        <div className="w-80 border-l border-indigo-800/40 bg-slate-900/95 flex flex-col shadow-2xl z-20 flex-shrink-0">
          <div className="p-4 border-b border-indigo-800/40 flex items-center justify-between">
            <h3 className="font-semibold text-indigo-300 flex items-center gap-2 text-sm">
              <NotebookPen className="w-4 h-4 text-indigo-400" />
              分析报告
            </h3>
            <button
              onClick={() => setReportContent('')}
              className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              清除
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-sm text-slate-200 space-y-2">
            <ReactMarkdown>{reportContent}</ReactMarkdown>
          </div>
        </div>
      )}

    </div>
  );
};
