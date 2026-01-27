/**
 * 智能处理API客户端
 *
 * 前端使用的API客户端
 * 封装所有智能处理相关的HTTP请求
 *
 * @module services/api/smartProcessApi
 */

import { logger } from '@/utils/logger';
import { TaskResult } from '../types/agenticTypes';

/**
 * API基础URL配置
 */
const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  }
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * 获取认证令牌
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
};

/**
 * 获取客户端ID
 */
const getClientId = (): string => {
  let clientId = localStorage.getItem('excelmind_client_id');
  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('excelmind_client_id', clientId);
  }
  return clientId;
};

/**
 * 通用API请求辅助函数
 */
const apiRequest = async (
  method: string,
  endpoint: string,
  data?: any
): Promise<any> => {
  const url = `${API_BASE_URL}/v2/ai/smart-process${endpoint}`;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.debug('[smartProcessApi] Sending request', {
      method,
      endpoint,
      requestId
    });

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': getClientId(),
        'X-Request-ID': requestId,
        ...(getAuthToken() && { 'Authorization': `Bearer ${getAuthToken()}` })
      },
      ...(data && { body: JSON.stringify(data) })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || result.message || 'API调用失败');
    }

    if (!result.success) {
      throw new Error(result.error?.message || '操作失败');
    }

    logger.debug('[smartProcessApi] Request successful', {
      method,
      endpoint,
      requestId
    });

    return result.data;

  } catch (error) {
    logger.error('[smartProcessApi] Request failed', {
      method,
      endpoint,
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
};

/**
 * 智能处理请求接口
 */
export interface SmartProcessOptions {
  command: string;
  files: Array<{
    id: string;
    fileName: string;
    sheets: { [sheetName: string]: any[] };
    currentSheetName: string;
    metadata?: any;
  }>;
  options?: {
    useAgenticMode?: boolean;
    maxRetries?: number;
    qualityThreshold?: number;
    enableAutoRepair?: boolean;
  };
}

/**
 * 智能处理响应接口
 */
export interface SmartProcessResponse {
  taskId: string;
  status: string;
  message?: string;
  links?: {
    self: string;
    stream: string;
    cancel: string;
  };
  result?: TaskResult;
  executionTime?: number;
}

/**
 * SmartProcessApi - 智能处理API客户端
 */
export const smartProcessApi = {
  /**
   * 执行智能处理
   *
   * @param options 处理选项
   * @returns 任务ID和状态
   *
   * @example
   * const result = await smartProcessApi.execute({
   *   command: "对比表A和表B",
   *   files: filesData,
   *   options: { useAgenticMode: true }
   * });
   * console.log(result.taskId);
   */
  async execute(options: SmartProcessOptions): Promise<SmartProcessResponse> {
    try {
      logger.info('[smartProcessApi] Starting smart process');

      const result = await apiRequest('POST', '/', {
        command: options.command,
        files: options.files,
        options: options.options
      });

      logger.info('[smartProcessApi] Task started', {
        taskId: result.taskId,
        status: result.status
      });

      return result;

    } catch (error) {
      logger.error('[smartProcessApi] Execute failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(
        error instanceof Error
          ? error.message
          : '启动智能处理失败'
      );
    }
  },

  /**
   * 获取任务状态
   *
   * @param taskId 任务ID
   * @returns 任务状态和结果
   *
   * @example
   * const status = await smartProcessApi.getStatus('task_12345');
   * if (status.status === 'completed') {
   *   console.log(status.result);
   * }
   */
  async getStatus(taskId: string): Promise<SmartProcessResponse> {
    try {
      const result = await apiRequest('GET', `/${taskId}`);

      logger.debug('[smartProcessApi] Got task status', {
        taskId,
        status: result.status
      });

      return result;

    } catch (error) {
      logger.error('[smartProcessApi] Get status failed', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  },

  /**
   * 等待任务完成(轮询)
   *
   * @param taskId 任务ID
   * @param options 轮询选项
   * @returns 任务结果
   *
   * @example
   * const result = await smartProcessApi.waitForCompletion('task_12345', {
   *   pollInterval: 2000,
   *   timeout: 60000,
   *   onProgress: (status) => console.log(status)
   * });
   */
  async waitForCompletion(
    taskId: string,
    options: {
      pollInterval?: number; // 轮询间隔(毫秒)
      timeout?: number; // 超时时间(毫秒)
      onProgress?: (status: SmartProcessResponse) => void; // 进度回调
    } = {}
  ): Promise<TaskResult> {
    const {
      pollInterval = 2000,
      timeout = 60000,
      onProgress
    } = options;

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          // 检查超时
          if (Date.now() - startTime > timeout) {
            reject(new Error('任务执行超时'));
            return;
          }

          // 获取任务状态
          const status = await this.getStatus(taskId);

          // 触发进度回调
          if (onProgress) {
            onProgress(status);
          }

          // 检查任务状态
          if (status.status === 'completed' && status.result) {
            logger.info('[smartProcessApi] Task completed', { taskId });
            resolve(status.result);
          } else if (status.status === 'failed') {
            reject(new Error('任务执行失败'));
          } else {
            // 继续轮询
            setTimeout(poll, pollInterval);
          }

        } catch (error) {
          logger.error('[smartProcessApi] Poll failed', {
            taskId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          reject(error);
        }
      };

      // 开始轮询
      poll();
    });
  },

  /**
   * 取消任务
   *
   * @param taskId 任务ID
   * @returns 取消结果
   *
   * @example
   * await smartProcessApi.cancel('task_12345');
   */
  async cancel(taskId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await apiRequest('POST', `/${taskId}/cancel`);

      logger.info('[smartProcessApi] Task cancelled', { taskId });

      return {
        success: true,
        message: result.message || '任务已取消'
      };

    } catch (error) {
      logger.error('[smartProcessApi] Cancel failed', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  },

  /**
   * 监听实时进度(使用EventSource)
   *
   * @param taskId 任务ID
   * @param callbacks 事件回调
   * @returns EventSource实例
   *
   * @example
   * const eventSource = smartProcessApi.stream('task_12345', {
   *   onProgress: (data) => console.log('Progress:', data),
   *   onLog: (data) => console.log('Log:', data),
   *   onComplete: (data) => console.log('Complete:', data),
   *   onError: (data) => console.error('Error:', data)
   * });
   *
   * // 关闭连接
   * eventSource.close();
   */
  stream(taskId: string, callbacks: {
    onProgress?: (data: any) => void;
    onLog?: (data: any) => void;
    onComplete?: (data: any) => void;
    onError?: (data: any) => void;
  }): EventSource {
    const url = `${API_BASE_URL}/v2/ai/smart-process/${taskId}/stream`;
    const token = getAuthToken();

    // 添加认证参数
    const authParams = token ? `?token=${encodeURIComponent(token)}` : '';
    const eventSource = new EventSource(url + authParams);

    // 监听进度事件
    eventSource.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onProgress?.(data);
      } catch (error) {
        logger.error('[smartProcessApi] Failed to parse progress event', {
          taskId,
          error
        });
      }
    });

    // 监听日志事件
    eventSource.addEventListener('log', (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onLog?.(data);
      } catch (error) {
        logger.error('[smartProcessApi] Failed to parse log event', {
          taskId,
          error
        });
      }
    });

    // 监听完成事件
    eventSource.addEventListener('complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onComplete?.(data);
        eventSource.close(); // 关闭连接
      } catch (error) {
        logger.error('[smartProcessApi] Failed to parse complete event', {
          taskId,
          error
        });
      }
    });

    // 监听错误事件
    eventSource.addEventListener('error', (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onError?.(data);
      } catch (error) {
        logger.error('[smartProcessApi] Failed to parse error event', {
          taskId,
          error
        });
      }
      eventSource.close(); // 关闭连接
    });

    // 处理连接错误
    eventSource.onerror = (error) => {
      logger.error('[smartProcessApi] EventSource error', {
        taskId,
        error
      });
      callbacks.onError?.({
        code: 'STREAM_ERROR',
        message: '实时连接中断'
      });
    };

    logger.info('[smartProcessApi] Started streaming', { taskId });

    return eventSource;
  }
};

/**
 * 导出类型
 */
export type { SmartProcessOptions, SmartProcessResponse };
