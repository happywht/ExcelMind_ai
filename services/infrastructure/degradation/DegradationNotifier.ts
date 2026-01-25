/**
 * 降级通知服务
 *
 * 负责向前端和监控系统发送降级状态变更通知
 * 支持实时推送和历史记录
 *
 * @module infrastructure/degradation/DegradationNotifier
 * @author Backend Technical Lead
 * @version 1.0.0
 */

import {
  DegradationMode,
  DegradationLevel,
  DegradationEvent,
  DegradationNotification,
  DegradationMetrics,
  DegradationHistory,
  DegradationEventType
} from '../../../types/degradationTypes';

/**
 * 通知回调函数类型
 */
export type NotificationCallback = (notification: DegradationNotification) => void;

/**
 * 事件监听器类型
 */
export type EventListener = (event: DegradationEvent) => void;

/**
 * 通知器配置
 */
interface NotifierConfig {
  /** 是否启用控制台日志 */
  enableConsole: boolean;
  /** 是否持久化历史记录 */
  persistHistory: boolean;
  /** 历史记录最大数量 */
  maxHistorySize: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: NotifierConfig = {
  enableConsole: true,
  persistHistory: true,
  maxHistorySize: 1000
};

/**
 * 降级通知器类
 */
export class DegradationNotifier {
  private config: NotifierConfig;
  private notificationCallbacks: Set<NotificationCallback> = new Set();
  private eventListeners: Set<EventListener> = new Set();
  private eventHistory: DegradationEvent[] = [];
  private history: DegradationHistory[] = [];

  constructor(config?: Partial<NotifierConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enableConsole) {
      console.log('[DegradationNotifier] Initialized with config:', this.config);
    }
  }

  /**
   * 注册通知回调
   */
  public onNotification(callback: NotificationCallback): () => void {
    this.notificationCallbacks.add(callback);

    // 返回取消订阅函数
    return () => {
      this.notificationCallbacks.delete(callback);
    };
  }

