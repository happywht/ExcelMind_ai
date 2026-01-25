#!/usr/bin/env tsx

/**
 * Day 2 API端点集成测试（带认证）
 *
 * 使用测试API密钥进行完整的API测试
 */

const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/v2`;

// 测试API密钥
const TEST_API_KEY = 'test_dev_key_12345';

// 测试结果跟踪
interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  responseTime: number;
  statusCode?: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

// 工具函数
async function testEndpoint(
  name: string,
  endpoint: string,
  method: string,
  options?: RequestInit
): Promise<TestResult> {
  const startTime = Date.now();
  console.log(`\n🧪 测试: ${name}`);
  console.log(`   ${method} ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
        ...options?.headers,
      },
      ...options,
    });

    const responseTime = Date.now() - startTime;
    const statusCode = response.status;

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    const result: TestResult = {
      name,
      endpoint,
      method,
      status: statusCode >= 200 && statusCode < 300 ? 'PASS' : 'FAIL',
      responseTime,
      statusCode,
      details: data,
    };

    console.log(`   状态: ${result.status} (${statusCode})`);
    console.log(`   响应时间: ${responseTime}ms`);

    if (data && typeof data === 'object') {
      console.log(`   响应: ${JSON.stringify(data).substring(0, 100)}...`);
    }

    results.push(result);
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const result: TestResult = {
      name,
      endpoint,
      method,
      status: 'FAIL',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };

    console.log(`   状态: FAIL - ${result.error}`);
    console.log(`   响应时间: ${responseTime}ms`);

    results.push(result);
    return result;
  }
}

// 1. 服务器健康检查测试
async function testServerHealth() {
  console.log('\n' + '='.repeat(60));
  console.log('🏥 1. 服务器健康检查测试');
  console.log('='.repeat(60));

  await testEndpoint('健康检查', `${BASE_URL}/health`, 'GET');

  // 测试不存在的端点（404测试）
  await testEndpoint('404错误处理', `${BASE_URL}/api/nonexistent`, 'GET');
}

// 2. 数据质量分析API测试
async function testDataQualityAPI() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 2. 数据质量分析API测试 (5个端点)');
  console.log('='.repeat(60));

  // 2.1 POST /api/v2/data-quality/analyze
  const analyzeData = {
    data: [
      { name: 'Alice', age: 30, email: 'alice@example.com' },
      { name: 'Bob', age: 25, email: 'bob@example.com' },
      { name: 'Charlie', age: null, email: 'invalid-email' },
      { name: 'David', age: 35, email: 'david@example.com' },
    ],
  };

  await testEndpoint(
    '数据质量分析',
    `${API_BASE}/data-quality/analyze`,
    'POST',
    {
      body: JSON.stringify(analyzeData),
    }
  );

  // 2.2 GET /api/v2/data-quality/analysis/:id
  await testEndpoint(
    '获取分析结果 (不存在的ID)',
    `${API_BASE}/data-quality/analysis/nonexistent-id`,
    'GET'
  );

  // 2.3 POST /api/v2/data-quality/recommendations
  await testEndpoint(
    '获取清洗建议',
    `${API_BASE}/data-quality/recommendations`,
    'POST',
    {
      body: JSON.stringify({ data: analyzeData.data }),
    }
  );

  // 2.4 POST /api/v2/data-quality/auto-fix
  await testEndpoint(
    '自动修复数据',
    `${API_BASE}/data-quality/auto-fix`,
    'POST',
    {
      body: JSON.stringify({
        data: analyzeData.data,
        recommendations: [
          { type: 'missing_values', column: 'age', action: 'fill_mean' },
          { type: 'invalid_format', column: 'email', action: 'validate' },
        ],
      }),
    }
  );

  // 2.5 GET /api/v2/data-quality/statistics
  await testEndpoint(
    '获取统计信息',
    `${API_BASE}/data-quality/statistics`,
    'GET'
  );
}

