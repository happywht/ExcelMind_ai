/**
 * 事件总线单元测试
 */

import { EventBus, TypedEventBus, EventType, EventAggregator, createEventBus, createTypedEventBus } from '../eventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus({ maxHistorySize: 100 });
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('基础事件发布和订阅', () => {
    test('应该能够发布和接收事件', () => {
      const handler = jest.fn();
      const testData = { message: 'Test event' };

      eventBus.subscribe('test.event', handler);
      eventBus.publish('test.event', testData);

      expect(handler).toHaveBeenCalledWith(testData);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('应该支持多个订阅者', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const testData = { value: 123 };

      eventBus.subscribe('test.event', handler1);
      eventBus.subscribe('test.event', handler2);
      eventBus.publish('test.event', testData);

      expect(handler1).toHaveBeenCalledWith(testData);
      expect(handler2).toHaveBeenCalledWith(testData);
    });

    test('应该能够取消订阅', () => {
      const handler = jest.fn();
      const testData = { message: 'Test' };

      const unsubscribe = eventBus.subscribe('test.event', handler);
      unsubscribe();

      eventBus.publish('test.event', testData);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('一次性订阅', () => {
    test('应该只执行一次一次性订阅', () => {
      const handler = jest.fn();

      eventBus.subscribeOnce('test.event', handler);

      eventBus.publish('test.event', { data: 1 });
      eventBus.publish('test.event', { data: 2 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 1 });
    });

    test('一次性订阅后应该自动移除', () => {
      const handler = jest.fn();

      eventBus.subscribeOnce('test.event', handler);

      expect(eventBus.subscriberCount('test.event')).toBe(1);

      eventBus.publish('test.event', { data: 1 });

      expect(eventBus.subscriberCount('test.event')).toBe(0);
    });
  });

  describe('优先级订阅', () => {
    test('应该按优先级顺序执行处理器', () => {
      const executionOrder: number[] = [];

      eventBus.subscribeWithPriority('test.event', () => { executionOrder.push(1); }, 1);
      eventBus.subscribeWithPriority('test.event', () => { executionOrder.push(3); }, 3);
      eventBus.subscribeWithPriority('test.event', () => { executionOrder.push(2); }, 2);

      eventBus.publish('test.event', {});

      expect(executionOrder).toEqual([3, 2, 1]);
    });
  });

  describe('异步事件处理', () => {
    test('应该支持异步事件处理器', async () => {
      const handler = jest.fn(async (data) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        // 不返回值，只处理副作用
        console.log('Processed:', data.value * 2);
      });

      eventBus.subscribe('async.event', handler);
      eventBus.publish('async.event', { value: 5 });

      // 等待异步处理器完成
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(handler).toHaveBeenCalled();
    });

    test('异步处理器错误不应该影响其他处理器', async () => {
      const errorHandler = jest.fn(async () => {
        throw new Error('Async error');
      });

      const normalHandler = jest.fn();

      eventBus.subscribe('test.event', errorHandler);
      eventBus.subscribe('test.event', normalHandler);

      eventBus.publish('test.event', {});

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
    });
  });

  describe('事件历史', () => {
    test('应该记录事件历史', () => {
      eventBus.publish('event.1', { data: 1 });
      eventBus.publish('event.2', { data: 2 });
      eventBus.publish('event.3', { data: 3 });

      const history = eventBus.getHistory();

      expect(history).toHaveLength(3);
      expect(history[0].event).toBe('event.1');
      expect(history[1].event).toBe('event.2');
      expect(history[2].event).toBe('event.3');
    });

    test('应该能够过滤特定事件的历史', () => {
      eventBus.publish('event.a', { data: 1 });
      eventBus.publish('event.b', { data: 2 });
      eventBus.publish('event.a', { data: 3 });

      const historyA = eventBus.getHistory('event.a');

      expect(historyA).toHaveLength(2);
      expect(historyA[0].data).toEqual({ data: 1 });
      expect(historyA[1].data).toEqual({ data: 3 });
    });

    test('应该能够限制历史记录数量', () => {
      for (let i = 0; i < 10; i++) {
        eventBus.publish('test.event', { index: i });
      }

      const recentHistory = eventBus.getHistory(undefined, 5);

      expect(recentHistory).toHaveLength(5);
      expect(recentHistory[0].data.index).toBe(5);
      expect(recentHistory[4].data.index).toBe(9);
    });

    test('应该在超过最大历史大小时移除旧记录', () => {
      const smallEventBus = new EventBus({ maxHistorySize: 3 });

      for (let i = 0; i < 5; i++) {
        smallEventBus.publish('test.event', { index: i });
      }

      const history = smallEventBus.getHistory();

      expect(history).toHaveLength(3);
      expect(history[0].data.index).toBe(2);
      expect(history[2].data.index).toBe(4);
    });
  });

  describe('事件重放', () => {
    test('应该能够重放特定事件', () => {
      const handler = jest.fn();

      eventBus.publish('test.event', { count: 1 });
      eventBus.publish('test.event', { count: 2 });

      eventBus.subscribe('test.event', handler);

      eventBus.replay('test.event');

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, { count: 1 });
      expect(handler).toHaveBeenNthCalledWith(2, { count: 2 });
    });

    test('应该能够从特定时间戳开始重放', () => {
      const handler = jest.fn();

      eventBus.publish('test.event', { time: 'before' });

      const timestamp = Date.now();

      eventBus.publish('test.event', { time: 'after' });

      eventBus.subscribe('test.event', handler);
      eventBus.replay('test.event', timestamp);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ time: 'after' });
    });
  });

  describe('订阅者管理', () => {
    test('应该正确返回订阅者数量', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      expect(eventBus.subscriberCount('test.event')).toBe(0);

      eventBus.subscribe('test.event', handler1);
      expect(eventBus.subscriberCount('test.event')).toBe(1);

      eventBus.subscribe('test.event', handler2);
      eventBus.subscribe('test.event', handler3);
      expect(eventBus.subscriberCount('test.event')).toBe(3);
    });

    test('应该能够取消特定事件的所有订阅', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.subscribe('test.event', handler1);
      eventBus.subscribe('test.event', handler2);

      expect(eventBus.subscriberCount('test.event')).toBe(2);

      eventBus.unsubscribeAll('test.event');

      expect(eventBus.subscriberCount('test.event')).toBe(0);

      eventBus.publish('test.event', {});

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    test('应该返回所有已注册的事件', () => {
      eventBus.subscribe('event.1', jest.fn());
      eventBus.subscribe('event.2', jest.fn());
      eventBus.subscribe('event.3', jest.fn());

      const events = eventBus.registeredEvents();

      expect(events).toContain('event.1');
      expect(events).toContain('event.2');
      expect(events).toContain('event.3');
      expect(events).toHaveLength(3);
    });
  });

  describe('错误处理', () => {
    test('应该捕获并记录同步处理器中的错误', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });

      const normalHandler = jest.fn();

      eventBus.subscribe('test.event', errorHandler);
      eventBus.subscribe('test.event', normalHandler);

      eventBus.publish('test.event', {});

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});

