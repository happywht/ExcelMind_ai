# Phase 2 前端集成快速开始

> **快速验证前端集成是否正常工作**

## 前置条件

```bash
# 确保已安装所有依赖
pnpm install

# 确保Playwright浏览器已安装
npx playwright install
```

## 启动服务

**方式1: 分别启动（推荐）**
```bash
# 终端1: 启动API服务器
npm run server:start

# 终端2: 启动WebSocket服务器
npm run server:websocket

# 终端3: 启动前端开发服务器
npm run dev
```

**方式2: 同时启动**
```bash
npm run dev:full
```

## 快速验证步骤

### 1. 验证数据质量分析

**步骤**:
1. 打开浏览器访问 `http://localhost:3001`
2. 点击侧边栏的"数据质量"
3. 上传测试Excel文件（`test-data/sample-data.xlsx`）
4. 观察分析进度实时更新
5. 查看分析结果和质量评分
6. 点击"一键修复"测试修复功能

**预期结果**:
- ✅ 文件成功上传
- ✅ 分析进度实时显示
- ✅ 质量评分正确显示
- ✅ 问题列表完整
- ✅ 修复功能正常

### 2. 验证批量生成

**步骤**:
1. 点击侧边栏的"批量生成"
2. 选择模板（点击模板卡片）
3. 点击"下一步"
4. 选择数据源
5. 点击"下一步"
6. 配置选项
7. 点击"创建任务"
8. 观察任务进度实时更新
9. 等待任务完成
10. 测试下载功能

**预期结果**:
- ✅ 模板选择正常
- ✅ 数据源选择正常
- ✅ 任务创建成功
- ✅ 进度实时更新
- ✅ 任务控制功能正常（暂停/恢复）
- ✅ 下载功能正常

### 3. 验证WebSocket连接

**在浏览器控制台执行**:
```javascript
// 检查WebSocket连接状态
console.log('WebSocket状态:', window.performance.getEntriesByType('resource')
  .filter(r => r.name.includes('ws')));

// 应该看到WebSocket连接日志
// [DataQualityDashboard] WebSocket已连接
// [BatchTaskCreator] WebSocket已连接
```

### 4. 验证API调用

**在浏览器控制台执行**:
```javascript
// 检查API请求
console.log('API请求:', performance.getEntriesByType('resource')
  .filter(r => r.name.includes('/api/v2')));

// 应该看到API请求记录
```

## 运行自动化测试

**运行所有E2E测试**:
```bash
npm run test:e2e
```

**运行性能测试**:
```bash
npm run test:performance
```

**运行特定测试**:
```bash
# 数据质量分析测试
npx playwright test --grep "数据质量分析"

# 批量生成测试
npx playwright test --grep "批量文档生成"

# 性能测试
npx playwright test tests/e2e/performance-flow.spec.ts
```

**调试模式**:
```bash
npx playwright test --debug
```

## 检查点清单

### WebSocket连接

- [ ] 浏览器控制台显示WebSocket连接成功
- [ ] 没有WebSocket连接错误
- [ ] 实时更新正常工作

### API调用

- [ ] 文件上传成功
- [ ] 数据分析API返回正确结果
- [ ] 批量创建任务API成功
- [ ] 没有API错误（网络错误、超时等）

### UI功能

- [ ] 数据质量分析界面正常显示
- [ ] 批量生成界面正常显示
- [ ] 进度条正确显示进度
- [ ] 按钮点击响应正常

### 测试通过

- [ ] 至少90%的E2E测试通过
- [ ] 核心流程测试全部通过
- [ ] 性能测试达标

## 常见问题速查

### 问题: WebSocket连接失败

**快速解决**:
```bash
# 检查WebSocket服务器是否运行
netstat -an | findstr 3001

# 如果未运行，启动它
npm run server:websocket
```

### 问题: API请求失败

**快速解决**:
```bash
# 检查API服务器
curl http://localhost:3000/health

# 启动API服务器
npm run server:start
```

### 问题: 测试文件不存在

**快速解决**:
```bash
# 生成测试数据
npm run test:data:generate

# 检查文件是否存在
ls test-data/*.xlsx
```

### 问题: 端口被占用

**快速解决**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

## 验证成功的标志

当以下所有项都正常时，说明前端集成成功：

1. ✅ 所有服务正常运行
2. ✅ WebSocket连接稳定
3. ✅ API调用成功
4. ✅ UI界面响应流畅
5. ✅ 实时更新正常
6. ✅ 测试通过率 > 90%
7. ✅ 性能指标达标

## 下一步

如果所有验证都通过，可以：

1. **开始使用系统** - 正常使用数据分析和批量生成功能
2. **查看测试报告** - `npx playwright show-report`
3. **进行性能优化** - 根据性能测试结果优化系统
4. **部署到生产** - 准备生产环境部署

## 需要帮助？

- 查看详细文档: `docs/PHASE2_E2E_TESTING_GUIDE.md`
- 查看API规范: `docs/API_SPECIFICATION_PHASE2.md`
- 查看实施文档: `components/PHASE2_FRONTEND_IMPLEMENTATION.md`

---

**准备就绪？开始验证吧！** 🚀
