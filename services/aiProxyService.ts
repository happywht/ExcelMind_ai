/**
 * AI代理服务 - 前端
 *
 * 通过后端代理调用AI服务,确保API密钥不暴露在前端
 * 所有AI调用都通过后端API进行
 */

import { logger } from '@/utils/logger';
import { AIProcessResult } from '../types';

/**
 * API基础URL配置
 * 根据环境自动选择正确的API地址
 */
const getApiBaseUrl = (): string => {
  // 开发环境: 使用Vite代理或直接连接到后端服务器
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }

  // 生产环境: 使用相对路径(由同一服务器提供)
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * 获取客户端ID
 * 用于追踪和识别不同的客户端会话
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
 * 获取认证令牌(如果存在)
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
};

/**
 * 通用API请求辅助函数
 */
const apiRequest = async (
  endpoint: string,
  data: any
): Promise<any> => {
  const url = `${API_BASE_URL}/v2/ai${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': getClientId(),
        ...(getAuthToken() && { 'Authorization': `Bearer ${getAuthToken()}` })
      },
      body: JSON.stringify(data)
    });

    // 处理非JSON响应(如网络错误)
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API调用失败 (${response.status}): ${errorText || response.statusText}`);
    }

    const result = await response.json();

    // 检查API响应中的错误
    if (!result.success) {
      throw new Error(result.error?.message || 'AI调用失败');
    }

    return result.data;

  } catch (error) {
    logger.error(`[aiProxyService] API请求失败: ${endpoint}`, error);
    throw error;
  }
};

/**
 * 生成数据处理代码
 *
 * @param prompt - 用户提示词
 * @param context - 文件上下文信息
 * @returns AI生成的代码和解释
 */
export const generateDataProcessingCode = async (
  prompt: string,
  context: Array<{
    fileName: string;
    headers: string[];
    sampleRows: any[];
    metadata?: any;
    currentSheetName?: string;
    sheets?: { [sheetName: string]: any };
  }>
): Promise<AIProcessResult> => {
  try {
    logger.debug('[aiProxyService] 调用后端AI服务生成数据处理代码');

    const result = await apiRequest('/generate-data-code', {
      prompt,
      context
    });

    logger.debug('[aiProxyService] AI响应成功');

    return {
      code: result.code || '',
      explanation: result.explanation || ''
    };

  } catch (error) {
    logger.error('[aiProxyService] 数据处理代码生成失败:', error);

    // 返回友好的错误信息
    return {
      code: '',
      explanation: `抱歉,${error instanceof Error ? error.message : 'AI服务暂时不可用,请稍后重试'}`
    };
  }
};

/**
 * 生成Excel公式
 *
 * @param description - 公式描述(自然语言)
 * @returns 生成的Excel公式
 */
export const generateExcelFormula = async (description: string): Promise<string> => {
  try {
    logger.debug('[aiProxyService] 调用后端AI服务生成Excel公式');

    const result = await apiRequest('/generate-formula', {
      description
    });

    logger.debug('[aiProxyService] Excel公式生成成功:', result.formula);

    return result.formula;

  } catch (error) {
    logger.error('[aiProxyService] Excel公式生成失败:', error);
    throw error;
  }
};

/**
 * 知识库对话
 *
 * @param query - 用户问题
 * @param history - 对话历史
 * @param contextDocs - 知识库文档上下文
 * @returns AI回复
 */
export const chatWithKnowledgeBase = async (
  query: string,
  history: { role: string; text: string }[],
  contextDocs?: string
): Promise<string> => {
  try {
    logger.debug('[aiProxyService] 调用后端AI服务进行知识库对话');

    const result = await apiRequest('/chat', {
      query,
      history,
      contextDocs: contextDocs || ''
    });

    logger.debug('[aiProxyService] 知识库对话成功');

    return result.response;

  } catch (error) {
    logger.error('[aiProxyService] 知识库对话失败:', error);

    // 返回友好的错误信息
    return `抱歉,${error instanceof Error ? error.message : '连接AI服务失败,请稍后重试'}`;
  }
};

/**
 * 通用代码生成(预留接口)
 *
 * @param prompt - 提示词
 * @param context - 上下文信息
 * @param options - 生成选项
 * @returns 生成的代码
 */
export const generateCode = async (
  prompt: string,
  context?: any[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }
): Promise<any> => {
  try {
    logger.debug('[aiProxyService] 调用后端AI服务生成代码');

    const result = await apiRequest('/generate', {
      prompt,
      context,
      options
    });

    logger.debug('[aiProxyService] 代码生成成功');

    return result;

  } catch (error) {
    logger.error('[aiProxyService] 代码生成失败:', error);
    throw error;
  }
};

/**
 * 健康检查 - 检查AI服务是否可用
 */
export const checkAIHealth = async (): Promise<{ healthy: boolean; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        healthy: data.status === 'healthy',
        message: 'AI服务运行正常'
      };
    }

    return {
      healthy: false,
      message: 'AI服务健康检查失败'
    };

  } catch (error) {
    return {
      healthy: false,
      message: '无法连接到AI服务'
    };
  }
};
