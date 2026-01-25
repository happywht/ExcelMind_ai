/**
 * WebSocket 性能测试
 *
 * Week 0 技术验证 - 性能指标测试
 *
 * 验收标准：
 * - 消息延迟 < 100ms (P99)
 * - 吞吐量 > 100 msg/s
 * - CPU < 20%, 内存 < 100MB
 */

import { WebSocketTestServer } from './WebSocketTestServer.js';
import { WebSocketTestClient } from './WebSocketTestClient.js';
import * as os from 'os';

interface PerformanceMetrics {
  messageLatency: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    messagesPerSecond: number;
    totalMessages: number;
    duration: number;
  };
  resourceUsage: {
    cpuPercent: number;
    memoryMB: number;
  };
}

export class WebSocketPerformanceTest {
  private server: WebSocketTestServer;
  private clients: WebSocketTestClient[] = [];

  constructor(port: number = 8080) {
    this.server = new WebSocketTestServer(port);
  }

  /**
   * 运行性能测试
   */
  async runPerformanceTests(): Promise<void> {
    console.log('\n========================================');
    console.log('  WebSocket Performance Test');
    console.log('  Week 0 Technical Validation');
    console.log('========================================\n');

    // 测试 1: 消息延迟
    await this.testMessageLatency();

    // 测试 2: 吞吐量
    await this.testThroughput();

    // 测试 3: 资源使用
    await this.testResourceUsage();

    console.log('\n========================================');
    console.log('  Performance Test Complete');
    console.log('========================================\n');
  }

  /**
   * 测试 1: 消息延迟（P99 < 100ms）
   */
  private async testMessageLatency(): Promise<void> {
    console.log('\n[TEST] Message Latency (P99 < 100ms)');
    console.log('----------------------------------------');

    const client = new WebSocketTestClient('ws://localhost:8080');
    await this.waitForConnection(client);

    const numMessages = 1000;
    const latencies: number[] = [];

    client.onMessage((message) => {
      if (message.timestamp) {
        const latency = Date.now() - message.timestamp;
        latencies.push(latency);
      }
    });

    // 发送测试消息
    const startTime = Date.now();
    for (let i = 0; i < numMessages; i++) {
      client.send('echo', { index: i });
      // 小延迟避免消息堆积
      if (i % 100 === 0) {
        await this.wait(10);
      }
    }

    // 等待所有响应
    await this.wait(2000);

    client.close();

    // 计算延迟指标
    const sorted = latencies.slice().sort((a, b) => a - b);
    const metrics = {
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0
    };

    const passed = metrics.p99 < 100;

    console.log(`Messages sent: ${numMessages}`);
    console.log(`Messages received: ${latencies.length}`);
    console.log(`Min latency: ${metrics.min}ms`);
    console.log(`Avg latency: ${metrics.avg.toFixed(2)}ms`);
    console.log(`P50 latency: ${metrics.p50}ms`);
    console.log(`P95 latency: ${metrics.p95}ms`);
    console.log(`P99 latency: ${metrics.p99}ms`);
    console.log(`Max latency: ${metrics.max}ms`);
    console.log(`\nResult: ${passed ? '✓ PASSED' : '✗ FAILED'} (P99 < 100ms)`);

    if (!passed) {
      console.warn(`⚠ P99 latency ${metrics.p99}ms exceeds 100ms threshold`);
    }
  }

  /**
   * 测试 2: 吞吐量（> 100 msg/s）
   */
  private async testThroughput(): Promise<void> {
    console.log('\n[TEST] Throughput (> 100 msg/s)');
    console.log('----------------------------------------');

    const client = new WebSocketTestClient('ws://localhost:8080');
    await this.waitForConnection(client);

    const testDuration = 10000; // 10 秒
    let messagesReceived = 0;

    client.onMessage((message) => {
      messagesReceived++;
    });

    // 持续发送消息
    const startTime = Date.now();
    const sendInterval = setInterval(() => {
      if (Date.now() - startTime < testDuration) {
        client.send('echo', { timestamp: Date.now() });
      } else {
        clearInterval(sendInterval);
      }
    }, 10); // 每 10ms 发送一条消息

    // 等待测试完成
    await this.wait(testDuration + 1000);
    clearInterval(sendInterval);

    const actualDuration = Date.now() - startTime;
    const messagesPerSecond = (messagesReceived / actualDuration) * 1000;

    client.close();

    const passed = messagesPerSecond > 100;

    console.log(`Test duration: ${actualDuration}ms`);
    console.log(`Messages received: ${messagesReceived}`);
    console.log(`Throughput: ${messagesPerSecond.toFixed(2)} msg/s`);
    console.log(`\nResult: ${passed ? '✓ PASSED' : '✗ FAILED'} (> 100 msg/s)`);

    if (!passed) {
      console.warn(`⚠ Throughput ${messagesPerSecond.toFixed(2)} msg/s below 100 msg/s threshold`);
    }
  }

