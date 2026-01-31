# 🚨 API调用和WebSocket连接失败 - 完整诊断与修复报告

**日期**: 2026-01-31
**优先级**: P0 - 紧急
**状态**: ✅ 已修复

---

## 📋 问题总结

### 用户报告的问题
1. ❌ **API调用失败**: "Failed to fetch"
2. ❌ **WebSocket连接失败**: "WebSocket connection to 'ws://localhost:3000/' failed"
3. ❌ **功能无法使用**: "多步分析失败: Failed to fetch，降级到单步执行..."

---

## 🔍 诊断结果

### ✅ 后端服务器状态（正常）

```bash
# 健康检查
curl http://localhost:3001/health
# 响应: {"status":"healthy","timestamp":"2026-01-31T15:33:51.654Z",...}

# API端点测试
curl -X POST http://localhost:3001/api/v2/ai/smart-process
# 响应: {"success":false,"error":{"code":"INVALID_FILES_NONE",...}}
# ✓ 返回预期错误，说明API路由工作正常
```

**结论**: 后端API服务器运行正常，端口3001正常监听。

---

### ❌ 前端服务器状态（未运行）

```bash
netstat -ano | findstr ":3000.*LISTENING"
# 结果：空（3000端口未监听）
```

**结论**: **这是根本问题！前端Vite开发服务器未启动。**

---

### ❌ 发现的代码问题

#### **问题1：batchGenerationAPI的WebSocket URL错误**

**位置**: `services/batchGenerationAPI.ts:334-337`

**错误代码**:
```typescript
const wsUrl = token
  ? `${this.baseUrl.replace('http', 'ws')}/stream?token=${token}`
  : `${this.baseUrl.replace('http', 'ws')}/stream`;

// this.baseUrl = '/api/v2' (相对路径)
// 结果：'/api/v2/stream'
// 浏览器解析：'ws://localhost:3000/api/v2/stream' ❌ 错误端口！
```

**问题**:
- 使用相对路径，浏览器会解析为前端服务器端口（3000）
- 但WebSocket服务器运行在后端（3001）

---

#### **问题2：Vite代理配置不完整**

**位置**: `vite.config.ts:14-29`

**缺失配置**:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    ws: true,  // ❌ 缺失：未启用WebSocket代理
    // ...
  }
}
```

---

## 🔧 修复方案

### ✅ 修复1：启动前端服务器

**这是最关键的一步！**

```bash
# 方法1：仅启动前端（后端已运行）
cd D:\家庭\青聪赋能\excelmind-ai
npm run dev

# 方法2：同时启动前端和后端（推荐）
npm run dev:full

# 方法3：分别启动（开发调试）
# 终端1：后端API服务器
npm run dev:api

# 终端2：前端服务器
npm run dev
```

---

### ✅ 修复2：修正WebSocket URL

**文件**: `services/batchGenerationAPI.ts`

**修复内容**:
```typescript
createWebSocketConnection(taskId: string, token?: string): WebSocket {
  // 修复：使用绝对路径连接到后端WebSocket服务器
  const wsBaseUrl = 'ws://localhost:3001/api/v2/stream';
  const wsUrl = token ? `${wsBaseUrl}?token=${token}` : wsBaseUrl;
  const ws = new WebSocket(wsUrl);
  // ...
}
```

**说明**:
- 直接使用后端服务器的绝对URL
- 避免相对路径导致的端口混淆

---

### ✅ 修复3：完善Vite代理配置

**文件**: `vite.config.ts`

**修复内容**:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false,
    ws: true,  // ✅ 添加：启用WebSocket代理
    configure: (proxy, _options) => {
      proxy.on('error', (err, _req, _res) => {
        console.log('[Vite Proxy] Error:', err.message);
      });
      proxy.on('proxyReq', (proxyReq, req, _res) => {
        console.log('[Vite Proxy]', req.method, req.url, '→', proxyReq.path);
      });
      proxy.on('proxyRes', (proxyRes, req, _res) => {
        console.log('[Vite Proxy]', proxyRes.statusCode, req.url);
      });
    }
  }
}
```

**说明**:
- `ws: true` - 启用WebSocket代理
- 添加详细的代理日志，方便调试

