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
      const sheetData = data as any[];
      const rowCount = sheetData.length;
      const columnCount = sheetData.length > 0 ? Object.keys(sheetData[0]).length : 0;
      const sampleFields = sheetData.length > 0
        ? Object.keys(sheetData[0]).slice(0, 3)
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
        <div className="bg-slate-50/50 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-1.5 rounded-lg">
              <Database className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">主数据表</h3>
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-4">
          {/* 下拉选择器 */}
          {/* 下拉选择器 */}
          <div className="mb-3">
            <div className="relative group">
              <select
                value={primarySheet}
                onChange={(e) => onPrimarySheetChange(e.target.value)}
                disabled={disabled}
                className={`
                  w-full px-4 py-2.5 pr-10 rounded-xl border appearance-none
                  text-sm font-medium text-slate-700 transition-all bg-slate-50
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white
                  ${disabled
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'border-slate-200 hover:border-emerald-400 cursor-pointer'
                  }
                `}
              >
                {sheetInfoList.map(info => (
                  <option key={info.name} value={info.name}>
                    {info.name}
                  </option>
                ))}
              </select>
              <div className={`
                absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center pointer-events-none rounded-r-xl transition-colors
                ${disabled ? 'text-slate-400' : 'text-slate-500 group-hover:text-emerald-500'}
              `}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          {/* 统计信息 - 极简行内展示 */}
          {primarySheetInfo && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-3">
              {/* 第一行：基础统计 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <Rows className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">数据行</span>
                    <span className="text-xs font-bold text-slate-700 font-mono leading-none">{primarySheetInfo.rowCount}</span>
                  </div>
                </div>

                <div className="w-px h-6 bg-slate-200"></div>

                <div className="flex items-center gap-2">
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <Columns className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">字段列</span>
                    <span className="text-xs font-bold text-slate-700 font-mono leading-none">{primarySheetInfo.columnCount}</span>
                  </div>
                </div>
              </div>

              {/* 第二行：字段预览 */}
              {primarySheetInfo.sampleFields.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-400 font-medium">包含字段预览:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {primarySheetInfo.sampleFields.slice(0, 3).map(f => (
                      <span key={f} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 max-w-full truncate">
                        {f}
                      </span>
                    ))}
                    {primarySheetInfo.sampleFields.length > 3 && (
                      <span className="text-[10px] text-slate-400 self-center">...</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 辅助表启用区 */}
      {auxiliarySheetList.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* 头部 */}
          <div className="bg-slate-50/50 border-b border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">辅助数据表</h3>
              </div>

              {/* 全选按钮 */}
              <button
                onClick={handleToggleAll}
                disabled={disabled}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${disabled
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-dashed'
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
                    rounded-xl border p-3 transition-all
                    ${disabled
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : isEnabled
                        ? 'bg-emerald-50/50 border-emerald-200 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm cursor-pointer'
                    }
                  `}
                  onClick={() => !disabled && handleToggleSheet(info.name)}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={`
                      flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all
                      ${disabled
                        ? 'bg-slate-100 border-slate-300'
                        : isEnabled
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'bg-white border-slate-300 group-hover:border-emerald-400'
                      }
                    `}>
                      {isEnabled && (
                        <Check className="w-3.5 h-3.5 text-white" />
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
