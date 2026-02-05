# AI输出验证器 - 使用指南

## 概述

AI输出验证器是Phase 2质量控制系统的核心组件，负责全面验证AI生成的SQL查询和结果的正确性、安全性和合理性。

## 功能特性

- **SQL语法验证**：基于AlaSQL的完整语法检查
- **SQL注入检测**：检测10+种注入模式
- **表和字段验证**：确保所有标识符存在于数据库schema中
- **查询复杂度评估**：避免性能问题
- **AI幻觉检测**：检测字段名、表名、数值和逻辑幻觉
- **结果合理性验证**：结构、范围、一致性、异常值检测
- **智能修复建议**：自动生成修复建议和向导
- **质量门禁**：可配置的质量标准

## 快速开始

### 基本使用

```typescript
import { AIOutputValidator } from './services/quality';

// 创建验证器
const validator = new AIOutputValidator({
  enableInjectionCheck: true,
  enableHallucinationCheck: true,
  enableComplexityCheck: true,
  qualityGateThreshold: 70
});

// 准备数据
const schema = {
  tables: {
    '员工表': {
      name: '员工表',
      columns: [
        { name: '姓名', dataType: 'string' },
        { name: '部门', dataType: 'string' },
        { name: '销售额', dataType: 'number' }
      ]
    }
  }
};

const aiOutput = {
  sqlQuery: 'SELECT 姓名, 部门 FROM 员工表 WHERE 销售额 > 100000',
  reasoning: '查找销售额大于10万的员工',
  confidence: 0.95
};

const context = {
  schema,
  originalQuery: '查找销售额大于10万的员工'
};

// 执行验证
const result = validator.runValidationSuite(aiOutput, context);

if (result.passed) {
  console.log('验证通过！分数:', result.score);
} else {
  console.log('验证失败：', result.errors);
  console.log('修复建议：', result.suggestions);
}
```

### 单独使用各个验证器

#### SQL验证器

```typescript
import { SQLValidator } from './services/quality';

const sqlValidator = new SQLValidator();

// 语法验证
const syntaxResult = sqlValidator.validateSyntax('SELECT * FROM 员工表');
console.log(syntaxResult.valid); // true/false

// 注入检测
const injectionResult = sqlValidator.checkInjection(sql);
console.log(injectionResult.detected); // true/false
console.log(injectionResult.types); // ['union_based', 'boolean_based']

// 标识符验证
const identifierResult = sqlValidator.validateIdentifiers(sql, schema);
console.log(identifierResult.missingTables); // []
console.log(identifierResult.missingColumns); // []

// 复杂度评估
const complexityResult = sqlValidator.validateComplexity(sql);
console.log(complexityResult.score); // 15
console.log(complexityResult.level); // 'simple', 'medium', 'complex', 'very_complex'

// 危险操作检测
const dangerousOps = sqlValidator.detectDangerousOperations(sql);
console.log(dangerousOps); // [{ type: 'DROP', severity: 'high', ... }]
```

#### 结果验证器

```typescript
import { ResultValidator } from './services/quality';

const resultValidator = new ResultValidator();

const queryResult = {
  data: [
    { 姓名: '张三', 销售额: 150000 },
    { 姓名: '李四', 销售额: 120000 }
  ],
  rowCount: 2
};

// 结构验证
const structureResult = resultValidator.validateStructure(queryResult, ['姓名', '销售额']);
console.log(structureResult.matches); // true/false

// 范围验证
const rangeResult = resultValidator.validateRange(queryResult, {
  销售额: { min: 0, max: 200000 }
});
console.log(rangeResult.inRange); // true/false

// 异常值检测
const outlierResult = resultValidator.detectOutliers(queryResult);
console.log(outlierResult.detected); // true/false
console.log(outlierResult.outliers); // [{ column: '销售额', value: 999999, ... }]
```

#### 幻觉检测器

```typescript
import { HallucinationDetector } from './services/quality';

const detector = new HallucinationDetector();

// 字段名幻觉
const fieldHallucinations = detector.detectFieldHallucination(aiOutput, schema);

// 表名幻觉
const tableHallucinations = detector.detectTableHallucination(aiOutput, schema);

// 数值幻觉
const valueHallucinations = detector.detectValueHallucination(aiOutput, context);

// 逻辑幻觉
const logicHallucinations = detector.detectLogicHallucination(aiOutput, context);

// 综合分数
const score = detector.calculateHallucinationScore(aiOutput, context);
console.log('幻觉分数:', score); // 0-100，越低越好
```

## 验证配置

### 基本配置

