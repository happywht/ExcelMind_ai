/**
 * 编排器默认配置
 */

import { OrchestratorConfig } from '../../types/agenticTypes';

/**
 * 默认编排器配置
 */
export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  maxRetries: 3,
  timeoutPerStep: 30000, // 30秒
  totalTimeout: 300000, // 5分钟
  qualityThreshold: 0.8,
  enableAutoRepair: true,
  enableCaching: true,
  logLevel: 'info',
  aiModel: 'glm-4.7',
  maxTokens: 4096
};

/**
 * 快速模式配置（用于简单任务）
 */
export const FAST_MODE_CONFIG: Partial<OrchestratorConfig> = {
  maxRetries: 1,
  timeoutPerStep: 15000, // 15秒
  totalTimeout: 60000, // 1分钟
  qualityThreshold: 0.7,
  enableAutoRepair: false,
  logLevel: 'warn'
};

/**
 * 高质量模式配置（用于复杂任务）
 */
export const HIGH_QUALITY_MODE_CONFIG: Partial<OrchestratorConfig> = {
  maxRetries: 5,
  timeoutPerStep: 60000, // 60秒
  totalTimeout: 600000, // 10分钟
  qualityThreshold: 0.95,
  enableAutoRepair: true,
  logLevel: 'debug',
  maxTokens: 8192
};

/**
 * 调试模式配置
 */
export const DEBUG_MODE_CONFIG: Partial<OrchestratorConfig> = {
  logLevel: 'debug',
  enableCaching: false,
  maxRetries: 1
};
