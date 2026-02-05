/**
 * 多模板文档生成模块 - 使用示例
 *
 * @version 2.0.0
 * @module TemplateGenerationExamples
 */

import {
  TemplateManager,
  BatchGenerationScheduler,
  WebSocketManager,
  DefaultDocumentGenerator,
  GenerationMode,
  Priority,
  TaskStatus,
  type CreateBatchTaskRequest
} from './index';

// ============================================================================
// 示例1: 基础模板管理
// ============================================================================

/**
 * 示例1.1: 创建和上传模板
 */
async function example1_CreateTemplate() {
  // 假设已实现存储服务
  const storageService = {
    async store(key: string, data: ArrayBuffer): Promise<string> {
      // 存储到LocalStorage/IndexedDB/远程存储
      return `stored://${key}`;
    },
    async retrieve(key: string): Promise<ArrayBuffer> {
      // 从存储获取
      return new ArrayBuffer(0);
    },
    async delete(key: string): Promise<void> {
      // 删除
    },
    async exists(key: string): Promise<boolean> {
      // 检查存在
      return true;
    }
  };

  const templateManager = new TemplateManager(storageService);

  // 从文件上传
  const fileBuffer = await readFileAsArrayBuffer('contract-template.docx');

  const template = await templateManager.createTemplate({
    name: '标准合同模板',
    description: '用于生成标准合同文档',
    category: '合同',
    tags: ['标准', '合同', '法律'],
    fileBuffer,
    version: '1.0.0'
  });

  console.log('模板已创建:', template.metadata.id);
  console.log('占位符:', template.placeholders);
  // 输出: ['{{合同编号}}', '{{甲方名称}}', '{{乙方名称}}', '{{签订日期}}', ...]
}

/**
 * 示例1.2: 查询和更新模板
 */
async function example1_QueryAndUpdateTemplate() {
  const templateManager = new TemplateManager(storageService);

  // 获取模板
  const template = await templateManager.getTemplate('tpl_xxx');

  // 更新模板
  const updated = await templateManager.updateTemplate('tpl_xxx', {
    name: '更新后的合同模板',
    tags: ['合同', '更新'],
    status: 'active'
  });

  // 列出所有模板
  const list = await templateManager.listTemplates({
    category: '合同',
    status: 'active'
  });

  console.log('找到模板:', list.total);
}

// ============================================================================
// 示例2: 单模板批量生成
// ============================================================================

/**
 * 示例2.1: 创建批量生成任务
 */
async function example2_CreateBatchTask() {
  const templateManager = new TemplateManager(storageService);
  const websocketManager = new WebSocketManager();
  const documentGenerator = new DefaultDocumentGenerator();
  const scheduler = new BatchGenerationScheduler(
    templateManager,
    documentGenerator,
    websocketManager,
    {
      maxConcurrency: 3,
      progressInterval: 500
    }
  );

  // 准备数据源
  const excelBuffer = await readFileAsArrayBuffer('contracts-data.xlsx');

  // 创建任务
  const request: CreateBatchTaskRequest = {
    mode: GenerationMode.SINGLE_TEMPLATE,
    templateIds: ['tpl_contract'],
    dataSource: {
      type: 'excel',
      source: {
        file: {
          name: 'contracts-data.xlsx',
          buffer: excelBuffer
        }
      }
    },
    parameters: {
      fileNameTemplate: '{{甲方名称}}_{{合同编号}}.docx',
      dateFormat: 'YYYY-MM-DD'
    },
    output: {
      type: 'download',
      download: {
        fileName: '批量合同',
        zipFileName: 'contracts.zip'
      }
    },
    options: {
      concurrency: 3,
      batchSize: 10,
      continueOnError: true,
      retryCount: 2,
      enableWebSocket: true
    },
    priority: Priority.NORMAL
  };

  const response = await scheduler.createTask(request);

  console.log('任务已创建:', response.taskId);
  console.log('预计耗时:', response.estimatedDuration, 'ms');
  console.log('预计完成时间:', new Date(response.estimatedCompletionAt).toLocaleString());
}

/**
 * 示例2.2: 监控任务进度
 */
async function example2_MonitorProgress() {
  const scheduler = new BatchGenerationScheduler(
    templateManager,
    documentGenerator,
    websocketManager
  );

  const taskId = 'task_xxx';

  // 轮询获取进度
  const progress = await scheduler.getTaskProgress(taskId);

  console.log('任务状态:', progress.task.status);
  console.log('进度:', progress.task.progress, '%');
  console.log('当前阶段:', progress.task.execution.currentStage);
  console.log('已完成:', progress.task.execution.completedDocuments);
  console.log('总数:', progress.task.execution.totalDocuments);
  console.log('失败:', progress.task.execution.failedDocuments);

  // 统计信息
  if (progress.task.stats.duration) {
    console.log('总耗时:', progress.task.stats.duration, 'ms');
    console.log('平均每个文档:', progress.task.stats.avgTimePerDocument, 'ms');
    console.log('成功率:', progress.task.stats.successRate, '%');
  }
}

