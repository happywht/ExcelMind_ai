/**
 * WebSocket服务器配置
 *
 * 提供WebSocket服务器的默认配置和环境变量支持
 *
 * @version 1.0.0
 * @module WebSocketConfig
 */

import type { WebSocketServerConfig } from '../types/websocket';

// ============================================================================
// 默认配置
// ============================================================================

/**
 * 默认WebSocket服务器配置
 */
const DEFAULT_CONFIG: WebSocketServerConfig = {
  // 服务器配置
  port: parseInt(process.env.WEBSOCKET_PORT || '3001', 10),
  path: process.env.WEBSOCKET_PATH || '/ws',

  // 心跳和超时
  heartbeatInterval: 30000, // 30秒
  connectionTimeout: 60000, // 60秒

  // 客户端限制
  maxClients: 1000,
  messageQueueSize: 100,

  // 性能优化
  enableCompression: true,

  // 认证配置
  enableAuthentication: process.env.WEBSOCKET_AUTH_ENABLED === 'true',
  authSecret: process.env.WEBSOCKET_AUTH_SECRET || 'your-secret-key',

  // 速率限制
  rateLimit: {
    maxMessagesPerMinute: 100,
    maxConnectionsPerMinute: 10,
  },

  // 重连配置
  reconnect: {
    maxAttempts: 5,
    delay: 1000,
    exponentialBackoff: true,
  },
};

// ============================================================================
// 环境特定配置
// ============================================================================

/**
 * 开发环境配置
 */
const DEVELOPMENT_CONFIG: Partial<WebSocketServerConfig> = {
  port: 3001,
  enableAuthentication: false,
  enableCompression: false,
  rateLimit: {
    maxMessagesPerMinute: 1000,
    maxConnectionsPerMinute: 100,
  },
};

/**
 * 生产环境配置
 */
const PRODUCTION_CONFIG: Partial<WebSocketServerConfig> = {
  port: parseInt(process.env.WEBSOCKET_PORT || '3001', 10),
  enableAuthentication: true,
  enableCompression: true,
  rateLimit: {
    maxMessagesPerMinute: 100,
    maxConnectionsPerMinute: 10,
  },
};

/**
 * 测试环境配置
 */
const TEST_CONFIG: Partial<WebSocketServerConfig> = {
  port: 3002,
  enableAuthentication: false,
  enableCompression: false,
  heartbeatInterval: 5000, // 5秒（快速测试）
  connectionTimeout: 10000, // 10秒
  rateLimit: {
    maxMessagesPerMinute: 10000,
    maxConnectionsPerMinute: 1000,
  },
};

// ============================================================================
// 配置获取函数
// ============================================================================

/**
 * 获取当前环境配置
 *
 * @returns 环境名称
 */
export function getEnvironment(): 'development' | 'production' | 'test' {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    return 'production';
  } else if (env === 'test') {
    return 'test';
  }

  return 'development';
}

/**
 * 获取WebSocket服务器配置
 *
 * @param overrides - 配置覆盖
 * @returns 完整配置对象
 */
export function getWebSocketConfig(
  overrides?: Partial<WebSocketServerConfig>
): WebSocketServerConfig {
  const environment = getEnvironment();
  let envConfig: Partial<WebSocketServerConfig> = {};

  // 根据环境选择配置
  switch (environment) {
    case 'production':
      envConfig = PRODUCTION_CONFIG;
      break;
    case 'test':
      envConfig = TEST_CONFIG;
      break;
    case 'development':
    default:
      envConfig = DEVELOPMENT_CONFIG;
      break;
  }

  // 合并配置：默认 -> 环境 -> 覆盖
  const config: WebSocketServerConfig = {
    ...DEFAULT_CONFIG,
    ...envConfig,
    ...overrides,
  };

  // 验证配置
  validateConfig(config);

  return config;
}

/**
 * 验证WebSocket配置
 *
 * @param config - 配置对象
 * @throws Error 如果配置无效
 */
function validateConfig(config: WebSocketServerConfig): void {
  // 验证端口
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid port: ${config.port}. Must be between 1 and 65535.`);
  }

  // 验证心跳间隔
  if (config.heartbeatInterval < 1000) {
    throw new Error(`Heartbeat interval too low: ${config.heartbeatInterval}. Minimum 1000ms.`);
  }

  // 验证连接超时
  if (config.connectionTimeout < config.heartbeatInterval) {
    throw new Error(
      `Connection timeout (${config.connectionTimeout}) must be greater than heartbeat interval (${config.heartbeatInterval})`
    );
  }

  // 验证最大客户端数
  if (config.maxClients < 1) {
    throw new Error(`Max clients must be at least 1: ${config.maxClients}`);
  }

  // 验证消息队列大小
  if (config.messageQueueSize < 0) {
    throw new Error(`Message queue size cannot be negative: ${config.messageQueueSize}`);
  }

  // 验证速率限制
  if (config.rateLimit.maxMessagesPerMinute < 1) {
    throw new Error(`Max messages per minute must be at least 1: ${config.rateLimit.maxMessagesPerMinute}`);
  }

  if (config.rateLimit.maxConnectionsPerMinute < 1) {
    throw new Error(`Max connections per minute must be at least 1: ${config.rateLimit.maxConnectionsPerMinute}`);
  }

  // 验证重连配置
  if (config.reconnect.maxAttempts < 0) {
    throw new Error(`Max reconnect attempts cannot be negative: ${config.reconnect.maxAttempts}`);
  }

  if (config.reconnect.delay < 0) {
    throw new Error(`Reconnect delay cannot be negative: ${config.reconnect.delay}`);
  }

  // 如果启用认证，必须有密钥
  if (config.enableAuthentication && !config.authSecret) {
    throw new Error('Authentication enabled but no auth secret provided');
  }
}

/**
 * 获取WebSocket服务器URL（用于客户端连接）
 *
 * @returns WebSocket URL
 */
export function getWebSocketServerUrl(): string {
  const protocol = process.env.WEBSOCKET_SECURE === 'true' ? 'wss:' : 'ws:';
  const host = process.env.WEBSOCKET_HOST || 'localhost';
  const port = getWebSocketConfig().port;
  const path = getWebSocketConfig().path;

  return `${protocol}//${host}:${port}${path}`;
}

// ============================================================================
// 配置导出
// ============================================================================

/**
 * 导出默认配置
 */
export { DEFAULT_CONFIG };

/**
 * 导出环境配置
 */
export { DEVELOPMENT_CONFIG, PRODUCTION_CONFIG, TEST_CONFIG };

/**
 * 默认配置实例
 */
export default getWebSocketConfig();
