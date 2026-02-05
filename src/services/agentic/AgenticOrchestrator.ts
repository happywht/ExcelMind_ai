/**
 * 多步分析和自我修复系统 - 核心编排器
 *
 * 基于 Observe-Think-Act-Evaluate 循环实现智能任务编排
 * 遵循 SOLID 原则，提供可扩展、可维护的架构
 *
 * @author Backend Developer
 * @version 1.0.0
 */

import {
  MultiStepTask,
  TaskStatus,
  TaskContext,
  TaskResult,
  ExecutionPlan,
  AnalysisStep,
  TaskError,
  ErrorCategory,
  ObservationResult,
  ThinkingResult,
  StepResult,
  EvaluationResult,
  RepairResult,
  QualityReport,
  DataFileInfo,
  ProgressCallback,
  OrchestratorConfig,
  LogEntry,
  AIAnalysisRequest,
  AIAnalysisResponse
} from '../../types/agenticTypes';

import { AIProcessResult } from '../../types';

import { generateDataProcessingCode, getCircuitBreaker } from '../zhipuService';
import { executeTransformation } from '../excelService';
import { DegradationManager } from '../infrastructure/degradation';
import { StateManager } from '../infrastructure/storage';

// 添加最大重试计数器，防止无限循环
let globalRetryCount = 0;
const MAX_GLOBAL_RETRIES = 10;

/**
 * 默认配置
 */
const DEFAULT_CONFIG: OrchestratorConfig = {
  maxRetries: 3,
  timeoutPerStep: 30000, // 30秒
  totalTimeout: 300000, // 5分钟
  qualityThreshold: 0.8,
  enableAutoRepair: true,
  enableCaching: true,
  logLevel: 'info',
  aiModel: 'glm-4.7',
  maxTokens: 4096
};

/**
 * AgenticOrchestrator - 多步分析核心编排器
 *
 * 职责：
 * 1. 管理 Observe-Think-Act-Evaluate 循环
 * 2. 协调 AI 服务和代码执行
 * 3. 错误检测和自动修复
 * 4. 质量评估和优化建议
 * 5. 集成降级策略管理
 */
export class AgenticOrchestrator {
  private config: OrchestratorConfig;
  private currentTask: MultiStepTask | null = null;
  private progressCallbacks: ProgressCallback[] = [];
  private logs: LogEntry[] = [];
  private sessionId: string;
  private degradationManager: DegradationManager;
  private stateManager: StateManager | null = null;

