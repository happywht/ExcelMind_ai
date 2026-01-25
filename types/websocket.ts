/**
 * WebSocket服务器类型定义
 *
 * 功能特性：
 * - 服务器端WebSocket连接管理
 * - 消息类型定义
 * - 任务进度推送
 * - 房间/频道管理
 * - 心跳和重连机制
 *
 * @version 1.0.0
 * @module WebSocketTypes
 */

// ============================================================================
// 消息类型枚举
// ============================================================================

/**
 * WebSocket消息类型
 */
export enum MessageType {
  // 进度消息
  TASK_PROGRESS = 'task_progress',
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  TASK_PAUSED = 'task_paused',
  TASK_CANCELLED = 'task_cancelled',

  // 文档生成消息
  DOCUMENT_GENERATED = 'document_generated',
  DOCUMENT_FAILED = 'document_failed',

  // 系统消息
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong',

  // 订阅消息
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  SUBSCRIPTION_ACK = 'subscription_ack',

  // 房间消息
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  ROOM_BROADCAST = 'room_broadcast',
}

// ============================================================================
// 核心接口定义
// ============================================================================

/**
 * WebSocket消息基础接口
 */
export interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp: number;
  id?: string; // 消息唯一ID
}

/**
 * 任务进度消息
 */
export interface TaskProgressMessage {
  taskId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  current: number;
  total: number;
  stage: string;
  estimatedTimeRemaining?: number;
  message?: string;
}

/**
 * 任务启动消息
 */
export interface TaskStartedMessage {
  taskId: string;
  mode: string;
  totalDocuments: number;
  estimatedDuration?: number;
}

/**
 * 任务完成消息
 */
