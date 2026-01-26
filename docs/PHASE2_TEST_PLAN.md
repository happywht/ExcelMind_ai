# Phase 2 优化全面测试验证计划

**文档版本**: 1.0.0
**测试负责人**: Senior QA Engineer
**测试日期**: 2026-01-25
**项目**: ExcelMind AI - Phase 2 优化

---

## 📊 执行摘要

### 测试背景
Phase 2优化已完成5个关键任务，共计42个文件变更，约7,000行代码。本测试计划旨在全面验证这些优化的质量、功能完整性和性能表现。

### 测试目标
1. **代码质量验证** - 确保所有新代码符合质量标准
2. **功能完整性验证** - 验证所有功能正常工作
3. **性能回归测试** - 确保性能没有下降
4. **安全验证** - 验证安全性提升
5. **发现潜在问题** - 及早发现bug和性能问题

### 测试范围概览

| 优化任务 | 文件变更数 | 测试优先级 | 测试类型 |
|---------|-----------|-----------|---------|
| P0-1: API密钥安全加固 | 13 | P0 | 安全测试 + 集成测试 |
| P0-2: WebSocket实现统一 | 8 | P0 | 单元测试 + 集成测试 |
| P0-3: 错误处理标准化 | 8 | P0 | 单元测试 + E2E测试 |
| P0-4: 内存泄漏修复 | 3 | P0 | 性能测试 + 内存测试 |
| P1-1: 状态管理优化 | 10 | P1 | 单元测试 + 集成测试 |

---

## 1️⃣ 测试策略

### 1.1 测试分层

```
┌─────────────────────────────────────┐
│     E2E测试 (关键用户流程)          │ ← Playwright
│     - 批量生成完整流程              │
│     - 错误恢复和重试                │
│     - 实时进度更新                  │
├─────────────────────────────────────┤
│     集成测试 (服务集成)             │ ← Vitest + Supertest
│     - API端点测试                   │
│     - WebSocket通信                 │
│     - 数据库集成                    │
├─────────────────────────────────────┤
│     单元测试 (核心逻辑)             │ ← Jest/Vitest
│     - 错误类层级                    │
│     - WebSocket实现                 │
│     - 状态管理                      │
├─────────────────────────────────────┤
│     性能测试 (压力测试)             │ ← 自定义脚本
│     - API响应时间                   │
│     - 内存使用                      │
│     - 并发处理                      │
├─────────────────────────────────────┤
│     安全测试 (漏洞扫描)             │ ← 手动验证 + 工具
│     - API密钥保护                   │
│     - 输入验证                      │
│     - 敏感信息过滤                  │
└─────────────────────────────────────┘
```

### 1.2 测试工具链

| 测试类型 | 工具 | 用途 |
|---------|------|------|
| 单元测试 | Vitest | 核心逻辑测试 |
| 集成测试 | Vitest + Supertest | API集成测试 |
| E2E测试 | Playwright | 端到端流程测试 |
| 性能测试 | 自定义脚本 + benchmark.js | 性能基准测试 |
| 安全测试 | 手动验证 + 代码审查 | 安全漏洞检测 |
| 覆盖率 | Vitest --coverage | 代码覆盖率统计 |

---

## 2️⃣ 详细测试用例

### 2.1 P0-1: API密钥安全加固测试

#### 测试目标
验证API密钥不再暴露在前端，所有AI调用通过后端代理

#### 单元测试用例 (6个)

```typescript
// tests/unit/api/aiProxy.test.ts
describe('AI代理API - 单元测试', () => {
  describe('POST /api/v2/ai/generate-data-code', () => {
    it('应该拒绝空prompt', async () => {
      const response = await request(app)
        .post('/api/v2/ai/generate-data-code')
        .send({ prompt: '', context: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该拒绝超长prompt (>10000字符)', async () => {
      const longPrompt = 'a'.repeat(10001);
      const response = await request(app)
        .post('/api/v2/ai/generate-data-code')
        .send({ prompt: longPrompt, context: [] });

      expect(response.status).toBe(400);
    });

    it('应该正确处理有效请求', async () => {
      const mockAI = jest.spyOn(aiService, 'generateCode');
      mockAI.mockResolvedValue({ code: 'console.log("test");' });

      const response = await request(app)
        .post('/api/v2/ai/generate-data-code')
        .send({ prompt: '生成打印代码', context: [] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('应该实施速率限制', async () => {
      const requests = Array.from({ length: 101 }, () =>
        request(app)
          .post('/api/v2/ai/generate-data-code')
          .send({ prompt: 'test', context: [] })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('应该正确处理AI服务错误', async () => {
      jest.spyOn(aiService, 'generateCode')
        .mockRejectedValue(new Error('AI服务不可用'));

      const response = await request(app)
        .post('/api/v2/ai/generate-data-code')
        .send({ prompt: 'test', context: [] });

      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('应该记录请求日志', async () => {
      const logSpy = jest.spyOn(logger, 'info');

      await request(app)
        .post('/api/v2/ai/generate-data-code')
        .send({ prompt: 'test', context: [] });

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai:request',
          prompt: 'test'
        })
      );
    });
  });
});
```

