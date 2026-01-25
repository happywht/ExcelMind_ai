/**
 * 映射编辑器使用示例
 *
 * 展示如何在应用中集成和使用映射方案编辑器
 */

import React, { useState } from 'react';
import { MappingEditor } from './index';
import { MappingScheme } from '../../types/documentTypes';

/**
 * 示例数据
 */
const EXAMPLE_EXCEL_DATA = [
  {
    '产品名称': 'iPhone 15 Pro',
    '销售额': 9999,
    '类别': '电子产品',
    '库存': 150,
    '日期': '2024-01-15'
  },
  {
    '产品名称': 'MacBook Pro',
    '销售额': 19999,
    '类别': '电子产品',
    '库存': 50,
    '日期': '2024-01-16'
  },
  {
    '产品名称': 'AirPods Pro',
    '销售额': 1299,
    '类别': '配件',
    '库存': 300,
    '日期': '2024-01-17'
  }
];

const EXCEL_HEADERS = ['产品名称', '销售额', '类别', '库存', '日期'];
const TEMPLATE_PLACEHOLDERS = [
  '{{产品名称}}',
  '{{销售额}}',
  '{{类别}}',
  '{{库存状态}}',
  '{{日期}}'
];

/**
 * 示例组件
 */
export const MappingEditorExample: React.FC = () => {
  // 映射方案状态
  const [mappingScheme, setMappingScheme] = useState<MappingScheme>({
    explanation: '产品销售数据映射到产品模板',
    filterCondition: null,
    primarySheet: '产品销售数据',
    mappings: [
      {
        placeholder: '{{产品名称}}',
        excelColumn: '产品名称'
      },
      {
        placeholder: '{{销售额}}',
        excelColumn: '销售额',
        transform: 'Number(value).toLocaleString()'
      }
    ],
    unmappedPlaceholders: ['{{库存状态}}']
  });

  // 配置状态
  const [config, setConfig] = useState({
    readonly: false,
    showAiSuggestions: true,
    allowManualAdd: true,
    showPreview: true,
    showValidation: true
  });

  /**
   * 处理AI自动映射
   */
  const handleAutoMap = async (): Promise<MappingScheme> => {
    // 模拟AI映射生成
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          explanation: '基于语义相似度自动匹配字段',
          filterCondition: null,
          primarySheet: '产品销售数据',
          mappings: [
            {
              placeholder: '{{产品名称}}',
              excelColumn: '产品名称'
            },
            {
              placeholder: '{{销售额}}',
              excelColumn: '销售额',
              transform: 'Number(value).toLocaleString()'
            },
            {
              placeholder: '{{类别}}',
              excelColumn: '类别'
            },
            {
              placeholder: '{{库存状态}}',
              excelColumn: '库存',
              transform: 'Number(value) > 100 ? "充足" : "紧张"'
            },
            {
              placeholder: '{{日期}}',
              excelColumn: '日期',
              transform: 'new Date(value).toLocaleDateString("zh-CN")'
            }
          ],
          unmappedPlaceholders: []
        });
      }, 1500);
    });
  };

  /**
   * 处理配置变更
   */
  const handleConfigChange = (key: string, value: boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  /**
   * 导出映射方案
   */
  const handleExport = () => {
    const dataStr = JSON.stringify(mappingScheme, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mapping-scheme.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            映射方案编辑器
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            可视化编辑Excel数据到Word模板的字段映射关系
          </p>
        </div>

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-900 mb-3">显示选项</h2>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.showAiSuggestions}
                onChange={(e) => handleConfigChange('showAiSuggestions', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">AI建议</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.showPreview}
                onChange={(e) => handleConfigChange('showPreview', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">数据预览</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.showValidation}
                onChange={(e) => handleConfigChange('showValidation', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">验证结果</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.readonly}
                onChange={(e) => handleConfigChange('readonly', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">只读模式</span>
            </label>
            <button
              onClick={handleExport}
              className="ml-auto px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
            >
              导出映射方案
            </button>
          </div>
        </div>

        {/* 映射编辑器 */}
        <MappingEditor
          mappingScheme={mappingScheme}
          excelInfo={{
            headers: EXCEL_HEADERS,
            sheets: ['Sheet1'],
            sampleData: EXAMPLE_EXCEL_DATA
          }}
          templateInfo={{
            placeholders: TEMPLATE_PLACEHOLDERS
          }}
          aiInfo={{
            explanation: '基于产品销售数据和产品模板的字段匹配',
            confidence: 0.92
          }}
          config={config}
          onChange={setMappingScheme}
          onAutoMap={handleAutoMap}
        />

        {/* 当前映射方案JSON预览 */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-900 mb-3">
            映射方案JSON
          </h2>
          <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-64">
            {JSON.stringify(mappingScheme, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default MappingEditorExample;
