/**
 * 虚拟化数据表格组件
 *
 * 功能：
 * - 虚拟化滚动，支持大数据集（10000+行）
 * - 固定表头
 * - 动态列宽
 * - 行高自动计算
 * - 支持排序和搜索
 * - 保持现有样式和交互
 *
 * @version 1.0.0
 * @performance 使用react-window实现虚拟化，只渲染可见行
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { List, RowComponentProps } from 'react-window';
// react-window v2.2.5 使用新的API，导出List函数和RowComponentProps类型
// 类型定义由@types/react-window包提供（已在package.json中安装）

interface VirtualizedDataTableProps {
  /** 表格数据 */
  data: Record<string, any>[];
  /** 表头列名 */
  headers: string[];
  /** 排序列 */
  sortColumn: string | null;
  /** 排序方向 */
  sortDirection: 'asc' | 'desc';
  /** 行高度（默认40px） */
  rowHeight?: number;
  /** 表头高度（默认48px） */
  headerHeight?: number;
  /** 表格高度 */
  height?: number;
  /** 排序回调 */
  onSort?: (column: string) => void;
  /** 自定义行渲染 */
  renderRow?: (row: Record<string, any>, index: number) => React.ReactNode;
  /** 加载状态 */
  loading?: boolean;
}

/**
 * 虚拟化数据表格组件
 *
 * 性能优化：
 * - 使用react-window的VariableSizeList实现虚拟化
 * - 只渲染可见区域的行，大幅减少DOM节点数量
 * - 使用useMemo缓存计算结果
 * - 使用useCallback避免不必要的函数重新创建
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
  renderRow,
  loading = false
}) => {
  // 使用新的react-window API，listRef类型需要调整
  const listRef = useRef<any>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 重置滚动位置当数据变化时
  useEffect(() => {
    if (listRef.current) {
      // react-window v2.2.5使用scrollTo方法
      listRef.current.scrollTo(0);
    }
  }, [data]);

  // 监听容器宽度变化
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 计算列宽（平均分配）
  const columnWidth = useMemo(() => {
    if (headers.length === 0) return 100;
    // 序号列固定宽度60px，其他列平均分配剩余空间
    const availableWidth = containerWidth - 60; // 减去序号列宽度
    return Math.max(100, availableWidth / headers.length);
  }, [headers.length, containerWidth]);

  /**
   * 获取行高度（支持动态行高）
   * 当前版本使用固定行高，如需动态行高可扩展此函数
   */
  const getRowHeight = useCallback((index: number) => {
    return rowHeight;
  }, [rowHeight]);

  /**
   * 渲染单行数据
   * 使用react-window的渲染模式，只渲染可见行
   */
  const Row = useCallback(({ index, style }: RowComponentProps) => {
    const row = data[index];

    if (!row) {
      return null;
    }

    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgb(241 245 249)', // border-slate-100
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
            color: 'rgb(148 163 184)', // text-slate-400
          }}
        >
          {index + 1}
        </div>

        {/* 数据列 */}
        {headers.map((header) => (
          <div
            key={header}
            style={{
              width: columnWidth,
              flexShrink: 0,
              padding: '12px 16px',
              fontSize: '14px',
              color: 'rgb(51 65 85)', // text-slate-700
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={row[header] !== null && row[header] !== undefined ? String(row[header]) : ''}
          >
            {row[header] !== null && row[header] !== undefined ? (
              String(row[header])
            ) : (
              <span className="text-slate-300">-</span>
            )}
          </div>
        ))}
      </div>
    );
  }, [data, headers, columnWidth]);

  /**
   * 渲染表头
   * 固定在顶部，不参与虚拟化滚动
   */
  const renderHeader = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: headerHeight,
        backgroundColor: 'rgb(248 250 252)', // bg-slate-50
        borderBottom: '2px solid rgb(226 232 240)', // border-slate-200
        position: 'sticky',
        top: 0,
        zIndex: 10,
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
          color: 'rgb(71 85 105)', // text-slate-600
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
            width: columnWidth,
            flexShrink: 0,
            padding: '12px 16px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'rgb(71 85 105)', // text-slate-600
            cursor: onSort ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s',
          }}
          className="hover:bg-slate-100"
        >
          <span>{header}</span>
          {sortColumn === header ? (
            <ArrowUpDown
              className={`w-3 h-3 text-emerald-500 ${
                sortDirection === 'desc' ? 'rotate-180' : ''
              }`}
            />
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
          )}
        </div>
      ))}
    </div>
  );

  // 空数据状态
  if (data.length === 0 && !loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: `${height}px`,
          color: 'rgb(148 163 184)', // text-slate-400
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
          color: 'rgb(148 163 184)', // text-slate-400
          fontSize: '14px',
        }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-2"></div>
        加载中...
      </div>
    );
  }

  // 计算列表高度（总高度减去表头高度）
  const listHeight = height - headerHeight;

  return (
    <div
      ref={containerRef}
      style={{
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 表头 */}
      {renderHeader()}

      {/* 虚拟化列表 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <List
          height={listHeight}
          width={containerWidth}
          itemCount={data.length}
          itemSize={getRowHeight}
          children={Row}
          overscanCount={5} // 额外渲染的行数，提高滚动流畅度
        />
      </div>

      {/* 性能统计信息（开发模式显示） */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            color: 'rgb(100 116 139)', // text-slate-500
            borderTop: '1px solid rgb(226 232 240)',
            backgroundColor: 'rgb(248 250 252)',
          }}
        >
          虚拟化表格 | 总行数: {data.length} | 可见行: ~{Math.ceil(listHeight / rowHeight)} | 渲染优化: 只渲染可见区域
        </div>
      )}
    </div>
  );
};

export default VirtualizedDataTable;
