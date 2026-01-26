/**
 * WebSocket 服务器配置
 *
 * 处理实时进度推送、任务状态更新等
 */

import { logger } from '@/utils/logger';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  TaskProgressMessage,
  GenerationStatusMessage,
  AuditAlertMessage,
  PerformanceAlertMessage,
  WebSocketSubscribeMessage,
} from '../types/apiTypes';

/**
 * WebSocket 客户端连接
 */
interface WebSocketClient extends WebSocket {
  id: string;
  subscribedChannels: Set<string>;
  filters?: Record<string, any>;
}

/**
 * 任务进度数据
 */
interface TaskProgress {
  taskId: string;
  progress: number;
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  estimatedTimeRemaining: number;
}

/**
 * 存储活动任务进度
 */
const activeTasks = new Map<string, TaskProgress>();

/**
 * 存储连接的客户端
 */
const clients = new Map<string, WebSocketClient>();

/**
 * 设置 WebSocket 服务器
 */
export function setupWebSocket(wss: WebSocketServer): void {
  logger.debug('[WebSocket] 服务器初始化');

  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = uuidv4();
    const client = ws as WebSocketClient;
    client.id = clientId;
    client.subscribedChannels = new Set();

    clients.set(clientId, client);

    logger.debug(`[WebSocket] 客户端连接: ${clientId}`);

    // 发送欢迎消息
    sendToClient(client, {
      type: 'connected',
      timestamp: new Date().toISOString(),
      clientId,
    });

    // 处理消息
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        // 处理订阅消息
        if (message.action === 'subscribe') {
          handleSubscribe(client, message as WebSocketSubscribeMessage);
        }
      } catch (error) {
        logger.error(`[WebSocket] 消息处理错误:`, error);
      }
    });

    // 处理错误
    ws.on('error', (error) => {
      logger.error(`[WebSocket] 客户端错误: ${clientId}`, error);
    });

    // 处理断开连接
    ws.on('close', () => {
      logger.debug(`[WebSocket] 客户端断开: ${clientId}`);
      clients.delete(clientId);
    });
  });

  // 定期清理断开的客户端
  setInterval(() => {
    for (const [clientId, client] of clients.entries()) {
      if (client.readyState !== WebSocket.OPEN) {
        clients.delete(clientId);
      }
    }
  }, 30000); // 每30秒清理一次
}

/**
 * 处理客户端订阅
 */
function handleSubscribe(
  client: WebSocketClient,
  message: WebSocketSubscribeMessage
): void {
  const { channels, filters } = message;

  // 清除之前的订阅
  client.subscribedChannels.clear();

  // 添加新订阅
  channels.forEach((channel) => {
    client.subscribedChannels.add(channel);
  });

  // 设置过滤器
  if (filters) {
    client.filters = filters;
  }

  logger.debug(`[WebSocket] 客户端 ${client.id} 订阅频道:`, channels);

  // 发送确认
  sendToClient(client, {
    type: 'subscribed',
    timestamp: new Date().toISOString(),
    channels: Array.from(client.subscribedChannels),
  });
}

/**
 * 发送消息到指定客户端
 */
function sendToClient(client: WebSocket, data: any): void {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

/**
 * 广播消息到所有订阅的客户端
 */
function broadcast(channel: string, message: any): void {
  for (const client of clients.values()) {
    if (client.subscribedChannels.has(channel)) {
      // 应用过滤器
      if (client.filters && client.filters.taskId) {
        if (message.taskId === client.filters.taskId) {
          sendToClient(client, message);
        }
      } else {
        sendToClient(client, message);
      }
    }
  }
}

/**
 * 更新任务进度
 */
export function updateTaskProgress(taskId: string, progress: Partial<TaskProgress>): void {
  const existing = activeTasks.get(taskId);
  const updated: TaskProgress = {
    taskId,
    progress: 0,
    currentStep: '',
    completedSteps: 0,
    totalSteps: 0,
    estimatedTimeRemaining: 0,
    ...existing,
    ...progress,
  };

  activeTasks.set(taskId, updated);

  // 广播进度更新
  const message: TaskProgressMessage = {
    type: 'task_progress',
    timestamp: new Date().toISOString(),
    taskId,
    data: {
      progress: updated.progress,
      currentStep: updated.currentStep,
      completedSteps: updated.completedSteps,
      totalSteps: updated.totalSteps,
      estimatedTimeRemaining: updated.estimatedTimeRemaining,
    },
  };

  broadcast('task_progress', message);
}

/**
 * 发送生成状态消息
 */
export function sendGenerationStatus(
  taskId: string,
  templateId: string,
  status: 'completed' | 'failed',
  data: any
): void {
  const message: GenerationStatusMessage = {
    type: 'generation_status',
    timestamp: new Date().toISOString(),
    taskId,
    data: {
      templateId,
      templateName: data.templateName || 'Unknown',
      status,
      completedCount: data.completedCount || 0,
      totalCount: data.totalCount || 0,
      failedCount: data.failedCount || 0,
      downloadUrl: data.downloadUrl,
    },
  };

  broadcast('generation_status', message);
}

/**
 * 发送审计告警消息
 */
export function sendAuditAlert(data: any): void {
  const message: AuditAlertMessage = {
    type: 'audit_alert',
    timestamp: new Date().toISOString(),
    severity: data.severity,
    data: {
      auditId: data.auditId,
      ruleId: data.ruleId,
      ruleName: data.ruleName,
      message: data.message,
      violations: data.violations || [],
    },
  };

  broadcast('audit_alerts', message);
}

/**
 * 发送性能告警消息
 */
export function sendPerformanceAlert(data: any): void {
  const message: PerformanceAlertMessage = {
    type: 'performance_alert',
    timestamp: new Date().toISOString(),
    severity: data.severity,
    data: {
      alertId: data.alertId,
      metric: data.metric,
      currentValue: data.currentValue,
      threshold: data.threshold,
      message: data.message,
    },
  };

  broadcast('performance_alerts', message);
}

/**
 * 获取任务进度
 */
export function getTaskProgress(taskId: string): TaskProgress | undefined {
  return activeTasks.get(taskId);
}

/**
 * 移除任务进度
 */
export function removeTaskProgress(taskId: string): void {
  activeTasks.delete(taskId);
}

// 导出工具函数
export { broadcast, sendToClient };