describe('TypedEventBus', () => {
  let eventBus: TypedEventBus;

  beforeEach(() => {
    eventBus = new TypedEventBus();
  });

  test('应该提供类型安全的事件处理', () => {
    const taskHandler = jest.fn();

    eventBus.on(EventType.TASK_CREATED, taskHandler);
    eventBus.emit(EventType.TASK_CREATED, { taskId: 'task-123' });

    expect(taskHandler).toHaveBeenCalledWith({ taskId: 'task-123' });
  });

  test('应该提供类型安全的一次性订阅', () => {
    const handler = jest.fn();

    eventBus.once(EventType.TASK_COMPLETED, handler);

    eventBus.emit(EventType.TASK_COMPLETED, {
      taskId: 'task-456',
      duration: 1000
    });

    eventBus.emit(EventType.TASK_COMPLETED, {
      taskId: 'task-789',
      duration: 2000
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      taskId: 'task-456',
      duration: 1000
    });
  });

  test('应该支持所有预定义的事件类型', () => {
    const handlers = {
      taskProgress: jest.fn(),
      cacheHit: jest.fn(),
      serviceError: jest.fn()
    };

    eventBus.on(EventType.TASK_PROGRESS, handlers.taskProgress);
    eventBus.on(EventType.CACHE_HIT, handlers.cacheHit);
    eventBus.on(EventType.SERVICE_ERROR, handlers.serviceError);

    eventBus.emit(EventType.TASK_PROGRESS, {
      taskId: 'task-1',
      progress: 50,
      stage: 'processing'
    });

    eventBus.emit(EventType.CACHE_HIT, { key: 'cache-key' });

    eventBus.emit(EventType.SERVICE_ERROR, {
      service: 'ai-service',
      operation: 'generate',
      error: 'API error'
    });

    expect(handlers.taskProgress).toHaveBeenCalled();
    expect(handlers.cacheHit).toHaveBeenCalled();
    expect(handlers.serviceError).toHaveBeenCalled();
  });
});

describe('EventAggregator', () => {
  test('应该聚合多个事件', () => {
    const eventBus = new EventBus();
    const aggregator = new EventAggregator(eventBus, 100);
    const aggregatedHandler = jest.fn();

    eventBus.subscribe('source.event:aggregated', aggregatedHandler);

    // 发布3个源事件
    eventBus.publish('source.event', { data: 1 });
    eventBus.publish('source.event', { data: 2 });
    eventBus.publish('source.event', { data: 3 });

    // 等待聚合窗口
    jest.advanceTimersByTime(150);

    expect(aggregatedHandler).toHaveBeenCalled();
    aggregator.destroy();
  });

  test('应该在达到阈值时立即聚合', () => {
    jest.useFakeTimers();

    const eventBus = new EventBus();
    const aggregator = new EventAggregator(eventBus, 1000);
    const aggregatedHandler = jest.fn();

    eventBus.subscribe('source.event:aggregated', aggregatedHandler);

    // 发布达到阈值的数量
    aggregator.aggregate('source.event', 'target.event', 3);

    eventBus.publish('source.event', { data: 1 });
    eventBus.publish('source.event', { data: 2 });
    eventBus.publish('source.event', { data: 3 });

    expect(aggregatedHandler).toHaveBeenCalled();

    aggregator.destroy();
    jest.useRealTimers();
  });
});
