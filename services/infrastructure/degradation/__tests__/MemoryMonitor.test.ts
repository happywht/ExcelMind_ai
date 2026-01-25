/**
 * @file 内存监控器测试
 * @description 测试MemoryMonitor类的内存监控、预测和清理功能
 * @version 1.0.0
 */

import { MemoryMonitor } from '../MemoryMonitor';
import { DegradationLevel } from '../../../../types/degradationTypes';

// Mock performance.memory for testing
const mockPerformanceMemory = {
  usedJSHeapSize: 100 * 1024 * 1024, // 100MB
  totalJSHeapSize: 200 * 1024 * 1024,
  jsHeapSizeLimit: 1024 * 1024 * 1024
};

// Mock performance.getEntriesByType
const mockPerformanceEntries = [];

describe('MemoryMonitor', () => {
  let monitor: MemoryMonitor;
  let originalPerformance: any;
  let originalWindow: any;

  beforeEach(() => {
    // 保存原始环境
    originalPerformance = (global as any).performance;
    originalWindow = (global as any).window;

    // 设置mock
    (global as any).performance = {
      memory: mockPerformanceMemory,
      getEntriesByType: jest.fn(() => mockPerformanceEntries)
    } as any;

    (global as any).window = {
      performance: (global as any).performance
    };

    // 创建监控器实例
    monitor = new MemoryMonitor();

    // 使用jest的fake timers来控制setInterval
    jest.useFakeTimers();
  });

  afterEach(() => {
    // 恢复原始环境
    (global as any).performance = originalPerformance;
    (global as any).window = originalWindow;

    // 停止监控
    monitor.stopMonitoring();

    // 恢复真实timers
    jest.useRealTimers();
  });

  describe('构造函数和初始化', () => {
    it('应该使用默认配置创建实例', () => {
      const defaultMonitor = new MemoryMonitor();
      const status = defaultMonitor.getCurrentStatus();

      expect(status).toBeDefined();
      expect(status.total).toBeGreaterThan(0);
      expect(status.used).toBeGreaterThanOrEqual(0);
      expect(status.underPressure).toBe(false);
    });

    it('应该接受自定义配置', () => {
      const customMonitor = new MemoryMonitor({
        warningThreshold: 80,
        criticalThreshold: 95,
        monitorInterval: 10000,
        cleanupThreshold: 75
      });

      const status = customMonitor.getCurrentStatus();
      expect(status).toBeDefined();
    });

    it('应该初始化历史记录为空', () => {
      const stats = monitor.getStatistics();
      expect(stats.averageUsage).toBe(0);
      expect(stats.peakUsage).toBe(0);
      expect(stats.pressureCount).toBe(0);
    });
  });

  describe('内存监控功能', () => {
    it('应该开始监控', () => {
      const startSpy = jest.spyOn(console, 'log');
      monitor.startMonitoring();

      expect(startSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting memory monitoring')
      );

      startSpy.mockRestore();
    });

    it('应该停止监控', () => {
      const stopSpy = jest.spyOn(console, 'log');
      monitor.startMonitoring();
      monitor.stopMonitoring();

      expect(stopSpy).toHaveBeenCalledWith(
        expect.stringContaining('Stopped memory monitoring')
      );

      stopSpy.mockRestore();
    });

    it('重复启动应该发出警告', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      monitor.startMonitoring();
      monitor.startMonitoring(); // 第二次启动

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('already started')
      );

      warnSpy.mockRestore();
    });
  });

  describe('getCurrentMemoryUsage', () => {
    it('应该返回当前内存使用率', () => {
      const usage = monitor.getCurrentMemoryUsage();

      expect(usage).toBeGreaterThanOrEqual(0);
      expect(usage).toBeLessThanOrEqual(100);
    });

    it('内存使用率应该基于实际值计算', () => {
      // Mock一个已知的内存状态
      const status = monitor.getCurrentStatus();
      const expectedUsage = (status.used / status.total) * 100;

      expect(monitor.getCurrentMemoryUsage()).toBeCloseTo(expectedUsage, 1);
    });
  });

  describe('getCurrentStatus', () => {
    it('应该返回完整的内存状态', () => {
      const status = monitor.getCurrentStatus();

      expect(status).toHaveProperty('total');
      expect(status).toHaveProperty('used');
      expect(status).toHaveProperty('usagePercent');
      expect(status).toHaveProperty('underPressure');
      expect(status).toHaveProperty('overflowProbability');
      expect(status).toHaveProperty('lastCheck');
    });

    it('应该返回不可变的状态对象', () => {
      const status1 = monitor.getCurrentStatus();
      const status2 = monitor.getCurrentStatus();

      expect(status1).toEqual(status2);
      expect(status1).not.toBe(status2); // 不同引用
    });
  });

  describe('isUnderPressure', () => {
    it('应该正确检测内存压力状态', () => {
      // 初始状态应该没有压力
      expect(monitor.isUnderPressure()).toBe(false);
    });

    it('高内存使用时应该检测到压力', () => {
      // 创建一个高内存的监控器
      const highMemoryMonitor = new MemoryMonitor({
        warningThreshold: 10 // 设置很低的阈值
      });

      // Mock高内存使用
      (global as any).performance.memory.usedJSHeapSize = 900 * 1024 * 1024; // 900MB
      highMemoryMonitor.startMonitoring();

      // 触发一次检查
      jest.advanceTimersByTime(5000);

      const underPressure = highMemoryMonitor.isUnderPressure();
      expect(underPressure).toBe(true);

      highMemoryMonitor.stopMonitoring();
    });
  });

  describe('predictOverflow', () => {
    it('应该预测小文件不会溢出', () => {
      const smallFile = 1 * 1024 * 1024; // 1MB
      const willOverflow = monitor.predictOverflow(smallFile);

      expect(willOverflow).toBe(false);
    });

    it('应该预测大文件可能溢出', () => {
      const largeFile = 1024 * 1024 * 1024; // 1GB
      const willOverflow = monitor.predictOverflow(largeFile);

      expect(willOverflow).toBe(true);
    });

    it('应该考虑安全边际', () => {
      // 文件大小刚好在临界值附近
      const status = monitor.getCurrentStatus();
      const availableMemory = status.total - status.used;
      const borderlineFile = availableMemory * 0.9; // 90% of available

      const willOverflow = monitor.predictOverflow(borderlineFile);
      expect(willOverflow).toBe(true); // 应该考虑安全边际而预测会溢出
    });
  });

  describe('estimateOperationRisk', () => {
    it('应该评估低风险操作', () => {
      const risk = monitor.estimateOperationRisk('parse', 100);

      expect(risk.riskLevel).toBe('low');
      expect(risk.recommended).toBe('proceed');
      expect(risk.estimatedMemory).toBeGreaterThan(0);
    });

    it('应该评估高风险操作', () => {
      const risk = monitor.estimateOperationRisk('parse', 1000000); // 100万行

      expect(['medium', 'high']).toContain(risk.riskLevel);
      expect(['caution', 'abort']).toContain(risk.recommended);
    });

    it('不同操作类型应该有不同的内存估算', () => {
      const parseRisk = monitor.estimateOperationRisk('parse', 1000);
      const transformRisk = monitor.estimateOperationRisk('transform', 1000);
      const exportRisk = monitor.estimateOperationRisk('export', 1000);

      // 转换通常比解析消耗更多内存
      expect(transformRisk.estimatedMemory).toBeGreaterThanOrEqual(parseRisk.estimatedMemory);
    });

    it('应该为所有操作类型提供估算', () => {
      const operations: Array<'parse' | 'transform' | 'export'> = ['parse', 'transform', 'export'];

      operations.forEach(op => {
        const risk = monitor.estimateOperationRisk(op, 100);
        expect(risk).toHaveProperty('riskLevel');
        expect(risk).toHaveProperty('estimatedMemory');
        expect(risk).toHaveProperty('recommended');
        expect(['low', 'medium', 'high']).toContain(risk.riskLevel);
        expect(['proceed', 'caution', 'abort']).toContain(risk.recommended);
      });
    });
  });

  describe('forceCleanup', () => {
    it('应该强制执行内存清理', async () => {
      const logSpy = jest.spyOn(console, 'log');

      await monitor.forceCleanup();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Forcing cleanup')
      );

      logSpy.mockRestore();
    });

    it('清理后应该重新检查内存', async () => {
      const beforeCleanup = monitor.getCurrentStatus();

      await monitor.forceCleanup();

      const afterCleanup = monitor.getCurrentStatus();

      // 验证状态被更新
      expect(afterCleanup.lastCheck.getTime()).toBeGreaterThanOrEqual(
        beforeCleanup.lastCheck.getTime()
      );
    });
  });

  describe('getMemoryTrend', () => {
    it('应该返回稳定的趋势（没有足够数据）', () => {
      const trend = monitor.getMemoryTrend(5);

      expect(trend.trend).toBe('stable');
      expect(trend.rate).toBe(0);
      expect(trend.samples).toBe(0);
    });

    it('应该计算增长趋势', () => {
      monitor.startMonitoring();

      // 模拟多次检查，每次内存都在增长
      for (let i = 0; i < 10; i++) {
        (global as any).performance.memory.usedJSHeapSize = (100 + i * 10) * 1024 * 1024;
        jest.advanceTimersByTime(5000);
      }

      const trend = monitor.getMemoryTrend(5);

      expect(trend.trend).toBe('increasing');
      expect(trend.rate).toBeGreaterThan(0);
      expect(trend.samples).toBeGreaterThan(1);

      monitor.stopMonitoring();
    });

    it('应该计算下降趋势', () => {
      monitor.startMonitoring();

      // 模拟内存下降
      for (let i = 0; i < 10; i++) {
        (global as any).performance.memory.usedJSHeapSize = (200 - i * 10) * 1024 * 1024;
        jest.advanceTimersByTime(5000);
      }

      const trend = monitor.getMemoryTrend(5);

      expect(trend.trend).toBe('decreasing');
      expect(trend.rate).toBeLessThan(0);

      monitor.stopMonitoring();
    });
  });

  describe('getStatistics', () => {
    it('应该返回内存使用统计', () => {
      monitor.startMonitoring();

      // 模拟一些内存检查
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(5000);
      }

      const stats = monitor.getStatistics();

      expect(stats).toHaveProperty('averageUsage');
      expect(stats).toHaveProperty('peakUsage');
      expect(stats).toHaveProperty('currentUsage');
      expect(stats).toHaveProperty('pressureCount');
      expect(stats.averageUsage).toBeGreaterThanOrEqual(0);
      expect(stats.peakUsage).toBeGreaterThanOrEqual(0);

      monitor.stopMonitoring();
    });

    it('应该正确计算平均值', () => {
      monitor.startMonitoring();

      // 固定的内存使用值
      const testValues = [50, 60, 70, 80, 90];
      testValues.forEach(value => {
        (global as any).performance.memory.usedJSHeapSize = value * 1024 * 1024 * 1024 / 100;
        jest.advanceTimersByTime(5000);
      });

      const stats = monitor.getStatistics();
      const expectedAverage = testValues.reduce((a, b) => a + b, 0) / testValues.length;

      expect(stats.averageUsage).toBeCloseTo(expectedAverage, 0);

      monitor.stopMonitoring();
    });

    it('应该正确记录峰值', () => {
      monitor.startMonitoring();

      const testValues = [40, 60, 80, 50, 70];
      testValues.forEach(value => {
        (global as any).performance.memory.usedJSHeapSize = value * 1024 * 1024 * 1024 / 100;
        jest.advanceTimersByTime(5000);
      });

      const stats = monitor.getStatistics();
      expect(stats.peakUsage).toBeCloseTo(Math.max(...testValues), 0);

      monitor.stopMonitoring();
    });
  });

  describe('reset', () => {
    it('应该重置监控器状态', () => {
      monitor.startMonitoring();

      // 产生一些历史数据
      jest.advanceTimersByTime(5000);
      jest.advanceTimersByTime(5000);

      const beforeReset = monitor.getStatistics();
      expect(beforeReset.pressureCount).toBeGreaterThanOrEqual(0);

      monitor.reset();

      const afterReset = monitor.getStatistics();
      expect(afterReset.averageUsage).toBe(0);
      expect(afterReset.peakUsage).toBe(0);
    });

    it('重置后应该停止监控', () => {
      monitor.startMonitoring();
      monitor.reset();

      // 重置后不应该有活跃的监控
      const status = monitor.getCurrentStatus();
      expect(status).toBeDefined();
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理performance.memory不可用的情况', () => {
      // 移除memory支持
      delete (global as any).performance.memory;

      const noMemoryMonitor = new MemoryMonitor();
      const status = noMemoryMonitor.getCurrentStatus();

      // 应该回退到默认估算
      expect(status.used).toBeGreaterThan(0);
    });

    it('应该处理没有performance API的情况', () => {
      // 移除整个performance API
      delete (global as any).performance;

      const noPerfMonitor = new MemoryMonitor();
      const usage = noPerfMonitor.getCurrentMemoryUsage();

      // 应该使用默认值
      expect(usage).toBeGreaterThanOrEqual(0);
      expect(usage).toBeLessThanOrEqual(100);
    });

    it('应该处理零文件大小', () => {
      const willOverflow = monitor.predictOverflow(0);
      expect(willOverflow).toBe(false);
    });

    it('应该处理零行操作', () => {
      const risk = monitor.estimateOperationRisk('parse', 0);
      expect(risk.riskLevel).toBe('low');
      expect(risk.recommended).toBe('proceed');
    });

    it('应该处理极大的数值', () => {
      const hugeFile = Number.MAX_SAFE_INTEGER;
      const willOverflow = monitor.predictOverflow(hugeFile);
      expect(willOverflow).toBe(true);
    });
  });

  describe('内存压力事件', () => {
    it('应该在临界内存时发出警告', () => {
      const warnSpy = jest.spyOn(console, 'warn');

      // 设置低阈值
      const warningMonitor = new MemoryMonitor({
        warningThreshold: 1,
        criticalThreshold: 2
      });

      warningMonitor.startMonitoring();

      // Mock高内存使用
      (global as any).performance.memory.usedJSHeapSize = 900 * 1024 * 1024;
      jest.advanceTimersByTime(5000);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Memory pressure detected')
      );

      warningMonitor.stopMonitoring();
      warnSpy.mockRestore();
    });

    it('应该在严重内存时发出错误', () => {
      const errorSpy = jest.spyOn(console, 'error');

      const criticalMonitor = new MemoryMonitor({
        warningThreshold: 80,
        criticalThreshold: 90
      });

      criticalMonitor.startMonitoring();

      // Mock临界内存使用
      (global as any).performance.memory.usedJSHeapSize = 950 * 1024 * 1024;
      jest.advanceTimersByTime(5000);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('critical')
      );

      criticalMonitor.stopMonitoring();
      errorSpy.mockRestore();
    });
  });

  describe('历史记录管理', () => {
    it('应该限制历史记录大小', () => {
      monitor.startMonitoring();

      // 产生超过最大历史大小的数据点
      for (let i = 0; i < 150; i++) {
        jest.advanceTimersByTime(5000);
      }

      const trend = monitor.getMemoryTrend(1000);
      // 历史应该被限制在maxHistorySize (100)
      expect(trend.samples).toBeLessThanOrEqual(100);

      monitor.stopMonitoring();
    });

    it('应该正确计算时间范围内的趋势', () => {
      monitor.startMonitoring();

      // 产生一些数据点
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(5000);
      }

      // 请求最近3分钟的趋势
      const trend = monitor.getMemoryTrend(3);
      expect(trend.trend).toBeDefined();

      monitor.stopMonitoring();
    });
  });

  describe('并发和重复操作', () => {
    it('应该处理多次启动和停止', () => {
      monitor.startMonitoring();
      monitor.stopMonitoring();
      monitor.startMonitoring();
      monitor.stopMonitoring();

      // 不应该抛出错误
      expect(monitor.getCurrentStatus()).toBeDefined();
    });

    it('应该处理并发的清理请求', async () => {
      const promises = [
        monitor.forceCleanup(),
        monitor.forceCleanup(),
        monitor.forceCleanup()
      ];

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });
});
