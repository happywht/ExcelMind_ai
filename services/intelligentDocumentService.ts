/**
 * 智能文档填充服务 - 服务层API
 *
 * 架构设计原则：
 * 1. 分层职责：每个服务专注于特定领域
 * 2. 依赖倒置：高层模块不依赖低层模块，都依赖抽象
 * 3. 开闭原则：对扩展开放，对修改关闭
 * 4. 接口隔离：客户端不应依赖它不需要的接口
 * 5. 单一职责：每个类只有一个变更的理由
 */

import { logger } from '@/utils/logger';
import {
  ProcessingStage,
  ExecutionStatus,
  DataSourceType,
  DocumentFormat,
  AIRound,
  CreateTaskRequest,
  CreateTaskResponse,
  TaskStatusResponse,
  AIAnalysisRequest,
  AIAnalysisResponse,
  UserFeedbackRequest,
  UserFeedbackResponse,
  DocumentGenerationTask,
  TemplateStructure,
  DataSourceConfig,
  MappingSchemeV2,
  FieldMappingV2,
  GeneratedDocumentInfo,
  CacheKey,
  CacheEntry,
  SystemConfig
} from '../types/mappingSchemaV2';

// ============================================================================
// 抽象接口定义 - 依赖倒置核心
// ============================================================================

/**
 * AI服务抽象接口
 * 所有AI交互都通过此接口，支持多种AI提供商
 */
export interface IAIService {
  /**
   * 执行AI分析
   */
  analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;

  /**
   * 流式AI分析（用于长任务）
   */
  analyzeStream(request: AIAnalysisRequest, onProgress: (progress: number) => void): Promise<AIAnalysisResponse>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<boolean>;

  /**
   * 获取模型信息
   */
  getModelInfo(): Promise<{ model: string; capabilities: string[] }>;
}

/**
 * 缓存服务抽象接口
 */
export interface ICacheService {
  /**
   * 获取缓存
   */
  get<T>(key: CacheKey): Promise<CacheEntry<T> | null>;

  /**
   * 设置缓存
   */
  set<T>(key: CacheKey, value: T, ttl?: number): Promise<void>;

  /**
   * 删除缓存
   */
  delete(key: CacheKey): Promise<boolean>;

  /**
   * 清空缓存
   */
  clear(): Promise<void>;

  /**
   * 生成缓存键
   */
  generateKey(type: CacheKey['type'], content: any): CacheKey;
}

/**
 * 重试策略接口
 */
export interface IRetryStrategy {
  /**
   * 判断是否应该重试
   */
  shouldRetry(error: Error, retryCount: number): boolean;

  /**
   * 获取下次重试延迟
   */
  getRetryDelay(retryCount: number): number;

  /**
   * 执行带重试的操作
   */
  executeWithRetry<T>(operation: () => Promise<T>): Promise<T>;
}

/**
 * 降级策略接口
 */
export interface IFallbackStrategy {
  /**
   * 获取降级响应
   */
  getFallback<T>(context: {
    operation: string;
    error: Error;
    originalInput: any;
  }): Promise<T>;

  /**
   * 判断是否可以使用降级
   */
  canFallback(operation: string): boolean;
}

/**
 * 事件发布订阅接口
 */
export interface IEventBus {
  /**
   * 发布事件
   */
  publish(event: string, data: any): void;

  /**
   * 订阅事件
   */
  subscribe(event: string, handler: (data: any) => void): () => void;

  /**
   * 取消订阅
   */
  unsubscribe(event: string, handler: (data: any) => void): void;
}

/**
 * 任务存储接口
 */
export interface ITaskRepository {
  /**
   * 创建任务
   */
  create(task: DocumentGenerationTask): Promise<DocumentGenerationTask>;

  /**
   * 更新任务
   */
  update(taskId: string, updates: Partial<DocumentGenerationTask>): Promise<DocumentGenerationTask>;

