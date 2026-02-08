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
  isDev: process.env.NODE_ENV === 'development',

  // ==========================================================================
  // Python 执行 API
  // ==========================================================================

  /**
   * 执行 Python 代码
   * @param {Object} params - { code: string, datasets: object, timeout?: number }
   * @returns {Promise<Object>} { success: boolean, data?: object, error?: string }
   */
  executePython: (params) => ipcRenderer.invoke('python:execute', params),

  // ==========================================================================
  // 沙箱 API (已弃用 - 保留用于向后兼容)
  // ==========================================================================

  sandbox: {
    /**
     * 执行沙箱命令
     * @param {Object} params - { taskId: string, command: string, contextFiles?: string[] }
     * @returns {Promise<Object>} 执行结果
     */
    execute: (params) => ipcRenderer.invoke('sandbox:execute', params),

    /**
     * 中断沙箱任务
     * @param {Object} params - { taskId: string }
     * @returns {Promise<Object>} 中断结果
     */
    interrupt: (params) => ipcRenderer.invoke('sandbox:interrupt', params),

    /**
     * 向沙箱任务发送输入
     * @param {Object} params - { taskId: string, input: string }
     * @returns {Promise<Object>} 发送结果
     */
    sendInput: (params) => ipcRenderer.invoke('sandbox:send-input', params),

    /**
     * 获取任务状态
     * @param {Object} params - { taskId: string }
     * @returns {Promise<Object>} 任务状态
     */
    getTaskStatus: (params) => ipcRenderer.invoke('sandbox:get-task-status', params),

    /**
     * 清理任务资源
     * @param {Object} params - { taskId: string }
     * @returns {Promise<Object>} 清理结果
     */
    cleanupTask: (params) => ipcRenderer.invoke('sandbox:cleanup-task', params),

    /**
     * 获取沙箱统计信息
     * @returns {Promise<Object>} 统计信息
     */
    getStats: () => ipcRenderer.invoke('sandbox:get-stats'),

    /**
     * 验证沙箱环境
     * @returns {Promise<Object>} 验证结果
     */
    validateEnv: () => ipcRenderer.invoke('sandbox:validate-env'),

    /**
     * 读取日志文件
     * @param {Object} params - { logFile: string, maxLines?: number }
     * @returns {Promise<Object>} 日志内容
     */
    readLog: (params) => ipcRenderer.invoke('sandbox:read-log', params),

    /**
     * 清理沙箱缓存
     * @returns {Promise<Object>} 清理结果
     */
    cleanupCache: () => ipcRenderer.invoke('sandbox:cleanup-cache'),

    // ========================================================================
    // 沙箱事件监听器
    // ========================================================================

    /**
     * 监听任务状态更新
     * @param {Function} callback - 回调函数，接收 { taskId, status, message, timestamp }
     */
    onStatus: (callback) => {
      ipcRenderer.on('sandbox:status', (_, data) => callback(data));
    },

    /**
     * 监听任务进度更新
     * @param {Function} callback - 回调函数，接收 { taskId, current, total, percentage, message, timestamp }
     */
    onProgress: (callback) => {
      ipcRenderer.on('sandbox:progress', (_, data) => callback(data));
    },

    /**
     * 监听任务完成
     * @param {Function} callback - 回调函数，接收 { taskId, status, message, exitCode, signal, duration, logFile, timestamp }
     */
    onComplete: (callback) => {
      ipcRenderer.on('sandbox:complete', (_, data) => callback(data));
    },

    /**
     * 监听需要用户交互
     * @param {Function} callback - 回调函数，接收 { taskId, prompt, requiresInput, timestamp }
     */
    onRequireInteraction: (callback) => {
      ipcRenderer.on('sandbox:require-interaction', (_, data) => callback(data));
    },

    /**
     * 监听任务错误
     * @param {Function} callback - 回调函数，接收 { taskId, message, isFatal, timestamp }
     */
    onError: (callback) => {
      ipcRenderer.on('sandbox:error', (_, data) => callback(data));
    },

    /**
     * 监听任务警告
     * @param {Function} callback - 回调函数，接收 { taskId, message, timestamp }
     */
    onWarning: (callback) => {
      ipcRenderer.on('sandbox:warning', (_, data) => callback(data));
    },

    /**
     * 监听任务输出
     * @param {Function} callback - 回调函数，接收 { taskId, content, timestamp }
     */
    onOutput: (callback) => {
      ipcRenderer.on('sandbox:output', (_, data) => callback(data));
    },

    /**
     * 移除沙箱事件监听器
     * @param {string} channel - 事件名称
     */
    removeListener: (channel) => {
      const fullChannel = `sandbox:${channel}`;
      ipcRenderer.removeAllListeners(fullChannel);
    },

    /**
     * 移除所有沙箱事件监听器
     */
    removeAllListeners: () => {
      const channels = [
        'sandbox:status',
        'sandbox:progress',
        'sandbox:complete',
        'sandbox:require-interaction',
        'sandbox:error',
        'sandbox:warning',
        'sandbox:output'
      ];
      channels.forEach(channel => ipcRenderer.removeAllListeners(channel));
    }
  }
});

// 暴露 Electron 环境配置到渲染进程
contextBridge.exposeInMainWorld('__ELECTRON_ENV__', {
  IS_ELECTRON: true,
  API_BASE_URL: 'http://localhost:3001/api',
  PLATFORM: process.platform
});

console.log('[Preload] Electron 环境配置已注入');
console.log('[Preload] API_BASE_URL: http://localhost:3001/api');