/**
 * 示例2.3: 控制任务
 */
async function example2_ControlTask() {
  const scheduler = new BatchGenerationScheduler(
    templateManager,
    documentGenerator,
    websocketManager
  );

  const taskId = 'task_xxx';

  // 暂停任务
  await scheduler.pauseTask(taskId);
  console.log('任务已暂停');

  // 稍后恢复
  await new Promise(resolve => setTimeout(resolve, 5000));
  await scheduler.resumeTask(taskId);
  console.log('任务已恢复');

  // 取消任务
  await scheduler.cancelTask(taskId);
  console.log('任务已取消');
}

// ============================================================================
// 示例3: 多模板生成
// ============================================================================

/**
 * 示例3.1: 多模板单数据
 */
async function example3_MultiTemplateSingleData() {
  const request: CreateBatchTaskRequest = {
    mode: GenerationMode.MULTI_TEMPLATE,
    templateIds: ['tpl_contract', 'tpl_invoice', 'tpl_receipt'],
    dataSource: {
      type: 'inline',
      source: {
        inline: [
          {
            合同编号: 'CONTRACT-2025-001',
            甲方名称: '北京XX科技有限公司',
            乙方名称: '上海XX商贸有限公司',
            签订日期: '2025-01-25',
            合同金额: 100000
          }
        ]
      }
    },
    priority: Priority.HIGH
  };

  const response = await scheduler.createTask(request);
  console.log('任务已创建:', response.taskId);
  // 将生成3个文档：合同、发票、收据
}

/**
 * 示例3.2: 多模板多数据（笛卡尔积）
 */
async function example3_CrossProduct() {
  const request: CreateBatchTaskRequest = {
    mode: GenerationMode.CROSS_PRODUCT,
    templateIds: ['tpl_contract_v1', 'tpl_contract_v2'],
    dataSource: {
      type: 'inline',
      source: {
        inline: [
          { 客户名称: '客户A', 合同金额: 50000 },
          { 客户名称: '客户B', 合同金额: 75000 },
          { 客户名称: '客户C', 合同金额: 100000 }
        ]
      }
    },
    priority: Priority.NORMAL
  };

  const response = await scheduler.createTask(request);
  console.log('任务已创建:', response.taskId);
  // 将生成 2 * 3 = 6 个文档（2个模板 × 3条数据）
}

// ============================================================================
// 示例4: WebSocket实时监控
// ============================================================================

/**
 * 示例4.1: 客户端订阅任务进度
 */
function example4_ClientWebSocket() {
  const ws = new WebSocket('ws://localhost:8080');

  ws.onopen = () => {
    console.log('WebSocket已连接');

    // 订阅任务
    ws.send(JSON.stringify({
      action: 'subscribe',
      taskIds: ['task_1', 'task_2', 'task_3']
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'progress':
        // 更新进度条
        console.log(`进度: ${data.progress}% - ${data.stage}`);
        updateProgressBar(data.progress);
        updateStatusText(data.message);
        break;

      case 'document_generated':
        // 文档生成完成
        console.log(`文档已生成: ${data.documentId}`);
        if (data.status === 'success') {
          addDocumentToResultList(data);
        } else {
          markDocumentAsFailed(data);
        }
        break;

      case 'status_changed':
        // 任务状态变更
        console.log(`状态: ${data.oldStatus} -> ${data.newStatus}`);
        updateTaskStatus(data.newStatus);
        break;

      case 'error':
        // 错误事件
        console.error(`错误: ${data.error.message}`);
        showErrorNotification(data.error);

        // 如果是致命错误，停止任务
        if (data.fatal) {
          stopTask(data.taskId);
        }
        break;

      case 'completed':
        // 任务完成
        console.log('任务完成:', data.result);
        showCompletionNotification(data.result);
        enableDownloadButton(data.result.downloadUrl);
        break;
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket错误:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket已断开');
  };

  // 定期发送心跳
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'heartbeat' }));
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // 取消订阅
  function unsubscribe() {
    ws.send(JSON.stringify({
      action: 'unsubscribe',
      taskIds: ['task_1']
    }));
  }

  // 断开连接
  function disconnect() {
    clearInterval(heartbeatInterval);
    ws.close();
  }
}

/**
 * 示例4.2: 服务端WebSocket集成
 */