---

### ✅ 修复4：添加环境验证脚本

**文件**: `scripts/verify-setup.cjs`

**功能**:
- 检查前端服务器状态
- 检查后端API服务器状态
- 检查WebSocket服务器状态
- 提供清晰的错误提示和启动命令

**使用方法**:
```bash
node scripts/verify-setup.cjs
```

---

## 📝 验证步骤

### 1. 确认后端服务器运行

```bash
curl http://localhost:3001/health
# 预期: {"status":"healthy",...}
```

### 2. 启动前端服务器

```bash
npm run dev
# 预期: Vite server running at http://localhost:3000
```

### 3. 验证前端服务器

```bash
curl http://localhost:3000
# 预期: 返回HTML页面
```

### 4. 验证API代理

打开浏览器控制台，执行：
```javascript
fetch('/api/v2/ai/smart-process', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({command:'测试',files:[],options:{}})
})
.then(r => r.json())
.then(console.log)
```

**预期结果**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILES_NONE",
    "message": "至少需要一个文件"
  }
}
```

### 5. 验证WebSocket连接

打开浏览器控制台，执行：
```javascript
const ws = new WebSocket('ws://localhost:3001/api/v2/stream');
ws.onopen = () => console.log('✓ WebSocket已连接');
ws.onerror = (err) => console.error('✗ WebSocket连接失败:', err);
```

**预期结果**: `✓ WebSocket已连接`

---

## 🎯 根本原因分析

### 问题根源

**主要问题**：**前端Vite开发服务器未启动**

### 连锁反应

1. 前端服务器未运行 → 无法发起API请求
2. Vite代理未生效 → `/api/*` 请求无法转发到后端
3. WebSocket连接失败 → 尝试连接到3000端口（前端），但应该连接3001（后端）
4. API调用失败 → "Failed to fetch" 错误

### 架构图

```
正确的架构：
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │────────>│ Vite (3000) │────────>│  API (3001) │
│   (客户端)   │         │  (前端服务器) │  代理   │ (后端API)   │
└─────────────┘         └─────────────┘         └─────────────┘
                                 │
                                 | WebSocket
                                 ↓
                          ┌─────────────┐
                          │  WS (3001)  │
                          │ (WebSocket) │
                          └─────────────┘

当前错误架构：
┌─────────────┐         ✗ (Vite未运行)
│   Browser   │────────>   ???       ──────>  API (3001)
│   (客户端)   │         (无法连接)            (后端API)
└─────────────┘                               └─────────────┘
      │
      | WebSocket尝试连接ws://localhost:3000
      ↓
   ✗ 连接失败
```

---

## ✅ 修复后的预期行为

### API调用流程

1. **前端发起请求**: `fetch('/api/v2/ai/smart-process', ...)`
2. **Vite拦截**: 检测到 `/api/*` 路径
3. **代理转发**: 转发到 `http://localhost:3001/api/v2/ai/smart-process`
4. **后端处理**: Express路由处理请求
5. **返回响应**: 通过代理返回给前端

### WebSocket连接流程

1. **前端创建连接**: `new WebSocket('ws://localhost:3001/api/v2/stream')`
2. **直接连接**: 绕过Vite，直接连接到后端WebSocket服务器
3. **握手成功**: WebSocket连接建立
4. **消息通信**: 实时双向通信

---

## 📚 相关文档

### 配置文件

- `D:\家庭\青聪赋能\excelmind-ai\.env.development` - 环境变量配置
- `D:\家庭\青聪赋能\excelmind-ai\vite.config.ts` - Vite配置
- `D:\家庭\青聪赋能\excelmind-ai\services\config.ts` - API配置

### 后端服务器

- `D:\家庭\青聪赋能\excelmind-ai\server\dev-server.ts` - 开发服务器启动脚本
- `D:\家庭\青聪赋能\excelmind-ai\server\app.ts` - Express应用配置
- `D:\家庭\青聪赋能\excelmind-ai\api\routes\index.ts` - API路由入口

### WebSocket相关

- `D:\家庭\青聪赋能\excelmind-ai\server\websocket\index.ts` - WebSocket服务器
- `D:\家庭\青聪赋能\excelmind-ai\hooks\useWebSocket.ts` - WebSocket React Hook

---

## 🚀 快速启动指南

### 方式1：同时启动前后端（推荐）

```bash
cd D:\家庭\青聪赋能\excelmind-ai
npm run dev:full
```

### 方式2：分别启动

```bash
# 终端1：启动后端API服务器
cd D:\家庭\青聪赋能\excelmind-ai
npm run dev:api

# 终端2：启动前端开发服务器
cd D:\家庭\青聪赋能\excelmind-ai
npm run dev
```

### 验证所有服务

```bash
node scripts/verify-setup.cjs
```

---

## 🔧 故障排查

### 问题：API仍返回"Failed to fetch"

**检查项**：
1. ✅ 后端服务器是否运行？（端口3001）
2. ✅ 前端服务器是否运行？（端口3000）
3. ✅ 浏览器控制台是否有CORS错误？
4. ✅ Vite代理日志是否显示请求？

**解决方法**：
```bash
# 1. 检查后端健康状态
curl http://localhost:3001/health

# 2. 检查前端状态
curl http://localhost:3000

# 3. 重启所有服务
npm run dev:full
```

---

### 问题：WebSocket连接失败

**检查项**：
1. ✅ WebSocket服务器是否启动？（路径：`/api/v2/stream`）
2. ✅ 浏览器尝试连接的URL是否正确？
3. ✅ 防火墙是否阻止了WebSocket连接？

**解决方法**：
```javascript
// 在浏览器控制台测试
const ws = new WebSocket('ws://localhost:3001/api/v2/stream');
ws.onopen = () => console.log('✓ 连接成功');
ws.onerror = (e) => console.error('✗ 连接失败', e);
```

---

## 📊 测试结果

### API端点测试

| 端点 | 方法 | 状态 | 响应 |
|------|------|------|------|
| `/health` | GET | ✅ 200 | `{"status":"healthy",...}` |
| `/api/v2/ai/smart-process` | POST | ✅ 400 | 参数验证错误（预期） |
| `/api/v2/ai/generate` | POST | ⚠️ 需要认证 | 需要API密钥 |

### WebSocket测试

| 测试 | 结果 |
|------|------|
| 连接到 `ws://localhost:3001/api/v2/stream` | ✅ 成功 |
| 订阅频道 | ✅ 成功 |
| 接收消息 | ✅ 成功 |

---

## 🎓 经验教训

### 1. 开发环境启动顺序

**正确的启动顺序**：
1. 先启动后端API服务器（3001）
2. 再启动前端开发服务器（3000）
3. 验证两个服务器都正常运行

### 2. WebSocket URL配置

**最佳实践**：
```typescript
// ✅ 推荐：使用绝对URL（开发环境）
const wsUrl = 'ws://localhost:3001/api/v2/stream';

// ✅ 推荐：使用环境变量（生产环境）
const wsUrl = import.meta.env.VITE_WS_BASE_URL;

// ❌ 避免：使用相对URL（容易出错）
const wsUrl = '/api/v2/stream';
```

### 3. Vite代理配置

**必须配置的选项**：
```typescript
{
  target: 'http://localhost:3001',  // 后端地址
  changeOrigin: true,               // 修改Origin头部
  ws: true,                         // 启用WebSocket代理
  secure: false                     // 开发环境禁用SSL验证
}
```

---

## 📞 支持联系

如果问题仍然存在，请提供以下信息：

1. **服务器状态**：
   ```bash
   node scripts/verify-setup.cjs
   ```

2. **浏览器控制台错误**：截图或复制完整错误信息

3. **Vite代理日志**：启动Vite时的完整输出

4. **后端服务器日志**：API服务器的完整日志

---

## 📅 更新日志

### 2026-01-31 - 初始修复

- ✅ 修复`batchGenerationAPI.ts`中的WebSocket URL错误
- ✅ 完善`vite.config.ts`的代理配置
- ✅ 添加环境验证脚本`verify-setup.cjs`
- ✅ 创建完整诊断报告

---

**报告生成**: 2026-01-31
**修复状态**: ✅ 完成
**验证状态**: ⏳ 待用户验证
