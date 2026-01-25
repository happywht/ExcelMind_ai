/**
 * Few-Shot Learning Engine - AI智能查询核心组件
 *
 * 职责：
 * 1. 管理查询示例库（100+示例）
 * 2. 智能检索相关示例（基于相似度计算）
 * 3. 构建Few-Shot提示（支持多种策略）
 * 4. 支持Chain-of-Thought推理
 * 5. 动态示例库更新和优化
 *
 * @module FewShotEngine
 * @version 1.0.0
 */

import { QueryExample, QueryType, DifficultyLevel, ExampleSource } from './queryExamples';
import { SAMPLING_CONFIG } from '../../config/samplingConfig';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 相似度计算方法
 */
export enum SimilarityMethod {
  /** 余弦相似度（基于TF-IDF） */
  COSINE = 'cosine',
  /** Jaccard相似度（词袋模型） */
  JACCARD = 'jaccard',
  /** 编辑距离 */
  LEVENSHTEIN = 'levenshtein',
  /** 语义相似度（基于关键词匹配） */
  SEMANTIC = 'semantic',
  /** 混合方法（综合多种算法） */
  HYBRID = 'hybrid'
}

/**
 * 检索策略
 */
export enum RetrievalStrategy {
  /** 基于关键词匹配 */
  KEYWORD = 'keyword',
  /** 基于查询类型 */
  TYPE_BASED = 'type_based',
  /** 基于难度级别 */
  DIFFICULTY_BASED = 'difficulty_based',
  /** 混合策略（综合多种方法） */
  HYBRID = 'hybrid',
  /** 自适应策略（根据查询自动选择） */
  ADAPTIVE = 'adaptive'
}

/**
 * 提示模板类型
 */
export enum PromptTemplate {
  /** 基础提示 */
  BASE = 'base',
  /** Few-Shot提示 */
  FEW_SHOT = 'few_shot',
  /** Chain-of-Thought提示 */
  COT = 'cot',
  /** 混合提示 */
  HYBRID = 'hybrid'
}

/**
 * 相似度得分
 */
interface SimilarityScore {
  exampleId: string;
  score: number;
  method: SimilarityMethod;
  details?: {
    cosine?: number;
    jaccard?: number;
    levenshtein?: number;
    semantic?: number;
  };
}

/**
 * 检索结果
 */
interface RetrievalResult {
  examples: QueryExample[];
  scores: SimilarityScore[];
  metadata: {
    query: string;
    strategy: RetrievalStrategy;
    totalCandidates: number;
    retrievedCount: number;
    retrievalTime: number;
  };
}

/**
 * Few-Shot提示构建配置
 */
interface FewShotPromptConfig {
  templateType: PromptTemplate;
  maxExamples: number;
  includeReasoning: boolean;
  includeSQL: boolean;
  includeExplanation: boolean;
  systemMessage?: string;
  customInstructions?: string;
}

/**
 * 文本预处理结果
 */
interface TextPreprocessing {
  tokens: string[];
  keywords: string[];
  normalized: string;
  original: string;
}

// ============================================================================
// Few-Shot引擎配置
// ============================================================================

interface FewShotEngineConfig {
  similarity: {
    defaultMethod: SimilarityMethod;
    threshold: number;
    weights: {
      cosine: number;
      jaccard: number;
      levenshtein: number;
      semantic: number;
    };
  };
  retrieval: {
    defaultStrategy: RetrievalStrategy;
    defaultTopK: number;
    maxCandidates: number;
    enableCache: boolean;
  };
  prompting: {
    defaultTemplate: PromptTemplate;
    maxExamples: number;
    minExamples: number;
  };
  learning: {
    enableFeedback: boolean;
    autoUpdateExamples: boolean;
    feedbackThreshold: number;
  };
}

// ============================================================================
// Few-Shot引擎实现
// ============================================================================

export class FewShotEngine {
  private examples: Map<string, QueryExample> = new Map();
  private config: FewShotEngineConfig;
  private cache: Map<string, RetrievalResult> = new Map();
  private feedbackHistory: Map<string, number[]> = new Map();

  constructor(config?: Partial<FewShotEngineConfig>) {
    this.config = this.mergeConfig(config);
  }

  // ========================================================================
  // 公共方法 - 示例管理
  // ========================================================================

  /**
   * 添加单个示例
   * @param example 查询示例
   */
  addExample(example: QueryExample): void {
    if (!example.id) {
      example.id = this.generateExampleId();
    }
    this.examples.set(example.id, example);
    this.invalidateCache();
  }

  /**
   * 批量添加示例
   * @param examples 查询示例数组
   */
  addExamples(examples: QueryExample[]): void {
    examples.forEach(example => this.addExample(example));
  }

  /**
   * 获取示例
   * @param id 示例ID
   */
  getExample(id: string): QueryExample | undefined {
    return this.examples.get(id);
  }

  /**
   * 获取所有示例
   */
  getAllExamples(): QueryExample[] {
    return Array.from(this.examples.values());
  }

  /**
   * 按类型获取示例
   * @param queryType 查询类型
   */
  getExamplesByType(queryType: QueryType): QueryExample[] {
    return this.getAllExamples().filter(ex => ex.queryType === queryType);
  }

  /**
   * 按难度获取示例
   * @param difficulty 难度级别
   */
  getExamplesByDifficulty(difficulty: DifficultyLevel): QueryExample[] {
    return this.getAllExamples().filter(ex => ex.difficulty === difficulty);
  }

