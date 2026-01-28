# ADR-001: AI服务服务器端代理架构

**状态**: 已接受 (Accepted)
**日期**: 2026-01-27
**决策人**: CTO + 技术架构团队
**相关PR**: #待补充

---

## 上下文 (Context)

### 问题背景

在开发ExcelMind AI的智能处理功能时，我们需要集成智谱AI的API服务。这涉及一个关键的安全问题：

**核心挑战**: 如何在保证API密钥安全的前提下，为前端用户提供AI功能？

### 考虑的选项

1. **直接在前端调用AI服务**
   - 前端直接使用`@anthropic-ai/sdk`调用智谱AI
   - API密钥需要暴露在前端代码中

2. **服务器端代理模式**
   - 前端通过后端API间接调用AI服务
   - API密钥仅存储在服务器环境变量中

3. **混合模式**
   - 开发环境前端直接调用，生产环境使用代理
   - 需要维护两套代码逻辑

### 约束条件

- **安全性**: API密钥绝不能暴露给前端用户
- **性能**: AI调用不能显著影响用户体验
- **可维护性**: 架构应简单明了，易于团队理解
- **成本**: 需要控制服务器端调用成本
- **可扩展性**: 架构应支持未来添加更多AI服务提供商

---

## 决策 (Decision)

### 采用方案: 服务器端代理架构

