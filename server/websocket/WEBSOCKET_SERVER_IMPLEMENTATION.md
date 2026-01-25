# WebSocket服务器实现文档

## 概述

本文档描述了ExcelMind AI项目的WebSocket服务器实现，该服务器为批量文档生成任务提供实时进度推送功能。

## 架构设计

### 组件架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Server                        │
│  ┌──────────────────┐         ┌──────────────────────────┐  │
│  │  Express HTTP    │         │   WebSocket Server       │  │
│  │     Server       │◄────────┤       (ws library)        │  │
│  └──────────────────┘         └───────────┬──────────────┘  │
│                                             │                 │
│                                    ┌────────▼──────────┐     │
│                                    │ ProgressBroadcaster│     │
│                                    └────────┬──────────┘     │
│                                             │                 │
│                                    ┌────────▼──────────┐     │
│                                    │BatchGeneration    │     │
│                                    │    Scheduler      │     │
│                                    └───────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. WebSocketServer (`server/websocket/websocketServer.ts`)

**职责：**
- 管理WebSocket连接
- 客户端连接池管理
- 房间/频道订阅系统
- 消息广播和路由
- 心跳检测
- 速率限制和安全控制

**主要特性：**
- 支持数千个并发连接
- 房间隔离和消息路由
- 自动心跳检测和超时处理
- 消息队列支持离线客户端
- 详细的统计和监控

**API接口：**
```typescript
// 服务器控制
async start(): Promise<void>
async stop(): Promise<void>

// 客户端管理
async addClient(clientId: string, ws: WebSocket): Promise<void>
async removeClient(clientId: string): Promise<void>
async getClient(clientId: string): ClientConnection | null
async disconnectClient(clientId: string, code?: number, reason?: string): Promise<void>

// 房间管理
async subscribe(clientId: string, room: string): Promise<void>
async unsubscribe(clientId: string, room: string): Promise<void>
getRoomClients(room: string): string[]

// 消息发送
async broadcast(room: string, message: WebSocketMessage): Promise<void>
async send(clientId: string, message: WebSocketMessage): Promise<void>
async sendToRoom(room: string, message: WebSocketMessage): Promise<void>
async broadcastToAll(message: WebSocketMessage): Promise<void>

// 统计
getStats(): WebSocketServerStats
```

#### 2. ProgressBroadcaster (`server/websocket/progressBroadcaster.ts`)

**职责：**
- 监听批量任务进度变化
- 实时推送到订阅的客户端
- 支持增量更新
- 批量推送优化

**主要特性：**
- 智能增量更新（只推送变化的字段）
- 批量消息合并
- 广播队列管理
- 任务进度缓存
- 自适应节流

**API接口：**
```typescript
// 任务事件处理
async onTaskStarted(task: BatchGenerationTask): Promise<void>
async onTaskProgress(task: BatchGenerationTask): Promise<void>
async onTaskCompleted(task: BatchGenerationTask): Promise<void>
async onTaskFailed(task: BatchGenerationTask): Promise<void>
async onTaskPaused(task: BatchGenerationTask): Promise<void>
async onTaskCancelled(task: BatchGenerationTask): Promise<void>

// 批量广播
async broadcastBatchProgress(tasks: BatchGenerationTask[]): Promise<void>
async broadcastToRoom(room: string, message: WebSocketMessage): Promise<void>

// 统计
getStats(): BroadcastStats

// 清理
destroy(): void
```

#### 3. AppServer (`server/index.ts`)

**职责：**
- 集成Express HTTP服务器
- 集成WebSocket服务器
- 集成进度广播器
- 提供统一的API接口

**配置选项：**
```typescript
const server = new AppServer();
await server.start(httpPort, wsPort);

// 集成批量调度器
server.integrateBatchScheduler(scheduler);
```

## 消息类型

### 消息结构

所有WebSocket消息遵循统一格式：

```typescript
interface WebSocketMessage {
  type: MessageType;      // 消息类型
  payload: any;           // 消息载荷
  timestamp: number;      // 时间戳
  id?: string;           // 消息唯一ID
}
```

### 消息类型枚举

```typescript
enum MessageType {
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
```

### 任务进度消息

