/**
 * 降级策略配置
 *
 * 定义降级阈值、恢复配置和模式参数
 * 可根据实际部署环境进行调整
 *
 * @module config/degradation
 * @author Backend Technical Lead
 * @version 1.0.0
 */

import {
  DegradationThresholds,
  RecoveryConfig,
  ModeConfig
} from '../types/degradationTypes';

/**
 * 降级阈值配置
 */
export const DEGRADATION_THRESHOLDS: DegradationThresholds = {
  // 内存相关阈值
  memoryWarning: 75,    // 75% - 内存使用预警线
  memoryCritical: 90,   // 90% - 内存使用临界线

  // 文件大小阈值
  fileSizeWarning: 20 * 1024 * 1024,   // 20MB - 文件大小预警
  fileSizeCritical: 30 * 1024 * 1024,  // 30MB - 文件大小临界

  // API 调用阈值
  apiFailureWarning: 20,  // 20% - API 失败率预警
  apiFailureCritical: 50, // 50% - API 失败率临界

  // 执行时间阈值
  executionTimeout: 60    // 60 秒 - 执行超时阈值
};

/**
 * 恢复配置
 */
export const RECOVERY_CONFIG: RecoveryConfig = {
  // 检查间隔
  checkInterval: 30000,        // 30 秒 - 每次恢复检查的间隔

  // 最小稳定时间
  minStableTime: 60000,        // 60 秒 - 系统必须稳定运行至少 60 秒才能尝试恢复

  // 最大恢复尝试次数
  maxRecoveryAttempts: 3       // 最多尝试 3 次自动恢复
};

/**
 * 降级模式配置
 */
export const MODE_CONFIG: ModeConfig = {
  // 浏览器模式（最优模式）
  browser: {
    maxFileSize: 30 * 1024 * 1024,   // 30MB - 最大文件大小
    maxMemory: 1.2 * 1024 * 1024 * 1024 // 1.2GB - Pyodide 内存限制
  },

  // 混合模式（前端预处理 + 后端 AI）
  hybrid: {
    maxFileSize: 50 * 1024 * 1024,   // 50MB - 最大文件大小
    apiFallback: true                // 启用 API 降级保护
  },

  // 后端模式（完全服务器端执行）
  backend: {
    maxFileSize: 100 * 1024 * 1024,  // 100MB - 最大文件大小
    requiresNetwork: true             // 需要网络连接
  }
};

/**
 * 环境特定配置
 *
 * 根据部署环境（开发、测试、生产）使用不同的配置
 */
export const ENV_SPECIFIC_CONFIG = {
  development: {
    thresholds: {
      ...DEGRADATION_THRESHOLDS,
      // 开发环境使用更宽松的阈值
      memoryWarning: 85,
      memoryCritical: 95
    },
    recovery: {
      ...RECOVERY_CONFIG,
      checkInterval: 10000  // 10 秒 - 更频繁的检查
    }
  },

  testing: {
    thresholds: {
      ...DEGRADATION_THRESHOLDS
      // 测试环境使用生产配置
    },
    recovery: {
      ...RECOVERY_CONFIG,
      maxRecoveryAttempts: 1  // 测试时只尝试一次恢复
    }
  },

  production: {
    thresholds: {
      ...DEGRADATION_THRESHOLDS
      // 生产环境使用标准配置
    },
    recovery: {
      ...RECOVERY_CONFIG
    }
  }
};

/**
 * 获取当前环境配置
 */
export const getCurrentEnvConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return ENV_SPECIFIC_CONFIG.production;
    case 'testing':
    case 'test':
      return ENV_SPECIFIC_CONFIG.testing;
    case 'development':
    default:
      return ENV_SPECIFIC_CONFIG.development;
  }
};

/**
 * 默认导出
 */
export default {
  thresholds: DEGRADATION_THRESHOLDS,
  recovery: RECOVERY_CONFIG,
  modes: MODE_CONFIG,
  currentEnv: getCurrentEnvConfig()
};