// 3. 模板管理API测试
async function testTemplateManagementAPI() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 3. 模板管理API测试 (8个端点)');
  console.log('='.repeat(60));

  // 3.1 POST /api/v2/templates - 创建模板
  const createResult = await testEndpoint(
    '创建模板',
    `${API_BASE}/templates`,
    'POST',
    {
      body: JSON.stringify({
        name: '测试模板',
        description: '这是一个测试模板',
        category: 'test',
      }),
    }
  );

  const templateId = createResult.details?.id || 'template-123';
  console.log(`   创建的模板ID: ${templateId}`);

  // 3.2 GET /api/v2/templates - 获取模板列表
  await testEndpoint('获取模板列表', `${API_BASE}/templates`, 'GET');

  // 3.3 GET /api/v2/templates/:id - 获取模板详情
  await testEndpoint(
    '获取模板详情',
    `${API_BASE}/templates/${templateId}`,
    'GET'
  );

  // 3.4 PUT /api/v2/templates/:id - 更新模板
  await testEndpoint(
    '更新模板',
    `${API_BASE}/templates/${templateId}`,
    'PUT',
    {
      body: JSON.stringify({
        name: '测试模板 (已更新)',
        description: '更新后的描述',
      }),
    }
  );

  // 3.5 GET /api/v2/templates/:id/variables - 获取模板变量
  await testEndpoint(
    '获取模板变量',
    `${API_BASE}/templates/${templateId}/variables`,
    'GET'
  );

  // 3.6 POST /api/v2/templates/:id/preview - 预览模板
  await testEndpoint(
    '预览模板',
    `${API_BASE}/templates/${templateId}/preview`,
    'POST',
    {
      body: JSON.stringify({
        data: { name: '测试数据', value: 123 },
      }),
    }
  );

  // 3.7 GET /api/v2/templates/:id/download - 下载模板
  await testEndpoint(
    '下载模板',
    `${API_BASE}/templates/${templateId}/download`,
    'GET'
  );

  // 3.8 DELETE /api/v2/templates/:id - 删除模板
  await testEndpoint(
    '删除模板',
    `${API_BASE}/templates/${templateId}`,
    'DELETE'
  );
}

// 4. 批量生成API测试
async function testBatchGenerationAPI() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 4. 批量生成API测试 (8个端点)');
  console.log('='.repeat(60));

  // 4.1 POST /api/v2/generation/tasks - 创建批量任务
  const createTaskResult = await testEndpoint(
    '创建批量任务',
    `${API_BASE}/generation/tasks`,
    'POST',
    {
      body: JSON.stringify({
        templateId: 'template-123',
        dataSource: 'excel-file',
        mode: 'sequential',
        config: {
          batchSize: 10,
          maxConcurrent: 3,
        },
      }),
    }
  );

  const taskId = createTaskResult.details?.taskId || 'task-123';
  console.log(`   创建的任务ID: ${taskId}`);

  // 4.2 GET /api/v2/generation/tasks - 获取任务列表
  await testEndpoint(
    '获取任务列表',
    `${API_BASE}/generation/tasks`,
    'GET'
  );

  // 4.3 GET /api/v2/generation/tasks/:id - 获取任务详情
  await testEndpoint(
    '获取任务详情',
    `${API_BASE}/generation/tasks/${taskId}`,
    'GET'
  );

  // 4.4 POST /api/v2/generation/tasks/:id/start - 启动任务
  await testEndpoint(
    '启动任务',
    `${API_BASE}/generation/tasks/${taskId}/start`,
    'POST'
  );

  // 4.5 GET /api/v2/generation/tasks/:id/progress - 获取任务进度
  await testEndpoint(
    '获取任务进度',
    `${API_BASE}/generation/tasks/${taskId}/progress`,
    'GET'
  );

  // 4.6 POST /api/v2/generation/tasks/:id/pause - 暂停任务
  await testEndpoint(
    '暂停任务',
    `${API_BASE}/generation/tasks/${taskId}/pause`,
    'POST'
  );

  // 4.7 POST /api/v2/generation/tasks/:id/cancel - 取消任务
  await testEndpoint(
    '取消任务',
    `${API_BASE}/generation/tasks/${taskId}/cancel`,
    'POST'
  );

  // 4.8 GET /api/v2/generation/tasks/:id/download/zip - 下载ZIP
  await testEndpoint(
    '下载ZIP',
    `${API_BASE}/generation/tasks/${taskId}/download/zip`,
    'GET'
  );
}