```typescript
const validator = new AIOutputValidator({
  // 是否启用SQL注入检测
  enableInjectionCheck: true,

  // 是否启用幻觉检测
  enableHallucinationCheck: true,

  // 是否启用复杂度检查
  enableComplexityCheck: true,

  // 最大查询复杂度
  maxComplexity: 50,

  // 是否启用结果验证
  enableResultValidation: true,

  // 质量门禁阈值 (0-100)
  qualityGateThreshold: 70,

  // 严格模式（任何错误即失败）
  strictMode: false
});
```

### 质量门禁标准

```typescript
import { QualityGate, STRICT_GATE, STANDARD_GATE, LENIENT_GATE } from './services/quality';

// 使用预定义标准
const strictGate = new QualityGate(STRICT_GATE);    // 生产环境
const standardGate = new QualityGate(STANDARD_GATE); // 测试环境
const lenientGate = new QualityGate(LENIENT_GATE);   // 开发环境

// 或自定义标准
const customGate = new QualityGate({
  minScore: 80,              // 最低分数
  requiredChecks: [          // 必须通过的检查
    'syntax',
    'injection',
    'identifiers',
    'safety'
  ],
  warningThreshold: 60,      // 警告阈值
  errorThreshold: 40         // 错误阈值
});

// 检查是否通过门禁
const gateResult = customGate.check(validationResult);
console.log('通过:', gateResult.passed);

// 生成质量报告
const report = customGate.generateReport(validationResult);
console.log('分数:', report.score);
console.log('等级:', report.grade); // A, B, C, D, F
console.log('指标:', report.metrics);
console.log('建议:', report.recommendations);
```

## 验证结果

### ValidationResult结构

```typescript
{
  passed: boolean,              // 是否通过验证
  score: number,                // 验证分数 (0-100)
  sqlValidation: {
    syntaxValid: boolean,       // 语法是否正确
    syntaxError?: string,       // 语法错误信息
    injectionCheck: {
      detected: boolean,        // 是否检测到注入
      types: string[],          // 注入类型
      patterns: string[],       // 检测到的模式
      severity: string          // 严重程度
    },
    identifierCheck: {
      tables: [],               // 表检查结果
      columns: [],              // 字段检查结果
      missingTables: string[],  // 缺失的表
      missingColumns: string[]  // 缺失的字段
    },
    complexityCheck: {
      score: number,            // 复杂度分数
      level: string,            // 复杂度级别
      exceedsThreshold: boolean,// 是否超出阈值
      factors: []               // 复杂度因素
    },
    dangerousOperations: []     // 危险操作列表
  },
  resultValidation: {
    structure: {
      matches: boolean,         // 是否匹配预期结构
      expectedColumns: string[],
      actualColumns: string[],
      missingColumns: string[],
      extraColumns: string[]
    },
    range: {
      inRange: boolean,         // 是否在合理范围
      outOfRangeValues: []
    },
    outliers: {
      detected: boolean,        // 是否检测到异常值
      outliers: []              // 异常值列表
    }
  },
  hallucinationDetection: {
    score: number,              // 幻觉分数 (0-100)
    fieldHallucinations: [],    // 字段名幻觉
    tableHallucinations: [],    // 表名幻觉
    valueHallucinations: [],    // 数值幻觉
    logicHallucinations: []     // 逻辑幻觉
  },
  suggestions: [],              // 修复建议
  errors: string[],             // 错误信息
  warnings: string[],           // 警告信息
  timestamp: Date,              // 验证时间
  duration: number              // 验证耗时(毫秒)
}
```

## 修复建议

### 修复建议类型

```typescript
interface FixSuggestion {
  id: string;                   // 建议ID
  type: string;                 // 建议类型
  priority: 'low' | 'medium' | 'high' | 'critical'; // 优先级
  title: string;                // 标题
  description: string;          // 描述
  original?: string;            // 原始内容
  suggested?: string;           // 建议内容
  applyCode?: string;           // 应用代码
  autoFixable: boolean;         // 是否可自动修复
}
```

### 使用修复向导

```typescript
// 生成交互式修复向导
const wizard = validator.generateFixSuggestion(validationResult);

console.log('可以自动修复:', wizard.canAutoFix);

// 遍历修复步骤
wizard.steps.forEach((step, index) => {
  console.log(`步骤 ${index + 1}: ${step.title}`);
  console.log(`  ${step.description}`);

  step.options.forEach((option, optIndex) => {
    console.log(`  ${optIndex + 1}. ${option.title}`);
    console.log(`     ${option.description}`);

    if (option.isAutoFix) {
      console.log(`     [可自动修复]`);
      console.log(`     代码: ${option.fixCode}`);
    }
  });
});
```

## 实际应用场景

### 场景1：验证自然语言查询

