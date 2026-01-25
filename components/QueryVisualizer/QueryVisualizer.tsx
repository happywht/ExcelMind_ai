/**
 * QueryVisualizer - 查询结果可视化主组件
 *
 * 功能特性：
 * - 表格视图：可排序、可过滤、可分页
 * - 图表视图：自动检测数据类型，生成最佳图表
 * - 统计信息：数值统计、分类统计、空值分析
 * - 导出功能：CSV、Excel、JSON、PNG
 * - 响应式设计：适配各种屏幕尺寸
 * - 性能优化：虚拟滚动、懒加载
 *
 * @author ExcelMind AI Team
 * @version 1.0.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { QueryResult } from '../../services/queryEngine/DataQueryEngine';
import { TableView } from './TableView';
import { ChartView } from './ChartView';
import { StatsPanel } from './StatsPanel';
import { ExportDialog } from './ExportDialog';
import {
  Table,
  BarChart3,
  TrendingUp,
  FileText,
  Download,
  X,
  ChevronDown,
  Settings,
  Eye,
  RefreshCw
} from 'lucide-react';

// ============================================================
// 类型定义
// ============================================================

export interface QueryVisualizerProps {
  /** 查询结果数据 */
  result: QueryResult;

  /** 查询信息 */
  queryInfo?: {
    sql?: string;
    executionTime: number;
    rowCount: number;
    naturalQuery?: string;
  };

  /** 可视化配置 */
  config?: {
    showTable?: boolean;
    showChart?: boolean;
    showStats?: boolean;
    defaultView?: 'table' | 'chart' | 'stats';
    enableVirtualScroll?: boolean;
    maxRows?: number;
  };

  /** 交互回调 */
  onExport?: (format: 'csv' | 'excel' | 'json' | 'png') => void;
  onRefresh?: () => void;
  onEditQuery?: () => void;
}

type ViewMode = 'table' | 'chart' | 'stats';

// ============================================================
// 主组件
// ============================================================

export const QueryVisualizer: React.FC<QueryVisualizerProps> = ({
  result,
  queryInfo,
  config = {},
  onExport,
  onRefresh,
  onEditQuery
}) => {
  // 状态管理
  const [viewMode, setViewMode] = useState<ViewMode>(
    config.defaultView || 'table'
  );
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 配置项默认值
  const showTable = config.showTable !== false;
  const showChart = config.showChart !== false;
  const showStats = config.showStats !== false;
  const enableVirtualScroll = config.enableVirtualScroll !== false;
  const maxRows = config.maxRows || 1000;

  // 提取数据
  const { data, sql, executionTime, rowCount, explanation, plan, error, success } =
    result;

  // 检查是否有数据
  const hasData = useMemo(() => {
    return data && Array.isArray(data) && data.length > 0;
  }, [data]);

  // 获取列名
  const columns = useMemo(() => {
    if (!hasData) return [];
    return Object.keys(data[0]);
  }, [hasData, data]);

  // 处理刷新
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  // 处理导出
  const handleExport = useCallback((format: 'csv' | 'excel' | 'json' | 'png') => {
    if (onExport) {
      onExport(format);
    }
    setShowExportDialog(false);
  }, [onExport]);

  // 切换视图模式
  const switchView = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // 错误状态
  if (!success || error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 border border-red-200 rounded-xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-3">
            <X className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-1">查询执行失败</h3>
          <p className="text-sm text-red-600 max-w-md">{error || '未知错误'}</p>
        </div>
      </div>
    );
  }

  // 无数据状态
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-3">
            <FileText className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">暂无数据</h3>
          <p className="text-sm text-slate-500">查询结果为空</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        {/* 左侧：视图切换 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            {showTable && (
              <button
                onClick={() => switchView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
                title="表格视图"
              >
                <Table className="w-4 h-4" />
                表格
              </button>
            )}
            {showChart && (
              <button
                onClick={() => switchView('chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'chart'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
                title="图表视图"
              >
                <BarChart3 className="w-4 h-4" />
                图表
              </button>
            )}
            {showStats && (
              <button
                onClick={() => switchView('stats')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'stats'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
                title="统计信息"
              >
                <TrendingUp className="w-4 h-4" />
                统计
              </button>
            )}
          </div>
        </div>

        {/* 中间：查询信息 */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Eye className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{rowCount.toLocaleString()}</span>
            <span className="text-slate-400">行</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <RefreshCw className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{executionTime}</span>
            <span className="text-slate-400">ms</span>
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onEditQuery && (
            <button
              onClick={onEditQuery}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="编辑查询"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowExportDialog(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 rounded-lg transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ${
              showSettings ? 'bg-slate-100' : ''
            }`}
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-6 text-sm">
            <label className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={enableVirtualScroll}
                onChange={(e) => {
                  // 这里可以更新配置
                  console.log('Virtual scroll:', e.target.checked);
                }}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              虚拟滚动
            </label>
            <label className="flex items-center gap-2 text-slate-700">
              <span className="text-slate-500">最大行数:</span>
              <select
                defaultValue={maxRows}
                className="px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="100">100</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
                <option value="5000">5000</option>
                <option value="10000">10000</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {/* 查询说明 */}
      {explanation && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <p className="text-sm text-blue-700">{explanation}</p>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'table' && showTable && (
          <TableView
            data={data}
            columns={columns}
            enableVirtualScroll={enableVirtualScroll}
            maxRows={maxRows}
          />
        )}
        {viewMode === 'chart' && showChart && (
          <ChartView data={data} columns={columns} />
        )}
        {viewMode === 'stats' && showStats && (
          <StatsPanel
            data={data}
            columns={columns}
            executionTime={executionTime}
            rowCount={rowCount}
          />
        )}
      </div>

      {/* 导出对话框 */}
      {showExportDialog && (
        <ExportDialog
          data={data}
          filename={`query_result_${Date.now()}`}
          onExport={handleExport}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
};

export default QueryVisualizer;
