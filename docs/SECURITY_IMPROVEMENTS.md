# 安全改进建议

**文档版本**: 1.0.0
**创建日期**: 2026-01-24
**维护人员**: 安全专家

---

## 目录

1. [紧急修复建议](#紧急修复建议)
2. [安全代码实践](#安全代码实践)
3. [依赖管理](#依赖管理)
4. [配置安全](#配置安全)
5. [监控和审计](#监控和审计)
6. [安全测试](#安全测试)

---

## 紧急修复建议

### 🔴 1. 升级有漏洞的依赖包

#### 问题
- `xlsx@*` 包含原型污染和 ReDoS 漏洞
- `xmldom@*` 包含多个严重漏洞
- `electron-builder@26.5.0` 依赖有漏洞的 `tar` 包

#### 修复方案

**升级 xlsx**:
```bash
# 检查最新版本
npm view xlsx versions --json

# 升级到安全版本 (>=0.20.2)
npm install xlsx@latest

# 如果有兼容性问题，考虑使用替代方案
npm install exceljs
```

**替换 xmldom**:
```bash
# 使用官方维护的 @xmldom/xmldom
npm install @xmldom/xmldom

# 更新代码中的导入
# 将 import { DOMParser } from 'xmldom';
# 改为 import { DOMParser } from '@xmldom/xmldom';
```

**修复 electron-builder**:
```bash
# 选项 1: 降级到安全版本
npm install electron-builder@23.0.6

# 选项 2: 等待上游修复并更新
npm update electron-builder --latest
```

**更新代码示例**:
```typescript
// services/excelService.ts
// 替换 xlsx 为 exceljs (如果 xlsx 升级后仍有问题)
import ExcelJS from 'exceljs';

export async function readExcelFile(file: File): Promise<any[]> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.getWorksheet(1);
  const data: any[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 0) {
      data.push(row.values);
    }
  });

  return data;
}
```

---

### 🔴 2. 实施文件访问控制

#### 问题
当前代码缺少文件访问权限验证，任何会话都可以访问任何文件。

#### 修复方案

**步骤 1: 扩展文件元数据**

```typescript
// types/vfsTypes.ts
export interface VirtualFileInfo {
  id: string;
  name: string;
  role: FileRole;
  type: 'excel' | 'word' | 'pdf' | 'json' | 'csv' | 'txt' | 'unknown';
  path: string;
  size: number;
  uploadTime: number;
  lastModified: number;
  checksum?: string;
  metadata?: Record<string, any>;

  // 新增字段
  owner?: string;  // 所有者会话/用户 ID
  permissions?: {
    read: string[];   // 允许读取的会话/用户 ID 列表
    write: string[];  // 允许写入的会话/用户 ID 列表
  };
}
```

**步骤 2: 创建权限验证服务**

```typescript
// services/infrastructure/vfs/PermissionService.ts
export class PermissionService {
  /**
   * 检查文件访问权限
   */
  checkFilePermission(
    fileInfo: VirtualFileInfo,
    sessionId: string,
    requiredPermission: 'read' | 'write' | 'delete'
  ): void {
    // 公开文件（向后兼容）
    if (!fileInfo.owner) {
      return;
    }

    // 所有者拥有所有权限
    if (fileInfo.owner === sessionId) {
      return;
    }

    // 检查特定权限
    const permissions = fileInfo.permissions;
    if (permissions) {
      const allowedList =
        requiredPermission === 'read'
          ? permissions.read
          : requiredPermission === 'write'
          ? permissions.write
          : []; // delete 需要所有者权限

      // 公开读取
      if (allowedList.includes('*') && requiredPermission === 'read') {
        return;
      }

      // 特定用户/会话授权
      if (allowedList.includes(sessionId)) {
        return;
      }
    }

    throw new AccessDeniedError(
      `权限不足: 需要 ${requiredPermission} 权限访问文件 ${fileInfo.id}`
    );
  }
}
```

**步骤 3: 在 VFS 中集成权限检查**

```typescript
// services/infrastructure/vfs/VirtualFileSystem.ts
import { PermissionService } from './PermissionService';

export class VirtualFileSystem extends EventEmitter {
  private permissionService = new PermissionService();

  public async readFile(vfsId: string, sessionId: string): Promise<Blob> {
    this.ensureInitialized();

    const fileInfo = this.files.get(vfsId);
    if (!fileInfo) {
      throw new Error(`File not found: ${vfsId}`);
    }

    // 添加权限检查
    this.permissionService.checkFilePermission(fileInfo, sessionId, 'read');

    // ... 原有的读取逻辑
  }

  public async uploadFile(
    file: File,
    role: FileRole,
    sessionId: string,  // 新增参数
    options?: {
      targetPath?: string;
      comment?: string;
      metadata?: Record<string, any>;
      permissions?: {  // 新增选项
        read: string[];
        write: string[];
      };
    }
  ): Promise<VirtualFileInfo> {
    // ... 原有的上传逻辑

    const fileInfo: VirtualFileInfo = {
      id: fileId,
      name: file.name,
      role,
      type: this.detectFileType(file.name),
      path: finalPath,
      size: file.size,
      uploadTime: Date.now(),
      lastModified: file.lastModified || Date.now(),
      metadata,
      owner: sessionId,  // 设置所有者
      permissions: options?.permissions,  // 设置权限
    };

    // ...
  }
}
```

---

### 🟠 3. 修复文件名验证漏洞

#### 问题
文件名未经验证直接使用，可能导致路径遍历攻击。

#### 修复方案

**创建文件名验证工具**:

```typescript
// utils/fileValidation.ts
/**
 * 清理文件名，移除危险字符
 */
export function sanitizeFileName(fileName: string): string {
  // 移除路径分隔符
  let sanitized = fileName.replace(/[\/\\]/g, '_');

  // 移除控制字符
  sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, '');

  // 移除设备名称（Windows）
  const deviceNames = ['CON', 'PRN', 'AUX', 'NUL'] +
    Array.from({ length: 9 }, (_, i) => `COM${i + 1}`) +
    Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`);

  const nameWithoutExt = sanitized.split('.')[0];
  if (deviceNames.includes(nameWithoutExt.toUpperCase())) {
    sanitized = `_${sanitized}`;
  }

  // 限制文件名长度
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const parts = sanitized.split('.');
    if (parts.length > 1) {
      const ext = parts.pop();
      const name = parts.join('.').substring(0, maxLength - ext!.length - 1);
      sanitized = `${name}.${ext}`;
    } else {
      sanitized = sanitized.substring(0, maxLength);
    }
  }

  // 移除前导和尾随空格
  sanitized = sanitized.trim();

  // 确保文件名不为空
  if (!sanitized) {
    sanitized = 'unnamed_file';
  }

  return sanitized;
}

/**
 * 验证文件名是否安全
 */
export function validateFileName(fileName: string): { valid: boolean; error?: string } {
  if (!fileName || fileName.trim().length === 0) {
    return { valid: false, error: '文件名不能为空' };
  }

  // 检查路径遍历
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { valid: false, error: '文件名包含非法字符' };
  }

  // 检查控制字符
  if (/[\x00-\x1f\x80-\x9f]/.test(fileName)) {
    return { valid: false, error: '文件名包含控制字符' };
  }

  // 检查长度
  if (fileName.length > 255) {
    return { valid: false, error: '文件名过长' };
  }

  return { valid: true };
}

/**
 * 验证文件扩展名
 */
export function validateFileExtension(fileName: string, allowedExtensions: string[]): boolean {
  const ext = fileName.toLowerCase().split('.').pop();
  return allowedExtensions.includes(`.${ext}`);
}
```

**在 VFS 中使用**:

```typescript
// services/infrastructure/vfs/VirtualFileSystem.ts
import { sanitizeFileName, validateFileName } from '../../utils/fileValidation';

export class VirtualFileSystem extends EventEmitter {
  private readonly ALLOWED_EXTENSIONS = [
    '.xlsx', '.xls',
    '.docx', '.doc',
    '.pdf',
    '.json',
    '.csv',
    '.txt',
  ];

  public async uploadFile(
    file: File,
    role: FileRole,
    options?: { /* ... */ }
  ): Promise<VirtualFileInfo> {
    // 验证文件名
    const nameValidation = validateFileName(file.name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    // 验证文件扩展名
    if (!validateFileExtension(file.name, this.ALLOWED_EXTENSIONS)) {
      throw new Error(`不支持的文件类型: ${file.name}`);
    }

    // 清理文件名
    const sanitizedName = sanitizeFileName(file.name);

    // ... 使用清理后的文件名
  }
}
```

---

## 安全代码实践

### 1. 输入验证和清理

#### 白名单验证

```typescript
// utils/validation.ts
/**
 * 白名单验证：只允许已知的、安全的字符
 */
export function whitelistValidation(input: string, allowedChars: RegExp): boolean {
  return allowedChars.test(input);
}

// 示例：只允许字母、数字、下划线和连字符
const FILENAME_PATTERN = /^[a-zA-Z0-9_\-\.]+$/;

export function validateFilename(input: string): boolean {
  return whitelistValidation(input, FILENAME_PATTERN);
}
```

#### 输出编码

```typescript
// utils/encoding.ts
/**
 * HTML 实体编码
 */
export function encodeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * URL 编码
 */
export function encodeURL(str: string): string {
  return encodeURIComponent(str);
}

/**
 * JavaScript 字符串编码
 */
export function encodeJSString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f');
}
```

### 2. 防止 XSS 攻击

#### 使用 DOMPurify

```bash
npm install dompurify
npm install @types/dompurify --save-dev
```

```typescript
// utils/sanitize.ts
import DOMPurify from 'dompurify';

/**
 * 清理 HTML 内容
 */
export function sanitizeHTML(html: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
}): string {
  const config: any = {
    ALLOWED_TAGS: options?.allowedTags || [
      'p', 'br', 'strong', 'em', 'u',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'a', 'img',
    ],
    ALLOWED_ATTR: options?.allowedAttributes || ['href', 'src', 'alt', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
  };

  return DOMPurify.sanitize(html, config);
}

/**
 * 创建安全的 dangerouslySetInnerHTML 对象
 */
export function createSafeHTML(html: string): { __html: string } {
  return {
    __html: sanitizeHTML(html),
  };
}
```

**在组件中使用**:

```tsx
// components/DocumentSpace/DocumentPreview.tsx
import { createSafeHTML } from '../../utils/sanitize';

// 替换
<div dangerouslySetInnerHTML={{ __html: htmlContent }} />

// 为
<div dangerouslySetInnerHTML={createSafeHTML(htmlContent)} />
```

#### 配置 CSP

```typescript
// vite.config.ts
export default defineConfig({
  // ...
  server: {
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // 开发环境需要
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://api.zhipu.ai",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    },
  },
});
```

### 3. 敏感数据处理

#### 密钥管理

```typescript
// utils/secrets.ts
/**
 * 验证 API 密钥格式
 */
export function validateAPIKey(apiKey: string | undefined): string {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API 密钥未配置');
  }

  const trimmed = apiKey.trim();

  // 智谱 API 密钥格式验证
  const zhipuPattern = /^sk-[a-zA-Z0-9]{32,}\.[a-zA-Z0-9_-]+$/;
  if (!zhipuPattern.test(trimmed)) {
    console.warn('[Security] API 密钥格式可能不正确');
  }

  return trimmed;
}

/**
 * 获取环境变量中的密钥
 */
export function getSecret(key: string): string {
  const value = process.env[key];
  return validateAPIKey(value);
}

// 使用
const apiKey = getSecret('ZHIPU_API_KEY');
```

#### 日志脱敏

```typescript
// utils/logger.ts
const SENSITIVE_PATTERNS = [
  { pattern: /apiKey["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]{10,})/gi, label: 'apiKey' },
  { pattern: /password["']?\s*[:=]\s*["']?([^\s"']{6,})/gi, label: 'password' },
  { pattern: /token["']?\s*[:=]\s*["']?([a-zA-Z0-9_.-]{20,})/gi, label: 'token' },
  { pattern: /secret["']?\s*[:=]\s*["']?([^\s"']{10,})/gi, label: 'secret' },
];

/**
 * 脱敏日志消息
 */
export function sanitizeLog(message: string): string {
  let sanitized = message;

  for (const { pattern, label } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match, capture) => {
      // 只显示前 4 个字符
      const preview = capture.substring(0, 4);
      return match.replace(capture, `${preview}***REDACTED***`);
    });
  }

  return sanitized;
}

/**
 * 安全的日志函数
 */
export const secureLog = {
  info: (message: string, ...args: any[]) => {
    console.info(sanitizeLog(message), ...args.map(arg =>
      typeof arg === 'string' ? sanitizeLog(arg) : arg
    ));
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(sanitizeLog(message), ...args.map(arg =>
      typeof arg === 'string' ? sanitizeLog(arg) : arg
    ));
  },
  error: (message: string, ...args: any[]) => {
    console.error(sanitizeLog(message), ...args.map(arg =>
      typeof arg === 'string' ? sanitizeLog(arg) : arg
    ));
  },
};
```

#### 数据加密

```typescript
// utils/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : crypto.randomBytes(32);

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

export interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
  authTag: string;
}

