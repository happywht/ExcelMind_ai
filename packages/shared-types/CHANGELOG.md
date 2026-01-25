# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-24

### Added
- ✨ 初始版本发布
- ✅ 文件元数据类型模块 (`fileMetadata.ts`)
  - `FileInfo` - 文件信息接口
  - `FileRole` - 文件角色枚举（主数据源、辅助数据源、配置文件等）
  - `SheetInfo` - Sheet信息接口
  - `FileRelationship` - 文件关系接口
  - `CrossSheetMapping` - 跨Sheet映射接口
  - `DataSourceConfig` - 数据源配置接口
  - `DataQualityMetrics` - 数据质量指标接口

- ✅ 执行状态类型模块 (`executionTypes.ts`)
  - `ExecutionStage` - 执行阶段枚举（四阶段执行模型）
  - `ExecutionStatus` - 执行状态枚举
  - `StepType` - 步骤类型枚举
  - `TaskProgress` - 任务进度接口
  - `ExecutionStep` - 执行步骤接口
  - `StepResult` - 步骤结果接口
  - `ExecutionState` - 执行状态接口
  - `ExecutionHistoryEntry` - 执行历史条目接口
  - `DocumentGenerationTask` - 文档生成任务接口
  - `ExecutionPlan` - 执行计划接口
  - `QualityReport` - 质量报告接口
  - `ExecutionStatistics` - 执行统计接口

- ✅ 验证结果类型模块 (`validationTypes.ts`)
  - `ValidationLevel` - 验证级别枚举
  - `ValidationStatus` - 验证状态枚举
  - `InternalControlDimension` - 内控维度枚举
  - `ValidationError` - 验证错误接口
  - `ValidationResult` - 验证结果接口
  - `ValidationMetrics` - 验证指标接口
  - `ValidationDataQualityMetrics` - 验证数据质量指标接口
  - `InternalControlMetrics` - 内控指标接口
  - `ValidationConfig` - 验证配置接口
  - `ValidationRule` - 验证规则接口
  - `ValidationOptions` - 验证选项接口
  - `ValidationReport` - 验证报告接口

- ✅ 错误类型模块 (`errorTypes.ts`)
  - `ErrorCategory` - 错误类别枚举
  - `ErrorSeverity` - 错误严重级别枚举
  - `ErrorCode` - 错误码枚举
  - `StandardError` - 标准错误接口
  - `ErrorResponse` - 错误响应接口
  - `ErrorAnalysis` - 错误分析结果接口
  - `RepairStrategy` - 修复策略接口
  - `ErrorReport` - 错误报告接口
  - `ErrorStatistics` - 错误统计接口
  - `ErrorContext` - 错误上下文接口
  - `ErrorHandlingOptions` - 错误处理选项接口
  - `ErrorHandlingResult` - 错误处理结果接口
  - `AIErrorDetails` - AI错误详情接口

- ✅ 统一导出和通用类型模块 (`index.ts`)
  - 通用状态枚举 (`CommonStatus`)
  - 分页参数和响应接口 (`PaginationParams`, `PaginationResponse`)
  - API响应基础接口 (`ApiResponse`)
  - 系统配置接口 (`Config`, `SystemConfig`)
  - AI服务配置接口 (`AIServiceConfig`)
  - 缓存配置接口 (`CacheConfig`)
  - 执行配置接口 (`ExecutionConfig`)
  - 日志配置接口 (`LoggingConfig`)
  - 会话信息接口 (`SessionInfo`)
  - 任务信息接口 (`TaskInfo`)
  - 用户信息接口 (`UserInfo`)
  - 工具类型 (`DeepPartial`, `DeepReadOnly`, `Awaited` 等)
  - 事件相关接口 (`Event`, `EventHandler`)
  - 健康检查接口 (`HealthCheckResult`)
  - 功能开关接口 (`FeatureFlag`)
  - 缓存相关接口 (`CacheKey`, `CacheEntry`)
  - 版本信息接口 (`VersionInfo`)

### Documentation
- 📝 完整的 README.md 文档
- 📝 使用示例 (`examples/usage.ts`)
- 📝 JSDoc 注释（所有类型定义）
- 📝 TypeScript 声明文件生成

### Build
- 🔧 TypeScript 配置 (`tsconfig.json`)
- 🔧 NPM 包配置 (`package.json`)
- 🔧 构建脚本配置
- 🔧 Git 忽略文件配置 (`.gitignore`)
- 🔧 NPM 发布忽略文件配置 (`.npmignore`)

### Features
- ✅ TypeScript 严格模式支持
- ✅ 完整的类型声明文件生成
- ✅ 模块化设计，按需导入
- ✅ 统一的命名规范
- ✅ 清晰的类型层级结构

---

## 版本说明

### 版本号规则
- **主版本号（Major）**：不兼容的 API 修改
- **次版本号（Minor）**：向下兼容的功能性新增
- **修订号（Patch）**：向下兼容的问题修正

### 更新类型
- **Added** - 新增功能
- **Changed** - 功能变更
- **Deprecated** - 即将废弃的功能
- **Removed** - 已删除的功能
- **Fixed** - 问题修复
- **Security** - 安全性修复

---

**维护者**: ExcelMind AI Team
**最后更新**: 2026-01-24
