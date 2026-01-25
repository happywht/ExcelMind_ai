# 虚拟文件系统 (VFS) 服务

## 概述

虚拟文件系统 (Virtual File System, VFS) 是 ExcelMind AI 的核心基础设施，提供 `/mnt` 虚拟工作台的完整文件管理功能。

## 核心功能

### 1. 文件管理

- ✅ 文件上传和下载
- ✅ 文件 CRUD 操作
- ✅ 文件角色分配
- ✅ 文件版本管理
- ✅ 大文件处理（>50MB）

### 2. 文件角色

支持以下文件角色：

- `PRIMARY_SOURCE` - 主数据源
- `AUXILIARY_SOURCE` - 辅助数据源
- `CONFIGURATION` - 配置文件
- `TEMPLATE` - 模板文件
- `OUTPUT` - 输出文件
- `TEMPORARY` - 临时文件

### 3. 文件关系

- 📊 关系图谱构建
- 🔍 循环依赖检测
- 📈 依赖分析
- ⚡ 级联影响分析
- 🔗 路径查找

### 4. 跨Sheet访问

- 📝 Sheet 引用解析
- ✅ 引用验证
- 🔄 循环引用检测
- 💾 引用缓存
- 📊 引用分析

## 快速开始

### 基本使用

```typescript
import { getVirtualWorkspaceManager, FileRole } from '@/services/infrastructure/vfs';

// 1. 初始化工作台
const workspace = getVirtualWorkspaceManager();
await workspace.initialize();

// 2. 上传文件
const file = document.querySelector('input[type="file"]').files[0];
const fileInfo = await workspace.uploadFile(file, FileRole.PRIMARY_SOURCE);

console.log('File uploaded:', fileInfo);
```

### 搜索文件

```typescript
// 搜索所有 Excel 文件
const results = await workspace.searchFiles({
  type: 'excel',
  limit: 10,
});

// 搜索特定角色的文件
const primaryFiles = await workspace.searchFiles({
  role: FileRole.PRIMARY_SOURCE,
});
```

### 创建文件关系

```typescript
import { RelationType } from '@/services/infrastructure/vfs';

// 创建依赖关系
await workspace.addRelationship(
  file1.id,  // 源文件
  file2.id,  // 目标文件
  RelationType.DEPENDS_ON
);

// 获取关系图谱
const graph = await workspace.getRelationshipGraph({
  rootId: file1.id,
  maxDepth: 3,
});
```

### 跨Sheet操作

```typescript
// 解析Sheet引用
const references = await workspace.parseSheetReferences(
  'Sheet1',
  data
);

// 验证引用
const validation = await workspace.validateSheetReferences(
  references,
  ['Sheet1', 'Sheet2', 'Sheet3']
);
```

## API 参考

### VirtualWorkspaceManager

主入口点，提供统一的 API。

#### 方法

| 方法 | 描述 |
|------|------|
| `initialize()` | 初始化工作台 |
| `uploadFile(file, role, options?)` | 上传文件 |
| `uploadFiles(files[])` | 批量上传 |
| `deleteFile(id)` | 删除文件 |
| `updateFile(id, updates)` | 更新文件 |
| `searchFiles(query)` | 搜索文件 |
| `getFileDetails(id)` | 获取文件详情 |
| `listDirectory(path?)` | 列出目录 |
| `addRelationship(fromId, toId, type)` | 添加关系 |
| `getRelationshipGraph(options?)` | 获取关系图谱 |
| `analyzeCascadeImpact(id)` | 分析级联影响 |
| `getStats()` | 获取统计信息 |

### VirtualFileSystem

核心文件系统服务。

#### 方法

| 方法 | 描述 |
|------|------|
| `uploadFile(file, role, options?)` | 上传文件 |
| `readFile(id)` | 读取文件 |
| `deleteFile(id)` | 删除文件 |
| `updateFile(id, updates)` | 更新文件 |
| `listDirectory(path?)` | 列出目录 |
| `createDirectory(path)` | 创建目录 |
| `addRelationship(fromId, toId, type)` | 添加关系 |
| `getRelationships(id)` | 获取关系 |
| `createVersion(id, comment?)` | 创建版本 |
| `getVersions(id)` | 获取版本列表 |
| `restoreVersion(id, versionId)` | 恢复版本 |
| `getStats()` | 获取统计信息 |

