/**
 * @file 文件元数据类型定义
 * @description 定义文件信息、文件角色和文件关系，支持多Sheet场景
 * @module types/fileMetadata
 */

/**
 * 文件角色枚举
 * @description 定义在多Sheet场景下，Excel文件中不同Sheet的角色
 */
export enum FileRole {
  /** 主数据源 - 用于批量生成的主要数据 */
  PRIMARY = 'primary',
  /** 辅助数据源 - 用于查找关联数据 */
  AUXILIARY = 'auxiliary',
  /** 配置文件 - 包含配置参数 */
  CONFIGURATION = 'configuration',
  /** 映射关系 - 定义字段映射关系 */
  MAPPING = 'mapping',
  /** 未定义 - 未分配角色的Sheet */
  UNDEFINED = 'undefined'
}

/**
 * 关系类型枚举
 * @description 定义Sheet之间的关系类型
 */
export enum RelationshipType {
  /** 一对一关系 */
  ONE_TO_ONE = 'one_to_one',
  /** 一对多关系 */
  ONE_TO_MANY = 'one_to_many',
  /** 多对一关系 */
  MANY_TO_ONE = 'many_to_one',
  /** 多对多关系 */
  MANY_TO_MANY = 'many_to_many'
}

/**
 * 文件信息接口
 * @description 描述Excel文件的基本信息和元数据
 */
export interface FileInfo {
  /** 文件唯一标识符 */
  id: string;
  /** 文件名称 */
  fileName: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 最后修改时间 */
  lastModified: number;
  /** 文件类型 */
  fileType: 'excel' | 'csv' | 'json' | 'unknown';
  /** Sheet列表 */
  sheets: SheetInfo[];
  /** 文件级别的元数据 */
  metadata?: FileMetadata;
}

/**
 * Sheet信息接口
 * @description 描述Excel文件中单个Sheet的结构和内容
 */
export interface SheetInfo {
  /** Sheet名称 */
  sheetName: string;
  /** Sheet角色 */
  role?: FileRole;
  /** 表头字段列表 */
  headers: string[];
  /** 数据行数 */
  rowCount: number;
  /** 列数 */
  columnCount: number;
  /** 示例数据（前5行） */
  sampleData: Record<string, any>[];
  /** Sheet级别的元数据 */
  metadata?: SheetMetadata;
}

/**
 * Sheet元数据接口
 * @description 包含Sheet的额外信息，如注释、笔记等
 */
export interface SheetMetadata {
  /** 单元格注释 */
  comments?: { [cellAddress: string]: string };
  /** 单元格笔记 */
  notes?: { [cellAddress: string]: string };
  /** 是否有空值 */
  hasEmptyValues: boolean;
  /** 数据质量指标 */
  dataQuality?: DataQualityMetrics;
}

/**
 * 文件元数据接口
 * @description 文件级别的额外信息
 */
export interface FileMetadata {
  /** 创建时间 */
  createdAt?: number;
  /** 上传者 */
  uploader?: string;
  /** 文件描述 */
  description?: string;
  /** 标签 */
  tags?: string[];
  /** 自定义属性 */
  customProperties?: Record<string, any>;
}

/**
 * 数据质量指标接口
 * @description 描述数据质量的各项指标
 */
export interface DataQualityMetrics {
  /** 缺失值数量 */
  missingValues: number;
  /** 重复行数量 */
  duplicateRows: number;
  /** 类型不一致的数量 */
  inconsistentTypes: number;
  /** 空值比例 */
  missingRatio: number;
  /** 重复行比例 */
  duplicateRatio: number;
  /** 数据完整性分数（0-1） */
  completenessScore?: number;
  /** 数据准确性分数（0-1） */
  accuracyScore?: number;
  /** 数据一致性分数（0-1） */
  consistencyScore?: number;
}

/**
 * 文件关系接口
 * @description 定义Sheet之间的关系，用于跨Sheet数据查找
 */
export interface FileRelationship {
  /** 关系唯一标识符 */
  id: string;
  /** 源Sheet */
  sourceSheet: string;
  /** 源字段（关联键） */
  sourceColumn: string;
  /** 目标Sheet */
  targetSheet: string;
  /** 目标字段（关联键） */
  targetColumn: string;
  /** 关系类型 */
  relationshipType: RelationshipType;
  /** 关系描述 */
  description?: string;
  /** 是否必需 */
  required?: boolean;
  /** 级联删除 */
  cascadeDelete?: boolean;
}

/**
 * 跨Sheet映射接口
 * @description 定义从一个Sheet查找另一个Sheet数据的映射规则
 */
export interface CrossSheetMapping {
  /** 映射ID */
  id: string;
  /** 模板占位符 */
  placeholder: string;
  /** 来源Sheet名称 */
  sourceSheet: string;
  /** 来源列名 */
  sourceColumn: string;
  /** 关联字段（在主Sheet和来源Sheet中都要有） */
  lookupKey: string;
  /** 关系类型 */
  relationshipType: RelationshipType;
  /** 可选的数据转换代码 */
  transform?: string;
  /** 映射描述 */
  description?: string;
  /** 默认值（如果查找失败） */
  defaultValue?: any;
}

/**
 * 文件集合接口
 * @description 多个文件的集合，支持批量处理场景
 */
export interface FileCollection {
  /** 集合ID */
  id: string;
  /** 文件列表 */
  files: FileInfo[];
  /** 文件之间的关系 */
  relationships: FileRelationship[];
  /** 集合元数据 */
  metadata: {
    createdAt: number;
    updatedAt: number;
    totalFiles: number;
    totalSheets: number;
  };
}

/**
 * 数据源配置接口
 * @description 配置数据源的连接和访问方式
 */
export interface DataSourceConfig {
  /** 数据源ID */
  id: string;
  /** 数据源类型 */
  type: 'excel' | 'csv' | 'json' | 'database' | 'api' | 'custom';
  /** 数据源名称 */
  name: string;
  /** 连接配置 */
  connection: {
    /** 连接类型 */
    type: 'file' | 'url' | 'database' | 'inline';
    /** 源地址（文件路径、URL、连接字符串等） */
    source: string;
    /** 额外选项 */
    options?: Record<string, any>;
  };
  /** 数据结构定义 */
  schema: DataSchema;
  /** 示例数据 */
  sampleData?: any[];
  /** 元数据 */
  metadata?: {
    totalRows?: number;
    totalColumns?: number;
    lastModified?: number;
  };
}

/**
 * 数据结构接口
 * @description 定义数据的结构和关系
 */
export interface DataSchema {
  /** 列定义 */
  columns: ColumnDefinition[];
  /** 关系定义 */
  relationships?: RelationshipDefinition[];
}

/**
 * 列定义接口
 * @description 定义单个列的属性
 */
export interface ColumnDefinition {
  /** 列名 */
  name: string;
  /** 数据类型 */
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  /** 是否可为空 */
  nullable: boolean;
  /** 是否唯一 */
  unique?: boolean;
  /** 是否为主键 */
  primaryKey?: boolean;
  /** 外键定义 */
  foreignKey?: {
    table: string;
    column: string;
  };
  /** 示例值 */
  sampleValues: any[];
  /** 语义提示（用于AI理解） */
  semanticHints?: string[];
}

/**
 * 关系定义接口
 * @description 定义数据之间的关系
 */
export interface RelationshipDefinition {
  /** 来源表/Sheet */
  from: {
    table: string;
    column: string;
  };
  /** 目标表/Sheet */
  to: {
    table: string;
    column: string;
  };
  /** 关系类型 */
  type: RelationshipType;
}
