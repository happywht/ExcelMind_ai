/**
 * 统一执行引擎 - 从 Node.js 迁移到 Pyodide
 *
 * 核心职责：
 * 1. 提供统一的代码执行接口
 * 2. 兼容现有的 AgenticOrchestrator
 * 3. 支持代码执行的安全检查
 * 4. 提供执行结果和错误处理
 *
 * @author Fullstack Developer
 * @version 1.0.0
 */

import { getPyodideService, ExecutionResult as PyodideResult } from './PyodideService';
import { getFileSystemService, STANDARD_PATHS } from './FileSystemService';

/**
 * 执行配置
 */
export interface ExecutionConfig {
  timeout?: number;
  enableSecurityCheck?: boolean;
  maxMemoryMB?: number;
  outputFormat?: 'json' | 'auto';
}

/**
 * 代码执行上下文
 */
export interface ExecutionContext {
  datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } };
  variables?: Record<string, any>;
  inputPath?: string;
  outputPath?: string;
}

/**
 * 执行结果（兼容现有格式）
 */
export interface ExecutionResult {
  success: boolean;
  data?: { [fileName: string]: any[] | { [sheetName: string]: any[] } };
  error?: string;
  executionTime: number;
  output?: string;
  logs?: string[];
}

/**
 * 安全检查结果
 */
export interface SecurityCheckResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
}

/**
 * 执行引擎类
 */
export class ExecutionEngine {
  private static instance: ExecutionEngine | null = null;
  private pyodideService = getPyodideService();
  private fileSystemService = getFileSystemService();

  private readonly DEFAULT_CONFIG: Required<ExecutionConfig> = {
    timeout: 30000,
    enableSecurityCheck: true,
    maxMemoryMB: 500,
    outputFormat: 'json'
  };

