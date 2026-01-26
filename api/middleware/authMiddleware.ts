/**
 * 认证中间件
 *
 * 提供API认证和授权功能
 * 基于 API_SPECIFICATION_PHASE2.md 规范
 */

import { logger } from '@/utils/logger';
import { Request, Response, NextFunction } from 'express';
import { ApiErrorCode, createApiErrorResponse } from '../../types/errorCodes';
import { v4 as uuidv4 } from 'uuid';

/**
 * 认证配置
 */
interface AuthConfig {
  /** 是否启用认证 */
  enabled?: boolean;
  /** API密钥头部名称 */
  apiKeyHeader?: string;
  /** 有效的API密钥列表 */
  validApiKeys?: Set<string>;
  /** 自定义验证函数 */
  customValidator?: (apiKey: string, req: Request) => boolean | Promise<boolean>;
}

/**
 * 默认认证配置
 */
const defaultConfig: AuthConfig = {
  enabled: process.env.AUTH_ENABLED !== 'false', // 默认启用
  apiKeyHeader: 'x-api-key',
  validApiKeys: new Set(process.env.API_KEYS?.split(',') || []),
};

/**
 * 权限范围
 */
export enum PermissionScope {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  EXECUTE = 'execute',
  ADMIN = 'admin',
}

/**
 * 用户信息
 */
interface UserInfo {
  userId: string;
  apiKey: string;
  scopes: PermissionScope[];
  tier: 'free' | 'basic' | 'professional' | 'enterprise';
}

/**
 * 请求扩展接口
 */
interface AuthenticatedRequest extends Request {
  user?: UserInfo;
  apiKey?: string;
}

/**
 * 认证中间件类
 */
export class AuthMiddleware {
  private config: AuthConfig;

  constructor(config: AuthConfig = defaultConfig) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * API密钥认证中间件
   */
  apiKeyAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // 如果明确禁用认证，跳过验证
    if (this.config.enabled === false) {
      logger.info('⚠️ 认证已禁用 - 跳过API密钥验证');
      next();
      return;
    }

    const requestId = req.headers['x-request-id'] as string || uuidv4();

    // 获取API密钥
    const apiKey = this.extractApiKey(req);

    if (!apiKey) {
      const errorResponse = createApiErrorResponse(
        ApiErrorCode.UNAUTHORIZED,
        [
          {
            field: 'authorization',
            message: 'API key is required. Provide it via X-API-Key header or Authorization header',
          },
        ],
        requestId
      );
      res.status(401).json(errorResponse);
      return;
    }

    // 验证API密钥
    const isValid = this.validateApiKey(apiKey, req);

    if (!isValid) {
      const errorResponse = createApiErrorResponse(
        ApiErrorCode.UNAUTHORIZED,
        [
          {
            field: 'authorization',
            message: 'Invalid API key',
          },
        ],
        requestId
      );
      res.status(401).json(errorResponse);
      return;
    }

    // 将用户信息附加到请求
    req.user = this.getUserInfo(apiKey);
    req.apiKey = apiKey;

