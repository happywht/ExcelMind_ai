/**
 * 批量生成 API 客户端
 *
 * 提供批量文档生成任务管理、进度追踪、下载等功能
 *
 * @version 2.0.0
 */

import { API_BASE_URL } from './config';

// ==================== 类型定义 ====================

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type OutputFormat = 'docx' | 'pdf' | 'html';

export interface BatchTaskConfig {
  dataSourceId: string;
  templateIds: string[];
  outputFormat: OutputFormat;
  options: {
    batchSize?: number;
    parallelProcessing?: boolean;
    createZip?: boolean;
    zipFileName?: string;
  };
  filters?: {
    condition: string;
    limit?: number;
  };
  notification?: {
    webhook?: string;
    email?: string;
  };
}

export interface TaskItem {
  templateId: string;
  templateName: string;
  estimatedCount: number;
}

export interface CreateTaskResponse {
  taskId: string;
  status: TaskStatus;
  estimatedTime: number;
  estimatedDocumentCount: number;
  items: TaskItem[];
  websocketUrl: string;
}

export interface TaskProgressItem {
  templateId: string;
  templateName: string;
  status: TaskStatus;
  progress: number;
  completedCount: number;
  totalCount: number;
  failedCount: number;
  downloads?: {
    completedUrl: string;
  };
}

export interface TaskProgress {
  taskId: string;
  status: TaskStatus;
  progress: number;
  currentStep: string;
  startedAt: string;
  estimatedEndTime?: string;
  items: TaskProgressItem[];
  summary: {
    totalDocuments: number;
    completedDocuments: number;
    failedDocuments: number;
    pendingDocuments: number;
  };
}

export interface TaskHistoryItem {
  taskId: string;
  status: TaskStatus;
  dataSourceId: string;
  templateIds: string[];
  outputFormat: OutputFormat;
  createdAt: string;
  completedAt?: string;
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  downloadUrl?: string;
}

export interface TaskHistoryResponse {
  items: TaskHistoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ==================== WebSocket 事件类型 ====================

export interface WebSocketProgressEvent {
  type: 'task_progress';
  taskId: string;
  timestamp: string;
  data: {
    progress: number;
    currentStep: string;
    completedSteps: number;
    totalSteps: number;
    estimatedTimeRemaining: number;
    currentItem?: {
      templateName: string;
      documentIndex: number;
      totalDocuments: number;
    };
  };
}

export interface WebSocketStatusEvent {
  type: 'generation_status';
  taskId: string;
  timestamp: string;
  data: {
    templateId: string;
    templateName: string;
    status: TaskStatus;
    completedCount: number;
    totalCount: number;
    failedCount: number;
    downloadUrl?: string;
  };
}

export interface WebSocketErrorEvent {
  type: 'error';
  taskId: string;
  timestamp: string;
  data: {
    error: string;
    fatal: boolean;
    templateId?: string;
    documentIndex?: number;
  };
}

export type WebSocketEvent = WebSocketProgressEvent | WebSocketStatusEvent | WebSocketErrorEvent;

// ==================== API 客户端类 ====================

class BatchGenerationAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL || '/api/v2') {
    this.baseUrl = baseUrl;
  }

  /**
   * 创建批量生成任务
   */
  async createTask(config: BatchTaskConfig): Promise<CreateTaskResponse> {
    const response = await fetch(`${this.baseUrl}/generation/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`创建任务失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 查询任务进度
   */
  async getTaskProgress(taskId: string): Promise<TaskProgress> {
    const response = await fetch(`${this.baseUrl}/generation/status/${taskId}`);

    if (!response.ok) {
      throw new Error(`获取任务进度失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 暂停任务
   */
  async pauseTask(taskId: string): Promise<{ taskId: string; status: TaskStatus }> {
    const response = await fetch(`${this.baseUrl}/generation/pause/${taskId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`暂停任务失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 恢复任务
   */
  async resumeTask(taskId: string): Promise<{ taskId: string; status: TaskStatus }> {
    const response = await fetch(`${this.baseUrl}/generation/resume/${taskId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`恢复任务失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<{
    taskId: string;
    status: TaskStatus;
    completedDocuments: number;
    message: string;
  }> {
    const response = await fetch(`${this.baseUrl}/generation/cancel/${taskId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`取消任务失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 下载单个文档
   */
  async downloadDocument(
    taskId: string,
    templateId: string,
    documentId: string
  ): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/generation/download/${taskId}/${templateId}/${documentId}`
    );

    if (!response.ok) {
      throw new Error(`下载文档失败: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * 下载已完成文档
   */
  async downloadCompletedDocuments(taskId: string, templateId: string): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/generation/download/${taskId}/${templateId}/completed`
    );

    if (!response.ok) {
      throw new Error(`下载文档失败: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * 下载ZIP压缩包
   */
  async downloadZip(taskId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/generation/download/${taskId}/zip`);

    if (!response.ok) {
      throw new Error(`下载ZIP失败: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * 获取任务历史
   */
  async getTaskHistory(params: {
    status?: TaskStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<TaskHistoryResponse> {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const response = await fetch(
      `${this.baseUrl}/generation/history?${queryParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`获取任务历史失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 创建WebSocket连接订阅任务进度
   */
  createWebSocketConnection(
    taskId: string,
    token?: string
  ): WebSocket {
    // 修复：使用绝对路径连接到后端WebSocket服务器
    // 不要使用this.baseUrl（它是相对路径），而是直接连接到3001端口
    const wsBaseUrl = 'ws://localhost:3001/api/v2/stream';
    const wsUrl = token
      ? `${wsBaseUrl}?token=${token}`
      : wsBaseUrl;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // 订阅任务进度
      ws.send(
        JSON.stringify({
          action: 'subscribe',
          channels: ['task_progress', 'generation_status'],
          filters: { taskId },
        })
      );
    };

    return ws;
  }
}

// ==================== 导出单例 ====================

export const batchGenerationAPI = new BatchGenerationAPI();

export default BatchGenerationAPI;
