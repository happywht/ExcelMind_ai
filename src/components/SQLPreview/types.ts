/**
 * SQL Preview Component Types
 * 定义SQL预览组件相关的所有TypeScript类型
 */

/**
 * SQL查询结果接口
 */
export interface QueryResult {
  /** 数据行 */
  data: Record<string, any>[];
  /** 列名 */
  columns: string[];
  /** 受影响的行数 */
  rowCount: number;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息（如果失败） */
  error?: string;
  /** SQL语句 */
  sql: string;
}

/**
 * AI生成的元数据接口
 */
export interface AIMetadata {
  /** 自然语言查询 */
  naturalQuery?: string;
  /** AI置信度（0-1） */
  confidence?: number;
  /** AI推理过程 */
  reasoning?: string;
  /** AI建议 */
  suggestions?: string[];
  /** SQL类型 */
  sqlType?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP' | 'UNKNOWN';
}

/**
 * SQL预览组件配置接口
 */
export interface SQLPreviewConfig {
  /** 是否可编辑 */
  editable?: boolean;
  /** 是否可执行 */
  executable?: boolean;
  /** 加载时是否自动格式化 */
  formatOnLoad?: boolean;
  /** 是否显示行号 */
  showLineNumbers?: boolean;
  /** 主题 */
  theme?: 'light' | 'dark';
  /** 编辑器语言 */
  language?: 'sql' | 'mysql' | 'postgresql';
  /** 最小高度 */
  minHeight?: string;
  /** 最大高度 */
  maxHeight?: string;
  /** 是否显示AI推理 */
  showAIReasoning?: boolean;
  /** 是否显示历史记录 */
  showHistory?: boolean;
}

/**
 * SQL预览组件Props
 */
export interface SQLPreviewProps {
  /** SQL查询语句 */
  sql: string;
  /** AI生成的元数据 */
  metadata?: AIMetadata;
  /** 组件配置 */
  config?: SQLPreviewConfig;
  /** 执行回调 */
  onExecute?: (sql: string) => Promise<QueryResult>;
  /** 保存回调 */
  onSave?: (sql: string) => void;
  /** 格式化回调 */
  onFormat?: (sql: string) => string;
  /** SQL变化回调 */
  onSQLChange?: (sql: string) => void;
}

/**
 * SQL编辑器Props
 */
export interface SQLEditorProps {
  /** SQL值 */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 是否只读 */
  readOnly?: boolean;
  /** 编辑器语言 */
  language?: 'sql' | 'mysql' | 'postgresql';
  /** 编辑器主题 */
  theme?: 'vs-light' | 'vs-dark';
  /** Monaco Editor选项 */
  options?: {
    /** 最小行数 */
    minimun?: number;
    /** 最大行数 */
    maximun?: number;
    /** 是否只读 */
    readOnly?: boolean;
    /** 自动布局 */
    automaticLayout?: boolean;
    /** 字体大小 */
    fontSize?: number;
    /** 行高 */
    lineHeight?: number;
    /** 显示行号 */
    lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
    /** 滚动条 */
    scrollbar?: {
      useShadows?: boolean;
      verticalHasArrows?: boolean;
      horizontalHasArrows?: boolean;
      vertical?: 'visible' | 'hidden' | 'auto';
      horizontal?: 'visible' | 'hidden' | 'auto';
    };
    /** 小地图 */
    minimap?: { enabled?: boolean };
    /** 代码折叠 */
    folding?: boolean;
    /** 括号匹配 */
    bracketPairColorization?: { enabled?: boolean };
    /** 自动闭合括号 */
    autoClosingBrackets?: 'always' | 'never' | 'beforeWhitespace';
    /** 自动闭合引号 */
    autoClosingQuotes?: 'always' | 'never' | 'beforeWhitespace';
    /** Tab大小 */
    tabSize?: number;
    /** 字体 */
    fontFamily?: string;
    /** 光标样式 */
    cursorStyle?: 'line' | 'block' | 'underline' | 'line-thin';
    /** 光标平滑动画 */
    cursorSmoothCaretAnimation?: 'on' | 'off' | 'explicit';
  };
  /** 编辑器加载回调 */
  onEditorDidMount?: (editor: any) => void;
  /** 编辑器变化前回调 */
  onEditorWillMount?: () => void;
  /** 编辑器变化回调 */
  onEditorChange?: (value: string | undefined) => void;
  /** 高度 */
  height?: string;
  /** 宽度 */
  width?: string | number;
}

/**
 * SQL格式化选项
 */
export interface FormatOptions {
  /** 语言类型 */
  language?: 'sql' | 'mysql' | 'postgresql';
  /** 缩进 */
  indent?: string;
  /** 关键字大小写 */
  keywordCase?: 'upper' | 'lower' | 'preserve';
  /** 标识符大小写 */
  identifierCase?: 'upper' | 'lower' | 'preserve';
  /** 换行符 */
  linesBetweenQueries?: number;
  /** 是否在FROM前换行 */
  newlineBeforeSelect?: boolean;
}

