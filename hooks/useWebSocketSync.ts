/**
 * WebSocket同步Hook
 *
 * 自动订阅并同步服务端状态到Zustand store
 *
 * @module hooks/useWebSocketSync
 * @version 2.0.0
 */

import { logger } from '@/utils/logger';
import { useEffect, useRef, useCallback } from 'react';
import { useTaskStore, TaskEvent } from '../stores/taskStore';
import { useUIStore } from '../stores/uiStore';
import { getWebSocketService } from '../services/websocket/websocketService';

// ============ 类型定义 ============

export interface WebSocketSyncOptions {
  enabled?: boolean;
  wsUrl?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

export interface UseWebSocketSyncReturn {
  isConnected: boolean;
  connectionId: string | null;
  lastSyncTime: number | null;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

// ============ 主Hook ============

/**
 * WebSocket同步Hook
 *
 * 自动订阅并同步服务端状态到Zustand store
 *
 * @param options - 同步选项
 * @returns WebSocket连接状态和控制方法
 */
export function useWebSocketSync(options: WebSocketSyncOptions = {}): UseWebSocketSyncReturn {
  const {
    enabled = true,
    wsUrl = 'ws://localhost:3001',
    autoReconnect = true,
    reconnectInterval = 3000,
    onConnected,
    onDisconnected,
    onError
  } = options;

  // Store引用
  const syncFromWebSocket = useTaskStore(state => state.syncFromWebSocket);
  const syncTasks = useTaskStore(state => state.syncTasks);
  const updateSyncTime = useTaskStore(state => state.updateSyncTime);
  const showSuccess = useUIStore(state => state.showSuccess);
  const showError = useUIStore(state => state.showError);
  const setLoading = useUIStore(state => state.setLoading);

  // 使用ref来避免闭包陷阱
  const wsRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * 连接WebSocket
   */
  const connect = useCallback(async () => {
    if (!enabled || !isMountedRef.current) {
      return;
    }

    try {
      setLoading('ws-connect', true);

      // 创建WebSocket服务实例
      const wsService = getWebSocketService('client', wsUrl, {
        reconnect: autoReconnect,
        reconnectInterval
      });

      wsRef.current = wsService;

      // 监听连接事件
      wsService.on('connected', () => {
        logger.debug('[WebSocketSync] Connected to server');
        if (isMountedRef.current) {
          setLoading('ws-connect', false);
          onConnected?.();

          // 订阅任务事件
          subscribeToTaskEvents(wsService);
        }
      });

      // 监听断开事件
      wsService.on('disconnected', () => {
        logger.debug('[WebSocketSync] Disconnected from server');
        if (isMountedRef.current) {
          setLoading('ws-connect', false);
          onDisconnected?.();

          // 自动重连
          if (autoReconnect) {
            scheduleReconnect();
          }
        }
      });

      // 监听错误事件
      wsService.on('error', (error: Error) => {
        logger.error('[WebSocketSync] Error:', error);
        if (isMountedRef.current) {
          setLoading('ws-connect', false);
          onError?.(error);
        }
      });

      // 建立连接
      await wsService.connect();

    } catch (error) {
      logger.error('[WebSocketSync] Failed to connect:', error);
      if (isMountedRef.current) {
        setLoading('ws-connect', false);
        onError?.(error as Error);

        // 自动重连
        if (autoReconnect) {
          scheduleReconnect();
        }
      }
    }
  }, [enabled, wsUrl, autoReconnect, reconnectInterval, onConnected, onDisconnected, onError, setLoading]);

  /**
   * 订阅任务事件
   */
  const subscribeToTaskEvents = useCallback((wsService: any) => {
    // 订阅任务创建事件
    wsService.subscribe('task:created', (message: any) => {
      logger.debug('[WebSocketSync] Task created:', message);
      syncFromWebSocket({
        type: 'task:created',
        taskId: message.taskId,
        task: message.task
      });
      updateSyncTime();
      showSuccess('任务创建', `任务 ${message.taskId} 已创建`);
    });

    // 订阅任务更新事件
    wsService.subscribe('task:updated', (message: any) => {
      logger.debug('[WebSocketSync] Task updated:', message);
      syncFromWebSocket({
        type: 'task:updated',
        taskId: message.taskId,
        updates: message.updates
      });
      updateSyncTime();
    });

    // 订阅任务删除事件
    wsService.subscribe('task:deleted', (message: any) => {
      logger.debug('[WebSocketSync] Task deleted:', message);
      syncFromWebSocket({
        type: 'task:deleted',
        taskId: message.taskId
      });
      updateSyncTime();
      showSuccess('任务删除', `任务 ${message.taskId} 已删除`);
    });

    // 订阅任务进度事件
    wsService.subscribe('task:progress', (message: any) => {
      logger.debug('[WebSocketSync] Task progress:', message);
      syncFromWebSocket({
        type: 'task:progress',
        taskId: message.taskId,
        updates: {
          progress: message.progress,
          status: message.status
        }
      });
      updateSyncTime();
    });

    // 订阅任务失败事件
    wsService.subscribe('task:failed', (message: any) => {
      logger.error('[WebSocketSync] Task failed:', message);
      syncFromWebSocket({
        type: 'task:updated',
        taskId: message.taskId,
        updates: {
          status: 'failed',
          error: message.error
        }
      });
      updateSyncTime();
      showError('任务失败', `任务 ${message.taskId} 执行失败: ${message.error}`);
    });

    // 订阅任务完成事件
    wsService.subscribe('task:completed', (message: any) => {
      logger.info('[WebSocketSync] Task completed:', message);
      syncFromWebSocket({
        type: 'task:updated',
        taskId: message.taskId,
        updates: {
          status: 'completed',
          progress: 100,
          downloadUrl: message.downloadUrl
        }
      });
      updateSyncTime();
      showSuccess('任务完成', `任务 ${message.taskId} 已完成`);
    });

    // 请求初始任务列表
    wsService.send('task:list', {}).then(() => {
      logger.debug('[WebSocketSync] Requested initial task list');
    }).catch((error: Error) => {
      logger.error('[WebSocketSync] Failed to request task list:', error);
    });

    // 订阅任务列表响应
    wsService.subscribe('task:list:response', (message: any) => {
      logger.debug('[WebSocketSync] Received task list:', message.tasks?.length || 0);
      if (message.tasks) {
        syncTasks(message.tasks);
        updateSyncTime();
      }
    });
  }, [syncFromWebSocket, syncTasks, updateSyncTime, showSuccess, showError]);

  /**
   * 安排重连
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      logger.debug('[WebSocketSync] Attempting to reconnect...');
      connect();
    }, reconnectInterval);
  }, [connect, reconnectInterval]);

  /**
   * 手动重连
   */
  const reconnect = useCallback(async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // 先断开现有连接
    if (wsRef.current?.isConnected()) {
      await wsRef.current.disconnect();
    }

    await connect();
  }, [connect]);

