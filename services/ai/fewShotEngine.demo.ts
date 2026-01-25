/**
 * Few-Shot Engine 使用示例
 *
 * 演示如何在实际项目中使用Few-Shot Learning引擎
 *
 * @module FewShotEngineDemo
 * @version 1.0.0
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  FewShotEngine,
  SimilarityMethod,
  RetrievalStrategy,
  PromptTemplate,
  createFewShotEngine,
  exportExamplesToJSON,
  loadExamplesFromJSON
} from './fewShotEngine';
import { allQueryExamples, QueryExample } from './queryExamples';

// ============================================================================
// AI客户端配置（智谱GLM-4.6）
// ============================================================================

const anthropic = new Anthropic({
  apiKey: 'ccd69d4c776d4e2696a6ef026159fb9c.YUPVkBmrRXu1xoZG',
  baseURL: 'https://open.bigmodel.cn/api/anthropic',
  dangerouslyAllowBrowser: true
});

// ============================================================================
// 示例1：基础使用
// ============================================================================

/**
 * 示例1：最简单的Few-Shot查询生成
 */
export async function basicExample() {
  console.log('\n=== 示例1：基础使用 ===\n');

  // 1. 创建引擎
  const engine = new FewShotEngine();

  // 2. 加载示例库
  engine.addExamples(allQueryExamples);

  // 3. 用户查询
  const userQuery = '查询所有员工的姓名和邮箱';

  // 4. 检索相关示例
  const relevantExamples = engine.findRelevantExamples(
    userQuery,
    ['姓名', '邮箱', '员工'],
    3
  );

  console.log(`找到 ${relevantExamples.length} 个相关示例:`);
  relevantExamples.forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.naturalQuery}`);
    console.log(`     SQL: ${ex.sqlQuery}`);
  });

  // 5. 构建提示
  const prompt = engine.buildFewShotPrompt(userQuery, relevantExamples);

  console.log('\n生成的提示:');
  console.log(prompt.substring(0, 200) + '...\n');

  // 6. 调用AI（实际项目中使用）
  // const response = await callAI(prompt);
  // console.log('生成的SQL:', response);
}

// ============================================================================
// 示例2：复杂查询生成
// ============================================================================

/**
 * 示例2：使用CoT提示生成复杂查询
 */
export async function complexQueryExample() {
  console.log('\n=== 示例2：复杂查询生成（CoT） ===\n');

  const engine = new FewShotEngine();
  engine.addExamples(allQueryExamples);

  // 复杂查询：需要GROUP BY和HAVING
  const userQuery = '查询每个部门员工数量大于10的部门名称和员工数量';

  // 检索相关示例
  const relevantExamples = engine.findRelevantExamples(
    userQuery,
    ['部门', '员工', '数量'],
    5,
    RetrievalStrategy.HYBRID
  );

  console.log(`找到 ${relevantExamples.length} 个相关示例`);

  // 使用CoT提示
  const cotPrompt = engine.buildFewShotPrompt(userQuery, relevantExamples, {
    templateType: PromptTemplate.COT,
    maxExamples: 3,
    includeReasoning: true,
    includeSQL: true
  });

  console.log('\nCoT提示:');
  console.log(cotPrompt.substring(0, 400) + '...\n');

  // 调用AI
  // const response = await callAI(cotPrompt);
  // console.log('生成的SQL:', response);
}

// ============================================================================
// 示例3：JOIN查询生成
// ============================================================================

/**
 * 示例3：生成多表连接查询
 */
export async function joinQueryExample() {
  console.log('\n=== 示例3：JOIN查询生成 ===\n');

  const engine = new FewShotEngine();
  engine.addExamples(allQueryExamples);

  // JOIN查询
  const userQuery = '查询员工姓名、部门名称和工资';

  // 使用类型检索策略
  const relevantExamples = engine.findRelevantExamples(
    userQuery,
    ['姓名', '部门名称', '工资'],
    3,
    RetrievalStrategy.TYPE_BASED
  );

  console.log(`找到 ${relevantExamples.length} 个JOIN相关示例`);
  relevantExamples.forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.naturalQuery} (类型: ${ex.queryType})`);
  });

  // 构建提示
  const prompt = engine.buildFewShotPrompt(userQuery, relevantExamples);

  console.log('\n生成的提示预览:');
  console.log(prompt.substring(0, 300) + '...\n');
}

// ============================================================================
// 示例4：批量查询处理
// ============================================================================

/**
 * 示例4：批量处理多个查询
 */
