# 安全增强功能 - 快速入门指南

## 概述

VirtualFileSystem 现在包含两个重要的安全增强功能：

1. **文件名验证** - 防止路径遍历攻击和非法文件名
2. **访问控制** - 基于用户和权限的文件访问管理

---

## 🚀 快速开始

### 1. 基本使用（默认启用安全功能）

```typescript
import { getVirtualFileSystem, FileRole } from '@/services/infrastructure/vfs';

// 获取 VFS 实例（安全功能默认启用）
const vfs = getVirtualFileSystem();

// 初始化
await vfs.initialize();

// 上传文件（自动进行文件名验证和权限设置）
const fileInfo = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE, {
  userId: 'user123',      // 指定用户 ID
  sessionId: 'session456', // 指定会话 ID
  metadata: { department: 'finance' },
});

console.log('文件已上传:', fileInfo.id);
console.log('文件所有者:', fileInfo.owner);
console.log('文件权限:', fileInfo.permissions);
```

### 2. 读取文件（带权限检查）

```typescript
try {
  const blob = await vfs.readFile(fileId, {
    userId: 'user123',
    sessionId: 'session456',
  });

  // 处理文件内容
  const url = URL.createObjectURL(blob);
  console.log('文件 URL:', url);
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    console.error('无权访问此文件');
    // 显示权限错误提示给用户
  } else {
    console.error('读取失败:', error.message);
  }
}
```

### 3. 删除文件（带权限检查）

```typescript
try {
  await vfs.deleteFile(fileId, {
    userId: 'user123',
    sessionId: 'session456',
  });
  console.log('文件已删除');
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    console.error('无权删除此文件');
  } else if (error.message.includes('Cannot delete file')) {
    console.error('文件被其他文件引用，无法删除');
  }
}
```

---

## 🔐 权限管理

### 授予其他用户权限

```typescript
import { getAccessControlService } from '@/services/infrastructure/vfs';

const acs = getAccessControlService();

// 获取文件信息
const fileInfo = await vfs.readFile(fileId);

// 授予其他用户读取权限
const updatedPermissions = acs.grantPermission(
  fileInfo.permissions,
  'user456',  // 目标用户 ID
  ['read']    // 授予的权限
);

// 更新文件权限
await vfs.updateFile(fileId, {
  metadata: { permissions: updatedPermissions }
});
```

### 撤销用户权限

```typescript
const updatedPermissions = acs.revokePermission(
  fileInfo.permissions,
  'user456',
  ['read', 'write']  // 撤销的权限
);

await vfs.updateFile(fileId, {
  metadata: { permissions: updatedPermissions }
});
```

### 设置公开读取

```typescript
const permissions: FilePermissions = {
  read: ['owner123'],
  write: ['owner123'],
  delete: ['owner123'],
  publicRead: true,  // 所有人都可以读取
};

await vfs.updateFile(fileId, {
  metadata: { permissions }
});
```

---

## 📋 访问控制规则

### 添加规则

```typescript
const acs = getAccessControlService();

// 规则 1: 允许所有用户读取输出文件
const rule1 = acs.addRule({
  name: '允许读取输出文件',
  applyTo: ['*'],  // 所有用户
  allow: {
    readRoles: [FileRole.OUTPUT],
  },
  priority: 10,
  enabled: true,
});

// 规则 2: 拒绝普通用户删除配置文件
const rule2 = acs.addRule({
  name: '保护配置文件',
  applyTo: ['*'],
  deny: {
    deleteRoles: [FileRole.CONFIGURATION],
  },
  priority: 100,  // 更高优先级
  enabled: true,
});

// 规则 3: 允许管理员组访问所有文件
const rule3 = acs.addRule({
  name: '管理员完全访问',
  applyTo: ['admin1', 'admin2', 'admin3'],
  allow: {
    readRoles: ['*'],
    writeRoles: ['*'],
    deleteRoles: ['*'],
  },
  priority: 1000,
  enabled: true,
});
```

### 管理规则

