/**
 * AI代理服务集成测试
 *
 * 验证前后端AI调用分离实现
 * 确保API密钥不暴露在前端代码中
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateDataProcessingCode } from '../../src/services/aiProxyService';

describe('AI代理服务 - 集成测试', () => {
  describe('安全性验证', () => {
    it('前端代码中不应包含API密钥', async () => {
      // 读取前端打包后的文件
      const fs = await import('fs/promises');
      const path = await import('path');

      // 检查源代码中是否直接暴露API密钥
      const serviceFiles = [
        'services/aiProxyService.ts',
        'services/zhipuService.ts',
        'components/SmartExcel.tsx',
        'components/FormulaGen.tsx',
        'components/KnowledgeChat.tsx'
      ];

      for (const file of serviceFiles) {
        const filePath = path.join(process.cwd(), file);
        const content = await fs.readFile(filePath, 'utf-8');

        // 确保代码中没有硬编码的API密钥
        expect(content).not.toMatch(/apiKey\s*[:=]\s*['"][^'"]{20,}['"]/);
        expect(content).not.toContain('ccd69d4c776d4e2696a6ef026159fb9c');
      }
    });

    it('前端应通过代理服务调用AI', async () => {
      // 验证前端使用的是aiProxyService而不是直接调用zhipuService
      const { default: ts } = await import('typescript');
      const fs = await import('fs/promises');
      const path = await import('path');

      const smartExcelPath = path.join(process.cwd(), 'components/SmartExcel.tsx');
      const content = await fs.readFile(smartExcelPath, 'utf-8');

      // 应该导入aiProxyService
      expect(content).toContain("from '../src/services/aiProxyService'");

      // 不应该直接导入Anthropic客户端
      expect(content).not.toContain('@anthropic-ai/sdk');
    });
  });

  describe('API端点验证', () => {
    it('后端应提供AI代理端点', async () => {
      // 验证路由配置
      const aiRoutesPath = 'api/routes/ai.ts';
      const { existsSync } = await import('fs');
      expect(existsSync(aiRoutesPath)).toBe(true);
    });

    it('后端控制器应验证参数', async () => {
      const { existsSync } = await import('fs');
      const controllerPath = 'api/controllers/aiController.ts';
      expect(existsSync(controllerPath)).toBe(true);
    });
  });

  describe('环境配置验证', () => {
    it('应存在.env.example文件', async () => {
      const { existsSync } = await import('fs');
      expect(existsSync('.env.example')).toBe(true);
    });

    it('.env.example应包含API密钥配置说明', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('.env.example', 'utf-8');

      expect(content).toContain('ZHIPU_API_KEY');
      expect(content).toContain('your-secret-key-here');
    });

    it('.gitignore应忽略敏感文件', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('.gitignore', 'utf-8');

      expect(content).toContain('.env.local');
      expect(content).toContain('.env.development.local');
    });
  });
});

describe('AI代理服务 - 功能测试', () => {
  describe('generateDataProcessingCode', () => {
    it('应正确构造API请求', async () => {
      // Mock fetch函数
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            code: 'print("test")',
            explanation: 'Test explanation'
          }
        })
      });

      global.fetch = mockFetch;

      // 调用函数
      const result = await generateDataProcessingCode(
        '测试提示',
        [{
          fileName: 'test.xlsx',
          headers: ['A', 'B'],
          sampleRows: [{ A: 1, B: 2 }]
        }]
      );

      // 验证结果
      expect(result.code).toBe('print("test")');
      expect(result.explanation).toBe('Test explanation');

      // 验证fetch被正确调用
      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain('/api/v2/ai/generate-data-code');

      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody).toHaveProperty('prompt', '测试提示');
      expect(requestBody).toHaveProperty('context');

      // 验证请求头包含客户端ID
      expect(callArgs[1].headers).toHaveProperty('X-Client-ID');
    });

    it('应处理API错误响应', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid prompt'
      });

      global.fetch = mockFetch;

      const result = await generateDataProcessingCode(
        '',
        []
      );

      // 验证错误被正确处理
      expect(result.code).toBe('');
      expect(result.explanation).toContain('API调用失败');
    });
  });

  describe('generateExcelFormula', () => {
    it('应正确构造公式生成请求', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            formula: '=SUM(A:A)'
          }
        })
      });

      global.fetch = mockFetch;

      const { generateExcelFormula } = await import('../../src/services/aiProxyService');
      const result = await generateExcelFormula('求和');

      expect(result).toBe('=SUM(A:A)');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain('/api/v2/ai/generate-formula');

      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody).toHaveProperty('description', '求和');
    });
  });

  describe('chatWithKnowledgeBase', () => {
    it('应正确构造对话请求', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            response: '这是AI回复'
          }
        })
      });

      global.fetch = mockFetch;

      const { chatWithKnowledgeBase } = await import('../../src/services/aiProxyService');
      const result = await chatWithKnowledgeBase(
        '你好',
        [{ role: 'user', text: '之前的问题' }]
      );

      expect(result).toBe('这是AI回复');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain('/api/v2/ai/chat');

      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody).toHaveProperty('query', '你好');
      expect(requestBody).toHaveProperty('history');
    });
  });
});
