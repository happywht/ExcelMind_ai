/**
 * 转换函数编辑器
 *
 * 提供内置转换函数和自定义JavaScript表达式编辑
 */

import React, { useState, useMemo } from 'react';

/**
 * 内置转换函数
 */
interface BuiltinTransform {
  name: string;
  code: string;
  description: string;
  category: 'string' | 'number' | 'date' | 'format';
}

/**
 * 组件属性
 */
export interface TransformEditorProps {
  value?: string;
  sampleData?: any[];
  onChange: (transform: string) => void;
}

/**
 * 内置转换函数列表
 */
const BUILTIN_TRANSFORMS: BuiltinTransform[] = [
  // 字符串转换
  {
    name: '转大写',
    code: 'String(value).toUpperCase()',
    description: '将文本转换为大写',
    category: 'string'
  },
  {
    name: '转小写',
    code: 'String(value).toLowerCase()',
    description: '将文本转换为小写',
    category: 'string'
  },
  {
    name: '去空格',
    code: 'String(value).trim()',
    description: '去除首尾空格',
    category: 'string'
  },
  {
    name: '截取前N位',
    code: 'String(value).substring(0, 10)',
    description: '截取前10个字符',
    category: 'string'
  },
  {
    name: '替换文本',
    code: 'String(value).replace("旧", "新")',
    description: '替换文本内容',
    category: 'string'
  },

  // 数字转换
  {
    name: '转数字',
    code: 'Number(value)',
    description: '转换为数字类型',
    category: 'number'
  },
  {
    name: '保留2位小数',
    code: 'Number(value).toFixed(2)',
    description: '格式化为2位小数',
    category: 'number'
  },
  {
    name: '千分位',
    code: 'Number(value).toLocaleString()',
    description: '添加千分位分隔符',
    category: 'number'
  },

  // 日期转换
  {
    name: '格式化日期',
    code: 'new Date(value).toLocaleDateString("zh-CN")',
    description: '格式化为中文日期',
    category: 'date'
  },
  {
    name: '格式化时间',
    code: 'new Date(value).toLocaleString("zh-CN")',
    description: '格式化为中文日期时间',
    category: 'date'
  },

  // 格式化
  {
    name: '货币格式',
    code: '"¥" + Number(value).toLocaleString()',
    description: '添加货币符号',
    category: 'format'
  },
  {
    name: '百分比',
    code: 'Number(value) * 100 + "%"',
    description: '转换为百分比格式',
    category: 'format'
  }
];

/**
 * 转换函数编辑器
 */
