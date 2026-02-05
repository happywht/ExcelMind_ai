/**
 * 韧性代码生成服务
 *
 * 提供带降级策略的代码生成功能，确保在 AI 服务失败时仍能提供基本功能
 */

import { generateDataProcessingCode } from '../zhipuService';
import { AIProcessResult } from '../../types';
import { DataValidator } from './dataValidationUtils';
import { EnhancedLogger, PerformanceMeasure } from './enhancedLogger';

/**
 * 降级策略接口
 */
interface FallbackStrategy {
  name: string;
  priority: number;
  condition: (error: Error, context: any) => boolean;
  action: (userInput: string, filesPreview: any[], context: any) => Promise<AIProcessResult>;
  description: string;
}

/**
 * 代码生成上下文
 */
interface CodeGenerationContext {
  attemptNumber: number;
  lastError?: Error;
  validationResult?: any;
  metadata?: Record<string, any>;
}

/**
 * 韧性代码生成器配置
 */
interface ResilientGeneratorConfig {
  maxAttempts: number;
  enableDataValidation: boolean;
  enableFallback: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  fallbackStrategies: FallbackStrategy[];
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ResilientGeneratorConfig = {
  maxAttempts: 3,
  enableDataValidation: true,
  enableFallback: true,
  logLevel: 'info',
  fallbackStrategies: [
    {
      name: 'sanitize_and_retry',
      priority: 1,
      condition: (error, context) => {
        const errorMsg = error.message.toLowerCase();
        return (
          errorMsg.includes('header') ||
          errorMsg.includes('undefined') ||
          errorMsg.includes('cannot read')
        );
      },
      action: async (userInput, filesPreview, context) => {
        EnhancedLogger.logInfo('尝试降级策略: 数据清理和重试');

        // 清理数据
        const sanitizedPreview = DataValidator.sanitizeFilesPreview(filesPreview);

        // 验证清理后的数据
        const validation = DataValidator.validateFilesPreview(sanitizedPreview, 'zhipu');
        EnhancedLogger.logInfo('数据验证结果', {
          isValid: validation.isValid,
          errorCount: validation.errors.length,
          warningCount: validation.warnings.length
        });

        return generateDataProcessingCode(userInput, sanitizedPreview);
      },
      description: '清理数据结构并重试'
    },
    {
      name: 'simple_template',
      priority: 2,
      condition: (error, context) => {
        const errorMsg = error.message.toLowerCase();
        return (
          errorMsg.includes('timeout') ||
          errorMsg.includes('network') ||
          errorMsg.includes('ai')
        );
      },
      action: async (userInput, filesPreview, context) => {
        EnhancedLogger.logInfo('尝试降级策略: 使用简单模板');

        // 生成简单模板
        return generateSimpleTemplate(userInput, filesPreview);
      },
      description: '使用简单代码模板'
    },
    {
      name: 'default_template',
      priority: 3,
      condition: () => true, // 总是可用
      action: async (userInput, filesPreview, context) => {
        EnhancedLogger.logWarning('尝试降级策略: 使用默认模板');

        // 返回默认模板
        return generateDefaultTemplate(userInput);
      },
      description: '使用默认代码模板'
    }
  ]
};

/**
 * 生成简单模板
 */
function generateSimpleTemplate(
  userInput: string,
  filesPreview: any[]
): AIProcessResult {
  // 分析用户意图
  const intent = analyzeUserIntent(userInput);

  // 生成简单代码
  let code = '';
  let explanation = '';

  switch (intent.type) {
    case 'filter':
      code = generateFilterCode(intent, filesPreview);
      explanation = `使用简单模板生成过滤代码：${intent.description}`;
      break;
    case 'aggregate':
      code = generateAggregateCode(intent, filesPreview);
      explanation = `使用简单模板生成聚合代码：${intent.description}`;
      break;
    case 'transform':
      code = generateTransformCode(intent, filesPreview);
      explanation = `使用简单模板生成转换代码：${intent.description}`;
      break;
    default:
      code = generateGenericCode(filesPreview);
      explanation = '使用通用代码模板';
  }

  return { code, explanation };
}

/**
 * 生成默认模板
 */
function generateDefaultTemplate(userInput: string): AIProcessResult {
  const code = `
// 默认数据处理模板
// 由于 AI 服务暂时不可用，使用此模板进行处理

function processData(data) {
  // 添加您的数据处理逻辑
  return data.map(row => ({
    ...row,
    // 在此添加转换逻辑
  }));
}

// 处理所有文件
const result = {};
for (const fileName in datasets) {
  result[fileName] = processData(datasets[fileName]);
}

return result;
`.trim();

  const explanation = '使用默认代码模板。AI 服务暂时不可用，请稍后重试或手动修改代码。';

  return { code, explanation };
}

/**
 * 分析用户意图
 */
function analyzeUserIntent(userInput: string): {
  type: 'filter' | 'aggregate' | 'transform' | 'generic';
  description: string;
  keywords: string[];
} {
  const input = userInput.toLowerCase();

  // 过滤类关键词
  const filterKeywords = ['筛选', '过滤', 'filter', 'where', '只显示', '仅显示'];
  // 聚合类关键词
  const aggregateKeywords = ['总计', '平均', '求和', '汇总', 'sum', 'avg', 'count', '总计'];
  // 转换类关键词
  const transformKeywords = ['转换', '计算', '新增', '列', 'transform', 'calculate'];

  if (filterKeywords.some(kw => input.includes(kw))) {
    return {
      type: 'filter',
      description: '筛选数据',
      keywords: filterKeywords.filter(kw => input.includes(kw))
    };
  }

  if (aggregateKeywords.some(kw => input.includes(kw))) {
    return {
      type: 'aggregate',
      description: '聚合数据',
      keywords: aggregateKeywords.filter(kw => input.includes(kw))
    };
  }

  if (transformKeywords.some(kw => input.includes(kw))) {
    return {
      type: 'transform',
      description: '转换数据',
      keywords: transformKeywords.filter(kw => input.includes(kw))
    };
  }

  return {
    type: 'generic',
    description: '通用处理',
    keywords: []
  };
}

/**
 * 生成过滤代码
 */
function generateFilterCode(intent: any, filesPreview: any[]): string {
  return `
// 简单过滤模板
function filterData(data) {
  return data.filter(row => {
    // 添加您的过滤条件
    return true;
  });
}

const result = {};
for (const fileName in datasets) {
  result[fileName] = filterData(datasets[fileName]);
}

return result;
`.trim();
}

/**
 * 生成聚合代码
 */
function generateAggregateCode(intent: any, filesPreview: any[]): string {
  return `
// 简单聚合模板
function aggregateData(data) {
  const result = {};

  // 示例：计算总和
  data.forEach(row => {
    Object.keys(row).forEach(key => {
      if (typeof row[key] === 'number') {
        result[key] = (result[key] || 0) + row[key];
      }
    });
  });

  return [result];
}

const result = {};
for (const fileName in datasets) {
  result[fileName] = aggregateData(datasets[fileName]);
}

return result;
`.trim();
}

/**
 * 生成转换代码
 */
function generateTransformCode(intent: any, filesPreview: any[]): string {
  return `
// 简单转换模板
function transformData(data) {
  return data.map(row => {
    const newRow = { ...row };

    // 添加您的转换逻辑
    // newRow.newColumn = row.existingColumn * 2;

    return newRow;
  });
}

const result = {};
for (const fileName in datasets) {
  result[fileName] = transformData(datasets[fileName]);
}

return result;
`.trim();
}

/**
 * 生成通用代码
 */
function generateGenericCode(filesPreview: any[]): string {
  return `
// 通用数据处理模板
function processGeneric(data) {
  // 添加您的处理逻辑
  return data;
}

const result = {};
for (const fileName in datasets) {
  result[fileName] = processGeneric(datasets[fileName]);
}

return result;
`.trim();
}

/**
 * 韧性代码生成器
 */
export class ResilientCodeGenerator {
  private config: ResilientGeneratorConfig;

