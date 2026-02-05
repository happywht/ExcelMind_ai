/**
 * 文档空间模块 - 类型定义
 * 用于智能文档填充和生成功能
 */

/**
 * Word模板文件信息
 */
export interface TemplateFile {
  id: string;
  file: File;
  name: string;
  size: number;
  arrayBuffer: ArrayBuffer;
  htmlPreview: string; // Word转HTML的预览
  placeholders: string[]; // 检测到的占位符列表
}

/**
 * 字段映射关系
 */
export interface FieldMapping {
  placeholder: string; // 模板中的占位符，如 "{{产品名称}}"
  excelColumn: string; // Excel中对应的列名
  transform?: string; // 可选的数据转换代码
  ruleType?: 'direct' | 'script' | 'ai'; // 规则类型
  format?: 'date' | 'currency' | 'number' | 'text' | 'custom'; // Phase 5: 格式化类型
  formatParams?: any; // Phase 5: 格式化参数 (e.g., "YYYY-MM-DD")
}

/**
 * Sheet信息接口
 * 用于描述Excel文件中单个Sheet的数据结构
 */
export interface SheetInfo {
  sheetName: string;              // Sheet名称
  headers: string[];              // 表头字段列表
  rowCount: number;               // 数据行数
  sampleData: Record<string, any>[];  // 示例数据（前5行）
}

/**
 * 跨Sheet映射接口
 * 用于支持从其他Sheet中查找关联数据
 */
export interface CrossSheetMapping {
  placeholder: string;           // 模板占位符，如 "{{部门名称}}"
  sourceSheet: string;           // 来源sheet名称
  sourceColumn: string;          // 来源列名
  lookupKey: string;            // 关联字段（在主sheet和来源sheet中都要有）
  relationshipType?: 'oneToOne' | 'manyToOne';  // 关系类型
  transform?: string;           // 可选的数据转换代码
}

/**
 * 列表/表格循环映射 (Phase 6: Autonomous Data Production)
 * 用于处理 docxtemplater 的 {#Loop} ... {/Loop} 结构
 * 支持单表分组 (Group By) 和 跨表关联 (Lookup)
 */
export type LoopType = 'group_by' | 'lookup';

export interface LoopMapping {
  id: string;                    // 唯一标识符
  loopPlaceholder: string;       // 循环占位符，例如 "Projects" (对应 {#Projects})
  type: LoopType;                // 循环类型：单表分组 或 跨表关联

  // Group By Config (Single Sheet)
  groupByColumn?: string;        // 分组字段 (e.g. "InvoiceNo")

  // Lookup Config (Multi Sheet)
  sourceSheet?: string;          // 数据源Sheet
  foreignKey?: string;           // 外键字段 (在SourceSheet中关联PrimarySheet的Key)

  mappings: FieldMapping[];      // 循环内部的字段映射
}

/**
 * 虚拟列定义
 */
export interface VirtualColumn {
  id: string;
  name: string;           // 显示名称
  type: 'const' | 'var' | 'ai'; // 类型：静态文本、系统变量、AI生成
  value: string;          // 值或表达式
  aiPrompt?: string;      // AI生成的提示词 (Phase 4)
}

/**
 * AI生成的映射方案（扩展版）
 * 支持多Sheet数据源和跨Sheet映射功能
 */
export interface MappingScheme {
  explanation: string; // AI的映射思路说明
  reasoning?: string; // AI的推理过程（可选）
  filterCondition: string | null; // 筛选条件的JavaScript代码
  primarySheet: string; // 主数据sheet（用于批量生成）
  mappings: FieldMapping[]; // 主sheet的字段映射关系
  crossSheetMappings?: CrossSheetMapping[];  // 跨sheet映射（可选）
  loopMappings?: LoopMapping[]; // 列表循环映射 (Phase 3)
  virtualColumns?: VirtualColumn[]; // 虚拟列定义 (Phase 3)
  unmappedPlaceholders: string[]; // 未能映射的占位符
  allSheetsInfo?: SheetInfo[];   // 所有可用sheet的信息（可选）
  confidence?: number;           // 映射方案的置信度（可选）
}

/**
 * 映射后的数据项
 */
export interface MappedData {
  [key: string]: string | number | boolean;
}

/**
 * 文档生成选项
 */
export interface GenerationOptions {
  template: ArrayBuffer;
  data: MappedData | MappedData[];
  outputFileName?: string;
}

/**
 * 文档生成结果
 */
export interface GenerationResult {
  success: boolean;
  documents: Blob[];
  fileName: string;
  count: number;
  error?: string;
}

/**
 * 文档空间处理日志
 */
export interface DocumentProcessingLog {
  id: string;
  timestamp: number;
  stage: 'template_upload' | 'data_upload' | 'parsing' | 'mapping' | 'generating' | 'completed' | 'error' | 'download' | 'sheet_change';
  status: 'pending' | 'success' | 'error' | 'info' | 'warning';
  message: string;
  details?: any;
}

/**
 * Word模板解析结果
 */
export interface TemplateParseResult {
  placeholders: string[];
  textContent: string;
  htmlPreview: string; // ✅ 添加HTML预览字段
  hasConditionalBlocks: boolean;
  hasLoops: boolean;
}

/**
 * 生成的文档信息
 */
export interface GeneratedDocument {
  blob: Blob;           // 文档Blob对象
  fileName: string;     // 文件名
  dataIndex: number;    // 在数据源中的索引
  recordData?: any;     // 原始数据记录
}

/**
 * 文档生成模式
 */
export type GenerationMode = 'individual' | 'aggregate';

/**
 * 聚合操作类型
 */
export type AggregateOperation = 'sum' | 'avg' | 'count' | 'max' | 'min' | 'first' | 'last' | 'join';

/**
 * 聚合规则
 */
export interface AggregateRule {
  field: string;              // 要聚合的字段名
  operation: AggregateOperation; // 聚合操作
  alias?: string;             // 结果字段别名（可选）
  delimiter?: string;         // 当operation为join时的分隔符
}

/**
 * 聚合配置
 */
export interface AggregateConfig {
  rules: AggregateRule[];     // 聚合规则列表
  groupBy?: string[];         // 分组字段（可选，用于分组聚合）
}
