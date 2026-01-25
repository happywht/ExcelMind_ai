/**
 * 访问控制服务
 *
 * 提供文件访问权限管理和验证功能
 *
 * @module infrastructure/vfs/utils/AccessControl
 * @version 1.0.0
 */

import { EventEmitter } from 'events';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 文件所有者信息
 */
export interface FileOwner {
  /** 用户 ID */
  userId: string;
  /** 会话 ID */
  sessionId: string;
  /** 创建时间 */
  createdAt: Date;
  /** 用户名（可选，用于日志） */
  username?: string;
}

/**
 * 文件权限信息
 */
export interface FilePermissions {
  /** 允许读取的用户 ID 列表 */
  read: string[];
  /** 允许写入的用户 ID 列表 */
  write: string[];
  /** 允许删除的用户 ID 列表 */
  delete: string[];
  /** 是否公开可读 */
  publicRead?: boolean;
}

/**
 * 访问控制规则
 */
export interface AccessControlRule {
  /** 规则 ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 应用此规则的用户 ID 列表 */
  applyTo: string[];
  /** 允许的操作 */
  allow: {
    /** 可读取的文件角色 */
    readRoles?: string[];
    /** 可写入的文件角色 */
    writeRoles?: string[];
    /** 可删除的文件角色 */
    deleteRoles?: string[];
  };
  /** 拒绝的操作 */
  deny?: {
    /** 不可读取的文件角色 */
    readRoles?: string[];
    /** 不可写入的文件角色 */
    writeRoles?: string[];
    /** 不可删除的文件角色 */
    deleteRoles?: string[];
  };
  /** 优先级（数值越大优先级越高） */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 访问请求
 */
export interface AccessRequest {
  /** 用户 ID */
  userId: string;
  /** 会话 ID */
  sessionId: string;
  /** 文件 ID */
  fileId: string;
  /** 文件所有者 */
  fileOwner?: FileOwner;
  /** 文件权限 */
  filePermissions?: FilePermissions;
  /** 请求的操作类型 */
  operation: 'read' | 'write' | 'delete';
  /** 文件角色（可选，用于规则匹配） */
  fileRole?: string;
}

/**
 * 访问控制结果
 */
export interface AccessResult {
  /** 是否允许访问 */
  allowed: boolean;
  /** 拒绝原因（如果不允许） */
  reason?: string;
  /** 应用的规则 ID */
  appliedRule?: string;
}

/**
 * 访问控制配置
 */
export interface AccessControlConfig {
  /** 是否启用访问控制 */
  enabled?: boolean;
  /** 是否启用默认所有者权限 */
  ownerAlwaysHasAccess?: boolean;
  /** 是否记录访问日志 */
  enableLogging?: boolean;
  /** 默认权限策略 */
  defaultPolicy?: 'allow' | 'deny';
}

// ============================================================================
// 自定义错误类
// ============================================================================

/**
 * 未授权错误
 */
export class UnauthorizedError extends Error {
  public readonly code: string = 'UNAUTHORIZED';
  public readonly userId: string;
  public readonly operation: string;
  public readonly fileId: string;