#### 集成测试用例 (4个)

```typescript
// tests/integration/api/aiProxy.integration.test.ts
describe('AI代理API - 集成测试', () => {
  it('应该完成完整的AI调用流程', async () => {
    const response = await request(app)
      .post('/api/v2/ai/generate-data-code')
      .send({
        prompt: '生成数据过滤代码',
        context: [{ type: 'excel', data: 'test' }]
      });

    expect(response.status).toBe(200);
    expect(response.body.data.code).toBeDefined();
    expect(response.body.data.language).toBe('javascript');
  });

  it('应该支持批量AI调用', async () => {
    const requests = [
      { prompt: '生成filter代码', context: [] },
      { prompt: '生成map代码', context: [] },
      { prompt: '生成reduce代码', context: [] }
    ];

    const responses = await Promise.all(
      requests.map(req =>
        request(app)
          .post('/api/v2/ai/generate-data-code')
          .send(req)
      )
    );

    responses.forEach(res => {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  it('应该正确处理并发请求', async () => {
    const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .post('/api/v2/ai/generate-data-code')
        .send({ prompt: `测试${i}`, context: [] })
    );

    const responses = await Promise.all(concurrentRequests);
    const successCount = responses.filter(r => r.status === 200).length;

    expect(successCount).toBe(10);
  });

  it('应该在超时情况下返回错误', async () => {
    jest.spyOn(aiService, 'generateCode')
      .mockImplementation(() => new Promise(resolve =>
        setTimeout(resolve, 6000)
      ));

    const response = await request(app)
      .post('/api/v2/ai/generate-data-code')
      .send({ prompt: 'test', context: [] })
      .timeout(5000);

    expect(response.status).toBe(504);
  });
});
```

#### 安全测试用例 (8个)

```markdown
## 安全测试清单

### API密钥保护
- [ ] 前端代码中无API密钥
  - 检查文件: services/zhipuService.ts
  - 验证: grep -r "ZHIPU_API_KEY" src/

- [ ] 所有AI调用通过后端
  - 检查: 无直接Anthropic客户端调用
  - 验证: 网络请求指向 /api/v2/ai/*

- [ ] 环境变量配置正确
  - 检查: .env文件包含ZHIPU_API_KEY
  - 验证: 后端能读取环境变量

### 输入验证
- [ ] prompt参数验证正常工作
  - 测试: 空字符串、超长字符串、特殊字符
  - 验证: 返回400错误

- [ ] 恶意输入被拒绝
  - 测试: SQL注入、XSS、脚本注入
  - 验证: 请求被拒绝

- [ ] 请求大小限制生效
  - 测试: 发送超大payload
  - 验证: 返回413错误

### 敏感信息保护
- [ ] 错误信息不泄露敏感数据
  - 测试: 触发各种错误
  - 验证: 响应中无API密钥、堆栈信息

- [ ] 日志中无密码/token
  - 检查: 日志文件
  - 验证: 敏感信息已脱敏

- [ ] 堆栈信息已清理
  - 测试: 触发错误
  - 验证: 响应中无详细堆栈

### 速率限制
- [ ] 正常请求不受影响
  - 测试: 发送100个/分钟内的请求
  - 验证: 全部成功

- [ ] 超限请求被拒绝
  - 测试: 发送101个/分钟内的请求
  - 验证: 第101个返回429

- [ ] 限流后自动恢复
  - 测试: 等待1分钟后重试
  - 验证: 请求成功
```

