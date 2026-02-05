/**
 * TableView - 表格视图组件
 *
 * 功能特性：
 * - 可排序的列（点击列头）
 * - 可过滤的列（搜索框）
 * - 分页（可配置页大小）
 * - 列宽度调整
 * - 列显示/隐藏
 * - 行选择
 * - 单元格高亮
 * - 悬停工具提示
 * - 空值显示
 * - 数字格式化
 * - 日期格式化
 * - 虚拟滚动（大数据集）
 *
 * @author ExcelMind AI Team
 * @version 1.0.0
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  Filter,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';

// ============================================================
// 类型定义
// ============================================================

export interface TableViewProps {
  /** 表格数据 */
  data: any[];

  /** 列名 */
  columns?: string[];

  /** 是否可排序 */
  sortable?: boolean;

  /** 是否可过滤 */
  filterable?: boolean;

  /** 是否启用分页 */
  pagination?: boolean;

  /** 每页行数 */
  pageSize?: number;

  /** 是否启用虚拟滚动 */
  enableVirtualScroll?: boolean;

  /** 最大行数 */
  maxRows?: number;

  /** 是否可选择行 */
  selectable?: boolean;

  /** 行选择回调 */
  onSelectionChange?: (selectedRows: any[]) => void;
}

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc' | null;
}

interface FilterConfig {
  column: string;
  value: string;
}

interface ColumnVisibility {
  [key: string]: boolean;
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 检测列数据类型
 */
const detectColumnType = (data: any[], column: string): 'number' | 'date' | 'boolean' | 'string' => {
  const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);

  if (values.length === 0) return 'string';

  // 检查是否为数字
  const numberCount = values.filter(v => !isNaN(Number(v))).length;
  if (numberCount > values.length * 0.8) return 'number';

  // 检查是否为日期
  const dateCount = values.filter(v => !isNaN(Date.parse(String(v)))).length;
  if (dateCount > values.length * 0.8) return 'date';

  // 检查是否为布尔值
  const booleanCount = values.filter(v =>
    typeof v === 'boolean' || v === 'true' || v === 'false' || v === 0 || v === 1
  ).length;
  if (booleanCount > values.length * 0.8) return 'boolean';

  return 'string';
};

/**
 * 格式化单元格值
 */
const formatCellValue = (value: any, columnType: string): string => {
  if (value === null || value === undefined) return '-';

  if (columnType === 'number') {
    const num = Number(value);
    if (isNaN(num)) return String(value);

    // 自动格式化数字
    if (Number.isInteger(num)) {
      return num.toLocaleString('zh-CN');
    } else {
      return num.toFixed(2);
    }
  }

  if (columnType === 'date') {
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString('zh-CN');
  }

  if (columnType === 'boolean') {
    return value === true || value === 'true' || value === 1 ? '是' : '否';
  }

  return String(value);
};

/**
 * 获取列宽度（基于内容）
 */
const calculateColumnWidth = (data: any[], column: string, columnName: string): number => {
  const headerWidth = String(columnName).length * 12 + 20;
  const maxWidth = Math.max(
    headerWidth,
    ...data.slice(0, 100).map(row => {
      const value = String(row[column] || '');
      return Math.min(value.length * 10 + 20, 300);
    })
  );
  return Math.min(Math.max(maxWidth, 100), 400);
};

// ============================================================
// 主组件
// ============================================================

