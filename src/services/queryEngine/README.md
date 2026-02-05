# 数据查询引擎使用指南

## 快速开始

### 安装依赖

```bash
npm install alasql
```

### 基本使用

```typescript
import { DataQueryEngine } from '@/services/queryEngine';

// 1. 创建引擎实例
const engine = new DataQueryEngine({
  enableCache: true,
  enableAI: true,
  debugMode: true
});

// 2. 初始化
await engine.initialize();

// 3. 加载Excel数据
engine.loadExcelData(excelData);

// 4. 执行查询
const result = await engine.query("张三在2023年的总销售额");

if (result.success) {
  console.log('查询结果:', result.data);
  console.log('SQL:', result.sql);
  console.log('说明:', result.explanation);
} else {
  console.error('查询失败:', result.error);
}
```

## 支持的查询类型

### 1. 简单查询

```typescript
// 查询单个字段
await engine.query("张三的部门");
// SQL: SELECT 部门 FROM [Sheet1] WHERE 姓名 = '张三'

// 查询多个字段
await engine.query("张三的姓名、部门和销售额");
// SQL: SELECT 姓名, 部门, 销售额 FROM [Sheet1] WHERE 姓名 = '张三'
```

### 2. 聚合查询

```typescript
// 总和
await engine.query("2023年的总销售额");
// SQL: SELECT SUM(销售额) FROM [Sheet1] WHERE 年份 = 2023

// 平均值
await engine.query("销售部的平均绩效");
// SQL: SELECT AVG(绩效) FROM [Sheet1] WHERE 部门 = '销售部'

// 计数
await engine.query("销售部有多少人");
// SQL: SELECT COUNT(*) FROM [Sheet1] WHERE 部门 = '销售部'
```

### 3. 跨表关联查询

```typescript
// 简单关联
await engine.query("张三的绩效分数");
// SQL: SELECT t2.绩效 FROM [Sheet1] AS t1
//     JOIN [Sheet2] AS t2 ON t1.姓名 = t2.姓名
//     WHERE t1.姓名 = '张三'

// 多字段关联
await engine.query("张三部门的经理姓名");
// SQL: SELECT t2.经理姓名 FROM [Sheet1] AS t1
//     JOIN [Sheet2] AS t2 ON t1.部门 = t2.部门
//     WHERE t1.姓名 = '张三'
```

### 4. 数据转换查询

```typescript
// 提取电话号码
await engine.query("所有员工的电话号码");
// SQL: SELECT 姓名, extractPhone(联系方式) AS 电话 FROM [Sheet1]

// 提取邮箱
await engine.query("所有员工的邮箱");
// SQL: SELECT 姓名, extractEmail(联系方式) AS 邮箱 FROM [Sheet1]

// 分割多值
await engine.query("所有员工的技能列表");
// SQL: SELECT 姓名, multiValueSplit(技能) AS 技能数组 FROM [Sheet1]
```

## 辅助函数

### 内置函数

```typescript
// 日期函数
parseDateYear('2023年') // 返回: 2023
calculateAge('1990-01-01') // 返回: 34
formatDate(new Date(), 'YYYY-MM-DD') // 返回: '2025-01-15'

// 字符串函数
extractPhone('电话:021-12345678') // 返回: '021-12345678'
extractEmail('邮箱:test@example.com') // 返回: 'test@example.com'
multiValueSplit('北京,上海,深圳') // 返回: ['北京', '上海', '深圳']
contains('Hello World', 'hello') // 返回: true

// 正则提取
regexExtract('版本号: v1.2.3', 'v([0-9.]+)') // 返回: '1.2.3'
```

### AI增强函数

```typescript
import { intelligentFieldMapping, intelligentValueExtraction } from '@/services/queryEngine';

// 智能字段映射
const mappings = await intelligentFieldMapping('销售业绩', ['销售额', '销售金额', '业绩']);
// 返回: [{ column: '销售额', confidence: 0.95, reason: '语义匹配' }]

// 智能值提取
const phone = await intelligentValueExtraction('联系电话：021-12345678', 'phone');
// 返回: { value: '021-12345678', confidence: 0.98, original: '021-12345678' }
```

## 高级用法

### 直接执行SQL