  /**
   * 按标签获取示例
   * @param tags 标签数组
   */
  getExamplesByTags(tags: string[]): QueryExample[] {
    return this.getAllExamples().filter(ex =>
      tags.some(tag => ex.tags.includes(tag))
    );
  }

  /**
   * 更新示例
   * @param id 示例ID
   * @param updates 更新内容
   */
  updateExample(id: string, updates: Partial<QueryExample>): boolean {
    const example = this.examples.get(id);
    if (!example) return false;

    const updated = { ...example, ...updates };
    this.examples.set(id, updated);
    this.invalidateCache();
    return true;
  }

  /**
   * 删除示例
   * @param id 示例ID
   */
  removeExample(id: string): boolean {
    const result = this.examples.delete(id);
    if (result) {
      this.invalidateCache();
    }
    return result;
  }

  /**
   * 清空示例库
   */
  clearExamples(): void {
    this.examples.clear();
    this.invalidateCache();
  }

  // ========================================================================
  // 公共方法 - 相似度计算
  // ========================================================================

  /**
   * 计算两个查询的相似度
   * @param query1 查询1
   * @param query2 查询2
   * @param method 相似度计算方法
   */
  calculateSimilarity(
    query1: string,
    query2: string,
    method: SimilarityMethod = this.config.similarity.defaultMethod
  ): number {
    switch (method) {
      case SimilarityMethod.COSINE:
        return this.cosineSimilarity(query1, query2);
      case SimilarityMethod.JACCARD:
        return this.jaccardSimilarity(query1, query2);
      case SimilarityMethod.LEVENSHTEIN:
        return this.levenshteinSimilarity(query1, query2);
      case SimilarityMethod.SEMANTIC:
        return this.semanticSimilarity(query1, query2);
      case SimilarityMethod.HYBRID:
        return this.hybridSimilarity(query1, query2);
      default:
        return this.cosineSimilarity(query1, query2);
    }
  }

  /**
   * 计算查询与示例的相似度（带详细信息）
   * @param query 用户查询
   * @param example 查询示例
   */
  calculateDetailedSimilarity(query: string, example: QueryExample): SimilarityScore {
    const details = {
      cosine: this.cosineSimilarity(query, example.naturalQuery),
      jaccard: this.jaccardSimilarity(query, example.naturalQuery),
      levenshtein: this.levenshteinSimilarity(query, example.naturalQuery),
      semantic: this.semanticSimilarity(query, example.naturalQuery)
    };

    const weights = this.config.similarity.weights;
    const hybridScore =
      details.cosine * weights.cosine +
      details.jaccard * weights.jaccard +
      details.levenshtein * weights.levenshtein +
      details.semantic * weights.semantic;

    return {
      exampleId: example.id,
      score: hybridScore,
      method: SimilarityMethod.HYBRID,
      details
    };
  }

  // ========================================================================
  // 公共方法 - 示例检索
  // ========================================================================

  /**
   * 查找相关示例（核心方法）
   * @param userQuery 用户查询
   * @param availableFields 可用字段列表
   * @param topK 返回前K个示例
   * @param strategy 检索策略
   */
  findRelevantExamples(
    userQuery: string,
    availableFields: string[] = [],
    topK: number = this.config.retrieval.defaultTopK,
    strategy: RetrievalStrategy = this.config.retrieval.defaultStrategy
  ): QueryExample[] {
    const startTime = Date.now();

    // 检查缓存
    const cacheKey = this.buildCacheKey(userQuery, availableFields, topK, strategy);
    const cached = this.cache.get(cacheKey);
    if (cached && this.config.retrieval.enableCache) {
      return cached.examples;
    }

    // 执行检索
    let result: QueryExample[];
    switch (strategy) {
      case RetrievalStrategy.KEYWORD:
        result = this.keywordBasedRetrieval(userQuery, availableFields, topK);
        break;
      case RetrievalStrategy.TYPE_BASED:
        result = this.typeBasedRetrieval(userQuery, topK);
        break;
      case RetrievalStrategy.DIFFICULTY_BASED:
        result = this.difficultyBasedRetrieval(userQuery, topK);
        break;
      case RetrievalStrategy.ADAPTIVE:
        result = this.adaptiveRetrieval(userQuery, availableFields, topK);
        break;
      case RetrievalStrategy.HYBRID:
      default:
        result = this.hybridRetrieval(userQuery, availableFields, topK);
        break;
    }

    // 缓存结果
    const retrievalTime = Date.now() - startTime;
    if (this.config.retrieval.enableCache) {
      this.cache.set(cacheKey, {
        examples: result,
        scores: [],
        metadata: {
          query: userQuery,
          strategy,
          totalCandidates: this.examples.size,
          retrievedCount: result.length,
          retrievalTime
        }
      });
    }

    return result;
  }

  /**
   * 获取检索结果（包含分数和元数据）
   * @param userQuery 用户查询
   * @param availableFields 可用字段
   * @param topK 返回数量
   * @param strategy 检索策略
   */
  getRetrievalResult(
    userQuery: string,
    availableFields: string[] = [],
    topK: number = 5,
    strategy: RetrievalStrategy = RetrievalStrategy.HYBRID
  ): RetrievalResult {
    const examples = this.findRelevantExamples(userQuery, availableFields, topK, strategy);

    // 计算所有示例的相似度分数
    const scores: SimilarityScore[] = examples.map(example =>
      this.calculateDetailedSimilarity(userQuery, example)
    );

    return {
      examples,
      scores,
      metadata: {
        query: userQuery,
        strategy,
        totalCandidates: this.examples.size,
        retrievedCount: examples.length,
        retrievalTime: 0
      }
    };
  }

