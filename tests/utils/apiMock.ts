/**
 * API Mock工具 - Phase 2
 *
 * 提供API服务的Mock实现，用于隔离外部依赖
 *
 * @module tests/utils/apiMock
 * @version 2.0.0
 */

import {
  DataQualityReport,
  CleaningSuggestion,
  TemplateInfo,
  BatchGenerationTask
} from '../../src/types';

// ============================================================================
// AI服务Mock
// ============================================================================

export class MockAIService {
  private responseDelay: number = 0;
  private shouldFail: boolean = false;
  private customResponse?: any;

  /**
   * 设置响应延迟
   */
  setResponseDelay(delay: number): void {
    this.responseDelay = delay;
  }

  /**
   * 设置是否应该失败
   */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  /**
   * 设置自定义响应
   */
  setCustomResponse(response: any): void {
    this.customResponse = response;
  }

  /**
   * 模拟AI分析请求
   */
  async analyze(prompt: string): Promise<string> {
    if (this.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }

    if (this.shouldFail) {
      throw new Error('AI service error');
    }

    if (this.customResponse) {
      return this.customResponse;
    }

    return 'Mock AI response';
  }

  /**
   * 模拟生成清洗建议
   */
  async generateCleaningSuggestions(issues: any[]): Promise<CleaningSuggestion[]> {
    if (this.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }

    if (this.shouldFail) {
      throw new Error('AI service error');
    }

    return [
      {
        suggestionId: 'suggestion_001',
        issueId: issues[0]?.issueId || 'issue_001',
        strategy: {
          strategyId: 'fill_mean',
          name: '使用平均值填充',
          type: 'fill',
          description: '使用平均值填充缺失值',
          applicableIssues: ['missing_value'],
          estimatedComplexity: 'low',
          requiresCodeGeneration: true
        },
        priority: 'high',
        impactAssessment: {
          qualityImprovement: 85,
          dataLossRisk: 'none',
          executionTimeEstimate: 500,
          sideEffects: []
        },
        code: "data.fillna(data.mean())",
        explanation: '使用平均值填充缺失值'
      }
    ];
  }

  /**
   * 重置Mock状态
   */
  reset(): void {
    this.responseDelay = 0;
    this.shouldFail = false;
    this.customResponse = undefined;
  }
}

// ============================================================================
// 缓存服务Mock
// ============================================================================

export class MockCacheService {
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private defaultTTL: number = 3600000; // 1小时

  /**
   * 设置缓存
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  /**
   * 获取缓存
   */
  async get(key: string): Promise<any> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * 检查缓存是否存在
   */
  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 重置Mock状态
   */
  reset(): void {
    this.cache.clear();
  }
}

// ============================================================================
// 文件服务Mock
// ============================================================================

export class MockFileService {
  private files: Map<string, any> = new Map();
  private shouldFail: boolean = false;

  /**
   * 设置是否应该失败
   */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  /**
   * 读取文件
   */
  async readFile(filePath: string): Promise<any> {
    if (this.shouldFail) {
      throw new Error('File not found');
    }

    const file = this.files.get(filePath);
    if (!file) {
      throw new Error('File not found');
    }

    return file;
  }

  /**
   * 写入文件
   */
  async writeFile(filePath: string, content: any): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to write file');
    }

    this.files.set(filePath, content);
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to delete file');
    }

    this.files.delete(filePath);
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath: string): Promise<boolean> {
    return this.files.has(filePath);
  }

  /**
   * 重置Mock状态
   */
  reset(): void {
    this.files.clear();
    this.shouldFail = false;
  }
}

// ============================================================================
// WebSocket服务Mock
// ============================================================================

export class MockWebSocketService {
  private clients: Map<string, any> = new Map();
  private shouldFail: boolean = false;

  /**
   * 设置是否应该失败
   */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  /**
   * 添加客户端
   */
  addClient(clientId: string, client: any): void {
    this.clients.set(clientId, client);
  }

  /**
   * 移除客户端
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * 发送消息给特定客户端
   */
  async sendToClient(clientId: string, message: any): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to send message');
    }

    const client = this.clients.get(clientId);
    if (client && client.send) {
      client.send(message);
    }
  }

  /**
   * 广播消息给所有客户端
   */
  async broadcast(message: any): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to broadcast message');
    }

    for (const [clientId, client] of this.clients.entries()) {
      if (client.send) {
        client.send(message);
      }
    }
  }

  /**
   * 重置Mock状态
   */
  reset(): void {
    this.clients.clear();
    this.shouldFail = false;
  }
}

// ============================================================================
// 数据库服务Mock
// ============================================================================

export class MockDatabaseService {
  private data: Map<string, any[]> = new Map();
  private shouldFail: boolean = false;

  /**
   * 设置是否应该失败
   */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  /**
   * 插入数据
   */
  async insert(table: string, record: any): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to insert record');
    }

    if (!this.data.has(table)) {
      this.data.set(table, []);
    }

    const tableData = this.data.get(table)!;
    tableData.push(record);
  }

  /**
   * 查询数据
   */
  async query(table: string, filter?: (record: any) => boolean): Promise<any[]> {
    if (this.shouldFail) {
      throw new Error('Failed to query records');
    }

    const tableData = this.data.get(table) || [];

    if (filter) {
      return tableData.filter(filter);
    }

    return tableData;
  }

  /**
   * 更新数据
   */
  async update(table: string, filter: (record: any) => boolean, updates: any): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to update records');
    }

    const tableData = this.data.get(table);
    if (!tableData) {
      return;
    }

    for (let i = 0; i < tableData.length; i++) {
      if (filter(tableData[i])) {
        tableData[i] = { ...tableData[i], ...updates };
      }
    }
  }

  /**
   * 删除数据
   */
  async delete(table: string, filter: (record: any) => boolean): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Failed to delete records');
    }

    const tableData = this.data.get(table);
    if (!tableData) {
      return;
    }

    const filteredData = tableData.filter(record => !filter(record));
    this.data.set(table, filteredData);
  }

  /**
   * 重置Mock状态
   */
  reset(): void {
    this.data.clear();
    this.shouldFail = false;
  }
}

// ============================================================================
// 导出所有Mock服务
// ============================================================================

export default {
  MockAIService,
  MockCacheService,
  MockFileService,
  MockWebSocketService,
  MockDatabaseService
};
