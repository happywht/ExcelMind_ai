#!/usr/bin/env tsx

/**
 * API快速验证脚本
 *
 * 用于快速验证关键API端点是否正常工作
 */

const BASE_URL = 'http://localhost:3001';
const API_KEY = 'test_dev_key_12345';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  error?: string;
}

const results: TestResult[] = [];

async function quickTest(
  name: string,
  method: string,
  endpoint: string,
  body?: any
): Promise<TestResult> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const statusCode = response.status;

    const result: TestResult = {
      name,
      status: statusCode >= 200 && statusCode < 300 ? 'PASS' : 'FAIL',
      statusCode,
    };

    if (result.status === 'FAIL') {
      result.error = `HTTP ${statusCode}`;
    }

    results.push(result);

    console.log(`${result.status === 'PASS' ? '✅' : '❌'} ${name}: ${statusCode}`);

    return result;
  } catch (error) {
    const result: TestResult = {
      name,
      status: 'FAIL',
      error: error instanceof Error ? error.message : String(error),
    };

    results.push(result);
    console.log(`❌ ${name}: ${result.error}`);

    return result;
  }
}

async function main() {
  console.log('🚀 API快速验证测试');
  console.log('====================\n');

  // 关键端点测试
  await quickTest('健康检查', 'GET', '/health');
  await quickTest('数据质量统计', 'GET', '/api/v2/data-quality/statistics');
  await quickTest('模板列表', 'GET', '/api/v2/templates');
  await quickTest('任务列表', 'GET', '/api/v2/generation/tasks');
  await quickTest('审计规则列表', 'GET', '/api/v2/audit/rules');

  // POST端点测试
  await quickTest(
    '数据质量分析',
    'POST',
    '/api/v2/data-quality/analyze',
    { data: [{ name: 'Test', age: 25 }] }
  );

  await quickTest(
    '创建模板',
    'POST',
    '/api/v2/templates',
    { name: '测试模板', description: '测试' }
  );

  await quickTest(
    '创建批量任务',
    'POST',
    '/api/v2/generation/tasks',
    { templateId: 'test', dataSource: 'test' }
  );

  // 认证测试
  console.log('\n🔐 认证测试');
  console.log('--------------------');

  try {
    const response = await fetch(`${BASE_URL}/api/v2/data-quality/statistics`, {
      headers: {
        'X-API-Key': 'invalid_key',
      },
    });

    const authTest: TestResult = {
      name: '无效API密钥',
      status: response.status === 401 ? 'PASS' : 'FAIL',
      statusCode: response.status,
    };

    results.push(authTest);
    console.log(`${authTest.status === 'PASS' ? '✅' : '❌'} 无效API密钥: ${response.status} (期望401)`);
  } catch (error) {
    console.log(`❌ 无效API密钥测试失败`);
  }

  // 汇总结果
  console.log('\n📊 测试结果汇总');
  console.log('====================');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`通过: ${passed}/${total} (${passRate}%)`);

  if (passed === total) {
    console.log('\n✅ 所有测试通过！API工作正常。');
    process.exit(0);
  } else {
    console.log('\n❌ 部分测试失败，请检查API配置。');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`   - ${r.name}: ${r.error || r.statusCode}`);
      });
    process.exit(1);
  }
}

main();
