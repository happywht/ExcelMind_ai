/**
 * 数据验证工具
 *
 * 提供运行时数据验证和类型检查功能
 */

/**
 * 验证错误接口
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 验证警告接口
 */
export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

/**
 * 数据验证结果接口
 */
export interface DataValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedData?: any;
}

/**
 * Sheet 数据接口（zhipuService 格式）
 */
interface SheetDataWithMetadata {
  headers?: string[];
  sampleRows?: any[];
  rowCount?: number;
  columnCount?: number;
  [key: string]: any;
}

/**
 * 类型守卫：检查是否为 SheetDataWithMetadata
 */
function isSheetDataWithMetadata(obj: unknown): obj is SheetDataWithMetadata {
  return typeof obj === 'object' && obj !== null;
}

/**
 * FilesPreview 验证配置
 */
interface FilesPreviewValidationConfig {
  requireFileName: boolean;
  requireSheets: boolean;
  requireHeaders: boolean;
  requireSampleRows: boolean;
  allowMixedFormats: boolean;
}

/**
 * 默认验证配置
 */
const DEFAULT_VALIDATION_CONFIG: FilesPreviewValidationConfig = {
  requireFileName: true,
  requireSheets: false,
  requireHeaders: false,
  requireSampleRows: false,
  allowMixedFormats: true
};

/**
 * 数据验证工具类
 */
export class DataValidator {
  /**
   * 验证 filesPreview 数据结构
   *
   * @param filesPreview - 待验证的数据
   * @param source - 数据来源 ('agentic' | 'zhipu')
   * @param config - 验证配置
   * @returns 验证结果
   */
  static validateFilesPreview(
    filesPreview: any[],
    source: 'agentic' | 'zhipu',
    config: FilesPreviewValidationConfig = DEFAULT_VALIDATION_CONFIG
  ): DataValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 基础类型检查
    if (!Array.isArray(filesPreview)) {
      return {
        isValid: false,
        errors: [{
          field: 'filesPreview',
          message: 'filesPreview must be an array',
          severity: 'critical'
        }],
        warnings: []
      };
    }