export async function batchProcessingExample() {
  console.log('\n=== 示例4：批量查询处理 ===\n');

  const engine = new FewShotEngine();
  engine.addExamples(allQueryExamples);

  // 批量查询
  const queries = [
    '查询所有员工',
    '统计订单总数',
    '查找最高工资',
    '计算平均年龄',
    '查询销售部门员工'
  ];

  const availableFields = ['员工', '订单', '工资', '年龄', '部门'];

  console.log(`批量处理 ${queries.length} 个查询...\n`);

  // 批量检索
  const startTime = Date.now();
  const results = await engine.batchProcessQueries(queries, availableFields, 3);
  const duration = Date.now() - startTime;

  console.log(`批量处理完成，耗时: ${duration}ms\n`);

  // 显示结果
  results.forEach((examples, query) => {
    console.log(`查询: ${query}`);
    console.log(`  找到 ${examples.length} 个相关示例`);
    if (examples.length > 0) {
      console.log(`  最相似: ${examples[0].naturalQuery}`);
    }
    console.log('');
  });
}

// ============================================================================
// 示例5：相似度分析
// ============================================================================

/**
 * 示例5：详细相似度分析
 */
export async function similarityAnalysisExample() {
  console.log('\n=== 示例5：相似度分析 ===\n');

  const engine = new FewShotEngine();
  engine.addExamples(allQueryExamples);

  const userQuery = '查询员工信息';
  const targetExample = allQueryExamples[0]; // '查询所有员工'

  // 计算各种相似度
  const cosine = engine.calculateSimilarity(userQuery, targetExample.naturalQuery, SimilarityMethod.COSINE);
  const jaccard = engine.calculateSimilarity(userQuery, targetExample.naturalQuery, SimilarityMethod.JACCARD);
  const levenshtein = engine.calculateSimilarity(userQuery, targetExample.naturalQuery, SimilarityMethod.LEVENSHTEIN);
  const semantic = engine.calculateSimilarity(userQuery, targetExample.naturalQuery, SimilarityMethod.SEMANTIC);
  const hybrid = engine.calculateSimilarity(userQuery, targetExample.naturalQuery, SimilarityMethod.HYBRID);

  console.log(`查询1: "${userQuery}"`);
  console.log(`查询2: "${targetExample.naturalQuery}"\n`);

  console.log('相似度分析:');
  console.log(`  余弦相似度:  ${(cosine * 100).toFixed(2)}%`);
  console.log(`  Jaccard相似度: ${(jaccard * 100).toFixed(2)}%`);
  console.log(`  编辑距离相似度: ${(levenshtein * 100).toFixed(2)}%`);
  console.log(`  语义相似度:  ${(semantic * 100).toFixed(2)}%`);
  console.log(`  混合相似度:  ${(hybrid * 100).toFixed(2)}%`);

  // 详细相似度
  const detailed = engine.calculateDetailedSimilarity(userQuery, targetExample);
  console.log('\n详细相似度对象:');
  console.log(JSON.stringify(detailed, null, 2));
}

// ============================================================================
// 示例6：检索策略比较
// ============================================================================

/**
 * 示例6：比较不同检索策略
 */
export async function retrievalStrategyComparison() {
  console.log('\n=== 示例6：检索策略比较 ===\n');

  const engine = new FewShotEngine();
  engine.addExamples(allQueryExamples);

  const userQuery = '查询工资大于5000的员工姓名';
  const availableFields = ['姓名', '工资', '员工'];

  const strategies = [
    RetrievalStrategy.KEYWORD,
    RetrievalStrategy.TYPE_BASED,
    RetrievalStrategy.DIFFICULTY_BASED,
    RetrievalStrategy.HYBRID,
    RetrievalStrategy.ADAPTIVE
  ];

  console.log(`查询: "${userQuery}"\n`);

  for (const strategy of strategies) {
    const startTime = Date.now();
    const examples = engine.findRelevantExamples(userQuery, availableFields, 3, strategy);
    const duration = Date.now() - startTime;

    console.log(`策略: ${strategy}`);
    console.log(`  找到 ${examples.length} 个示例, 耗时: ${duration}ms`);
    if (examples.length > 0) {
      console.log(`  第一个示例: ${examples[0].naturalQuery}`);
    }
    console.log('');
  }
}

// ============================================================================
// 示例7：示例库管理
// ============================================================================

/**
 * 示例7：示例库的管理和优化
 */
