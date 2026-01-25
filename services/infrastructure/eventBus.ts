/**
 * 事件总线实现
 *
 * 提供发布-订阅模式的事件系统：
 * 1. 同步事件处理
 * 2. 异步事件处理
 * 3. 事件持久化（可选）
 * 4. 事件重放（可选）
 */

import { IEventBus } from '../intelligentDocumentService';

// ============================================================================
// 事件类型定义
// ============================================================================

export enum EventType {
  // 任务事件
  TASK_CREATED = 'task:created',
  TASK_STARTED = 'task:started',
  TASK_COMPLETED = 'task:completed',
  TASK_FAILED = 'task:failed',
  TASK_CANCELLED = 'task:cancelled',
  TASK_PAUSED = 'task:paused',
  TASK_RESUMED = 'task:resumed',
  TASK_PROGRESS = 'task:progress',
  TASK_AWAITING_INPUT = 'task:awaiting_input',

  // AI事件
  AI_ROUND_STARTED = 'ai:round_started',
  AI_ROUND_COMPLETED = 'ai:round_completed',
  AI_ROUND_FAILED = 'ai:round_failed',
  AI_ROUND_CANCELLED = 'ai:round_cancelled',

  // 错误事件
  SERVICE_ERROR = 'service:error',
  VALIDATION_WARNING = 'task:validation_warning',

  // 缓存事件
  CACHE_HIT = 'cache:hit',
  CACHE_MISS = 'cache:miss',
  CACHE_EXPIRED = 'cache:expired',

  // 用户事件
  USER_FEEDBACK = 'user:feedback',
  USER_INTERVENTION = 'user:intervention'
}

// ============================================================================
// 事件处理器类型
// ============================================================================

type EventHandler<T = any> = (data: T) => void | Promise<void>;

interface EventSubscription {
  id: string;
  event: string;
  handler: EventHandler;
  once: boolean;
  priority: number;
}

// ============================================================================
// 事件总线实现
// ============================================================================

export class EventBus implements IEventBus {
  private handlers: Map<string, EventSubscription[]> = new Map();
  private eventHistory: Array<{ event: string; data: any; timestamp: number }> = [];
  private maxHistorySize: number = 1000;

  constructor(config?: { maxHistorySize?: number }) {
    if (config?.maxHistorySize) {
      this.maxHistorySize = config.maxHistorySize;
    }
  }

