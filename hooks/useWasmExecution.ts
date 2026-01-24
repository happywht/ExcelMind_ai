/**
 * WASM 执行 React Hook
 *
 * 提供便捷的 React 接口来使用 WASM 执行引擎
 *
 * @author Fullstack Developer
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PyodideStatus } from '../services/wasm/PyodideService';
import {
  initializeWasm,
  executePython,
  mountExcelFile,
  downloadResult,
  cleanup,
  MODULE_INFO
} from '../services/wasm';
import { WasmExecutionMode, PerformanceMetrics } from '../types/wasmTypes';

/**
 * 执行状态
 */
export interface ExecutionState {
  status: 'idle' | 'executing' | 'success' | 'error';
  loading: boolean;
  error: string | null;
  result: any;
  executionTime: number;
}

/**
 * Hook 配置
 */
export interface UseWasmExecutionConfig {
  autoInitialize?: boolean;
  enableWasm?: boolean;
  fallbackToNode?: boolean;
  onInitialized?: () => void;
  onError?: (error: Error) => void;
  onExecutionComplete?: (result: any) => void;
}

/**
 * Hook 返回值
 */
export interface UseWasmExecutionReturn {
  // 初始化状态
  initialized: boolean;
  initializing: boolean;
  pyodideStatus: PyodideStatus;
  moduleInfo: typeof MODULE_INFO;

  // 执行状态
  executionState: ExecutionState;

  // 方法
  initialize: () => Promise<void>;
  execute: (
    code: string,
    datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } }
  ) => Promise<any>;
  mountFile: (file: File) => Promise<string>;
  downloadOutput: (fileName?: string) => void;
  reset: () => void;

  // 性能指标
  performance: PerformanceMetrics;

  // 执行模式
  executionMode: WasmExecutionMode;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: UseWasmExecutionConfig = {
  autoInitialize: true,
  enableWasm: true,
  fallbackToNode: true
};

/**
 * WASM 执行 Hook
 */
