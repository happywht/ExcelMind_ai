/**
 * 内存监控服务
 *
 * 负责监控 Pyodide 内存使用情况，预测内存溢出风险
 * 提供内存清理和预警功能
 *
 * @module infrastructure/degradation/MemoryMonitor
 * @author Backend Technical Lead
 * @version 1.0.0
 */

import {
  MemoryStatus,
  DegradationLevel
} from '../../../types/degradationTypes';

/**
 * 内存监控配置
 */
interface MemoryMonitorConfig {
  /** 预警阈值 (%) */
  warningThreshold: number;
  /** 临界阈值 (%) */
  criticalThreshold: number;
  /** 监控间隔 (milliseconds) */
  monitorInterval: number;
  /** 清理触发阈值 (%) */
  cleanupThreshold: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: MemoryMonitorConfig = {
  warningThreshold: 75,
  criticalThreshold: 90,
  monitorInterval: 5000, // 5秒
  cleanupThreshold: 70
};

/**
 * 内存监控器类
 */
export class MemoryMonitor {
  private config: MemoryMonitorConfig;
  private currentStatus: MemoryStatus;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private history: MemoryStatus[] = [];
  private maxHistorySize = 100;

  // 浏览器环境下 Pyodide 的内存限制（约1.2GB）
  private readonly PYODIDE_MEMORY_LIMIT = 1.2 * 1024 * 1024 * 1024; // 1.2GB in bytes

  constructor(config?: Partial<MemoryMonitorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 初始化当前状态
    this.currentStatus = this.createInitialStatus();
  }

  /**
   * 创建初始内存状态
   */
  private createInitialStatus(): MemoryStatus {
    // 在浏览器环境中，尝试获取 Pyodide 内存信息
    const initialMemory = this.estimateMemoryUsage();

    return {
      total: this.PYODIDE_MEMORY_LIMIT,
      used: initialMemory,
      usagePercent: (initialMemory / this.PYODIDE_MEMORY_LIMIT) * 100,
      underPressure: false,
      overflowProbability: 0,
      lastCheck: new Date()
    };
  }

  /**
   * 估算当前内存使用量
   *
   * 注意：浏览器环境中无法直接获取 Pyodide 内存使用
   * 这里使用性能 API 和估算策略
   */
  private estimateMemoryUsage(): number {
    // 尝试使用 performance.memory (Chrome)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      // 转换为 bytes（Chrome 使用 KB）
      return memory.usedJSHeapSize * 1024;
    }

    // 降级策略：返回估算值（基于页面大小）
    if (typeof window !== 'undefined' && window.performance) {
      const entries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const totalSize = entries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
      return totalSize * 2; // 估算倍数
    }

    // 默认返回 100MB
    return 100 * 1024 * 1024;
  }

  /**
   * 开始监控
   */
  public startMonitoring(): void {
    if (this.monitoringInterval) {
      console.warn('[MemoryMonitor] Monitoring already started');
      return;
    }

    console.log('[MemoryMonitor] Starting memory monitoring');
    this.monitoringInterval = setInterval(() => {
      this.checkMemory();
    }, this.config.monitorInterval);

    // 立即执行一次检查
    this.checkMemory();
  }

  /**
   * 停止监控
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[MemoryMonitor] Stopped memory monitoring');
    }
  }

  /**
   * 检查内存状态
   */
  private checkMemory(): void {
    const usedMemory = this.estimateMemoryUsage();
    const usagePercent = (usedMemory / this.PYODIDE_MEMORY_LIMIT) * 100;
    const underPressure = usagePercent >= this.config.warningThreshold;
    const overflowProbability = this.calculateOverflowProbability(usagePercent);

    this.currentStatus = {
      total: this.PYODIDE_MEMORY_LIMIT,
      used: usedMemory,
      usagePercent,
      underPressure,
      overflowProbability,
      lastCheck: new Date()
    };

    // 记录历史
    this.recordHistory(this.currentStatus);

    // 触发预警
    if (underPressure) {
      this.handleMemoryPressure(usagePercent);
    }

    // 自动清理
    if (usagePercent >= this.config.cleanupThreshold) {
      this.triggerCleanup(usagePercent);
    }
  }