```typescript
interface TaskProgressMessage {
  taskId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;        // 0-100
  current: number;         // 当前进度
  total: number;           // 总数
  stage: string;           // 当前阶段
  estimatedTimeRemaining?: number;  // 预计剩余时间（毫秒）
  message?: string;        // 状态消息
}
```

## 配置

### WebSocket服务器配置

位置：`config/websocket.config.ts`

```typescript
interface WebSocketServerConfig {
  port: number;                    // 服务器端口
  path: string;                    // WebSocket路径
  heartbeatInterval: number;       // 心跳间隔（毫秒）
  connectionTimeout: number;       // 连接超时（毫秒）
  maxClients: number;              // 最大客户端数
  messageQueueSize: number;        // 消息队列大小
  enableCompression: boolean;      // 是否启用压缩
  enableAuthentication: boolean;   // 是否启用认证
  authSecret?: string;            // 认证密钥
  rateLimit: {
    maxMessagesPerMinute: number;  // 每分钟最大消息数
    maxConnectionsPerMinute: number; // 每分钟最大连接数
  };
  reconnect: {
    maxAttempts: number;           // 最大重连次数
    delay: number;                 // 重连延迟（毫秒）
    exponentialBackoff: boolean;   // 指数退避
  };
}
```

### 环境变量

```bash
# WebSocket配置
WEBSOCKET_PORT=3001
WEBSOCKET_PATH=/ws
WEBSOCKET_SECURE=false
WEBSOCKET_HOST=localhost
WEBSOCKET_AUTH_ENABLED=false
WEBSOCKET_AUTH_SECRET=your-secret-key

# HTTP服务器配置
HTTP_PORT=3000

# 环境配置
NODE_ENV=development  # development | production | test
```

## 使用指南

### 服务器启动

#### 1. 独立启动

```bash
# 直接运行服务器
node server/index.ts

# 或使用npm脚本
npm run start:websocket
```

#### 2. 集成到Express应用

```typescript
import { getAppServer } from './server';

const server = getAppServer();
await server.start(3000, 3001);
```

#### 3. 集成批量调度器

```typescript
import { BatchGenerationScheduler } from './services/BatchGenerationScheduler';
import { getAppServer } from './server';

const scheduler = new BatchGenerationScheduler(
  templateManager,
  documentGenerator,
  websocketManager
);

const server = getAppServer();
server.integrateBatchScheduler(scheduler);

await server.start(3000, 3001);
```

### 客户端连接

#### 1. 基本连接

```typescript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

#### 2. 订阅任务进度

```typescript
// 连接后订阅任务
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    taskIds: ['task-123', 'task-456'],
    rooms: ['task:task-123']
  }));
};
```

#### 3. 接收进度更新

```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'task_started':
      console.log('Task started:', message.payload.taskId);
      break;

    case 'task_progress':
      console.log(`Progress: ${message.payload.progress}%`);
      break;

    case 'task_completed':
      console.log('Task completed:', message.payload.result);
      break;

    case 'task_failed':
      console.error('Task failed:', message.payload.error);
      break;
  }
};
```

### API端点

#### 健康检查

```
GET /health
```

响应：
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "uptime": 123.456,
  "websocket": {
    "connections": 10,
    "messages": 1000
  },
  "broadcaster": {
    "queueSize": 0,
    "totalBroadcasts": 500
  }
}
```

#### WebSocket统计

```
GET /api/websocket/stats
```

响应：
```json
{
  "server": {
    "uptime": 123456,
    "startTime": 1234567890,
    "version": "1.0.0"
  },
  "connections": {
    "total": 100,
    "active": 10,
    "authenticated": 8
  },
  "messages": {
    "totalSent": 10000,
    "totalReceived": 5000,
    "sentPerMinute": 100,
    "receivedPerMinute": 50
  },
  "rooms": {
    "total": 5,
    "clients": 10
  },
  "memory": {
    "used": 12345678,
    "total": 100000000,
    "percentage": 12.34
  }
}
```

#### 广播器统计

```
GET /api/broadcaster/stats
```

响应：
```json
{
  "totalBroadcasts": 1000,
  "totalMessages": 10000,
  "successfulSends": 9950,
  "failedSends": 50,
  "averageLatency": 10.5,
  "queueSize": 0,
  "cacheSize": 5,
  "lastUpdate": 1234567890
}
```

## 性能优化

### 1. 增量更新

