/**
 * 降级策略模块
 *
 * 导出所有降级相关的服务、类型和工具
 *
 * @module infrastructure/degradation
 * @author Backend Technical Lead
 * @version 1.0.0
 */

// 导入枚举用于工具函数
import {
  DegradationMode,
  DegradationLevel,
  DegradationState
} from '../../../types/degradationTypes';

// 核心服务
export { DegradationManager, createDegradationManager } from './DegradationManager';
export { MemoryMonitor, createMemoryMonitor } from './MemoryMonitor';
export { APICircuitBreaker, createAPICircuitBreaker } from './APICircuitBreaker';
export { DegradationNotifier, createDegradationNotifier } from './DegradationNotifier';

// 枚举导出（作为值）
export {
  DegradationMode,
  DegradationLevel,
  DegradationEventType
} from '../../../types/degradationTypes';

// 类型定义导出
export type {
  DegradationMetrics,
  DegradationState,
  DegradationThresholds,
  RecoveryConfig,
  ModeConfig,
  DegradationEvent,
  DegradationDecision,
  MemoryStatus,
  CircuitBreakerState,
  DegradationHistory,
  DegradationNotification,
  HealthCheckResult
} from '../../../types/degradationTypes';

// 配置
export {
  DEGRADATION_THRESHOLDS,
  RECOVERY_CONFIG,
  MODE_CONFIG,
  ENV_SPECIFIC_CONFIG,
  getCurrentEnvConfig
} from '@config/degradation.config';

/**
 * 降级策略工具函数
 */

/**
 * 格式化文件大小显示
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * 格式化内存使用率显示
 */
export const formatMemoryUsage = (percent: number): string => {
  if (percent < 50) {
    return `✅ ${percent.toFixed(1)}%`;
  } else if (percent < 75) {
    return `⚠️ ${percent.toFixed(1)}%`;
  } else {
    return `🔴 ${percent.toFixed(1)}%`;
  }
};

/**
 * 获取降级级别显示文本
 */
export const getDegradationLevelText = (level: DegradationLevel): string => {
  const texts = {
    [DegradationLevel.NORMAL]: '正常',
    [DegradationLevel.WARNING]: '预警',
    [DegradationLevel.DEGRADED]: '降级',
    [DegradationLevel.CRITICAL]: '严重'
  };
  return texts[level];
};

/**
 * 获取降级模式显示文本
 */
export const getDegradationModeText = (mode: DegradationMode): string => {
  const texts = {
    [DegradationMode.BROWSER]: '浏览器模式',
    [DegradationMode.HYBRID]: '混合模式',
    [DegradationMode.BACKEND]: '后端模式'
  };
  return texts[mode];
};

/**
 * 计算降级模式优先级
 */
export const getModePriority = (mode: DegradationMode): number => {
  const priorities = {
    [DegradationMode.BROWSER]: 3,
    [DegradationMode.HYBRID]: 2,
    [DegradationMode.BACKEND]: 1
  };
  return priorities[mode];
};

/**
 * 判断是否应该降级
 */
export const shouldDegrade = (
  currentMode: DegradationMode,
  targetMode: DegradationMode
): boolean => {
  return getModePriority(targetMode) < getModePriority(currentMode);
};

/**
 * 判断是否是恢复
 */
export const isRecovery = (
  currentMode: DegradationMode,
  targetMode: DegradationMode
): boolean => {
  return getModePriority(targetMode) > getModePriority(currentMode);
};

/**
 * 创建降级状态快照
 */
export const createStateSnapshot = (
  state: DegradationState
): string => {
  return JSON.stringify({
    mode: state.currentMode,
    level: state.currentLevel,
    reason: state.reason,
    timestamp: state.lastCheck,
    metrics: state.metrics
  }, null, 2);
};

/**
 * 默认导出
 */
// 使用命名导出替代默认导出，以避免类型问题
// export default { ... }

