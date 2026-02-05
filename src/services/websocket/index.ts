/**
 * WebSocket模块统一导出 - Phase 2 WebSocket实现统一
 *
 * 提供统一的WebSocket模块导出接口
 *
 * @module services/websocket
 * @version 2.0.0
 */

// ============================================================================
// 导出统一接口
// ============================================================================

export * from './IWebSocket';

// ============================================================================
// 导出实现类
// ============================================================================

export { ServerWebSocket } from './ServerWebSocket';
export { ClientWebSocket } from './ClientWebSocket';

// ============================================================================
// 导出服务
// ============================================================================

export {
  WebSocketService,
  getWebSocketService,
  createServerWebSocketService,
  createClientWebSocketService,
  destroyWebSocketService,
  destroyAllWebSocketServices,
  createWebSocketService,
  webSocketService,
} from './websocketService';

// ============================================================================
// 导出旧版管理器（向后兼容）
// ============================================================================

export { WebSocketManager } from './websocketManager';

// ============================================================================
// 默认导出
// ============================================================================

export { WebSocketService as default } from './websocketService';