  /**
   * 注册事件监听器
   */
  public onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);

    // 返回取消订阅函数
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  /**
   * 通知模式变更
   */
  public notifyModeChange(
    from: DegradationMode,
    to: DegradationMode,
    reason: string,
    metrics?: DegradationMetrics
  ): void {
    const event: DegradationEvent = {
      type: DegradationEventType.MODE_CHANGED,
      timestamp: new Date(),
      fromMode: from,
      toMode: to,
      message: `Mode changed from ${from} to ${to}`,
      data: { reason, metrics }
    };

    this.recordEvent(event);
    this.emitEvent(event);

    const notification = this.createModeChangeNotification(from, to, reason);
    this.emitNotification(notification);

    // 记录历史
    if (this.config.persistHistory) {
      this.recordHistory({
        id: this.generateId(),
        timestamp: event.timestamp,
        eventType: event.type,
        fromMode: from,
        toMode: to,
        reason,
        metricsSnapshot: metrics || this.createEmptyMetrics()
      });
    }
  }

  /**
   * 通知预警触发
   */
  public notifyWarning(
    type: string,
    message: string,
    level: DegradationLevel,
    data?: any
  ): void {
    const event: DegradationEvent = {
      type: DegradationEventType.WARNING_TRIGGERED,
      timestamp: new Date(),
      message,
      data: { warningType: type, level, ...data }
    };

    this.recordEvent(event);
    this.emitEvent(event);

    const notification: DegradationNotification = {
      type: level === DegradationLevel.CRITICAL ? 'error' : 'warning',
      title: `${type} Warning`,
      message,
      currentMode: this.inferCurrentMode(data),
      suggestedActions: this.getSuggestedActions(type, level),
      duration: level === DegradationLevel.CRITICAL ? -1 : 5000
    };

    this.emitNotification(notification);
  }

  /**
   * 广播指标更新
   */
  public broadcastMetrics(metrics: DegradationMetrics): void {
    const event: DegradationEvent = {
      type: DegradationEventType.METRICS_UPDATED,
      timestamp: new Date(),
      message: 'Metrics updated',
      data: { metrics }
    };

    this.recordEvent(event);
    this.emitEvent(event);

    // 检查是否需要预警
    this.checkMetricThresholds(metrics);
  }

  /**
   * 通知恢复尝试
   */
  public notifyRecoveryAttempt(
    targetMode: DegradationMode,
    reason: string
  ): void {
    const event: DegradationEvent = {
      type: DegradationEventType.RECOVERY_ATTEMPT,
      timestamp: new Date(),
      toMode: targetMode,
      message: `Attempting recovery to ${targetMode} mode`,
      data: { reason }
    };

    this.recordEvent(event);
    this.emitEvent(event);

    const notification: DegradationNotification = {
      type: 'info',
      title: 'Recovery Attempt',
      message: `Attempting to recover to ${targetMode} mode: ${reason}`,
      currentMode: targetMode,
      duration: 3000
    };

    this.emitNotification(notification);
  }

  /**
   * 通知恢复成功
   */
  public notifyRecoverySuccess(
    from: DegradationMode,
    to: DegradationMode,
    reason: string
  ): void {
    const event: DegradationEvent = {
      type: DegradationEventType.RECOVERY_SUCCESS,
      timestamp: new Date(),
      fromMode: from,
      toMode: to,
      message: `Successfully recovered from ${from} to ${to}`,
      data: { reason }
    };

    this.recordEvent(event);
    this.emitEvent(event);

    const notification: DegradationNotification = {
      type: 'success',
      title: 'Recovery Successful',
      message: `Successfully recovered to ${to} mode`,
      currentMode: to,
      duration: 5000
    };

    this.emitNotification(notification);

    // 记录历史
    if (this.config.persistHistory) {
      this.recordHistory({
        id: this.generateId(),
        timestamp: event.timestamp,
        eventType: event.type,
        fromMode: from,
        toMode: to,
        reason,
        metricsSnapshot: this.createEmptyMetrics()
      });
    }
  }

  /**
   * 发射事件
   */
  private emitEvent(event: DegradationEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[DegradationNotifier] Event listener error:', error);
      }
    });

    if (this.config.enableConsole) {
      const logMethod = this.getLogLevelForEvent(event);
      console[logMethod](`[DegradationNotifier] Event:`, event);
    }
  }

  /**
   * 发射通知
   */
  private emitNotification(notification: DegradationNotification): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('[DegradationNotifier] Notification callback error:', error);
      }
    });

    if (this.config.enableConsole) {
      const logMethod = this.getLogLevelForNotification(notification);
      console[logMethod](`[DegradationNotifier] Notification:`, notification);
    }
  }

  /**
   * 记录事件
   */
  private recordEvent(event: DegradationEvent): void {
    this.eventHistory.push(event);

    // 限制历史大小
    if (this.eventHistory.length > this.config.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * 记录历史
   */
  private recordHistory(history: DegradationHistory): void {
    this.history.push(history);

    // 限制历史大小
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }

    // TODO: 持久化到存储
    if (this.config.persistHistory) {
      this.persistHistory(history);
    }
  }

  /**
   * 持久化历史记录
   */
  private persistHistory(history: DegradationHistory): void {
    // 实际实现中，这里会保存到数据库或本地存储
    // 暂时只记录日志
    if (this.config.enableConsole) {
      console.log('[DegradationNotifier] Persisting history:', history);
    }
  }

  /**
   * 创建模式变更通知
   */
  private createModeChangeNotification(
    from: DegradationMode,
    to: DegradationMode,
    reason: string
  ): DegradationNotification {
    const titles: Record<DegradationMode, string> = {
      [DegradationMode.BROWSER]: 'Browser Mode',
      [DegradationMode.HYBRID]: 'Hybrid Mode',
      [DegradationMode.BACKEND]: 'Backend Mode'
    };

    const descriptions: Record<DegradationMode, string> = {
      [DegradationMode.BROWSER]: 'Local execution mode - fastest performance',
      [DegradationMode.HYBRID]: 'Hybrid mode - balancing performance and capabilities',
      [DegradationMode.BACKEND]: 'Server mode - full capabilities with network dependency'
    };

    const isDowngrade = this.isModeDowngrade(from, to);

    return {
      type: isDowngrade ? 'warning' : 'success',
      title: `Switched to ${titles[to]}`,
      message: `${reason}\n\n${descriptions[to]}`,
      currentMode: to,
      suggestedActions: this.getSuggestedActionsForMode(to),
      duration: isDowngrade ? -1 : 5000 // 降级通知持续显示
    };
  }

  /**
   * 判断是否是降级
   */
  private isModeDowngrade(from: DegradationMode, to: DegradationMode): boolean {
    const modePriority = {
      [DegradationMode.BROWSER]: 3,
      [DegradationMode.HYBRID]: 2,
      [DegradationMode.BACKEND]: 1
    };

    return modePriority[to] < modePriority[from];
  }

  /**
   * 获取模式建议操作
   */
  private getSuggestedActionsForMode(mode: DegradationMode): string[] {
    const actions: Record<DegradationMode, string[]> = {
      [DegradationMode.BROWSER]: [
        'Continue with current operations',
        'Large files will be processed slower'
      ],
      [DegradationMode.HYBRID]: [
        'Your files will be processed with optimal performance',
        'Network connection required for AI features'
      ],
      [DegradationMode.BACKEND]: [
        'Upload your files for server-side processing',
        'Processing may take slightly longer',
        'All features available'
      ]
    };

    return actions[mode];
  }

  /**
   * 获取建议操作
   */
  private getSuggestedActions(warningType: string, level: DegradationLevel): string[] {
    const actions: Record<string, string[]> = {
      'memory': [
        'Close unused tabs',
        'Reduce file size',
        'Wait for memory to be freed'
      ],
      'api': [
        'Check your internet connection',
        'Try again in a moment',
        'Switch to offline mode if available'
      ],
      'execution': [
        'Reduce data complexity',
        'Break into smaller tasks',
        'Contact support if issue persists'
      ]
    };

    return actions[warningType] || ['Please try again later'];
  }

  /**
   * 推断当前模式
   */
  private inferCurrentMode(data?: any): DegradationMode {
    // 如果数据中包含模式信息，直接返回
    if (data?.currentMode) {
      return data.currentMode;
    }

    // 否则返回默认模式
    return DegradationMode.BROWSER;
  }

  /**
   * 检查指标阈值
   */
  private checkMetricThresholds(metrics: DegradationMetrics): void {
    // 内存预警
    if (metrics.memoryUsage > 75) {
      this.notifyWarning(
        'memory',
        `High memory usage: ${metrics.memoryUsage.toFixed(1)}%`,
        metrics.memoryUsage > 90 ? DegradationLevel.CRITICAL : DegradationLevel.WARNING,
        { metrics }
      );
    }

    // API失败率预警
    if (metrics.apiFailureRate > 20) {
      this.notifyWarning(
        'api',
        `High API failure rate: ${metrics.apiFailureRate.toFixed(1)}%`,
        metrics.apiFailureRate > 50 ? DegradationLevel.CRITICAL : DegradationLevel.WARNING,
        { metrics }
      );
    }

    // 执行时间预警
    if (metrics.avgExecutionTime > 30) {
      this.notifyWarning(
        'execution',
        `Slow execution: ${metrics.avgExecutionTime.toFixed(1)}s average`,
        metrics.avgExecutionTime > 60 ? DegradationLevel.CRITICAL : DegradationLevel.WARNING,
        { metrics }
      );
    }
  }

  /**
   * 获取事件日志级别
   */
  private getLogLevelForEvent(event: DegradationEvent): 'log' | 'warn' | 'error' {
    if (event.type === 'warning_triggered') {
      return 'warn';
    }
    return 'log';
  }

  /**
   * 获取通知日志级别
   */
  private getLogLevelForNotification(notification: DegradationNotification): 'log' | 'warn' | 'error' {
    if (notification.type === 'error') {
      return 'error';
    } else if (notification.type === 'warning') {
      return 'warn';
    }
    return 'log';
  }

  /**
   * 创建空指标
   */
  private createEmptyMetrics(): DegradationMetrics {
    return {
      memoryUsage: 0,
      fileSize: 0,
      apiFailureRate: 0,
      avgExecutionTime: 0,
      consecutiveFailures: 0,
      lastUpdate: new Date()
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取事件历史
   */
  public getEventHistory(limit?: number): DegradationEvent[] {
    if (limit) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  /**
   * 获取降级历史
   */
  public getHistory(limit?: number): DegradationHistory[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  /**
   * 清除历史
   */
  public clearHistory(): void {
    this.eventHistory = [];
    this.history = [];
    console.log('[DegradationNotifier] History cleared');
  }

  /**
   * 销毁通知器
   */
  public destroy(): void {
    this.notificationCallbacks.clear();
    this.eventListeners.clear();
    this.eventHistory = [];
    this.history = [];
    console.log('[DegradationNotifier] Destroyed');
  }
}

/**
 * 导出单例工厂函数
 */
export const createDegradationNotifier = (config?: Partial<NotifierConfig>): DegradationNotifier => {
  return new DegradationNotifier(config);
};

/**
 * 默认导出
 */
export default DegradationNotifier;
