# 统一日志系统使用指南

## 📋 概述

统一日志系统提供了环境感知的日志管理功能，支持不同级别的日志输出，并在生产环境中自动优化性能。

## 🚀 快速开始

### 基础使用

```typescript
import { logger } from '@/utils/logger';

// 错误日志 - 生产环境保留
logger.error('用户登录失败', { userId, error });

// 警告日志 - 生产环境保留
logger.warn('API响应延迟', { endpoint, duration });

// 信息日志 - 开发环境
logger.info('用户登录成功', { userId });

// 调试日志 - 开发环境
logger.debug('处理数据', { data });

// 追踪日志 - 开发环境（包含堆栈跟踪）
logger.trace('函数调用', { function: 'processData' });
```

### 创建命名日志器

```typescript
import { createLogger } from '@/utils/logger';

const userLogger = createLogger('UserService');
userLogger.info('创建用户', { userId });
// 输出: [2024-01-26T10:00:00.000Z] [UserService] [INFO] 创建用户 { userId: '123' }
```

### 子日志器

```typescript
const parentLogger = createLogger('API');
const childLogger = parentLogger.createChild('User');
// 输出: [API:User] 模块前缀
```

## 🎯 日志级别

| 级别 | 值 | 生产环境 | 使用场景 |
|-----|---|--------|---------|
| ERROR | 0 | ✅ 保留 | 错误和异常 |
| WARN | 1 | ✅ 保留 | 警告和潜在问题 |
| INFO | 2 | ❌ 移除 | 信息和业务流程 |
| DEBUG | 3 | ❌ 移除 | 调试和开发信息 |
| TRACE | 4 | ❌ 移除 | 详细的执行追踪 |

## ⚙️ 配置

### 环境变量配置

在 `.env` 文件中配置：

```bash
# .env.development
VITE_LOG_LEVEL=debug

# .env.production
VITE_LOG_LEVEL=warn
```

支持的级别值：`error`, `warn`, `info`, `debug`, `trace`

### 代码配置

```typescript
import { createLogger, LogLevel } from '@/utils/logger';

const logger = createLogger('MyModule', {
  minLevel: LogLevel.DEBUG,           // 最低日志级别
  enableTimestamp: true,              // 启用时间戳
  enableModulePrefix: true,           // 启用模块前缀
  enableColors: true,                 // 启用颜色（浏览器）
  enableTrace: true,                  // 启用堆栈跟踪
});
```

## 📝 最佳实践

### 1. 错误日志（ERROR）

```typescript
// ✅ 正确：记录关键错误
try {
  await apiCall();
} catch (error) {
  logger.error('API调用失败', { endpoint, error });
  throw error;
}

// ❌ 错误：过度使用
logger.error('用户输入了错误的数据'); // 应该用warn或info
```

### 2. 警告日志（WARN）

```typescript
// ✅ 正确：记录潜在问题
if (response.status >= 400) {
  logger.warn('API返回非成功状态', { status, endpoint });
}

// ✅ 正确：记录降级处理
if (featureFlag.disabled) {
  logger.warn('功能已禁用，使用备用方案', { feature: 'advanced-search' });
}
```

### 3. 信息日志（INFO）

```typescript
// ✅ 正确：记录业务流程关键节点
logger.info('用户注册成功', { userId, email });
logger.info('订单创建', { orderId, amount });

// ❌ 错误：过于琐碎的日志
logger.info('渲染组件'); // 应该用debug
```

### 4. 调试日志（DEBUG）

```typescript
// ✅ 正确：记录开发调试信息
logger.debug('API请求数据', { url, params, body });
logger.debug('组件渲染', { props, state });

// ❌ 错误：生产环境需要的日志不要用debug
logger.debug('用户支付成功'); // 应该用info
```

### 5. 追踪日志（TRACE）

```typescript
// ✅ 正确：记录详细执行流程
logger.trace('函数调用开始', { function: 'processData', args });

// 在关键函数中
function processData(data: any) {
  logger.trace('processData调用', { data });
  // ... 处理逻辑
}
```

## 🔄 迁移指南

### 从console迁移

```typescript
// ❌ 旧代码
console.log('用户登录', user);
console.error('错误发生', error);
console.debug('调试信息', data);

// ✅ 新代码
import { logger } from '@/utils/logger';

logger.info('用户登录', { user });
logger.error('错误发生', { error });
logger.debug('调试信息', { data });
```