我们选择**服务器端代理模式**，具体实施如下：

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (React)                          │
│  - 通过 HTTP API 调用后端接口                                │
│  - 无需知晓 AI API 密钥                                      │
│  - vite.config.ts 配置 API 代理                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ POST /api/v2/ai/generate-data-code
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   后端API服务器 (Express)                     │
│  api/controllers/aiController.ts                             │
│  - 参数验证和清洗                                            │
│  - 速率限制 (防滥用)                                         │
│  - 错误处理和日志记录                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 调用服务层
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              AI服务层 (services/zhipuService.ts)             │
│  - 从服务器环境变量读取 API 密钥                             │
│  - 实现 API 熔断器保护                                       │
│  - 错误降级处理                                              │
│  - 仅在 Node.js 环境允许直接调用                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS Request (API密钥在服务器端)
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              智谱AI API (https://open.bigmodel.cn)           │
└─────────────────────────────────────────────────────────────┘
```

### 技术实施

#### 1. 前端配置 (vite.config.ts)

```typescript
// ✅ 正确: 配置API代理
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  // ❌ 错误: 不要在前端注入API密钥
  // define: {
  //   'process.env.API_KEY': JSON.stringify(env.ZHIPU_API_KEY)
  // }
});
```

#### 2. 后端服务 (services/zhipuService.ts)

```typescript
// ✅ 正确: 服务器端密钥管理
const getClient = (): Anthropic => {
  if (!client) {
    const apiKey = isNodeEnv
      ? process.env.ZHIPU_API_KEY  // 仅在服务器端读取
      : '';  // 浏览器环境返回空字符串

    client = new Anthropic({
      apiKey,
      baseURL: 'https://open.bigmodel.cn/api/anthropic',
      dangerouslyAllowBrowser: isNodeEnv  // 仅允许Node环境
    });
  }
  return client;
};
```

#### 3. API控制器 (api/controllers/aiController.ts)

```typescript
// ✅ 正确: 服务器端代理接口
export class AIController {
  async generateDataProcessingCode(req: Request, res: Response) {
    // 参数验证
    const { prompt, context } = req.body;

    // 调用AI服务 (密钥在服务器端)
    const result = await zhipuService.generateDataProcessingCode(prompt, context);

    res.json({ success: true, data: result });
  }
}
```

### 安全措施

1. **API密钥保护**
   - 密钥存储在服务器环境变量 (`.env.local`)
   - `.env.local` 已添加到 `.gitignore`
   - 前端bundle中不包含任何密钥

2. **访问控制**
   - 实施API认证中间件 (`api/middleware/authMiddleware.ts`)
   - 支持开发环境禁用认证 (`AUTH_ENABLED=false`)
   - 生产环境强制启用认证

3. **速率限制**
   - 防止API滥用
   - 保护服务器成本
   - 实现用户级别配额管理

4. **熔断器保护**
   - 自动检测AI服务异常
   - 防止级联故障
   - 优雅降级处理

---

## 后果 (Consequences)

### 积极影响 ✅

#### 安全性
- **API密钥完全隔离**: 前端用户无法获取密钥
- **审计追踪**: 所有AI调用经过服务器日志
- **访问控制**: 可实施细粒度的权限管理

#### 可维护性
- **架构清晰**: 前后端职责明确
- **易于测试**: 可独立测试前端和后端
- **便于监控**: 集中式日志和性能监控

#### 可扩展性
- **多AI服务支持**: 可轻松添加其他AI提供商
- **版本管理**: 可独立管理API版本
- **A/B测试**: 可实施不同的AI策略

#### 成本控制
- **用量监控**: 可精确追踪API使用量
- **缓存优化**: 可实施服务器端缓存
- **配额管理**: 可限制用户滥用

### 消极影响 ⚠️

#### 性能开销
- **额外网络跳转**: 前端→后端→AI服务 (增加50-100ms延迟)
- **服务器负载**: 需要更多服务器资源处理代理请求
- **带宽成本**: 所有AI响应需要经过服务器转发

#### 开发复杂度
- **更多代码**: 需要维护前后端两套代码
- **调试难度**: 问题排查需要跨前后端
- **环境配置**: 需要配置多个环境变量

#### 运维成本
- **服务器维护**: 需要维护API服务器
- **监控告警**: 需要监控代理服务健康度
- **扩展性**: 需要考虑服务器横向扩展

### 技术债务 📊

**当前技术债务**: 低 (2/10)

**已知问题**:
1. 架构文档缺失 (本文档解决)
2. 团队认知不一致 (通过培训解决)
3. 测试覆盖不足 (需要补充集成测试)

**偿还计划**:
- 立即: 创建架构决策记录 (本文档)
- 1周内: 团队培训和技术同步
- 2周内: 补充E2E测试
- 1个月内: 建立自动化监控

---

## 替代方案分析

### 方案1: 前端直接调用 ❌

**优点**:
- 实现简单
- 性能更好 (少一次网络跳转)
- 服务器成本低

**缺点**:
- **严重安全隐患**: API密钥必须暴露在前端bundle中
- 无法实施访问控制
- 无法追踪用户使用情况
- 容易被滥用

**为什么不选择**:
安全风险不可接受。即使代码混淆，密钥仍可被提取。

### 方案2: 混合模式 ❌

**优点**:
- 开发环境更便捷
- 生产环境相对安全

**缺点**:
- 增加代码复杂度
- 容易出现配置错误
- 测试和部署复杂

**为什么不选择**:
增加维护成本，且存在生产环境误配置的风险。

### 方案3: 无服务器函数 (Lambda) 🤔

**优点**:
- 自动扩展
- 按需付费
- 运维成本低

**缺点**:
- 冷启动延迟
- 调试复杂
- 与现有架构集成需要重构

**为什么不选择**:
当前阶段保持简单，未来可考虑迁移到无服务器架构。

---

## 实施状态

### 已完成 ✅

- [x] 后端AI服务实现 (`services/zhipuService.ts`)
- [x] API控制器实现 (`api/controllers/aiController.ts`)
- [x] 认证中间件 (`api/middleware/authMiddleware.ts`)
- [x] 熔断器实现 (`services/infrastructure/degradation.ts`)
- [x] 前端API代理配置 (`vite.config.ts`)
- [x] 安全配置 (移除前端密钥注入)

### 进行中 🔄

- [ ] 架构文档完善
- [ ] E2E测试补充
- [ ] 性能监控集成

### 计划中 📋

- [ ] API文档自动生成 (Swagger/OpenAPI)
- [ ] 负载测试和性能优化
- [ ] 缓存策略实施
- [ ] 多AI服务提供商支持

---

## 相关决策

### 相关ADR
- ADR-002: API认证策略 (待创建)
- ADR-003: 熔断器模式实施 (待创建)

### 相关文档
- [架构文档](../../../ARCHITECTURE.md)
- [API文档](../../../api/QUICK_START.md)
- [安全实施指南](../../SECURITY_IMPROVEMENTS.md)

### 相关代码
- [zhipuService.ts](../../../services/zhipuService.ts)
- [aiController.ts](../../../api/controllers/aiController.ts)
- [authMiddleware.ts](../../../api/middleware/authMiddleware.ts)

---

## 版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|---------|
| 1.0 | 2026-01-27 | CTO | 初始版本 |

---

**审批**: 已通过技术委员会审批
**下次审查**: 2026-04-27 (3个月后)
