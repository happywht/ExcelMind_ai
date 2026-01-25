# Day 2 快速测试指南

## 测试环境准备清单

### ✅ 已完成项目

- [x] 安装项目依赖（ws, uuid, react-dropzone等）
- [x] TypeScript编译验证（通过，有警告但可忽略）
- [x] 创建测试脚本（存储、WebSocket、API健康检查）
- [x] 生成测试数据（Excel、API测试数据）
- [x] 创建测试报告模板
- [x] 更新package.json测试脚本

## 快速开始测试

### 1. 启动测试环境

```bash
# 方式1: 分别启动（推荐用于测试）
npm run server:start      # 终端1: 启动API服务器 (端口3000)
npm run server:websocket  # 终端2: 启动WebSocket服务器 (端口3001)

# 方式2: 同时启动
npm run dev:full         # 同时启动前端和API服务器
```

### 2. 运行自动化测试

```bash
# 测试存储服务
npm run test:storage

# 测试WebSocket（需要先启动WebSocket服务器）
npm run test:websocket

# 测试API健康（需要先启动API服务器）
npm run test:api:health

# 运行所有快速测试
npm run test:all:quick
```

### 3. 重新生成测试数据

```bash
npm run test:data:generate
```

## 测试验证清单

### 存储服务测试

```bash
npm run test:storage
```

**预期输出**:
```
🧪 开始测试存储服务...

测试1: 基本读写...
✓ 读取测试: { name: 'Test', value: 123 }

测试2: TTL过期时间...
✓ TTL测试: 已设置10秒过期

测试3: 命名空间隔离...
✓ 命名空间测试: ['test:ns:key']

测试4: 存储统计...
✓ 存储统计: { size: 3, namespace: 'test' }

测试5: 批量操作...
✓ 批量写入成功

✅ 所有存储测试通过！
```

### WebSocket测试

**前置条件**: 启动WebSocket服务器
```bash
npm run server:websocket
```

**在新终端运行测试**:
```bash
npm run test:websocket
```

**预期输出**:
```
✓ WebSocket连接成功
✓ 测试通过 (1/3): 订阅消息
✓ 收到消息: pong
✓ 测试通过 (2/3): Ping/Pong
✓ 测试通过 (3/3): 连接关闭

✅ WebSocket测试完成: 3/3 通过
```

### API健康检查测试

**前置条件**: 启动API服务器
```bash
npm run server:start
```

**在新终端运行测试**:
```bash
npm run test:api:health
```

**预期输出**:
```
========================================
Day 2 API端点测试
========================================

🧪 测试API健康检查...

✓ API健康检查通过
响应: {
  "status": "ok",
  "timestamp": "2025-01-25T...",
  "uptime": 1234
}

测试端点: 数据质量分析 (/api/data-quality/analyze)
✓ 数据质量分析: HTTP 200

测试端点: 模板管理 (/api/templates)
✓ 模板管理: HTTP 200

测试端点: 批量任务管理 (/api/batch/tasks)
✓ 批量任务管理: HTTP 200

========================================
✅ API测试完成
========================================
```

## 手动测试步骤

### 1. 测试数据质量端点

```bash
# 启动服务器后，使用curl测试
curl http://localhost:3000/api/data-quality/analyze \
  -H "Content-Type: application/json" \
  -d '{"filePath": "test-data/sample-data.xlsx"}'
```

**预期响应**:
```json
{
  "summary": {
    "totalRows": 103,
    "validRows": 92,
    "missingValues": 5,
    "duplicates": 3,
    "anomalies": 2,
    "qualityScore": 92
  },
  "issues": [
    {
      "type": "missing_value",
      "field": "联系人",
      "affectedRows": [5, 15, 25, 35, 45]
    },
    {
      "type": "anomaly",
      "field": "消费金额",
      "affectedRows": [50],
      "value": -100
    }
  ]
}
```

### 2. 测试WebSocket实时推送

```javascript
// 在浏览器控制台执行
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  console.log('已连接');

  // 订阅任务进度
  ws.send(JSON.stringify({
    type: 'subscribe',
    taskIds: ['test-task-123'],
    rooms: ['task:test-task-123']
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('收到消息:', message);

  // 期望收到:
  // - CONNECTED: 连接确认
  // - SUBSCRIPTION_ACK: 订阅确认
  // - TASK_PROGRESS: 任务进度更新
};
```

### 3. 测试前端集成

1. 启动前端开发服务器:
```bash
npm run dev
```

2. 打开浏览器访问: `http://localhost:3000`

3. 测试功能:
   - 打开Excel文件
   - 查看数据质量分析
   - 上传Word模板
   - 创建批量任务
   - 观察实时进度更新

## 故障排查

### 问题1: WebSocket连接失败

**症状**: `WebSocket error: connect ECONNREFUSED`

**解决方案**:
```bash
# 检查WebSocket服务器是否运行
netstat -an | findstr 3001  # Windows
lsof -i :3001               # Linux/Mac

# 如果未运行，启动服务器
npm run server:websocket
```

### 问题2: API请求超时

**症状**: `请求超时 (5秒)`

**解决方案**:
```bash
# 检查API服务器是否运行
curl http://localhost:3000/health

# 如果未运行，启动服务器
npm run server:start
```

### 问题3: 端口被占用

**症状**: `Error: listen EADDRINUSE: address already in use :::3000`

**解决方案**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### 问题4: 存储服务测试失败

**症状**: LocalStorage/IndexedDB相关错误

**解决方案**:
- 确保在浏览器环境中运行（不适用于Node.js）
- 或使用测试浏览器环境（如jsdom）

## 性能基准

### 预期性能指标

| 操作 | 目标时间 | 实际时间 | 状态 |
|------|---------|---------|------|
| 存储读写 | < 100ms | - | 待测试 |
| WebSocket连接 | < 500ms | - | 待测试 |
| API响应 | < 200ms | - | 待测试 |
| 数据质量分析 (100行) | < 1s | - | 待测试 |
| 批量生成 (10个文档) | < 5s | - | 待测试 |

### 压力测试

```bash
# WebSocket并发连接测试
# (需要使用专业工具如Artillery或JMeter)

# API并发请求测试
ab -n 1000 -c 10 http://localhost:3000/health
```

## 测试报告

测试完成后，请更新 `test-reports/DAY2_TEST_REPORT.md`:

1. 填写测试时间、人员、环境
2. 更新测试结果汇总表
3. 记录发现的问题
4. 填写性能指标实际值
5. 提供改进建议

## 下一步行动

- [ ] 完成所有自动化测试
- [ ] 验证前端集成
- [ ] 进行端到端测试
- [ ] 性能基准测试
- [ ] 生成最终测试报告
- [ ] 修复发现的问题
- [ ] 优化性能瓶颈

---

## 测试脚本位置

- 存储测试: `scripts/test-storage.ts`
- WebSocket测试: `scripts/test-websocket.ts`
- API测试: `scripts/test-api-health.ts`
- 数据生成: `scripts/generate-day2-test-data.ts`

## 测试数据位置

- Excel测试数据: `test-data/sample-data.xlsx`
- Word模板说明: `test-data/word-template-guide.md`
- API测试数据: `test-data/api-test-data.json`

## 测试报告位置

- 测试报告模板: `test-reports/DAY2_TEST_REPORT.md`
- 快速测试指南: `test-reports/DAY2_QUICK_TEST_GUIDE.md`

---

**准备状态**: ✅ 就绪

**开始测试**: 运行 `npm run test:all:quick`
