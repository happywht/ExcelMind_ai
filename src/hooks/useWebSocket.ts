/**
 * WebSocket连接Hook
 *
 * 提供WebSocket连接管理、自动重连、消息订阅等功能
 *
 * @version 2.0.0
 */

import { logger } from '@/utils/logger';
import { useEffect, useState, useCallback, useRef } from 'react';

// ==================== 类型定义 ====================

export interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp?: string;
}

export type WebSocketMessageHandler = (message: WebSocketMessage) => void;

export interface UseWebSocketOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: WebSocketMessageHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export interface WebSocketClient {
  connect: () => void;
  disconnect: () => void;
  send: (data: any) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  on: (event: string, handler: WebSocketMessageHandler) => void;
  off: (event: string, handler: WebSocketMessageHandler) => void;
  isConnected: () => boolean;
}

// ==================== WebSocket客户端类 ====================

class WebSocketClientImpl implements WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<UseWebSocketOptions>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private messageHandlers = new Map<string, Set<WebSocketMessageHandler>>();
  private subscriptions = new Set<string>();
  private manualClose = false;

  constructor(url: string, options: UseWebSocketOptions = {}) {
    this.url = url;
    this.options = {
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      onMessage: () => {},
      onConnect: () => {},
      onDisconnect: () => {},
      onError: () => {},
      ...options,
    };
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.debug('[WebSocket] 已经连接');
      return;
    }

    this.manualClose = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        logger.debug('[WebSocket] 连接成功');
        this.reconnectAttempts = 0;

        // 重新订阅之前的频道
        this.subscriptions.forEach(channel => {
          this.send({
            action: 'subscribe',
            channel,
          });
        });

        // 触发连接回调
        this.options.onConnect();

        // 触发连接事件
        this.emit('connected', {
          type: 'connected',
          timestamp: new Date().toISOString(),
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          logger.debug('[WebSocket] 收到消息:', message);

          // 触发全局消息处理
          this.options.onMessage(message);

          // 触发特定类型的处理
          this.emit(message.type, message);
        } catch (error) {
          logger.error('[WebSocket] 解析消息失败:', error);
        }
      };

      this.ws.onerror = (error) => {
        logger.error('[WebSocket] 连接错误:', error);
        this.options.onError(error);

        this.emit('error', {
          type: 'error',
          payload: error,
          timestamp: new Date().toISOString(),
        });
      };

      this.ws.onclose = () => {
        logger.debug('[WebSocket] 连接关闭');
        this.options.onDisconnect();

        this.emit('disconnected', {
          type: 'disconnected',
          timestamp: new Date().toISOString(),
        });

        // 自动重连
        if (!this.manualClose && this.options.autoReconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      logger.error('[WebSocket] 创建连接失败:', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.manualClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      logger.warn('[WebSocket] 未连接，无法发送消息');
    }
  }

  subscribe(channel: string): void {
    this.subscriptions.add(channel);

    if (this.isConnected()) {
      this.send({
        action: 'subscribe',
        channel,
      });
    }
  }

  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);

    if (this.isConnected()) {
      this.send({
        action: 'unsubscribe',
        channel,
      });
    }
  }

  on(event: string, handler: WebSocketMessageHandler): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: WebSocketMessageHandler): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(event);
      }
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private emit(event: string, message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          logger.error(`[WebSocket] 处理事件 ${event} 失败:`, error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      logger.error('[WebSocket] 达到最大重连次数，停止重连');
      return;
    }

    if (this.reconnectTimer) {
      return; // 已经在重连中
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectInterval * Math.min(this.reconnectAttempts, 5);

    logger.debug(`[WebSocket] ${delay}ms后进行第${this.reconnectAttempts}次重连`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

// ==================== React Hook ====================

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [client, setClient] = useState<WebSocketClientImpl | null>(null);
  const clientRef = useRef<WebSocketClientImpl | null>(null);

  // 初始化客户端
  useEffect(() => {
    const wsClient = new WebSocketClientImpl(url, {
      ...options,
      onConnect: () => {
        setConnected(true);
        options.onConnect?.();
      },
      onDisconnect: () => {
        setConnected(false);
        options.onDisconnect?.();
      },
    });

    clientRef.current = wsClient;
    setClient(wsClient);

    // 自动连接
    wsClient.connect();

    return () => {
      wsClient.disconnect();
    };
  }, [url]);

  // 注册消息处理
  useEffect(() => {
    if (client && options.onMessage) {
      client.on('message', options.onMessage);
      return () => {
        client.off('message', options.onMessage);
      };
    }
  }, [client, options.onMessage]);

  const sendMessage = useCallback((data: any) => {
    clientRef.current?.send(data);
  }, []);

  const subscribe = useCallback((channel: string) => {
    clientRef.current?.subscribe(channel);
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    clientRef.current?.unsubscribe(channel);
  }, []);

  const on = useCallback((event: string, handler: WebSocketMessageHandler) => {
    clientRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: string, handler: WebSocketMessageHandler) => {
    clientRef.current?.off(event, handler);
  }, []);

  return {
    client,
    connected,
    send: sendMessage,
    subscribe,
    unsubscribe,
    on,
    off,
  };
}

export default useWebSocket;
