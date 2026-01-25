/**
 * 批量文档生成API测试脚本
 *
 * 用于测试批量文档生成的完整流程
 *
 * @version 2.0.0
 */

import fetch from 'node-fetch';
import { createReadStream, readFileSync } from 'fs';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';

// ============================================================================
// 配置
// ============================================================================

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v2';
const WS_BASE_URL = process.env.WS_BASE_URL || 'ws://localhost:3001/v2/stream';

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 发送HTTP请求
 */
async function request(
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<any> {
  const url = `${API_BASE_URL}${path}`;
  const options: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`[API] ${method} ${url}`);
  if (body) {
    console.log(`[API] Body:`, JSON.stringify(body, null, 2));
  }

  const response = await fetch(url, options);
  const data = await response.json();

  console.log(`[API] Response:`, JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(data.error?.message || '请求失败');
  }

  return data;
}

// ============================================================================
// 测试用例
// ============================================================================

/**
 * 测试健康检查
 */
async function testHealthCheck(): Promise<void> {
  console.log('\n========================================');
  console.log('测试: 健康检查');
  console.log('========================================');

  const result = await request('GET', '/health');
  console.log('健康状态:', result.status);
  console.log('服务状态:', result.services);
}

/**
 * 测试创建批量任务
 */
async function testCreateTask(): Promise<string> {
  console.log('\n========================================');
  console.log('测试: 创建批量任务');
  console.log('========================================');

  const taskRequest = {
    dataSourceId: 'test-ds-001',
    templateIds: ['template-001', 'template-002'],
    outputFormat: 'docx',
    mode: 'sequential',
    data: [
      {
        name: '张三',
        age: 30,
        email: 'zhangsan@example.com',
      },
      {
        name: '李四',
        age: 25,
        email: 'lisi@example.com',
      },
      {
        name: '王五',
        age: 35,
        email: 'wangwu@example.com',
      },
    ],
    options: {
      batchSize: 10,
      parallelProcessing: false,
      createZip: true,
    },
  };

  const result = await request('POST', '/batch/tasks', taskRequest);
  console.log('任务ID:', result.data.taskId);
  console.log('状态:', result.data.status);
  console.log('预计时间:', result.data.estimatedTime, 'ms');
  console.log('WebSocket URL:', result.data.websocketUrl);

  return result.data.taskId;
}

/**
 * 测试启动任务
 */
async function testStartTask(taskId: string): Promise<void> {
  console.log('\n========================================');
  console.log('测试: 启动任务');
  console.log('========================================');

  const result = await request('POST', `/batch/tasks/${taskId}/start`);
  console.log('任务状态:', result.data.status);
  console.log('启动时间:', result.data.startedAt);
}

/**
 * 测试获取任务进度
 */
async function testGetProgress(taskId: string): Promise<void> {
  console.log('\n========================================');
  console.log('测试: 获取任务进度');
  console.log('========================================');

  const result = await request('GET', `/batch/tasks/${taskId}/progress`);
  console.log('任务进度:', result.data.progress, '%');
  console.log('当前阶段:', result.data.currentStep);
  console.log('完成步骤:', result.data.completedSteps, '/', result.data.totalSteps);
  console.log('预计剩余时间:', result.data.estimatedTimeRemaining, 'ms');
}

/**
 * 测试暂停任务
 */
async function testPauseTask(taskId: string): Promise<void> {
  console.log('\n========================================');
  console.log('测试: 暂停任务');
  console.log('========================================');

  const result = await request('POST', `/batch/tasks/${taskId}/pause`);
  console.log('任务状态:', result.data.status);
  console.log('暂停时间:', result.data.pausedAt);
}

/**
 * 测试恢复任务
 */
async function testResumeTask(taskId: string): Promise<void> {
  console.log('\n========================================');
  console.log('测试: 恢复任务');
  console.log('========================================');

  const result = await request('POST', `/batch/tasks/${taskId}/resume`);
  console.log('任务状态:', result.data.status);
  console.log('恢复时间:', result.data.resumedAt);
}

/**
 * 测试取消任务
 */
async function testCancelTask(taskId: string): Promise<void> {
  console.log('\n========================================');
  console.log('测试: 取消任务');
  console.log('========================================');

  const result = await request('POST', `/batch/tasks/${taskId}/cancel`);
  console.log('任务状态:', result.data.status);
  console.log('取消时间:', result.data.cancelledAt);
  console.log('完成文档数:', result.data.completedDocuments);
  console.log('消息:', result.data.message);
}

/**
 * 测试下载ZIP
 */