  /**
   * 发布事件
   */
  publish(event: string, data: any): void {
    // 记录到历史
    this.addToHistory(event, data);

    // 获取所有处理器
    const subscriptions = this.handlers.get(event);
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    // 按优先级排序
    const sortedSubscriptions = [...subscriptions].sort((a, b) => b.priority - a.priority);

    // 执行处理器
    for (const subscription of sortedSubscriptions) {
      try {
        const result = subscription.handler(data);

        // 支持异步处理器
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`[EventBus] Error in async handler for ${event}:`, error);
          });
        }

        // 如果是一次性订阅，执行后移除
        if (subscription.once) {
          this.unsubscribe(event, subscription.handler);
        }
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${event}:`, error);
      }
    }
  }

  /**
   * 订阅事件
   */
  subscribe(event: string, handler: EventHandler): () => void {
    return this.subscribeWithOptions(event, handler, {
      once: false,
      priority: 0
    });
  }

  /**
   * 订阅事件（一次性）
   */
  subscribeOnce(event: string, handler: EventHandler): () => void {
    return this.subscribeWithOptions(event, handler, {
      once: true,
      priority: 0
    });
  }

  /**
   * 订阅事件（带优先级）
   */
  subscribeWithPriority(
    event: string,
    handler: EventHandler,
    priority: number
  ): () => void {
    return this.subscribeWithOptions(event, handler, {
      once: false,
      priority
    });
  }

  /**
   * 取消订阅
   */
  unsubscribe(event: string, handler: EventHandler): void {
    const subscriptions = this.handlers.get(event);
    if (!subscriptions) {
      return;
    }

    const index = subscriptions.findIndex(sub => sub.handler === handler);
    if (index !== -1) {
      subscriptions.splice(index, 1);
    }

    // 如果没有订阅者了，删除事件
    if (subscriptions.length === 0) {
      this.handlers.delete(event);
    }
  }

  /**
   * 取消某个事件的所有订阅
   */
  unsubscribeAll(event: string): void {
    this.handlers.delete(event);
  }

  /**
   * 获取事件的订阅者数量
   */
  subscriberCount(event: string): number {
    const subscriptions = this.handlers.get(event);
    return subscriptions ? subscriptions.length : 0;
  }

  /**
   * 获取所有已注册的事件
   */
  registeredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 清空所有订阅
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * 获取事件历史
   */
  getHistory(event?: string, limit?: number): Array<{ event: string; data: any; timestamp: number }> {
    let history = this.eventHistory;

    if (event) {
      history = history.filter(e => e.event === event);
    }

    if (limit) {
      history = history.slice(-limit);
    }

    return history;
  }

  /**
   * 重放事件
   */
  replay(event?: string, fromTimestamp?: number): void {
    let history = this.eventHistory;

    if (event) {
      history = history.filter(e => e.event === event);
    }

    if (fromTimestamp) {
      history = history.filter(e => e.timestamp >= fromTimestamp);
    }

    for (const entry of history) {
      this.publish(entry.event, entry.data);
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private subscribeWithOptions(
    event: string,
    handler: EventHandler,
    options: { once: boolean; priority: number }
  ): () => void {
    let subscriptions = this.handlers.get(event);

    if (!subscriptions) {
      subscriptions = [];
      this.handlers.set(event, subscriptions);
    }

    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      event,
      handler,
      once: options.once,
      priority: options.priority
    };

    subscriptions.push(subscription);

    // 返回取消订阅函数
    return () => this.unsubscribe(event, handler);
  }

  private addToHistory(event: string, data: any): void {
    this.eventHistory.push({
      event,
      data,
      timestamp: Date.now()
    });

    // 限制历史大小
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// 类型安全的事件总线
// ============================================================================

export interface TypedEventMap {
  [EventType.TASK_CREATED]: { taskId: string };
  [EventType.TASK_STARTED]: { taskId: string };
  [EventType.TASK_COMPLETED]: { taskId: string; duration: number };
  [EventType.TASK_FAILED]: { taskId: string; error: Error };
  [EventType.TASK_CANCELLED]: { taskId: string };
  [EventType.TASK_PAUSED]: { taskId: string };
  [EventType.TASK_RESUMED]: { taskId: string };
  [EventType.TASK_PROGRESS]: { taskId: string; progress: number; stage: string };
  [EventType.TASK_AWAITING_INPUT]: { taskId: string; mappingScheme?: any };

  [EventType.AI_ROUND_STARTED]: { round: string };
  [EventType.AI_ROUND_COMPLETED]: { round: string; response: any; duration: number };
  [EventType.AI_ROUND_FAILED]: { round: string; error: Error };

  [EventType.SERVICE_ERROR]: { service: string; operation: string; error: string };
  [EventType.VALIDATION_WARNING]: { taskId: string; warnings: string[] };

  [EventType.CACHE_HIT]: { key: string };
  [EventType.CACHE_MISS]: { key: string };
  [EventType.CACHE_EXPIRED]: { key: string };

  [EventType.USER_FEEDBACK]: { taskId: string; feedback: any };
  [EventType.USER_INTERVENTION]: { taskId: string; action: string };
}

/**
 * 类型安全的事件总线
 */
export class TypedEventBus extends EventBus {
  on<E extends keyof TypedEventMap>(
    event: E,
    handler: (data: TypedEventMap[E]) => void
  ): () => void {
    return this.subscribe(event, handler as EventHandler);
  }

  once<E extends keyof TypedEventMap>(
    event: E,
    handler: (data: TypedEventMap[E]) => void
  ): () => void {
    return this.subscribeOnce(event, handler as EventHandler);
  }

  emit<E extends keyof TypedEventMap>(event: E, data: TypedEventMap[E]): void {
    this.publish(event, data);
  }
}

// ============================================================================
// 事件聚合器
// ============================================================================

/**
 * 事件聚合器 - 将多个事件组合成一个事件
 */
export class EventAggregator {
  private eventCounts: Map<string, number> = new Map();
  private eventBuffer: Map<string, any[]> = new Map();
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly eventBus: EventBus,
    private readonly windowMs: number = 1000
  ) {
    this.startTimer();
  }

  /**
   * 聚合事件
   */
  aggregate(
    sourceEvent: string,
    targetEvent: string,
    threshold: number
  ): void {
    this.eventBus.subscribe(sourceEvent, (data) => {
      // 增加计数
      const count = (this.eventCounts.get(sourceEvent) || 0) + 1;
      this.eventCounts.set(sourceEvent, count);

      // 缓冲数据
      const buffer = this.eventBuffer.get(sourceEvent) || [];
      buffer.push(data);
      this.eventBuffer.set(sourceEvent, buffer);

      // 检查是否达到阈值
      if (count >= threshold) {
        this.eventBus.publish(targetEvent, {
          sourceEvent,
          count,
          data: buffer
        });

        // 重置
        this.eventCounts.delete(sourceEvent);
        this.eventBuffer.delete(sourceEvent);
      }
    });
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      const now = Date.now();

      // 发布所有待聚合的事件
      for (const [event, count] of this.eventCounts.entries()) {
        if (count > 0) {
          const buffer = this.eventBuffer.get(event) || [];

          this.eventBus.publish(`${event}:aggregated`, {
            event,
            count,
            data: buffer,
            windowStart: now - this.windowMs,
            windowEnd: now
          });

          // 重置
          this.eventCounts.delete(event);
          this.eventBuffer.delete(event);
        }
      }
    }, this.windowMs);
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}

// ============================================================================
// 事件过滤器
// ============================================================================

/**
 * 事件过滤器 - 根据条件过滤事件
 */
export class EventFilter {
  constructor(
    private readonly eventBus: EventBus,
    private readonly filter: (event: string, data: any) => boolean
  ) {}

  /**
   * 订阅过滤后的事件
   */
  subscribeFiltered(
    eventPattern: string | RegExp,
    handler: EventHandler
  ): () => void {
    const wrappedHandler = (data: any, originalEvent: string) => {
      if (this.matchEvent(originalEvent, eventPattern) && this.filter(originalEvent, data)) {
        handler(data);
      }
    };

    // 订阅所有事件（因为我们需要知道原始事件名）
    return this.eventBus.subscribe('*', wrappedHandler as EventHandler);
  }

  private matchEvent(event: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return event === pattern || event.startsWith(pattern);
    } else {
      return pattern.test(event);
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createEventBus(config?: { maxHistorySize?: number }): EventBus {
  return new EventBus(config);
}

export function createTypedEventBus(config?: { maxHistorySize?: number }): TypedEventBus {
  return new TypedEventBus(config);
}

// ============================================================================
// 导出
// ============================================================================

export type { EventHandler, EventSubscription };