export interface TaskCompletedMessage {
  taskId: string;
  status: 'completed' | 'partially_completed';
  result: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

/**
 * 任务失败消息
 */
export interface TaskFailedMessage {
  taskId: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * 文档生成消息
 */
export interface DocumentGeneratedMessage {
  taskId: string;
  documentId: string;
  templateId: string;
  dataIndex: number;
  status: 'success' | 'failed' | 'skipped';
  fileName?: string;
  fileSize?: number;
}

/**
 * 订阅请求消息
 */
export interface SubscribeRequest {
  taskIds: string[];
  rooms?: string[];
}

/**
 * 取消订阅请求消息
 */
export interface UnsubscribeRequest {
  taskIds?: string[];
  rooms?: string[];
  unsubscribeAll?: boolean;
}

/**
 * 连接认证消息
 */
export interface AuthMessage {
  token?: string;
  apiKey?: string;
  clientId?: string;
}

/**
 * 错误消息
 */
export interface ErrorMessage {
  code: string;
  message: string;
  details?: any;
  fatal?: boolean;
}

// ============================================================================
// 服务器配置接口
// ============================================================================

/**
 * WebSocket服务器配置
 */
export interface WebSocketServerConfig {
  // 服务器端口
  port: number;
  // WebSocket路径
  path: string;
  // 心跳间隔（毫秒）
  heartbeatInterval: number;
  // 连接超时（毫秒）
  connectionTimeout: number;
  // 最大客户端数
  maxClients: number;
  // 消息队列大小
  messageQueueSize: number;
  // 是否启用压缩
  enableCompression: boolean;
  // 是否启用认证
  enableAuthentication: boolean;
  // 认证密钥
  authSecret?: string;
  // 速率限制
  rateLimit: {
    // 每分钟最大消息数
    maxMessagesPerMinute: number;
    // 每分钟最大连接数
    maxConnectionsPerMinute: number;
  };
  // 重连配置
  reconnect: {
    // 最大重连次数
    maxAttempts: number;
    // 重连延迟（毫秒）
    delay: number;
    // 是否启用指数退避
    exponentialBackoff: boolean;
  };
}

/**
 * WebSocket服务器选项
 */
export interface WebSocketServerOptions {
  // HTTP服务器（可选，用于共享端口）
  server?: any;
  // 客户端跟踪
  clientTracking?: boolean;
  // 处理升级请求
  handleProtocols?: any;
  // 路径
  path?: string;
  // 最大负载（字节）
  maxPayload?: number;
  // 背压
  backlog?: number;
}

// ============================================================================
// 客户端连接接口
// ============================================================================

/**
 * 客户端连接信息
 */
export interface ClientConnection {
  // 客户端ID
  id: string;
  // WebSocket实例
  socket: import('ws').WebSocket;
  // 连接时间
  connectedAt: number;
  // 最后心跳时间
  lastHeartbeat: number;
  // 用户信息（如果已认证）
  user?: {
    id: string;
    name?: string;
    role?: string;
  };
  // 订阅的任务ID列表
  subscribedTasks: Set<string>;
  // 加入的房间列表
  rooms: Set<string>;
  // 消息队列
  messageQueue: WebSocketMessage[];
  // 是否已认证
  isAuthenticated: boolean;
  // IP地址
  ip?: string;
  // 用户代理
  userAgent?: string;
}

// ============================================================================
// 房间管理接口
// ============================================================================

/**
 * 房间信息
 */
export interface RoomInfo {
  // 房间名称
  name: string;
  // 创建时间
  createdAt: number;
  // 客户端列表
  clients: Set<string>;
  // 消息历史
  messageHistory: WebSocketMessage[];
  // 最大历史记录数
  maxHistorySize: number;
}

// ============================================================================
// 统计接口
// ============================================================================

/**
 * WebSocket服务器统计
 */
export interface WebSocketServerStats {
  // 服务器信息
  server: {
    uptime: number;
    startTime: number;
    version: string;
  };
  // 连接统计
  connections: {
    total: number;
    active: number;
    authenticated: number;
  };
  // 消息统计
  messages: {
    totalSent: number;
    totalReceived: number;
    sentPerMinute: number;
    receivedPerMinute: number;
  };
  // 房间统计
  rooms: {
    total: number;
    clients: number;
  };
  // 内存使用
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * 广播统计
 */
export interface BroadcastStats {
  // 总广播次数
  totalBroadcasts: number;
  // 总消息数
  totalMessages: number;
  // 成功发送数
  successfulSends: number;
  // 失败发送数
  failedSends: number;
  // 平均延迟（毫秒）
  averageLatency: number;
  // 最后更新时间
  lastUpdate: number;
}

// ============================================================================
// 进度广播器接口
// ============================================================================

/**
 * 进度更新事件
 */
export interface ProgressUpdateEvent {
  taskId: string;
  progress: number;
  current: number;
  total: number;
  stage: string;
  timestamp: number;
}

/**
 * 进度广播器配置
 */
export interface ProgressBroadcasterConfig {
  // 广播间隔（毫秒）
  broadcastInterval: number;
  // 批量大小
  batchSize: number;
  // 是否启用增量更新
  enableIncrementalUpdates: boolean;
  // 最小变化阈值（百分比）
  minChangeThreshold: number;
  // 是否启用消息压缩
  enableCompression: boolean;
}

// ============================================================================
// 错误类型
// ============================================================================

/**
 * WebSocket错误类
 */
export class WebSocketServerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'WebSocketServerError';
    Object.setPrototypeOf(this, WebSocketServerError.prototype);
  }
}

/**
 * 连接拒绝错误
 */
export class ConnectionRejectedError extends WebSocketServerError {
  constructor(reason: string) {
    super(reason, 'CONNECTION_REJECTED', 1003);
    this.name = 'ConnectionRejectedError';
    Object.setPrototypeOf(this, ConnectionRejectedError.prototype);
  }
}

/**
 * 认证失败错误
 */
export class AuthenticationError extends WebSocketServerError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_FAILED', 1008);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * 速率限制错误
 */
export class RateLimitError extends WebSocketServerError {
  constructor(limitType: 'messages' | 'connections') {
    super(
      `Rate limit exceeded: ${limitType}`,
      'RATE_LIMIT_EXCEEDED',
      1008
    );
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

// ============================================================================
// 导出
// ============================================================================

export default {
  MessageType,
  WebSocketServerError,
  ConnectionRejectedError,
  AuthenticationError,
  RateLimitError,
};
