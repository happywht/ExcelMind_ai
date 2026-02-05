/**
 * Phase 2 API 错误代码定义
 *
 * 这个文件定义了 Phase 2 API 的所有错误代码
 * 基于 API_SPECIFICATION_PHASE2.md 文档
 */

// ============================================================================
// 错误代码枚举
// ============================================================================

/**
 * API 错误代码枚举
 *
 * 错误代码分类：
 * - 1xxx: 通用错误
 * - 2xxx: 文件处理错误
 * - 3xxx: 数据处理错误
 * - 4xxx: 模板和文档生成错误
 * - 5xxx: 审计规则错误
 * - 6xxx: SQL 相关错误
 * - 7xxx: 质量控制错误
 * - 8xxx: 性能监控错误
 * - 9xxx: WebSocket 错误
 */
export enum ApiErrorCode {
  // ========================================================================
  // 通用错误 (1xxx)
  // ========================================================================

  /**
   * 未知错误
   * HTTP Status: 500
   */
  UNKNOWN_ERROR = 1000,

  /**
   * 请求参数验证失败
   * HTTP Status: 400
   */
  VALIDATION_ERROR = 1001,

  /**
   * 未授权
   * HTTP Status: 401
   */
  UNAUTHORIZED = 1002,

  /**
   * 禁止访问
   * HTTP Status: 403
   */
  FORBIDDEN = 1003,

  /**
   * 资源不存在
   * HTTP Status: 404
   */
  NOT_FOUND = 1004,

  /**
   * 资源冲突
   * HTTP Status: 409
   */
  CONFLICT = 1005,

  /**
   * 超出速率限制
   * HTTP Status: 429
   */
  RATE_LIMIT_EXCEEDED = 1006,

  /**
   * 服务器内部错误
   * HTTP Status: 500
   */
  INTERNAL_ERROR = 1007,

  /**
   * 服务不可用
   * HTTP Status: 503
   */
  SERVICE_UNAVAILABLE = 1008,

  /**
   * 请求超时
   * HTTP Status: 408
   */
  REQUEST_TIMEOUT = 1009,

  /**
   * 不支持的操作
   * HTTP Status: 400
   */
  UNSUPPORTED_OPERATION = 1010,

  // ========================================================================
  // 文件处理错误 (2xxx)
  // ========================================================================

  /**
   * 文件不存在
   * HTTP Status: 404
   */
  FILE_NOT_FOUND = 2000,

  /**
   * 文件过大
   * HTTP Status: 413
   */
  FILE_TOO_LARGE = 2001,

  /**
   * 无效的文件格式
   * HTTP Status: 400
   */
  INVALID_FILE_FORMAT = 2002,

  /**
   * 文件上传失败
   * HTTP Status: 500
   */
  FILE_UPLOAD_FAILED = 2003,

  /**
   * 文件下载失败
   * HTTP Status: 500
   */
  FILE_DOWNLOAD_FAILED = 2004,

  /**
   * 文件解析失败
   * HTTP Status: 500
   */
  FILE_PARSE_FAILED = 2005,

  /**
   * 文件已损坏
   * HTTP Status: 400
   */
  FILE_CORRUPTED = 2006,

  /**
   * 不支持的文件类型
   * HTTP Status: 400
   */
  UNSUPPORTED_FILE_TYPE = 2007,

  // ========================================================================
  // 数据处理错误 (3xxx)
  // ========================================================================

  /**
   * 数据质量分析失败
   * HTTP Status: 500
   */
  DATA_QUALITY_ANALYSIS_FAILED = 3000,

  /**
   * 数据清洗失败
   * HTTP Status: 500
   */
  DATA_CLEANING_FAILED = 3001,

  /**
   * 转换规则不存在
   * HTTP Status: 404
   */
  TRANSFORM_RULE_NOT_FOUND = 3002,

  /**
   * 转换执行失败
   * HTTP Status: 500
   */
  TRANSFORM_EXECUTION_FAILED = 3003,

  /**
   * Sheet 不存在
   * HTTP Status: 404
   */
  SHEET_NOT_FOUND = 3004,

  /**
   * 列不存在
   * HTTP Status: 404
   */
  COLUMN_NOT_FOUND = 3005,

  /**
   * 数据类型不匹配
   * HTTP Status: 400
   */
  DATA_TYPE_MISMATCH = 3006,

  /**
   * 数据格式错误
   * HTTP Status: 400
   */
  DATA_FORMAT_ERROR = 3007,

  /**
   * 数据转换失败
   * HTTP Status: 500
   */
  DATA_TRANSFORMATION_FAILED = 3008,

