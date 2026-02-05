/**
 * SheetSelector 使用示例
 *
 * 展示如何在应用中使用 SheetSelector 组件
 */

import React, { useState } from 'react';
import SheetSelector from './SheetSelector';

// 示例数据
const exampleSheets = {
  '员工信息': [
    { id: 1, name: '张三', department: '技术部', position: '工程师' },
    { id: 2, name: '李四', department: '产品部', position: '产品经理' },
    { id: 3, name: '王五', department: '设计部', position: '设计师' }
  ],
  '部门信息': [
    { department: '技术部', budget: 100000, location: 'A栋' },
    { department: '产品部', budget: 80000, location: 'B栋' },
    { department: '设计部', budget: 60000, location: 'C栋' }
  ],
  '项目配置': [
    { project: '项目A', status: '进行中', priority: '高' },
    { project: '项目B', status: '已完成', priority: '中' }
  ]
};

/**
 * 示例组件
 */
const SheetSelectorExample: React.FC = () => {
  const [primarySheet, setPrimarySheet] = useState('员工信息');
  const [enabledSheets, setEnabledSheets] = useState<string[]>(['部门信息']);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Sheet选择器示例</h1>
        <p className="text-slate-600 mb-8">
          选择主数据表和辅助表，用于文档生成和跨Sheet查找
        </p>

        <SheetSelector
          sheets={exampleSheets}
          primarySheet={primarySheet}
          onPrimarySheetChange={setPrimarySheet}
          enabledSheets={enabledSheets}
          onEnabledSheetsChange={setEnabledSheets}
        />

        {/* 状态展示 */}
        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">当前状态</h2>
          <div className="space-y-2 text-sm">
            <p className="text-slate-600">
              <span className="font-medium">主数据表:</span> {primarySheet}
            </p>
            <p className="text-slate-600">
              <span className="font-medium">启用的辅助表:</span>{' '}
              {enabledSheets.length > 0 ? enabledSheets.join(', ') : '无'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SheetSelectorExample;
