# 依赖安装说明

## 需要安装的NPM包

在项目根目录执行以下命令：

```bash
npm install alasql
```

## 更新后的 package.json

在 `package.json` 的 `dependencies` 部分添加：

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "alasql": "^4.5.0",  // 新增：SQL查询引擎
    "docx-templates": "^4.15.0",
    "jszip": "^3.10.1",
    "lucide-react": "^0.561.0",
    "mammoth": "^1.6.0",
    "pdfjs-dist": "^3.11.174",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "react-markdown": "^10.1.0",
    "xlsx": "^0.18.5"
  }
}
```

## AlaSQL 简介

**AlaSQL** 是一个纯JavaScript实现的SQL数据库，专门为浏览器和Node.js设计。

### 主要特性

1. **纯SQL支持**: 兼容MySQL、PostgreSQL、SQLite等标准SQL语法
2. **内存数据库**: 所有数据存储在内存中，查询速度快
3. **支持JOIN**: 支持INNER JOIN、LEFT JOIN、RIGHT JOIN等
4. **聚合函数**: 内置SUM、AVG、COUNT、MAX、MIN等函数
5. **自定义函数**: 可以注册JavaScript函数作为SQL函数
6. **零依赖**: 不需要任何外部数据库服务
7. **体积小**: 压缩后约200KB

### 使用示例

```javascript
// 简单查询
alasql('SELECT * FROM ? WHERE age > 25', [usersData]);

// 聚合查询
alasql('SELECT category, SUM(price) AS total FROM ? GROUP BY category', [products]);

// JOIN查询
alasql(`
  SELECT t1.name, t2.score
  FROM ? AS t1
  JOIN ? AS t2 ON t1.id = t2.id
`, [table1, table2]);

// 创建虚拟表
alasql('CREATE TABLE users');
alasql.tables.users.data = usersData;
```

## 版本兼容性

- **Node.js**: 14.x, 16.x, 18.x, 20.x+
- **浏览器**: Chrome, Firefox, Safari, Edge (现代浏览器)
- **TypeScript**: 4.x, 5.x (包含类型定义)

## 可选依赖（未来扩展）

如果需要更强的数据处理能力，可以考虑以下包：

```bash
# SQL增强（可选）
npm install sql.js  # WebAssembly版本的SQLite

# 数据验证（可选）
npm install joi     # 数据模式验证

# 日期处理（可选）
npm install dayjs   # 轻量级日期库
```

## 注意事项

1. **AlaSQL是MIT许可证**: 可以自由用于商业项目
2. **数据限制**: AlaSQL适合中小规模数据（建议<10万行），超大数据集建议使用专业数据库
3. **安全性**: AlaSQL执行SQL时要注意防止注入攻击，本项目中已通过参数化查询解决
4. **TypeScript支持**: AlaSQL自带类型定义，无需额外安装 @types/alasql

## 验证安装

安装完成后，可以运行以下代码验证：

```typescript
import alasql from 'alasql';

// 测试基本功能
const data = [
  { name: '张三', age: 25, city: '北京' },
  { name: '李四', age: 30, city: '上海' }
];

const result = alasql('SELECT * FROM ? WHERE age > 25', [data]);
console.log(result); // 应该输出: [{ name: '李四', age: 30, city: '上海' }]

console.log('AlaSQL安装成功！');
```

## 完整的安装脚本

```bash
# 安装AlaSQL
npm install alasql --save

# 如果使用TypeScript，AlaSQL自带类型定义，无需额外操作

# 验证安装
npm run test  # 如果有测试脚本

# 或者运行项目
npm run dev
```

## 故障排除

### 问题1: 找不到alasql模块

**解决方案**:
```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 问题2: TypeScript报错 "Cannot find module 'alasql'"

**解决方案**:
```bash
# 重新安装并生成类型
npm install --save-dev @types/alasql
```

### 问题3: 浏览器环境报错

**解决方案**: 确保在vite.config.ts中正确配置：
```javascript
export default {
  // ...其他配置
  optimizeDeps: {
    include: ['alasql']
  }
}
```

## 更新日志

- **2025-01-15**: 初始添加 alasql@4.5.0
- 版本选择 4.5.0 因为它是最新的稳定版本，支持所有需要的SQL特性
