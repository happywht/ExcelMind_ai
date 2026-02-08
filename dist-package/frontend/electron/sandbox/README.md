# 无头沙箱系统 (Headless Sandbox System)

## 概述

无头沙箱系统为 ExcelMind AI 提供在后台静默运行 AI CLI（如 Claude Code）的能力。系统使用 node-pty 创建完全隐藏的终端进程，并通过 IPC 与渲染进程通信，实现了以下核心特性：

- **静默运行**：不显示任何终端窗口
- **输出解析**：智能解析 CLI 输出，提取进度、交互请求和完成状态
- **事件驱动**：实时推送任务状态和进度更新
- **资源隔离**：所有文件存储在独立的沙箱目录中
- **跨平台支持**：支持 Windows、macOS 和 Linux

## 核心组件

### 1. HeadlessSandbox.js

核心沙箱类，负责：

- 创建和管理 PTY（伪终端）进程
- 处理环境变量重定向（特别是 Windows）
- 管理任务生命周期
- 实现 IPC 消息处理
- 提供日志记录和统计信息

**关键方法**：
- `execute(taskId, command, contextFiles)` - 执行命令
- `interrupt(taskId)` - 中断任务
- `sendInput(taskId, input)` - 发送用户输入
- `getTaskStatus(taskId)` - 获取任务状态
- `validateEnvironment()` - 验证环境完整性

### 2. OutputParser.js

输出解析器，负责：

- 解析任务进度（`[2/5]`、`50%` 等格式）
- 识别交互请求（确认提示、输入请求）
- 检测完成状态（成功/失败）
- 提取错误和警告信息

**解析模式**：

```javascript
// 进度模式
/\[(\d+)\/(\d+)\]\s*(.+)/      // [2/5] 分析文件中...
/(\d+)%/i                       // 50% complete

// 交互模式
/(是否|确认|继续)/i              // 中文确认提示
/(continue\?|yes\/no)/i         // 英文确认提示

// 完成模式
/(done|completed|success)/i     // 成功
/(error|failed|failure)/i       // 失败
```

### 3. electron.cjs 集成

主进程集成，负责：

- 应用启动时初始化沙箱
- 验证环境完整性
- 注册 IPC 处理器
- 处理应用退出时的清理

**IPC 通道**：

渲染进程 → 主进程：
- `sandbox:execute` - 执行命令
- `sandbox:interrupt` - 中断任务
- `sandbox:send-input` - 发送输入
- `sandbox:get-task-status` - 获取状态
- `sandbox:cleanup-task` - 清理任务
- `sandbox:get-stats` - 获取统计
- `sandbox:validate-env` - 验证环境
- `sandbox:read-log` - 读取日志
- `sandbox:cleanup-cache` - 清理缓存

主进程 → 渲染进程（事件）：
- `sandbox:status` - 状态更新
- `sandbox:progress` - 进度更新
- `sandbox:complete` - 完成通知
- `sandbox:require-interaction` - 需要交互
- `sandbox:error` - 错误通知
- `sandbox:warning` - 警告通知
- `sandbox:output` - 输出数据

### 4. preload.js API 暴露

通过 contextBridge 向渲染进程暴露安全的沙箱 API：

```javascript
window.electronAPI.sandbox = {
  // 方法
  execute,
  interrupt,
  sendInput,
  getTaskStatus,
  cleanupTask,
  getStats,
  validateEnv,
  readLog,
  cleanupCache,

  // 事件监听
  onStatus,
  onProgress,
  onComplete,
  onRequireInteraction,
  onError,
  onWarning,
  onOutput,

  // 监听器管理
  removeListener,
  removeAllListeners
};
```

## 环境变量重定向

### Windows

```javascript
{
  HOME: sandboxHome,
  USERPROFILE: sandboxHome,
  HOMEDRIVE: path.dirname(sandboxHome),
  HOMEPATH: path.basename(sandboxHome),
  APPDATA: path.join(sandboxHome, 'AppData', 'Roaming'),
  LOCALAPPDATA: path.join(sandboxHome, 'AppData', 'Local'),
  TEMP: path.join(sandboxHome, 'Temp'),
  TMP: path.join(sandboxHome, 'Temp'),
  PATH: process.env.PATH,  // 保持可用
  DO_NOT_TRACK: '1',
  ANTHROPIC_LOG: 'error'
}
```