  constructor(config?: Partial<OrchestratorConfig>, stateManager?: StateManager) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateId();
    this.degradationManager = new DegradationManager();
    this.stateManager = stateManager || null;
    this.log('info', 'AgenticOrchestrator initialized', { config: this.config });
  }

  /**
   * 主入口：执行完整的多步分析任务
   *
   * @param userPrompt 用户的自然语言指令
   * @param dataFiles 数据文件列表
   * @returns 任务执行结果
   */
  public async executeTask(
    userPrompt: string,
    dataFiles: DataFileInfo[]
  ): Promise<TaskResult> {
    const taskId = this.generateId();
    const startTime = Date.now();

    this.log('info', 'Starting task execution', {
      taskId,
      prompt: userPrompt,
      fileCount: dataFiles.length
    });

    // 创建或恢复会话
    if (this.stateManager) {
      try {
        await this.stateManager.createSession();
      } catch (error) {
        this.log('warn', 'Failed to create session, continuing without state persistence', { error });
      }
    }

    // 检查降级状态
    const healthCheck = this.degradationManager.performHealthCheck();
    if (!healthCheck.isHealthy) {
      this.log('warn', 'System health check failed', {
        score: healthCheck.overallScore,
        recommendedMode: healthCheck.recommendedMode
      });

      // 根据健康检查结果调整策略
      if (healthCheck.recommendedMode === 'backend') {
        this.log('info', 'Switching to backend mode due to health issues');
      }
    }

    // 记录文件大小到降级管理器
    const totalFileSize = dataFiles.reduce((sum, file) => {
      // 估算文件大小（实际应从文件元数据获取）
      return sum + (file.sheets ? Object.keys(file.sheets).length * 1000000 : 1000000);
    }, 0);
    this.degradationManager.recordFileSize(totalFileSize);

    // 初始化任务
    this.currentTask = this.initializeTask(taskId, userPrompt, dataFiles);
    this.notifyProgress();

    // 保存初始执行状态
    if (this.stateManager) {
      try {
        await this.stateManager.saveExecutionState(taskId, {
          taskId,
          status: this.currentTask.status,
          progress: this.currentTask.progress,
          steps: this.currentTask.steps,
          metadata: this.currentTask.metadata,
        });
      } catch (error) {
        this.log('warn', 'Failed to save initial state', { error });
      }
    }

    try {
      // 设置总超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Total timeout exceeded')), this.config.totalTimeout);
      });

      // 执行任务
      const result = await Promise.race([
        this.executeTaskFlow(),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;

      // 记录执行时间到降级管理器
      this.degradationManager.recordExecution(duration / 1000); // 转换为秒

      // 保存最终执行状态
      if (this.stateManager) {
        try {
          await this.stateManager.saveExecutionState(taskId, {
            taskId,
            status: TaskStatus.COMPLETED,
            progress: this.currentTask.progress,
            steps: this.currentTask.steps,
            metadata: {
              ...this.currentTask.metadata,
              completedAt: Date.now(),
            },
          });
        } catch (error) {
          this.log('warn', 'Failed to save final state', { error });
        }
      }

      this.log('info', 'Task completed successfully', {
        taskId,
        duration
      });

      return result;

    } catch (error) {
      this.log('error', 'Task execution failed', {
        taskId,
        error: error instanceof Error ? error.message : String(error)
      });

      // 保存失败状态
      if (this.stateManager) {
        try {
          await this.stateManager.saveExecutionState(taskId, {
            taskId,
            status: TaskStatus.FAILED,
            progress: this.currentTask.progress,
            steps: this.currentTask.steps,
            metadata: this.currentTask.metadata,
          });
        } catch (err) {
          this.log('warn', 'Failed to save failed state', { error: err });
        }
      }

      return this.handleTaskFailure(error as Error);
    }
  }

  /**
   * 执行任务流程（OTAE循环）
   */
  private async executeTaskFlow(): Promise<TaskResult> {
    if (!this.currentTask) {
      throw new Error('No active task');
    }

    // 步骤1: Observe（观察）
    const observation = await this.observeStep();
    if (!observation.success) {
      throw new Error('Observation step failed');
    }

    // 步骤2: Think（思考）
    const thinking = await this.thinkStep(observation);
    if (!thinking.success) {
      throw new Error('Thinking step failed');
    }

    // 步骤3: Act（执行）
    const actionResult = await this.actStep(thinking.plan);
    if (!actionResult.success) {
      // 尝试修复
      if (this.config.enableAutoRepair) {
        try {
          const repairResult = await this.handleError(actionResult.error!);

          // ✅ 修复成功，使用修复后的结果继续
          if (repairResult.success) {
            this.log('info', 'Repair successful, continuing execution');

            // 对修复结果进行评估
            const evaluation = await this.evaluateStep(actionResult);

            // 根据评估结果决定下一步
            if (evaluation.nextAction === 'retry') {
              // 不再重试，直接抛出异常
              throw new Error('Repair successful but quality check failed, aborting task');
            } else if (evaluation.nextAction === 'repair') {
              // 需要进一步修复，但不再继续
              throw new Error('Repair successful but requires additional intervention');
            }

            // 修复成功且评估通过，生成最终结果
            return this.generateFinalResult(actionResult, evaluation);
          }
        } catch (repairError) {
          // ✅ 修复失败，立即抛出异常
          this.log('error', 'Repair failed, aborting task', { error: repairError });
          throw new Error(`Failed to repair execution error: ${repairError instanceof Error ? repairError.message : String(repairError)}`);
        }
      }

      // ✅ 自动修复未启用或修复失败，直接抛出异常
      throw new Error(actionResult.error?.message || 'Execution failed');
    }

    // 步骤4: Evaluate（评估）
    const evaluation = await this.evaluateStep(actionResult);

    // 根据评估结果决定下一步
    if (evaluation.nextAction === 'retry') {
      // 重试当前步骤
      return this.executeTaskFlow();
    } else if (evaluation.nextAction === 'repair') {
      // 尝试修复
      if (this.config.enableAutoRepair) {
        const repairResult = await this.handleError(
          this.createErrorFromEvaluation(evaluation)
        );
        if (repairResult.canContinue) {
          return this.executeTaskFlow();
        }
      }
    }

    // 生成最终结果
    return this.generateFinalResult(actionResult, evaluation);
  }

  /**
   * Observe步骤：观察和理解数据
   *
   * 职责：
   * 1. 分析数据结构
   * 2. 检测数据质量问题
   * 3. 识别模式和异常
   * 4. 提取元数据（注释、标注）
   */
  private async observeStep(): Promise<ObservationResult> {
    this.updateTaskStatus(TaskStatus.OBSERVING);
    this.log('info', 'Starting observation step');

    const startTime = Date.now();
    const stepId = this.generateId();

    try {
      if (!this.currentTask) {
        throw new Error('No active task');
      }

      const observations: ObservationResult['observations'] = {
        dataStructure: {
          files: [],
          sheets: {},
          totalRows: 0,
          totalColumns: 0
        },
        dataQuality: {
          missingValues: 0,
          duplicateRows: 0,
          inconsistentTypes: 0
        },
        metadata: {
          hasComments: false,
          hasNotes: false,
          commentCount: 0,
          noteCount: 0
        },
        patterns: []
      };

      const issues: string[] = [];
      const warnings: string[] = [];

      // 分析每个文件
      for (const file of this.currentTask.context.dataFiles) {
        observations.dataStructure.files.push(file.fileName);

        // 分析sheets
        if (file.sheets) {
          observations.dataStructure.sheets[file.fileName] = Object.keys(file.sheets);

          for (const [sheetName, data] of Object.entries(file.sheets)) {
            if (Array.isArray(data) && data.length > 0) {
              const sample = data.slice(0, 100); // 采样前100行
              observations.dataStructure.totalRows += data.length;

              // 分析列
              const columns = Object.keys(sample[0] || {});
              observations.dataStructure.totalColumns += columns.length;

              // 检测数据质量问题
              for (const row of sample) {
                for (const [col, value] of Object.entries(row)) {
                  if (value === null || value === undefined || value === '') {
                    observations.dataQuality.missingValues++;
                  }
                }
              }

              // 检测模式
              const patterns = this.detectDataPatterns(sample);
              observations.patterns.push(...patterns);
            }
          }
        }

        // 分析元数据
        if (file.metadata) {
          for (const [sheetName, meta] of Object.entries(file.metadata)) {
            const commentCount = Object.keys(meta.comments || {}).length;
            const noteCount = Object.keys(meta.notes || {}).length;

            observations.metadata.commentCount += commentCount;
            observations.metadata.noteCount += noteCount;

            if (commentCount > 0) observations.metadata.hasComments = true;
            if (noteCount > 0) observations.metadata.hasNotes = true;
          }
        }
      }

      // 生成警告
      if (observations.dataQuality.missingValues > 0) {
        warnings.push(`发现 ${observations.dataQuality.missingValues} 个缺失值`);
      }

      if (observations.metadata.hasComments) {
        this.log('info', `Found ${observations.metadata.commentCount} comments in data`);
      }

      if (observations.metadata.hasNotes) {
        this.log('info', `Found ${observations.metadata.noteCount} notes in data`);
      }

      const duration = Date.now() - startTime;
      this.log('info', 'Observation completed', { duration });

      return {
        success: true,
        observations,
        issues,
        warnings
      };

    } catch (error) {
      this.log('error', 'Observation failed', { error });
      return {
        success: false,
        observations: {
          dataStructure: { files: [], sheets: {}, totalRows: 0, totalColumns: 0 },
          dataQuality: { missingValues: 0, duplicateRows: 0, inconsistentTypes: 0 },
          metadata: { hasComments: false, hasNotes: false, commentCount: 0, noteCount: 0 },
          patterns: []
        },
        issues: [error instanceof Error ? error.message : String(error)],
        warnings: []
      };
    }
  }

  /**
   * Think步骤：思考和规划
   *
   * 职责：
   * 1. 理解用户意图
   * 2. 分析观察结果
   * 3. 制定执行计划
   * 4. 识别潜在风险
   */
  private async thinkStep(observation: ObservationResult): Promise<ThinkingResult> {
    this.updateTaskStatus(TaskStatus.THINKING);
    this.log('info', 'Starting thinking step');

    const startTime = Date.now();

    try {
      if (!this.currentTask) {
        throw new Error('No active task');
      }

      // 构建AI请求
      const aiRequest = this.buildThinkingRequest(observation);

      // 调用AI服务
      const aiResponse = await this.callAIService(aiRequest);

      if (!aiResponse.success) {
        throw new Error(aiResponse.error?.message || 'AI service call failed');
      }

      // 解析AI响应，生成执行计划
      const plan = this.parseExecutionPlan(aiResponse.content);

      const duration = Date.now() - startTime;
      this.log('info', 'Thinking completed', { duration, steps: plan.steps.length });

      return {
        success: true,
        plan,
        reasoning: aiResponse.reasoning || 'Plan generated based on user intent and data observation',
        assumptions: [],
        risks: [],
        alternatives: [],
        confidence: aiResponse.confidence || 0.8
      };

    } catch (error) {
      this.log('error', 'Thinking failed', { error });

      // 降级：生成简单计划
      return {
        success: true,
        plan: this.generateFallbackPlan(),
        reasoning: 'Using fallback plan due to AI failure',
        assumptions: [],
        risks: ['AI planning failed, using basic strategy'],
        alternatives: [],
        confidence: 0.5
      };
    }
  }

  /**
   * Act步骤：执行计划
   *
   * 职责：
   * 1. 获取数据处理的代码（通过AI）
   * 2. 执行代码
   * 3. 收集结果
   * 4. 处理错误
   */
  private async actStep(plan: ExecutionPlan): Promise<StepResult> {
    this.updateTaskStatus(TaskStatus.ACTING);
    this.log('info', 'Starting act step');

    const startTime = Date.now();
    const stepId = this.generateId();

    // ✅ 在方法开始时检查全局重试计数器
    if (globalRetryCount >= MAX_GLOBAL_RETRIES) {
      this.log('error', 'Max global retries reached at start of actStep', {
        retryCount: globalRetryCount,
        maxRetries: MAX_GLOBAL_RETRIES
      });

      return {
        stepId,
        success: false,
        error: this.createError(
          ErrorCategory.UNKNOWN_ERROR,
          'MAX_RETRIES_EXCEEDED',
          `已达到最大重试次数 ${MAX_GLOBAL_RETRIES}，停止执行以防止无限循环`
        ),
        executionTime: Date.now() - startTime
      };
    }

    // 检查熔断器状态
    const breaker = getCircuitBreaker();
    const breakerState = breaker.getState();
    if (breakerState.isOpen) {
      this.log('error', 'Circuit breaker is OPEN, cannot proceed', {
        failureCount: breakerState.failureCount,
        failureRate: breakerState.failureRate
      });

      return {
        stepId,
        success: false,
        error: this.createError(
          ErrorCategory.AI_SERVICE_ERROR,
          'CIRCUIT_BREAKER_OPEN',
          '熔断器已打开，AI服务暂时不可用。请稍后重试或重置熔断器。'
        ),
        executionTime: Date.now() - startTime
      };
    }

    // 在 try 块外初始化变量，避免 catch 块中引用未定义的变量
    let codeGenerationResult: AIProcessResult | null = null;
    let filesPreview: any[] | null = null;
    let datasets: { [fileName: string]: any[] | { [sheetName: string]: any[] } } = {};

    try {
      if (!this.currentTask) {
        throw new Error('No active task');
      }

      // 数据验证：检查是否有文件数据
      if (!this.currentTask.context.dataFiles || this.currentTask.context.dataFiles.length === 0) {
        throw new Error('没有可用的文件数据。请先上传文件。');
      }

      // 准备数据预览 - 修复：构建 zhipuService 期望的嵌套结构
      filesPreview = this.currentTask.context.dataFiles
        .map(file => {
          const preview: any = {
            fileName: file.fileName,
            currentSheetName: file.currentSheetName,
            metadata: file.metadata
          };

          // 构建嵌套的 sheets 结构，包含每个 sheet 的 headers 和 sampleRows
          if (file.sheets && Object.keys(file.sheets).length > 0) {
            preview.sheets = {};

            Object.entries(file.sheets).forEach(([sheetName, sheetData]) => {
              if (Array.isArray(sheetData) && sheetData.length > 0) {
                // 提取当前 sheet 的 headers 和 sampleRows
                const headers = Object.keys(sheetData[0] || {});
                const sampleRows = sheetData.slice(0, 5);

                preview.sheets[sheetName] = {
                  headers,
                  sampleRows,
                  rowCount: sheetData.length
                };
              }
            });
          } else {
            // 兼容单sheet模式
            preview.headers = this.extractHeaders(file);
            preview.sampleRows = this.extractSampleRows(file);
          }

          return preview;
        })
        .filter(preview => {
          // 过滤掉没有任何有效数据的预览
          const hasData =
            (preview.sheets && Object.keys(preview.sheets).length > 0) ||
            (preview.headers && preview.headers.length > 0);

          if (!hasData) {
            this.log('warn', `过滤空文件: ${preview.fileName}`);
          }

          return hasData;
        });

      // 数据验证：确保 filesPreview 不为空
      if (!filesPreview || filesPreview.length === 0) {
        throw new Error('文件数据为空或无法读取。请确保上传的Excel文件包含有效数据。');
      }

      // 数据验证：确保 filesPreview 结构正确
      this.log('info', 'Validating filesPreview structure', {
        fileCount: filesPreview.length,
        structureSample: JSON.stringify(filesPreview[0]).substring(0, 300)
      });

      // 调用AI生成代码
      this.log('info', 'Requesting code generation from AI');
      codeGenerationResult = await generateDataProcessingCode(
        this.currentTask.context.userInput,
        filesPreview
      );

      if (!codeGenerationResult || !codeGenerationResult.code) {
        throw new Error('Failed to generate processing code');
      }

      this.log('info', 'Code generated successfully', {
        codeLength: codeGenerationResult.code.length
      });

      // 准备数据集 - 修复：单sheet时直接传递数组，多sheet时传递嵌套对象
      for (const file of this.currentTask.context.dataFiles) {
        if (file.sheets) {
          const sheetNames = Object.keys(file.sheets);

          // 添加调试日志
          this.log('info', `Processing file: ${file.fileName}`, {
            sheetCount: sheetNames.length,
            sheetNames,
            isSingleSheet: sheetNames.length === 1
          });

          if (sheetNames.length === 1) {
            // 单sheet: 直接传递数据数组
            datasets[file.fileName] = file.sheets[sheetNames[0]];
            this.log('info', `Single sheet detected, passing array directly`, {
              fileName: file.fileName,
              sheetName: sheetNames[0],
              dataSample: file.sheets[sheetNames[0]].slice(0, 2)
            });
          } else {
            // 多sheet: 传递嵌套对象
            datasets[file.fileName] = file.sheets;
            this.log('info', `Multiple sheets detected, passing nested object`, {
              fileName: file.fileName,
              sheets: sheetNames
            });
          }
        }
      }

      // 执行代码
      this.log('info', 'Executing generated code');
      const executionResult = await executeTransformation(
        codeGenerationResult.code,
        datasets,
        this.config.timeoutPerStep
      );

      if (!executionResult) {
        throw new Error('Code execution failed');
      }

      // ✅ 成功执行后不再重置全局重试计数器
      // 移除重置逻辑，确保计数器在整个任务执行期间有效
      // globalRetryCount = 0;  // ❌ 这会导致计数器失效

      const duration = Date.now() - startTime;
      this.log('info', 'Act step completed', {
        duration,
        outputFiles: Object.keys(executionResult)
      });

      return {
        stepId,
        success: true,
        output: executionResult,
        executionTime: duration
      };

    } catch (error) {
      // ✅ 增加全局重试计数器
      globalRetryCount++;

      // ✅ 立即检查是否超过最大重试次数
      if (globalRetryCount >= MAX_GLOBAL_RETRIES) {
        this.log('error', 'Max global retries reached in catch block', {
          retryCount: globalRetryCount,
          maxRetries: MAX_GLOBAL_RETRIES,
          errorMessage: error instanceof Error ? error.message : String(error)
        });

        return {
          stepId,
          success: false,
          error: this.createError(
            ErrorCategory.UNKNOWN_ERROR,
            'MAX_RETRIES_EXCEEDED',
            `已达到最大重试次数 ${MAX_GLOBAL_RETRIES}，停止执行以防止无限循环`
          ),
          executionTime: Date.now() - startTime
        };
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';

      // 详细记录错误信息 - 修复：安全地访问可能未定义的变量
      this.log('error', 'Act step failed with details', {
        message: errorMessage,
        stack: errorStack,
        globalRetryCount,
        code: codeGenerationResult?.code?.substring(0, 500) || 'No code generated',
        datasets: Object.keys(datasets),
        filesPreview: filesPreview ? {
          count: filesPreview.length,
          sample: JSON.stringify(filesPreview[0]).substring(0, 200)
        } : 'No filesPreview created'
      });

      return {
        stepId,
        success: false,
        error: this.createError(
          ErrorCategory.CODE_EXECUTION_ERROR,
          'ACT_EXECUTION_FAILED',
          `${errorMessage}\n\n代码预览: ${codeGenerationResult?.code?.substring(0, 200) || 'No code generated'}...`
        ),
        executionTime: Date.now() - startTime,
        rawError: error, // 保存原始错误对象
        generatedCode: codeGenerationResult?.code || '' // 保存生成的代码
      };
    }
  }

  /**
   * Evaluate步骤：评估结果质量
   *
   * 职责：
   * 1. 验证输出数据
   * 2. 检查数据质量
   * 3. 生成质量报告
   * 4. 提供优化建议
   */
  private async evaluateStep(stepResult: StepResult): Promise<EvaluationResult> {
    this.updateTaskStatus(TaskStatus.EVALUATING);
    this.log('info', 'Starting evaluation step');

    const startTime = Date.now();

    try {
      const feedback: EvaluationResult['feedback'] = {
        stepId: stepResult.stepId,
        success: stepResult.success,
        quality: 0,
        issues: [],
        suggestions: [],
        outputQuality: {
          completeness: 0,
          accuracy: 0,
          consistency: 0
        }
      };

      const issues = {
        critical: [] as string[],
        warning: [] as string[],
        info: [] as string[]
      };

      // 基本验证
      if (!stepResult.success) {
        issues.critical.push('Execution step failed');
        feedback.quality = 0;

        return {
          success: false,
          passed: false,
          feedback,
          nextAction: 'fail',
          qualityScore: 0,
          issues
        };
      }

      // 数据质量评估
      if (stepResult.output) {
        const qualityMetrics = this.assessOutputQuality(stepResult.output);
        feedback.outputQuality = qualityMetrics;
        feedback.quality = (qualityMetrics.completeness + qualityMetrics.accuracy + qualityMetrics.consistency) / 3;
      }

      // 检查质量问题
      if (feedback.outputQuality.completeness < 0.5) {
        issues.warning.push('Output data may be incomplete');
      }

      if (feedback.outputQuality.accuracy < 0.8) {
        issues.warning.push('Output data accuracy may be low');
      }

      // 判断是否通过
      const passed = feedback.quality >= this.config.qualityThreshold;
      const qualityScore = feedback.quality;

      // 决定下一步行动
      let nextAction: EvaluationResult['nextAction'];
      if (passed) {
        nextAction = 'complete';
      } else if (feedback.quality >= 0.5) {
        nextAction = 'continue';
      } else {
        nextAction = 'repair';
      }

      const duration = Date.now() - startTime;
      this.log('info', 'Evaluation completed', {
        duration,
        qualityScore,
        passed,
        nextAction
      });

      return {
        success: true,
        passed,
        feedback,
        nextAction,
        qualityScore,
        issues
      };

    } catch (error) {
      this.log('error', 'Evaluation failed', { error });

      return {
        success: false,
        passed: false,
        feedback: {
          stepId: stepResult.stepId,
          success: false,
          quality: 0,
          issues: [error instanceof Error ? error.message : String(error)],
          suggestions: [],
          outputQuality: { completeness: 0, accuracy: 0, consistency: 0 }
        },
        nextAction: 'fail',
        qualityScore: 0,
        issues: {
          critical: ['Evaluation failed'],
          warning: [],
          info: []
        }
      };
    }
  }

  /**
   * 错误处理和自动修复
   *
   * 职责：
   * 1. 分析错误原因
   * 2. 选择修复策略
   * 3. 执行修复
   * 4. 验证修复结果
   */
  private async handleError(error: TaskError): Promise<RepairResult> {
    this.updateTaskStatus(TaskStatus.REPAIRING);
    this.log('info', 'Starting error repair', { error: error.message });

    const startTime = Date.now();
    let attemptNumber = 0;

    try {
      // 分析错误
      const errorAnalysis = await this.analyzeError(error);

      // 尝试修复
      for (const strategy of errorAnalysis.suggestedRepair) {
        attemptNumber++;

        this.log('info', `Attempting repair strategy ${attemptNumber}: ${strategy.type}`, {
          strategy: strategy.description
        });

        try {
          const repairResult = await this.applyRepairStrategy(strategy, error);

          if (repairResult.success) {
            this.log('info', 'Repair successful', { attemptNumber });

            return {
              success: true,
              appliedStrategy: strategy,
              result: repairResult.result,
              remainingErrors: [],
              attemptNumber,
              maxAttempts: this.config.maxRetries,
              canContinue: true
            };
          }
        } catch (repairError) {
          this.log('warn', `Repair attempt ${attemptNumber} failed`, { error: repairError });
        }

        // 检查是否达到最大尝试次数
        if (attemptNumber >= this.config.maxRetries) {
          break;
        }
      }

      // 所有修复策略都失败
      this.log('error', 'All repair strategies failed');

      return {
        success: false,
        appliedStrategy: {
          type: 'user_intervention',
          description: 'Automatic repair failed, user intervention required',
          action: '',
          priority: 0,
          estimatedSuccessRate: 0
        },
        remainingErrors: [error],
        attemptNumber,
        maxAttempts: this.config.maxRetries,
        canContinue: false
      };

    } catch (error) {
      this.log('error', 'Error repair failed', { error });

      return {
        success: false,
        appliedStrategy: {
          type: 'user_intervention',
          description: 'Error analysis failed',
          action: '',
          priority: 0,
          estimatedSuccessRate: 0
        },
        remainingErrors: [error],
        attemptNumber,
        maxAttempts: this.config.maxRetries,
        canContinue: false
      };
    }
  }

  /**
   * 分析错误
   */
  private async analyzeError(error: TaskError): Promise<any> {
    // 根据错误类型生成修复策略
    const strategies: any[] = [];

    switch (error.category) {
      case ErrorCategory.COLUMN_NOT_FOUND:
        strategies.push({
          type: 'code_fix',
          description: 'Analyze and fix column name error',
          action: 'fix_column_reference',
          priority: 1,
          estimatedSuccessRate: 0.7
        });
        strategies.push({
          type: 'simple_approach',
          description: 'Use simplified data processing',
          action: 'use_basic_operations',
          priority: 2,
          estimatedSuccessRate: 0.5
        });
        break;

      case ErrorCategory.CODE_EXECUTION_ERROR:
        // 分析错误消息
        const errorMessage = error.message || '';

        // 根据具体错误类型提供不同的修复策略
        if (errorMessage.includes('SyntaxError') || errorMessage.includes('IndentationError')) {
          strategies.push({
            type: 'code_fix',
            description: 'Fix Python syntax error',
            action: 'fix_syntax',
            priority: 1,
            estimatedSuccessRate: 0.4
          });
        }

        // 添加代码修复策略
        strategies.push({
          type: 'code_fix',
          description: 'Analyze and attempt to fix code error',
          action: 'analyze_and_fix',
          priority: 2,
          estimatedSuccessRate: 0.3
        });

        // 添加简化方法
        strategies.push({
          type: 'simple_approach',
          description: 'Use simplified processing approach',
          action: 'simplify_logic',
          priority: 3,
          estimatedSuccessRate: 0.5
        });

        // 最后添加重试
        strategies.push({
          type: 'retry',
          description: 'Retry with new code generation',
          action: 'regenerate_code',
          priority: 4,
          estimatedSuccessRate: 0.4
        });
        break;

      case ErrorCategory.AI_SERVICE_ERROR:
        strategies.push({
          type: 'fallback',
          description: 'Use cached response or simplified approach',
          action: 'use_cache',
          priority: 1,
          estimatedSuccessRate: 0.8
        });
        strategies.push({
          type: 'retry',
          description: 'Retry AI service call',
          action: 'retry_ai_call',
          priority: 2,
          estimatedSuccessRate: 0.6
        });
        break;

      case ErrorCategory.DATA_ERROR:
        strategies.push({
          type: 'simple_approach',
          description: 'Clean and normalize data',
          action: 'clean_data',
          priority: 1,
          estimatedSuccessRate: 0.6
        });
        break;

      default:
        strategies.push({
          type: 'simple_approach',
          description: 'Use simplified approach',
          action: 'simplify',
          priority: 1,
          estimatedSuccessRate: 0.5
        });
        strategies.push({
          type: 'retry',
          description: 'Retry the operation',
          action: 'simple_retry',
          priority: 2,
          estimatedSuccessRate: 0.3
        });
    }

    return {
      error,
      rootCause: error.message,
      suggestedRepair: strategies,
      canAutoRecover: true,
      requiresUserIntervention: false,
      confidence: 0.7
    };
  }

  /**
   * 应用修复策略
   */
  private async applyRepairStrategy(strategy: any, error: TaskError): Promise<any> {
    this.log('info', `Applying repair strategy: ${strategy.type}`);

    switch (strategy.type) {
      case 'retry':
        // 重新执行当前步骤
        return this.retryCurrentStep();

      case 'fallback':
        // 使用降级策略
        return this.useFallbackStrategy();

      case 'code_fix':
        // 尝试修复代码错误
        return this.fixCodeError(error);

      case 'simple_approach':
        // 使用简化方法
        return this.useSimpleApproach();

      default:
        throw new Error(`Unsupported repair strategy: ${strategy.type}`);
    }
  }

  /**
   * 尝试修复代码错误
   */
  private async fixCodeError(error: TaskError): Promise<any> {
    this.log('info', 'Attempting to fix code error');

    // 如果错误信息包含代码，尝试提取并修复
    const errorCode = error.message || '';

    // 常见的 Python 错误修复
    let fixed = false;
    let suggestion = '';

    if (errorCode.includes('NameError') || errorCode.includes('name \'')) {
      suggestion = '检查变量名是否定义，确保使用正确的列名';
      fixed = true;
    } else if (errorCode.includes('KeyError') || errorCode.includes('column')) {
      suggestion = '检查列名是否存在，尝试使用可用的列名';
      fixed = true;
    } else if (errorCode.includes('SyntaxError')) {
      suggestion = '检查代码语法是否正确';
      fixed = true;
    } else if (errorCode.includes('IndentationError')) {
      suggestion = '检查代码缩进是否正确';
      fixed = true;
    }

    if (fixed) {
      this.log('info', 'Code error analyzed', { suggestion });
    }

    // 如果无法自动修复，返回失败
    return {
      success: false,
      error: 'Cannot automatically fix code error',
      suggestion
    };
  }

  /**
   * 使用简化方法
   */
  private async useSimpleApproach(): Promise<any> {
    this.log('info', 'Using simplified processing approach');

    // 返回一个简单的处理结果，表示需要降级
    return {
      success: false,
      error: 'Simplified approach failed, falling back to basic mode',
      shouldFallback: true
    };
  }

  /**
   * 重试当前步骤
   * ⚠️ 修复：不再重新执行整个任务流程，避免无限递归
   */
  private async retryCurrentStep(): Promise<any> {
    if (!this.currentTask) {
      throw new Error('No active task');
    }

    // ❌ 移除无限递归：不再重新执行整个任务流程
    // return this.executeTaskFlow();  // 这会导致无限循环

    // ✅ 改为抛出异常，让上层调用者处理
    this.log('warn', 'Retry strategy requested: Manual retry required');
    throw new Error('Retry strategy: Cannot automatically retry, manual intervention required');
  }

  /**
   * 使用降级策略
   */
  private async useFallbackStrategy(): Promise<any> {
    this.log('info', 'Using fallback strategy');

    // 返回基本处理结果
    return {
      success: true,
      result: {},
      message: 'Used fallback processing'
    };
  }

  /**
   * 生成最终结果
   */
  private generateFinalResult(stepResult: StepResult, evaluation: EvaluationResult): TaskResult {
    if (!this.currentTask) {
      throw new Error('No active task');
    }

    this.updateTaskStatus(TaskStatus.COMPLETED);

    const completedAt = Date.now();
    const totalTime = completedAt - this.currentTask.metadata.createdAt;

    return {
      success: stepResult.success && evaluation.passed,
      data: stepResult.output,
      logs: this.logs.map(log => log.message),
      qualityReport: this.generateQualityReport(evaluation),
      executionSummary: {
        totalSteps: this.currentTask.steps.length,
        successfulSteps: this.currentTask.steps.filter(s => s.status === TaskStatus.COMPLETED).length,
        failedSteps: this.currentTask.steps.filter(s => s.status === TaskStatus.FAILED).length,
        retriedSteps: 0, // TODO: Track retries
        totalTime,
        averageStepTime: totalTime / this.currentTask.steps.length
      },
      metadata: {
        completedAt,
        sessionId: this.sessionId,
        taskId: this.currentTask.id
      }
    };
  }

  /**
   * 处理任务失败
   */
  private handleTaskFailure(error: Error): TaskResult {
    if (!this.currentTask) {
      throw new Error('No active task');
    }

    this.updateTaskStatus(TaskStatus.FAILED);

    const taskError = this.createError(
      ErrorCategory.UNKNOWN_ERROR,
      'TASK_EXECUTION_FAILED',
      error.message
    );

    this.currentTask.error = taskError;

    const completedAt = Date.now();
    const totalTime = completedAt - this.currentTask.metadata.createdAt;

    return {
      success: false,
      logs: this.logs.map(log => log.message),
      executionSummary: {
        totalSteps: this.currentTask.steps.length,
        successfulSteps: this.currentTask.steps.filter(s => s.status === TaskStatus.COMPLETED).length,
        failedSteps: this.currentTask.steps.filter(s => s.status === TaskStatus.FAILED).length,
        retriedSteps: 0,
        totalTime,
        averageStepTime: totalTime / Math.max(this.currentTask.steps.length, 1)
      },
      metadata: {
        completedAt,
        sessionId: this.sessionId,
        taskId: this.currentTask.id
      }
    };
  }

  // ========== 辅助方法 ==========

  /**
   * 初始化任务
   */
  private initializeTask(taskId: string, userPrompt: string, dataFiles: DataFileInfo[]): MultiStepTask {
    const now = Date.now();

    return {
      id: taskId,
      status: TaskStatus.IDLE,
      context: {
        userInput: userPrompt,
        dataFiles,
        metadata: {},
        history: {
          attempts: 0,
          errors: [],
          repairs: []
        },
        sessionState: {
          sessionId: this.sessionId,
          startTime: now,
          lastUpdateTime: now
        }
      },
      steps: [],
      progress: {
        percentage: 0,
        currentPhase: 'Initializing',
        message: 'Task created'
      },
      metadata: {
        createdAt: now,
        updatedAt: now,
        version: '1.0.0'
      }
    };
  }

  /**
   * 更新任务状态
   */
  private async updateTaskStatus(status: TaskStatus): Promise<void> {
    if (!this.currentTask) return;

    this.currentTask.status = status;
    this.currentTask.metadata.updatedAt = Date.now();

    // 更新进度信息
    const phaseMessages: Record<TaskStatus, string> = {
      [TaskStatus.IDLE]: 'Idle',
      [TaskStatus.OBSERVING]: 'Observing data',
      [TaskStatus.THINKING]: 'Planning approach',
      [TaskStatus.ACTING]: 'Executing transformation',
      [TaskStatus.EVALUATING]: 'Evaluating results',
      [TaskStatus.REPAIRING]: 'Repairing errors',
      [TaskStatus.COMPLETED]: 'Completed',
      [TaskStatus.FAILED]: 'Failed',
      [TaskStatus.CANCELLED]: 'Cancelled'
    };

    const progressMap: Record<TaskStatus, number> = {
      [TaskStatus.IDLE]: 0,
      [TaskStatus.OBSERVING]: 20,
      [TaskStatus.THINKING]: 40,
      [TaskStatus.ACTING]: 60,
      [TaskStatus.EVALUATING]: 80,
      [TaskStatus.REPAIRING]: 70,
      [TaskStatus.COMPLETED]: 100,
      [TaskStatus.FAILED]: 0,
      [TaskStatus.CANCELLED]: 0
    };

    this.currentTask.progress = {
      percentage: progressMap[status],
      currentPhase: status,
      message: phaseMessages[status]
    };

    // 持久化进度更新
    if (this.stateManager && this.currentTask.id) {
      try {
        await this.stateManager.updateExecutionProgress(this.currentTask.id, this.currentTask.progress);
      } catch (error) {
        this.log('warn', 'Failed to persist progress update', { error });
      }
    }

    this.notifyProgress();
  }

  /**
   * 通知进度更新
   */
  private notifyProgress(): void {
    if (this.currentTask) {
      this.progressCallbacks.forEach(callback => {
        try {
          callback(this.currentTask!);
        } catch (error) {
          console.error('Progress callback error:', error);
        }
      });
    }
  }

  /**
   * 记录日志
   */
  private log(level: 'info' | 'warn' | 'error', message: string, context?: any): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context
    };

    this.logs.push(entry);

    // 根据日志级别决定是否输出到控制台
    if (this.shouldLog(level)) {
      const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      logMethod(`[AgenticOrchestrator] ${message}`, context || '');
    }
  }

  /**
   * 判断是否应该输出日志
   */
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 提取文件头信息
   */
  private extractHeaders(file: DataFileInfo): string[] {
    if (file.sheets && file.currentSheetName) {
      const sheetData = file.sheets[file.currentSheetName];
      if (Array.isArray(sheetData) && sheetData.length > 0) {
        return Object.keys(sheetData[0] || {});
      }
    }
    return [];
  }

  /**
   * 提取样本行
   */
  private extractSampleRows(file: DataFileInfo): any[] {
    if (file.sheets && file.currentSheetName) {
      const sheetData = file.sheets[file.currentSheetName];
      if (Array.isArray(sheetData)) {
        return sheetData.slice(0, 5); // 前5行
      }
    }
    return [];
  }

  /**
   * 检测数据模式
   */
  private detectDataPatterns(data: any[]): string[] {
    const patterns: string[] = [];

    if (!Array.isArray(data) || data.length === 0) {
      return patterns;
    }

    // 检测数值列
    const firstRow = data[0];
    const numericColumns = Object.keys(firstRow).filter(key =>
      typeof firstRow[key] === 'number'
    );

    if (numericColumns.length > 0) {
      patterns.push(`Found ${numericColumns.length} numeric columns`);
    }

    // 检测日期列
    const dateColumns = Object.keys(firstRow).filter(key => {
      const value = firstRow[key];
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
    });

    if (dateColumns.length > 0) {
      patterns.push(`Found ${dateColumns.length} date columns`);
    }

    return patterns;
  }

  /**
   * 构建思考请求
   */
  private buildThinkingRequest(observation: ObservationResult): AIAnalysisRequest {
    return {
      prompt: `
Based on the following observation, create an execution plan for processing the data:

User Intent: ${this.currentTask?.context.userInput}

Data Structure:
- Files: ${observation.observations.dataStructure.files.join(', ')}
- Total Rows: ${observation.observations.dataStructure.totalRows}
- Total Columns: ${observation.observations.dataStructure.totalColumns}
- Has Comments: ${observation.observations.metadata.hasComments}
- Has Notes: ${observation.observations.metadata.hasNotes}

Issues: ${observation.issues.join(', ')}
Warnings: ${observation.warnings.join(', ')}

Please provide a step-by-step execution plan in JSON format.
      `,
      context: observation,
      maxTokens: this.config.maxTokens
    };
  }

  /**
   * 调用AI服务
   */
  private async callAIService(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // 这里可以扩展为更通用的AI服务接口
      // 目前使用 zhipuService
      const result = await generateDataProcessingCode(
        request.prompt,
        [] // 暂时不传递文件预览
      );

      return {
        success: true,
        content: result.explanation + '\n\n' + result.code,
        reasoning: result.explanation,
        confidence: 0.8
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        error: {
          code: 'AI_SERVICE_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * 解析执行计划
   */
  private parseExecutionPlan(content: string): ExecutionPlan {
    // 简化版本：生成基本计划
    return {
      id: this.generateId(),
      steps: [
        {
          id: this.generateId(),
          name: 'Data Processing',
          description: 'Process data according to user requirements',
          status: TaskStatus.IDLE,
          startTime: Date.now(),
          input: {},
          metadata: {}
        }
      ],
      estimatedDuration: 30000,
      requiredResources: ['cpu', 'memory'],
      fallbackStrategies: {}
    };
  }

  /**
   * 生成降级计划
   */
  private generateFallbackPlan(): ExecutionPlan {
    return {
      id: this.generateId(),
      steps: [
        {
          id: this.generateId(),
          name: 'Basic Processing',
          description: 'Basic data processing without AI optimization',
          status: TaskStatus.IDLE,
          startTime: Date.now(),
          input: {},
          metadata: {}
        }
      ],
      estimatedDuration: 30000,
      requiredResources: ['cpu', 'memory'],
      fallbackStrategies: {}
    };
  }

  /**
   * 评估输出质量
   */
  private assessOutputQuality(output: any): {
    completeness: number;
    accuracy: number;
    consistency: number;
  } {
    let completeness = 0.8; // 默认值
    let accuracy = 0.8;
    let consistency = 0.8;

    // 检查输出是否为空
    if (!output || Object.keys(output).length === 0) {
      completeness = 0;
    }

    // 检查输出数据量
    for (const [fileName, data] of Object.entries(output)) {
      if (Array.isArray(data)) {
        if (data.length > 0) {
          completeness = Math.min(1, completeness + 0.1);
        }
      }
    }

    return { completeness, accuracy, consistency };
  }

  /**
   * 生成质量报告
   */
  private generateQualityReport(evaluation: EvaluationResult): QualityReport {
    return {
      overallQuality: evaluation.qualityScore,
      stepReports: {
        [evaluation.feedback.stepId]: evaluation.feedback
      },
      totalIssues: evaluation.issues.critical.length + evaluation.issues.warning.length,
      criticalIssues: evaluation.issues.critical.length,
      suggestions: evaluation.feedback.suggestions,
      metrics: {
        totalSteps: 1,
        successfulSteps: evaluation.passed ? 1 : 0,
        failedSteps: evaluation.passed ? 0 : 1,
        retriedSteps: 0,
        totalTime: 0
      }
    };
  }

  /**
   * 创建错误对象
   */
  private createError(
    category: ErrorCategory,
    code: string,
    message: string,
    details?: any
  ): TaskError {
    return {
      id: this.generateId(),
      category,
      code,
      message,
      details,
      timestamp: Date.now(),
      retryable: this.isRetryableError(category),
      severity: this.getErrorSeverity(category)
    };
  }

  /**
   * 从评估结果创建错误
   */
  private createErrorFromEvaluation(evaluation: EvaluationResult): TaskError {
    return this.createError(
      ErrorCategory.UNKNOWN_ERROR,
      'EVALUATION_FAILED',
      `Quality score ${evaluation.qualityScore} below threshold ${this.config.qualityThreshold}`
    );
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(category: ErrorCategory): boolean {
    return [
      ErrorCategory.AI_SERVICE_ERROR,
      ErrorCategory.NETWORK_ERROR,
      ErrorCategory.TIMEOUT_ERROR,
      ErrorCategory.AI_RATE_LIMIT
    ].includes(category);
  }

  /**
   * 获取错误严重程度
   */
  private getErrorSeverity(category: ErrorCategory): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<ErrorCategory, 'low' | 'medium' | 'high' | 'critical'> = {
      [ErrorCategory.VALIDATION_ERROR]: 'medium',
      [ErrorCategory.INVALID_INPUT]: 'low',
      [ErrorCategory.DATA_ERROR]: 'high',
      [ErrorCategory.DATA_PARSING_ERROR]: 'high',
      [ErrorCategory.DATA_TRANSFORMATION_ERROR]: 'high',
      [ErrorCategory.COLUMN_NOT_FOUND]: 'medium',
      [ErrorCategory.AI_SERVICE_ERROR]: 'high',
      [ErrorCategory.AI_TIMEOUT]: 'medium',
      [ErrorCategory.AI_RATE_LIMIT]: 'low',
      [ErrorCategory.CODE_EXECUTION_ERROR]: 'critical',
      [ErrorCategory.CODE_SYNTAX_ERROR]: 'high',
      [ErrorCategory.RUNTIME_ERROR]: 'high',
      [ErrorCategory.NETWORK_ERROR]: 'medium',
      [ErrorCategory.STORAGE_ERROR]: 'high',
      [ErrorCategory.TIMEOUT_ERROR]: 'medium',
      [ErrorCategory.UNKNOWN_ERROR]: 'medium'
    };

    return severityMap[category] || 'medium';
  }

  // ========== 公共API ==========

  /**
   * 注册进度回调
   */
  public updateProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback);

    // 立即通知当前状态
    if (this.currentTask) {
      callback(this.currentTask);
    }
  }

  /**
   * 获取当前任务状态
   */
  public getTaskState(): MultiStepTask | null {
    return this.currentTask;
  }

  /**
   * 取消当前任务
   */
  public cancelTask(): void {
    if (this.currentTask && this.currentTask.status !== TaskStatus.COMPLETED) {
      this.updateTaskStatus(TaskStatus.CANCELLED);
      this.log('info', 'Task cancelled by user');
    }
  }

  /**
   * 获取日志
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 清除日志
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * 获取统计信息
   */
  public getStatistics() {
    return {
      sessionId: this.sessionId,
      totalTasks: 1,
      completedTasks: this.currentTask?.status === TaskStatus.COMPLETED ? 1 : 0,
      failedTasks: this.currentTask?.status === TaskStatus.FAILED ? 1 : 0,
      averageExecutionTime: 0,
      degradationState: this.degradationManager.getCurrentState()
    };
  }

  /**
   * 销毁编排器
   */
  public destroy(): void {
    this.degradationManager.destroy();
    this.progressCallbacks = [];
    this.logs = [];
    console.log('[AgenticOrchestrator] Destroyed');
  }
}

/**
 * 导出单例实例的工厂函数
 */
export const createOrchestrator = (config?: Partial<OrchestratorConfig>): AgenticOrchestrator => {
  return new AgenticOrchestrator(config);
};

/**
 * 默认导出
 */
export default AgenticOrchestrator;