  constructor(message: string, userId: string, operation: string, fileId: string) {
    super(message);
    this.name = 'UnauthorizedError';
    this.userId = userId;
    this.operation = operation;
    this.fileId = fileId;
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

// ============================================================================
// 访问控制服务类
// ============================================================================

/**
 * 访问控制服务类
 */
export class AccessControlService extends EventEmitter {
  private static instance: AccessControlService | null = null;
  private rules: Map<string, AccessControlRule> = new Map();
  private config: Required<AccessControlConfig>;

  private readonly DEFAULT_CONFIG: Required<AccessControlConfig> = {
    enabled: true,
    ownerAlwaysHasAccess: true,
    enableLogging: true,
    defaultPolicy: 'allow',
  };

  private constructor(config: AccessControlConfig = {}) {
    super();
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    console.log('[AccessControlService] Service created with config:', this.config);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: AccessControlConfig): AccessControlService {
    if (!AccessControlService.instance) {
      AccessControlService.instance = new AccessControlService(config);
    }
    return AccessControlService.instance;
  }

  /**
   * 检查访问权限
   *
   * @param request - 访问请求
   * @returns 访问控制结果
   */
  public checkAccess(request: AccessRequest): AccessResult {
    // 如果访问控制未启用，默认允许
    if (!this.config.enabled) {
      return { allowed: true };
    }

    const { userId, fileOwner, filePermissions, operation } = request;

    // 日志记录
    if (this.config.enableLogging) {
      console.log(`[AccessControlService] Checking access:`, {
        userId,
        operation,
        fileId: request.fileId,
      });
    }

    // 规则 1: 文件所有者总是拥有完全访问权限
    if (this.config.ownerAlwaysHasAccess && fileOwner) {
      if (fileOwner.userId === userId) {
        if (this.config.enableLogging) {
          console.log(`[AccessControlService] ✅ Access granted: User is file owner`);
        }
        return { allowed: true };
      }
    }

    // 规则 2: 检查基于角色的访问控制规则
    const ruleResult = this.checkRules(request);
    if (!ruleResult.allowed) {
      this.emit('access:denied', request);
      return ruleResult;
    }

    // 规则 3: 检查文件级权限
    if (filePermissions) {
      const permResult = this.checkPermissions(request, filePermissions);
      if (!permResult.allowed) {
        this.emit('access:denied', request);
        return permResult;
      }
    }

    // 规则 4: 默认策略
    if (this.config.defaultPolicy === 'deny') {
      const result: AccessResult = {
        allowed: false,
        reason: '默认拒绝策略：未授予访问权限',
      };
      this.emit('access:denied', request);
      return result;
    }

    // 允许访问
    if (this.config.enableLogging) {
      console.log(`[AccessControlService] ✅ Access granted`);
    }
    this.emit('access:granted', request);
    return { allowed: true };
  }

  /**
   * 快速检查读取权限
   *
   * @param fileId - 文件 ID
   * @param userId - 用户 ID
   * @param fileOwner - 文件所有者
   * @param filePermissions - 文件权限
   * @returns 是否允许读取
   */
  public checkReadPermission(
    fileId: string,
    userId: string,
    fileOwner?: FileOwner,
    filePermissions?: FilePermissions
  ): boolean {
    const result = this.checkAccess({
      userId,
      sessionId: '',
      fileId,
      fileOwner,
      filePermissions,
      operation: 'read',
    });
    return result.allowed;
  }

  /**
   * 快速检查写入权限
   *
   * @param fileId - 文件 ID
   * @param userId - 用户 ID
   * @param fileOwner - 文件所有者
   * @param filePermissions - 文件权限
   * @returns 是否允许写入
   */
  public checkWritePermission(
    fileId: string,
    userId: string,
    fileOwner?: FileOwner,
    filePermissions?: FilePermissions
  ): boolean {
    const result = this.checkAccess({
      userId,
      sessionId: '',
      fileId,
      fileOwner,
      filePermissions,
      operation: 'write',
    });
    return result.allowed;
  }

  /**
   * 快速检查删除权限
   *
   * @param fileId - 文件 ID
   * @param userId - 用户 ID
   * @param fileOwner - 文件所有者
   * @param filePermissions - 文件权限
   * @returns 是否允许删除
   */
  public checkDeletePermission(
    fileId: string,
    userId: string,
    fileOwner?: FileOwner,
    filePermissions?: FilePermissions
  ): boolean {
    const result = this.checkAccess({
      userId,
      sessionId: '',
      fileId,
      fileOwner,
      filePermissions,
      operation: 'delete',
    });
    return result.allowed;
  }

  /**
   * 添加访问控制规则
   *
   * @param rule - 访问控制规则
   * @returns 规则 ID
   */
  public addRule(rule: Omit<AccessControlRule, 'id'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: AccessControlRule = {
      ...rule,
      id: ruleId,
    };

    this.rules.set(ruleId, newRule);
    console.log(`[AccessControlService] Rule added: ${ruleId}`);

    this.emit('rule:added', newRule);
    return ruleId;
  }

  /**
   * 移除访问控制规则
   *
   * @param ruleId - 规则 ID
   * @returns 是否成功移除
   */
  public removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      console.log(`[AccessControlService] Rule removed: ${ruleId}`);
      this.emit('rule:removed', ruleId);
    }
    return deleted;
  }

