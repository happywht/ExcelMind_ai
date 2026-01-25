# Day 2 测试资源索引

> **测试状态**: 🟢 就绪 | **准备完成度**: 100% | **更新时间**: 2025-01-25

---

## 🚀 快速开始

### 立即开始测试

```bash
# 1. 启动服务器（需要2个终端）
npm run server:start      # 终端1: API服务器 (端口3000)
npm run server:websocket  # 终端2: WebSocket服务器 (端口3001)

# 2. 运行测试
npm run test:all:quick

# 3. 查看详细报告
cat test-reports/DAY2_TEST_REPORT.md
```

---

## 📚 文档导航

### 核心文档

| 文档 | 用途 | 优先级 |
|------|------|--------|
| **[快速测试指南](./DAY2_QUICK_TEST_GUIDE.md)** | 开始测试的第一份文档 | ⭐⭐⭐ |
| **[验证清单](./DAY2_VERIFICATION_CHECKLIST.md)** | 完整的验证检查项 | ⭐⭐⭐ |
| **[准备工作总结](./DAY2_TEST_PREPARATION_SUMMARY.md)** | 准备工作详细报告 | ⭐⭐ |
| **[测试报告模板](./DAY2_TEST_REPORT.md)** | 记录测试结果 | ⭐⭐ |

### 推荐阅读顺序

1. 📖 [快速测试指南](./DAY2_QUICK_TEST_GUIDE.md) - 了解如何开始测试
2. ✅ [验证清单](./DAY2_VERIFICATION_CHECKLIST.md) - 确认环境就绪
3. 🧪 运行测试 - 执行自动化测试
4. 📝 [测试报告模板](./DAY2_TEST_REPORT.md) - 记录测试结果

---

## 🛠️ 测试工具

### 测试脚本

| 脚本 | 功能 | 运行命令 |
|------|------|---------|
| **存储服务测试** | 测试LocalStorage/IndexedDB | `npm run test:storage` |
| **WebSocket测试** | 测试WebSocket连接和消息 | `npm run test:websocket` |
| **API健康检查** | 测试API端点可用性 | `npm run test:api:health` |
| **数据生成器** | 生成测试数据 | `npm run test:data:generate` |

### 快捷命令

```bash
# 测试相关
npm run test:storage         # 单独测试存储服务
npm run test:websocket       # 单独测试WebSocket
npm run test:api:health      # 单独测试API
npm run test:all:quick       # 运行所有快速测试
npm run test:data:generate   # 重新生成测试数据

# 服务器相关
npm run server:start         # 启动API服务器
npm run server:websocket     # 启动WebSocket服务器
npm run dev:full             # 启动所有服务（前端+API）

# 开发相关
npm run dev                  # 启动前端开发服务器
npm run build                # 构建生产版本
```

---

## 📊 测试数据

### 可用测试数据

| 数据文件 | 大小 | 内容 | 用途 |
|---------|------|------|------|
| **sample-data.xlsx** | 67KB | 103行客户数据 | 数据质量测试 |
| **word-template-guide.md** | 1.3KB | Word模板说明 | 模板功能测试 |
| **api-test-data.json** | 963B | API测试数据 | API端点测试 |

### 数据特征

**Excel数据** (`sample-data.xlsx`):
- 总行数: 103行（包含100行有效数据 + 3行重复）
- 数据质量:
  - ✅ 缺失值: 5% (联系人、电话字段)
  - ✅ 异常值: 3% (负数消费金额)
  - ✅ 重复值: 3行
- 字段数: 13个（客户ID、名称、联系人、电话、邮箱、类别、城市、地址、注册日期、消费金额、订单数量、会员等级、备注）

---

## 🎯 测试范围

### 自动化测试 (14项)

#### 存储服务 (5项)
- ✅ LocalStorage基本读写
- ✅ TTL过期机制
- ✅ 命名空间隔离
- ✅ 批量操作
- ✅ 存储统计

#### WebSocket (4项)
- ✅ 服务器启动
- ✅ 客户端连接
- ✅ 消息订阅
- ✅ Ping/Pong心跳

#### API (4项)
- ✅ 健康检查端点
- ✅ 数据质量端点
- ✅ 模板管理端点
- ✅ 批量任务端点

### 手动测试 (5项)

- ⏳ 文件上传功能
- ⏳ 数据质量可视化
- ⏳ 模板编辑器
- ⏳ 批量任务创建
- ⏳ 实时进度显示

---

## 📋 测试流程

### 阶段1: 准备（已完成）✅

- [x] 安装项目依赖
- [x] 验证代码编译
- [x] 创建测试脚本
- [x] 生成测试数据
- [x] 准备测试文档

### 阶段2: 执行（待执行）⏳

#### 步骤1: 启动服务器