export async function exampleManagementExample() {
  console.log('\n=== 示例7：示例库管理 ===\n');

  const engine = new FewShotEngine();

  // 添加示例
  console.log('添加示例...');
  engine.addExamples(allQueryExamples);

  // 统计信息
  const stats = engine.getStatistics();
  console.log('\n示例库统计:');
  console.log(`  总示例数: ${stats.totalExamples}`);
  console.log(`  按类型分布:`);
  console.log(`    简单: ${stats.examplesByType.simple}`);
  console.log(`    聚合: ${stats.examplesByType.aggregate}`);
  console.log(`    连接: ${stats.examplesByType.join}`);
  console.log(`    复杂: ${stats.examplesByType.complex}`);
  console.log(`  按难度分布:`);
  console.log(`    初级: ${stats.examplesByDifficulty.beginner}`);
  console.log(`    中级: ${stats.examplesByDifficulty.intermediate}`);
  console.log(`    高级: ${stats.examplesByDifficulty.advanced}`);

  // 质量评估
  const evaluation = engine.evaluateExampleQuality();
  console.log(`\n质量评估:`);
  console.log(`  整体质量: ${(evaluation.overall * 100).toFixed(2)}%`);
  if (evaluation.issues.length > 0) {
    console.log(`  问题:`);
    evaluation.issues.forEach(issue => console.log(`    - ${issue}`));
  }

  // 生成报告
  const report = engine.generateReport();
  console.log('\n示例库报告:');
  console.log(report.substring(0, 500) + '...\n');
}

// ============================================================================
// 示例8：用户反馈循环
// ============================================================================

/**
 * 示例8：用户反馈和持续学习
 */
export async function feedbackLoopExample() {
  console.log('\n=== 示例8：用户反馈循环 ===\n');

  const engine = new FewShotEngine();
  engine.addExamples(allQueryExamples);

  // 模拟用户查询
  const userQuery = '查询所有员工';
  const examples = engine.findRelevantExamples(userQuery, [], 3);

  console.log(`查询: "${userQuery}"`);
  console.log(`使用示例: ${examples[0].id}\n`);

  // 模拟用户反馈（1-5分，转换为0-1）
  const userScore = 4; // 用户打4分
  const normalizedScore = userScore / 5;

  console.log(`用户反馈: ${userScore}/5 (${(normalizedScore * 100).toFixed(0)}%)`);

  // 记录反馈
  engine.recordFeedback(examples[0].id, normalizedScore);
  engine.recordFeedback(examples[0].id, 0.9);
  engine.recordFeedback(examples[0].id, 0.85);

  // 查看反馈统计
  const exampleStats = engine.getExampleStats(examples[0].id);
  if (exampleStats) {
    console.log('\n反馈统计:');
    console.log(`  反馈次数: ${exampleStats.feedbackHistory.length}`);
    console.log(`  平均分数: ${(exampleStats.avgFeedback * 100).toFixed(2)}%`);
  }

  // 整体统计
  const overallStats = engine.getStatistics();
  console.log(`\n整体平均反馈: ${(overallStats.averageFeedbackScore * 100).toFixed(2)}%\n`);
}

// ============================================================================
// 示例9：导入导出
// ============================================================================

/**
 * 示例9：示例库的导入导出
 */
export async function importExportExample() {
  console.log('\n=== 示例9：导入导出 ===\n');

  const engine = new FewShotEngine();
  engine.addExamples(allQueryExamples);

  // 导出为JSON
  console.log('导出示例库...');
  const exported = engine.exportExamples();
  const jsonStr = exportExamplesToJSON(exported);

  console.log(`导出 ${exported.length} 个示例`);
  console.log(`JSON大小: ${(jsonStr.length / 1024).toFixed(2)} KB`);

  // 保存到文件（实际项目中）
  // fs.writeFileSync('examples.json', jsonStr);

  // 从JSON导入
  console.log('\n从JSON导入...');
  const imported = loadExamplesFromJSON(jsonStr);
  console.log(`导入 ${imported.length} 个示例`);

  // 验证数据一致性
  const engine2 = new FewShotEngine();
  engine2.importExamples(imported);

  const stats1 = engine.getStatistics();
  const stats2 = engine2.getStatistics();

  console.log('\n数据一致性检查:');
  console.log(`  原始示例数: ${stats1.totalExamples}`);
  console.log(`  导入示例数: ${stats2.totalExamples}`);
  console.log(`  数据一致: ${stats1.totalExamples === stats2.totalExamples ? '✓' : '✗'}\n`);
}

// ============================================================================
// 示例10：完整工作流
// ============================================================================

/**
 * 示例10：完整的Few-Shot查询生成工作流
 */
