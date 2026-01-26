# 后端AI代理系统 - 快速启动指南

## 🚀 一键启动

```bash
npx tsx scripts/start-backend-ai.ts
```

这个脚本会自动：
1. ✅ 检查环境变量配置
2. ✅ 安装缺失的依赖
3. ✅ 启动后端API服务器
4. ✅ 运行功能测试
5. ✅ 显示使用说明

---

## 📝 手动步骤（如果需要）

### 1. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local，设置API密钥
# ZHIPU_API_KEY=your-id.secret
```

**获取API密钥**: https://open.bigmodel.cn/

### 2. 验证配置

```bash
npx tsx scripts/check-env-simple.ts
```

预期输出：
```
✅ ZHIPU_API_KEY 已正确配置
✅ 环境变量配置正确！
```

### 3. 启动服务器

```bash
npm run dev:api
```

服务器将在 `http://localhost:3001` 启动

### 4. 验证服务

```bash
# 健康检查
curl http://localhost:3001/health

# 运行功能测试
npx tsx scripts/test-ai-proxy.ts
```

### 5. 启动前端

```bash
# 新终端窗口
npm run dev
```

访问 `http://localhost:3000`

---

## 🔧 API端点

### Excel公式生成
```bash
POST /api/v2/ai/generate-formula

{
  "description": "如果A1大于100，返回'高'，否则返回'低'"
}
```

### 数据处理代码生成
```bash
POST /api/v2/ai/generate-data-code

{
  "prompt": "过滤出金额大于1000的记录",
  "context": [
    {
      "fileName": "data.xlsx",
      "headers": ["ID", "Name", "Amount"],
      "sampleRows": [...]
    }
  ]
}
```

### 知识库对话
```bash
POST /api/v2/ai/chat

{
  "query": "什么是审计轨迹？",
  "history": [],
  "contextDocs": "审计轨迹是..."
}
```

---

## ✅ 功能验证清单

测试所有7个AI功能模块：

- [ ] **智能处理** - 数据处理代码生成
- [ ] **公式生成器** - Excel公式生成
- [ ] **审计助手** - 知识库对话
- [ ] **文档空间** - 智能文档处理
- [ ] **批量生成** - 批量文档生成
- [ ] **模板管理** - 模板创建和管理
- [ ] **数据质量** - 数据质量分析

---

## 🐛 故障排除

### 服务器无法启动
```bash
# 检查端口占用
netstat -ano | findstr :3001

# 更改端口
# 在 .env.local 中设置: API_PORT=3002
```

### API密钥错误
```bash
# 验证API密钥格式
npx tsx scripts/check-env-simple.ts

# API密钥应该是: id.secret 格式
```

### CORS错误
检查 `server/app.ts` 中的CORS配置，确保前端域名在允许列表中。

### 前端仍然显示浏览器环境错误
确保前端使用 `aiProxyService` 而不是直接调用AI服务。

---

## 📚 更多信息

详细文档：`docs/AI_PROXY_IMPLEMENTATION_GUIDE.md`

---

**最后更新**: 2026-01-26
**状态**: ✅ 生产就绪