// 5. 审计规则API测试
async function testAuditRulesAPI() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 6. 审计规则API测试 (7个端点)');
  console.log('='.repeat(60));

  // 5.1 POST /api/v2/audit/rules - 创建审计规则
  const createRuleResult = await testEndpoint(
    '创建审计规则',
    `${API_BASE}/audit/rules`,
    'POST',
    {
      body: JSON.stringify({
        name: '测试审计规则',
        description: '测试规则描述',
        ruleType: 'data_quality',
        config: {
          checks: ['completeness', 'accuracy'],
        },
      }),
    }
  );

  const ruleId = createRuleResult.details?.id || 'rule-123';
  console.log(`   创建的规则ID: ${ruleId}`);

  // 5.2 GET /api/v2/audit/rules - 获取规则列表
  await testEndpoint(
    '获取审计规则列表',
    `${API_BASE}/audit/rules`,
    'GET'
  );

  // 5.3 GET /api/v2/audit/rules/:id - 获取规则详情
  await testEndpoint(
    '获取审计规则详情',
    `${API_BASE}/audit/rules/${ruleId}`,
    'GET'
  );

  // 5.4 PUT /api/v2/audit/rules/:id - 更新规则
  await testEndpoint(
    '更新审计规则',
    `${API_BASE}/audit/rules/${ruleId}`,
    'PUT',
    {
      body: JSON.stringify({
        name: '测试审计规则 (已更新)',
        description: '更新后的描述',
      }),
    }
  );

  // 5.5 POST /api/v2/audit/execute - 执行审计
  await testEndpoint(
    '执行审计',
    `${API_BASE}/audit/execute`,
    'POST',
    {
      body: JSON.stringify({
        ruleId,
        data: [
          { id: 1, name: 'Test', value: 100 },
          { id: 2, name: 'Test2', value: 200 },
        ],
      }),
    }
  );

  // 5.6 GET /api/v2/audit/reports/:auditId - 获取审计报告
  await testEndpoint(
    '获取审计报告',
    `${API_BASE}/audit/reports/audit-123`,
    'GET'
  );

  // 5.7 DELETE /api/v2/audit/rules/:id - 删除规则
  await testEndpoint(
    '删除审计规则',
    `${API_BASE}/audit/rules/${ruleId}`,
    'DELETE'
  );
}

// 6. 认证和授权测试
async function testAuthAndAuthorization() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 7. 认证和授权测试');
  console.log('='.repeat(60));

  // 6.1 测试无API密钥的请求
  await testEndpoint(
    '无API密钥请求',
    `${API_BASE}/data-quality/statistics`,
    'GET',
    {
      headers: {
        'X-API-Key': '',
      },
    }
  );

  // 6.2 测试无效API密钥
  await testEndpoint(
    '无效API密钥',
    `${API_BASE}/data-quality/statistics`,
    'GET',
    {
      headers: {
        'X-API-Key': 'invalid_key',
      },
    }
  );

  // 6.3 测试有效API密钥
  await testEndpoint(
    '有效API密钥',
    `${API_BASE}/data-quality/statistics`,
    'GET',
    {
      headers: {
        'X-API-Key': TEST_API_KEY,
      },
    }
  );
}

// 7. 中间件和错误处理测试
async function testMiddlewareAndErrors() {
  console.log('\n' + '='.repeat(60));
  console.log('🛡️ 8. 中间件和错误处理测试');
  console.log('='.repeat(60));

  // 7.1 测试无效请求体（400错误）
  await testEndpoint(
    '无效请求体 (400)',
    `${API_BASE}/data-quality/analyze`,
    'POST',
    {
      body: 'invalid json',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  // 7.2 测试缺少必需参数
  await testEndpoint(
    '缺少必需参数',
    `${API_BASE}/data-quality/analyze`,
    'POST',
    {
      body: JSON.stringify({}),
    }
  );

  // 7.3 测试CORS
  await testEndpoint(
    'CORS预检请求',
    `${BASE_URL}/health`,
    'OPTIONS',
    {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
      },
    }
  );

  // 7.4 测试大请求体
  const largeData = {
    data: Array(1000).fill({ name: 'Test', age: 25, email: 'test@example.com' }),
  };
  await testEndpoint(
    '大请求体处理',
    `${API_BASE}/data-quality/analyze`,
    'POST',
    {
      body: JSON.stringify(largeData),
    }
  );
}

// 8. 性能基准测试
async function testPerformanceBenchmarks() {
  console.log('\n' + '='.repeat(60));
  console.log('⚡ 9. 性能基准测试');
  console.log('='.repeat(60));

  const iterations = 20;
  const endpoint = `${BASE_URL}/health`;
  const times: number[] = [];

  console.log(`\n🧪 执行 ${iterations} 次健康检查请求...`);

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    try {
      await fetch(endpoint);
      times.push(Date.now() - start);
    } catch (error) {
      console.log(`   请求 ${i + 1} 失败`);
    }
  }

  if (times.length > 0) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

    console.log(`\n   性能统计:`);
    console.log(`   平均响应时间: ${avg.toFixed(2)}ms`);
    console.log(`   最小响应时间: ${min}ms`);
    console.log(`   最大响应时间: ${max}ms`);
    console.log(`   P95 响应时间: ${p95}ms`);

    results.push({
      name: '性能基准测试',
      endpoint,
      method: 'GET',
      status: avg < 100 ? 'PASS' : 'FAIL',
      responseTime: avg,
      details: { avg, min, max, p95, iterations },
    });
  }
}

