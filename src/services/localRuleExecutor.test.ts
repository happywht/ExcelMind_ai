/**
 * localRuleExecutor 单元测试
 * 重点测试空值判断逻辑
 */

import { localRuleExecutor } from './localRuleExecutor';
import { QualityRule } from '../types/qualityRule';

describe('localRuleExecutor - checkNotNull', () => {
  let mockRule: QualityRule;
  let testData: any[];

  beforeEach(() => {
    // ✅ 清理缓存，避免测试之间的状态污染
    localRuleExecutor.clearCache();
    mockRule = {
      id: 'test-rule',
      name: '测试规则',
      description: '测试必填字段检查',
      category: '完整性检查',
      checkContent: '测试',
      criteria: '不能为空',
      severity: 'P0',
      executionType: 'local',
      localRule: {
        type: 'not_null',
        params: {}
      },
      targetColumns: ['name', 'age', 'email', 'isActive', 'score'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      isOfficial: false,
      isEnabled: true
    };

    testData = [
      { name: '张三', age: 25, email: 'test@example.com', isActive: false, score: 0 },
      { name: '', age: 0, email: 'test2@example.com', isActive: true, score: 100 },
      { name: '李四', age: null, email: null, isActive: false, score: 50 },
      { name: '   ', age: undefined, email: '', isActive: true, score: 0 },
      { name: null, age: 30, email: 'valid@example.com', isActive: false, score: 0 }
    ];
  });

  test('应该正确识别真正的空值', async () => {
    const result = await localRuleExecutor.executeRule(mockRule, testData);

    console.log('测试结果:', {
      pass: result.pass,
      issuesCount: result.issues.length,
      issues: result.issues.map(i => ({ row: i.row, column: i.column, value: i.value }))
    });

    // 预期结果：
    // 行2: name为空字符串 '' ❌
    // 行3: age为null ❌, email为null ❌
    // 行4: name为纯空格 '   ' ❌, age为undefined ❌, email为空字符串 '' ❌
    // 行5: name为null ❌
    // 总计：7个问题

    // 不应该被标记为空的值：
    // 行1: age=0 ✅ (数字0不是空值)
    // 行1: isActive=false ✅ (布尔false不是空值)
    // 行1: score=0 ✅ (数字0不是空值)
    // 行2: age=0 ✅ (数字0不是空值)

    expect(result.issues.length).toBe(7);

    // 验证具体的空值问题
    const emptyIssues = result.issues.filter(i =>
      i.value === null ||
      i.value === undefined ||
      i.value === '' ||
      (typeof i.value === 'string' && i.value.trim() === '')
    );

    expect(emptyIssues.length).toBe(7);

    // 验证数字0不被标记为空
    const zeroValueIssues = result.issues.filter(i => i.value === 0);
    expect(zeroValueIssues.length).toBe(0);

    // 验证布尔false不被标记为空
    const falseValueIssues = result.issues.filter(i => i.value === false);
    expect(falseValueIssues.length).toBe(0);
  });

  test('数字0不应该被判断为空值', async () => {
    // ✅ 确保测试数据包含所有targetColumns中的列
    const testDataRow = {
      name: '测试',
      age: 0,
      email: 'test@example.com',
      isActive: true,
      score: 0
    };
    const result = await localRuleExecutor.executeRule(mockRule, [testDataRow]);

    const ageIssue = result.issues.find(i => i.column === 'age');
    const scoreIssue = result.issues.find(i => i.column === 'score');

    expect(ageIssue).toBeUndefined();
    expect(scoreIssue).toBeUndefined();
  });

  test('布尔false不应该被判断为空值', async () => {
    // ✅ 确保测试数据包含所有targetColumns中的列
    const testDataRow = {
      name: '测试',
      age: 25,
      email: 'test@example.com',
      isActive: false,  // 布尔false
      score: 100
    };
    const result = await localRuleExecutor.executeRule(mockRule, [testDataRow]);

    const activeIssue = result.issues.find(i => i.column === 'isActive');
    expect(activeIssue).toBeUndefined();
  });

  test('空字符串应该被判断为空值', async () => {
    // ✅ 确保测试数据包含所有targetColumns中的列
    const testDataRow = {
      name: '',  // 空字符串
      age: 25,
      email: 'test@example.com',
      isActive: true,
      score: 100
    };
    const result = await localRuleExecutor.executeRule(mockRule, [testDataRow]);

    const nameIssue = result.issues.find(i => i.column === 'name');
    expect(nameIssue).toBeDefined();
    expect(nameIssue?.value).toBe('');
  });

  test('纯空格字符串应该被判断为空值', async () => {
    // ✅ 确保测试数据包含所有targetColumns中的列
    const testDataRow = {
      name: '   ',  // 纯空格
      age: 25,
      email: 'test@example.com',
      isActive: true,
      score: 100
    };
    const result = await localRuleExecutor.executeRule(mockRule, [testDataRow]);

    const nameIssue = result.issues.find(i => i.column === 'name');
    expect(nameIssue).toBeDefined();
    expect(nameIssue?.value).toBe('   ');
  });

  test('null和undefined应该被判断为空值', async () => {
    // ✅ 确保测试数据包含所有targetColumns中的列
    const testDataRow = {
      name: null,  // null值
      age: undefined,  // undefined值
      email: 'test@example.com',
      isActive: true,
      score: 100
    };
    const result = await localRuleExecutor.executeRule(mockRule, [testDataRow]);

    const nameIssue = result.issues.find(i => i.column === 'name');
    const ageIssue = result.issues.find(i => i.column === 'age');

    expect(nameIssue).toBeDefined();
    expect(nameIssue?.value).toBeNull();

    expect(ageIssue).toBeDefined();
    expect(ageIssue?.value).toBeUndefined();
  });
});

describe('localRuleExecutor - detectTargetColumns', () => {
  test('应该优先使用rule.targetColumns', () => {
    const mockRule: QualityRule = {
      id: 'test',
      name: '测试',
      description: '测试',
      category: '测试',
      checkContent: '测试',
      criteria: '测试',
      severity: 'P1',
      executionType: 'local',
      localRule: { type: 'not_null', params: {} },
      targetColumns: ['email', 'phone'], // 明确指定了目标列
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      isOfficial: false,
      isEnabled: true
    };

    const testData = [
      { email: 'test@example.com', phone: '123456', name: '张三' }
    ];

    // 执行规则
    const executor = localRuleExecutor as any;
    const detected = executor.detectTargetColumns(mockRule, testData);

    console.log('检测到的目标列:', detected);
    expect(detected).toContain('email');
    expect(detected).toContain('phone');
    expect(detected).not.toContain('name');
  });
});
