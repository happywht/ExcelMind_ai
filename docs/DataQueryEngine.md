# DataQueryEngine 使用指南

## 📖 概述

**DataQueryEngine** 是智能数据查询系统的核心引擎，提供强大的Excel数据查询能力。

### 核心特性

- ✅ **三种查询模式**
  - 自然语言查询（AI驱动）
  - 直接SQL查询
  - 结构化查询（编程接口）

- ✅ **AlaSQL深度集成**
  - 完整的SQL支持
  - 自定义函数扩展
  - 高性能内存数据库

- ✅ **性能优化**
  - LRU查询缓存
  - 查询计划分析
  - 自动索引建议

- ✅ **丰富的辅助函数**
  - 字符串提取（电话、邮箱）
  - 日期处理
  - 正则表达式
  - 多值分割

---

## 🚀 快速开始

### 基本使用

```typescript
import { DataQueryEngine } from './services/queryEngine';

// 1. 创建引擎
const engine = new DataQueryEngine({
  enableCache: true,
  enableAI: true,
  debugMode: true
});

// 2. 初始化
await engine.initialize();

// 3. 加载数据
engine.loadExcelData(excelData);

// 4. 执行查询
const result = await engine.query('SELECT * FROM [Sheet1] LIMIT 10');
console.log(result.data);
```

---

## 📝 查询模式详解

### 1. 自然语言查询

使用自然语言描述查询需求，AI自动解析为SQL。

```typescript
const result = await engine.query('张三在2023年的总销售额是多少？');
```

**输出：**
```typescript
{
  success: true,
  data: [{ 姓名: '张三', 总销售额: 255000 }],
  sql: 'SELECT 姓名, SUM(销售额) AS 总销售额 FROM [销售记录] WHERE 姓名 = "张三" AND 年份 = 2023',
  executionTime: 125,
  rowCount: 1,
  explanation: '执行聚合分组查询，返回1条记录'
}
```

### 2. 直接SQL查询

直接使用SQL语句查询。

```typescript
const result = await engine.query({
  sql: `
    SELECT 部门, SUM(销售额) AS 总销售额, AVG(销售额) AS 平均销售额
    FROM [销售记录]
    WHERE 年份 = 2023
    GROUP BY 部门
    ORDER BY 总销售额 DESC
  `
});
```

### 3. 结构化查询

使用类型安全的编程接口。

```typescript
const result = await engine.query({
  structured: {
    from: '销售记录',
    select: ['姓名', '部门', '销售额'],
    where: {
      部门: '销售部',
      销售额: { $gte: 100000, $lt: 130000 }
    },
    orderBy: { column: '销售额', direction: 'desc' },
    limit: 10
  }
});
```

**支持的where操作符：**
- `$eq`: 等于
- `$ne`: 不等于
- `$gt`: 大于
- `$gte`: 大于等于
- `$lt`: 小于
- `$lte`: 小于等于
- `$like`: 模糊匹配

**示例：**
```typescript
// 等于
where: { 部门: '销售部' }

// 范围查询
where: { 销售额: { $gte: 100000, $lte: 200000 } }

// IN查询
where: { 姓名: ['张三', '李四', '王五'] }

// 组合条件
where: {
  部门: '销售部',
  销售额: { $gt: 100000 }
}
```

---

## 🔧 便捷方法

### quickQuery

快速查询单个表。

```typescript
// 查询所有记录
const all = await engine.quickQuery('销售记录');

// 查询特定列
const names = await engine.quickQuery('销售记录', '姓名');

// 带条件查询
const filtered = await engine.quickQuery('销售记录', undefined, '部门 = "销售部"');
```

### batchQuery

批量执行多个查询。

```typescript
const results = await engine.batchQuery([
  { sql: 'SELECT COUNT(*) FROM [销售记录]' },
  { sql: 'SELECT SUM(销售额) FROM [销售记录]' },
  {
    structured: {
      from: '销售记录',
      select: ['姓名', '销售额'],
      orderBy: { column: '销售额', direction: 'desc' },
      limit: 5
    }
  }
]);

results.forEach((result, i) => {
  console.log(`查询${i + 1}:`, result.data);
});
```

---

## 🎨 聚合查询

### 使用SQL

```typescript
const result = await engine.query({
  sql: `
    SELECT
      部门,
      SUM(销售额) AS 总销售额,
      AVG(销售额) AS 平均销售额,
      COUNT(*) AS 记录数,
      MAX(销售额) AS 最高销售额,
      MIN(销售额) AS 最低销售额
    FROM [销售记录]
    GROUP BY 部门
  `
});
```

### 使用结构化查询

```typescript
const result = await engine.query({
  structured: {
    from: '销售记录',
    aggregations: [
      { function: 'SUM', column: '销售额', alias: '总销售额' },
      { function: 'AVG', column: '销售额', alias: '平均销售额' },
      { function: 'COUNT', column: '*', alias: '记录数' }
    ],
    groupBy: ['部门']
  }
});
```