  constructor(config?: Partial<ResilientGeneratorConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      fallbackStrategies: config?.fallbackStrategies || DEFAULT_CONFIG.fallbackStrategies
    };
  }

  /**
   * 生成代码（带降级策略）
   */
  async generateCode(
    userInput: string,
    filesPreview: any[]
  ): Promise<AIProcessResult> {
    const context: CodeGenerationContext = {
      attemptNumber: 0,
      metadata: {
        userInput,
        fileCount: filesPreview.length
      }
    };

    // 数据验证
    if (this.config.enableDataValidation) {
      const validation = DataValidator.validateFilesPreview(filesPreview, 'zhipu');

      if (!validation.isValid) {
        EnhancedLogger.logError('数据验证失败', {
          errorCount: validation.errors.length,
          errors: validation.errors
        });

        // 尝试清理数据
        EnhancedLogger.logInfo('尝试清理数据结构');
        filesPreview = DataValidator.sanitizeFilesPreview(filesPreview);

        // 重新验证
        const revalidation = DataValidator.validateFilesPreview(filesPreview, 'zhipu');
        if (!revalidation.isValid) {
          throw new Error(`数据验证失败且无法修复: ${JSON.stringify(validation.errors)}`);
        }
      }

      if (validation.warnings.length > 0) {
        EnhancedLogger.logWarning('数据验证警告', {
          warningCount: validation.warnings.length,
          warnings: validation.warnings
        });
      }

      context.validationResult = validation;
    }

    // 尝试生成代码（带重试和降级）
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      context.attemptNumber = attempt;

      try {
        EnhancedLogger.logInfo(`代码生成尝试 ${attempt}/${this.config.maxAttempts}`);

        const result = await PerformanceMeasure.measure(
          `code_generation_attempt_${attempt}`,
          () => this.attemptGeneration(userInput, filesPreview, context)
        );

        EnhancedLogger.logInfo('代码生成成功', {
          attemptNumber: attempt,
          codeLength: result.code.length
        });

        return result;

      } catch (error) {
        context.lastError = error as Error;
        EnhancedLogger.logError(`代码生成尝试 ${attempt} 失败`, {
          error: (error as Error).message,
          stack: (error as Error).stack
        });

        // 如果还有重试次数，尝试降级策略
        if (attempt < this.config.maxAttempts && this.config.enableFallback) {
          EnhancedLogger.logInfo('准备尝试降级策略');

          const fallbackResult = await this.tryFallbackStrategies(
            userInput,
            filesPreview,
            context
          );

          if (fallbackResult) {
            EnhancedLogger.logInfo('降级策略成功');
            return fallbackResult;
          }
        }

        // 最后一次尝试失败
        if (attempt === this.config.maxAttempts) {
          EnhancedLogger.logError('所有尝试均失败', {
            totalAttempts: attempt,
            lastError: (error as Error).message
          });

          // 返回默认模板作为最后手段
          return generateDefaultTemplate(userInput);
        }
      }
    }

