# AI 服务降级策略

## 概述

AI 服务降级策略是 ExcelMind AI 的核心容错机制，确保系统在各种故障情况下仍能提供服务。

## 架构设计

### 三级降级模式

```
┌─────────────────────────────────────────────────────────────┐
│                     正常模式 (Normal)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  浏览器模式 (Pyodide) - 完全本地执行                    │   │
│  │  - 优势：零网络延迟、数据隐私                           │   │
│  │  - 限制：30MB 文件、1.2GB 内存                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ 检测到风险
┌─────────────────────────────────────────────────────────────┐
│                   降级模式 1 (Hybrid)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  混合模式 - 前端预处理 + 后端 AI                        │   │
│  │  - 前端：文件解析、基础计算 (Pyodide)                    │   │
│  │  - 后端：AI 分析、复杂计算                              │   │
│  │  - 网络需求：仅 AI 调用                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ 持续失败
┌─────────────────────────────────────────────────────────────┐
│                   降级模式 2 (Backend)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  纯后端模式 - 完全服务器端执行                          │   │
│  │  - 所有处理在后端完成                                   │   │
│  │  - 前端仅显示结果                                       │   │
│  │  - 网络需求：完整文件上传                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. DegradationManager（降级管理器）

**职责**：降级策略的核心控制器

- 监控风险指标
- 决策降级时机
- 管理降级状态
- 触发降级动作

**使用示例**：

```typescript
import { DegradationManager } from './services/infrastructure/degradation';

const manager = new DegradationManager();

// 执行降级
await manager.executeDegradation('hybrid', 'High memory usage');

// 尝试恢复
const recovered = await manager.attemptRecovery();

// 健康检查
const health = manager.performHealthCheck();
```

### 2. MemoryMonitor（内存监控器）

**职责**：Pyodide 内存监控

- 实时监控内存使用
- 预测内存溢出风险
- 触发内存清理

**使用示例**：

```typescript
import { MemoryMonitor } from './services/infrastructure/degradation';

const monitor = new MemoryMonitor();

// 开始监控
monitor.startMonitoring();

// 检查内存压力
if (monitor.isUnderPressure()) {
  console.warn('Memory under pressure');
}

// 预测溢出
if (monitor.predictOverflow(fileSize)) {
  console.error('File too large, may cause overflow');
}
```

### 3. APICircuitBreaker（API 熔断器）

**职责**：AI API 熔断保护

- 记录 API 调用成功率
- 熔断保护
- 自动恢复

**使用示例**：

```typescript
import { APICircuitBreaker } from './services/infrastructure/degradation';

const breaker = new APICircuitBreaker();

// 记录调用
breaker.recordCall(true, 1500); // 成功，1.5秒
breaker.recordCall(false, 3000); // 失败，3秒

// 检查是否允许请求
if (breaker.allowRequest()) {
  // 执行 API 调用
}
```

### 4. DegradationNotifier（降级通知器）

**职责**：降级状态通知

- 向前端发送状态变更
- WebSocket 事件推送
- 记录降级历史

**使用示例**：

```typescript
import { DegradationNotifier } from './services/infrastructure/degradation';

const notifier = new DegradationNotifier();

// 注册回调
const unsubscribe = notifier.onNotification((notification) => {
  console.log('Notification:', notification);
});

// 通知模式变更
notifier.notifyModeChange('browser', 'hybrid', 'High memory usage');
```

## 配置说明

### 降级阈值配置

```typescript
// config/degradation.config.ts

export const DEGRADATION_THRESHOLDS = {
  memoryWarning: 75,    // 75% - 内存使用预警线
  memoryCritical: 90,   // 90% - 内存使用临界线
  fileSizeWarning: 20 * 1024 * 1024,   // 20MB
  fileSizeCritical: 30 * 1024 * 1024,  // 30MB
  apiFailureWarning: 20,  // 20% - API 失败率预警
  apiFailureCritical: 50, // 50% - API 失败率临界
  executionTimeout: 60    // 60 秒 - 执行超时阈值
};
```

### 恢复配置

```typescript
export const RECOVERY_CONFIG = {
  checkInterval: 30000,        // 30 秒 - 检查间隔
  minStableTime: 60000,        // 60 秒 - 最小稳定时间
  maxRecoveryAttempts: 3       // 最多尝试 3 次恢复
};
```

### 模式配置

```typescript
export const MODE_CONFIG = {
  browser: {
    maxFileSize: 30 * 1024 * 1024,   // 30MB
    maxMemory: 1.2 * 1024 * 1024 * 1024 // 1.2GB
  },
  hybrid: {
    maxFileSize: 50 * 1024 * 1024,   // 50MB
    apiFallback: true
  },
  backend: {
    maxFileSize: 100 * 1024 * 1024,  // 100MB
    requiresNetwork: true
  }
};
```

## 集成指南

### 在 AgenticOrchestrator 中集成

```typescript
import { DegradationManager } from '../infrastructure/degradation';

export class AgenticOrchestrator {
  private degradationManager: DegradationManager;

  constructor() {
    this.degradationManager = new DegradationManager();
  }

