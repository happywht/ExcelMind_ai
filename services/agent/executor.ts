import { runPython } from '../pyodideService';
import { AgenticStep } from '../../types';

export interface ExecutorContext {
    // 供 Excel 使用
    currentFiles?: any[];
    isSandboxDirty?: React.MutableRefObject<boolean>;
    setFilesData?: React.Dispatch<React.SetStateAction<any[]>>;

    // 供 Document 使用
    documents?: any[];
    setGeneratedDocs?: React.Dispatch<React.SetStateAction<string[]>>;
    setAiReportContent?: (content: string) => void;

    // 通用回调
    addLog: (module: string, status: 'pending' | 'success' | 'error', message: string) => void;
    setAgentSteps: React.Dispatch<React.SetStateAction<AgenticStep[]>>;
}

export const createToolExecutor = (ctx: ExecutorContext) => {
    return async (tool: string, params: any): Promise<string> => {
        ctx.addLog('AI Tool', 'pending', `执行工具 ${tool}: ${JSON.stringify(params).substring(0, 100)}...`);

        switch (tool) {
            case 'inspect_sheet': {
                const { fileName, sheetName } = params;
                const file = (ctx.currentFiles || []).find(f => f.fileName === fileName);
                if (!file) throw new Error(`找不到文件: ${fileName}`);
                const data = file.sheets[sheetName] || [];
                if (data.length === 0) return `Sheet "${sheetName}" in "${fileName}" is empty.`;

                const headers = Object.keys(data[0] || {});
                const unnamedCount = headers.filter(h => /^Unnamed/.test(h)).length;
                const totalCols = headers.length;

                let headerWarning = '';
                if (totalCols > 0 && unnamedCount / totalCols > 0.3) {
                    headerWarning = `\n⚠️ [Header Warning]: ${unnamedCount}/${totalCols} columns are "Unnamed", which strongly suggests Row 1 is NOT the real header. When using pd.read_excel, try skiprows=N (e.g., skiprows=1 or skiprows=2) to locate the actual column names. Always inspect the raw rows below first.`;
                }

                const rawRows = data.slice(0, 5);
                const rawDisplay = rawRows.map((row: any, i: number) =>
                    `  Row ${i}: ${JSON.stringify(row)}`
                ).join('\n');

                return `File: "${fileName}" | Sheet: "${sheetName}" | Total Rows: ${data.length}\nDetected Headers: [${headers.join(', ')}]${headerWarning}\nRaw Sample (first 5 rows as parsed):\n${rawDisplay}`;
            }

            case 'read_rows': {
                const { fileName, sheetName, start, end } = params;
                const file = (ctx.currentFiles || []).find(f => f.fileName === fileName);
                if (!file) throw new Error(`找不到文件: ${fileName}`);
                const data = file.sheets[sheetName] || [];
                const slice = data.slice(start || 0, (end !== undefined ? end : 10) + 1);
                return `Rows ${start || 0} to ${end || 10}:\n${JSON.stringify(slice, null, 2)}`;
            }

            case 'execute_python': {
                ctx.addLog('Sandbox', 'pending', '正在沙箱中执行 Python 代码...');

                const currentDataMap = ctx.isSandboxDirty?.current && ctx.currentFiles
                    ? Object.fromEntries(ctx.currentFiles.map(f => [f.fileName, f.sheets]))
                    : {};

                const { data: newData, logs, result } = await runPython(params.code, currentDataMap, (streamedLog) => {
                    ctx.setAgentSteps(prev => {
                        const next = [...prev];
                        if (next.length > 0) {
                            const last = { ...next[next.length - 1] };
                            last.logs = (last.logs || "") + streamedLog;
                            next[next.length - 1] = last;
                        }
                        return next;
                    });
                });

                // Excel UI Sync Logic
                if (ctx.setFilesData && ctx.isSandboxDirty) {
                    if (ctx.isSandboxDirty.current) ctx.isSandboxDirty.current = false;
                    ctx.setFilesData(prev => {
                        const updated = [...prev];
                        Object.entries(newData || {}).forEach(([fn, sheets]) => {
                            const sheetObj = typeof sheets === 'object' && !Array.isArray(sheets) ? sheets : { 'Result': sheets };
                            const metadata: any = {};
                            Object.entries(sheetObj).forEach(([sname, sdata]: [string, any]) => {
                                const rows = Array.isArray(sdata) ? sdata : [];
                                metadata[sname] = {
                                    rowCount: rows.length,
                                    columnCount: rows.length > 0 ? Object.keys(rows[0]).length : 0,
                                    comments: {}
                                };
                            });

                            const existingFileIdx = updated.findIndex(x => x.fileName === fn);
                            if (existingFileIdx !== -1) {
                                updated[existingFileIdx] = { ...updated[existingFileIdx], sheets: sheetObj, metadata };
                            } else {
                                updated.push({ id: Math.random().toString(36).substr(2, 9), fileName: fn, sheets: sheetObj, currentSheetName: Object.keys(sheetObj)[0] || 'Sheet1', metadata });
                            }
                        });
                        return updated;
                    });
                }

                // Document Generated Files Detection
                if (ctx.setGeneratedDocs && ctx.documents && newData && typeof newData === 'object') {
                    const uploadedNames = new Set(ctx.documents.map(d => d.name));
                    const newFileNames = Object.keys(newData).filter(fn => !uploadedNames.has(fn));
                    if (newFileNames.length > 0) {
                        ctx.setGeneratedDocs(prev => Array.from(new Set([...prev, ...newFileNames])));
                        ctx.addLog('System', 'success', `沙箱检测到新生成文件: ${newFileNames.join(', ')}`);
                    }
                }

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
                if (fileName.toLowerCase().endsWith('.pdf')) {
                    const safeFileName = fileName.replace(/'/g, "\\'");
                    const code = `
from pypdf import PdfReader
try:
    reader = PdfReader('/mnt/${safeFileName}')
    if 0 <= ${page_number} - 1 < len(reader.pages):
        page = reader.pages[${page_number} - 1]
        res = page.extract_text()
    else:
        res = "Page out of range."
except Exception as e:
    res = f"Error: {e}"
res
`;
                    const { result } = await runPython(code, {});
                    return String(result || "No text on this page.");
                } else {
                    return "Pagination reading is only available for PDFs. For Word docs, please use standard Python IO or extract all text at once.";
                }
            }

            case 'search_document': {
                const { fileName, keyword } = params;
                const targetDoc = (ctx.documents || []).find(d => d.name === fileName);
                if (targetDoc && targetDoc.text) {
                    const lines = targetDoc.text.split('\n');
                    const matches: string[] = [];
                    const contextLines = 2;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].toLowerCase().includes(keyword.toLowerCase())) {
                            const startMatch = Math.max(0, i - contextLines);
                            const endMatch = Math.min(lines.length - 1, i + contextLines);
                            matches.push(`[Line ${i + 1}] ...\n${lines.slice(startMatch, endMatch + 1).join('\n')}\n...`);
                        }
                    }
                    if (matches.length > 0) {
                        return `Found ${matches.length} matches for "${keyword}" in ${fileName}. Here are the previews:\n\n${matches.slice(0, 3).join('\n\n')}${matches.length > 3 ? `\n\n... and ${matches.length - 3} more matches omitted.` : ''}`;
                    } else {
                        return `Keyword "${keyword}" not found in ${fileName}.`;
                    }
                } else {
                    return `Missing text content for ${fileName}.`;
                }
            }

            case 'generate_report': {
                const reportContent = params.content || params.summary || params.markdown || '';
                if (ctx.setAiReportContent && reportContent) {
                    ctx.setAiReportContent(reportContent);
                    ctx.addLog('AI Report', 'success', `📄 AI 生成了富文本报告 (${reportContent.length} chars)`);
                }
                return `Report generated successfully. You can now call 'finish' to complete the task. (Summary preview: ${reportContent.substring(0, 50)}...)`;
            }

            default:
                throw new Error(`未知工具: ${tool}`);
        }
    };
};
