/**
 * AI输出验证器 - 快速开始示例
 *
 * 演示如何使用质量控制模块
 */

import {
  AIOutputValidator,
  DatabaseSchema,
  AIOutput,
  QueryContext
} from '../index';

// ============================================================
// 示例1：基本验证
// ============================================================

export function example1_BasicValidation() {
  console.log('=== 示例1：基本验证 ===\n');

  // 1. 创建验证器
  const validator = new AIOutputValidator({
    qualityGateThreshold: 70
  });

  // 2. 准备数据
  const schema: DatabaseSchema = {
    tables: {
      '员工表': {
        name: '员工表',
        columns: [
          { name: '姓名', dataType: 'string', nullable: false },
          { name: '部门', dataType: 'string', nullable: true },
          { name: '销售额', dataType: 'number', nullable: true }
        ]
      }
    }
  };

  const aiOutput: AIOutput = {
    sqlQuery: 'SELECT 姓名, 部门 FROM 员工表 WHERE 销售额 > 100000',
    reasoning: '查找销售额大于10万的员工',
    confidence: 0.95
  };

  const context: QueryContext = {
    schema,
    originalQuery: '查找销售额大于10万的员工'
  };

  // 3. 执行验证
  const result = validator.runValidationSuite(aiOutput, context);

  // 4. 查看结果
  console.log('验证通过:', result.passed);
  console.log('验证分数:', result.score);
  console.log('错误信息:', result.errors);
  console.log('警告信息:', result.warnings);

  // 5. 检查质量门禁
  const report = validator.checkQualityGate(result);
  console.log('质量等级:', report.grade);
  console.log('通过门禁:', report.passed);
  console.log('改进建议:', report.recommendations);
}

// ============================================================
// 示例2：SQL注入检测
// ============================================================

export function example2_InjectionDetection() {
  console.log('\n=== 示例2：SQL注入检测 ===\n');

  const validator = new AIOutputValidator();

  const maliciousSQL = "SELECT * FROM 员工表 WHERE 姓名 = 'x' OR '1'='1'";

  const schema: DatabaseSchema = {
    tables: {
      '员工表': {
        name: '员工表',
        columns: [
          { name: '姓名', dataType: 'string' }
        ]
      }
    }
  };

  const result = validator.validateSQL(maliciousSQL, schema);

  console.log('检测到注入:', result.sqlValidation.injectionCheck.detected);
  console.log('注入类型:', result.sqlValidation.injectionCheck.types);
  console.log('严重程度:', result.sqlValidation.injectionCheck.severity);
  console.log('检测到的模式:', result.sqlValidation.injectionCheck.patterns);
}

// ============================================================
// 示例3：幻觉检测
// ============================================================

export function example3_HallucinationDetection() {
  console.log('\n=== 示例3：幻觉检测 ===\n');

  const validator = new AIOutputValidator();

  const schema: DatabaseSchema = {
    tables: {
      '员工表': {
        name: '员工表',
        columns: [
          { name: '姓名', dataType: 'string' },
          { name: '部门', dataType: 'string' }
        ]
      }
    }
  };

  const aiOutputWithHallucination: AIOutput = {
    sqlQuery: 'SELECT 姓名, 不存在的字段 FROM 员工表',
    reasoning: '查询员工信息',
    confidence: 0.6
  };

  const context: QueryContext = {
    schema,
    originalQuery: '查询员工信息'
  };

  const result = validator.detectHallucination(aiOutputWithHallucination, context);

  console.log('幻觉分数:', result.score);
  console.log('需要人工审核:', result.requiresHumanReview);
  console.log('总体评估:', result.assessment);
  console.log('检测到的幻觉:');
  result.hallucinations.forEach(h => {
    console.log(`  - [${h.type}] ${h.issue} (${h.severity})`);
    if (h.suggestion) {
      console.log(`    建议: ${h.suggestion}`);
    }
  });
}

// ============================================================
// 示例4：修复建议
// ============================================================

export function example4_FixSuggestions() {
  console.log('\n=== 示例4：修复建议 ===\n');

  const validator = new AIOutputValidator();

  const schema: DatabaseSchema = {
    tables: {
      '员工表': {
        name: '员工表',
        columns: [
          { name: '姓名', dataType: 'string' }
        ]
      }
    }
  };

  const aiOutputWithErrors: AIOutput = {
    sqlQuery: 'SELCT 不存在的字段 FROM 不存在的表',
    reasoning: '错误示例'
  };

  const context: QueryContext = {
    schema
  };

  const result = validator.runValidationSuite(aiOutputWithErrors, context);

  console.log('修复建议:');
  result.suggestions.forEach((suggestion, index) => {
    console.log(`\n${index + 1}. ${suggestion.title}`);
    console.log(`   优先级: ${suggestion.priority}`);
    console.log(`   描述: ${suggestion.description}`);
    if (suggestion.suggested) {
      console.log(`   建议: ${suggestion.suggested}`);
    }
    if (suggestion.autoFixable) {
      console.log(`   [可自动修复]`);
    }
  });

  // 生成修复向导
  console.log('\n=== 修复向导 ===');
  const wizard = validator.generateFixSuggestion(result);
  console.log('可自动修复:', wizard.canAutoFix);
  console.log('\n修复步骤:');
  wizard.steps.forEach((step, stepIndex) => {
    console.log(`\n步骤 ${stepIndex + 1}: ${step.title}`);
    console.log(`  ${step.description}`);
    step.options.forEach((option, optIndex) => {
      console.log(`  ${optIndex + 1}. ${option.title}`);
      console.log(`     ${option.description}`);
      if (option.isAutoFix) {
        console.log(`     [可自动修复]`);
      }
    });
  });
}