```typescript
const result = await engine.executeSQL(`
  SELECT 姓名, SUM(销售额) AS 总销售额
  FROM [Sheet1]
  WHERE 年份 = 2023
  GROUP BY 姓名
  HAVING SUM(销售额) > 100000
  ORDER BY 总销售额 DESC
  LIMIT 10
`);
```

### 批量查询

```typescript
import { batchQuery } from '@/services/queryEngine';

const queries = [
  "张三的部门",
  "2023年的总销售额",
  "销售部有多少人"
];

const results = await batchQuery(excelData, queries);
results.forEach((result, index) => {
  console.log(`查询${index + 1}:`, result.data);
});
```

### 自定义辅助函数

```typescript
import { DataHelperFunctions } from '@/services/queryEngine';

// 注册自定义函数
DataHelperFunctions.register({
  name: 'calculateTax',
  description: '计算个人所得税',
  handler: (salary: number) => {
    // 简化的个税计算
    if (salary <= 5000) return 0;
    return (salary - 5000) * 0.1;
  }
});

// 在SQL中使用
await engine.executeSQL("SELECT 姓名, calculateTax(工资) AS 个税 FROM [Sheet1]");
```

## 集成到文档空间

```typescript
import { DataQueryEngine } from '@/services/queryEngine';
import { generateFieldMapping } from './documentMappingService';

// 1. 初始化查询引擎
const engine = new DataQueryEngine();
await engine.initialize();
engine.loadExcelData(excelData);

// 2. 使用AI生成映射方案（增强版）
const mappingScheme = await generateFieldMapping({
  excelHeaders: engine.getColumns('Sheet1'),
  excelSampleData: engine.getStatistics(),
  templatePlaceholders: ['{{姓名}}', '{{绩效}}', '{{总销售额}}'],
  userInstruction: "绩效从Sheet2取，总销售额需要聚合计算"
});

// 3. 执行复杂查询获取数据
for (const mapping of mappingScheme.mappings) {
  if (mapping.transform && mapping.transform.includes('aggregate')) {
    // 需要聚合查询
    const result = await engine.query(mapping.transform);
    // 使用result.data填充模板
  } else {
    // 简单字段映射
    // 使用现有逻辑
  }
}
```

## 性能优化

### 1. 启用缓存

```typescript
const engine = new DataQueryEngine({
  enableCache: true // 相同查询直接返回缓存结果
});
```

### 2. 创建索引

```typescript
// 在AlaSQL中创建索引
alasql('CREATE INDEX ON [Sheet1] (姓名)');
alasql('CREATE INDEX ON [Sheet1] (年份)');
```

### 3. 限制结果集

```typescript
// 使用LIMIT限制返回行数
const result = await engine.query("前10名销售额最高的员工");
// 自动生成: ... ORDER BY 销售额 DESC LIMIT 10
```

## 错误处理

```typescript
const result = await engine.query("复杂的查询");

if (!result.success) {
  // 查询失败
  console.error('错误信息:', result.error);

  // 尝试降级策略
  if (result.error?.includes('AI')) {
    // AI解析失败，尝试手动配置
    console.log('建议使用手动配置映射');
  } else if (result.error?.includes('SQL')) {
    // SQL执行失败，检查数据结构
    console.log('请检查表名和字段名是否正确');
  }
}
```

## 调试模式

```typescript
const engine = new DataQueryEngine({
  debugMode: true
});

// 查看详细日志
// [数据查询引擎] Excel数据加载完成: { sheetCount: 2, totalRows: 1000 }
// [数据查询引擎] 执行查询: 张三的总销售额
// [数据查询引擎] 查询计划: { queryType: 'aggregate', ... }
// [数据查询引擎] 生成的SQL: SELECT SUM(销售额) FROM [Sheet1] WHERE 姓名 = '张三'
```

## 注意事项

1. **AlaSQL限制**：AlaSQL是内存数据库，不适合处理超大数据集（建议<10万行）
2. **AI准确性**：AI解析可能出错，重要查询建议人工审核生成的SQL
3. **字段名冲突**：多个Sheet有同名字段时，建议明确指定表名
4. **性能考虑**：复杂查询（多表JOIN + 分组聚合）可能需要较长时间

## 未来扩展

- [ ] 支持更多数据库后端（SQLite、IndexedDB）
- [ ] 实现查询结果可视化
- [ ] 添加查询历史记录
- [ ] 支持查询模板保存
- [ ] 实现增量查询更新
