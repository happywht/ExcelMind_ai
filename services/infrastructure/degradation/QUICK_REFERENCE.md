# 降级策略快速参考

## 快速开始

### 1. 导入

```typescript
import {
  DegradationManager,
  MemoryMonitor,
  APICircuitBreaker,
  DegradationNotifier
} from './services/infrastructure/degradation';
```

### 2. 创建实例

```typescript
// 创建降级管理器
const manager = new DegradationManager();

// 创建内存监控器
const monitor = new MemoryMonitor();

// 创建熔断器
const breaker = new APICircuitBreaker();

// 创建通知器
const notifier = new DegradationNotifier();
```

### 3. 基本使用

#### 降级管理器

```typescript
// 执行降级
await manager.executeDegradation('hybrid', 'High memory usage');

// 尝试恢复
const recovered = await manager.attemptRecovery();

// 健康检查
const health = manager.performHealthCheck();
console.log(health.isHealthy, health.recommendedMode);

// 记录指标
manager.recordFileSize(25 * 1024 * 1024); // 25MB
manager.recordExecution(15.5); // 15.5 秒
manager.recordAPICall(true, 2000); // 成功，2 秒
```

#### 内存监控器

```typescript
// 开始监控
monitor.startMonitoring();

// 检查状态
const status = monitor.getCurrentStatus();
console.log(status.usagePercent); // 内存使用率
console.log(status.underPressure); // 是否压力状态

// 预测溢出
const willOverflow = monitor.predictOverflow(fileSize);

// 停止监控
monitor.stopMonitoring();
```

#### API 熔断器

```typescript
// 检查是否允许请求
if (breaker.allowRequest()) {
  // 执行 API 调用
  try {
    const result = await apiCall();
    breaker.recordCall(true, duration); // 成功
  } catch (error) {
    breaker.recordCall(false, duration); // 失败
  }
}

// 获取状态
const state = breaker.getState();
console.log(state.isOpen); // 是否熔断
console.log(state.failureRate); // 失败率
```

#### 降级通知器

```typescript
// 监听通知
const unsubscribe = notifier.onNotification((notification) => {
  console.log(notification.type, notification.title, notification.message);
});

// 监听事件
notifier.onEvent((event) => {
  console.log(event.type, event.message);
});

// 手动通知
notifier.notifyModeChange('browser', 'hybrid', 'Reason');
notifier.notifyWarning('memory', 'High memory usage', 'warning');
```

## 配置

### 默认阈值

```typescript
{
  memoryWarning: 75,    // 75% 内存预警
  memoryCritical: 90,   // 90% 内存临界
  fileSizeWarning: 20 * 1024 * 1024,  // 20MB
  fileSizeCritical: 30 * 1024 * 1024, // 30MB
  apiFailureWarning: 20,  // 20% API 失败率预警
  apiFailureCritical: 50, // 50% API 失败率临界
  executionTimeout: 60    // 60 秒超时
}
```

### 自定义配置

```typescript
const manager = new DegradationManager({
  thresholds: {
    memoryWarning: 80,
    memoryCritical: 95
  },
  recovery: {
    checkInterval: 60000,  // 60 秒
    minStableTime: 120000  // 2 分钟
  }
});
```

## 降级模式

### 浏览器模式 (Browser)
- **优先级**: 最高
- **限制**: 30MB 文件，1.2GB 内存
- **优势**: 零延迟，数据隐私
- **适用**: 小文件，快速处理

### 混合模式 (Hybrid)
- **优先级**: 中等
- **限制**: 50MB 文件
- **优势**: 平衡性能和能力
- **适用**: 中等文件，需要 AI

### 后端模式 (Backend)
- **优先级**: 最低
- **限制**: 100MB 文件
- **优势**: 完整功能，无内存限制
- **适用**: 大文件，复杂处理

## 常见模式

### 1. 在 API 调用中使用熔断器

```typescript
async function callAIWithCircuitBreaker(prompt: string) {
  const breaker = getCircuitBreaker();

  if (!breaker.allowRequest()) {
    throw new Error('Circuit breaker is open');
  }

  const startTime = Date.now();
  try {
    const result = await client.messages.create({ prompt });
    breaker.recordCall(true, Date.now() - startTime);
    return result;
  } catch (error) {
    breaker.recordCall(false, Date.now() - startTime);
    throw error;
  }
}
```

### 2. 监控内存并降级

```typescript
const monitor = new MemoryMonitor();
monitor.startMonitoring();

setInterval(() => {
  const status = monitor.getCurrentStatus();

  if (status.usagePercent > 85) {
    console.warn('Memory pressure detected');
    // 触发降级
    degradationManager.executeDegradation('hybrid', 'High memory');
  }
}, 5000);
```

