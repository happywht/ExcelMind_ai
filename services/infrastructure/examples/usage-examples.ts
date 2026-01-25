/**
 * 基础设施服务使用示例
 *
 * 展示如何使用缓存服务、事件总线和重试服务
 */

import {
  CacheService,
  createCacheService
} from '../cacheService';
import {
  EventBus,
  TypedEventBus,
  EventType,
  EventAggregator,
  createEventBus,
  createTypedEventBus
} from '../eventBus';
import {
  RetryStrategy,
  RetryStrategyType,
  FallbackStrategy,
  RetryStrategies,
  FallbackStrategies,
  ResilienceStrategy,
  createResilienceStrategy
} from '../retryService';

// ============================================================================
// 缓存服务使用示例
// ============================================================================

export async function cacheServiceExamples() {
  console.log('=== 缓存服务示例 ===\n');

  // 1. 基础使用
  console.log('1. 基础缓存操作：');
  const cacheService = createCacheService({
    memory: {
      maxSize: 100,
      ttl: 300 // 5分钟
    },
    localStorage: {
      enabled: true,
      maxSize: 5 * 1024 * 1024,
      ttl: 3600
    },
    indexedDB: {
      enabled: false,
      dbName: 'ExcelMindCache',
      storeName: 'cache'
    },
    strategy: 'hybrid'
  });

  // 生成缓存键
  const cacheKey = cacheService.generateKey('ai_response', {
    query: '分析Excel数据',
    model: 'gpt-4'
  });

  // 设置缓存
  await cacheService.set(cacheKey, {
    response: '分析结果',
    timestamp: Date.now()
  }, 600); // 10分钟TTL

  // 获取缓存
  const cached = await cacheService.get(cacheKey);
  console.log('缓存命中:', cached?.value);

  // 2. SQL查询缓存示例
  console.log('\n2. SQL查询缓存：');
  const queryKey = cacheService.generateKey('data_analysis', {
    sql: 'SELECT * FROM users WHERE age > 25',
    sheets: ['users']
  });

  // 首次查询（无缓存）
  let result = await cacheService.get(queryKey);
  if (!result) {
    console.log('缓存未命中，执行查询...');
    // 模拟查询结果
    const queryResult = {
      rows: [
        { id: 1, name: 'Alice', age: 28 },
        { id: 2, name: 'Bob', age: 30 }
      ],
      executionTime: 150
    };

    // 缓存结果
    await cacheService.set(queryKey, queryResult, 1800); // 30分钟
    console.log('查询结果已缓存');
  }

  // 第二次查询（有缓存）
  result = await cacheService.get(queryKey);
  console.log('缓存命中:', result?.value);

  // 3. 分层缓存示例
  console.log('\n3. 分层缓存策略：');
  const smallData = { message: '小数据' };
  const mediumData = { data: 'x'.repeat(15 * 1024) }; // ~15KB
  const largeData = { items: Array(1000).fill({ data: 'y'.repeat(100) }) };

  const smallKey = cacheService.generateKey('mapping', { size: 'small' });
  const mediumKey = cacheService.generateKey('mapping', { size: 'medium' });
  const largeKey = cacheService.generateKey('mapping', { size: 'large' });

  await cacheService.set(smallKey, smallData);
  await cacheService.set(mediumKey, mediumData);
  await cacheService.set(largeKey, largeData);

  console.log('小数据存储位置:', (await cacheService.get(smallKey))?.metadata?.source);
  console.log('中等数据存储位置:', (await cacheService.get(mediumKey))?.metadata?.source);
  console.log('大数据存储位置:', (await cacheService.get(largeKey))?.metadata?.source);

  // 4. 缓存统计
  console.log('\n4. 缓存统计：');
  for (let i = 0; i < 5; i++) {
    await cacheService.get(smallKey);
  }
  const stats = await cacheService.get(smallKey);
  console.log('命中次数:', stats?.hitCount);

  // 清理
  await cacheService.clear();
}

// ============================================================================
// 事件总线使用示例
// ============================================================================

