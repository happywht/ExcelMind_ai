# SQL Preview Component 使用指南

完整的SQL预览和编辑组件系统，提供强大的SQL查询管理功能。

## 功能特性

- SQL语法高亮编辑器（基于Monaco Editor）
- SQL格式化和美化
- SQL语法验证
- SQL执行和结果展示
- AI推理过程展示
- 执行历史记录
- 快捷键支持
- 主题切换（亮色/暗色）

## 安装依赖

```bash
pnpm add @monaco-editor/react sql-formatter
```

## 基础用法

### 简单使用

```tsx
import { SQLPreview } from '@/components/SQLPreview';

function App() {
  return (
    <SQLPreview
      sql="SELECT * FROM users WHERE id > 100"
    />
  );
}
```

### 带AI元数据

```tsx
import { SQLPreview } from '@/components/SQLPreview';

function App() {
  return (
    <SQLPreview
      sql="SELECT 姓名, 部门 FROM 员工 WHERE 销售额 > 100000"
      metadata={{
        naturalQuery: '查询销售额大于10万的员工',
        confidence: 0.95,
        reasoning: '1. 识别查询意图\n2. 提取条件\n3. 生成SQL',
        suggestions: ['添加索引可提升性能', '使用LIMIT减少数据量']
      }}
    />
  );
}
```

### 可执行SQL

```tsx
import { SQLPreview } from '@/components/SQLPreview';
import type { QueryResult } from '@/components/SQLPreview';

function App() {
  const handleExecute = async (sql: string): Promise<QueryResult> => {
    // 调用后端API执行SQL
    const response = await fetch('/api/query', {
      method: 'POST',
      body: JSON.stringify({ sql }),
    });
    return await response.json();
  };

  return (
    <SQLPreview
      sql="SELECT * FROM users LIMIT 10"
      config={{
        editable: true,
        executable: true,
        formatOnLoad: true
      }}
      onExecute={handleExecute}
    />
  );
}
```

## API 文档

### SQLPreview Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `sql` | `string` | - | SQL查询语句（必需） |
| `metadata` | `AIMetadata` | - | AI生成的元数据 |
| `config` | `SQLPreviewConfig` | - | 组件配置 |
| `onExecute` | `(sql: string) => Promise<QueryResult>` | - | 执行SQL回调 |
| `onSave` | `(sql: string) => void` | - | 保存SQL回调 |
| `onFormat` | `(sql: string) => string` | - | 格式化SQL回调 |
| `onSQLChange` | `(sql: string) => void` | - | SQL变化回调 |

### SQLPreviewConfig

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `editable` | `boolean` | `true` | 是否可编辑 |
| `executable` | `boolean` | `true` | 是否可执行 |
| `formatOnLoad` | `boolean` | `false` | 加载时自动格式化 |
| `showLineNumbers` | `boolean` | `true` | 显示行号 |
| `theme` | `'light' \| 'dark'` | `'light'` | 编辑器主题 |
| `language` | `'sql' \| 'mysql' \| 'postgresql'` | `'sql'` | SQL语言类型 |
| `minHeight` | `string` | `'300px'` | 最小高度 |
| `maxHeight` | `string` | `'600px'` | 最大高度 |
| `showAIReasoning` | `boolean` | `true` | 显示AI推理 |
| `showHistory` | `boolean` | `true` | 显示历史记录 |

### AIMetadata

| 属性 | 类型 | 说明 |
|------|------|------|
| `naturalQuery` | `string` | 自然语言查询 |
| `confidence` | `number` | AI置信度（0-1） |
| `reasoning` | `string` | AI推理过程 |
| `suggestions` | `string[]` | AI建议列表 |
| `sqlType` | `string` | SQL类型 |

### QueryResult

| 属性 | 类型 | 说明 |
|------|------|------|
| `data` | `Record<string, any>[]` | 数据行 |
| `columns` | `string[]` | 列名 |
| `rowCount` | `number` | 行数 |
| `executionTime` | `number` | 执行时间（毫秒） |
| `success` | `boolean` | 是否成功 |
| `error` | `string` | 错误信息 |
| `sql` | `string` | SQL语句 |

## 子组件

### SQLEditor

独立的SQL编辑器组件：

```tsx
import { SQLEditor } from '@/components/SQLPreview';

function EditorExample() {
  const [sql, setSQL] = useState('SELECT * FROM users');

  return (
    <SQLEditor
      value={sql}
      onChange={setSQL}
      language="mysql"
      theme="vs-dark"
      height="400px"
      options={{
        fontSize: 14,
        minimap: { enabled: true }
      }}
    />
  );
}
```

### AIReasoningView

AI推理过程展示组件：

```tsx
import { AIReasoningView } from '@/components/SQLPreview';

function AIReasoningExample() {
  return (
    <AIReasoningView
      reasoning="1. 分析查询意图\n2. 提取条件\n3. 生成SQL"
      confidence={0.95}
      naturalQuery="查询销售额大于10万的员工"
      suggestions={['添加索引', '优化查询']}
      onApplySuggestion={(suggestion) => console.log(suggestion)}
    />
  );
}
```

### SQLHistory

执行历史记录组件：