---

## 🛠️ 辅助函数

### 内置函数

引擎注册了以下辅助函数，可在SQL中直接使用：

#### 日期函数

```typescript
// 提取年份
parseDateYear('2023-01-15') // → 2023
parseDateYear('2023年') // → 2023

// 格式化日期
formatDate('2023-01-15', 'YYYY年MM月DD日') // → '2023年01月15日'

// 计算年龄
calculateAge('1990-05-20') // → 34
```

#### 字符串函数

```typescript
// 提取电话号码
extractPhone('电话:13800138000') // → '13800138000'
extractPhone('021-12345678') // → '021-12345678'

// 提取邮箱
extractEmail('邮箱:zhangsan@company.com') // → 'zhangsan@company.com'

// 多值分割
multiValueSplit('苹果,香蕉,橙子', ',') // → ['苹果', '香蕉', '橙子']
multiValueSplit('张三；李四；王五') // → ['张三', '李四', '王五']

// 正则提取
regexExtract('版本: v1.2.3', 'v([\d.]+)') // → '1.2.3'

// 包含检查
contains('Hello World', 'world') // → true
```

#### 在SQL中使用

```typescript
const result = await engine.query(`
  SELECT
    姓名,
    extractPhone(联系电话) AS 提取的电话,
    extractEmail(邮箱) AS 提取的邮箱,
    parseDateYear(入职日期) AS 入职年份
  FROM [员工信息]
`);
```

---

## 🚄 性能优化

### 查询缓存

```typescript
const engine = new DataQueryEngine({
  enableCache: true,
  cacheSize: 100,      // 缓存100个查询
  cacheTTL: 300000     // 5分钟过期
});

// 第一次查询（执行SQL）
const result1 = await engine.query('SELECT * FROM [销售记录] WHERE 销售额 > 100000');

// 第二次查询（使用缓存，几乎瞬时）
const result2 = await engine.query('SELECT * FROM [销售记录] WHERE 销售额 > 100000');
```

### 缓存统计

```typescript
const stats = engine.getCacheStats();
console.log(stats);
// {
//   size: 15,       // 缓存条目数
//   hits: 42,       // 缓存命中次数
//   hitRate: 2.8    // 命中率
// }
```

### 清除缓存

```typescript
// 清除所有缓存
engine.clearCache();

// 禁用缓存
engine.setCacheEnabled(false);
```

---

## 🔍 调试和监控

### 启用调试模式

```typescript
const engine = new DataQueryEngine({
  debugMode: true
});

// 或动态切换
engine.setDebugMode(true);
```

**调试输出示例：**
```
[DataQueryEngine] 开始初始化数据查询引擎...
[DataQueryEngine] Excel数据加载完成: 2个表, 10行
[DataQueryEngine] 执行查询: { naturalLanguage: '张三的总销售额' }
[DataQueryEngine] 使用缓存结果
```

### 查看数据统计

```typescript
const stats = engine.getStatistics();
console.log(stats);
// {
//   sheetCount: 2,
//   totalRows: 10,
//   totalColumns: 18,
//   relationshipCount: 1
// }
```

### 查看可用表和字段

```typescript
// 获取所有表名
const tables = engine.getTableNames();
// → ['销售记录', '员工信息']

// 获取表的字段
const columns = engine.getColumns('销售记录');
// → ['姓名', '部门', '销售额', '年份', '季度']
```

---

## 🎯 高级用法

### 跨表关联（JOIN）

```typescript
const result = await engine.query({
  sql: `
    SELECT
      a.姓名,
      a.销售额,
      b.邮箱,
      b.电话
    FROM [销售记录] a
    INNER JOIN [员工信息] b ON a.姓名 = b.姓名
    WHERE a.销售额 > 100000
  `
});
```

### 分页查询

```typescript
// 第一页（1-10条）
const page1 = await engine.query({
  structured: {
    from: '销售记录',
    limit: 10,
    offset: 0
  }
});

// 第二页（11-20条）
const page2 = await engine.query({
  structured: {
    from: '销售记录',
    limit: 10,
    offset: 10
  }
});
```

### 动态查询构建

```typescript
function buildDynamicQuery(filters: Record<string, any>) {
  const query: StructuredQuery = {
    from: '销售记录',
    where: {}
  };

  if (filters.department) {
    query.where!.部门 = filters.department;
  }

  if (filters.minSales) {
    query.where!.销售额 = { ...query.where!.销售额, $gte: filters.minSales };
  }

  if (filters.maxSales) {
    query.where!.销售额 = { ...query.where!.销售额, $lte: filters.maxSales };
  }

  return query;
}

const result = await engine.query({
  structured: buildDynamicQuery({
    department: '销售部',
    minSales: 100000,
    maxSales: 200000
  })
});
```

---

## 🧪 测试用例

完整测试用例请参考：`services/queryEngine/DataQueryEngine.test.ts`