// ============================================================
// 示例5：结果验证
// ============================================================

export function example5_ResultValidation() {
  console.log('\n=== 示例5：结果验证 ===\n');

  const validator = new AIOutputValidator();

  const queryResult = {
    data: [
      { 姓名: '张三', 销售额: 150000 },
      { 姓名: '李四', 销售额: 120000 },
      { 姓名: '王五', 销售额: 999999 } // 异常值
    ],
    rowCount: 3,
    columns: ['姓名', '销售额']
  };

  const result = validator.validateResult(queryResult);

  console.log('验证通过:', result.passed);
  console.log('验证分数:', result.score);

  if (result.resultValidation) {
    console.log('\n结构验证:');
    console.log('  匹配:', result.resultValidation.structure.matches);

    console.log('\n异常值检测:');
    if (result.resultValidation.outliers) {
      console.log('  检测到异常值:', result.resultValidation.outliers.detected);
      result.resultValidation.outliers.outliers.forEach(outlier => {
        console.log(`    - ${outlier.column}: ${outlier.value} (偏离${outlier.deviation.toFixed(2)}倍标准差)`);
      });
    }
  }
}

// ============================================================
// 示例6：批量验证
// ============================================================

export async function example6_BatchValidation() {
  console.log('\n=== 示例6：批量验证 ===\n');

  const validator = new AIOutputValidator();

  const schema: DatabaseSchema = {
    tables: {
      '员工表': {
        name: '员工表',
        columns: [
          { name: '姓名', dataType: 'string' },
          { name: '销售额', dataType: 'number' }
        ]
      }
    }
  };

  const queries = [
    { sql: 'SELECT * FROM 员工表', description: '查询所有员工' },
    { sql: 'SELECT 姓名 FROM 员工表 WHERE 销售额 > 10000', description: '查询高销售额员工' },
    { sql: 'SELCT * FORM 员工表', description: '语法错误的查询' }
  ];

  const results = queries.map(query => {
    const aiOutput: AIOutput = { sqlQuery: query.sql };
    const result = validator.runValidationSuite(aiOutput, { schema });

    return {
      description: query.description,
      sql: query.sql,
      passed: result.passed,
      score: result.score,
      errors: result.errors
    };
  });

  // 统计
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

  console.log('批量验证结果:');
  console.log(`  总数: ${results.length}`);
  console.log(`  通过: ${passed}`);
  console.log(`  失败: ${failed}`);
  console.log(`  平均分数: ${avgScore.toFixed(2)}`);

  console.log('\n详细结果:');
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.description}`);
    console.log(`   SQL: ${result.sql}`);
    console.log(`   通过: ${result.passed}`);
    console.log(`   分数: ${result.score}`);
    if (result.errors.length > 0) {
      console.log(`   错误: ${result.errors.join(', ')}`);
    }
  });
}

// ============================================================
// 示例7：自定义质量门禁
// ============================================================

export function example7_CustomQualityGate() {
  console.log('\n=== 示例7：自定义质量门禁 ===\n');

  // 使用严格标准
  const strictValidator = new AIOutputValidator({
    qualityGateThreshold: 90,
    strictMode: true
  });

  // 使用宽松标准
  const lenientValidator = new AIOutputValidator({
    qualityGateThreshold: 50,
    strictMode: false
  });

  const schema: DatabaseSchema = {
    tables: {
      '员工表': {
        name: '员工表',
        columns: [
          { name: '姓名', dataType: 'string' }
        ]
      }
    }
  };

  const aiOutput: AIOutput = {
    sqlQuery: 'SELECT 姓名 FROM 员工表',
    confidence: 0.85
  };

  const context: QueryContext = { schema };

  console.log('严格标准:');
  const strictResult = strictValidator.runValidationSuite(aiOutput, context);
  console.log(`  通过: ${strictResult.passed}, 分数: ${strictResult.score}`);

  console.log('\n宽松标准:');
  const lenientResult = lenientValidator.runValidationSuite(aiOutput, context);
  console.log(`  通过: ${lenientResult.passed}, 分数: ${lenientResult.score}`);
}

// ============================================================
// 主函数
// ============================================================

export async function main() {
  try {
    await example1_BasicValidation();
    await example2_InjectionDetection();
    await example3_HallucinationDetection();
    await example4_FixSuggestions();
    await example5_ResultValidation();
    await example6_BatchValidation();
    await example7_CustomQualityGate();

    console.log('\n=== 所有示例执行完成 ===');
  } catch (error) {
    console.error('执行示例时出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}
