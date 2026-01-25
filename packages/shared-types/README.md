# @excelmind/shared-types

> ExcelMind AI 共享类型库 - 前后端类型一致性保障

## 📋 概述

`@excelmind/shared-types` 是 ExcelMind AI 项目的核心类型定义库，旨在确保前端和后端使用相同的类型定义，避免类型不一致导致的问题。

## 🎯 核心特性

- ✅ **统一的类型定义**：前后端共享同一套类型
- ✅ **完整的 JSDoc 注释**：每个类型都有清晰的文档说明
- ✅ **TypeScript 严格模式**：确保类型安全
- ✅ **模块化设计**：按功能分类的类型文件
- ✅ **易于扩展**：支持自定义类型和扩展

## 📦 目录结构

```
packages/shared-types/
├── types/
│   ├── fileMetadata.ts      # 文件元数据类型
│   ├── executionTypes.ts    # 执行状态类型
│   ├── validationTypes.ts   # 验证结果类型
│   ├── errorTypes.ts        # 错误类型
│   └── index.ts             # 统一导出和通用类型
├── dist/                    # 编译输出目录
├── package.json             # 包配置
├── tsconfig.json            # TypeScript 配置
└── README.md                # 本文档
```

## 🚀 安装

### 作为本地包使用

```bash
# 在项目根目录安装
pnpm install
```

### 作为独立包发布

```bash
# 构建包
pnpm run build

# 发布到 npm
pnpm publish
```

## 📖 使用方法

### 基础用法

```typescript
// 导入所有类型
import * as Types from '@excelmind/shared-types';

// 使用枚举
const status = Types.ExecutionStatus.IN_PROGRESS;

// 使用接口
const fileInfo: Types.FileInfo = {
  id: 'file-001',
  fileName: 'data.xlsx',
  fileSize: 1024,
  lastModified: Date.now(),
  fileType: 'excel',
  sheets: []
};
```

### 按需导入

```typescript
// 只导入需要的类型
import { FileInfo, FileRole, ExecutionStatus } from '@excelmind/shared-types';

const role: FileRole = FileRole.PRIMARY;
const status: ExecutionStatus = ExecutionStatus.PENDING;
```

### 导入特定模块

```typescript
// 导入文件元数据类型
import { FileRole, FileInfo } from '@excelmind/shared-types/types/fileMetadata';

// 导入执行状态类型
import { ExecutionStage, ExecutionStatus } from '@excelmind/shared-types/types/executionTypes';

// 导入验证结果类型
import { ValidationResult, ValidationLevel } from '@excelmind/shared-types/types/validationTypes';

// 导入错误类型
import { ErrorCode, ErrorCategory, StandardError } from '@excelmind/shared-types/types/errorTypes';
```

## 📚 类型模块说明

### 1. fileMetadata.ts - 文件元数据类型

定义文件信息、文件角色和文件关系，支持多Sheet场景。

**核心类型：**
- `FileInfo` - 文件信息接口
- `FileRole` - 文件角色枚举（主数据源、辅助数据源、配置文件等）
- `SheetInfo` - Sheet信息接口
- `FileRelationship` - 文件关系接口
- `CrossSheetMapping` - 跨Sheet映射接口
- `DataSourceConfig` - 数据源配置接口

**使用场景：**
```typescript
import { FileInfo, FileRole } from '@excelmind/shared-types';

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
      sampleData: []
    }
  ]
};
```

### 2. executionTypes.ts - 执行状态类型

定义执行过程中的各种状态，支持四阶段执行模型（侦察→预审→分析→生成）。

**核心类型：**
- `ExecutionStage` - 执行阶段枚举
- `ExecutionStatus` - 执行状态枚举
- `StepType` - 步骤类型枚举
- `TaskProgress` - 任务进度接口
- `ExecutionStep` - 执行步骤接口
- `StepResult` - 步骤结果接口

**使用场景：**
```typescript
import { ExecutionStage, ExecutionStatus, TaskProgress } from '@excelmind/shared-types';

const progress: TaskProgress = {
  taskId: 'task-001',
  currentStage: ExecutionStage.ANALYSIS,
  percentage: 75,
  totalSteps: 10,
  completedSteps: 7,
  currentStepId: 'step-007',
  isRunning: true,
  isCompleted: false,
  isFailed: false,
  startTime: Date.now(),
  message: '正在分析数据...'
};
```

### 3. validationTypes.ts - 验证结果类型

统一验证相关的类型定义，支持内控三维校验。

**核心类型：**
- `ValidationLevel` - 验证级别枚举
- `ValidationStatus` - 验证状态枚举
- `InternalControlDimension` - 内控维度枚举
- `ValidationResult` - 验证结果接口
- `ValidationError` - 验证错误接口
- `InternalControlMetrics` - 内控指标接口

