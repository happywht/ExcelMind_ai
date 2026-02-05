/**
 * AccessControl 单元测试
 *
 * 测试范围：
 * - 访问控制检查
 * - 权限管理
 * - 规则管理
 * - 访问日志记录
 */

import {
  AccessControlService,
  FileOwner,
  FilePermissions,
  UnauthorizedError,
  getAccessControlService,
} from '../AccessControl';

// ============================================================================
// 测试辅助函数
// ============================================================================

const createMockOwner = (userId: string, sessionId: string = 'session1'): FileOwner => ({
  userId,
  sessionId,
  createdAt: new Date(),
  username: `user_${userId}`,
});

const createMockPermissions = (ownerId: string): FilePermissions => ({
  read: [ownerId],
  write: [ownerId],
  delete: [ownerId],
  publicRead: false,
});

// ============================================================================
// 测试套件
// ============================================================================

describe('AccessControlService', () => {
  let acs: AccessControlService;

  beforeEach(() => {
    // 清理单例
    (AccessControlService as any).instance = null;
    acs = AccessControlService.getInstance({
      enabled: true,
      enableLogging: false, // 禁用日志以减少测试输出
      defaultPolicy: 'deny',
    });
  });

  afterEach(() => {
    // 清理规则
    acs.clearRules();
  });

  // ========================================================================
  // 单例模式测试
  // ========================================================================

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const acs1 = AccessControlService.getInstance();
      const acs2 = getAccessControlService();
      expect(acs1).toBe(acs2);
    });

    it('应该使用首次配置', () => {
      const acs1 = AccessControlService.getInstance({ enabled: false });
      const acs2 = AccessControlService.getInstance({ enabled: true });
      // 首次配置生效
      expect((acs1 as any).config.enabled).toBe(false);
      expect(acs1).toBe(acs2);
    });
  });

  // ========================================================================
  // 文件所有者权限测试
  // ========================================================================

  describe('文件所有者权限', () => {
    it('所有者应该拥有读取权限', () => {
      const owner = createMockOwner('user1');
      const permissions = createMockPermissions('user1');

      const hasPermission = acs.checkReadPermission('file1', 'user1', owner, permissions);
      expect(hasPermission).toBe(true);
    });

    it('所有者应该拥有写入权限', () => {
      const owner = createMockOwner('user1');
      const permissions = createMockPermissions('user1');

      const hasPermission = acs.checkWritePermission('file1', 'user1', owner, permissions);
      expect(hasPermission).toBe(true);
    });

    it('所有者应该拥有删除权限', () => {
      const owner = createMockOwner('user1');
      const permissions = createMockPermissions('user1');

      const hasPermission = acs.checkDeletePermission('file1', 'user1', owner, permissions);
      expect(hasPermission).toBe(true);
    });

    it('其他用户不应该拥有权限（默认策略）', () => {
      const owner = createMockOwner('user1');
      const permissions = createMockPermissions('user1');

      const readPermission = acs.checkReadPermission('file1', 'user2', owner, permissions);
      const writePermission = acs.checkWritePermission('file1', 'user2', owner, permissions);
      const deletePermission = acs.checkDeletePermission('file1', 'user2', owner, permissions);

      expect(readPermission).toBe(false);
      expect(writePermission).toBe(false);
      expect(deletePermission).toBe(false);
    });
  });

  // ========================================================================
  // 权限管理测试
  // ========================================================================

  describe('权限管理', () => {
    it('应该授予用户读取权限', () => {
      const permissions = createMockPermissions('user1');
      const updated = acs.grantPermission(permissions, 'user2', ['read']);

      expect(updated.read).toContain('user2');
      expect(updated.read).toContain('user1');
      expect(updated.write).not.toContain('user2');
    });

    it('应该授予用户多个权限', () => {
      const permissions = createMockPermissions('user1');
      const updated = acs.grantPermission(permissions, 'user2', ['read', 'write']);

      expect(updated.read).toContain('user2');
      expect(updated.write).toContain('user2');
      expect(updated.delete).not.toContain('user2');
    });

    it('应该撤销用户权限', () => {
      const permissions = createMockPermissions('user1');
      const updated = acs.revokePermission(permissions, 'user1', ['read']);

      expect(updated.read).not.toContain('user1');
      expect(updated.write).toContain('user1'); // 写入权限未撤销
    });

    it('应该撤销多个权限', () => {
      const permissions = createMockPermissions('user1');
      const updated = acs.revokePermission(permissions, 'user1', ['read', 'write', 'delete']);

      expect(updated.read).not.toContain('user1');
      expect(updated.write).not.toContain('user1');
      expect(updated.delete).not.toContain('user1');
    });

    it('公开读取应该允许任何人读取', () => {
      const owner = createMockOwner('user1');
      const permissions: FilePermissions = {
        read: ['user1'],
        write: ['user1'],
        delete: ['user1'],
        publicRead: true,
      };

      const hasPermission = acs.checkReadPermission('file1', 'user2', owner, permissions);
      expect(hasPermission).toBe(true);
    });
  });

  // ========================================================================
  // 访问控制检查测试
  // ========================================================================

  describe('访问控制检查', () => {
    it('应该允许授权用户读取', () => {
      const owner = createMockOwner('user1');
      const permissions = createMockPermissions('user1');
      const updated = acs.grantPermission(permissions, 'user2', ['read']);

      const result = acs.checkAccess({
        userId: 'user2',
        sessionId: 'session1',
        fileId: 'file1',
        fileOwner: owner,
        filePermissions: updated,
        operation: 'read',
      });

      expect(result.allowed).toBe(true);
    });

    it('应该拒绝未授权用户读取', () => {
      const owner = createMockOwner('user1');
      const permissions = createMockPermissions('user1');

      const result = acs.checkAccess({
        userId: 'user2',
        sessionId: 'session1',
        fileId: 'file1',
        fileOwner: owner,
        filePermissions: permissions,
        operation: 'read',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('应该拒绝未授权用户写入', () => {
      const owner = createMockOwner('user1');
      const permissions = createMockPermissions('user1');

      const result = acs.checkAccess({
        userId: 'user2',
        sessionId: 'session1',
        fileId: 'file1',
        fileOwner: owner,
        filePermissions: permissions,
        operation: 'write',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('应该拒绝未授权用户删除', () => {
      const owner = createMockOwner('user1');
      const permissions = createMockPermissions('user1');

      const result = acs.checkAccess({
        userId: 'user2',
        sessionId: 'session1',
        fileId: 'file1',
        fileOwner: owner,
        filePermissions: permissions,
        operation: 'delete',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('当访问控制禁用时应该允许所有操作', () => {
      (AccessControlService as any).instance = null;
      const acsDisabled = AccessControlService.getInstance({ enabled: false });

      const result = acsDisabled.checkAccess({
        userId: 'user2',
        sessionId: 'session1',
        fileId: 'file1',
        operation: 'read',
      });

      expect(result.allowed).toBe(true);
    });

    it('应该允许默认策略', () => {
      (AccessControlService as any).instance = null;
      const acsAllow = AccessControlService.getInstance({
        enabled: true,
        defaultPolicy: 'allow',
      });

      const result = acsAllow.checkAccess({
        userId: 'user2',
        sessionId: 'session1',
        fileId: 'file1',
        operation: 'read',
      });

      expect(result.allowed).toBe(true);
    });
  });

  // ========================================================================
  // 规则管理测试
  // ========================================================================

  describe('规则管理', () => {
    it('应该添加规则', () => {
      const ruleId = acs.addRule({
        name: '测试规则',
        applyTo: ['user1', 'user2'],
        allow: {
          readRoles: ['primary_source'],
        },
        priority: 10,
        enabled: true,
      });

      expect(ruleId).toBeDefined();
      expect(ruleId.slice(0, 5)).toBe('rule_');

      const rules = acs.getRules();
      expect(rules.length).toBe(1);
      expect(rules[0].id).toBe(ruleId);
    });

    it('应该移除规则', () => {
      const ruleId = acs.addRule({
        name: '测试规则',
        applyTo: ['user1'],
        allow: { readRoles: ['primary_source'] },
        priority: 10,
        enabled: true,
      });

      const removed = acs.removeRule(ruleId);
      expect(removed).toBe(true);

      const rules = acs.getRules();
      expect(rules.length).toBe(0);
    });

    it('应该按优先级排序规则', () => {
      acs.addRule({
        name: '低优先级',
        applyTo: ['user1'],
        allow: { readRoles: ['output'] },
        priority: 1,
        enabled: true,
      });

      acs.addRule({
        name: '高优先级',
        applyTo: ['user1'],
        allow: {},
        deny: { readRoles: ['primary_source'] },
        priority: 100,
        enabled: true,
      });

      const rules = acs.getRules();
      expect(rules[0].name).toBe('高优先级');
      expect(rules[1].name).toBe('低优先级');
    });

    it('应该只返回启用的规则', () => {
      acs.addRule({
        name: '启用规则',
        applyTo: ['user1'],
        allow: { readRoles: ['primary_source'] },
        priority: 10,
        enabled: true,
      });

      acs.addRule({
        name: '禁用规则',
        applyTo: ['user1'],
        allow: {},
        deny: { readRoles: ['output'] },
        priority: 20,
        enabled: false,
      });

      const rules = acs.getRules();
      expect(rules.length).toBe(1);
      expect(rules[0].name).toBe('启用规则');
    });

    it('应该清空所有规则', () => {
      acs.addRule({
        name: '规则1',
        applyTo: ['user1'],
        allow: { readRoles: ['primary_source'] },
        priority: 10,
        enabled: true,
      });

      acs.addRule({
        name: '规则2',
        applyTo: ['user2'],
        allow: { readRoles: ['output'] },
        priority: 20,
        enabled: true,
      });

      acs.clearRules();

      const rules = acs.getRules();
      expect(rules.length).toBe(0);
    });
  });

  // ========================================================================
  // 基于规则的访问控制测试
  // ========================================================================

  describe('基于规则的访问控制', () => {
    it('应该根据允许规则授权', () => {
      acs.addRule({
        name: '允许读取输出文件',
        applyTo: ['user1'],
        allow: {
          readRoles: ['output'],
        },
        priority: 10,
        enabled: true,
      });

      const result = acs.checkAccess({
        userId: 'user1',
        sessionId: 'session1',
        fileId: 'file1',
        operation: 'read',
        fileRole: 'output',
      });

      expect(result.allowed).toBe(true);
      expect(result.appliedRule).toBeDefined();
    });

    it('应该根据拒绝规则拒绝', () => {
      acs.addRule({
        name: '拒绝读取配置文件',
        applyTo: ['user1'],
        allow: {},
        deny: {
          readRoles: ['configuration'],
        },
        priority: 10,
        enabled: true,
      });

      const result = acs.checkAccess({
        userId: 'user1',
        sessionId: 'session1',
        fileId: 'file1',
        operation: 'read',
        fileRole: 'configuration',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('拒绝');
    });

    it('高优先级规则应该覆盖低优先级规则', () => {
      // 低优先级：允许读取
      acs.addRule({
        name: '允许读取',
        applyTo: ['user1'],
        allow: { readRoles: ['primary_source'] },
        priority: 1,
        enabled: true,
      });

      // 高优先级：拒绝读取
      acs.addRule({
        name: '拒绝读取',
        applyTo: ['user1'],
        allow: {},
        deny: { readRoles: ['primary_source'] },
        priority: 100,
        enabled: true,
      });

      const result = acs.checkAccess({
        userId: 'user1',
        sessionId: 'session1',
        fileId: 'file1',
        operation: 'read',
        fileRole: 'primary_source',
      });

      expect(result.allowed).toBe(false);
    });

    it('规则应该只应用于指定用户', () => {
      acs.addRule({
        name: '允许 user1 读取',
        applyTo: ['user1'],
        allow: { readRoles: ['primary_source'] },
        priority: 10,
        enabled: true,
      });

      const result1 = acs.checkAccess({
        userId: 'user1',
        sessionId: 'session1',
        fileId: 'file1',
        operation: 'read',
        fileRole: 'primary_source',
      });

      const result2 = acs.checkAccess({
        userId: 'user2',
        sessionId: 'session1',
        fileId: 'file1',
        operation: 'read',
        fileRole: 'primary_source',
      });

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true); // 默认策略允许
    });
  });

  // ========================================================================
  // 默认权限创建测试
  // ========================================================================

  describe('默认权限创建', () => {
    it('应该创建默认权限', () => {
      const { owner, permissions } = acs.createDefaultPermissions('user1', 'session1');

      expect(owner.userId).toBe('user1');
      expect(owner.sessionId).toBe('session1');
      expect(owner.createdAt).toBeInstanceOf(Date);

      expect(permissions.read).toEqual(['user1']);
      expect(permissions.write).toEqual(['user1']);
      expect(permissions.delete).toEqual(['user1']);
      expect(permissions.publicRead).toBe(false);
    });

    it('应该为不同用户创建独立的权限', () => {
      const { owner: owner1, permissions: perm1 } = acs.createDefaultPermissions('user1', 'session1');
      const { owner: owner2, permissions: perm2 } = acs.createDefaultPermissions('user2', 'session2');

      expect(owner1.userId).not.toBe(owner2.userId);
      expect(perm1.read).not.toEqual(perm2.read);
    });
  });

  // ========================================================================
  // 事件发射测试
  // ========================================================================

  describe('事件发射', () => {
    it('应该发射 access:granted 事件', () => {
      const handler = jest.fn();
      acs.on('access:granted', handler);

      const owner = createMockOwner('user1');
      const permissions = createMockPermissions('user1');

      acs.checkAccess({
        userId: 'user1',
        sessionId: 'session1',
        fileId: 'file1',
        fileOwner: owner,
        filePermissions: permissions,
        operation: 'read',
      });

      expect(handler).toHaveBeenCalled();
    });

    it('应该发射 access:denied 事件', () => {
      const handler = jest.fn();
      acs.on('access:denied', handler);

      const owner = createMockOwner('user1');
      const permissions = createMockPermissions('user1');

      acs.checkAccess({
        userId: 'user2',
        sessionId: 'session1',
        fileId: 'file1',
        fileOwner: owner,
        filePermissions: permissions,
        operation: 'read',
      });

      expect(handler).toHaveBeenCalled();
    });

    it('应该发射 rule:added 事件', () => {
      const handler = jest.fn();
      acs.on('rule:added', handler);

      acs.addRule({
        name: '测试规则',
        applyTo: ['user1'],
        allow: { readRoles: ['primary_source'] },
        priority: 10,
        enabled: true,
      });

      expect(handler).toHaveBeenCalled();
    });

    it('应该发射 rule:removed 事件', () => {
      const handler = jest.fn();
      acs.on('rule:removed', handler);

      const ruleId = acs.addRule({
        name: '测试规则',
        applyTo: ['user1'],
        allow: { readRoles: ['primary_source'] },
        priority: 10,
        enabled: true,
      });

      acs.removeRule(ruleId);

      expect(handler).toHaveBeenCalledWith(ruleId);
    });
  });

  // ========================================================================
  // 边界条件测试
  // ========================================================================

  describe('边界条件', () => {
    it('应该处理空用户 ID', () => {
      const owner = createMockOwner('user1');
      const permissions = createMockPermissions('user1');

      const result = acs.checkAccess({
        userId: '',
        sessionId: 'session1',
        fileId: 'file1',
        fileOwner: owner,
        filePermissions: permissions,
        operation: 'read',
      });

      expect(result.allowed).toBe(false);
    });

    it('应该处理空文件 ID', () => {
      const owner = createMockOwner('user1');
      const permissions = createMockPermissions('user1');

      const result = acs.checkAccess({
        userId: 'user2',
        sessionId: 'session1',
        fileId: '',
        fileOwner: owner,
        filePermissions: permissions,
        operation: 'read',
      });

      expect(result.allowed).toBe(false);
    });

    it('应该处理没有所有者信息的情况', () => {
      const permissions = createMockPermissions('user1');

      const result = acs.checkAccess({
        userId: 'user2',
        sessionId: 'session1',
        fileId: 'file1',
        filePermissions: permissions,
        operation: 'read',
      });

      // 由于没有所有者信息，user2 不在权限列表中，应该被拒绝
      expect(result.allowed).toBe(false);
    });

    it('应该处理空权限列表', () => {
      const owner = createMockOwner('user1');
      const permissions: FilePermissions = {
        read: [],
        write: [],
        delete: [],
        publicRead: false,
      };

      const result = acs.checkAccess({
        userId: 'user1',
        sessionId: 'session1',
        fileId: 'file1',
        fileOwner: owner,
        filePermissions: permissions,
        operation: 'read',
      });

      // 所有者总是有权限（默认配置）
      expect(result.allowed).toBe(true);
    });
  });
});
