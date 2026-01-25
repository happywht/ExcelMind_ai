/**
 * @file 降级通知器测试
 * @description 测试DegradationNotifier类的通知、事件和历史记录功能
 * @version 1.0.0
 */

import {
  DegradationNotifier,
  NotificationCallback,
  EventListener
} from '../DegradationNotifier';
import {
  DegradationMode,
  DegradationLevel,
  DegradationEvent,
  DegradationNotification,
  DegradationMetrics
} from '../../../../types/degradationTypes';

describe('DegradationNotifier', () => {
  let notifier: DegradationNotifier;

  beforeEach(() => {
    notifier = new DegradationNotifier({
      enableConsole: false, // 关闭控制台输出以保持测试干净
      persistHistory: true,
      maxHistorySize: 100
    });
  });

  afterEach(() => {
    notifier.destroy();
  });

  describe('构造函数和初始化', () => {
    it('应该使用默认配置创建实例', () => {
      const defaultNotifier = new DegradationNotifier();
      expect(defaultNotifier).toBeDefined();
      defaultNotifier.destroy();
    });

    it('应该接受自定义配置', () => {
      const customNotifier = new DegradationNotifier({
        enableConsole: true,
        persistHistory: false,
        maxHistorySize: 50
      });

      expect(customNotifier).toBeDefined();
      customNotifier.destroy();
    });

    it('应该初始化空的历史记录', () => {
      const history = notifier.getHistory();
      expect(history.length).toBe(0);

      const eventHistory = notifier.getEventHistory();
      expect(eventHistory.length).toBe(0);
    });
  });

  describe('onNotification - 注册通知回调', () => {
    it('应该注册通知回调', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      const unsubscribe = notifier.onNotification(callback);

      expect(typeof unsubscribe).toBe('function');

      // 清理
      unsubscribe();
    });

    it('应该在通知时调用回调', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      notifier.notifyWarning(
        'test',
        'Test warning',
        DegradationLevel.WARNING
      );

      expect(callback).toHaveBeenCalled();
      const notification = callback.mock.calls[0][0] as DegradationNotification;
      expect(notification.type).toBe('warning');
    });

    it('取消订阅应该停止接收通知', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      const unsubscribe = notifier.onNotification(callback);

      unsubscribe();

      notifier.notifyWarning(
        'test',
        'Test warning',
        DegradationLevel.WARNING
      );

      expect(callback).not.toHaveBeenCalled();
    });

    it('应该支持多个回调', () => {
      const callback1 = jest.fn() as jest.MockedFunction<NotificationCallback>;
      const callback2 = jest.fn() as jest.MockedFunction<NotificationCallback>;

      notifier.onNotification(callback1);
      notifier.onNotification(callback2);

      notifier.notifyWarning(
        'test',
        'Test warning',
        DegradationLevel.WARNING
      );

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('回调错误不应该影响其他回调', () => {
      const errorCallback: NotificationCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback: NotificationCallback = jest.fn();

      notifier.onNotification(errorCallback);
      notifier.onNotification(normalCallback);

      // 应该不抛出错误
      expect(() => {
        notifier.notifyWarning(
          'test',
          'Test warning',
          DegradationLevel.WARNING
        );
      }).not.toThrow();

      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('onEvent - 注册事件监听器', () => {
    it('应该注册事件监听器', () => {
      const listener = jest.fn() as jest.MockedFunction<EventListener>;
      const unsubscribe = notifier.onEvent(listener);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });

    it('应该在事件发生时调用监听器', () => {
      const listener = jest.fn() as jest.MockedFunction<EventListener>;
      notifier.onEvent(listener);

      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test change'
      );

      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as DegradationEvent;
      expect(event.type).toBe('mode_changed');
    });

    it('取消订阅应该停止接收事件', () => {
      const listener = jest.fn() as jest.MockedFunction<EventListener>;
      const unsubscribe = notifier.onEvent(listener);

      unsubscribe();

      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test change'
      );

      expect(listener).not.toHaveBeenCalled();
    });

    it('应该支持多个监听器', () => {
      const listener1 = jest.fn() as jest.MockedFunction<EventListener>;
      const listener2 = jest.fn() as jest.MockedFunction<EventListener>;

      notifier.onEvent(listener1);
      notifier.onEvent(listener2);

      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test change'
      );

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('notifyModeChange - 模式变更通知', () => {
    it('应该创建模式变更事件', () => {
      const listener = jest.fn() as jest.MockedFunction<EventListener>;
      notifier.onEvent(listener);

      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Memory pressure'
      );

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0] as DegradationEvent;

      expect(event.type).toBe('mode_changed');
      expect(event.fromMode).toBe(DegradationMode.BROWSER);
      expect(event.toMode).toBe(DegradationMode.HYBRID);
      expect(event.message).toContain('BROWSER');
      expect(event.message).toContain('HYBRID');
    });

    it('应该创建模式变更通知', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test reason'
      );

      expect(callback).toHaveBeenCalled();
      const notification = callback.mock.calls[0][0] as DegradationNotification;

      expect(notification.type).toBe('warning'); // 降级是warning
      expect(notification.title).toContain('Hybrid');
      expect(notification.currentMode).toBe(DegradationMode.HYBRID);
      expect(notification.suggestedActions).toBeDefined();
      expect(notification.suggestedActions.length).toBeGreaterThan(0);
    });

    it('恢复应该是success类型', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      notifier.notifyModeChange(
        DegradationMode.HYBRID,
        DegradationMode.BROWSER,
        'Recovered'
      );

      const notification = callback.mock.calls[0][0] as DegradationNotification;
      expect(notification.type).toBe('success');
    });

    it('应该记录历史', () => {
      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test'
      );

      const history = notifier.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].eventType).toBe('mode_changed');
      expect(history[0].fromMode).toBe(DegradationMode.BROWSER);
      expect(history[0].toMode).toBe(DegradationMode.HYBRID);
    });
  });

  describe('notifyWarning - 预警通知', () => {
    it('应该创建警告事件', () => {
      const listener = jest.fn() as jest.MockedFunction<EventListener>;
      notifier.onEvent(listener);

      notifier.notifyWarning(
        'memory',
        'High memory usage',
        DegradationLevel.WARNING
      );

      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as DegradationEvent;

      expect(event.type).toBe('warning_triggered');
      expect(event.data?.warningType).toBe('memory');
      expect(event.data?.level).toBe(DegradationLevel.WARNING);
    });

    it('WARNING级别应该创建warning通知', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      notifier.notifyWarning(
        'test',
        'Test warning',
        DegradationLevel.WARNING
      );

      const notification = callback.mock.calls[0][0] as DegradationNotification;
      expect(notification.type).toBe('warning');
    });

    it('CRITICAL级别应该创建error通知', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      notifier.notifyWarning(
        'critical',
        'Critical error',
        DegradationLevel.CRITICAL
      );

      const notification = callback.mock.calls[0][0] as DegradationNotification;
      expect(notification.type).toBe('error');
      expect(notification.duration).toBe(-1); // 持续显示
    });

    it('WARNING级别应该有自动关闭时间', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      notifier.notifyWarning(
        'test',
        'Test warning',
        DegradationLevel.WARNING
      );

      const notification = callback.mock.calls[0][0] as DegradationNotification;
      expect(notification.duration).toBe(5000); // 5秒
    });

    it('应该包含建议操作', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      notifier.notifyWarning(
        'memory',
        'Memory warning',
        DegradationLevel.WARNING
      );

      const notification = callback.mock.calls[0][0] as DegradationNotification;
      expect(notification.suggestedActions).toBeDefined();
      expect(notification.suggestedActions.length).toBeGreaterThan(0);
      expect(notification.suggestedActions[0]).toContain('Close unused tabs');
    });

    it('不同类型应该有不同的建议', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      notifier.notifyWarning('api', 'API warning', DegradationLevel.WARNING);

      const notification = callback.mock.calls[0][0] as DegradationNotification;
      expect(notification.suggestedActions[0]).toContain('internet connection');
    });
  });

  describe('broadcastMetrics - 指标广播', () => {
    it('应该广播指标更新', () => {
      const listener = jest.fn() as jest.MockedFunction<EventListener>;
      notifier.onEvent(listener);

      const metrics: DegradationMetrics = {
        memoryUsage: 75,
        fileSize: 10 * 1024 * 1024,
        apiFailureRate: 15,
        avgExecutionTime: 5000,
        consecutiveFailures: 2,
        lastUpdate: new Date()
      };

      notifier.broadcastMetrics(metrics);

      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as DegradationEvent;

      expect(event.type).toBe('metrics_updated');
      expect(event.data?.metrics).toEqual(metrics);
    });

    it('高内存使用应该触发预警', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      const metrics: DegradationMetrics = {
        memoryUsage: 80, // 超过75%
        fileSize: 10 * 1024 * 1024,
        apiFailureRate: 10,
        avgExecutionTime: 2000,
        consecutiveFailures: 0,
        lastUpdate: new Date()
      };

      notifier.broadcastMetrics(metrics);

      expect(callback).toHaveBeenCalled();
      const notification = callback.mock.calls[0][0] as DegradationNotification;
      expect(notification.type).toBe('warning');
    });

    it('临界内存使用应该触发严重预警', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      const metrics: DegradationMetrics = {
        memoryUsage: 95, // 超过90%
        fileSize: 10 * 1024 * 1024,
        apiFailureRate: 10,
        avgExecutionTime: 2000,
        consecutiveFailures: 0,
        lastUpdate: new Date()
      };

      notifier.broadcastMetrics(metrics);

      expect(callback).toHaveBeenCalled();
      const notification = callback.mock.calls[0][0] as DegradationNotification;
      expect(notification.type).toBe('error');
    });

    it('高API失败率应该触发预警', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      const metrics: DegradationMetrics = {
        memoryUsage: 50,
        fileSize: 5 * 1024 * 1024,
        apiFailureRate: 30, // 超过20%
        avgExecutionTime: 2000,
        consecutiveFailures: 0,
        lastUpdate: new Date()
      };

      notifier.broadcastMetrics(metrics);

      expect(callback).toHaveBeenCalled();
    });

    it('高执行时间应该触发预警', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      const metrics: DegradationMetrics = {
        memoryUsage: 50,
        fileSize: 5 * 1024 * 1024,
        apiFailureRate: 10,
        avgExecutionTime: 35000, // 超过30秒
        consecutiveFailures: 0,
        lastUpdate: new Date()
      };

      notifier.broadcastMetrics(metrics);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('notifyRecoveryAttempt - 恢复尝试通知', () => {
    it('应该创建恢复尝试事件', () => {
      const listener = jest.fn() as jest.MockedFunction<EventListener>;
      notifier.onEvent(listener);

      notifier.notifyRecoveryAttempt(
        DegradationMode.BROWSER,
        'Conditions improved'
      );

      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as DegradationEvent;

      expect(event.type).toBe('recovery_attempt');
      expect(event.toMode).toBe(DegradationMode.BROWSER);
      expect(event.message).toContain('recovering');
    });

    it('应该创建info通知', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      notifier.notifyRecoveryAttempt(
        DegradationMode.HYBRID,
        'Test recovery'
      );

      const notification = callback.mock.calls[0][0] as DegradationNotification;
      expect(notification.type).toBe('info');
      expect(notification.title).toBe('Recovery Attempt');
      expect(notification.duration).toBe(3000);
    });
  });

  describe('notifyRecoverySuccess - 恢复成功通知', () => {
    it('应该创建恢复成功事件', () => {
      const listener = jest.fn() as jest.MockedFunction<EventListener>;
      notifier.onEvent(listener);

      notifier.notifyRecoverySuccess(
        DegradationMode.BACKEND,
        DegradationMode.HYBRID,
        'Successfully recovered'
      );

      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as DegradationEvent;

      expect(event.type).toBe('recovery_success');
      expect(event.fromMode).toBe(DegradationMode.BACKEND);
      expect(event.toMode).toBe(DegradationMode.HYBRID);
    });

    it('应该创建success通知', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      notifier.notifyRecoverySuccess(
        DegradationMode.BACKEND,
        DegradationMode.BROWSER,
        'Recovered'
      );

      const notification = callback.mock.calls[0][0] as DegradationNotification;
      expect(notification.type).toBe('success');
      expect(notification.title).toBe('Recovery Successful');
      expect(notification.duration).toBe(5000);
    });

    it('应该记录历史', () => {
      notifier.notifyRecoverySuccess(
        DegradationMode.HYBRID,
        DegradationMode.BROWSER,
        'Recovered'
      );

      const history = notifier.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].eventType).toBe('recovery_success');
    });
  });

  describe('getEventHistory - 事件历史', () => {
    it('应该返回所有事件历史', () => {
      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test 1'
      );
      notifier.notifyWarning('test', 'Warning', DegradationLevel.WARNING);

      const history = notifier.getEventHistory();
      expect(history.length).toBe(2);
    });

    it('应该支持限制返回数量', () => {
      notifier.notifyModeChange(DegradationMode.BROWSER, DegradationMode.HYBRID, '1');
      notifier.notifyModeChange(DegradationMode.HYBRID, DegradationMode.BACKEND, '2');
      notifier.notifyModeChange(DegradationMode.BACKEND, DegradationMode.HYBRID, '3');

      const lastTwo = notifier.getEventHistory(2);
      expect(lastTwo.length).toBe(2);
    });

    it('应该限制历史大小', () => {
      const smallNotifier = new DegradationNotifier({
        enableConsole: false,
        maxHistorySize: 5
      });

      // 创建超过限制的事件
      for (let i = 0; i < 10; i++) {
        smallNotifier.notifyWarning('test', `Warning ${i}`, DegradationLevel.WARNING);
      }

      const history = smallNotifier.getEventHistory();
      expect(history.length).toBeLessThanOrEqual(5);

      smallNotifier.destroy();
    });
  });

  describe('getHistory - 降级历史', () => {
    it('应该返回所有降级历史', () => {
      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test 1'
      );
      notifier.notifyModeChange(
        DegradationMode.HYBRID,
        DegradationMode.BACKEND,
        'Test 2'
      );

      const history = notifier.getHistory();
      expect(history.length).toBe(2);
    });

    it('应该支持限制返回数量', () => {
      notifier.notifyModeChange(DegradationMode.BROWSER, DegradationMode.HYBRID, '1');
      notifier.notifyModeChange(DegradationMode.HYBRID, DegradationMode.BACKEND, '2');
      notifier.notifyModeChange(DegradationMode.BACKEND, DegradationMode.HYBRID, '3');

      const lastTwo = notifier.getHistory(2);
      expect(lastTwo.length).toBe(2);
    });

    it('历史条目应该包含正确的字段', () => {
      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test reason'
      );

      const history = notifier.getHistory();
      const entry = history[0];

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('eventType');
      expect(entry).toHaveProperty('fromMode');
      expect(entry).toHaveProperty('toMode');
      expect(entry).toHaveProperty('reason');
      expect(entry).toHaveProperty('metricsSnapshot');
    });
  });

  describe('clearHistory - 清除历史', () => {
    it('应该清除所有历史', () => {
      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test'
      );
      notifier.notifyWarning('test', 'Warning', DegradationLevel.WARNING);

      expect(notifier.getHistory().length).toBeGreaterThan(0);
      expect(notifier.getEventHistory().length).toBeGreaterThan(0);

      notifier.clearHistory();

      expect(notifier.getHistory().length).toBe(0);
      expect(notifier.getEventHistory().length).toBe(0);
    });
  });

  describe('destroy - 销毁通知器', () => {
    it('应该清除所有回调和监听器', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      const listener = jest.fn() as jest.MockedFunction<EventListener>;

      notifier.onNotification(callback);
      notifier.onEvent(listener);

      notifier.destroy();

      // 尝试触发通知，回调不应该被调用
      notifier.notifyWarning('test', 'Test', DegradationLevel.WARNING);

      expect(callback).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
    });

    it('应该清除历史', () => {
      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test'
      );

      notifier.destroy();

      expect(notifier.getHistory().length).toBe(0);
      expect(notifier.getEventHistory().length).toBe(0);
    });

    it('多次destroy应该是安全的', () => {
      notifier.destroy();
      notifier.destroy();
      notifier.destroy();

      // 不应该抛出错误
      expect(notifier.getHistory()).toBeDefined();
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理空的建议操作', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      // 未知类型应该返回默认建议
      notifier.notifyWarning('unknown_type', 'Unknown', DegradationLevel.WARNING);

      const notification = callback.mock.calls[0][0] as DegradationNotification;
      expect(notification.suggestedActions).toBeDefined();
    });

    it('应该处理没有指标的模式变更', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test'
      );

      expect(callback).toHaveBeenCalled();
    });

    it('应该处理零指标值', () => {
      const metrics: DegradationMetrics = {
        memoryUsage: 0,
        fileSize: 0,
        apiFailureRate: 0,
        avgExecutionTime: 0,
        consecutiveFailures: 0,
        lastUpdate: new Date()
      };

      expect(() => {
        notifier.broadcastMetrics(metrics);
      }).not.toThrow();
    });

    it('应该处理极端指标值', () => {
      const metrics: DegradationMetrics = {
        memoryUsage: 100,
        fileSize: Number.MAX_SAFE_INTEGER,
        apiFailureRate: 100,
        avgExecutionTime: Number.MAX_VALUE,
        consecutiveFailures: Number.MAX_SAFE_INTEGER,
        lastUpdate: new Date()
      };

      expect(() => {
        notifier.broadcastMetrics(metrics);
      }).not.toThrow();
    });

    it('应该处理空的回调函数', () => {
      const emptyCallback = () => {};
      notifier.onNotification(emptyCallback);

      expect(() => {
        notifier.notifyWarning('test', 'Test', DegradationLevel.WARNING);
      }).not.toThrow();
    });
  });

  describe('并发操作', () => {
    it('应该处理并发的通知', () => {
      const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
      notifier.onNotification(callback);

      // 同时触发多个通知
      notifier.notifyWarning('test1', 'Warning 1', DegradationLevel.WARNING);
      notifier.notifyWarning('test2', 'Warning 2', DegradationLevel.CRITICAL);
      notifier.notifyModeChange(DegradationMode.BROWSER, DegradationMode.HYBRID, 'Test');

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('应该处理并发的订阅/取消订阅', () => {
      const callbacks: NotificationCallback[] = [];
      const unsubscribers: (() => void)[] = [];

      // 注册多个回调
      for (let i = 0; i < 10; i++) {
        const callback = jest.fn() as jest.MockedFunction<NotificationCallback>;
        callbacks.push(callback);
        unsubscribers.push(notifier.onNotification(callback));
      }

      notifier.notifyWarning('test', 'Test', DegradationLevel.WARNING);

      // 所有回调都应该被调用
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalled();
      });

      // 取消所有订阅
      unsubscribers.forEach(unsub => unsub());

      // 再次通知，不应该有回调被调用
      notifier.notifyWarning('test', 'Test 2', DegradationLevel.WARNING);

      callbacks.forEach(callback => {
        expect((callback as jest.Mock).mock.calls.length).toBe(1);
      });
    });
  });

  describe('ID生成', () => {
    it('应该生成唯一的ID', () => {
      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test 1'
      );
      notifier.notifyModeChange(
        DegradationMode.HYBRID,
        DegradationMode.BACKEND,
        'Test 2'
      );

      const history = notifier.getHistory();
      expect(history[0].id).not.toBe(history[1].id);
    });

    it('ID应该包含时间戳', () => {
      const beforeTime = Date.now();
      notifier.notifyModeChange(
        DegradationMode.BROWSER,
        DegradationMode.HYBRID,
        'Test'
      );
      const afterTime = Date.now();

      const history = notifier.getHistory();
      const id = history[0].id;
      const timestamp = parseInt(id.split('-')[0]);

      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});
