/**
 * 重试策略和降级策略实现
 *
 * 提供多种重试策略：
 * 1. 指数退避（Exponential Backoff）
 * 2. 线性退避（Linear Backoff）
 * 3. 固定延迟（Fixed Delay）
 * 4. 抖动重试（Jitter）
 */

import { IRetryStrategy, IFallbackStrategy } from '../intelligentDocumentService';

// ============================================================================
// 重试策略类型
// ============================================================================

export enum RetryStrategyType {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_DELAY = 'fixed_delay',
  IMMEDIATE = 'immediate'
}

export interface RetryStrategyConfig {
  type: RetryStrategyType;
  maxRetries: number;
  initialDelay: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  jitterAmount?: number;
}

// ============================================================================
// 重试策略实现
// ============================================================================

export class RetryStrategy implements IRetryStrategy {
  constructor(private readonly config: RetryStrategyConfig) {}

  shouldRetry(error: Error, retryCount: number): boolean {
    // 检查重试次数
    if (retryCount >= this.config.maxRetries) {
      return false;
    }

    // 检查错误类型
    if (!this.isRetryableError(error)) {
      return false;
    }

    return true;
  }

  getRetryDelay(retryCount: number): number {
    let delay: number;

    switch (this.config.type) {
      case RetryStrategyType.EXPONENTIAL_BACKOFF:
        delay = this.config.initialDelay * Math.pow(
          this.config.backoffMultiplier || 2,
          retryCount
        );
        break;

      case RetryStrategyType.LINEAR_BACKOFF:
        delay = this.config.initialDelay * (retryCount + 1);
        break;

      case RetryStrategyType.FIXED_DELAY:
        delay = this.config.initialDelay;
        break;

      case RetryStrategyType.IMMEDIATE:
        delay = 0;
        break;

      default:
        delay = this.config.initialDelay;
    }

    // 应用最大延迟限制
    if (this.config.maxDelay && delay > this.config.maxDelay) {
      delay = this.config.maxDelay;
    }

    // 应用抖动
    if (this.config.jitter) {
      delay = this.applyJitter(delay);
    }

    return delay;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    onRetry?: (error: Error, retryCount: number, delay: number) => void
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // 检查是否应该重试
        if (!this.shouldRetry(lastError, attempt)) {
          throw lastError;
        }

        // 获取重试延迟
        const delay = this.getRetryDelay(attempt);

        // 触发重试回调
        if (onRetry) {
          onRetry(lastError, attempt, delay);
        }

        // 等待后重试
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('操作失败，已达到最大重试次数');
  }

  private isRetryableError(error: Error): boolean {
    // 网络错误
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return true;
    }

