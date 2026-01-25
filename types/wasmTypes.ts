/**
 * WebAssembly 模块类型定义
 *
 * 扩展现有类型系统，支持 WASM 执行
 *
 * @author Fullstack Developer
 * @version 1.0.0
 */

import { MultiStepTask, TaskResult, TaskContext } from './agenticTypes';

/**
 * WASM 执行模式
 */
export enum WasmExecutionMode {
  PYODIDE = 'pyodide',      // WebAssembly 本地执行
  NODE_PYTHON = 'node_python', // Node.js 子进程（向后兼容）
  HYBRID = 'hybrid'          // 混合模式
}

/**
 * WASM 配置
 */
export interface WasmConfig {
  mode: WasmExecutionMode;
  pyodide?: {
    indexURL?: string;
    packages?: string[];
    timeout?: number;
    maxMemoryMB?: number;
  };
  nodePython?: {
    executablePath?: string;
    pythonPath?: string;
    timeout?: number;
  };
  fallback?: {
    enabled: boolean;
    threshold: number; // 失败次数阈值
  };
}

/**
 * 文件摆渡状态
 */
export interface FileFerryStatus {
  fileName: string;
  sourcePath: string;
  targetPath: string;
  size: number;
  status: 'pending' | 'ferrying' | 'completed' | 'failed';
  error?: string;
  progress: number;
}

/**
 * 虚拟文件系统状态
 */
export interface VirtualFileSystemState {
  mountedFiles: Array<{
    name: string;
    path: string;
    size: number;
    type: string;
  }>;
  totalSize: number;
  lastCleanup: number;
}

/**
 * 代码执行上下文（WASM 版本）
 */
export interface WasmExecutionContext extends TaskContext {
  wasm?: {
    mode: WasmExecutionMode;
    fileSystem: VirtualFileSystemState;
    standardPaths: {
      input: string;
      output: string;
      temp: string;
    };
  };
}

/**
 * WASM 执行结果（扩展 TaskResult）
 */
export interface WasmExecutionResult extends TaskResult {
  wasm?: {
    mode: WasmExecutionMode;
    executionTime: number;
    memoryUsage: number;
    outputFiles: string[];
    securityCheck: {
      passed: boolean;
      issues: string[];
      warnings: string[];
    };
  };
}

/**
 * 代码安全检查配置
 */
export interface SecurityCheckConfig {
  enabled: boolean;
  bannedImports: string[];
  bannedFunctions: string[];
  allowedFilePatterns: string[];
  maxCodeLength: number;
  maxExecutionTime: number;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  initializationTime: number;
  averageExecutionTime: number;
  totalExecutions: number;
  successRate: number;
  memoryUsage: {
    current: number;
    peak: number;
    average: number;
  };
  fileSystemUsage: {
    totalFiles: number;
    totalSize: number;
    largestFile: number;
  };
}

/**
 * Pyodide 初始化进度
 */
export interface PyodideInitProgress {
  stage: 'loading' | 'installing' | 'ready' | 'error';
  progress: number; // 0-100
  currentPackage?: string;
  totalPackages: number;
  installedPackages: number;
  error?: string;
}

/**
 * 文件摆渡事件
 */
export interface FileFerryEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  fileName: string;
  progress: number;
  error?: string;
}

/**
 * 代码执行事件
 */
export interface CodeExecutionEvent {
  type: 'start' | 'stdout' | 'stderr' | 'complete' | 'error';
  stage: 'validation' | 'preparation' | 'execution' | 'parsing' | 'complete';
  data?: string;
  error?: string;
  executionTime?: number;
}

/**
 * WASM 模块状态
 */
export interface WasmModuleState {
  initialized: boolean;
  mode: WasmExecutionMode;
  pyodideReady: boolean;
  lastActivity: number;
  performance: PerformanceMetrics;
}

/**
 * Re-Act 循环状态（WASM 版本）
 */
export interface WasmReActState {
  phase: 'Think' | 'Act' | 'Observe' | 'Refine';
  maxRetries: number;
  currentRetry: number;
  lastError?: string;
  code?: string;
  result?: any;
  wasmMode: WasmExecutionMode;
}

/**
 * AI 生成代码请求（WASM 上下文）
 */
export interface WasmCodeGenerationRequest {
  userPrompt: string;
  dataFiles: Array<{
    fileName: string;
    headers: string[];
    sampleRows: any[];
    metadata?: any;
  }>;
  wasmContext: {
    standardPaths: {
      input: string;
      output: string;
    };
    availablePackages: string[];
    executionMode: WasmExecutionMode;
  };
}

/**
 * AI 生成代码响应（WASM 优化）
 */
export interface WasmCodeGenerationResponse {
  explanation: string;
  code: string;
  wasmOptimized: boolean;
  suggestedPackages: string[];
  estimatedExecutionTime: number;
}

/**
 * Excel 元数据（WASM 版本）
 */
export interface ExcelMetadataWasm {
  fileName: string;
  sheetNames: string[];
  sheets: {
    [sheetName: string]: {
      rowCount: number;
      columnCount: number;
      columns: Array<{
        name: string;
        type: 'string' | 'number' | 'date' | 'boolean';
        nullable: boolean;
        sampleValues: any[];
      }>;
      hasEmptyValues: boolean;
    };
  };
  virtualPath: string;
  size: number;
}

/**
 * 文件摆渡选项（完整版）
 */
export interface FileFerryOptions {
  targetPath?: string;
  validateFormat?: boolean;
  maxSize?: number;
  onProgress?: (progress: number) => void;
  onComplete?: (path: string) => void;
  onError?: (error: Error) => void;
}

/**
 * 执行引擎配置（完整版）
 */
export interface ExecutionEngineConfig {
  timeout: number;
  enableSecurityCheck: boolean;
  maxMemoryMB: number;
  outputFormat: 'json' | 'auto';
  mode: WasmExecutionMode;
  fallbackEnabled: boolean;
  retryOnError: boolean;
  maxRetries: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 与现有系统的集成接口
 */
export interface WasmIntegration {
  /**
   * 初始化 WASM 模块
   */
  initialize(config?: WasmConfig): Promise<void>;

  /**
   * 执行任务（兼容 AgenticOrchestrator）
   */
  executeTask(task: MultiStepTask): Promise<WasmExecutionResult>;

  /**
   * 挂载文件
   */
  mountFile(file: File, options?: FileFerryOptions): Promise<string>;

  /**
   * 下载结果
   */
  downloadResult(fileName?: string): void;

  /**
   * 清理资源
   */
  cleanup(): void;

  /**
   * 获取状态
   */
  getState(): WasmModuleState;
}

/**
 * 所有类型已在定义时导出，无需重复导出
 */