  /**
   * 获取任务
   */
  get(taskId: string): Promise<DocumentGenerationTask | null>;

  /**
   * 列出任务
   */
  list(filters?: {
    status?: ExecutionStatus;
    stage?: ProcessingStage;
    limit?: number;
    offset?: number;
  }): Promise<DocumentGenerationTask[]>;

  /**
   * 删除任务
   */
  delete(taskId: string): Promise<boolean>;
}

// ============================================================================
// 核心服务接口
// ============================================================================

/**
 * 模板分析服务接口
 */
export interface ITemplateAnalysisService {
  /**
   * 分析模板结构
   */
  analyzeTemplate(templateFile: File | ArrayBuffer): Promise<TemplateStructure>;

  /**
   * 提取占位符
   */
  extractPlaceholders(templateContent: string): Promise<string[]>;

  /**
   * 检测模板特性（条件块、循环等）
   */
  detectFeatures(templateContent: string): Promise<{
    hasConditionalBlocks: boolean;
    hasLoops: boolean;
    hasTables: boolean;
  }>;

  /**
   * 生成模板预览
   */
  generatePreview(templateStructure: TemplateStructure): Promise<string>; // HTML预览
}

/**
 * 数据分析服务接口
 */
export interface IDataSourceAnalysisService {
  /**
   * 分析数据源
   */
  analyzeDataSource(source: File | DataSourceConfig): Promise<DataSourceConfig>;

  /**
   * 推断数据类型
   */
  inferDataType(sampleData: any[]): Promise<{
    type: string;
    confidence: number;
    format?: string;
  }>;

  /**
   * 检测关系
   */
  detectRelationships(sources: DataSourceConfig[]): Promise<Array<{
    from: { sourceId: string; column: string };
    to: { sourceId: string; column: string };
    type: string;
    confidence: number;
  }>>;

  /**
   * 生成数据样本
   */
  generateSample(source: DataSourceConfig, size: number): Promise<any[]>;
}

/**
 * 映射规划服务接口
 */
export interface IMappingPlanningService {
  /**
   * 生成映射方案
   */
  generateMapping(context: {
    template: TemplateStructure;
    dataSources: DataSourceConfig[];
    userInstruction: string;
    previousMapping?: MappingSchemeV2;
  }): Promise<MappingSchemeV2>;

  /**
   * 优化映射方案
   */
  optimizeMapping(mapping: MappingSchemeV2): Promise<MappingSchemeV2>;

  /**
   * 验证映射方案
   */
  validateMapping(mapping: MappingSchemeV2): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 计算匹配置信度
   */
  calculateConfidence(mapping: FieldMappingV2): number;
}

/**
 * 文档生成服务接口
 */
export interface IDocumentGenerationService {
  /**
   * 生成单个文档
   */
  generateSingleDocument(context: {
    template: TemplateStructure;
    data: any;
    mapping: MappingSchemeV2;
  }): Promise<Blob>;

  /**
   * 批量生成文档
   */
  generateBatchDocuments(context: {
    template: TemplateStructure;
    dataSource: DataSourceConfig;
    mapping: MappingSchemeV2;
    filterCondition?: string;
  }): Promise<GeneratedDocumentInfo[]>;

  /**
   * 打包文档为ZIP
   */
  packageAsZip(documents: GeneratedDocumentInfo[]): Promise<Blob>;
}

/**
 * 任务编排服务接口
 */
export interface ITaskOrchestrationService {
  /**
   * 创建任务
   */
  createTask(request: CreateTaskRequest): Promise<CreateTaskResponse>;

  /**
   * 启动任务
   */
  startTask(taskId: string): Promise<void>;

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): Promise<TaskStatusResponse>;

  /**
   * 取消任务
   */
  cancelTask(taskId: string): Promise<void>;

  /**
   * 暂停任务
   */
  pauseTask(taskId: string): Promise<void>;

  /**
   * 恢复任务
   */
  resumeTask(taskId: string): Promise<void>;

  /**
   * 提供用户反馈
   */
  provideFeedback(request: UserFeedbackRequest): Promise<UserFeedbackResponse>;

  /**
   * 重试失败的阶段
   */
  retryStage(taskId: string, stage: ProcessingStage): Promise<void>;
}