    // 遍历每个文件
    filesPreview.forEach((file, index) => {
      const prefix = `filesPreview[${index}]`;

      // 验证 fileName
      if (config.requireFileName && !file.fileName) {
        errors.push({
          field: `${prefix}.fileName`,
          message: 'fileName is required',
          severity: 'critical'
        });
      }

      // 验证 sheets 结构
      if (file.sheets) {
        if (typeof file.sheets !== 'object' || file.sheets === null) {
          errors.push({
            field: `${prefix}.sheets`,
            message: 'sheets must be an object',
            severity: 'high'
          });
        } else {
          Object.entries(file.sheets).forEach(([sheetName, sheetData]) => {
            const sheetPrefix = `${prefix}.sheets[${sheetName}]`;

            // 检查是否是数据数组（AgenticOrchestrator 格式）
            if (Array.isArray(sheetData)) {
              if (source === 'zhipu') {
                warnings.push({
                  field: sheetPrefix,
                  message: 'Sheet data is array, expected object with metadata',
                  severity: 'low',
                  suggestion: 'Consider converting to zhipuService format'
                });
              }
            }
            // 检查是否是元数据对象（zhipuService 期望格式）
            else if (isSheetDataWithMetadata(sheetData)) {
              const metadata = sheetData as SheetDataWithMetadata;
              // 验证 headers
              if (config.requireHeaders && !metadata.headers) {
                errors.push({
                  field: `${sheetPrefix}.headers`,
                  message: 'headers is required',
                  severity: 'high'
                });
              } else if (metadata.headers && !Array.isArray(metadata.headers)) {
                errors.push({
                  field: `${sheetPrefix}.headers`,
                  message: 'headers must be an array',
                  severity: 'high'
                });
              }

              // 验证 sampleRows
              if (config.requireSampleRows && !metadata.sampleRows) {
                errors.push({
                  field: `${sheetPrefix}.sampleRows`,
                  message: 'sampleRows is required',
                  severity: 'high'
                });
              } else if (metadata.sampleRows && !Array.isArray(metadata.sampleRows)) {
                errors.push({
                  field: `${sheetPrefix}.sampleRows`,
                  message: 'sampleRows must be an array',
                  severity: 'high'
                });
              }

              // 验证 rowCount
              if (metadata.rowCount !== undefined && typeof metadata.rowCount !== 'number') {
                warnings.push({
                  field: `${sheetPrefix}.rowCount`,
                  message: 'rowCount should be a number',
                  severity: 'low'
                });
              }
            } else {
              errors.push({
                field: sheetPrefix,
                message: 'sheet data must be an array or object',
                severity: 'high'
              });
            }
          });
        }
      }

      // 验证 currentSheetName
      if (file.currentSheetName && typeof file.currentSheetName !== 'string') {
        warnings.push({
          field: `${prefix}.currentSheetName`,
          message: 'currentSheetName should be a string',
          severity: 'low'
        });
      }

      // 验证 metadata
      if (file.metadata && typeof file.metadata !== 'object') {
        warnings.push({
          field: `${prefix}.metadata`,
          message: 'metadata should be an object',
          severity: 'low'
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 清理和修复 filesPreview 数据
   *
   * @param filesPreview - 待清理的数据
   * @returns 清理后的数据
   */
  static sanitizeFilesPreview(filesPreview: any[]): any[] {
    return filesPreview.map(file => {
      const sanitized: any = {
        fileName: file.fileName || 'Unknown',
        currentSheetName: file.currentSheetName,
        metadata: file.metadata || {}
      };

      // 处理 sheets
      if (file.sheets) {
        sanitized.sheets = {};

        Object.entries(file.sheets).forEach(([sheetName, sheetData]) => {
          if (Array.isArray(sheetData)) {
            // AgenticOrchestrator 格式：转换为 zhipuService 期望格式
            if (sheetData.length > 0) {
              sanitized.sheets[sheetName] = {
                headers: Object.keys(sheetData[0] || {}),
                sampleRows: sheetData.slice(0, 5),
                rowCount: sheetData.length
              };
            } else {
              sanitized.sheets[sheetName] = {
                headers: [],
                sampleRows: [],
                rowCount: 0
              };
            }
          } else if (isSheetDataWithMetadata(sheetData)) {
            const metadata = sheetData as SheetDataWithMetadata;
            // 已经是正确格式，确保必需字段存在
            sanitized.sheets[sheetName] = {
              headers: metadata.headers || [],
              sampleRows: metadata.sampleRows || [],
              rowCount: metadata.rowCount || 0,
              metadata: metadata.metadata || {}
            };
          }
        });
      }

      // 处理单sheet模式
      if (file.headers) {
        sanitized.headers = Array.isArray(file.headers) ? file.headers : [];
      }
      if (file.sampleRows) {
        sanitized.sampleRows = Array.isArray(file.sampleRows) ? file.sampleRows : [];
      }

      return sanitized;
    });
  }

  /**
   * 安全地访问嵌套属性
   *
   * @param obj - 对象
   * @param path - 属性路径（使用点号分隔）
   * @param defaultValue - 默认值
   * @returns 属性值或默认值
   */
  static safeGet<T = any>(obj: any, path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current == null) {
        return defaultValue as T;
      }
      current = current[key];
    }

    return current ?? defaultValue;
  }

  /**
   * 检查是否是有效的 DataFileInfo
   *
   * @param data - 待检查的数据
   * @returns 是否是有效的 DataFileInfo
   */
  static isValidDataFileInfo(data: any): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.id === 'string' &&
      typeof data.fileName === 'string' &&
      (!data.sheets || typeof data.sheets === 'object')
    );
  }

  /**
   * 检查是否是有效的 sheets 结构
   *
   * @param sheets - 待检查的 sheets
   * @returns 是否是有效的 sheets 结构
   */
  static isValidSheets(sheets: any): boolean {
    if (typeof sheets !== 'object' || sheets === null) {
      return false;
    }

    return Object.values(sheets).every(sheet =>
      // AgenticOrchestrator 格式: 纯数组
      Array.isArray(sheet) ||
      // zhipuService 期望格式: 包含元数据的对象
      (
        typeof sheet === 'object' &&
        sheet !== null &&
        'headers' in sheet &&
        Array.isArray((sheet as SheetDataWithMetadata).headers) &&
        'sampleRows' in sheet &&
        Array.isArray((sheet as SheetDataWithMetadata).sampleRows)
      )
    );
  }
}

/**
 * 验证错误分类
 */
export enum ErrorCategory {
  // 用户输入错误
  VALIDATION_ERROR = 'validation_error',
  INVALID_INPUT = 'invalid_input',

  // 数据处理错误
  DATA_PARSING_ERROR = 'data_parsing_error',
  DATA_TRANSFORMATION_ERROR = 'data_transformation_error',
  COLUMN_NOT_FOUND = 'column_not_found',

  // AI服务错误
  AI_SERVICE_ERROR = 'ai_service_error',
  AI_TIMEOUT = 'ai_timeout',
  AI_RATE_LIMIT = 'ai_rate_limit',

  // 代码执行错误
  CODE_EXECUTION_ERROR = 'code_execution_error',
  CODE_SYNTAX_ERROR = 'code_syntax_error',
  RUNTIME_ERROR = 'runtime_error',

  // 系统错误
  NETWORK_ERROR = 'network_error',
  STORAGE_ERROR = 'storage_error',
  TIMEOUT_ERROR = 'timeout_error',

  // 未知错误
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * 创建验证错误
 */
export function createValidationError(
  field: string,
  message: string,
  severity: ValidationError['severity']
): ValidationError {
  return { field, message, severity };
}

/**
 * 创建验证警告
 */
export function createValidationWarning(
  field: string,
  message: string,
  severity: ValidationWarning['severity'],
  suggestion?: string
): ValidationWarning {
  return { field, message, severity, suggestion };
}