  private constructor() {
    console.log('[ExecutionEngine] Engine created');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ExecutionEngine {
    if (!ExecutionEngine.instance) {
      ExecutionEngine.instance = new ExecutionEngine();
    }
    return ExecutionEngine.instance;
  }

  /**
   * 执行 Python 代码（兼容现有接口）
   *
   * 这是核心的执行方法，兼容现有的 executeTransformation 接口
   *
   * @param code Python 代码
   * @param datasets 数据集映射
   * @param config 执行配置
   * @returns 执行结果
   */
  public async execute(
    code: string,
    datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } },
    config: ExecutionConfig = {}
  ): Promise<ExecutionResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    console.log('[ExecutionEngine] Starting execution...');
    console.log('[ExecutionEngine] Datasets:', Object.keys(datasets));
    console.log('[ExecutionEngine] Code length:', code.length);

    const startTime = Date.now();

    try {
      // Step 1: 安全检查
      if (finalConfig.enableSecurityCheck) {
        console.log('[ExecutionEngine] Performing security check...');
        const securityResult = this.performSecurityCheck(code);

        if (!securityResult.passed) {
          console.error('[ExecutionEngine] ❌ Security check failed:', securityResult.issues);
          return {
            success: false,
            error: `Security check failed: ${securityResult.issues.join('; ')}`,
            executionTime: Date.now() - startTime,
            logs: securityResult.issues
          };
        }

        if (securityResult.warnings.length > 0) {
          console.warn('[ExecutionEngine] Security warnings:', securityResult.warnings);
        }
      }

      // Step 2: 准备执行上下文
      console.log('[ExecutionEngine] Preparing execution context...');
      const context = await this.prepareContext(datasets);

      // Step 3: 包装代码以捕获输出
      const wrappedCode = this.wrapCodeForExecution(code, finalConfig.outputFormat);

      // Step 4: 执行代码
      console.log('[ExecutionEngine] Executing code in Pyodide...');
      const pyodideResult = await this.pyodideService.execute(wrappedCode, context);

      if (!pyodideResult.success) {
        console.error('[ExecutionEngine] ❌ Execution failed:', pyodideResult.error);
        return {
          success: false,
          error: pyodideResult.error,
          executionTime: pyodideResult.executionTime
        };
      }

      // Step 5: 解析输出
      console.log('[ExecutionEngine] Parsing execution output...');
      const parsedOutput = this.parseOutput(pyodideResult.output, finalConfig.outputFormat);

      const executionTime = Date.now() - startTime;
      console.log(`[ExecutionEngine] ✅ Execution successful (${executionTime}ms)`);

      return {
        success: true,
        data: parsedOutput,
        executionTime,
        output: typeof pyodideResult.output === 'string' ? pyodideResult.output : undefined
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error('[ExecutionEngine] ❌ Execution exception:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  /**
   * 准备执行上下文
   *
   * 将 datasets 转换为 Python 可用的上下文变量
   */
  private async prepareContext(
    datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } }
  ): Promise<Record<string, any>> {
    const context: Record<string, any> = {
      // 添加标准路径常量
      INPUT_PATH: STANDARD_PATHS.INPUT,
      OUTPUT_PATH: STANDARD_PATHS.OUTPUT,
      TEMP_DIR: STANDARD_PATHS.TEMP_DIR
    };

    // 准备数据文件（如果需要，可以挂载到文件系统）
    // 当前实现：直接传递 JSON 数据到 Python 环境
    context.files = JSON.stringify(datasets);

    return context;
  }

  /**
   * 包装代码以捕获输出
   *
   * 添加必要的导入和输出捕获逻辑
   */
  private wrapCodeForExecution(code: string, outputFormat: 'json' | 'auto'): string {
    let wrapped = '';

    // 添加标准导入
    wrapped += `
import json
import pandas as pd
import numpy as np
from io import StringIO
import sys
from contextlib import redirect_stdout, redirect_stderr

# 解析输入数据
try:
    files = json.loads(files)
except:
    files = {}
`;

    // 添加输出捕获
    wrapped += `
# 捕获标准输出
stdout_capture = StringIO()
stderr_capture = StringIO()

try:
    with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
        # ============ 用户代码开始 ============
${code}
        # ============ 用户代码结束 ============

except Exception as e:
    # 捕获执行错误
    error_result = {
        "success": False,
        "error": str(e),
        "error_type": type(e).__name__
    }
    print(json.dumps(error_result, ensure_ascii=False))
    sys.exit(1)

# 获取捕获的输出
stdout_output = stdout_capture.getvalue()
stderr_output = stderr_capture.getvalue()

# 构建结果
result = {
    "success": True,
    "files": files,
    "stdout": stdout_output,
    "stderr": stderr_output
}

# 输出结果
print(json.dumps(result, ensure_ascii=False, default=str))
`;

    return wrapped;
  }

  /**
   * 解析执行输出
   *
   * 从 Python 输出中提取数据
   */
  private parseOutput(
    output: any,
    format: 'json' | 'auto'
  ): { [fileName: string]: any[] | { [sheetName: string]: any[] } } {
    try {
      if (typeof output === 'string') {
        // 尝试解析 JSON 输出
        const parsed = JSON.parse(output);

        if (parsed.success === false) {
          throw new Error(parsed.error || 'Execution failed');
        }

        // 返回 files 数据
        return parsed.files || {};
      }

      // 如果是对象，直接返回
      if (typeof output === 'object' && output.files) {
        return output.files;
      }

      return {};
    } catch (error) {
      console.error('[ExecutionEngine] Failed to parse output:', error);
      throw new Error(`Failed to parse execution output: ${error}`);
    }
  }

  /**
   * 执行安全检查
   *
   * 检查代码中的危险操作
   */
  private performSecurityCheck(code: string): SecurityCheckResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    // 黑名单：禁止的导入
    const bannedImports = [
      'os',
      'subprocess',
      'sys',
      'socket',
      'requests',
      'urllib',
      'http',
      'ftplib',
      'telnetlib'
    ];

    // 黑名单：禁止的函数
    const bannedFunctions = [
      'eval',
      'exec',
      'compile',
      '__import__',
      'open',
      'file'
    ];

    // 检查导入
    const importPattern = /(?:import|from)\s+(\w+)/g;
    let match;
    while ((match = importPattern.exec(code)) !== null) {
      const moduleName = match[1];

      if (bannedImports.includes(moduleName)) {
        issues.push(`Banned module import detected: ${moduleName}`);
      }
    }

    // 检查函数调用
    for (const func of bannedFunctions) {
      const pattern = new RegExp(`\\b${func}\\s*\\(`);
      if (pattern.test(code)) {
        issues.push(`Banned function call detected: ${func}`);
      }
    }

    // 检查文件操作（除了标准路径）
    const filePattern = /open\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = filePattern.exec(code)) !== null) {
      const filePath = match[1];

      // 只允许标准路径
      const allowedPaths = Object.values(STANDARD_PATHS);
      const isAllowed = allowedPaths.some(path => filePath.startsWith(path));

      if (!isAllowed) {
        warnings.push(`File operation outside standard paths: ${filePath}`);
      }
    }

    // 检查网络操作
    const networkPatterns = [
      /urllib\./,
      /requests\./,
      /socket\./,
      /http\./
    ];

    for (const pattern of networkPatterns) {
      if (pattern.test(code)) {
        issues.push('Network operations are not allowed');
        break;
      }
    }

    return {
      passed: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * 获取执行统计信息
   */
  public getStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  } {
    // TODO: 实现统计功能
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0
    };
  }

  /**
   * 重置引擎状态
   */
  public reset(): void {
    console.log('[ExecutionEngine] Resetting engine...');
    this.fileSystemService.cleanupTemp();
  }
}

/**
 * 导出单例获取函数
 */
export const getExecutionEngine = (): ExecutionEngine => {
  return ExecutionEngine.getInstance();
};

/**
 * 默认导出
 */
export default ExecutionEngine;
