#!/usr/bin/env node

/**
 * 代码重构辅助脚本
 *
 * 用途: 自动化部分重构工作,减少手动操作
 *
 * 使用方法:
 * node scripts/refactor-helper.js --target FileRelationshipService
 * node scripts/refactor-helper.js --target CrossSheetService
 * node scripts/refactor-helper.js --target DegradationManager
 * node scripts/refactor-helper.js --update-imports
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  basePath: path.join(__dirname, '..'),
  servicesPath: path.join(__dirname, '..', 'services', 'infrastructure'),
};

// 目标文件配置
const TARGETS = {
  FileRelationshipService: {
    sourceFile: 'vfs/FileRelationshipService.ts',
    targetDir: 'vfs/FileRelationshipService',
    modules: [
      { name: 'types', startLine: 19, endLine: 84 },
      { name: 'GraphOperations', startLine: 436, endLine: 804 },
      { name: 'DependencyAnalysis', startLine: 264, endLine: 336 },
      { name: 'core', startLine: 85, endLine: 435, isMain: true },
    ],
  },
  CrossSheetService: {
    sourceFile: 'vfs/CrossSheetService.ts',
    targetDir: 'vfs/CrossSheetService',
    modules: [
      { name: 'types', startLine: 19, endLine: 79 },
      { name: 'ReferenceValidator', startLine: 184, endLine: 377 },
      { name: 'CircularReferenceDetector', startLine: 254, endLine: 311 },
      { name: 'core', startLine: 80, endLine: 727, isMain: true },
    ],
  },
  DegradationManager: {
    sourceFile: 'degradation/DegradationManager.ts',
    targetDir: 'degradation/DegradationManager',
    modules: [
      { name: 'core', startLine: 1, endLine: 693, isMain: true },
    ],
    subDir: 'strategies',
    strategies: [
      { name: 'BrowserStrategy', methods: ['transitionToBrowserMode'] },
      { name: 'HybridStrategy', methods: ['transitionToHybridMode'] },
      { name: 'BackendStrategy', methods: ['transitionToBackendMode'] },
    ],
  },
};

/**
 * 提取文件行范围
 */
function extractLines(filePath, startLine, endLine) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // 行号从1开始,转换为从0开始
  const start = startLine - 1;
  const end = endLine;

  return lines.slice(start, end).join('\n');
}

/**
 * 创建模块文件
 */
