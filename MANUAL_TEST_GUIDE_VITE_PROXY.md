# Vite 代理修复手动测试指南

**目的**: 验证 Vite 代理崩溃问题已修复
**预计时间**: 10-15 分钟
**难度**: 简单

---

## 📋 测试前准备

### 环境要求

- [x] Node.js 已安装
- [x] 项目依赖已安装 (`npm install`)
- [x] 后端服务可以启动（可选）
- [x] 浏览器已安装（推荐 Chrome）

### 清理环境

```bash
# 1. 停止所有运行的服务
# 按 Ctrl+C 停止所有终端中的服务

# 2. 清理 Vite 缓存
rm -rf node_modules/.vite

# 3. 清理浏览器缓存
# - 打开浏览器开发者工具 (F12)
# - 右键点击刷新按钮
# - 选择"清空缓存并硬性重新加载"
```

---

## 🧪 测试步骤

### 测试 1: 服务器启动稳定性

**目的**: 验证 Vite 服务器能正常启动且不崩溃

```bash
# 1. 启动 Vite 开发服务器
npm run dev
```

**预期结果**:
- ✅ 服务器成功启动，显示 `Local: http://localhost:3000/`
- ✅ 控制台没有错误信息
- ✅ 服务器持续运行不崩溃

**如果失败**:
- 查看错误信息
- 检查端口 3000 是否被占用
- 运行 `npm run dev -- --debug` 查看详细日志

---

### 测试 2: HTTP API 代理

**目的**: 验证 HTTP 请求能正确代理到后端

**步骤**:
1. 在浏览器打开 `http://localhost:3000`
2. 打开开发者工具 (F12)
3. 切换到 Console 标签
4. 输入以下代码并回车：

```javascript
fetch('/api/v2/health')
  .then(r => r.json())
  .then(d => console.log('✅ API 请求成功:', d))
  .catch(e => console.error('❌ API 请求失败:', e));
```

**预期结果**:
- ✅ 控制台显示请求成功（或 404，说明代理工作正常）
- ✅ Vite 控制台显示 `[Vite Proxy] GET /api/v2/health`
- ✅ 没有错误或崩溃

**如果失败**:
- 检查后端是否运行 (`npm run dev:api`)
- 查看 Vite 代理日志
- 检查浏览器控制台的网络请求

---

### 测试 3: WebSocket 连接

**目的**: 验证 WebSocket 代理不导致崩溃

**步骤**:
1. 在浏览器开发者工具的 Console 标签
2. 输入以下代码：

```javascript
const ws = new WebSocket('ws://localhost:3000/api/v2/stream');

ws.onopen = () => console.log('✅ WebSocket 连接已建立');
ws.onerror = (e) => console.log('⚠️  WebSocket 错误（后端可能未运行）');
ws.onclose = () => console.log('🔌 WebSocket 连接已关闭');

// 3秒后关闭连接
setTimeout(() => ws.close(), 3000);
```

**预期结果**:
- ✅ Vite 服务器不崩溃
- ✅ Vite 控制台显示 `[Vite Proxy] WebSocket Upgrade`
- ✅ 即使连接失败，服务器也正常运行

**如果失败**:
- 检查 Vite 控制台是否有崩溃错误
- 验证 `vite.config.ts` 中的 `ws: true` 配置
- 运行验证脚本 `npx tsx scripts/verify-vite-proxy-fix.ts`

---

### 测试 4: HMR 触发

**目的**: 验证热模块替换不影响代理稳定性

**步骤**:
1. 在浏览器打开 `http://localhost:3000`
2. 打开开发者工具 (F12)
3. 切换到 Console 标签
4. 在项目中修改任意文件（如 `App.tsx`）
5. 添加一行注释：`// 测试 HMR`
6. 保存文件 (Ctrl+S)

**预期结果**:
- ✅ 页面自动更新
- ✅ Vite 控制台显示 HMR 更新日志
- ✅ Vite 服务器不崩溃
- ✅ 代理功能正常工作

