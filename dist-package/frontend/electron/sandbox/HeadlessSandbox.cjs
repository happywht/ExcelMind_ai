/**
 * HeadlessSandbox.js - 无头沙箱系统
 *
 * 负责在后台运行 AI CLI（如 Claude Code），不显示任何终端窗口
 * 使用 node-pty 启动进程，确保静默运行
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const pty = require('node-pty');
const { app } = require('electron');
const OutputParser = require('./OutputParser.cjs');

class HeadlessSandbox {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.parser = new OutputParser();
    this.tasks = new Map(); // 存储所有任务
    this.sandboxHome = this._createSandboxHome();
    this.activePtyProcesses = new Map();
  }

  /**
   * 创建沙箱主目录
   * @private
   */
  _createSandboxHome() {
    const { app } = require('electron');
    const userDataPath = app.getPath('userData');

    const sandboxHome = path.join(userDataPath, 'logic_sandbox');

    // 创建沙箱目录结构
    const dirs = [
      sandboxHome,
      path.join(sandboxHome, 'AppData', 'Roaming'),
      path.join(sandboxHome, 'AppData', 'Local'),
      path.join(sandboxHome, 'Temp'),
      path.join(sandboxHome, 'projects'),
      path.join(sandboxHome, 'logs')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    return sandboxHome;
  }

  /**
   * 获取沙箱环境变量
   * @private
   */
  _getSandboxEnv() {
    const platform = process.platform;

    if (platform === 'win32') {
      // Windows 特定的环境变量重定向
      return {
        ...process.env,
        HOME: this.sandboxHome,
        USERPROFILE: this.sandboxHome,
        HOMEDRIVE: path.dirname(this.sandboxHome),
        HOMEPATH: path.basename(this.sandboxHome),
        APPDATA: path.join(this.sandboxHome, 'AppData', 'Roaming'),
        LOCALAPPDATA: path.join(this.sandboxHome, 'AppData', 'Local'),
        TEMP: path.join(this.sandboxHome, 'Temp'),
        TMP: path.join(this.sandboxHome, 'Temp'),
        // 确保 PATH 仍然可用
        PATH: process.env.PATH,
        // 禁用 telemetry
        DO_NOT_TRACK: '1',
        ANTHROPIC_LOG: 'error'
      };
    } else {
      // macOS/Linux
      return {
        ...process.env,
        HOME: this.sandboxHome,
        TMPDIR: path.join(this.sandboxHome, 'Temp'),
        PATH: process.env.PATH,
        DO_NOT_TRACK: '1',
        ANTHROPIC_LOG: 'error'
      };
    }
  }

  /**
   * 获取可执行文件路径
   * @private
   */
  _getExecutablePaths() {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    let nodeBin, cliMain;

    if (isDev) {
      // 开发环境：使用系统的 Node.js
      nodeBin = process.execPath;
      // 假设 CLI 在项目的 bin 目录下
      cliMain = path.join(process.cwd(), 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
    } else {
      // 生产环境：使用打包的资源
      const resourcePath = process.resourcesPath;
      nodeBin = path.join(resourcePath, 'bin', process.platform === 'win32' ? 'node.exe' : 'node');
      cliMain = path.join(resourcePath, 'bin', 'claude-code', 'index.js');
    }

    return { nodeBin, cliMain };
  }

  /**
   * 验证环境完整性
   * @returns {Object} 验证结果
   */
  validateEnvironment() {
    try {
      const { nodeBin, cliMain } = this._getExecutablePaths();

      const errors = [];

      if (!fs.existsSync(nodeBin)) {
        errors.push(`Node.js 可执行文件不存在: ${nodeBin}`);
      }

      if (!fs.existsSync(cliMain)) {
        errors.push(`CLI 主文件不存在: ${cliMain}`);
      }

      // 检查 node-pty 是否可用
      try {
        require('node-pty');
      } catch (error) {
        errors.push(`node-pty 模块不可用: ${error.message}`);
      }

      return {
        valid: errors.length === 0,
        errors,
        paths: { nodeBin, cliMain, sandboxHome: this.sandboxHome }
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`环境验证失败: ${error.message}`]
      };
    }
  }

  /**
   * 创建日志文件路径
   * @private
   */
  _getLogFilePath(taskId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.sandboxHome, 'logs', `task-${taskId}-${timestamp}.log`);
  }

  /**
   * 发送消息到渲染进程
   * @private
   */
  _sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * 执行命令
   * @param {string} taskId - 任务 ID
   * @param {string} command - 要执行的命令
   * @param {Array} contextFiles - 上下文文件列表
   * @returns {Promise<Object>} 执行结果
   */
  async execute(taskId, command, contextFiles = []) {
    return new Promise((resolve, reject) => {
      try {
        const { nodeBin, cliMain } = this._getExecutablePaths();
        const logFile = this._getLogFilePath(taskId);
        const logStream = fs.createWriteStream(logFile);

        // 构建命令参数
        const args = [cliMain];

        // 如果有上下文文件，添加为参数
        if (contextFiles.length > 0) {
          args.push(...contextFiles);
        }

        // 添加主命令
        args.push(command);

        // 创建 PTY 进程
        const ptyProcess = pty.spawn(nodeBin, args, {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          cwd: path.join(this.sandboxHome, 'projects'),
          env: this._getSandboxEnv(),
          useConpty: process.platform === 'win32', // Windows ConPTY 支持
          hidden: true // 关键：不显示窗口
        });

        // 存储 PTY 进程和任务信息
        this.activePtyProcesses.set(taskId, ptyProcess);

        const task = {
          id: taskId,
          command,
          startTime: Date.now(),
          status: 'running',
          logFile,
          ptyProcess,
          contextFiles,
          parsedResults: [],
          resolve,
          reject
        };

        this.tasks.set(taskId, task);

        // 通知渲染进程任务开始
        this._sendToRenderer('sandbox:status', {
          taskId,
          status: 'started',
          message: '任务已启动',
          command,
          timestamp: Date.now()
        });

        // 处理输出
        let outputBuffer = '';

        ptyProcess.onData((data) => {
          outputBuffer += data;

          // 记录到日志文件
          logStream.write(data);

          // 按行解析
          const lines = outputBuffer.split('\n');
          outputBuffer = lines.pop() || ''; // 保留未完成的行

          lines.forEach(line => {
            if (line.trim()) {
              const parsed = this.parser.parseLine(line);
              task.parsedResults.push(parsed);

              // 根据解析结果发送相应的消息
              switch (parsed.type) {
                case 'progress':
                  this._sendToRenderer('sandbox:progress', {
                    taskId,
                    ...parsed.data,
                    timestamp: Date.now()
                  });
                  break;

                case 'interaction':
                  task.status = 'awaiting_input';
                  this._sendToRenderer('sandbox:require-interaction', {
                    taskId,
                    prompt: parsed.data.prompt,
                    requiresInput: parsed.data.requiresInput,
                    timestamp: Date.now()
                  });
                  break;

                case 'completion':
                  task.status = parsed.data.status === 'success' ? 'completed' : 'failed';
                  this._sendToRenderer('sandbox:complete', {
                    taskId,
                    status: task.status,
                    message: parsed.data.message,
                    timestamp: Date.now()
                  });
                  break;

                case 'error':
                  this._sendToRenderer('sandbox:error', {
                    taskId,
                    message: parsed.data.message,
                    isFatal: parsed.data.isFatal,
                    timestamp: Date.now()
                  });
                  break;

                case 'warning':
                  this._sendToRenderer('sandbox:warning', {
                    taskId,
                    message: parsed.data.message,
                    timestamp: Date.now()
                  });
                  break;

                default:
                  // 普通输出
                  this._sendToRenderer('sandbox:output', {
                    taskId,
                    content: line,
                    timestamp: Date.now()
                  });
              }
            }
          });
        });

        // 处理进程退出
        ptyProcess.onExit(({ exitCode, signal }) => {
          logStream.end();

          // 确定最终状态
          const finalStatus = this.parser.extractFinalStatus(task.parsedResults) || {
            status: exitCode === 0 ? 'success' : 'failed',
            message: signal || `进程退出，代码: ${exitCode}`
          };

          task.status = finalStatus.status === 'success' ? 'completed' : 'failed';
          task.endTime = Date.now();
          task.exitCode = exitCode;
          task.signal = signal;

          // 从活跃进程映射中移除
          this.activePtyProcesses.delete(taskId);

          // 发送完成通知
          this._sendToRenderer('sandbox:complete', {
            taskId,
            status: task.status,
            message: finalStatus.message,
            exitCode,
            signal,
            duration: task.endTime - task.startTime,
            logFile,
            timestamp: Date.now()
          });

          // 解析 Promise
          if (task.status === 'completed') {
            resolve({
              taskId,
              status: 'success',
              message: finalStatus.message,
              logFile,
              duration: task.endTime - task.startTime
            });
          } else {
            reject(new Error(finalStatus.message));
          }
        });

        // 处理错误
        ptyProcess.on('error', (error) => {
          logStream.end();
          task.status = 'error';
          task.endTime = Date.now();

          this.activePtyProcesses.delete(taskId);

          this._sendToRenderer('sandbox:error', {
            taskId,
            message: `PTY 进程错误: ${error.message}`,
            isFatal: true,
            timestamp: Date.now()
          });

          reject(error);
        });

      } catch (error) {
        reject(new Error(`启动任务失败: ${error.message}`));
      }
    });
  }

  /**
   * 中断任务
   * @param {string} taskId - 任务 ID
   * @returns {boolean} 是否成功中断
   */
  interrupt(taskId) {
    const task = this.tasks.get(taskId);
    const ptyProcess = this.activePtyProcesses.get(taskId);

    if (ptyProcess) {
      try {
        // 发送 Ctrl+C 信号
        ptyProcess.write('\x03');

        // 如果进程没有在 2 秒内退出，强制杀死
        setTimeout(() => {
          if (this.activePtyProcesses.has(taskId)) {
            ptyProcess.kill();
          }
        }, 2000);

        task.status = 'interrupted';
        task.endTime = Date.now();

        this._sendToRenderer('sandbox:status', {
          taskId,
          status: 'interrupted',
          message: '任务已中断',
          timestamp: Date.now()
        });

        return true;
      } catch (error) {
        console.error(`中断任务失败: ${error.message}`);
        return false;
      }
    }

    return false;
  }

  /**
   * 向任务发送输入（响应用户交互）
   * @param {string} taskId - 任务 ID
   * @param {string} input - 用户输入
   * @returns {boolean} 是否成功发送
   */
  sendInput(taskId, input) {
    const ptyProcess = this.activePtyProcesses.get(taskId);
    const task = this.tasks.get(taskId);

    if (ptyProcess && task && task.status === 'awaiting_input') {
      try {
        ptyProcess.write(input + '\n');
        task.status = 'running';

        this._sendToRenderer('sandbox:status', {
          taskId,
          status: 'resumed',
          message: '已继续执行',
          timestamp: Date.now()
        });

        return true;
      } catch (error) {
        console.error(`发送输入失败: ${error.message}`);
        return false;
      }
    }

    return false;
  }

  /**
   * 获取任务状态
   * @param {string} taskId - 任务 ID
   * @returns {Object|null} 任务状态
   */
  getTaskStatus(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    return {
      id: task.id,
      command: task.command,
      status: task.status,
      startTime: task.startTime,
      endTime: task.endTime,
      duration: task.endTime ? task.endTime - task.startTime : Date.now() - task.startTime,
      logFile: task.logFile,
      exitCode: task.exitCode,
      signal: task.signal
    };
  }

  /**
   * 清理任务资源
   * @param {string} taskId - 任务 ID
   */
  cleanup(taskId) {
    const ptyProcess = this.activePtyProcesses.get(taskId);

    if (ptyProcess) {
      try {
        ptyProcess.kill();
      } catch (error) {
        console.error(`清理 PTY 进程失败: ${error.message}`);
      }
    }

    this.activePtyProcesses.delete(taskId);
    // 保留任务记录，不删除
  }

  /**
   * 清理所有任务
   */
  cleanupAll() {
    this.activePtyProcesses.forEach((ptyProcess, taskId) => {
      try {
        ptyProcess.kill();
      } catch (error) {
        console.error(`清理任务 ${taskId} 失败: ${error.message}`);
      }
    });

    this.activePtyProcesses.clear();
  }

  /**
   * 获取沙箱统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const tasksArray = Array.from(this.tasks.values());
    const activeTasks = tasksArray.filter(t => t.status === 'running' || t.status === 'awaiting_input');
    const completedTasks = tasksArray.filter(t => t.status === 'completed');
    const failedTasks = tasksArray.filter(t => t.status === 'failed' || t.status === 'error');

    return {
      total: tasksArray.length,
      active: activeTasks.length,
      completed: completedTasks.length,
      failed: failedTasks.length,
      sandboxHome: this.sandboxHome,
      diskUsage: this._getDiskUsage()
    };
  }

  /**
   * 获取磁盘使用情况
   * @private
   */
  _getDiskUsage() {
    try {
      const getDirSize = (dir) => {
        let size = 0;
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            size += getDirSize(filePath);
          } else {
            size += stats.size;
          }
        });
        return size;
      };

      const sizeInBytes = getDirSize(this.sandboxHome);
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

      return {
        bytes: sizeInBytes,
        mb: parseFloat(sizeInMB),
        formatted: `${sizeInMB} MB`
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}

module.exports = HeadlessSandbox;