/**
 * SQL验证结果接口
 */
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: ValidationError[];
  /** 警告列表 */
  warnings: ValidationWarning[];
  /** SQL类型 */
  sqlType?: string;
}

/**
 * 验证错误接口
 */
export interface ValidationError {
  /** 错误消息 */
  message: string;
  /** 错误位置 */
  position?: {
    /** 行号 */
    line: number;
    /** 列号 */
    column: number;
  };
  /** 错误代码 */
  code?: string;
  /** 严重程度 */
  severity?: 'error' | 'warning';
}

/**
 * 验证警告接口
 */
export interface ValidationWarning {
  /** 警告消息 */
  message: string;
  /** 警告严重级别 */
  severity?: 'info' | 'warning' | 'error' | 'critical';
  /** 警告位置 */
  position?: {
    line: number;
    column: number;
  };
  /** 警告类型 */
  type?: 'performance' | 'security' | 'style' | 'deprecated';
}

/**
 * 数据库Schema接口
 */
export interface DatabaseSchema {
  /** 表列表 */
  tables: TableSchema[];
  /** 视图列表 */
  views?: ViewSchema[];
}

/**
 * 表Schema接口
 */
export interface TableSchema {
  /** 表名 */
  name: string;
  /** 列列表 */
  columns: ColumnSchema[];
  /** 表注释 */
  comment?: string;
  /** 索引列表 */
  indexes?: IndexSchema[];
}

/**
 * 列Schema接口
 */
export interface ColumnSchema {
  /** 列名 */
  name: string;
  /** 数据类型 */
  type: string;
  /** 是否可为空 */
  nullable?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 列注释 */
  comment?: string;
  /** 是否主键 */
  isPrimaryKey?: boolean;
  /** 是否外键 */
  isForeignKey?: boolean;
  /** 外键引用 */
  foreignKeyReference?: {
    table: string;
    column: string;
  };
}

/**
 * 视图Schema接口
 */
export interface ViewSchema {
  /** 视图名 */
  name: string;
  /** 视图定义 */
  definition?: string;
  /** 视图注释 */
  comment?: string;
}

/**
 * 索引Schema接口
 */
export interface IndexSchema {
  /** 索引名 */
  name: string;
  /** 索引列 */
  columns: string[];
  /** 是否唯一 */
  unique?: boolean;
  /** 索引类型 */
  type?: 'btree' | 'hash' | 'gist' | 'gin';
}

/**
 * SQL历史记录条目接口
 */
export interface SQLHistoryEntry {
  /** 唯一ID */
  id: string;
  /** SQL语句 */
  sql: string;
  /** 时间戳 */
  timestamp: Date;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 结果行数 */
  rowCount: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 自然语言描述 */
  description?: string;
}

/**
 * SQL历史记录Props
 */
export interface SQLHistoryProps {
  /** 历史记录列表 */
  history: SQLHistoryEntry[];
  /** 选择回调 */
  onSelect: (entry: SQLHistoryEntry) => void;
  /** 删除回调 */
  onDelete?: (id: string) => void;
  /** 清空回调 */
  onClear?: () => void;
  /** 最大显示条数 */
  maxDisplayItems?: number;
}

/**
 * AI推理视图Props
 */
export interface AIReasoningViewProps {
  /** 推理过程 */
  reasoning: string;
  /** 置信度 */
  confidence: number;
  /** 自然语言查询 */
  naturalQuery: string;
  /** AI建议列表 */
  suggestions?: string[];
  /** 应用建议回调 */
  onApplySuggestion?: (suggestion: string) => void;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
}

/**
 * 执行按钮状态类型
 */
export type ExecuteButtonState = 'idle' | 'ready' | 'loading' | 'success' | 'error';

/**
 * 执行按钮Props
 */
export interface ExecuteButtonProps {
  /** SQL语句 */
  sql: string;
  /** 执行回调 */
  onExecute: (sql: string) => Promise<QueryResult>;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 按钮文本 */
  label?: string;
  /** 成功后自动重置延迟（毫秒） */
  successResetDelay?: number;
}

/**
 * SQL验证器Props
 */
export interface SQLValidatorProps {
  /** SQL语句 */
  sql: string;
  /** 数据库Schema */
  schema?: DatabaseSchema;
  /** 验证结果变化回调 */
  onValidationChange?: (result: ValidationResult) => void;
  /** 实时验证 */
  realTime?: boolean;
  /** 验证延迟（毫秒） */
  validationDelay?: number;
}

/**
 * 格式化按钮Props
 */
export interface FormatButtonProps {
  /** SQL语句 */
  sql: string;
  /** 格式化回调 */
  onFormat: (sql: string) => void;
  /** 格式化选项 */
  options?: FormatOptions;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 保存按钮Props
 */
export interface SaveButtonProps {
  /** SQL语句 */
  sql: string;
  /** 保存回调 */
  onSave: (sql: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否已保存 */
  isSaved?: boolean;
}