  /**
   * 计算内存溢出概率
   */
  private calculateOverflowProbability(usagePercent: number): number {
    // 使用 Sigmoid 函数计算溢出概率
    // 当 usagePercent 接近 100% 时，概率快速上升
    const x = (usagePercent - 75) / 10; // 在 75% 附近开始增长
    const probability = 1 / (1 + Math.exp(-x));
    return Math.max(0, Math.min(1, probability));
  }

  /**
   * 处理内存压力
   */
  private handleMemoryPressure(usagePercent: number): void {
    const level = this.getPressureLevel(usagePercent);
    const message = `[MemoryMonitor] Memory pressure detected: ${usagePercent.toFixed(1)}% (${level})`;

    if (level === DegradationLevel.CRITICAL) {
      console.error(message);
      // 触发紧急降级事件
      this.emitDegradationEvent('critical', usagePercent);
    } else {
      console.warn(message);
      this.emitDegradationEvent('warning', usagePercent);
    }
  }

  /**
   * 获取压力级别
   */
  private getPressureLevel(usagePercent: number): DegradationLevel {
    if (usagePercent >= this.config.criticalThreshold) {
      return DegradationLevel.CRITICAL;
    } else if (usagePercent >= this.config.warningThreshold) {
      return DegradationLevel.WARNING;
    }
    return DegradationLevel.NORMAL;
  }

  /**
   * 触发内存清理
   */
  private triggerCleanup(usagePercent: number): void {
    console.log(`[MemoryMonitor] Triggering cleanup at ${usagePercent.toFixed(1)}% usage`);

    try {
      // 1. 清理历史记录
      if (this.history.length > this.maxHistorySize) {
        this.history = this.history.slice(-this.maxHistorySize);
      }

      // 2. 尝试触发垃圾回收（如果可用）
      if (typeof global !== 'undefined' && (global as any).gc) {
        (global as any).gc();
        console.log('[MemoryMonitor] Garbage collection triggered');
      }

      // 3. 通知应用进行清理（通过事件）
      this.emitCleanupEvent();

      // 4. 重新检查内存
      setTimeout(() => this.checkMemory(), 1000);

    } catch (error) {
      console.error('[MemoryMonitor] Cleanup failed:', error);
    }
  }

  /**
   * 预测给定文件大小是否会导致溢出
   */
  public predictOverflow(fileSize: number): boolean {
    const projectedUsage = this.currentStatus.used + fileSize;
    const projectedPercent = (projectedUsage / this.PYODIDE_MEMORY_LIMIT) * 100;

    // 考虑安全边际（额外 20%）
    const safetyMargin = 1.2;
    const adjustedPercent = projectedPercent * safetyMargin;

    return adjustedPercent >= this.config.criticalThreshold;
  }

  /**
   * 预测给定操作的内存风险
   */
  public estimateOperationRisk(operation: 'parse' | 'transform' | 'export', rowCount: number): {
    riskLevel: 'low' | 'medium' | 'high';
    estimatedMemory: number;
    recommended: 'proceed' | 'caution' | 'abort';
  } {
    // 估算不同操作的内存消耗
    const bytesPerRow = {
      parse: 500,    // 解析阶段：每行约 500 bytes
      transform: 800, // 转换阶段：每行约 800 bytes
      export: 600     // 导出阶段：每行约 600 bytes
    };

    const estimatedMemory = rowCount * bytesPerRow[operation];
    const projectedUsage = this.currentStatus.used + estimatedMemory;
    const projectedPercent = (projectedUsage / this.PYODIDE_MEMORY_LIMIT) * 100;

    let riskLevel: 'low' | 'medium' | 'high';
    let recommended: 'proceed' | 'caution' | 'abort';

    if (projectedPercent < this.config.warningThreshold) {
      riskLevel = 'low';
      recommended = 'proceed';
    } else if (projectedPercent < this.config.criticalThreshold) {
      riskLevel = 'medium';
      recommended = 'caution';
    } else {
      riskLevel = 'high';
      recommended = 'abort';
    }

    return {
      riskLevel,
      estimatedMemory,
      recommended
    };
  }

