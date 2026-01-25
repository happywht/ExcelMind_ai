/**
 * QueryVisualizer 集成示例
 *
 * 展示如何将QueryVisualizer集成到SmartExcel组件中
 * 提供完整的用户查询流程示例
 *
 * @author ExcelMind AI Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { QueryVisualizer } from './QueryVisualizer';
import { DataQueryEngine, QueryResult } from '../../services/queryEngine/DataQueryEngine';
import { IMultiSheetDataSource } from '../../services/queryEngine/MultiSheetDataSource';
import { Search, Sparkles, Code, FileText, TrendingUp } from 'lucide-react';

// ============================================================
// 类型定义
// ============================================================

interface QueryVisualizerExampleProps {
  /** Excel数据 */
  excelData?: {
    fileName: string;
    sheets: { [sheetName: string]: any[] };
    currentSheetName: string;
  };
}

// ============================================================
// 示例组件
// ============================================================

export const QueryVisualizerExample: React.FC<QueryVisualizerExampleProps> = ({
  excelData
}) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryMode, setQueryMode] = useState<'natural' | 'sql'>('natural');
  const [engine] = useState(() => new DataQueryEngine());

  // 初始化数据源
  React.useEffect(() => {
    if (excelData) {
      // 直接使用engine加载Excel数据
      engine.loadExcelData(excelData);
    }
  }, [excelData, engine]);

  // 处理查询
  const handleQuery = async () => {
    if (!query.trim()) return;

    setIsQuerying(true);
    setResult(null);

    try {
      let queryResult: QueryResult;

      if (queryMode === 'natural') {
        // 自然语言查询
        queryResult = await engine.query({
          naturalLanguage: query
        });
      } else {
        // SQL查询
        queryResult = await engine.query({
          sql: query
        });
      }

      setResult(queryResult);
    } catch (error: any) {
      setResult({
        data: [],
        sql: query,
        executionTime: 0,
        rowCount: 0,
        error: error.message,
        success: false
      });
    } finally {
      setIsQuerying(false);
    }
  };

  // 快速查询示例
  const quickQueries = [
    { label: '显示所有数据', query: '显示所有数据' },
    { label: '按销售额排序', query: '按销售额降序排列' },
    { label: '销售额前10名', query: '显示销售额最高的前10条记录' },
    { label: '统计各部门销售额', query: '按部门分组，统计销售额总和' }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* 查询输入区 */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            智能数据查询
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQueryMode('natural')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                queryMode === 'natural'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Search className="w-4 h-4" />
              自然语言
            </button>
            <button
              onClick={() => setQueryMode('sql')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                queryMode === 'sql'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Code className="w-4 h-4" />
              SQL
            </button>
          </div>
        </div>

        {/* 查询输入框 */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleQuery();
                }
              }}
              placeholder={
                queryMode === 'natural'
                  ? '例如：显示销售额大于10万的员工...'
                  : '例如：SELECT * FROM sheet1 WHERE 销售额 > 100000...'
              }
              className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-700"
              disabled={isQuerying}
            />
            {isQuerying && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <button
            onClick={handleQuery}
            disabled={isQuerying || !query.trim()}
            className={`px-6 py-3 rounded-lg font-medium text-white transition-all flex items-center gap-2 ${
              isQuerying || !query.trim()
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-emerald-900/20'
            }`}
          >
            <Search className="w-4 h-4" />
            查询
          </button>
        </div>

        {/* 快速查询 */}
        {queryMode === 'natural' && !result && (
          <div className="mt-3">
            <div className="text-sm text-slate-500 mb-2">快速查询：</div>
            <div className="flex flex-wrap gap-2">
              {quickQueries.map((qq, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(qq.query)}
                  className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  {qq.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 查询结果 */}
      <div className="flex-1 overflow-hidden p-4">
        {!result ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium mb-1">开始查询</p>
            <p className="text-sm">
              {queryMode === 'natural'
                ? '使用自然语言描述您想要查询的数据'
                : '输入SQL查询语句'}
            </p>
          </div>
        ) : (
          <QueryVisualizer
            result={result}
            queryInfo={{
              sql: result.sql,
              executionTime: result.executionTime,
              rowCount: result.rowCount,
              naturalQuery: queryMode === 'natural' ? query : undefined
            }}
            config={{
              showTable: true,
              showChart: true,
              showStats: true,
              defaultView: 'table',
              enableVirtualScroll: true,
              maxRows: 1000
            }}
            onRefresh={handleQuery}
            onEditQuery={() => {
              setQuery(result.sql || query);
              setQueryMode('sql');
            }}
            onExport={format => {
              console.log(`导出为 ${format}`);
            }}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================
// 使用示例
// ============================================================

/**
 * 使用示例：
 *
 * ```tsx
 * import { QueryVisualizerExample } from './components/QueryVisualizer/QueryVisualizerExample';
 *
 * function App() {
 *   const excelData = {
 *     fileName: '员工数据.xlsx',
 *     sheets: {
 *       'Sheet1': [
 *         { id: 1, name: '张三', department: '销售部', salary: 150000 },
 *         { id: 2, name: '李四', department: '技术部', salary: 120000 }
 *       ]
 *     },
 *     currentSheetName: 'Sheet1'
 *   };
 *
 *   return (
 *     <div className="h-screen">
 *       <QueryVisualizerExample excelData={excelData} />
 *     </div>
 *   );
 * }
 * ```
 */

export default QueryVisualizerExample;
