const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用版本信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 文件对话框
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),

  // 菜单事件监听
  onMenuAction: (callback) => {
    const menuActions = {
      'menu-new-project': callback,
      'menu-open-file': callback
    };

    Object.keys(menuActions).forEach(action => {
      ipcRenderer.on(action, (_, ...args) => menuActions[action](...args));
    });
  },

  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // 平台信息
  platform: process.platform,

  // 开发环境检查
  isDev: process.env.NODE_ENV === 'development'
});

// 设置一些全局变量供前端使用
window.isElectron = true;
window.electronPlatform = process.platform;