// ============================================================================
// 具体服务实现 - 智能文档服务（门面）
// ============================================================================

/**
 * 智能文档填充服务 - 统一入口
 *
 * 职责：
 * 1. 协调各个子服务
 * 2. 管理任务生命周期
 * 3. 处理错误和降级
 * 4. 提供简化的API给UI层
 */
export class IntelligentDocumentService implements ITaskOrchestrationService {
  // 依赖注入（通过构造函数）
  constructor(
    private readonly templateService: ITemplateAnalysisService,
    private readonly dataSourceService: IDataSourceAnalysisService,
    private readonly mappingService: IMappingPlanningService,
    private readonly documentService: IDocumentGenerationService,
    private readonly aiService: IAIService,
    private readonly cacheService: ICacheService,
    private readonly retryStrategy: IRetryStrategy,
    private readonly fallbackStrategy: IFallbackStrategy,
    private readonly eventBus: IEventBus,
    private readonly taskRepository: ITaskRepository,
    private readonly config: SystemConfig
  ) {
    // 初始化服务
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // 检查AI服务健康状态
    const isHealthy = await this.aiService.healthCheck();
    if (!isHealthy) {
      throw new Error('AI服务不可用');
    }

    // 订阅系统事件
    this.eventBus.subscribe('task:completed', this.handleTaskCompleted.bind(this));
    this.eventBus.subscribe('task:failed', this.handleTaskFailed.bind(this));
    this.eventBus.subscribe('task:progress', this.handleTaskProgress.bind(this));
  }

  // ============================================================================
  // 任务管理方法
  // ============================================================================