  // ========================================================================
  // 公共方法 - 提示构建
  // ========================================================================

  /**
   * 构建Few-Shot提示
   * @param userQuery 用户查询
   * @param examples 查询示例
   * @param config 构建配置
   */
  buildFewShotPrompt(
    userQuery: string,
    examples: QueryExample[],
    config?: Partial<FewShotPromptConfig>
  ): string {
    const fullConfig = this.mergePromptConfig(config);

    switch (fullConfig.templateType) {
      case PromptTemplate.BASE:
        return this.buildBasePrompt(userQuery, examples, fullConfig);
      case PromptTemplate.FEW_SHOT:
        return this.buildFewShotPromptInternal(userQuery, examples, fullConfig);
      case PromptTemplate.COT:
        return this.buildCoTPrompt(userQuery, examples, fullConfig);
      case PromptTemplate.HYBRID:
        return this.buildHybridPrompt(userQuery, examples, fullConfig);
      default:
        return this.buildFewShotPromptInternal(userQuery, examples, fullConfig);
    }
  }

  /**
   * 构建基础提示
   */
  buildBasePrompt(
    userQuery: string,
    examples: QueryExample[],
    config: FewShotPromptConfig
  ): string {
    const sections: string[] = [];

    // 系统消息
    if (config.systemMessage) {
      sections.push(config.systemMessage);
    } else {
      sections.push(this.getDefaultSystemMessage());
    }

    // 自定义指令
    if (config.customInstructions) {
      sections.push(`\n${config.customInstructions}`);
    }

    // 用户查询
    sections.push(`\n用户查询：${userQuery}`);

    return sections.join('\n');
  }

  /**
   * 构建标准Few-Shot提示
   */
  buildFewShotPromptInternal(
    userQuery: string,
    examples: QueryExample[],
    config: FewShotPromptConfig
  ): string {
    const sections: string[] = [];

    // 系统消息
    sections.push(config.systemMessage || this.getDefaultSystemMessage());

    // Few-Shot示例
    if (examples.length > 0) {
      sections.push('\n以下是参考示例：\n');
      examples.forEach((example, index) => {
        sections.push(this.formatExample(example, index + 1, config));
      });
    }

    // 自定义指令
    if (config.customInstructions) {
      sections.push(`\n${config.customInstructions}`);
    }

    // 当前查询
    sections.push(`\n现在请处理以下查询：`);
    sections.push(`自然语言查询：${userQuery}`);
    sections.push(`\n请输出对应的SQL查询：`);

    return sections.join('\n');
  }

  /**
   * 构建Chain-of-Thought提示
   */
  buildCoTPrompt(
    userQuery: string,
    examples: QueryExample[],
    config: FewShotPromptConfig
  ): string {
    const sections: string[] = [];

    // 系统消息
    sections.push(config.systemMessage || this.getCoTSystemMessage());

    // CoT示例
    if (examples.length > 0) {
      sections.push('\n以下是参考示例和推理过程：\n');
      examples
        .filter(ex => ex.reasoningSteps && ex.reasoningSteps.length > 0)
        .forEach((example, index) => {
          sections.push(this.formatCoTExample(example, index + 1, config));
        });
    }

    // 当前查询
    sections.push(`\n现在请按以下步骤处理查询：`);
    sections.push(`自然语言查询：${userQuery}`);
    sections.push(`\n请按以下格式输出：`);
    sections.push(`1. 推理过程：`);
    sections.push(`2. SQL查询：`);

    return sections.join('\n');
  }

  /**
   * 构建混合提示
   */
  buildHybridPrompt(
    userQuery: string,
    examples: QueryExample[],
    config: FewShotPromptConfig
  ): string {
    const sections: string[] = [];

    // 系统消息
    sections.push(config.systemMessage || this.getDefaultSystemMessage());

    // 混合示例（部分带推理，部分不带）
    if (examples.length > 0) {
      sections.push('\n以下是参考示例：\n');

      const withReasoning = examples.filter(ex => ex.reasoningSteps && ex.reasoningSteps.length > 0);
      const withoutReasoning = examples.filter(ex => !ex.reasoningSteps || ex.reasoningSteps.length === 0);

      // 先显示带推理的示例
      withReasoning.slice(0, Math.ceil(config.maxExamples / 2)).forEach((example, index) => {
        sections.push(this.formatCoTExample(example, index + 1, config));
      });

      // 再显示不带推理的示例
      withoutReasoning.slice(0, Math.floor(config.maxExamples / 2)).forEach((example, index) => {
        sections.push(this.formatExample(example, index + 1 + withReasoning.length, config));
      });
    }

    // 当前查询
    sections.push(`\n现在请处理以下查询：`);
    sections.push(`自然语言查询：${userQuery}`);
    sections.push(`\n请输出：`);
    sections.push(`1. 推理过程（如果查询较复杂）`);
    sections.push(`2. SQL查询：`);

    return sections.join('\n');
  }

  // ========================================================================
  // 公共方法 - 反馈学习
  // ========================================================================

  /**
   * 记录反馈
   * @param exampleId 示例ID
   * @param score 反馈分数（0-1）
   */
  recordFeedback(exampleId: string, score: number): void {
    if (!this.config.learning.enableFeedback) return;

    if (!this.feedbackHistory.has(exampleId)) {
      this.feedbackHistory.set(exampleId, []);
    }

    const history = this.feedbackHistory.get(exampleId)!;
    history.push(score);

    // 如果反馈历史足够，更新示例的权重
    if (history.length >= this.config.learning.feedbackThreshold) {
      const avgScore = history.reduce((a, b) => a + b, 0) / history.length;
      this.updateExampleWeight(exampleId, avgScore);
    }
  }

