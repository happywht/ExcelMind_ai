/**
 * @file 使用示例
 * @description 演示如何使用 @excelmind/shared-types 类型库
 */

import {
  FileInfo,
  FileRole,
  ExecutionStatus,
  ExecutionStage,
  ValidationResult,
  ValidationLevel,
  ErrorCode,
  ErrorCategory,
  StandardError
} from '../dist/index.js';

// ========== 示例 1: 文件信息 ==========
function createFileInfo(): FileInfo {
  const fileInfo: FileInfo = {
    id: 'file-001',
    fileName: 'sales_data.xlsx',
    fileSize: 2048,
    lastModified: Date.now(),
    fileType: 'excel',
    sheets: [
      {
        sheetName: '销售记录',
        role: FileRole.PRIMARY,
        headers: ['日期', '产品', '数量', '金额'],
        rowCount: 100,
        columnCount: 4,
        sampleData: [
          { 日期: '2026-01-24', 产品: '产品A', 数量: 10, 金额: 1000 }
        ],
        metadata: {
          hasEmptyValues: false,
          dataQuality: {
            missingValues: 0,
            duplicateRows: 2,
            inconsistentTypes: 0,
            missingRatio: 0,
            duplicateRatio: 0.02
          }
        }
      }
    ]
  };

  return fileInfo;
}

// ========== 示例 2: 执行状态 ==========
function updateExecutionStatus() {
  const status: ExecutionStatus = ExecutionStatus.IN_PROGRESS;
  const stage: ExecutionStage = ExecutionStage.ANALYSIS;

  console.log(`当前状态: ${status}`);
  console.log(`当前阶段: ${stage}`);
}

// ========== 示例 3: 验证结果 ==========
function createValidationResult(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    status: 'passed',
    score: 95,
    warnings: [],
    errors: [],
    metrics: {
      rowCount: 100,
      columnCount: 4,
      dataQuality: {
        missingValues: 0,
        duplicateRows: 2,
        inconsistentTypes: 0,
        missingRatio: 0,
        duplicateRatio: 0.02,
        completenessScore: 0.98,
        accuracyScore: 0.95,
        consistencyScore: 0.92
      }
    },
    validatedAt: Date.now(),
    duration: 150
  };

  return result;
}

// ========== 示例 4: 错误处理 ==========
function handleError(error: StandardError) {
  console.error(`错误码: ${error.code}`);
  console.error(`错误消息: ${error.message}`);
  console.error(`错误级别: ${error.severity}`);

  if (error.retryable) {
    console.log('这个错误可以重试');
  }
}

function createError(): StandardError {
  const error: StandardError = {
    id: 'err-001',
    category: ErrorCategory.AI_SERVICE_ERROR,
    code: ErrorCode.AI_TIMEOUT,
    message: 'AI服务请求超时',
    userMessage: 'AI服务响应超时，请稍后重试',
    severity: 'medium',
    retryable: true,
    timestamp: Date.now(),
    context: {
      taskId: 'task-001',
      stepId: 'step-001'
    }
  };

  return error;
}

// ========== 示例 5: 类型守卫 ==========
function isFileInfo(obj: any): obj is FileInfo {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.fileName === 'string' &&
    typeof obj.fileSize === 'number' &&
    Array.isArray(obj.sheets);
}

// ========== 示例 6: 泛型使用 ==========
import { ApiResponse, PaginationResponse } from '../dist/index.js';

function createApiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: Date.now(),
      requestId: 'req-001',
      version: '1.0.0'
    }
  };
}

function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginationResponse<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
    hasPrev: page > 1
  };
}

// ========== 运行示例 ==========
function runExamples() {
  console.log('========== 示例 1: 文件信息 ==========');
  const fileInfo = createFileInfo();
  console.log('文件信息:', fileInfo);

  console.log('\n========== 示例 2: 执行状态 ==========');
  updateExecutionStatus();

  console.log('\n========== 示例 3: 验证结果 ==========');
  const validationResult = createValidationResult();
  console.log('验证结果:', validationResult);

  console.log('\n========== 示例 4: 错误处理 ==========');
  const error = createError();
  handleError(error);

  console.log('\n========== 示例 5: 类型守卫 ==========');
  const testObj = { id: 'test', fileName: 'test.xlsx', fileSize: 100, sheets: [] };
  console.log('是否为文件信息:', isFileInfo(testObj));

  console.log('\n========== 示例 6: 泛型使用 ==========');
  const apiResponse = createApiResponse({ message: 'Hello, World!' });
  console.log('API响应:', apiResponse);

  const paginatedResponse = createPaginatedResponse(
    [{ id: 1 }, { id: 2 }, { id: 3 }],
    10,
    1,
    3
  );
  console.log('分页响应:', paginatedResponse);
}

// 导出示例函数
export {
  createFileInfo,
  updateExecutionStatus,
  createValidationResult,
  handleError,
  createError,
  isFileInfo,
  createApiResponse,
  createPaginatedResponse,
  runExamples
};

// 如果直接运行此文件，执行示例
if (require.main === module) {
  runExamples();
}