    // 超时错误
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return true;
    }

    // 速率限制
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return true;
    }

    // 服务器错误 (5xx)
    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
      return true;
    }

    return false;
  }

  private applyJitter(delay: number): number {
    const jitterAmount = this.config.jitterAmount || delay * 0.1;
    const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
    return Math.max(0, delay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// 降级策略实现
// ============================================================================

export interface FallbackEntry<T> {
  operation: string;
  fallback: () => Promise<T>;
  condition?: (error: Error) => boolean;
}

export class FallbackStrategy implements IFallbackStrategy {
  private fallbacks: Map<string, FallbackEntry<any>> = new Map();

  register<T>(
    operation: string,
    fallback: () => Promise<T>,
    condition?: (error: Error) => boolean
  ): void {
    this.fallbacks.set(operation, { operation, fallback, condition });
  }

  canFallback(operation: string): boolean {
    return this.fallbacks.has(operation);
  }

  async getFallback<T>(context: {
    operation: string;
    error: Error;
    originalInput: any;
  }): Promise<T> {
    const entry = this.fallbacks.get(context.operation);

    if (!entry) {
      throw new Error(`没有为操作 "${context.operation}" 配置降级策略`);
    }

    // 检查降级条件
    if (entry.condition && !entry.condition(context.error)) {
      throw context.error;
    }

    try {
      return await entry.fallback();
    } catch (fallbackError) {
      // 降级也失败了，抛出原始错误
      throw context.error;
    }
  }
}

// ============================================================================
// 预定义的重试策略
// ============================================================================

export const RetryStrategies = {
  /**
   * 指数退避重试（推荐用于网络请求）
   */
  exponentialBackoff: (overrides?: Partial<RetryStrategyConfig>): RetryStrategy => {
    return new RetryStrategy({
      type: RetryStrategyType.EXPONENTIAL_BACKOFF,
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      jitterAmount: 500,
      ...overrides
    });
  },

  /**
   * 线性退避重试
   */
  linearBackoff: (overrides?: Partial<RetryStrategyConfig>): RetryStrategy => {
    return new RetryStrategy({
      type: RetryStrategyType.LINEAR_BACKOFF,
      maxRetries: 5,
      initialDelay: 500,
      maxDelay: 5000,
      jitter: true,
      ...overrides
    });
  },

  /**
   * 固定延迟重试
   */
  fixedDelay: (overrides?: Partial<RetryStrategyConfig>): RetryStrategy => {
    return new RetryStrategy({
      type: RetryStrategyType.FIXED_DELAY,
      maxRetries: 3,
      initialDelay: 2000,
      ...overrides
    });
  },

  /**
   * 快速重试（用于临时性错误）
   */
  fastRetry: (overrides?: Partial<RetryStrategyConfig>): RetryStrategy => {
    return new RetryStrategy({
      type: RetryStrategyType.EXPONENTIAL_BACKOFF,
      maxRetries: 5,
      initialDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 1.5,
      jitter: true,
      ...overrides
    });
  },

  /**
   * 慢速重试（用于严重错误）
   */
  slowRetry: (overrides?: Partial<RetryStrategyConfig>): RetryStrategy => {
    return new RetryStrategy({
      type: RetryStrategyType.EXPONENTIAL_BACKOFF,
      maxRetries: 2,
      initialDelay: 5000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      ...overrides
    });
  }
};

// ============================================================================
// 预定义的降级策略
// ============================================================================

export const FallbackStrategies = {
  /**
   * 创建返回默认值的降级策略
   */
  defaultValue: <T>(defaultValue: T) => {
    return async (): Promise<T> => defaultValue;
  },

  /**
   * 创建返回空数组的降级策略
   */
  emptyArray: <T = any>(): (() => Promise<T[]>) => {
    return async () => [];
  },

  /**
   * 创建返回空对象的降级策略
   */
  emptyObject: <T extends object = {}>(): (() => Promise<T>) => {
    return async () => ({}) as T;
  },

  /**
   * 创建从缓存获取的降级策略
   */
  fromCache: <T>(cacheService: any, key: any) => {
    return async (): Promise<T | null> => {
      return await cacheService.get<T>(key);
    };
  },

  /**
   * 创建抛出简化错误的降级策略
   */
  simplifiedError: (simplifiedMessage: string) => {
    return async (): Promise<never> => {
      throw new Error(simplifiedMessage);
    };
  }
};

// ============================================================================
// 组合策略工厂
// ============================================================================

export class ResilienceStrategy {
  constructor(
    private readonly retryStrategy: IRetryStrategy,
    private readonly fallbackStrategy?: IFallbackStrategy
  ) {}

  async execute<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: { originalInput: any }
  ): Promise<T> {
    try {
      return await this.retryStrategy.executeWithRetry(fn);
    } catch (error) {
      if (this.fallbackStrategy && this.fallbackStrategy.canFallback(operation)) {
        return await this.fallbackStrategy.getFallback({
          operation,
          error: error as Error,
          originalInput: context?.originalInput
        });
      }
      throw error;
    }
  }
}

/**
 * 创建弹性策略
 */
export function createResilienceStrategy(
  retryConfig?: Partial<RetryStrategyConfig>,
  fallbackStrategy?: IFallbackStrategy
): ResilienceStrategy {
  const retryStrategy = RetryStrategies.exponentialBackoff(retryConfig);
  return new ResilienceStrategy(retryStrategy, fallbackStrategy);
}
