/**
 * API 熔断器服务
 *
 * 实现 AI API 调用的熔断保护模式
 * 防止级联故障，提供自动恢复机制
 *
 * @module infrastructure/degradation/APICircuitBreaker
 * @author Backend Technical Lead
 * @version 1.0.0
 */

import {
  CircuitBreakerState,
  DegradationLevel
} from '../../../types/degradationTypes';

/**
 * 熔断器状态枚举
 */
enum CircuitState {
  /** 关闭 - 正常工作 */
  CLOSED = 'closed',
  /** 开启 - 熔断打开，拒绝请求 */
  OPEN = 'open',
  /** 半开 - 尝试恢复 */
  HALF_OPEN = 'half_open'
}

/**
 * 熔断器配置接口
 */
interface CircuitBreakerConfig {
  /** 失败率阈值 (%) 超过此值将触发熔断 */
  failureThreshold: number;
  /** 最小请求数 - 达到此数量后才开始计算失败率 */
  minimumRequests: number;
  /** 熔断开启持续时间 (milliseconds) */
  openDuration: number;
  /** 半开状态下的测试请求数 */
  halfOpenMaxCalls: number;
  /** 滑动窗口大小 (请求数) */
  slidingWindowSize: number;
  /** 重置超时时间 (milliseconds) */
  resetTimeout: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 50,    // 50% 失败率触发熔断
  minimumRequests: 10,     // 至少 10 次请求后才开始熔断判断
  openDuration: 60000,     // 熔断持续 60 秒
  halfOpenMaxCalls: 3,     // 半开状态允许 3 次测试请求
  slidingWindowSize: 100,  // 滑动窗口保留最近 100 次请求
  resetTimeout: 300000     // 5 分钟无活动后重置统计
};

/**
 * API 调用结果记录
 */
interface CallRecord {
  success: boolean;
  timestamp: Date;
  duration?: number;
}

/**
 * API 熔断器类
 */