进度广播器只推送变化超过阈值的进度更新：

```typescript
const config: ProgressBroadcasterConfig = {
  enableIncrementalUpdates: true,
  minChangeThreshold: 1,  // 1%变化阈值
};
```

### 2. 批量推送

多个消息合并为单个批量消息：

```typescript
const config: ProgressBroadcasterConfig = {
  batchSize: 10,
  broadcastInterval: 100,  // 100ms
};
```

### 3. 消息压缩

启用WebSocket压缩：

```typescript
const config: WebSocketServerConfig = {
  enableCompression: true,
};
```

### 4. 速率限制

防止客户端过载：

```typescript
const config: WebSocketServerConfig = {
  rateLimit: {
    maxMessagesPerMinute: 100,
    maxConnectionsPerMinute: 10,
  },
};
```

## 安全考虑

### 1. 认证

启用客户端认证：

```typescript
const config: WebSocketServerConfig = {
  enableAuthentication: true,
  authSecret: process.env.WEBSOCKET_AUTH_SECRET,
};
```

### 2. 速率限制

防止DDoS攻击：

```typescript
const config: WebSocketServerConfig = {
  rateLimit: {
    maxMessagesPerMinute: 100,
    maxConnectionsPerMinute: 10,
  },
};
```

### 3. 连接限制

限制最大客户端数：

```typescript
const config: WebSocketServerConfig = {
  maxClients: 1000,
};
```

## 监控和调试

### 1. 日志

服务器输出详细日志：

```
WebSocket服务器已在端口 3001 启动
客户端连接: client_abc123 (总连接: 1)
客户端 client_abc123 加入房间 task:task-456
广播消息到房间 task:task-456
客户端断开: client_abc123 (总连接: 0)
```

### 2. 统计信息

通过API获取实时统计：

```bash
curl http://localhost:3000/api/websocket/stats
curl http://localhost:3000/api/broadcaster/stats
```

### 3. 性能监控

监控内存使用和连接数：

```typescript
const stats = websocketServer.getStats();
console.log('Memory usage:', stats.memory.percentage, '%');
console.log('Active connections:', stats.connections.active);
```

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行WebSocket服务器测试
npm run test:websocket

# 运行测试并查看覆盖率
npm run test:coverage
```

### 测试覆盖

- ✅ 服务器启动和停止
- ✅ 客户端连接管理
- ✅ 消息发送和接收
- ✅ 房间管理
- ✅ 心跳检测
- ✅ 统计信息
- ✅ 错误处理

## 故障排除

### 常见问题

#### 1. 连接被拒绝

**问题：** 客户端无法连接到服务器

**解决方案：**
- 检查服务器是否正在运行
- 验证端口和路径配置
- 检查防火墙设置

#### 2. 连接频繁断开

**问题：** 客户端连接不稳定

**解决方案：**
- 增加心跳间隔
- 检查网络连接
- 验证连接超时设置

#### 3. 消息未送达

**问题：** 客户端未收到进度更新

**解决方案：**
- 检查客户端是否正确订阅
- 验证任务ID是否正确
- 查看服务器日志

## 未来改进

### 计划功能

1. **Redis适配器**
   - 支持分布式WebSocket服务器
   - Redis pub/sub用于跨服务器消息传递

2. **消息持久化**
   - 存储离线消息
   - 消息历史查询

3. **高级认证**
   - JWT令牌验证
   - OAuth2集成

4. **性能增强**
   - 二进制消息支持
   - WebSocket压缩优化

5. **监控增强**
   - Prometheus指标导出
   - 性能分析工具

## 参考资料

- [WebSocket协议RFC](https://tools.ietf.org/html/rfc6455)
- [ws库文档](https://github.com/websockets/ws)
- [Socket.IO文档](https://socket.io/docs/)
- [WebSocket最佳实践](https://websocket.org/)

## 版本历史

### v1.0.0 (2024-01-15)

- 初始版本
- 基础WebSocket服务器实现
- 进度广播器实现
- 房间管理功能
- 心跳检测
- 速率限制
- 统计和监控

## 贡献

欢迎贡献！请遵循以下步骤：

1. Fork仓库
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License

## 联系方式

- 项目主页: https://github.com/excelmind-ai
- 问题反馈: https://github.com/excelmind-ai/issues
