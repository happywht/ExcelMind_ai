/**
 * SQL Preview Component Usage Example
 * SQL预览组件的使用示例
 */

import React, { useState } from 'react';
import { SQLPreview } from './index';
import type { QueryResult, AIMetadata } from './types';

/**
 * 示例1: 基础用法
 */
export const BasicExample: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">基础用法</h2>
      <SQLPreview
        sql="SELECT 姓名, 部门, 销售额 FROM 员工 WHERE 销售额 > 100000 ORDER BY 销售额 DESC"
      />
    </div>
  );
};

/**
 * 示例2: 带AI元数据的完整用法
 */
export const AIMetadataExample: React.FC = () => {
  const [sql, setSQL] = useState('SELECT 姓名, 部门 FROM 员工 WHERE 销售额 > 100000');

  const metadata: AIMetadata = {
    naturalQuery: '查询销售额大于10万的员工的姓名和部门',
    confidence: 0.95,
    reasoning: `1. 分析自然语言查询，识别关键信息：
   - 查询目标：员工姓名和部门
   - 筛选条件：销售额 > 10万
   - 数据源：员工表

2. 确定SQL语句结构：
   - SELECT子句：姓名, 部门
   - FROM子句：员工
   - WHERE子句：销售额 > 100000

3. 生成SQL语句并验证语法`,
    suggestions: [
      '添加索引: CREATE INDEX idx_销售额 ON 员工(销售额) 可提升查询性能',
      '使用LIMIT限制结果数量，避免返回过多数据',
      '考虑添加ORDER BY子句对结果排序'
    ],
    sqlType: 'SELECT'
  };

  const handleExecute = async (query: string): Promise<QueryResult> => {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: [
            { 姓名: '张三', 部门: '销售部', 销售额: 150000 },
            { 姓名: '李四', 部门: '华东区', 销售额: 120000 },
          ],
          columns: ['姓名', '部门', '销售额'],
          rowCount: 2,
          executionTime: 150,
          success: true,
          sql: query
        });
      }, 1000);
    });
  };

  const handleSave = (query: string) => {
    console.log('保存SQL:', query);
    alert('SQL已保存');
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">带AI元数据的完整用法</h2>
      <SQLPreview
        sql={sql}
        metadata={metadata}
        config={{
          editable: true,
          executable: true,
          formatOnLoad: true,
          showLineNumbers: true,
          theme: 'light',
          showAIReasoning: true,
          showHistory: true
        }}
        onExecute={handleExecute}
        onSave={handleSave}
        onSQLChange={setSQL}
      />
    </div>
  );
};

/**
 * 示例3: 只读模式
 */
export const ReadOnlyExample: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">只读模式</h2>
      <SQLPreview
        sql={`SELECT
  u.用户名,
  u.邮箱,
  COUNT(o.订单ID) as 订单数量,
  SUM(o.金额) as 总金额
FROM 用户 u
LEFT JOIN 订单 o ON u.用户ID = o.用户ID
WHERE u.注册日期 >= '2024-01-01'
GROUP BY u.用户ID, u.用户名, u.邮箱
HAVING COUNT(o.订单ID) > 5
ORDER BY 总金额 DESC
LIMIT 10;`}
        config={{
          editable: false,
          executable: false,
          showLineNumbers: true
        }}
      />
    </div>
  );
};

/**
 * 示例4: 暗色主题
 */
export const DarkThemeExample: React.FC = () => {
  const [sql, setSQL] = useState('SELECT * FROM products WHERE price > 100');

  const handleExecute = async (query: string): Promise<QueryResult> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: [
            { id: 1, name: 'Product A', price: 150 },
            { id: 2, name: 'Product B', price: 200 },
          ],
          columns: ['id', 'name', 'price'],
          rowCount: 2,
          executionTime: 80,
          success: true,
          sql: query
        });
      }, 500);
    });
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      <h2 className="text-xl font-bold mb-4 text-white">暗色主题</h2>
      <SQLPreview
        sql={sql}
        config={{
          editable: true,
          executable: true,
          theme: 'dark'
        }}
        onExecute={handleExecute}
        onSQLChange={setSQL}
      />
    </div>
  );
};

/**
 * 示例5: 复杂JOIN查询
 */
