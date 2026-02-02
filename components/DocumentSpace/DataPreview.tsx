/**
 * 数据预览组件
 *
 * 功能：
 * - 工作表选择器
 * - 虚拟化数据表格（可排序、筛选，支持大数据集）
 * - 数据统计（行数、列数）
 * - 性能优化：使用虚拟化渲染，支持10000+行数据
 *
 * @version 3.0.0
 * @performance 使用react-window实现虚拟化，大幅提升大数据集性能
 */

import React, { useState, useMemo } from 'react';
import {
  Sheet,
  ArrowUpDown,
  Search,
  Filter,
  Database,
  Rows,
  Columns
} from 'lucide-react';
import VirtualizedDataTable from './VirtualizedDataTable';

interface DataPreviewProps {
  excelData: any;
  currentSheetName: string;
  onSheetChange: (sheetName: string) => void;
}

const DataPreview: React.FC<DataPreviewProps> = ({
  excelData,
  currentSheetName,
  onSheetChange
}) => {

  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 当前工作表数据
  const currentSheetData = useMemo(() => {
    if (!excelData || !excelData.sheets) return [];
    return excelData.sheets[currentSheetName] || [];
  }, [excelData, currentSheetName]);

  // 表头
  const headers = useMemo(() => {
    if (currentSheetData.length === 0) return [];
    return Object.keys(currentSheetData[0]);
  }, [currentSheetData]);

  // 过滤和排序后的数据（虚拟化表格处理全部数据）
  const filteredAndSortedData = useMemo(() => {
    let data = [...currentSheetData];

    // 搜索过滤
    if (searchTerm) {
      data = data.filter(row =>
        headers.some(header =>
          String(row[header]).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // 排序
    if (sortColumn) {
      data.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = String(aVal).localeCompare(String(bVal), 'zh-CN');
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return data;
  }, [currentSheetData, searchTerm, sortColumn, sortDirection, headers]);

  // 处理排序
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // 重置筛选
  const handleResetFilters = () => {
    setSortColumn(null);
    setSearchTerm('');
  };

  // 工作表列表
  const sheetNames = useMemo(() => {
    if (!excelData || !excelData.sheets) return [];
    return Object.keys(excelData.sheets);
  }, [excelData]);

  // 数据统计
  const statistics = useMemo(() => {
    const metadata = excelData?.metadata?.[currentSheetName];
    return {
      rowCount: currentSheetData.length,
      columnCount: headers.length,
      totalSheets: sheetNames.length
    };
  }, [currentSheetData, headers, sheetNames, excelData, currentSheetName]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 头部信息 */}
      <div className="flex-shrink-0 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-1.5 rounded-lg">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-800">
              {excelData?.fileName || '数据文件'}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600">{statistics.rowCount} 行</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600">{statistics.columnCount} 列</span>

            {/* 统计信息 */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Rows className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-500">数据行数</p>
                  <p className="text-lg font-bold text-slate-800">{statistics.rowCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Columns className="w-4 h-4 text-teal-500" />
                <div>
                  <p className="text-xs text-slate-500">列数</p>
                  <p className="text-lg font-bold text-slate-800">{statistics.columnCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Sheet className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-slate-500">工作表</p>
                  <p className="text-lg font-bold text-slate-800">{statistics.totalSheets}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {sheetNames.length > 1 && (
          <div className="px-4 py-3 border-b border-slate-200 bg-white">
            <label className="text-base font-medium text-slate-700 mb-2 block">
              选择工作表
            </label>
            <div className="flex flex-wrap gap-2">
              {sheetNames.map(name => (
                <button
                  key={name}
                  onClick={() => onSheetChange(name)}
                  className={`
                    px-4 py-2 rounded-lg text-base font-medium transition-all duration-200
                    ${currentSheetName === name
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
                    }
                  `}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 工具栏 */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索数据..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-base font-medium hover:bg-slate-200 hover:shadow-sm transition-all duration-200 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              重置筛选
            </button>
          </div>
        </div>

        {searchTerm && (
          <div className="mt-2 text-xs text-slate-500">
            找到 <span className="font-bold text-emerald-600">{filteredAndSortedData.length}</span> 条结果
          </div>
        )}

        {/* 数据统计提示 */}
        <div className="mt-2 text-xs text-slate-500">
          总数据: <span className="font-bold text-slate-700">{currentSheetData.length}</span> 行 |
          {searchTerm && ` 筛选后: ${filteredAndSortedData.length} 行 |`}
          {filteredAndSortedData.length > 1000 && (
            <span className="text-emerald-600 ml-1">已启用虚拟化渲染，流畅浏览大数据集</span>
          )}
        </div>
      </div>

      {/* 虚拟化数据表格 */}
      <div className="flex-1 p-4 overflow-hidden">
        <VirtualizedDataTable
          data={filteredAndSortedData}
          headers={headers}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          height={600}
          rowHeight={40}
          headerHeight={48}
        />
      </div>
    </div>
  );
};

export default DataPreview;
