const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const resourcesDir = path.join(__dirname, '../resources/bin');
const platform = process.platform;
const arch = process.arch;

console.log('🔧 设置 ExcelMind AI 沙箱资源...\n');

// 确保资源目录存在
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

// Node.js 下载配置
const nodeVersion = '20.18.0';
let nodeUrl, nodeFileName, nodeExecPath;

if (platform === 'win32') {
  nodeFileName = 'node.exe';
  nodeExecPath = path.join(resourcesDir, nodeFileName);
  nodeUrl = `https://nodejs.org/dist/v${nodeVersion}/win-${arch}/node.exe`;
} else {
  nodeFileName = 'node';
  nodeExecPath = path.join(resourcesDir, nodeFileName);
  if (platform === 'darwin') {
    nodeUrl = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-darwin-${arch}/bin/node`;
  } else {
    nodeUrl = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-linux-${arch}/bin/node`;
  }
}

// 下载文件函数
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`📥 下载中: ${url}`);
    console.log(`   目标: ${dest}`);

    const file = fs.createWriteStream(dest);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // 处理重定向
        downloadFile(response.headers.location, dest)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`下载失败: ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize) {
          const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\r   进度: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\n   ✅ 下载完成!');
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// 设置可执行权限（Unix）
function setExecutable(filePath) {
  if (platform !== 'win32') {
    try {
      fs.chmodSync(filePath, '755');
      console.log(`   ✅ 已设置可执行权限: ${filePath}`);
    } catch (err) {
      console.warn(`   ⚠️  无法设置可执行权限: ${err.message}`);
    }
  }
}

// 安装 Claude Code CLI
async function installClaudeCode() {
  console.log('\n📦 安装 Claude Code CLI...');

  try {
    // 检查是否已安装
    const globalNodeModules = path.join(__dirname, '../node_modules');
    const claudeCodePath = path.join(globalNodeModules, '@anthropic-ai', 'claude-code');

    if (fs.existsSync(claudeCodePath)) {
      console.log('   ✅ Claude Code CLI 已安装');
      return;
    }

    // 使用 pnpm 安装（开发依赖）
    console.log('   安装中...');
    execSync('pnpm add -D @anthropic-ai/claude-code', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('   ✅ Claude Code CLI 安装完成');
  } catch (err) {
    console.warn('   ⚠️  Claude Code CLI 安装失败:', err.message);
    console.log('   💡 提示: 可以稍后手动运行: pnpm add -D @anthropic-ai/claude-code');
  }
}

// 主函数
async function main() {
  try {
    // 1. 下载 Node.js
    console.log(`\n📍 平台: ${platform}-${arch}`);
    console.log(`📍 Node.js 版本: ${nodeVersion}\n`);

    if (fs.existsSync(nodeExecPath)) {
      console.log(`✅ Node.js 已存在: ${nodeExecPath}`);
    } else {
      await downloadFile(nodeUrl, nodeExecPath);
      setExecutable(nodeExecPath);
    }

    // 2. 安装 Claude Code CLI
    await installClaudeCode();

    // 3. 创建验证脚本
    console.log('\n🔍 验证资源...');
    const nodeExists = fs.existsSync(nodeExecPath);
    const claudeCodeExists = fs.existsSync(path.join(__dirname, '../node_modules/@anthropic-ai/claude-code'));

    console.log(`\n✨ 资源设置完成！`);
    console.log(`   - Node.js: ${nodeExists ? '✅' : '❌'}`);
    console.log(`   - Claude Code CLI: ${claudeCodeExists ? '✅' : '❌'}`);

    if (nodeExists && claudeCodeExists) {
      console.log('\n🎉 所有资源已就绪，可以开始打包应用！\n');
    } else {
      console.log('\n⚠️  部分资源缺失，请检查错误信息。\n');
    }

  } catch (err) {
    console.error('\n❌ 错误:', err.message);
    process.exit(1);
  }
}

// 运行
main();
