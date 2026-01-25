ExcelMind AI 升级需求文档：无头沙箱与 AI CLI 预置集成
1. 项目愿景与目标
将 ExcelMind AI 升级为具备 Agent 执行能力 的智能工具。通过在后台运行一个隐藏的、预置好的 AI CLI（如 Claude Code），实现复杂的本地文件处理和分析，同时保持前端 UI 的简洁与原生感。

2. 核心技术架构：无头沙箱 (Headless Sandbox)
隔离机制：逻辑级沙箱。通过在主进程中重定向 HOME、APPDATA 和 TEMP 等环境变量，确保 AI CLI 的所有操作（配置文件、缓存、临时文件）都局限在应用目录内。

无头运行：使用 node-pty 在后台启动进程，不向用户展示任何终端窗口，所有交互通过解析 stdout 流完成。

环境预置：在安装包中内置独立的 Node.js 运行时和 CLI 脚本，确保用户“开箱即用”。

3. 关键工程实现：如何预置 AI CLI
为了确保沙箱内的指令能被立即识别且无需用户安装，请遵循以下配置：

3.1 资源打包配置 (package.json)
在 build 配置中，将 CLI 及其依赖列为外部资源：

JSON
"build": {
  "extraResources": [
    {
      "from": "node_modules/@anthropic-ai/claude-code",
      "to": "bin/claude-code",
      "filter": ["**/*"]
    },
    {
      "from": "resources/bin/node.exe", 
      "to": "bin/node.exe"
    }
  ],
  "asarUnpack": [
    "**/node-pty/**"
  ]
}
3.2 沙箱启动逻辑 (public/electron.cjs)
主进程不再调用系统全局命令，而是显式调用内置路径：

JavaScript
const resourcePath = process.resourcesPath;
const nodeBin = path.join(resourcePath, 'bin', 'node.exe');
const cliMain = path.join(resourcePath, 'bin', 'claude-code', 'index.js');

// 启动时显式指定 node 执行 cli 脚本
const ptyProcess = pty.spawn(nodeBin, [cliMain], {
    env: sandboxEnv, // 包含重定向后的 HOME 路径
    cwd: sandboxHome
});
4. IPC 消息定义规范 (无感交互协议)
主进程与渲染进程之间通过以下结构化消息进行通信，以替代原始终端显示。

4.1 指令下发与中断
sandbox:execute: { taskId, command, contextFiles: [] }

sandbox:interrupt: { taskId }

4.2 状态与进度反馈 (Main -> Renderer)
状态流：sandbox:status -> { taskId, status: 'starting' | 'running' | 'waiting_input' }

进度流：sandbox:progress -> { taskId, progress: number, currentStep: string }

注：主进程需解析 CLI 输出（如 [2/5] 分析文件中...）并转化为百分比。

结果流：sandbox:complete -> { taskId, success: boolean, outputPath?: string, data?: any }

4.3 交互代理 (针对 CLI 的提问)
请求干预：sandbox:require-interaction -> { taskId, message: "文件已存在，是否覆盖？", type: 'confirm' }

提交应答：sandbox:confirm -> { taskId, response: 'yes' | 'no' }

5. 详细开发指令 
第一阶段：构建后台沙箱管理器
在 public/electron.cjs 中实现 HeadlessSandbox 类。

该类需具备 Output Parser（输出解析器），利用正则表达式从 CLI 的原始字符串中提取任务进度和交互请求。

确保环境变量重定向逻辑覆盖 Windows 全部的用户路径变量（USERPROFILE, HOMEPATH 等）。

第二阶段：UI 状态映射
修改 src/App.tsx 中的 SmartExcel 模块。

当点击“处理”时，不再直接调用 API，而是发送 sandbox:execute 指令。

使用一个全局的状态条（Progress Bar）订阅 sandbox:progress 消息，将后台的 CLI 活动转化为可视化的进度反馈。

第三阶段：打包与环境校验
更新 package.json 中的构建选项，确保 node-pty 被正确重编译。

实现一个启动检查逻辑：如果检测到内置的 node.exe 或 cli 脚本缺失，则提示用户“核心组件损坏，请重新安装”。

6. 验收与安全标准
静默性：任务运行时，Windows 任务栏不应出现额外的终端图标。

可恢复性：如果沙箱进程异常退出，主进程应能捕获 onExit 事件，并自动向前端发送错误状态。

纯净性：所有 AI 产生的 .cache 或 .claude 文件夹必须且仅能存在于应用的 userData/logic_sandbox 下。