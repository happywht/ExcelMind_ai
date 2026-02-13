import { logger } from '@/utils/logger';
import * as XLSX from 'xlsx';
import { ExcelData } from '../types';

export const readExcelFile = async (file: File): Promise<ExcelData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

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
    reader.readAsArrayBuffer(file);
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
 * 支持多种运行环境：
 * - Node.js 服务器端：使用 child_process 直接执行 Python
 * - Electron 浏览器端：通过 IPC 调用主进程中的 Python 解释器
 *
 * @param code AI 生成的 Python 代码
 * @param datasets 文件名 -> 数据数组或多sheet数据的映射
 * @param timeoutMs 超时时间（毫秒），默认 30 秒
 */
export const executeTransformation = async (
  code: string,
  datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } },
  timeoutMs: number = 30000 // Default 30 seconds
): Promise<{ [fileName: string]: any[] | { [sheetName: string]: any[] } }> => {
  logger.debug('[Python Execution] Starting...');
  logger.debug('[Python Execution] Code length:', code.length);
  logger.debug('[Python Execution] Datasets keys:', Object.keys(datasets));
  logger.debug('[Python Execution] Full Python code to execute:');
  logger.debug('---BEGIN PYTHON CODE---');
  logger.debug(code);
  logger.debug('---END PYTHON CODE---');

  // ✅ 环境检测
  const isNodeEnvironment = typeof process !== 'undefined' && process.versions && process.versions.node;
  const isBrowserEnvironment = typeof window !== 'undefined';

  logger.info('[Python Execution] Environment detection:', {
    isNodeEnvironment,
    isBrowserEnvironment,
    platform: isNodeEnvironment ? process.platform : 'browser'
  });

  try {
    // ✅ Node.js 环境 - 使用 child_process 执行 Python
    if (isNodeEnvironment) {
      logger.info('[Python Execution] Using Node.js Python execution...');
      return await executeInNodeJS(code, datasets, timeoutMs);
    }

    // ✅ 浏览器环境 - 使用 Electron API
    if (isBrowserEnvironment) {
      if (!(window as any).electronAPI) {
        throw new Error('Electron API 不可用。如果是在浏览器中运行，请使用 Electron 应用。');
      }

      logger.info('[Python Execution] Using Electron IPC API...');
      return await executeInBrowser(code, datasets, timeoutMs);
    }

    // ❌ 不支持的环境
    throw new Error('不支持的环境：需要 Node.js 或浏览器（Electron）环境');
  } catch (error) {
    const errorObj = error as Error;
    logger.error('[Python Execution] Exception caught:', {
      name: errorObj.name,
      message: errorObj.message,
      stack: errorObj.stack
    });

    // 如果是我们自己抛出的错误，直接抛出
    if (errorObj.message.includes('Python执行失败')) {
      throw error;
    }

    // 否则包装成更详细的错误
    throw new Error(`Python执行异常: ${errorObj.message}\n\n执行的代码:\n${code.substring(0, 500)}...`);
  }
};

/**
 * 在 Node.js 环境中执行 Python 代码
 * 使用 child_process.spawn 执行 Python 脚本
 */