export async function completeWorkflowExample() {
  console.log('\n=== 示例10：完整工作流 ===\n');

  // 1. 初始化引擎
  console.log('1. 初始化Few-Shot引擎...');
  const engine = createFewShotEngine({
    similarity: {
      defaultMethod: SimilarityMethod.HYBRID,
      threshold: 0.6,
      weights: {
        cosine: 0.4,
        jaccard: 0.2,
        levenshtein: 0.2,
        semantic: 0.2
      }
    },
    retrieval: {
      defaultStrategy: RetrievalStrategy.ADAPTIVE,
      defaultTopK: 5,
      maxCandidates: 20,
      enableCache: true
    },
    prompting: {
      defaultTemplate: PromptTemplate.HYBRID,
      maxExamples: 5,
      minExamples: 2
    },
    learning: {
      enableFeedback: true,
      autoUpdateExamples: false,
      feedbackThreshold: 0.8
    }
  });

  // 2. 加载示例库
  console.log('2. 加载示例库...');
  engine.addExamples(allQueryExamples);
  const stats = engine.getStatistics();
  console.log(`   已加载 ${stats.totalExamples} 个示例\n`);

  // 3. 用户输入
  const userQuery = '查询销售额大于10000的员工姓名和部门名称';
  const availableFields = ['姓名', '部门名称', '销售额', '员工'];
  console.log(`3. 用户查询: "${userQuery}"`);

  // 4. 检索相关示例
  console.log('\n4. 检索相关示例...');
  const retrievalResult = engine.getRetrievalResult(userQuery, availableFields, 3);
  console.log(`   找到 ${retrievalResult.examples.length} 个相关示例`);
  console.log(`   检索时间: ${retrievalResult.metadata.retrievalTime}ms`);

  // 显示相似度分数
  console.log('\n   相似度分数:');
  retrievalResult.scores.forEach((score, i) => {
    console.log(`   ${i + 1}. ${score.exampleId}: ${(score.score * 100).toFixed(2)}%`);
  });

  // 5. 构建提示
  console.log('\n5. 构建Few-Shot提示...');
  const prompt = engine.buildFewShotPrompt(userQuery, retrievalResult.examples, {
    templateType: PromptTemplate.HYBRID,
    maxExamples: 3,
    includeReasoning: true,
    includeSQL: true
  });
  console.log(`   提示长度: ${prompt.length} 字符`);

  // 6. 调用AI（模拟）
  console.log('\n6. 调用AI生成SQL...');
  console.log('   （实际项目中会调用智谱GLM-4.6 API）');

  // 模拟AI响应
  const mockResponse = `SELECT e.name, d.department_name
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id
WHERE e.sales_amount > 10000;`;

  console.log('\n7. 生成的SQL:');
  console.log('   ' + mockResponse);

  // 8. 记录用户反馈
  console.log('\n8. 记录用户反馈...');
  engine.recordFeedback(retrievalResult.examples[0].id, 0.9);
  console.log('   反馈已记录');

  // 9. 生成报告
  console.log('\n9. 生成报告...');
  const finalStats = engine.getStatistics();
  console.log(`   总查询处理: 1`);
  console.log(`   平均反馈分数: ${(finalStats.averageFeedbackScore * 100).toFixed(2)}%`);

  console.log('\n✓ 工作流完成\n');
}

// ============================================================================
// AI调用辅助函数
// ============================================================================

/**
 * 调用AI生成SQL
 *
 * @param prompt Few-Shot提示
 * @returns 生成的SQL查询
 */
async function callAI(prompt: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: 'glm-4.6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const text = response.content[0];
    if (text?.type === 'text') {
      return text.text.trim();
    }

    throw new Error('AI返回了非文本响应');
  } catch (error) {
    console.error('AI调用失败:', error);
    throw error;
  }
}

// ============================================================================
// 主函数
// ============================================================================

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Few-Shot Learning Engine 使用示例                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await basicExample();
    await complexQueryExample();
    await joinQueryExample();
    await batchProcessingExample();
    await similarityAnalysisExample();
    await retrievalStrategyComparison();
    await exampleManagementExample();
    await feedbackLoopExample();
    await importExportExample();
    await completeWorkflowExample();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              所有示例运行完成                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error('运行示例时出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}

// 导出供其他模块使用
export {
  FewShotEngine,
  SimilarityMethod,
  RetrievalStrategy,
  PromptTemplate,
  createFewShotEngine,
  allQueryExamples,
  callAI
};

export type { QueryExample };
