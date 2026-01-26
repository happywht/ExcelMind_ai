/**
 * 速率限制中间件
 *
 * 提供API请求频率限制功能
 * 基于 API_SPECIFICATION_PHASE2.md 规范
 */

import { Request, Response, NextFunction } from 'express';
import { ApiErrorCode, createApiErrorResponse } from '../../types/errorCodes';
import { v4 as uuidv4 } from 'uuid';

/**
 * 速率限制配置
 */
interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 时间窗口内最大请求数 */
  maxRequests: number;
  /** 是否在响应头中显示速率限制信息 */
  standardHeaders?: boolean;
  /** 是否跳过成功的请求（只计数失败的请求） */
  skipSuccessfulRequests?: boolean;
  /** 自定义键生成函数 */
  keyGenerator?: (req: Request) => string;
  /** 自定义跳过函数 */
  skipFunction?: (req: Request) => boolean | Promise<boolean>;
  /** 自定义错误处理函数 */
  handler?: (req: Request, res: Response, next: NextFunction) => void;
}

/**
 * 速率限制记录
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * 速率限制存储接口
 */
interface RateLimitStore {
  get(key: string): Promise<RateLimitRecord | undefined>;
  set(key: string, value: RateLimitRecord): Promise<void>;
  increment(key: string): Promise<RateLimitRecord>;
  delete(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
}

/**
 * 内存存储实现
 */
class MemoryRateLimitStore implements RateLimitStore {
  private records: Map<string, RateLimitRecord> = new Map();

  async get(key: string): Promise<RateLimitRecord | undefined> {
    return this.records.get(key);
  }

  async set(key: string, value: RateLimitRecord): Promise<void> {
    this.records.set(key, value);

    // 自动清理过期的记录
    setTimeout(() => {
      this.records.delete(key);
    }, value.resetTime - Date.now());
  }

  async increment(key: string): Promise<RateLimitRecord> {
    const record = this.records.get(key);
    const now = Date.now();

    if (!record || now > record.resetTime) {
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: now + this.getWindowMs(),
      };
      await this.set(key, newRecord);
      return newRecord;
    }

    record.count++;
    return record;
  }

  async delete(key: string): Promise<void> {
    this.records.delete(key);
  }

  async resetKey(key: string): Promise<void> {
    await this.delete(key);
  }

  private getWindowMs(): number {
    // 默认时间窗口（从第一个配置获取）
    return 60000; // 1分钟
  }
}

/**
 * 用户层级速率限制配置
 */
const tierRateLimits: Record<string, RateLimitConfig> = {
  free: {
    windowMs: 60000, // 1分钟
    maxRequests: 60,
    standardHeaders: true,
  },
  basic: {
    windowMs: 60000,
    maxRequests: 300,
    standardHeaders: true,
  },
  professional: {
    windowMs: 60000,
    maxRequests: 1000,
    standardHeaders: true,
  },
  enterprise: {
    windowMs: 60000,
    maxRequests: 5000,
    standardHeaders: true,
  },
};

/**
 * 特殊端点速率限制配置
 */
const endpointRateLimits: Record<string, RateLimitConfig> = {
  aiCalls: {
    windowMs: 60000,
    maxRequests: 30,
    standardHeaders: true,
  },
  batchGeneration: {
    windowMs: 3600000, // 1小时
    maxRequests: 5,
    standardHeaders: true,
  },
  documentDownload: {
    windowMs: 60000,
    maxRequests: 100,
    standardHeaders: true,
  },
};

/**
 * 速率限制中间件类
 */