### macOS/Linux

```javascript
{
  HOME: sandboxHome,
  TMPDIR: path.join(sandboxHome, 'Temp'),
  PATH: process.env.PATH,
  DO_NOT_TRACK: '1',
  ANTHROPIC_LOG: 'error'
}
```

## 目录结构

```
用户数据目录/logic_sandbox/
├── AppData/
│   ├── Roaming/        # Windows 漫游数据
│   └── Local/          # Windows 本地数据
├── Temp/               # 临时文件
├── projects/           # 项目工作目录
└── logs/               # 任务日志
    └── task-{taskId}-{timestamp}.log
```

## 安装和设置

### 1. 确保依赖已安装

```bash
npm install node-pty
```

### 2. 配置打包设置

在 `package.json` 的 `build.files` 中包含沙箱文件：

```json
{
  "build": {
    "files": [
      "dist/**/*",
      "public/electron.cjs",
      "public/preload.js",
      "public/electron/sandbox/**/*.js",
      "node_modules/**/*"
    ]
  }
}
```

### 3. 准备 CLI 资源

在生产环境中，需要将以下文件放到 `resources/bin/` 目录：

- Windows: `node.exe` 和 `claude-code/index.js`
- macOS/Linux: `node` 和 `claude-code/index.js`

开发环境会自动使用系统的 Node.js 和项目中的 CLI。

## 安全性考虑

1. **环境隔离**：所有文件限制在沙箱目录内
2. **进程隐藏**：使用 `hidden: true` 确保不显示窗口
3. **输入验证**：验证所有用户输入的命令
4. **资源限制**：监控磁盘使用和进程数量
5. **错误处理**：捕获并报告所有错误

## 性能优化

1. **懒加载**：仅在需要时创建 PTY 进程
2. **资源清理**：及时清理已完成任务的资源
3. **日志轮转**：限制日志文件大小
4. **批量处理**：合并多个小的输出事件

## 调试

### 启用调试日志

```javascript
// 在 HeadlessSandbox.js 中
console.log('[Sandbox]', message);
```

### 查看任务日志

```javascript
const status = await sandbox.getTaskStatus(taskId);
const log = await fs.readFile(status.logFile, 'utf-8');
console.log(log);
```

### 验证环境

```javascript
const validation = await sandbox.validateEnvironment();
console.log('验证结果:', validation);
```

## 故障排除

### 问题：PTY 进程创建失败

**可能原因**：
- node-pty 模块未正确编译
- 缺少必要的系统依赖

**解决方案**：
```bash
# 重新编译 node-pty
npm rebuild node-pty

# Windows 可能需要安装 Windows Build Tools
npm install --global windows-build-tools
```

### 问题：环境验证失败

**可能原因**：
- CLI 可执行文件不存在
- 资源路径配置错误

**解决方案**：
- 检查 `process.resourcesPath` 是否正确
- 确保 CLI 文件已正确打包

### 问题：任务无响应

**可能原因**：
- 命令执行时间过长
- 进程死锁

**解决方案**：
- 使用 `interrupt()` 中断任务
- 添加超时控制
- 检查 CLI 日志

## 测试

### 单元测试

```bash
npm test -- sandbox.test.js
```

### 集成测试

```bash
npm run test:integration
```

### E2E 测试

```bash
npm run test:e2e
```

## 文档

- [使用指南](./SANDBOX_USAGE.md) - 渲染进程使用示例
- [类型定义](../../../types/sandbox.d.ts) - TypeScript 类型
- [API 文档](./API.md) - 完整 API 参考

## 许可证

MIT License - 详见项目根目录的 LICENSE 文件

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0 (2024-01-20)

- 初始版本发布
- 实现核心沙箱功能
- 支持进度解析和事件通知
- 跨平台支持（Windows/macOS/Linux）
- 完整的 TypeScript 类型定义
