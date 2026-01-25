/**
 * API认证测试脚本
 *
 * 验证API认证中间件是否正常工作
 */

const API_BASE_URL = 'http://localhost:3000';
const TEST_API_KEY = 'test-key-123';
const INVALID_API_KEY = 'invalid-key';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  response?: any;
}

const results: TestResult[] = [];

/**
 * 执行测试请求
 */
async function testRequest(
  name: string,
  url: string,
  options: RequestInit,
  expectedStatus: number
): Promise<TestResult> {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, options);
    const status = response.status;
    const responseText = await response.text();

    const passed = status === expectedStatus;
    const message = passed
      ? `✓ ${name}: 预期状态 ${expectedStatus}, 实际 ${status}`
      : `✗ ${name}: 预期状态 ${expectedStatus}, 实际 ${status}`;

    const result: TestResult = {
      name,
      passed,
      message,
      response: {
        status,
        body: responseText,
      },
    };

    results.push(result);
    console.log(message);

    if (!passed && responseText) {
      console.log(`  响应: ${responseText}`);
    }

    return result;
  } catch (error) {
    const errorMessage = `✗ ${name}: 请求失败 - ${error}`;
    console.error(errorMessage);

    const result: TestResult = {
      name,
      passed: false,
      message: errorMessage,
    };

    results.push(result);
    return result;
  }
}

/**
 * 运行认证测试
 */
async function runAuthTests(): Promise<void> {
  console.log('🔐 API认证测试开始\n');
  console.log(`目标API: ${API_BASE_URL}`);
  console.log(`测试API密钥: ${TEST_API_KEY}\n`);

  // 测试1: 无API密钥请求（应返回401）
  console.log('测试1: 无API密钥请求');
  await testRequest(
    '无API密钥访问 /api/v2/data-quality/statistics',
    '/api/v2/data-quality/statistics',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    401
  );
  console.log();

  // 测试2: 有效API密钥请求（应返回200或404-端点不存在）
  console.log('测试2: 有效API密钥请求');
  await testRequest(
    '有效API密钥访问 /api/v2/data-quality/statistics',
    '/api/v2/data-quality/statistics',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
    },
    200 // 或者404，取决于端点是否存在
  );
  console.log();

  // 测试3: 无效API密钥请求（应返回401）
  console.log('测试3: 无效API密钥请求');
  await testRequest(
    '无效API密钥访问 /api/v2/data-quality/statistics',
    '/api/v2/data-quality/statistics',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': INVALID_API_KEY,
      },
    },
    401
  );
  console.log();

  // 测试4: Bearer Token格式（应返回200或404）
  console.log('测试4: Bearer Token格式');
  await testRequest(
    'Bearer Token格式访问 /api/v2/data-quality/statistics',
    '/api/v2/data-quality/statistics',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_API_KEY}`,
      },
    },
    200
  );
  console.log();

  // 测试5: Authorization头部直接格式（应返回200或404）
  console.log('测试5: Authorization头部直接格式');
  await testRequest(
    'Authorization头部直接格式访问 /api/v2/data-quality/statistics',
    '/api/v2/data-quality/statistics',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TEST_API_KEY,
      },
    },
    200
  );
  console.log();

  // 测试6: 查询参数格式（应返回200或404，但不推荐）
  console.log('测试6: 查询参数API密钥（不推荐）');
  await testRequest(
    '查询参数API密钥访问 /api/v2/data-quality/statistics',
    '/api/v2/data-quality/statistics?api_key=' + TEST_API_KEY,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    200
  );
  console.log();
}

/**
 * 打印测试总结
 */
function printSummary(): void {
  console.log('\n📊 测试总结\n');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  results.forEach(result => {
    const icon = result.passed ? '✓' : '✗';
    console.log(`${icon} ${result.name}: ${result.passed ? '通过' : '失败'}`);
  });

  console.log('='.repeat(60));
  console.log(`总计: ${passed}/${total} 通过 (${percentage}%)`);

  if (passed === total) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查认证配置');
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    await runAuthTests();
    printSummary();
  } catch (error) {
    console.error('测试执行失败:', error);
    process.exit(1);
  }
}

// 运行测试
main();
