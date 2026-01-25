#!/usr/bin/env node

/**
 * 重构验证脚本
 *
 * 用途: 验证重构后的代码是否正确
 *
 * 使用方法:
 * node scripts/validate-refactor.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  basePath: path.join(__dirname, '..'),
  servicesPath: path.join(__dirname, '..', 'services', 'infrastructure'),
};

// 验证结果
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

/**
 * 记录结果
 */
function log(status, message) {
  const emoji = {
    passed: '✅',
    failed: '❌',
    warning: '⚠️',
  }[status];

  console.log(`${emoji} ${message}`);

  if (status === 'passed') {
    results.passed.push(message);
  } else if (status === 'failed') {
    results.failed.push(message);
  } else {
    results.warnings.push(message);
  }
}

/**
 * 检查文件是否存在
 */
function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    log('passed', `文件存在: ${description}`);
    return true;
  } else {
    log('failed', `文件不存在: ${description}`);
    return false;
  }
}

/**
 * 检查文件行数
 */
function checkFileLength(filePath, maxLength, description) {
  if (!fs.existsSync(filePath)) {
    log('warning', `跳过检查(文件不存在): ${description}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;

  if (lines <= maxLength) {
    log('passed', `文件行数合理: ${description} (${lines}/${maxLength}行)`);
    return true;
  } else {
    log('failed', `文件行数超标: ${description} (${lines}/${maxLength}行)`);
    return false;
  }
}

/**
 * 检查导入路径
 */
function checkImports(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const oldImports = [
    /from ['"]\.\/VirtualFileSystem['"]/,
    /from ['"]\.\/FileRelationshipService['"]/,
    /from ['"]\.\/CrossSheetService['"]/,
    /from ['"]\.\.\/degradation\/DegradationManager['"]/,
  ];

  let hasOldImports = false;
  for (const pattern of oldImports) {
    if (pattern.test(content)) {
      hasOldImports = true;
      break;
    }
  }

  if (hasOldImports) {
    log('warning', `发现旧导入路径: ${filePath}`);
  }
}

/**
 * 检查类型导出
 */
function checkTypeExports(modulePath) {
  const indexFile = path.join(modulePath, 'index.ts');
  const typesFile = path.join(modulePath, 'types.ts');

  if (!fs.existsSync(indexFile)) {
    log('warning', `index.ts 不存在: ${modulePath}`);
    return false;
  }

  if (!fs.existsSync(typesFile)) {
    log('warning', `types.ts 不存在: ${modulePath}`);
    return false;
  }

  const indexContent = fs.readFileSync(indexFile, 'utf8');
  const hasTypeExport = /export \* from ['"]\.\/types['"]/.test(indexContent);

  if (hasTypeExport) {
    log('passed', `类型导出正确: ${modulePath}`);
    return true;
  } else {
    log('failed', `类型导出缺失: ${modulePath}`);
    return false;
  }
}

/**
 * 运行 TypeScript 编译检查
 */
function runTypeScriptCheck() {
  try {
    console.log('\n🔍 运行 TypeScript 编译检查...');
    execSync('npx tsc --noEmit', {
      cwd: CONFIG.basePath,
      stdio: 'pipe',
    });
    log('passed', 'TypeScript 编译检查通过');
    return true;
  } catch (error) {
    log('failed', 'TypeScript 编译检查失败');
    console.error(error.stdout?.toString() || error.message);
    return false;
  }
}

/**
 * 验证 VirtualFileSystem 重构
 */
function validateVirtualFileSystem() {
  console.log('\n🔍 验证 VirtualFileSystem 重构...\n');

  const vfsPath = path.join(CONFIG.servicesPath, 'vfs', 'VirtualFileSystem');

  // 检查所有模块文件
  const modules = [
    'core.ts',
    'types.ts',
    'FileOperations.ts',
    'DirectoryOperations.ts',
    'VersionOperations.ts',
    'RelationshipOperations.ts',
    'UtilityOperations.ts',
    'index.ts',
  ];

  let allExist = true;
  for (const module of modules) {
    if (!checkFileExists(path.join(vfsPath, module), `VirtualFileSystem/${module}`)) {
      allExist = false;
    }
  }

  if (allExist) {
    log('passed', 'VirtualFileSystem 模块完整');
  }

  // 检查文件行数
  checkFileLength(path.join(vfsPath, 'core.ts'), 300, 'VirtualFileSystem/core.ts');
  checkFileLength(path.join(vfsPath, 'FileOperations.ts'), 200, 'VirtualFileSystem/FileOperations.ts');
  checkFileLength(path.join(vfsPath, 'VersionOperations.ts'), 180, 'VirtualFileSystem/VersionOperations.ts');

  // 检查类型导出
  checkTypeExports(vfsPath);
}

/**
 * 验证 FileRelationshipService 重构
 */
function validateFileRelationshipService() {
  console.log('\n🔍 验证 FileRelationshipService 重构...\n');

  const frsPath = path.join(CONFIG.servicesPath, 'vfs', 'FileRelationshipService');

  // 检查核心文件
  const coreFiles = ['core.ts', 'types.ts', 'index.ts'];
  for (const file of coreFiles) {
    checkFileExists(path.join(frsPath, file), `FileRelationshipService/${file}`);
  }

  // 检查操作模块
  const opModules = ['GraphOperations.ts', 'DependencyAnalysis.ts'];
  for (const module of opModules) {
    const exists = checkFileExists(path.join(frsPath, module), `FileRelationshipService/${module}`);
    if (exists) {
      checkFileLength(path.join(frsPath, module), 400, `FileRelationshipService/${module}`);
    }
  }

  // 检查类型导出
  if (fs.existsSync(frsPath)) {
    checkTypeExports(frsPath);
  }
}

/**
 * 验证 CrossSheetService 重构
 */
function validateCrossSheetService() {
  console.log('\n🔍 验证 CrossSheetService 重构...\n');

  const cssPath = path.join(CONFIG.servicesPath, 'vfs', 'CrossSheetService');

  // 检查核心文件
  const coreFiles = ['core.ts', 'types.ts', 'index.ts'];
  for (const file of coreFiles) {
    checkFileExists(path.join(cssPath, file), `CrossSheetService/${file}`);
  }

  // 检查操作模块
  const opModules = ['ReferenceValidator.ts', 'CircularReferenceDetector.ts'];
  for (const module of opModules) {
    const exists = checkFileExists(path.join(cssPath, module), `CrossSheetService/${module}`);
    if (exists) {
      checkFileLength(path.join(cssPath, module), 300, `CrossSheetService/${module}`);
    }
  }

  // 检查类型导出
  if (fs.existsSync(cssPath)) {
    checkTypeExports(cssPath);
  }
}

/**
 * 验证 DegradationManager 重构
 */
function validateDegradationManager() {
  console.log('\n🔍 验证 DegradationManager 重构...\n');

  const dmPath = path.join(CONFIG.servicesPath, 'degradation', 'DegradationManager');

  // 检查核心文件
  const coreFiles = ['core.ts', 'index.ts'];
  for (const file of coreFiles) {
    checkFileExists(path.join(dmPath, file), `DegradationManager/${file}`);
  }

  // 检查策略模块
  const strategies = ['BrowserStrategy.ts', 'HybridStrategy.ts', 'BackendStrategy.ts'];
  for (const strategy of strategies) {
    checkFileExists(path.join(dmPath, 'strategies', strategy), `DegradationManager/strategies/${strategy}`);
  }
}

/**
 * 扫描旧导入路径
 */
function scanOldImports() {
  console.log('\n🔍 扫描旧的导入路径...\n');

  const dirs = [
    path.join(CONFIG.servicesPath, 'vfs'),
    path.join(CONFIG.servicesPath, 'degradation'),
  ];

  function traverseDirectory(dir) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        traverseDirectory(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        checkImports(filePath);
      }
    }
  }

  for (const dir of dirs) {
    traverseDirectory(dir);
  }
}

/**
 * 生成报告
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 验证报告');
  console.log('='.repeat(60) + '\n');

  console.log(`✅ 通过: ${results.passed.length}`);
  console.log(`❌ 失败: ${results.failed.length}`);
  console.log(`⚠️  警告: ${results.warnings.length}\n`);

  if (results.failed.length > 0) {
    console.log('失败的检查:');
    results.failed.forEach(item => console.log(`  - ${item}`));
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log('警告项:');
    results.warnings.forEach(item => console.log(`  - ${item}`));
    console.log('');
  }

  const success = results.failed.length === 0;

  if (success) {
    console.log('🎉 所有检查通过!');
  } else {
    console.log('❌ 存在失败项,请修复后再继续');
    console.log('\n建议:');
    console.log('1. 运行 node scripts/refactor-helper.js --target=all 完成重构');
    console.log('2. 运行 node scripts/validate-refactor.js 再次验证');
    console.log('3. 参考 REFACTORING_GUIDE.md 获取详细指导');
  }

  console.log('\n' + '='.repeat(60));

  return success;
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始验证重构...\n');

  // 验证各个模块
  validateVirtualFileSystem();
  validateFileRelationshipService();
  validateCrossSheetService();
  validateDegradationManager();

  // 扫描旧导入
  scanOldImports();

  // TypeScript 编译检查(可选,需要配置好环境)
  // runTypeScriptCheck();

  // 生成报告
  const success = generateReport();

  process.exit(success ? 0 : 1);
}

// 运行
main();
