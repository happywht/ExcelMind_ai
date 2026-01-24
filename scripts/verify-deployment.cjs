#!/usr/bin/env node

/**
 * ExcelMind AI 部署验证脚本
 *
 * 快速验证部署包的完整性和基本功能
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function header(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`  ${message}`, 'blue');
  log(`${'='.repeat(60)}`, 'blue');
}

// 检查文件或目录是否存在
function checkExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    const stats = fs.statSync(filePath);
    const size = stats.isDirectory() ? '' : ` (${(stats.size / 1024 / 1024).toFixed(2)} MB)`;
    success(`${description}: ${filePath}${size}`);
  } else {
    error(`${description} 不存在: ${filePath}`);
  }
  return exists;
}

// 检查文件大小
function checkFileSize(filePath, minSizeMB, description) {
  if (!fs.existsSync(filePath)) {
    error(`${description} 不存在`);
    return false;
  }

  const stats = fs.statSync(filePath);
  const sizeMB = stats.size / 1024 / 1024;

  if (sizeMB >= minSizeMB) {
    success(`${description} 大小正常: ${sizeMB.toFixed(2)} MB`);
    return true;
  } else {
    error(`${description} 大小异常: ${sizeMB.toFixed(2)} MB (预期 >= ${minSizeMB} MB)`);
    return false;
  }
}

// 检查文件内容
function checkFileContent(filePath, requiredStrings, description) {
  if (!fs.existsSync(filePath)) {
    error(`${description} 不存在`);
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const missing = requiredStrings.filter(str => !content.includes(str));

    if (missing.length === 0) {
      success(`${description} 内容验证通过`);
      return true;
    } else {
      warning(`${description} 缺少内容: ${missing.join(', ')}`);
      return false;
    }
  } catch (err) {
    error(`${description} 读取失败: ${err.message}`);
    return false;
  }
}

// 主验证流程
async function main() {
  header('ExcelMind AI 部署验证');

  const projectRoot = path.resolve(__dirname, '..');
  const distDir = path.join(projectRoot, 'dist');
  const electronDistDir = path.join(projectRoot, 'dist-electron');
  const unpackedDir = path.join(electronDistDir, 'win-unpacked');

  let allPassed = true;

  // 1. 检查项目结构
  header('1. 项目结构检查');
  allPassed &= checkExists(projectRoot, '项目根目录');
  allPassed &= checkExists(path.join(projectRoot, 'package.json'), 'package.json');
  allPassed &= checkExists(path.join(projectRoot, 'public', 'electron.cjs'), 'Electron主进程');
  allPassed &= checkExists(path.join(projectRoot, 'public', 'preload.js'), '预加载脚本');

  // 2. 检查Web构建
  header('2. Web构建检查');
  allPassed &= checkExists(distDir, 'dist目录');
  allPassed &= checkExists(path.join(distDir, 'index.html'), 'index.html');
  allPassed &= checkExists(path.join(distDir, 'assets'), 'assets目录');

  const jsFiles = fs.readdirSync(path.join(distDir, 'assets'))
    .filter(f => f.endsWith('.js'));
  const cssFiles = fs.readdirSync(path.join(distDir, 'assets'))
    .filter(f => f.endsWith('.css'));

  info(`生成 ${jsFiles.length} 个JS文件, ${cssFiles.length} 个CSS文件`);

  // 检查主要资源文件
  const mainJs = jsFiles.find(f => f.includes('index-'));
  if (mainJs) {
    allPassed &= checkFileSize(
      path.join(distDir, 'assets', mainJs),
      1, // 至少1MB
      '主JS文件'
    );
  }

  // 3. 检查Electron打包
  header('3. Electron打包检查');
  allPassed &= checkExists(electronDistDir, 'dist-electron目录');

  // 检查安装程序
  const installerPath = path.join(electronDistDir, 'ExcelMind AI Setup 1.0.0.exe');
  allPassed &= checkExists(installerPath, '安装程序');
  allPassed &= checkFileSize(installerPath, 50, '安装程序大小'); // 至少50MB

  // 检查更新配置
  allPassed &= checkExists(
    path.join(electronDistDir, 'latest.yml'),
    '更新配置文件'
  );

  // 4. 检查解包应用
  header('4. 解包应用检查');
  allPassed &= checkExists(unpackedDir, '解包应用目录');

  const exePath = path.join(unpackedDir, 'ExcelMind AI.exe');
  allPassed &= checkExists(exePath, '主可执行文件');
  allPassed &= checkFileSize(exePath, 50, '主可执行文件大小'); // 至少50MB

  // 检查resources目录
  const resourcesDir = path.join(unpackedDir, 'resources');
  allPassed &= checkExists(resourcesDir, 'resources目录');

  const asarPath = path.join(resourcesDir, 'app.asar');
  allPassed &= checkExists(asarPath, 'app.asar');
  allPassed &= checkFileSize(asarPath, 50, 'app.asar大小'); // 至少50MB

  // 检查node-pty解包
  const nodePtyPath = path.join(resourcesDir, 'app.asar.unpacked', 'node_modules', 'node-pty');
  allPassed &= checkExists(nodePtyPath, 'node-pty (未打包)');

  // 5. 检查配置文件
  header('5. 配置文件检查');
  allPassed &= checkFileContent(
    path.join(electronDistDir, 'latest.yml'),
    ['version: 1.0.0', 'files:', 'sha512:'],
    '更新配置'
  );

  allPassed &= checkFileContent(
    path.join(projectRoot, 'package.json'),
    ['excelmind-ai', 'electron', 'electron-builder'],
    'package.json'
  );

  // 6. 检查构建配置
  header('6. 构建配置检查');
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8')
    );

    if (packageJson.build && packageJson.build.npmRebuild === false) {
      success('npmRebuild配置正确 (设置为false)');
    } else {
      warning('npmRebuild未设置或未设置为false');
      allPassed = false;
    }

    if (packageJson.build && packageJson.build.asarUnpack) {
      if (packageJson.build.asarUnpack.includes('**/node-pty/**')) {
        success('node-pty解包配置正确');
      } else {
        warning('node-pty未配置解包');
      }
    }
  } catch (err) {
    error(`读取package.json失败: ${err.message}`);
    allPassed = false;
  }

  // 7. 计算文件哈希
  header('7. 文件完整性检查');
  try {
    if (fs.existsSync(installerPath)) {
      const hash = execSync(
        `powershell -Command "Get-FileHash '${installerPath}' -Algorithm SHA256 | Select-Object -ExpandProperty Hash"`,
        { encoding: 'utf-8' }
      ).trim();

      success(`安装程序SHA256: ${hash}`);
    }
  } catch (err) {
    warning(`无法计算文件哈希: ${err.message}`);
  }

  // 8. 最终结果
  header('验证结果汇总');
  if (allPassed) {
    success('所有检查通过！部署包完整且可用。');
    info('\n下一步:');
    info('1. 运行安装程序测试安装流程');
    info('2. 启动应用执行冒烟测试');
    info('3. 测试核心功能（文件上传、AI查询、文档生成）');
    info('4. 检查应用性能和稳定性');
  } else {
    error('部分检查失败！请检查上述错误并修复。');
    info('\n常见问题:');
    info('1. 重新运行构建: npm run build');
    info('2. 重新运行打包: npm run dist');
    info('3. 检查磁盘空间');
    info('4. 检查文件权限');
  }

  process.exit(allPassed ? 0 : 1);
}

// 运行验证
main().catch(err => {
  error(`验证脚本执行失败: ${err.message}`);
  console.error(err);
  process.exit(1);
});
