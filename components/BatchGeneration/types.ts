/**
 * 批量生成模块 - 类型定义
 *
 * @version 2.0.0
 */

import {
  TaskStatus,
  TaskPriority,
  OutputFormat,
  TaskProgress,
  CreateTaskResponse,
  WebSocketEvent
} from '../../api/batchGenerationAPI';

export type {
  TaskStatus,
  TaskPriority,
  OutputFormat,
  TaskProgress,
  CreateTaskResponse,
  WebSocketEvent,
};

export interface BatchTaskConfig {
  dataSourceId: string;
  templateIds: string[];
  outputFormat: OutputFormat;
  batchSize?: number;
  parallelProcessing?: boolean;
  createZip?: boolean;
}

export interface TaskProgressItem {
  templateId: string;
  templateName: string;
  status: TaskStatus;
  progress: number;
  completedCount: number;
  totalCount: number;
  failedCount: number;
}
