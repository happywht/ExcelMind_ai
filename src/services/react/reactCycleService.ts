/**
 * Re-Act (Reasoning + Acting) 循环服务
 *
 * 实现自我修复的智能代码生成和执行循环
 * 基于：Think -> Act -> Observe -> Refine
 *
 * @author Backend Developer
 * @version 1.0.0
 */

import { generateDataProcessingCode } from '../zhipuService';
import { executeTransformation } from '../excelService';
import { ExcelData } from '../../types';

/**
 * Re-Act 状态
 */
export type ReactPhase = 'Think' | 'Act' | 'Observe' | 'Refine' | 'Complete' | 'Failed';

/**
 * Re-Act 循环配置
 */
export interface ReactCycleConfig {
  maxRetries: number;
  timeoutPerStep: number;
  enableVerboseLogging: boolean;
}

/**
 * Re-Act 状态机
 */
export interface ReactState {
  phase: ReactPhase;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  lastCode?: string;
  lastResult?: any;
  metadata?: {
    startTime: number;
    duration: number;
    attempts: number;
  };
}

/**
 * Re-Act 执行结果
 */
export interface ReactResult {
  success: boolean;
  code?: string;
  result?: any;
  finalState: ReactState;
  attempts: number;
  totalTime: number;
  error?: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ReactCycleConfig = {
  maxRetries: 3,
  timeoutPerStep: 30000,
  enableVerboseLogging: true
};

/**
 * Re-Act 循环实现
 *
 * @param userQuery 用户查询
 * @param excelData Excel 数据
 * @param config 配置
 * @returns 执行结果
 */
export async function reactCycle(
  userQuery: string,
  excelData: ExcelData[],
  config?: Partial<ReactCycleConfig>
): Promise<ReactResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  // 初始化状态
  let state: ReactState = {
    phase: 'Think',
    retryCount: 0,
    maxRetries: finalConfig.maxRetries,
    metadata: {
      startTime,
      duration: 0,
      attempts: 0
    }
  };

  let currentCode: string | undefined;
  let currentResult: any;

  // 日志辅助函数
  const log = (message: string, data?: any) => {
    if (finalConfig.enableVerboseLogging) {
      console.log(`[ReAct Cycle] ${message}`, data || '');
    }
  };

  log('🚀 Starting Re-Act Cycle', {
    query: userQuery,
    fileCount: excelData.length,
    maxRetries: finalConfig.maxRetries
  });

  // 主循环
  while (state.retryCount < state.maxRetries) {
    log(`\n=== Cycle ${state.retryCount + 1}/${state.maxRetries} ===`);
    log(`Phase: ${state.phase}`);

    switch (state.phase) {
      case 'Think':
        // 思考阶段：分析需求并生成代码
        log('[Think] 分析需求并生成代码...');

        try {
          // 准备文件预览
          const filesPreview = prepareFilesPreview(excelData);

          // 生成代码
          const codeResult = await generateCodeWithSchema(
            userQuery,
            filesPreview,
            state.lastError
          );

          currentCode = codeResult.code;
          state.lastCode = currentCode;

          log('[Think] 代码生成成功', {
            codeLength: currentCode?.length,
            hasError: !!state.lastError
          });

          state.phase = 'Act';

        } catch (error) {
          log('[Think] 代码生成失败', error);
          state.lastError = error instanceof Error ? error.message : String(error);
          state.phase = 'Refine';
        }
        break;

      case 'Act':
        // 执行阶段：运行生成的代码
        log('[Act] 执行生成的代码...');

        try {
          if (!currentCode) {
            throw new Error('No code to execute');
          }

          // 准备数据集
          const datasets = prepareDatasets(excelData);

          // 执行代码
          currentResult = await executeTransformation(
            currentCode,
            datasets,
            finalConfig.timeoutPerStep
          );

          state.lastResult = currentResult;

          log('[Act] 代码执行成功', {
            outputFiles: Object.keys(currentResult || {})
          });

          state.phase = 'Observe';

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          log('[Act] 代码执行失败', { error: errorMessage });
          state.lastError = errorMessage;
          state.phase = 'Refine';
        }
        break;

      case 'Observe':
        // 观察阶段：验证执行结果
        log('[Observe] 验证执行结果...');

        try {
          const validation = validateResult(currentResult, excelData);

          if (validation.valid) {
            log('[Observe] ✅ 结果验证通过', validation);
            state.phase = 'Complete';
          } else {
            log('[Observe] ❌ 结果验证失败', validation.issues);
            state.lastError = validation.issues.join('; ');
            state.phase = 'Refine';
          }

        } catch (error) {
          log('[Observe] 验证过程出错', error);
          state.lastError = error instanceof Error ? error.message : String(error);
          state.phase = 'Refine';
        }
        break;

      case 'Refine':
        // 修复阶段：分析错误并决定下一步
        state.retryCount++;

        if (state.retryCount < state.maxRetries) {
          log(`[Refine] 第 ${state.retryCount} 次修复尝试...`);
          log(`[Refine] 错误信息: ${state.lastError}`);
          state.phase = 'Think';
        } else {
          log('[Refine] ❌ 达到最大重试次数，执行失败');
          state.phase = 'Failed';
        }
        break;

      case 'Complete':
        // 完成：返回成功结果
        const duration = Date.now() - startTime;
        log(`[ReAct Cycle] ✅ 成功完成`, {
          attempts: state.retryCount + 1,
          duration: `${duration}ms`
        });

        return {
          success: true,
          code: state.lastCode,
          result: state.lastResult,
          finalState: state,
          attempts: state.retryCount + 1,
          totalTime: duration
        };

      case 'Failed':
        // 失败：返回错误结果
        const failDuration = Date.now() - startTime;
        log(`[ReAct Cycle] ❌ 执行失败`, {
          attempts: state.retryCount,
          duration: `${failDuration}ms`,
          lastError: state.lastError
        });

        return {
          success: false,
          result: state.lastResult,
          finalState: state,
          attempts: state.retryCount,
          totalTime: failDuration,
          error: state.lastError
        };
    }

    // 更新元数据
    if (state.metadata) {
      state.metadata.duration = Date.now() - startTime;
      state.metadata.attempts = state.retryCount + 1;
    }
  }