  /**
   * 数据源不存在
   * HTTP Status: 404
   */
  DATA_SOURCE_NOT_FOUND = 3009,

  // ========================================================================
  // 模板和文档生成错误 (4xxx)
  // ========================================================================

  /**
   * 模板不存在
   * HTTP Status: 404
   */
  TEMPLATE_NOT_FOUND = 4000,

  /**
   * 模板格式无效
   * HTTP Status: 400
   */
  TEMPLATE_INVALID = 4001,

  /**
   * 模板上传失败
   * HTTP Status: 500
   */
  TEMPLATE_UPLOAD_FAILED = 4002,

  /**
   * 文档生成失败
   * HTTP Status: 500
   */
  GENERATION_FAILED = 4003,

  /**
   * 下载失败
   * HTTP Status: 500
   */
  DOWNLOAD_FAILED = 4004,

  /**
   * 占位符未映射
   * HTTP Status: 400
   */
  PLACEHOLDER_UNMAPPED = 4005,

  /**
   * 模板解析失败
   * HTTP Status: 500
   */
  TEMPLATE_PARSE_FAILED = 4006,

  /**
   * 批量生成失败
   * HTTP Status: 500
   */
  BATCH_GENERATION_FAILED = 4007,

  /**
   * 文档格式不支持
   * HTTP Status: 400
   */
  DOCUMENT_FORMAT_UNSUPPORTED = 4008,

  /**
   * 任务不存在
   * HTTP Status: 404
   */
  TASK_NOT_FOUND = 4009,

  /**
   * 任务已取消
   * HTTP Status: 409
   */
  TASK_ALREADY_CANCELLED = 4010,

  /**
   * 任务已失败
   * HTTP Status: 409
   */
  TASK_ALREADY_FAILED = 4011,

  // ========================================================================
  // 审计规则错误 (5xxx)
  // ========================================================================

  /**
   * 审计规则不存在
   * HTTP Status: 404
   */
  AUDIT_RULE_NOT_FOUND = 5000,

  /**
   * 审计执行失败
   * HTTP Status: 500
   */
  AUDIT_EXECUTION_FAILED = 5001,

  /**
   * 审计报告生成失败
   * HTTP Status: 500
   */
  AUDIT_REPORT_FAILED = 5002,

  /**
   * 审计规则表达式错误
   * HTTP Status: 400
   */
  AUDIT_RULE_EXPRESSION_ERROR = 5003,

  /**
   * 审计条件无效
   * HTTP Status: 400
   */
  AUDIT_CONDITION_INVALID = 5004,

  // ========================================================================
  // SQL 相关错误 (6xxx)
  // ========================================================================

  /**
   * SQL 语法错误
   * HTTP Status: 400
   */
  SQL_SYNTAX_ERROR = 6000,

  /**
   * SQL 标识符不存在
   * HTTP Status: 400
   */
  SQL_IDENTIFIER_NOT_FOUND = 6001,

  /**
   * SQL 验证失败
   * HTTP Status: 400
   */
  SQL_VALIDATION_FAILED = 6002,

  /**
   * SQL 执行失败
   * HTTP Status: 500
   */
  SQL_EXECUTION_FAILED = 6003,

  /**
   * SQL 查询超时
   * HTTP Status: 408
   */
  SQL_QUERY_TIMEOUT = 6004,

  /**
   * SQL 查询过于复杂
   * HTTP Status: 400
   */
  SQL_TOO_COMPLEX = 6005,

  // ========================================================================
  // 质量控制错误 (7xxx)
  // ========================================================================

  /**
   * 检测到 AI 幻觉
   * HTTP Status: 400
   */
  HALLUCINATION_DETECTED = 7000,

  /**
   * 质量门禁检查失败
   * HTTP Status: 400
   */
  QUALITY_GATE_FAILED = 7001,

  /**
   * 验证失败
   * HTTP Status: 400
   */
  VALIDATION_FAILED = 7002,

  /**
   * AI 输出验证失败
   * HTTP Status: 400
   */
  AI_OUTPUT_VALIDATION_FAILED = 7003,

  /**
   * 结果验证失败
   * HTTP Status: 400
   */
  RESULT_VALIDATION_FAILED = 7004,

  /**
   * 质量分数低于阈值
   * HTTP Status: 400
   */
  QUALITY_SCORE_BELOW_THRESHOLD = 7005,

  // ========================================================================
  // 性能监控错误 (8xxx)
  // ========================================================================

  /**
   * 性能指标获取失败
   * HTTP Status: 500
   */
  PERFORMANCE_METRICS_FAILED = 8000,

  /**
   * 性能报告生成失败
   * HTTP Status: 500
   */
  PERFORMANCE_REPORT_FAILED = 8001,