  /**
   * 创建新任务
   * POST /api/tasks
   */
  async createTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
    try {
      // 生成任务ID
      const taskId = this.generateTaskId();

      // 初始化任务
      const task: DocumentGenerationTask = {
        id: taskId,
        status: ExecutionStatus.PENDING,
        progress: 0,
        currentStage: ProcessingStage.INITIALIZATION,
        startedAt: Date.now(),
        template: {} as TemplateStructure,
        dataSources: [],
        userInstruction: request.userInstruction,
        aiRounds: []
      };

      // 存储任务
      await this.taskRepository.create(task);

      // 发布事件
      this.eventBus.publish('task:created', { taskId });

      return {
        taskId,
        status: task.status,
        nextSteps: [
          '模板分析',
          '数据分析',
          '语义理解',
          '映射规划',
          '文档生成'
        ]
      };
    } catch (error) {
      this.handleError('createTask', error as Error);
      throw error;
    }
  }

  /**
   * 启动任务执行
   * POST /api/tasks/:id/start
   */
  async startTask(taskId: string): Promise<void> {
    try {
      const task = await this.taskRepository.get(taskId);
      if (!task) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      // 更新状态
      await this.taskRepository.update(taskId, {
        status: ExecutionStatus.IN_PROGRESS,
        currentStage: ProcessingStage.TEMPLATE_ANALYSIS
      });

      // 启动异步执行流程
      this.executeTaskPipeline(task).catch(error => {
        this.handleError('startTask', error);
      });

    } catch (error) {
      this.handleError('startTask', error as Error);
      throw error;
    }
  }

  /**
   * 获取任务状态
   * GET /api/tasks/:id/status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const task = await this.taskRepository.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    const allStages = Object.values(ProcessingStage);
    const currentIndex = allStages.indexOf(task.currentStage);
    const completedStages = allStages.slice(0, currentIndex);
    const remainingStages = allStages.slice(currentIndex + 1);

    return {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      currentStage: task.currentStage,
      completedStages,
      remainingStages,
      error: task.error,
      metadata: {
        startedAt: task.startedAt,
        estimatedCompletionAt: task.completedAt,
        currentAIRound: task.aiRounds[task.aiRounds.length - 1]?.round
      }
    };
  }

  /**
   * 取消任务
   * POST /api/tasks/:id/cancel
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = await this.taskRepository.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    await this.taskRepository.update(taskId, {
      status: ExecutionStatus.CANCELLED
    });

    this.eventBus.publish('task:cancelled', { taskId });
  }

  /**
   * 暂停任务
   * POST /api/tasks/:id/pause
   */
  async pauseTask(taskId: string): Promise<void> {
    const task = await this.taskRepository.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    await this.taskRepository.update(taskId, {
      status: ExecutionStatus.AWAITING_USER_INPUT
    });

    this.eventBus.publish('task:paused', { taskId });
  }

  /**
   * 恢复任务
   * POST /api/tasks/:id/resume
   */
  async resumeTask(taskId: string): Promise<void> {
    const task = await this.taskRepository.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    await this.taskRepository.update(taskId, {
      status: ExecutionStatus.IN_PROGRESS
    });

    this.eventBus.publish('task:resumed', { taskId });

    // 继续执行
    this.executeTaskPipeline(task).catch(error => {
      this.handleError('resumeTask', error);
    });
  }

  /**
   * 提供用户反馈
   * POST /api/tasks/:id/feedback
   */
  async provideFeedback(request: UserFeedbackRequest): Promise<UserFeedbackResponse> {
    const task = await this.taskRepository.get(request.taskId);
    if (!task) {
      throw new Error(`任务不存在: ${request.taskId}`);
    }

    // 处理反馈
    if (request.feedback.approved) {
      // 用户批准，继续下一轮
      return await this.continueToNextRound(task, request);
    } else {
      // 用户拒绝或修改，重新处理
      return await this.handleUserModification(task, request);
    }
  }

  /**
   * 重试失败的阶段
   * POST /api/tasks/:id/retry/:stage
   */
  async retryStage(taskId: string, stage: ProcessingStage): Promise<void> {
    const task = await this.taskRepository.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    // 重置到指定阶段
    await this.taskRepository.update(taskId, {
      status: ExecutionStatus.IN_PROGRESS,
      currentStage: stage,
      error: undefined
    });

    // 重新执行
    this.executeTaskPipeline(task).catch(error => {
      this.handleError('retryStage', error);
    });
  }

  // ============================================================================
  // 私有方法 - 任务执行流水线
  // ============================================================================

  /**
   * 执行任务流水线（核心逻辑）
   *
   * 流水线阶段：
   * 1. 模板分析
   * 2. 数据分析
   * 3. 语义理解
   * 4. 映射规划
   * 5. 转换生成
   * 6. 文档生成
   * 7. 验证
   */
  private async executeTaskPipeline(task: DocumentGenerationTask): Promise<void> {
    try {
      // 阶段1: 模板分析
      await this.executeTemplateAnalysis(task);

      // 阶段2: 数据分析
      await this.executeDataAnalysis(task);

      // 阶段3: 语义理解
      await this.executeSemanticAnalysis(task);

      // 阶段4: 映射规划（可能需要用户干预）
      await this.executeMappingPlanning(task);

      // 阶段5: 转换生成
      await this.executeTransformationGeneration(task);

      // 阶段6: 文档生成
      await this.executeDocumentGeneration(task);

      // 阶段7: 验证
      await this.executeValidation(task);

      // 完成任务
      await this.taskRepository.update(task.id, {
        status: ExecutionStatus.COMPLETED,
        progress: 100,
        currentStage: ProcessingStage.COMPLETED,
        completedAt: Date.now()
      });

      this.eventBus.publish('task:completed', { taskId: task.id });

    } catch (error) {
      await this.taskRepository.update(task.id, {
        status: ExecutionStatus.FAILED,
        error: {
          code: 'PIPELINE_ERROR',
          message: (error as Error).message,
          retryable: true
        }
      });

      this.eventBus.publish('task:failed', {
        taskId: task.id,
        error: error as Error
      });
    }
  }

  /**
   * 阶段1: 模板分析
   */
  private async executeTemplateAnalysis(task: DocumentGenerationTask): Promise<void> {
    await this.updateTaskProgress(task.id, ProcessingStage.TEMPLATE_ANALYSIS, 10);

    // 检查缓存
    const cacheKey = this.cacheService.generateKey('template_analysis', task.template);
    const cached = await this.cacheService.get<TemplateStructure>(cacheKey);

    if (cached) {
      task.template = cached.value;
      return;
    }

    // 执行分析
    const analysis = await this.retryStrategy.executeWithRetry(async () => {
      return await this.aiService.analyze({
        taskId: task.id,
        round: AIRound.TEMPLATE_ANALYSIS,
        context: {
          template: task.template,
          dataSources: task.dataSources,
          userInstruction: task.userInstruction
        }
      });
    });

    // 保存到缓存
    await this.cacheService.set(cacheKey, task.template, this.config.cache.ttl);
  }

  /**
   * 阶段2: 数据分析
   */
  private async executeDataAnalysis(task: DocumentGenerationTask): Promise<void> {
    await this.updateTaskProgress(task.id, ProcessingStage.DATA_ANALYSIS, 25);

    // 分析所有数据源
    for (let i = 0; i < task.dataSources.length; i++) {
      const source = task.dataSources[i];

      // 检查缓存
      const cacheKey = this.cacheService.generateKey('data_analysis', source);
      const cached = await this.cacheService.get<DataSourceConfig>(cacheKey);

      if (cached) {
        task.dataSources[i] = cached.value;
        continue;
      }

      // 执行分析
      const analyzedSource = await this.dataSourceService.analyzeDataSource(source);
      task.dataSources[i] = analyzedSource;

      // 保存到缓存
      await this.cacheService.set(cacheKey, analyzedSource, this.config.cache.ttl);
    }
  }

  /**
   * 阶段3: 语义理解
   */
  private async executeSemanticAnalysis(task: DocumentGenerationTask): Promise<void> {
    await this.updateTaskProgress(task.id, ProcessingStage.SEMANTIC_ANALYSIS, 40);

    const analysis = await this.aiService.analyze({
      taskId: task.id,
      round: AIRound.SEMANTIC_UNDERSTANDING,
      context: {
        template: task.template,
        dataSources: task.dataSources,
        userInstruction: task.userInstruction
      }
    });

    // 存储分析结果
    task.aiRounds.push({
      round: AIRound.SEMANTIC_UNDERSTANDING,
      timestamp: Date.now(),
      duration: 0,
      input: {},
      output: analysis,
      status: 'success'
    });
  }

  /**
   * 阶段4: 映射规划
   */
  private async executeMappingPlanning(task: DocumentGenerationTask): Promise<void> {
    await this.updateTaskProgress(task.id, ProcessingStage.MAPPING_PLANNING, 55);

    // 生成映射方案
    const mappingScheme = await this.mappingService.generateMapping({
      template: task.template,
      dataSources: task.dataSources,
      userInstruction: task.userInstruction
    });

    // 检查是否需要用户确认
    if (mappingScheme.aiAnalysis.confidence < 0.8) {
      await this.taskRepository.update(task.id, {
        status: ExecutionStatus.AWAITING_USER_INPUT,
        mappingScheme
      });

      this.eventBus.publish('task:awaiting_input', {
        taskId: task.id,
        mappingScheme
      });

      // 等待用户反馈
      return;
    }

    // 自动继续
    task.mappingScheme = mappingScheme;
  }

  /**
   * 阶段5: 转换生成
   */
  private async executeTransformationGeneration(task: DocumentGenerationTask): Promise<void> {
    await this.updateTaskProgress(task.id, ProcessingStage.TRANSFORMATION_GENERATION, 70);

    // AI生成数据转换逻辑
    const transformation = await this.aiService.analyze({
      taskId: task.id,
      round: AIRound.TRANSFORMATION_GENERATION,
      context: {
        template: task.template,
        dataSources: task.dataSources,
        userInstruction: task.userInstruction,
        previousResults: {
          mappingScheme: task.mappingScheme
        }
      }
    });
  }

  /**
   * 阶段6: 文档生成
   */
  private async executeDocumentGeneration(task: DocumentGenerationTask): Promise<void> {
    await this.updateTaskProgress(task.id, ProcessingStage.DOCUMENT_GENERATION, 85);

    // 批量生成文档
    task.generatedDocuments = await this.documentService.generateBatchDocuments({
      template: task.template,
      dataSource: task.dataSources[0], // 主数据源
      mapping: task.mappingScheme!
    });
  }

  /**
   * 阶段7: 验证
   */
  private async executeValidation(task: DocumentGenerationTask): Promise<void> {
    await this.updateTaskProgress(task.id, ProcessingStage.VALIDATION, 95);

    // 验证生成的文档
    const validation = await this.mappingService.validateMapping(task.mappingScheme!);

    if (!validation.valid) {
      // 发出警告但不中断
      this.eventBus.publish('task:validation_warning', {
        taskId: task.id,
        warnings: validation.warnings
      });
    }
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async updateTaskProgress(
    taskId: string,
    stage: ProcessingStage,
    progress: number
  ): Promise<void> {
    await this.taskRepository.update(taskId, {
      currentStage: stage,
      progress
    });

    this.eventBus.publish('task:progress', { taskId, stage, progress });
  }

  private async continueToNextRound(
    task: DocumentGenerationTask,
    request: UserFeedbackRequest
  ): Promise<UserFeedbackResponse> {
    // 继续执行流水线
    this.executeTaskPipeline(task).catch(error => {
      this.handleError('continueToNextRound', error);
    });

    return {
      received: true,
      updatedTask: task
    };
  }

  private async handleUserModification(
    task: DocumentGenerationTask,
    request: UserFeedbackRequest
  ): Promise<UserFeedbackResponse> {
    // 应用用户的修改
    if (request.feedback.modifications) {
      task.mappingScheme = request.feedback.modifications as MappingSchemeV2;
    }

    // 重新执行映射规划阶段
    await this.executeMappingPlanning(task);

    return {
      received: true,
      updatedTask: task
    };
  }

  private handleError(operation: string, error: Error): void {
    logger.error(`[IntelligentDocumentService] Error in ${operation}:`, error);
    this.eventBus.publish('service:error', {
      service: 'IntelligentDocumentService',
      operation,
      error: error.message
    });
  }

  private handleTaskCompleted(data: any): void {
    logger.info(`[IntelligentDocumentService] Task completed:`, data.taskId);
  }

  private handleTaskFailed(data: any): void {
    logger.error(`[IntelligentDocumentService] Task failed:`, data.taskId, data.error);
  }

  private handleTaskProgress(data: any): void {
    logger.debug(`[IntelligentDocumentService] Task progress:`, data.taskId, data.progress);
  }
}

// ============================================================================
// 导出说明
// ============================================================================
// 所有接口已在定义时使用 'export interface' 导出，无需重复导出
// 包括：
// - IAIService (第43行)
// - ICacheService (第68行)
// - IRetryStrategy (第98行)
// - IFallbackStrategy (第118行)
// - IEventBus (第137行)
// - ITaskRepository (第157行)
// - ITemplateAnalysisService (第196行)
// - IDataSourceAnalysisService (第225行)
// - IMappingPlanningService (第259行)
// - IDocumentGenerationService (第293行)
// - ITaskOrchestrationService (第322行)
//
// FieldMappingV2 从 '../types/mappingSchemaV2' 导入（第28行引用）
