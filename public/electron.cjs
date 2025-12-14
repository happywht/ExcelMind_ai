const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

// 更智能的开发环境检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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

// Electron应用准备就绪时创建窗口
app.whenReady().then(createWindow);

// 当所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS上点击dock图标重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
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