export function useWasmExecution(config?: Partial<UseWasmExecutionConfig>): UseWasmExecutionReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // 初始化状态
  const [initialized, setInitialized] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [pyodideStatus, setPyodideStatus] = useState<PyodideStatus>(PyodideStatus.UNINITIALIZED);

  // 执行状态
  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle',
    loading: false,
    error: null,
    result: null,
    executionTime: 0
  });

  // 性能指标
  const [performance, setPerformance] = useState<PerformanceMetrics>({
    initializationTime: 0,
    averageExecutionTime: 0,
    totalExecutions: 0,
    successRate: 0,
    memoryUsage: { current: 0, peak: 0, average: 0 },
    fileSystemUsage: { totalFiles: 0, totalSize: 0, largestFile: 0 }
  });

  // 执行模式
  const [executionMode, setExecutionMode] = useState<WasmExecutionMode>(
    mergedConfig.enableWasm ? WasmExecutionMode.PYODIDE : WasmExecutionMode.NODE_PYTHON
  );

  // 使用 ref 来追踪配置和回调
  const configRef = useRef(mergedConfig);
  const onInitializedRef = useRef(mergedConfig.onInitialized);
  const onErrorRef = useRef(mergedConfig.onError);
  const onExecutionCompleteRef = useRef(mergedConfig.onExecutionComplete);

  // 更新 refs
  useEffect(() => {
    configRef.current = mergedConfig;
    onInitializedRef.current = mergedConfig.onInitialized;
    onErrorRef.current = mergedConfig.onError;
    onExecutionCompleteRef.current = mergedConfig.onExecutionComplete;
  }, [mergedConfig]);

  /**
   * 初始化 WASM 模块
   */
  const initialize = useCallback(async () => {
    if (initialized || initializing) {
      console.log('[useWasmExecution] Already initialized or initializing');
      return;
    }

    console.log('[useWasmExecution] Starting initialization...');
    setInitializing(true);
    setPyodideStatus(PyodideStatus.LOADING);

    const startTime = Date.now();

    try {
      await initializeWasm({
        pyodide: {
          packages: ['pandas', 'openpyxl', 'numpy']
        }
      });

      const initTime = Date.now() - startTime;
      console.log(`[useWasmExecution] ✅ Initialized in ${initTime}ms`);

      setInitialized(true);
      setInitializing(false);
      setPyodideStatus(PyodideStatus.READY);
      setExecutionMode(WasmExecutionMode.PYODIDE);

      setPerformance(prev => ({
        ...prev,
        initializationTime: initTime
      }));

      // 触发回调
      if (onInitializedRef.current) {
        onInitializedRef.current();
      }

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error('[useWasmExecution] ❌ Initialization failed:', errorObj);

      setInitializing(false);
      setPyodideStatus(PyodideStatus.ERROR);

      if (configRef.current.fallbackToNode) {
        console.warn('[useWasmExecution] Falling back to Node.js mode');
        setExecutionMode(WasmExecutionMode.NODE_PYTHON);
        setInitialized(true);
      } else {
        // 触发错误回调
        if (onErrorRef.current) {
          onErrorRef.current(errorObj);
        }
        throw errorObj;
      }
    }
  }, [initialized, initializing]);

  /**
   * 执行 Python 代码
   */
  const execute = useCallback(async (
    code: string,
    datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } }
  ) => {
    console.log('[useWasmExecution] Executing code...');
    console.log('[useWasmExecution] Datasets:', Object.keys(datasets));

    setExecutionState({
      status: 'executing',
      loading: true,
      error: null,
      result: null,
      executionTime: 0
    });

    const startTime = Date.now();

    try {
      const result = await executePython(code, datasets);

      const executionTime = Date.now() - startTime;
      console.log(`[useWasmExecution] ✅ Execution completed in ${executionTime}ms`);

      // 更新性能指标
      setPerformance(prev => {
        const newTotal = prev.totalExecutions + 1;
        const newAvgTime = (prev.averageExecutionTime * prev.totalExecutions + executionTime) / newTotal;
        const newSuccessRate = (prev.successRate * prev.totalExecutions + 1) / newTotal;

        return {
          ...prev,
          totalExecutions: newTotal,
          averageExecutionTime: newAvgTime,
          successRate: newSuccessRate
        };
      });

      setExecutionState({
        status: result.success ? 'success' : 'error',
        loading: false,
        error: result.success ? null : result.error || 'Unknown error',
        result: result.data,
        executionTime
      });

      // 触发完成回调
      if (onExecutionCompleteRef.current && result.success) {
        onExecutionCompleteRef.current(result.data);
      }

      return result.data;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      console.error('[useWasmExecution] ❌ Execution failed:', errorObj);

      setExecutionState({
        status: 'error',
        loading: false,
        error: errorObj.message,
        result: null,
        executionTime
      });

      // 更新性能指标（失败）
      setPerformance(prev => {
        const newTotal = prev.totalExecutions + 1;
        const newAvgTime = (prev.averageExecutionTime * prev.totalExecutions + executionTime) / newTotal;
        const newSuccessRate = (prev.successRate * prev.totalExecutions) / newTotal;

        return {
          ...prev,
          totalExecutions: newTotal,
          averageExecutionTime: newAvgTime,
          successRate: newSuccessRate
        };
      });

      // 触发错误回调
      if (onErrorRef.current) {
        onErrorRef.current(errorObj);
      }

      throw errorObj;
    }
  }, []);

  /**
   * 挂载 Excel 文件
   */
  const mountFile = useCallback(async (file: File) => {
    console.log('[useWasmExecution] Mounting file:', file.name);

    try {
      const path = await mountExcelFile(file);
      console.log('[useWasmExecution] ✅ File mounted:', path);
      return path;
    } catch (error) {
      console.error('[useWasmExecution] ❌ Failed to mount file:', error);
      throw error;
    }
  }, []);

  /**
   * 下载输出文件
   */
  const downloadOutput = useCallback((fileName?: string) => {
    console.log('[useWasmExecution] Downloading output...');
    try {
      downloadResult(fileName);
      console.log('[useWasmExecution] ✅ Download initiated');
    } catch (error) {
      console.error('[useWasmExecution] ❌ Download failed:', error);
    }
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    console.log('[useWasmExecution] Resetting state...');

    setExecutionState({
      status: 'idle',
      loading: false,
      error: null,
      result: null,
      executionTime: 0
    });

    cleanup();
  }, []);

  // 自动初始化
  useEffect(() => {
    if (mergedConfig.autoInitialize && !initialized && !initializing) {
      initialize();
    }
  }, [mergedConfig.autoInitialize, initialized, initializing, initialize]);

  return {
    // 初始化状态
    initialized,
    initializing,
    pyodideStatus,
    moduleInfo: MODULE_INFO,

    // 执行状态
    executionState,

    // 方法
    initialize,
    execute,
    mountFile,
    downloadOutput,
    reset,

    // 性能指标
    performance,

    // 执行模式
    executionMode
  };
}

/**
 * 默认导出
 */
export default useWasmExecution;
