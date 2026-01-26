/**
 * 环境变量配置检查脚本
 *
 * 验证所有必需的环境变量是否正确配置
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// 简单的日志函数
const log = {
  info: (msg: string) => console.log(msg),
  error: (msg: string) => console.error(msg),
  warn: (msg: string) => console.warn(msg),
  debug: (msg: string) => process.env.DEBUG ? console.log(msg) : {}
};

/**
 * 检查环境变量配置
 */
function checkEnvironmentVariables() {
  log.info('\n' + '='.repeat(70));
  log.info('ExcelMind AI - 环境变量配置检查');
  log.info('='.repeat(70));

  let allValid = true;

  // ========================================================================
  // 1. 检查 .env 文件是否存在
  // ========================================================================

  log.info('\n📁 步骤1: 检查环境变量文件');

  const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production'
  ];

  let foundEnvFile = false;
  for (const file of envFiles) {
    try {
      const path = resolve(process.cwd(), file);
      readFileSync(path, 'utf-8');
      log.info(`   ✅ 找到: ${file}`);
      foundEnvFile = true;
    } catch (error) {
      // 文件不存在，继续检查下一个
    }
  }

  if (!foundEnvFile) {
    log.warn('   ⚠️  未找到任何环境变量文件');
    log.warn('   💡 提示: 复制 .env.example 为 .env.local 并填入实际值');
    allValid = false;
  }

  // ========================================================================
  // 2. 检查必需的环境变量
  // ========================================================================

  logger.info('\n🔑 步骤2: 检查必需的环境变量');

  const requiredVars = [
    {
      name: 'ZHIPU_API_KEY',
      description: '智谱AI API密钥',
      getFrom: () => process.env.ZHIPU_API_KEY,
      validate: (value: string) => {
        if (!value) return false;
        if (value === 'your-secret-key-here') return false;
        if (value.length < 10) return false;
        return true;
      }
    }
  ];

  for (const varInfo of requiredVars) {
    const value = varInfo.getFrom();

    if (!value) {
      logger.error(`   ❌ ${varInfo.name} 未设置`);
      logger.error(`      描述: ${varInfo.description}`);
      logger.error(`      获取地址: https://open.bigmodel.cn/`);
      allValid = false;
    } else if (!varInfo.validate(value)) {
      logger.error(`   ❌ ${varInfo.name} 配置无效`);
      logger.error(`      当前值: ${value.substring(0, 10)}...`);
      allValid = false;
    } else {
      logger.info(`   ✅ ${varInfo.name} 已正确配置`);
      logger.debug(`      值长度: ${value.length} 字符`);
    }
  }

  // ========================================================================
  // 3. 检查可选的环境变量
  // ========================================================================

  logger.info('\n⚙️  步骤3: 检查可选的环境变量');

  const optionalVars = [
    {
      name: 'NODE_ENV',
      description: 'Node环境',
      defaultValue: 'development',
      getFrom: () => process.env.NODE_ENV
    },
    {
      name: 'API_PORT',
      description: 'API服务器端口',
      defaultValue: '3001',
      getFrom: () => process.env.API_PORT
    },
    {
      name: 'AI_MODEL',
      description: 'AI模型名称',
      defaultValue: 'glm-4.6',
      getFrom: () => process.env.AI_MODEL
    },
    {
      name: 'AI_MAX_TOKENS',
      description: 'AI最大Token数',
      defaultValue: '4096',
      getFrom: () => process.env.AI_MAX_TOKENS
    },
    {
      name: 'LOG_LEVEL',
      description: '日志级别',
      defaultValue: 'info',
      getFrom: () => process.env.LOG_LEVEL
    }
  ];

  for (const varInfo of optionalVars) {
    const value = varInfo.getFrom() || varInfo.defaultValue;
    logger.info(`   ℹ️  ${varInfo.name}: ${value}`);
    logger.debug(`      描述: ${varInfo.description}`);
  }

  // ========================================================================
  // 4. 检查AI服务配置
  // ========================================================================

  logger.info('\n🤖 步骤4: 检查AI服务配置');

  // 检查ZHIPU_API_KEY格式
  const zhipuKey = process.env.ZHIPU_API_KEY;
  if (zhipuKey) {
    const parts = zhipuKey.split('.');
    if (parts.length === 2) {
      const [id, secret] = parts;
      logger.info(`   ✅ ZHIPU_API_KEY 格式正确`);
      logger.debug(`      ID部分: ${id}`);
      logger.debug(`      Secret部分: ${secret.substring(0, 10)}... (共${secret.length}字符)`);
    } else {
      logger.warn(`   ⚠️  ZHIPU_API_KEY 格式可能不正确`);
      logger.warn(`      预期格式: id.secret`);
      logger.warn(`      实际部分数: ${parts.length}`);
    }
  }

  // ========================================================================
  // 5. 检查安全配置
  // ========================================================================

  logger.info('\n🔒 步骤5: 检查安全配置');

  const securityVars = [
    {
      name: 'JWT_SECRET',
      description: 'JWT密钥（用于认证）',
      getFrom: () => process.env.JWT_SECRET
    },
    {
      name: 'CORS_ORIGIN',
      description: 'CORS允许的源',
      getFrom: () => process.env.CORS_ORIGIN
    }
  ];

  for (const varInfo of securityVars) {
    const value = varInfo.getFrom();
    if (value) {
      logger.info(`   ✅ ${varInfo.name} 已配置`);
      logger.debug(`      描述: ${varInfo.description}`);
    } else {
      logger.warn(`   ⚠️  ${varInfo.name} 未配置（生产环境建议配置）`);
      logger.debug(`      描述: ${varInfo.description}`);
    }
  }

  // ========================================================================
  // 6. 生成配置报告
  // ========================================================================

  logger.info('\n📊 步骤6: 配置报告');

  logger.info('\n当前环境配置:');
  logger.info(`   - 运行环境: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`   - API端口: ${process.env.API_PORT || '3001'}`);
  logger.info(`   - AI模型: ${process.env.AI_MODEL || 'glm-4.6'}`);
  logger.info(`   - 最大Tokens: ${process.env.AI_MAX_TOKENS || '4096'}`);
  logger.info(`   - 日志级别: ${process.env.LOG_LEVEL || 'info'}`);
  logger.info(`   - CORS源: ${process.env.CORS_ORIGIN || '*'}`);

  // ========================================================================
  // 7. 检查前端配置
  // ========================================================================

  logger.info('\n🌐 步骤7: 检查前端API配置');

  const viteApiUrl = process.env.VITE_API_BASE_URL;
  if (viteApiUrl) {
    logger.info(`   ✅ VITE_API_BASE_URL 已配置: ${viteApiUrl}`);
  } else {
    logger.info(`   ℹ️  VITE_API_BASE_URL 未配置，将使用默认值`);
    logger.debug(`      开发环境默认: http://localhost:3001`);
    logger.debug(`      生产环境默认: /api`);
  }

  // ========================================================================
  // 总结
  // ========================================================================

  logger.info('\n' + '='.repeat(70));
  logger.info('检查结果总结');
  logger.info('='.repeat(70));

  if (allValid) {
    logger.info('\n✅ 所有必需的环境变量都已正确配置！');
    logger.info('\n下一步:');
    logger.info('   1. 启动开发服务器: npm run dev');
    logger.info('   2. 启动API服务器: npm run dev:api');
    logger.info('   3. 运行测试: npm run test:e2e');
  } else {
    logger.info('\n❌ 环境变量配置不完整，请修复以下问题：');
    logger.info('\n修复步骤:');
    logger.info('   1. 复制环境变量示例文件:');
    logger.info('      cp .env.example .env.local');
    logger.info('   2. 编辑 .env.local，填入实际的API密钥:');
    logger.info('      ZHIPU_API_KEY=your-actual-api-key-here');
    logger.info('   3. 保存文件并重新运行此检查脚本');
  }

  logger.info('\n' + '='.repeat(70));

  return allValid;
}

// 运行检查
const isValid = checkEnvironmentVariables();

// 返回适当的退出码
process.exit(isValid ? 0 : 1);
