/**
 * AI控制器 - 处理AI相关请求
 *
 * 作为AI服务的代理,确保API密钥不暴露给前端
 * 提供参数验证、错误处理和速率限制
 */

import { Request, Response, NextFunction } from 'express';
import { zhipuService } from '../../src/services/zhipuService';

/**
 * AI请求数据接口
 */
interface GenerateCodeRequest {
  prompt: string;
  context?: any[];
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  };
}

/**
 * 数据处理代码生成请求接口
 */
interface GenerateDataProcessingCodeRequest {
  prompt: string;
  context: Array<{
    fileName: string;
    headers: string[];
    sampleRows: any[];
    metadata?: any;
    currentSheetName?: string;
    sheets?: { [sheetName: string]: any };
  }>;
}

/**
 * Excel公式生成请求接口
 */
interface GenerateExcelFormulaRequest {
  description: string;
}

/**
 * AI控制器类
 */
export class AIController {
  /**
   * 通用代码生成接口
   * POST /api/v2/ai/generate
   */
  async generateCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prompt, context, options }: GenerateCodeRequest = req.body;

      // 参数验证
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PROMPT',
            message: '提示词格式错误'
          }
        });
        return;
      }

      if (prompt.length > 10000) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PROMPT_TOO_LONG',
            message: '提示词长度超过限制(最大10000字符)'
          }
        });
        return;
      }

      if (prompt.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'EMPTY_PROMPT',
            message: '提示词不能为空'
          }
        });
        return;
      }

      // TODO: 实现通用代码生成
      // 目前先返回未实现错误
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: '通用代码生成功能尚未实现'
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * 数据处理代码生成接口
   * POST /api/v2/ai/generate-data-code
   *
   * 用于生成处理Excel数据的Python代码
   */
  async generateDataProcessingCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prompt, context }: GenerateDataProcessingCodeRequest = req.body;

      // 参数验证
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PROMPT',
            message: '提示词格式错误'
          }
        });
        return;
      }

      if (!context || !Array.isArray(context) || context.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CONTEXT',
            message: '必须提供至少一个文件的上下文信息'
          }
        });
        return;
      }

      // 验证上下文格式
      for (const fileContext of context) {
        if (!fileContext.fileName || typeof fileContext.fileName !== 'string') {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_FILE_CONTEXT',
              message: '文件上下文必须包含有效的fileName字段'
            }
          });
          return;
        }

        if (!fileContext.headers || !Array.isArray(fileContext.headers)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_FILE_HEADERS',
              message: `文件"${fileContext.fileName}"必须包含headers数组`
            }
          });
          return;
        }

        if (!fileContext.sampleRows || !Array.isArray(fileContext.sampleRows)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_SAMPLE_ROWS',
              message: `文件"${fileContext.fileName}"必须包含sampleRows数组`
            }
          });
          return;
        }
      }

      // 调用AI服务 (密钥在服务器环境变量中)
      const result = await zhipuService.generateDataProcessingCode(prompt, context);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Excel公式生成接口
   * POST /api/v2/ai/generate-formula
   *
   * 根据自然语言描述生成Excel公式
   */
  async generateExcelFormula(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { description }: GenerateExcelFormulaRequest = req.body;

      // 参数验证
      if (!description || typeof description !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DESCRIPTION',
            message: '公式描述格式错误'
          }
        });
        return;
      }

      if (description.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'EMPTY_DESCRIPTION',
            message: '公式描述不能为空'
          }
        });
        return;
      }

      if (description.length > 500) {
        res.status(400).json({
          success: false,
          error: {
            code: 'DESCRIPTION_TOO_LONG',
            message: '公式描述长度超过限制(最大500字符)'
          }
        });
        return;
      }

      // 调用AI服务生成Excel公式
      const formula = await zhipuService.generateExcelFormula(description);

      res.json({
        success: true,
        data: {
          formula: formula
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * 知识库对话接口
   * POST /api/v2/ai/chat
   *
   * 基于知识库的AI对话功能
   */
  async chatWithKnowledgeBase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, history, contextDocs } = req.body;

      // 参数验证
      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: '查询内容格式错误'
          }
        });
        return;
      }

      if (query.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'EMPTY_QUERY',
            message: '查询内容不能为空'
          }
        });
        return;
      }

      if (!history || !Array.isArray(history)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_HISTORY',
            message: '对话历史必须是数组格式'
          }
        });
        return;
      }

      // 调用AI服务进行对话
      const response = await zhipuService.chatWithKnowledgeBase(
        query,
        history,
        contextDocs || ''
      );

      res.json({
        success: true,
        data: {
          response: response
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取熔断器状态
   * GET /api/v2/ai/circuit-breaker/status
   */
  async getCircuitBreakerStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = zhipuService.getCircuitBreakerState();

      res.json({
        success: true,
        data: {
          isOpen: status.isOpen,
          failureCount: status.failureCount,
          successCount: status.successCount,
          totalCalls: status.totalCalls,
          failureRate: status.failureRate,
          lastFailureTime: status.lastFailureTime,
          lastSuccessTime: status.lastSuccessTime,
          openedAt: status.openedAt,
          halfOpenRequests: status.halfOpenRequests
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 重置熔断器
   * POST /api/v2/ai/circuit-breaker/reset
   */
  async resetCircuitBreaker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      zhipuService.resetCircuitBreaker();

      res.json({
        success: true,
        message: '熔断器已重置'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 关闭熔断器
   * POST /api/v2/ai/circuit-breaker/close
   */
  async closeCircuitBreaker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      zhipuService.closeCircuitBreaker();

      res.json({
        success: true,
        message: '熔断器已手动关闭'
      });
    } catch (error) {
      next(error);
    }
  }
}

// 导出控制器实例(单例模式)
export const aiController = new AIController();
