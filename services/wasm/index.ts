/**
 * WebAssembly 模块 - 统一导出
 *
 * 提供本地化的 Python 执行环境，支持：
 * - Pyodide WASM Python 解释器
 * - 虚拟文件系统
 * - 统一执行引擎
 *
 * @author Fullstack Developer
 * @version 1.0.0
 */

// 导出服务
export { PyodideService, PyodideStatus, getPyodideService } from './PyodideService';
export type { PyodideConfig, ExecutionResult as PyodideResult, FileSystemStatus } from './PyodideService';

export { FileSystemService, getFileSystemService, STANDARD_PATHS } from './FileSystemService';
export type { FileInfo, FileFerryOptions } from './FileSystemService';

export { ExecutionEngine, getExecutionEngine } from './ExecutionEngine';
export type { ExecutionConfig, ExecutionContext, ExecutionResult, SecurityCheckResult } from './ExecutionEngine';

// 导出便捷函数
import { getPyodideService } from './PyodideService';
import { getFileSystemService } from './FileSystemService';
import { getExecutionEngine } from './ExecutionEngine';

/**
 * 初始化 WASM 模块
 *
 * 一键初始化所有服务
 */
export async function initializeWasm(config?: {
  pyodide?: {
    indexURL?: string;
    packages?: string[];
  };
}): Promise<void> {
  console.log('[WASM] Initializing WebAssembly module...');

  try {
    // 初始化 Pyodide
    await getPyodideService(config?.pyodide);

    console.log('[WASM] ✅ WebAssembly module initialized');
  } catch (error) {
    console.error('[WASM] ❌ Failed to initialize:', error);
    throw error;
  }
}

/**
 * 执行 Python 代码（便捷函数）
 *
 * @param code Python 代码
 * @param datasets 数据集
 * @returns 执行结果
 */
export async function executePython(
  code: string,
  datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } }
) {
  const engine = getExecutionEngine();
  return engine.execute(code, datasets);
}

/**
 * 挂载 Excel 文件（便捷函数）
 *
 * @param file Excel 文件
 * @returns 挂载路径
 */
export async function mountExcelFile(file: File): Promise<string> {
  const fs = getFileSystemService();
  return fs.ferryFile(file);
}

/**
 * 下载结果文件（便捷函数）
 *
 * @param fileName 文件名
 */
export function downloadResult(fileName?: string): void {
  const fs = getFileSystemService();
  fs.downloadFile('/data/output.xlsx', fileName);
}

/**
 * 清理资源（便捷函数）
 */
export function cleanup(): void {
  const engine = getExecutionEngine();
  engine.reset();
}

/**
 * 模块信息
 */
export const MODULE_INFO = {
  name: 'excelmind-wasm',
  version: '1.0.0',
  description: 'WebAssembly-based Python execution engine for ExcelMind AI',
  features: [
    'Pyodide WASM Python interpreter',
    'Virtual file system with standard paths',
    'File ferry mechanism (File → Uint8Array → Pyodide FS)',
    'Unified execution engine',
    'Security checks for code execution',
    'Compatible with existing AgenticOrchestrator'
  ],
  standardPaths: {
    input: '/data/input.xlsx',
    output: '/data/output.xlsx',
    temp: '/data/temp',
    working: '/data',
    outputDir: '/output'
  }
};

// 默认导出
export default {
  initialize: initializeWasm,
  execute: executePython,
  mountFile: mountExcelFile,
  downloadResult,
  cleanup,
  info: MODULE_INFO
};
