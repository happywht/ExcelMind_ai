/**
 * API 配置
 *
 * @version 2.0.0
 */

// 获取环境变量的辅助函数，兼容 Jest 测试环境
const getEnvVar = (key: string, defaultValue: string): string => {
  try {
    // 尝试访问 import.meta.env（Vite 环境）
    // @ts-ignore - import.meta 在 Jest 中不存在
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // 在 Jest 或不支持 import.meta 的环境中，使用默认值
  }
  return defaultValue;
};

export const API_BASE_URL = getEnvVar('VITE_API_BASE_URL', '/api/v2');

export const WS_BASE_URL = getEnvVar('VITE_WS_BASE_URL',
  API_BASE_URL.replace('http', 'ws'));

export const API_TIMEOUT = 30000; // 30秒

export const MAX_RETRY_ATTEMPTS = 3;

export const RETRY_DELAY = 1000; // 1秒