export const ComplexJoinExample: React.FC = () => {
  const complexSQL = `-- 查询各部门销售额前三的员工
WITH 部门排名 AS (
  SELECT
    e.员工ID,
    e.姓名,
    e.部门,
    e.销售额,
    DENSE_RANK() OVER (PARTITION BY e.部门 ORDER BY e.销售额 DESC) as 排名
  FROM 员工 e
  WHERE e.销售额 > 0
)
SELECT
  dr.部门,
  dr.姓名,
  dr.销售额,
  dr.排名,
  d.部门名称,
  m.姓名 as 经理姓名
FROM 部门排名 dr
LEFT JOIN 部门 d ON dr.部门 = d.部门ID
LEFT JOIN 员工 m ON d.经理ID = m.员工ID
WHERE dr.排名 <= 3
ORDER BY dr.部门, dr.排名;`;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">复杂JOIN查询</h2>
      <SQLPreview
        sql={complexSQL}
        config={{
          editable: true,
          executable: false,
          formatOnLoad: true,
          minHeight: '400px'
        }}
      />
    </div>
  );
};

/**
 * 示例6: MySQL语法
 */
export const MySQLExample: React.FC = () => {
  const mySQL = `-- MySQL特定语法示例
SELECT
  id,
  name,
  email,
  created_at
FROM users
WHERE
  status = 'active'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY id
HAVING COUNT(*) > 0
ORDER BY created_at DESC
LIMIT 10;`;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">MySQL语法</h2>
      <SQLPreview
        sql={mySQL}
        config={{
          editable: true,
          language: 'mysql',
          formatOnLoad: true
        }}
      />
    </div>
  );
};

/**
 * 示例7: PostgreSQL语法
 */
export const PostgreSQLExample: React.FC = () => {
  const pgSQL = `-- PostgreSQL特定语法示例
SELECT
  id,
  name,
  email,
  created_at
FROM users
WHERE
  status = 'active'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY id, name, email, created_at
HAVING COUNT(*) > 0
ORDER BY created_at DESC
LIMIT 10;`;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">PostgreSQL语法</h2>
      <SQLPreview
        sql={pgSQL}
        config={{
          editable: true,
          language: 'postgresql',
          formatOnLoad: true
        }}
      />
    </div>
  );
};

/**
 * 示例8: 批量操作
 */
export const BatchOperationsExample: React.FC = () => {
  const batchSQL = `-- 批量插入
INSERT INTO 订单 (用户ID, 产品ID, 数量, 金额, 创建时间)
VALUES
  (1, 101, 2, 200.00, NOW()),
  (1, 102, 1, 150.00, NOW()),
  (2, 101, 3, 300.00, NOW());

-- 批量更新
UPDATE 产品
SET 价格 = 价格 * 1.1
WHERE 分类 = '电子产品';

-- 批量删除
DELETE FROM 临时数据
WHERE 创建时间 < NOW() - INTERVAL 7 DAY;`;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">批量操作</h2>
      <SQLPreview
        sql={batchSQL}
        config={{
          editable: true,
          formatOnLoad: true
        }}
      />
    </div>
  );
};

/**
 * 主示例页面
 */
export const SQLPreviewExamples: React.FC = () => {
  const [activeExample, setActiveExample] = useState<string>('basic');

  const examples = [
    { id: 'basic', name: '基础用法', component: BasicExample },
    { id: 'ai', name: 'AI元数据', component: AIMetadataExample },
    { id: 'readonly', name: '只读模式', component: ReadOnlyExample },
    { id: 'dark', name: '暗色主题', component: DarkThemeExample },
    { id: 'complex', name: '复杂JOIN', component: ComplexJoinExample },
    { id: 'mysql', name: 'MySQL', component: MySQLExample },
    { id: 'postgresql', name: 'PostgreSQL', component: PostgreSQLExample },
    { id: 'batch', name: '批量操作', component: BatchOperationsExample },
  ];

  const ActiveComponent = examples.find(e => e.id === activeExample)?.component || BasicExample;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 头部 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-slate-800">SQL Preview 组件示例</h1>
        <p className="text-slate-500 mt-1">选择不同的示例查看组件的各种用法</p>
      </div>

      {/* 示例选择器 */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex gap-2 flex-wrap">
          {examples.map((example) => (
            <button
              key={example.id}
              onClick={() => setActiveExample(example.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeExample === example.id
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {example.name}
            </button>
          ))}
        </div>
      </div>

      {/* 示例内容 */}
      <ActiveComponent />
    </div>
  );
};

export default SQLPreviewExamples;