运行测试：
```bash
npm test -- DataQueryEngine.test.ts
```

---

## 📊 性能基准

### 查询性能参考

| 查询类型 | 数据量 | 执行时间 | 说明 |
|---------|--------|----------|------|
| 简单SELECT | 1,000行 | <5ms | 无索引 |
| WHERE过滤 | 1,000行 | <10ms | 单条件 |
| 聚合查询 | 1,000行 | <15ms | GROUP BY |
| JOIN查询 | 2×500行 | <20ms | 单表关联 |
| 自然语言 | 任意 | 1-3s | 包含AI解析 |

### 缓存效果

| 场景 | 无缓存 | 有缓存 | 加速比 |
|------|--------|--------|--------|
| 重复查询 | 10ms | <1ms | 10x+ |
| 复杂聚合 | 20ms | <1ms | 20x+ |
| AI查询 | 2s | <1ms | 2000x+ |

---

## ⚠️ 注意事项

### 1. 表名转义

AlaSQL要求表名使用方括号：
```sql
-- ✅ 正确
SELECT * FROM [销售记录]

-- ❌ 错误
SELECT * FROM 销售记录
```

### 2. 字符串转义

单引号需要转义：
```typescript
const name = "张三's";
const sql = `SELECT * FROM [销售记录] WHERE 姓名 = '${name.replace(/'/g, "''")}'`;
```

### 3. AI查询依赖

自然语言查询需要：
- 配置API密钥（智谱AI）
- 启用AI功能
- 网络连接

### 4. 内存限制

- 大型Excel文件（>100MB）可能内存溢出
- 建议分批处理或使用流式查询
- 注意缓存大小限制

---

## 🔗 相关组件

- **MultiSheetDataSource**: 数据源管理器
- **AIQueryParser**: 自然语言解析器
- **SQLGenerator**: SQL生成器
- **QueryHelperFunctions**: 辅助函数库

---

## 📞 API参考

### DataQueryEngine类

#### 构造函数
```typescript
constructor(dataSource?: IMultiSheetDataSource, config?: QueryEngineConfig)
```

#### 方法
- `initialize()`: 初始化引擎
- `loadExcelData(data)`: 加载Excel数据
- `query(query)`: 执行查询
- `quickQuery(sheet, column?, condition?)`: 快速查询
- `batchQuery(queries)`: 批量查询
- `getStatistics()`: 获取统计信息
- `getTableNames()`: 获取表名列表
- `getColumns(tableName)`: 获取表的字段
- `clearCache()`: 清除缓存
- `reset()`: 重置引擎

#### 配置选项
```typescript
interface QueryEngineConfig {
  enableCache?: boolean;      // 启用缓存（默认true）
  enableAI?: boolean;         // 启用AI（默认true）
  maxExecutionTime?: number;  // 最大执行时间（默认10000ms）
  debugMode?: boolean;        // 调试模式（默认false）
  cacheSize?: number;         // 缓存大小（默认100）
  cacheTTL?: number;          // 缓存TTL（默认300000ms）
}
```

---

## 🎓 最佳实践

### 1. 使用结构化查询

优先使用结构化查询而非字符串拼接：
```typescript
// ✅ 推荐
await engine.query({
  structured: {
    from: '销售记录',
    where: { 姓名: '张三' }
  }
});

// ❌ 不推荐
await engine.query(`SELECT * FROM [销售记录] WHERE 姓名 = '${name}'`);
```

### 2. 启用缓存

对于重复查询，启用缓存可大幅提升性能：
```typescript
const engine = new DataQueryEngine({
  enableCache: true,
  cacheTTL: 600000  // 10分钟
});
```

### 3. 合理使用LIMIT

避免返回过多数据：
```typescript
// ✅ 推荐
await engine.query('SELECT * FROM [销售记录] LIMIT 1000');

// ❌ 不推荐
await engine.query('SELECT * FROM [销售记录]');  // 可能返回百万行
```

### 4. 使用聚合函数

使用聚合而非手动计算：
```typescript
// ✅ 推荐
await engine.query('SELECT SUM(销售额) FROM [销售记录]');

// ❌ 不推荐
const data = await engine.query('SELECT 销售额 FROM [销售记录]');
const sum = data.reduce((acc, row) => acc + row.销售额, 0);
```

---

## 📈 路线图

### Phase 1（已完成）
- ✅ 基本查询功能
- ✅ AlaSQL集成
- ✅ 缓存优化
- ✅ 辅助函数

### Phase 2（规划中）
- 🔄 Web Worker支持
- 🔄 流式查询
- 🔄 自定义聚合函数
- 🔄 查询结果导出

### Phase 3（未来）
- 📅 分布式查询
- 📅 查询可视化
- 📅 自动索引优化
- 📅 查询性能分析

---

**版本**: 1.0.0
**最后更新**: 2025-01-15
**作者**: 后端架构专家