async function testDownloadZip(taskId: string): Promise<void> {
  console.log('\n========================================');
  console.log('测试: 下载ZIP');
  console.log('========================================');

  const url = `${API_BASE_URL}/batch/tasks/${taskId}/download/zip`;
  console.log(`[API] GET ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('下载失败');
  }

  const contentLength = response.headers.get('Content-Length');
  const contentType = response.headers.get('Content-Type');
  const contentDisposition = response.headers.get('Content-Disposition');

  console.log('Content-Type:', contentType);
  console.log('Content-Length:', contentLength);
  console.log('Content-Disposition:', contentDisposition);

  // 保存文件
  const buffer = await response.buffer();
  const fs = require('fs');
  fs.writeFileSync(`test-batch-${taskId}.zip`, buffer);
  console.log(`文件已保存: test-batch-${taskId}.zip`);
}

/**
 * 监听任务进度
 */
async function monitorTaskProgress(taskId: string, duration: number = 30000): Promise<void> {
  console.log('\n========================================');
  console.log('监听: 任务进度');
  console.log('========================================');

  const WebSocket = require('ws');
  const ws = new WebSocket(`${WS_BASE_URL}`);

  ws.on('open', () => {
    console.log('[WS] 已连接');
    // 订阅任务进度
    ws.send(JSON.stringify({
      action: 'subscribe',
      channels: ['task_progress'],
      filters: { taskId },
    }));
  });

  ws.on('message', (data: string) => {
    const message = JSON.parse(data);
    console.log('[WS] 收到消息:', JSON.stringify(message, null, 2));
  });

  ws.on('error', (error: Error) => {
    console.error('[WS] 错误:', error);
  });

  ws.on('close', () => {
    console.log('[WS] 连接关闭');
  });

  // 持续监听指定时长
  await new Promise(resolve => setTimeout(resolve, duration));

  ws.close();
}

// ============================================================================
// 测试流程
// ============================================================================

/**
 * 完整测试流程
 */
async function runFullTest(): Promise<void> {
  try {
    // 1. 健康检查
    await testHealthCheck();

    // 2. 创建任务
    const taskId = await testCreateTask();

    // 3. 启动任务
    await testStartTask(taskId);

    // 4. 监听进度
    await monitorTaskProgress(taskId, 10000);

    // 5. 获取进度
    await testGetProgress(taskId);

    // 6. 等待任务完成
    console.log('\n等待任务完成...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 7. 再次获取进度
    await testGetProgress(taskId);

    // 8. 下载ZIP（如果任务完成）
    // await testDownloadZip(taskId);

    console.log('\n========================================');
    console.log('测试完成！');
    console.log('========================================');

  } catch (error) {
    console.error('\n测试失败:', error);
    process.exit(1);
  }
}

/**
 * 快速测试流程（不等待完成）
 */
async function runQuickTest(): Promise<void> {
  try {
    // 1. 健康检查
    await testHealthCheck();

    // 2. 创建任务
    const taskId = await testCreateTask();

    // 3. 启动任务
    await testStartTask(taskId);

    // 4. 立即获取进度
    await testGetProgress(taskId);

    console.log('\n========================================');
    console.log('快速测试完成！');
    console.log('========================================');
    console.log('任务ID:', taskId);
    console.log('可以使用以下命令继续测试:');
    console.log(`  node scripts/test-batch-api.js ${taskId}`);

  } catch (error) {
    console.error('\n测试失败:', error);
    process.exit(1);
  }
}

// ============================================================================
// 主函数
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const taskId = args[1];

  switch (command) {
    case 'health':
      await testHealthCheck();
      break;

    case 'create':
      await testCreateTask();
      break;

    case 'start':
      if (!taskId) {
        console.error('请提供任务ID');
        process.exit(1);
      }
      await testStartTask(taskId);
      break;

    case 'progress':
      if (!taskId) {
        console.error('请提供任务ID');
        process.exit(1);
      }
      await testGetProgress(taskId);
      break;

    case 'pause':
      if (!taskId) {
        console.error('请提供任务ID');
        process.exit(1);
      }
      await testPauseTask(taskId);
      break;

    case 'resume':
      if (!taskId) {
        console.error('请提供任务ID');
        process.exit(1);
      }
      await testResumeTask(taskId);
      break;

    case 'cancel':
      if (!taskId) {
        console.error('请提供任务ID');
        process.exit(1);
      }
      await testCancelTask(taskId);
      break;

    case 'monitor':
      if (!taskId) {
        console.error('请提供任务ID');
        process.exit(1);
      }
      await monitorTaskProgress(taskId, parseInt(args[2] || '30000', 10));
      break;

    case 'full':
      await runFullTest();
      break;

    case 'quick':
      await runQuickTest();
      break;

    default:
      console.log(`
用法: node scripts/test-batch-api.js <command> [args]

命令:
  health                     - 健康检查
  create                     - 创建批量任务
  start <taskId>            - 启动任务
  progress <taskId>         - 获取任务进度
  pause <taskId>            - 暂停任务
  resume <taskId>           - 恢复任务
  cancel <taskId>           - 取消任务
  monitor <taskId> [duration] - 监听任务进度
  full                      - 运行完整测试流程
  quick                     - 运行快速测试

示例:
  node scripts/test-batch-api.js health
  node scripts/test-batch-api.js create
  node scripts/test-batch-api.js start task_123
  node scripts/test-batch-api.js progress task_123
  node scripts/test-batch-api.js full
  node scripts/test-batch-api.js quick
      `);
      process.exit(1);
  }
}

// ============================================================================
// 启动
// ============================================================================

if (require.main === module) {
  main().catch(error => {
    console.error('错误:', error);
    process.exit(1);
  });
}

// ============================================================================
// 导出
// ============================================================================

export {
  testHealthCheck,
  testCreateTask,
  testStartTask,
  testGetProgress,
  testPauseTask,
  testResumeTask,
  testCancelTask,
  testDownloadZip,
  monitorTaskProgress,
  runFullTest,
  runQuickTest,
};