### 在React组件中使用

```typescript
import { createLogger } from '@/utils/logger';
import { useEffect } from 'react';

const logger = createLogger('UserProfile');

export function UserProfile({ userId }: { userId: string }) {
  useEffect(() => {
    logger.info('组件挂载', { userId });

    return () => {
      logger.debug('组件卸载', { userId });
    };
  }, [userId]);

  const handleClick = () => {
    logger.debug('按钮点击', { userId });
  };

  return <button onClick={handleClick}>Profile</button>;
}
```

### 在服务中使用

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('UserService');

export class UserService {
  async getUser(id: string) {
    logger.debug('获取用户', { id });

    try {
      const user = await api.getUser(id);
      logger.info('用户获取成功', { id, user });
      return user;
    } catch (error) {
      logger.error('用户获取失败', { id, error });
      throw error;
    }
  }
}
```

## 🧪 测试

### 单元测试中禁用日志

```typescript
import { logger } from '@/utils/logger';

beforeEach(() => {
  // 禁用日志输出
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
});
```

### 验证日志调用

```typescript
import { logger } from '@/utils/logger';

test('should log error on failure', () => {
  const errorSpy = jest.spyOn(logger, 'error');

  // 触发错误
  await expect(doSomething()).rejects.toThrow();

  expect(errorSpy).toHaveBeenCalledWith(
    '操作失败',
    expect.any(Object)
  );
});
```

## 📊 性能优化

### 1. 条件日志

对于复杂的日志对象，使用条件判断：

```typescript
// ❌ 低效：生产环境也会创建对象
logger.debug('复杂数据', { data: heavyComputation() });

// ✅ 高效：只在需要时计算
if (process.env.NODE_ENV === 'development') {
  logger.debug('复杂数据', { data: heavyComputation() });
}
```

### 2. 延迟计算

```typescript
// ✅ 使用函数延迟计算
logger.debug('数据', () => ({
  result: expensiveOperation(),
}));
```

## 🔍 调试技巧

### 1. 模块级调试

```typescript
// 在特定文件中创建详细日志器
const debugLogger = createLogger('MyModule', {
  minLevel: LogLevel.TRACE,
});
```

### 2. 临时启用TRACE

```typescript
// 在调试时临时启用
logger.setLevel(LogLevel.TRACE);

// 调试结束后恢复
logger.setLevel(LogLevel.DEBUG);
```

### 3. 环境变量控制

```bash
# 启用详细日志
VITE_LOG_LEVEL=trace npm run dev

# 只显示错误
VITE_LOG_LEVEL=error npm run dev
```

## 🎨 高级用法

### 1. 日志拦截

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('App');

// 发送错误到监控服务
const originalError = logger.error.bind(logger);
logger.error = (message: string, ...args: any[]) => {
  originalError(message, ...args);

  // 发送到监控服务
  if (args[0]?.error) {
    monitoringService.captureError(args[0].error);
  }
};
```

### 2. 日志聚合

```typescript
// 收集日志用于测试
const logs: string[] = [];

const testLogger = createLogger('Test', {
  minLevel: LogLevel.TRACE,
});

// 重写log方法
testLogger.info = (message: string, ...args: any[]) => {
  logs.push(`[INFO] ${message}`);
};
```

## 📚 API参考

### ILogger接口

```typescript
interface ILogger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  trace(message: string, ...args: any[]): void;
  setLevel(level: LogLevel): void;
  setModule(moduleName: string): void;
}
```

### LogLevel枚举

```typescript
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}
```

### createLogger函数

```typescript
function createLogger(
  moduleName: string,
  config?: Partial<LoggerConfig>
): ILogger
```

## ⚠️ 注意事项

1. **生产环境**：只输出ERROR和WARN级别日志
2. **性能**：避免在日志中进行复杂计算
3. **隐私**：不要记录敏感信息（密码、token等）
4. **一致性**：在模块级别使用createLogger创建命名日志器
5. **维护性**：使用结构化数据（对象）而非字符串拼接

## 🎯 总结

统一日志系统提供了：

- ✅ 环境感知的日志级别控制
- ✅ 统一的日志格式和命名空间
- ✅ 生产环境的性能优化
- ✅ 灵活的配置选项
- ✅ 易于使用的API

使用统一日志系统替代console，提升代码质量和可维护性！
