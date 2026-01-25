/**
 * 降级管理器
 *
 * AI 服务降级策略的核心控制器
 * 监控风险指标，决策降级时机，管理降级状态
 *
 * @module infrastructure/degradation/DegradationManager
 * @author Backend Technical Lead
 * @version 1.0.0
 */

import {
  DegradationMode,
  DegradationLevel,
  DegradationState,
  DegradationMetrics,
  DegradationDecision,
  DegradationThresholds,
  RecoveryConfig,
  ModeConfig,
  HealthCheckResult
} from '../../../types/degradationTypes';

import { MemoryMonitor } from './MemoryMonitor';
import { APICircuitBreaker } from './APICircuitBreaker';
import { DegradationNotifier } from './DegradationNotifier';

/**
 * 降级管理器配置
 */
interface DegradationManagerConfig {
  thresholds: DegradationThresholds;
  recovery: RecoveryConfig;
  modes: ModeConfig;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: DegradationManagerConfig = {
  thresholds: {
    memoryWarning: 75,    // 75%
    memoryCritical: 90,   // 90%
    fileSizeWarning: 20 * 1024 * 1024,  // 20MB
    fileSizeCritical: 30 * 1024 * 1024, // 30MB
    apiFailureWarning: 20,  // 20%
    apiFailureCritical: 50, // 50%
    executionTimeout: 60    // 60 seconds
  },
  recovery: {
    checkInterval: 30000,  // 30 seconds
    minStableTime: 60000,  // 1 minute
    maxRecoveryAttempts: 3
  },
  modes: {
    browser: {
      maxFileSize: 30 * 1024 * 1024,  // 30MB
      maxMemory: 1.2 * 1024 * 1024 * 1024 // 1.2GB
    },
    hybrid: {
      maxFileSize: 50 * 1024 * 1024,  // 50MB
      apiFallback: true
    },
    backend: {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      requiresNetwork: true
    }
  }
};

/**
 * 降级管理器类
 */
export class DegradationManager {
  private config: DegradationManagerConfig;
  private currentState: DegradationState;
  private memoryMonitor: MemoryMonitor;
  private circuitBreaker: APICircuitBreaker;
  private notifier: DegradationNotifier;

  // 监控定时器
  private checkInterval: NodeJS.Timeout | null = null;
  private recoveryInterval: NodeJS.Timeout | null = null;
  private recoveryAttempts = 0;

  // 历史执行时间（用于计算平均值）
  private executionTimes: number[] = [];
  private readonly maxExecutionTimeSamples = 10;

  constructor(config?: Partial<DegradationManagerConfig>) {
    // 合并配置
    const mergedConfig = this.mergeConfig(DEFAULT_CONFIG, config || {});
    this.config = mergedConfig;

    // 初始化组件
    this.memoryMonitor = new MemoryMonitor();
    this.circuitBreaker = new APICircuitBreaker();
    this.notifier = new DegradationNotifier();

    // 初始化状态
    this.currentState = this.createInitialState();

    console.log('[DegradationManager] Initialized with config:', this.config);

    // 启动监控
    this.startMonitoring();

    // 注册事件监听
    this.setupEventListeners();
  }

  /**
   * 合并配置（深度合并）
   */
  private mergeConfig(base: DegradationManagerConfig, override: Partial<DegradationManagerConfig>): DegradationManagerConfig {
    return {
      thresholds: { ...base.thresholds, ...override.thresholds },
      recovery: { ...base.recovery, ...override.recovery },
      modes: {
        browser: { ...base.modes.browser, ...override.modes?.browser },
        hybrid: { ...base.modes.hybrid, ...override.modes?.hybrid },
        backend: { ...base.modes.backend, ...override.modes?.backend }
      }
    };
  }

  /**
   * 创建初始状态
   */
  private createInitialState(): DegradationState {
    return {
      currentMode: DegradationMode.BROWSER,
      currentLevel: DegradationLevel.NORMAL,
      lastCheck: new Date(),
      metrics: this.createEmptyMetrics(),
      canRecover: false,
      stableDuration: 0
    };
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
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 在实际实现中，这里会设置更复杂的事件处理
    console.log('[DegradationManager] Event listeners configured');
  }

