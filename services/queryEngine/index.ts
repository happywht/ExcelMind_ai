/**
 * 数据查询引擎模块
 * 统一导出接口
 */

// 核心类
export {
  DataQueryEngine,
  globalQueryEngine,
  quickQuery,
  batchQuery,
  AlaSQLExecutor,
  SQLBuilder,
  QueryOptimizer
} from './DataQueryEngine';

// 数据源管理
export {
  MultiSheetDataSource,
  globalDataSource
} from './MultiSheetDataSource';
export type {
  IMultiSheetDataSource,
  Relationship,
  ColumnIndex
} from './MultiSheetDataSource';

// AI查询解析器
export {
  AIQueryParser
} from './AIQueryParser';
export type {
  QueryPlan as AIQueryPlan,
  QueryIntent,
  QueryEntities,
  QueryOperation,
  FilterCondition,
  JoinCondition,
  AggregationSpec,
  QueryType
} from './AIQueryParser';

// SQL生成器
export { SQLGenerator } from './SQLGenerator';

// 辅助函数
export {
  DataHelperFunctions,
  initializeHelperFunctions,
  intelligentFieldMapping,
  intelligentValueExtraction
} from './QueryHelperFunctions';

// 类型定义
export type {
  QueryResult,
  QueryEngineConfig,
  QueryRequest,
  StructuredQuery,
  JoinClause,
  Aggregation
} from './DataQueryEngine';