export async function eventBusExamples() {
  console.log('\n=== 事件总线示例 ===\n');

  // 1. 基础发布订阅
  console.log('1. 基础发布订阅：');
  const eventBus = createEventBus({ maxHistorySize: 100 });

  // 订阅任务创建事件
  const unsubscribe = eventBus.subscribe('task.created', (data) => {
    console.log('任务已创建:', data);
  });

  // 发布事件
  eventBus.publish('task.created', {
    taskId: 'task-001',
    type: 'document_fill',
    timestamp: Date.now()
  });

  // 取消订阅
  unsubscribe();

  // 2. 类型安全的事件总线
  console.log('\n2. 类型安全事件总线：');
  const typedEventBus = createTypedEventBus();

  // 监听任务完成事件
  typedEventBus.on(EventType.TASK_COMPLETED, (data) => {
    console.log(`任务 ${data.taskId} 已完成，耗时 ${data.duration}ms`);
  });

  // 监听进度更新
  typedEventBus.on(EventType.TASK_PROGRESS, (data) => {
    console.log(`任务 ${data.taskId} 进度: ${data.progress}% - ${data.stage}`);
  });

  // 发布事件
  typedEventBus.emit(EventType.TASK_PROGRESS, {
    taskId: 'task-002',
    progress: 50,
    stage: '数据解析'
  });

  typedEventBus.emit(EventType.TASK_COMPLETED, {
    taskId: 'task-002',
    duration: 3500
  });

  // 3. 一次性订阅
  console.log('\n3. 一次性订阅：');
  eventBus.subscribeOnce('system.ready', () => {
    console.log('系统已就绪（只会执行一次）');
  });

  eventBus.publish('system.ready', {});
  eventBus.publish('system.ready', {}); // 不会再次触发

  // 4. 优先级订阅
  console.log('\n4. 优先级订阅：');
  eventBus.subscribeWithPriority('data.process', () => {
    console.log('步骤1: 数据验证');
  }, 1);

  eventBus.subscribeWithPriority('data.process', () => {
    console.log('步骤3: 数据保存');
  }, 3);

  eventBus.subscribeWithPriority('data.process', () => {
    console.log('步骤2: 数据转换');
  }, 2);

  eventBus.publish('data.process', {});

  // 5. 事件聚合
  console.log('\n5. 事件聚合（批量处理）：');
  const aggregator = new EventAggregator(eventBus, 1000);
  let batchCount = 0;

  eventBus.subscribe('cache.batch:aggregated', (data: any) => {
    batchCount++;
    console.log(`批量处理 ${batchCount}: 收到 ${data.count} 个缓存事件`);
  });

  // 模拟多个缓存事件
  for (let i = 0; i < 5; i++) {
    eventBus.publish('cache.batch', { key: `cache-${i}` });
  }

  // 6. 事件历史和重放
  console.log('\n6. 事件历史：');
  eventBus.publish('event.a', { id: 1 });
  eventBus.publish('event.b', { id: 2 });
  eventBus.publish('event.a', { id: 3 });

  const history = eventBus.getHistory('event.a');
  console.log('event.a 的历史记录:', history.length, '条');

  // 清理
  eventBus.clear();
  aggregator.destroy();
}

// ============================================================================
// 重试服务使用示例
// ============================================================================

export async function retryServiceExamples() {
  console.log('\n=== 重试服务示例 ===\n');

  // 1. 基础重试
  console.log('1. 基础重试策略：');
  const retryStrategy = RetryStrategies.exponentialBackoff({
    maxRetries: 3,
    initialDelay: 1000
  });

  // 模拟不稳定的API调用
  let attemptCount = 0;
  const unstableApiCall = async () => {
    attemptCount++;
    console.log(`API调用尝试 ${attemptCount}`);

    if (attemptCount < 3) {
      throw new Error('network error');
    }

    return { status: 'success', data: 'API响应数据' };
  };

  try {
    const result = await retryStrategy.executeWithRetry(
      unstableApiCall,
      (error, attempt, delay) => {
        console.log(`第 ${attempt + 1} 次尝试失败: ${error.message}`);
        console.log(`等待 ${delay}ms 后重试...`);
      }
    );
    console.log('最终成功:', result);
  } catch (error) {
    console.log('所有重试失败:', error);
  }

  // 2. 不同重试策略
  console.log('\n2. 不同重试策略对比：');
  const strategies = {
    指数退避: RetryStrategies.exponentialBackoff(),
    线性退避: RetryStrategies.linearBackoff(),
    固定延迟: RetryStrategies.fixedDelay(),
    快速重试: RetryStrategies.fastRetry()
  };

  for (const [name, strategy] of Object.entries(strategies)) {
    const delays = [0, 1, 2].map(i => strategy.getRetryDelay(i));
    console.log(`${name}: [${delays.join(', ')}]ms`);
  }

  // 3. 降级策略
  console.log('\n3. 降级策略：');
  const fallbackStrategy = new FallbackStrategy();

  // 注册降级策略
  fallbackStrategy.register(
    'ai.generate',
    FallbackStrategies.defaultValue({
      fallback: true,
      message: 'AI服务暂时不可用，使用缓存数据'
    })
  );

  fallbackStrategy.register(
    'database.query',
    FallbackStrategies.fromCache(
      { get: async (key: string) => ({ cached: true }) },
      'query_key'
    )
  );

  // 使用降级
  const resilientOperation = async () => {
    throw new Error('AI service unavailable');
  };

  const resilientStrategy = createResilienceStrategy(
    { maxRetries: 2, initialDelay: 500 },
    fallbackStrategy
  );

  try {
    const result = await resilientStrategy.execute(
      'ai.generate',
      resilientOperation
    );
    console.log('降级结果:', result);
  } catch (error) {
    console.log('操作完全失败:', error);
  }

  // 4. 组合策略（重试 + 降级）
  console.log('\n4. 完整的弹性策略：');
  const apiResilience = new ResilienceStrategy(
    RetryStrategies.exponentialBackoff({
      maxRetries: 3,
      initialDelay: 1000,
      jitter: true
    }),
    fallbackStrategy
  );

  let apiAttempts = 0;
  const robustApiCall = async () => {
    apiAttempts++;
    if (apiAttempts <= 2) {
      throw new Error('API rate limit exceeded');
    }
    if (apiAttempts <= 4) {
      throw new Error('API timeout');
    }
    return { data: '最终成功' };
  };

  try {
    const result = await apiResilience.execute(
      'api.call',
      robustApiCall
    );
    console.log('API调用成功:', result);
  } catch (error) {
    console.log('API调用失败，尝试降级...');
  }
}

