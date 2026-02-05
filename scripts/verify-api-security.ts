/**
 * API密钥安全加固验证脚本
 *
 * 验证以下内容:
 * 1. 前端代码中没有硬编码的API密钥
 * 2. 前端使用aiProxyService而不是直接调用zhipuService
 * 3. 后端有正确的AI代理端点
 * 4. 环境配置文件正确
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

interface ValidationResult {
  category: string;
  check: string;
  passed: boolean;
  message: string;
  details?: string;
}

const results: ValidationResult[] = [];

// 辅助函数: 添加验证结果
const addResult = (category: string, check: string, passed: boolean, message: string, details?: string) => {
  results.push({ category, check, passed, message, details });
};

// 辅助函数: 读取文件内容
const readFile = (filePath: string): string => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return '';
  }
};

// 辅助函数: 检查文件是否存在
const fileExists = (filePath: string): boolean => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

// 验证1: 检查前端代码中是否有硬编码的API密钥
const validateNoHardcodedKeys = () => {
  console.log('\n🔍 验证1: 检查前端代码中的硬编码API密钥...');

  const sensitivePatterns = [
    /apiKey\s*[:=]\s*['"][^'"]{20,}['"]/g,
    /ZHIPU_API_KEY\s*[:=]\s*['"][^'"]{20,}['"]/g,
    /ccd69d4c776d4e2696a6ef026159fb9c/g,
    /dangerouslyAllowBrowser\s*:\s*true/g
  ];

  const frontendFiles = [
    'components/SmartExcel.tsx',
    'components/FormulaGen.tsx',
    'components/KnowledgeChat.tsx',
    'services/aiProxyService.ts'
  ];

  let hasIssues = false;

  for (const file of frontendFiles) {
    const filePath = path.join(rootDir, file);
    if (!fileExists(filePath)) continue;

    const content = readFile(filePath);

    for (const pattern of sensitivePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        hasIssues = true;
        addResult(
          '安全性',
          `检查${file}中的硬编码密钥`,
          false,
          `发现可能的硬编码密钥`,
          `文件: ${file}\n匹配: ${matches.join(', ')}`
        );
      }
    }
  }

  if (!hasIssues) {
    addResult(
      '安全性',
      '前端代码中没有硬编码的API密钥',
      true,
      '所有前端文件都通过了安全检查'
    );
  }
};

// 验证2: 检查前端是否使用aiProxyService
const validateProxyUsage = () => {
  console.log('\n🔍 验证2: 检查前端是否使用AI代理服务...');

  const frontendComponents = [
    { file: 'components/SmartExcel.tsx', expectedImport: "from '../src/services/aiProxyService'" },
    { file: 'components/FormulaGen.tsx', expectedImport: "from '../src/services/aiProxyService'" },
    { file: 'components/KnowledgeChat.tsx', expectedImport: "from '../src/services/aiProxyService'" }
  ];

  for (const { file, expectedImport } of frontendComponents) {
    const filePath = path.join(rootDir, file);
    if (!fileExists(filePath)) {
      addResult(
        '架构',
        `检查${file}使用代理服务`,
        false,
        `文件不存在: ${file}`
      );
      continue;
    }

    const content = readFile(filePath);

    if (content.includes(expectedImport)) {
      addResult(
        '架构',
        `检查${file}使用代理服务`,
        true,
        `正确使用aiProxyService`
      );
    } else if (content.includes("from '../src/services/zhipuService'")) {
      addResult(
        '架构',
        `检查${file}使用代理服务`,
        false,
        `仍在直接使用zhipuService`,
        `应该导入: ${expectedImport}`
      );
    } else {
      addResult(
        '架构',
        `检查${file}使用代理服务`,
        false,
        `未找到正确的AI服务导入`
      );
    }
  }
};

// 验证3: 检查后端AI代理端点
const validateBackendEndpoints = () => {
  console.log('\n🔍 验证3: 检查后端AI代理端点...');

  const requiredFiles = [
    'api/controllers/aiController.ts',
    'api/routes/ai.ts'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(rootDir, file);
    if (fileExists(filePath)) {
      const content = readFile(filePath);

      if (file.includes('aiController.ts')) {
        const hasRequiredMethods =
          content.includes('generateCode') &&
          content.includes('generateDataProcessingCode') &&
          content.includes('generateExcelFormula') &&
          content.includes('chatWithKnowledgeBase');

        addResult(
          '后端',
          `检查AI控制器`,
          hasRequiredMethods,
          hasRequiredMethods ? 'AI控制器包含所有必需方法' : 'AI控制器缺少某些方法'
        );
      } else if (file.includes('routes/ai.ts')) {
        const hasRequiredRoutes =
          content.includes('/generate') &&
          content.includes('/generate-data-code') &&
          content.includes('/generate-formula') &&
          content.includes('/chat');

        addResult(
          '后端',
          `检查AI路由`,
          hasRequiredRoutes,
          hasRequiredRoutes ? 'AI路由配置正确' : 'AI路由缺少某些端点'
        );
      }
    } else {
      addResult(
        '后端',
        `检查${file}`,
        false,
        `文件不存在: ${file}`
      );
    }
  }

  // 检查路由是否在主路由中注册
  const v2RoutesPath = path.join(rootDir, 'api/routes/v2.ts');
  if (fileExists(v2RoutesPath)) {
    const v2Content = readFile(v2RoutesPath);
    if (v2Content.includes("router.use('/ai', aiRouter)")) {
      addResult(
        '后端',
        '检查AI路由注册',
        true,
        'AI路由已在v2路由中注册'
      );
    } else {
      addResult(
        '后端',
        '检查AI路由注册',
        false,
        'AI路由未在v2路由中注册'
      );
    }
  }
};

// 验证4: 检查环境配置
const validateEnvironmentConfig = () => {
  console.log('\n🔍 验证4: 检查环境配置...');

  // 检查.env.example
  const envExamplePath = path.join(rootDir, '.env.example');
  if (fileExists(envExamplePath)) {
    const content = readFile(envExamplePath);
    const hasApiKeyConfig =
      content.includes('ZHIPU_API_KEY') &&
      content.includes('your-secret-key-here');

    addResult(
      '配置',
      '检查.env.example',
      hasApiKeyConfig,
      hasApiKeyConfig ? '.env.example配置正确' : '.env.example缺少API密钥配置'
    );
  } else {
    addResult(
      '配置',
      '检查.env.example',
      false,
      '.env.example文件不存在'
    );
  }

  // 检查.gitignore
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (fileExists(gitignorePath)) {
    const content = readFile(gitignorePath);
    const ignoresEnvFiles =
      content.includes('.env.local') ||
      content.includes('.env');

    addResult(
      '配置',
      '检查.gitignore',
      ignoresEnvFiles,
      ignoresEnvFiles ? '.gitignore正确配置' : '.gitignore未忽略环境变量文件'
    );
  }

  // 检查vite.config.ts
  const viteConfigPath = path.join(rootDir, 'vite.config.ts');
  if (fileExists(viteConfigPath)) {
    const content = readFile(viteConfigPath);

    // 确保没有在define中注入API密钥
    // 检查是否有激活的 define 配置(排除注释)
    const lines = content.split('\n');
    let inDefineSection = false;
    let hasActiveApiKeyInjection = false;
    let defineContent = '';

    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();

      // 检测 define 配置开始
      if (trimmedLine.match(/define\s*:\s*{/)) {
        inDefineSection = true;
        // 检查是否是注释行
        if (lines[i].trim().startsWith('//')) {
          inDefineSection = false;
        }
        continue;
      }

      if (inDefineSection) {
        // 检测注释
        if (trimmedLine.startsWith('//')) {
          continue;
        }

        defineContent += trimmedLine;

        // 检测 define 配置结束
        if (trimmedLine === '},') {
          break;
        }
      }
    }

    // 检查是否有激活的API密钥注入
    hasActiveApiKeyInjection =
      (defineContent.includes('process.env.API_KEY') || defineContent.includes('process.env.ZHIPU_API_KEY')) &&
      defineContent.includes('JSON.stringify');

    if (!hasActiveApiKeyInjection) {
      addResult(
        '配置',
        '检查vite.config.ts安全配置',
        true,
        'vite.config.ts没有将API密钥注入前端'
      );
    } else {
      addResult(
        '配置',
        '检查vite.config.ts安全配置',
        false,
        'vite.config.ts仍在将API密钥注入前端(安全隐患)'
      );
    }

    // 检查是否配置了API代理
    const hasApiProxy = content.includes('proxy:') && content.includes('/api');
    addResult(
      '配置',
      '检查vite.config.ts API代理',
      hasApiProxy,
      hasApiProxy ? 'vite.config.ts配置了API代理' : 'vite.config.ts未配置API代理'
    );
  }
};

// 验证5: 检查zhipuService是否移除dangerouslyAllowBrowser
const validateZhipuServiceConfig = () => {
  console.log('\n🔍 验证5: 检查zhipuService配置...');

  const zhipuServicePath = path.join(rootDir, 'services/zhipuService.ts');
  if (!fileExists(zhipuServicePath)) {
    addResult(
      '安全性',
      '检查zhipuService配置',
      false,
      'zhipuService.ts不存在'
    );
    return;
  }

  const content = readFile(zhipuServicePath);

  // 检查是否移除了dangerouslyAllowBrowser
  // 排除注释行
  const lines = content.split('\n');
  const hasActiveDangerouslyAllowBrowser = lines.some(line => {
    const trimmedLine = line.trim();
    // 排除注释
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
      return false;
    }
    // 检查是否包含激活的 dangerouslyAllowBrowser: true
    return trimmedLine.match(/dangerouslyAllowBrowser\s*:\s*true/);
  });

  if (!hasActiveDangerouslyAllowBrowser) {
    addResult(
      '安全性',
      '检查zhipuService移除dangerouslyAllowBrowser',
      true,
      '已正确移除dangerouslyAllowBrowser配置'
    );
  } else {
    addResult(
      '安全性',
      '检查zhipuService移除dangerouslyAllowBrowser',
      false,
      '仍在使用dangerouslyAllowBrowser(安全隐患)'
    );
  }

  // 检查是否有配置验证
  const hasConfigValidation =
    content.includes('validateAIServiceConfig') ||
    content.includes('API密钥');

  if (hasConfigValidation) {
    addResult(
      '安全性',
      '检查zhipuService配置验证',
      true,
      'zhipuService包含配置验证'
    );
  }
};

// 打印结果
const printResults = () => {
  console.log('\n' + '='.repeat(80));
  console.log('📊 验证结果汇总');
  console.log('='.repeat(80));

  const byCategory: Record<string, ValidationResult[]> = {};
  for (const result of results) {
    if (!byCategory[result.category]) {
      byCategory[result.category] = [];
    }
    byCategory[result.category].push(result);
  }

  let totalPassed = 0;
  let totalFailed = 0;

  for (const [category, categoryResults] of Object.entries(byCategory)) {
    console.log(`\n📁 ${category}`);

    for (const result of categoryResults) {
      const icon = result.passed ? '✅' : '❌';
      console.log(`  ${icon} ${result.check}: ${result.message}`);

      if (!result.passed && result.details) {
        console.log(`     详情: ${result.details}`);
      }

      if (result.passed) {
        totalPassed++;
      } else {
        totalFailed++;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`总计: ${totalPassed} 通过, ${totalFailed} 失败`);
  console.log('='.repeat(80));

  if (totalFailed === 0) {
    console.log('\n🎉 所有验证通过!API密钥安全加固已完成。\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  存在安全问题,请检查上述失败项。\n');
    process.exit(1);
  }
};

// 主函数
const main = () => {
  console.log('🔐 API密钥安全加固验证');
  console.log('='.repeat(80));

  validateNoHardcodedKeys();
  validateProxyUsage();
  validateBackendEndpoints();
  validateEnvironmentConfig();
  validateZhipuServiceConfig();

  printResults();
};

main();
