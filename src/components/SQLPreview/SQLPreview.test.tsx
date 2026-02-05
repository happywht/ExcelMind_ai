/**
 * SQL Preview Component Tests
 * SQL预览组件的单元测试
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SQLPreview } from './SQLPreview';
import { SQLFormatter } from './SQLFormatter';

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ onChange, value }: any) => (
    <div data-testid="monaco-editor">
      <textarea
        data-testid="sql-textarea"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
      />
    </div>
  ),
}));

describe('SQLPreview Component', () => {
  const mockSQL = 'SELECT * FROM users WHERE id > 100';
  const mockMetadata = {
    naturalQuery: '查询ID大于100的用户',
    confidence: 0.95,
    reasoning: '1. 识别查询意图\n2. 提取条件\n3. 生成SQL',
    suggestions: ['添加索引可提升性能']
  };

  it('应该正确渲染SQL预览组件', () => {
    render(<SQLPreview sql={mockSQL} />);

    expect(screen.getByText('SQL 编辑器')).toBeInTheDocument();
  });

  it('应该显示自然语言查询', () => {
    render(
      <SQLPreview
        sql={mockSQL}
        metadata={mockMetadata}
      />
    );

    expect(screen.getByText('查询ID大于100的用户')).toBeInTheDocument();
  });

  it('应该支持SQL编辑', async () => {
    const handleChange = jest.fn();
    render(
      <SQLPreview
        sql={mockSQL}
        onSQLChange={handleChange}
        config={{ editable: true }}
      />
    );

    const textarea = screen.getByTestId('sql-textarea');
    fireEvent.change(textarea, { target: { value: 'SELECT * FROM products' } });

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled();
    });
  });

  it('应该格式化SQL', async () => {
    const unformattedSQL = 'select name,age from users';
    render(
      <SQLPreview
        sql={unformattedSQL}
        config={{ editable: true, formatOnLoad: true }}
      />
    );

    // 检查格式化按钮
    const formatButton = screen.getByText('格式化');
    expect(formatButton).toBeInTheDocument();

    fireEvent.click(formatButton);

    await waitFor(() => {
      // SQL应该被格式化
      const textarea = screen.getByTestId('sql-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toContain('SELECT');
    });
  });

  it('应该执行SQL', async () => {
    const mockExecute = jest.fn().mockResolvedValue({
      data: [{ id: 1, name: 'Test' }],
      columns: ['id', 'name'],
      rowCount: 1,
      executionTime: 100,
      success: true,
      sql: mockSQL
    });

    render(
      <SQLPreview
        sql={mockSQL}
        onExecute={mockExecute}
        config={{ executable: true }}
      />
    );

    const executeButton = screen.getByText('执行');
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith(mockSQL);
    });
  });

  it('应该处理执行错误', async () => {
    const mockExecute = jest.fn().mockResolvedValue({
      data: [],
      columns: [],
      rowCount: 0,
      executionTime: 0,
      success: false,
      error: '语法错误',
      sql: mockSQL
    });

    render(
      <SQLPreview
        sql={mockSQL}
        onExecute={mockExecute}
        config={{ executable: true }}
      />
    );

    const executeButton = screen.getByText('执行');
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText('执行失败')).toBeInTheDocument();
      expect(screen.getByText('语法错误')).toBeInTheDocument();
    });
  });

  it('应该保存SQL', async () => {
    const mockSave = jest.fn();

    render(
      <SQLPreview
        sql={mockSQL}
        onSave={mockSave}
        config={{ editable: true }}
      />
    );

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(mockSQL);
    });
  });

  it('应该显示AI推理面板', () => {
    render(
      <SQLPreview
        sql={mockSQL}
        metadata={mockMetadata}
        config={{ showAIReasoning: true }}
      />
    );

    expect(screen.getByText('AI 推理过程')).toBeInTheDocument();
    expect(screen.getByText('1. 识别查询意图')).toBeInTheDocument();
  });

  it('应该显示历史记录', async () => {
    const mockExecute = jest.fn().mockResolvedValue({
      data: [],
      columns: [],
      rowCount: 0,
      executionTime: 50,
      success: true,
      sql: mockSQL
    });

    render(
      <SQLPreview
        sql={mockSQL}
        onExecute={mockExecute}
        config={{ executable: true, showHistory: true }}
      />
    );

    // 先执行一次SQL
    const executeButton = screen.getByText('执行');
    fireEvent.click(executeButton);

    await waitFor(() => {
      // 切换历史记录面板
      const historyButton = screen.getByTitle('显示历史记录');
      fireEvent.click(historyButton);
    });

    await waitFor(() => {
      expect(screen.getByText('执行历史 (1)')).toBeInTheDocument();
    });
  });
});

describe('SQLFormatter Utility', () => {
  it('应该格式化SQL', () => {
    const sql = 'select name,age from users where id>100';
    const formatted = SQLFormatter.format(sql);

    expect(formatted).toContain('SELECT');
    expect(formatted).toContain('FROM');
    expect(formatted).toContain('WHERE');
  });

  it('应该压缩SQL', () => {
    const sql = 'SELECT   name   ,   age   FROM   users';
    const minified = SQLFormatter.minify(sql);

    expect(minified).toBe('SELECT name, age FROM users');
  });

  it('应该验证有效的SQL', () => {
    const sql = 'SELECT * FROM users WHERE id = 1';
    const result = SQLFormatter.validate(sql);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('应该检测无效的SQL', () => {
    const sql = 'SELECT * FROM';
    const result = SQLFormatter.validate(sql);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('应该检测括号不匹配', () => {
    const sql = 'SELECT * FROM users WHERE (id = 1';
    const result = SQLFormatter.validate(sql);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.message.includes('括号'))).toBe(true);
  });

  it('应该检测引号不匹配', () => {
    const sql = "SELECT * FROM users WHERE name = 'John";
    const result = SQLFormatter.validate(sql);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.message.includes('引号'))).toBe(true);
  });

  it('应该提取表名', () => {
    const sql = 'SELECT u.* FROM users u JOIN orders o ON u.id = o.user_id';
    const tables = SQLFormatter.extractTableNames(sql);

    expect(tables).toContain('USERS');
    expect(tables).toContain('ORDERS');
  });

  it('应该计算复杂度', () => {
    const simpleSQL = 'SELECT * FROM users';
    const complexSQL = `
      SELECT u.name, COUNT(o.id) as order_count
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.created_at > '2020-01-01'
      GROUP BY u.name
      HAVING COUNT(o.id) > 5
      ORDER BY order_count DESC
      LIMIT 10
    `;

    const simpleComplexity = SQLFormatter.calculateComplexity(simpleSQL);
    const complexComplexity = SQLFormatter.calculateComplexity(complexSQL);

    expect(complexComplexity).toBeGreaterThan(simpleComplexity);
  });

  it('应该生成执行计划', () => {
    const sql = 'SELECT * FROM users WHERE id > 100 ORDER BY name LIMIT 10';
    const plan = SQLFormatter.generateExplainPlan(sql);

    expect(plan).toContain('解析SQL语句');
    expect(plan).toContain('应用WHERE条件过滤');
    expect(plan).toContain('执行排序操作');
    expect(plan).toContain('应用LIMIT限制');
  });

  it('应该高亮SQL关键字', () => {
    const sql = 'SELECT name FROM users WHERE id = 1';
    const highlighted = SQLFormatter.highlightSQL(sql);

    expect(highlighted).toContain('<span class="sql-keyword">SELECT</span>');
    expect(highlighted).toContain('<span class="sql-keyword">FROM</span>');
    expect(highlighted).toContain('<span class="sql-keyword">WHERE</span>');
  });
});

describe('SQL Validator Component', () => {
  it('应该实时验证SQL', async () => {
    const { container } = render(
      <SQLPreview
        sql="SELECT * FROM users"
        config={{ editable: true }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('SQL语法正确')).toBeInTheDocument();
    });
  });
});

describe('AI Reasoning View Component', () => {
  const mockSQL = 'SELECT * FROM users WHERE id > 100';
  const mockMetadata = {
    naturalQuery: '查询ID大于100的用户',
    confidence: 0.95,
    reasoning: '1. 识别查询意图\n2. 提取条件\n3. 生成SQL',
    suggestions: ['添加索引可提升性能']
  };
  it('应该显示AI推理过程', () => {
    render(
      <SQLPreview
        sql={mockSQL}
        metadata={mockMetadata}
        config={{ showAIReasoning: true }}
      />
    );

    expect(screen.getByText('AI 推理过程')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('应该可以折叠AI推理面板', () => {
    const { container } = render(
      <SQLPreview
        sql={mockSQL}
        metadata={mockMetadata}
        config={{ showAIReasoning: true }}
      />
    );

    const header = screen.getByText('AI 推理过程').closest('div');
    fireEvent.click(header as Element);

    // 推理步骤应该被隐藏
    expect(screen.queryByText('1. 识别查询意图')).not.toBeInTheDocument();
  });

  it('应该显示AI建议', () => {
    render(
      <SQLPreview
        sql={mockSQL}
        metadata={{
          ...mockMetadata,
          suggestions: ['添加索引可提升性能', '使用LIMIT减少数据量']
        }}
        config={{ showAIReasoning: true }}
      />
    );

    expect(screen.getByText('添加索引可提升性能')).toBeInTheDocument();
    expect(screen.getByText('使用LIMIT减少数据量')).toBeInTheDocument();
  });
});

describe('SQL History Component', () => {
  const mockSQL = 'SELECT * FROM users WHERE id > 100';
  it('应该显示执行历史', async () => {
    const mockExecute = jest.fn().mockResolvedValue({
      data: [],
      columns: [],
      rowCount: 0,
      executionTime: 50,
      success: true,
      sql: mockSQL
    });

    render(
      <SQLPreview
        sql={mockSQL}
        onExecute={mockExecute}
        config={{ executable: true, showHistory: true }}
      />
    );

    // 执行SQL
    const executeButton = screen.getByText('执行');
    fireEvent.click(executeButton);

    await waitFor(() => {
      // 打开历史面板
      const historyButton = screen.getByTitle('显示历史记录');
      fireEvent.click(historyButton);
    });

    await waitFor(() => {
      expect(screen.getByText('执行历史 (1)')).toBeInTheDocument();
    });
  });

  it('应该可以删除历史记录', async () => {
    const mockExecute = jest.fn().mockResolvedValue({
      data: [],
      columns: [],
      rowCount: 0,
      executionTime: 50,
      success: true,
      sql: mockSQL
    });

    render(
      <SQLPreview
        sql={mockSQL}
        onExecute={mockExecute}
        config={{ executable: true, showHistory: true }}
      />
    );

    // 执行SQL
    const executeButton = screen.getByText('执行');
    fireEvent.click(executeButton);

    await waitFor(() => {
      // 打开历史面板
      const historyButton = screen.getByTitle('显示历史记录');
      fireEvent.click(historyButton);
    });

    await waitFor(async () => {
      // 删除历史记录
      const deleteButton = screen.getByTitle('删除');
      fireEvent.click(deleteButton);

      // 等待UI更新
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });
});

describe('Execute Button Component', () => {
  const mockSQL = 'SELECT * FROM users WHERE id > 100';
  it('应该在SQL为空时禁用', () => {
    render(
      <SQLPreview
        sql=""
        onExecute={jest.fn()}
        config={{ executable: true }}
      />
    );

    const executeButton = screen.getByText('执行');
    expect(executeButton).toBeDisabled();
  });

  it('应该在SQL有效时启用', () => {
    render(
      <SQLPreview
        sql={mockSQL}
        onExecute={jest.fn()}
        config={{ executable: true }}
      />
    );

    const executeButton = screen.getByText('执行');
    expect(executeButton).not.toBeDisabled();
  });

  it('应该显示加载状态', async () => {
    const mockExecute = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000))) as any;

    render(
      <SQLPreview
        sql={mockSQL}
        onExecute={mockExecute}
        config={{ executable: true }}
      />
    );

    const executeButton = screen.getByText('执行');
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText('执行中...')).toBeInTheDocument();
    });
  });
});