```typescript
// 用户输入
const userQuery = "查找销售额大于10万的员工";

// AI生成SQL
const aiOutput = await aiService.generateSQL(userQuery, schema);

// 验证AI输出
const validator = new AIOutputValidator();
const result = validator.runValidationSuite(aiOutput, {
  schema,
  originalQuery: userQuery
});

if (result.passed) {
  // 执行查询
  const queryResult = await database.execute(aiOutput.sqlQuery);

  // 验证结果
  const resultValidation = validator.validateResult(queryResult);
  if (resultValidation.passed) {
    return queryResult;
  }
} else {
  // 显示错误和建议
  return {
    error: result.errors,
    suggestions: result.suggestions
  };
}
```

### 场景2：批量验证

```typescript
const queries = [
  { sql: 'SELECT * FROM 员工表', context: {...} },
  { sql: 'SELECT * FROM 产品表', context: {...} },
  // ...
];

const results = queries.map(({ sql, context }) => {
  const aiOutput = { sqlQuery: sql };
  return validator.runValidationSuite(aiOutput, context);
});

// 统计
const passed = results.filter(r => r.passed).length;
const failed = results.length - passed;

console.log(`通过: ${passed}, 失败: ${failed}`);
console.log(`平均分数: ${results.reduce((sum, r) => sum + r.score, 0) / results.length}`);
```

### 场景3：持续质量监控

```typescript
// 定期检查质量
setInterval(() => {
  const recentQueries = getRecentQueries();

  const reports = recentQueries.map(query => {
    const result = validator.runValidationSuite(query.aiOutput, query.context);
    return validator.checkQualityGate(result);
  });

  // 分析质量趋势
  const avgScore = reports.reduce((sum, r) => sum + r.score, 0) / reports.length;

  if (avgScore < 70) {
    alert('质量下降！平均分数:', avgScore);
  }

  // 生成质量报告
  generateQualityReport(reports);
}, 60000); // 每分钟检查一次
```

## 最佳实践

### 1. 分层验证

```typescript
// 第一层：快速语法检查
const syntaxCheck = validator.validateSQL(sql, schema);
if (!syntaxCheck.sqlValidation.syntaxValid) {
  return { error: 'SQL语法错误' };
}

// 第二层：安全检查
if (syntaxCheck.sqlValidation.injectionCheck.detected) {
  return { error: '检测到SQL注入' };
}

// 第三层：完整验证
const fullValidation = validator.runValidationSuite(aiOutput, context);
```

### 2. 渐进式修复

```typescript
const result = validator.runValidationSuite(aiOutput, context);

if (!result.passed) {
  // 优先处理高优先级问题
  const criticalIssues = result.suggestions.filter(s => s.priority === 'critical');
  const highIssues = result.suggestions.filter(s => s.priority === 'high');

  // 自动修复可自动修复的问题
  const autoFixable = [...criticalIssues, ...highIssues]
    .filter(s => s.autoFixable);

  for (const issue of autoFixable) {
    console.log(`自动修复: ${issue.title}`);
    // applyFix(issue.applyCode);
  }
}
```

### 3. 缓存验证结果

```typescript
const validationCache = new Map<string, ValidationResult>();

function validateWithCache(sql: string, context: QueryContext) {
  const cacheKey = `${sql}-${JSON.stringify(context.schema)}`;

  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey);
  }

  const result = validator.runValidationSuite({ sqlQuery: sql }, context);
  validationCache.set(cacheKey, result);

  return result;
}
```

## 性能优化

### 1. 并行验证

```typescript
const [sqlValidation, hallucinationCheck] = await Promise.all([
  Promise.resolve(validator.validateSQL(sql, schema)),
  Promise.resolve(validator.detectHallucination(aiOutput, context))
]);
```

### 2. 增量验证

```typescript
// 只验证变更的部分
function validateIncremental(
  oldSQL: string,
  newSQL: string,
  lastResult: ValidationResult
) {
  if (oldSQL === newSQL) {
    return lastResult;
  }

  // 只重新验证受影响的部分
  return validator.validateSQL(newSQL, schema);
}
```

## 故障排查

### 常见问题

**Q: 验证时间过长怎么办？**

A: 可以调整配置：
```typescript
const validator = new AIOutputValidator({
  enableComplexityCheck: false,      // 禁用复杂度检查
  enableHallucinationCheck: false,   // 禁用幻觉检测
  enableResultValidation: false      // 禁用结果验证
});
```

**Q: 误报率太高？**

A: 调整质量门禁阈值：
```typescript
const validator = new AIOutputValidator({
  qualityGateThreshold: 50  // 降低阈值
});
```

**Q: 如何处理边缘情况？**

A: 使用严格模式：
```typescript
const validator = new AIOutputValidator({
  strictMode: true  // 任何错误都失败
});
```

## API参考

详细的API文档请参考TypeScript类型定义文件。

## 贡献

欢迎提交问题和改进建议！

## 许可

MIT License
