/**
 * Sheet选择器组件
 *
 * 功能：
 * - 选择主数据sheet（用于批量生成文档）
 * - 启用/禁用辅助sheet（用于跨Sheet查找）
 * - 查看每个sheet的字段信息
 *
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import {
  Database,
  Table,
  Check,
  ChevronDown,
  Rows,
  Columns,
  FileText
} from 'lucide-react';

/**
 * 组件属性接口
 */
interface SheetSelectorProps {
  /** 所有sheets数据 */
  sheets: { [sheetName: string]: any[] };
  /** 当前选中的主sheet */
  primarySheet: string;
  /** 主sheet变更回调 */
  onPrimarySheetChange: (sheet: string) => void;
  /** 启用的辅助sheets */
  enabledSheets: string[];
  /** 辅助sheets变更回调 */
  onEnabledSheetsChange: (sheets: string[]) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * Sheet信息接口
 */
interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
  sampleFields: string[];
}

/**
 * Sheet选择器组件
 */
const SheetSelector: React.FC<SheetSelectorProps> = ({
  sheets,
  primarySheet,
  onPrimarySheetChange,
  enabledSheets,
  onEnabledSheetsChange,
  disabled = false
}) => {
  /**
   * 计算所有sheet的信息
   */
  const sheetInfoList = useMemo((): SheetInfo[] => {
    return Object.entries(sheets).map(([name, data]) => {
      const rowCount = data.length;
      const columnCount = data.length > 0 ? Object.keys(data[0]).length : 0;
      const sampleFields = data.length > 0
        ? Object.keys(data[0]).slice(0, 3)
        : [];

      return {
        name,
        rowCount,
        columnCount,
        sampleFields
      };
    });
  }, [sheets]);

  /**
   * 获取主sheet信息
   */
  const primarySheetInfo = useMemo(() => {
    return sheetInfoList.find(info => info.name === primarySheet) || sheetInfoList[0];
  }, [sheetInfoList, primarySheet]);

  /**
   * 获取辅助sheet列表（排除主sheet）
   */
  const auxiliarySheetList = useMemo(() => {
    return sheetInfoList.filter(info => info.name !== primarySheet);
  }, [sheetInfoList, primarySheet]);

  /**
   * 处理辅助sheet的启用/禁用
   */
  const handleToggleSheet = (sheetName: string) => {
    if (disabled) return;

    if (enabledSheets.includes(sheetName)) {
      onEnabledSheetsChange(enabledSheets.filter(s => s !== sheetName));
    } else {
      onEnabledSheetsChange([...enabledSheets, sheetName]);
    }
  };

  /**
   * 全选/取消全选辅助sheets
   */
  const handleToggleAll = () => {
    if (disabled) return;

    const allAuxiliaryNames = auxiliarySheetList.map(info => info.name);
    const allEnabled = allAuxiliaryNames.every(name => enabledSheets.includes(name));

    onEnabledSheetsChange(allEnabled ? [] : allAuxiliaryNames);
  };

  /**
   * 检查是否全部启用
   */
  const isAllEnabled = useMemo(() => {
    if (auxiliarySheetList.length === 0) return false;
    return auxiliarySheetList.every(info => enabledSheets.includes(info.name));
  }, [auxiliarySheetList, enabledSheets]);

  /**
   * 检查是否部分启用
   */
  const isPartiallyEnabled = useMemo(() => {
    const enabledCount = auxiliarySheetList.filter(info =>
      enabledSheets.includes(info.name)
    ).length;
    return enabledCount > 0 && enabledCount < auxiliarySheetList.length;
  }, [auxiliarySheetList, enabledSheets]);

  return (
    <div className="space-y-6">
      {/* 主数据表选择区 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">主数据表</h3>
              <p className="text-xs text-slate-500">用于批量生成文档的主要数据源</p>
            </div>
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-4">
          {/* 下拉选择器 */}
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              选择主数据表
            </label>
            <div className="relative">
              <select
                value={primarySheet}
                onChange={(e) => onPrimarySheetChange(e.target.value)}
                disabled={disabled}
                className={`
                  w-full px-4 py-3 pr-10 rounded-lg border-2 appearance-none
                  font-medium text-slate-700 transition-all
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                  ${disabled
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-slate-200 hover:border-emerald-300 cursor-pointer'
                  }
                `}
              >
                {sheetInfoList.map(info => (
                  <option key={info.name} value={info.name}>
                    {info.name} ({info.rowCount} 行 × {info.columnCount} 列)
                  </option>
                ))}
              </select>
              <ChevronDown className={`
                absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors
                ${disabled ? 'text-slate-400' : 'text-slate-500'}
              `} />
            </div>
          </div>

          {/* 统计信息 */}
          {primarySheetInfo && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Table className="w-4 h-4 text-blue-500" />
                  <p className="text-xs font-medium text-slate-600">表名</p>
                </div>
                <p className="text-lg font-bold text-slate-800 truncate">
                  {primarySheetInfo.name}
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <Rows className="w-4 h-4 text-emerald-500" />
                  <p className="text-xs font-medium text-slate-600">数据行数</p>
                </div>
                <p className="text-lg font-bold text-slate-800">
                  {primarySheetInfo.rowCount}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Columns className="w-4 h-4 text-purple-500" />
                  <p className="text-xs font-medium text-slate-600">字段数</p>
                </div>
                <p className="text-lg font-bold text-slate-800">
                  {primarySheetInfo.columnCount}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 辅助表启用区 */}
      {auxiliarySheetList.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">辅助数据表</h3>
                  <p className="text-xs text-slate-500">用于跨Sheet查找的参考数据</p>
                </div>
              </div>

              {/* 全选按钮 */}
              <button
                onClick={handleToggleAll}
                disabled={disabled}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${disabled
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-blue-300'
                  }
                `}
              >
                {isAllEnabled ? '取消全选' : '全选'}
              </button>
            </div>
          </div>

          {/* Sheet列表 */}
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {auxiliarySheetList.map(info => {
              const isEnabled = enabledSheets.includes(info.name);

              return (
                <div
                  key={info.name}
                  className={`
                    rounded-lg border-2 p-4 transition-all
                    ${disabled
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : isEnabled
                        ? 'bg-blue-50 border-blue-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                    }
                  `}
                  onClick={() => !disabled && handleToggleSheet(info.name)}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className={`
                      flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                      ${disabled
                        ? 'bg-slate-200 border-slate-300'
                        : isEnabled
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-slate-300'
                      }
                    `}>
                      {isEnabled && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>

                    {/* Sheet信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-bold text-slate-800">
                          {info.name}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Rows className="w-3 h-3" />
                            {info.rowCount} 行
                          </span>
                          <span className="flex items-center gap-1">
                            <Columns className="w-3 h-3" />
                            {info.columnCount} 列
                          </span>
                        </div>
                      </div>

                      {/* 字段预览 */}
                      {info.sampleFields.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-500">主要字段:</span>
                          {info.sampleFields.map(field => (
                            <span
                              key={field}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md font-mono"
                            >
                              {field}
                            </span>
                          ))}
                          {info.columnCount > 3 && (
                            <span className="text-xs text-slate-400">
                              +{info.columnCount - 3} 个字段
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部提示 */}
          {enabledSheets.length > 0 && (
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
              <p className="text-sm text-blue-700">
                <span className="font-medium">已启用 {enabledSheets.length} 个辅助表</span>
                {' '}可用于跨Sheet查找和关联数据
              </p>
            </div>
          )}
        </div>
      ) : (
        /* 单sheet提示 */
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-slate-700 mb-2">
            当前只有一个工作表
          </h4>
          <p className="text-sm text-slate-500">
            上传包含多个工作表的Excel文件可启用跨Sheet查找功能
          </p>
        </div>
      )}
    </div>
  );
};

export default SheetSelector;
