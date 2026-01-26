# 错误处理使用指南

## 概述

本文档介绍 ExcelMind AI 项目的统一错误处理体系，包括错误类层级、错误处理工具和最佳实践。

## 目录

1. [错误类层级](#错误类层级)
2. [错误处理工具](#错误处理工具)
3. [中间件使用](#中间件使用)
4. [服务层集成](#服务层集成)
5. [最佳实践](#最佳实践)
6. [示例代码](#示例代码)

---

## 错误类层级

### 基础错误类

所有应用错误都继承自 `AppError` 基类：

```typescript
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
  ConflictError
} from '@/types/errors';
```

### 领域特定错误

#### 模板和文档生成

```typescript
import {
  TemplateNotFoundError,
  TemplateInvalidError,
  DocumentGenerationError,
  TaskNotFoundError,
  TaskStatusError
} from '@/types/errors';
```

#### AI服务

```typescript
import {
  AIServiceError,
  AIOutputValidationError
} from '@/types/errors';
```

#### 数据质量

```typescript
import {
  DataQualityError
} from '@/types/errors';
```

#### 文件处理

```typescript
import {
  FileNotFoundError,
  FileFormatError,
  FileParseError
} from '@/types/errors';
```

#### SQL

```typescript
import {
  SQLSyntaxError,
  SQLExecutionError
} from '@/types/errors';
```

---

## 错误处理工具

### ErrorHandler 类

`ErrorHandler` 提供了静态方法用于错误处理、转换和判断。

#### handleError

将任意错误转换为 `AppError`：

```typescript
import { ErrorHandler } from '@/utils/errorHandler';

try {
  // 一些操作
} catch (error) {
  const appError = ErrorHandler.handleError(error, 'UserService.createUser');
  // appError 是 AppError 实例
}
```

#### handleAsync

包装异步操作，自动处理错误：

```typescript
const result = await ErrorHandler.handleAsync(
  async () => {
    return await someAsyncOperation();
  },
  'ContextService.getContext'
);
```

#### isRetryable

判断错误是否可重试：

```typescript
if (ErrorHandler.isRetryable(error)) {
  // 重试逻辑
}
```

#### getUserMessage

获取用户友好的错误消息：

```typescript
const userMessage = ErrorHandler.getUserMessage(error);
// "网络连接失败，请检查网络设置后重试"
```

#### logError

记录错误到日志：

```typescript
ErrorHandler.logError(error, {
  userId: '12345',
  action: 'document.generate'
});
```

### 装饰器

使用装饰器自动捕获方法错误：

```typescript
import { catchErrors } from '@/utils/errorHandler';

class UserService {
  @catchErrors('UserService.createUser')
  async createUser(data: CreateUserDto) {
    // 方法逻辑
    // 任何错误都会被自动捕获、记录和转换
  }
}
```

### 重试工具

使用 `withRetry` 创建可重试的操作：

```typescript
import { withRetry } from '@/utils/errorHandler';

const createUserWithRetry = withRetry(
  () => apiClient.createUser(userData),
  3, // 最大重试次数
  1000 // 初始延迟（毫秒）
);

await createUserWithRetry();
```

---

## 中间件使用

### 配置错误处理中间件

```typescript
import { errorHandler } from '@/api/middleware/errorHandler';

app.use(errorHandler({
  showDetails: process.env.NODE_ENV !== 'production',
  showStackTrace: process.env.NODE_ENV === 'development',
  logErrors: true
}));
```

### 使用 asyncHandler 包装路由

```typescript
import { asyncHandler } from '@/api/middleware/errorHandler';

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json(user);
}));
```

### 抛出API错误

```typescript
import { throwApiError, ApiErrorCode } from '@/api/middleware/errorHandler';

if (!user) {
  throwApiError(ApiErrorCode.NOT_FOUND, 'User not found');
}
```

---

## 服务层集成

### 在服务中抛出标准错误

```typescript
import { TemplateNotFoundError, ValidationError } from '@/types/errors';

class TemplateService {
  async getTemplate(id: string) {
    const template = await this.repository.findById(id);

    if (!template) {
      throw new TemplateNotFoundError(id);
    }

    return template;
  }

  async validateTemplate(template: Template) {
    if (!template.name) {
      throw new ValidationError(
        'name',
        'Template name is required',
        template.name
      );
    }
  }
}
```

### 使用 ErrorHandler 包装外部调用

```typescript
import { ErrorHandler } from '@/utils/errorHandler';

class ExternalService {
  async fetchData() {
    return ErrorHandler.handleAsync(
      () => this.externalApi.getData(),
      'ExternalService.fetchData'
    );
  }
}
```

---

## 最佳实践

### 1. 使用合适的错误类型

选择最具体的错误类型：

```typescript
// ❌ 不好
throw new Error('Template not found');

// ✅ 好
throw new TemplateNotFoundError(templateId);
```

### 2. 提供有用的上下文信息

```typescript
// ❌ 不好
throw new ValidationError('field', 'Invalid value');

// ✅ 好
throw new ValidationError(
  'email',
  'Invalid email format',
  userEmail,
  new Error('Validation failed')
);
```

### 3. 使用错误链追踪原始错误

```typescript
try {
  await this.externalApi.call();
} catch (error) {
  throw new AIServiceError(
    'AI service call failed',
    'openai',
    true, // 可重试
    error as Error // 保留原始错误
  );
}
```

### 4. 不要泄露敏感信息

```typescript
// ❌ 不好
throw new Error(`Authentication failed for user ${username} with password ${password}`);

// ✅ 好
throw new UnauthorizedError('Invalid credentials');
```

### 5. 记录错误上下文

```typescript
try {
  await this.processDocument(documentId);
} catch (error) {
  const appError = ErrorHandler.handleError(error);
  appError.withContext({
    documentId,
    userId: session.userId,
    action: 'document.process'
  });
  ErrorHandler.logError(appError);
  throw appError;
}
```

### 6. 判断错误可重试性

```typescript
try {
  await this.externalApi.call();
} catch (error) {
  if (ErrorHandler.isRetryable(error as Error)) {
    // 重试逻辑
    await this.retryWithBackoff();
  } else {
    // 不重试，直接抛出
    throw error;
  }
}
```

---

## 示例代码

### 完整的服务示例

```typescript
import { catchErrors } from '@/utils/errorHandler';
import {
  ValidationError,
  TemplateNotFoundError,
  DocumentGenerationError
} from '@/types/errors';

class DocumentService {
  private templateService: TemplateService;
  private generator: DocumentGenerator;

  @catchErrors('DocumentService.generateDocument')
  async generateDocument(request: GenerateDocumentRequest) {
    // 验证输入
    if (!request.templateId) {
      throw new ValidationError(
        'templateId',
        'Template ID is required',
        request.templateId
      );
    }

    if (!request.data) {
      throw new ValidationError(
        'data',
        'Document data is required',
        request.data
      );
    }

    // 获取模板
    const template = await ErrorHandler.handleAsync(
      () => this.templateService.getTemplate(request.templateId),
      'DocumentService.generateDocument.getTemplate'
    );

    // 生成文档
    try {
      const document = await this.generator.generate(template, request.data);
      return document;
    } catch (error) {
      throw new DocumentGenerationError(
        error instanceof Error ? error.message : 'Generation failed',
        request.templateId,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async batchGenerate(requests: GenerateDocumentRequest[]) {
    const results = await Promise.allSettled(
      requests.map(req => this.generateDocument(req))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      total: requests.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        request: requests[i],
        status: r.status,
        value: r.status === 'fulfilled' ? r.value : null,
        reason: r.status === 'rejected' ? r.reason : null
      }))
    };
  }
}
```

### 控制器示例

```typescript
import { asyncHandler } from '@/api/middleware/errorHandler';
import { ValidationError, NotFoundError } from '@/types/errors';

class DocumentController {
  constructor(private documentService: DocumentService) {}

  generate = asyncHandler(async (req, res) => {
    const request: GenerateDocumentRequest = {
      templateId: req.body.templateId,
      data: req.body.data
    };

    const document = await this.documentService.generateDocument(request);

    res.json({
      success: true,
      data: document
    });
  });

  getTemplate = asyncHandler(async (req, res) => {
    const templateId = req.params.id;

    if (!templateId) {
      throw new ValidationError('id', 'Template ID is required');
    }

    const template = await this.documentService.getTemplate(templateId);

    res.json({
      success: true,
      data: template
    });
  });
}
```

---

## 错误代码参考

完整的错误代码定义请参考：
- `types/errorCodes.ts` - API错误代码枚举
- `types/errors.ts` - 错误类定义

### 错误代码分类

- **1xxx**: 通用错误
- **2xxx**: 文件处理错误
- **3xxx**: 数据处理错误
- **4xxx**: 模板和文档生成错误
- **5xxx**: 审计规则错误
- **6xxx**: SQL相关错误
- **7xxx**: 质量控制错误
- **8xxx**: 性能监控错误
- **9xxx**: WebSocket错误

---

## 总结

统一的错误处理体系提供：

1. **类型安全**: TypeScript 类型检查确保错误使用的正确性
2. **一致性**: 统一的错误格式和处理方式
3. **可追踪性**: 错误链追踪，便于调试
4. **安全性**: 自动过滤敏感信息
5. **可重试性**: 内置错误重试判断
6. **用户友好**: 清晰的错误消息和代码

遵循这些最佳实践可以显著提升应用的可靠性和用户体验。
