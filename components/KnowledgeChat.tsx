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
    analyze_excel: '鍒嗘瀽 Excel',
    read_document: '璇诲彇鏂囨。',
    parallel_dispatch: '鈿?骞惰璋冨害',
    sync_context: '馃攧 鍚屾涓婁笅鏂?,
    search_context: '鎼滅储涓婁笅鏂?,
    write_memo: '馃摑 鍐欏蹇樺綍',
    read_memo: '馃摀 璇诲蹇樺綍',
    generate_report: '鐢熸垚鎶ュ憡',
    finish: '瀹屾垚',
  };

  // Phase 11.2: Zen Mode 鈥?show minimal capsule only
  if (zenMode) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] border w-fit ${statusColors[step.status] || statusColors.thinking
        }`}>
        {statusIcons[step.status]}
        <span className="text-slate-400">
          {toolLabels[step.action.tool] || step.action.tool}
        </span>
        {step.speak && (
          <span className="text-slate-300 italic truncate max-w-[220px]">鈥?{step.speak}</span>
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
        <span className="text-slate-500">#{index + 1}</span>
        {statusIcons[step.status]}
        <span className="text-slate-400 flex-1 truncate">{step.thought}</span>
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400 shrink-0">
          {agentIcons[step.agentType || 'orchestrator']}
          <span>{toolLabels[step.action.tool] || step.action.tool}</span>
        </span>
        {expanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
          <div className="text-slate-500">
            <span className="text-slate-400 font-semibold">Action: </span>
            <code className="text-blue-300">{step.action.tool}</code>
            {step.action.params.instruction && (
              <span className="text-slate-400"> 鈥?{step.action.params.instruction}</span>
            )}
          </div>

          {/* Phase 10.2: Parallel group lane display */}
          {step.parallelGroup && step.parallelGroup.length > 0 && (
            <div className="border border-yellow-500/20 rounded p-2 space-y-1">
              <div className="text-yellow-400 font-semibold text-[10px] mb-1">鈿?骞惰鎵ц闃熷垪</div>
              {step.parallelGroup.map((task, i) => (
                <div key={i} className="flex items-center gap-2">
                  {task.status === 'running' && <Loader2 className="w-2.5 h-2.5 text-yellow-400 animate-spin shrink-0" />}
                  {task.status === 'done' && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
                  {task.status === 'error' && <AlertCircle className="w-2.5 h-2.5 text-red-400 shrink-0" />}
                  <span className={`text-[10px] ${task.status === 'done' ? 'text-emerald-300' :
                    task.status === 'error' ? 'text-red-300' : 'text-yellow-300'
                    }`}>{task.label}</span>
                </div>
              ))}
            </div>
          )}

          {step.speak && (
            <div className="text-slate-300 border-t border-white/5 pt-2 italic">
              <span className="text-slate-500 font-semibold italic">Speak: </span>
              <span>{step.speak}</span>
            </div>
          )}
          {step.observation && (
            <div className="text-slate-500 border-t border-white/5 pt-2">
              <span className="text-slate-400 font-semibold">Observation: </span>
              <span className="text-emerald-300">{step.observation.substring(0, 300)}{step.observation.length > 300 ? '...' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// ---------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------
export const KnowledgeChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: '浣犲ソ锛佹垜鏄?*ExcelMind 瀹¤鎸囨尌瀹?*銆俓n\n鎴戠幇鍦ㄦ嫢鏈夋洿寮哄ぇ鐨勮兘鍔涒€斺€斾笉浠呰兘鍥炵瓟闂锛岃繕鑳?*鑷姩椹卞姩鍚庡彴涓撲笟浠ｇ悊**锛圫mart Excel & Smart Document锛夋潵甯綘绮惧噯鍒嗘瀽鏁版嵁锛屾棤闇€鎵嬪姩鍒囨崲宸ュ叿銆俓n\n璇蜂笂浼犳枃浠讹紝鐒跺悗鍛婅瘔鎴戜綘鐨勫璁′换鍔★紒',
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

  // Worker executor: invokes the relevant agent loop
  const executeWorker = useCallback(async (
    agentType: 'excel' | 'document',
    instruction: string,
    fileName?: string
  ): Promise<string> => {
    // Find the relevant file content or metadata
    const targetFile = fileName
      ? knowledgeFiles.find(f => f.name === fileName)
      : knowledgeFiles[0];

    if (!targetFile) {
      return 'No file available for this task. Please upload a file first.';
    }

    // For now, pass the file content as context to a simple analysis loop
    // In a full implementation, this would wire to runAgenticLoop
    const contextSummary = [
      `File: ${targetFile.name} (${targetFile.type})`,
      `Content preview: ${targetFile.content.substring(0, 2000)}`,
    ].join('\n');

    // Use the existing KnowledgeBase chat as a headless worker
    const workerResult = await chatWithKnowledgeBase(
      instruction,
      [],
      contextSummary
    );

    return workerResult;
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
    const streamingMsgId = Date.now();
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
        // 鈹€鈹€ Orchestrator Mode 鈹€鈹€
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

            // Phase 11.3: If finish/generate_report, write to report panel
            if ((step.action.tool === 'finish' || step.action.tool === 'generate_report') && step.action.params?.summary) {
              setReportContent(step.action.params.summary);
            }
          },
          executeWorker,
          abortControllerRef.current.signal
        );

        // Finalize message - if finalText is different from what we've accumulated via 'speak', use it
        setMessages(prev => prev.map(m => {
          if (m.timestamp === streamingMsgId) {
            // If the final result is basically the same as the last speak, don't double it
            const currentText = m.text.trim();
            const finalizedText = (finalText && finalText !== currentText)
              ? (currentText ? `${currentText}\n\n${finalText}` : finalText)
              : currentText;

            return { ...m, text: finalizedText, isStreaming: false, orchestrationSteps: [...orchestratorSteps] };
          }
          return m;
        }));
      } else {
        // 鈹€鈹€ Simple RAG mode (no files or orchestrator off) 鈹€鈹€
        const combinedKnowledgeText = knowledgeFiles.map(file =>
          `--- 鏂囦欢: ${file.name} (${file.type}) ---\n${file.content}`
        ).join('\n\n');

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
      const errText = err.name === 'AbortError' ? '宸插彇娑堣姹傘€? : `鍒嗘瀽鍑洪敊锛?{err.message}`;
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
      throw new Error(`瑙ｆ瀽鏂囦欢澶辫触: ${file.name}`);
    }
  };

  const handleKBFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (knowledgeFiles.length + files.length > 5) {
      alert(`鏈€澶氬彧鑳戒笂浼?涓枃浠躲€俙); return;
    }
    const maxSize = 10 * 1024 * 1024;
    const existingFileNames = new Set(knowledgeFiles.map(f => f.name));
    const newFiles: KnowledgeFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSize) { alert(`鏂囦欢 ${file.name} 澶у皬瓒呰繃10MB闄愬埗銆俙); continue; }
      if (existingFileNames.has(file.name)) { alert(`鏂囦欢 "${file.name}" 宸茬粡涓婁紶杩囦簡銆俙); continue; }
      try {
        const { content, type } = await processFileContent(file);
        if (content) {
          newFiles.push({
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
            name: file.name, content, type, size: file.size, uploadTime: new Date()
          });
        }
      } catch (err: any) {
        alert(`澶勭悊鏂囦欢 "${file.name}" 鏃跺嚭閿? ${err.message}`);
      }
    }
    if (newFiles.length > 0) setKnowledgeFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => setKnowledgeFiles(prev => prev.filter(file => file.id !== id));
  const clearAllFiles = () => setKnowledgeFiles([]);

  return (
    <div className="h-full flex bg-slate-950 text-slate-100">

      {/* 鈹€鈹€ Chat Area 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */}
      <div className="flex-1 flex flex-col relative min-w-0">

        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-800/60 flex justify-between items-center bg-slate-900/80 backdrop-blur-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <BrainCircuit className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">瀹¤鎸囨尌瀹?/h2>
              <p className="text-xs text-slate-500">Brain + Hands Mode Active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Phase 11.2: Zen Mode Toggle */}
            <button
              onClick={() => setZenMode(!zenMode)}
              title={zenMode ? '褰撳墠锛氱畝绾︽ā寮?(鐐瑰嚮鍒囨崲涓烘瀬瀹㈡ā寮?' : '褰撳墠锛氭瀬瀹㈡ā寮?(鐐瑰嚮鍒囨崲涓虹畝绾︽ā寮?'}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${zenMode
                  ? 'bg-slate-800 border-slate-700 text-slate-400'
                  : 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                }`}
            >
              {zenMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {zenMode ? '绠€绾? : '鏋佸'}
            </button>
            <button
              onClick={() => setUseOrchestrator(!useOrchestrator)}
              title={useOrchestrator ? '褰撳墠锛氭寚鎸ュ妯″紡' : '褰撳墠锛氱畝鍗曟ā寮?}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${useOrchestrator
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
            >
              <Sparkles className="w-3 h-3" />
              {useOrchestrator ? '鎸囨尌瀹? : '绠€鍗?}
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
                        <span>姝ｅ湪鍒嗘瀽涓?..</span>
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
              placeholder={useOrchestrator ? '鍛婄煡瀹¤浠诲姟锛屾寚鎸ュ畼灏嗚嚜鍔ㄩ┍鍔ㄤ笓涓氫唬鐞?..' : '璇㈤棶鍏充簬瀹¤瑙勮寖鎴栬储鍔℃暟鎹殑闂...'}
              className="flex-1 bg-transparent border-none outline-none px-2 text-slate-200 placeholder:text-slate-500"
            />
            {loading && (
              <button
                onClick={() => abortControllerRef.current?.abort()}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="鍋滄"
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

      {/* 鈹€鈹€ Knowledge Base Sidebar 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */}
      {showKB && (
        <div className="w-72 border-l border-slate-800 bg-slate-900 flex flex-col shadow-xl z-20 flex-shrink-0">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-semibold text-slate-300 flex items-center gap-2 text-sm">
              <Database className="w-4 h-4 text-emerald-400" />
              鐭ヨ瘑搴?&amp; 鏂囦欢
            </h3>
            <p className="text-xs text-slate-500 mt-1">涓婁紶鏂囦欢鍚庯紝鎸囨尌瀹樺皢鑷姩鎰熺煡骞跺湪鍒嗘瀽鏃惰皟鐢ㄣ€?/p>
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
              <span className="text-sm text-slate-400 font-medium">娣诲姞鏂囦欢</span>
              <p className="text-[10px] text-slate-600 mt-1">Excel, PDF, Word, CSV, TXT (鏈€澶?涓?</p>
            </label>

            {knowledgeFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> 鏂囦欢 ({knowledgeFiles.length}/5)
                  </span>
                  {knowledgeFiles.length > 1 && (
                    <button onClick={clearAllFiles} className="text-red-400 hover:text-red-300 font-normal">娓呯┖</button>
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
                  鎬昏 {knowledgeFiles.reduce((sum, f) => sum + f.content.length, 0).toLocaleString()} 瀛楃
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 鈹€鈹€ Phase 11.3: Deep Report Sidebar 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */}
      {reportContent && (
        <div className="w-80 border-l border-indigo-800/40 bg-slate-900/95 flex flex-col shadow-2xl z-20 flex-shrink-0">
          <div className="p-4 border-b border-indigo-800/40 flex items-center justify-between">
            <h3 className="font-semibold text-indigo-300 flex items-center gap-2 text-sm">
              <NotebookPen className="w-4 h-4 text-indigo-400" />
              鍒嗘瀽鎶ュ憡
            </h3>
            <button
              onClick={() => setReportContent('')}
              className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              娓呴櫎
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
