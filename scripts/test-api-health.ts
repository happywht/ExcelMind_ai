/**
 * API健康检查测试脚本
 *
 * 测试Day 2实现的API服务器
 * - 健康检查端点
 * - 数据质量端点
 * - 模板管理端点
 * - 批量生成端点
 */

import http from 'http';

const API_PORT = 3000;
const API_HOST = 'localhost';

async function testAPIHealth() {
  console.log('🧪 测试API健康检查...\n');

  const options = {
    hostname: API_HOST,
    port: API_PORT,
    path: '/health',
    method: 'GET'
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const health = JSON.parse(data);
            console.log('✓ API健康检查通过');
            console.log('响应:', JSON.stringify(health, null, 2));
            resolve(health);
          } catch (error) {
            console.error('✗ 解析响应失败:', error);
            reject(error);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('✗ API请求失败:', error.message);
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('请求超时 (5秒)'));
    });

    req.end();
  });
}

async function testEndpoint(path: string, name: string) {
  console.log(`\n测试端点: ${name} (${path})`);

  const options = {
    hostname: API_HOST,
    port: API_PORT,
    path,
    method: 'GET'
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`✓ ${name}: HTTP ${res.statusCode}`);
      resolve({ statusCode: res.statusCode });
    });

    req.on('error', (error) => {
      console.log(`✗ ${name}: ${error.message}`);
      resolve({ error: error.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`✗ ${name}: 请求超时`);
      resolve({ error: '超时' });
    });

    req.end();
  });
}

async function runAllTests() {
  console.log('========================================');
  console.log('Day 2 API端点测试');
  console.log('========================================\n');

  try {
    await testAPIHealth();
    await testEndpoint('/api/data-quality/analyze', '数据质量分析');
    await testEndpoint('/api/templates', '模板管理');
    await testEndpoint('/api/batch/tasks', '批量任务管理');

    console.log('\n========================================');
    console.log('✅ API测试完成');
    console.log('========================================');
  } catch (error) {
    console.error('\n❌ API测试失败:', error);
    process.exit(1);
  }
}

runAllTests();
