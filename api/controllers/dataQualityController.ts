/**
 * 数据质量分析 API 控制器
 *
 * 提供数据质量分析、清洗建议、自动修复等功能
 * 基于 API_SPECIFICATION_PHASE2.md 规范
 *
 * @module api/controllers/dataQualityController
 * @version 2.0.0
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  DataQualityAnalyzeRequest,
  DataQualityAnalysis,
  DataQualitySuggestionsRequest,
  DataQualitySuggestions,
  DataQualityCleanRequest,
  DataQualityCleanResult,
  ApiResponseSuccess,
  ApiErrorResponse,
  ApiResponseMeta,
} from '../../types/apiTypes';
import { ApiErrorCode, createApiErrorResponse } from '../../types/errorCodes';
import { DataQualityAnalyzer } from '../../services/ai/dataQualityAnalyzer';
import { CleaningRecommendationEngine } from '../../services/ai/cleaningRecommendationEngine';
import { AIServiceAdapter } from '../../services/agentic/aiServiceAdapter';
import { IStorageService } from '../../types/dataQuality';
import { WebSocketService } from '../../services/websocket/websocketService';

/**
 * WebSocket进度回调
 */
interface ProgressCallback {
  (progress: {
    stage: string;
    percentage: number;
    message: string;
    timestamp: number;
  }): void;
}

/**
 * 数据质量分析控制器
 */
export class DataQualityController {
  private dataQualityAnalyzer: DataQualityAnalyzer;
  private recommendationEngine: CleaningRecommendationEngine;
  private aiServiceAdapter: AIServiceAdapter;

  /**
   * 构造函数
   */
  constructor(
    private storageService: IStorageService,
    private websocketService: WebSocketService
  ) {
    // 初始化AI服务适配器
    this.aiServiceAdapter = new AIServiceAdapter();

    // 初始化分析器
    this.dataQualityAnalyzer = new DataQualityAnalyzer(
      this.aiServiceAdapter,
      undefined, // cacheService - 可选
      {
        enableCache: true,
        cacheTTL: 1800000,
        parallelDetection: true,
        maxSampleSize: 10000
      }
    );

    // 初始化建议引擎
    this.recommendationEngine = new CleaningRecommendationEngine(
      this.aiServiceAdapter,
      undefined // cacheService - 可选
    );
  }