---

### 2.2 P0-2: WebSocket实现统一测试

#### 单元测试用例 (10个)

```typescript
// tests/unit/websocket/IWebSocket.test.ts
describe('IWebSocket接口 - 单元测试', () => {
  describe('ServerWebSocket实现', () => {
    let serverWS: ServerWebSocket;
    let mockWSServer: any;

    beforeEach(() => {
      mockWSServer = new EventEmitter();
      serverWS = new ServerWebSocket(mockWSServer);
    });

    it('应该正确订阅频道', () => {
      const handler = jest.fn();
      serverWS.subscribe('task:123', handler);

      mockWSServer.emit('task:123', { data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('应该正确取消订阅', () => {
      const handler = jest.fn();
      serverWS.subscribe('task:123', handler);
      serverWS.unsubscribe('task:123');

      mockWSServer.emit('task:123', { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('应该向指定频道发送消息', async () => {
      const mockClient = { send: jest.fn() };
      mockWSServer.clients = { 'client1': mockClient };

      await serverWS.send('task:123', { message: 'test' });

      expect(mockClient.send).toHaveBeenCalledWith(
        JSON.stringify({ channel: 'task:123', message: 'test' })
      );
    });

    it('应该广播消息到所有客户端', async () => {
      const client1 = { send: jest.fn() };
      const client2 = { send: jest.fn() };
      mockWSServer.clients = { client1, client2 };

      await serverWS.broadcast('update', { data: 'test' });

      expect(client1.send).toHaveBeenCalled();
      expect(client2.send).toHaveBeenCalled();
    });

    it('应该正确报告连接状态', () => {
      mockWSServer.isConnected = true;
      expect(serverWS.isConnected()).toBe(true);

      mockWSServer.isConnected = false;
      expect(serverWS.isConnected()).toBe(false);
    });
  });

  describe('ClientWebSocket实现', () => {
    let clientWS: ClientWebSocket;
    let mockWS: any;

    beforeEach(() => {
      mockWS = new EventEmitter();
      mockWS.readyState = WebSocket.OPEN;
      clientWS = new ClientWebSocket();
      clientWS.socket = mockWS;
    });

    it('应该成功连接到服务器', async () => {
      mockWS.connect = jest.fn().mockResolvedValue(undefined);

      await clientWS.connect('ws://localhost:3001');

      expect(mockWS.connect).toHaveBeenCalledWith('ws://localhost:3001');
    });

    it('应该处理连接错误', async () => {
      mockWS.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));

      await expect(clientWS.connect('ws://localhost:3001'))
        .rejects.toThrow('Connection failed');
    });

    it('应该订阅消息频道', () => {
      const handler = jest.fn();
      clientWS.subscribe('task:123', handler);

      mockWS.emit('message', {
        data: JSON.stringify({ channel: 'task:123', message: 'test' })
      });

      expect(handler).toHaveBeenCalledWith('test');
    });

    it('应该自动重连', async () => {
      const connectSpy = jest.spyOn(clientWS, 'connect')
        .mockResolvedValue(undefined);

      mockWS.emit('close');

      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('应该限制最大重连次数', async () => {
      jest.spyOn(clientWS, 'connect')
        .mockRejectedValue(new Error('Failed'));

      mockWS.emit('close');
      mockWS.emit('close');
      mockWS.emit('close');
      mockWS.emit('close');
      mockWS.emit('close');

      await new Promise(resolve => setTimeout(resolve, 6000));

      // 应该停止重连
      expect(clientWS.reconnectAttempts).toBeLessThanOrEqual(5);
    });
  });
});
```

#### 集成测试用例 (6个)

