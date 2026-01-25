/**
 * Mock AI 服务辅助函数
 * 用于测试中模拟智谱 AI 服务
 */

import Anthropic from '@anthropic-ai/sdk';

export interface MockAIResponse {
  explanation: string;
  code: string;
}

/**
 * 创建模拟的 AI 客户端
 */
export const createMockAIClient = () => {
  const mockCreate = jest.fn();

  return {
    messages: {
      create: mockCreate
    }
  };
};

/**
 * 创建模拟的 AI 响应
 */
export const mockAIResponse = (response: MockAIResponse) => {
  const mockClient = createMockAIClient();

  mockClient.messages.create.mockResolvedValue({
    content: [
      {
        type: 'text',
        text: JSON.stringify(response)
      }
    ]
  } as any);

  return mockClient;
};

/**
 * 创建模拟的错误响应
 */
export const mockAIError = (errorMessage: string) => {
  const mockClient = createMockAIClient();

  mockClient.messages.create.mockRejectedValue(
    new Error(errorMessage)
  );

  return mockClient;
};

/**
 * 在测试中设置 Anthropic Mock
 */
export const setupAnthropicMock = (response: MockAIResponse) => {
  const mockClient = mockAIResponse(response);

  (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
    () => mockClient as any
  );

  return mockClient;
};

/**
 * 清理所有 Mock
 */
export const clearAllMocks = () => {
  jest.clearAllMocks();
};