  // 超出最大重试次数
  const timeoutDuration = Date.now() - startTime;
  return {
    success: false,
    result: state.lastResult,
    finalState: state,
    attempts: state.retryCount,
    totalTime: timeoutDuration,
    error: 'Max retries exceeded'
  };
}

/**
 * 生成代码（带 Schema 注入）
 */
async function generateCodeWithSchema(
  userQuery: string,
  filesPreview: any[],
  lastError?: string
): Promise<{ code: string; explanation: string }> {
  // 如果有错误，使用优化的 refine prompt
  if (lastError) {
    return await generateRefinedCode(userQuery, filesPreview, lastError);
  }

  // 首次生成
  return await generateDataProcessingCode(userQuery, filesPreview);
}

/**
 * 生成修复后的代码
 */
async function generateRefinedCode(
  userQuery: string,
  filesPreview: any[],
  error: string
): Promise<{ code: string; explanation: string }> {
  // 构建优化的错误反馈 prompt
  const refinePrompt = buildRefinePrompt(userQuery, filesPreview, error);

  // 调用 AI 生成修复代码
  // 这里可以创建一个新的 AI 调用，专门用于错误修复
  // 为简化，我们使用现有的 generateDataProcessingCode，但修改 prompt

  const enhancedFilesPreview = filesPreview.map(fp => ({
    ...fp,
    errorContext: error
  }));

  return await generateDataProcessingCode(refinePrompt, enhancedFilesPreview);
}

/**
 * 构建错误反馈 Prompt
 */
function buildRefinePrompt(
  originalQuery: string,
  filesPreview: any[],
  error: string
): string {
  return `之前生成的代码执行出错了。

**原始需求**：${originalQuery}

**错误信息**：
\`\`\`
${error}
\`\`\`

**数据结构**：
${JSON.stringify(filesPreview, null, 2)}

请分析错误原因并修复代码。

**修复原则**：
1. 仔细阅读错误信息，找出根本原因
2. 检查列名是否正确（基于上面的数据结构）
3. 简化逻辑，避免复杂操作
4. 确保处理了空值和类型转换
5. 只需要返回修复后的完整代码，不需要解释

**输出格式**：
{"explanation": "简要说明修复了什么问题", "code": "修复后的完整Python代码"}
`;
}

/**
 * 准备文件预览
 */
function prepareFilesPreview(excelData: ExcelData[]): any[] {
  return excelData.map(file => ({
    fileName: file.fileName,
    currentSheetName: file.currentSheetName,
    sheets: Object.entries(file.sheets || {}).reduce((acc, [sheetName, data]) => {
      if (Array.isArray(data) && data.length > 0) {
        acc[sheetName] = {
          headers: Object.keys(data[0] || {}),
          sampleRows: data.slice(0, 5),
          rowCount: data.length
        };
      }
      return acc;
    }, {} as any),
    metadata: file.metadata
  }));
}

/**
 * 准备数据集
 */
function prepareDatasets(excelData: ExcelData[]): { [fileName: string]: any[] | any } {
  const datasets: { [fileName: string]: any[] | any } = {};

  excelData.forEach(file => {
    if (file.sheets) {
      const sheetNames = Object.keys(file.sheets);

      if (sheetNames.length === 1) {
        // 单 sheet：直接传递数组
        datasets[file.fileName] = file.sheets[sheetNames[0]];
      } else {
        // 多 sheet：传递嵌套对象
        datasets[file.fileName] = file.sheets;
      }
    }
  });

  return datasets;
}

/**
 * 验证结果
 */
function validateResult(
  result: any,
  originalData: ExcelData[]
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // 基本检查
  if (!result) {
    issues.push('执行结果为空');
    return { valid: false, issues };
  }

  if (typeof result !== 'object') {
    issues.push('执行结果格式错误');
    return { valid: false, issues };
  }

  // 检查输出文件
  const outputFiles = Object.keys(result);
  if (outputFiles.length === 0) {
    issues.push('没有生成任何输出文件');
  }

  // 检查输出数据质量
  outputFiles.forEach(fileName => {
    const data = result[fileName];

    // 多 sheet 检查
    if (typeof data === 'object' && !Array.isArray(data)) {
      const sheetNames = Object.keys(data);
      sheetNames.forEach(sheetName => {
        const sheetData = data[sheetName];
        if (Array.isArray(sheetData)) {
          if (sheetData.length === 0) {
            issues.push(`文件 ${fileName} 的 sheet ${sheetName} 为空`);
          }
        }
      });
    }
    // 单 sheet 检查
    else if (Array.isArray(data)) {
      if (data.length === 0) {
        issues.push(`文件 ${fileName} 为空`);
      }
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * 导出单例工厂
 */
export const createReactCycleService = (config?: Partial<ReactCycleConfig>) => {
  return {
    execute: (query: string, data: ExcelData[]) => reactCycle(query, data, config)
  };
};
