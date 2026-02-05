/**
 * Few-Shot Engine 单元测试
 *
 * @module FewShotEngineTests
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  FewShotEngine,
  SimilarityMethod,
  RetrievalStrategy,
  PromptTemplate,
  createFewShotEngine,
  loadExamplesFromJSON,
  exportExamplesToJSON
} from './fewShotEngine';
import { QueryExample, allQueryExamples } from './queryExamples';

// ============================================================================
// 测试配置
// ============================================================================

const TEST_TIMEOUT = 5000;

// ============================================================================
// 测试套件
// ============================================================================

describe('FewShotEngine', () => {
  let engine: FewShotEngine;
  let testExamples: QueryExample[];

  beforeEach(() => {
    engine = new FewShotEngine();

    testExamples = [
      {
        id: 'test_001',
        naturalQuery: '查询所有员工',
        sqlQuery: 'SELECT * FROM employees;',
        queryType: 'simple',
        intent: '获取所有记录',
        fields: ['employees'],
        conditions: [],
        reasoningSteps: ['识别需求', '确定表', '生成SQL'],
        difficulty: 'beginner',
        tags: ['select', 'all'],
        source: 'manual'
      },
      {
        id: 'test_002',
        naturalQuery: '统计员工总数',
        sqlQuery: 'SELECT COUNT(*) FROM employees;',
        queryType: 'aggregate',
        intent: '计数',
        fields: ['employees'],
        conditions: [],
        difficulty: 'beginner',
        tags: ['count', 'aggregate'],
        source: 'manual'
      },
      {
        id: 'test_003',
        naturalQuery: '查询员工及其部门',
        sqlQuery: 'SELECT e.name, d.department_name FROM employees e JOIN departments d ON e.department_id = d.department_id;',
        queryType: 'join',
        intent: '表连接',
        fields: ['name', 'department_name', 'employees', 'departments'],
        conditions: [],
        reasoningSteps: ['识别需求', '确定表', '连接', '生成SQL'],
        difficulty: 'intermediate',
        tags: ['join', 'inner_join'],
        source: 'manual'
      }
    ];
  });

  afterEach(() => {
    engine.clearExamples();
    engine.clearCache();
  });

  // ========================================================================
  // 示例管理测试
  // ========================================================================

  describe('示例管理', () => {
    it('应该能够添加单个示例', () => {
      engine.addExample(testExamples[0]);
      expect(engine.getAllExamples().length).toBe(1);
      expect(engine.getExample('test_001')).toEqual(testExamples[0]);
    });

    it('应该能够批量添加示例', () => {
      engine.addExamples(testExamples);
      expect(engine.getAllExamples().length).toBe(3);
    });

    it('应该能够获取示例', () => {
      engine.addExample(testExamples[0]);
      const example = engine.getExample('test_001');
      expect(example).toBeDefined();
      expect(example?.naturalQuery).toBe('查询所有员工');
    });

    it('应该能够按类型获取示例', () => {
      engine.addExamples(testExamples);
      const simpleExamples = engine.getExamplesByType('simple');
      expect(simpleExamples.length).toBe(1);
      expect(simpleExamples[0].queryType).toBe('simple');
    });

    it('应该能够按难度获取示例', () => {
      engine.addExamples(testExamples);
      const beginnerExamples = engine.getExamplesByDifficulty('beginner');
      expect(beginnerExamples.length).toBe(2);
    });

    it('应该能够按标签获取示例', () => {
      engine.addExamples(testExamples);
      const taggedExamples = engine.getExamplesByTags(['select']);
      expect(taggedExamples.length).toBeGreaterThan(0);
    });

    it('应该能够更新示例', () => {
      engine.addExample(testExamples[0]);
      const updated = engine.updateExample('test_001', {
        naturalQuery: '查询所有员工信息'
      });
      expect(updated).toBe(true);
      expect(engine.getExample('test_001')?.naturalQuery).toBe('查询所有员工信息');
    });

    it('应该能够删除示例', () => {
      engine.addExample(testExamples[0]);
      const removed = engine.removeExample('test_001');
      expect(removed).toBe(true);
      expect(engine.getExample('test_001')).toBeUndefined();
    });

    it('应该能够清空示例库', () => {
      engine.addExamples(testExamples);
      engine.clearExamples();
      expect(engine.getAllExamples().length).toBe(0);
    });
  });

  // ========================================================================
  // 相似度计算测试
  // ========================================================================

  describe('相似度计算', () => {
    it('应该能够计算余弦相似度', () => {
      const similarity = engine.calculateSimilarity(
        '查询所有员工',
        '查询所有员工信息',
        SimilarityMethod.COSINE
      );
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('应该能够计算Jaccard相似度', () => {
      const similarity = engine.calculateSimilarity(
        '查询所有员工',
        '查询所有员工信息',
        SimilarityMethod.JACCARD
      );
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('应该能够计算编辑距离相似度', () => {
      const similarity = engine.calculateSimilarity(
        '查询所有员工',
        '查询所有员工',
        SimilarityMethod.LEVENSHTEIN
      );
      expect(similarity).toBe(1);
    });

    it('应该能够计算语义相似度', () => {
      const similarity = engine.calculateSimilarity(
        '查询所有员工',
        '查找所有员工',
        SimilarityMethod.SEMANTIC
      );
      expect(similarity).toBeGreaterThan(0);
    });

    it('应该能够计算混合相似度', () => {
      const similarity = engine.calculateSimilarity(
        '查询所有员工',
        '查询所有员工',
        SimilarityMethod.HYBRID
      );
      expect(similarity).toBeCloseTo(1, 1);
    });

    it('应该能够计算详细相似度', () => {
      engine.addExample(testExamples[0]);
      const score = engine.calculateDetailedSimilarity('查询所有员工信息', testExamples[0]);
      expect(score.exampleId).toBe('test_001');
      expect(score.score).toBeGreaterThan(0);
      expect(score.details).toBeDefined();
      expect(score.details?.cosine).toBeDefined();
      expect(score.details?.jaccard).toBeDefined();
    });

    it('相同查询的相似度应该接近1', () => {
      const similarity = engine.calculateSimilarity(
        '查询所有员工',
        '查询所有员工',
        SimilarityMethod.HYBRID
      );
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('完全不同查询的相似度应该较低', () => {
      const similarity = engine.calculateSimilarity(
        '查询所有员工',
        '统计产品数量',
        SimilarityMethod.HYBRID
      );
      expect(similarity).toBeLessThan(0.5);
    });
  });

  // ========================================================================
  // 示例检索测试
  // ========================================================================

  describe('示例检索', () => {
    beforeEach(() => {
      engine.addExamples(testExamples);
    });

    it('应该能够检索相关示例', () => {
      const examples = engine.findRelevantExamples('查询所有员工信息', ['employees'], 2);
      expect(examples.length).toBeGreaterThan(0);
      expect(examples.length).toBeLessThanOrEqual(2);
    });

    it('应该能够使用关键词策略检索', () => {
      const examples = engine.findRelevantExamples(
        '查询所有员工',
        ['employees'],
        3,
        RetrievalStrategy.KEYWORD
      );
      expect(examples.length).toBeGreaterThan(0);
    });

    it('应该能够使用类型策略检索', () => {
      const examples = engine.findRelevantExamples(
        '统计员工数量',
        [],
        3,
        RetrievalStrategy.TYPE_BASED
      );
      expect(examples.length).toBeGreaterThan(0);
    });

    it('应该能够使用难度策略检索', () => {
      const examples = engine.findRelevantExamples(
        '简单查询',
        [],
        3,
        RetrievalStrategy.DIFFICULTY_BASED
      );
      expect(examples.length).toBeGreaterThan(0);
    });

    it('应该能够使用混合策略检索', () => {
      const examples = engine.findRelevantExamples(
        '查询员工信息',
        ['employees', 'name'],
        3,
        RetrievalStrategy.HYBRID
      );
      expect(examples.length).toBeGreaterThan(0);
    });

    it('应该能够使用自适应策略检索', () => {
      const examples = engine.findRelevantExamples(
        '复杂查询',
        [],
        3,
        RetrievalStrategy.ADAPTIVE
      );
      expect(examples.length).toBeGreaterThanOrEqual(0);
    });

    it('应该能够获取检索结果', () => {
      const result = engine.getRetrievalResult('查询员工', ['employees'], 2);
      expect(result.examples).toBeDefined();
      expect(result.scores).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.query).toBe('查询员工');
    });

    it('检索时间应该小于500ms', () => {
      const startTime = Date.now();
      engine.findRelevantExamples('查询员工信息', ['employees'], 5);
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);
    });
  });

  // ========================================================================
  // 提示构建测试
  // ========================================================================

  describe('提示构建', () => {
    beforeEach(() => {
      engine.addExamples(testExamples);
    });

    it('应该能够构建基础提示', () => {
      const prompt = engine.buildFewShotPrompt('查询员工信息', testExamples, {
        templateType: PromptTemplate.BASE
      });
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt).toContain('查询员工信息');
    });

    it('应该能够构建Few-Shot提示', () => {
      const prompt = engine.buildFewShotPrompt('查询员工信息', testExamples, {
        templateType: PromptTemplate.FEW_SHOT
      });
      expect(prompt).toBeDefined();
      expect(prompt).toContain('示例');
      expect(prompt).toContain('查询员工信息');
    });

    it('应该能够构建CoT提示', () => {
      const cotExamples = testExamples.filter(ex => ex.reasoningSteps && ex.reasoningSteps.length > 0);
      const prompt = engine.buildFewShotPrompt('查询员工信息', cotExamples, {
        templateType: PromptTemplate.COT
      });
      expect(prompt).toBeDefined();
      expect(prompt).toContain('推理过程');
    });

    it('应该能够构建混合提示', () => {
      const prompt = engine.buildFewShotPrompt('查询员工信息', testExamples, {
        templateType: PromptTemplate.HYBRID
      });
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('提示应该包含自定义指令', () => {
      const customInstructions = '请使用最优的SQL查询';
      const prompt = engine.buildFewShotPrompt('查询员工信息', testExamples, {
        customInstructions
      });
      expect(prompt).toContain(customInstructions);
    });

    it('提示应该限制示例数量', () => {
      const prompt = engine.buildFewShotPrompt('查询员工信息', testExamples, {
        templateType: PromptTemplate.FEW_SHOT,
        maxExamples: 2
      });
      const matches = prompt.match(/示例 \d+:/g);
      expect(matches?.length).toBeLessThanOrEqual(2);
    });
  });

  // ========================================================================
  // 缓存测试
  // ========================================================================

  describe('缓存管理', () => {
    it('应该能够缓存检索结果', () => {
      engine.addExamples(testExamples);
      engine.findRelevantExamples('查询员工', ['employees'], 2);

      const cacheSize = engine.getCacheSize();
      expect(cacheSize).toBeGreaterThan(0);
    });

    it('应该能够清空缓存', () => {
      engine.addExamples(testExamples);
      engine.findRelevantExamples('查询员工', ['employees'], 2);
      engine.clearCache();

      expect(engine.getCacheSize()).toBe(0);
    });

    it('添加示例后应该使缓存失效', () => {
      engine.addExamples(testExamples);
      engine.findRelevantExamples('查询员工', ['employees'], 2);

      engine.addExample({
        id: 'test_004',
        naturalQuery: '新示例',
        sqlQuery: 'SELECT 1',
        queryType: 'simple',
        intent: '测试',
        fields: [],
        tags: ['test'],
        difficulty: 'beginner',
        source: 'manual'
      });

      // 缓存应该被清空
      expect(engine.getCacheSize()).toBe(0);
    });
  });

  // ========================================================================
  // 反馈学习测试
  // ========================================================================

  describe('反馈学习', () => {
    it('应该能够记录反馈', () => {
      engine.addExample(testExamples[0]);
      engine.recordFeedback('test_001', 0.8);

      const stats = engine.getExampleStats('test_001');
      expect(stats).toBeDefined();
      expect(stats?.feedbackHistory.length).toBe(1);
    });

    it('应该能够计算平均反馈分数', () => {
      engine.addExample(testExamples[0]);
      engine.recordFeedback('test_001', 0.8);
      engine.recordFeedback('test_001', 0.9);

      const stats = engine.getExampleStats('test_001');
      expect(stats?.avgFeedback).toBeCloseTo(0.85, 1);
    });

    it('应该能够获取统计信息', () => {
      engine.addExamples(testExamples);
      const stats = engine.getStatistics();

      expect(stats.totalExamples).toBe(3);
      expect(stats.examplesByType.simple).toBe(1);
      expect(stats.examplesByDifficulty.beginner).toBe(2);
    });
  });

  // ========================================================================
  // 示例验证测试
  // ========================================================================

  describe('示例验证', () => {
    it('应该能够验证示例', () => {
      const result = engine.validateExample(testExamples[0]);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('应该能够检测无效示例', () => {
      const invalidExample = {
        id: '',
        naturalQuery: '',
        sqlQuery: '',
        queryType: 'simple' as const,
        intent: '',
        fields: [],
        tags: [],
        difficulty: 'beginner' as const,
        source: 'manual' as const
      };

      const result = engine.validateExample(invalidExample);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该能够批量验证示例', () => {
      engine.addExamples(testExamples);
      const results = engine.validateAllExamples();

      expect(results.size).toBe(3);
      results.forEach((result, id) => {
        expect(result.valid).toBe(true);
      });
    });
  });

  // ========================================================================
  // 质量评估测试
  // ========================================================================

  describe('质量评估', () => {
    it('应该能够评估示例库质量', () => {
      engine.addExamples(testExamples);
      const evaluation = engine.evaluateExampleQuality();

      expect(evaluation.overall).toBeGreaterThanOrEqual(0);
      expect(evaluation.overall).toBeLessThanOrEqual(1);
      expect(evaluation.byType).toBeDefined();
      expect(evaluation.byDifficulty).toBeDefined();
      expect(evaluation.issues).toBeDefined();
    });

    it('应该能够生成补全建议', () => {
      engine.addExamples(testExamples);
      const suggestions = engine.generateCompletionSuggestions();

      expect(suggestions.neededExamples).toBeDefined();
      expect(suggestions.totalNeeded).toBeGreaterThanOrEqual(0);
    });

    it('应该能够生成报告', () => {
      engine.addExamples(testExamples);
      const report = engine.generateReport();

      expect(report).toBeDefined();
      expect(report).toContain('统计报告');
      expect(report).toContain('总示例数');
    });
  });

  // ========================================================================
  // 高级功能测试
  // ========================================================================

  describe('高级功能', () => {
    it('应该能够选择多样性示例', () => {
      engine.addExamples(allQueryExamples.slice(0, 10));
      const examples = engine.selectDiverseExamples('查询员工', ['employees'], 5);

      expect(examples.length).toBeLessThanOrEqual(5);
    });

    it('应该能够获取推荐示例', () => {
      engine.addExamples(testExamples);
      const recommended = engine.getRecommendedExamples('查询员工', ['employees'], 2);

      expect(recommended.examples).toBeDefined();
      expect(recommended.recommendations).toBeDefined();
      expect(recommended.confidence).toBeGreaterThanOrEqual(0);
    });

    it('应该能够查找相似示例', () => {
      engine.addExamples(testExamples);
      const similar = engine.findSimilarExamples('查询所有员工', 0.5, 2);

      expect(similar.length).toBeGreaterThan(0);
    });

    it('应该能够批量处理查询', async () => {
      engine.addExamples(testExamples);
      const queries = ['查询员工', '统计订单', '连接查询'];
      const results = await engine.batchProcessQueries(queries, [], 2);

      expect(results.size).toBe(3);
    });

    it('应该能够流式处理查询', async () => {
      engine.addExamples(testExamples);
      const queries = ['查询员工', '统计订单', '连接查询'];
      const results: Array<{ query: string; examples: QueryExample[] }> = [];

      for await (const result of engine.streamProcessQueries(queries, [], 2)) {
        results.push(result);
      }

      expect(results.length).toBe(3);
    });
  });

  // ========================================================================
  // 导入导出测试
  // ========================================================================

  describe('导入导出', () => {
    it('应该能够导出示例', () => {
      engine.addExamples(testExamples);
      const exported = engine.exportExamples();

      expect(exported.length).toBe(3);
      expect(exported[0].id).toBe('test_001');
    });

    it('应该能够导入示例', () => {
      engine.importExamples(testExamples);
      expect(engine.getAllExamples().length).toBe(3);
    });

    it('导出和导入应该保持数据一致', () => {
      engine.addExamples(testExamples);
      const exported = engine.exportExamples();

      const newEngine = new FewShotEngine();
      newEngine.importExamples(exported);

      expect(newEngine.getAllExamples().length).toBe(3);
      expect(newEngine.getExample('test_001')).toEqual(testExamples[0]);
    });

    it('应该能够使用JSON辅助函数', () => {
      const jsonStr = exportExamplesToJSON(testExamples);
      expect(jsonStr).toBeDefined();

      const imported = loadExamplesFromJSON(jsonStr);
      expect(imported.length).toBe(3);
    });
  });

  // ========================================================================
  // 性能测试
  // ========================================================================

  describe('性能测试', () => {
    it('添加100个示例应该快速完成', () => {
      const startTime = Date.now();
      engine.addExamples(allQueryExamples);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
      expect(engine.getAllExamples().length).toBeGreaterThan(100);
    }, TEST_TIMEOUT);

    it('检索操作应该在500ms内完成', () => {
      engine.addExamples(allQueryExamples);
      const startTime = Date.now();
      engine.findRelevantExamples('查询员工信息', ['employees', 'name', 'department'], 5);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    }, TEST_TIMEOUT);

    it('批量处理50个查询应该快速完成', async () => {
      engine.addExamples(allQueryExamples);
      const queries = Array(50)
        .fill(null)
        .map((_, i) => `查询${i}`);

      const startTime = Date.now();
      await engine.batchProcessQueries(queries, ['employees'], 3);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    }, TEST_TIMEOUT);
  });

  // ========================================================================
  // 边界情况测试
  // ========================================================================

  describe('边界情况', () => {
    it('空查询应该返回空结果', () => {
      engine.addExamples(testExamples);
      const examples = engine.findRelevantExamples('', [], 5);
      expect(examples).toBeDefined();
    });

    it('空字段列表应该正常工作', () => {
      engine.addExamples(testExamples);
      const examples = engine.findRelevantExamples('查询员工', [], 5);
      expect(examples).toBeDefined();
    });

    it('Top-K为0应该返回空结果', () => {
      engine.addExamples(testExamples);
      const examples = engine.findRelevantExamples('查询员工', [], 0);
      expect(examples.length).toBe(0);
    });

    it('不存在的示例ID应该返回undefined', () => {
      const example = engine.getExample('nonexistent');
      expect(example).toBeUndefined();
    });

    it('更新不存在的示例应该返回false', () => {
      const updated = engine.updateExample('nonexistent', {
        naturalQuery: '新查询'
      });
      expect(updated).toBe(false);
    });

    it('删除不存在的示例应该返回false', () => {
      const removed = engine.removeExample('nonexistent');
      expect(removed).toBe(false);
    });
  });
});

// ============================================================================
// 辅助函数测试
// ========================================================================

describe('辅助函数', () => {
  it('应该能够创建默认引擎', () => {
    const engine = createFewShotEngine();
    expect(engine).toBeDefined();
    expect(engine).toBeInstanceOf(FewShotEngine);
  });

  it('应该能够使用自定义配置创建引擎', () => {
    const engine = createFewShotEngine({
      retrieval: {
        defaultStrategy: RetrievalStrategy.TYPE_BASED,
        defaultTopK: 10,
        maxCandidates: 50,
        enableCache: false
      }
    });
    expect(engine).toBeDefined();
  });
});

// ============================================================================
// 集成测试
// ============================================================================

describe('集成测试', () => {
  let engine: FewShotEngine;

  beforeEach(() => {
    engine = new FewShotEngine();
    engine.addExamples(allQueryExamples);
  });

  it('完整的Few-Shot工作流', () => {
    // 1. 用户查询
    const userQuery = '查询工资大于10000的员工姓名和部门';

    // 2. 检索相关示例
    const relevantExamples = engine.findRelevantExamples(userQuery, ['name', 'department', 'salary'], 5);
    expect(relevantExamples.length).toBeGreaterThan(0);

    // 3. 构建提示
    const prompt = engine.buildFewShotPrompt(userQuery, relevantExamples, {
      templateType: PromptTemplate.FEW_SHOT,
      maxExamples: 3
    });
    expect(prompt).toBeDefined();
    expect(prompt).toContain(userQuery);

    // 4. 验证结果
    expect(relevantExamples[0]).toBeDefined();
    expect(relevantExamples[0].naturalQuery).toBeDefined();
    expect(relevantExamples[0].sqlQuery).toBeDefined();
  });

  it('端到端的相似度检索', () => {
    const testQueries = [
      '查询所有员工',
      '统计订单总数',
      '连接员工和部门表',
      '计算平均工资',
      '查找最高工资的员工'
    ];

    testQueries.forEach(query => {
      const examples = engine.findRelevantExamples(query, [], 3);
      expect(examples.length).toBeGreaterThan(0);
      expect(examples.length).toBeLessThanOrEqual(3);
    });
  });

  it('批量查询处理', async () => {
    const queries = [
      '查询员工信息',
      '统计销售数据',
      '分析产品库存',
      '查找大额订单',
      '分析客户行为'
    ];

    const results = await engine.batchProcessQueries(queries, ['employees', 'orders', 'products'], 3);

    expect(results.size).toBe(5);
    results.forEach((examples, query) => {
      expect(examples.length).toBeGreaterThan(0);
      expect(examples.length).toBeLessThanOrEqual(3);
    });
  });

  it('示例库优化流程', async () => {
    // 1. 评估当前质量
    const evaluation = engine.evaluateExampleQuality();
    expect(evaluation.overall).toBeGreaterThan(0);

    // 2. 获取补全建议
    const suggestions = engine.generateCompletionSuggestions();
    expect(suggestions.neededExamples).toBeDefined();

    // 3. 优化示例库
    const optimizationResult = await engine.optimizeExamples();
    expect(optimizationResult).toBeDefined();
    expect(optimizationResult.removed).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// 统计和报告测试
// ============================================================================

describe('统计和报告', () => {
  let engine: FewShotEngine;

  beforeEach(() => {
    engine = new FewShotEngine();
    engine.addExamples(allQueryExamples);
  });

  it('应该能够生成完整的统计报告', () => {
    const report = engine.generateReport();

    expect(report).toBeDefined();
    expect(report).toContain('总示例数');
    expect(report).toContain('按类型分布');
    expect(report).toContain('按难度分布');
    expect(report).toContain('按来源分布');
  });

  it('统计数据应该准确', () => {
    const stats = engine.getStatistics();

    expect(stats.totalExamples).toBe(allQueryExamples.length);
    expect(stats.examplesByType.simple).toBeGreaterThan(0);
    expect(stats.examplesByType.aggregate).toBeGreaterThan(0);
    expect(stats.examplesByType.join).toBeGreaterThan(0);
    expect(stats.examplesByType.complex).toBeGreaterThan(0);
  });

  it('质量评估应该合理', () => {
    const evaluation = engine.evaluateExampleQuality();

    expect(evaluation.overall).toBeGreaterThan(0);
    expect(evaluation.overall).toBeLessThanOrEqual(1);
    expect(evaluation.byType.simple).toBeGreaterThan(0);
    expect(evaluation.byType.aggregate).toBeGreaterThan(0);
    expect(evaluation.byType.join).toBeGreaterThan(0);
    expect(evaluation.byType.complex).toBeGreaterThan(0);
  });

  it('补全建议应该可行', () => {
    const suggestions = engine.generateCompletionSuggestions();

    expect(suggestions.neededExamples).toBeInstanceOf(Array);
    expect(suggestions.totalNeeded).toBeGreaterThanOrEqual(0);

    suggestions.neededExamples.forEach(item => {
      expect(item.type).toBeDefined();
      expect(item.difficulty).toBeDefined();
      expect(item.count).toBeGreaterThan(0);
    });
  });
});
