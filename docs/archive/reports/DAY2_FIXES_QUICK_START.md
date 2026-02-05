# Day 2修复快速启动指南

## 🚀 快速验证修复

### 一键验证（推荐）
```bash
npx tsx scripts/verify-day2-fixes.ts
```

这会自动验证所有9个修复点是否正确应用。

---

## 📋 详细测试步骤

### 1. API认证测试

**启动API服务器**:
```bash
npm run dev:api
```

**在新终端运行测试**:
```bash
npx tsx scripts/test-api-auth.ts
```

**预期结果**:
```
✓ 无API密钥访问: 返回401
✓ 有效API密钥访问: 返回200
✓ 无效API密钥访问: 返回401
✓ Bearer Token格式: 返回200
✓ Authorization头部格式: 返回200
✓ 查询参数格式: 返回200
```

**测试API密钥**:
- 有效密钥: `test-key-123`
- 无效密钥: `invalid-key`

**手动测试**:
```bash
# 无API密钥（应返回401）
curl http://localhost:3000/api/v2/data-quality/statistics

# 有效API密钥（应返回200）
curl -H "X-API-Key: test-key-123" http://localhost:3000/api/v2/data-quality/statistics

# Bearer Token格式（应返回200）
curl -H "Authorization: Bearer test-key-123" http://localhost:3000/api/v2/data-quality/statistics
```

---

### 2. WebSocket测试

**启动WebSocket服务器**:
```bash
npm run server:websocket
```

**在新终端运行测试**:
```bash
npm run test:websocket
```

**预期结果**:
- 客户端连接后立即收到connected消息
- 无延迟或超时现象
- 消息时序正常

---

### 3. IndexedDB测试

**运行所有Phase 2测试**:
```bash
npm run test:phase2
```

**运行特定IndexedDB测试**:
```bash
vitest run tests/unit/services/storage
```

**预期结果**:
- 26个IndexedDB测试正常运行
- 无IndexedDB未定义错误
- 所有数据库操作正常

---

## 🔧 环境配置

### 生产环境配置

文件位置: `.env.production`

```bash
# API认证配置
AUTH_ENABLED=true
API_KEYS=test-key-123,prod-key-456,dev-key-789
API_KEY_HEADER=X-API-Key

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=nishishui123
DB_NAME=excelmind_ai

# 服务器配置
PORT=3000
NODE_ENV=production

# AI服务配置
ANTHROPIC_API_KEY=ccd69d4c776d4e2696a6ef026159fb9c.YUPVkBmrRXu1xoZG
ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic

# WebSocket配置
WS_PORT=3001
WS_PATH=/ws
```

---

## 🐛 故障排除

### 问题1: API认证测试失败

**症状**: 所有请求都返回401，即使有有效API密钥

**解决方案**:
1. 检查API服务器是否正在运行
2. 确认使用了正确的API密钥
3. 检查 `.env.production` 文件是否存在
4. 查看服务器日志确认认证中间件是否加载

### 问题2: WebSocket测试时序问题

**症状**: 客户端仍然延迟收到connected消息

**解决方案**:
1. 确认WebSocket服务器代码已更新
2. 重启WebSocket服务器
3. 清除浏览器缓存
4. 检查网络延迟

### 问题3: IndexedDB测试失败

**症状**: IndexedDB is not defined

**解决方案**:
1. 确认 `fake-indexeddb` 已安装
2. 检查 `vitest.config.ts` 包含IndexedDB mock
3. 确认 `tests/mocks/indexedDB.ts` 文件存在
4. 重启测试进程

---

## 📊 验证清单

使用此清单确保所有修复正确应用：

- [ ] `.env.production` 文件存在
- [ ] `AUTH_ENABLED=true` 配置正确
- [ ] `API_KEYS` 配置存在
- [ ] 认证中间件使用 `=== false` 检查
- [ ] `fake-indexeddb` 依赖已安装
- [ ] `tests/mocks/indexedDB.ts` 文件存在
- [ ] `vitest.config.ts` 包含IndexedDB mock
- [ ] WebSocket连接消息使用 `await`
- [ ] API认证测试通过
- [ ] WebSocket测试通过
- [ ] IndexedDB测试通过

---

## 🎯 开发工作流

### 日常开发

1. **启动开发环境**:
   ```bash
   # 终端1: 启动API服务器
   npm run dev:api

   # 终端2: 启动WebSocket服务器
   npm run server:websocket

   # 终端3: 启动前端开发服务器
   npm run dev
   ```

2. **运行测试**:
   ```bash
   # 快速验证所有修复
   npx tsx scripts/verify-day2-fixes.ts

   # 运行所有测试
   npm run test:phase2
   ```

### 生产部署

1. **使用生产配置**:
   ```bash
   # 加载生产环境变量
   set NODE_ENV=production

   # 启动生产服务器
   npm run server:start
   ```

2. **验证生产环境**:
   ```bash
   # 使用生产API密钥测试
   curl -H "X-API-Key: prod-key-456" http://your-domain.com/api/v2/data-quality/statistics
   ```

---

## 📞 支持

如有问题，请参考：

1. **完整修复报告**: `DAY2_P0_FIXES_REPORT.md`
2. **验证脚本**: `scripts/verify-day2-fixes.ts`
3. **API认证测试**: `scripts/test-api-auth.ts`

---

**快速命令参考**:

```bash
# 验证所有修复
npx tsx scripts/verify-day2-fixes.ts

# 测试API认证
npx tsx scripts/test-api-auth.ts

# 测试WebSocket
npm run test:websocket

# 测试IndexedDB
npm run test:phase2

# 启动所有服务
npm run dev:full
```

---

**最后更新**: 2026-01-25
**修复状态**: ✅ 全部完成并验证
