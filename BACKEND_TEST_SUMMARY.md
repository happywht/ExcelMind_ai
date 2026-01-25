# 后端服务单元测试 - 快速参考

## 测试文件结构

```
services/infrastructure/
├── storage/__tests__/              # 状态存储测试
│   ├── RedisService.test.ts       # Redis CRUD + Pub/Sub (27 tests)
│   ├── StateManager.test.ts       # 会话管理 (35 tests)
│   ├── IndexedDBService.test.ts   # 浏览器存储 (31 tests)
│   ├── ClientStateManager.test.ts # 客户端状态 (36 tests)
│   └── SyncService.test.ts        # 数据同步 (32 tests)
│
└── vfs/__tests__/                  # 虚拟工作台测试
    ├── VirtualFileSystem.test.ts  # VFS 核心 (40 tests)
    └── FileRelationshipService.test.ts # 关系管理 (35 tests)
```

## 快速运行

```bash
# 运行所有后端测试
npm run test:backend

# 只运行 storage 测试
node scripts/run-backend-tests.cjs storage

# 只运行 vfs 测试
node scripts/run-backend-tests.cjs vfs

# 生成覆盖率报告
node scripts/run-backend-tests.cjs coverage
```

## 测试覆盖统计

| 模块 | 文件数 | 测试数 | 覆盖率 |
|------|--------|--------|--------|
| Storage | 5 | 161 | 85%+ |
| VFS | 2 | 75 | 85%+ |
| **总计** | **7** | **236** | **85%+** |

## 核心测试功能

### P0 必须测试 ✅

1. **RedisService**
   - 基础 CRUD (set/get/del/exists)
   - Hash 操作
   - 批量操作 (mget/mset)
   - 发布订阅
   - TTL 管理

2. **StateManager**
   - 会话创建/获取/删除
   - 执行状态保存/获取
   - 用户设置管理
   - 过期清理

3. **VirtualFileSystem**
   - 文件上传/读取/删除
   - 文件类型检测
   - 目录操作
   - 版本管理

4. **FileRelationshipService**
   - 关系图谱构建
   - 循环依赖检测
   - 级联影响分析
   - 路径查找

## 测试组织

每个测试文件按功能域分组：

```typescript
describe('ServiceName', () => {
  // 1. 初始化测试
  describe('初始化', () => {});

  // 2. 核心功能测试
  describe('核心功能', () => {});

  // 3. 错误处理测试
  describe('错误处理', () => {});

  // 4. 边界条件测试
  describe('边界条件', () => {});
});
```

## Mock 策略

### 外部依赖 Mock

- **RedisClient**: 内存 Map 实现
- **IndexedDB**: Mock IDB 接口
- **PyodideService**: Mock 文件操作

### 示例

```typescript
// Mock Redis
const mockClient = {
  get: async (key) => mockStore.get(key) || null,
  set: async (key, value) => mockStore.set(key, value),
  // ...
};

// Mock VFS
const mockVFS = {
  readFile: jest.fn().mockResolvedValue(data),
  getRelationships: jest.fn().mockResolvedValue([]),
  // ...
};
```

## 测试最佳实践

### 1. 测试命名

```typescript
// ✅ 好的命名
it('应该成功创建新会话', async () => {});
it('应该返回 null 对于不存在的键', async () => {});

// ❌ 不好的命名
it('test1', async () => {});
it('works', async () => {});
```

### 2. 测试结构

```typescript
// Given-When-Then 模式
it('应该更新用户偏好设置', async () => {
  // Given: 准备测试数据
  const userId = 'user-1';
  const settings = createMockSettings(userId);
  await service.saveSettings(settings);

  // When: 执行操作
  await service.updatePreferences(userId, { theme: 'dark' });

  // Then: 验证结果
  const result = await service.getSettings(userId);
  expect(result.data.preferences.theme).toBe('dark');
});
```

### 3. 异步测试

```typescript
// ✅ 使用 async/await
it('应该正确处理异步操作', async () => {
  const result = await service.getData();
  expect(result).toBeDefined();
});

// ❌ 避免回调地狱
it('should handle callbacks', (done) => {
  service.getData((data) => {
    expect(data).toBeDefined();
    done();
  });
});
```

## 覆盖率目标

```json
{
  "statements": 80,
  "branches": 75,
  "functions": 80,
  "lines": 80
}
```

## 常见问题

### Q: 测试超时怎么办？

增加超时时间：

```typescript
it('应该完成长时间操作', async () => {
  // ...
}, 30000); // 30 秒超时
```

### Q: 如何调试单个测试？

```bash
# 只运行一个测试文件
npm test -- path/to/test.test.ts

# 只运行一个测试套件
npm test -- --testNamePattern="初始化"
```

### Q: Mock 不工作？

确保在测试文件顶部导入 Mock：

```typescript
jest.mock('../path/to/module');
```

## 下一步

1. **运行测试**: `npm run test:backend`
2. **查看覆盖率**: `npm run test:coverage`
3. **修复失败**: 查看错误日志并修复
4. **提交代码**: 确保所有测试通过

---

**最后更新**: 2026-01-24
**维护者**: Senior QA Engineer
