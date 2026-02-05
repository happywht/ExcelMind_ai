/**
 * 多模板文档生成模块 - 快速测试脚本
 *
 * 用于验证核心服务类的实现
 *
 * @version 2.0.0
 */

// ============================================================================
// 导入
// ============================================================================

import {
  TemplateManager,
  BatchGenerationScheduler,
  WebSocketManager,
  DefaultDocumentGenerator,
  GenerationMode,
  Priority,
  TaskStatus
} from './index';

// ============================================================================
// Mock存储服务（用于测试）
// ============================================================================

class MockStorageService {
  private storage = new Map<string, ArrayBuffer>();

  async store(key: string, data: ArrayBuffer): Promise<string> {
    this.storage.set(key, data);
    return `stored://${key}`;
  }

  async retrieve(key: string): Promise<ArrayBuffer> {
    const data = this.storage.get(key);
    if (!data) {
      throw new Error('File not found');
    }
    return data;
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }
}

// ============================================================================
// 测试数据
// ============================================================================

function createTestTemplateBuffer(): ArrayBuffer {
  // 创建一个简单的测试模板
  const content = '合同编号: {{合同编号}}\n甲方: {{甲方名称}}\n乙方: {{乙方名称}}';
  return new TextEncoder().encode(content).buffer;
}

// ============================================================================
// 测试函数
// ============================================================================

/**
 * 测试1: TemplateManager - 创建和获取模板
 */
async function test1_TemplateManager() {
  console.log('\n=== 测试1: TemplateManager ===');

  try {
    const storage = new MockStorageService();
    const templateManager = new TemplateManager(storage);

    // 创建模板
    const template = await templateManager.createTemplate({
      name: '测试合同模板',
      description: '用于测试的合同模板',
      category: '合同',
      tags: ['测试', '合同'],
      fileBuffer: createTestTemplateBuffer(),
      version: '1.0.0'
    });

    console.log('✓ 模板创建成功');
    console.log('  - ID:', template.metadata.id);
    console.log('  - 名称:', template.metadata.name);
    console.log('  - 占位符数量:', template.placeholders.length);
    console.log('  - 复杂度:', template.metadata.complexity);

    // 获取模板
    const retrieved = await templateManager.getTemplate(template.metadata.id);
    console.log('✓ 模板获取成功');
    console.log('  - ID:', retrieved.metadata.id);
    console.log('  - 占位符:', retrieved.placeholders);

    // 验证模板
    const validation = await templateManager.validateTemplate(createTestTemplateBuffer());
    console.log('✓ 模板验证完成');
    console.log('  - 有效:', validation.valid);
    console.log('  - 错误:', validation.errors);
    console.log('  - 警告:', validation.warnings);

    // 提取变量
    const variables = await templateManager.extractVariables(createTestTemplateBuffer());
    console.log('✓ 变量提取成功');
    console.log('  - 变量:', variables);

    return template.metadata.id;
  } catch (error) {
    console.error('✗ 测试失败:', error);
    throw error;
  }
}

/**
 * 测试2: WebSocketManager - 连接和订阅
 */
async function test2_WebSocketManager() {
  console.log('\n=== 测试2: WebSocketManager ===');

  try {
    const wsManager = new WebSocketManager({
      heartbeatInterval: 30000,
      connectionTimeout: 60000
    });

    console.log('✓ WebSocketManager 创建成功');

    // 创建模拟WebSocket连接
    const mockWebSocket = {
      readyState: WebSocket.OPEN,
      send: (data: string) => {
        console.log('  - 发送消息:', data.substring(0, 50) + '...');
      },
      close: () => {
        console.log('  - 连接已关闭');
      },
      onmessage: null,
      onclose: null,
      onerror: null
    } as any;

    // 添加连接
    const connectionId = wsManager.addConnection(mockWebSocket);
    console.log('✓ 连接添加成功');
    console.log('  - 连接ID:', connectionId);

    // 订阅任务
    wsManager.subscribeToTask(connectionId, 'task_test_1');
    console.log('✓ 任务订阅成功');
    console.log('  - 任务ID: task_test_1');

    // 获取统计
    const stats = wsManager.getStats();
    console.log('✓ 统计信息获取成功');
    console.log('  - 总连接数:', stats.totalConnections);
    console.log('  - 总订阅数:', stats.totalSubscriptions);

    // 广播事件
    await wsManager.broadcast('task_test_1', {
      type: 'progress',
      taskId: 'task_test_1',
      progress: 50,
      stage: 'generating_documents' as any,
      message: '测试消息',
      timestamp: Date.now()
    });
    console.log('✓ 事件广播成功');

    return connectionId;
  } catch (error) {
    console.error('✗ 测试失败:', error);
    throw error;
  }
}

/**
 * 测试3: BatchGenerationScheduler - 创建任务
 */