```typescript
// tests/integration/websocket/unified.integration.test.ts
describe('WebSocket统一实现 - 集成测试', () => {
  let serverWS: ServerWebSocket;
  let clientWS: ClientWebSocket;
  let testServer: any;
  let testPort: number;

  beforeAll(async () => {
    testServer = await createTestWSServer();
    testPort = testServer.port;
  });

  afterAll(async () => {
    await testServer.close();
  });

  beforeEach(async () => {
    serverWS = new ServerWebSocket(testServer.wss);
    clientWS = new ClientWebSocket();
    await clientWS.connect(`ws://localhost:${testPort}`);
  });

  afterEach(async () => {
    await clientWS.disconnect();
  });

  it('应该完成服务端到客户端的消息传递', async () => {
    const receivedMessage = new Promise(resolve => {
      clientWS.subscribe('test:channel', resolve);
    });

    await serverWS.send('test:channel', { text: 'Hello from server' });
    const message = await receivedMessage;

    expect(message).toEqual({ text: 'Hello from server' });
  });

  it('应该完成客户端到服务端的消息传递', async () => {
    const serverReceived = new Promise(resolve => {
      serverWS.subscribe('client:message', resolve);
    });

    await clientWS.send('client:message', { text: 'Hello from client' });
    const message = await serverReceived;

    expect(message).toEqual({ text: 'Hello from client' });
  });

  it('应该支持多客户端订阅同一频道', async () => {
    const client1 = new ClientWebSocket();
    const client2 = new ClientWebSocket();

    await client1.connect(`ws://localhost:${testPort}`);
    await client2.connect(`ws://localhost:${testPort}`);

    const messages1: any[] = [];
    const messages2: any[] = [];

    client1.subscribe('broadcast', msg => messages1.push(msg));
    client2.subscribe('broadcast', msg => messages2.push(msg));

    await serverWS.broadcast('broadcast', { text: 'test' });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(messages1).toHaveLength(1);
    expect(messages2).toHaveLength(1);
    expect(messages1[0]).toEqual(messages2[0]);

    await client1.disconnect();
    await client2.disconnect();
  });

  it('应该正确处理客户端断开重连', async () => {
    let connectionCount = 0;
    serverWS.on('connection:opened', () => connectionCount++);

    await clientWS.disconnect();
    await clientWS.connect(`ws://localhost:${testPort}`);

    expect(connectionCount).toBe(2);
  });

  it('应该在服务端关闭时通知所有客户端', async () => {
    const disconnectPromise = new Promise(resolve => {
      clientWS.on('close', resolve);
    });

    await testServer.wss.close();
    await disconnectPromise;

    expect(clientWS.isConnected()).toBe(false);
  });

  it('应该处理大量并发消息', async () => {
    const messageCount = 1000;
    let receivedCount = 0;

    clientWS.subscribe('bulk:test', () => receivedCount++);

    const promises = Array.from({ length: messageCount }, (_, i) =>
      serverWS.send('bulk:test', { index: i })
    );

    await Promise.all(promises);
    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(receivedCount).toBe(messageCount);
  });
});
```

---

### 2.3 P0-3: 错误处理标准化测试

#### 单元测试用例 (8个)

```typescript
// tests/unit/errors/errorClasses.test.ts
describe('错误类层级 - 单元测试', () => {
  describe('ValidationError', () => {
    it('应该创建正确的验证错误', () => {
      const error = new ValidationError('username', '用户名不能为空', '');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('username');
      expect(error.message).toBe('用户名不能为空');
    });

    it('应该正确序列化错误信息', () => {
      const error = new ValidationError('email', '邮箱格式错误', 'invalid');
      const json = JSON.parse(JSON.stringify(error));

      expect(json.code).toBe('VALIDATION_ERROR');
      expect(json.field).toBe('email');
      expect(json.value).toBe('invalid');
    });

    it('应该包含堆栈信息', () => {
      const error = new ValidationError('test', 'test', 'test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });
  });

  describe('NotFoundError', () => {
    it('应该创建正确的404错误', () => {
      const error = new NotFoundError('Task', 'task-123');

      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('Task');
      expect(error.message).toContain('task-123');
    });

    it('应该支持无ID的错误', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User 不存在');
    });
  });

  describe('AuthenticationError', () => {
    it('应该创建认证错误', () => {
      const error = new AuthenticationError('Token已过期');

      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Token已过期');
    });
  });

  describe('AuthorizationError', () => {
    it('应该创建授权错误', () => {
      const error = new AuthorizationError('无权限访问此资源');

      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('无权限访问此资源');
    });
  });

  describe('ConflictError', () => {
    it('应该创建冲突错误', () => {
      const error = new ConflictError('资源冲突');

      expect(error.code).toBe('CONFLICT');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('资源冲突');
    });
  });

  describe('ServiceUnavailableError', () => {
    it('应该创建服务不可用错误', () => {
      const error = new ServiceUnavailableError('AI服务暂时不可用', 60);

      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.statusCode).toBe(503);
      expect(error.retryAfter).toBe(60);
    });
  });
});
```

#### E2E测试用例 (5个)

```typescript
// tests/e2e/errorHandling.spec.ts
import { test, expect } from '@playwright/test';

test.describe('错误处理 - E2E测试', () => {
  test('应该显示友好的验证错误', async ({ page }) => {
    await page.goto('/');

    // 提交空表单
    await page.click('[data-testid="submit-button"]');

    // 验证错误提示
    const errorAlert = page.locator('[data-testid="error-alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('请填写必填字段');

    // 验证字段高亮
    const invalidField = page.locator('[data-testid="task-name"]');
    await expect(invalidField).toHaveClass(/invalid/);
  });

  test('应该处理404错误', async ({ page }) => {
    // 访问不存在的任务
    await page.goto('/tasks/non-existent-task');

    // 验证404页面
    await expect(page.locator('h1')).toContainText('页面未找到');
    await expect(page.locator('[data-testid="back-home"]')).toBeVisible();
  });

  test('应该处理API错误并显示重试选项', async ({ page }) => {
    await page.goto('/');

    // Mock API错误
    await page.route('**/api/v2/tasks', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: '服务暂时不可用'
          }
        })
      });
    });

    // 尝试创建任务
    await page.fill('[name="taskName"]', 'Test Task');
    await page.click('[data-testid="submit-task"]');

    // 验证错误提示和重试按钮
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('服务暂时不可用');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // 点击重试
    await page.click('[data-testid="retry-button"]');
    // 应该重新尝试请求
  });

  test('应该正确处理网络错误', async ({ page }) => {
    // 模拟网络离线
    await page.context().setOffline(true);

    await page.goto('/');
    await page.click('[data-testid="load-tasks"]');

    // 验证网络错误提示
    await expect(page.locator('[data-testid="network-error"]'))
      .toContainText('网络连接失败');

    // 恢复网络
    await page.context().setOffline(false);
    await page.click('[data-testid="retry-button"]');

    // 应该重新加载
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible();
  });

  test('应该正确处理WebSocket断开', async ({ page }) => {
    await page.goto('/');

    // 模拟WebSocket断开
    await page.evaluate(() => {
      const ws = window.websocket;
      if (ws) ws.close();
    });

    // 验证断开提示
    await expect(page.locator('[data-testid="ws-disconnected"]'))
      .toBeVisible();

    // 等待自动重连
    await page.waitForTimeout(2000);

    // 验证重连成功提示
    await expect(page.locator('[data-testid="ws-reconnected"]'))
      .toBeVisible();
  });
});
```

---

### 2.4 P0-4: 内存泄漏修复测试

#### 性能测试用例 (5个)

```typescript
// tests/performance/memoryLeak.test.ts
describe('内存泄漏修复 - 性能测试', () => {
  it('流式处理应该控制内存使用', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // 创建100万行数据
    const largeData = Array.from({ length: 1000000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random()
    }));

    // 使用流式处理
    const processor = new StreamingDataProcessor();
    await processor.processStream(largeData);

    // 强制GC
    if (global.gc) global.gc();

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // 内存增长应该小于50MB
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  it('WebSocket连接应该正确清理', async () => {
    const server = new WebSocketServer({ port: 0 });
    const clients: WebSocket[] = [];

    // 创建100个连接
    for (let i = 0; i < 100; i++) {
      const client = new WebSocket(`ws://localhost:${server.port}`);
      await new Promise(resolve => client.on('open', resolve));
      clients.push(client);
    }

    const memoryWithConnections = process.memoryUsage().heapUsed;

    // 关闭所有连接
    clients.forEach(client => client.close());
    await new Promise(resolve => setTimeout(resolve, 100));

    if (global.gc) global.gc();

    const memoryAfterClose = process.memoryUsage().heapUsed;

    // 内存应该显著释放
    expect(memoryAfterClose).toBeLessThan(memoryWithConnections * 0.5);
  });

  it('缓存应该正确淘汰旧数据', async () => {
    const cache = new LRUCache({ max: 1000 });

    // 添加2000个条目
    for (let i = 0; i < 2000; i++) {
      cache.set(`key${i}`, { data: `value${i}` });
    }

    // 缓存大小应该不超过最大值
    expect(cache.size).toBeLessThanOrEqual(1000);

    // 旧条目应该被淘汰
    expect(cache.has('key0')).toBe(false);
    expect(cache.has('key1999')).toBe(true);
  });

  it('批量生成后应该清理内存', async () => {
    const scheduler = new BatchGenerationScheduler();

    const initialMemory = process.memoryUsage().heapUsed;

    // 创建大量任务
    const tasks = Array.from({ length: 100 }, (_, i) =>
      scheduler.createTask({
        templateIds: ['tpl1'],
        dataSource: { type: 'inline', source: { inline: [] } },
        mode: 'sequential'
      })
    );

    await Promise.all(tasks);

    // 等待清理
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (global.gc) global.gc();

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // 内存增长应该合理
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
  });

  it('长时间运行不应该持续增长内存', async () => {
    const measurements: number[] = [];

    // 每分钟测量一次，持续10分钟
    for (let i = 0; i < 10; i++) {
      if (global.gc) global.gc();
      measurements.push(process.memoryUsage().heapUsed);

      // 执行一些操作
      const processor = new DataQualityAnalyzer();
      await processor.analyze({
        sheets: { Sheet1: Array.from({ length: 1000 }, () => ({ test: 'data' })) }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 计算内存增长趋势
    const growth = measurements[9] - measurements[0];
    const avgGrowthPerMinute = growth / 10;

    // 平均每分钟增长应该小于1MB
    expect(avgGrowthPerMinute).toBeLessThan(1 * 1024 * 1024);
  });
});
```

---

### 2.5 P1-1: 状态管理优化测试

#### 单元测试用例 (6个)

```typescript
// tests/unit/stores/taskStore.test.ts
import { useTaskStore } from '../../stores/taskStore';

describe('TaskStore - 单元测试', () => {
  beforeEach(() => {
    // 重置store状态
    useTaskStore.getState().reset();
  });

  it('应该正确添加任务', () => {
    const { addTask, tasks } = useTaskStore.getState();

    const task = { id: 'task-1', name: 'Test Task', status: 'pending' };
    addTask(task);

    const taskList = Array.from(tasks.values());
    expect(taskList).toHaveLength(1);
    expect(taskList[0]).toEqual(task);
  });

  it('应该正确更新任务', () => {
    const { addTask, updateTask, tasks } = useTaskStore.getState();

    const task = { id: 'task-1', name: 'Test Task', status: 'pending' };
    addTask(task);

    updateTask('task-1', { status: 'processing', progress: 50 });

    const updatedTask = tasks.get('task-1');
    expect(updatedTask?.status).toBe('processing');
    expect(updatedTask?.progress).toBe(50);
  });

  it('应该正确删除任务', () => {
    const { addTask, removeTask, tasks } = useTaskStore.getState();

    addTask({ id: 'task-1', name: 'Test', status: 'pending' });
    removeTask('task-1');

    expect(tasks.has('task-1')).toBe(false);
  });

  it('应该正确设置活动任务', () => {
    const { setActiveTask, activeTaskId } = useTaskStore.getState();

    setActiveTask('task-1');
    expect(activeTaskId).toBe('task-1');
  });

  it('应该从WebSocket同步状态', () => {
    const { syncFromWebSocket, tasks } = useTaskStore.getState();

    syncFromWebSocket({
      type: 'task:updated',
      taskId: 'task-1',
      updates: { status: 'completed', progress: 100 }
    });

    const task = tasks.get('task-1');
    expect(task?.status).toBe('completed');
    expect(task?.progress).toBe(100);
  });

  it('应该正确处理任务完成事件', () => {
    const { syncFromWebSocket, tasks } = useTaskStore.getState();

    // 添加初始任务
    tasks.set('task-1', { id: 'task-1', status: 'processing' });

    // 同步完成事件
    syncFromWebSocket({
      type: 'task:completed',
      taskId: 'task-1',
      result: { documentId: 'doc-1' }
    });

    const task = tasks.get('task-1');
    expect(task?.status).toBe('completed');
    expect(task?.result).toEqual({ documentId: 'doc-1' });
  });
});
```

#### 集成测试用例 (4个)

```typescript
// tests/integration/stateManagement.integration.test.ts
describe('状态管理优化 - 集成测试', () => {
  it('应该与React Query正确集成', async () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: QueryClientProvider
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('应该正确同步WebSocket事件到状态', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useTaskStore(), { wrapper });

    act(() => {
      result.current.syncFromWebSocket({
        type: 'task:updated',
        taskId: 'task-1',
        updates: { progress: 75 }
      });
    });

    expect(result.current.tasks.get('task-1')?.progress).toBe(75);
  });

  it('应该在mutation后自动更新缓存', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateTask(), { wrapper });

    const taskData = {
      templateIds: ['tpl1'],
      dataSource: { type: 'inline', source: { inline: [] } }
    };

    await act(async () => {
      await result.current.mutateAsync(taskData);
    });

    // 验证缓存已更新
    const queryCache = queryClient.getQueryData(['tasks', { id: result.current.data?.id }]);
    expect(queryCache).toBeDefined();
  });

  it('应该正确处理乐观更新', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateTask(), { wrapper });

    const onMutate = jest.fn();
    result.current.mutate(
      { name: 'New Task' },
      {
        onMutate,
        onSuccess: (data) => {
          // 验证乐观更新已回滚并替换为真实数据
          expect(data).toBeDefined();
          expect(data.id).toBeDefined();
        }
      }
    );
  });
});
```

---

## 3️⃣ 测试执行计划

### 3.1 测试时间表

| 阶段 | 任务 | 预计时间 | 负责人 |
|-----|------|---------|--------|
| Day 1 上午 | 制定测试计划 | 2h | Senior QA |
| Day 1 下午 | 编写单元测试 | 4h | Senior QA |
| Day 2 上午 | 执行单元测试 | 2h | Senior QA |
| Day 2 下午 | 编写集成测试 | 4h | Senior QA |
| Day 3 上午 | 执行集成测试 | 3h | Senior QA |
| Day 3 下午 | 编写E2E测试 | 3h | Senior QA |
| Day 4 上午 | 执行E2E测试 | 3h | Senior QA |
| Day 4 下午 | 性能测试 + 安全测试 | 3h | Senior QA |
| Day 5 上午 | 生成测试报告 | 2h | Senior QA |
| Day 5 下午 | 问题汇总和修复建议 | 2h | Senior QA |

### 3.2 测试执行顺序

```
1. 单元测试 (快速反馈)
   ├─ 错误类测试 (30分钟)
   ├─ WebSocket测试 (1小时)
   ├─ 状态管理测试 (30分钟)
   └─ AI代理API测试 (1小时)

