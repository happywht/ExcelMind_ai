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
}

/**
 * AI生成的映射方案
 */
export interface MappingScheme {
  explanation: string; // AI的映射思路说明
  filterCondition: string | null; // 筛选条件的JavaScript代码
  mappings: FieldMapping[]; // 字段映射关系数组
  unmappedPlaceholders: string[]; // 未能映射的占位符
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
  stage: 'template_upload' | 'data_upload' | 'parsing' | 'mapping' | 'generating' | 'completed' | 'error';
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

/**
 * Word模板解析结果
 */
export interface TemplateParseResult {
  placeholders: string[];
  textContent: string;
  hasConditionalBlocks: boolean;
  hasLoops: boolean;
}