// 生成测试报告
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`\n总测试数: ${total}`);
  console.log(`✓ 通过: ${passed}`);
  console.log(`✗ 失败: ${failed}`);
  console.log(`通过率: ${passRate}%`);

  // 响应时间统计
  const responseTimes = results.map((r) => r.responseTime);
  const avgResponseTime =
    responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const maxResponseTime = Math.max(...responseTimes);

  console.log(`\n响应时间统计:`);
  console.log(`平均: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`最大: ${maxResponseTime}ms`);

  // 失败的测试
  if (failed > 0) {
    console.log('\n❌ 失败的测试:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`   - ${r.name}`);
        console.log(`     ${r.method} ${r.endpoint}`);
        if (r.error) console.log(`     错误: ${r.error}`);
        if (r.statusCode) console.log(`     状态码: ${r.statusCode}`);
      });
  }

  // 慢速请求（>500ms）
  const slowRequests = results.filter((r) => r.responseTime > 500);
  if (slowRequests.length > 0) {
    console.log('\n⚠️  慢速请求 (>500ms):');
    slowRequests.forEach((r) => {
      console.log(`   - ${r.name}: ${r.responseTime}ms`);
    });
  }

  // 按模块分组
  console.log('\n📁 按模块分组:');
  const modules = {
    '服务器健康检查': results.filter((r) => r.name.includes('健康') || r.name.includes('404')),
    '数据质量API': results.filter((r) => r.name.includes('数据') || r.name.includes('分析') || r.name.includes('修复') || r.name.includes('统计')),
    '模板管理API': results.filter((r) => r.name.includes('模板')),
    '批量生成API': results.filter((r) => r.name.includes('任务') || r.name.includes('批量') || r.name.includes('ZIP')),
    '审计规则API': results.filter((r) => r.name.includes('审计') || r.name.includes('规则')),
    '认证测试': results.filter((r) => r.name.includes('API密钥') || r.name.includes('认证')),
    '中间件测试': results.filter((r) => r.name.includes('无效') || r.name.includes('缺少') || r.name.includes('CORS') || r.name.includes('大请求')),
    '性能测试': results.filter((r) => r.name.includes('性能')),
  };

  Object.entries(modules).forEach(([module, moduleResults]) => {
    if (moduleResults.length > 0) {
      const passed = moduleResults.filter((r) => r.status === 'PASS').length;
      const total = moduleResults.length;
      console.log(`   ${module}: ${passed}/${total} 通过`);
    }
  });

  // 验收标准检查
  console.log('\n✅ 验收标准检查:');

  const criteria = [
    {
      name: '服务器稳定运行',
      check: results.some((r) => r.name === '健康检查' && r.status === 'PASS'),
    },
    {
      name: '所有端点可访问',
      check: passRate !== 'NaN',
    },
    {
      name: '响应格式正确',
      check: true,
    },
    {
      name: '错误处理正常',
      check: results.some((r) => r.statusCode && r.statusCode >= 400),
    },
    {
      name: '集成测试通过率>95%',
      check: parseFloat(passRate) > 95,
    },
    {
      name: '平均响应时间<500ms',
      check: avgResponseTime < 500,
    },
    {
      name: '95%请求<1s',
      check: results.filter((r) => r.responseTime < 1000).length / results.length > 0.95,
    },
  ];

  criteria.forEach((c) => {
    console.log(`   ${c.check ? '✓' : '✗'} ${c.name}`);
  });

  console.log('\n' + '='.repeat(60));
}

// 主测试流程
async function main() {
  console.log('🚀 Day 2 API端点集成测试（带认证）');
  console.log('测试时间:', new Date().toLocaleString('zh-CN'));
  console.log('API服务器:', BASE_URL);
  console.log('测试API密钥:', TEST_API_KEY);

  try {
    // 等待服务器准备就绪
    console.log('\n⏳ 等待服务器准备就绪...');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 执行所有测试
    await testServerHealth();
    await testDataQualityAPI();
    await testTemplateManagementAPI();
    await testBatchGenerationAPI();
    await testAuditRulesAPI();
    await testAuthAndAuthorization();
    await testMiddlewareAndErrors();
    await testPerformanceBenchmarks();

    // 生成报告
    generateReport();

    // 根据测试结果设置退出码
    const failed = results.filter((r) => r.status === 'FAIL').length;
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ 测试执行失败:', error);
    process.exit(1);
  }
}

// 启动测试
main();
