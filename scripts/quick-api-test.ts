/**
 * 快速 API 测试脚本
 *
 * 用于快速验证 API 服务器是否正常运行
 */

const API_BASE = 'http://localhost:3001/api/v2';
const HEALTH_URL = 'http://localhost:3001/health';

/**
 * 彩色输出
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message: string, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 测试健康检查
 */
async function testHealth() {
  try {
    log('\n🔍 测试健康检查端点...', 'blue');

    const response = await fetch(HEALTH_URL);
    const data = await response.json();

    if (data.status === 'healthy') {
      log('✅ 健康检查通过', 'green');
      log(`   版本: ${data.version}`, 'reset');
      log(`   运行时间: ${Math.floor(data.uptime)}秒`, 'reset');
      return true;
    } else {
      log('❌ 健康检查失败', 'red');
      return false;
    }
  } catch (error) {
    log('❌ 无法连接到服务器', 'red');
    log(`   错误: ${error}`, 'reset');
    return false;
  }
}

/**
 * 测试数据质量分析
 */
async function testDataQuality() {
  try {
    log('\n🔍 测试数据质量分析...', 'blue');

    const response = await fetch(`${API_BASE}/data-quality/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: 'test_file_001',
        sheetName: 'Sheet1',
        options: {
          checkMissingValues: true,
          checkDuplicates: true,
        },
      }),
    });

    const data = await response.json();

    if (data.success && data.data.analysisId) {
      log('✅ 数据质量分析通过', 'green');
      log(`   分析ID: ${data.data.analysisId}`, 'reset');
      log(`   质量分数: ${data.data.summary.qualityScore}`, 'reset');
      log(`   问题数量: ${data.data.issues.length}`, 'reset');
      return true;
    } else {
      log('❌ 数据质量分析失败', 'red');
      log(`   错误: ${JSON.stringify(data.error)}`, 'reset');
      return false;
    }
  } catch (error) {
    log('❌ 数据质量分析出错', 'red');
    log(`   错误: ${error}`, 'reset');
    return false;
  }
}

/**
 * 测试模板列表
 */
async function testTemplates() {
  try {
    log('\n🔍 测试模板列表...', 'blue');

    const response = await fetch(`${API_BASE}/templates?page=1&pageSize=10`);
    const data = await response.json();

    if (data.success && data.data.items) {
      log('✅ 模板列表获取成功', 'green');
      log(`   模板数量: ${data.data.items.length}`, 'reset');
      if (data.data.items.length > 0) {
        log(`   第一个模板: ${data.data.items[0].name}`, 'reset');
      }
      return true;
    } else {
      log('❌ 模板列表获取失败', 'red');
      return false;
    }
  } catch (error) {
    log('❌ 模板列表获取出错', 'red');
    log(`   错误: ${error}`, 'reset');
    return false;
  }
}

/**
 * 测试批量任务创建
 */
async function testBatchGeneration() {
  try {
    log('\n🔍 测试批量任务创建...', 'blue');

    const response = await fetch(`${API_BASE}/generation/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataSourceId: 'test_ds_001',
        templateIds: ['tmpl_001'],
        outputFormat: 'docx',
      }),
    });

    const data = await response.json();

    if (data.success && data.data.taskId) {
      log('✅ 批量任务创建成功', 'green');
      log(`   任务ID: ${data.data.taskId}`, 'reset');
      log(`   状态: ${data.data.status}`, 'reset');
      log(`   预计文档数: ${data.data.estimatedDocumentCount}`, 'reset');
      return true;
    } else {
      log('❌ 批量任务创建失败', 'red');
      return false;
    }
  } catch (error) {
    log('❌ 批量任务创建出错', 'red');
    log(`   错误: ${error}`, 'reset');
    return false;
  }
}

/**
 * 测试 WebSocket 连接
 */
async function testWebSocket() {
  return new Promise<boolean>((resolve) => {
    try {
      log('\n🔍 测试 WebSocket 连接...', 'blue');

      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:3001/api/v2/stream');

      ws.on('open', () => {
        log('✅ WebSocket 连接成功', 'green');

        // 发送订阅消息
        ws.send(
          JSON.stringify({
            action: 'subscribe',
            channels: ['task_progress'],
          })
        );
      });

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'subscribed') {
          log('✅ WebSocket 订阅成功', 'green');
          log(`   订阅频道: ${message.channels.join(', ')}`, 'reset');
          ws.close();
          resolve(true);
        }
      });

      ws.on('error', (error) => {
        log('❌ WebSocket 连接失败', 'red');
        log(`   错误: ${error}`, 'reset');
        resolve(false);
      });

      // 超时处理
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          log('❌ WebSocket 连接超时', 'red');
          ws.close();
          resolve(false);
        }
      }, 5000);
    } catch (error) {
      log('❌ WebSocket 测试出错', 'red');
      log(`   错误: ${error}`, 'reset');
      resolve(false);
    }
  });
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('🚀 ExcelMind AI - API 快速测试');
  console.log('='.repeat(60));

  const results = {
    health: await testHealth(),
    dataQuality: await testDataQuality(),
    templates: await testTemplates(),
    batchGeneration: await testBatchGeneration(),
    websocket: await testWebSocket(),
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));

  const passed = Object.values(results).filter((r) => r).length;
  const total = Object.keys(results).length;

  for (const [test, result] of Object.entries(results)) {
    const status = result ? '✅ 通过' : '❌ 失败';
    const color = result ? 'green' : 'red';
    log(`${test.padEnd(20)} ${status}`, color);
  }

  console.log('='.repeat(60));

  if (passed === total) {
    log(`\n🎉 所有测试通过! (${passed}/${total})`, 'green');
    process.exit(0);
  } else {
    log(`\n⚠️  部分测试失败 (${passed}/${total})`, 'yellow');
    log('请检查服务器是否正常运行', 'reset');
    process.exit(1);
  }
}

// 运行测试
runTests().catch((error) => {
  log('\n❌ 测试运行失败', 'red');
  log(`错误: ${error}`, 'reset');
  process.exit(1);
});
