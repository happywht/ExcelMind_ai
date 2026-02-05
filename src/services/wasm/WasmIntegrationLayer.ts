/**
 * WASM 集成层 - 连接现有系统与新的 WASM 执行引擎
 *
 * 核心职责：
 * 1. 提供向后兼容的接口
 * 2. 无缝集成到现有 AgenticOrchestrator
 * 3. 支持渐进式迁移
 * 4. 提供降级和回退机制
 *
 * @author Fullstack Developer
 * @version 1.0.0
 */

import { getExecutionEngine } from './ExecutionEngine';
import { getFileSystemService } from './FileSystemService';
import { getPyodideService } from './PyodideService';
import { WasmExecutionMode, WasmConfig, PerformanceMetrics } from '../../types/wasmTypes';

/**
 * 集成配置
 */
interface IntegrationConfig {
  enableWasm: boolean;
  fallbackToNode: boolean;
  autoInitialize: boolean;
  performanceMonitoring: boolean;
}

/**
 * 集成层类
 */
export class WasmIntegrationLayer {
  private static instance: WasmIntegrationLayer | null = null;
  private config: IntegrationConfig;
  private initialized = false;
  private performanceMetrics: PerformanceMetrics;

  private readonly DEFAULT_CONFIG: IntegrationConfig = {
    enableWasm: true,
    fallbackToNode: true,
    autoInitialize: true,
    performanceMonitoring: true
  };

  private constructor(config?: Partial<IntegrationConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.performanceMetrics = this.createEmptyMetrics();
    console.log('[WasmIntegrationLayer] Layer created with config:', this.config);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: Partial<IntegrationConfig>): WasmIntegrationLayer {
    if (!WasmIntegrationLayer.instance) {
      WasmIntegrationLayer.instance = new WasmIntegrationLayer(config);
    }
    return WasmIntegrationLayer.instance;
  }