**如果失败**:
- 检查文件保存是否成功
- 查看浏览器控制台是否有 HMR 错误
- 清理 Vite 缓存后重试

---

### 测试 5: 并发请求压力测试

**目的**: 验证代理在高并发下的稳定性

**步骤**:
1. 在浏览器开发者工具的 Console 标签
2. 输入以下代码：

```javascript
// 发送 100 个并发请求
const promises = Array.from({ length: 100 }, (_, i) =>
  fetch(`/api/v2/test?i=${i}`)
    .then(r => r.text())
    .then(() => console.log(`✅ 请求 ${i + 1} 完成`))
    .catch(e => console.error(`❌ 请求 ${i + 1} 失败:`, e))
);

Promise.all(promises).then(() => {
  console.log('🎉 所有请求完成');
});
```

**预期结果**:
- ✅ Vite 服务器不崩溃
- ✅ 所有请求都得到响应（成功或失败）
- ✅ 控制台显示完整的代理日志

**如果失败**:
- 检查 Vite 控制台是否有错误
- 查看内存使用情况
- 减少并发数量重试

---

### 测试 6: 错误恢复

**目的**: 验证代理能正确处理错误情况

**步骤**:
1. 确保后端服务**未**运行
2. 在浏览器开发者工具的 Console 标签
3. 输入以下代码：

```javascript
fetch('/api/v2/invalid-endpoint')
  .then(r => {
    console.log('状态码:', r.status);
    return r.text();
  })
  .then(d => console.log('响应:', d))
  .catch(e => console.error('错误:', e));
```

**预期结果**:
- ✅ Vite 服务器不崩溃
- ✅ 返回错误响应（如 502 或 504）
- ✅ Vite 控制台显示 `[Vite Proxy] ERROR` 但继续运行
- ✅ 后续请求仍然正常工作

**如果失败**:
- 检查错误处理配置
- 查看 `vite.config.ts` 中的 `proxy.on('error')` 处理

---

## ✅ 测试结果汇总

### 通过标准

所有测试应该满足：
- ✅ Vite 服务器不崩溃
- ✅ 没有未处理的错误
- ✅ 错误被正确捕获和记录
- ✅ 服务器持续稳定运行

### 测试清单

- [ ] 测试 1: 服务器启动稳定性 - **通过 / 失败**
- [ ] 测试 2: HTTP API 代理 - **通过 / 失败**
- [ ] 测试 3: WebSocket 连接 - **通过 / 失败**
- [ ] 测试 4: HMR 触发 - **通过 / 失败**
- [ ] 测试 5: 并发请求 - **通过 / 失败**
- [ ] 测试 6: 错误恢复 - **通过 / 失败**

### 结果记录

**测试日期**: ___________
**测试人**: ___________
**通过数量**: _____ / 6
**失败数量**: _____ / 6
**备注**: ___________________________________

---

## 🐛 问题报告模板

如果测试失败，请使用以下模板报告问题：

```markdown
### Vite 代理测试失败报告

**测试日期**: 2026-01-31
**测试人**: [你的名字]
**测试环境**:
- OS: [Windows/macOS/Linux]
- Node.js: [版本]
- Vite: [版本]

**失败测试**: [测试编号] [测试名称]

**错误信息**:
```
[粘贴完整的错误信息]
```

**复现步骤**:
1. [步骤 1]
2. [步骤 2]
3. [步骤 3]

**预期行为**:
[描述预期应该发生什么]

**实际行为**:
[描述实际发生了什么]

**截图/日志**:
[粘贴相关截图或日志]
```

---

## 📞 获取帮助

如果测试失败或遇到问题：

1. **查看故障排查指南**:
   - 阅读 `VITE_PROXY_TROUBLESHOOTING_GUIDE.md`

2. **运行自动化测试**:
   ```bash
   npx tsx scripts/verify-vite-proxy-fix.ts
   ```

3. **联系支持**:
   - 架构团队: [联系方式]
   - 紧急联系: [联系方式]

---

**最后更新**: 2026-01-31
**版本**: 1.0.0