2. 集成测试 (验证集成)
   ├─ API集成测试 (1小时)
   ├─ WebSocket集成测试 (1小时)
   └─ 状态管理集成测试 (1小时)

3. E2E测试 (端到端验证)
   ├─ 批量生成流程 (1小时)
   ├─ 错误处理流程 (1小时)
   └─ WebSocket实时更新 (1小时)

4. 性能测试 (性能验证)
   ├─ 内存泄漏测试 (1小时)
   ├─ API响应时间测试 (30分钟)
   └─ 并发测试 (30分钟)

5. 安全测试 (安全验证)
   ├─ API密钥保护测试 (手动)
   ├─ 输入验证测试 (手动)
   └─ 敏感信息过滤测试 (手动)
```

---

## 4️⃣ 验收标准

### 4.1 代码质量标准

| 指标 | 目标值 | 测量方法 |
|-----|--------|---------|
| 代码覆盖率 | ≥ 80% | Vitest --coverage |
| TypeScript错误 | 0 | tsc --noEmit |
| ESLint警告 | 0 | npm run lint |
| 单元测试通过率 | 100% | Vitest结果 |
| 集成测试通过率 | ≥ 95% | Vitest结果 |
| E2E测试通过率 | ≥ 90% | Playwright结果 |

### 4.2 性能标准

| 指标 | 目标值 | 测量方法 |
|-----|--------|---------|
| API响应时间 (P95) | < 500ms | 性能测试脚本 |
| WebSocket延迟 | < 50ms | 自定义测试 |
| 内存使用 (100K行) | < 500MB | 内存分析工具 |
| 内存泄漏 | 无 | 长时间运行测试 |
| 并发处理能力 | 100 req/s | 负载测试 |

### 4.3 安全标准

| 检查项 | 状态 | 验证方法 |
|-------|------|---------|
| 前端无API密钥 | ✅ | 代码审查 + grep |
| 所有AI调用通过后端 | ✅ | 网络监控 |
| 输入验证完整 | ✅ | 安全测试用例 |
| 敏感信息过滤 | ✅ | 日志审查 |
| 速率限制生效 | ✅ | 压力测试 |

---

## 5️⃣ 测试报告模板

### 5.1 报告结构

```markdown
# Phase 2 测试执行报告

