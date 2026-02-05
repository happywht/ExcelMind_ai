/**
 * AI编排服务 - 多轮AI交互管理
 *
 * 职责：
 * 1. 管理AI交互的完整生命周期
 * 2. 协调多轮AI对话
 * 3. 处理AI响应的解析和验证
 * 4. 管理AI上下文和提示词
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AIRound,
  AIAnalysisRequest,
  AIAnalysisResponse,
  AnalysisContext,
  CacheKey,
  CacheEntry
} from '../../types/mappingSchemaV2';
import { ICacheService, IEventBus } from '../intelligentDocumentService';
import { SAMPLING_CONFIG } from '../../config/samplingConfig';

// ============================================================================
// AI交互状态机
// ============================================================================

/**
 * AI会话状态
 */
interface AISessionState {
  sessionId: string;
  currentRound: AIRound;
  completedRounds: AIRound[];
  context: AnalysisContext;
  history: AIRoundMessage[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    totalTokensUsed: number;
    estimatedCost: number;
  };
}

/**
 * AI轮次消息
 */
interface AIRoundMessage {
  round: AIRound;
  timestamp: number;
  input: any;
  output: any;
  duration: number;
  tokensUsed: number;
}

// ============================================================================
// AI编排服务配置
// ============================================================================

interface AIOrchestrationConfig {
  provider: {
    name: 'zhipu' | 'openai' | 'anthropic';
    apiKey: string;
    baseURL?: string;
    model: string;
  };
  execution: {
    maxRetries: number;
    retryDelay: number;
    timeout: number;
  };
  cost: {
    maxTokensPerRequest: number;
    maxTokensPerSession: number;
    costPer1kTokens: number;
  };
  fallback: {
    enableCache: boolean;
    enableFallback: boolean;
    fallbackTimeout: number;
  };
}

// ============================================================================
// AI编排服务实现
// ============================================================================

export class AIOrchestrationService {
  private client: Anthropic;
  private sessions: Map<string, AISessionState> = new Map();

  constructor(
    private readonly config: AIOrchestrationConfig,
    private readonly cacheService: ICacheService,
    private readonly eventBus: IEventBus
  ) {
    // 初始化AI客户端
    this.client = new Anthropic({
      apiKey: this.config.provider.apiKey,
      baseURL: this.config.provider.baseURL,
      dangerouslyAllowBrowser: true
    });
  }

  // ============================================================================
// 公共方法
// ============================================================================

  /**
   * 执行AI分析（单轮）
   */
  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const startTime = Date.now();