  /**
   * 断开连接
   */
  const disconnect = useCallback(async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current?.isConnected()) {
      await wsRef.current.disconnect();
    }

    wsRef.current = null;
  }, []);

  /**
   * 清理函数
   */
  useEffect(() => {
    isMountedRef.current = true;

    // 建立连接
    if (enabled) {
      connect();
    }

    return () => {
      isMountedRef.current = false;

      // 清理重连定时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // 断开WebSocket连接
      if (wsRef.current?.isConnected()) {
        wsRef.current.unsubscribe('task:created');
        wsRef.current.unsubscribe('task:updated');
        wsRef.current.unsubscribe('task:deleted');
        wsRef.current.unsubscribe('task:progress');
        wsRef.current.unsubscribe('task:failed');
        wsRef.current.unsubscribe('task:completed');
        wsRef.current.unsubscribe('task:list:response');
        wsRef.current.disconnect();
      }
    };
  }, [enabled, connect]);

  // 获取连接状态
  const isConnected = wsRef.current?.isConnected() || false;
  const connectionId = wsRef.current?.getConnectionId() || null;
  const lastSyncTime = useTaskStore(state => state.lastSyncTime);

  return {
    isConnected,
    connectionId,
    lastSyncTime,
    reconnect,
    disconnect
  };
}

// ============ 便捷Hook ============

/**
 * 简化的WebSocket同步Hook
 * 使用默认配置自动同步任务状态
 */
export function useAutoSync() {
  return useWebSocketSync({
    enabled: true,
    autoReconnect: true,
    wsUrl: 'ws://localhost:3001'
  });
}

/**
 * WebSocket连接状态Hook
 * 只获取连接状态，不自动同步
 */
export function useWebSocketConnection() {
  const [isConnected, setIsConnected] = React.useState(false);
  const wsRef = useRef<any>(null);

  useEffect(() => {
    const wsService = getWebSocketService('client', 'ws://localhost:3001');

    wsRef.current = wsService;

    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);

    wsService.on('connected', handleConnected);
    wsService.on('disconnected', handleDisconnected);

    wsService.connect().catch(console.error);

    return () => {
      wsService.off('connected', handleConnected);
      wsService.off('disconnected', handleDisconnected);
      wsService.disconnect().catch(console.error);
    };
  }, []);

  return isConnected;
}

// 导入React用于useState
import React from 'react';
