import * as XLSX from 'xlsx';
import { ExcelData } from '../types';

export const readExcelFile = async (file: File): Promise<ExcelData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const sheets: { [key: string]: any[] } = {};
        const metadata: {
          [sheetName: string]: {
            comments: { [cellAddress: string]: string };
            notes?: { [cellAddress: string]: string };
            rowCount: number;
            columnCount: number;
          }
        } = {};
        let firstSheetName = '';

        workbook.SheetNames.forEach((name, index) => {
          if (index === 0) firstSheetName = name;
          const worksheet = workbook.Sheets[name];

          // 读取主要数据
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          sheets[name] = jsonData;

          // 提取元数据：注释和标注
          const comments: { [cellAddress: string]: string } = {};
          const notes: { [cellAddress: string]: string } = {};

          // 遍历工作表中的所有单元格
          for (const cellAddress in worksheet) {
            if (cellAddress.startsWith('!')) continue; // 跳过元数据字段

            const cell = worksheet[cellAddress];

            // 提取单元格注释
            if (cell.c) {
              // cell.c 是注释对象数组
              cell.c.forEach((comment: any) => {
                if (comment.a && comment.t) {
                  // comment.a 是作者，comment.t 是文本
                  const commentText = comment.t;
                  const author = comment.a || '';
                  comments[cellAddress] = author ? `[${author}]: ${commentText}` : commentText;
                }
              });
            }

            // 提取单元格标注 (Note)
            if (cell.n) {
              notes[cellAddress] = cell.n;
            }
          }

          // 计算行列数
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          const rowCount = range.e.r + 1; // 结束行号 + 1
          const columnCount = range.e.c + 1; // 结束列号 + 1

          metadata[name] = {
            comments,
            notes,
            rowCount,
            columnCount
          };
        });

        resolve({
          id: file.name + '-' + Date.now(),
          fileName: file.name,
          sheets,
          currentSheetName: firstSheetName,
          metadata
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

/**
 * 导出单个sheet到Excel
 */
export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
};

/**
 * 导出多sheet到Excel
 * @param sheets 对象，key为sheet名称，value为数据数组
 * @param fileName 文件名
 */
export const exportMultipleSheetsToExcel = (sheets: { [sheetName: string]: any[] }, fileName: string) => {
  const workbook = XLSX.utils.book_new();

  Object.entries(sheets).forEach(([sheetName, data]) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
};

/**
 * 执行 AI 生成的 Python 代码
 * 通过 IPC 调用主进程中的 Python 解释器
 * @param code AI 生成的 Python 代码
 * @param datasets 文件名 -> 数据数组的映射
 * @param timeoutMs 超时时间（毫秒），默认 30 秒
 */
export const executeTransformation = async (
  code: string,
  datasets: { [fileName: string]: any[] },
  timeoutMs: number = 30000 // Default 30 seconds
): Promise<{ [fileName: string]: any[] }> => {
  console.log('[Python Execution] Starting...');
  console.log('[Python Execution] Code length:', code.length);
  console.log('[Python Execution] Datasets keys:', Object.keys(datasets));

  try {
    // 检查是否在 Electron 环境中
    if (!(window as any).electronAPI) {
      throw new Error('Electron API 不可用，请确保在 Electron 应用中运行');
    }

    // 调用主进程的 Python 执行器
    const result = await (window as any).electronAPI.executePython({
      code,
      datasets,
      timeout: timeoutMs
    });

    if (result.success) {
      console.log('[Python Execution] Success, output keys:', Object.keys(result.data));
      return result.data;
    } else {
      throw new Error(result.error || 'Python 执行失败');
    }
  } catch (error) {
    console.error('[Python Execution] Error:', error);
    throw error;
  }
};