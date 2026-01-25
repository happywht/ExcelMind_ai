/**
 * Function Calling 原型测试套件
 * Phase 2 Week 0 技术验证
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { ToolRegistry } from '../ToolRegistry';
import { FunctionCallingAdapter } from '../FunctionCallingAdapter';
import { prototypeTools } from '../tools';

describe('Function Calling 原型测试', () => {
  let toolRegistry: ToolRegistry;
  let adapter: FunctionCallingAdapter;

  beforeAll(() => {
    // 初始化工具注册表
    toolRegistry = new ToolRegistry();
    toolRegistry.registerBatch(prototypeTools);

    // 初始化适配器（使用测试API Key）
    const apiKey = process.env.ZHIPU_API_KEY || 'test-key';
    adapter = new FunctionCallingAdapter(apiKey, toolRegistry, {
      maxDepth: 2,
      maxToolsPerTurn: 3,
      timeout: 30000,
      enableParallel: true
    });
  });

  describe('工具注册测试', () => {
    it('应该成功注册所有原型工具', () => {
      const toolNames = toolRegistry.getToolNames();
      expect(toolNames).toContain('analyze_excel');
      expect(toolNames).toContain('detect_anomalies');
      expect(toolNames).toContain('fill_document');
      expect(toolNames.length).toBe(3);
    });

    it('应该返回正确的工具定义', () => {
      const tools = toolRegistry.getToolDefinitions();
      expect(tools).toHaveLength(3);

      const analyzeTool = tools.find(t => t.name === 'analyze_excel');
      expect(analyzeTool).toBeDefined();
      expect(analyzeTool?.description).toContain('分析Excel');
      expect(analyzeTool?.inputSchema.properties.fileName).toBeDefined();
    });
  });

  describe('工具执行测试', () => {
    it('应该成功执行 analyze_excel 工具', async () => {
      const result = await toolRegistry.executeTool('analyze_excel', {
        fileName: 'test.xlsx'
      });

      expect(result.success).toBe(true);
      expect(result.data.fileName).toBe('test.xlsx');
      expect(result.data.rowCount).toBeGreaterThan(0);
      expect(result.data.columns).toBeInstanceOf(Array);
    });

    it('应该成功执行 detect_anomalies 工具', async () => {
      const result = await toolRegistry.executeTool('detect_anomalies', {
        fileName: 'sales.xlsx',
        columnName: '金额',
        threshold: 5000,
        condition: 'greater_than'
      });

      expect(result.success).toBe(true);
      expect(result.data.anomalyCount).toBeGreaterThan(0);
      expect(result.data.anomalies).toBeInstanceOf(Array);
      expect(result.data.summary).toContain('异常记录');
    });

    it('应该成功执行 fill_document 工具', async () => {
      const result = await toolRegistry.executeTool('fill_document', {
        templateFile: 'template.docx',
        dataFile: 'data.xlsx',
        outputFileName: 'output.docx',
        mappings: [
          { placeholder: '{{产品名称}}', column: 'product_name' },
          { placeholder: '{{金额}}', column: 'amount' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data.processedCount).toBeGreaterThan(0);
      expect(result.data.downloadUrl).toBeDefined();
    });

    it('应该拒绝执行不存在的工具', async () => {
      await expect(
        toolRegistry.executeTool('unknown_tool', {})
      ).rejects.toThrow('not found');
    });
  });

  describe('Function Calling 集成测试', () => {
    it('应该处理简单的工具调用请求', async () => {
      // 跳过实际API调用测试（需要真实API Key）
      const result = await adapter.execute('帮我分析test.xlsx文件的结构');

      // 验证返回结构
      expect(result).toHaveProperty('finalResponse');
      expect(result).toHaveProperty('toolCalls');
      expect(result).toHaveProperty('toolResults');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('iterations');
    }, 30000);

    it('应该处理异常检测请求', async () => {
      const result = await adapter.execute('检查Excel里有没有超过5000元的异常记录');

      expect(result.success).toBeDefined();
      if (result.toolCalls.length > 0) {
        expect(result.toolCalls[0].name).toBe('detect_anomalies');
      }
    }, 30000);

    it('应该限制调用深度', async () => {
      const adapterLimited = new FunctionCallingAdapter('test-key', toolRegistry, {
        maxDepth: 1,
        maxToolsPerTurn: 3
      });

      const result = await adapterLimited.execute('执行多个操作');

      // 验证深度限制
      expect(result.iterations).toBeLessThanOrEqual(1);
    });
  });

  describe('多轮对话测试', () => {
    it('应该保持对话历史', async () => {
      const context = {
        history: [
          { role: 'user' as const, content: '你好' },
          { role: 'assistant' as const, content: '你好！有什么可以帮助你的？' }
        ]
      };

      const result = await adapter.execute('分析我的Excel文件', context);

      expect(result).toBeDefined();
      expect(result.toolCalls).toBeInstanceOf(Array);
    });
  });

  describe('错误处理测试', () => {
    it('应该处理工具执行失败', async () => {
      // 测试工具执行失败的情况
      const invalidTool = {
        name: 'test_tool',
        description: '测试工具',
        parameters: {
          type: 'object' as const,
          properties: {
            input: { type: 'string' as const, description: '输入' }
          },
          required: ['input']
        },
        handler: async () => {
          throw new Error('工具执行失败');
        }
      };

      toolRegistry.register(invalidTool);

      await expect(
        toolRegistry.executeTool('test_tool', { input: 'test' })
      ).rejects.toThrow('工具执行失败');
    });

    it('应该处理无效的工具参数', async () => {
      const result = await toolRegistry.executeTool('detect_anomalies', {
        fileName: 'test.xlsx'
        // 缺少必需参数
      } as any);

      // 工具应该处理缺失的参数或返回错误
      expect(result).toBeDefined();
    });
  });

  describe('配置测试', () => {
    it('应该允许更新配置', () => {
      adapter.updateConfig({
        maxDepth: 3,
        maxToolsPerTurn: 5
      });

      const config = adapter.getConfig();
      expect(config.maxDepth).toBe(3);
      expect(config.maxToolsPerTurn).toBe(5);
    });

    it('应该保持其他配置不变', () => {
      const originalConfig = adapter.getConfig();

      adapter.updateConfig({ maxDepth: 1 });

      const newConfig = adapter.getConfig();
      expect(newConfig.maxToolsPerTurn).toBe(originalConfig.maxToolsPerTurn);
      expect(newConfig.timeout).toBe(originalConfig.timeout);
    });
  });
});