  /**
   * 获取所有规则
   *
   * @returns 访问控制规则列表
   */
  public getRules(): AccessControlRule[] {
    return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * 清空所有规则
   */
  public clearRules(): void {
    this.rules.clear();
    console.log('[AccessControlService] All rules cleared');
    this.emit('rules:cleared');
  }

  /**
   * 创建默认权限
   *
   * @param userId - 所有者用户 ID
   * @param sessionId - 会话 ID
   * @returns 文件权限对象
   */
  public createDefaultPermissions(userId: string, sessionId: string): {
    owner: FileOwner;
    permissions: FilePermissions;
  } {
    const owner: FileOwner = {
      userId,
      sessionId,
      createdAt: new Date(),
    };

    const permissions: FilePermissions = {
      read: [userId],
      write: [userId],
      delete: [userId],
      publicRead: false,
    };

    return { owner, permissions };
  }

  /**
   * 授予用户权限
   *
   * @param permissions - 文件权限
   * @param targetUserId - 目标用户 ID
   * @param operations - 允许的操作列表
   * @returns 更新后的权限
   */
  public grantPermission(
    permissions: FilePermissions,
    targetUserId: string,
    operations: ('read' | 'write' | 'delete')[]
  ): FilePermissions {
    const updated = { ...permissions };

    for (const op of operations) {
      if (!updated[op].includes(targetUserId)) {
        updated[op].push(targetUserId);
      }
    }

    console.log(`[AccessControlService] Granted ${operations.join(', ')} permission to user: ${targetUserId}`);
    return updated;
  }

  /**
   * 撤销用户权限
   *
   * @param permissions - 文件权限
   * @param targetUserId - 目标用户 ID
   * @param operations - 撤销的操作列表
   * @returns 更新后的权限
   */
  public revokePermission(
    permissions: FilePermissions,
    targetUserId: string,
    operations: ('read' | 'write' | 'delete')[]
  ): FilePermissions {
    const updated = { ...permissions };

    for (const op of operations) {
      updated[op] = updated[op].filter(id => id !== targetUserId);
    }

    console.log(`[AccessControlService] Revoked ${operations.join(', ')} permission from user: ${targetUserId}`);
    return updated;
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 检查基于规则的访问控制
   */
  private checkRules(request: AccessRequest): AccessResult {
    // 按优先级排序规则
    const sortedRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      // 检查规则是否适用于此用户
      if (!rule.applyTo.includes(request.userId)) {
        continue;
      }

      // 检查拒绝规则
      if (rule.deny) {
        const denyRoles = rule.deny[`${request.operation}Roles` as keyof typeof rule.deny];
        if (denyRoles && request.fileRole && denyRoles.includes(request.fileRole)) {
          return {
            allowed: false,
            reason: `被规则 "${rule.name}" 拒绝`,
            appliedRule: rule.id,
          };
        }
      }

      // 检查允许规则
      if (rule.allow) {
        const allowRoles = rule.allow[`${request.operation}Roles` as keyof typeof rule.allow];
        if (allowRoles && request.fileRole && allowRoles.includes(request.fileRole)) {
          return {
            allowed: true,
            appliedRule: rule.id,
          };
        }
      }
    }

    // 没有匹配的规则，继续下一步检查
    return { allowed: true };
  }

  /**
   * 检查文件级权限
   */
  private checkPermissions(
    request: AccessRequest,
    permissions: FilePermissions
  ): AccessResult {
    const { userId, operation } = request;

    // 检查公开读取权限
    if (operation === 'read' && permissions.publicRead) {
      return { allowed: true };
    }

    // 检查用户是否在权限列表中
    const allowedUsers = permissions[operation];
    if (!allowedUsers.includes(userId)) {
      return {
        allowed: false,
        reason: `用户未被授权执行 ${operation} 操作`,
      };
    }

    return { allowed: true };
  }

  /**
   * 记录访问日志
   */
  private logAccess(request: AccessRequest, result: AccessResult): void {
    if (!this.config.enableLogging) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: request.userId,
      operation: request.operation,
      fileId: request.fileId,
      allowed: result.allowed,
      reason: result.reason,
    };

    console.log('[AccessControlService] Access log:', logEntry);
    this.emit('access:logged', logEntry);
  }
}

// ============================================================================
// 导出
// ============================================================================

/**
 * 导出单例获取函数
 */
export const getAccessControlService = (config?: AccessControlConfig): AccessControlService => {
  return AccessControlService.getInstance(config);
};

/**
 * 默认导出
 */
export default AccessControlService;
