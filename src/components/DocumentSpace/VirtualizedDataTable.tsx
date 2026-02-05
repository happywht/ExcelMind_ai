/**
 * 简化的数据表格组件
 * 
 * 功能:
 * - 固定表头
 * - 滚动表格
 * - 支持排序
 * - 简单高效,无需额外依赖
 *
 * @version 2.0.0 - 简化版本,移除react-window依赖
 */

import React, { useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';

interface VirtualizedDataTableProps {
  /** 表格数据 */
  data: Record<string, any>[];
  /** 表头列名 */
  headers: string[];
  /** 排序列 */
  sortColumn: string | null;
  /** 排序方向 */
  sortDirection: 'asc' | 'desc';
  /** 行高度(默认40px) */
  rowHeight?: number;
  /** 表头高度(默认48px) */
  headerHeight?: number;
  /** 表格高度 */
  height?: number;
  /** 排序回调 */
  onSort?: (column: string) => void;
  /** 加载状态 */
  loading?: boolean;
}

/**
 * 简化的数据表格组件
 * 使用普通滚动,适合中小型数据集(< 5000行)
 */
const VirtualizedDataTable: React.FC<VirtualizedDataTableProps> = ({
  data,
  headers,
  sortColumn,
  sortDirection,
  rowHeight = 40,
  headerHeight = 48,
  height = 600,
  onSort,
  loading = false
}) => {

  // 计算列宽(平均分配)
  const columnWidth = useMemo(() => {
    if (headers.length === 0) return 100;
    // 移除错误的 Math.max(120, ...) 逻辑，该逻辑导致宽度变为 120%
    return 100 / headers.length;
  }, [headers.length]);

  // 空数据状态
  if (data.length === 0 && !loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: `${height}px`,
          color: 'rgb(148 163 184)',
          fontSize: '14px',
        }}
      >
        暂无数据
      </div>
    );
  }

  // 加载状态
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: `${height}px`,
          color: 'rgb(148 163 184)',
          fontSize: '14px',
        }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-2"></div>
        加载中...
      </div>
    );
  }

  return (
    <div
      style={{
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto', // 改为 auto 以支持整体滚动（包括Sticky Header）
        border: '1px solid rgb(226 232 240)',
        borderRadius: '8px',
        position: 'relative' // 确保 sticky 上下文
      }}
    >
      {/* 表头 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: headerHeight,
          backgroundColor: 'rgb(248 250 252)',
          borderBottom: '2px solid rgb(226 232 240)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          width: 'fit-content', // 确保宽度适应内容，支持横向滚动
          minWidth: '100%'      // 至少占满容器宽
        }}
      >
        {/* 序号列表头 */}
        <div
          style={{
            width: 60,
            flexShrink: 0,
            padding: '12px 16px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'rgb(71 85 105)',
            borderRight: '1px solid rgb(241 245 249)',
            backgroundColor: 'rgb(248 250 252)' // 确保背景不透明
          }}
        >
          #
        </div>

        {/* 数据列表头 */}
        {headers.map((header) => (
          <div
            key={header}
            onClick={() => onSort && onSort(header)}
            style={{
              width: `${columnWidth}%`,
              minWidth: '120px',
              flexShrink: 0,
              padding: '12px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgb(71 85 105)',
              cursor: onSort ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s',
              borderRight: '1px solid rgb(241 245 249)'
            }}
            className="hover:bg-slate-100"
          >
            <span className="truncate">{header}</span>
            {sortColumn === header && (
              <ArrowUpDown
                className={`w-3 h-3 text-emerald-500 flex-shrink-0 ${sortDirection === 'desc' ? 'rotate-180' : ''
                  }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* 数据行 - 可滚动区域 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            width: 'fit-content', // 宽度适应内容
            minWidth: '100%'
          }}
        >
          {data.map((row, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                minHeight: rowHeight,
                borderBottom: '1px solid rgb(241 245 249)',
                transition: 'background-color 0.2s',
              }}
              className="hover:bg-slate-50"
            >
              {/* 序号列 */}
              <div
                style={{
                  width: 60,
                  flexShrink: 0,
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: 'rgb(148 163 184)',
                  textAlign: 'center',
                  borderRight: '1px solid rgb(241 245 249)'
                }}
              >
                {index + 1}
              </div>
              {/* 数据列 */}
              {headers.map((header) => (
                <div
                  key={`${index}-${header}`}
                  style={{
                    width: `${columnWidth}%`,
                    minWidth: '120px',
                    flexShrink: 0,
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: 'rgb(51 65 85)',
                    borderRight: '1px solid rgb(241 245 249)'
                  }}
                >
                  <div className="truncate" title={String(row[header] || '')}>
                    {String(row[header] || '')}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 数据统计 */}
      {data.length > 0 && (
        <div
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            color: 'rgb(100 116 139)',
            borderTop: '1px solid rgb(226 232 240)',
            backgroundColor: 'rgb(248 250 252)',
          }}
        >
          共 {data.length} 行数据
        </div>
      )}
    </div>
  );
};

export default VirtualizedDataTable;
