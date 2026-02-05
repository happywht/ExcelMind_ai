# 基础设施服务 - DevOps 实施指南

## CI/CD 集成

### GitHub Actions 工作流

```yaml
name: Infrastructure Services CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'services/infrastructure/**'
  pull_request:
    paths:
      - 'services/infrastructure/**'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run infrastructure tests
        run: npm run test:infrastructure

      - name: Generate coverage report
        run: npm run test:infrastructure:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: infrastructure
          name: infrastructure-${{ matrix.node-version }}

      - name: Run performance benchmarks
        run: npm run bench:infrastructure

      - name: Archive benchmark results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: benchmark-results.txt

  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint -- services/infrastructure

      - name: Type check
        run: npm run type-check -- services/infrastructure
```

### GitLab CI 示例

```yaml
stages:
  - test
  - benchmark
  - report

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

test:infrastructure:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run test:infrastructure
    - npm run test:infrastructure:coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
    expire_in: 1 week

benchmark:infrastructure:
  stage: benchmark
  image: node:18
  script:
    - npm ci
    - npm run bench:infrastructure > benchmark-results.txt
  artifacts:
    paths:
      - benchmark-results.txt
    expire_in: 1 month
  only:
    - main
    - develop
```

## 监控和可观测性

### 性能监控

在缓存服务中添加性能指标：

```typescript
// services/infrastructure/monitoring.ts

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  record(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
  }

  getStats(operation: string) {
    const durations = this.metrics.get(operation) || [];
    if (durations.length === 0) return null;

    const sorted = [...durations].sort((a, b) => a - b);
    return {
      count: durations.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  exportMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [operation] of this.metrics) {
      result[operation] = this.getStats(operation);
    }
    return result;
  }
}

// 使用示例
const monitor = new PerformanceMonitor();

const startTime = performance.now();
await cache.get(key);
monitor.record('cache.get', performance.now() - startTime);
```

### 健康检查端点

```typescript
// services/infrastructure/health-check.ts

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    cache: { status: string; metrics?: any };
    eventBus: { status: string; metrics?: any };
    retry: { status: string };
  };
  timestamp: number;
}

export async function healthCheck(): Promise<HealthCheckResult> {
  const results = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    services: {
      cache: { status: 'unknown' },
      eventBus: { status: 'unknown' },
      retry: { status: 'unknown' }
    },
    timestamp: Date.now()
  };

  // 检查缓存服务
  try {
    const testKey = cache.generateKey('health', { check: true });
    await cache.set(testKey, { test: true }, 10);
    const result = await cache.get(testKey);
    await cache.delete(testKey);

    results.services.cache = {
      status: 'healthy',
      metrics: {
        memorySize: (cache as any).memoryCache?.size || 0
      }
    };
  } catch (error) {
    results.services.cache = { status: 'unhealthy' };
    results.status = 'degraded';
  }

  // 检查事件总线
  try {
    const testEvent = 'health.check.test';
    let received = false;

    const unsubscribe = eventBus.subscribe(testEvent, () => {
      received = true;
    });

    eventBus.publish(testEvent, {});
    unsubscribe();

    results.services.eventBus = {
      status: received ? 'healthy' : 'degraded',
      metrics: {
        registeredEvents: eventBus.registeredEvents().length
      }
    };
  } catch (error) {
    results.services.eventBus = { status: 'unhealthy' };
    results.status = 'degraded';
  }

  // 检查重试服务
  try {
    const retry = RetryStrategies.fastRetry();
    const operation = async () => ({ success: true });
    await retry.executeWithRetry(operation);

    results.services.retry = { status: 'healthy' };
  } catch (error) {
    results.services.retry = { status: 'unhealthy' };
    results.status = 'degraded';
  }

  return results;
}
```

## 日志聚合

### 结构化日志

```typescript
// services/infrastructure/logger.ts

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogEntry {
  level: LogLevel;
  service: string;
  operation: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class StructuredLogger {
  constructor(private service: string) {}

  private log(level: LogLevel, operation: string, message: string, metadata?: any) {
    const entry: LogEntry = {
      level,
      service: this.service,
      operation,
      message,
      timestamp: Date.now(),
      metadata
    };

    // 在开发环境输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify(entry));
    }

    // 在生产环境发送到日志服务
    if (process.env.NODE_ENV === 'production') {
      // 发送到日志聚合服务（如 ELK、Splunk 等）
      this.sendToLogService(entry);
    }
  }

  debug(operation: string, message: string, metadata?: any) {
    this.log(LogLevel.DEBUG, operation, message, metadata);
  }

  info(operation: string, message: string, metadata?: any) {
    this.log(LogLevel.INFO, operation, message, metadata);
  }

  warn(operation: string, message: string, metadata?: any) {
    this.log(LogLevel.WARN, operation, message, metadata);
  }

  error(operation: string, message: string, error?: Error, metadata?: any) {
    this.log(LogLevel.ERROR, operation, message, {
      ...metadata,
      error: error?.message,
      stack: error?.stack
    });
  }

  private sendToLogService(entry: LogEntry) {
    // 实现发送到日志服务的逻辑
    // 例如：fetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) })
  }
}

// 使用示例
const logger = new StructuredLogger('infrastructure');

logger.info('cache', 'Cache hit', { key: 'test', ttl: 300 });
logger.error('retry', 'Max retries exceeded', error, { attempts: 3 });
```