import { WebSocketServer } from 'ws';

function example4_ServerWebSocket() {
  const wss = new WebSocketServer({ port: 8080 });

  const websocketManager = new WebSocketManager({
    heartbeatInterval: 30000,
    connectionTimeout: 60000
  });

  wss.on('connection', (ws: WebSocket) => {
    // 添加连接到管理器
    const connectionId = websocketManager.addConnection(ws);

    console.log('新连接:', connectionId);

    // 消息处理已在管理器中自动处理
    ws.on('message', (data) => {
      // WebSocketManager会自动处理订阅/取消订阅/心跳
    });

    // 连接关闭会自动处理
    ws.on('close', () => {
      console.log('连接断开:', connectionId);
    });

    // 获取统计
    const stats = websocketManager.getStats();
    console.log('连接统计:', stats);
  });
}

// ============================================================================
// 示例5: 错误处理和重试
// ============================================================================

/**
 * 示例5.1: 带重试的任务创建
 */
async function example5_WithRetry() {
  const request: CreateBatchTaskRequest = {
    mode: GenerationMode.SINGLE_TEMPLATE,
    templateIds: ['tpl_contract'],
    dataSource: {
      type: 'excel',
      source: {
        file: {
          name: 'data.xlsx',
          buffer: excelBuffer
        }
      }
    },
    options: {
      // 失败时继续处理其他文档
      continueOnError: true,
      // 最多重试3次
      retryCount: 3,
      // 重试延迟1秒
      retryDelay: 1000,
      // 并发控制
      concurrency: 2,
      // 批次大小
      batchSize: 5
    },
    priority: Priority.NORMAL
  };

  const response = await scheduler.createTask(request);

  // 监听任务进度
  let lastProgress = await scheduler.getTaskProgress(response.taskId);

  // 定期检查
  const checkInterval = setInterval(async () => {
    const progress = await scheduler.getTaskProgress(response.taskId);

    // 检查是否有失败的文档
    if (progress.task.execution.failedDocuments > 0) {
      console.warn('发现失败的文档:', progress.task.execution.failedDocuments);

      // 可以选择重新提交失败的任务
      if (progress.task.status === TaskStatus.FAILED) {
        console.error('任务已失败，可以重新提交');
        clearInterval(checkInterval);
      }
    }

    // 任务完成
    if (
      progress.task.status === TaskStatus.COMPLETED ||
      progress.task.status === TaskStatus.FAILED ||
      progress.task.status === TaskStatus.CANCELLED
    ) {
      clearInterval(checkInterval);

      console.log('任务最终状态:', progress.task.status);
      console.log('成功:', progress.task.execution.completedDocuments);
      console.log('失败:', progress.task.execution.failedDocuments);
    }

    lastProgress = progress;
  }, 1000);
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 读取文件为ArrayBuffer
 */
async function readFileAsArrayBuffer(filePath: string): Promise<ArrayBuffer> {
  // 实际实现会根据环境不同
  // 浏览器: 使用FileReader
  // Node.js: 使用fs.readFile
  return new ArrayBuffer(0);
}

/**
 * 更新进度条（UI函数）
 */
function updateProgressBar(progress: number): void {
  // 实际UI实现
}

/**
 * 更新状态文本（UI函数）
 */
function updateStatusText(message: string): void {
  // 实际UI实现
}

/**
 * 添加文档到结果列表（UI函数）
 */
function addDocumentToResultList(document: any): void {
  // 实际UI实现
}

/**
 * 标记文档为失败（UI函数）
 */
function markDocumentAsFailed(document: any): void {
  // 实际UI实现
}

/**
 * 更新任务状态（UI函数）
 */
function updateTaskStatus(status: TaskStatus): void {
  // 实际UI实现
}

/**
 * 显示错误通知（UI函数）
 */
function showErrorNotification(error: any): void {
  // 实际UI实现
}

/**
 * 停止任务（UI函数）
 */
function stopTask(taskId: string): void {
  // 实际UI实现
}

/**
 * 显示完成通知（UI函数）
 */
function showCompletionNotification(result: any): void {
  // 实际UI实现
}

/**
 * 启用下载按钮（UI函数）
 */
function enableDownloadButton(url: string): void {
  // 实际UI实现
}

// ============================================================================
// 导出
// ============================================================================

export {
  example1_CreateTemplate,
  example1_QueryAndUpdateTemplate,
  example2_CreateBatchTask,
  example2_MonitorProgress,
  example2_ControlTask,
  example3_MultiTemplateSingleData,
  example3_CrossProduct,
  example4_ClientWebSocket,
  example4_ServerWebSocket,
  example5_WithRetry
};
