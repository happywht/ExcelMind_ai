/**
 * 降级策略演示
 *
 * 展示如何使用降级策略系统
 *
 * 运行方式: npm run demo:degradation
 */

import {
  DegradationManager,
  MemoryMonitor,
  APICircuitBreaker,
  DegradationNotifier,
  DegradationMode,
  DegradationLevel
} from './index';

/**
 * 演示 1: 内存监控
 */
async function demoMemoryMonitor() {
  console.log('\n=== 演示 1: 内存监控 ===\n');

  const monitor = new MemoryMonitor();

  // 开始监控
  monitor.startMonitoring();

  // 等待一会儿
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 获取当前状态
  const status = monitor.getCurrentStatus();
  console.log('内存状态:', {
    使用率: `${status.usagePercent.toFixed(1)}%`,
    压力状态: status.underPressure,
    溢出概率: `${(status.overflowProbability * 100).toFixed(1)}%`
  });

  // 获取统计信息
  const stats = monitor.getStatistics();
  console.log('内存统计:', {
    平均使用率: `${stats.averageUsage.toFixed(1)}%`,
    峰值使用率: `${stats.peakUsage.toFixed(1)}%`,
    压力次数: stats.pressureCount
  });

  // 停止监控
  monitor.stopMonitoring();
}

/**
 * 演示 2: API 熔断器
 */
async function demoAPICircuitBreaker() {
  console.log('\n=== 演示 2: API 熔断器 ===\n');

  const breaker = new APICircuitBreaker({
    failureThreshold: 50,    // 50% 失败率
    minimumRequests: 5,      // 最少 5 次请求
    openDuration: 10000,     // 熔断 10 秒
    halfOpenMaxCalls: 2      // 半开状态 2 次测试
  });

  // 模拟 API 调用
  console.log('模拟 API 调用...\n');

  // 前 5 次调用：3 次失败，2 次成功
  for (let i = 0; i < 5; i++) {
    const success = i < 2; // 前 2 次成功
    breaker.recordCall(success, 1000 + Math.random() * 1000);
    console.log(`调用 ${i + 1}: ${success ? '成功' : '失败'}`);
  }

  // 检查状态
  let state = breaker.getState();
  console.log('\n熔断器状态:', {
    是否开启: state.isOpen,
    失败率: `${state.failureRate.toFixed(1)}%`,
    总调用次数: state.totalCalls
  });

  // 继续调用（可能触发熔断）
  console.log('\n继续调用...');
  for (let i = 0; i < 5; i++) {
    const allowed = breaker.allowRequest();
    console.log(`调用 ${i + 1}: ${allowed ? '允许' : '拒绝'}`);

    if (allowed) {
      breaker.recordCall(i % 2 === 0, 1000);
    }
  }

  state = breaker.getState();
  console.log('\n最终状态:', {
    是否开启: state.isOpen,
    失败率: `${state.failureRate.toFixed(1)}%`,
    总调用次数: state.totalCalls
  });

  // 获取统计信息
  const stats = breaker.getStatistics();
  console.log('\n统计信息:', {
    总开启次数: stats.totalOpens,
    成功率: `${stats.uptimePercentage.toFixed(1)}%`
  });
}

/**
 * 演示 3: 降级通知器
 */
async function demoDegradationNotifier() {
  console.log('\n=== 演示 3: 降级通知器 ===\n');

  const notifier = new DegradationNotifier();

  // 注册通知回调
  const unsubscribe1 = notifier.onNotification((notification) => {
    console.log('\n[通知]', {
      类型: notification.type,
      标题: notification.title,
      消息: notification.message,
      当前模式: notification.currentMode
    });
  });

  // 注册事件监听器
  const unsubscribe2 = notifier.onEvent((event) => {
    console.log('\n[事件]', {
      类型: event.type,
      消息: event.message,
      时间: event.timestamp
    });
  });

  // 模拟模式变更
  console.log('模拟模式变更...\n');
  notifier.notifyModeChange(
    DegradationMode.BROWSER,
    DegradationMode.HYBRID,
    '内存使用率过高',
    {
      memoryUsage: 80,
      fileSize: 25 * 1024 * 1024,
      apiFailureRate: 10,
      avgExecutionTime: 15,
      consecutiveFailures: 0,
      lastUpdate: new Date()
    }
  );

  await new Promise(resolve => setTimeout(resolve, 500));

  // 模拟预警
  console.log('\n模拟预警...\n');
  notifier.notifyWarning(
    'memory',
    '内存使用率达到 85%',
    DegradationLevel.WARNING
  );

  await new Promise(resolve => setTimeout(resolve, 500));

  // 模拟恢复
  console.log('\n模拟恢复...\n');
  notifier.notifyRecoverySuccess(
    DegradationMode.HYBRID,
    DegradationMode.BROWSER,
    '系统指标恢复正常'
  );

  // 取消订阅
  unsubscribe1();
  unsubscribe2();
}

