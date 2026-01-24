/**
 * Pyodide 服务 - WebAssembly Python 执行环境
 *
 * 核心职责：
 * 1. 初始化和管理 Pyodide 实例
 * 2. 加载 Python 包（pandas, openpyxl）
 * 3. 执行 Python 代码
 * 4. 管理虚拟文件系统
 *
 * @author Fullstack Developer
 * @version 1.0.0
 */

import { EventEmitter } from 'events';

/**
 * Pyodide 配置
 */
export interface PyodideConfig {
  indexURL?: string;
  packages?: string[];
  enableStdout?: boolean;
  enableStderr?: boolean;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  memoryUsage?: number;
}

/**
 * 文件系统状态
 */
export interface FileSystemStatus {
  mountedFiles: string[];
  totalSize: number;
  path: string;
}

/**
 * Pyodide 加载状态
 */
export enum PyodideStatus {
  UNINITIALIZED = 'uninitialized',
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error'
}

/**
 * Pyodide 服务类
 *
 * 单例模式，确保全局只有一个 Pyodide 实例
 */
export class PyodideService extends EventEmitter {
  private static instance: PyodideService | null = null;
  private pyodide: any = null;
  private status: PyodideStatus = PyodideStatus.UNINITIALIZED;
  private config: Required<PyodideConfig>;
  private initializationPromise: Promise<void> | null = null;

  private readonly DEFAULT_CONFIG: Required<PyodideConfig> = {
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
    packages: ['pandas', 'openpyxl', 'numpy'],
    enableStdout: true,
    enableStderr: true
  };

  private constructor(config?: Partial<PyodideConfig>) {
    super();
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    console.log('[PyodideService] Service created with config:', this.config);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: Partial<PyodideConfig>): PyodideService {
    if (!PyodideService.instance) {
      PyodideService.instance = new PyodideService(config);
    }
    return PyodideService.instance;
  }