export class APICircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState;
  private callHistory: CallRecord[] = [];
  private openedAt?: Date;
  private halfOpenCallCount = 0;
  private lastActivityTime = new Date();
  private resetTimer?: NodeJS.Timeout;

  // 统计数据
  private stats = {
    totalOpens: 0,
    totalSuccessfulCalls: 0,
    totalFailedCalls: 0,
    totalCalls: 0
  };

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = CircuitState.CLOSED;
    this.startResetTimer();
  }

  /**
   * 记录 API 调用结果
   */
  public recordCall(success: boolean, duration?: number): void {
    this.updateActivity();

    const record: CallRecord = {
      success,
      timestamp: new Date(),
      duration
    };

    this.callHistory.push(record);
    this.stats.totalCalls++;

    if (success) {
      this.stats.totalSuccessfulCalls++;
    } else {
      this.stats.totalFailedCalls++;
    }

    // 维护滑动窗口
    this.maintainSlidingWindow();

    // 根据当前状态处理
    switch (this.state) {
      case CircuitState.CLOSED:
        this.handleClosedState();
        break;
      case CircuitState.HALF_OPEN:
        this.handleHalfOpenState(success);
        break;
      case CircuitState.OPEN:
        // 开启状态下不处理记录，只检查是否应该关闭
        this.checkShouldClose();
        break;
    }
  }

  /**
   * 检查是否允许请求
   */
  public allowRequest(): boolean {
    this.updateActivity();

    // 检查是否应该从开启状态转换到半开
    if (this.state === CircuitState.OPEN && this.checkShouldClose()) {
      return true;
    }

    // 开启状态拒绝请求
    if (this.state === CircuitState.OPEN) {
      console.warn('[APICircuitBreaker] Circuit is OPEN, rejecting request');
      return false;
    }

    return true;
  }

  /**
   * 检查熔断器是否开启
   */
  public isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * 获取当前状态
   */
  public getState(): CircuitBreakerState {
    const currentState = this.calculateStats();

    return {
      isOpen: this.state === CircuitState.OPEN,
      failureCount: this.stats.totalFailedCalls,
      successCount: this.stats.totalSuccessfulCalls,
      totalCalls: this.stats.totalCalls,
      failureRate: currentState.failureRate,
      lastFailureTime: this.getLastFailureTime(),
      lastSuccessTime: this.getLastSuccessTime(),
      halfOpenRequests: this.halfOpenCallCount,
      openedAt: this.openedAt
    };
  }

  /**
   * 重置熔断器
   */
  public reset(): void {
    console.log('[APICircuitBreaker] Resetting circuit breaker');

    this.state = CircuitState.CLOSED;
    this.callHistory = [];
    this.openedAt = undefined;
    this.halfOpenCallCount = 0;

    // 不重置统计数据，保留历史记录
  }

  /**
   * 手动开启熔断器
   */
  public open(reason: string = 'Manual open'): void {
    if (this.state !== CircuitState.OPEN) {
      console.log(`[APICircuitBreaker] Manually opening circuit: ${reason}`);
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * 手动关闭熔断器
   */
  public close(): void {
    if (this.state !== CircuitState.CLOSED) {
      console.log('[APICircuitBreaker] Manually closing circuit');
      this.transitionTo(CircuitState.CLOSED);
    }
  }

  /**
   * 处理关闭状态
   */
  private handleClosedState(): void {
    const stats = this.calculateStats();

    // 检查是否应该开启熔断
    if (stats.totalCalls >= this.config.minimumRequests &&
        stats.failureRate >= this.config.failureThreshold) {
      const message = `Failure rate ${stats.failureRate.toFixed(1)}% >= threshold ${this.config.failureThreshold}%`;
      console.warn(`[APICircuitBreaker] Opening circuit: ${message}`);
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * 处理半开状态
   */
  private handleHalfOpenState(success: boolean): void {
    this.halfOpenCallCount++;

    if (success) {
      // 成功的测试请求
      if (this.halfOpenCallCount >= this.config.halfOpenMaxCalls) {
        console.log('[APICircuitBreaker] Recovery successful, closing circuit');
        this.transitionTo(CircuitState.CLOSED);
      }
    } else {
      // 测试失败，重新打开
      console.warn('[APICircuitBreaker] Recovery failed, reopening circuit');
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * 检查是否应该关闭熔断器
   */
  private checkShouldClose(): boolean {
    if (this.state !== CircuitState.OPEN) {
      return false;
    }

    if (!this.openedAt) {
      return false;
    }

    const elapsed = Date.now() - this.openedAt.getTime();

    if (elapsed >= this.config.openDuration) {
      console.log('[APICircuitBreaker] Transitioning to HALF_OPEN for recovery test');
      this.transitionTo(CircuitState.HALF_OPEN);
      return true;
    }

    return false;
  }

  /**
   * 转换到新状态
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    // 状态转换时的初始化
    switch (newState) {
      case CircuitState.OPEN:
        this.openedAt = new Date();
        this.stats.totalOpens++;
        break;
      case CircuitState.HALF_OPEN:
        this.halfOpenCallCount = 0;
        break;
      case CircuitState.CLOSED:
        this.openedAt = undefined;
        this.halfOpenCallCount = 0;
        break;
    }

    console.log(`[APICircuitBreaker] State transition: ${oldState} -> ${newState}`);
  }

  /**
   * 维护滑动窗口
   */
  private maintainSlidingWindow(): void {
    if (this.callHistory.length > this.config.slidingWindowSize) {
      const excess = this.callHistory.length - this.config.slidingWindowSize;
      this.callHistory.splice(0, excess);
    }
  }

  /**
   * 计算统计数据
   */
  private calculateStats(): {
    totalCalls: number;
    failureCount: number;
    failureRate: number;
  } {
    const totalCalls = this.callHistory.length;
    const failureCount = this.callHistory.filter(r => !r.success).length;
    const failureRate = totalCalls > 0 ? (failureCount / totalCalls) * 100 : 0;

    return { totalCalls, failureCount, failureRate };
  }

  /**
   * 获取最后一次失败时间
   */
  private getLastFailureTime(): Date | undefined {
    for (let i = this.callHistory.length - 1; i >= 0; i--) {
      if (!this.callHistory[i].success) {
        return this.callHistory[i].timestamp;
      }
    }
    return undefined;
  }

  /**
   * 获取最后一次成功时间
   */
  private getLastSuccessTime(): Date | undefined {
    for (let i = this.callHistory.length - 1; i >= 0; i--) {
      if (this.callHistory[i].success) {
        return this.callHistory[i].timestamp;
      }
    }
    return undefined;
  }

  /**
   * 更新活动时间
   */
  private updateActivity(): void {
    this.lastActivityTime = new Date();
  }

  /**
   * 启动重置计时器
   */
  private startResetTimer(): void {
    if (this.resetTimer) {
      clearInterval(this.resetTimer);
    }

    this.resetTimer = setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivityTime.getTime();

      if (inactiveTime >= this.config.resetTimeout && this.state === CircuitState.CLOSED) {
        console.log('[APICircuitBreaker] Inactivity timeout, resetting history');
        this.callHistory = [];
      }
    }, 60000); // 每分钟检查一次
  }

  /**
   * 获取降级级别
   */
  public getDegradationLevel(): DegradationLevel {
    if (this.state === CircuitState.OPEN) {
      return DegradationLevel.CRITICAL;
    } else if (this.state === CircuitState.HALF_OPEN) {
      return DegradationLevel.WARNING;
    }

    const stats = this.calculateStats();
    if (stats.totalCalls >= this.config.minimumRequests) {
      const warningThreshold = this.config.failureThreshold * 0.7; // 70% of failure threshold

      if (stats.failureRate >= warningThreshold) {
        return DegradationLevel.WARNING;
      }
    }

    return DegradationLevel.NORMAL;
  }

  /**
   * 获取统计信息
   */
  public getStatistics(): {
    totalOpens: number;
    totalSuccessfulCalls: number;
    totalFailedCalls: number;
    totalCalls: number;
    currentState: CircuitState;
    uptimePercentage: number;
  } {
    const uptimePercentage = this.stats.totalCalls > 0
      ? (this.stats.totalSuccessfulCalls / this.stats.totalCalls) * 100
      : 100;

    return {
      totalOpens: this.stats.totalOpens,
      totalSuccessfulCalls: this.stats.totalSuccessfulCalls,
      totalFailedCalls: this.stats.totalFailedCalls,
      totalCalls: this.stats.totalCalls,
      currentState: this.state,
      uptimePercentage
    };
  }

  /**
   * 销毁熔断器
   */
  public destroy(): void {
    if (this.resetTimer) {
      clearInterval(this.resetTimer);
    }
  }
}

/**
 * 导出单例工厂函数
 */
export const createAPICircuitBreaker = (config?: Partial<CircuitBreakerConfig>): APICircuitBreaker => {
  return new APICircuitBreaker(config);
};

/**
 * 默认导出
 */
export default APICircuitBreaker;
