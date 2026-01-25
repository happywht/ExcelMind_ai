/**
 * 文档生成引擎配置组件
 *
 * 允许用户选择生成引擎和配置选项
 */

import React, { useState } from 'react';

/**
 * 生成引擎类型
 */
type GenerationEngine = 'docx-templates' | 'docxtemplater';

/**
 * 格式保持级别
 */
type FormatPreservationLevel = 'basic' | 'advanced' | 'maximum';

/**
 * 文档生成配置
 */
export interface DocumentGeneratorConfig {
  engine: GenerationEngine;
  preserveFormatting: FormatPreservationLevel;
  enableImageProcessing: boolean;
  enableConditionalFormatting: boolean;
  batchSize: number;
  concurrency: number;
}

/**
 * 组件属性
 */
interface DocumentGeneratorConfigProps {
  config: DocumentGeneratorConfig;
  onConfigChange: (config: DocumentGeneratorConfig) => void;
  disabled?: boolean;
}

/**
 * 引擎信息
 */
interface EngineInfo {
  id: GenerationEngine;
  name: string;
  description: string;
  features: string[];
  formatPreservation: string;
  performance: 'fast' | 'medium' | 'slow';
}

/**
 * 引擎配置数据
 */
const ENGINES: Record<GenerationEngine, EngineInfo> = {
  'docx-templates': {
    id: 'docx-templates',
    name: '标准引擎',
    description: '基于docx-templates库,兼容性好,适合简单文档',
    features: [
      '✓ 基础文本替换',
      '✓ 简单表格支持',
      '✓ 轻量快速',
      '✓ 稳定可靠'
    ],
    formatPreservation: '70-80%',
    performance: 'fast'
  },
  'docxtemplater': {
    id: 'docxtemplater',
    name: '高级引擎',
    description: '基于docxtemplater库,格式保持率高,适合复杂文档',
    features: [
      '✓ 完美格式保持 (95-98%)',
      '✓ 复杂表格结构',
      '✓ 页眉页脚支持',
      '✓ 图片动态插入',
      '✓ 条件格式和循环'
    ],
    formatPreservation: '95-98%',
    performance: 'medium'
  }
};

/**
 * 格式保持级别配置
 */
const FORMAT_LEVELS: Record<FormatPreservationLevel, {
  label: string;
  description: string;
  parserOptions: any;
}> = {
  basic: {
    label: '基础',
    description: '快速生成,适合简单文档',
    parserOptions: {
      paragraphLoop: false,
      linebreaks: false
    }
  },
  advanced: {
    label: '高级',
    description: '平衡性能和质量',
    parserOptions: {
      paragraphLoop: true,
      linebreaks: true
    }
  },
  maximum: {
    label: '最高',
    description: '最佳格式保持,适合复杂文档',
    parserOptions: {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: (part: any) => ''
    }
  }
};

/**
 * 性能图标
 */
const PerformanceIcon: React.FC<{ level: 'fast' | 'medium' | 'slow' }> = ({ level }) => {
  const colors = {
    fast: 'text-green-500',
    medium: 'text-yellow-500',
    slow: 'text-red-500'
  };

  const labels = {
    fast: '快速',
    medium: '中等',
    slow: '较慢'
  };

  return (
    <span className={`flex items-center text-sm ${colors[level]}`}>
      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
        {level === 'fast' && (
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
        )}
        {level === 'medium' && (
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        )}
        {level === 'slow' && (
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        )}
      </svg>
      {labels[level]}
    </span>
  );
};

/**
 * 主组件
 */