/**
 * 加密数据
 */
export function encrypt(data: string): EncryptedData {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // 使用 PBKDF2 派生密钥
  const key = crypto.pbkdf2Sync(
    ENCRYPTION_KEY,
    salt,
    100000,
    32,
    'sha256'
  );

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * 解密数据
 */
export function decrypt(encryptedData: EncryptedData): string {
  const { encrypted, iv, salt, authTag } = encryptedData;

  // 使用 PBKDF2 派生密钥
  const key = crypto.pbkdf2Sync(
    ENCRYPTION_KEY,
    Buffer.from(salt, 'hex'),
    100000,
    32,
    'sha256'
  );

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * 加密对象
 */
export function encryptObject(obj: any): EncryptedData {
  const json = JSON.stringify(obj);
  return encrypt(json);
}

/**
 * 解密对象
 */
export function decryptObject<T>(encryptedData: EncryptedData): T {
  const json = decrypt(encryptedData);
  return JSON.parse(json);
}
```

---

## 依赖管理

### 定期更新策略

```bash
# 每周检查一次更新
npm outdated

# 每月进行一次安全审计
npm audit

# 每季度进行一次主要版本更新
npm update
```

### 使用 npm-check-updates

```bash
# 安装
npm install -g npm-check-updates

# 检查可更新的包
ncu

# 更新 package.json
ncu -u

# 测试更新后的包
npm install
npm test
```

### 依赖锁文件

```bash
# 使用 npm shrinkwrap 锁定依赖
npm shrinkwrap

# 提交 npm-shrinkwrap.json 到版本控制
git add npm-shrinkwrap.json
git commit -m "chore: lock dependencies"
```

---

## 配置安全

### 环境变量

```bash
# .env.example（提交到版本控制）
ZHIPU_API_KEY=your_api_key_here
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
ENCRYPTION_KEY=your_32_byte_encryption_key_in_hex

# .env（不提交到版本控制）
ZHIPU_API_KEY=sk-xxxxxxxxxxxxx.xxxxxxxxxxxxx
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=secure_password_here
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

**.gitignore**:
```
# 环境变量
.env
.env.local
.env.*.local

# 敏感配置
config/production.json
config/secrets.json
```

### 配置验证

```typescript
// config/validation.ts
import { z } from 'zod';

const envSchema = z.object({
  ZHIPU_API_KEY: z.string().min(1, 'ZHIPU_API_KEY is required'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 64 hex characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return { success: true, env };
  } catch (error) {
    console.error('[Config] Environment validation failed:', error);
    return { success: false, error };
  }
}

// 在应用启动时调用
if (import.meta.env.DEV) {
  const validation = validateEnv();
  if (!validation.success) {
    throw new Error('Invalid environment configuration');
  }
}
```

---

## 监控和审计

### 安全事件日志

```typescript
// utils/securityLogger.ts
type SecurityEventType =
  | 'AUTH_FAILURE'
  | 'PERMISSION_DENIED'
  | 'SUSPICIOUS_INPUT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED_ACCESS';

interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  sessionId?: string;
  userId?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class SecurityLogger {
  private events: SecurityEvent[] = [];

  log(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(securityEvent);

    // 根据严重程度采取不同行动
    switch (event.severity) {
      case 'critical':
      case 'high':
        console.error('[SECURITY]', securityEvent);
        // 可以发送到远程日志服务或触发告警
        break;
      case 'medium':
        console.warn('[SECURITY]', securityEvent);
        break;
      case 'low':
        console.info('[SECURITY]', securityEvent);
        break;
    }
  }

  getEvents(filter?: Partial<SecurityEvent>): SecurityEvent[] {
    if (!filter) {
      return [...this.events];
    }

    return this.events.filter(event => {
      return Object.entries(filter).every(([key, value]) =>
        event[key as keyof SecurityEvent] === value
      );
    });
  }

  clear(): void {
    this.events = [];
  }
}

export const securityLogger = new SecurityLogger();

// 使用示例
securityLogger.log({
  type: 'PERMISSION_DENIED',
  sessionId: 'session_abc',
  details: { fileId: 'file_123', action: 'read' },
  severity: 'medium',
});
```

---

## 安全测试

### 运行安全测试

```bash
# 运行所有安全测试
npm run test:security

# 运行特定测试
npm run test:security -- input-validation
npm run test:security -- xss-prevention
npm run test:security -- authorization

# 生成覆盖率报告
npm run test:security -- --coverage
```

### 集成到 CI/CD

```yaml
# .github/workflows/security.yml
name: Security Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run security tests
        run: npm run test:security

      - name: Check for vulnerabilities
        run: npm audit --production
```

---

## 检查清单

### 代码审查清单

- [ ] 所有用户输入都经过验证
- [ ] 文件上传经过类型和大小验证
- [ ] HTML 内容使用 DOMPurify 清理
- [ ] 敏感数据加密存储
- [ ] 密钥从环境变量读取
- [ ] 日志不包含敏感信息
- [ ] 实施了访问控制
- [ ] 会话 ID 使用加密安全的随机数

### 部署清单

- [ ] 所有环境变量已配置
- [ ] CSP 头已配置
- [ ] HTTPS 已启用
- [ ] 安全响应头已配置
- [ ] 依赖包已更新到安全版本
- [ ] 安全测试通过

### 监控清单

- [ ] 安全事件日志已启用
- [ ] 异常登录告警已配置
- [ ] 速率限制已配置
- [ ] DDoS 防护已启用

---

## 参考资源

### OWASP Top 10

1. [OWASP Top 10 Web Application Security Risks](https://owasp.org/www-project-top-ten/)
2. [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

### 安全工具

1. [npm audit](https://docs.npmjs.com/cli/audit)
2. [DOMPurify](https://github.com/cure53/DOMPurify)
3. [Zod](https://zod.dev/) - 类型安全的数据验证

### 学习资源

1. [Web Security Academy](https://portswigger.net/web-security)
2. [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
3. [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**最后更新**: 2026-01-24
**维护人员**: 安全专家
**版本**: 1.0.0