### 3. 健康检查和自动恢复

```typescript
const manager = new DegradationManager();

setInterval(async () => {
  const health = manager.performHealthCheck();

  if (!health.isHealthy && health.recommendedMode !== currentMode) {
    await manager.executeDegradation(
      health.recommendedMode,
      'Health check failed'
    );
  }

  if (manager.canRecover()) {
    await manager.attemptRecovery();
  }
}, 30000); // 每 30 秒检查
```

### 4. 前端通知集成

```typescript
const notifier = new DegradationNotifier();

// 显示通知
notifier.onNotification((notification) => {
  switch (notification.type) {
    case 'warning':
      toast.warning(notification.title, { description: notification.message });
      break;
    case 'error':
      toast.error(notification.title, { description: notification.message });
      break;
    case 'success':
      toast.success(notification.title, { description: notification.message });
      break;
  }
});

// 更新 UI 状态
notifier.onEvent((event) => {
  if (event.type === 'mode_changed') {
    updateModeIndicator(event.toMode);
  }
});
```

## 调试技巧

### 1. 查看当前状态

```typescript
const manager = new DegradationManager();
const state = manager.getCurrentState();

console.log({
  currentMode: state.currentMode,
  currentLevel: state.currentLevel,
  metrics: state.metrics,
  canRecover: state.canRecover
});
```

### 2. 查看历史

```typescript
const notifier = new DegradationNotifier();

// 获取最近 10 个事件
const events = notifier.getEventHistory(10);
events.forEach(event => console.log(event));

// 获取最近 10 次降级历史
const history = notifier.getHistory(10);
history.forEach(h => console.log(h));
```

### 3. 性能分析

```typescript
const manager = new DegradationManager();
const stats = manager.getStatistics();

console.log({
  currentState: stats.currentState,
  healthCheck: stats.healthCheck,
  memoryStats: stats.memoryStats,
  circuitStats: stats.circuitStats
});
```

### 4. 手动触发降级

```typescript
const manager = new DegradationManager();

// 测试降级
await manager.executeDegradation('backend', 'Manual test');

// 查看结果
console.log(manager.getCurrentState());

// 测试恢复
await manager.attemptRecovery();
```

## 最佳实践

1. **始终记录执行时间**
   ```typescript
   manager.recordExecution(duration);
   ```

2. **记录文件大小**
   ```typescript
   manager.recordFileSize(file.size);
   ```

3. **记录 API 调用结果**
   ```typescript
   breaker.recordCall(success, duration);
   ```

4. **定期健康检查**
   ```typescript
   setInterval(() => manager.performHealthCheck(), 30000);
   ```

5. **清理资源**
   ```typescript
   manager.destroy();
   monitor.destroy();
   ```

## 故障排查

### 问题：熔断器频繁开启

**检查**：
```typescript
const state = breaker.getState();
console.log('Failure rate:', state.failureRate);
console.log('Total calls:', state.totalCalls);
```

**解决**：
- 调整阈值
- 检查网络连接
- 增加重试逻辑

### 问题：内存持续增长

**检查**：
```typescript
const status = monitor.getCurrentStatus();
console.log('Memory usage:', status.usagePercent);
const trend = monitor.getMemoryTrend();
console.log('Trend:', trend);
```

**解决**：
- 触发清理：`monitor.forceCleanup()`
- 降级到后端模式
- 限制文件大小

### 问题：恢复失败

**检查**：
```typescript
console.log('Can recover:', manager.canRecover());
const health = manager.performHealthCheck();
console.log('Health:', health);
```

**解决**：
- 增加稳定时间
- 调整恢复阈值
- 检查系统状态

## 工具函数

```typescript
// 格式化文件大小
formatFileSize(1024 * 1024); // "1.0 MB"

// 格式化内存使用率
formatMemoryUsage(85); // "⚠️ 85.0%"

// 获取模式文本
getDegradationModeText('hybrid'); // "混合模式"

// 获取级别文本
getDegradationLevelText('warning'); // "预警"

// 判断是否应该降级
shouldDegrade('browser', 'hybrid'); // true

// 判断是否是恢复
isRecovery('backend', 'hybrid'); // true
```

## 参考资料

- [完整文档](./README.md)
- [实施总结](./IMPLEMENTATION_SUMMARY.md)
- [类型定义](../../types/degradationTypes.ts)
- [配置文件](../../config/degradation.config.ts)