  /**
   * 记录历史
   */
  private recordHistory(status: MemoryStatus): void {
    this.history.push(status);

    // 限制历史大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * 发射降级事件
   */
  private emitDegradationEvent(level: string, usagePercent: number): void {
    // 在实际实现中，这里会发射事件到事件总线
    // 例如: eventBus.emit('degradation:memory', { level, usagePercent })

    // 暂时使用 console 作为占位符
    const event = {
      type: 'memory_pressure',
      level,
      usagePercent,
      timestamp: new Date(),
      status: this.currentStatus
    };

    // TODO: 发送到 DegradationNotifier
    console.log('[MemoryMonitor] Degradation event:', event);
  }

  /**
   * 发射清理事件
   */
  private emitCleanupEvent(): void {
    // 在实际实现中，这里会发射清理事件
    const event = {
      type: 'memory:cleanup',
      timestamp: new Date(),
      status: this.currentStatus
    };

    console.log('[MemoryMonitor] Cleanup event:', event);
  }

  /**
   * 获取当前内存状态
   */
  public getCurrentStatus(): MemoryStatus {
    return { ...this.currentStatus };
  }

  /**
   * 获取当前内存使用率
   */
  public getCurrentMemoryUsage(): number {
    return this.currentStatus.usagePercent;
  }

  /**
   * 检查是否处于内存压力状态
   */
  public isUnderPressure(): boolean {
    return this.currentStatus.underPressure;
  }

  /**
   * 强制清理内存
   */
  public async forceCleanup(): Promise<void> {
    console.log('[MemoryMonitor] Forcing cleanup...');
    this.triggerCleanup(this.currentStatus.usagePercent);

    // 等待清理完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 重新检查
    this.checkMemory();

    console.log('[MemoryMonitor] Cleanup completed');
  }

  /**
   * 获取内存趋势
   */
  public getMemoryTrend(minutes: number = 5): {
    trend: 'increasing' | 'decreasing' | 'stable';
    rate: number; // MB per minute
    samples: number;
  } {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    const recentHistory = this.history.filter(h => h.lastCheck >= cutoffTime);

    if (recentHistory.length < 2) {
      return { trend: 'stable', rate: 0, samples: recentHistory.length };
    }

    const first = recentHistory[0];
    const last = recentHistory[recentHistory.length - 1];
    const timeDiff = (last.lastCheck.getTime() - first.lastCheck.getTime()) / 60000; // minutes
    const memoryDiff = (last.used - first.used) / (1024 * 1024); // MB

    const rate = memoryDiff / timeDiff;
    let trend: 'increasing' | 'decreasing' | 'stable';

    if (rate > 1) {
      trend = 'increasing';
    } else if (rate < -1) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return { trend, rate, samples: recentHistory.length };
  }

  /**
   * 获取内存统计
   */
  public getStatistics(): {
    averageUsage: number;
    peakUsage: number;
    currentUsage: number;
    pressureCount: number;
  } {
    const usages = this.history.map(h => h.usagePercent);
    const pressureCount = this.history.filter(h => h.underPressure).length;

    return {
      averageUsage: usages.length > 0 ? usages.reduce((a, b) => a + b, 0) / usages.length : 0,
      peakUsage: usages.length > 0 ? Math.max(...usages) : 0,
      currentUsage: this.currentStatus.usagePercent,
      pressureCount
    };
  }

  /**
   * 重置监控器
   */
  public reset(): void {
    this.stopMonitoring();
    this.history = [];
    this.currentStatus = this.createInitialStatus();
    console.log('[MemoryMonitor] Reset completed');
  }
}

/**
 * 导出单例工厂函数
 */
export const createMemoryMonitor = (config?: Partial<MemoryMonitorConfig>): MemoryMonitor => {
  return new MemoryMonitor(config);
};

/**
 * 默认导出
 */
export default MemoryMonitor;
