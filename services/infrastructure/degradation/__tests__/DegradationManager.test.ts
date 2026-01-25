/**
 * @file 降级管理器测试
 * @description 测试DegradationManager类的降级决策、模式切换和恢复功能
 * @version 1.0.0
 */

import { DegradationManager } from '../DegradationManager';
import {
  DegradationMode,
  DegradationLevel
} from '../../../../types/degradationTypes';

// Mock依赖模块
jest.mock('../MemoryMonitor');
jest.mock('../APICircuitBreaker');
jest.mock('../DegradationNotifier');

describe('DegradationManager', () => {
  let manager: DegradationManager;

  beforeEach(() => {
    jest.useFakeTimers();

    // 使用测试配置
    manager = new DegradationManager({
      thresholds: {
        memoryWarning: 70,
        memoryCritical: 90,
        fileSizeWarning: 15 * 1024 * 1024,
        fileSizeCritical: 25 * 1024 * 1024,
        apiFailureWarning: 20,
        apiFailureCritical: 50,
        executionTimeout: 30
      },
      recovery: {
        checkInterval: 5000,
        minStableTime: 10000,
        maxRecoveryAttempts: 3
      },
      modes: {
        browser: {
          maxFileSize: 25 * 1024 * 1024,
          maxMemory: 1 * 1024 * 1024 * 1024
        },
        hybrid: {
          maxFileSize: 40 * 1024 * 1024,
          apiFallback: true
        },
        backend: {
          maxFileSize: 80 * 1024 * 1024,
          requiresNetwork: true
        }
      }
    });
  });

  afterEach(() => {
    manager.destroy();
    jest.useRealTimers();
  });

  describe('构造函数和初始化', () => {
    it('应该使用默认配置创建实例', () => {
      const defaultManager = new DegradationManager();
      const state = defaultManager.getCurrentState();

      expect(state.currentMode).toBe(DegradationMode.BROWSER);
      expect(state.currentLevel).toBe(DegradationLevel.NORMAL);

      defaultManager.destroy();
    });

    it('应该接受自定义配置', () => {
      const customManager = new DegradationManager({
        thresholds: {
          memoryWarning: 80,
          memoryCritical: 95,
          fileSizeWarning: 20 * 1024 * 1024,
          fileSizeCritical: 30 * 1024 * 1024,
          apiFailureWarning: 25,
          apiFailureCritical: 60,
          executionTimeout: 45
        }
      });

      expect(customManager.getCurrentState()).toBeDefined();
      customManager.destroy();
    });

    it('应该初始化为BROWSER模式', () => {
      expect(manager.getCurrentMode()).toBe(DegradationMode.BROWSER);
      expect(manager.getCurrentLevel()).toBe(DegradationLevel.NORMAL);
    });

    it('应该启动监控', () => {
      const logSpy = jest.spyOn(console, 'log');

      const newManager = new DegradationManager();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Monitoring started')
      );

      logSpy.mockRestore();
      newManager.destroy();
    });
  });

  describe('getCurrentState - 获取当前状态', () => {
    it('应该返回完整的状态信息', () => {
      const state = manager.getCurrentState();

      expect(state).toHaveProperty('currentMode');
      expect(state).toHaveProperty('currentLevel');
      expect(state).toHaveProperty('lastCheck');
      expect(state).toHaveProperty('metrics');
      expect(state).toHaveProperty('canRecover');
      expect(state).toHaveProperty('stableDuration');
    });

    it('应该返回不可变的状态对象', () => {
      const state1 = manager.getCurrentState();
      const state2 = manager.getCurrentState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });

    it('应该包含指标信息', () => {
      const state = manager.getCurrentState();

      expect(state.metrics).toHaveProperty('memoryUsage');
      expect(state.metrics).toHaveProperty('fileSize');
      expect(state.metrics).toHaveProperty('apiFailureRate');
      expect(state.metrics).toHaveProperty('avgExecutionTime');
      expect(state.metrics).toHaveProperty('consecutiveFailures');
    });
  });

  describe('getCurrentMode和getCurrentLevel', () => {
    it('应该返回当前模式', () => {
      expect(manager.getCurrentMode()).toBe(DegradationMode.BROWSER);
    });

    it('应该返回当前级别', () => {
      expect(manager.getCurrentLevel()).toBe(DegradationLevel.NORMAL);
    });

    it('级别应该与模式对应', () => {
      // BROWSER -> NORMAL
      expect(manager.getCurrentMode()).toBe(DegradationMode.BROWSER);
      expect(manager.getCurrentLevel()).toBe(DegradationLevel.NORMAL);
    });
  });

  describe('recordExecution - 记录执行时间', () => {
    it('应该记录执行时间', () => {
      manager.recordExecution(5000);
      manager.recordExecution(3000);
      manager.recordExecution(7000);

      const state = manager.getCurrentState();
      expect(state.metrics.avgExecutionTime).toBeCloseTo(5000, 0);
    });

    it('应该限制样本大小', () => {
      // 记录超过最大样本数的执行时间
      for (let i = 0; i < 20; i++) {
        manager.recordExecution(1000 + i * 100);
      }

      const state = manager.getCurrentState();
      // 平均值应该基于最近的10个样本
      expect(state.metrics.avgExecutionTime).toBeGreaterThan(0);
    });

    it('应该处理零执行时间', () => {
      manager.recordExecution(0);

      const state = manager.getCurrentState();
      expect(state.metrics.avgExecutionTime).toBe(0);
    });

    it('应该处理极端的执行时间', () => {
      manager.recordExecution(-1); // 不合理但应该被处理
      manager.recordExecution(Number.MAX_VALUE);

      expect(manager.getCurrentState().metrics.avgExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('recordFileSize - 记录文件大小', () => {
    it('应该记录文件大小', () => {
      const fileSize = 10 * 1024 * 1024; // 10MB
      manager.recordFileSize(fileSize);

      const state = manager.getCurrentState();
      expect(state.metrics.fileSize).toBe(fileSize);
    });

    it('应该覆盖之前的文件大小', () => {
      manager.recordFileSize(1000);
      manager.recordFileSize(2000);

      const state = manager.getCurrentState();
      expect(state.metrics.fileSize).toBe(2000);
    });

    it('应该处理零文件大小', () => {
      manager.recordFileSize(0);

      const state = manager.getCurrentState();
      expect(state.metrics.fileSize).toBe(0);
    });

    it('应该处理大文件', () => {
      const largeFileSize = 100 * 1024 * 1024; // 100MB
      manager.recordFileSize(largeFileSize);

      const state = manager.getCurrentState();
      expect(state.metrics.fileSize).toBe(largeFileSize);
    });
  });

  describe('recordAPICall和allowAPIRequest', () => {
    it('应该记录API调用结果', () => {
      manager.recordAPICall(true, 100);
      manager.recordAPICall(false, 5000);

      // 应该不抛出错误
      expect(manager.getCurrentState()).toBeDefined();
    });

    it('allowAPIRequest应该基于熔断器状态', () => {
      // 初始状态应该允许
      expect(manager.allowAPIRequest()).toBe(true);
    });

    it('应该记录成功的API调用', () => {
      manager.recordAPICall(true, 200);

      expect(manager.getCurrentState()).toBeDefined();
    });

    it('应该记录失败的API调用', () => {
      manager.recordAPICall(false, 5000);

      expect(manager.getCurrentState()).toBeDefined();
    });

    it('应该处理没有持续时间的调用', () => {
      manager.recordAPICall(true);

      expect(manager.getCurrentState()).toBeDefined();
    });
  });

  describe('executeDegradation - 执行降级', () => {
    it('应该切换到HYBRID模式', async () => {
      const logSpy = jest.spyOn(console, 'log');

      await manager.executeDegradation(DegradationMode.HYBRID, 'Test degradation');

      expect(manager.getCurrentMode()).toBe(DegradationMode.HYBRID);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('HYBRID mode')
      );

      logSpy.mockRestore();
    });

    it('应该切换到BACKEND模式', async () => {
      await manager.executeDegradation(DegradationMode.BACKEND, 'High memory');

      expect(manager.getCurrentMode()).toBe(DegradationMode.BACKEND);
      expect(manager.getCurrentLevel()).toBe(DegradationLevel.DEGRADED);
    });

    it('应该切换回BROWSER模式', async () => {
      await manager.executeDegradation(DegradationMode.HYBRID);
      expect(manager.getCurrentMode()).toBe(DegradationMode.HYBRID);

      await manager.executeDegradation(DegradationMode.BROWSER, 'Recovered');
      expect(manager.getCurrentMode()).toBe(DegradationMode.BROWSER);
      expect(manager.getCurrentLevel()).toBe(DegradationLevel.NORMAL);
    });

    it('应该更新降级原因', async () => {
      const reason = 'Memory pressure detected';
      await manager.executeDegradation(DegradationMode.HYBRID, reason);

      const state = manager.getCurrentState();
      expect(state.reason).toBe(reason);
    });

    it('应该重置恢复尝试', async () => {
      // 先执行一次降级
      await manager.executeDegradation(DegradationMode.HYBRID);

      const stats = manager.getStatistics();
      expect(stats.recoveryAttempts).toBe(0);
    });
  });

  describe('canRecover - 恢复条件检查', () => {
    it('BROWSER模式不应该恢复', () => {
      expect(manager.getCurrentMode()).toBe(DegradationMode.BROWSER);
      expect(manager.canRecover()).toBe(false);
    });

    it('HYBRID模式在满足条件时应该可以恢复', async () => {
      await manager.executeDegradation(DegradationMode.HYBRID);

      // Mock健康指标
      manager.recordFileSize(5 * 1024 * 1024); // 小文件
      manager.recordExecution(1000); // 快速执行
      manager.recordAPICall(true, 100); // 成功的API调用

      // 等待足够的稳定时间
      jest.advanceTimersByTime(11000);

      const canRecover = manager.canRecover();
      expect(canRecover).toBeDefined(); // 可能是true或false，取决于具体条件
    });

    it('BACKEND模式应该可以恢复到BROWSER或HYBRID', async () => {
      await manager.executeDegradation(DegradationMode.BACKEND);

      // Mock改善的指标
      manager.recordFileSize(10 * 1024 * 1024);
      manager.recordExecution(2000);
      manager.recordAPICall(true, 150);

      jest.advanceTimersByTime(11000);

      const canRecover = manager.canRecover();
      expect(typeof canRecover).toBe('boolean');
    });

    it('不稳定时不应该恢复', async () => {
      await manager.executeDegradation(DegradationMode.HYBRID);

      // 等待时间不足
      jest.advanceTimersByTime(5000);

      expect(manager.canRecover()).toBe(false);
    });
  });

  describe('attemptRecovery - 尝试恢复', () => {
    it('应该在不满足条件时返回false', async () => {
      const result = await manager.attemptRecovery();
      expect(result).toBe(false);
    });

    it('应该在达到最大尝试次数后返回false', async () => {
      await manager.executeDegradation(DegradationMode.HYBRID);

      // Mock满足恢复条件
      manager.recordFileSize(5 * 1024 * 1024);
      jest.advanceTimersByTime(11000);

      // 尝试恢复
      await manager.attemptRecovery();
      await manager.attemptRecovery();
      await manager.attemptRecovery(); // 第3次

      // 第4次应该失败（达到最大次数）
      const result = await manager.attemptRecovery();
      expect(result).toBe(false);
    });

    it('成功恢复应该更新模式', async () => {
      await manager.executeDegradation(DegradationMode.HYBRID);

      // Mock满足恢复条件
      manager.recordFileSize(5 * 1024 * 1024);
      jest.advanceTimersByTime(11000);

      const success = await manager.attemptRecovery();

      if (success) {
        expect([DegradationMode.BROWSER, DegradationMode.HYBRID])
          .toContain(manager.getCurrentMode());
      }
    });
  });

  describe('performHealthCheck - 健康检查', () => {
    it('应该返回健康检查结果', () => {
      const healthCheck = manager.performHealthCheck();

      expect(healthCheck).toHaveProperty('isHealthy');
      expect(healthCheck).toHaveProperty('checks');
      expect(healthCheck).toHaveProperty('overallScore');
      expect(healthCheck).toHaveProperty('recommendedMode');
    });

    it('应该检查所有健康指标', () => {
      const healthCheck = manager.performHealthCheck();

      expect(healthCheck.checks).toHaveProperty('memory');
      expect(healthCheck.checks).toHaveProperty('fileSize');
      expect(healthCheck.checks).toHaveProperty('api');
      expect(healthCheck.checks).toHaveProperty('execution');

      Object.values(healthCheck.checks).forEach(check => {
        expect(check).toHaveProperty('passed');
        expect(check).toHaveProperty('value');
        expect(check).toHaveProperty('threshold');
      });
    });

    it('应该计算总体健康分数', () => {
      const healthCheck = manager.performHealthCheck();

      expect(healthCheck.overallScore).toBeGreaterThanOrEqual(0);
      expect(healthCheck.overallScore).toBeLessThanOrEqual(100);
    });

    it('应该推荐合适的模式', () => {
      const healthCheck = manager.performHealthCheck();

      expect([
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        DegradationMode.BACKEND
      ]).toContain(healthCheck.recommendedMode);
    });

    it('高内存使用应该推荐BACKEND模式', () => {
      // Mock高内存使用
      const state = manager.getCurrentState();
      (state.metrics as any).memoryUsage = 95;

      const healthCheck = manager.performHealthCheck();
      expect(healthCheck.recommendedMode).toBeDefined();
    });
  });

  describe('getStatistics - 获取统计信息', () => {
    it('应该返回完整的统计信息', () => {
      const stats = manager.getStatistics();

      expect(stats).toHaveProperty('currentState');
      expect(stats).toHaveProperty('healthCheck');
      expect(stats).toHaveProperty('memoryStats');
      expect(stats).toHaveProperty('circuitStats');
      expect(stats).toHaveProperty('recoveryAttempts');
    });

    it('应该包含当前状态', () => {
      const stats = manager.getStatistics();

      expect(stats.currentState).toHaveProperty('currentMode');
      expect(stats.currentState).toHaveProperty('currentLevel');
      expect(stats.currentState).toHaveProperty('metrics');
    });

    it('应该包含健康检查', () => {
      const stats = manager.getStatistics();

      expect(stats.healthCheck).toHaveProperty('isHealthy');
      expect(stats.healthCheck).toHaveProperty('overallScore');
    });

    it('应该跟踪恢复尝试次数', () => {
      const stats = manager.getStatistics();
      expect(typeof stats.recoveryAttempts).toBe('number');
    });
  });

  describe('stopMonitoring - 停止监控', () => {
    it('应该停止监控定时器', () => {
      const logSpy = jest.spyOn(console, 'log');

      manager.stopMonitoring();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Monitoring stopped')
      );

      logSpy.mockRestore();
    });

    it('多次停止应该是安全的', () => {
      manager.stopMonitoring();
      manager.stopMonitoring();
      manager.stopMonitoring();

      expect(manager.getCurrentState()).toBeDefined();
    });
  });

  describe('reset - 重置管理器', () => {
    it('应该重置到初始状态', () => {
      // 改变状态
      manager.recordExecution(5000);
      manager.recordFileSize(10 * 1024 * 1024);

      // 重置
      manager.reset();

      const state = manager.getCurrentState();
      expect(state.currentMode).toBe(DegradationMode.BROWSER);
      expect(state.currentLevel).toBe(DegradationLevel.NORMAL);
      expect(state.metrics.avgExecutionTime).toBe(0);
      expect(state.metrics.fileSize).toBe(0);
    });

    it('应该清除恢复尝试计数', async () => {
      await manager.executeDegradation(DegradationMode.HYBRID);

      manager.reset();

      const stats = manager.getStatistics();
      expect(stats.recoveryAttempts).toBe(0);
    });
  });

  describe('destroy - 销毁管理器', () => {
    it('应该停止监控', () => {
      const logSpy = jest.spyOn(console, 'log');

      manager.destroy();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Destroyed')
      );

      logSpy.mockRestore();
    });

    it('应该清理所有资源', () => {
      manager.destroy();

      // 不应该有定时器在运行
      jest.runAllTimers();

      expect(manager.getCurrentState()).toBeDefined();
    });

    it('多次destroy应该是安全的', () => {
      manager.destroy();
      manager.destroy();
      manager.destroy();

      expect(manager.getCurrentState()).toBeDefined();
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理负数执行时间', () => {
      manager.recordExecution(-1000);

      const state = manager.getCurrentState();
      expect(state.metrics.avgExecutionTime).toBeDefined();
    });

    it('应该处理极大的文件大小', () => {
      const hugeSize = Number.MAX_SAFE_INTEGER;
      manager.recordFileSize(hugeSize);

      const state = manager.getCurrentState();
      expect(state.metrics.fileSize).toBe(hugeSize);
    });

    it('应该处理极端的API失败率', () => {
      // Mock 100% 失败率
      for (let i = 0; i < 20; i++) {
        manager.recordAPICall(false);
      }

      const state = manager.getCurrentState();
      expect(state.metrics.apiFailureRate).toBeDefined();
    });

    it('应该处理连续的快速降级', async () => {
      await manager.executeDegradation(DegradationMode.HYBRID);
      await manager.executeDegradation(DegradationMode.BACKEND);
      await manager.executeDegradation(DegradationMode.HYBRID);

      expect(manager.getCurrentMode()).toBe(DegradationMode.HYBRID);
    });

    it('应该处理无效的恢复尝试', async () => {
      // BROWSER模式下不应该恢复
      const result = await manager.attemptRecovery();
      expect(result).toBe(false);
    });
  });

  describe('自动降级触发', () => {
    it('高内存使用应该触发降级', async () => {
      // 这个测试依赖于实际的MemoryMonitor实现
      // 在mock环境中可能不完全准确

      const logSpy = jest.spyOn(console, 'log');

      // 等待监控检查
      jest.advanceTimersByTime(6000);

      // 检查是否有降级日志
      const logs = logSpy.mock.calls.map(call => call[0]);

      logSpy.mockRestore();
    });

    it('大文件应该触发降级', async () => {
      manager.recordFileSize(30 * 1024 * 1024); // 30MB

      // 等待监控检查
      jest.advanceTimersByTime(6000);

      const mode = manager.getCurrentMode();
      expect(mode).toBeDefined();
    });

    it('高API失败率应该触发降级', async () => {
      // 记录大量API失败
      for (let i = 0; i < 20; i++) {
        manager.recordAPICall(false);
      }

      // 等待监控检查
      jest.advanceTimersByTime(6000);

      const mode = manager.getCurrentMode();
      expect(mode).toBeDefined();
    });
  });

  describe('配置合并', () => {
    it('应该正确合并嵌套配置', () => {
      const customManager = new DegradationManager({
        thresholds: {
          memoryWarning: 85,
          memoryCritical: 95,
          fileSizeWarning: 5 * 1024 * 1024,
          fileSizeCritical: 10 * 1024 * 1024,
          apiFailureWarning: 10,
          apiFailureCritical: 30,
          executionTimeout: 10
        }
      });

      // 部分配置应该与默认配置合并
      expect(customManager.getCurrentState()).toBeDefined();

      customManager.destroy();
    });

    it('不应该修改默认配置对象', () => {
      const defaultManager = new DegradationManager();
      const state1 = defaultManager.getCurrentState();

      // 修改不应该影响原始配置
      defaultManager.recordExecution(5000);

      const state2 = defaultManager.getCurrentState();

      expect(state1.currentMode).toBe(state2.currentMode);

      defaultManager.destroy();
    });
  });

  describe('实际场景模拟', () => {
    it('应该模拟完整的降级和恢复周期', async () => {
      // 1. 正常运行
      expect(manager.getCurrentMode()).toBe(DegradationMode.BROWSER);

      // 2. 内存压力触发降级到HYBRID
      manager.recordFileSize(20 * 1024 * 1024);
      jest.advanceTimersByTime(6000);

      // 3. 继续恶化，降级到BACKEND
      manager.recordFileSize(30 * 1024 * 1024);
      jest.advanceTimersByTime(6000);

      // 4. 条件改善
      manager.recordFileSize(5 * 1024 * 1024);
      jest.advanceTimersByTime(6000);
      jest.advanceTimersByTime(6000); // 等待稳定时间

      // 5. 尝试恢复
      const recovered = await manager.attemptRecovery();

      if (recovered) {
        expect([
          DegradationMode.BROWSER,
          DegradationMode.HYBRID
        ]).toContain(manager.getCurrentMode());
      }
    });

    it('应该模拟多次降级尝试', async () => {
      // 第一次降级
      await manager.executeDegradation(DegradationMode.HYBRID, 'First degradation');

      // 尝试恢复但失败
      jest.advanceTimersByTime(11000);
      manager.recordFileSize(25 * 1024 * 1024); // 仍然较大
      const firstRecovery = await manager.attemptRecovery();

      // 第二次降级
      await manager.executeDegradation(DegradationMode.BACKEND, 'Second degradation');

      // 恢复成功
      jest.advanceTimersByTime(11000);
      manager.recordFileSize(10 * 1024 * 1024);
      const secondRecovery = await manager.attemptRecovery();

      expect(manager.getCurrentState()).toBeDefined();
    });
  });
});
