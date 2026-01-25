/**
 * 数据预览组件
 *
 * 功能：
 * - 工作表选择器
 * - 数据表格（可排序、筛选）
 * - 数据统计（行数、列数）
 * - 前100行预览
 *
 * @version 2.0.0
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  Sheet,
  ArrowUpDown,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Database,
  Rows,
  Columns
} from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

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

  // 过滤和排序后的数据
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

  // 分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedData.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedData, currentPage]);

  // 总页数
  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);

  // 处理排序
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
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
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {excelData?.fileName || '数据文件'}
                </h2>
                <p className="text-sm text-slate-500">Excel数据预览</p>
              </div>
            </div>

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

        {/* 工作表选择器 */}
        {sheetNames.length > 1 && (
          <div className="mt-4">
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              选择工作表
            </label>
            <div className="flex flex-wrap gap-2">
              {sheetNames.map(name => (
                <button
                  key={name}
                  onClick={() => {
                    onSheetChange(name);
                    setCurrentPage(1);
                  }}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
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
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="搜索数据..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSortColumn(null);
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
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
      </div>

      {/* 数据表格 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 border-b border-slate-200 w-16">
                #
              </th>
              {headers.map(header => (
                <th
                  key={header}
                  onClick={() => handleSort(header)}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span>{header}</span>
                    {sortColumn === header ? (
                      <ArrowUpDown className={`w-3 h-3 text-emerald-500 ${
                        sortDirection === 'desc' ? 'rotate-180' : ''
                      }`} />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 1} className="px-4 py-8 text-center text-slate-400">
                  {searchTerm ? '没有找到匹配的数据' : '暂无数据'}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-slate-400 border-b border-slate-100">
                    {(currentPage - 1) * pageSize + idx + 1}
                  </td>
                  {headers.map(header => (
                    <td
                      key={header}
                      className="px-4 py-3 text-sm text-slate-700 border-b border-slate-100"
                    >
                      {row[header] !== null && row[header] !== undefined
                        ? String(row[header])
                        : <span className="text-slate-300">-</span>
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredAndSortedData.length)} 条，
              共 {filteredAndSortedData.length} 条
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`
                        w-8 h-8 rounded-lg text-sm font-medium transition-colors
                        ${currentPage === pageNum
                          ? 'bg-emerald-500 text-white'
                          : 'border border-slate-200 hover:bg-slate-50'
                        }
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataPreview;
