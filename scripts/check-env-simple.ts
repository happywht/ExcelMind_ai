#!/usr/bin/env node

/**
 * 环境变量配置检查脚本（简化版）
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
const envFiles = [
  '.env',
  '.env.local',
  '.env.development'
];

for (const file of envFiles) {
  const result = config({ path: resolve(process.cwd(), file) });
  if (result.error === undefined) {
    console.log(`✅ 已加载环境变量文件: ${file}`);
    break;
  }
}

console.log('\n' + '='.repeat(70));
console.log('ExcelMind AI - 环境变量配置检查');
console.log('='.repeat(70));

let allValid = true;

// 检查ZHIPU_API_KEY
console.log('\n🔑 步骤1: 检查AI服务密钥');

const zhipuKey = process.env.ZHIPU_API_KEY;

if (!zhipuKey) {
  console.error('   ❌ ZHIPU_API_KEY 未设置');
  console.error('      获取地址: https://open.bigmodel.cn/');
  allValid = false;
} else if (zhipuKey === 'your-secret-key-here') {
  console.error('   ❌ ZHIPU_API_KEY 使用的是默认值，请设置实际的API密钥');
  allValid = false;
} else if (zhipuKey.length < 10) {
  console.error('   ❌ ZHIPU_API_KEY 长度不足');
  allValid = false;
} else {
  console.log('   ✅ ZHIPU_API_KEY 已正确配置');
  const parts = zhipuKey.split('.');
  if (parts.length === 2) {
    console.log(`      ID: ${parts[0]}`);
    console.log(`      Secret: ${parts[1].substring(0, 10)}...`);
  }
}

// 检查其他配置
console.log('\n⚙️  步骤2: 检查其他配置');

console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   API_PORT: ${process.env.API_PORT || '3001'}`);
console.log(`   AI_MODEL: ${process.env.AI_MODEL || 'glm-4.6'}`);
console.log(`   AI_MAX_TOKENS: ${process.env.AI_MAX_TOKENS || '4096'}`);
console.log(`   LOG_LEVEL: ${process.env.LOG_LEVEL || 'info'}`);

// 总结
console.log('\n' + '='.repeat(70));
console.log('检查结果');
console.log('='.repeat(70));

if (allValid) {
  console.log('\n✅ 环境变量配置正确！');
  console.log('\n下一步:');
  console.log('   1. 启动API服务器: npm run dev:api');
  console.log('   2. 运行功能测试: npx tsx scripts/test-ai-proxy.ts');
} else {
  console.log('\n❌ 环境变量配置不完整');
  console.log('\n修复步骤:');
  console.log('   1. 创建环境变量文件:');
  console.log('      cp .env.example .env.local');
  console.log('   2. 编辑 .env.local，设置实际的API密钥:');
  console.log('      ZHIPU_API_KEY=your-actual-key.id.secret');
  console.log('   3. 重新运行此检查脚本');
}

console.log('\n' + '='.repeat(70));

process.exit(allValid ? 0 : 1);
