# Vite 代理故障排查指南

**版本**: 2.0.0
**更新日期**: 2026-01-31
**适用范围**: Vite 开发环境代理问题

---

## 🚨 快速诊断

### 问题清单

在开始排查前，请确认以下问题的答案：

- [ ] 服务器是否崩溃？
- [ ] 是否看到 "Cannot read properties of null (reading 'split')" 错误？
- [ ] 错误发生在什么操作后？（HMR、API 请求、WebSocket 连接）
- [ ] 后端服务是否正常运行？
- [ ] 其他浏览器是否也有同样问题？

---

## 🔧 常见问题与解决方案

### 问题 1: Vite 服务器崩溃

**症状**:
```
TypeError: Cannot read properties of null (reading 'split')
    at required (vite/dist/node/chunks/dep-ByPKlqZ5.js:38563:23)
```

**根本原因**:
- http-proxy 中间件解析 WebSocket 升级请求时遇到空值
- 缺少完整的错误处理导致服务器崩溃

**解决方案**:
1. ✅ **已修复** - 更新到新的 `vite.config.ts` (v2.0.1)
2. 重启开发服务器：
   ```bash
   # 停止当前服务器
   Ctrl+C

   # 清理缓存
   rm -rf node_modules/.vite

   # 重启
   npm run dev
   ```

**验证方法**:
- 检查服务器是否持续运行
- 查看控制台是否还有崩溃错误

---

### 问题 2: WebSocket 连接失败

**症状**:
- WebSocket 连接超时
- 连接立即关闭
- 控制台显示连接错误

**诊断步骤**:

1. **检查后端 WebSocket 服务器**:
   ```bash
   # 检查后端是否运行
   curl http://localhost:3001/health

   # 检查 WebSocket 端口
   netstat -an | grep 3001
   ```

2. **检查前端 WebSocket URL**:
   - 打开浏览器控制台
   - 查看 WebSocket 连接 URL
   - 确认路径格式：`ws://localhost:3000/api/v2/stream`

3. **检查代理日志**:
   - 查看 Vite 控制台
   - 搜索 `[Vite Proxy]` 日志
   - 确认 WebSocket 升级请求被正确处理

**解决方案**:

1. **如果后端未运行**:
   ```bash
   # 启动后端服务器
   npm run dev:api
   ```

2. **如果路径错误**:
   - 检查 `services/config.ts` 中的 `WS_BASE_URL` 配置
   - 确保使用相对路径 `/api`

3. **如果被代理阻止**:
   - 检查 `vite.config.ts` 中的代理配置
   - 确认 `ws: true` 已启用

---

### 问题 3: HMR 不工作

**症状**:
- 修改文件后页面不自动更新
- HMR WebSocket 连接失败
- 控制台显示 HMR 错误

**诊断步骤**:

1. **检查 HMR WebSocket 连接**:
   - 打开浏览器开发者工具
   - 切换到 Network 标签
   - 筛选 WS (WebSocket)
   - 查找 `ws://localhost:3000` 连接

2. **检查 Vite HMR 配置**:
   ```typescript
   hmr: {
     protocol: 'ws',
     host: 'localhost',
     port: 3000,
     clientPort: 3000,
     overlay: true,
   }
   ```

**解决方案**:

1. **清理缓存**:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

2. **检查防火墙**:
   - 确保端口 3000 未被阻止
   - 检查防病毒软件设置

3. **重启浏览器**:
   - 完全关闭浏览器
   - 清除浏览器缓存
   - 重新打开页面

---

### 问题 4: 代理超时

**症状**:
- API 请求长时间挂起
- 最终返回超时错误
- 控制台显示代理超时

**诊断步骤**:

1. **检查后端响应时间**:
   ```bash
   # 直接访问后端
   time curl http://localhost:3001/api/v2/health

   # 通过代理访问
   time curl http://localhost:3000/api/v2/health
   ```

2. **检查网络延迟**:
   - 使用浏览器开发者工具
   - 查看 Timing 标签
   - 对比直接访问和代理访问的时间

**解决方案**:

1. **增加代理超时时间** (如果需要):
   ```typescript
   proxy: {
     '/api': {
       target: 'http://localhost:3001',
       timeout: 30000, // 30秒
       proxyTimeout: 30000,
     }
   }
   ```

2. **优化后端性能**:
   - 检查后端日志
   - 优化慢查询
   - 添加缓存

---

### 问题 5: CORS 错误

**症状**:
- 控制台显示 CORS 错误
- 请求被浏览器阻止
- 预检请求失败

**诊断步骤**:

1. **检查请求头**:
   - 打开浏览器开发者工具
   - 查看 Network 标签
   - 检查 Request Headers

2. **检查响应头**:
   - 查看 Response Headers
   - 确认是否有 `Access-Control-Allow-Origin`

**解决方案**:

1. **确保使用代理**:
   - API 请求应该使用相对路径 `/api/...`
   - 不要直接使用 `http://localhost:3001`

2. **配置后端 CORS** (如果直接访问):
   ```typescript
   // 后端添加 CORS 支持
   app.use(cors({
     origin: 'http://localhost:3000',
     credentials: true,
   }));
   ```

---

## 🩺 高级诊断

### 查看详细日志

1. **启用 Vite 调试日志**:
   ```bash
   DEBUG=vite:* npm run dev
   ```

2. **查看代理日志**:
   - 在 Vite 控制台搜索 `[Vite Proxy]`
   - 查看请求和响应日志
   - 确认 WebSocket 升级过程

3. **查看浏览器日志**:
   - 打开浏览器控制台
   - 查看 Console 标签
   - 查看 Network 标签

### 使用诊断工具

1. **运行验证脚本**:
   ```bash
   npx tsx scripts/verify-vite-proxy-fix.ts
   ```

2. **测试 WebSocket 连接**:
   ```bash
   npx tsx scripts/test-websocket.ts
   ```

3. **检查端口占用**:
   ```bash
   # Windows
   netstat -ano | findstr :3000

   # macOS/Linux
   lsof -i :3000
   ```

---

## 📋 预防措施

### 1. 定期更新依赖

```bash
# 检查过时的包
npm outdated

# 更新 Vite
npm update vite

# 更新所有依赖
npm update
```

### 2. 监控错误日志

- 设置日志监控
- 配置错误告警
- 定期检查日志文件

### 3. 压力测试

```bash
# 使用 Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/v2/health

# 使用 wrk
wrk -t4 -c100 -d30s http://localhost:3000/api/v2/health
```

### 4. 建立基准

- 记录正常性能指标
- 定期运行测试
- 对比基准数据

---

## 🆘 获取帮助

### 联系支持

如果问题仍未解决：

1. **收集信息**:
   - 完整的错误信息
   - Vite 版本
   - Node.js 版本
   - 操作系统版本

2. **创建最小复现**:
   - 简化代码
   - 移除无关依赖
   - 提供复现步骤

3. **提交 Issue**:
   - 项目仓库: [GitHub 链接]
   - 模板: 使用问题报告模板

### 相关资源

- [Vite 官方文档](https://vitejs.dev/)
- [Vite 代理配置](https://vitejs.dev/config/server-options.html#server-proxy)
- [http-proxy 文档](https://github.com/http-party/node-http-proxy)
- [WebSocket 协议](https://tools.ietf.org/html/rfc6455)

---

**最后更新**: 2026-01-31
**维护者**: 架构团队