  /**
   * 性能告警规则不存在
   * HTTP Status: 404
   */
  PERFORMANCE_ALERT_NOT_FOUND = 8002,

  /**
   * 性能告警创建失败
   * HTTP Status: 500
   */
  PERFORMANCE_ALERT_CREATE_FAILED = 8003,

  // ========================================================================
  // WebSocket 错误 (9xxx)
  // ========================================================================

  /**
   * WebSocket 连接失败
   * HTTP Status: 500
   */
  WEBSOCKET_CONNECTION_FAILED = 9000,

  /**
   * WebSocket 认证失败
   * HTTP Status: 401
   */
  WEBSOCKET_AUTH_FAILED = 9001,

  /**
   * WebSocket 订阅失败
   * HTTP Status: 400
   */
  WEBSOCKET_SUBSCRIBE_FAILED = 9002,

  /**
   * WebSocket 消息格式错误
   * HTTP Status: 400
   */
  WEBSOCKET_MESSAGE_FORMAT_ERROR = 9003,
}

// ============================================================================
// 错误代码信息映射
// ============================================================================

/**
 * 错误代码详细信息
 */
export interface ErrorInfo {
  /** 错误代码 */
  code: ApiErrorCode;
  /** HTTP 状态码 */
  httpStatus: number;
  /** 错误消息 */
  message: string;
  /** 错误描述 */
  description: string;
  /** 帮助 URL */
  helpUrl?: string;
  /** 是否可重试 */
  retryable: boolean;
}

/**
 * 错误代码信息映射表
 */