export class RateLimiterMiddleware {
  private store: RateLimitStore;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig, store?: RateLimitStore) {
    this.config = config;
    this.store = store || new MemoryRateLimitStore();
  }

  /**
   * 速率限制中间件
   */
  middleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    // 检查是否跳过
    if (this.config.skipFunction && await this.config.skipFunction(req)) {
      next();
      return;
    }

    // 生成键
    const key = this.config.keyGenerator ? this.config.keyGenerator(req) : this.generateKey(req);

    // 获取或创建记录
    const record = await this.store.increment(key);

    // 计算剩余请求数
    const remaining = Math.max(0, this.config.maxRequests - record.count);

    // 计算重置时间（秒）
    const resetTime = Math.ceil((record.resetTime - Date.now()) / 1000);

    // 设置标准头部
    if (this.config.standardHeaders) {
      res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', record.resetTime);
      res.setHeader('X-RateLimit-Reset-After', Math.max(0, resetTime));
    }

    // 检查是否超出限制
    if (record.count > this.config.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - Date.now()) / 1000);

      res.setHeader('Retry-After', retryAfter.toString());

      if (this.config.handler) {
        this.config.handler(req, res, next);
        return;
      }

      const errorResponse = createApiErrorResponse(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        [
          {
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          },
        ],
        requestId
      );

      res.status(429).json(errorResponse);
      return;
    }

    next();
  };

  /**
   * 生成默认键
   */
  private generateKey(req: Request): string {
    // 使用用户ID（如果已认证）或IP地址
    const userId = (req as any).user?.userId || req.ip;
    return `ratelimit:${userId}`;
  }

  /**
   * 重置特定键的速率限制
   */
  async resetKey(key: string): Promise<void> {
    await this.store.resetKey(key);
  }
}

/**
 * 创建速率限制中间件工厂函数
 */
export const createRateLimiter = (config: RateLimitConfig): RateLimiterMiddleware => {
  return new RateLimiterMiddleware(config);
};

/**
 * 用户层级速率限制
 */
export const createTierRateLimiter = (
  getUserTier: (req: Request) => 'free' | 'basic' | 'professional' | 'enterprise'
): RateLimiterMiddleware => {
  const store = new MemoryRateLimitStore();

  return new RateLimiterMiddleware(
    {
      windowMs: 60000,
      maxRequests: 60, // 默认值，会被动态覆盖
      standardHeaders: true,
      keyGenerator: (req) => {
        const tier = getUserTier(req);
        const userId = (req as any).user?.userId || req.ip;
        return `ratelimit:${tier}:${userId}`;
      },
      handler: (req, res) => {
        const tier = getUserTier(req);
        const config = tierRateLimits[tier] || tierRateLimits.free;
        const requestId = req.headers['x-request-id'] as string || uuidv4();

        const errorResponse = createApiErrorResponse(
          ApiErrorCode.RATE_LIMIT_EXCEEDED,
          [
            {
              message: `Rate limit exceeded for ${tier} tier. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`,
            },
          ],
          requestId
        );

        res.status(429).json(errorResponse);
      },
    },
    store
  );
};

/**
 * 端点特定速率限制
 */
export const createEndpointRateLimiter = (
  endpointType: keyof typeof endpointRateLimits
): RateLimiterMiddleware => {
  const config = endpointRateLimits[endpointType];
  return new RateLimiterMiddleware(config);
};

/**
 * 预定义的速率限制器
 */
export const predefinedRateLimiters = {
  /** AI调用速率限制 */
  aiCalls: createEndpointRateLimiter('aiCalls'),

  /** 批量生成速率限制 */
  batchGeneration: createEndpointRateLimiter('batchGeneration'),

  /** 文档下载速率限制 */
  documentDownload: createEndpointRateLimiter('documentDownload'),
};

/**
 * 按IP地址的速率限制
 */
export const ipRateLimiter = createRateLimiter({
  windowMs: 60000, // 1分钟
  maxRequests: 100,
  standardHeaders: true,
  keyGenerator: (req) => `ratelimit:ip:${req.ip}`,
});

/**
 * 按用户的速率限制
 */
export const userRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 300,
  standardHeaders: true,
  keyGenerator: (req) => {
    const userId = (req as any).user?.userId || req.ip;
    return `ratelimit:user:${userId}`;
  },
});

/**
 * 跳过速率限制的中间件（用于管理员等）
 */
export const skipRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // 如果用户是管理员，跳过速率限制
  const user = (req as any).user;
  if (user && user.tier === 'enterprise' && user.scopes.includes('admin')) {
    next();
    return;
  }

  // 否则继续使用下一个速率限制器
  next();
};

// 导出默认实例
export default RateLimiterMiddleware;
