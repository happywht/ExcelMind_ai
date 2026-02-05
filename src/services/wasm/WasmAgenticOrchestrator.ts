/**
 * WASM 增强的 AgenticOrchestrator
 *
 * 基于现有 AgenticOrchestrator，添加 WASM 执行支持
 * 保持向后兼容，支持渐进式迁移
 *
 * @author Fullstack Developer
 * @version 1.0.0
 */

import { getWasmIntegration } from './WasmIntegrationLayer';
import { WasmExecutionMode } from '../../types/wasmTypes';
import { executeTransformation } from '../excelService';

/**
 * 执行接口（兼容层）
 */
interface ExecutionInterface {
  execute(
    code: string,
    datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } },
    timeout?: number
  ): Promise<{
    success: boolean;
    data?: { [fileName: string]: any[] | { [sheetName: string]: any[] } };
    error?: string;
  }>;
}

/**
 * Node.js 执行器（向后兼容）
 */
class NodeExecutionEngine implements ExecutionInterface {
  async execute(
    code: string,
    datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } },
    timeout?: number
  ): Promise<{
    success: boolean;
    data?: { [fileName: string]: any[] | { [sheetName: string]: any[] } };
    error?: string;
  }> {
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
}

/**
 * WASM 执行器
 */
class WasmExecutionEngine implements ExecutionInterface {
  private integration = getWasmIntegration();

  async execute(
    code: string,
    datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } },
    timeout?: number
  ): Promise<{
    success: boolean;
    data?: { [fileName: string]: any[] | { [sheetName: string]: any[] } };
    error?: string;
  }> {
    return this.integration.executeCode(code, datasets, timeout);
  }
}

/**
 * 混合执行器（自动选择最佳引擎）
 */
class HybridExecutionEngine implements ExecutionInterface {
  private wasmEngine = new WasmExecutionEngine();
  private nodeEngine = new NodeExecutionEngine();

  async execute(
    code: string,
    datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } },
    timeout?: number
  ): Promise<{
    success: boolean;
    data?: { [fileName: string]: any[] | { [sheetName: string]: any[] } };
    error?: string;
  }> {
    console.log('[HybridEngine] Selecting execution engine...');

    // 优先使用 WASM（如果可用且数据量适中）
    const dataSize = JSON.stringify(datasets).length;
    const useWasm = dataSize < 10 * 1024 * 1024; // 10MB 阈值

    if (useWasm) {
      console.log('[HybridEngine] Using WASM engine (data size:', dataSize, ')');
      try {
        return await this.wasmEngine.execute(code, datasets, timeout);
      } catch (error) {
        console.warn('[HybridEngine] WASM failed, falling back to Node.js:', error);
        return await this.nodeEngine.execute(code, datasets, timeout);
      }
    }

    console.log('[HybridEngine] Using Node.js engine (data size:', dataSize, ')');
    return await this.nodeEngine.execute(code, datasets, timeout);
  }
}

/**
 * 统一执行器管理器
 */
export class WasmAgenticOrchestrator {
  private static instance: WasmAgenticOrchestrator | null = null;
  private executionEngine: ExecutionInterface;
  private mode: WasmExecutionMode;

  private constructor(mode: WasmExecutionMode = WasmExecutionMode.HYBRID) {
    this.mode = mode;
    this.executionEngine = this.createExecutionEngine(mode);
    console.log('[WasmAgenticOrchestrator] Created with mode:', mode);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(mode?: WasmExecutionMode): WasmAgenticOrchestrator {
    if (!WasmAgenticOrchestrator.instance) {
      WasmAgenticOrchestrator.instance = new WasmAgenticOrchestrator(mode);
    }
    return WasmAgenticOrchestrator.instance;
  }

  /**
   * 创建执行引擎
   */
  private createExecutionEngine(mode: WasmExecutionMode): ExecutionInterface {
    switch (mode) {
      case WasmExecutionMode.PYODIDE:
        console.log('[WasmAgenticOrchestrator] Using WASM (Pyodide) engine');
        return new WasmExecutionEngine();

      case WasmExecutionMode.NODE_PYTHON:
        console.log('[WasmAgenticOrchestrator] Using Node.js Python engine');
        return new NodeExecutionEngine();

      case WasmExecutionMode.HYBRID:
      default:
        console.log('[WasmAgenticOrchestrator] Using hybrid execution engine');
        return new HybridExecutionEngine();
    }
  }

  /**
   * 初始化（异步）
   */
  public async initialize(): Promise<void> {
    console.log('[WasmAgenticOrchestrator] Initializing...');

    try {
      const integration = getWasmIntegration();
      await integration.initialize();
      console.log('[WasmAgenticOrchestrator] ✅ Initialized');
    } catch (error) {
      console.error('[WasmAgenticOrchestrator] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 执行代码（统一接口）
   *
   * 这个方法替代现有的 executeTransformation
   *
   * @param code Python 代码
   * @param datasets 数据集
   * @param timeout 超时时间
   * @returns 执行结果
   */
  public async execute(
    code: string,
    datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } },
    timeout: number = 30000
  ): Promise<{
    success: boolean;
    data?: { [fileName: string]: any[] | { [sheetName: string]: any[] } };
    error?: string;
    executionMode?: WasmExecutionMode;
  }> {
    console.log('[WasmAgenticOrchestrator] Executing code...');
    console.log('[WasmAgenticOrchestrator] Current mode:', this.mode);
    console.log('[WasmAgenticOrchestrator] Code length:', code.length);
    console.log('[WasmAgenticOrchestrator] Datasets:', Object.keys(datasets));

    const result = await this.executionEngine.execute(code, datasets, timeout);

    return {
      ...result,
      executionMode: this.mode
    };
  }

  /**
   * 获取当前执行模式
   */
  public getExecutionMode(): WasmExecutionMode {
    return this.mode;
  }

  /**
   * 切换执行模式
   */
  public switchMode(mode: WasmExecutionMode): void {
    console.log('[WasmAgenticOrchestrator] Switching mode:', this.mode, '->', mode);
    this.mode = mode;
    this.executionEngine = this.createExecutionEngine(mode);
  }

  /**
   * 获取性能指标
   */
  public getPerformanceMetrics() {
    const integration = getWasmIntegration();
    return integration.getPerformanceMetrics();
  }

  /**
   * 重置状态
   */
  public reset(): void {
    console.log('[WasmAgenticOrchestrator] Resetting...');
    const integration = getWasmIntegration();
    integration.cleanup();
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    console.log('[WasmAgenticOrchestrator] Destroying...');
    this.reset();
    WasmAgenticOrchestrator.instance = null;
  }
}

/**
 * 导出便捷函数
 */
export const getWasmOrchestrator = (mode?: WasmExecutionMode): WasmAgenticOrchestrator => {
  return WasmAgenticOrchestrator.getInstance(mode);
};

/**
 * 导出兼容的执行函数（可以直接替换现有的 executeTransformation）
 */
export const executeTransformationWasm = async (
  code: string,
  datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } },
  timeout: number = 30000
): Promise<{ [fileName: string]: any[] | { [sheetName: string]: any[] } }> => {
  const orchestrator = getWasmOrchestrator();
  const result = await orchestrator.execute(code, datasets, timeout);

  if (!result.success) {
    throw new Error(result.error || 'Execution failed');
  }

  return result.data || {};
};

/**
 * 默认导出
 */
export default WasmAgenticOrchestrator;
