/**
 * Function Calling 适配器
 * Phase 2 Week 0 核心组件
 *
 * 功能：
 * 1. 解析AI的tool_calls请求
 * 2. 执行工具函数
 * 3. 管理多轮对话
 * 4. 限制调用链深度
 */

import Anthropic from '@anthropic-ai/sdk';
import { ToolRegistry } from './ToolRegistry';
import {
  Message,
  ToolCall,
  ToolResult,
  FunctionCallingConfig,
  CallContext,
  ExecutionResult
} from './types';

export class FunctionCallingAdapter {
  private client: Anthropic;
  private toolRegistry: ToolRegistry;
  private config: FunctionCallingConfig;

  constructor(
    apiKey: string,
    toolRegistry: ToolRegistry,
    config?: Partial<FunctionCallingConfig>
  ) {
    this.client = new Anthropic({
      apiKey,
      baseURL: 'https://open.bigmodel.cn/api/anthropic',
      dangerouslyAllowBrowser: true
    });

    this.toolRegistry = toolRegistry;

    // 默认配置
    this.config = {
      maxDepth: config?.maxDepth ?? 2,
      maxToolsPerTurn: config?.maxToolsPerTurn ?? 3,
      timeout: config?.timeout ?? 30000,
      enableParallel: config?.enableParallel ?? true
    };
  }

  /**
   * 执行Function Calling流程
   */
  async execute(
    userMessage: string,
    context?: Partial<CallContext>
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // 初始化调用上下文
    const callContext: CallContext = {
      depth: context?.depth ?? 0,
      toolCount: context?.toolCount ?? 0,
      history: context?.history ?? [],
      metadata: context?.metadata
    };

    console.log('[FunctionCalling] Starting execution', {
      userMessage,
      depth: callContext.depth
    });

    try {
      // 构建初始消息
      const messages: Message[] = [
        ...callContext.history,
        { role: 'user', content: userMessage }
      ];

      // 执行多轮对话循环
      const result = await this.executeLoop(messages, callContext);

      const duration = Date.now() - startTime;
      console.log('[FunctionCalling] Execution completed', {
        duration,
        iterations: result.iterations
      });

      return result;
    } catch (error) {
      console.error('[FunctionCalling] Execution failed:', error);
      return {
        finalResponse: `执行失败: ${error instanceof Error ? error.message : String(error)}`,
        toolCalls: [],
        toolResults: [],
        iterations: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 执行循环（核心逻辑）
   */
  private async executeLoop(
    messages: Message[],
    context: CallContext
  ): Promise<ExecutionResult> {
    const toolCalls: ToolCall[] = [];
    const toolResults: ToolResult[] = [];
    let iterations = 0;

    while (iterations < this.config.maxDepth) {
      iterations++;
      console.log(`[FunctionCalling] Iteration ${iterations}, depth: ${context.depth}`);

      // 检查深度限制
      if (context.depth >= this.config.maxDepth) {
        console.warn('[FunctionCalling] Max depth reached');
        break;
      }

      // 调用AI
      const response = await this.callAI(messages);

      // 检查是否有工具调用
      if (!response.stop_reason || response.stop_reason !== 'tool_use' || !response.content) {
        // 没有工具调用，返回最终回复
        const finalText = this.extractText(response);
        return {
          finalResponse: finalText,
          toolCalls,
          toolResults,
          iterations,
          success: true
        };
      }

      // 解析工具调用
      const currentToolCalls = this.parseToolCalls(response);
      console.log(`[FunctionCalling] Parsed ${currentToolCalls.length} tool calls`);

      // 检查工具数量限制
      if (currentToolCalls.length > this.config.maxToolsPerTurn) {
        console.warn('[FunctionCalling] Too many tools, truncating');
        currentToolCalls.length = this.config.maxToolsPerTurn;
      }

      toolCalls.push(...currentToolCalls);

      // 执行工具
      const currentResults = await this.executeTools(currentToolCalls);
      toolResults.push(...currentResults);

      // 构建工具消息
      messages.push({
        role: 'assistant',
        content: '',
        toolCalls: currentToolCalls
      });

      // 添加工具结果消息
      currentResults.forEach(result => {
        messages.push({
          role: 'tool',
          content: JSON.stringify(result.output),
          toolCallId: result.toolCallId
        });
      });

      // 更新上下文
      context.depth++;
      context.toolCount += currentToolCalls.length;
      context.history = messages;
    }

    // 达到最大深度，返回最后的结果
    const finalResponse = await this.callAI(messages);
    const finalText = this.extractText(finalResponse);

    return {
      finalResponse: finalText,
      toolCalls,
      toolResults,
      iterations,
      success: true
    };
  }

  /**
   * 调用AI API
   */
  private async callAI(messages: Message[]): Promise<any> {
    const tools = this.toolRegistry.getToolDefinitions();

    console.log('[FunctionCalling] Calling AI', {
      messageCount: messages.length,
      toolCount: tools.length
    });

    const response = await this.client.messages.create({
      model: 'glm-4.6',
      max_tokens: 4096,
      messages: messages.map(msg => {
        if (msg.role === 'tool') {
          return {
            role: 'user',
            content: `[Tool Result for ${msg.toolCallId}]\n${msg.content}`
          };
        }

        if (msg.toolCalls && msg.toolCalls.length > 0) {
          return {
            role: 'assistant',
            content: msg.toolCalls.map(tc => ({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.arguments
            }))
          };
        }

        return {
          role: msg.role,
          content: msg.content ?? ''
        };
      }),
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
      }))
    } as any);

    return response;
  }

  /**
   * 解析工具调用
   */
  private parseToolCalls(response: any): ToolCall[] {
    const calls: ToolCall[] = [];

    if (response.content && Array.isArray(response.content)) {
      response.content.forEach((block: any) => {
        if (block.type === 'tool_use') {
          calls.push({
            id: block.id,
            name: block.name,
            arguments: block.input || {}
          });
        }
      });
    }

    return calls;
  }

  /**
   * 执行工具
   */
  private async executeTools(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      try {
        console.log(`[FunctionCalling] Executing tool: ${call.name}`);
        const output = await this.toolRegistry.executeTool(call.name, call.arguments);

        results.push({
          toolCallId: call.id,
          output
        });
      } catch (error) {
        console.error(`[FunctionCalling] Tool execution failed: ${call.name}`, error);

        results.push({
          toolCallId: call.id,
          output: null,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * 提取文本回复
   */
  private extractText(response: any): string {
    if (!response.content) return '';

    const textBlocks = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text);

    return textBlocks.join('\n');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<FunctionCallingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): FunctionCallingConfig {
    return { ...this.config };
  }
}