  /**
   * 初始化 Pyodide
   *
   * 加载 Pyodide WASM 模块和必需的 Python 包
   */
  public async initialize(): Promise<void> {
    // 如果已经初始化，直接返回
    if (this.status === PyodideStatus.READY) {
      console.log('[PyodideService] Already initialized');
      return;
    }

    // 如果正在初始化，等待初始化完成
    if (this.initializationPromise) {
      console.log('[PyodideService] Initialization already in progress, waiting...');
      return this.initializationPromise;
    }

    console.log('[PyodideService] Starting initialization...');
    this.status = PyodideStatus.LOADING;
    this.emit('statusChange', this.status);

    this.initializationPromise = this.performInitialization();

    try {
      await this.initializationPromise;
      console.log('[PyodideService] ✅ Initialization successful');
    } catch (error) {
      console.error('[PyodideService] ❌ Initialization failed:', error);
      this.status = PyodideStatus.ERROR;
      this.emit('statusChange', this.status);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * 执行初始化（内部方法）
   */
  private async performInitialization(): Promise<void> {
    try {
      // 动态加载 Pyodide
      const { loadPyodide } = await import(this.config.indexURL + 'pyodide.mjs');

      console.log('[PyodideService] Loading Pyodide from:', this.config.indexURL);
      this.pyodide = await loadPyodide({
        indexURL: this.config.indexURL,
        stdout: this.config.enableStdout ? (text: string) => {
          console.log('[Pyodide stdout]', text);
          this.emit('stdout', text);
        } : undefined,
        stderr: this.config.enableStderr ? (text: string) => {
          console.error('[Pyodide stderr]', text);
          this.emit('stderr', text);
        } : undefined
      });

      console.log('[PyodideService] Pyodide loaded, installing packages...');

      // 加载必需的包
      if (this.config.packages.length > 0) {
        await this.pyodide.loadPackage(this.config.packages);
        console.log('[PyodideService] Packages loaded:', this.config.packages);
      }

      // 创建标准化的目录结构
      this.createStandardDirectories();

      // 设置为就绪状态
      this.status = PyodideStatus.READY;
      this.emit('statusChange', this.status);
      this.emit('ready');

      console.log('[PyodideService] Initialization complete');
    } catch (error) {
      console.error('[PyodideService] Initialization error:', error);
      throw new Error(`Failed to initialize Pyodide: ${error}`);
    }
  }

  /**
   * 创建标准化的虚拟文件系统目录
   */
  private createStandardDirectories(): void {
    if (!this.pyodide) {
      throw new Error('Pyodide not initialized');
    }

    try {
      // 创建 /data 目录
      if (!this.pyodide.FS.analyzePath('/data').exists) {
        this.pyodide.FS.mkdir('/data');
        console.log('[PyodideService] Created /data directory');
      }

      // 创建 /data/temp 目录
      if (!this.pyodide.FS.analyzePath('/data/temp').exists) {
        this.pyodide.FS.mkdir('/data/temp');
        console.log('[PyodideService] Created /data/temp directory');
      }

      // 创建 /output 目录
      if (!this.pyodide.FS.analyzePath('/output').exists) {
        this.pyodide.FS.mkdir('/output');
        console.log('[PyodideService] Created /output directory');
      }
    } catch (error) {
      console.error('[PyodideService] Failed to create directories:', error);
      throw error;
    }
  }

  /**
   * 挂载文件到虚拟文件系统
   *
   * @param fileName 文件名
   * @param data 文件数据（Uint8Array）
   * @param targetPath 目标路径（默认为 /data/fileName）
   */
  public mountFile(fileName: string, data: Uint8Array, targetPath?: string): void {
    if (!this.pyodide) {
      throw new Error('Pyodide not initialized');
    }

    const path = targetPath || `/data/${fileName}`;
    console.log(`[PyodideService] Mounting file: ${fileName} -> ${path} (${data.length} bytes)`);

    try {
      this.pyodide.FS.writeFile(path, data);
      console.log(`[PyodideService] ✅ File mounted successfully: ${path}`);
      this.emit('fileMounted', { fileName, path, size: data.length });
    } catch (error) {
      console.error(`[PyodideService] ❌ Failed to mount file: ${path}`, error);
      throw new Error(`Failed to mount file ${fileName}: ${error}`);
    }
  }

  /**
   * 从虚拟文件系统读取文件
   *
   * @param path 文件路径
   * @returns 文件数据（Uint8Array）
   */
  public readFile(path: string): Uint8Array {
    if (!this.pyodide) {
      throw new Error('Pyodide not initialized');
    }

    console.log(`[PyodideService] Reading file: ${path}`);

    try {
      const data = this.pyodide.FS.readFile(path);
      console.log(`[PyodideService] ✅ File read successfully: ${path} (${data.length} bytes)`);
      return data;
    } catch (error) {
      console.error(`[PyodideService] ❌ Failed to read file: ${path}`, error);
      throw new Error(`Failed to read file ${path}: ${error}`);
    }
  }

  /**
   * 删除虚拟文件系统中的文件
   *
   * @param path 文件路径
   */
  public unlinkFile(path: string): void {
    if (!this.pyodide) {
      throw new Error('Pyodide not initialized');
    }

    console.log(`[PyodideService] Unlinking file: ${path}`);

    try {
      this.pyodide.FS.unlink(path);
      console.log(`[PyodideService] ✅ File unlinked: ${path}`);
      this.emit('fileUnlinked', { path });
    } catch (error) {
      console.error(`[PyodideService] ❌ Failed to unlink file: ${path}`, error);
      throw new Error(`Failed to unlink file ${path}: ${error}`);
    }
  }

  /**
   * 执行 Python 代码
   *
   * @param code Python 代码
   * @param context 可选的上下文变量
   * @returns 执行结果
   */
  public async execute(code: string, context?: Record<string, any>): Promise<ExecutionResult> {
    if (!this.pyodide) {
      throw new Error('Pyodide not initialized');
    }

    console.log('[PyodideService] Executing Python code...');
    const startTime = Date.now();

    try {
      // 如果提供了上下文，设置全局变量
      if (context) {
        for (const [key, value] of Object.entries(context)) {
          this.pyodide.globals.set(key, value);
        }
      }

      // 执行代码
      const result = await this.pyodide.runPythonAsync(code);

      const executionTime = Date.now() - startTime;
      console.log(`[PyodideService] ✅ Execution successful (${executionTime}ms)`);

      return {
        success: true,
        output: result,
        executionTime,
        memoryUsage: this.getMemoryUsage()
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error('[PyodideService] ❌ Execution failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        executionTime,
        memoryUsage: this.getMemoryUsage()
      };
    }
  }

  /**
   * 获取文件系统状态
   */
  public getFileSystemStatus(): FileSystemStatus {
    if (!this.pyodide) {
      return {
        mountedFiles: [],
        totalSize: 0,
        path: '/data'
      };
    }

    try {
      const files: string[] = [];
      let totalSize = 0;

      // 递归扫描 /data 目录
      const scanDirectory = (path: string) => {
        const entries = this.pyodide.FS.readdir(path);

        for (const entry of entries) {
          if (entry === '.' || entry === '..') continue;

          const fullPath = `${path}/${entry}`.replace('//', '/');
          const stat = this.pyodide.FS.stat(fullPath);

          if (stat.isFolder) {
            scanDirectory(fullPath);
          } else {
            files.push(fullPath);
            totalSize += stat.size;
          }
        }
      };

      scanDirectory('/data');

      return {
        mountedFiles: files,
        totalSize,
        path: '/data'
      };
    } catch (error) {
      console.error('[PyodideService] Failed to get file system status:', error);
      return {
        mountedFiles: [],
        totalSize: 0,
        path: '/data'
      };
    }
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * 清理文件系统
   */
  public cleanup(): void {
    if (!this.pyodide) {
      return;
    }

    console.log('[PyodideService] Cleaning up file system...');

    try {
      // 删除 /data 目录下的所有文件
      const files = this.getFileSystemStatus().mountedFiles;

      for (const file of files) {
        try {
          this.pyodide.FS.unlink(file);
        } catch (error) {
          console.warn(`[PyodideService] Failed to unlink ${file}:`, error);
        }
      }

      console.log('[PyodideService] ✅ File system cleaned');
    } catch (error) {
      console.error('[PyodideService] ❌ Failed to cleanup file system:', error);
    }
  }

  /**
   * 获取当前状态
   */
  public getStatus(): PyodideStatus {
    return this.status;
  }

  /**
   * 检查是否就绪
   */
  public isReady(): boolean {
    return this.status === PyodideStatus.READY;
  }

  /**
   * 重置服务
   */
  public async reset(): Promise<void> {
    console.log('[PyodideService] Resetting service...');

    this.cleanup();

    // 重置状态
    this.status = PyodideStatus.UNINITIALIZED;
    this.initializationPromise = null;
    this.pyodide = null;

    // 重新初始化
    await this.initialize();
  }

  /**
   * 销毁服务
   */
  public destroy(): void {
    console.log('[PyodideService] Destroying service...');

    this.cleanup();
    this.removeAllListeners();

    this.status = PyodideStatus.UNINITIALIZED;
    this.initializationPromise = null;
    this.pyodide = null;

    PyodideService.instance = null;
  }
}

/**
 * 导出单例获取函数
 */
export const getPyodideService = (config?: Partial<PyodideConfig>): PyodideService => {
  return PyodideService.getInstance(config);
};

/**
 * 默认导出
 */
export default PyodideService;
