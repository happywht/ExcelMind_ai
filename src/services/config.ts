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

// 优化API_BASE_URL处理，确保URL格式正确
export const API_BASE_URL = (() => {
  // Electron 环境: 使用 preload 通过 contextBridge 注入的配置
  const electronEnv = (window as any).__ELECTRON_ENV__;
  if (electronEnv && electronEnv.IS_ELECTRON) {
    console.log('[config] 检测到 Electron 环境，使用:', electronEnv.API_BASE_URL);
    return electronEnv.API_BASE_URL;
  }

  // 修复：使用相对路径 /api，而不是 /api/v2
  // 前端API客户端会在其基础上添加具体的版本路径
  const url = getEnvVar('VITE_API_BASE_URL', '/api');

  // 如果是完整URL，确保不以/结尾
  if (url.startsWith('http')) {
    return url.replace(/\/$/, '');
  }

  // 相对路径直接返回
  return url;
})();

export const WS_BASE_URL = getEnvVar('VITE_WS_BASE_URL',
  API_BASE_URL.replace('http', 'ws'));

export const API_TIMEOUT = 30000; // 30秒

export const MAX_RETRY_ATTEMPTS = 3;

export const RETRY_DELAY = 1000; // 1秒
