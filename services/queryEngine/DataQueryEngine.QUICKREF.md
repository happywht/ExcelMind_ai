# DataQueryEngine 快速参考卡片

> 🚀 **30秒上手指南**

---

## 📦 核心导入

```typescript
import {
  DataQueryEngine,
  QueryRequest,
  StructuredQuery,
  QueryResult
} from './services/queryEngine';
```

---

## ⚡ 快速开始

```typescript
// 1️⃣ 创建引擎
const engine = new DataQueryEngine({
  enableCache: true,
  debugMode: true
});

// 2️⃣ 初始化并加载数据
await engine.initialize();
engine.loadExcelData(excelData);

// 3️⃣ 执行查询
const result = await engine.query('SELECT * FROM [Sheet1] LIMIT 10');
console.log(result.data);
```

---

## 🎯 三种查询模式

### 1️⃣ 自然语言

```typescript
await engine.query('张三在2023年的总销售额是多少？');
```

### 2️⃣ SQL直接

```typescript
await engine.query('SELECT * FROM [Sheet1] WHERE 销售额 > 100000');
```

### 3️⃣ 结构化查询

```typescript
await engine.query({
  structured: {
    from: '销售记录',
    where: { 销售额: { $gte: 100000 } },
    orderBy: { column: '销售额', direction: 'desc' },
    limit: 10
  }
});
```

---

## 🔥 常用查询模式

### 筛选

```typescript
// 等于
{ where: { 部门: '销售部' } }

// 范围
{ where: { 销售额: { $gte: 100000, $lte: 200000 } } }

// IN查询
{ where: { 姓名: ['张三', '李四', '王五'] } }

// 组合条件
{ where: { 部门: '销售部', 销售额: { $gt: 100000 } } }
```

### 聚合

```typescript
{
  aggregations: [
    { function: 'SUM', column: '销售额', alias: '总销售额' },
    { function: 'AVG', column: '销售额', alias: '平均销售额' },
    { function: 'COUNT', column: '*', alias: '记录数' }
  ],
  groupBy: ['部门']
}
```

### 分页

```typescript
{
  limit: 20,    // 每页20条
  offset: 0     // 第1页
  // offset: 20  // 第2页
  // offset: 40  // 第3页
}
```

### 排序

```typescript
{
  orderBy: { column: '销售额', direction: 'desc' }
}
```

---

## 🛠️ 便捷方法

```typescript
// 查询所有
const all = await engine.quickQuery('销售记录');

// 查询单列
const names = await engine.quickQuery('销售记录', '姓名');

// 带条件
const filtered = await engine.quickQuery(
  '销售记录',
  undefined,
  '部门 = "销售部"'
);
```

---

## 🎨 辅助函数

### SQL中使用

```typescript
await engine.query(`
  SELECT
    extractPhone(电话) AS 电话,
    extractEmail(邮箱) AS 邮箱,
    parseDateYear(日期) AS 年份
  FROM [员工信息]
`);
```

### 可用函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `extractPhone(text)` | 提取电话 | `extractPhone('电话:13800138000')` |
| `extractEmail(text)` | 提取邮箱 | `extractEmail('邮箱:test@ex.com')` |
| `parseDateYear(date)` | 提取年份 | `parseDateYear('2023-01-15')` |
| `calculateAge(date)` | 计算年龄 | `calculateAge('1990-05-20')` |
| `multiValueSplit(text)` | 分割多值 | `multiValueSplit('a,b,c')` |
| `regexExtract(text, pattern)` | 正则提取 | `regexExtract('v1.2.3', 'v([0-9.]+)')` |

---

## 📊 查询结果

```typescript
interface QueryResult {
  success: boolean;        // 是否成功
  data: any[];             // 查询数据
  sql: string;             // 实际执行的SQL
  executionTime: number;   // 执行时间(ms)
  rowCount: number;        // 返回行数
  explanation?: string;    // 查询说明
  error?: string;          // 错误信息
}
```

---

## 🔧 配置选项

```typescript
const engine = new DataQueryEngine({
  enableCache: true,       // 启用缓存
  enableAI: true,          // 启用AI
  maxExecutionTime: 10000, // 最大执行时间(ms)
  debugMode: false,        // 调试模式
  cacheSize: 100,          // 缓存大小
  cacheTTL: 300000         // 缓存过期时间(ms)
});
```

---

## 🎯 最佳实践

### ✅ 推荐做法

```typescript
// 1. 使用结构化查询（类型安全）
await engine.query({
  structured: { from: 'Sheet1', where: { 名称: '张三' } }
});

// 2. 启用缓存（性能提升）
const engine = new DataQueryEngine({ enableCache: true });

// 3. 限制结果数量（避免内存溢出）
await engine.query('SELECT * FROM [Sheet1] LIMIT 1000');

// 4. 使用聚合函数（而非手动计算）
await engine.query('SELECT SUM(销售额) FROM [Sheet1]');
```

### ❌ 避免做法

```typescript
// 1. 不要字符串拼接SQL（SQL注入风险）
await engine.query(`SELECT * FROM [Sheet1] WHERE 名称 = '${name}'`);

// 2. 不要查询过多数据
await engine.query('SELECT * FROM [Sheet1]'); // 可能百万行

// 3. 不要在循环中查询
for (const item of items) {
  await engine.query(`SELECT * FROM [Sheet1] WHERE ID = ${item.id}`);
}
```

---

## 🚨 错误处理

```typescript
const result = await engine.query('...');

if (!result.success) {
  console.error('查询失败:', result.error);

  // 常见错误
  if (result.error?.includes('未找到表')) {
    // 检查表名
  } else if (result.error?.includes('语法错误')) {
    // 检查SQL语法
  } else if (result.error?.includes('超时')) {
    // 优化查询或增加超时时间
  }
}
```

---

## 📈 性能提示

| 操作 | 时间 | 优化建议 |
|------|------|----------|
| 简单查询 | <5ms | ✅ 已优化 |
| 聚合查询 | <15ms | ✅ 已优化 |
| JOIN查询 | <20ms | ✅ 已优化 |
| 缓存查询 | <1ms | ✅ 启用缓存 |
| AI查询 | 1-3s | ⚠️ 首次慢，缓存后快 |

---

## 🔗 相关文档

- 📖 [完整使用指南](../../docs/DataQueryEngine.md)
- 🧪 [测试用例](./DataQueryEngine.test.ts)
- 📊 [性能基准](./DataQueryEngine.benchmark.ts)
- 📝 [实现总结](./DataQueryEngine.SUMMARY.md)

---

**版本**: v1.0.0 | **更新**: 2025-01-15

💡 **提示**: 将此文件添加为编辑器代码片段，实现快速自动补全！