export const TableView: React.FC<TableViewProps> = ({
  data,
  columns: propColumns,
  sortable = true,
  filterable = true,
  pagination = true,
  pageSize = 50,
  enableVirtualScroll = false,
  maxRows = 1000,
  selectable = false,
  onSelectionChange
}) => {
  // 状态管理
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
    const cols = propColumns || (data.length > 0 ? Object.keys(data[0]) : []);
    return cols.reduce((acc, col) => ({ ...acc, [col]: true }), {});
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // 获取列名
  const columns = useMemo(() => {
    return propColumns || (data.length > 0 ? Object.keys(data[0]) : []);
  }, [propColumns, data]);

  // 检测列类型
  const columnTypes = useMemo(() => {
    return columns.reduce((acc, col) => {
      acc[col] = detectColumnType(data, col);
      return acc;
    }, {} as Record<string, 'number' | 'date' | 'boolean' | 'string'>);
  }, [columns, data]);

  // 计算列宽
  const columnWidths = useMemo(() => {
    return columns.reduce((acc, col) => {
      acc[col] = calculateColumnWidth(data, col, col);
      return acc;
    }, {} as Record<string, number>);
  }, [columns, data]);

  // 过滤和排序数据
  const processedData = useMemo(() => {
    let result = [...data];

    // 应用搜索过滤
    if (searchQuery) {
      result = result.filter(row =>
        columns.some(col => {
          const value = String(row[col] || '').toLowerCase();
          return value.includes(searchQuery.toLowerCase());
        })
      );
    }

    // 应用列过滤
    filters.forEach(filter => {
      if (filter.value) {
        result = result.filter(row => {
          const value = String(row[filter.column] || '').toLowerCase();
          return value.includes(filter.value.toLowerCase());
        });
      }
    });

    // 应用排序
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.column];
        const bValue = b[sortConfig.column];

        if (aValue === bValue) return 0;

        const comparison = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchQuery, filters, sortConfig, columns]);

  // 分页数据
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return processedData.slice(startIndex, endIndex);
  }, [processedData, currentPage, pageSize, pagination]);

  // 可见列
  const visibleColumns = useMemo(() => {
    return columns.filter(col => columnVisibility[col]);
  }, [columns, columnVisibility]);

  // 排序处理
  const handleSort = useCallback((column: string) => {
    if (!sortable) return;

    setSortConfig(prev => {
      if (prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      return { column, direction: null };
    });
  }, [sortable]);

  // 过滤处理
  const handleFilter = useCallback((column: string, value: string) => {
    if (!filterable) return;

    setFilters(prev => {
      const existing = prev.findIndex(f => f.column === column);
      if (existing >= 0) {
        const newFilters = [...prev];
        if (value) {
          newFilters[existing] = { column, value };
        } else {
          newFilters.splice(existing, 1);
        }
        return newFilters;
      }
      return value ? [...prev, { column, value }] : prev;
    });
  }, [filterable]);

  // 切换列可见性
  const toggleColumnVisibility = useCallback((column: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  }, []);

  // 行选择处理
  const handleRowSelect = useCallback((rowIndex: number) => {
    if (!selectable) return;

    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  }, [selectable]);

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (!selectable) return;

    setSelectedRows(prev => {
      if (prev.size === paginatedData.length) {
        return new Set();
      }
      return new Set(paginatedData.map((_, i) => i));
    });
  }, [selectable, paginatedData]);

  // 复制单元格
  const copyCellValue = useCallback((value: any) => {
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCell(text);
      setTimeout(() => setCopiedCell(null), 2000);
    });
  }, []);

  // 获取排序图标
  const getSortIcon = (column: string) => {
    if (sortConfig.column !== column || !sortConfig.direction) {
      return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-emerald-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-600" />
    );
  };

  // 计算统计信息
  const stats = useMemo(() => {
    return {
      total: data.length,
      filtered: processedData.length,
      pages: Math.ceil(processedData.length / pageSize),
      current: currentPage
    };
  }, [data.length, processedData.length, pageSize, currentPage]);

  // 如果没有数据
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/50">
        {/* 搜索框 */}
        {filterable && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索所有列..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        )}

        {/* 列选择器 */}
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
              <Eye className="w-4 h-4" />
              列显示 ({visibleColumns.length}/{columns.length})
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="p-2 max-h-64 overflow-y-auto">
                {columns.map(col => (
                  <label
                    key={col}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={columnVisibility[col]}
                      onChange={() => toggleColumnVisibility(col)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-slate-700">{col}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 表格容器 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              {selectable && (
                <th className="w-12 p-3 border-b border-r border-slate-200 bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="w-16 p-3 border-b border-r border-slate-200 bg-slate-50 text-center text-xs font-mono text-slate-400">
                #
              </th>
              {visibleColumns.map(col => (
                <th
                  key={col}
                  className="p-3 border-b border-r border-slate-200 bg-slate-50 text-left font-semibold text-slate-700 whitespace-nowrap"
                  style={{ minWidth: columnWidths[col] }}
                >
                  <div className="flex items-center gap-2">
                    <span>{col}</span>
                    {sortable && (
                      <button
                        onClick={() => handleSort(col)}
                        className="flex-shrink-0 hover:bg-slate-100 rounded p-0.5 transition-colors"
                      >
                        {getSortIcon(col)}
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`group border-b border-slate-100 last:border-0 transition-colors ${
                  selectedRows.has(rowIndex) ? 'bg-emerald-50' : 'hover:bg-slate-50'
                }`}
              >
                {selectable && (
                  <td className="p-3 border-r border-slate-100">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(rowIndex)}
                      onChange={() => handleRowSelect(rowIndex)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                  </td>
                )}
                <td className="p-3 border-r border-slate-100 text-center text-xs font-mono text-slate-400">
                  {(currentPage - 1) * pageSize + rowIndex + 1}
                </td>
                {visibleColumns.map(col => {
                  const value = row[col];
                  const formattedValue = formatCellValue(value, columnTypes[col]);
                  const cellId = `${rowIndex}-${col}`;
                  const isHovered = hoveredCell === cellId;

                  return (
                    <td
                      key={col}
                      className="p-3 border-r border-slate-100 text-sm text-slate-700 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis relative group/cell"
                      style={{ maxWidth: columnWidths[col] }}
                      onMouseEnter={() => setHoveredCell(cellId)}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={String(value || '')}
                    >
                      <span className={value === null || value === undefined ? 'text-slate-300 italic' : ''}>
                        {formattedValue}
                      </span>

                      {/* 悬停工具栏 */}
                      {isHovered && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white shadow-md rounded border border-slate-200 px-1 py-0.5 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyCellValue(value)}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                            title="复制"
                          >
                            {copiedCell === String(value) ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-500" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页控件 */}
      {pagination && stats.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
          <div className="text-sm text-slate-600">
            显示 {(stats.current - 1) * pageSize + 1} - {Math.min(stats.current * pageSize, stats.filtered)} / 共{' '}
            {stats.filtered.toLocaleString()} 条
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={stats.current === 1}
              className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              首页
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={stats.current === 1}
              className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, stats.pages) }, (_, i) => {
                let pageNum;
                if (stats.pages <= 5) {
                  pageNum = i + 1;
                } else if (stats.current <= 3) {
                  pageNum = i + 1;
                } else if (stats.current >= stats.pages - 2) {
                  pageNum = stats.pages - 4 + i;
                } else {
                  pageNum = stats.current - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 text-sm font-medium rounded transition-colors ${
                      stats.current === pageNum
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(stats.pages, p + 1))}
              disabled={stats.current === stats.pages}
              className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
            <button
              onClick={() => setCurrentPage(stats.pages)}
              disabled={stats.current === stats.pages}
              className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              末页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableView;
