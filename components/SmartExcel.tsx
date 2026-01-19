import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileDown, Play, Loader2, FileSpreadsheet, Layers, Trash2, Code, Plus, Archive, CheckSquare, Square, Download } from 'lucide-react';
import { readExcelFile, exportToExcel, exportMultipleSheetsToExcel, executeTransformation } from '../services/excelService';
import { generateDataProcessingCode } from '../services/zhipuService';
import { ExcelData, ProcessingLog } from '../types';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { SAMPLING_CONFIG } from '../config/samplingConfig';

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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
          console.error(`Error reading file ${e.target.files[i].name}`, err);
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
    setLogs(prev => [{ id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, fileName: 'System', status: 'pending', message: '正在启动智能分析循环 (Observe-Think-Action)...' }, ...prev]);
    setLastGeneratedCode('');

    try {
      // 1. Prepare Metadata with Samples (The "Observe" phase context)
      // We send headers AND sample rows so the AI can infer column meanings by content.
      // ENHANCED: Now supports multi-sheet data transmission
      const filesPreview = filesData.map(f => {
        // 收集所有sheets的信息
        const sheetsInfo: Record<string, {
          headers: string[];
          sampleRows: any[];
          rowCount: number;
          metadata?: any;
        }> = {};

        Object.entries(f.sheets).forEach(([sheetName, data]) => {
          const headers = data.length > 0 ? Object.keys(data[0]) : [];
          const sampleRows = data.slice(0, SAMPLING_CONFIG.AI_ANALYSIS.SAMPLE_ROWS);
          const metadata = f.metadata ? f.metadata[sheetName] : undefined;

          sheetsInfo[sheetName] = {
            headers,
            sampleRows,
            rowCount: data.length,
            metadata
          };
        });

        // 当前sheet的详细信息（向后兼容）
        const currentData = f.sheets[f.currentSheetName] || [];
        const currentHeaders = currentData.length > 0 ? Object.keys(currentData[0]) : [];
        const currentSampleRows = currentData.slice(0, SAMPLING_CONFIG.AI_ANALYSIS.SAMPLE_ROWS);
        const currentMetadata = f.metadata ? f.metadata[f.currentSheetName] : undefined;

        return {
          fileName: f.fileName,
          currentSheetName: f.currentSheetName,
          // 当前sheet详细信息（向后兼容）
          headers: currentHeaders,
          sampleRows: currentSampleRows,
          metadata: currentMetadata,
          // 所有sheets信息（新增）
          sheets: sheetsInfo,
          sheetNames: Object.keys(f.sheets)
        };
      });

      // 2. Generate Code Plan (The "Think" phase)
      setLogs(prev => [{ id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, fileName: 'System', status: 'pending', message: 'AI 正在观察样本数据并规划逻辑...' }, ...prev]);
      
      const { code, explanation } = await generateDataProcessingCode(command, filesPreview);
      setLastGeneratedCode(code);
      
      setLogs(prev => [
        { id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, fileName: 'AI', status: 'success', message: `逻辑规划: ${explanation}` },
        ...prev
      ]);

      // 3. Prepare Data Map for Execution
      // ENHANCED: Now supports multi-sheet data structure
      const datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } } = {};
      filesData.forEach(f => {
        const sheetNames = Object.keys(f.sheets);
        if (sheetNames.length === 1) {
          // 单sheet：使用数组格式（向后兼容）
          datasets[f.fileName] = f.sheets[f.currentSheetName] || [];
        } else {
          // 多sheet：使用对象格式，包含所有sheets
          datasets[f.fileName] = {};
          sheetNames.forEach(sheetName => {
            (datasets[f.fileName] as { [sheetName: string]: any[] })[sheetName] = f.sheets[sheetName];
          });
        }
      });

      // 4. Execute Code (The "Action" phase)
      console.log('执行AI生成的代码，代码长度:', code.length);
      console.log('输入数据集:', Object.keys(datasets));

      const resultDatasets = await executeTransformation(code, datasets);

      console.log('AI处理结果:', Object.keys(resultDatasets), '数据量:', Object.values(resultDatasets).map(arr => arr.length));

      // 验证结果数据
      if (!resultDatasets || typeof resultDatasets !== 'object') {
        throw new Error('AI返回的数据格式错误');
      }

      const updatedFilesData = [...filesData];
      let processedFiles = 0;

      Object.entries(resultDatasets).forEach(([fileName, data]) => {
        // 处理多sheet结果（对象格式）
        if (typeof data === 'object' && !Array.isArray(data)) {
          const sheetsData = data as { [sheetName: string]: any[] };
          const existingIndex = updatedFilesData.findIndex(f => f.fileName === fileName);

          if (existingIndex >= 0) {
            // 更新现有文件的所有sheets
            const f = updatedFilesData[existingIndex];
            Object.entries(sheetsData).forEach(([sheetName, sheetData]) => {
              if (Array.isArray(sheetData)) {
                f.sheets[sheetName] = sheetData;
              }
            });
            processedFiles++;
          } else {
            // 创建新的多sheet文件
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
        // 处理单sheet结果（数组格式）- 向后兼容
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
        } else {
          console.warn('跳过无效数据:', fileName, typeof data);
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

    } catch (e: any) {
      setLogs(prev => [{ id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, fileName: 'System', status: 'error', message: e.message }]);
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
        console.error(e);
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
          <h2 className="text-xl font-bold text-slate-800">智能多文件处理工作区</h2>
          <p className="text-sm text-slate-500">上传多个文件，进行跨表核对、合并或筛选</p>
        </div>
        <div className="flex gap-3">
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
        
        {/* Left Panel: Files & Console */}
        <div className="w-[400px] flex flex-col border-r border-slate-200 bg-white shadow-sm z-10">
          
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
                     className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                       activeFileId === f.id 
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
            <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
              AI 指令
              <button 
                onClick={() => setShowCode(!showCode)} 
                className="text-xs font-normal text-slate-400 hover:text-emerald-600 flex items-center gap-1"
              >
                <Code className="w-3 h-3" /> {showCode ? '隐藏代码' : '查看代码'}
              </button>
            </label>
            
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
            
            <button
              onClick={handleRun}
              disabled={isProcessing || !command || filesData.length === 0}
              className={`mt-3 w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all text-sm ${
                isProcessing || !command || filesData.length === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-emerald-900/20'
              }`}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              执行智能处理
            </button>
          </div>

          {/* Logs */}
          <div className="h-32 bg-slate-900 overflow-y-auto p-3 text-xs font-mono">
            {logs.length === 0 ? (
              <span className="text-slate-600">等待指令...</span>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="mb-1.5 flex gap-2">
                  <span className={`uppercase font-bold ${
                    log.status === 'success' ? 'text-green-400' : 
                    log.status === 'error' ? 'text-red-400' : 'text-yellow-400'
                  }`}>[{log.status}]</span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Data Preview */}
        <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
          {activeFile && activeSheetData ? (
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
                 </div>
                 <button
                   onClick={() => exportMultipleSheetsToExcel(activeFile.sheets, activeFile.fileName)}
                   className="text-xs flex items-center gap-1 text-slate-600 hover:text-emerald-600 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 transition-all"
                   title="导出所有工作表"
                 >
                   <FileDown className="w-3.5 h-3.5" /> 导出文件 {Object.keys(activeFile.sheets).length > 1 && `(${Object.keys(activeFile.sheets).length}个工作表)`}
                 </button>
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
                         {Object.values(row).map((cell: any, cIdx) => (
                           <td key={cIdx} className="p-2 border-r border-slate-50 text-slate-600 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
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