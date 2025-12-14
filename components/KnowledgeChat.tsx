import React, { useState, useRef, useEffect } from 'react';
import { Send, Book, Paperclip, Bot, User, Trash2, FileText } from 'lucide-react';
import { ChatMessage } from '../types';
import { chatWithKnowledgeBase } from '../services/zhipuService';
import ReactMarkdown from 'react-markdown';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
// Use explicit named imports or fallback to default if necessary
import * as pdfjsLib from 'pdfjs-dist';

// Handle PDF.js export structure differences (ESM vs CJS interop)
const pdfjs = pdfjsLib.default ? (pdfjsLib.default as any) : pdfjsLib;

// Configure PDF.js worker
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

export const KnowledgeChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: '你好！我是您的财务与审计助手。您可以在右侧上传最多5个知识库文档（支持 Excel, PDF, Word, CSV, TXT），我会依据这些内容回答您的问题。', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [showKB, setShowKB] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // 合并所有知识库文件内容
    const combinedKnowledgeText = knowledgeFiles.map(file =>
      `--- 文件: ${file.name} (${file.type}) ---\n${file.content}`
    ).join('\n\n');

    const botResponseText = await chatWithKnowledgeBase(
      userMsg.text,
      messages.map(m => ({ role: m.role, text: m.text })),
      combinedKnowledgeText
    );

    const botMsg: ChatMessage = { role: 'model', text: botResponseText, timestamp: Date.now() };
    setMessages(prev => [...prev, botMsg]);
    setLoading(false);
  };

  const processFileContent = async (file: File): Promise<{ content: string; type: string }> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    let textContent = '';
    let fileType = 'text';

    try {
      if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
        // Parse Excel/CSV
        fileType = 'excel';
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        let fileContent = "";
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          if (csv.trim()) {
            fileContent += `\n[Sheet: ${sheetName}]\n${csv}\n`;
          }
        });
        textContent = fileContent;
      }
      else if (extension === 'docx') {
        // Parse Word (DOCX)
        fileType = 'word';
        const buffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        textContent = result.value;
        if (result.messages.length > 0) {
          console.warn("Mammoth messages:", result.messages);
        }
      }
      else if (extension === 'pdf') {
        // Parse PDF
        fileType = 'pdf';
        const buffer = await file.arrayBuffer();
        // Use the resolved pdfjs object
        const loadingTask = pdfjs.getDocument({ data: buffer });
        const pdf = await loadingTask.promise;
        let pdfText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContentObj = await page.getTextContent();
          const pageText = textContentObj.items.map((item: any) => item.str).join(' ');
          pdfText += `\n[Page ${i}]\n${pageText}\n`;
        }
        textContent = pdfText;
      }
      else {
        // Default text read for txt, md, json, xml, etc.
        textContent = await file.text();
      }

      return { content: textContent.trim(), type: fileType };
    } catch (err) {
      console.error("Failed to parse file", err);
      throw new Error(`解析文件失败: ${file.name}`);
    }
  };

  const handleKBFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // 检查文件数量限制
    const totalFiles = knowledgeFiles.length + files.length;
    if (totalFiles > 5) {
      alert(`最多只能上传5个文件。当前有${knowledgeFiles.length}个文件，选择${files.length}个文件，总数${totalFiles}个文件超过限制。`);
      return;
    }

    // 检查文件大小限制（每个文件10MB）
    const maxSize = 10 * 1024 * 1024;
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > maxSize) {
        alert(`文件 ${files[i].name} 大小超过10MB限制。`);
        return;
      }
    }

    // 检查重复文件名
    const existingFileNames = new Set(knowledgeFiles.map(f => f.name));
    const newFiles: KnowledgeFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (existingFileNames.has(file.name)) {
        alert(`文件 "${file.name}" 已经上传过了。请删除后重新上传或重命名文件。`);
        continue;
      }

      try {
        const { content, type } = await processFileContent(file);
        if (content) {
          newFiles.push({
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
            name: file.name,
            content,
            type,
            size: file.size,
            uploadTime: new Date()
          });
        }
      } catch (err: any) {
        alert(`处理文件 "${file.name}" 时出错: ${err.message}`);
      }
    }

    if (newFiles.length > 0) {
      setKnowledgeFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setKnowledgeFiles(prev => prev.filter(file => file.id !== id));
  };

  const clearAllFiles = () => {
    setKnowledgeFiles([]);
  };

  return (
    <div className="h-full flex bg-white">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-600" />
            审计助手
          </h2>
          <button 
            onClick={() => setShowKB(!showKB)}
            className={`p-2 rounded-lg transition-colors ${showKB ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <Book className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-emerald-600'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-slate-600" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-slate-800 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
              }`}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-75"></span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-emerald-100 focus-within:border-emerald-400 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="询问关于审计规范或财务数据的问题..."
              className="flex-1 bg-transparent border-none outline-none px-2 text-slate-700 placeholder:text-slate-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input}
              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Knowledge Base Sidebar */}
      {showKB && (
        <div className="w-80 border-l border-slate-200 bg-white flex flex-col shadow-xl z-20 transition-all">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Book className="w-4 h-4" /> 知识库
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              支持上传审计准则、Word、PDF 或 Excel 文件作为上下文。
            </p>
          </div>
          
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <label className="block w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50 hover:border-emerald-400 transition-colors group">
              <input
                type="file"
                accept=".txt,.md,.json,.xml,.csv,.xlsx,.xls,.docx,.pdf"
                multiple
                onChange={handleKBFiles}
                className="hidden"
              />
              <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-2 group-hover:text-emerald-500 transition-colors" />
              <span className="text-sm text-slate-500 font-medium">添加文件</span>
              <p className="text-[10px] text-slate-400 mt-1">支持 Excel, PDF, Word, CSV, TXT (最多5个)</p>
            </label>

            {/* 文件列表 */}
            {knowledgeFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" /> 知识库文件 ({knowledgeFiles.length}/5)
                  </span>
                  {knowledgeFiles.length > 1 && (
                    <button
                      onClick={clearAllFiles}
                      className="text-xs text-red-500 hover:text-red-700 font-normal"
                    >
                      清空全部
                    </button>
                  )}
                </div>

                {knowledgeFiles.map((file) => (
                  <div key={file.id} className="bg-white rounded-lg p-3 border border-slate-200 relative group hover:border-emerald-300 transition-colors">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded"
                        title="删除文件"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-800 truncate" title={file.name}>
                          {file.name}
                        </h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-slate-500 capitalize">{file.type}</span>
                          <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)}KB</span>
                          <span className="text-xs text-slate-400">
                            {new Date(file.uploadTime).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-600 line-clamp-3 font-mono bg-slate-50 p-2 rounded border border-slate-100 overflow-hidden">
                          {file.content.substring(0, 150)}...
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 总字符数统计 */}
                <div className="text-xs text-slate-500 text-right pt-2 border-t border-slate-100">
                  总计 {knowledgeFiles.reduce((sum, file) => sum + file.content.length, 0).toLocaleString()} 字符
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};