### FileMetadataService

文件元数据管理服务。

#### 方法

| 方法 | 描述 |
|------|------|
| `getExtendedMetadata(id)` | 获取扩展元数据 |
| `searchFiles(query)` | 搜索文件 |
| `getStats()` | 获取统计信息 |
| `createTag(name, options?)` | 创建标签 |
| `deleteTag(id)` | 删除标签 |
| `addTagToFile(fileId, tagId)` | 添加标签 |
| `removeTagFromFile(fileId, tagId)` | 移除标签 |
| `setSchema(fileId, schema)` | 设置Schema |
| `getSchema(fileId)` | 获取Schema |

### FileRelationshipService

文件关系管理服务。

#### 方法

| 方法 | 描述 |
|------|------|
| `getRelationshipGraph(options?)` | 获取关系图谱 |
| `findPath(fromId, toId)` | 查找路径 |
| `analyzeDependencies(id)` | 分析依赖 |
| `analyzeCascadeImpact(id)` | 分析级联影响 |
| `getDependencies(id)` | 获取依赖 |
| `getDependents(id)` | 获取依赖者 |
| `detectCircularDependencies()` | 检测循环依赖 |

### CrossSheetService

跨Sheet访问服务。

#### 方法

| 方法 | 描述 |
|------|------|
| `parseReferences(sheetName, data)` | 解析引用 |
| `parseAllReferences(sheets)` | 批量解析 |
| `validateReferences(refs, sheets)` | 验证引用 |
| `detectCircularReferences(refs)` | 检测循环引用 |
| `resolveReferences(refs, data)` | 解析引用值 |
| `createSnapshot(fileId, sheet, data)` | 创建快照 |
| `analyzeReferences(refs)` | 分析引用 |

## 配置选项

```typescript
interface WorkspaceConfig {
  maxFileSize?: number;          // 最大文件大小（默认：100MB）
  enableVersioning?: boolean;    // 是否启用版本管理（默认：true）
  enableRelationships?: boolean; // 是否启用关系管理（默认：true）
  autoSave?: boolean;            // 是否自动保存（默认：false）
  autoSaveInterval?: number;     // 自动保存间隔（默认：5分钟）
  redis?: {
    host?: string;               // Redis 主机
    port?: number;               // Redis 端口
    password?: string;           // Redis 密码
  };
}

// 使用自定义配置
const workspace = getVirtualWorkspaceManager({
  maxFileSize: 200 * 1024 * 1024,  // 200MB
  enableVersioning: true,
  autoSave: true,
  autoSaveInterval: 600000,  // 10分钟
});
```

## 目录结构

```
/mnt
├── data/          # 数据文件
│   ├── input.xlsx
│   └── reference.xlsx
├── temp/          # 临时文件
├── output/        # 输出文件
├── config/        # 配置文件
└── template/      # 模板文件
```

## 事件

工作台管理器会发出以下事件：

| 事件 | 描述 | 数据 |
|------|------|------|
| `initialized` | 工作台初始化完成 | - |
| `status:changed` | 状态改变 | `WorkspaceStatus` |
| `file:uploaded` | 文件上传 | `VirtualFileInfo` |
| `file:deleted` | 文件删除 | `{ vfsId, fileInfo }` |
| `file:updated` | 文件更新 | `VirtualFileInfo` |
| `relationship:added` | 关系添加 | `FileRelationship` |
| `version:created` | 版本创建 | `VersionInfo` |
| `version:restored` | 版本恢复 | `{ vfsId, versionId }` |
| `tag:created` | 标签创建 | `FileTag` |
| `file:tagged` | 文件打标签 | `{ fileId, tagId }` |

### 事件监听

