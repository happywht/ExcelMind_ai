# Vite 路径别名快速参考

## 路径别名配置

### 可用别名

| 别名 | 目标路径 | 示例用法 |
|------|----------|----------|
| `@config` | `./config/*` | `import { config } from '@config/app.config'` |
| `@services` | `./services/*` | `import { service } from '@services/api/service'` |
| `@components` | `./components/*` | `import { Button } from '@components/ui/button'` |
| `@types` | `./types/*` | `import { MyType } from '@types/myTypes'` |
| `@utils` | `./utils/*` | `import { helper } from '@utils/helpers'` |
| `@` | `./` | `import { module } from '@/lib/module'` |

## 导入规范

### ✅ 推荐用法

```typescript
// 1. 配置文件导入
import { degradationConfig } from '@config/degradation.config';
import { storageConfig } from '@config/storage.config';

// 2. 类型导入
import type {
  DegradationMode,
  DegradationLevel
} from '@types/degradationTypes';

import type {
  StorageConfig,
  IndexedDBConfig
} from '@types/storageTypes';

// 3. 服务导入
import { DegradationManager } from '@services/infrastructure/degradation';
import { IndexedDBService } from '@services/infrastructure/storage';

// 4. 组件导入
import { SmartExcel } from '@components/SmartExcel';
import { KnowledgeChat } from '@components/KnowledgeChat';

// 5. 工具函数导入
import { formatDate } from '@utils/dateHelpers';
```

### ❌ 避免使用

```typescript
// ❌ 深层相对路径（易错）
import { DegradationManager } from '../../../infrastructure/degradation';
import { config } from '../../config/app.config';

// ❌ 复杂的相对路径
import { Types } from '../../../../types/myTypes';

// ❌ 难以维护的路径
import { Component } from '../components/ui/sub/folder/Component';
```

## 常见场景

### 场景 1：从 services 导入

```typescript
// 位置：components/MyComponent.tsx
// ❌ 旧方式
import { excelService } from '../services/excelService';

// ✅ 新方式
import { excelService } from '@services/excelService';
```

### 场景 2：从 config 导入

```typescript
// 位置：services/api/myService.ts
// ❌ 旧方式
import { apiConfig } from '../../config/api.config';

// ✅ 新方式
import { apiConfig } from '@config/api.config';
```

### 场景 3：从 types 导入

```typescript
// 位置：services/infrastructure/storage/StateManager.ts
// ❌ 旧方式
import { StorageConfig } from '../../../types/storageTypes';

// ✅ 新方式
import type { StorageConfig } from '@types/storageTypes';
```

### 场景 4：从 components 导入

```typescript
// 位置：pages/Dashboard.tsx
// ❌ 旧方式
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';

// ✅ 新方式
import { Header } from '@components/Header';
import { Sidebar } from '@components/Sidebar';
```

## 迁移指南

### 步骤 1：识别需要修复的导入

```bash
# 查找所有深层相对路径导入
grep -r "from '\.\./\.\./\.\." src/

# 查找所有 config 相关导入
grep -r "from '\.\./\.\./config" src/

# 查找所有 types 相关导入
grep -r "from '\.\./\.\./types" src/
```

### 步骤 2：替换导入路径

```typescript
// 替换规则
'../../../types/*'  → '@types/*'
'../../../config/*' → '@config/*'
'../../types/*'     → '@types/*' (如果在 services 下)
'../../config/*'    → '@config/*' (如果在 services 下)
```

### 步骤 3：验证修复

```bash
# 1. TypeScript 检查
npx tsc --noEmit

# 2. Vite 构建
npm run build

# 3. 开发服务器
npm run dev
```

## 故障排查

### 问题 1：路径别名不生效

**症状**：`Cannot find module '@config/...'`

**解决方案**：
1. 检查 `vite.config.ts` 中的 `resolve.alias` 配置
2. 检查 `tsconfig.json` 中的 `paths` 配置
3. 确保添加了 `baseUrl: "./"`
4. 重启 TypeScript 服务器（VSCode: Cmd+Shift+P → TypeScript: Restart TS Server）

### 问题 2：IDE 显示红色波浪线

**症状**：VSCode 中导入路径显示错误

**解决方案**：
1. 重启 TypeScript 服务器
2. 检查 `tsconfig.json` 路径配置
3. 确保 `baseUrl` 和 `paths` 配置正确

### 问题 3：构建成功但运行时错误

**症状**：构建通过但浏览器报错

**解决方案**：
1. 检查 Vite 配置中的别名路径是否使用 `path.resolve`
2. 确保使用绝对路径而非相对路径
3. 清理缓存：`rm -rf node_modules/.vite`

## 最佳实践

### 1. 导入顺序

```typescript
// 1. React 和第三方库
import React from 'react';
import { Button } from 'antd';

// 2. 内部组件 (@components)
import { Header } from '@components/Header';
import { Sidebar } from '@components/Sidebar';

// 3. 服务 (@services)
import { excelService } from '@services/excelService';

// 4. 类型 (@types)
import type { MyType } from '@types/myTypes';

// 5. 配置 (@config)
import { config } from '@config/app.config';

// 6. 工具 (@utils)
import { helper } from '@utils/helpers';

// 7. 相对路径（仅限同目录模块）
import { localModule } from './localModule';
```

### 2. 类型导入

```typescript
// ✅ 推荐：使用 type 关键字
import type { MyType, MyInterface } from '@types/myTypes';

// ✅ 也可以：普通导入
import { MyType, MyInterface } from '@types/myTypes';
```

### 3. 动态导入

```typescript
// ✅ 路径别名在动态导入中也有效
const module = await import('@services/heavyModule');
```

## 配置文件参考

### vite.config.ts

```typescript
import path from 'path';

export default {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@config': path.resolve(__dirname, './config'),
      '@services': path.resolve(__dirname, './services'),
      '@components': path.resolve(__dirname, './components'),
      '@types': path.resolve(__dirname, './types'),
      '@utils': path.resolve(__dirname, './utils'),
    }
  }
};
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*": ["./*"],
      "@config/*": ["./config/*"],
      "@services/*": ["./services/*"],
      "@components/*": ["./components/*"],
      "@types/*": ["./types/*"],
      "@utils/*": ["./utils/*"]
    }
  }
}
```

## 快速检查清单

- [ ] 使用 `@config` 导入配置文件
- [ ] 使用 `@services` 导入服务
- [ ] 使用 `@components` 导入组件
- [ ] 使用 `@types` 导入类型定义
- [ ] 使用 `@utils` 导入工具函数
- [ ] 避免使用 `../` 跨目录导入
- [ ] 同目录模块可以使用 `./` 相对路径
- [ ] 重启 TypeScript 服务器以应用配置

---

**更新时间**：2025-01-24
**维护者**：全栈开发工程师
