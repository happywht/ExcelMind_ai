/**
 * 数据质量分析 API 路由
 *
 * 定义数据质量相关的所有API端点
 * 基于 API_SPECIFICATION_PHASE2.md 规范
 *
 * @module api/routes/dataQuality
 * @version 2.0.0
 */

import { logger } from '@/utils/logger';
import { Router } from 'express';
import { DataQualityController } from '../controllers/dataQualityController';

/**
 * 创建数据质量路由
 *
 * @param controller 数据质量控制器实例
 * @returns Express路由器
 */
export function createDataQualityRoutes(controller: DataQualityController): Router {
  const router = Router();

  /**
   * POST /api/v2/data-quality/analyze
   * 分析数据质量
   */
  router.post('/analyze', (req, res) => {
    controller.analyze(req, res).catch(err => {
      logger.error('[DataQualityRoutes] /analyze error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '分析过程中发生错误'
        }
      });
    });
  });

  /**
   * GET /api/v2/data-quality/analysis/:id
   * 获取分析结果
   */
  router.get('/analysis/:id', (req, res) => {
    controller.getAnalysis(req, res).catch(err => {
      logger.error('[DataQualityRoutes] /analysis/:id error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取分析结果时发生错误'
        }
      });
    });
  });

  /**
   * POST /api/v2/data-quality/recommendations
   * 获取清洗建议
   */
  router.post('/recommendations', (req, res) => {
    controller.getRecommendations(req, res).catch(err => {
      logger.error('[DataQualityRoutes] /recommendations error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '生成建议时发生错误'
        }
      });
    });
  });

  /**
   * POST /api/v2/data-quality/auto-fix
   * 执行自动修复
   */
  router.post('/auto-fix', (req, res) => {
    controller.autoFix(req, res).catch(err => {
      logger.error('[DataQualityRoutes] /auto-fix error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '执行修复时发生错误'
        }
      });
    });
  });

  /**
   * GET /api/v2/data-quality/statistics
   * 获取统计信息
   */
  router.get('/statistics', (req, res) => {
    controller.getStatistics(req, res).catch(err => {
      logger.error('[DataQualityRoutes] /statistics error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取统计信息时发生错误'
        }
      });
    });
  });

  return router;
}