```typescript
// 获取所有规则
const rules = acs.getRules();
console.log('当前规则:', rules);

// 禁用规则
const rule = rules.find(r => r.name === '临时规则');
if (rule) {
  rule.enabled = false;
}

// 删除规则
acs.removeRule(ruleId);

// 清空所有规则
acs.clearRules();
```

---

## 🛡️ 文件名验证

### 验证文件名

```typescript
import { validateFileName } from '@/services/infrastructure/vfs';

const result = validateFileName('document.xlsx');

if (result.valid) {
  console.log('文件名有效');
} else {
  console.error('文件名无效:', result.error);
  // 处理错误，可能需要用户重新命名文件
}
```

### 清理文件名

```typescript
import { sanitizeFileName } from '@/services/infrastructure/vfs';

const dirtyName = 'file<>name.xlsx';
const cleanName = sanitizeFileName(dirtyName);

console.log('清理前:', dirtyName);   // "file<>name.xlsx"
console.log('清理后:', cleanName);    // "filename.xlsx"
```

### 生成安全文件名

```typescript
import { generateSafeFileName } from '@/services/infrastructure/vfs';

// 添加随机后缀（避免文件名冲突）
const safeName = generateSafeFileName('document.xlsx', {
  randomSuffix: true,
});
console.log(safeName);  // "document_a1b2c3d4.xlsx"

// 添加前缀和随机后缀
const backupName = generateSafeFileName('document.xlsx', {
  prefix: 'backup_',
  randomSuffix: true,
  suffixLength: 16,
});
console.log(backupName);  // "backup_document_a1b2c3d4e5f6g7h8.xlsx"
```

---

## ⚙️ 配置选项

### 禁用安全功能（不推荐）

```typescript
const vfs = getVirtualFileSystem({
  enableAccessControl: false,      // 禁用访问控制
  enableFileNameValidation: false, // 禁用文件名验证
});
```

### 自定义配置

```typescript
const vfs = getVirtualFileSystem({
  maxFileSize: 50 * 1024 * 1024,  // 50MB
  maxVersions: 5,
  enableVersioning: true,
  enableRelationships: true,
  enableAccessControl: true,        // 启用访问控制
  enableFileNameValidation: true,   // 启用文件名验证
  redis: {
    host: 'localhost',
    port: 6379,
  },
});
```

### 自定义访问控制配置

```typescript
import { getAccessControlService } from '@/services/infrastructure/vfs';

const acs = getAccessControlService({
  enabled: true,
  enableLogging: true,      // 启用访问日志
  defaultPolicy: 'deny',    // 默认拒绝策略
});
```

---

## 🔍 错误处理

### UnauthorizedError

```typescript
import { UnauthorizedError } from '@/services/infrastructure/vfs';

try {
  await vfs.readFile(fileId, { userId: 'user123' });
} catch (error) {
  if (error instanceof UnauthorizedError) {
    console.error('访问被拒绝');
    console.error('用户:', error.userId);
    console.error('操作:', error.operation);
    console.error('文件:', error.fileId);

    // 显示友好的错误提示
    alert('您没有权限访问此文件');
  }
}
```

### 文件名验证错误

```typescript
try {
  await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE);
} catch (error) {
  if (error.message.includes('文件名验证失败')) {
    console.error('文件名不符合要求');
    // 提示用户重新命名文件
  }
}
```

---

## 📊 常见用例

### 用例 1: 多用户文档协作

```typescript
// 用户 A 上传文档
const doc = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE, {
  userId: 'userA',
  sessionId: 'sessionA',
});

// 用户 A 授予用户 B 和 C 读取权限
const acs = getAccessControlService();
let permissions = acs.grantPermission(doc.permissions, 'userB', ['read']);
permissions = acs.grantPermission(permissions, 'userC', ['read']);

await vfs.updateFile(doc.id, { metadata: { permissions } });

// 用户 B 尝试读取（成功）
await vfs.readFile(doc.id, { userId: 'userB' }); // ✅ 成功

// 用户 B 尝试删除（失败）
await vfs.deleteFile(doc.id, { userId: 'userB' }); // ❌ UnauthorizedError
```

### 用例 2: 部门文件隔离