  /**
   * 开始监控
   */
  private startMonitoring(): void {
    // 启动内存监控
    this.memoryMonitor.startMonitoring();

    // 定期检查降级条件
    this.checkInterval = setInterval(() => {
      this.checkDegradation();
    }, this.config.recovery.checkInterval);

    console.log('[DegradationManager] Monitoring started');
  }

  /**
   * 停止监控
   */
  public stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }

    this.memoryMonitor.stopMonitoring();
    console.log('[DegradationManager] Monitoring stopped');
  }

  /**
   * 检查降级条件（公共API）
   *
   * 此方法可被外部调用手动触发降级检查
   * 正常情况下，系统会定期自动检查
   */
  public checkDegradation(): void {
    const decision = this.makeDegradationDecision();

    if (decision.shouldDegrade && decision.targetMode) {
      this.executeDegradation(decision.targetMode, decision.reason);
    }

    // 更新状态
    this.updateState();
  }

  /**
   * 做出降级决策
   */
  private makeDegradationDecision(): DegradationDecision {
    const metrics = this.collectMetrics();
    const triggeredThresholds: string[] = [];
    let targetMode: DegradationMode | undefined;
    let confidence = 0;

    // 1. 检查内存压力
    if (metrics.memoryUsage >= this.config.thresholds.memoryCritical) {
      triggeredThresholds.push('memory_critical');
      targetMode = DegradationMode.BACKEND;
      confidence = 0.95;
    } else if (metrics.memoryUsage >= this.config.thresholds.memoryWarning) {
      triggeredThresholds.push('memory_warning');
      if (!targetMode) {
        targetMode = DegradationMode.HYBRID;
        confidence = 0.7;
      }
    }

    // 2. 检查文件大小
    if (metrics.fileSize >= this.config.thresholds.fileSizeCritical) {
      triggeredThresholds.push('file_size_critical');
      targetMode = DegradationMode.BACKEND;
      confidence = Math.max(confidence, 0.9);
    } else if (metrics.fileSize >= this.config.thresholds.fileSizeWarning) {
      triggeredThresholds.push('file_size_warning');
      if (!targetMode) {
        targetMode = DegradationMode.HYBRID;
        confidence = Math.max(confidence, 0.6);
      }
    }

    // 3. 检查 API 失败率
    if (metrics.apiFailureRate >= this.config.thresholds.apiFailureCritical) {
      triggeredThresholds.push('api_failure_critical');
      // API 失败时，考虑降级到纯浏览器模式或混合模式
      if (this.currentState.currentMode === DegradationMode.HYBRID ||
          this.currentState.currentMode === DegradationMode.BACKEND) {
        targetMode = DegradationMode.BROWSER;
        confidence = Math.max(confidence, 0.85);
      }
    } else if (metrics.apiFailureRate >= this.config.thresholds.apiFailureWarning) {
      triggeredThresholds.push('api_failure_warning');
    }

    // 4. 检查执行时间
    if (metrics.avgExecutionTime >= this.config.thresholds.executionTimeout) {
      triggeredThresholds.push('execution_timeout');
      if (!targetMode) {
        targetMode = DegradationMode.HYBRID;
        confidence = Math.max(confidence, 0.65);
      }
    }

    // 5. 检查连续失败
    if (metrics.consecutiveFailures >= 3) {
      triggeredThresholds.push('consecutive_failures');
      targetMode = DegradationMode.BACKEND;
      confidence = Math.max(confidence, 0.8);
    }

    // 构建决策
    const shouldDegrade = triggeredThresholds.length > 0 && targetMode !== undefined;

    // 如果目标模式与当前模式相同，则不需要降级
    if (targetMode === this.currentState.currentMode) {
      return {
        shouldDegrade: false,
        reason: 'Already in optimal mode',
        triggeredThresholds: [],
        confidence: 1
      };
    }

    return {
      shouldDegrade,
      targetMode,
      reason: this.buildReason(triggeredThresholds, metrics),
      triggeredThresholds,
      confidence
    };
  }

  /**
   * 构建降级原因
   */
  private buildReason(thresholds: string[], metrics: DegradationMetrics): string {
    const reasons: string[] = [];

    if (thresholds.includes('memory_critical') || thresholds.includes('memory_warning')) {
      reasons.push(`High memory usage (${metrics.memoryUsage.toFixed(1)}%)`);
    }
    if (thresholds.includes('file_size_critical') || thresholds.includes('file_size_warning')) {
      reasons.push(`Large file size (${(metrics.fileSize / 1024 / 1024).toFixed(1)}MB)`);
    }
    if (thresholds.includes('api_failure_critical') || thresholds.includes('api_failure_warning')) {
      reasons.push(`High API failure rate (${metrics.apiFailureRate.toFixed(1)}%)`);
    }
    if (thresholds.includes('execution_timeout')) {
      reasons.push(`Slow execution (${metrics.avgExecutionTime.toFixed(1)}s)`);
    }
    if (thresholds.includes('consecutive_failures')) {
      reasons.push(`Multiple consecutive failures (${metrics.consecutiveFailures})`);
    }

    return reasons.join('; ');
  }

  /**
   * 收集指标
   */
  private collectMetrics(): DegradationMetrics {
    const memoryStatus = this.memoryMonitor.getCurrentStatus();
    const circuitState = this.circuitBreaker.getState();
    const avgExecutionTime = this.calculateAverageExecutionTime();

    return {
      memoryUsage: memoryStatus.usagePercent,
      fileSize: this.currentState.metrics.fileSize, // 由外部更新
      apiFailureRate: circuitState.failureRate,
      avgExecutionTime,
      consecutiveFailures: this.calculateConsecutiveFailures(circuitState),
      lastUpdate: new Date()
    };
  }

  /**
   * 计算平均执行时间
   */
  private calculateAverageExecutionTime(): number {
    if (this.executionTimes.length === 0) {
      return 0;
    }
    const sum = this.executionTimes.reduce((a, b) => a + b, 0);
    return sum / this.executionTimes.length;
  }

  /**
   * 计算连续失败次数
   */
  private calculateConsecutiveFailures(circuitState: any): number {
    // 基于熔断器状态和最近的失败记录
    let count = 0;
    const now = Date.now();
    const window = 60000; // 1分钟窗口

    if (circuitState.lastFailureTime) {
      const lastFailureTime = new Date(circuitState.lastFailureTime).getTime();
      if (now - lastFailureTime < window) {
        count = circuitState.failureCount || 0;
      }
    }

    return count;
  }

  /**
   * 执行降级
   */
  public async executeDegradation(mode: DegradationMode, reason?: string): Promise<void> {
    const previousMode = this.currentState.currentMode;

    console.log(`[DegradationManager] Executing degradation: ${previousMode} -> ${mode}`);

    // 更新状态
    this.currentState.currentMode = mode;
    this.currentState.currentLevel = this.getLevelForMode(mode);
    this.currentState.reason = reason;
    this.currentState.lastCheck = new Date();

    // 通知
    this.notifier.notifyModeChange(previousMode, mode, reason || 'Manual degradation', this.currentState.metrics);

    // 根据模式执行特定操作
    switch (mode) {
      case DegradationMode.BROWSER:
        await this.transitionToBrowserMode();
        break;
      case DegradationMode.HYBRID:
        await this.transitionToHybridMode();
        break;
      case DegradationMode.BACKEND:
        await this.transitionToBackendMode();
        break;
    }

    // 重置恢复尝试
    this.recoveryAttempts = 0;
    this.currentState.canRecover = true;
  }

  /**
   * 获取模式对应的级别
   */
  private getLevelForMode(mode: DegradationMode): DegradationLevel {
    switch (mode) {
      case DegradationMode.BROWSER:
        return DegradationLevel.NORMAL;
      case DegradationMode.HYBRID:
        return DegradationLevel.WARNING;
      case DegradationMode.BACKEND:
        return DegradationLevel.DEGRADED;
      default:
        return DegradationLevel.NORMAL;
    }
  }

  /**
   * 过渡到浏览器模式
   */
  private async transitionToBrowserMode(): Promise<void> {
    console.log('[DegradationManager] Transitioning to BROWSER mode');
    // 浏览器模式是默认的，不需要特殊处理
  }

  /**
   * 过渡到混合模式
   */
  private async transitionToHybridMode(): Promise<void> {
    console.log('[DegradationManager] Transitioning to HYBRID mode');
    // 混合模式：前端处理文件，后端处理AI
  }

  /**
   * 过渡到后端模式
   */
  private async transitionToBackendMode(): Promise<void> {
    console.log('[DegradationManager] Transitioning to BACKEND mode');
    // 后端模式：所有处理在后端完成
  }

  /**
   * 更新状态
   */
  private updateState(): void {
    this.currentState.metrics = this.collectMetrics();
    this.currentState.lastCheck = new Date();

    // 广播指标更新
    this.notifier.broadcastMetrics(this.currentState.metrics);
  }

  /**
   * 检查是否可以恢复
   */
  public canRecover(): boolean {
    if (!this.currentState.canRecover) {
      return false;
    }

    // 检查是否已经在最优模式
    if (this.currentState.currentMode === DegradationMode.BROWSER) {
      return false;
    }

    // 检查稳定持续时间
    const stableTime = Date.now() - this.currentState.lastCheck.getTime();
    if (stableTime < this.config.recovery.minStableTime) {
      return false;
    }

    // 检查指标是否恢复到正常水平
    const metrics = this.collectMetrics();
    const isHealthy = this.isHealthy(metrics);

    return isHealthy;
  }

  /**
   * 判断指标是否健康
   */
  private isHealthy(metrics: DegradationMetrics): boolean {
    return (
      metrics.memoryUsage < this.config.thresholds.memoryWarning &&
      metrics.fileSize < this.config.thresholds.fileSizeWarning &&
      metrics.apiFailureRate < this.config.thresholds.apiFailureWarning &&
      metrics.avgExecutionTime < this.config.thresholds.executionTimeout &&
      metrics.consecutiveFailures < 2
    );
  }

  /**
   * 尝试恢复
   */
  public async attemptRecovery(): Promise<boolean> {
    if (!this.canRecover()) {
      console.log('[DegradationManager] Cannot recover yet');
      return false;
    }

    if (this.recoveryAttempts >= this.config.recovery.maxRecoveryAttempts) {
      console.log('[DegradationManager] Max recovery attempts reached');
      return false;
    }

    this.recoveryAttempts++;

    // 决定恢复到哪个模式
    const targetMode = this.decideRecoveryMode();
    const previousMode = this.currentState.currentMode;

    console.log(`[DegradationManager] Attempting recovery: ${previousMode} -> ${targetMode}`);

    this.notifier.notifyRecoveryAttempt(targetMode, 'System metrics improved');

    // 执行恢复
    await this.executeDegradation(targetMode, 'Recovery attempt');

    // 检查恢复是否成功
    const success = targetMode === this.currentState.currentMode;

    if (success) {
      this.notifier.notifyRecoverySuccess(previousMode, targetMode, 'System recovered');
    }

    return success;
  }

  /**
   * 决定恢复模式
   */
  private decideRecoveryMode(): DegradationMode {
    const metrics = this.collectMetrics();

    // 优先恢复到浏览器模式
    if (metrics.memoryUsage < this.config.thresholds.memoryWarning * 0.8 &&
        metrics.fileSize < this.config.thresholds.fileSizeWarning * 0.8) {
      return DegradationMode.BROWSER;
    }

    // 否则恢复到混合模式
    return DegradationMode.HYBRID;
  }

  /**
   * 公共API：记录执行时间
   */
  public recordExecution(duration: number): void {
    this.executionTimes.push(duration);

    // 维护样本大小
    if (this.executionTimes.length > this.maxExecutionTimeSamples) {
      this.executionTimes.shift();
    }
  }

  /**
   * 公共API：记录文件大小
   */
  public recordFileSize(size: number): void {
    this.currentState.metrics.fileSize = size;
  }

  /**
   * 公共API：记录API调用结果
   */
  public recordAPICall(success: boolean, duration?: number): void {
    this.circuitBreaker.recordCall(success, duration);
  }

  /**
   * 公共API：检查是否允许API请求
   */
  public allowAPIRequest(): boolean {
    return this.circuitBreaker.allowRequest();
  }

  /**
   * 获取当前状态
   */
  public getCurrentState(): DegradationState {
    return { ...this.currentState };
  }

  /**
   * 获取当前模式
   */
  public getCurrentMode(): DegradationMode {
    return this.currentState.currentMode;
  }

  /**
   * 获取当前级别
   */
  public getCurrentLevel(): DegradationLevel {
    return this.currentState.currentLevel;
  }

  /**
   * 执行健康检查
   */
  public performHealthCheck(): HealthCheckResult {
    const metrics = this.collectMetrics();
    const memoryStatus = this.memoryMonitor.getCurrentStatus();
    const circuitState = this.circuitBreaker.getState();

    const checks = {
      memory: {
        passed: metrics.memoryUsage < this.config.thresholds.memoryWarning,
        value: metrics.memoryUsage,
        threshold: this.config.thresholds.memoryWarning
      },
      fileSize: {
        passed: metrics.fileSize < this.config.thresholds.fileSizeWarning,
        value: metrics.fileSize,
        threshold: this.config.thresholds.fileSizeWarning
      },
      api: {
        passed: metrics.apiFailureRate < this.config.thresholds.apiFailureWarning,
        value: metrics.apiFailureRate,
        threshold: this.config.thresholds.apiFailureWarning
      },
      execution: {
        passed: metrics.avgExecutionTime < this.config.thresholds.executionTimeout,
        value: metrics.avgExecutionTime,
        threshold: this.config.thresholds.executionTimeout
      }
    };

    const passedChecks = Object.values(checks).filter(c => c.passed).length;
    const overallScore = (passedChecks / Object.keys(checks).length) * 100;

    let recommendedMode = DegradationMode.BROWSER;
    if (!checks.memory.passed || !checks.fileSize.passed) {
      recommendedMode = DegradationMode.BACKEND;
    } else if (!checks.api.passed || !checks.execution.passed) {
      recommendedMode = DegradationMode.HYBRID;
    }

    return {
      isHealthy: overallScore >= 75,
      checks,
      overallScore,
      recommendedMode
    };
  }

  /**
   * 获取统计信息
   */
  public getStatistics(): {
    currentState: DegradationState;
    healthCheck: HealthCheckResult;
    memoryStats: any;
    circuitStats: any;
    recoveryAttempts: number;
  } {
    return {
      currentState: this.currentState,
      healthCheck: this.performHealthCheck(),
      memoryStats: this.memoryMonitor.getStatistics(),
      circuitStats: this.circuitBreaker.getStatistics(),
      recoveryAttempts: this.recoveryAttempts
    };
  }

  /**
   * 重置管理器
   */
  public reset(): void {
    console.log('[DegradationManager] Resetting');

    this.currentState = this.createInitialState();
    this.executionTimes = [];
    this.recoveryAttempts = 0;

    this.circuitBreaker.reset();
    this.memoryMonitor.reset();

    console.log('[DegradationManager] Reset completed');
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.stopMonitoring();
    this.circuitBreaker.destroy();
    this.notifier.destroy();
    console.log('[DegradationManager] Destroyed');
  }
}

/**
 * 导出单例工厂函数
 */
export const createDegradationManager = (config?: Partial<DegradationManagerConfig>): DegradationManager => {
  return new DegradationManager(config);
};

/**
 * 默认导出
 */
export default DegradationManager;
