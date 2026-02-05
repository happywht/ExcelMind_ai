/**
 * Function Calling 类型定义
 * Phase 2 Week 0 技术验证原型
 */

/**
 * 工具定义
 */
export interface Tool {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

/**
 * 工具输入参数结构
 */
export interface ToolInputSchema {
  type: "object";
  properties: Record<string, ToolProperty>;
  required?: string[];
}

/**
 * 工具属性定义
 */
export interface ToolProperty {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  enum?: any[];
  items?: ToolProperty;
  properties?: Record<string, ToolProperty>;
}

/**
 * 工具调用请求
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  toolCallId: string;
  output: any;
  error?: string;
}

/**
 * 工具函数定义
 */
export interface ToolFunction {
  name: string;
  description: string;
  parameters: ToolInputSchema;
  handler: (args: Record<string, any>) => Promise<any> | any;
}

/**
 * 对话消息
 */
export interface Message {
  role: "user" | "assistant" | "tool";
  content?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

/**
 * Function Calling 配置
 */
export interface FunctionCallingConfig {
  maxDepth: number;           // 最大调用深度
  maxToolsPerTurn: number;    // 每轮最多工具数
  timeout: number;            // 超时时间（毫秒）
  enableParallel: boolean;    // 是否支持并行调用
}

/**
 * 调用上下文
 */
export interface CallContext {
  depth: number;
  toolCount: number;
  history: Message[];
  metadata?: Record<string, any>;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  finalResponse: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  iterations: number;
  success: boolean;
  error?: string;
}