export const TransformEditor: React.FC<TransformEditorProps> = ({
  value = '',
  sampleData,
  onChange
}) => {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [category, setCategory] = useState<string>('all');
  const [customCode, setCustomCode] = useState(value);
  const [showPresets, setShowPresets] = useState(false);

  // 验证自定义代码
  const validationResult = useMemo(() => {
    if (!customCode) return { valid: true, error: '' };

    try {
      // 尝试创建函数
      new Function('value', `return ${customCode}`);
      return { valid: true, error: '' };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '语法错误'
      };
    }
  }, [customCode]);

  // 测试转换结果
  const testResult = useMemo(() => {
    if (!sampleData || sampleData.length === 0 || !customCode) return null;

    const testValue = sampleData[0];
    if (testValue === undefined || testValue === null) return null;

    try {
      const fn = new Function('value', `return ${customCode}`);
      const result = fn(testValue);
      return {
        success: true,
        result: String(result)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '执行错误'
      };
    }
  }, [customCode, sampleData]);

  // 过滤预设函数
  const filteredTransforms = useMemo(() => {
    if (category === 'all') return BUILTIN_TRANSFORMS;
    return BUILTIN_TRANSFORMS.filter(t => t.category === category);
  }, [category]);

  /**
   * 应用预设函数
   */
  const applyPreset = (transform: BuiltinTransform) => {
    onChange(transform.code);
    setCustomCode(transform.code);
    setShowPresets(false);
  };

  /**
   * 应用自定义代码
   */
  const applyCustom = () => {
    if (validationResult.valid) {
      onChange(customCode);
    }
  };

  return (
    <div className="space-y-3">
      {/* 模式切换 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => {
            setMode('preset');
            setShowPresets(true);
          }}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'preset'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          预设函数
        </button>
        <button
          onClick={() => {
            setMode('custom');
            setShowPresets(false);
          }}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'custom'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          自定义表达式
        </button>

        {/* 清除按钮 */}
        {value && (
          <button
            onClick={() => {
              onChange('');
              setCustomCode('');
            }}
            className="ml-auto text-xs text-red-600 hover:text-red-700"
          >
            清除转换
          </button>
        )}
      </div>

      {/* 当前值显示 */}
      {value && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded">
          <div className="text-xs text-blue-700 mb-1">当前转换函数:</div>
          <code className="text-sm font-mono text-blue-900">{value}</code>
        </div>
      )}

      {/* 预设函数选择器 */}
      {mode === 'preset' && showPresets && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* 分类筛选 */}
          <div className="flex items-center space-x-1 p-2 bg-gray-50 border-b border-gray-200">
            <button
              onClick={() => setCategory('all')}
              className={`px-2 py-1 text-xs rounded ${
                category === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setCategory('string')}
              className={`px-2 py-1 text-xs rounded ${
                category === 'string' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              字符串
            </button>
            <button
              onClick={() => setCategory('number')}
              className={`px-2 py-1 text-xs rounded ${
                category === 'number' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              数字
            </button>
            <button
              onClick={() => setCategory('date')}
              className={`px-2 py-1 text-xs rounded ${
                category === 'date' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              日期
            </button>
            <button
              onClick={() => setCategory('format')}
              className={`px-2 py-1 text-xs rounded ${
                category === 'format' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              格式化
            </button>
          </div>

          {/* 函数列表 */}
          <div className="max-h-48 overflow-y-auto">
            {filteredTransforms.map((transform, index) => (
              <button
                key={index}
                onClick={() => applyPreset(transform)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900 text-sm">{transform.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{transform.description}</div>
                <code className="text-xs text-blue-600 font-mono">{transform.code}</code>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 自定义表达式编辑器 */}
      {mode === 'custom' && (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder="输入JavaScript表达式，如: value.toUpperCase()"
              className={`w-full px-3 py-2 pr-10 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationResult.valid ? 'border-gray-300' : 'border-red-300'
              }`}
            />
            {customCode && (
              <div className="absolute right-2 top-2">
                {validationResult.valid ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            )}
          </div>

          {/* 错误提示 */}
          {!validationResult.valid && (
            <div className="text-xs text-red-600">{validationResult.error}</div>
          )}

          {/* 应用按钮 */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              使用 <code className="text-blue-600">value</code> 表示字段值
            </div>
            <button
              onClick={applyCustom}
              disabled={!validationResult.valid || !customCode}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              应用
            </button>
          </div>

          {/* 测试结果 */}
          {testResult && (
            <div className={`p-2 rounded border ${
              testResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="text-xs">
                {testResult.success ? (
                  <>
                    <span className="text-green-700">测试结果: </span>
                    <span className="font-mono text-green-900">{testResult.result}</span>
                  </>
                ) : (
                  <span className="text-red-700">{testResult.error}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 帮助信息 */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <div className="font-medium text-gray-700 mb-1">常用示例:</div>
        <ul className="space-y-1">
          <li><code className="text-blue-600">value.toUpperCase()</code> - 转大写</li>
          <li><code className="text-blue-600">Number(value).toFixed(2)</code> - 保留2位小数</li>
          <li><code className="text-blue-600">value.replace("A", "B")</code> - 替换文本</li>
        </ul>
      </div>
    </div>
  );
};
