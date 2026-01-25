/**
 * 沙箱系统类型定义
 *
 * 为渲染进程提供完整的类型支持
 */

// ============================================================================
// 沙箱任务状态
// ============================================================================

export type SandboxTaskStatus =
  | 'running'          // 正在运行
  | 'awaiting_input'   // 等待用户输入
  | 'completed'        // 已完成
  | 'failed'           // 失败
  | 'interrupted'      // 已中断
  | 'error';           // 错误

// ============================================================================
// 沙箱事件数据类型
// ============================================================================

/**
 * 任务状态更新事件
 */
export interface SandboxStatusEvent {
  taskId: string;
  status: 'started' | 'resumed' | 'interrupted';
  message: string;
  command?: string;
  timestamp: number;
}

/**
 * 任务进度更新事件
 */
export interface SandboxProgressEvent {
  taskId: string;
  current?: number;
  total?: number;
  percentage: number;
  message: string;
  timestamp: number;
}

/**
 * 任务完成事件
 */
export interface SandboxCompleteEvent {
  taskId: string;
  status: 'completed' | 'failed';
  message: string;
  exitCode?: number;
  signal?: string;
  duration: number;
  logFile: string;
  timestamp: number;
}

/**
 * 需要用户交互事件
 */
export interface SandboxRequireInteractionEvent {
  taskId: string;
  prompt: string;
  requiresInput: boolean;
  timestamp: number;
}

/**
 * 任务错误事件
 */
export interface SandboxErrorEvent {
  taskId: string;
  message: string;
  isFatal: boolean;
  timestamp: number;
}

/**
 * 任务警告事件
 */
export interface SandboxWarningEvent {
  taskId: string;
  message: string;
  timestamp: number;
}

/**
 * 任务输出事件
 */
export interface SandboxOutputEvent {
  taskId: string;
  content: string;
  timestamp: number;
}

// ============================================================================
// 沙箱 API 请求/响应类型
// ============================================================================

/**
 * 执行命令请求
 */
export interface SandboxExecuteRequest {
  taskId: string;
  command: string;
  contextFiles?: string[];
}

/**
 * 执行命令响应
 */
export interface SandboxExecuteResponse {
  taskId: string;
  status: string;
  message: string;
  logFile: string;
  duration: number;
}

/**
 * 中断任务请求
 */
export interface SandboxInterruptRequest {
  taskId: string;
}

/**
 * 中断任务响应
 */
export interface SandboxInterruptResponse {
  success: boolean;
  message: string;
}

/**
 * 发送输入请求
 */
export interface SandboxSendInputRequest {
  taskId: string;
  input: string;
}

/**
 * 发送输入响应
 */
export interface SandboxSendInputResponse {
  success: boolean;
  message: string;
}

/**
 * 获取任务状态请求
 */
export interface SandboxGetTaskStatusRequest {
  taskId: string;
}

/**
 * 任务状态信息
 */
export interface SandboxTaskInfo {
  id: string;
  command: string;
  status: SandboxTaskStatus;
  startTime: number;
  endTime?: number;
  duration: number;
  logFile: string;
  exitCode?: number;
  signal?: string;
}

/**
 * 清理任务请求
 */
export interface SandboxCleanupTaskRequest {
  taskId: string;
}

/**
 * 清理任务响应
 */
export interface SandboxCleanupTaskResponse {
  success: boolean;
  message: string;
}

/**
 * 沙箱统计信息
 */
export interface SandboxStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
  sandboxHome: string;
  diskUsage: {
    bytes: number;
    mb: number;
    formatted: string;
    error?: string;
  };
}

/**
 * 环境验证结果
 */
export interface SandboxValidationResult {
  valid: boolean;
  errors: string[];
  paths?: {
    nodeBin: string;
    cliMain: string;
    sandboxHome: string;
  };
}

/**
 * 读取日志请求
 */
export interface SandboxReadLogRequest {
  logFile: string;
  maxLines?: number;
}

/**
 * 读取日志响应
 */
export interface SandboxReadLogResponse {
  content: string;
  lines: number;
  totalLines: number;
}

/**
 * 清理缓存响应
 */
export interface SandboxCleanupCacheResponse {
  success: boolean;
  message: string;
  freedSpace: string;
}

// ============================================================================
// 沙箱 API 接口
// ============================================================================

/**
 * 沙箱 API 接口
 */
export interface SandboxAPI {
  // 命令执行
  execute(request: SandboxExecuteRequest): Promise<SandboxExecuteResponse>;
  interrupt(request: SandboxInterruptRequest): Promise<SandboxInterruptResponse>;
  sendInput(request: SandboxSendInputRequest): Promise<SandboxSendInputResponse>;

  // 任务管理
  getTaskStatus(request: SandboxGetTaskStatusRequest): Promise<SandboxTaskInfo | null>;
  cleanupTask(request: SandboxCleanupTaskRequest): Promise<SandboxCleanupTaskResponse>;

  // 系统信息
  getStats(): Promise<SandboxStats | null>;
  validateEnv(): Promise<SandboxValidationResult>;
  readLog(request: SandboxReadLogRequest): Promise<SandboxReadLogResponse>;
  cleanupCache(): Promise<SandboxCleanupCacheResponse>;

  // 事件监听
  onStatus(callback: (event: SandboxStatusEvent) => void): void;
  onProgress(callback: (event: SandboxProgressEvent) => void): void;
  onComplete(callback: (event: SandboxCompleteEvent) => void): void;
  onRequireInteraction(callback: (event: SandboxRequireInteractionEvent) => void): void;
  onError(callback: (event: SandboxErrorEvent) => void): void;
  onWarning(callback: (event: SandboxWarningEvent) => void): void;
  onOutput(callback: (event: SandboxOutputEvent) => void): void;

  // 监听器管理
  removeListener(channel: string): void;
  removeAllListeners(): void;
}

// ============================================================================
// 扩展 Window 接口
// ============================================================================

declare global {
  interface Window {
    electronAPI: {
      // 应用信息
      getAppVersion(): Promise<string>;

      // 文件对话框
      showSaveDialog(): Promise<any>;
      showOpenDialog(): Promise<any>;

      // 菜单事件
      onMenuAction(callback: (action: string) => void): void;
      removeAllListeners(channel: string): void;

      // 平台信息
      platform: string;
      isDev: boolean;

      // 沙箱 API
      sandbox: SandboxAPI;
    };
  }
}

export {};