export const ERROR_CODE_INFO: Record<ApiErrorCode, ErrorInfo> = {
  // ========================================================================
  // 通用错误 (1xxx)
  // ========================================================================
  [ApiErrorCode.UNKNOWN_ERROR]: {
    code: ApiErrorCode.UNKNOWN_ERROR,
    httpStatus: 500,
    message: '未知错误',
    description: '发生了未知的错误，请稍后重试',
    helpUrl: 'https://docs.excelmind.ai/errors/unknown-error',
    retryable: true,
  },

  [ApiErrorCode.VALIDATION_ERROR]: {
    code: ApiErrorCode.VALIDATION_ERROR,
    httpStatus: 400,
    message: '请求参数验证失败',
    description: '请求参数不符合要求，请检查请求参数',
    helpUrl: 'https://docs.excelmind.ai/errors/validation-error',
    retryable: false,
  },

  [ApiErrorCode.UNAUTHORIZED]: {
    code: ApiErrorCode.UNAUTHORIZED,
    httpStatus: 401,
    message: '未授权',
    description: '请求未授权，请检查 API 密钥',
    helpUrl: 'https://docs.excelmind.ai/errors/unauthorized',
    retryable: false,
  },

  [ApiErrorCode.FORBIDDEN]: {
    code: ApiErrorCode.FORBIDDEN,
    httpStatus: 403,
    message: '禁止访问',
    description: '您没有权限访问该资源',
    helpUrl: 'https://docs.excelmind.ai/errors/forbidden',
    retryable: false,
  },

  [ApiErrorCode.NOT_FOUND]: {
    code: ApiErrorCode.NOT_FOUND,
    httpStatus: 404,
    message: '资源不存在',
    description: '请求的资源不存在',
    helpUrl: 'https://docs.excelmind.ai/errors/not-found',
    retryable: false,
  },

  [ApiErrorCode.CONFLICT]: {
    code: ApiErrorCode.CONFLICT,
    httpStatus: 409,
    message: '资源冲突',
    description: '请求的资源存在冲突',
    helpUrl: 'https://docs.excelmind.ai/errors/conflict',
    retryable: false,
  },

  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: {
    code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
    httpStatus: 429,
    message: '超出速率限制',
    description: '请求频率过高，请稍后重试',
    helpUrl: 'https://docs.excelmind.ai/errors/rate-limit-exceeded',
    retryable: true,
  },

  [ApiErrorCode.INTERNAL_ERROR]: {
    code: ApiErrorCode.INTERNAL_ERROR,
    httpStatus: 500,
    message: '服务器内部错误',
    description: '服务器发生内部错误，请稍后重试',
    helpUrl: 'https://docs.excelmind.ai/errors/internal-error',
    retryable: true,
  },

  [ApiErrorCode.SERVICE_UNAVAILABLE]: {
    code: ApiErrorCode.SERVICE_UNAVAILABLE,
    httpStatus: 503,
    message: '服务不可用',
    description: '服务暂时不可用，请稍后重试',
    helpUrl: 'https://docs.excelmind.ai/errors/service-unavailable',
    retryable: true,
  },

  [ApiErrorCode.REQUEST_TIMEOUT]: {
    code: ApiErrorCode.REQUEST_TIMEOUT,
    httpStatus: 408,
    message: '请求超时',
    description: '请求处理超时，请稍后重试',
    helpUrl: 'https://docs.excelmind.ai/errors/request-timeout',
    retryable: true,
  },

  [ApiErrorCode.UNSUPPORTED_OPERATION]: {
    code: ApiErrorCode.UNSUPPORTED_OPERATION,
    httpStatus: 400,
    message: '不支持的操作',
    description: '该操作暂不支持',
    helpUrl: 'https://docs.excelmind.ai/errors/unsupported-operation',
    retryable: false,
  },

  // ========================================================================
  // 文件处理错误 (2xxx)
  // ========================================================================
  [ApiErrorCode.FILE_NOT_FOUND]: {
    code: ApiErrorCode.FILE_NOT_FOUND,
    httpStatus: 404,
    message: '文件不存在',
    description: '指定的文件不存在',
    helpUrl: 'https://docs.excelmind.ai/errors/file-not-found',
    retryable: false,
  },

  [ApiErrorCode.FILE_TOO_LARGE]: {
    code: ApiErrorCode.FILE_TOO_LARGE,
    httpStatus: 413,
    message: '文件过大',
    description: '文件大小超过限制',
    helpUrl: 'https://docs.excelmind.ai/errors/file-too-large',
    retryable: false,
  },

  [ApiErrorCode.INVALID_FILE_FORMAT]: {
    code: ApiErrorCode.INVALID_FILE_FORMAT,
    httpStatus: 400,
    message: '无效的文件格式',
    description: '文件格式不支持或已损坏',
    helpUrl: 'https://docs.excelmind.ai/errors/invalid-file-format',
    retryable: false,
  },

  [ApiErrorCode.FILE_UPLOAD_FAILED]: {
    code: ApiErrorCode.FILE_UPLOAD_FAILED,
    httpStatus: 500,
    message: '文件上传失败',
    description: '文件上传过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/file-upload-failed',
    retryable: true,
  },

  [ApiErrorCode.FILE_DOWNLOAD_FAILED]: {
    code: ApiErrorCode.FILE_DOWNLOAD_FAILED,
    httpStatus: 500,
    message: '文件下载失败',
    description: '文件下载过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/file-download-failed',
    retryable: true,
  },

  [ApiErrorCode.FILE_PARSE_FAILED]: {
    code: ApiErrorCode.FILE_PARSE_FAILED,
    httpStatus: 500,
    message: '文件解析失败',
    description: '文件解析过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/file-parse-failed',
    retryable: false,
  },

  [ApiErrorCode.FILE_CORRUPTED]: {
    code: ApiErrorCode.FILE_CORRUPTED,
    httpStatus: 400,
    message: '文件已损坏',
    description: '文件已损坏，无法使用',
    helpUrl: 'https://docs.excelmind.ai/errors/file-corrupted',
    retryable: false,
  },

  [ApiErrorCode.UNSUPPORTED_FILE_TYPE]: {
    code: ApiErrorCode.UNSUPPORTED_FILE_TYPE,
    httpStatus: 400,
    message: '不支持的文件类型',
    description: '该文件类型暂不支持',
    helpUrl: 'https://docs.excelmind.ai/errors/unsupported-file-type',
    retryable: false,
  },

  // ========================================================================
  // 数据处理错误 (3xxx)
  // ========================================================================
  [ApiErrorCode.DATA_QUALITY_ANALYSIS_FAILED]: {
    code: ApiErrorCode.DATA_QUALITY_ANALYSIS_FAILED,
    httpStatus: 500,
    message: '数据质量分析失败',
    description: '数据质量分析过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/data-quality-analysis-failed',
    retryable: true,
  },

  [ApiErrorCode.DATA_CLEANING_FAILED]: {
    code: ApiErrorCode.DATA_CLEANING_FAILED,
    httpStatus: 500,
    message: '数据清洗失败',
    description: '数据清洗过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/data-cleaning-failed',
    retryable: true,
  },

  [ApiErrorCode.TRANSFORM_RULE_NOT_FOUND]: {
    code: ApiErrorCode.TRANSFORM_RULE_NOT_FOUND,
    httpStatus: 404,
    message: '转换规则不存在',
    description: '指定的转换规则不存在',
    helpUrl: 'https://docs.excelmind.ai/errors/transform-rule-not-found',
    retryable: false,
  },

  [ApiErrorCode.TRANSFORM_EXECUTION_FAILED]: {
    code: ApiErrorCode.TRANSFORM_EXECUTION_FAILED,
    httpStatus: 500,
    message: '转换执行失败',
    description: '数据转换执行过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/transform-execution-failed',
    retryable: true,
  },

  [ApiErrorCode.SHEET_NOT_FOUND]: {
    code: ApiErrorCode.SHEET_NOT_FOUND,
    httpStatus: 404,
    message: 'Sheet 不存在',
    description: '指定的 Sheet 不存在',
    helpUrl: 'https://docs.excelmind.ai/errors/sheet-not-found',
    retryable: false,
  },

  [ApiErrorCode.COLUMN_NOT_FOUND]: {
    code: ApiErrorCode.COLUMN_NOT_FOUND,
    httpStatus: 404,
    message: '列不存在',
    description: '指定的列不存在',
    helpUrl: 'https://docs.excelmind.ai/errors/column-not-found',
    retryable: false,
  },

  [ApiErrorCode.DATA_TYPE_MISMATCH]: {
    code: ApiErrorCode.DATA_TYPE_MISMATCH,
    httpStatus: 400,
    message: '数据类型不匹配',
    description: '数据类型与预期不符',
    helpUrl: 'https://docs.excelmind.ai/errors/data-type-mismatch',
    retryable: false,
  },

  [ApiErrorCode.DATA_FORMAT_ERROR]: {
    code: ApiErrorCode.DATA_FORMAT_ERROR,
    httpStatus: 400,
    message: '数据格式错误',
    description: '数据格式不正确',
    helpUrl: 'https://docs.excelmind.ai/errors/data-format-error',
    retryable: false,
  },

  [ApiErrorCode.DATA_TRANSFORMATION_FAILED]: {
    code: ApiErrorCode.DATA_TRANSFORMATION_FAILED,
    httpStatus: 500,
    message: '数据转换失败',
    description: '数据转换过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/data-transformation-failed',
    retryable: true,
  },

  [ApiErrorCode.DATA_SOURCE_NOT_FOUND]: {
    code: ApiErrorCode.DATA_SOURCE_NOT_FOUND,
    httpStatus: 404,
    message: '数据源不存在',
    description: '指定的数据源不存在',
    helpUrl: 'https://docs.excelmind.ai/errors/data-source-not-found',
    retryable: false,
  },

  // ========================================================================
  // 模板和文档生成错误 (4xxx)
  // ========================================================================
  [ApiErrorCode.TEMPLATE_NOT_FOUND]: {
    code: ApiErrorCode.TEMPLATE_NOT_FOUND,
    httpStatus: 404,
    message: '模板不存在',
    description: '指定的模板不存在',
    helpUrl: 'https://docs.excelmind.ai/errors/template-not-found',
    retryable: false,
  },

  [ApiErrorCode.TEMPLATE_INVALID]: {
    code: ApiErrorCode.TEMPLATE_INVALID,
    httpStatus: 400,
    message: '模板格式无效',
    description: '模板格式不正确或已损坏',
    helpUrl: 'https://docs.excelmind.ai/errors/template-invalid',
    retryable: false,
  },

  [ApiErrorCode.TEMPLATE_UPLOAD_FAILED]: {
    code: ApiErrorCode.TEMPLATE_UPLOAD_FAILED,
    httpStatus: 500,
    message: '模板上传失败',
    description: '模板上传过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/template-upload-failed',
    retryable: true,
  },

  [ApiErrorCode.GENERATION_FAILED]: {
    code: ApiErrorCode.GENERATION_FAILED,
    httpStatus: 500,
    message: '文档生成失败',
    description: '文档生成过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/generation-failed',
    retryable: true,
  },

  [ApiErrorCode.DOWNLOAD_FAILED]: {
    code: ApiErrorCode.DOWNLOAD_FAILED,
    httpStatus: 500,
    message: '下载失败',
    description: '文档下载过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/download-failed',
    retryable: true,
  },

  [ApiErrorCode.PLACEHOLDER_UNMAPPED]: {
    code: ApiErrorCode.PLACEHOLDER_UNMAPPED,
    httpStatus: 400,
    message: '占位符未映射',
    description: '模板中的占位符未映射到数据源',
    helpUrl: 'https://docs.excelmind.ai/errors/placeholder-unmapped',
    retryable: false,
  },

  [ApiErrorCode.TEMPLATE_PARSE_FAILED]: {
    code: ApiErrorCode.TEMPLATE_PARSE_FAILED,
    httpStatus: 500,
    message: '模板解析失败',
    description: '模板解析过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/template-parse-failed',
    retryable: false,
  },

  [ApiErrorCode.BATCH_GENERATION_FAILED]: {
    code: ApiErrorCode.BATCH_GENERATION_FAILED,
    httpStatus: 500,
    message: '批量生成失败',
    description: '批量文档生成过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/batch-generation-failed',
    retryable: true,
  },

  [ApiErrorCode.DOCUMENT_FORMAT_UNSUPPORTED]: {
    code: ApiErrorCode.DOCUMENT_FORMAT_UNSUPPORTED,
    httpStatus: 400,
    message: '文档格式不支持',
    description: '该文档格式暂不支持',
    helpUrl: 'https://docs.excelmind.ai/errors/document-format-unsupported',
    retryable: false,
  },

  [ApiErrorCode.TASK_NOT_FOUND]: {
    code: ApiErrorCode.TASK_NOT_FOUND,
    httpStatus: 404,
    message: '任务不存在',
    description: '指定的任务不存在',
    helpUrl: 'https://docs.excelmind.ai/errors/task-not-found',
    retryable: false,
  },

  [ApiErrorCode.TASK_ALREADY_CANCELLED]: {
    code: ApiErrorCode.TASK_ALREADY_CANCELLED,
    httpStatus: 409,
    message: '任务已取消',
    description: '任务已经被取消',
    helpUrl: 'https://docs.excelmind.ai/errors/task-already-cancelled',
    retryable: false,
  },

  [ApiErrorCode.TASK_ALREADY_FAILED]: {
    code: ApiErrorCode.TASK_ALREADY_FAILED,
    httpStatus: 409,
    message: '任务已失败',
    description: '任务已经失败',
    helpUrl: 'https://docs.excelmind.ai/errors/task-already-failed',
    retryable: true,
  },

  // ========================================================================
  // 审计规则错误 (5xxx)
  // ========================================================================
  [ApiErrorCode.AUDIT_RULE_NOT_FOUND]: {
    code: ApiErrorCode.AUDIT_RULE_NOT_FOUND,
    httpStatus: 404,
    message: '审计规则不存在',
    description: '指定的审计规则不存在',
    helpUrl: 'https://docs.excelmind.ai/errors/audit-rule-not-found',
    retryable: false,
  },

  [ApiErrorCode.AUDIT_EXECUTION_FAILED]: {
    code: ApiErrorCode.AUDIT_EXECUTION_FAILED,
    httpStatus: 500,
    message: '审计执行失败',
    description: '审计规则执行过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/audit-execution-failed',
    retryable: true,
  },

  [ApiErrorCode.AUDIT_REPORT_FAILED]: {
    code: ApiErrorCode.AUDIT_REPORT_FAILED,
    httpStatus: 500,
    message: '审计报告生成失败',
    description: '审计报告生成过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/audit-report-failed',
    retryable: true,
  },

  [ApiErrorCode.AUDIT_RULE_EXPRESSION_ERROR]: {
    code: ApiErrorCode.AUDIT_RULE_EXPRESSION_ERROR,
    httpStatus: 400,
    message: '审计规则表达式错误',
    description: '审计规则表达式不正确',
    helpUrl: 'https://docs.excelmind.ai/errors/audit-rule-expression-error',
    retryable: false,
  },

  [ApiErrorCode.AUDIT_CONDITION_INVALID]: {
    code: ApiErrorCode.AUDIT_CONDITION_INVALID,
    httpStatus: 400,
    message: '审计条件无效',
    description: '审计条件不正确',
    helpUrl: 'https://docs.excelmind.ai/errors/audit-condition-invalid',
    retryable: false,
  },

  // ========================================================================
  // SQL 相关错误 (6xxx)
  // ========================================================================
  [ApiErrorCode.SQL_SYNTAX_ERROR]: {
    code: ApiErrorCode.SQL_SYNTAX_ERROR,
    httpStatus: 400,
    message: 'SQL 语法错误',
    description: 'SQL 语句存在语法错误',
    helpUrl: 'https://docs.excelmind.ai/errors/sql-syntax-error',
    retryable: false,
  },

  [ApiErrorCode.SQL_IDENTIFIER_NOT_FOUND]: {
    code: ApiErrorCode.SQL_IDENTIFIER_NOT_FOUND,
    httpStatus: 400,
    message: 'SQL 标识符不存在',
    description: 'SQL 中的表或列不存在',
    helpUrl: 'https://docs.excelmind.ai/errors/sql-identifier-not-found',
    retryable: false,
  },

  [ApiErrorCode.SQL_VALIDATION_FAILED]: {
    code: ApiErrorCode.SQL_VALIDATION_FAILED,
    httpStatus: 400,
    message: 'SQL 验证失败',
    description: 'SQL 验证未通过',
    helpUrl: 'https://docs.excelmind.ai/errors/sql-validation-failed',
    retryable: false,
  },

  [ApiErrorCode.SQL_EXECUTION_FAILED]: {
    code: ApiErrorCode.SQL_EXECUTION_FAILED,
    httpStatus: 500,
    message: 'SQL 执行失败',
    description: 'SQL 执行过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/sql-execution-failed',
    retryable: true,
  },

  [ApiErrorCode.SQL_QUERY_TIMEOUT]: {
    code: ApiErrorCode.SQL_QUERY_TIMEOUT,
    httpStatus: 408,
    message: 'SQL 查询超时',
    description: 'SQL 查询执行超时',
    helpUrl: 'https://docs.excelmind.ai/errors/sql-query-timeout',
    retryable: true,
  },

  [ApiErrorCode.SQL_TOO_COMPLEX]: {
    code: ApiErrorCode.SQL_TOO_COMPLEX,
    httpStatus: 400,
    message: 'SQL 查询过于复杂',
    description: 'SQL 查询复杂度超出限制',
    helpUrl: 'https://docs.excelmind.ai/errors/sql-too-complex',
    retryable: false,
  },

  // ========================================================================
  // 质量控制错误 (7xxx)
  // ========================================================================
  [ApiErrorCode.HALLUCINATION_DETECTED]: {
    code: ApiErrorCode.HALLUCINATION_DETECTED,
    httpStatus: 400,
    message: '检测到 AI 幻觉',
    description: 'AI 响应可能包含不实信息',
    helpUrl: 'https://docs.excelmind.ai/errors/hallucination-detected',
    retryable: false,
  },

  [ApiErrorCode.QUALITY_GATE_FAILED]: {
    code: ApiErrorCode.QUALITY_GATE_FAILED,
    httpStatus: 400,
    message: '质量门禁检查失败',
    description: '未通过质量门禁检查',
    helpUrl: 'https://docs.excelmind.ai/errors/quality-gate-failed',
    retryable: false,
  },

  [ApiErrorCode.VALIDATION_FAILED]: {
    code: ApiErrorCode.VALIDATION_FAILED,
    httpStatus: 400,
    message: '验证失败',
    description: '验证未通过',
    helpUrl: 'https://docs.excelmind.ai/errors/validation-failed',
    retryable: false,
  },

  [ApiErrorCode.AI_OUTPUT_VALIDATION_FAILED]: {
    code: ApiErrorCode.AI_OUTPUT_VALIDATION_FAILED,
    httpStatus: 400,
    message: 'AI 输出验证失败',
    description: 'AI 输出验证未通过',
    helpUrl: 'https://docs.excelmind.ai/errors/ai-output-validation-failed',
    retryable: true,
  },

  [ApiErrorCode.RESULT_VALIDATION_FAILED]: {
    code: ApiErrorCode.RESULT_VALIDATION_FAILED,
    httpStatus: 400,
    message: '结果验证失败',
    description: '结果验证未通过',
    helpUrl: 'https://docs.excelmind.ai/errors/result-validation-failed',
    retryable: false,
  },

  [ApiErrorCode.QUALITY_SCORE_BELOW_THRESHOLD]: {
    code: ApiErrorCode.QUALITY_SCORE_BELOW_THRESHOLD,
    httpStatus: 400,
    message: '质量分数低于阈值',
    description: '质量分数未达到要求',
    helpUrl: 'https://docs.excelmind.ai/errors/quality-score-below-threshold',
    retryable: false,
  },

  // ========================================================================
  // 性能监控错误 (8xxx)
  // ========================================================================
  [ApiErrorCode.PERFORMANCE_METRICS_FAILED]: {
    code: ApiErrorCode.PERFORMANCE_METRICS_FAILED,
    httpStatus: 500,
    message: '性能指标获取失败',
    description: '获取性能指标过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/performance-metrics-failed',
    retryable: true,
  },

  [ApiErrorCode.PERFORMANCE_REPORT_FAILED]: {
    code: ApiErrorCode.PERFORMANCE_REPORT_FAILED,
    httpStatus: 500,
    message: '性能报告生成失败',
    description: '性能报告生成过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/performance-report-failed',
    retryable: true,
  },

  [ApiErrorCode.PERFORMANCE_ALERT_NOT_FOUND]: {
    code: ApiErrorCode.PERFORMANCE_ALERT_NOT_FOUND,
    httpStatus: 404,
    message: '性能告警规则不存在',
    description: '指定的性能告警规则不存在',
    helpUrl: 'https://docs.excelmind.ai/errors/performance-alert-not-found',
    retryable: false,
  },

  [ApiErrorCode.PERFORMANCE_ALERT_CREATE_FAILED]: {
    code: ApiErrorCode.PERFORMANCE_ALERT_CREATE_FAILED,
    httpStatus: 500,
    message: '性能告警创建失败',
    description: '性能告警规则创建过程中发生错误',
    helpUrl: 'https://docs.excelmind.ai/errors/performance-alert-create-failed',
    retryable: true,
  },

  // ========================================================================
  // WebSocket 错误 (9xxx)
  // ========================================================================
  [ApiErrorCode.WEBSOCKET_CONNECTION_FAILED]: {
    code: ApiErrorCode.WEBSOCKET_CONNECTION_FAILED,
    httpStatus: 500,
    message: 'WebSocket 连接失败',
    description: 'WebSocket 连接建立失败',
    helpUrl: 'https://docs.excelmind.ai/errors/websocket-connection-failed',
    retryable: true,
  },

  [ApiErrorCode.WEBSOCKET_AUTH_FAILED]: {
    code: ApiErrorCode.WEBSOCKET_AUTH_FAILED,
    httpStatus: 401,
    message: 'WebSocket 认证失败',
    description: 'WebSocket 认证未通过',
    helpUrl: 'https://docs.excelmind.ai/errors/websocket-auth-failed',
    retryable: false,
  },

  [ApiErrorCode.WEBSOCKET_SUBSCRIBE_FAILED]: {
    code: ApiErrorCode.WEBSOCKET_SUBSCRIBE_FAILED,
    httpStatus: 400,
    message: 'WebSocket 订阅失败',
    description: 'WebSocket 频道订阅失败',
    helpUrl: 'https://docs.excelmind.ai/errors/websocket-subscribe-failed',
    retryable: false,
  },

  [ApiErrorCode.WEBSOCKET_MESSAGE_FORMAT_ERROR]: {
    code: ApiErrorCode.WEBSOCKET_MESSAGE_FORMAT_ERROR,
    httpStatus: 400,
    message: 'WebSocket 消息格式错误',
    description: 'WebSocket 消息格式不正确',
    helpUrl: 'https://docs.excelmind.ai/errors/websocket-message-format-error',
    retryable: false,
  },
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 根据错误代码获取错误信息
 * @param code 错误代码
 * @returns 错误信息
 */
export function getErrorInfo(code: ApiErrorCode): ErrorInfo {
  return ERROR_CODE_INFO[code];
}

/**
 * 根据错误代码获取 HTTP 状态码
 * @param code 错误代码
 * @returns HTTP 状态码
 */
export function getHttpStatus(code: ApiErrorCode): number {
  return ERROR_CODE_INFO[code]?.httpStatus || 500;
}

/**
 * 根据错误代码获取错误消息
 * @param code 错误代码
 * @returns 错误消息
 */
export function getErrorMessage(code: ApiErrorCode): string {
  return ERROR_CODE_INFO[code]?.message || '未知错误';
}

/**
 * 判断错误是否可重试
 * @param code 错误代码
 * @returns 是否可重试
 */
export function isRetryableError(code: ApiErrorCode): boolean {
  return ERROR_CODE_INFO[code]?.retryable || false;
}

/**
 * 根据错误代码获取帮助 URL
 * @param code 错误代码
 * @returns 帮助 URL
 */
export function getHelpUrl(code: ApiErrorCode): string | undefined {
  return ERROR_CODE_INFO[code]?.helpUrl;
}

/**
 * 创建 API 错误响应
 * @param code 错误代码
 * @param details 错误详情
 * @param requestId 请求 ID
 * @returns API 错误响应
 */
export function createApiErrorResponse(
  code: ApiErrorCode,
  details: any[] = [],
  requestId: string = ''
): any {
  const errorInfo = getErrorInfo(code);

  return {
    success: false,
    error: {
      code: errorInfo.code,
      message: errorInfo.message,
      description: errorInfo.description,
      details,
      requestId,
      timestamp: new Date().toISOString(),
      helpUrl: errorInfo.helpUrl,
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * 根据错误代码分类
 * @param code 错误代码
 * @returns 错误类别
 */
export function getErrorCategory(code: ApiErrorCode): string {
  const codeRange = Math.floor(code / 1000);

  const categories: Record<number, string> = {
    1: '通用错误',
    2: '文件处理错误',
    3: '数据处理错误',
    4: '模板和文档生成错误',
    5: '审计规则错误',
    6: 'SQL 相关错误',
    7: '质量控制错误',
    8: '性能监控错误',
    9: 'WebSocket 错误',
  };

  return categories[codeRange] || '未知错误';
}
