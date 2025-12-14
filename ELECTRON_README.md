# ExcelMind AI - Electron 桌面应用

基于智谱AI的智能Excel处理工具的桌面版本，不再依赖浏览器，提供原生桌面应用体验。

## 🚀 快速开始

### 开发环境运行

1. **启动开发服务器 + Electron应用**
   ```bash
   npm run electron-dev
   ```

2. **单独启动 Electron 应用**
   ```bash
   npm run electron
   ```

3. **仅启动 Web 开发服务器**
   ```bash
   npm run dev
   ```

### 生产环境打包

1. **构建应用**
   ```bash
   npm run build
   ```

2. **打包为可执行文件**
   ```bash
   npm run electron-pack
   ```

3. **或使用打包命令**
   ```bash
   npm run dist
   ```

## 📦 生成的可执行文件

打包完成后，可执行文件将位于 `dist-electron` 目录：

- **Windows**: `.exe` 安装包
- **macOS**: `.dmg` 镜像文件
- **Linux**: `.AppImage` 可执行文件

## ⚙️ Electron 配置

### 主进程文件
- `public/electron.cjs` - Electron主进程
- `public/preload.js` - 预加载脚本，提供安全的API接口

### 配置文件
- `package.json` - 包含Electron Builder配置
- 支持多平台打包（Windows、macOS、Linux）

## 🎯 主要特性

### 桌面应用功能
- ✅ 原生桌面窗口
- ✅ 自定义菜单栏
- ✅ 窗口图标
- ✅ 系统托盘集成
- ✅ 文件对话框支持
- ✅ 开发者工具集成

### 安全特性
- ✅ 上下文隔离（Context Isolation）
- ✅ 节点集成限制
- ✅ 安全的进程间通信
- ✅ 预加载脚本保护

## 🛠️ 开发说明

### 环境变量
- `NODE_ENV=development` - 开发环境标识
- 自动检测开发/生产环境

### 调试
- 开发环境自动打开开发者工具
- 生产环境可手动启用调试模式

## 📁 项目结构

```
excelmind-ai/
├── public/
│   ├── electron.cjs     # Electron主进程
│   ├── preload.js       # 预加载脚本
│   └── icon.png          # 应用图标
├── build/               # 构建输出（生产）
├── dist-electron/        # 打包输出
└── src/                 # 源代码
```

## 🔧 故障排除

### 常见问题

1. **端口冲突**
   - Electron会自动检测可用的端口
   - 如果端口3000被占用，会尝试3001、3002等

2. **缓存错误**
   - Windows系统中可能出现缓存权限错误
   - 这是正常现象，不影响应用功能

3. **模块加载错误**
   - 确保 `electron.cjs` 和 `preload.js` 文件存在
   - 检查 `package.json` 中的 `main` 字段

## 📋 脚本命令

- `npm run dev` - 启动Web开发服务器
- `npm run build` - 构建生产版本
- `npm run electron` - 仅启动Electron
- `npm run electron-dev` - 启动完整开发环境
- `npm run electron-pack` - 构建并打包应用
- `npm run dist` - 构建并打包（不发布）

## 🎉 智谱AI集成

Electron版本完整保留了所有智谱AI功能：
- ✅ Excel公式生成器
- ✅ 智能多文件处理
- ✅ 审计助手知识库问答
- ✅ 所有原有Web功能

## 📞 技术支持

如遇到问题，请检查：
1. Node.js 版本兼容性
2. 网络连接状态
3. 防火墙设置
4. 智谱AI API密钥配置