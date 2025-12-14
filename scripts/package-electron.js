const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 开始自定义打包...');

// 创建临时目录
const buildDir = path.join(__dirname, '../temp-electron');
const distDir = path.join(__dirname, '../custom-dist');

if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(distDir, { recursive: true });

// 复制必要文件
console.log('📁 复制应用文件...');
const filesToCopy = [
  'dist',
  'public/electron.cjs',
  'public/preload.js',
  'node_modules',
  'package.json'
];

for (const file of filesToCopy) {
  const src = path.join(__dirname, '..', file);
  const dest = path.join(buildDir, file);

  console.log(`复制: ${file}`);
  execSync(`xcopy "${src}" "${dest}" /E /I /H /Y`, { stdio: 'inherit' });
}

// 创建简化的package.json用于打包
const packageJson = {
  name: 'excelmind-ai',
  version: '1.0.0',
  description: '基于智谱AI的智能Excel处理工具',
  main: 'electron.cjs',
  scripts: {
    start: 'node electron.cjs'
  },
  dependencies: {
    "@anthropic-ai/sdk": "^0.27.0",
    "jszip": "^3.10.1",
    "lucide-react": "^0.561.0",
    "mammoth": "^1.6.0",
    "pdfjs-dist": "^3.11.174",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "react-markdown": "^10.1.0",
    "xlsx": "^0.18.5"
  }
};

fs.writeFileSync(
  path.join(buildDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

// 移动electron文件到根目录
fs.copyFileSync(
  path.join(buildDir, 'public/electron.cjs'),
  path.join(buildDir, 'electron.cjs')
);

// 创建启动脚本
const startScript = `
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html');
  console.log('Loading:', indexPath);
  mainWindow.loadFile(indexPath);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);
`;

fs.writeFileSync(path.join(buildDir, 'electron.cjs'), startScript);

console.log('📦 创建可执行文件...');
try {
  // 使用pkg创建可执行文件
  execSync('npx pkg . --out-path ../custom-dist --target node18-win-x64', {
    cwd: buildDir,
    stdio: 'inherit'
  });

  console.log('✅ 自定义打包完成！');
  console.log(`📂 输出目录: ${distDir}`);

} catch (error) {
  console.log('❌ pkg打包失败，尝试其他方法...');

  // 创建便携版目录结构
  const portableDir = path.join(distDir, 'ExcelMind-AI-Portable');
  fs.mkdirSync(portableDir, { recursive: true });

  // 复制所有文件到便携版目录
  execSync(`xcopy "${buildDir}/*" "${portableDir}" /E /I /H /Y`, { stdio: 'inherit' });

  // 创建启动批处理文件
  const batchScript = `@echo off
cd /d "%~dp0"
node electron.cjs
pause`;

  fs.writeFileSync(path.join(portableDir, 'start.bat'), batchScript);

  console.log('✅ 便携版创建完成！');
  console.log(`📂 便携版目录: ${portableDir}`);
  console.log('💡 双击 start.bat 运行应用');
}

console.log('🎉 打包完成！');