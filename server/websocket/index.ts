/**
 * WebSocket模块入口
 *
 * 导出所有WebSocket相关的类和工具
 *
 * @version 1.0.0
 * @module websocket
 */

// ============================================================================
// 核心类
// ============================================================================

export { WebSocketServer } from './websocketServer';
export { ProgressBroadcaster } from './progressBroadcaster';

// ============================================================================
// 类型
// ============================================================================

export type {
  ClientConnection,
  ErrorMessage,
  RoomInfo,
  SubscribeRequest,
  TaskProgressMessage,
  UnsubscribeRequest,
  WebSocketMessage,
  WebSocketServerConfig,
  WebSocketServerOptions,
  WebSocketServerStats,
} from '../../src/types/websocket';

export type {
  ProgressBroadcasterConfig,
  ProgressUpdateEvent,
} from '../../src/types/websocket';

// ============================================================================
// 枚举和错误类
// ============================================================================

export {
  MessageType,
  WebSocketServerError,
  ConnectionRejectedError,
  AuthenticationError,
  RateLimitError,
} from '../../src/types/websocket';

// ============================================================================
// 默认导出
// ============================================================================

export { default as createWebSocketServer } from './websocketServer';
export { default as createProgressBroadcaster } from './progressBroadcaster';
