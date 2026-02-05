/**
 * 工具注册表
 * 管理所有可用的工具函数
 */

import { Tool, ToolFunction } from './types';

export class ToolRegistry {
  private tools: Map<string, ToolFunction> = new Map();

  /**
   * 注册工具
   */
  register(tool: ToolFunction): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" already registered`);
    }
    this.tools.set(tool.name, tool);
    console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
  }

  /**
   * 批量注册工具
   */
  registerBatch(tools: ToolFunction[]): void {
    tools.forEach(tool => this.register(tool));
  }

  /**
   * 获取工具
   */
  getTool(name: string): ToolFunction | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具定义（用于AI）
   */
  getToolDefinitions(): Tool[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters
    }));
  }

  /**
   * 执行工具
   */
  async executeTool(name: string, args: Record<string, any>): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }

    try {
      console.log(`[ToolRegistry] Executing tool: ${name}`, args);
      const result = await tool.handler(args);
      console.log(`[ToolRegistry] Tool "${name}" completed:`, result);
      return result;
    } catch (error) {
      console.error(`[ToolRegistry] Tool "${name}" failed:`, error);
      throw error;
    }
  }

  /**
   * 检查工具是否存在
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 获取所有工具名称
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.tools.clear();
  }
}
