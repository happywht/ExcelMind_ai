/**
 * SQL Preview Component Module
 * 导出所有SQL预览相关的组件和工具
 */

// 主组件
export { SQLPreview } from './SQLPreview';
export type { SQLPreviewProps } from './types';

// 子组件
export { default as SQLEditor } from './SQLEditor';
export { AIReasoningView } from './AIReasoningView';
export { ExecuteButton } from './ExecuteButton';
export { SQLHistory } from './SQLHistory';
export { SQLValidator } from './SQLValidator';
export {
  SQLToolbar,
  FormatButton,
  SaveButton,
  CopyButton,
  ExportButton,
  UndoRedoButtons,
  AIOptimizeButton
} from './SQLToolbar';

// 工具类和函数
export { SQLFormatter } from './SQLFormatter';
export {
  formatSQL,
  minifySQL,
  validateSQL,
  beautifySQL,
  highlightSQL,
  extractTableNames,
  calculateComplexity,
  generateExplainPlan
} from './SQLFormatter';

// 类型定义
export type {
  QueryResult,
  AIMetadata,
  SQLPreviewConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  DatabaseSchema,
  TableSchema,
  ColumnSchema,
  ViewSchema,
  IndexSchema,
  SQLHistoryEntry,
  FormatOptions,
  ExecuteButtonState
} from './types';