    try {
      // 1. 检查缓存
      if (request.options?.useCache !== false) {
        const cached = await this.checkCache(request);
        if (cached) {
          return cached;
        }
      }

      // 2. 获取或创建会话
      const session = await this.getOrCreateSession(request);

      // 3. 构建提示词
      const prompt = await this.buildPrompt(request.round, request.context);

      // 4. 执行AI调用（带重试）
      const result = await this.executeWithRetry(async () => {
        return await this.callAI(prompt, request.round);
      });

      // 5. 解析响应
      const response = await this.parseResponse(request.round, result);

      // 6. 验证响应
      await this.validateResponse(request.round, response);

      // 7. 更新会话状态
      this.updateSession(session, request, response, Date.now() - startTime);

      // 8. 缓存结果
      await this.cacheResult(request, response);

      // 9. 发布事件
      this.eventBus.publish('ai:round_completed', {
        round: request.round,
        duration: Date.now() - startTime,
        response
      });

      return response;

    } catch (error) {
      // 错误处理
      this.eventBus.publish('ai:round_failed', {
        round: request.round,
        error: error as Error
      });
      throw error;
    }
  }

  /**
   * 流式AI分析
   */
  async analyzeStream(
    request: AIAnalysisRequest,
    onProgress: (progress: number) => void
  ): Promise<AIAnalysisResponse> {
    // 流式分析实现
    // TODO: 实现流式处理
    return await this.analyze(request);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.config.provider.model,
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'ping'
        }]
      });
      return !!response;
    } catch {
      return false;
    }
  }

  /**
   * 获取模型信息
   */
  async getModelInfo(): Promise<{ model: string; capabilities: string[] }> {
    return {
      model: this.config.provider.model,
      capabilities: [
        'semantic_analysis',
        'data_mapping',
        'code_generation',
        'document_understanding',
        'multi_turn_conversation'
      ]
    };
  }

  // ============================================================================
  // 私有方法 - 会话管理
  // ============================================================================

  private async getOrCreateSession(request: AIAnalysisRequest): Promise<AISessionState> {
    let session = this.sessions.get(request.taskId);

    if (!session) {
      session = {
        sessionId: this.generateSessionId(request.taskId),
        currentRound: request.round,
        completedRounds: [],
        context: request.context,
        history: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          totalTokensUsed: 0,
          estimatedCost: 0
        }
      };
      this.sessions.set(request.taskId, session);
    }

    return session;
  }

  private updateSession(
    session: AISessionState,
    request: AIAnalysisRequest,
    response: AIAnalysisResponse,
    duration: number
  ): void {
    // 添加到历史
    session.history.push({
      round: request.round,
      timestamp: Date.now(),
      input: request.context,
      output: response,
      duration,
      tokensUsed: response.metadata?.tokensUsed || 0
    });

    // 更新当前轮次
    session.currentRound = request.round;

    // 更新元数据
    session.metadata.updatedAt = Date.now();
    session.metadata.totalTokensUsed += response.metadata?.tokensUsed || 0;
    session.metadata.estimatedCost = this.calculateCost(session.metadata.totalTokensUsed);

    // 如果完成，添加到已完成列表
    if (!session.completedRounds.includes(request.round)) {
      session.completedRounds.push(request.round);
    }
  }

  // ============================================================================
  // 私有方法 - 提示词构建
  // ============================================================================

  private async buildPrompt(round: AIRound, context: AnalysisContext): Promise<string> {
    const systemPrompt = this.getSystemPrompt(round);
    const contextPrompt = this.buildContextPrompt(round, context);

    return `${systemPrompt}\n\n${contextPrompt}`;
  }

  private getSystemPrompt(round: AIRound): string {
    const basePrompt = `你是一个专业的智能文档填充AI助手。你的任务是理解用户需求，并帮助完成从Excel数据到Word文档的智能填充。`;

    const roundPrompts: Record<AIRound, string> = {
      [AIRound.TEMPLATE_ANALYSIS]: `
${basePrompt}

**当前任务：模板分析**

你需要分析Word模板的结构，识别：
1. 所有占位符及其位置
2. 占位符的数据类型要求
3. 模板的章节结构
4. 条件块和循环结构
5. 占位符的语义上下文

**输出格式（JSON）：**
{
  "placeholders": [
    {
      "name": "占位符名称",
      "rawPlaceholder": "{{原始占位符}}",
      "dataType": "string|number|date|boolean|array|object",
      "required": true|false,
      "context": {
        "section": "所属章节",
        "position": 位置索引,
        "surroundingText": "周围文本"
      }
    }
  ],
  "sections": [
    {
      "title": "章节标题",
      "level": 标题级别,
      "placeholders": ["包含的占位符ID"]
    }
  ],
  "reasoning": "你的分析过程说明"
}`,
      [AIRound.DATA_ANALYSIS]: `
${basePrompt}

**当前任务：数据分析**

你需要分析Excel数据的结构，识别：
1. 每一列的数据类型
2. 列的语义含义
3. 数据之间的关系
4. 数据质量（缺失值、异常值等）
5. 可能的主键和外键

**输出格式（JSON）：**
{
  "columns": [
    {
      "name": "列名",
      "dataType": "string|number|date|boolean",
      "nullable": true|false,
      "sampleValues": ["样本值1", "样本值2"],
      "semanticHints": ["可能的语义含义"]
    }
  ],
  "relationships": [
    {
      "from": {"column": "列名"},
      "to": {"column": "列名"},
      "type": "one-to-one|one-to-many",
      "confidence": 置信度(0-1)
    }
  ],
  "reasoning": "你的分析过程说明"
}`,
      [AIRound.SEMANTIC_UNDERSTANDING]: `
${basePrompt}

**当前任务：语义理解**

你需要深入理解用户的自然语言指令，分析：
1. 用户的真实意图是什么
2. 需要哪些数据转换操作
3. 是否需要筛选数据
4. 是否需要聚合或计算
5. 是否需要跨文件关联

**输出格式（JSON）：**
{
  "intent": "用户的意图描述",
  "operations": [
    {
      "type": "filter|transform|aggregate|join|calculate",
      "description": "操作说明",
      "priority": 优先级(1-5)
    }
  ],
  "dataRequirements": [
    {
      "placeholder": "{{占位符}}",
      "dataType": "需要的数据类型",
      "transform": "可能需要的转换"
    }
  ],
  "reasoning": "你的理解过程说明"
}`,
      [AIRound.MAPPING_PLANNING]: `
${basePrompt}

**当前任务：映射规划**

你需要生成Excel数据到Word模板的字段映射方案：
1. 智能匹配占位符和数据列
2. 确定必要的数据转换
3. 定义筛选条件
4. 处理未映射的占位符
5. 评估匹配置信度

**输出格式（JSON）：**
{
  "mappings": [
    {
      "placeholder": "{{占位符}}",
      "excelColumn": "对应的Excel列名",
      "transform": "转换代码(可选)",
      "confidence": 置信度(0-1),
      "reasoning": "匹配推理"
    }
  ],
  "filterCondition": "筛选条件(JavaScript表达式)或null",
  "unmappedPlaceholders": ["未映射的占位符"],
  "warnings": ["潜在问题警告"],
  "confidence": 整体置信度(0-1),
  "reasoning": "映射规划的详细说明"
}`,
      [AIRound.TRANSFORMATION_GENERATION]: `
${basePrompt}

**当前任务：转换代码生成**

你需要生成可执行的数据转换JavaScript代码：
1. 根据映射方案生成转换函数
2. 处理数据类型转换
3. 处理空值和默认值
4. 实现自定义转换逻辑
5. 确保代码安全性和可维护性

**输出格式（JSON）：**
{
  "code": "JavaScript代码字符串",
  "description": "代码功能说明",
  "dependencies": ["依赖的其他字段"],
  "testCases": [
    {
      "input": {"字段": "测试值"},
      "expected": {"字段": "期望输出"}
    }
  ],
  "reasoning": "代码设计的详细说明"
}`,
      [AIRound.VALIDATION_OPTIMIZATION]: `
${basePrompt}

**当前任务：验证与优化**

你需要验证生成的映射方案，并提供优化建议：
1. 检查映射的完整性和正确性
2. 识别潜在的数据问题
3. 优化转换逻辑
4. 提供错误处理建议
5. 评估文档生成的成功率

**输出格式（JSON）：**
{
  "validationResults": {
    "valid": true|false,
    "errors": ["错误信息"],
    "warnings": ["警告信息"]
  },
  "optimizationSuggestions": [
    {
      "type": "mapping|transform|filter",
      "suggestion": "优化建议",
      "impact": "预期影响"
    }
  ],
  "estimatedSuccessRate": 预估成功率(0-1),
  "reasoning": "验证和优化的详细说明"
}`
    };

    return roundPrompts[round] || basePrompt;
  }

  private buildContextPrompt(round: AIRound, context: AnalysisContext): string {
    const sections: string[] = [];

    // 模板信息
    if (context.template) {
      sections.push('**模板信息：**');
      sections.push(`文件名: ${context.template.fileName || '未命名'}`);
      sections.push(`占位符数量: ${context.template.placeholders?.length || 0}`);
      if (context.template.placeholders) {
        sections.push('占位符列表:');
        context.template.placeholders.forEach(p => {
          sections.push(`  - ${p.name || p.rawPlaceholder} (${p.dataType})`);
        });
      }
    }

    // 数据源信息
    if (context.dataSources && context.dataSources.length > 0) {
      sections.push('\n**数据源信息：**');
      context.dataSources.forEach((source, idx) => {
        sections.push(`数据源${idx + 1}: ${source.name}`);
        sections.push(`  类型: ${source.type}`);
        sections.push(`  列数: ${source.schema?.columns?.length || 0}`);
        if (source.schema?.columns) {
          sections.push('  列名: ' + source.schema.columns.map(c => c.name).join(', '));
        }
        if (source.sampleData && source.sampleData.length > 0) {
          sections.push('  样本数据:');
          source.sampleData.slice(0, SAMPLING_CONFIG.DOCUMENT_MAPPING.PREVIEW_ROWS).forEach(row => {
            sections.push('    ' + JSON.stringify(row));
          });
        }
      });
    }

    // 用户指令
    if (context.userInstruction) {
      sections.push('\n**用户指令：**');
      sections.push(`"${context.userInstruction}"`);
    }

    // 前期结果
    if (context.previousResults) {
      sections.push('\n**前期分析结果：**');
      sections.push(JSON.stringify(context.previousResults, null, 2));
    }

    // 用户反馈
    if (context.userFeedback) {
      sections.push('\n**用户反馈：**');
      sections.push(context.userFeedback);
    }

    return sections.join('\n');
  }

  // ============================================================================
  // 私有方法 - AI调用
  // ============================================================================

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.execution.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.execution.maxRetries - 1) {
          const delay = this.config.execution.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('执行失败');
  }

  private async callAI(prompt: string, round: AIRound): Promise<string> {
    const response = await this.client.messages.create({
      model: this.config.provider.model,
      max_tokens: this.config.cost.maxTokensPerRequest,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const text = response.content[0];
    if (text?.type === 'text') {
      return text.text;
    }

    throw new Error('AI返回了非文本响应');
  }

  private async parseResponse(round: AIRound, rawResponse: string): Promise<AIAnalysisResponse> {
    try {
      // 清理响应
      let cleanResponse = rawResponse.trim();

      // 移除Markdown代码块标记
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      // 查找JSON对象
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }

      // 解析JSON
      const parsed = JSON.parse(cleanResponse);

      return {
        round,
        result: parsed,
        confidence: parsed.confidence || 0.8,
        reasoning: parsed.reasoning || '',
        needsUserInput: parsed.unmappedPlaceholders?.length > 0 || false,
        userQuestions: parsed.userQuestions || [],
        nextRound: this.getNextRound(round)
      };

    } catch (error) {
      // 解析失败，返回降级响应
      return {
        round,
        result: { raw: rawResponse },
        confidence: 0.5,
        reasoning: 'AI响应解析失败，返回原始响应',
        needsUserInput: true
      };
    }
  }

  private async validateResponse(round: AIRound, response: AIAnalysisResponse): Promise<void> {
    // 基本验证
    if (!response.result) {
      throw new Error('AI响应缺少result字段');
    }

    // 轮次特定验证
    switch (round) {
      case AIRound.MAPPING_PLANNING:
        if (!response.result.mappings || !Array.isArray(response.result.mappings)) {
          throw new Error('映射方案缺少mappings数组');
        }
        break;

      case AIRound.TRANSFORMATION_GENERATION:
        if (!response.result.code || typeof response.result.code !== 'string') {
          throw new Error('转换生成缺少code字段');
        }
        break;

      // 其他轮次的验证...
    }
  }

  // ============================================================================
  // 私有方法 - 缓存管理
  // ============================================================================

  private async checkCache(request: AIAnalysisRequest): Promise<AIAnalysisResponse | null> {
    const cacheKey = this.cacheService.generateKey(
      'ai_response',
      { round: request.round, context: request.context }
    );

    const cached = await this.cacheService.get<AIAnalysisResponse>(cacheKey);
    return cached?.value || null;
  }

  private async cacheResult(
    request: AIAnalysisRequest,
    response: AIAnalysisResponse
  ): Promise<void> {
    const cacheKey = this.cacheService.generateKey(
      'ai_response',
      { round: request.round, context: request.context }
    );

    await this.cacheService.set(cacheKey, response, 3600); // 缓存1小时
  }

  // ============================================================================
  // 私有方法 - 辅助函数
  // ============================================================================

  private generateSessionId(taskId: string): string {
    return `session_${taskId}_${Date.now()}`;
  }

  private getNextRound(currentRound: AIRound): AIRound | undefined {
    const rounds: AIRound[] = [
      AIRound.TEMPLATE_ANALYSIS,
      AIRound.DATA_ANALYSIS,
      AIRound.SEMANTIC_UNDERSTANDING,
      AIRound.MAPPING_PLANNING,
      AIRound.TRANSFORMATION_GENERATION,
      AIRound.VALIDATION_OPTIMIZATION
    ];

    const currentIndex = rounds.indexOf(currentRound);
    return rounds[currentIndex + 1];
  }

  private calculateCost(tokensUsed: number): number {
    return (tokensUsed / 1000) * this.config.cost.costPer1kTokens;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