## 部署策略

### 环境配置

```typescript
// config/infrastructure.config.ts

interface InfrastructureConfig {
  environment: 'development' | 'staging' | 'production';
  cache: {
    strategy: 'memory' | 'hybrid';
    maxSize: number;
    ttl: number;
  };
  eventBus: {
    maxHistorySize: number;
    enablePersistence: boolean;
  };
  retry: {
    maxRetries: number;
    initialDelay: number;
    enableJitter: boolean;
  };
  monitoring: {
    enabled: boolean;
    endpoint?: string;
  };
}

export const getConfig = (): InfrastructureConfig => {
  const env = process.env.NODE_ENV || 'development';

  const configs: Record<string, InfrastructureConfig> = {
    development: {
      environment: 'development',
      cache: {
        strategy: 'memory',
        maxSize: 100,
        ttl: 300
      },
      eventBus: {
        maxHistorySize: 100,
        enablePersistence: false
      },
      retry: {
        maxRetries: 3,
        initialDelay: 100,
        enableJitter: true
      },
      monitoring: {
        enabled: true
      }
    },
    production: {
      environment: 'production',
      cache: {
        strategy: 'hybrid',
        maxSize: 1000,
        ttl: 1800
      },
      eventBus: {
        maxHistorySize: 1000,
        enablePersistence: true
      },
      retry: {
        maxRetries: 5,
        initialDelay: 1000,
        enableJitter: true
      },
      monitoring: {
        enabled: true,
        endpoint: process.env.MONITORING_ENDPOINT
      }
    }
  };

  return configs[env] || configs.development;
};
```

### Docker 配置

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY services/infrastructure ./services/infrastructure

# 安装依赖
RUN npm ci --only=production

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('./services/infrastructure/health-check').healthCheck()"

CMD ["npm", "start"]
```

## 性能优化建议

### 1. 缓存预热

```typescript
export async function warmupCache(cache: CacheService) {
  const logger = new StructuredLogger('infrastructure');

  logger.info('cache', 'Starting cache warmup');

  const commonQueries = [
    { query: 'SELECT * FROM users', sheets: ['users'] },
    { query: 'SELECT * FROM orders', sheets: ['orders'] }
  ];

  for (const query of commonQueries) {
    const key = cache.generateKey('sql_query', query);
    await cache.set(key, { rows: [], count: 0 }, 3600);
  }

  logger.info('cache', 'Cache warmup completed');
}
```

### 2. 事件总线优化

```typescript
// 批量事件处理
export class BatchEventProcessor {
  private batch: any[] = [];
  private timer?: NodeJS.Timeout;

  constructor(
    private eventBus: EventBus,
    private batchSize: number = 100,
    private flushInterval: number = 5000
  ) {
    this.startFlushTimer();
  }

  add(event: string, data: any) {
    this.batch.push({ event, data, timestamp: Date.now() });

    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  private flush() {
    if (this.batch.length === 0) return;

    // 批量发布
    for (const item of this.batch) {
      this.eventBus.publish(item.event, item.data);
    }

    this.batch = [];
  }

  private startFlushTimer() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.flush();
  }
}
```

### 3. 监控告警阈值

```typescript
// 监控阈值配置
export const AlertThresholds = {
  cache: {
    hitRate: 0.8,           // 命中率低于 80% 告警
    avgLatency: 10,         // 平均延迟超过 10ms 告警
    errorRate: 0.05         // 错误率超过 5% 告警
  },
  eventBus: {
    publishLatency: 1,      // 发布延迟超过 1ms 告警
    subscriberCount: 1000,  // 单个事件订阅者超过 1000 告警
    errorRate: 0.01         // 错误率超过 1% 告警
  },
  retry: {
    avgRetries: 2,          // 平均重试次数超过 2 告警
    failureRate: 0.1        // 失败率超过 10% 告警
  }
};
```

## 故障排查指南

### 常见问题

1. **缓存命中率低**
   - 检查 TTL 设置是否合理
   - 分析缓存键的生成逻辑
   - 考虑调整缓存层级策略

2. **事件总线内存泄漏**
   - 确保取消不再需要的订阅
   - 检查事件历史大小限制
   - 监控订阅者数量

3. **重试次数过多**
   - 调整重试策略参数
   - 检查网络连接质量
   - 分析失败原因分布

## 安全建议

1. **敏感数据缓存**
   ```typescript
   // 不要缓存敏感数据
   const sensitiveData = {
     password: 'xxx',  // ❌ 不要缓存
     token: 'xxx'      // ❌ 不要缓存
   };
   ```

2. **事件验证**
   ```typescript
   // 验证事件数据
   eventBus.subscribe('user.action', (data) => {
     if (!isValidUserData(data)) {
       logger.warn('eventBus', 'Invalid user data', data);
       return;
     }
     // 处理事件
   });
   ```

3. **重试保护**
   ```typescript
   // 限制重试次数，避免无限重试
   const retry = RetryStrategies.exponentialBackoff({
     maxRetries: 5,  // 设置上限
     maxDelay: 30000 // 最大延迟 30 秒
   });
   ```