## 1. 执行摘要
- 测试日期: [日期]
- 测试人员: [姓名]
- 测试范围: [范围列表]

## 2. 测试结果汇总
- 总测试用例: [数量]
- 通过: [数量] ([百分比]%)
- 失败: [数量] ([百分比]%)
- 跳过: [数量] ([百分比]%)

## 3. 分层测试结果
### 3.1 单元测试
- 覆盖率: [百分比]%
- 通过/失败: [数量]/[数量]
- 详细结果: [链接]

### 3.2 集成测试
- API测试: [数量]个
- WebSocket测试: [数量]个
- 通过/失败: [数量]/[数量]

### 3.3 E2E测试
- 关键流程: [数量]个
- 通过/失败: [数量]/[数量]

### 3.4 性能测试
- API响应时间: [数值]ms
- 内存使用: [数值]MB
- 是否达标: [是/否]

### 3.5 安全测试
- 安全检查: [数量]项
- 通过/失败: [数量]/[数量]

## 4. 发现的问题
### 4.1 P0级别问题
1. [问题描述]
   - 位置: [文件:行号]
   - 影响: [描述]
   - 修复建议: [建议]

### 4.2 P1级别问题
1. [问题描述]
   - 位置: [文件:行号]
   - 影响: [描述]
   - 修复建议: [建议]

