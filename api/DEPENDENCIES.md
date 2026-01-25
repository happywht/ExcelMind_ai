# Phase 2 API 依赖项说明

> **版本**: v2.0.0
> **更新日期**: 2026-01-25

## 必需的依赖项

Phase 2 REST API 实现需要以下 npm 包：

### 核心依赖

```json
{
  "dependencies": {
    "express": "^4.18.2",              // Web框架
    "multer": "^1.4.5-lts.1",          // 文件上传处理
    "uuid": "^9.0.0"                   // 唯一ID生成
  }
}
```

### 可选依赖（用于生产环境）

```json
{
  "dependencies": {
    "express-rate-limit": "^7.1.5",   // 速率限制（如果不使用自定义实现）
    "cors": "^2.8.5",                  // CORS支持
    "helmet": "^7.1.0",                // 安全头部
    "compression": "^1.7.4",           // 响应压缩
    "morgan": "^1.10.0"                // HTTP请求日志
  }
}
```

### 开发依赖

```json
{
  "devDependencies": {
    "@types/express": "^4.17.17",      // Express类型定义
    "@types/multer": "^1.4.7",         // Multer类型定义
    "@types/uuid": "^9.0.0",           // UUID类型定义
    "@types/cors": "^2.8.13",          // CORS类型定义
    "@types/compression": "^1.7.2",    // Compression类型定义
    "@types/morgan": "^1.9.4"          // Morgan类型定义
  }
}
```

## 安装指令

### 安装核心依赖

```bash
npm install express multer uuid
```

### 安装类型定义

```bash
npm install -D @types/express @types/multer @types/uuid
```

### 一次性安装所有依赖

```bash
# 核心依赖
npm install express multer uuid

# 类型定义
npm install -D @types/express @types/multer @types/uuid

# 可选的生产依赖
npm install cors helmet compression morgan

# 可选的类型定义
npm install -D @types/cors @types/compression @types/morgan
```

## 依赖项说明

### express

Web应用框架，用于：
- 路由管理
- 中间件系统
- HTTP请求/响应处理
- 静态文件服务

**使用示例：**
```typescript
import express from 'express';

const app = express();
app.use(express.json());
app.listen(3000);
```

### multer

文件上传中间件，用于：
- 处理 `multipart/form-data` 请求
- 文件上传验证
- 文件大小限制
- 内存/磁盘存储

**使用示例：**
```typescript
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post('/upload', upload.single('file'), handler);
```

### uuid

生成唯一标识符，用于：
- 请求ID生成
- 资源ID生成
- 会话ID生成

**使用示例：**
```typescript
import { v4 as uuidv4 } from 'uuid';

const requestId = uuidv4();
const resourceId = `resource_${Date.now()}_${uuidv4().substring(0, 6)}`;
```

### cors (可选)

跨域资源共享支持，用于：
- 允许跨域请求
- CORS头部设置
- 预检请求处理

### helmet (可选)

安全头部设置，用于：
- 安全相关的HTTP头部
- XSS防护
- 点击劫持防护

### compression (可选)

响应压缩，用于：
- Gzip压缩
- 减少传输数据量
- 提高性能

### morgan (可选)

HTTP请求日志，用于：
- 请求日志记录
- 调试支持
- 访问分析

## TypeScript配置

确保 `tsconfig.json` 包含以下配置：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"]
  },
  "include": [
    "src/**/*",
    "api/**/*"
  ]
}
```

## 环境兼容性

### Node.js 版本

- 最低版本：Node.js 16.x
- 推荐版本：Node.js 18.x 或更高
- 当前项目使用：Node.js 22.18.0

### 操作系统

- Windows ✅
- macOS ✅
- Linux ✅

## 使用场景

### 开发环境

```bash
# 安装所有依赖（包括开发依赖）
npm install

# 启动开发服务器
npm run dev
```

### 生产环境

```bash
# 仅安装生产依赖
npm install --production

# 启动生产服务器
npm start
```

## 常见问题

### Q: 为什么使用multer而不是其他文件上传库？

A: Multer是Express官方推荐的文件上传中间件，具有以下优势：
- 与Express完美集成
- 支持多种存储选项
- 内置文件验证
- 活跃的社区支持

### Q: 可以使用其他的速率限制库吗？

A: 可以。当前实现包含了自定义的速率限制中间件，但也可以使用：
- `express-rate-limit` - 基础速率限制
- `rate-limiter-flexible` - 更高级的速率限制
- Redis支持的速率限制器

### Q: 是否需要安装所有类型定义？

A: 推荐。TypeScript类型定义提供：
- 类型安全
- IDE自动完成
- 编译时错误检查
- 更好的开发体验

## 更新日志

### v2.0.0 (2026-01-25)

- 初始版本
- 定义必需依赖项
- 添加安装指令
- 添加使用示例

---

**文档版本**: v1.0.0
**最后更新**: 2026-01-25