**使用场景：**
```typescript
import { ValidationResult, ValidationLevel, InternalControlDimension } from '@excelmind/shared-types';

const result: ValidationResult = {
  valid: true,
  status: 'passed',
  score: 95,
  warnings: [],
  errors: [],
  metrics: {
    rowCount: 100,
    columnCount: 10,
    internalControl: {
      completeness: { passed: true, score: 0.98, issues: [], checks: {} },
      accuracy: { passed: true, score: 0.95, issues: [], checks: {} },
      consistency: { passed: true, score: 0.92, issues: [], checks: {} }
    }
  },
  validatedAt: Date.now(),
  duration: 150
};
```

### 4. errorTypes.ts - 错误类型

定义标准错误类型，支持业务错误、系统错误、AI错误。

**核心类型：**
- `ErrorCategory` - 错误类别枚举
- `ErrorSeverity` - 错误严重级别枚举
- `ErrorCode` - 错误码枚举
- `StandardError` - 标准错误接口
- `ErrorAnalysis` - 错误分析结果接口
- `RepairStrategy` - 修复策略接口

**使用场景：**
```typescript
import { ErrorCode, ErrorCategory, ErrorSeverity, StandardError } from '@excelmind/shared-types';

const error: StandardError = {
  id: 'err-001',
  category: ErrorCategory.AI_SERVICE_ERROR,
  code: ErrorCode.AI_TIMEOUT,
  message: 'AI服务请求超时',
  userMessage: 'AI服务响应超时，请稍后重试',
  severity: ErrorSeverity.MEDIUM,
  retryable: true,
  timestamp: Date.now()
};
```

### 5. index.ts - 统一导出和通用类型

导出所有类型定义，并提供通用的工具类型。

**核心类型：**
- `ApiResponse<T>` - API响应基础接口
- `PaginationParams` - 分页参数接口
- `PaginationResponse<T>` - 分页响应接口
- `Config` - 系统配置接口
- `SessionInfo` - 会话信息接口
- `TaskInfo` - 任务信息接口
- `UserInfo` - 用户信息接口

**工具类型：**
- `DeepPartial<T>` - 深度可选类型
- `DeepReadOnly<T>` - 深度只读类型
- `Awaited<T>` - 提取Promise的返回值类型

## 🔧 开发指南

### 添加新类型

1. 在对应的 `types/*.ts` 文件中添加类型定义
2. 确保包含完整的 JSDoc 注释
3. 在 `types/index.ts` 中导出新类型
4. 运行构建命令验证

### 类型命名规范

- **接口**：使用 PascalCase，如 `FileInfo`
- **枚举**：使用 PascalCase，如 `FileRole`
- **类型别名**：使用 PascalCase，如 `TaskProgress`
- **枚举值**：使用 UPPER_SNAKE_CASE，如 `PRIMARY`

### 注释规范

每个类型定义必须包含 JSDoc 注释：

```typescript
/**
 * 类型/接口的简短描述
 * @description 详细描述（可选）
 * @module 模块路径（可选）
 * @example 使用示例（可选）
 */
export interface MyType {
  /** 属性描述 */
  propertyName: string;
}
```

## 🏗️ 构建

```bash
# 清理构建目录
pnpm run clean

# 构建类型定义
pnpm run build

# 监听模式（开发时使用）
pnpm run watch
```

## 📋 质量标准

- ✅ 所有类型定义有清晰的 JSDoc 注释
- ✅ 类型命名遵循 PascalCase
- ✅ 接口以 `I` 开头或使用 type alias
- ✅ 枚举使用 PascalCase
- ✅ 避免使用 `any` 类型
- ✅ 导出的类型有明确的用途说明
- ✅ TypeScript 严格模式通过

## 🔗 相关文档

- [Phase 2 实施计划](../../docs/PHASE2_GO_NO_GO_DECISION.md)
- [架构评审](../../docs/ARCHITECTURE_REVIEW_PHASE2.md)
- [前端实施计划](../../docs/FRONTEND_PHASE2_IMPLEMENTATION_PLAN.md)
- [后端实施计划](../../docs/BACKEND_PHASE2_IMPLEMENTATION_PLAN.md)

## 📝 版本历史

### 1.0.0 (2026-01-24)

初始版本，包含以下类型模块：
- ✅ 文件元数据类型
- ✅ 执行状态类型
- ✅ 验证结果类型
- ✅ 错误类型
- ✅ 通用类型和工具类型

## 👥 贡献者

- ExcelMind AI Team

## 📄 许可证

MIT

---

**维护者**: ExcelMind AI Team
**最后更新**: 2026-01-24
**版本**: 1.0.0
