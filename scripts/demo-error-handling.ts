/**
 * 错误处理系统演示脚本
 *
 * 演示统一错误处理体系的功能
 *
 * 运行方式: npx tsx scripts/demo-error-handling.ts
 */

import {
  ValidationError,
  NotFoundError,
  TaskNotFoundError,
  TemplateNotFoundError,
  DocumentGenerationError,
  AIServiceError,
  InternalServerError,
  isAppError,
  toAppError
} from '../types/errors';

import { ErrorHandler } from '../utils/errorHandler';

console.log('========================================');
console.log('错误处理系统演示');
console.log('========================================\n');

// ============================================================================
// 1. 基础错误类演示
// ============================================================================

console.log('1. 基础错误类演示');
console.log('----------------------------------------');

// ValidationError
const validationError = new ValidationError(
  'email',
  'Invalid email format',
  'test@example'
);
console.log('ValidationError:');
console.log(JSON.stringify(validationError.toJSON(), null, 2));
console.log();

// NotFoundError
const notFoundError = new NotFoundError('User', '12345');
console.log('NotFoundError:');
console.log(JSON.stringify(notFoundError.toJSON(), null, 2));
console.log();

// TaskNotFoundError
const taskNotFoundError = new TaskNotFoundError('task_abc123');
console.log('TaskNotFoundError:');
console.log(JSON.stringify(taskNotFoundError.toJSON(), null, 2));
console.log();

// TemplateNotFoundError
const templateNotFoundError = new TemplateNotFoundError('tpl_xyz789');
console.log('TemplateNotFoundError:');
console.log(JSON.stringify(templateNotFoundError.toJSON(), null, 2));
console.log();

// ============================================================================
// 2. 错误上下文演示
// ============================================================================

console.log('2. 错误上下文演示');
console.log('----------------------------------------');

const errorWithContext = new ValidationError('password', 'Password is weak');
errorWithContext.withContext({
  minLength: 8,
  currentLength: 5,
  strength: 'weak'
});

console.log('Error with context:');
console.log(JSON.stringify(errorWithContext.toJSON(), null, 2));
console.log();

// ============================================================================
// 3. 错误链演示
// ============================================================================

console.log('3. 错误链演示');
console.log('----------------------------------------');

const originalError = new Error('Network timeout');
const aiServiceError = new AIServiceError(
  'AI service call failed',
  'openai',
  true,
  originalError
);

console.log('AIServiceError with cause:');
console.log(JSON.stringify(aiServiceError.toJSON(), null, 2));
console.log('Original error:', aiServiceError.cause?.message);
console.log();

// ============================================================================
// 4. ErrorHandler 工具演示
// ============================================================================

console.log('4. ErrorHandler 工具演示');
console.log('----------------------------------------');

// handleError - 标准错误
const standardError = new Error('Something went wrong');
const handledError = ErrorHandler.handleError(standardError, 'UserService.createUser');
console.log('Handled standard error:');
console.log(JSON.stringify(handledError.toJSON(), null, 2));
console.log();

// handleError - AppError (保持不变)
const appError = new ValidationError('test', 'Test error');
const handledAppError = ErrorHandler.handleError(appError);
console.log('Handled AppError (should be same instance):');
console.log('Same instance:', handledAppError === appError);
console.log();

// isRetryable
console.log('Error retryability:');
console.log('- ValidationError retryable:', ErrorHandler.isRetryable(validationError));
console.log('- InternalServerError retryable:', ErrorHandler.isRetryable(new InternalServerError()));
console.log('- AIServiceError (retryable=true) retryable:', ErrorHandler.isRetryable(aiServiceError));
console.log();

// getUserMessage
console.log('User-friendly messages:');
console.log('- ValidationError:', ErrorHandler.getUserMessage(validationError));
console.log('- Network error:', ErrorHandler.getUserMessage(new Error('ECONNRESET')));
console.log('- Unknown error:', ErrorHandler.getUserMessage(new Error('Unknown error')));
console.log();

// ============================================================================
// 5. handleAsync 演示
// ============================================================================

console.log('5. handleAsync 演示');
console.log('----------------------------------------');

async function demoHandleAsync() {
  // 成功案例
  const successResult = await ErrorHandler.handleAsync(
    async () => {
      return 'Operation successful';
    },
    'DemoService.success'
  );
  console.log('Success result:', successResult);
  console.log();

  // 失败案例
  try {
    await ErrorHandler.handleAsync(
      async () => {
        throw new Error('Async operation failed');
      },
      'DemoService.failure'
    );
  } catch (error) {
    console.log('Caught async error:');
    if (isAppError(error)) {
      console.log(JSON.stringify(error.toJSON(), null, 2));
    }
    console.log();
  }
}

demoHandleAsync().then(() => {
  // ============================================================================
  // 6. 工具函数演示
  // ============================================================================

  console.log('6. 工具函数演示');
  console.log('----------------------------------------');

  // isAppError
  console.log('isAppError checks:');
  console.log('- ValidationError is AppError:', isAppError(validationError));
  console.log('- standard Error is AppError:', isAppError(new Error()));
  console.log();

  // toAppError
  console.log('toAppError conversions:');
  const converted1 = toAppError(validationError);
  console.log('- AppError -> AppError (same):', converted1 === validationError);

  const converted2 = toAppError(new Error('test'));
  console.log('- Error -> AppError:', converted2.constructor.name);

  const converted3 = toAppError('string error');
  console.log('- string -> AppError:', converted3.constructor.name);
  console.log();

  // ============================================================================
  // 总结
  // ============================================================================

  console.log('========================================');
  console.log('错误处理系统演示完成!');
  console.log('========================================');
  console.log();
  console.log('功能特性:');
  console.log('✅ 统一的错误类层级');
  console.log('✅ 错误上下文和链追踪');
  console.log('✅ 自动错误转换');
  console.log('✅ 可重试性判断');
  console.log('✅ 用户友好的错误消息');
  console.log('✅ 异步错误处理');
  console.log('✅ 类型安全');
  console.log();
  console.log('更多信息请参考: docs/ERROR_HANDLING_GUIDE.md');
});