  async executeTask(userPrompt: string, dataFiles: DataFileInfo[]) {
    // 健康检查
    const healthCheck = this.degradationManager.performHealthCheck();
    if (!healthCheck.isHealthy) {
      // 根据健康检查结果调整策略
    }

    // 记录文件大小
    this.degradationManager.recordFileSize(totalFileSize);

    try {
      // 执行任务
      const result = await this.executeTaskFlow();

      // 记录执行时间
      this.degradationManager.recordExecution(duration);

      return result;
    } catch (error) {
      // 错误处理
    }
  }
}
```

### 在 ZhipuService 中集成熔断器

```typescript
import { APICircuitBreaker } from './infrastructure/degradation';

let circuitBreaker: APICircuitBreaker | null = null;

export async function generateDataProcessingCode(...) {
  const breaker = getCircuitBreaker();

  // 检查熔断器状态
  if (!breaker.allowRequest()) {
    return fallbackResponse;
  }

  try {
    // 调用 AI API
    const result = await client.messages.create(...);

    // 记录成功
    breaker.recordCall(true, duration);

    return result;
  } catch (error) {
    // 记录失败
    breaker.recordCall(false, duration);

    throw error;
  }
}
```

## 前端集成

### 接收降级通知

```typescript
import { DegradationNotifier } from './services/infrastructure/degradation';

const notifier = new DegradationNotifier();

// 监听通知
notifier.onNotification((notification) => {
  switch (notification.type) {
    case 'warning':
      showWarning(notification.message);
      break;
    case 'error':
      showError(notification.message);
      break;
    case 'success':
      showSuccess(notification.message);
      break;
  }
});

// 监听事件
notifier.onEvent((event) => {
  console.log('Degradation event:', event);
});
```

### 显示降级状态

```typescript
function DegradationStatusIndicator() {
  const [state, setState] = useState<DegradationState | null>(null);

  useEffect(() => {
    const unsubscribe = notifier.onNotification((notification) => {
      // 更新状态显示
      setState(notification);
    });

    return unsubscribe;
  }, []);

  if (!state) return null;

  return (
    <div className={`degradation-indicator ${state.type}`}>
      <span>{state.title}</span>
      <p>{state.message}</p>
    </div>
  );
}
```

## 监控和调试

### 获取降级状态

```typescript
const manager = new DegradationManager();

// 获取当前状态
const currentState = manager.getCurrentState();
console.log('Current mode:', currentState.currentMode);
console.log('Current level:', currentState.currentLevel);

// 获取统计信息
const stats = manager.getStatistics();
console.log('Statistics:', stats);
```

### 健康检查

```typescript
const health = manager.performHealthCheck();

console.log('Is healthy:', health.isHealthy);
console.log('Overall score:', health.overallScore);
console.log('Recommended mode:', health.recommendedMode);
console.log('Checks:', health.checks);
```

### 查看历史

```typescript
const notifier = new DegradationNotifier();

// 获取事件历史
const events = notifier.getEventHistory(10);
console.log('Recent events:', events);

// 获取降级历史
const history = notifier.getHistory(10);
console.log('Degradation history:', history);
```

## 测试

### 单元测试

```typescript
import { DegradationManager } from './services/infrastructure/degradation';

describe('DegradationManager', () => {
  it('should degrade to hybrid mode when memory is high', async () => {
    const manager = new DegradationManager();

    // 模拟高内存使用
    manager.recordFileSize(25 * 1024 * 1024); // 25MB

    // 检查降级决策
    const decision = manager.makeDegradationDecision();

    expect(decision.shouldDegrade).toBe(true);
    expect(decision.targetMode).toBe('hybrid');
  });
});
```

### 集成测试

```typescript
import { AgenticOrchestrator } from './services/agentic/AgenticOrchestrator';

describe('Degradation Integration', () => {
  it('should handle degradation during task execution', async () => {
    const orchestrator = new AgenticOrchestrator();

    // 执行任务
    const result = await orchestrator.executeTask(prompt, files);

    // 验证降级状态
    const stats = orchestrator.getStatistics();
    expect(stats.degradationState).toBeDefined();
  });
});
```

## 最佳实践

1. **定期监控**：定期检查降级状态和健康指标
2. **及时响应**：根据降级通知及时调整策略
3. **日志记录**：记录所有降级事件以便分析
4. **测试覆盖**：确保降级逻辑有充分的测试覆盖
5. **用户透明**：向用户清晰地传达降级状态和影响

## 故障排查

### 问题：熔断器频繁开启

**可能原因**：
- API 服务不稳定
- 网络连接问题
- 阈值设置过低

**解决方案**：
1. 检查网络连接
2. 调整熔断器阈值
3. 增加重试逻辑

### 问题：内存持续增长

**可能原因**：
- 内存泄漏
- 文件过大
- Pyodide 限制

**解决方案**：
1. 检查内存泄漏
2. 限制文件大小
3. 触发降级到后端模式

### 问题：恢复失败

**可能原因**：
- 系统未稳定
- 阈值设置不当
- 恢复尝试次数不足

**解决方案**：
1. 增加稳定时间
2. 调整恢复阈值
3. 增加重试次数

## 性能影响

降级策略对系统性能的影响：

- **正常模式**：无影响（< 1% CPU 开销）
- **监控开销**：约 2-5% CPU
- **内存开销**：约 10-20MB
- **网络开销**：仅在降级通知时产生

## 参考资料

- [PHASE2_GO_NO_GO_DECISION.md](../../docs/PHASE2_GO_NO_GO_DECISION.md) - 风险缓解措施
- [degradationTypes.ts](../../types/degradationTypes.ts) - 类型定义
- [degradation.config.ts](../../config/degradation.config.ts) - 配置文件