function createModuleFile(targetPath, content) {
  const dir = path.dirname(targetPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(targetPath, content, 'utf8');
  console.log(`✅ Created: ${targetPath}`);
}

/**
 * 生成 types.ts 内容
 */
function generateTypes(typesContent) {
  return `/**
 * 类型定义
 *
 * @module infrastructure
 * @version 1.0.0
 */

${typesContent}
`;
}

/**
 * 生成 index.ts 内容
 */
function generateIndex(moduleName) {
  return `/**
 * ${moduleName} 统一导出
 *
 * @module infrastructure
 * @version 1.0.0
 */

export { ${moduleName} } from './core';
export default ${moduleName};

// 导出类型
export * from './types';
`;
}

/**
 * 重构 FileRelationshipService
 */
function refactorFileRelationshipService() {
  const target = TARGETS.FileRelationshipService;
  const sourcePath = path.join(CONFIG.servicesPath, target.sourceFile);

  console.log('\n🔄 重构 FileRelationshipService...');

  // 提取并创建 types.ts
  const typesContent = extractLines(sourcePath, target.modules[0].startLine, target.modules[0].endLine);
  const typesPath = path.join(CONFIG.servicesPath, target.targetDir, 'types.ts');
  createModuleFile(typesPath, generateTypes(typesContent));

  // 提取并创建 GraphOperations.ts
  const graphOpsContent = extractLines(sourcePath, target.modules[1].startLine, target.modules[1].endLine);
  const graphOpsPath = path.join(CONFIG.servicesPath, target.targetDir, 'GraphOperations.ts');
  createModuleFile(graphOpsPath, `// Graph operations implementation\n${graphOpsContent}`);

  // 提取并创建 DependencyAnalysis.ts
  const depAnalysisContent = extractLines(sourcePath, target.modules[2].startLine, target.modules[2].endLine);
  const depAnalysisPath = path.join(CONFIG.servicesPath, target.targetDir, 'DependencyAnalysis.ts');
  createModuleFile(depAnalysisPath, `// Dependency analysis implementation\n${depAnalysisContent}`);

  // 创建 core.ts (需要手动调整)
  console.log('⚠️  core.ts 需要手动创建,请参考 REFACTORING_GUIDE.md');

  // 创建 index.ts
  const indexPath = path.join(CONFIG.servicesPath, target.targetDir, 'index.ts');
  createModuleFile(indexPath, generateIndex('FileRelationshipService'));

  console.log('✅ FileRelationshipService 重构完成\n');
}

/**
 * 重构 CrossSheetService
 */
function refactorCrossSheetService() {
  const target = TARGETS.CrossSheetService;
  const sourcePath = path.join(CONFIG.servicesPath, target.sourceFile);

  console.log('\n🔄 重构 CrossSheetService...');

  // 提取并创建 types.ts
  const typesContent = extractLines(sourcePath, target.modules[0].startLine, target.modules[0].endLine);
  const typesPath = path.join(CONFIG.servicesPath, target.targetDir, 'types.ts');
  createModuleFile(typesPath, generateTypes(typesContent));

  // 提取并创建 ReferenceValidator.ts
  const refValidatorContent = extractLines(sourcePath, target.modules[1].startLine, target.modules[1].endLine);
  const refValidatorPath = path.join(CONFIG.servicesPath, target.targetDir, 'ReferenceValidator.ts');
  createModuleFile(refValidatorPath, `// Reference validation implementation\n${refValidatorContent}`);

  // 提取并创建 CircularReferenceDetector.ts
  const circularDetectorContent = extractLines(sourcePath, target.modules[2].startLine, target.modules[2].endLine);
  const circularDetectorPath = path.join(CONFIG.servicesPath, target.targetDir, 'CircularReferenceDetector.ts');
  createModuleFile(circularDetectorPath, `// Circular reference detection implementation\n${circularDetectorContent}`);

  // 创建 core.ts (需要手动调整)
  console.log('⚠️  core.ts 需要手动创建,请参考 REFACTORING_GUIDE.md');

  // 创建 index.ts
  const indexPath = path.join(CONFIG.servicesPath, target.targetDir, 'index.ts');
  createModuleFile(indexPath, generateIndex('CrossSheetService'));

  console.log('✅ CrossSheetService 重构完成\n');
}

/**
 * 重构 DegradationManager
 */
function refactorDegradationManager() {
  const target = TARGETS.DegradationManager;
  const sourcePath = path.join(CONFIG.servicesPath, target.sourceFile);

  console.log('\n🔄 重构 DegradationManager...');

  // 创建策略目录
  const strategiesDir = path.join(CONFIG.servicesPath, target.targetDir, 'strategies');
  if (!fs.existsSync(strategiesDir)) {
    fs.mkdirSync(strategiesDir, { recursive: true });
  }

  // 为每个策略创建文件
  for (const strategy of target.strategies) {
    const strategyPath = path.join(strategiesDir, `${strategy.name}.ts`);
    const content = `/**
 * ${strategy.name}
 *
 * 策略模式实现
 */

export class ${strategy.name} {
  /**
   * 执行策略
   */
  execute(): void {
    console.log('[${strategy.name}] Executing strategy');
  }

  /**
   * 检查是否可以恢复到此策略
   */
  canRecover(metrics: any): boolean {
    return true;
  }
}
`;
    createModuleFile(strategyPath, content);
  }

  // 创建 core.ts (需要手动调整)
  console.log('⚠️  core.ts 需要手动创建,请参考 REFACTORING_GUIDE.md');

  // 创建 index.ts
  const indexPath = path.join(CONFIG.servicesPath, target.targetDir, 'index.ts');
  createModuleFile(indexPath, generateIndex('DegradationManager'));

  console.log('✅ DegradationManager 重构完成\n');
}

/**
 * 更新导入路径
 */
function updateImports() {
  console.log('\n🔄 更新导入路径...');

  const replacements = [
    {
      pattern: /from ['"]\.\/VirtualFileSystem['"]/g,
      replacement: "from './VirtualFileSystem/index'",
      description: 'VirtualFileSystem imports',
    },
    {
      pattern: /from ['"]\.\/FileRelationshipService['"]/g,
      replacement: "from './FileRelationshipService/index'",
      description: 'FileRelationshipService imports',
    },
    {
      pattern: /from ['"]\.\/CrossSheetService['"]/g,
      replacement: "from './CrossSheetService/index'",
      description: 'CrossSheetService imports',
    },
    {
      pattern: /from ['"]\.\.\/degradation\/DegradationManager['"]/g,
      replacement: "from '../degradation/DegradationManager/index'",
      description: 'DegradationManager imports',
    },
  ];

  function traverseDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        traverseDirectory(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        updateFile(filePath);
      }
    }
  }

  function updateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const { pattern, replacement, description } of replacements) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
        console.log(`  ✅ ${description}: ${filePath}`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
    }
  }

  traverseDirectory(path.join(CONFIG.servicesPath, 'vfs'));
  traverseDirectory(path.join(CONFIG.servicesPath, 'degradation'));

  console.log('✅ 导入路径更新完成\n');
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const target = args.find(arg => arg.startsWith('--target='))?.split('=')[1];
  const shouldUpdateImports = args.includes('--update-imports');

  if (shouldUpdateImports) {
    updateImports();
    return;
  }

  switch (target) {
    case 'FileRelationshipService':
      refactorFileRelationshipService();
      break;
    case 'CrossSheetService':
      refactorCrossSheetService();
      break;
    case 'DegradationManager':
      refactorDegradationManager();
      break;
    case 'all':
      refactorFileRelationshipService();
      refactorCrossSheetService();
      refactorDegradationManager();
      updateImports();
      break;
    default:
      console.log(`
使用方法:
  node scripts/refactor-helper.js --target=FileRelationshipService
  node scripts/refactor-helper.js --target=CrossSheetService
  node scripts/refactor-helper.js --target=DegradationManager
  node scripts/refactor-helper.js --target=all
  node scripts/refactor-helper.js --update-imports

注意: 此脚本只负责创建文件框架,核心逻辑需要手动调整!
请参考 REFACTORING_GUIDE.md 获取详细指导。
      `);
  }
}

// 运行
main();
