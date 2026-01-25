/**
 * SQL Preview Demo Page
 * SQL预览组件演示页面
 */

import React, { useState } from 'react';
import { SQLPreview } from '../components/SQLPreview';
import type { QueryResult, AIMetadata } from '../components/SQLPreview';
import { ArrowLeft, Moon, Sun } from 'lucide-react';

export const SQLPreviewDemo: React.FC = () => {
  const [currentDemo, setCurrentDemo] = useState<'basic' | 'ai' | 'dark'>('basic');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // 示例SQL
  const basicSQL = `SELECT
  姓名,
  部门,
  销售额
FROM 员工
WHERE 销售额 > 100000
ORDER BY 销售额 DESC
LIMIT 10;`;

  // 带AI元数据的示例
  const aiMetadata: AIMetadata = {
    naturalQuery: '查询销售额大于10万的员工姓名、部门和销售额，按销售额降序排列，只显示前10条',
    confidence: 0.95,
    reasoning: `1. 分析自然语言查询：
   - 查询目标：员工姓名、部门、销售额
   - 筛选条件：销售额 > 100000
   - 排序方式：按销售额降序
   - 结果限制：前10条

2. 确定SQL结构：
   - SELECT: 姓名, 部门, 销售额
   - FROM: 员工表
   - WHERE: 销售额 > 100000
   - ORDER BY: 销售额 DESC
   - LIMIT: 10

3. 验证SQL语法并优化`,
    suggestions: [
      '为"销售额"列创建索引可提升查询性能',
      '考虑添加部门过滤条件以减少结果集',
      '如果数据量大，考虑使用分页查询'
    ],
    sqlType: 'SELECT'
  };

  const aiSQL = `SELECT
  e.姓名,
  e.部门,
  e.销售额,
  d.部门名称,
  m.姓名 as 部门经理
FROM 员工 e
LEFT JOIN 部门 d ON e.部门 = d.部门ID
LEFT JOIN 员工 m ON d.经理ID = m.员工ID
WHERE e.销售额 > 100000
ORDER BY e.销售额 DESC
LIMIT 10;`;

  // 模拟执行SQL
  const handleExecute = async (sql: string): Promise<QueryResult> => {
    console.log('执行SQL:', sql);

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 800));

    // 模拟返回结果
    return {
      data: [
        { 姓名: '张三', 部门: '销售部', 销售额: 250000 },
        { 姓名: '李四', 部门: '华东区', 销售额: 220000 },
        { 姓名: '王五', 部门: '华南区', 销售额: 180000 },
        { 姓名: '赵六', 部门: '销售部', 销售额: 150000 },
        { 姓名: '孙七', 部门: '华北区', 销售额: 120000 },
      ],
      columns: ['姓名', '部门', '销售额'],
      rowCount: 5,
      executionTime: 80,
      success: true,
      sql: sql
    };
  };

  const handleSave = (sql: string) => {
    console.log('保存SQL:', sql);
    alert('SQL已保存到本地存储');
  };

  const handleSQLChange = (sql: string) => {
    console.log('SQL已修改:', sql.substring(0, 50) + '...');
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* 顶部导航 */}
      <div className={`bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">SQL Preview 组件演示</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">功能强大的SQL预览和编辑组件</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 演示选择器 */}
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setCurrentDemo('basic')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  currentDemo === 'basic'
                    ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                基础版
              </button>
              <button
                onClick={() => setCurrentDemo('ai')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  currentDemo === 'ai'
                    ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                AI增强版
              </button>
            </div>

            {/* 主题切换 */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              title={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-slate-600" />
              ) : (
                <Sun className="w-5 h-5 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {currentDemo === 'basic' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">基础演示</h2>
              <p className="text-slate-600 dark:text-slate-400">
                展示SQL编辑器的基本功能：语法高亮、格式化、验证和执行
              </p>
            </div>

            <SQLPreview
              sql={basicSQL}
              config={{
                editable: true,
                executable: true,
                formatOnLoad: true,
                theme: theme,
                showAIReasoning: false,
                showHistory: true
              }}
              onExecute={handleExecute}
              onSave={handleSave}
              onSQLChange={handleSQLChange}
            />
          </div>
        )}

        {currentDemo === 'ai' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">AI增强演示</h2>
              <p className="text-slate-600 dark:text-slate-400">
                展示AI推理过程、置信度显示和智能建议功能
              </p>
            </div>

            <SQLPreview
              sql={aiSQL}
              metadata={aiMetadata}
              config={{
                editable: true,
                executable: true,
                formatOnLoad: true,
                theme: theme,
                showAIReasoning: true,
                showHistory: true
              }}
              onExecute={handleExecute}
              onSave={handleSave}
              onSQLChange={handleSQLChange}
            />
          </div>
        )}
      </div>

      {/* 功能特性说明 */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">功能特性</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">语法高亮</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">基于Monaco Editor的强大编辑器</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">自动格式化</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">一键美化SQL代码</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">实时验证</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">即时检测语法错误</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
                <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">AI推理</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">展示SQL生成过程</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">执行历史</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">保存并快速重用SQL</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">快捷键支持</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">提升编辑效率</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">快捷键</h4>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs">Ctrl/Cmd + Enter</kbd>
                <span className="text-slate-600 dark:text-slate-400">执行SQL</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs">Ctrl/Cmd + S</kbd>
                <span className="text-slate-600 dark:text-slate-400">保存</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs">Ctrl/Cmd + Shift + F</kbd>
                <span className="text-slate-600 dark:text-slate-400">格式化</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SQLPreviewDemo;
