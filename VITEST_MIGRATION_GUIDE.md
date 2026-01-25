# Vitest 迁移指南

## 🎯 迁移状态

### ✅ 已完成
- **测试框架迁移**: 从 Jest 迁移到 Vitest
- **配置文件创建**: `vitest.config.ts` 和 `tests/setup.vitest.ts`
- **package.json 更新**: 所有测试脚本已更新为使用 Vitest
- **ESM 模块支持**: 完全支持 ESM 模块，无需额外配置
- **测试环境设置**: 完整的测试环境配置，包括 jsdom 和浏览器模拟

### 📊 当前测试状态
- **总测试数**: 271
- **通过**: 170 (62.7%)
- **失败**: 101 (37.3%)

## 🔄 迁移过程

### 1. 从 Jest 到 Vitest 的变化

#### 全局变量替换
| Jest | Vitest |
|------|--------|
| `jest.fn()` | `vi.fn()` |
| `jest.mock()` | `vi.mock()` |
| `jest.spyOn()` | `vi.spyOn()` |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` |
| `jest.resetAllMocks()` | `vi.resetAllMocks()` |
| `jest.restoreAllMocks()` | `vi.restoreAllMocks()` |

#### 导入变化
```typescript
// 旧的 Jest 导入
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// 新的 Vitest 导入（可选，已启用全局模式）
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
```

### 2. 需要修复的测试文件

#### 严重问题文件（使用 `jest` 全局变量）
以下文件需要将 `jest` 替换为 `vi`：

1. **services/functionCalling/__tests__/functionCalling.test.ts**
   ```typescript
   // 修复：删除或替换 jest.fn() 为 vi.fn()
   ```

2. **services/infrastructure/__tests__/retryService.test.ts**
   ```typescript
   // 将所有 jest.fn() 替换为 vi.fn()
   ```

3. **services/infrastructure/degradation/__tests__/MemoryMonitor.test.ts**
   ```typescript
   // 将所有 jest.fn() 替换为 vi.fn()
   ```

#### 代码问题文件
以下文件有代码语法错误：

1. **services/infrastructure/eventBus.test.ts**
   - 错误：多重导出同名
   - 修复：需要修复源文件 `services/infrastructure/eventBus.ts`

2. **services/infrastructure/degradation/__tests__/DegradationManager.test.ts**
   - 错误：在非 async 函数中使用 await
   - 修复：将相关测试函数标记为 `async`

#### 缺失依赖文件
以下文件缺少类型定义：

1. **services/infrastructure/degradation/__tests__/APICircuitBreaker.test.ts**
2. **services/infrastructure/degradation/__tests__/DegradationNotifier.test.ts**
   - 缺失：`types/degradationTypes`
   - 修复：创建类型定义文件或更新导入路径

## 🛠️ 快速修复指南

### 步骤 1: 更新测试文件中的 Jest 引用

```bash
# 查找所有使用 jest 的测试文件
grep -r "jest\." services/ --include="*.test.ts" --include="*.test.tsx"
```

### 步骤 2: 批量替换

在大多数测试文件中：
```typescript
// 添加 Vitest 导入（如果未启用全局模式）
import { vi } from 'vitest';

// 替换
jest.fn() -> vi.fn()
jest.mock() -> vi.mock()
jest.spyOn() -> vi.spyOn()
```

### 步骤 3: 修复代码问题

1. **修复 eventBus.ts 的多重导出问题**
2. **修复 DegradationManager.test.ts 的 async/await 问题**
3. **创建缺失的类型定义文件**

## 📋 测试命令

### 基本测试命令
```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行组件测试
npm run test:component

# 运行覆盖率测试
npm run test:coverage

# 监视模式
npm run test:watch

# UI 界面
npm run test:ui
```

### 高级测试命令
```bash
# 运行特定测试文件
npx vitest run services/infrastructure/__tests__/cacheService.test.ts

# 运行特定目录的测试
npx vitest run services

# 清除缓存
npm run test:clear-cache
```

## 🎯 Vitest 优势

### 相比 Jest 的改进
1. **原生 ESM 支持**: 无需复杂配置即可使用 ES 模块
2. **更快的执行速度**: 使用 Vite 的转换管道，测试启动更快
3. **更好的 TypeScript 支持**: 无需额外的配置
4. **内置覆盖率**: 使用 v8 提供快速的覆盖率报告
5. **UI 界面**: 提供可视化的测试运行界面
6. **更好的监视模式**: 基于 Vite HMR 的智能文件监听

## 📈 下一步计划

### 短期（1-2 周）
- [ ] 修复所有使用 `jest` 全局变量的测试文件
- [ ] 修复代码语法错误
- [ ] 创建缺失的类型定义文件
- [ ] 达到 80% 以上的测试通过率

### 中期（1 个月）
- [ ] 优化测试性能
- [ ] 增加测试覆盖率到 85% 以上
- [ ] 建立持续集成质量门禁
- [ ] 完善测试文档

### 长期（3 个月）
- [ ] 实现端到端测试自动化
- [ ] 建立性能测试基准
- [ ] 实现视觉回归测试
- [ ] 建立测试数据管理策略

## 🔗 相关资源

- [Vitest 官方文档](https://vitest.dev/)
- [从 Jest 迁移到 Vitest](https://vitest.dev/guide/migration.html)
- [Vitest 配置参考](https://vitest.dev/config/)

## 📞 支持

如有问题，请联系测试自动化工程师或查看项目 Wiki。