  /**
   * 测试 3: 资源使用（CPU < 20%, 内存 < 100MB）
   */
  private async testResourceUsage(): Promise<void> {
    console.log('\n[TEST] Resource Usage (CPU < 20%, Memory < 100MB)');
    console.log('----------------------------------------');

    // 记录初始资源使用
    const initialMemory = process.memoryUsage();
    const initialCpu = this.getCPUUsage();

    // 创建多个客户端连接
    const numClients = 10;
    console.log(`Creating ${numClients} concurrent connections...`);

    for (let i = 0; i < numClients; i++) {
      const client = new WebSocketTestClient('ws://localhost:8080');
      await this.waitForConnection(client);
      this.clients.push(client);
    }

    // 持续发送消息 30 秒
    const testDuration = 30000;
    const startTime = Date.now();

    console.log(`Running load test for ${testDuration}ms...`);

    const messageInterval = setInterval(() => {
      if (Date.now() - startTime < testDuration) {
        this.clients.forEach((client, index) => {
          client.send('echo', { client: index, timestamp: Date.now() });
        });
      } else {
        clearInterval(messageInterval);
      }
    }, 100);

    // 每秒记录资源使用
    const resourceSnapshots: Array<{ cpu: number; memory: number }> = [];
    const snapshotInterval = setInterval(() => {
      const memory = process.memoryUsage();
      const cpu = this.getCPUUsage();

      resourceSnapshots.push({
        cpu: cpu.percent,
        memory: memory.heapUsed / (1024 * 1024)
      });
    }, 1000);

    await this.wait(testDuration + 1000);
    clearInterval(messageInterval);
    clearInterval(snapshotInterval);

    // 计算平均资源使用
    const avgCpu = resourceSnapshots.reduce((sum, s) => sum + s.cpu, 0) / resourceSnapshots.length;
    const maxMemory = Math.max(...resourceSnapshots.map(s => s.memory));

    // 清理
    this.clients.forEach(c => c.close());
    this.clients = [];

    const cpuPassed = avgCpu < 20;
    const memoryPassed = maxMemory < 100;

    console.log(`\nResource Usage Statistics:`);
    console.log(`  Average CPU: ${avgCpu.toFixed(2)}%`);
    console.log(`  Peak Memory: ${maxMemory.toFixed(2)}MB`);
    console.log(`  Memory snapshots: ${resourceSnapshots.length}`);
    console.log(`\nResult: ${cpuPassed && memoryPassed ? '✓ PASSED' : '✗ FAILED'}`);

    if (!cpuPassed) {
      console.warn(`⚠ Average CPU ${avgCpu.toFixed(2)}% exceeds 20% threshold`);
    }

    if (!memoryPassed) {
      console.warn(`⚠ Peak memory ${maxMemory.toFixed(2)}MB exceeds 100MB threshold`);
    }
  }

  /**
   * 获取 CPU 使用率
   */
  private getCPUUsage(): { percent: number; user: number; system: number } {
    const cpus = os.cpus();
    let user = 0;
    let system = 0;

    cpus.forEach(cpu => {
      user += cpu.times.user;
      system += cpu.times.sys;
    });

    const total = user + system;
    const percent = (total / (cpus.length * 10000000)) * 100;

    return { percent, user, system };
  }

  /**
   * 等待连接建立
   */
  private waitForConnection(client: WebSocketTestClient, timeout: number = 5000): Promise<boolean> {
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
   * 等待指定时间
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
const perfModuleUrl = new URL(import.meta.url);
if (process.argv[1] === perfModuleUrl.pathname) {
  const test = new WebSocketPerformanceTest(8080);

  test.runPerformanceTests()
    .then(() => {
      test.cleanup();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Performance test failed:', error);
      test.cleanup();
      process.exit(1);
    });
}