```typescript
// 财务部门的文件
const financeDoc = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE, {
  userId: 'finance_user',
  sessionId: 'session1',
  metadata: { department: 'finance' },
});

// 添加规则：只有财务部门可以读取财务文件
acs.addRule({
  name: '财务部门文件隔离',
  applyTo: ['finance_user', 'finance_manager'],
  allow: {
    readRoles: [FileRole.PRIMARY_SOURCE],
  },
  priority: 100,
  enabled: true,
});

// 其他部门的用户无法访问
await vfs.readFile(financeDoc.id, { userId: 'hr_user' }); // ❌ UnauthorizedError
```

### 用例 3: 临时文件共享

```typescript
// 创建临时共享链接
const sharePermissions: FilePermissions = {
  read: ['owner123', 'tempUser456'],
  write: ['owner123'],
  delete: ['owner123'],
  publicRead: false,
};

await vfs.updateFile(fileId, { metadata: { permissions: sharePermissions } });

// 临时用户可以读取
await vfs.readFile(fileId, { userId: 'tempUser456' }); // ✅ 成功

// 24 小时后撤销权限
setTimeout(async () => {
  const updated = acs.revokePermission(sharePermissions, 'tempUser456', ['read']);
  await vfs.updateFile(fileId, { metadata: { permissions: updated } });
}, 24 * 60 * 60 * 1000);
```

---

## 🎯 最佳实践

### 1. 始终提供用户上下文

```typescript
// ✅ 好的做法
await vfs.readFile(fileId, {
  userId: getCurrentUserId(),
  sessionId: getCurrentSessionId(),
});

// ❌ 不好的做法（使用匿名用户）
await vfs.readFile(fileId);
```

### 2. 细粒度权限控制

```typescript
// ✅ 好的做法：分别授予不同权限
permissions = acs.grantPermission(permissions, 'userB', ['read']);
permissions = acs.grantPermission(permissions, 'userC', ['read', 'write']);

// ❌ 不好的做法：授予过多权限
permissions = acs.grantPermission(permissions, 'userB', ['read', 'write', 'delete']);
```

### 3. 使用规则管理批量权限

```typescript
// ✅ 好的做法：使用规则
acs.addRule({
  name: '所有员工可读取输出文件',
  applyTo: ['*'],
  allow: { readRoles: [FileRole.OUTPUT] },
  priority: 10,
  enabled: true,
});

// ❌ 不好的做法：为每个用户单独设置权限
for (const user of allUsers) {
  permissions = acs.grantPermission(permissions, user, ['read']);
}
```

### 4. 验证用户输入的文件名

```typescript
// 在用户上传文件前验证
const fileName = fileInput.value;
const result = validateFileName(fileName);

if (!result.valid) {
  alert(`无效的文件名: ${result.error}`);
  return;
}

// 或者自动清理
const safeName = sanitizeFileName(fileName);
fileInput.value = safeName;
```

---

## 🔗 相关文档

- **详细实施文档**: `SECURITY_ENHANCEMENT_SUMMARY.md`
- **实施报告**: `SECURITY_IMPLEMENTATION_REPORT.md`
- **验证脚本**: `verify-security-features.cjs`

---

## 💡 提示

1. **默认安全**: 安全功能默认启用，无需额外配置
2. **向后兼容**: 现有代码可以继续工作
3. **渐进式迁移**: 可以逐步添加用户上下文
4. **灵活配置**: 所有功能都可以独立启用/禁用
5. **事件监听**: 可以监听访问事件进行审计

---

## 🆘 故障排除

### 问题：所有操作都被拒绝

**解决方案**:
- 检查是否提供了正确的 `userId`
- 检查文件所有者是否是当前用户
- 检查权限列表中是否包含当前用户

### 问题：文件上传失败

**解决方案**:
- 检查文件名是否包含非法字符
- 检查文件类型是否在白名单中
- 检查文件大小是否超过限制

### 问题：规则不生效

**解决方案**:
- 检查规则的 `enabled` 属性是否为 `true`
- 检查规则的 `applyTo` 是否包含目标用户
- 检查规则的优先级是否足够高

---

*最后更新: 2026-01-24*
