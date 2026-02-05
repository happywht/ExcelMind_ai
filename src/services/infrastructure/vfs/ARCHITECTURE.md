# 虚拟文件系统架构文档

## 目录

1. [概述](#概述)
2. [架构设计](#架构设计)
3. [核心组件](#核心组件)
4. [数据流](#数据流)
5. [关系图谱](#关系图谱)
6. [跨Sheet访问](#跨sheet访问)
7. [性能优化](#性能优化)
8. [安全考虑](#安全考虑)
9. [扩展性](#扩展性)

## 概述

虚拟文件系统 (VFS) 是 ExcelMind AI 的核心基础设施，提供 `/mnt` 虚拟工作台的完整文件管理功能。VFS 设计遵循以下原则：

- **抽象化** - 提供统一的文件系统接口
- **可扩展性** - 支持多种文件类型和操作
- **高性能** - 优化大文件处理和并发访问
- **可靠性** - 确保数据一致性和错误恢复

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────┐
│                  应用层 (Application Layer)              │
│  VirtualWorkspaceManager - 统一API入口                   │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                   服务层 (Service Layer)                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ VirtualFile  │ │  FileMeta    │ │ FileRelation │     │
│  │   System     │ │   dataService│ │   Service     │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│  ┌──────────────┐                                       │
│  │ CrossSheet   │                                       │
│  │   Service    │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                  存储层 (Storage Layer)                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │   Pyodide    │ │    Redis     │ │   IndexedDB  │     │
│  │     FS       │ │    (可选)     │ │   (可选)      │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 组件交互

```
User Application
       │
       ▼
VirtualWorkspaceManager
       │
       ├─► VirtualFileSystem ──► Pyodide FS (内存)
       │
       ├─► FileMetadataService ──► Redis (可选)
       │
       ├─► FileRelationshipService ──► Redis (可选)
       │
       └─► CrossSheetService ──► 内存缓存
```

## 核心组件

### 1. VirtualFileSystem (虚拟文件系统)

**职责**：
- 文件 CRUD 操作
- 文件角色管理
- 文件版本管理
- 与 Pyodide 文件系统集成

**关键方法**：
```typescript
class VirtualFileSystem {
  uploadFile(file, role, options?)     // 上传文件
  readFile(vfsId)                       // 读取文件
  deleteFile(vfsId)                     // 删除文件
  updateFile(vfsId, updates)            // 更新文件
  addRelationship(fromId, toId, type)   // 添加关系
  createVersion(vfsId, comment?)        // 创建版本
}
```

**数据结构**：
```typescript
interface VirtualFileInfo {
  id: string;              // VFS 文件ID
  name: string;            // 文件名
  role: FileRole;          // 文件角色
  type: string;            // 文件类型
  path: string;            // VFS路径
  size: number;            // 文件大小
  uploadTime: number;      // 上传时间
  lastModified: number;    // 最后修改时间
  metadata?: Record<string, any>;
}
```

### 2. FileMetadataService (文件元数据服务)

**职责**：
- 管理文件元数据
- 文件标签管理
- Schema 管理
- 搜索和过滤

**关键方法**：
```typescript
class FileMetadataService {
  getExtendedMetadata(vfsId)           // 获取扩展元数据
  searchFiles(query)                   // 搜索文件
  createTag(name, options?)            // 创建标签
  addTagToFile(fileId, tagId)          // 添加标签
  setSchema(fileId, schema)            // 设置Schema
}
```

**标签系统**：
```
FileTag
  ├─ id: string
  ├─ name: string
  ├─ color?: string
  └─ description?: string

File ──< FileTag > (多对多关系)
```

### 3. FileRelationshipService (文件关系服务)

**职责**：
- 管理文件关系
- 构建关系图谱
- 循环依赖检测
- 级联影响分析

**关键方法**：
```typescript
class FileRelationshipService {
  getRelationshipGraph(options?)       // 获取关系图谱
  findPath(fromId, toId)               // 查找路径
  analyzeDependencies(fileId)          // 分析依赖
  analyzeCascadeImpact(fileId)         // 分析级联影响
  detectCircularDependencies()         // 检测循环依赖
}
```

**关系类型**：
```typescript
enum RelationType {
  DEPENDS_ON = 'depends_on',        // 依赖关系
  REFERENCES = 'references',        // 引用关系
  GENERATES = 'generates',          // 生成关系
  CONFIGURES = 'configures',        // 配置关系
  MERGES_WITH = 'merges_with',      // 合并关系
}
```

**图谱算法**：
- **DFS (深度优先搜索)** - 循环依赖检测
- **BFS (广度优先搜索)** - 最短路径查找
- **拓扑排序** - 依赖排序

### 4. CrossSheetService (跨Sheet访问服务)

**职责**：
- 解析 Sheet 引用
- 验证引用有效性
- 解析引用值
- 检测循环引用

**关键方法**：
```typescript
class CrossSheetService {
  parseReferences(sheetName, data)           // 解析引用
  validateReferences(refs, availableSheets)  // 验证引用
  resolveReferences(refs, sheetData)         // 解析引用值
  detectCircularReferences(refs)             // 检测循环引用
  createSnapshot(fileId, sheetName, data)    // 创建快照
}
```

**引用格式**：
```
Sheet1!A1              // 单个单元格
Sheet1!A1:B10          // 单元格范围
'Sheet 1'!A1           // 带空格的Sheet名
[Workbook]Sheet1!A1    // 外部引用
```

## 数据流

### 文件上传流程

```
1. User selects file
       │
       ▼
2. VirtualWorkspaceManager.uploadFile()
       │
       ├─► 验证文件大小
       ├─► 检测文件类型
       │
       ▼
3. VirtualFileSystem.uploadFile()
       │
       ├─► File → ArrayBuffer
       ├─► ArrayBuffer → Uint8Array
       ├─► Uint8Array → Pyodide FS
       │
       ▼
4. 创建文件元数据
       │
       ├─► 生成 VFS ID
       ├─► 分配文件角色
       ├─► 保存到内存
       ├─► 持久化到 Redis (可选)
       │
       ▼
5. 创建初始版本
       │
       ▼
6. 发出 'file:uploaded' 事件
       │
       ▼
7. 返回 VirtualFileInfo
```

### 关系创建流程

```
1. VirtualWorkspaceManager.addRelationship()
       │
       ▼
2. FileRelationshipService 验证
       │
       ├─► 检查文件存在
       ├─► 检测循环依赖
       │
       ▼
3. 创建关系对象
       │
       ▼
4. 保存到内存
       │
       ▼
5. 持久化到 Redis (可选)
       │
       ▼
6. 发出 'relationship:added' 事件
```

## 关系图谱

### 图谱结构

```
┌─────────┐
│  File A │ (Primary Source)
└────┬────┘
     │ DEPENDS_ON
     ▼
┌─────────┐
│  File B │ (Configuration)
└────┬────┘
     │ CONFIGURES
     ▼
┌─────────┐
│  File C │ (Output)
└─────────┘
```

### 图谱操作

**添加节点**：
```typescript
const graph = await workspace.getRelationshipGraph();
graph.nodes.push({
  id: fileId,
  label: fileName,
  type: fileType,
  role: fileRole
});
```

**添加边**：
```typescript
graph.edges.push({
  id: relationshipId,
  from: sourceFileId,
  to: targetFileId,
  type: RelationType.DEPENDS_ON
});
```

**查询路径**：
```typescript
const paths = await relationshipService.findPath(
  fileId1,
  fileId2,
  { maxDepth: 5 }
);
```

## 跨Sheet访问

### 引用解析

```
Sheet1        Sheet2
│ A1          │ A1
│ =Sheet2!A1  │ 100
│             │
└─────────────┴─────────────
       │
       ▼
  解析引用
       │
       ├─► 识别 "Sheet2!A1"
       ├─► 提取源 Sheet: "Sheet2"
       ├─► 提取范围: "A1"
       │
       ▼
  验证引用
       │
       ├─► 检查 Sheet2 是否存在
       ├─► 验证范围格式
       ├─► 检测循环引用
       │
       ▼
  解析值
       │
       ├─► 读取 Sheet2!A1 的值
       ├─► 返回 100
```

### 快照机制

```typescript
// 创建快照
const snapshot = await crossSheetService.createSnapshot(
  fileId,
  'Sheet1',
  data
);

// 快照包含
interface SheetSnapshot {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  data: any[][];
  formulas?: Map<string, string>;  // 公式映射
  formats?: Map<string, any>;      // 格式映射
  timestamp: number;
}
```

## 性能优化

### 1. 内存优化

**大文件分块处理**：
```typescript
async processLargeFile(file: File) {
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
  const chunks = Math.ceil(file.size / CHUNK_SIZE);

  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    await this.processChunk(chunk);

    // 释放内存
    await this.pyodideService.runPython('import gc; gc.collect()');
  }
}
```

**内存监控**：
```typescript
setInterval(() => {
  const usage = performance.memory?.usedJSHeapSize || 0;
  const limit = performance.memory?.jsHeapSizeLimit || 0;

  if (usage / limit > 0.8) {
    this.triggerMemoryCleanup();
  }
}, 5000);
```

### 2. 缓存策略

**多级缓存**：
```
L1: 内存缓存 (最快)
  ├─ Sheet 引用结果
  ├─ 文件元数据
  └─ 关系图谱

L2: Redis 缓存 (持久化)
  ├─ 文件信息
  ├─ 关系信息
  └─ 版本信息

L3: IndexedDB (浏览器)
  ├─ 大文件
  └─ 历史数据
```

**缓存失效**：
```typescript
// TTL 策略
const CACHE_TTL = {
  metadata: 3600000,      // 1小时
  references: 1800000,    // 30分钟
  snapshots: 3600000,     // 1小时
};

// LRU 策略
class LRUCache {
  private cache: Map<string, any>;
  private maxSize: number;

  get(key: string) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value); // 移到最后
      return value;
    }
  }

  set(key: string, value: any) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

### 3. 并发处理

**并行上传**：
```typescript
async uploadFiles(files: File[]) {
  const CONCURRENT_UPLOADS = 3;
  const chunks = [];

  for (let i = 0; i < files.length; i += CONCURRENT_UPLOADS) {
    chunks.push(files.slice(i, i + CONCURRENT_UPLOADS));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(file => this.uploadFile(file))
    );
  }
}
```

## 安全考虑

### 1. 文件验证

**文件类型检查**：
```typescript
private validateExcelFile(file: File): void {
  const validExtensions = ['.xlsx', '.xls'];
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

  const hasValidExtension = validExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  const hasValidMimeType = validMimeTypes.includes(file.type);

  if (!hasValidExtension && !hasValidMimeType) {
    throw new Error('Invalid file format');
  }
}
```

**文件大小限制**：
```typescript
if (file.size > this.config.maxFileSize) {
  throw new Error(
    `File size (${file.size}) exceeds maximum allowed size (${this.config.maxFileSize})`
  );
}
```

### 2. 代码执行安全

**沙箱隔离**：
```typescript
// 在 Web Worker 中执行
const worker = new Worker(codeExecutorWorker, {
  type: 'module'
});

// 限制执行时间
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Execution timeout')), 5000);
});

await Promise.race([
  executeCode(code),
  timeoutPromise
]);
```

**代码审查**：
```typescript
const dangerousPatterns = [
  /import\s+os/,
  /import\s+subprocess/,
  /eval\s*\(/,
  /exec\s*\(/,
  /__import__/
];

for (const pattern of dangerousPatterns) {
  if (pattern.test(code)) {
    throw new Error('Dangerous code detected');
  }
}
```

### 3. 数据隔离

**命名空间隔离**：
```typescript
interface VFSConfig {
  namespace?: string;  // 命名空间
}

// 每个工作区使用独立的命名空间
const workspace1 = getVirtualWorkspaceManager({
  namespace: 'workspace-1'
});

const workspace2 = getVirtualWorkspaceManager({
  namespace: 'workspace-2'
});
```

## 扩展性

### 1. 插件系统

```typescript
interface VFSPlugin {
  name: string;
  version: string;
  install(vfs: VirtualFileSystem): void;
  uninstall(vfs: VirtualFileSystem): void;
}

// 注册插件
vfs.registerPlugin({
  name: 'excel-plugin',
  version: '1.0.0',
  install(vfs) {
    // 扩展功能
  },
  uninstall(vfs) {
    // 清理
  }
});
```

### 2. 存储适配器

```typescript
interface StorageAdapter {
  read(key: string): Promise<any>;
  write(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

// 使用不同的存储后端
vfs.setStorageAdapter(new RedisStorageAdapter());
vfs.setStorageAdapter(new IndexedDBStorageAdapter());
vfs.setStorageAdapter(new MemoryStorageAdapter());
```

### 3. 事件钩子

```typescript
// 注册事件钩子
vfs.hook('before:upload', async (file) => {
  // 上传前的处理
});

vfs.hook('after:upload', async (fileInfo) => {
  // 上传后的处理
});

vfs.hook('before:delete', async (vfsId) => {
  // 删除前的处理
});
```

## 未来规划

### Phase 3 功能

1. **分布式文件系统** - 支持多节点部署
2. **文件加密** - 敏感数据加密存储
3. **访问控制** - 细粒度权限管理
4. **审计日志** - 完整的操作审计
5. **数据同步** - 多端数据同步

### 性能优化

1. **WebWorker 集成** - 后台处理大文件
2. **流式处理** - 真正的流式文件处理
3. **增量同步** - 只同步变化的部分
4. **压缩传输** - 减少网络传输

## 参考资料

- [Excel 主目录文档](./README.md)
- [API 参考](./API_REFERENCE.md)
- [迁移指南](./MIGRATION_GUIDE.md)
- [贡献指南](../../CONTRIBUTING.md)

## 许可证

MIT