async function test3_BatchGenerationScheduler(templateId: string) {
  console.log('\n=== 测试3: BatchGenerationScheduler ===');

  try {
    const storage = new MockStorageService();
    const templateManager = new TemplateManager(storage);
    const wsManager = new WebSocketManager();
    const documentGenerator = new DefaultDocumentGenerator();

    // 创建模板（如果还没有）
    if (!templateId) {
      const template = await templateManager.createTemplate({
        name: '测试模板',
        fileBuffer: createTestTemplateBuffer(),
        version: '1.0.0'
      });
      templateId = template.metadata.id;
    }

    const scheduler = new BatchGenerationScheduler(
      templateManager,
      documentGenerator,
      wsManager,
      {
        maxConcurrency: 2,
        progressInterval: 500
      }
    );

    console.log('✓ BatchGenerationScheduler 创建成功');

    // 创建任务
    const response = await scheduler.createTask({
      mode: GenerationMode.SINGLE_TEMPLATE,
      templateIds: [templateId],
      dataSource: {
        type: 'inline',
        source: {
          inline: [
            {
              合同编号: 'TEST-001',
              甲方名称: '测试公司A',
              乙方名称: '测试公司B'
            },
            {
              合同编号: 'TEST-002',
              甲方名称: '测试公司C',
              乙方名称: '测试公司D'
            }
          ]
        }
      },
      priority: Priority.NORMAL,
      options: {
        concurrency: 2,
        batchSize: 10,
        continueOnError: true,
        retryCount: 2
      }
    });

    console.log('✓ 任务创建成功');
    console.log('  - 任务ID:', response.taskId);
    console.log('  - 状态:', response.status);
    console.log('  - 预计耗时:', response.estimatedDuration, 'ms');

    // 获取进度
    const progress = await scheduler.getTaskProgress(response.taskId);
    console.log('✓ 进度获取成功');
    console.log('  - 进度:', progress.task.progress, '%');
    console.log('  - 总文档数:', progress.task.execution.totalDocuments);

    return response.taskId;
  } catch (error) {
    console.error('✗ 测试失败:', error);
    throw error;
  }
}

/**
 * 测试4: 集成测试
 */
async function test4_Integration() {
  console.log('\n=== 测试4: 集成测试 ===');

  try {
    const storage = new MockStorageService();
    const templateManager = new TemplateManager(storage);
    const wsManager = new WebSocketManager();
    const documentGenerator = new DefaultDocumentGenerator();
    const scheduler = new BatchGenerationScheduler(
      templateManager,
      documentGenerator,
      wsManager
    );

    console.log('✓ 服务初始化成功');

    // 创建模板
    const template = await templateManager.createTemplate({
      name: '集成测试模板',
      fileBuffer: createTestTemplateBuffer(),
      version: '1.0.0'
    });
    console.log('✓ 模板创建:', template.metadata.id);

    // 添加WebSocket连接
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: () => {},
      close: () => {}
    } as any;
    const connId = wsManager.addConnection(mockWs);
    console.log('✓ WebSocket连接:', connId);

    // 订阅任务
    wsManager.subscribeToTask(connId, 'task_integration_test');
    console.log('✓ 任务订阅');

    console.log('✓ 集成测试通过');
  } catch (error) {
    console.error('✗ 集成测试失败:', error);
    throw error;
  }
}

// ============================================================================
// 主测试运行器
// ============================================================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  多模板文档生成模块 - 快速测试                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results: { name: string; success: boolean; error?: any }[] = [];

  // 测试1: TemplateManager
  try {
    const templateId = await test1_TemplateManager();
    results.push({ name: 'TemplateManager', success: true });

    // 测试2: WebSocketManager
    const connId = await test2_WebSocketManager();
    results.push({ name: 'WebSocketManager', success: true });

    // 测试3: BatchGenerationScheduler
    const taskId = await test3_BatchGenerationScheduler(templateId);
    results.push({ name: 'BatchGenerationScheduler', success: true });

    // 测试4: 集成测试
    await test4_Integration();
    results.push({ name: 'Integration', success: true });

  } catch (error) {
    results.push({ name: 'Tests', success: false, error });
  }

  // 打印结果
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  测试结果                                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  results.forEach(result => {
    if (result.success) {
      console.log(`✓ ${result.name}: 通过`);
    } else {
      console.log(`✗ ${result.name}: 失败`);
      if (result.error) {
        console.log(`  错误:`, result.error.message);
      }
    }
  });

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`\n总计: ${successCount}/${totalCount} 测试通过`);

  if (successCount === totalCount) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查错误信息');
  }
}

// ============================================================================
// 执行测试
// ============================================================================

// 如果直接运行此文件
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n测试完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n测试执行失败:', error);
      process.exit(1);
    });
}

// ============================================================================
// 导出
// ============================================================================

export {
  test1_TemplateManager,
  test2_WebSocketManager,
  test3_BatchGenerationScheduler,
  test4_Integration,
  runAllTests
};
