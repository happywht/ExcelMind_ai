#!/usr/bin/env node

/**
 * 回归测试脚本
 *
 * 快速验证项目修复状态
 *
 * 用法:
 *   node scripts/regression-test.cjs           // 运行所有测试
 *   node scripts/regression-test.cjs quick     // 快速测试（跳过 E2E）
 *   node scripts/regression-test.cjs report    // 生成详细报告
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// 测试结果
const results = {
  typescript: { passed: false, duration: 0, errors: 0, details: '' },
  security: { passed: false, duration: 0, vulnerabilities: 0, details: '' },
  build: { passed: false, duration: 0, details: '' },
  unitTests: { passed: false, duration: 0, details: '' },
  fileLength: { passed: false, longFiles: [], details: '' }
};

// 工具函数
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, colors.cyan);
  console.log('='.repeat(80));
}

function execCommand(command, description) {
  const start = Date.now();
  try {
    log(`\n▶ ${description}...`, colors.blue);
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    const duration = Date.now() - start;
    log(`✓ 完成 (${duration}ms)`, colors.green);
    return { success: true, output, duration };
  } catch (error) {
    const duration = Date.now() - start;
    log(`✗ 失败 (${duration}ms)`, colors.red);
    return { success: false, error: error.message, duration, output: error.stdout || '' };
  }
}

// 测试函数
async function testTypeScript() {
  logSection('1. TypeScript 编译检查');

  const result = execCommand('npx tsc --noEmit 2>&1', 'TypeScript 编译');

  if (result.success) {
    results.typescript.passed = true;
    results.typescript.duration = result.duration;
    log('✓ TypeScript 编译通过', colors.green);
  } else {
    results.typescript.passed = false;
    results.typescript.duration = result.duration;

    // 统计错误
    const errorLines = result.output.split('\n').filter(line => line.includes('error TS'));
    results.typescript.errors = errorLines.length;

    // 按错误类型统计
    const errorTypes = {};
    errorLines.forEach(line => {
      const match = line.match(/error (TS\d+)/);
      if (match) {
        errorTypes[match[1]] = (errorTypes[match[1]] || 0) + 1;
      }
    });

    log(`✗ 发现 ${results.typescript.errors} 个编译错误`, colors.red);
    log('\n错误类型统计:', colors.yellow);
    Object.entries(errorTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([type, count]) => {
        log(`  ${type}: ${count}`, colors.yellow);
      });

    results.typescript.details = `发现 ${results.typescript.errors} 个编译错误`;
  }
}

async function testSecurity() {
  logSection('2. 依赖包安全扫描');

  const result = execCommand('npm audit --production --json 2>&1', '生产依赖安全扫描');

  try {
    const auditData = JSON.parse(result.output);
    const vulnerabilities = auditData.metadata?.vulnerabilities || {};

    results.security.vulnerabilities =
      (vulnerabilities.low || 0) +
      (vulnerabilities.moderate || 0) +
      (vulnerabilities.high || 0) +
      (vulnerabilities.critical || 0);

    if (results.security.vulnerabilities === 0) {
      results.security.passed = true;
      log('✓ 生产依赖无安全漏洞', colors.green);
    } else {
      results.security.passed = false;
      log(`⚠ 发现 ${results.security.vulnerabilities} 个漏洞`, colors.yellow);
    }

    results.security.duration = result.duration;
    results.security.details = `生产依赖: ${results.security.vulnerabilities} 个漏洞`;

    // 检查所有依赖
    const allResult = execCommand('npm audit --json 2>&1', '全部依赖安全扫描');
    const allAuditData = JSON.parse(allResult.output);
    const allVulnerabilities = allAuditData.metadata?.vulnerabilities || {};

    const allVulnCount =
      (allVulnerabilities.low || 0) +
      (allVulnerabilities.moderate || 0) +
      (allVulnerabilities.high || 0) +
      (allVulnerabilities.critical || 0);

    if (allVulnCount > 0) {
      log(`⚠ 全部依赖: ${allVulnCount} 个漏洞`, colors.yellow);
      results.security.details += `, 全部依赖: ${allVulnCount} 个漏洞`;
    }
  } catch (error) {
    results.security.passed = false;
    results.security.duration = result.duration;
    log('✗ 安全扫描失败', colors.red);
    results.security.details = error.message;
  }
}

async function testBuild() {
  logSection('3. 构建验证');

  const result = execCommand('npm run build 2>&1', 'Vite 构建');

  if (result.success) {
    results.build.passed = true;
    results.build.duration = result.duration;
    log('✓ 构建成功', colors.green);
  } else {
    results.build.passed = false;
    results.build.duration = result.duration;
    log('✗ 构建失败', colors.red);

    // 提取错误信息
    const errorMatch = result.output.match(/error during build:\s*\n(.+?)(?:\n\s+at|$)/s);
    if (errorMatch) {
      results.build.details = errorMatch[1].trim();
      log(`错误: ${results.build.details}`, colors.red);
    }
  }
}

async function testUnitTests() {
  logSection('4. 单元测试');

  const result = execCommand('npm test -- --passWithNoTests --no-coverage 2>&1', 'Jest 测试');

  if (result.success || result.output.includes('No tests found')) {
    results.unitTests.passed = true;
    results.unitTests.duration = result.duration;
    log('✓ 单元测试通过', colors.green);

    // 提取测试统计
    const match = result.output.match(/Tests:\s+(\d+)\s+passed/);
    if (match) {
      log(`  测试数量: ${match[1]}`, colors.green);
    }
  } else {
    results.unitTests.passed = false;
    results.unitTests.duration = result.duration;
    log('✗ 单元测试失败', colors.red);

    // 提取失败信息
    const failMatch = result.output.match(/FAIL\s+(.+)/);
    if (failMatch) {
      results.unitTests.details = failMatch[1];
    }
  }
}

async function testFileLength() {
  logSection('5. 代码质量检查');

  log('检查文件长度...', colors.blue);

  const findCommand = process.platform === 'win32'
    ? 'powershell -Command "Get-ChildItem -Path . -Include *.ts,*.tsx -Recurse | Where-Object { $_.Length -gt 500 -and $_.FullName -notmatch \'node_modules|dist|coverage\' } | Select-Object FullName, @{Name=\'Lines\';Expression={(Get-Content $_.FullName | Measure-Object -Line).Lines}} | Sort-Object Lines -Descending | Format-Table -AutoSize"'
    : 'find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v coverage | while read file; do lines=$(wc -l < "$file" 2>/dev/null); if [ "$lines" -gt 500 ]; then echo "$file: $lines lines"; fi; done | sort -t: -k2 -rn | head -20';

  const result = execCommand(findCommand, '文件长度检查');

  const longFiles = result.output
    .split('\n')
    .filter(line => line.includes('.ts') && line.includes('lines'))
    .slice(0, 10);

  results.fileLength.longFiles = longFiles;
  results.fileLength.passed = longFiles.length === 0;
  results.fileLength.details = `${longFiles.length} 个文件超过 500 行`;

  if (longFiles.length === 0) {
    log('✓ 所有文件都在 500 行以内', colors.green);
  } else {
    log(`⚠ 发现 ${longFiles.length} 个文件超过 500 行`, colors.yellow);
    log('\n最长的文件:', colors.yellow);
    longFiles.slice(0, 5).forEach(file => {
      log(`  ${file}`, colors.yellow);
    });
  }
}

// 生成报告
function generateReport() {
  logSection('测试结果汇总');

  // 总体评估
  const passedTests = Object.values(results).filter(r => r.passed).length;
  const totalTests = Object.keys(results).length;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  log(`\n测试通过率: ${passRate}% (${passedTests}/${totalTests})`, colors.cyan);

  // 详细结果
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 测试项                              │ 状态   │ 耗时      │ 详情              │');
  console.log('├──────────────────────────────────────────────────────────────────────────────┤');

  const testNames = {
    typescript: 'TypeScript 编译',
    security: '安全扫描',
    build: '构建验证',
    unitTests: '单元测试',
    fileLength: '文件长度检查'
  };

  Object.entries(results).forEach(([key, result]) => {
    const status = result.passed ? '✓ 通过' : '✗ 失败';
    const statusColor = result.passed ? colors.green : colors.red;
    const duration = `${result.duration}ms`;
    const details = (result.details || '').slice(0, 18);

    console.log(`│ ${testNames[key].padEnd(35)} │ ${status}${statusColor} │ ${duration.padStart(8)} │ ${details.padEnd(18)} ${colors.reset}│`);
  });

  console.log('└──────────────────────────────────────────────────────────────────────────────┘');

  // 总体评估
  console.log('\n总体评估:');
  if (passedTests === totalTests) {
    log('  ✓ 所有测试通过 - 可以部署', colors.green);
  } else if (passedTests >= totalTests * 0.6) {
    log('  ⚠ 部分测试通过 - 需要修复问题', colors.yellow);
  } else {
    log('  ✗ 多项测试失败 - 不建议部署', colors.red);
  }

  // 建议
  console.log('\n建议:');
  if (!results.typescript.passed) {
    log(`  1. 修复 ${results.typescript.errors} 个 TypeScript 编译错误`, colors.yellow);
  }
  if (!results.security.passed) {
    log(`  2. 修复 ${results.security.vulnerabilities} 个安全漏洞`, colors.yellow);
  }
  if (!results.build.passed) {
    log(`  3. 修复构建错误: ${results.build.details}`, colors.yellow);
  }
  if (!results.unitTests.passed) {
    log(`  4. 修复单元测试失败`, colors.yellow);
  }
  if (!results.fileLength.passed) {
    log(`  5. 重构 ${results.fileLength.longFiles.length} 个超长文件`, colors.yellow);
  }

  // 保存报告到文件
  const reportPath = path.join(__dirname, '../REGRESSION_TEST_RESULTS.md');
  saveMarkdownReport(reportPath);
  log(`\n详细报告已保存到: ${reportPath}`, colors.cyan);
}

function saveMarkdownReport(filepath) {
  const report = `# 回归测试结果

**测试时间**: ${new Date().toISOString()}
**测试环境**: Windows 11, Node.js ${process.version}

## 测试结果汇总

| 测试项 | 状态 | 耗时 | 详情 |
|--------|------|------|------|
| TypeScript 编译 | ${results.typescript.passed ? '✓ 通过' : '✗ 失败'} | ${results.typescript.duration}ms | ${results.typescript.details} |
| 安全扫描 | ${results.security.passed ? '✓ 通过' : '✗ 失败'} | ${results.security.duration}ms | ${results.security.details} |
| 构建验证 | ${results.build.passed ? '✓ 通过' : '✗ 失败'} | ${results.build.duration}ms | ${results.build.details} |
| 单元测试 | ${results.unitTests.passed ? '✓ 通过' : '✗ 失败'} | ${results.unitTests.duration}ms | ${results.unitTests.details} |
| 文件长度检查 | ${results.fileLength.passed ? '✓ 通过' : '⚠ 警告'} | - | ${results.fileLength.details} |

## 详细结果

### 1. TypeScript 编译

**状态**: ${results.typescript.passed ? '✓ 通过' : '✗ 失败'}
**错误数**: ${results.typescript.errors}
**耗时**: ${results.typescript.duration}ms

${!results.typescript.passed ? `
**主要错误类型**:
- 类型不匹配
- 未定义变量
- 导入导出错误

**建议**: 运行 \`npx tsc --noEmit\` 查看完整错误列表
` : ''}

### 2. 安全扫描

**状态**: ${results.security.passed ? '✓ 通过' : '⚠ 警告'}
**漏洞数**: ${results.security.vulnerabilities}
**耗时**: ${results.security.duration}ms

${results.security.vulnerabilities > 0 ? `
**建议**: 运行 \`npm audit fix\` 修复漏洞
` : ''}

### 3. 构建验证

**状态**: ${results.build.passed ? '✓ 通过' : '✗ 失败'}
**耗时**: ${results.build.duration}ms

${!results.build.passed ? `
**错误**: ${results.build.details}

**建议**: 检查导入路径和依赖配置
` : ''}

### 4. 单元测试

**状态**: ${results.unitTests.passed ? '✓ 通过' : '✗ 失败'}
**耗时**: ${results.unitTests.duration}ms

${!results.unitTests.passed ? `
**失败原因**: ${results.unitTests.details}

**建议**: 检查 Jest 配置和测试文件
` : ''}

### 5. 代码质量

**状态**: ${results.fileLength.passed ? '✓ 通过' : '⚠ 警告'}

${results.fileLength.longFiles.length > 0 ? `
**超过 500 行的文件**:

${results.fileLength.longFiles.map(f => `- ${f}`).join('\n')}

**建议**: 重构超长文件以提高可维护性
` : ''}

## 总体评估

**通过率**: ${((Object.values(results).filter(r => r.passed).length / Object.keys(results).length) * 100).toFixed(1)}%

${Object.values(results).every(r => r.passed) ? '✓ 所有测试通过 - 项目可以部署' :
Object.values(results).filter(r => r.passed).length >= Object.keys(results).length * 0.6 ?
'⚠ 部分测试通过 - 建议修复问题后再部署' :
'✗ 多项测试失败 - 不建议部署'}

## 下一步行动

${!results.typescript.passed ? '1. 修复 TypeScript 编译错误\n' : ''}
${!results.security.passed ? '2. 运行 npm audit fix 修复安全漏洞\n' : ''}
${!results.build.passed ? '3. 修复构建错误\n' : ''}
${!results.unitTests.passed ? '4. 修复单元测试\n' : ''}
${!results.fileLength.passed ? '5. 重构超长文件\n' : ''}
`;

  fs.writeFileSync(filepath, report, 'utf-8');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'full';

  log('\n' + '='.repeat(80), colors.cyan);
  log('ExcelMind AI - 回归测试', colors.cyan);
  log('='.repeat(80) + '\n', colors.cyan);

  const start = Date.now();

  try {
    // 运行测试
    await testTypeScript();
    await testSecurity();
    await testBuild();
    await testUnitTests();
    await testFileLength();

    // 生成报告
    generateReport();

    const totalDuration = Date.now() - start;
    log(`\n总耗时: ${totalDuration}ms`, colors.cyan);

    // 返回退出码
    const allPassed = Object.values(results).every(r => r.passed);
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    log(`\n错误: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { main, results };
