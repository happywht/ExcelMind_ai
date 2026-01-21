const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 导入沙箱系统
const HeadlessSandbox = require('./electron/sandbox/HeadlessSandbox.cjs');

// 更智能的开发环境检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 全局沙箱实例
let sandbox = null;

// 检测Vite服务器端口
const findVitePort = async () => {
  const http = require('http');

  // 常见的开发端口列表
  const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3010];

  for (const port of ports) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
          if (res.statusCode === 200) {
            console.log(`找到Vite服务器在端口: ${port}`);
            resolve(port);
          } else {
            reject();
          }
        });

        req.on('error', () => reject());
        req.setTimeout(2000, () => {
          req.destroy();
          reject();
        });
      });
      // 如果上面的Promise resolve了，说明找到了端口
      return port;
    } catch (error) {
      // 继续尝试下一个端口
    }
  }

  console.log('未找到Vite服务器，使用默认端口3000');
  return 3000;
};

// 保持对窗口对象的全局引用，如果不这样做，当JavaScript对象被垃圾回收时，窗口将自动关闭
let mainWindow;

async function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      // 安全设置 - 优化以确保应用正常运行
      webSecurity: false, // 临时禁用以允许本地资源加载
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      plugins: true,
      javascript: true,
      // 确保ES模块正常工作
      additionalArguments: '--no-sandbox'
    },
    icon: path.join(__dirname, 'icon.png'), // 应用图标
    show: false, // 先不显示，等待ready-to-show事件
    titleBarStyle: 'default', // 默认标题栏样式
    webSecurity: true, // 启用web安全
    backgroundColor: '#f8fafc', // 背景色，与应用主题匹配
    // 生产环境设置
    ...(isDev ? {} : {
      skipTaskbar: false, // 在任务栏显示
      autoHideMenuBar: false, // 生产环境也隐藏菜单栏
      frame: true, // 保持窗口边框
    })
  });

  // 加载应用
  let startUrl;
  if (isDev) {
    // 在开发模式下动态检测Vite服务器端口
    const port = await findVitePort();
    console.log(`检测到Vite服务器运行在端口: ${port}`);
    startUrl = `http://localhost:${port}`;
  } else {
    startUrl = `file://${path.join(__dirname, '../dist/index.html')}`;
  }

  console.log(`加载URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  // 当窗口准备好显示时显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // 开发环境下打开开发者工具
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 只在开发环境设置菜单，生产环境隐藏默认菜单
  if (isDev) {
    createMenu();
  } else {
    // 生产环境隐藏默认菜单
    Menu.setApplicationMenu(null);
  }
}

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建项目',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-project');
          }
        },
        {
          label: '打开文件',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open-file');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于ExcelMind AI',
          click: () => {
            shell.openExternal('https://github.com/your-repo/excelmind-ai');
          }
        },
        {
          label: '用户手册',
          click: () => {
            shell.openExternal('https://docs.your-site.com');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * 初始化和验证沙箱环境
 */
function initializeSandbox(mainWindow) {
  try {
    // 创建沙箱实例
    sandbox = new HeadlessSandbox(mainWindow);

    // 验证环境完整性
    const validation = sandbox.validateEnvironment();

    if (!validation.valid) {
      const errorMessage = `沙箱环境验证失败:\n${validation.errors.join('\n')}`;

      console.error(errorMessage);

      // 显示错误对话框
      dialog.showErrorBox(
        '沙箱环境错误',
        errorMessage + '\n\n请重新安装应用或联系技术支持。'
      );

      // 在开发环境中不退出，在生产环境中退出
      if (!isDev) {
        app.quit();
        return false;
      }
    }

    console.log('沙箱系统初始化成功');
    console.log('沙箱主目录:', validation.paths?.sandboxHome);

    return true;
  } catch (error) {
    console.error('初始化沙箱失败:', error);

    if (!isDev) {
      dialog.showErrorBox(
        '初始化失败',
        `无法初始化沙箱系统: ${error.message}`
      );
      app.quit();
      return false;
    }

    return true;
  }
}

/**
 * 清理沙箱资源
 */
function cleanupSandbox() {
  if (sandbox) {
    try {
      sandbox.cleanupAll();
      console.log('沙箱资源已清理');
    } catch (error) {
      console.error('清理沙箱资源失败:', error);
    }
  }
}

// Electron应用准备就绪时创建窗口
app.whenReady().then(async () => {
  await createWindow();

  // 初始化沙箱系统
  if (mainWindow) {
    initializeSandbox(mainWindow);
  }
});

// 当所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', () => {
  // 清理沙箱资源
  cleanupSandbox();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS上点击dock图标重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().then(window => {
      if (window) {
        initializeSandbox(window);
      }
    });
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  cleanupSandbox();
});

// 防止多个实例
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 当运行第二个实例时，将会聚焦到 mainWindow 这个窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// 安全设置
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// IPC 处理器
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-save-dialog', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'excelmind-data.xlsx',
    filters: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

ipcMain.handle('show-open-dialog', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] },
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'Word Files', extensions: ['docx', 'doc'] },
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

// ============================================================================
// 沙箱 IPC 处理器
// ============================================================================

/**
 * 执行沙箱命令
 * 请求格式: { taskId: string, command: string, contextFiles?: string[] }
 * 响应格式: { taskId: string, status: string, message: string, logFile: string, duration: number }
 */
ipcMain.handle('sandbox:execute', async (event, { taskId, command, contextFiles = [] }) => {
  if (!sandbox) {
    throw new Error('沙箱系统未初始化');
  }

  try {
    const result = await sandbox.execute(taskId, command, contextFiles);
    return result;
  } catch (error) {
    console.error('执行沙箱命令失败:', error);
    throw error;
  }
});

/**
 * 中断沙箱任务
 * 请求格式: { taskId: string }
 * 响应格式: { success: boolean, message: string }
 */
ipcMain.handle('sandbox:interrupt', async (event, { taskId }) => {
  if (!sandbox) {
    return { success: false, message: '沙箱系统未初始化' };
  }

  try {
    const success = sandbox.interrupt(taskId);
    return {
      success,
      message: success ? '任务已中断' : '中断任务失败'
    };
  } catch (error) {
    console.error('中断沙箱任务失败:', error);
    return { success: false, message: error.message };
  }
});

/**
 * 向沙箱任务发送输入
 * 请求格式: { taskId: string, input: string }
 * 响应格式: { success: boolean, message: string }
 */
ipcMain.handle('sandbox:send-input', async (event, { taskId, input }) => {
  if (!sandbox) {
    return { success: false, message: '沙箱系统未初始化' };
  }

  try {
    const success = sandbox.sendInput(taskId, input);
    return {
      success,
      message: success ? '输入已发送' : '发送输入失败'
    };
  } catch (error) {
    console.error('发送输入到沙箱失败:', error);
    return { success: false, message: error.message };
  }
});

/**
 * 获取任务状态
 * 请求格式: { taskId: string }
 * 响应格式: { id: string, status: string, startTime: number, endTime: number, duration: number, ... }
 */
ipcMain.handle('sandbox:get-task-status', async (event, { taskId }) => {
  if (!sandbox) {
    return null;
  }

  try {
    return sandbox.getTaskStatus(taskId);
  } catch (error) {
    console.error('获取任务状态失败:', error);
    return null;
  }
});

/**
 * 清理任务资源
 * 请求格式: { taskId: string }
 * 响应格式: { success: boolean, message: string }
 */
ipcMain.handle('sandbox:cleanup-task', async (event, { taskId }) => {
  if (!sandbox) {
    return { success: false, message: '沙箱系统未初始化' };
  }

  try {
    sandbox.cleanup(taskId);
    return { success: true, message: '任务资源已清理' };
  } catch (error) {
    console.error('清理任务资源失败:', error);
    return { success: false, message: error.message };
  }
});

/**
 * 获取沙箱统计信息
 * 响应格式: { total: number, active: number, completed: number, failed: number, sandboxHome: string, diskUsage: object }
 */
ipcMain.handle('sandbox:get-stats', async () => {
  if (!sandbox) {
    return null;
  }

  try {
    return sandbox.getStats();
  } catch (error) {
    console.error('获取沙箱统计信息失败:', error);
    return null;
  }
});

/**
 * 验证沙箱环境
 * 响应格式: { valid: boolean, errors: string[], paths: object }
 */
ipcMain.handle('sandbox:validate-env', async () => {
  if (!sandbox) {
    return {
      valid: false,
      errors: ['沙箱系统未初始化']
    };
  }

  try {
    return sandbox.validateEnvironment();
  } catch (error) {
    console.error('验证沙箱环境失败:', error);
    return {
      valid: false,
      errors: [error.message]
    };
  }
});

/**
 * 读取日志文件
 * 请求格式: { logFile: string, maxLines?: number }
 * 响应格式: { content: string, lines: number }
 */
ipcMain.handle('sandbox:read-log', async (event, { logFile, maxLines = 1000 }) => {
  try {
    if (!fs.existsSync(logFile)) {
      throw new Error('日志文件不存在');
    }

    // 读取最后 N 行
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.split('\n');
    const lastLines = lines.slice(-maxLines).join('\n');

    return {
      content: lastLines,
      lines: lines.length,
      totalLines: lines.length
    };
  } catch (error) {
    console.error('读取日志文件失败:', error);
    throw error;
  }
});

/**
 * 清理沙箱缓存
 * 响应格式: { success: boolean, message: string, freedSpace: string }
 */
ipcMain.handle('sandbox:cleanup-cache', async () => {
  if (!sandbox) {
    return { success: false, message: '沙箱系统未初始化', freedSpace: '0 MB' };
  }

  try {
    const statsBefore = sandbox.getStats();
    const bytesBefore = statsBefore.diskUsage?.bytes || 0;

    // 清理所有已完成和失败的任务
    const tasks = Array.from(sandbox.tasks.values());
    tasks.forEach(task => {
      if (task.status === 'completed' || task.status === 'failed') {
        sandbox.cleanup(task.id);
      }
    });

    const statsAfter = sandbox.getStats();
    const bytesAfter = statsAfter.diskUsage?.bytes || 0;
    const freedBytes = bytesBefore - bytesAfter;
    const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);

    return {
      success: true,
      message: '缓存已清理',
      freedSpace: `${freedMB} MB`
    };
  } catch (error) {
    console.error('清理沙箱缓存失败:', error);
    return { success: false, message: error.message, freedSpace: '0 MB' };
  }
});

// ============================================================================
// Python 执行 IPC 处理器
// ============================================================================

const { spawn } = require('child_process');
const os = require('os');

/**
 * 执行 Python 代码
 * 请求格式: { code: string, datasets: object, timeout?: number }
 * 响应格式: { success: boolean, data?: object, error?: string }
 */
ipcMain.handle('python:execute', async (event, { code, datasets, timeout = 30000 }) => {
  console.log('[Python Execution] Starting...');

  // 创建临时目录
  const tempDir = path.join(os.tmpdir(), 'excelmind-python-' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // 1. 准备输入数据 JSON 文件
    const inputFile = path.join(tempDir, 'input.json');
    fs.writeFileSync(inputFile, JSON.stringify(datasets), 'utf-8');

    // 2. 准备 Python 脚本
    // 使用文件输出避免 stdout 污染导致 JSON 解析失败
    const outputFile = path.join(tempDir, 'output.json');
    const pythonScript = `import json
import sys

# 读取输入数据
try:
    with open('${inputFile.replace(/\\/g, '\\\\')}', 'r', encoding='utf-8') as f:
        files = json.load(f)
except Exception as e:
    print(json.dumps({"error": f"读取输入文件失败: {str(e)}"}), file=sys.stderr)
    sys.exit(1)

# 执行用户代码
${code}

# 输出结果到文件（避免 stdout 污染）
try:
    with open('${outputFile.replace(/\\/g, '\\\\')}', 'w', encoding='utf-8') as f:
        json.dump(files, f, ensure_ascii=False, default=str)
except Exception as e:
    print(json.dumps({"error": f"写入结果文件失败: {str(e)}"}), file=sys.stderr)
    sys.exit(1)
`;

    const scriptFile = path.join(tempDir, 'script.py');
    fs.writeFileSync(scriptFile, pythonScript, 'utf-8');

    // 3. 执行 Python 脚本
    await new Promise((resolve, reject) => {
      const python = process.platform === 'win32' ? 'python' : 'python3';
      const pythonProcess = spawn(python, [scriptFile], {
        cwd: tempDir,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      let stderr = '';

      // 设置超时
      const timeoutId = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error(`Python 执行超时 (${timeout}ms)`));
      }, timeout);

      // stderr 用于捕获错误信息
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve(null);
        } else {
          reject(new Error(stderr || `Python 进程退出，代码: ${code}`));
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`无法启动 Python: ${error.message}`));
      });
    });

    // 4. 从文件读取结果
    let outputData;
    try {
      const outputContent = fs.readFileSync(outputFile, 'utf-8');
      outputData = JSON.parse(outputContent);
      console.log('[Python Execution] Success, output keys:', Object.keys(outputData));
    } catch (readError) {
      // 如果输出文件不存在或无法解析，可能是用户代码执行失败
      throw new Error(`读取结果文件失败: ${readError.message}`);
    }

    return {
      success: true,
      data: outputData
    };

  } catch (error) {
    console.error('[Python Execution] Error:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // 5. 清理临时目录
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('[Python Execution] Cleanup failed:', cleanupError);
    }
  }
});