    // 理论上不应该到达这里
    return generateDefaultTemplate(userInput);
  }

  /**
   * 尝试生成代码
   */
  private async attemptGeneration(
    userInput: string,
    filesPreview: any[],
    context: CodeGenerationContext
  ): Promise<AIProcessResult> {
    // 第一次尝试使用原始数据
    if (context.attemptNumber === 1) {
      return generateDataProcessingCode(userInput, filesPreview);
    }

    // 后续尝试根据错误类型选择策略
    const lastError = context.lastError!;
    const errorMsg = lastError.message.toLowerCase();

    // 数据结构相关错误，尝试清理
    if (
      errorMsg.includes('header') ||
      errorMsg.includes('undefined') ||
      errorMsg.includes('cannot read')
    ) {
      const sanitizedPreview = DataValidator.sanitizeFilesPreview(filesPreview);
      return generateDataProcessingCode(userInput, sanitizedPreview);
    }

    // 其他错误，直接重试
    return generateDataProcessingCode(userInput, filesPreview);
  }

  /**
   * 尝试降级策略
   */
  private async tryFallbackStrategies(
    userInput: string,
    filesPreview: any[],
    context: CodeGenerationContext
  ): Promise<AIProcessResult | null> {
    if (!this.config.enableFallback || !context.lastError) {
      return null;
    }

    // 按优先级排序策略
    const sortedStrategies = [...this.config.fallbackStrategies].sort(
      (a, b) => a.priority - b.priority
    );

    for (const strategy of sortedStrategies) {
      try {
        EnhancedLogger.logInfo(`尝试降级策略: ${strategy.name}`);

        if (strategy.condition(context.lastError!, context)) {
          const result = await strategy.action(userInput, filesPreview, context);

          EnhancedLogger.logInfo(`降级策略 ${strategy.name} 成功`, {
            description: strategy.description,
            codeLength: result.code.length
          });

          return result;
        } else {
          EnhancedLogger.logDebug(`降级策略 ${strategy.name} 不适用当前错误`);
        }
      } catch (error) {
        EnhancedLogger.logWarning(`降级策略 ${strategy.name} 失败`, {
          error: (error as Error).message
        });
      }
    }

    EnhancedLogger.logError('所有降级策略均失败');
    return null;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ResilientGeneratorConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      fallbackStrategies: config.fallbackStrategies || this.config.fallbackStrategies
    };
  }

  /**
   * 获取配置
   */
  getConfig(): ResilientGeneratorConfig {
    return { ...this.config };
  }
}

/**
 * 创建默认的韧性代码生成器
 */
export function createResilientCodeGenerator(
  config?: Partial<ResilientGeneratorConfig>
): ResilientCodeGenerator {
  return new ResilientCodeGenerator(config);
}

/**
 * 便捷函数：生成代码（带降级策略）
 */
export async function generateCodeWithFallback(
  userInput: string,
  filesPreview: any[]
): Promise<AIProcessResult> {
  const generator = createResilientCodeGenerator();
  return generator.generateCode(userInput, filesPreview);
}