  /**
   * 获取示例统计信息
   */
  getStatistics(): {
    totalExamples: number;
    examplesByType: Record<QueryType, number>;
    examplesByDifficulty: Record<DifficultyLevel, number>;
    examplesBySource: Record<ExampleSource, number>;
    averageFeedbackScore: number;
  } {
    const examples = this.getAllExamples();

    const examplesByType = {
      simple: 0,
      aggregate: 0,
      join: 0,
      complex: 0
    } as Record<QueryType, number>;

    const examplesByDifficulty = {
      beginner: 0,
      intermediate: 0,
      advanced: 0
    } as Record<DifficultyLevel, number>;

    const examplesBySource = {
      manual: 0,
      generated: 0,
      user: 0
    } as Record<ExampleSource, number>;

    examples.forEach(ex => {
      examplesByType[ex.queryType]++;
      examplesByDifficulty[ex.difficulty]++;
      examplesBySource[ex.source]++;
    });

    let totalFeedbackScore = 0;
    let feedbackCount = 0;
    this.feedbackHistory.forEach(scores => {
      totalFeedbackScore += scores.reduce((a, b) => a + b, 0);
      feedbackCount += scores.length;
    });
    const averageFeedbackScore = feedbackCount > 0 ? totalFeedbackScore / feedbackCount : 0;

    return {
      totalExamples: examples.length,
      examplesByType,
      examplesByDifficulty,
      examplesBySource,
      averageFeedbackScore
    };
  }

  // ========================================================================
  // 私有方法 - 相似度计算实现
  // ========================================================================

  /**
   * 余弦相似度（基于TF-IDF）
   */
  private cosineSimilarity(text1: string, text2: string): number {
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);

    // 构建词汇表
    const vocab = new Set([...tokens1, ...tokens2]);

    // 计算TF
    const tf1 = this.computeTF(tokens1, vocab);
    const tf2 = this.computeTF(tokens2, vocab);

    // 计算点积
    let dotProduct = 0;
    vocab.forEach(word => {
      dotProduct += tf1.get(word)! * tf2.get(word)!;
    });

