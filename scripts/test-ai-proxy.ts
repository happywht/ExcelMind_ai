/**
 * AI代理功能测试脚本
 *
 * 验证后端AI代理是否正常工作
 * 测试所有7个AI功能模块
 */

import { logger } from '../src/utils/logger';

const API_BASE_URL = 'http://localhost:3001';
const API_PREFIX = '/api/v2';

/**
 * 通用API请求函数
 */
async function apiRequest(endpoint: string, data: any): Promise<any> {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;

  logger.info(`\n🔄 测试: ${endpoint}`);
  logger.debug(`   URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // 测试令牌
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error(`   ❌ 失败 (${response.status}):`, result.error?.message || response.statusText);
      return { success: false, error: result };
    }

    if (!result.success) {
      logger.error(`   ❌ API错误:`, result.error?.message || '未知错误');
      return { success: false, error: result };
    }

    logger.info(`   ✅ 成功`);
    return result;

  } catch (error) {
    logger.error(`   ❌ 网络错误:`, error instanceof Error ? error.message : error);
    return { success: false, error };
  }
}

/**
 * 测试1: Excel公式生成
 */
async function test1_GenerateExcelFormula() {
  logger.info('\n' + '='.repeat(60));
  logger.info('测试1: Excel公式生成器');
  logger.info('='.repeat(60));

  const result = await apiRequest('/ai/generate-formula', {
    description: '如果A1大于100，返回"高"，否则返回"低"'
  });

  if (result.success && result.data?.formula) {
    logger.info('   生成的公式:', result.data.formula);
    return true;
  }

  return false;
}

/**
 * 测试2: 数据处理代码生成
 */
async function test2_GenerateDataProcessingCode() {
  logger.info('\n' + '='.repeat(60));
  logger.info('测试2: 智能数据处理代码生成');
  logger.info('='.repeat(60));

  const result = await apiRequest('/ai/generate-data-code', {
    prompt: '过滤出金额大于1000的记录',
    context: [{
      fileName: 'test.xlsx',
      headers: ['ID', 'Name', 'Amount', 'Date'],
      sampleRows: [
        { ID: 1, Name: 'Alice', Amount: 1500, Date: '2024-01-01' },
        { ID: 2, Name: 'Bob', Amount: 800, Date: '2024-01-02' }
      ]
    }]
  });

  if (result.success && result.data?.code) {
    logger.info('   生成的代码长度:', result.data.code.length);
    logger.info('   解释:', result.data.explanation?.substring(0, 100) + '...');
    return true;
  }

  return false;
}

/**
 * 测试3: 知识库对话
 */
async function test3_ChatWithKnowledgeBase() {
  logger.info('\n' + '='.repeat(60));
  logger.info('测试3: 审计助手知识库对话');
  logger.info('='.repeat(60));

  const result = await apiRequest('/ai/chat', {
    query: '什么是审计轨迹？',
    history: [],
    contextDocs: '审计轨迹是记录所有数据操作的日志...'
  });

  if (result.success && result.data?.response) {
    logger.info('   AI回复长度:', result.data.response.length);
    return true;
  }

  return false;
}

/**
 * 测试4: 数据质量分析
 */
async function test4_DataQualityAnalyze() {
  logger.info('\n' + '='.repeat(60));
  logger.info('测试4: 数据质量分析');
  logger.info('='.repeat(60));

  const url = `${API_BASE_URL}${API_PREFIX}/data-quality/analyze`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        data: [
          { id: 1, name: 'Alice', age: 30 },
          { id: 2, name: '', age: null },
          { id: 3, name: 'Bob', age: 25 }
        ],
        options: {
          checkMissing: true,
          checkDuplicates: true,
          checkOutliers: true
        }
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      logger.info('   ✅ 成功');
      logger.debug('   分析结果:', JSON.stringify(result.data).substring(0, 100) + '...');
      return true;
    } else {
      logger.error(`   ❌ 失败:`, result.error?.message || '未知错误');
      return false;
    }
  } catch (error) {
    logger.error(`   ❌ 网络错误:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * 测试5: 模板管理
 */
async function test5_TemplateManagement() {
  logger.info('\n' + '='.repeat(60));
  logger.info('测试5: 模板管理（获取模板列表）');
  logger.info('='.repeat(60));

  const url = `${API_BASE_URL}${API_PREFIX}/templates`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    const result = await response.json();

    if (response.ok && result.success) {
      logger.info('   ✅ 成功');
      logger.debug('   模板数量:', result.data?.length || 0);
      return true;
    } else {
      logger.error(`   ❌ 失败:`, result.error?.message || '未知错误');
      return false;
    }
  } catch (error) {
    logger.error(`   ❌ 网络错误:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * 测试6: 批量生成任务
 */
async function test6_BatchGeneration() {
  logger.info('\n' + '='.repeat(60));
  logger.info('测试6: 批量生成任务（获取任务列表）');
  logger.info('='.repeat(60));

  const url = `${API_BASE_URL}${API_PREFIX}/generation/tasks`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    const result = await response.json();

    if (response.ok && result.success) {
      logger.info('   ✅ 成功');
      logger.debug('   任务数量:', result.data?.length || 0);
      return true;
    } else {
      logger.error(`   ❌ 失败:`, result.error?.message || '未知错误');
      return false;
    }
  } catch (error) {
    logger.error(`   ❌ 网络错误:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * 测试7: 审计规则
 */
async function test7_AuditRules() {
  logger.info('\n' + '='.repeat(60));
  logger.info('测试7: 审计规则（获取规则列表）');
  logger.info('='.repeat(60));

  const url = `${API_BASE_URL}${API_PREFIX}/audit/rules`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    const result = await response.json();

    if (response.ok && result.success) {
      logger.info('   ✅ 成功');
      logger.debug('   规则数量:', result.data?.length || 0);
      return true;
    } else {
      logger.error(`   ❌ 失败:`, result.error?.message || '未知错误');
      return false;
    }
  } catch (error) {
    logger.error(`   ❌ 网络错误:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  logger.info('\n' + '█'.repeat(60));
  logger.info('█' + ' '.repeat(58) + '█');
  logger.info('█' + '  ExcelMind AI - 后端AI代理功能测试'.center(58) + '█');
  logger.info('█' + ' '.repeat(58) + '█');
  logger.info('█'.repeat(60));

  logger.info(`\n📡 测试目标: ${API_BASE_URL}`);
  logger.info(`🔧 API前缀: ${API_PREFIX}`);

  // 首先检查服务器健康状态
  logger.info('\n' + '='.repeat(60));
  logger.info('步骤0: 检查服务器健康状态');
  logger.info('='.repeat(60));

  try {
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      logger.info('✅ 服务器运行正常');
      logger.debug(`   版本: ${health.version}`);
      logger.debug(`   运行时间: ${Math.floor(health.uptime)}秒`);
    } else {
      logger.error('❌ 服务器未响应');
      logger.error('\n⚠️  请先启动API服务器:');
      logger.error('   npm run dev:api');
      process.exit(1);
    }
  } catch (error) {
    logger.error('❌ 无法连接到服务器');
    logger.error('\n⚠️  请先启动API服务器:');
    logger.error('   npm run dev:api');
    process.exit(1);
  }

  // 运行所有测试
  const results = {
    test1: await test1_GenerateExcelFormula(),
    test2: await test2_GenerateDataProcessingCode(),
    test3: await test3_ChatWithKnowledgeBase(),
    test4: await test4_DataQualityAnalyze(),
    test5: await test5_TemplateManagement(),
    test6: await test6_BatchGeneration(),
    test7: await test7_AuditRules()
  };

  // 统计结果
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  // 打印总结
  logger.info('\n' + '█'.repeat(60));
  logger.info('█' + ' '.repeat(58) + '█');
  logger.info('█' + '  测试结果总结'.center(58) + '█');
  logger.info('█' + ' '.repeat(58) + '█');
  logger.info('█'.repeat(60));

  logger.info(`\n✅ 通过: ${passed}/${total}`);
  logger.info(`❌ 失败: ${total - passed}/${total}`);

  logger.info('\n详细结果:');
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ 通过' : '❌ 失败';
    logger.info(`  ${test}: ${status}`);
  });

  if (passed === total) {
    logger.info('\n🎉 所有测试通过！后端AI代理系统运行正常！');
    process.exit(0);
  } else {
    logger.info('\n⚠️  部分测试失败，请检查日志');
    process.exit(1);
  }
}

// 扩展String原型用于居中
declare global {
  interface String {
    center(width: number): string;
  }
}

String.prototype.center = function(width: number): string {
  const padding = Math.max(0, width - this.length);
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return ' '.repeat(left) + this + ' '.repeat(right);
};

// 运行测试
runTests().catch(error => {
  logger.error('\n❌ 测试运行失败:', error);
  process.exit(1);
});
