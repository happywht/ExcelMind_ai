# SQL Preview Component - Quick Start

快速开始使用SQL预览和编辑组件。

## 快速安装

```bash
pnpm add @monaco-editor/react sql-formatter
```

## 最简单的使用方式

```tsx
import { SQLPreview } from '@/components/SQLPreview';

export default function App() {
  return (
    <div className="p-6">
      <SQLPreview
        sql="SELECT * FROM users WHERE id > 100"
      />
    </div>
  );
}
```

## 完整功能示例

```tsx
import { useState } from 'react';
import { SQLPreview } from '@/components/SQLPreview';
import type { QueryResult, AIMetadata } from '@/components/SQLPreview';

export default function SQLPlayground() {
  const [sql, setSQL] = useState('SELECT 姓名, 部门 FROM 员工 WHERE 销售额 > 100000');

  const metadata: AIMetadata = {
    naturalQuery: '查询销售额大于10万的员工',
    confidence: 0.95,
    reasoning: '1. 识别查询意图\n2. 提取条件\n3. 生成SQL',
    suggestions: ['添加索引可提升性能']
  };

  const handleExecute = async (query: string): Promise<QueryResult> => {
    const response = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: query })
    });
    return await response.json();
  };

  return (
    <SQLPreview
      sql={sql}
      metadata={metadata}
      config={{
        editable: true,
        executable: true,
        formatOnLoad: true,
        showAIReasoning: true,
        showHistory: true
      }}
      onExecute={handleExecute}
      onSQLChange={setSQL}
    />
  );
}
```

## 主要功能

| 功能 | 说明 |
|------|------|
| SQL编辑器 | 基于Monaco Editor，语法高亮，自动补全 |
| 格式化 | 美化SQL，关键字大写，缩进对齐 |
| 验证 | 实时语法检查，错误提示 |
| 执行 | 集成执行按钮，显示结果 |
| AI推理 | 展示AI生成SQL的推理过程 |
| 历史记录 | 保存执行历史，快速重用 |

## 快捷键

- `Ctrl/Cmd + Enter` - 执行SQL
- `Ctrl/Cmd + S` - 保存SQL
- `Ctrl/Cmd + Shift + F` - 格式化SQL

## 配置选项

```tsx
<SQLPreview
  sql="SELECT * FROM users"
  config={{
    editable: true,           // 可编辑
    executable: true,         // 可执行
    formatOnLoad: true,       // 自动格式化
    showLineNumbers: true,    // 显示行号
    theme: 'light',           // 主题: light | dark
    language: 'sql',          // 语言: sql | mysql | postgresql
    showAIReasoning: true,    // 显示AI推理
    showHistory: true         // 显示历史
  }}
/>
```

## 更多文档

详细文档请查看 [SQL_PREVIEW_GUIDE.md](./SQL_PREVIEW_GUIDE.md)

## 示例代码

查看 [SQLPreviewExample.tsx](./SQLPreviewExample.tsx) 获取更多使用示例。