    // 计算模
    const magnitude1 = Math.sqrt(Array.from(tf1.values()).reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(Array.from(tf2.values()).reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Jaccard相似度
   */
  private jaccardSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(this.tokenize(text1));
    const tokens2 = new Set(this.tokenize(text2));

    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * 编辑距离相似度
   */
  private levenshteinSimilarity(text1: string, text2: string): number {
    const distance = this.levenshteinDistance(text1, text2);
    const maxLen = Math.max(text1.length, text2.length);
    if (maxLen === 0) return 1;
    return 1 - distance / maxLen;
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(text1: string, text2: string): number {
    const m = text1.length;
    const n = text2.length;
    const dp: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (text1[i - 1] === text2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }

    return dp[m][n];
  }

  /**
   * 语义相似度（基于关键词匹配）
   */
  private semanticSimilarity(text1: string, text2: string): number {
    const keywords1 = this.extractKeywords(text1);
    const keywords2 = this.extractKeywords(text2);

    if (keywords1.length === 0 && keywords2.length === 0) return 0;
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    // 计算关键词重叠
    const matches = keywords1.filter(kw => keywords2.includes(kw)).length;
    const union = new Set([...keywords1, ...keywords2]).size;

    return matches / union;
  }

  /**
   * 混合相似度（综合多种方法）
   */
  private hybridSimilarity(text1: string, text2: string): number {
    const weights = this.config.similarity.weights;
    return (
      this.cosineSimilarity(text1, text2) * weights.cosine +
      this.jaccardSimilarity(text1, text2) * weights.jaccard +
      this.levenshteinSimilarity(text1, text2) * weights.levenshtein +
      this.semanticSimilarity(text1, text2) * weights.semantic
    );
  }

  // ========================================================================
  // 私有方法 - 检索策略实现
  // ========================================================================

  /**
   * 基于关键词的检索
   */
  private keywordBasedRetrieval(
    userQuery: string,
    availableFields: string[],
    topK: number
  ): QueryExample[] {
    const queryKeywords = this.extractKeywords(userQuery);
    const allKeywords = [...queryKeywords, ...availableFields];

    const scored = this.getAllExamples().map(example => {
      const exampleKeywords = this.extractKeywords(example.naturalQuery);
      const exampleFields = example.fields || [];

      // 计算关键词匹配分数
      const keywordMatches = queryKeywords.filter(kw => exampleKeywords.includes(kw)).length;
      const fieldMatches = availableFields.filter(f => exampleFields.includes(f)).length;

      const keywordScore = keywordMatches / Math.max(queryKeywords.length, 1);
      const fieldScore = fieldMatches / Math.max(availableFields.length, 1);

      return {
        example,
        score: keywordScore * 0.7 + fieldScore * 0.3
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(item => item.example);
  }

  /**
   * 基于查询类型的检索
   */
  private typeBasedRetrieval(userQuery: string, topK: number): QueryExample[] {
    // 预测查询类型
    const predictedType = this.predictQueryType(userQuery);

    // 获取同类型示例
    const typeExamples = this.getExamplesByType(predictedType);

    // 计算相似度
    const scored = typeExamples.map(example => ({
      example,
      score: this.calculateSimilarity(userQuery, example.naturalQuery)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(item => item.example);
  }

  /**
   * 基于难度的检索
   */
  private difficultyBasedRetrieval(userQuery: string, topK: number): QueryExample[] {
    // 预测查询难度
    const predictedDifficulty = this.predictDifficulty(userQuery);

    // 优先选择相同难度的示例
    let candidates = this.getExamplesByDifficulty(predictedDifficulty);

    // 如果不够，添加相邻难度的示例
    if (candidates.length < topK) {
      if (predictedDifficulty === 'beginner') {
        candidates = [...candidates, ...this.getExamplesByDifficulty('intermediate')];
      } else if (predictedDifficulty === 'advanced') {
        candidates = [...candidates, ...this.getExamplesByDifficulty('intermediate')];
      } else {
        candidates = [
          ...candidates,
          ...this.getExamplesByDifficulty('beginner'),
          ...this.getExamplesByDifficulty('advanced')
        ];
      }
    }

    // 计算相似度并排序
    const scored = candidates.map(example => ({
      example,
      score: this.calculateSimilarity(userQuery, example.naturalQuery)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(item => item.example);
  }

  /**
   * 混合检索策略
   */
  private hybridRetrieval(
    userQuery: string,
    availableFields: string[],
    topK: number
  ): QueryExample[] {
    // 综合多种策略
    const keywordResults = this.keywordBasedRetrieval(userQuery, availableFields, topK * 2);
    const typeResults = this.typeBasedRetrieval(userQuery, topK * 2);
    const difficultyResults = this.difficultyBasedRetrieval(userQuery, topK * 2);

    // 合并结果并去重
    const allResults = new Map<string, { example: QueryExample; score: number }>();

    keywordResults.forEach(ex => {
      const score = this.calculateSimilarity(userQuery, ex.naturalQuery);
      allResults.set(ex.id, { example: ex, score: score * 1.0 });
    });

    typeResults.forEach(ex => {
      const score = this.calculateSimilarity(userQuery, ex.naturalQuery);
      const existing = allResults.get(ex.id);
      if (existing) {
        existing.score += score * 0.8;
      } else {
        allResults.set(ex.id, { example: ex, score: score * 0.8 });
      }
    });

    difficultyResults.forEach(ex => {
      const score = this.calculateSimilarity(userQuery, ex.naturalQuery);
      const existing = allResults.get(ex.id);
      if (existing) {
        existing.score += score * 0.6;
      } else {
        allResults.set(ex.id, { example: ex, score: score * 0.6 });
      }
    });

    // 排序并返回topK
    const sorted = Array.from(allResults.values()).sort((a, b) => b.score - a.score);
    return sorted.slice(0, topK).map(item => item.example);
  }

  /**
   * 自适应检索策略
   */
  private adaptiveRetrieval(
    userQuery: string,
    availableFields: string[],
    topK: number
  ): QueryExample[] {
    // 分析查询特征
    const queryComplexity = this.analyzeQueryComplexity(userQuery);
    const hasFields = availableFields.length > 0;

    // 根据特征选择策略
    if (queryComplexity === 'simple' && hasFields) {
      return this.keywordBasedRetrieval(userQuery, availableFields, topK);
    } else if (queryComplexity === 'complex') {
      return this.typeBasedRetrieval(userQuery, topK);
    } else {
      return this.hybridRetrieval(userQuery, availableFields, topK);
    }
  }

  // ========================================================================
  // 私有方法 - 辅助函数
  // ========================================================================

  /**
   * 分词
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * 计算词频
   */
  private computeTF(tokens: string[], vocab: Set<string>): Map<string, number> {
    const tf = new Map<string, number>();
    vocab.forEach(word => tf.set(word, 0));
    tokens.forEach(token => {
      const count = tf.get(token) || 0;
      tf.set(token, count + 1);
    });
    return tf;
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    const tokens = this.tokenize(text);
    // 移除停用词
    const stopWords = new Set([
      '的',
      '了',
      '是',
      '在',
      '有',
      '和',
      '与',
      '或',
      '就',
      '都',
      '而',
      '及',
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'and'
    ]);

    return tokens.filter(token => !stopWords.has(token) && token.length > 1);
  }

  /**
   * 预测查询类型
   */
  private predictQueryType(query: string): QueryType {
    const lowerQuery = query.toLowerCase();

    // 复杂查询判断
    if (lowerQuery.includes('子查询') || lowerQuery.includes('窗口') || lowerQuery.includes('row_number')) {
      return 'complex';
    }

    // JOIN查询判断
    if (
      lowerQuery.includes('join') ||
      lowerQuery.includes('连接') ||
      lowerQuery.includes('关联') ||
      lowerQuery.includes('跨表')
    ) {
      return 'join';
    }

    // 聚合查询判断
    if (
      lowerQuery.includes('总计') ||
      lowerQuery.includes('平均') ||
      lowerQuery.includes('count') ||
      lowerQuery.includes('sum') ||
      lowerQuery.includes('avg') ||
      lowerQuery.includes('max') ||
      lowerQuery.includes('min') ||
      lowerQuery.includes('分组') ||
      lowerQuery.includes('group by')
    ) {
      return 'aggregate';
    }

    // 默认为简单查询
    return 'simple';
  }

  /**
   * 预测查询难度
   */
  private predictDifficulty(query: string): DifficultyLevel {
    const queryType = this.predictQueryType(query);
    const lowerQuery = query.toLowerCase();

    // 高级难度判断
    if (
      queryType === 'complex' ||
      lowerQuery.includes('子查询') ||
      lowerQuery.includes('窗口函数') ||
      lowerQuery.includes('case when')
    ) {
      return 'advanced';
    }

    // 中级难度判断
    if (
      queryType === 'join' ||
      queryType === 'aggregate' ||
      lowerQuery.includes('having') ||
      lowerQuery.includes('order by') ||
      lowerQuery.includes('多个')
    ) {
      return 'intermediate';
    }

    // 初级难度
    return 'beginner';
  }

  /**
   * 分析查询复杂度
   */
  private analyzeQueryComplexity(query: string): 'simple' | 'medium' | 'complex' {
    const lowerQuery = query.toLowerCase();
    let complexityScore = 0;

    // 检查各种复杂度指标
    if (lowerQuery.includes('join') || lowerQuery.includes('连接')) complexityScore += 2;
    if (lowerQuery.includes('group by') || lowerQuery.includes('分组')) complexityScore += 2;
    if (lowerQuery.includes('子查询')) complexityScore += 3;
    if (lowerQuery.includes('窗口') || lowerQuery.includes('row_number')) complexityScore += 3;
    if (lowerQuery.includes('case when')) complexityScore += 2;
    if (lowerQuery.includes('having')) complexityScore += 2;

    if (complexityScore >= 5) return 'complex';
    if (complexityScore >= 2) return 'medium';
    return 'simple';
  }

  /**
   * 格式化示例
   */
  private formatExample(example: QueryExample, index: number, config: FewShotPromptConfig): string {
    const lines: string[] = [];

    lines.push(`示例 ${index}:`);
    lines.push(`自然语言：${example.naturalQuery}`);
    if (config.includeExplanation && example.intent) {
      lines.push(`意图：${example.intent}`);
    }
    if (config.includeSQL) {
      lines.push(`SQL：${example.sqlQuery}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * 格式化CoT示例
   */
  private formatCoTExample(example: QueryExample, index: number, config: FewShotPromptConfig): string {
    const lines: string[] = [];

    lines.push(`示例 ${index}:`);
    lines.push(`自然语言：${example.naturalQuery}`);

    if (example.reasoningSteps && example.reasoningSteps.length > 0 && config.includeReasoning) {
      lines.push(`推理过程：`);
      example.reasoningSteps.forEach((step, i) => {
        lines.push(`  ${i + 1}. ${step}`);
      });
    }

    if (config.includeSQL) {
      lines.push(`SQL：${example.sqlQuery}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * 获取默认系统消息
   */
  private getDefaultSystemMessage(): string {
    return `你是一个专业的SQL查询生成助手。你的任务是将自然语言查询转换为准确的SQL查询。

请根据提供的示例，理解用户的查询意图，并生成相应的SQL语句。

注意：
1. 确保SQL语法正确
2. 使用提供的字段名称
3. 注意查询的性能和可读性`;
  }

  /**
   * 获取CoT系统消息
   */
  private getCoTSystemMessage(): string {
    return `你是一个专业的SQL查询生成助手。请使用思维链（Chain-of-Thought）方法来分析和生成SQL查询。

对于每个查询，请按以下步骤思考：
1. 理解查询意图：用户想要什么数据？
2. 识别涉及的字段：需要哪些列？
3. 确定查询类型：简单查询、聚合、连接还是子查询？
4. 设计查询结构：如何组织SQL语句？
5. 编写SQL代码：具体的SQL实现

请输出完整的推理过程和最终的SQL查询。`;
  }

  /**
   * 更新示例权重
   */
  private updateExampleWeight(exampleId: string, avgScore: number): void {
    const example = this.examples.get(exampleId);
    if (example) {
      // 根据反馈分数调整示例的优先级
      // 可以在这里实现更复杂的权重调整逻辑
      console.log(`Updated example ${exampleId} with avg score: ${avgScore}`);
    }
  }

  /**
   * 生成示例ID
   */
  private generateExampleId(): string {
    return `example_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 构建缓存键
   */
  private buildCacheKey(
    query: string,
    fields: string[],
    topK: number,
    strategy: RetrievalStrategy
  ): string {
    return `${query}_${fields.join(',')}_${topK}_${strategy}`;
  }

  /**
   * 使缓存失效
   */
  private invalidateCache(): void {
    this.cache.clear();
  }

  /**
   * 合并配置
   */
  private mergeConfig(config?: Partial<FewShotEngineConfig>): FewShotEngineConfig {
    const defaultConfig: FewShotEngineConfig = {
      similarity: {
        defaultMethod: SimilarityMethod.HYBRID,
        threshold: 0.5,
        weights: {
          cosine: 0.3,
          jaccard: 0.2,
          levenshtein: 0.2,
          semantic: 0.3
        }
      },
      retrieval: {
        defaultStrategy: RetrievalStrategy.HYBRID,
        defaultTopK: 5,
        maxCandidates: 100,
        enableCache: true
      },
      prompting: {
        defaultTemplate: PromptTemplate.FEW_SHOT,
        maxExamples: SAMPLING_CONFIG.FEW_SHOT_EXAMPLES.MAX_EXAMPLES,
        minExamples: SAMPLING_CONFIG.FEW_SHOT_EXAMPLES.MIN_EXAMPLES
      },
      learning: {
        enableFeedback: true,
        autoUpdateExamples: false,
        feedbackThreshold: 5
      }
    };

    return {
      similarity: { ...defaultConfig.similarity, ...config?.similarity },
      retrieval: { ...defaultConfig.retrieval, ...config?.retrieval },
      prompting: { ...defaultConfig.prompting, ...config?.prompting },
      learning: { ...defaultConfig.learning, ...config?.learning }
    };
  }

  /**
   * 合并提示配置
   */
  private mergePromptConfig(config?: Partial<FewShotPromptConfig>): FewShotPromptConfig {
    const defaultConfig: FewShotPromptConfig = {
      templateType: PromptTemplate.FEW_SHOT,
      maxExamples: SAMPLING_CONFIG.FEW_SHOT_EXAMPLES.MAX_EXAMPLES,
      includeReasoning: false,
      includeSQL: true,
      includeExplanation: true
    };

    return { ...defaultConfig, ...config };
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * 导出示例库
   */
  exportExamples(): QueryExample[] {
    return this.getAllExamples();
  }

  /**
   * 导入示例库
   */
  importExamples(examples: QueryExample[]): void {
    this.clearExamples();
    this.addExamples(examples);
  }

  /**
   * 验证示例质量
   */
  validateExample(example: QueryExample): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!example.naturalQuery || example.naturalQuery.trim().length === 0) {
      errors.push('缺少自然语言查询');
    }

    if (!example.sqlQuery || example.sqlQuery.trim().length === 0) {
      errors.push('缺少SQL查询');
    }

    if (!example.queryType) {
      errors.push('缺少查询类型');
    }

    if (!example.difficulty) {
      errors.push('缺少难度级别');
    }

    if (!example.tags || example.tags.length === 0) {
      errors.push('缺少标签');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 批量验证示例
   */
  validateAllExamples(): Map<string, { valid: boolean; errors: string[] }> {
    const results = new Map<string, { valid: boolean; errors: string[] }>();

    this.getAllExamples().forEach(example => {
      results.set(example.id, this.validateExample(example));
    });

    return results;
  }

  /**
   * 查找相似示例
   */
  findSimilarExamples(query: string, threshold: number = 0.7, limit: number = 10): QueryExample[] {
    const results = this.getAllExamples()
      .map(example => ({
        example,
        similarity: this.calculateSimilarity(query, example.naturalQuery)
      }))
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.example);

    return results;
  }

  /**
   * 获取示例的统计信息
   */
  getExampleStats(exampleId: string): {
    example: QueryExample | undefined;
    feedbackHistory: number[];
    avgFeedback: number;
  } | null {
    const example = this.examples.get(exampleId);
    if (!example) return null;

    const history = this.feedbackHistory.get(exampleId) || [];
    const avgFeedback = history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 0;

    return {
      example,
      feedbackHistory: history,
      avgFeedback
    };
  }

  /**
   * 根据用户反馈更新示例库
   */
  updateExamplesFromFeedback(feedbackData: Array<{ exampleId: string; score: number }>): void {
    feedbackData.forEach(({ exampleId, score }) => {
      this.recordFeedback(exampleId, score);
    });
  }

  /**
   * 生成示例报告
   */
  generateReport(): string {
    const stats = this.getStatistics();
    const lines: string[] = [];

    lines.push('=== Few-Shot引擎统计报告 ===\n');
    lines.push(`总示例数：${stats.totalExamples}`);
    lines.push('\n按类型分布：');
    Object.entries(stats.examplesByType).forEach(([type, count]) => {
      lines.push(`  - ${type}: ${count}`);
    });
    lines.push('\n按难度分布：');
    Object.entries(stats.examplesByDifficulty).forEach(([difficulty, count]) => {
      lines.push(`  - ${difficulty}: ${count}`);
    });
    lines.push('\n按来源分布：');
    Object.entries(stats.examplesBySource).forEach(([source, count]) => {
      lines.push(`  - ${source}: ${count}`);
    });
    lines.push(`\n平均反馈分数：${stats.averageFeedbackScore.toFixed(2)}`);
    lines.push(`\n缓存大小：${this.getCacheSize()}`);

    return lines.join('\n');
  }

  /**
   * 自动优化示例库
   */
  async optimizeExamples(): Promise<{
    removed: number;
    updated: number;
    added: number;
  }> {
    let removed = 0;
    let updated = 0;
    let added = 0;

    // 移除低质量示例
    const validationResults = this.validateAllExamples();
    validationResults.forEach((result, id) => {
      if (!result.valid) {
        this.removeExample(id);
        removed++;
      }
    });

    // 更新低反馈示例
    this.feedbackHistory.forEach((scores, id) => {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgScore < 0.3) {
        this.removeExample(id);
        removed++;
      }
    });

    return { removed, updated, added };
  }

  /**
   * 智能选择示例（考虑多样性）
   */
  selectDiverseExamples(
    userQuery: string,
    availableFields: string[],
    topK: number = 5
  ): QueryExample[] {
    // 首先获取相似度最高的topK * 2示例
    const candidates = this.findRelevantExamples(userQuery, availableFields, topK * 2);

    if (candidates.length <= topK) {
      return candidates;
    }

    // 使用最大多样性算法选择
    const selected: QueryExample[] = [];
    const remaining = [...candidates];

    // 选择最相似的第一个
    selected.push(remaining.shift()!);

    // 迭代选择与已选示例差异最大的
    while (selected.length < topK && remaining.length > 0) {
      let maxDiversity = -1;
      let bestIndex = 0;

      remaining.forEach((candidate, idx) => {
        // 计算与所有已选示例的最小相似度
        const minSim = Math.min(
          ...selected.map(selected =>
            this.calculateSimilarity(candidate.naturalQuery, selected.naturalQuery)
          )
        );

        if (minSim > maxDiversity) {
          maxDiversity = minSim;
          bestIndex = idx;
        }
      });

      selected.push(remaining.splice(bestIndex, 1)[0]);
    }

    return selected;
  }

  /**
   * 获取推荐的示例（基于查询分析）
   */
  getRecommendedExamples(
    userQuery: string,
    availableFields: string[] = [],
    topK: number = 5
  ): {
    examples: QueryExample[];
    recommendations: string[];
    confidence: number;
  } {
    const queryType = this.predictQueryType(userQuery);
    const difficulty = this.predictDifficulty(userQuery);

    const examples = this.findRelevantExamples(userQuery, availableFields, topK);
    const recommendations: string[] = [];

    // 生成推荐说明
    recommendations.push(`查询类型：${queryType}`);
    recommendations.push(`难度级别：${difficulty}`);

    if (examples.length > 0) {
      recommendations.push(`找到${examples.length}个相关示例`);
    } else {
      recommendations.push('未找到相关示例，建议添加更多示例');
    }

    // 计算置信度
    const confidence = examples.length > 0 ? 0.8 : 0.3;

    return {
      examples,
      recommendations,
      confidence
    };
  }

  /**
   * 批量处理查询
   */
  async batchProcessQueries(
    queries: string[],
    availableFields: string[] = [],
    topK: number = 5
  ): Promise<Map<string, QueryExample[]>> {
    const results = new Map<string, QueryExample[]>();

    for (const query of queries) {
      const examples = this.findRelevantExamples(query, availableFields, topK);
      results.set(query, examples);
    }

    return results;
  }

  /**
   * 流式处理查询（支持大量查询）
   */
  async *streamProcessQueries(
    queries: string[],
    availableFields: string[] = [],
    topK: number = 5,
    batchSize: number = 10
  ): AsyncIterableIterator<{ query: string; examples: QueryExample[] }> {
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      for (const query of batch) {
        const examples = this.findRelevantExamples(query, availableFields, topK);
        yield { query, examples };
      }
    }
  }

  /**
   * 评估示例库质量
   */
  evaluateExampleQuality(): {
    overall: number;
    byType: Record<QueryType, number>;
    byDifficulty: Record<DifficultyLevel, number>;
    issues: string[];
  } {
    const examples = this.getAllExamples();
    const issues: string[] = [];

    // 评估覆盖率
    const byType: Record<QueryType, number> = {
      simple: 0,
      aggregate: 0,
      join: 0,
      complex: 0
    };

    const byDifficulty: Record<DifficultyLevel, number> = {
      beginner: 0,
      intermediate: 0,
      advanced: 0
    };

    examples.forEach(ex => {
      byType[ex.queryType]++;
      byDifficulty[ex.difficulty]++;
    });

    // 检查覆盖问题
    if (byType.simple < 10) issues.push('简单查询示例不足（建议至少10个）');
    if (byType.aggregate < 10) issues.push('聚合查询示例不足（建议至少10个）');
    if (byType.join < 10) issues.push('JOIN查询示例不足（建议至少10个）');
    if (byType.complex < 10) issues.push('复杂查询示例不足（建议至少10个）');

    // 计算总体质量分数
    const typeCoverage = Object.values(byType).filter(count => count >= 10).length / 4;
    const difficultyCoverage = Object.values(byDifficulty).filter(count => count >= 10).length / 3;
    const overall = (typeCoverage * 0.6 + difficultyCoverage * 0.4);

    return {
      overall,
      byType,
      byDifficulty,
      issues
    };
  }

  /**
   * 生成示例补全建议
   */
  generateCompletionSuggestions(): {
    neededExamples: Array<{ type: QueryType; difficulty: DifficultyLevel; count: number }>;
    totalNeeded: number;
  } {
    const stats = this.getStatistics();
    const neededExamples: Array<{ type: QueryType; difficulty: DifficultyLevel; count: number }> = [];

    const types: QueryType[] = ['simple', 'aggregate', 'join', 'complex'];
    const difficulties: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];

    types.forEach(type => {
      difficulties.forEach(difficulty => {
        const count = this.getAllExamples().filter(
          ex => ex.queryType === type && ex.difficulty === difficulty
        ).length;

        if (count < 5) {
          neededExamples.push({
            type,
            difficulty,
            count: 5 - count
          });
        }
      });
    });

    return {
      neededExamples,
      totalNeeded: neededExamples.reduce((sum, item) => sum + item.count, 0)
    };
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 创建默认的Few-Shot引擎实例
 */
export function createFewShotEngine(config?: Partial<FewShotEngineConfig>): FewShotEngine {
  return new FewShotEngine(config);
}

/**
 * 从JSON加载示例库
 */
export function loadExamplesFromJSON(jsonData: any[]): QueryExample[] {
  return jsonData.map(item => ({
    id: item.id,
    naturalQuery: item.naturalQuery,
    sqlQuery: item.sqlQuery,
    queryType: item.queryType,
    intent: item.intent,
    fields: item.fields || [],
    conditions: item.conditions,
    reasoningSteps: item.reasoningSteps,
    difficulty: item.difficulty,
    tags: item.tags || [],
    source: item.source || 'manual'
  }));
}

/**
 * 导出示例库为JSON
 */
export function exportExamplesToJSON(examples: QueryExample[]): any[] {
  return examples.map(ex => ({
    id: ex.id,
    naturalQuery: ex.naturalQuery,
    sqlQuery: ex.sqlQuery,
    queryType: ex.queryType,
    intent: ex.intent,
    fields: ex.fields,
    conditions: ex.conditions,
    reasoningSteps: ex.reasoningSteps,
    difficulty: ex.difficulty,
    tags: ex.tags,
    source: ex.source
  }));
}