// ============================================================================
// 综合示例：智能文档处理系统
// ============================================================================

export async function comprehensiveExample() {
  console.log('\n=== 综合示例：智能文档处理 ===\n');

  // 初始化服务
  const cache = createCacheService();
  const events = createTypedEventBus();
  const retry = createResilienceStrategy();

  // 1. 设置事件监听
  events.on(EventType.TASK_CREATED, async (data) => {
    console.log(`[事件] 任务创建: ${data.taskId}`);

    // 发布进度事件
    events.emit(EventType.TASK_PROGRESS, {
      taskId: data.taskId,
      progress: 10,
      stage: '初始化'
    });
  });

  events.on(EventType.TASK_PROGRESS, (data) => {
    console.log(`[事件] 进度更新: ${data.taskId} - ${data.progress}% (${data.stage})`);
  });

  events.on(EventType.CACHE_HIT, (data) => {
    console.log(`[缓存] 命中: ${data.key}`);
  });

  events.on(EventType.CACHE_MISS, (data) => {
    console.log(`[缓存] 未命中: ${data.key}`);
  });

  events.on(EventType.SERVICE_ERROR, (data) => {
    console.log(`[错误] ${data.service}.${data.operation}: ${data.error}`);
  });

  // 2. 模拟文档处理流程
  const taskId = 'doc-fill-001';
  events.emit(EventType.TASK_CREATED, { taskId });

  // 3. 缓存查询结果
  const queryKey = cache.generateKey('template_analysis', {
    template: '合同模板',
    dataRange: 'A1:Z100'
  });

  let queryResult = await cache.get(queryKey);
  if (!queryResult) {
    events.emit(EventType.CACHE_MISS, { key: 'template_analysis' });

    // 模拟AI查询（带重试）
    try {
      const aiQuery = async () => {
        events.emit(EventType.TASK_PROGRESS, {
          taskId,
          progress: 30,
          stage: 'AI查询分析'
        });

        // 模拟偶尔失败
        if (Math.random() > 0.7) {
          throw new Error('AI service timeout');
        }

        return { mappings: [{ field: 'name', cell: 'B2' }] };
      };

      const result = await retry.execute('ai.query', aiQuery);

      await cache.set(queryKey, result, 1800);
      queryResult = { value: result };

      events.emit(EventType.TASK_PROGRESS, {
        taskId,
        progress: 60,
        stage: '查询完成'
      });
    } catch (error) {
      events.emit(EventType.SERVICE_ERROR, {
        service: 'ai',
        operation: 'query',
        error: (error as Error).message
      });
    }
  } else {
    events.emit(EventType.CACHE_HIT, { key: 'document_query' });
  }

  // 4. 完成任务
  events.emit(EventType.TASK_PROGRESS, {
    taskId,
    progress: 90,
    stage: '生成文档'
  });

  events.emit(EventType.TASK_COMPLETED, {
    taskId,
    duration: 2500
  });

  // 5. 显示统计
  console.log('\n处理完成，统计信息：');
  const eventStats = events.registeredEvents();
  console.log('触发的事件类型:', eventStats.length);

  const recentEvents = events.getHistory(undefined, 5);
  console.log('最近的事件:', recentEvents.length);
}

// ============================================================================
// 运行所有示例
// ============================================================================

export async function runAllExamples() {
  try {
    await cacheServiceExamples();
    await eventBusExamples();
    await retryServiceExamples();
    await comprehensiveExample();

    console.log('\n✅ 所有示例运行完成！');
  } catch (error) {
    console.error('❌ 示例运行出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
