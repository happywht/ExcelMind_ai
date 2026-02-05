/**
 * 重试服务单元测试
 */

import {
  RetryStrategy,
  RetryStrategyType,
  FallbackStrategy,
  RetryStrategies,
  FallbackStrategies,
  ResilienceStrategy,
  createResilienceStrategy
} from '../retryService';

describe('RetryStrategy', () => {
  describe('指数退避重试', () => {
    test('应该按指数退避计算延迟', () => {
      const strategy = new RetryStrategy({
        type: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2
      });

      expect(strategy.getRetryDelay(0)).toBe(1000);    // 1000 * 2^0
      expect(strategy.getRetryDelay(1)).toBe(2000);    // 1000 * 2^1
      expect(strategy.getRetryDelay(2)).toBe(4000);    // 1000 * 2^2
    });

    test('应该应用最大延迟限制', () => {
      const strategy = new RetryStrategy({
        type: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 3000,
        backoffMultiplier: 2
      });

      expect(strategy.getRetryDelay(0)).toBe(1000);
      expect(strategy.getRetryDelay(1)).toBe(2000);
      expect(strategy.getRetryDelay(2)).toBe(3000);  // 应该被限制在maxDelay
      expect(strategy.getRetryDelay(3)).toBe(3000);  // 继续被限制
    });
  });

  describe('线性退避重试', () => {
    test('应该按线性增加延迟', () => {
      const strategy = new RetryStrategy({
        type: RetryStrategyType.LINEAR_BACKOFF,
        maxRetries: 3,
        initialDelay: 500
      });

      expect(strategy.getRetryDelay(0)).toBe(500);     // 500 * 1
      expect(strategy.getRetryDelay(1)).toBe(1000);    // 500 * 2
      expect(strategy.getRetryDelay(2)).toBe(1500);    // 500 * 3
    });
  });

  describe('固定延迟重试', () => {
    test('应该使用固定的延迟时间', () => {
      const strategy = new RetryStrategy({
        type: RetryStrategyType.FIXED_DELAY,
        maxRetries: 3,
        initialDelay: 2000
      });

      expect(strategy.getRetryDelay(0)).toBe(2000);
      expect(strategy.getRetryDelay(1)).toBe(2000);
      expect(strategy.getRetryDelay(2)).toBe(2000);
    });
  });

  describe('立即重试', () => {
    test('不应该有延迟', () => {
      const strategy = new RetryStrategy({
        type: RetryStrategyType.IMMEDIATE,
        maxRetries: 3,
        initialDelay: 0
      });

      expect(strategy.getRetryDelay(0)).toBe(0);
      expect(strategy.getRetryDelay(1)).toBe(0);
      expect(strategy.getRetryDelay(2)).toBe(0);
    });
  });

  describe('抖动（Jitter）', () => {
    test('应该为延迟添加随机抖动', () => {
      const strategy = new RetryStrategy({
        type: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 3,
        initialDelay: 1000,
        jitter: true,
        jitterAmount: 200
      });

      const delays = [
        strategy.getRetryDelay(0),
        strategy.getRetryDelay(1),
        strategy.getRetryDelay(2)
      ];

      // 所有延迟都应该在基础值的±200范围内
      delays.forEach((delay, index) => {
        const baseDelay = 1000 * Math.pow(2, index);
        expect(delay).toBeGreaterThanOrEqual(baseDelay - 200);
        expect(delay).toBeLessThanOrEqual(baseDelay + 200);
      });
    });
  });

  describe('可重试错误判断', () => {
    test('应该识别可重试的网络错误', () => {
      const strategy = new RetryStrategy({
        type: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 3,
        initialDelay: 1000
      });

      expect(strategy.shouldRetry(new Error('network error'), 0)).toBe(true);
      expect(strategy.shouldRetry(new Error('fetch failed'), 0)).toBe(true);
      expect(strategy.shouldRetry(new Error('timeout'), 0)).toBe(true);
      expect(strategy.shouldRetry(new Error('request timed out'), 0)).toBe(true);
      expect(strategy.shouldRetry(new Error('rate limit exceeded'), 0)).toBe(true);
      expect(strategy.shouldRetry(new Error('429 Too Many Requests'), 0)).toBe(true);
      expect(strategy.shouldRetry(new Error('500 Internal Server Error'), 0)).toBe(true);
      expect(strategy.shouldRetry(new Error('502 Bad Gateway'), 0)).toBe(true);
      expect(strategy.shouldRetry(new Error('503 Service Unavailable'), 0)).toBe(true);
    });

    test('不应该重试非网络错误', () => {
      const strategy = new RetryStrategy({
        type: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 3,
        initialDelay: 1000
      });

      expect(strategy.shouldRetry(new Error('validation error'), 0)).toBe(false);
      expect(strategy.shouldRetry(new Error('unauthorized'), 0)).toBe(false);
      expect(strategy.shouldRetry(new Error('not found'), 0)).toBe(false);
    });

    test('达到最大重试次数后应该停止重试', () => {
      const strategy = new RetryStrategy({
        type: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 3,
        initialDelay: 1000
      });

      expect(strategy.shouldRetry(new Error('network error'), 0)).toBe(true);
      expect(strategy.shouldRetry(new Error('network error'), 1)).toBe(true);
      expect(strategy.shouldRetry(new Error('network error'), 2)).toBe(true);
      expect(strategy.shouldRetry(new Error('network error'), 3)).toBe(false);
    });
  });

  describe('重试执行', () => {
    test('应该在成功时立即返回结果', async () => {
      const strategy = new RetryStrategy({
        type: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 3,
        initialDelay: 100
      });

      const operation = jest.fn().mockResolvedValue('success');

      const result = await strategy.executeWithRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('应该在失败时重试操作', async () => {
      jest.useFakeTimers();

      const strategy = new RetryStrategy({
        type: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 3,
        initialDelay: 100
      });

      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');

      const retryCallback = jest.fn();

      const promise = strategy.executeWithRetry(operation, retryCallback);

      // 第一次重试
      await jest.advanceTimersByTimeAsync(100);
      // 第二次重试
      await jest.advanceTimersByTimeAsync(200);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(retryCallback).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    }, 10000);

    test('应该在达到最大重试次数后抛出错误', async () => {
      jest.useFakeTimers();

      const strategy = new RetryStrategy({
        type: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 2,
        initialDelay: 100
      });

      const operation = jest.fn().mockRejectedValue(new Error('network error'));

      const promise = strategy.executeWithRetry(operation);

      // 让所有重试延迟都通过
      for (let i = 0; i < 3; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      await expect(promise).rejects.toThrow('network error');
      expect(operation).toHaveBeenCalledTimes(3); // 初始调用 + 2次重试

      jest.useRealTimers();
    }, 10000);

    test('不应该重试不可重试的错误', async () => {
      const strategy = new RetryStrategy({
        type: RetryStrategyType.EXPONENTIAL_BACKOFF,
        maxRetries: 3,
        initialDelay: 100
      });

      const operation = jest.fn().mockRejectedValue(new Error('validation error'));

      await expect(strategy.executeWithRetry(operation)).rejects.toThrow('validation error');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});

describe('RetryStrategies 预定义策略', () => {
  test('应该提供指数退避策略', () => {
    const strategy = RetryStrategies.exponentialBackoff();

    expect(strategy.getRetryDelay(0)).toBeGreaterThan(0);
    expect(strategy.getRetryDelay(1)).toBeGreaterThan(strategy.getRetryDelay(0));
  });

  test('应该提供线性退避策略', () => {
    const strategy = RetryStrategies.linearBackoff();

    expect(strategy.getRetryDelay(0)).toBeGreaterThan(0);
    expect(strategy.getRetryDelay(1)).toBeGreaterThan(strategy.getRetryDelay(0));
  });

  test('应该提供固定延迟策略', () => {
    const strategy = RetryStrategies.fixedDelay();

    expect(strategy.getRetryDelay(0)).toBe(strategy.getRetryDelay(1));
    expect(strategy.getRetryDelay(1)).toBe(strategy.getRetryDelay(2));
  });

  test('应该提供快速重试策略', () => {
    const strategy = RetryStrategies.fastRetry();

    expect(strategy.getRetryDelay(0)).toBeLessThan(200);
  });

  test('应该提供慢速重试策略', () => {
    const strategy = RetryStrategies.slowRetry();

    expect(strategy.getRetryDelay(0)).toBeGreaterThanOrEqual(5000);
  });

  test('应该支持自定义配置覆盖', () => {
    const strategy = RetryStrategies.exponentialBackoff({
      maxRetries: 10,
      initialDelay: 5000
    });

    expect(strategy.getRetryDelay(0)).toBe(5000);
  });
});

describe('FallbackStrategy', () => {
  let fallbackStrategy: FallbackStrategy;

  beforeEach(() => {
    fallbackStrategy = new FallbackStrategy();
  });

  test('应该能够注册降级策略', () => {
    const fallback = jest.fn().mockResolvedValue('fallback value');

    fallbackStrategy.register('test.operation', fallback);

    expect(fallbackStrategy.canFallback('test.operation')).toBe(true);
    expect(fallbackStrategy.canFallback('nonexistent.operation')).toBe(false);
  });

  test('应该在主操作失败时执行降级策略', async () => {
    const fallback = jest.fn().mockResolvedValue('fallback result');

    fallbackStrategy.register('test.operation', fallback);

    const result = await fallbackStrategy.getFallback({
      operation: 'test.operation',
      error: new Error('Main operation failed'),
      originalInput: { data: 'test' }
    });

    expect(result).toBe('fallback result');
    expect(fallback).toHaveBeenCalled();
  });

  test('应该检查降级条件', async () => {
    const fallback = jest.fn().mockResolvedValue('fallback');

    // 只在网络错误时降级
    fallbackStrategy.register(
      'test.operation',
      fallback,
      (error) => error.message.includes('network')
    );

    // 网络错误应该触发降级
    await expect(fallbackStrategy.getFallback({
      operation: 'test.operation',
      error: new Error('network error'),
      originalInput: null
    })).resolves.toBe('fallback');

    // 其他错误不应该降级
    await expect(fallbackStrategy.getFallback({
      operation: 'test.operation',
      error: new Error('validation error'),
      originalInput: null
    })).rejects.toThrow('validation error');
  });

  test('应该在降级策略不存在时抛出错误', async () => {
    await expect(fallbackStrategy.getFallback({
      operation: 'nonexistent.operation',
      error: new Error('Test error'),
      originalInput: null
    })).rejects.toThrow('没有为操作');
  });

  test('应该在降级策略失败时抛出原始错误', async () => {
    const fallback = jest.fn().mockRejectedValue(new Error('Fallback failed'));

    fallbackStrategy.register('test.operation', fallback);

    await expect(fallbackStrategy.getFallback({
      operation: 'test.operation',
      error: new Error('Original error'),
      originalInput: null
    })).rejects.toThrow('Original error');
  });
});

describe('FallbackStrategies 预定义策略', () => {
  test('应该提供默认值降级策略', async () => {
    const fallback = FallbackStrategies.defaultValue(42);

    await expect(fallback()).resolves.toBe(42);
  });

  test('应该提供空数组降级策略', async () => {
    const fallback = FallbackStrategies.emptyArray();

    await expect(fallback()).resolves.toEqual([]);
  });

  test('应该提供空对象降级策略', async () => {
    const fallback = FallbackStrategies.emptyObject();

    await expect(fallback()).resolves.toEqual({});
  });

  test('应该提供简化错误降级策略', async () => {
    const fallback = FallbackStrategies.simplifiedError('Something went wrong');

    await expect(fallback()).rejects.toThrow('Something went wrong');
  });
});

describe('ResilienceStrategy', () => {
  test('应该结合重试和降级策略', async () => {
    jest.useFakeTimers();

    const retryStrategy = RetryStrategies.exponentialBackoff({
      maxRetries: 2,
      initialDelay: 100
    });

    const fallbackStrategy = new FallbackStrategy();
    fallbackStrategy.register('test.operation',
      FallbackStrategies.defaultValue('fallback value')
    );

    const resilienceStrategy = new ResilienceStrategy(
      retryStrategy,
      fallbackStrategy
    );

    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'));

    const promise = resilienceStrategy.execute('test.operation', operation);

    // 让重试通过
    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(100);
    }

    const result = await promise;

    expect(result).toBe('fallback value');
    expect(operation).toHaveBeenCalledTimes(3);

    jest.useRealTimers();
  }, 10000);

  test('应该在没有降级策略时只重试', async () => {
    jest.useFakeTimers();

    const retryStrategy = RetryStrategies.exponentialBackoff({
      maxRetries: 2,
      initialDelay: 100
    });

    const resilienceStrategy = new ResilienceStrategy(retryStrategy);

    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const promise = resilienceStrategy.execute('test.operation', operation);

    // 让重试通过
    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(100);
    }

    const result = await promise;

    expect(result).toBe('success');

    jest.useRealTimers();
  }, 10000);
});

describe('createResilienceStrategy', () => {
  test('应该创建弹性策略实例', () => {
    const strategy = createResilienceStrategy(
      { maxRetries: 5 },
      new FallbackStrategy()
    );

    expect(strategy).toBeInstanceOf(ResilienceStrategy);
  });

  test('应该使用默认配置', () => {
    const strategy = createResilienceStrategy();

    expect(strategy).toBeInstanceOf(ResilienceStrategy);
  });
});