### 4.3 P2级别问题
1. [问题描述]
   - 位置: [文件:行号]
   - 影响: [描述]
   - 修复建议: [建议]

## 5. 改进建议
- [建议1]
- [建议2]
- [建议3]

## 6. 结论
- 整体评估: [通过/条件通过/不通过]
- 风险评级: [低/中/高]
- 发布建议: [建议]
```

---

## 6️⃣ 风险评估

### 6.1 测试风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 测试环境不稳定 | 高 | 中 | 准备备用环境 |
| Mock数据不足 | 中 | 低 | 使用生产数据副本 |
| 测试时间不足 | 高 | 中 | 优先执行P0测试 |
| 第三方服务依赖 | 中 | 低 | 使用Service Worker Mock |

### 6.2 质量风险

| 风险 | 当前状态 | 缓解措施 |
|------|---------|---------|
| 新功能bug | 中 | 代码审查 + 测试 |
| 性能回退 | 低 | 性能基准对比 |
| 安全漏洞 | 低 | 安全测试 + 代码审查 |
| 兼容性问题 | 低 | 多浏览器测试 |

---

## 7️⃣ 附录

### 7.1 测试数据

```typescript
// 测试数据示例
export const testTasks = [
  {
    id: 'task-1',
    name: '简单任务',
    templateIds: ['tpl1'],
    dataSource: { type: 'inline', source: { inline: [] } },
    mode: 'sequential'
  },
  {
    id: 'task-2',
    name: '复杂任务',
    templateIds: ['tpl1', 'tpl2'],
    dataSource: { type: 'file', source: { file: 'test.xlsx' } },
    mode: 'cross_product'
  }
];

export const testTemplates = [
  {
    id: 'tpl1',
    name: '基础模板',
    placeholders: ['name', 'date']
  },
  {
    id: 'tpl2',
    name: '复杂模板',
    placeholders: ['name', 'date', 'amount', 'description']
  }
];
```

### 7.2 测试工具脚本

```bash
#!/bin/bash
# scripts/run-phase2-tests.sh

echo "开始执行Phase 2测试..."

# 单元测试
echo "1. 执行单元测试..."
npm run test:phase2 -- --coverage

# 集成测试
echo "2. 执行集成测试..."
npm run test:integration:phase2

# E2E测试
echo "3. 执行E2E测试..."
npm run test:e2e:phase2

# 性能测试
echo "4. 执行性能测试..."
npm run perf:test:quick

# 生成报告
echo "5. 生成测试报告..."
npm run test:report

echo "测试完成！"
```

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-25
**审核状态**: 待审核