export const DocumentGeneratorConfigComponent: React.FC<DocumentGeneratorConfigProps> = ({
  config,
  onConfigChange,
  disabled = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  /**
   * 更新配置
   */
  const updateConfig = (updates: Partial<DocumentGeneratorConfig>) => {
    onConfigChange({
      ...config,
      ...updates
    });
  };

  /**
   * 获取当前引擎的推荐配置
   */
  const getRecommendedConfig = () => {
    if (config.engine === 'docxtemplater') {
      return {
        preserveFormatting: 'maximum' as FormatPreservationLevel,
        enableImageProcessing: true,
        enableConditionalFormatting: true
      };
    } else {
      return {
        preserveFormatting: 'basic' as FormatPreservationLevel,
        enableImageProcessing: false,
        enableConditionalFormatting: false
      };
    }
  };

  /**
   * 应用推荐配置
   */
  const applyRecommendedConfig = () => {
    const recommended = getRecommendedConfig();
    updateConfig(recommended);
  };

  const currentEngine = ENGINES[config.engine];

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">
          文档生成引擎配置
        </h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showAdvanced ? '隐藏' : '显示'}高级选项
        </button>
      </div>

      {/* 引擎选择 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          生成引擎
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.values(ENGINES) as EngineInfo[]).map((engine) => (
            <button
              key={engine.id}
              onClick={() => updateConfig({ engine: engine.id })}
              disabled={disabled}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${config.engine === engine.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">
                  {engine.name}
                </span>
                <PerformanceIcon level={engine.performance} />
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {engine.description}
              </p>
              <div className="text-xs text-gray-500">
                格式保持率: <span className="font-semibold text-gray-700">{engine.formatPreservation}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 引擎特性列表 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          {currentEngine.name} 支持的特性:
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
          {currentEngine.features.map((feature, index) => (
            <div key={index} className="flex items-center">
              <span className="mr-2">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 格式保持级别 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          格式保持级别
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.entries(FORMAT_LEVELS) as [FormatPreservationLevel, typeof FORMAT_LEVELS[keyof typeof FORMAT_LEVELS]][]).map(([key, level]) => (
            <button
              key={key}
              onClick={() => updateConfig({ preserveFormatting: key })}
              disabled={disabled}
              className={`
                p-3 rounded-lg border-2 text-left transition-all
                ${config.preserveFormatting === key
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="font-semibold text-gray-900 mb-1">
                {level.label}
              </div>
              <div className="text-xs text-gray-600">
                {level.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 高级选项 */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* 高级特性开关 */}
          {config.engine === 'docxtemplater' && (
            <>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.enableImageProcessing}
                    onChange={(e) => updateConfig({ enableImageProcessing: e.target.checked })}
                    disabled={disabled}
                    className="mr-3 h-4 w-4 text-blue-600 rounded"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      启用图片处理
                    </div>
                    <div className="text-xs text-gray-500">
                      支持动态插入和调整图片
                    </div>
                  </div>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.enableConditionalFormatting}
                    onChange={(e) => updateConfig({ enableConditionalFormatting: e.target.checked })}
                    disabled={disabled}
                    className="mr-3 h-4 w-4 text-blue-600 rounded"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      启用条件格式
                    </div>
                    <div className="text-xs text-gray-500">
                      支持{'{{#if}}'}和{'{{#each}}'}语法
                    </div>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* 批量处理配置 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                批量大小
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={config.batchSize}
                onChange={(e) => updateConfig({ batchSize: parseInt(e.target.value) || 10 })}
                disabled={disabled}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="text-xs text-gray-500 mt-1">
                每批处理的文档数量
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                并发数
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={config.concurrency}
                onChange={(e) => updateConfig({ concurrency: parseInt(e.target.value) || 3 })}
                disabled={disabled}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="text-xs text-gray-500 mt-1">
                同时处理的文档数
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 推荐配置提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <div className="text-sm font-semibold text-blue-900 mb-2">
              推荐配置
            </div>
            <div className="text-xs text-blue-800 space-y-1 mb-3">
              <p><strong>简单文档:</strong> 标准引擎 + 基础格式</p>
              <p><strong>复杂表格:</strong> 高级引擎 + 最高格式</p>
              <p><strong>大批量:</strong> 高级引擎 + 批量处理</p>
            </div>
            <button
              onClick={applyRecommendedConfig}
              disabled={disabled}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              应用推荐配置 →
            </button>
          </div>
        </div>
      </div>

      {/* 配置摘要 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          当前配置摘要
        </h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>引擎:</strong> {currentEngine.name} ({currentEngine.formatPreservation}格式保持)</p>
          <p><strong>格式级别:</strong> {FORMAT_LEVELS[config.preserveFormatting].label}</p>
          <p><strong>高级特性:</strong> {config.enableImageProcessing ? '✓' : '✗'} 图片处理 | {config.enableConditionalFormatting ? '✓' : '✗'} 条件格式</p>
          <p><strong>性能设置:</strong> 批量大小={config.batchSize}, 并发数={config.concurrency}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: DocumentGeneratorConfig = {
  engine: 'docxtemplater',
  preserveFormatting: 'maximum',
  enableImageProcessing: true,
  enableConditionalFormatting: true,
  batchSize: 10,
  concurrency: 3
};

/**
 * 简化版配置组件 (用于快速设置)
 */
export const QuickConfig: React.FC<{
  config: DocumentGeneratorConfig;
  onConfigChange: (config: DocumentGeneratorConfig) => void;
  disabled?: boolean;
}> = ({ config, onConfigChange, disabled }) => {
  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">生成引擎</h3>
        <select
          value={config.engine}
          onChange={(e) => onConfigChange({
            ...config,
            engine: e.target.value as GenerationEngine
          })}
          disabled={disabled}
          className="p-2 border rounded"
        >
          <option value="docx-templates">标准引擎 (快速)</option>
          <option value="docxtemplater">高级引擎 (高质量)</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">格式保持</span>
        <select
          value={config.preserveFormatting}
          onChange={(e) => onConfigChange({
            ...config,
            preserveFormatting: e.target.value as FormatPreservationLevel
          })}
          disabled={disabled}
          className="p-2 border rounded"
        >
          <option value="basic">基础 (快速)</option>
          <option value="advanced">高级 (平衡)</option>
          <option value="maximum">最高 (最佳)</option>
        </select>
      </div>
    </div>
  );
};

export default DocumentGeneratorConfigComponent;