/**
 * 演示 4: 降级管理器
 */
async function demoDegradationManager() {
  console.log('\n=== 演示 4: 降级管理器 ===\n');

  const manager = new DegradationManager();

  // 获取初始状态
  let state = manager.getCurrentState();
  console.log('初始状态:', {
    当前模式: state.currentMode,
    当前级别: state.currentLevel
  });

  // 模拟文件上传
  console.log('\n模拟大文件上传...');
  manager.recordFileSize(25 * 1024 * 1024); // 25MB
  await new Promise(resolve => setTimeout(resolve, 100));

  // 模拟 API 失败
  console.log('模拟 API 失败...');
  manager.recordAPICall(false, 5000);
  manager.recordAPICall(false, 6000);
  manager.recordAPICall(false, 7000);

  // 执行健康检查
  console.log('\n执行健康检查...');
  const health = manager.performHealthCheck();
  console.log('健康检查结果:', {
    是否健康: health.isHealthy,
    整体评分: `${health.overallScore.toFixed(1)}%`,
    推荐模式: health.recommendedMode,
    检查项: health.checks
  });

  // 获取统计信息
  const stats = manager.getStatistics();
  console.log('\n统计信息:', {
    当前状态: stats.currentState.currentMode,
    健康检查: stats.healthCheck.isHealthy,
    恢复尝试次数: stats.recoveryAttempts
  });

  // 清理
  manager.destroy();
}

/**
 * 演示 5: 完整降级流程
 */
async function demoCompleteFlow() {
  console.log('\n=== 演示 5: 完整降级流程 ===\n');

  const manager = new DegradationManager();
  const notifier = new DegradationNotifier();

  // 监听通知
  notifier.onNotification((notification) => {
    console.log('\n[系统通知]', notification.title, '-', notification.message);
  });

  console.log('开始任务...\n');

  // 模拟正常执行
  manager.recordExecution(5); // 5 秒
  console.log('任务执行完成，用时 5 秒');

  await new Promise(resolve => setTimeout(resolve, 500));

  // 模拟内存压力
  console.log('\n检测到内存压力...');
  manager.recordFileSize(28 * 1024 * 1024); // 28MB

  const health1 = manager.performHealthCheck();
  if (!health1.isHealthy) {
    console.log(`健康检查失败 (评分: ${health1.overallScore.toFixed(1)}%)`);
    console.log(`推荐模式: ${health1.recommendedMode}`);

    // 执行降级
    await manager.executeDegradation(
      health1.recommendedMode,
      '内存使用率过高'
    );
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 模拟恢复
  console.log('\n系统指标改善，尝试恢复...');
  const canRecover = manager.canRecover();
  console.log('是否可以恢复:', canRecover);

  if (canRecover) {
    const recovered = await manager.attemptRecovery();
    console.log('恢复结果:', recovered ? '成功' : '失败');
  }

  // 清理
  manager.destroy();
  notifier.destroy();
}

/**
 * 主函数
 */
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     ExcelMind AI - 降级策略演示              ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    await demoMemoryMonitor();
    await demoAPICircuitBreaker();
    await demoDegradationNotifier();
    await demoDegradationManager();
    await demoCompleteFlow();

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║              演示完成                         ║');
    console.log('╚════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('演示过程中出错:', error);
    process.exit(1);
  }
}

// 运行演示
if (require.main === module) {
  main().catch(console.error);
}

export {
  demoMemoryMonitor,
  demoAPICircuitBreaker,
  demoDegradationNotifier,
  demoDegradationManager,
  demoCompleteFlow
};