  /**
   * 初始化集成层
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[WasmIntegrationLayer] Already initialized');
      return;
    }

    console.log('[WasmIntegrationLayer] Initializing...');

    try {
      if (this.config.enableWasm) {
        // 初始化 Pyodide
        console.log('[WasmIntegrationLayer] Initializing Pyodide...');
        await getPyodideService().initialize();
        console.log('[WasmIntegrationLayer] ✅ Pyodide initialized');
      }

      this.initialized = true;
      console.log('[WasmIntegrationLayer] ✅ Integration layer ready');
    } catch (error) {
      console.error('[WasmIntegrationLayer] ❌ Initialization failed:', error);

      if (this.config.fallbackToNode) {
        console.warn('[WasmIntegrationLayer] Falling back to Node.js execution');
      } else {
        throw error;
      }
    }
  }

  /**
   * 执行代码（兼容现有接口）
   *
   * 这是与 AgenticOrchestrator 的集成点
   *
   * @param code Python 代码
   * @param datasets 数据集
   * @param timeout 超时时间
   * @returns 执行结果
   */
  public async executeCode(
    code: string,
    datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } },
    timeout?: number
  ): Promise<{
    success: boolean;
    data?: { [fileName: string]: any[] | { [sheetName: string]: any[] } };
    error?: string;
  }> {
    const startTime = Date.now();

    console.log('[WasmIntegrationLayer] Executing code...');
    console.log('[WasmIntegrationLayer] WASM enabled:', this.config.enableWasm);
    console.log('[WasmIntegrationLayer] Fallback enabled:', this.config.fallbackToNode);

    try {
      // 如果启用了 WASM 且已初始化
      if (this.config.enableWasm && this.initialized) {
        console.log('[WasmIntegrationLayer] Using WASM execution engine');

        const result = await getExecutionEngine().execute(code, datasets, {
          timeout: timeout || 30000,
          enableSecurityCheck: true,
          maxMemoryMB: 500,
          outputFormat: 'json'
        });

        // 更新性能指标
        if (this.config.performanceMonitoring) {
          this.updateMetrics(result.success, Date.now() - startTime);
        }

        return result;
      }

      // 降级到 Node.js 执行
      if (this.config.fallbackToNode) {
        console.log('[WasmIntegrationLayer] Falling back to Node.js execution');
        return this.executeWithNode(code, datasets, timeout);
      }

      throw new Error('No execution engine available');

    } catch (error) {
      console.error('[WasmIntegrationLayer] Execution failed:', error);

      // 如果 WASM 失败且允许降级
      if (this.config.fallbackToNode && this.config.enableWasm) {
        console.warn('[WasmIntegrationLayer] WASM failed, trying Node.js...');
        try {
          return await this.executeWithNode(code, datasets, timeout);
        } catch (nodeError) {
          console.error('[WasmIntegrationLayer] Node.js execution also failed:', nodeError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 使用 Node.js 执行（向后兼容）
   *
   * 这个方法调用现有的 executeTransformation
   */
  private async executeWithNode(
    code: string,
    datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } },
    timeout?: number
  ): Promise<{
    success: boolean;
    data?: { [fileName: string]: any[] | { [sheetName: string]: any[] } };
    error?: string;
  }> {
    // 动态导入 excelService 以避免循环依赖
    const { executeTransformation } = await import('../excelService');

    try {
      const result = await executeTransformation(code, datasets, timeout || 30000);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 挂载文件（兼容接口）
   *
   * @param file 文件对象
   * @returns 挂载路径
   */
  public async mountFile(file: File): Promise<string> {
    console.log('[WasmIntegrationLayer] Mounting file:', file.name);

    if (this.config.enableWasm && this.initialized) {
      try {
        const fs = getFileSystemService();
        const path = await fs.ferryFile(file);
        console.log('[WasmIntegrationLayer] ✅ File mounted to:', path);
        return path;
      } catch (error) {
        console.error('[WasmIntegrationLayer] Failed to mount file:', error);
        throw error;
      }
    }

    // 如果 WASM 不可用，返回标准路径（由 Node.js 处理）
    console.log('[WasmIntegrationLayer] Using standard path for Node.js');
    return '/data/input.xlsx';
  }

  /**
   * 下载结果
   *
   * @param fileName 文件名
   */
  public downloadResult(fileName?: string): void {
    console.log('[WasmIntegrationLayer] Downloading result...');

    if (this.config.enableWasm && this.initialized) {
      const fs = getFileSystemService();
      fs.downloadFile('/data/output.xlsx', fileName);
    } else {
      console.warn('[WasmIntegrationLayer] WASM not available, download not implemented');
    }
  }

  /**
   * 获取执行模式
   */
  public getExecutionMode(): WasmExecutionMode {
    if (this.config.enableWasm && this.initialized) {
      return WasmExecutionMode.PYODIDE;
    }
    return WasmExecutionMode.NODE_PYTHON;
  }

  /**
   * 获取性能指标
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * 重置性能指标
   */
  public resetMetrics(): void {
    this.performanceMetrics = this.createEmptyMetrics();
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    console.log('[WasmIntegrationLayer] Cleaning up...');

    try {
      if (this.config.enableWasm && this.initialized) {
        getExecutionEngine().reset();
      }
    } catch (error) {
      console.error('[WasmIntegrationLayer] Cleanup failed:', error);
    }
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(success: boolean, executionTime: number): void {
    this.performanceMetrics.totalExecutions++;

    if (success) {
      this.performanceMetrics.successRate =
        (this.performanceMetrics.successRate * (this.performanceMetrics.totalExecutions - 1) + 1) /
        this.performanceMetrics.totalExecutions;
    }

    this.performanceMetrics.averageExecutionTime =
      (this.performanceMetrics.averageExecutionTime * (this.performanceMetrics.totalExecutions - 1) +
        executionTime) / this.performanceMetrics.totalExecutions;

    // 更新内存使用情况
    const pyodideService = getPyodideService();
    const fileSystemStatus = pyodideService.getFileSystemStatus();

    this.performanceMetrics.memoryUsage.current = fileSystemStatus.totalSize;
    this.performanceMetrics.memoryUsage.peak = Math.max(
      this.performanceMetrics.memoryUsage.peak,
      fileSystemStatus.totalSize
    );

    this.performanceMetrics.fileSystemUsage.totalFiles = fileSystemStatus.mountedFiles.length;
    this.performanceMetrics.fileSystemUsage.totalSize = fileSystemStatus.totalSize;
  }

  /**
   * 创建空的性能指标
   */
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      initializationTime: 0,
      averageExecutionTime: 0,
      totalExecutions: 0,
      successRate: 0,
      memoryUsage: {
        current: 0,
        peak: 0,
        average: 0
      },
      fileSystemUsage: {
        totalFiles: 0,
        totalSize: 0,
        largestFile: 0
      }
    };
  }

  /**
   * 检查是否就绪
   */
  public isReady(): boolean {
    return this.initialized;
  }

  /**
   * 获取配置
   */
  public getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[WasmIntegrationLayer] Config updated:', this.config);
  }
}

/**
 * 导出单例获取函数
 */
export const getWasmIntegration = (config?: Partial<IntegrationConfig>): WasmIntegrationLayer => {
  return WasmIntegrationLayer.getInstance(config);
};

/**
 * 默认导出
 */
export default WasmIntegrationLayer;