```tsx
import { SQLHistory } from '@/components/SQLPreview';

function HistoryExample() {
  const history = [
    {
      id: '1',
      sql: 'SELECT * FROM users',
      timestamp: new Date(),
      executionTime: 150,
      rowCount: 100,
      success: true
    }
  ];

  return (
    <SQLHistory
      history={history}
      onSelect={(entry) => console.log(entry)}
      onDelete={(id) => console.log('Delete:', id)}
    />
  );
}
```

## 工具函数

### SQLFormatter

SQL格式化和验证工具类：

```tsx
import {
  SQLFormatter,
  formatSQL,
  validateSQL,
  extractTableNames,
  calculateComplexity
} from '@/components/SQLPreview';

// 格式化SQL
const formatted = formatSQL('select * from users');
// 结果: "SELECT\n  *\nFROM\n  users"

// 验证SQL
const result = validateSQL('SELECT * FROM users');
// 结果: { isValid: true, errors: [], warnings: [] }

// 提取表名
const tables = extractTableNames('SELECT * FROM users u JOIN orders o ON u.id = o.user_id');
// 结果: ['USERS', 'ORDERS']

// 计算复杂度
const complexity = calculateComplexity('SELECT * FROM users WHERE id > 100');
// 结果: 25
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + Enter` | 执行SQL |
| `Ctrl/Cmd + S` | 保存SQL |
| `Ctrl/Cmd + Shift + F` | 格式化SQL |
| `Ctrl/Cmd + /` | 注释/取消注释 |
| `Ctrl/Cmd + D` | 选择相同词的下一个出现位置 |

## 样式定制

组件使用Tailwind CSS，可以通过以下方式定制样式：

### 1. 修改颜色主题

```tsx
<SQLPreview
  sql="SELECT * FROM users"
  config={{
    theme: 'dark'  // 使用暗色主题
  }}
/>
```

### 2. 自定义容器样式

```tsx
<div className="my-custom-sql-preview">
  <SQLPreview sql="SELECT * FROM users" />
</div>
```

```css
.my-custom-sql-preview {
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

## 性能优化

### 1. 大SQL处理

对于大SQL（>1000行），建议：

```tsx
<SQLPreview
  sql={largeSQL}
  config={{
    minHeight: '600px',
    maxHeight: '800px'
  }}
/>
```

### 2. 禁用实时验证

```tsx
<SQLPreview
  sql={sql}
  config={{
    // 实时验证可能影响性能
  }}
>
  <SQLValidator
    sql={sql}
    realTime={false}
    validationDelay={1000}
  />
</SQLPreview>
```

### 3. 懒加载历史记录

```tsx
<SQLHistory
  history={history}
  maxDisplayItems={10}  // 限制显示数量
/>
```

## 完整示例

```tsx
import { useState } from 'react';
import { SQLPreview } from '@/components/SQLPreview';
import type { QueryResult, AIMetadata } from '@/components/SQLPreview';

function SQLPlayground() {
  const [sql, setSQL] = useState('SELECT * FROM users LIMIT 10');
  const [metadata, setMetadata] = useState<AIMetadata | undefined>();

  const handleExecute = async (query: string): Promise<QueryResult> => {
    const response = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: query })
    });
    return await response.json();
  };

  const handleSave = (query: string) => {
    localStorage.setItem('saved-sql', query);
  };

  const handleAIGenerate = async (naturalQuery: string) => {
    const response = await fetch('/api/ai-generate-sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: naturalQuery })
    });
    const data = await response.json();
    setSQL(data.sql);
    setMetadata(data.metadata);
  };

  return (
    <div className="h-screen p-6 bg-slate-50">
      <SQLPreview
        sql={sql}
        metadata={metadata}
        config={{
          editable: true,
          executable: true,
          formatOnLoad: true,
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
}

export default SQLPlayground;
```

## 常见问题

### Q: 如何集成到现有项目？

A: 安装依赖后，导入组件即可：

```tsx
import { SQLPreview } from '@/components/SQLPreview';
```

### Q: 如何自定义Monaco Editor的配置？

A: 通过SQLEditor的options属性：

```tsx
<SQLEditor
  options={{
    fontSize: 16,
    fontFamily: 'Fira Code',
    minimap: { enabled: false },
    scrollBeyondLastLine: false
  }}
/>
```

### Q: 如何支持其他数据库类型？

A: 使用language属性：

```tsx
<SQLPreview
  sql="SELECT * FROM users"
  config={{ language: 'postgresql' }}
/>
```

### Q: 如何处理SQL注入？

A: 在后端执行SQL时，务必使用参数化查询或ORM，避免直接拼接SQL。

## 最佳实践

1. **始终验证SQL**: 在执行前使用SQLFormatter验证SQL语法
2. **限制执行权限**: 只允许特定用户执行SELECT查询
3. **添加超时**: 执行SQL时设置超时时间，避免长时间阻塞
4. **记录历史**: 保存SQL执行历史，便于审计和调试
5. **使用只读账户**: 执行SQL时使用只读数据库账户

## 更新日志

### v1.0.0 (2025-01-29)

- 初始版本发布
- 支持SQL编辑、格式化、验证
- 集成Monaco Editor
- AI推理过程展示
- 执行历史记录
