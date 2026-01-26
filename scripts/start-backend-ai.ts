#!/usr/bin/env node

/**
 * 快速启动脚本 - 后端AI代理系统
 *
 * 自动检查环境、启动服务器、运行测试
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command: string, description: string) {
  log(`\n🔄 ${description}...`, 'blue');
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    log(`✅ ${description} - 完成`, 'green');
    return output;
  } catch (error: any) {
    log(`❌ ${description} - 失败`, 'red');
    log(`   错误: ${error.message}`, 'red');
    throw error;
  }
}

async function main() {
  log('\n' + '█'.repeat(70), 'bright');
  log('█' + ' '.repeat(68) + '█', 'bright');
  log('█' + '  ExcelMind AI - 后端AI代理系统快速启动'.padEnd(68) + '█', 'bright');
  log('█' + ' '.repeat(68) + '█', 'bright');
  log('█'.repeat(70), 'bright');

  // Step 1: 检查环境变量
  log('\n📋 步骤 1/4: 检查环境变量配置', 'blue');

  try {
    runCommand('npx tsx scripts/check-env-simple.ts', '环境变量检查');
  } catch (error) {
    log('\n❌ 环境变量配置错误，请修复后重试', 'red');
    log('\n修复步骤:', 'yellow');
    log('   1. cp .env.example .env.local');
    log('   2. 编辑 .env.local，设置 ZHIPU_API_KEY');
    process.exit(1);
  }

  // Step 2: 检查依赖
  log('\n📦 步骤 2/4: 检查项目依赖', 'blue');

  const packageJsonPath = resolve(process.cwd(), 'node_modules');
  if (!existsSync(packageJsonPath)) {
    log('   ⚠️  node_modules 不存在，正在安装依赖...', 'yellow');
    runCommand('npm install', '安装依赖');
  } else {
    log('   ✅ 依赖已安装', 'green');
  }

  // Step 3: 启动服务器
  log('\n🚀 步骤 3/4: 启动后端API服务器', 'blue');
  log('   提示: 服务器将在后台启动', 'yellow');
  log('   使用 Ctrl+C 停止服务器', 'yellow');

  // 在后台启动服务器
  const serverProcess = require('child_process').spawn(
    'npm',
    ['run', 'dev:api'],
    {
      stdio: 'inherit',
      detached: true,
      shell: true
    }
  );

  // 等待服务器启动
  log('\n   等待服务器启动...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 4: 运行测试
  log('\n🧪 步骤 4/4: 运行功能测试', 'blue');

  try {
    runCommand('npx tsx scripts/test-ai-proxy.ts', '功能测试');
  } catch (error) {
    log('\n⚠️  部分测试失败，但服务器仍在运行', 'yellow');
  }

  // 成功消息
  log('\n' + '█'.repeat(70), 'bright');
  log('█' + ' '.repeat(68) + '█', 'bright');
  log('█' + '  🎉 后端AI代理系统已成功启动！'.padEnd(68) + '█', 'green');
  log('█' + ' '.repeat(68) + '█', 'bright');
  log('█'.repeat(70), 'bright');

  log('\n📍 服务地址:', 'blue');
  log('   HTTP API: http://localhost:3001', 'white');
  log('   健康检查: http://localhost:3001/health', 'white');
  log('   AI服务:   http://localhost:3001/api/v2/ai', 'white');

  log('\n📚 可用的API端点:', 'blue');
  log('   POST /api/v2/ai/generate-formula      - Excel公式生成', 'white');
  log('   POST /api/v2/ai/generate-data-code    - 数据处理代码生成', 'white');
  log('   POST /api/v2/ai/chat                  - 知识库对话', 'white');
  log('   POST /api/v2/ai/generate              - 通用代码生成', 'white');

  log('\n🔧 管理命令:', 'blue');
  log('   停止服务器: Ctrl+C 或关闭此终端', 'white');
  log('   查看日志:   查看服务器终端输出', 'white');
  log('   运行测试:   npx tsx scripts/test-ai-proxy.ts', 'white');

  log('\n💡 下一步:', 'blue');
  log('   1. 在新终端启动前端: npm run dev', 'white');
  log('   2. 访问应用:     http://localhost:3000', 'white');
  log('   3. 测试所有AI功能模块', 'white');

  log('\n' + '='.repeat(70) + '\n', 'white');

  // 保持进程运行
  process.on('SIGINT', () => {
    log('\n\n👋 正在关闭服务器...\n', 'yellow');
    process.exit(0);
  });
}

// 运行主函数
main().catch(error => {
  log('\n❌ 启动失败:', 'red');
  log(`   错误: ${error.message}`, 'red');
  process.exit(1);
});