    next();
  };

  /**
   * 权限检查中间件
   */
  requirePermission = (...requiredScopes: PermissionScope[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      const requestId = req.headers['x-request-id'] as string || uuidv4();

      // 如果明确禁用认证，跳过验证
      if (this.config.enabled === false) {
        next();
        return;
      }

      // 检查用户是否存在
      if (!req.user) {
        const errorResponse = createApiErrorResponse(
          ApiErrorCode.UNAUTHORIZED,
          [
            {
              field: 'authorization',
              message: 'Authentication required',
            },
          ],
          requestId
        );
        res.status(401).json(errorResponse);
        return;
      }

      // 检查权限
      const hasPermission = requiredScopes.some((scope) =>
        req.user!.scopes.includes(scope)
      );

      if (!hasPermission) {
        const errorResponse = createApiErrorResponse(
          ApiErrorCode.FORBIDDEN,
          [
            {
              field: 'authorization',
              message: `Insufficient permissions. Required: ${requiredScopes.join(' or ')}`,
            },
          ],
          requestId
        );
        res.status(403).json(errorResponse);
        return;
      }

      next();
    };
  };

  /**
   * 用户层级检查中间件
   */
  requireTier = (...requiredTiers: Array<'free' | 'basic' | 'professional' | 'enterprise'>) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      const requestId = req.headers['x-request-id'] as string || uuidv4();

      // 如果明确禁用认证，跳过验证
      if (this.config.enabled === false) {
        next();
        return;
      }

      // 检查用户是否存在
      if (!req.user) {
        const errorResponse = createApiErrorResponse(
          ApiErrorCode.UNAUTHORIZED,
          [
            {
              field: 'authorization',
              message: 'Authentication required',
            },
          ],
          requestId
        );
        res.status(401).json(errorResponse);
        return;
      }

      // 检查用户层级
      const tierOrder = ['free', 'basic', 'professional', 'enterprise'];
      const userTierIndex = tierOrder.indexOf(req.user.tier);
      const requiredTierIndex = Math.min(...requiredTiers.map((tier) => tierOrder.indexOf(tier)));

      if (userTierIndex < requiredTierIndex) {
        const errorResponse = createApiErrorResponse(
          ApiErrorCode.FORBIDDEN,
          [
            {
              field: 'authorization',
              message: `This feature requires ${requiredTiers.join(' or ')} tier or higher`,
            },
          ],
          requestId
        );
        res.status(403).json(errorResponse);
        return;
      }

      next();
    };
  };

  /**
   * 提取API密钥
   */
  private extractApiKey(req: Request): string | undefined {
    // 从 X-API-Key 头部获取
    const apiKeyFromHeader = req.headers[this.config.apiKeyHeader || 'x-api-key'] as string;
    if (apiKeyFromHeader) {
      return apiKeyFromHeader;
    }

    // 从 Authorization 头部获取
    const authHeader = req.headers.authorization;
    if (authHeader) {
      // 支持 Bearer token 格式
      const matches = authHeader.match(/^Bearer\s+(.+)$/);
      if (matches && matches[1]) {
        return matches[1];
      }

      // 直接使用 Authorization 头部的值
      return authHeader;
    }

    // 从查询参数获取（不推荐，但支持）
    const apiKeyFromQuery = req.query.api_key as string;
    if (apiKeyFromQuery) {
      return apiKeyFromQuery;
    }

    return undefined;
  }

  /**
   * 验证API密钥
   */
  private validateApiKey(apiKey: string, req: Request): boolean {
    // 使用自定义验证函数
    if (this.config.customValidator) {
      const result = this.config.customValidator(apiKey, req);
      // 如果是Promise，需要处理，但这里简化为同步
      if (result instanceof Promise) {
        logger.warn('Custom validator returns Promise, using synchronous fallback');
        return false;
      }
      return result;
    }

    // 使用默认验证逻辑
    if (this.config.validApiKeys && this.config.validApiKeys.size > 0) {
      return this.config.validApiKeys.has(apiKey);
    }

    // 如果没有配置验证逻辑，默认拒绝
    return false;
  }

  /**
   * 获取用户信息
   */
  private getUserInfo(apiKey: string): UserInfo {
    // TODO: 从数据库或缓存中获取实际的用户信息
    // 这里是模拟实现

    const tier = this.getUserTier(apiKey);

    return {
      userId: this.generateUserId(apiKey),
      apiKey,
      scopes: this.getScopesForTier(tier),
      tier,
    };
  }

  /**
   * 根据API密钥生成用户ID
   */
  private generateUserId(apiKey: string): string {
    // 实际实现中应该从数据库获取
    return `user_${Buffer.from(apiKey).toString('base64').substring(0, 8)}`;
  }

  /**
   * 获取用户层级
   */
  private getUserTier(apiKey: string): 'free' | 'basic' | 'professional' | 'enterprise' {
    // 实际实现中应该从数据库获取
    // 这里是模拟实现
    if (apiKey.startsWith('enterprise_')) return 'enterprise';
    if (apiKey.startsWith('professional_')) return 'professional';
    if (apiKey.startsWith('basic_')) return 'basic';
    return 'free';
  }

  /**
   * 根据层级获取权限范围
   */
  private getScopesForTier(tier: string): PermissionScope[] {
    const scopesByTier = {
      free: [PermissionScope.READ],
      basic: [PermissionScope.READ, PermissionScope.WRITE],
      professional: [PermissionScope.READ, PermissionScope.WRITE, PermissionScope.EXECUTE],
      enterprise: [
        PermissionScope.READ,
        PermissionScope.WRITE,
        PermissionScope.DELETE,
        PermissionScope.EXECUTE,
        PermissionScope.ADMIN,
      ],
    };

    return scopesByTier[tier as keyof typeof scopesByTier] || scopesByTier.free;
  }
}

/**
 * 认证中间件工厂函数
 */
export const createAuthMiddleware = (config?: AuthConfig): AuthMiddleware => {
  return new AuthMiddleware(config);
};

/**
 * 默认认证中间件实例
 */
export const authMiddleware = new AuthMiddleware();

/**
 * 常用认证中间件快捷导出
 */
export const requireAuth = authMiddleware.apiKeyAuth;
export const requireRead = authMiddleware.requirePermission(PermissionScope.READ);
export const requireWrite = authMiddleware.requirePermission(PermissionScope.WRITE);
export const requireDelete = authMiddleware.requirePermission(PermissionScope.DELETE);
export const requireExecute = authMiddleware.requirePermission(PermissionScope.EXECUTE);
export const requireAdmin = authMiddleware.requirePermission(PermissionScope.ADMIN);

/**
 * 层级检查快捷导出
 */
export const requireBasic = authMiddleware.requireTier('basic', 'professional', 'enterprise');
export const requireProfessional = authMiddleware.requireTier('professional', 'enterprise');
export const requireEnterprise = authMiddleware.requireTier('enterprise');

// 导出默认实例
export default authMiddleware;