```typescript
workspace.on('file:uploaded', (fileInfo) => {
  console.log('New file uploaded:', fileInfo.name);
});

workspace.on('status:changed', (status) => {
  console.log('Workspace status:', status);
});
```

## 错误处理

所有服务方法都可能抛出错误。建议使用 try-catch 处理：

```typescript
try {
  const fileInfo = await workspace.uploadFile(file, FileRole.PRIMARY_SOURCE);
  console.log('Success:', fileInfo);
} catch (error) {
  if (error.message.includes('File size exceeds')) {
    console.error('File too large');
  } else if (error.message.includes('circular dependency')) {
    console.error('Circular dependency detected');
  } else {
    console.error('Upload failed:', error);
  }
}
```

## 性能优化

### 大文件处理

对于大文件（>50MB），系统会：

1. **分块读取** - 分块处理避免内存溢出
2. **流式传输** - 使用流式传输减少内存占用
3. **进度反馈** - 提供实时进度更新

### 缓存策略

- **引用缓存** - Sheet 引用结果会被缓存
- **元数据缓存** - 文件元数据会被缓存
- **关系图谱缓存** - 关系图谱会被缓存

### 自动清理

- **临时文件清理** - 自动清理超过1小时的临时文件
- **过期快照清理** - 自动清理过期的Sheet快照
- **缓存清理** - 提供手动清理缓存的API

## 最佳实践

### 1. 文件角色使用

```typescript
// 主数据源 - 主要的Excel数据文件
await workspace.uploadFile(file, FileRole.PRIMARY_SOURCE);

// 辅助数据源 - 参考数据、配置数据
await workspace.uploadFile(file, FileRole.AUXILIARY_SOURCE);

// 模板文件 - Word模板
await workspace.uploadFile(file, FileRole.TEMPLATE);

// 输出文件 - 生成的结果文件
await workspace.uploadFile(file, FileRole.OUTPUT);
```

### 2. 建立文件关系

```typescript
// 主数据源依赖配置文件
await workspace.addRelationship(
  primaryFile.id,
  configFile.id,
  RelationType.CONFIGURES
);

// 输出文件由主数据源生成
await workspace.addRelationship(
  primaryFile.id,
  outputFile.id,
  RelationType.GENERATES
);
```

### 3. 使用标签组织

```typescript
// 创建标签
const tag = await workspace.createTag('重要项目', {
  color: '#FF6B6B',
  description: '重要项目相关文件'
});

// 为文件添加标签
await workspace.addTagToFile(file.id, tag.id);

// 搜索带标签的文件
const files = await workspace.searchFiles({
  tags: [tag.id]
});
```

### 4. 版本管理

```typescript
// 创建版本
await workspace.vfs.createVersion(file.id, '处理前备份');

// 查看版本历史
const versions = await workspace.vfs.getVersions(file.id);
console.log('Versions:', versions);

// 恢复到指定版本
await workspace.vfs.restoreVersion(file.id, versions[0].id);
```

## 故障排除

### 常见问题

#### 1. 文件上传失败

**问题**：文件上传时提示 "File size exceeds maximum allowed size"

**解决方案**：
- 检查文件大小是否超过限制（默认100MB）
- 增加配置中的 `maxFileSize` 限制
- 考虑使用后端处理模式处理超大文件

#### 2. 循环依赖错误

**问题**：添加关系时提示 "circular dependency"

**解决方案**：
- 使用 `analyzeCascadeImpact` 检查依赖关系
- 检查是否存在 A->B->A 的循环依赖
- 重新设计文件关系结构

#### 3. Sheet引用解析失败

**问题**：Sheet引用无法正确解析

**解决方案**：
- 检查引用格式是否正确（如 `Sheet1!A1:B10`）
- 确认源Sheet存在
- 使用 `validateSheetReferences` 验证引用

## 相关文档

- [架构设计文档](./ARCHITECTURE.md)
- [API参考文档](./API_REFERENCE.md)
- [迁移指南](./MIGRATION_GUIDE.md)

## 许可证

MIT
