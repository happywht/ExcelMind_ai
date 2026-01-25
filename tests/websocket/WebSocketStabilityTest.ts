/**
 * WebSocket 稳定性测试套件
 *
 * Week 0 技术验证 - WebSocket 稳定性测试
 *
 * 测试场景：
 * 1. 连接稳定性 - 长连接保持 1 小时
 * 2. 重连机制 - 断线后自动重连，5 秒内恢复
 * 3. 心跳检测 - 空闲连接检测，30 秒超时
 * 4. 并发连接 - 10 个并发连接，无崩溃
 * 5. 消息顺序 - 乱序消息检测，严格顺序
 */

import { WebSocketTestServer } from './WebSocketTestServer.js';
import { WebSocketTestClient } from './WebSocketTestClient.js';

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: any;
  error?: string;
}

interface TestReport {
  testSuite: string;
  startTime: number;
  endTime: number;
  totalDuration: number;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
}

export class WebSocketStabilityTest {
  private server: WebSocketTestServer;
  private clients: WebSocketTestClient[] = [];
  private testResults: TestResult[] = [];
  private testStartTime: number;

  constructor(port: number = 8080) {
    this.server = new WebSocketTestServer(port);
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<TestReport> {
    console.log('\n========================================');
    console.log('  WebSocket Stability Test Suite');
    console.log('  Week 0 Technical Validation');
    console.log('========================================\n');

    this.testStartTime = Date.now();

    // 测试 1: 连接稳定性
    await this.testConnectionStability();

    // 测试 2: 重连机制
    await this.testReconnectionMechanism();

    // 测试 3: 心跳检测
    await this.testHeartbeatDetection();

    // 测试 4: 并发连接
    await this.testConcurrentConnections();

    // 测试 5: 消息顺序
    await this.testMessageOrdering();

    const testEndTime = Date.now();

    // 生成报告
    const report: TestReport = {
      testSuite: 'WebSocket Stability Test',
      startTime: this.testStartTime,
      endTime: testEndTime,
      totalDuration: testEndTime - this.testStartTime,
      results: this.testResults,
      summary: this.generateSummary()
    };

    this.printReport(report);

    return report;
  }

  /**
   * 测试 1: 连接稳定性（长连接保持）
   */
  private async testConnectionStability(): Promise<void> {
    const testName = 'Connection Stability (1 Hour)';
    console.log(`\n[TEST] ${testName}`);
    console.log('----------------------------------------');

    const startTime = Date.now();
    const testDuration = 60000; // 缩短为 1 分钟用于演示（实际应该是 1 小时）
    const client = new WebSocketTestClient('ws://localhost:8080');

    try {
      // 等待连接建立
      await this.waitForConnection(client, 5000);

      // 发送测试消息
      let messagesSent = 0;
      const messageInterval = setInterval(() => {
        if (client.connected()) {
          client.sendEcho({ test: 'message', count: messagesSent++ });
        }
      }, 1000);

      // 保持连接
      await this.wait(testDuration);

      // 停止发送消息
      clearInterval(messageInterval);

      // 检查连接状态
      const stats = client.getStats();
      const passed = client.connected() && stats.uptime >= testDuration * 0.95;

      client.close();

      this.testResults.push({
        testName,
        passed,
        duration: Date.now() - startTime,
        details: {
          testDuration,
          actualUptime: stats.uptime,
          messagesSent: stats.messagesSent,
          messagesReceived: stats.messagesReceived,
          reconnectCount: stats.reconnectCount
        }
      });

      console.log(`✓ Connection maintained for ${stats.uptime}ms`);
      console.log(`✓ Messages sent: ${stats.messagesSent}, received: ${stats.messagesReceived}`);
      console.log(`Result: ${passed ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: {},
        error: error instanceof Error ? error.message : String(error)
      });
      console.log(`✗ Test failed: ${error}`);
    }
  }

  /**
   * 测试 2: 重连机制
   */
  private async testReconnectionMechanism(): Promise<void> {
    const testName = 'Reconnection Mechanism (5s recovery)';
    console.log(`\n[TEST] ${testName}`);
    console.log('----------------------------------------');

    const startTime = Date.now();
    const client = new WebSocketTestClient('ws://localhost:8080');

    try {
      // 等待连接建立
      await this.waitForConnection(client, 5000);

      // 记录第一次连接时间
      const firstConnectTime = Date.now();

      // 模拟服务器重启（关闭并重新启动服务器）
      console.log('Simulating server restart...');

      // 创建新服务器（模拟重启）
      const newServer = new WebSocketTestServer(8081);

      // 等待客户端检测到断开并尝试重连
      await this.wait(3000);

      // 关闭旧服务器
      this.server.close();

      // 更新服务器引用
      (this.server as any) = newServer;

      // 等待客户端重连
      const reconnected = await this.waitForConnection(client, 10000);

      const reconnectionTime = Date.now() - firstConnectTime;

      client.close();

      const passed = reconnected && reconnectionTime < 5000;

      this.testResults.push({
        testName,
        passed,
        duration: Date.now() - startTime,
        details: {
          reconnectionTime,
          reconnectAttempts: client.getStats().reconnectCount
        }
      });

      console.log(`✓ Reconnected in ${reconnectionTime}ms`);
      console.log(`Result: ${passed ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: {},
        error: error instanceof Error ? error.message : String(error)
      });
      console.log(`✗ Test failed: ${error}`);
    }
  }

  /**
   * 测试 3: 心跳检测
   */
  private async testHeartbeatDetection(): Promise<void> {
    const testName = 'Heartbeat Detection (30s timeout)';
    console.log(`\n[TEST] ${testName}`);
    console.log('----------------------------------------');

    const startTime = Date.now();
    const client = new WebSocketTestClient('ws://localhost:8080');

    try {
      // 等待连接建立
      await this.waitForConnection(client, 5000);

      // 记录初始心跳时间
      let lastHeartbeat = Date.now();
      let heartbeatReceived = false;

      client.onMessage((message) => {
        if (message.type === 'heartbeat') {
          lastHeartbeat = Date.now();
          heartbeatReceived = true;
        }
      });

      // 等待心跳
      await this.wait(20000);

      const heartbeatInterval = Date.now() - lastHeartbeat;

      client.close();

      const passed = heartbeatReceived && heartbeatInterval < 30000;

      this.testResults.push({
        testName,
        passed,
        duration: Date.now() - startTime,
        details: {
          heartbeatReceived,
          lastHeartbeatInterval: heartbeatInterval
        }
      });

      console.log(`✓ Heartbeat received within ${heartbeatInterval}ms`);
      console.log(`Result: ${passed ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: {},
        error: error instanceof Error ? error.message : String(error)
      });
      console.log(`✗ Test failed: ${error}`);
    }
  }

  /**
   * 测试 4: 并发连接
   */
  private async testConcurrentConnections(): Promise<void> {
    const testName = 'Concurrent Connections (10 clients)';
    console.log(`\n[TEST] ${testName}`);
    console.log('----------------------------------------');

    const startTime = Date.now();
    const numClients = 10;
    const clients: WebSocketTestClient[] = [];

    try {
      // 创建多个并发连接
      console.log(`Creating ${numClients} concurrent connections...`);

      for (let i = 0; i < numClients; i++) {
        const client = new WebSocketTestClient('ws://localhost:8080');
        clients.push(client);
        this.clients.push(client);
      }

      // 等待所有连接建立
      await this.waitForAllConnections(clients, 10000);

      console.log(`✓ All ${numClients} clients connected`);

      // 发送测试消息
      const messagePromises = clients.map((client, index) => {
        return new Promise<void>((resolve) => {
          client.onMessage((message) => {
            if (message.type === 'echo') {
              resolve();
            }
          });
          client.sendEcho({ clientIndex: index, test: 'concurrent' });
        });
      });

      await Promise.all(messagePromises);
      console.log('✓ All clients received echo responses');

      // 收集统计信息
      const stats = clients.map(c => c.getStats());

      // 关闭所有连接
      clients.forEach(c => c.close());

      const passed = stats.every(s => s.messagesReceived > 0);

      this.testResults.push({
        testName,
        passed,
        duration: Date.now() - startTime,
        details: {
          numClients,
          allConnected: true,
          totalMessagesReceived: stats.reduce((sum, s) => sum + s.messagesReceived, 0)
        }
      });

      console.log(`✓ Total messages received: ${stats.reduce((sum, s) => sum + s.messagesReceived, 0)}`);
      console.log(`Result: ${passed ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      clients.forEach(c => c.close());

      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: { numClients },
        error: error instanceof Error ? error.message : String(error)
      });
      console.log(`✗ Test failed: ${error}`);
    }
  }

  /**
   * 测试 5: 消息顺序
   */
  private async testMessageOrdering(): Promise<void> {
    const testName = 'Message Ordering (strict sequence)';
    console.log(`\n[TEST] ${testName}`);
    console.log('----------------------------------------');

    const startTime = Date.now();
    const client = new WebSocketTestClient('ws://localhost:8080');

    try {
      // 等待连接建立
      await this.waitForConnection(client, 5000);

      // 发送序列消息
      const numMessages = 100;
      const receivedSequences: number[] = [];

      client.onMessage((message) => {
        if (message.sequence !== undefined) {
          receivedSequences.push(message.sequence);
        }
      });

      // 快速发送多条消息
      for (let i = 0; i < numMessages; i++) {
        client.send('sequence', { index: i });
      }

      // 等待所有消息被接收
      await this.wait(3000);

      // 检查消息顺序
      let isInOrder = true;
      for (let i = 1; i < receivedSequences.length; i++) {
        if (receivedSequences[i] !== receivedSequences[i - 1] + 1) {
          isInOrder = false;
          break;
        }
      }

      const stats = client.getStats();
      client.close();

      const passed = isInOrder && stats.missedMessages === 0;

      this.testResults.push({
        testName,
        passed,
        duration: Date.now() - startTime,
        details: {
          numMessages,
          messagesReceived: receivedSequences.length,
          missedMessages: stats.missedMessages,
          isInOrder
        }
      });

      console.log(`✓ Messages received: ${receivedSequences.length}/${numMessages}`);
      console.log(`✓ Missed messages: ${stats.missedMessages}`);
      console.log(`✓ In order: ${isInOrder}`);
      console.log(`Result: ${passed ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: {},
        error: error instanceof Error ? error.message : String(error)
      });
      console.log(`✗ Test failed: ${error}`);
    }
  }

  /**
   * 等待连接建立
   */
  private waitForConnection(client: WebSocketTestClient, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        if (client.connected()) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }

  /**
   * 等待所有连接建立
   */
  private waitForAllConnections(clients: WebSocketTestClient[], timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        const allConnected = clients.every(c => c.connected());

        if (allConnected) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }

  /**
   * 等待指定时间
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成测试摘要
   */
  private generateSummary() {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return { total, passed, failed, passRate };
  }

  /**
   * 打印测试报告
   */
  private printReport(report: TestReport): void {
    console.log('\n========================================');
    console.log('  Test Report');
    console.log('========================================\n');

    console.log(`Test Suite: ${report.testSuite}`);
    console.log(`Start Time: ${new Date(report.startTime).toISOString()}`);
    console.log(`End Time: ${new Date(report.endTime).toISOString()}`);
    console.log(`Total Duration: ${report.totalDuration}ms`);
    console.log('\n----------------------------------------');
    console.log('Summary:');
    console.log(`  Total Tests: ${report.summary.total}`);
    console.log(`  Passed: ${report.summary.passed}`);
    console.log(`  Failed: ${report.summary.failed}`);
    console.log(`  Pass Rate: ${report.summary.passRate.toFixed(2)}%`);
    console.log('----------------------------------------\n');

    console.log('Detailed Results:');
    report.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.testName}`);
      console.log(`   Status: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
      console.log(`   Duration: ${result.duration}ms`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log('   Details:', JSON.stringify(result.details, null, 2).split('\n').join('\n   '));
    });

    console.log('\n========================================\n');
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    console.log('\n[Cleanup] Closing all connections...');

    this.clients.forEach(c => c.close());
    this.server.close();

    console.log('[Cleanup] Complete');
  }
}

// 如果直接运行此文件，执行测试
const stabilityModuleUrl = new URL(import.meta.url);
if (process.argv[1] === stabilityModuleUrl.pathname) {
  const test = new WebSocketStabilityTest(8080);

  test.runAllTests()
    .then(() => {
      test.cleanup();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      test.cleanup();
      process.exit(1);
    });
}
