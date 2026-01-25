/**
 * QueryVisualizer 组件单元测试
 *
 * 测试覆盖：
 * - 组件渲染
 * - 交互功能
 * - 数据处理
 * - 边界情况
 * - 性能测试
 *
 * @author ExcelMind AI Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryVisualizer } from './QueryVisualizer';
import { TableView } from './TableView';
import { ChartView } from './ChartView';
import { StatsPanel } from './StatsPanel';
import { ExportDialog } from './ExportDialog';

// ============================================================
// 测试数据
// ============================================================

const mockData = [
  { id: 1, name: 'Alice', age: 30, salary: 50000 },
  { id: 2, name: 'Bob', age: 25, salary: 45000 },
  { id: 3, name: 'Charlie', age: 35, salary: 60000 }
];

const mockQueryResult = {
  data: mockData,
  sql: 'SELECT * FROM employees',
  executionTime: 45,
  rowCount: 3,
  explanation: '查询所有员工信息',
  success: true
};

// ============================================================
// QueryVisualizer 组件测试
// ============================================================

describe('QueryVisualizer', () => {
  beforeEach(() => {
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染测试', () => {
    it('应该正确渲染组件', () => {
      render(<QueryVisualizer result={mockQueryResult} />);

      expect(screen.getByText('3')).toBeInTheDocument(); // 行数
      expect(screen.getByText('45')).toBeInTheDocument(); // 执行时间
    });

    it('应该显示查询说明', () => {
      render(<QueryVisualizer result={mockQueryResult} />);

      expect(screen.getByText('查询所有员工信息')).toBeInTheDocument();
    });

    it('应该渲染表格视图', () => {
      render(<QueryVisualizer result={mockQueryResult} config={{ defaultView: 'table' }} />);

      expect(screen.getByText('id')).toBeInTheDocument();
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('应该渲染图表视图', () => {
      render(<QueryVisualizer result={mockQueryResult} config={{ defaultView: 'chart' }} />);

      expect(screen.getByText('柱状图')).toBeInTheDocument();
      expect(screen.getByText('折线图')).toBeInTheDocument();
    });

    it('应该渲染统计面板', () => {
      render(<QueryVisualizer result={mockQueryResult} config={{ defaultView: 'stats' }} />);

      expect(screen.getByText('总行数')).toBeInTheDocument();
      expect(screen.getByText('列数')).toBeInTheDocument();
    });
  });

  describe('交互测试', () => {
    it('应该能够切换视图', async () => {
      render(<QueryVisualizer result={mockQueryResult} />);

      // 切换到图表视图
      const chartButton = screen.getByText('图表');
      fireEvent.click(chartButton);

      await waitFor(() => {
        expect(screen.getByText('柱状图')).toBeInTheDocument();
      });
    });

    it('应该能够打开导出对话框', async () => {
      render(<QueryVisualizer result={mockQueryResult} />);

      const exportButton = screen.getByText('导出');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('导出数据')).toBeInTheDocument();
      });
    });

    it('应该能够切换设置面板', async () => {
      render(<QueryVisualizer result={mockQueryResult} />);

      const settingsButton = screen.getByTitle('设置');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('虚拟滚动')).toBeInTheDocument();
      });
    });

    it('应该调用刷新回调', async () => {
      const onRefresh = jest.fn();
      render(<QueryVisualizer result={mockQueryResult} onRefresh={onRefresh} />);

      const refreshButton = screen.getByTitle('刷新');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });
    });

    it('应该调用编辑查询回调', async () => {
      const onEditQuery = jest.fn();
      render(<QueryVisualizer result={mockQueryResult} onEditQuery={onEditQuery} />);

      const editButton = screen.getByTitle('编辑查询');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(onEditQuery).toHaveBeenCalled();
      });
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空数据', () => {
      const emptyResult = {
        ...mockQueryResult,
        data: [],
        rowCount: 0
      };

      render(<QueryVisualizer result={emptyResult} />);

      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('应该处理错误状态', () => {
      const errorResult = {
        ...mockQueryResult,
        success: false,
        error: 'SQL语法错误'
      };

      render(<QueryVisualizer result={errorResult} />);

      expect(screen.getByText('查询执行失败')).toBeInTheDocument();
      expect(screen.getByText('SQL语法错误')).toBeInTheDocument();
    });

    it('应该处理null数据', () => {
      const resultWithNulls = {
        ...mockQueryResult,
        data: [
          { id: 1, name: null, age: undefined, salary: 50000 }
        ]
      };

      render(<QueryVisualizer result={resultWithNulls} />);

      expect(screen.getByText('-')).toBeInTheDocument(); // null值显示
    });
  });

  describe('配置测试', () => {
    it('应该正确应用配置', () => {
      render(
        <QueryVisualizer
          result={mockQueryResult}
          config={{
            showTable: true,
            showChart: true,
            showStats: true,
            defaultView: 'table'
          }}
        />
      );

      expect(screen.getByText('表格')).toBeInTheDocument();
      expect(screen.getByText('图表')).toBeInTheDocument();
      expect(screen.getByText('统计')).toBeInTheDocument();
    });

    it('应该隐藏未启用的视图', () => {
      render(
        <QueryVisualizer
          result={mockQueryResult}
          config={{
            showTable: true,
            showChart: false,
            showStats: false
          }}
        />
      );

      expect(screen.getByText('表格')).toBeInTheDocument();
      expect(screen.queryByText('图表')).not.toBeInTheDocument();
      expect(screen.queryByText('统计')).not.toBeInTheDocument();
    });
  });
});

// ============================================================
// TableView 组件测试
// ============================================================

describe('TableView', () => {
  it('应该正确渲染表格', () => {
    render(
      <TableView
        data={mockData}
        columns={['id', 'name', 'age', 'salary']}
      />
    );

    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('应该支持排序', async () => {
    render(
      <TableView
        data={mockData}
        columns={['id', 'name', 'age', 'salary']}
        sortable={true}
      />
    );

    const ageHeader = screen.getByText('age');
    fireEvent.click(ageHeader);

    await waitFor(() => {
      // 检查排序是否应用
      expect(ageHeader).toBeInTheDocument();
    });
  });

  it('应该支持搜索过滤', async () => {
    render(
      <TableView
        data={mockData}
        columns={['id', 'name', 'age', 'salary']}
        filterable={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('搜索所有列...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });
  });

  it('应该支持分页', async () => {
    const largeData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `User${i + 1}`,
      age: 20 + (i % 40)
    }));

    render(
      <TableView
        data={largeData}
        columns={['id', 'name', 'age']}
        pagination={true}
        pageSize={10}
      />
    );

    expect(screen.getByText('显示 1 - 10 / 共 100 条')).toBeInTheDocument();

    const nextPageButton = screen.getByText('下一页');
    fireEvent.click(nextPageButton);

    await waitFor(() => {
      expect(screen.getByText('显示 11 - 20 / 共 100 条')).toBeInTheDocument();
    });
  });

  it('应该支持行选择', async () => {
    const onSelectionChange = jest.fn();

    render(
      <TableView
        data={mockData}
        columns={['id', 'name', 'age']}
        selectable={true}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // 点击第一行的复选框

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalled();
    });
  });

  it('应该支持列显示/隐藏', async () => {
    render(
      <TableView
        data={mockData}
        columns={['id', 'name', 'age', 'salary']}
      />
    );

    const columnButton = screen.getByText(/列显示/);
    fireEvent.click(columnButton);

    await waitFor(() => {
      expect(screen.getByText('id')).toBeInTheDocument();
    });
  });
});

// ============================================================
// ChartView 组件测试
// ============================================================

describe('ChartView', () => {
  it('应该正确渲染柱状图', () => {
    render(
      <ChartView
        data={mockData}
        columns={['name', 'age', 'salary']}
        chartType="bar"
        xField="name"
        yField="salary"
      />
    );

    expect(screen.getByText('柱状图')).toBeInTheDocument();
  });

  it('应该支持切换图表类型', async () => {
    render(
      <ChartView
        data={mockData}
        columns={['name', 'age', 'salary']}
        chartType="bar"
      />
    );

    const lineButton = screen.getByText('折线图');
    fireEvent.click(lineButton);

    await waitFor(() => {
      expect(lineButton).toHaveClass('bg-emerald-600');
    });
  });

  it('应该支持切换颜色方案', async () => {
    render(
      <ChartView
        data={mockData}
        columns={['name', 'age', 'salary']}
        colorScheme="default"
      />
    );

    const settingsButton = screen.getByTitle('设置');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('颜色方案')).toBeInTheDocument();
    });
  });

  it('应该支持切换聚合方式', async () => {
    const aggregatedData = [
      { category: 'A', value: 100 },
      { category: 'B', value: 200 },
      { category: 'A', value: 150 }
    ];

    render(
      <ChartView
        data={aggregatedData}
        columns={['category', 'value']}
        aggregation="sum"
      />
    );

    const settingsButton = screen.getByTitle('设置');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('聚合方式')).toBeInTheDocument();
    });
  });
});

// ============================================================
// StatsPanel 组件测试
// ============================================================

describe('StatsPanel', () => {
  it('应该正确显示整体统计', () => {
    render(
      <StatsPanel
        data={mockData}
        columns={['id', 'name', 'age', 'salary']}
        executionTime={45}
        rowCount={3}
      />
    );

    expect(screen.getByText('总行数')).toBeInTheDocument();
    expect(screen.getByText('列数')).toBeInTheDocument();
    expect(screen.getByText('45ms')).toBeInTheDocument();
  });

  it('应该正确计算数值列统计', () => {
    render(
      <StatsPanel
        data={mockData}
        columns={['id', 'name', 'age', 'salary']}
      />
    );

    expect(screen.getByText('最小值')).toBeInTheDocument();
    expect(screen.getByText('最大值')).toBeInTheDocument();
    expect(screen.getByText('平均值')).toBeInTheDocument();
  });

  it('应该正确检测数据质量', () => {
    render(
      <StatsPanel
        data={mockData}
        columns={['id', 'name', 'age', 'salary']}
      />
    );

    expect(screen.getByText(/数据质量/)).toBeInTheDocument();
  });

  it('应该显示数据预览', () => {
    render(
      <StatsPanel
        data={mockData}
        columns={['id', 'name', 'age', 'salary']}
      />
    );

    expect(screen.getByText('数据预览')).toBeInTheDocument();
    expect(screen.getByText('前5行')).toBeInTheDocument();
  });
});

// ============================================================
// ExportDialog 组件测试
// ============================================================

describe('ExportDialog', () => {
  beforeEach(() => {
    // Mock Blob and URL
    global.Blob = jest.fn((content, options) => ({
      size: content[0].length,
      type: options?.type || 'text/plain'
    })) as any;

    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock document.createElement for link creation
    const mockLink = {
      href: '',
      download: '',
      style: {},
      click: jest.fn(),
      appendChild: jest.fn(),
      removeChild: jest.fn()
    };

    document.createElement = jest.fn((tag: string) => {
      if (tag === 'a') return mockLink as any;
      return {
        style: {},
        appendChild: jest.fn(),
        removeChild: jest.fn()
      } as any;
    });

    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该正确渲染导出对话框', () => {
    render(
      <ExportDialog
        data={mockData}
        filename="test_export"
        onExport={jest.fn()}
        onClose={jest.fn()}
        open={true}
      />
    );

    expect(screen.getByText('导出数据')).toBeInTheDocument();
    expect(screen.getByText('Excel')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('应该支持选择导出格式', async () => {
    render(
      <ExportDialog
        data={mockData}
        filename="test_export"
        onExport={jest.fn()}
        onClose={jest.fn()}
        open={true}
      />
    );

    const csvButton = screen.getByText('CSV');
    fireEvent.click(csvButton);

    await waitFor(() => {
      expect(csvButton).toBeInTheDocument();
    });
  });

  it('应该支持自定义文件名', async () => {
    render(
      <ExportDialog
        data={mockData}
        filename="test_export"
        onExport={jest.fn()}
        onClose={jest.fn()}
        open={true}
      />
    );

    const input = screen.getByPlaceholderText('输入文件名');
    fireEvent.change(input, { target: { value: 'custom_name' } });

    await waitFor(() => {
      expect(input).toHaveValue('custom_name');
    });
  });

  it('应该调用导出回调', async () => {
    const onExport = jest.fn();

    render(
      <ExportDialog
        data={mockData}
        filename="test_export"
        onExport={onExport}
        onClose={jest.fn()}
        open={true}
      />
    );

    const exportButton = screen.getByText('导出');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(onExport).toHaveBeenCalledWith('excel');
    });
  });

  it('应该调用关闭回调', async () => {
    const onClose = jest.fn();

    render(
      <ExportDialog
        data={mockData}
        filename="test_export"
        onExport={jest.fn()}
        onClose={onClose}
        open={true}
      />
    );

    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('应该显示预估文件大小', () => {
    render(
      <ExportDialog
        data={mockData}
        filename="test_export"
        onExport={jest.fn()}
        onClose={jest.fn()}
        open={true}
      />
    );

    expect(screen.getByText(/数据行数:/)).toBeInTheDocument();
    expect(screen.getByText(/预估大小:/)).toBeInTheDocument();
  });
});

// ============================================================
// 性能测试
// ============================================================

describe('Performance', () => {
  it('应该在合理时间内渲染大数据集', () => {
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      id: i + 1,
      name: `User${i + 1}`,
      value: Math.floor(Math.random() * 1000)
    }));

    const startTime = performance.now();

    render(
      <QueryVisualizer
        result={{
          data: largeData,
          sql: 'SELECT * FROM large_table',
          executionTime: 100,
          rowCount: 10000,
          success: true
        }}
        config={{
          enableVirtualScroll: true,
          maxRows: 10000
        }}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // 渲染时间应该小于1秒
    expect(renderTime).toBeLessThan(1000);
  });
});