async function executeInNodeJS(
  code: string,
  datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } },
  timeoutMs: number
): Promise<{ [fileName: string]: any[] | { [sheetName: string]: any[] } }> {
  const { spawn } = await import('child_process');
  const os = await import('os');
  const path = await import('path');
  const fs = await import('fs');

  const startTime = Date.now();

  // 创建临时目录
  const tempDir = path.join(os.tmpdir(), 'excelmind-python-' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  logger.debug('[Python Execution] Temp directory:', tempDir);

  try {
    // 1. 准备输入数据 JSON 文件
    const inputFile = path.join(tempDir, 'input.json');
    fs.writeFileSync(inputFile, JSON.stringify(datasets), 'utf-8');
    logger.debug('[Python Execution] Input file created:', inputFile);

    // 2. 准备 Python 脚本
    const outputFile = path.join(tempDir, 'output.json');
    const pythonScript = `import json
import sys

# 读取输入数据
try:
    with open('${inputFile.replace(/\\/g, '\\\\')}', 'r', encoding='utf-8') as f:
        files = json.load(f)
except Exception as e:
    print(json.dumps({"error": f"读取输入文件失败: {str(e)}"}), file=sys.stderr)
    sys.exit(1)

# 执行用户代码
${code}

# 输出结果到文件（避免 stdout 污染）
try:
    with open('${outputFile.replace(/\\/g, '\\\\')}', 'w', encoding='utf-8') as f:
        json.dump(files, f, ensure_ascii=False, default=str)
except Exception as e:
    print(json.dumps({"error": f"写入结果文件失败: {str(e)}"}), file=sys.stderr)
    sys.exit(1)
`;

    const scriptFile = path.join(tempDir, 'script.py');
    fs.writeFileSync(scriptFile, pythonScript, 'utf-8');
    logger.debug('[Python Execution] Script file created:', scriptFile);

    // 3. 执行 Python 脚本
    await new Promise<void>((resolve, reject) => {
      const python = process.platform === 'win32' ? 'python' : 'python3';
      logger.debug('[Python Execution] Spawning Python process:', python);

      const pythonProcess = spawn(python, [scriptFile], {
        cwd: tempDir,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      let stderr = '';

      // 设置超时
      const timeoutId = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error(`Python 执行超时 (${timeoutMs}ms)`));
      }, timeoutMs);

      // stderr 用于捕获错误信息
      pythonProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        logger.debug('[Python Execution] stderr:', chunk);
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          logger.debug('[Python Execution] Process exited successfully');
          resolve();
        } else {
          logger.error('[Python Execution] Process failed with code:', code);
          reject(new Error(stderr || `Python 进程退出，代码: ${code}`));
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        logger.error('[Python Execution] Process error:', error);
        reject(new Error(`无法启动 Python: ${error.message}`));
      });
    });

    // 4. 从文件读取结果
    let outputData;
    try {
      const outputContent = fs.readFileSync(outputFile, 'utf-8');
      outputData = JSON.parse(outputContent);
      logger.info('[Python Execution] ✅ Success!');
      logger.debug('[Python Execution] Output data keys:', Object.keys(outputData));

      for (const [key, value] of Object.entries(outputData)) {
        const data = value as any[];
        logger.debug(`[Python Execution] - ${key}: ${Array.isArray(data) ? data.length + ' rows' : typeof value}`);
      }
    } catch (readError) {
      const error = readError as Error;
      logger.error('[Python Execution] Failed to read output file:', error);
      throw new Error(`读取结果文件失败: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    logger.info(`[Python Execution] Node.js execution completed in ${duration}ms`);

    return outputData;

  } catch (error) {
    const errorObj = error as Error;
    logger.error('[Python Execution] Node.js execution error:', errorObj);

    // 详细的错误分析
    const errorStr = String(errorObj.message || '');
    let errorType = 'UNKNOWN_ERROR';
    let errorDetails = '';

    if (errorStr.includes('SyntaxError')) {
      errorType = 'SYNTAX_ERROR';
      errorDetails = 'Python代码有语法错误，可能是引号未闭合、缩进错误或拼写错误';
    } else if (errorStr.includes('IndentationError')) {
      errorType = 'INDENTATION_ERROR';
      errorDetails = 'Python代码缩进不正确';
    } else if (errorStr.includes('NameError') || errorStr.includes("name '")) {
      errorType = 'NAME_ERROR';
      errorDetails = '使用了未定义的变量或函数名';
    } else if (errorStr.includes('KeyError')) {
      errorType = 'KEY_ERROR';
      errorDetails = '尝试访问不存在的字典键或DataFrame列';
    } else if (errorStr.includes('TypeError')) {
      errorType = 'TYPE_ERROR';
      errorDetails = '数据类型不匹配，可能使用了错误类型的操作';
    } else if (errorStr.includes('AttributeError')) {
      errorType = 'ATTRIBUTE_ERROR';
      errorDetails = '尝试访问对象不存在的属性或方法';
    } else if (errorStr.includes('超时') || errorStr.includes('timeout')) {
      errorType = 'TIMEOUT_ERROR';
      errorDetails = 'Python代码执行时间过长，超过超时限制';
    } else if (errorStr.includes('无法启动 Python') || errorStr.includes('Python 进程退出')) {
      errorType = 'EXECUTION_ERROR';
      errorDetails = 'Python环境配置错误或未安装Python';
    }

    const fullError = `Python执行失败 [${errorType}]\n${errorDetails}\n\n原始错误:\n${errorObj.message}`;
    logger.error('[Python Execution]', fullError);

    throw new Error(fullError);
  } finally {
    // 5. 清理临时目录
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      logger.debug('[Python Execution] Temp directory cleaned');
    } catch (cleanupError) {
      logger.error('[Python Execution] Cleanup failed:', cleanupError);
    }
  }
}

/**
 * 在浏览器环境中执行 Python 代码
 * 使用 Electron IPC API 调用主进程的 Python 执行器
 */
async function executeInBrowser(
  code: string,
  datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } },
  timeoutMs: number
): Promise<{ [fileName: string]: any[] | { [sheetName: string]: any[] } }> {
  // 调用主进程的 Python 执行器
  logger.info('[Python Execution] Calling electronAPI.executePython...');
  const startTime = Date.now();

  const result = await (window as any).electronAPI.executePython({
    code,
    datasets,
    timeout: timeoutMs
  });

  const duration = Date.now() - startTime;
  logger.info(`[Python Execution] IPC call completed in ${duration}ms`);
  logger.debug('[Python Execution] Result structure:', {
    hasSuccess: 'success' in result,
    success: result.success,
    hasData: 'data' in result,
    hasError: 'error' in result,
    dataKeys: result.data ? Object.keys(result.data) : [],
    errorType: typeof result.error,
    errorLength: result.error ? result.error.length : 0
  });

  if (result.success) {
    logger.info('[Python Execution] ✅ Success!');
    logger.debug('[Python Execution] Output data keys:', Object.keys(result.data));
    for (const [key, value] of Object.entries(result.data)) {
      const data = value as any[];
      logger.debug(`[Python Execution] - ${key}: ${Array.isArray(data) ? data.length + ' rows' : typeof value}`);
    }
    return result.data;
  } else {
    logger.error('[Python Execution] ❌ Failed!');
    logger.error('[Python Execution] Error type:', typeof result.error);
    logger.error('[Python Execution] Error message:', result.error);

    // 详细的错误分析
    const errorStr = String(result.error || '');
    let errorType = 'UNKNOWN_ERROR';
    let errorDetails = '';

    if (errorStr.includes('SyntaxError')) {
      errorType = 'SYNTAX_ERROR';
      errorDetails = 'Python代码有语法错误，可能是引号未闭合、缩进错误或拼写错误';
    } else if (errorStr.includes('IndentationError')) {
      errorType = 'INDENTATION_ERROR';
      errorDetails = 'Python代码缩进不正确';
    } else if (errorStr.includes('NameError') || errorStr.includes("name '")) {
      errorType = 'NAME_ERROR';
      errorDetails = '使用了未定义的变量或函数名';
    } else if (errorStr.includes('KeyError')) {
      errorType = 'KEY_ERROR';
      errorDetails = '尝试访问不存在的字典键或DataFrame列';
    } else if (errorStr.includes('TypeError')) {
      errorType = 'TYPE_ERROR';
      errorDetails = '数据类型不匹配，可能使用了错误类型的操作';
    } else if (errorStr.includes('AttributeError')) {
      errorType = 'ATTRIBUTE_ERROR';
      errorDetails = '尝试访问对象不存在的属性或方法';
    }

    const fullError = `Python执行失败 [${errorType}]\n${errorDetails}\n\n原始错误:\n${result.error}`;
    logger.error('[Python Execution]', fullError);

    throw new Error(fullError);
  }
}