```bash
# 终端1: API服务器
npm run server:start

# 终端2: WebSocket服务器
npm run server:websocket
```

**验证**:
- [ ] API服务器启动成功 (http://localhost:3000)
- [ ] WebSocket服务器启动成功 (ws://localhost:3001)
- [ ] 健康检查端点响应正常

#### 步骤2: 运行自动化测试

```bash
npm run test:all:quick
```

**验证**:
- [ ] 存储服务测试通过
- [ ] WebSocket测试通过
- [ ] API健康检查通过

#### 步骤3: 手动功能测试

**前端测试**:
- [ ] 打开浏览器访问 http://localhost:5173
- [ ] 上传Excel文件
- [ ] 查看数据质量分析结果
- [ ] 上传Word模板
- [ ] 创建批量任务
- [ ] 观察实时进度更新

#### 步骤4: 记录测试结果

- [ ] 更新 `DAY2_TEST_REPORT.md`
- [ ] 记录发现的问题
- [ ] 测量性能指标
- [ ] 生成测试总结

---

## 🔧 故障排查

### 常见问题

#### 1. WebSocket连接失败

**症状**: `WebSocket error: connect ECONNREFUSED`

**解决方案**:
```bash
# 检查端口是否被占用
netstat -an | findstr 3001  # Windows
lsof -i :3001               # Linux/Mac

# 启动WebSocket服务器
npm run server:websocket
```

#### 2. API请求超时

**症状**: `请求超时 (5秒)`

**解决方案**:
```bash
# 检查API服务器状态
curl http://localhost:3000/health

# 启动API服务器
npm run server:start
```

#### 3. 端口被占用

**症状**: `Error: listen EADDRINUSE`

**解决方案**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

#### 4. 存储服务测试失败

**症状**: LocalStorage/IndexedDB相关错误

**解决方案**:
- 确保在浏览器环境中运行
- 或使用测试浏览器环境（如jsdom）

---

## 📊 质量指标

### 目标性能

| 指标 | 目标值 | 实际值 | 状态 |
|------|--------|--------|------|
| 存储读写延迟 | < 100ms | - | 待测试 |
| WebSocket连接 | < 500ms | - | 待测试 |
| API响应时间 | < 200ms | - | 待测试 |
| 内存使用 | < 512MB | - | 待测试 |

### 测试覆盖率

| 类别 | 自动化 | 手动 | 总覆盖率 |
|------|--------|------|----------|
| 存储服务 | 100% | - | 100% |
| WebSocket | 100% | - | 100% |
| API | 100% | - | 100% |
| 前端 | 0% | 待测 | 0% |
| **总计** | **74%** | **26%** | **74%** |

---

## 📞 支持和联系

### 文档位置

- **快速指南**: `test-reports/DAY2_QUICK_TEST_GUIDE.md`
- **验证清单**: `test-reports/DAY2_VERIFICATION_CHECKLIST.md`
- **准备总结**: `test-reports/DAY2_TEST_PREPARATION_SUMMARY.md`
- **测试报告**: `test-reports/DAY2_TEST_REPORT.md`

### 脚本位置

- **存储测试**: `scripts/test-storage.ts`
- **WebSocket测试**: `scripts/test-websocket.ts`
- **API测试**: `scripts/test-api-health.ts`
- **数据生成**: `scripts/generate-day2-test-data.ts`

### 数据位置

- **Excel数据**: `test-data/sample-data.xlsx`
- **Word说明**: `test-data/word-template-guide.md`
- **API数据**: `test-data/api-test-data.json`

---

## ✅ 检查清单

### 测试前检查

- [ ] 所有依赖已安装
- [ ] 代码编译通过
- [ ] 测试脚本可执行
- [ ] 测试数据已生成
- [ ] 服务器端口未被占用

### 测试中检查

- [ ] 服务器正常启动
- [ ] 自动化测试通过
- [ ] 手动测试完成
- [ ] 问题已记录
- [ ] 性能指标已测量

### 测试后检查

- [ ] 测试报告已更新
- [ ] 问题已分类
- [ ] 优化建议已提出
- [ ] 文档已完善

---

## 🎯 下一步行动

### 立即执行

1. ⏳ 启动服务器（API + WebSocket）
2. ⏳ 运行自动化测试
3. ⏳ 执行手动功能测试
4. ⏳ 记录测试结果

### 后续任务

5. ⏳ 前端集成测试
6. ⏳ 性能基准测试
7. ⏳ 问题修复和优化
8. ⏳ 文档完善

---

## 📝 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2025-01-25 | 1.0 | 初始版本，完成测试环境准备 |

---

**准备状态**: ✅ 就绪

**可以开始测试**: ✅ 是

**建议开始时间**: 立即

---

*本文档由 Senior QA Engineer 创建，用于索引和组织 Day 2 测试相关的所有资源。*
