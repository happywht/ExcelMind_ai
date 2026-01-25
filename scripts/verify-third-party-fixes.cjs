#!/usr/bin/env node
/**
 * 第三方库类型修复验证脚本
 *
 * 验证所有第三方库和模块导入问题是否已解决
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 开始验证第三方库类型修复...\n');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查列表
const checks = [
  {
    name: '类型声明文件存在',
    check: () => fs.existsSync(path.join(__dirname, '../types/third-party.d.ts')),
    critical: true
  },
  {
    name: '@storybook/react 类型声明',
    check: () => {
      const content = fs.readFileSync(path.join(__dirname, '../types/third-party.d.ts'), 'utf-8');
      return content.includes("declare module '@storybook/react'");
    },
    critical: true
  },
  {
    name: '@google/genai 类型声明',
    check: () => {
      const content = fs.readFileSync(path.join(__dirname, '../types/third-party.d.ts'), 'utf-8');
      return content.includes("declare module '@google/genai'");
    },
    critical: true
  },
  {
    name: 'PizZip 类型扩展',
    check: () => {
      const content = fs.readFileSync(path.join(__dirname, '../types/third-party.d.ts'), 'utf-8');
      return content.includes("declare module 'pizzip'");
    },
    critical: true
  },
  {
    name: 'JSZip 类型扩展',
    check: () => {
      const content = fs.readFileSync(path.join(__dirname, '../types/third-party.d.ts'), 'utf-8');
      return content.includes("declare module 'jszip'");
    },
    critical: true
  },
  {
    name: 'PDF.js 类型声明',
    check: () => {
      const content = fs.readFileSync(path.join(__dirname, '../types/third-party.d.ts'), 'utf-8');
      return content.includes("declare module 'pdfjs-dist'");
    },
    critical: true
  },
  {
    name: 'tsconfig.json 路径配置',
    check: () => {
      const tsconfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../tsconfig.json'), 'utf-8'));
      return tsconfig.compilerOptions.paths['@excelmind/shared-types'];
    },
    critical: true
  },
  {
    name: 'vite.config.ts 路径配置',
    check: () => {
      const content = fs.readFileSync(path.join(__dirname, '../vite.config.ts'), 'utf-8');
      return content.includes('@excelmind/shared-types');
    },
    critical: true
  }
];

// 执行检查
let passed = 0;
let failed = 0;
let criticalFailed = 0;

checks.forEach(({ name, check, critical }) => {
  try {
    if (check()) {
      log(`✓ ${name}`, 'green');
      passed++;
    } else {
      log(`✗ ${name}`, 'red');
      failed++;
      if (critical) criticalFailed++;
    }
  } catch (error) {
    log(`✗ ${name} - ${error.message}`, 'red');
    failed++;
    if (critical) criticalFailed++;
  }
});

log(`\n📊 检查统计:`, 'blue');
log(`  通过: ${passed}/${checks.length}`, 'green');
log(`  失败: ${failed}/${checks.length}`, failed > 0 ? 'red' : 'green');
log(`  关键失败: ${criticalFailed}`, criticalFailed > 0 ? 'red' : 'green');

// TypeScript 编译检查
log(`\n🔬 运行 TypeScript 类型检查...`, 'blue');

try {
  const tscOutput = execSync('npx tsc --noEmit 2>&1', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8'
  });

  // 检查第三方库特定错误
  const thirdPartyErrors = tscOutput.split('\n').filter(line =>
    line.includes('@storybook') ||
    line.includes('@google') ||
    line.includes('@excelmind/shared-types') ||
    line.includes('ZipObject') ||
    line.includes('JSZipObject') ||
    line.includes('pdfjs')
  );

  if (thirdPartyErrors.length === 0) {
    log(`✓ 所有第三方库类型错误已修复`, 'green');
  } else {
    log(`✗ 仍有 ${thirdPartyErrors.length} 个第三方库错误:`, 'red');
    thirdPartyErrors.forEach(error => log(`  ${error}`, 'red'));
    criticalFailed++;
  }

  // 统计总错误数
  const allErrors = tscOutput.split('\n').filter(line => line.includes('error TS'));
  log(`\n📈 当前总错误数: ${allErrors.length}`, 'blue');

} catch (error) {
  // tsc 返回非零退出码，但我们可以解析输出
  const output = error.stdout || error.message;
  const thirdPartyErrors = output.split('\n').filter(line =>
    line.includes('@storybook') ||
    line.includes('@google') ||
    line.includes('@excelmind/shared-types') ||
    line.includes('ZipObject') ||
    line.includes('JSZipObject') ||
    line.includes('pdfjs')
  );

  if (thirdPartyErrors.length === 0) {
    log(`✓ 所有第三方库类型错误已修复`, 'green');
  } else {
    log(`✗ 仍有 ${thirdPartyErrors.length} 个第三方库错误:`, 'red');
    thirdPartyErrors.forEach(err => log(`  ${err}`, 'red'));
    criticalFailed++;
  }

  const allErrors = output.split('\n').filter(line => line.includes('error TS'));
  log(`\n📈 当前总错误数: ${allErrors.length}`, 'blue');
}

// 最终结果
log(`\n${'='.repeat(50)}`, 'blue');
if (criticalFailed === 0) {
  log(`✅ 验证通过！所有第三方库类型问题已解决`, 'green');
  process.exit(0);
} else {
  log(`❌ 验证失败！仍有 ${criticalFailed} 个关键问题`, 'red');
  process.exit(1);
}