  /**
   * 分析数据质量
   * POST /api/v2/data-quality/analyze
   */
  async analyze(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    const clientId = req.headers['x-client-id'] as string;

    try {
      // 验证请求体
      const analyzeRequest: DataQualityAnalyzeRequest = req.body;

      // 基本验证
      if (!analyzeRequest.fileId) {
        throw this.createValidationError('fileId', 'fileId is required');
      }

      if (!analyzeRequest.sheetName) {
        throw this.createValidationError('sheetName', 'sheetName is required');
      }

      // 推送开始事件
      if (clientId) {
        await this.websocketService.send(clientId, {
          type: 'analysis_started',
          payload: {
            requestId,
            fileId: analyzeRequest.fileId,
            sheetName: analyzeRequest.sheetName,
            timestamp: Date.now()
          }
        });
      }

      // 创建进度回调
      const progressCallback: ProgressCallback = (progress) => {
        if (clientId) {
          this.websocketService.send(clientId, {
            type: 'analysis_progress',
            payload: {
              requestId,
              progress
            }
          }).catch(err => console.error('[DataQualityController] 进度推送失败:', err));
        }
      };

      // 从存储中获取文件数据
      const fileData = await this.storageService.get(`file:${analyzeRequest.fileId}`);
      if (!fileData) {
        throw {
          code: ApiErrorCode.FILE_NOT_FOUND,
          message: `文件 ${analyzeRequest.fileId} 不存在`
        };
      }

      // 构造ExcelData对象
      const excelData = {
        fileName: fileData.fileName || analyzeRequest.fileId,
        currentSheetName: analyzeRequest.sheetName,
        sheets: fileData.sheets || {
          [analyzeRequest.sheetName]: fileData.data || []
        }
      };

      // 推送进度：准备分析
      progressCallback({
        stage: 'preparing',
        percentage: 10,
        message: '正在准备数据分析...',
        timestamp: Date.now()
      });

      // 执行分析
      const report = await this.dataQualityAnalyzer.analyze(
        excelData,
        analyzeRequest.options
      );

      // 转换为API响应格式
      const analysis: DataQualityAnalysis = {
        analysisId: report.reportId,
        fileId: analyzeRequest.fileId,
        sheetName: analyzeRequest.sheetName,
        summary: {
          totalRows: report.totalRows,
          totalColumns: report.totalColumns,
          completeness: report.qualityScore / 100,
          qualityScore: report.qualityScore,
        },
        issues: report.issues.map(issue => ({
          id: issue.issueId,
          type: issue.issueType as any,
          severity: issue.severity === 'critical' ? 'high' : issue.severity,
          location: {
            column: issue.affectedColumns[0],
            affectedRows: issue.affectedRows.slice(0, 100) // 限制返回数量
          },
          description: issue.description,
          impact: `影响${issue.statistics.affectedRowCount}行数据`,
          affectedPercentage: issue.statistics.affectedPercentage
        })),
        statistics: {
          missingValues: {
            total: report.issues
              .filter(i => i.issueType === 'missing_value')
              .reduce((sum, i) => sum + i.statistics.affectedRowCount, 0),
            byColumn: this.extractColumnStatistics(report.issues, 'missing_value')
          },
          duplicates: {
            total: report.issues
              .filter(i => i.issueType === 'duplicate_row')
              .reduce((sum, i) => sum + i.statistics.affectedRowCount, 0),
            duplicateSets: report.issues
              .filter(i => i.issueType === 'duplicate_row').length
          },
          formatIssues: {
            total: report.issues
              .filter(i => i.issueType === 'format_inconsistency')
              .reduce((sum, i) => sum + i.statistics.affectedRowCount, 0),
            byType: this.extractFormatStatistics(report.issues)
          },
          outliers: {
            total: report.issues
              .filter(i => i.issueType === 'outlier')
              .reduce((sum, i) => sum + i.statistics.affectedRowCount, 0),
            byColumn: this.extractColumnStatistics(report.issues, 'outlier')
          }
        },
        recommendations: this.generateBasicRecommendations(report.issues)
      };

      // 保存分析结果到存储
      await this.storageService.set(`analysis:${analysis.analysisId}`, {
        ...analysis,
        rawData: report
      });

      // 推送完成事件
      if (clientId) {
        await this.websocketService.send(clientId, {
          type: 'analysis_completed',
          payload: {
            requestId,
            analysisId: analysis.analysisId,
            result: analysis,
            timestamp: Date.now()
          }
        });
      }

      const response: ApiResponseSuccess<DataQualityAnalysis> = {
        success: true,
        data: analysis,
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      // 推送错误事件
      if (clientId) {
        await this.websocketService.send(clientId, {
          type: 'analysis_error',
          payload: {
            requestId,
            error: error.message || '分析失败',
            timestamp: Date.now()
          }
        }).catch(err => console.error('[DataQualityController] 错误推送失败:', err));
      }

      this.handleError(error, res, requestId);
    }
  }

  /**
   * 获取分析结果
   * GET /api/v2/data-quality/analysis/:id
   */
  async getAnalysis(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const { id } = req.params;

      if (!id) {
        throw this.createValidationError('id', 'analysis ID is required');
      }

      // TODO: 从存储中获取分析结果
      // const analysis = await this.dataQualityAnalyzer.getAnalysis(id);

      // 临时模拟响应
      const analysis: DataQualityAnalysis = {
        analysisId: id,
        fileId: 'file_123',
        sheetName: 'Sheet1',
        summary: {
          totalRows: 1000,
          totalColumns: 15,
          completeness: 0.95,
          qualityScore: 85,
        },
        issues: [],
        statistics: {
          missingValues: { total: 0, byColumn: {} },
          duplicates: { total: 0, duplicateSets: 0 },
          formatIssues: { total: 0, byType: {} },
          outliers: { total: 0, byColumn: {} },
        },
        recommendations: [],
      };

      const response: ApiResponseSuccess<DataQualityAnalysis> = {
        success: true,
        data: analysis,
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 获取清洗建议
   * POST /api/v2/data-quality/recommendations
   */
  async getRecommendations(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    const clientId = req.headers['x-client-id'] as string;

    try {
      const suggestionsRequest: DataQualitySuggestionsRequest = req.body;

      if (!suggestionsRequest.analysisId) {
        throw this.createValidationError('analysisId', 'analysisId is required');
      }

      // 推送开始事件
      if (clientId) {
        await this.websocketService.send(clientId, {
          type: 'recommendations_started',
          payload: {
            requestId,
            analysisId: suggestionsRequest.analysisId,
            timestamp: Date.now()
          }
        });
      }

      // 从存储中获取分析结果
      const analysisData = await this.storageService.get(`analysis:${suggestionsRequest.analysisId}`);
      if (!analysisData) {
        throw {
          code: ApiErrorCode.NOT_FOUND,
          message: `分析结果 ${suggestionsRequest.analysisId} 不存在`
        };
      }

      // 使用原始数据报告生成建议
      const report = analysisData.rawData || analysisData;
      const suggestions = await this.recommendationEngine.generateRecommendations(
        report,
        undefined // options - SuggestionOptions与DataQualitySuggestionsOptions不兼容
      );

      // 转换为API响应格式
      const apiSuggestions: DataQualitySuggestions = {
        analysisId: suggestionsRequest.analysisId,
        suggestions: suggestions.map(sugg => {
          const baseSuggestion = {
            id: sugg.suggestionId,
            issueId: sugg.issueId,
            priority: this.mapPriority(sugg.priority),
            title: sugg.strategy.name,
            description: sugg.strategy.description,
            impact: sugg.reasoning,
            estimatedTime: Math.ceil(sugg.executionEstimate.estimatedTime / 60000), // 转换为分钟
          };

          // 根据是否可自动修复添加不同字段
          if (sugg.expectedImpact.dataRetentionRate >= 0.9 && sugg.riskLevel === 'low') {
            return {
              ...baseSuggestion,
              canAutoFix: true,
              autoFixCode: sugg.strategy.executionCode || this.generateAutoFixCode(sugg.strategy),
              steps: this.generateSteps(sugg.strategy),
              preview: {
                affectedRows: sugg.expectedImpact.affectedRows,
                examples: this.generateExamples(sugg.strategy)
              }
            };
          } else {
            return {
              ...baseSuggestion,
              canAutoFix: false,
              steps: this.generateSteps(sugg.strategy),
              manualAction: this.generateManualAction(sugg.strategy)
            };
          }
        }),
        totalSuggestions: suggestions.length,
        canAutoFixCount: suggestions.filter(s =>
          s.expectedImpact.dataRetentionRate >= 0.9 && s.riskLevel === 'low'
        ).length,
        estimatedTotalTime: Math.ceil(
          suggestions.reduce((sum, s) => sum + s.executionEstimate.estimatedTime, 0) / 60000
        )
      };

      // 推送完成事件
      if (clientId) {
        await this.websocketService.send(clientId, {
          type: 'recommendations_completed',
          payload: {
            requestId,
            analysisId: suggestionsRequest.analysisId,
            timestamp: Date.now()
          }
        });
      }

      const response: ApiResponseSuccess<DataQualitySuggestions> = {
        success: true,
        data: apiSuggestions,
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 执行自动修复
   * POST /api/v2/data-quality/auto-fix
   */
  async autoFix(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      const cleanRequest: DataQualityCleanRequest = req.body;

      if (!cleanRequest.analysisId) {
        throw this.createValidationError('analysisId', 'analysisId is required');
      }

      if (!cleanRequest.suggestions || cleanRequest.suggestions.length === 0) {
        throw this.createValidationError('suggestions', 'suggestions are required');
      }

      // TODO: 调用服务执行清洗
      // const result = await this.cleaningService.executeCleaning(cleanRequest);

      // 临时模拟响应
      const result: DataQualityCleanResult = {
        cleanId: `clean_${Date.now()}_${uuidv4().substring(0, 6)}`,
        analysisId: cleanRequest.analysisId,
        status: 'completed',
        results: cleanRequest.suggestions.map((suggestion) => ({
          suggestionId: suggestion.suggestionId,
          status: suggestion.action === 'skip' ? 'skipped' : 'success',
          affectedRows: suggestion.action !== 'skip' ? 10 : 0,
          message: suggestion.action === 'skip' ? '已跳过' : '执行成功',
        })),
        summary: {
          totalProcessed: cleanRequest.suggestions.length,
          successful: cleanRequest.suggestions.filter((s) => s.action !== 'skip').length,
          skipped: cleanRequest.suggestions.filter((s) => s.action === 'skip').length,
          failed: 0,
          finalQualityScore: 92,
          qualityImprovement: 7,
        },
        backupFile: cleanRequest.options?.createBackup
          ? {
              fileId: `backup_${Date.now()}`,
              fileName: `backup_${Date.now()}.xlsx`,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }
          : undefined,
      };

      const response: ApiResponseSuccess<DataQualityCleanResult> = {
        success: true,
        data: result,
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 获取统计信息
   * GET /api/v2/data-quality/statistics
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    try {
      // TODO: 从服务层获取统计信息
      const statistics = {
        totalAnalyses: 150,
        successfulAnalyses: 145,
        failedAnalyses: 5,
        totalIssuesFound: 1250,
        totalIssuesFixed: 980,
        averageQualityScore: 85,
        topIssueTypes: [
          { type: 'missing_value', count: 450 },
          { type: 'duplicate', count: 320 },
          { type: 'inconsistent_format', count: 280 },
          { type: 'outlier', count: 200 },
        ],
      };

      const response: ApiResponseSuccess<typeof statistics> = {
        success: true,
        data: statistics,
        meta: this.createMeta(requestId, startTime),
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res, requestId);
    }
  }

  /**
   * 创建验证错误
   */
  private createValidationError(field: string, message: string): Error {
    const error = new Error(message) as any;
    error.field = field;
    error.code = ApiErrorCode.VALIDATION_ERROR;
    return error;
  }

  /**
   * 创建响应元数据
   */
  private createMeta(requestId: string, startTime: number): ApiResponseMeta {
    return {
      requestId,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * 统一错误处理
   */
  private handleError(error: any, res: Response, requestId: string): void {
    console.error('[DataQualityController] Error:', error);

    let errorCode = ApiErrorCode.INTERNAL_ERROR;
    let httpStatus = 500;
    let details: any[] = [];

    if (error.code) {
      errorCode = error.code;
      httpStatus = this.getHttpStatusFromErrorCode(errorCode);
    }

    if (error.field) {
      details.push({
        field: error.field,
        message: error.message,
      });
    }

    const errorResponse: ApiErrorResponse = createApiErrorResponse(
      errorCode,
      details,
      requestId
    );

    res.status(httpStatus).json(errorResponse);
  }

  /**
   * 根据错误代码获取HTTP状态码
   */
  private getHttpStatusFromErrorCode(errorCode: ApiErrorCode): number {
    // 只映射可能出现的错误代码
    const partialMap: Partial<Record<ApiErrorCode, number>> = {
      [ApiErrorCode.VALIDATION_ERROR]: 400,
      [ApiErrorCode.UNAUTHORIZED]: 401,
      [ApiErrorCode.FORBIDDEN]: 403,
      [ApiErrorCode.NOT_FOUND]: 404,
      [ApiErrorCode.DATA_QUALITY_ANALYSIS_FAILED]: 500,
      [ApiErrorCode.DATA_CLEANING_FAILED]: 500,
      [ApiErrorCode.FILE_NOT_FOUND]: 404,
      [ApiErrorCode.SHEET_NOT_FOUND]: 404,
      [ApiErrorCode.COLUMN_NOT_FOUND]: 404,
      [ApiErrorCode.INTERNAL_ERROR]: 500,
    };

    return partialMap[errorCode] || 500;
  }

  /**
   * 提取列统计信息
   */
  private extractColumnStatistics(issues: any[], issueType: string): Record<string, number> {
    const result: Record<string, number> = {};
    issues
      .filter(i => i.issueType === issueType)
      .forEach(issue => {
        issue.affectedColumns.forEach((col: string) => {
          result[col] = (result[col] || 0) + issue.statistics.affectedRowCount;
        });
      });
    return result;
  }

  /**
   * 提取格式统计信息
   */
  private extractFormatStatistics(issues: any[]): Record<string, number> {
    const result: Record<string, number> = {
      date: 0,
      phone: 0,
      email: 0
    };
    issues
      .filter(i => i.issueType === 'format_inconsistency')
      .forEach(issue => {
        const col = issue.affectedColumns[0] || '';
        if (col.toLowerCase().includes('date') || col.toLowerCase().includes('日期')) {
          result.date += issue.statistics.affectedRowCount;
        } else if (col.toLowerCase().includes('phone') || col.toLowerCase().includes('电话') || col.toLowerCase().includes('手机')) {
          result.phone += issue.statistics.affectedRowCount;
        } else if (col.toLowerCase().includes('email') || col.toLowerCase().includes('邮箱') || col.toLowerCase().includes('邮件')) {
          result.email += issue.statistics.affectedRowCount;
        }
      });
    return result;
  }

  /**
   * 生成基本建议
   */
  private generateBasicRecommendations(issues: any[]): string[] {
    const recommendations: string[] = [];

    if (issues.some(i => i.issueType === 'missing_value')) {
      recommendations.push('建议填充缺失值');
    }
    if (issues.some(i => i.issueType === 'duplicate_row')) {
      recommendations.push('建议删除重复行');
    }
    if (issues.some(i => i.issueType === 'format_inconsistency')) {
      recommendations.push('建议统一数据格式');
    }
    if (issues.some(i => i.issueType === 'outlier')) {
      recommendations.push('建议检查异常值');
    }

    return recommendations;
  }

  /**
   * 映射优先级
   */
  private mapPriority(priority: number): 'high' | 'medium' | 'low' {
    if (priority >= 0.7) return 'high';
    if (priority >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * 生成自动修复代码
   */
  private generateAutoFixCode(strategy: any): string {
    const { type, parameters } = strategy;
    const column = parameters.targetColumn;

    switch (type) {
      case 'fill':
        return `data.forEach(row => { if (!row['${column}']) row['${column}'] = ${parameters.value || 'default'}; });`;
      case 'delete':
        return `data = data.filter(row => row['${column}']);`;
      case 'replace':
        return `data.forEach(row => { if (row['${column}'] === ${parameters.oldValue}) row['${column}'] = ${parameters.newValue}; });`;
      case 'standardize':
        return `data.forEach(row => { row['${column}'] = String(row['${column}']).trim().toLowerCase(); });`;
      default:
        return `// 自动修复代码: ${type}`;
    }
  }

  /**
   * 生成步骤
   */
  private generateSteps(strategy: any): string[] {
    const { type, name } = strategy;

    const stepsMap: Record<string, string[]> = {
      fill: ['识别缺失值位置', '计算填充值', '应用填充操作', '验证结果'],
      delete: ['识别待删除行', '创建备份', '执行删除操作', '验证数据完整性'],
      replace: ['识别待替换值', '确定新值', '执行替换操作', '验证结果'],
      standardize: ['分析现有格式', '确定标准格式', '应用转换规则', '验证一致性']
    };

    return stepsMap[type] || ['执行' + name, '验证结果'];
  }

  /**
   * 生成示例
   */
  private generateExamples(strategy: any): any[] {
    const { parameters } = strategy;

    return [
      {
        original: '原始值',
        converted: '转换后的值'
      }
    ];
  }

  /**
   * 生成手动操作
   */
  private generateManualAction(strategy: any): any {
    const { name } = strategy;

    return {
      type: 'manual',
      source: '用户手动操作',
      mapping: name
    };
  }
}

/**
 * 创建控制器实例的工厂函数
 * 这样可以在运行时注入依赖
 */
export function createDataQualityController(
  storageService: IStorageService,
  websocketService: WebSocketService
): DataQualityController {
  return new DataQualityController(storageService, websocketService);
}

// 为了向后兼容，导出一个使用默认实例的getter
let defaultInstance: DataQualityController | null = null;

export const dataQualityController = {
  get instance() {
    if (!defaultInstance) {
      // 这里应该从DI容器获取实际的storageService和websocketService
      // 暂时使用null，实际使用时需要注入
      throw new Error('DataQualityController未初始化，请使用createDataQualityController创建实例');
    }
    return defaultInstance;
  },
  set instance(value: DataQualityController) {
    defaultInstance = value;
  }
};
