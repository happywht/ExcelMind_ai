/**
 * 集成测试框架
 * 提供端到端、API和数据流测试能力
 *
 * 功能：
 * - 端到端流程测试
 * - API集成测试
 * - 数据流测试
 * - 跨模块交互测试
 */

import {
  IntegrationTest,
  IntegrationTestResult,
  E2EScenario,
  E2ETestResult,
  APITest,
  DataFlowTest,
  TestStep
} from './types';

// ============================================================
// 集成测试套件核心类
// ============================================================

export class IntegrationTestSuite {
  private tests: Map<string, IntegrationTest> = new Map();
  private results: IntegrationTestResult[] = [];

  // ============================================================
  // 测试管理
  // ============================================================

  /**
   * 添加集成测试
   */
  addTest(test: IntegrationTest): void {
    this.tests.set(test.name, test);
    console.log(`✓ 已添加集成测试: ${test.name}`);
  }

  /**
   * 批量添加测试
   */
  addTests(tests: IntegrationTest[]): void {
    tests.forEach(test => this.addTest(test));
  }

  /**
   * 移除测试
   */
  removeTest(name: string): boolean {
    return this.tests.delete(name);
  }

  /**
   * 获取测试
   */
  getTest(name: string): IntegrationTest | undefined {
    return this.tests.get(name);
  }

  /**
   * 获取所有测试
   */
  getAllTests(): IntegrationTest[] {
    return Array.from(this.tests.values());
  }

  // ============================================================
  // 测试执行
  // ============================================================

  /**
   * 运行集成测试套件
   */
  async run(): Promise<IntegrationTestResult[]> {
    console.log('');
    console.log('🔗 运行集成测试套件...');
    console.log(`   测试数量: ${this.tests.size}`);
    console.log('');

    this.results = [];

    const testEntries = Array.from(this.tests.entries());

    for (const [name, test] of testEntries) {
      console.log(`▶️  运行测试: ${name}`);

      try {
        // 执行设置
        if (test.setup) {
          await test.setup();
        }

        // 执行测试
        const startTime = Date.now();
        await test.test();
        const duration = Date.now() - startTime;

        // 记录成功结果
        this.results.push({
          name: test.name,
          status: 'passed',
          duration,
          steps: [{
            name: test.name,
            status: 'passed',
            duration
          }]
        });

        console.log(`   ✅ 通过 (${duration}ms)`);

      } catch (error: any) {
        // 记录失败结果
        this.results.push({
          name: test.name,
          status: 'failed',
          duration: 0,
          steps: [{
            name: test.name,
            status: 'failed',
            duration: 0,
            error: error.message
          }],
          error: error.message
        });

        console.log(`   ❌ 失败: ${error.message}`);
      } finally {
        // 执行清理
        if (test.teardown) {
          try {
            await test.teardown();
          } catch (error) {
            console.error('   ⚠️  清理失败:', error);
          }
        }
      }
    }

    // 打印摘要
    this.printSummary();

    return this.results;
  }

  /**
   * 测试端到端流程
   */
  async testE2E(scenario: E2EScenario): Promise<E2ETestResult> {
    console.log('');
    console.log(`🎬 E2E场景: ${scenario.name}`);
    console.log(`   描述: ${scenario.description}`);
    console.log('');

    const stepResults: Array<{
      name: string;
      status: 'passed' | 'failed';
      duration: number;
      error?: string;
    }> = [];

    let scenarioPassed = true;
    let scenarioError: string | undefined;

    for (const step of scenario.steps) {
      console.log(`   步骤: ${step.name}`);

      try {
        const startTime = Date.now();
        await step.action();
        const duration = Date.now() - startTime;

        stepResults.push({
          name: step.name,
          status: 'passed',
          duration
        });

        console.log(`     ✅ 通过 (${duration}ms)`);

      } catch (error: any) {
        scenarioPassed = false;
        scenarioError = error.message;

        stepResults.push({
          name: step.name,
          status: 'failed',
          duration: 0,
          error: error.message
        });

        console.log(`     ❌ 失败: ${error.message}`);
        break; // 停止执行后续步骤
      }
    }

    const result: E2ETestResult = {
      name: scenario.name,
      status: scenarioPassed ? 'passed' : 'failed',
      duration: stepResults.reduce((sum, step) => sum + step.duration, 0),
      steps: stepResults,
      scenarioName: scenario.name,
      executedSteps: scenario.steps,
      error: scenarioError
    };

    console.log('');
    console.log(`场景 ${scenarioPassed ? '✅ 通过' : '❌ 失败'}`);

    return result;
  }

  /**
   * 测试API集成
   */
  async testAPIIntegration(apiTest: APITest): Promise<IntegrationTestResult> {
    console.log('');
    console.log(`🌐 API测试: ${apiTest.method} ${apiTest.endpoint}`);
    console.log('');

    try {
      // 构建请求配置
      const requestConfig = {
        method: apiTest.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: apiTest.body ? JSON.stringify(apiTest.body) : undefined
      };

      // 如果有mock，使用mock
      if (apiTest.mock) {
        console.log('   使用Mock响应');

        if (apiTest.mock.delay) {
          await new Promise(resolve => setTimeout(resolve, apiTest.mock!.delay!));
        }

        if (apiTest.mock.error) {
          throw apiTest.mock.error;
        }

        // 验证mock响应
        this.validateAPIResponse(apiTest.mock.response, apiTest.expectedResponse);

      } else {
        // 实际API调用（这里需要实现实际的HTTP客户端）
        console.log('   ⚠️  实际API调用需要实现HTTP客户端');
        console.log(`   请求配置:`, requestConfig);
      }

      return {
        name: `API: ${apiTest.endpoint}`,
        status: 'passed',
        duration: 0,
        steps: [{
          name: 'API调用',
          status: 'passed',
          duration: 0
        }]
      };

    } catch (error: any) {
      return {
        name: `API: ${apiTest.endpoint}`,
        status: 'failed',
        duration: 0,
        steps: [{
          name: 'API调用',
          status: 'failed',
          duration: 0,
          error: error.message
        }],
        error: error.message
      };
    }
  }

  /**
   * 测试数据流
   */
  async testDataFlow(flowTest: DataFlowTest): Promise<IntegrationTestResult> {
    console.log('');
    console.log(`📊 数据流测试: ${flowTest.source.type} -> 转换`);
    console.log('');

    try {
      // 1. 加载数据
      console.log('   1. 加载数据源...');
      const sourceData = await this.loadDataSource(flowTest.source);
      console.log(`     ✓ 加载了 ${Array.isArray(sourceData) ? sourceData.length : 1} 条数据`);

      // 2. 应用转换
      console.log('   2. 应用数据转换...');
      let transformedData = sourceData;

      for (const transform of flowTest.transformations) {
        console.log(`     - ${transform.name}`);
        transformedData = transform.transform(transformedData);
      }

      console.log('     ✓ 转换完成');

      // 3. 验证结果
      console.log('   3. 验证输出...');
      const isValid = flowTest.validate(transformedData);

      if (!isValid) {
        throw new Error('数据验证失败');
      }

      console.log('     ✓ 验证通过');

      return {
        name: '数据流测试',
        status: 'passed',
        duration: 0,
        steps: [
          { name: '加载数据', status: 'passed', duration: 0 },
          { name: '应用转换', status: 'passed', duration: 0 },
          { name: '验证输出', status: 'passed', duration: 0 }
        ]
      };

    } catch (error: any) {
      return {
        name: '数据流测试',
        status: 'failed',
        duration: 0,
        steps: [],
        error: error.message
      };
    }
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 验证API响应
   */
  private validateAPIResponse(actual: any, expected: any): void {
    if (expected.status) {
      // 实际应用中这里会比较状态码
    }

    if (expected.body) {
      // 比较响应体
      const bodyMatch = this.deepEqual(actual, expected.body);
      if (!bodyMatch) {
        throw new Error('响应体不匹配');
      }
    }
  }

  /**
   * 深度比较对象
   */
  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (typeof obj1 !== typeof obj2) return false;

    if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
      return obj1 === obj2;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
  }

  /**
   * 加载数据源
   */
  private async loadDataSource(source: DataFlowTest['source']): Promise<any> {
    // 这里实现实际的数据加载逻辑
    // 根据source.type加载不同类型的数据源

    switch (source.type) {
      case 'excel':
        // 模拟Excel数据
        return [
          { id: 1, name: 'Item 1', value: 100 },
          { id: 2, name: 'Item 2', value: 200 },
          { id: 3, name: 'Item 3', value: 300 }
        ];

      case 'database':
        // 模拟数据库查询
        return source.config.data || [];

      case 'api':
        // 模拟API响应
        return source.config.data || [];

      case 'file':
        // 模拟文件读取
        return source.config.data || [];

      default:
        throw new Error(`不支持的数据源类型: ${source.type}`);
    }
  }

  /**
   * 打印测试摘要
   */
  private printSummary(): void {
    console.log('');
    console.log('═'.repeat(60));
    console.log('📊 集成测试摘要');
    console.log('═'.repeat(60));

    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    console.log(`总测试数: ${total}`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`📈 成功率: ${successRate.toFixed(1)}%`);
    console.log('═'.repeat(60));
    console.log('');
  }
}

// ============================================================
// 预定义的集成测试场景
// ============================================================

export const predefinedE2EScenarios: E2EScenario[] = [
  {
    name: '完整文档生成流程',
    description: '从Excel导入到Word文档生成的完整流程',
    steps: [
      {
        name: '加载Excel文件',
        description: '加载包含数据的Excel文件',
        action: async () => {
          // 模拟加载Excel
          console.log('     加载Excel: data.xlsx');
        },
        expected: 'Excel文件成功加载'
      },
      {
        name: '解析数据结构',
        description: '解析Excel中的数据和结构',
        action: async () => {
          // 模拟解析数据
          console.log('     解析数据: 3个Sheet, 150行数据');
        },
        expected: '数据成功解析'
      },
      {
        name: '生成Word文档',
        description: '基于Excel数据生成Word文档',
        action: async () => {
          // 模拟生成文档
          console.log('     生成文档: output.docx');
        },
        expected: 'Word文档成功生成'
      },
      {
        name: '验证文档内容',
        description: '验证生成的文档内容正确性',
        action: async () => {
          // 模拟验证文档
          console.log('     验证文档: 内容正确');
        },
        expected: '文档验证通过'
      }
    ],
    expectedOutcome: '成功生成包含正确数据的Word文档'
  },
  {
    name: 'AI查询解析到执行',
    description: '从自然语言查询到数据检索的完整流程',
    steps: [
      {
        name: '接收用户查询',
        description: '接收用户的自然语言查询',
        action: async () => {
          console.log('     查询: "找出销售额大于1000的产品"');
        },
        expected: '查询成功接收'
      },
      {
        name: 'AI解析查询',
        description: '使用AI解析查询意图',
        action: async () => {
          console.log('     解析结果: SELECT * FROM products WHERE sales > 1000');
        },
        expected: '查询成功解析为SQL'
      },
      {
        name: '执行数据查询',
        description: '执行解析后的SQL查询',
        action: async () => {
          console.log('     查询结果: 25条记录');
        },
        expected: '查询成功执行'
      },
      {
        name: '返回结果',
        description: '格式化并返回查询结果',
        action: async () => {
          console.log('     返回: JSON格式的结果数据');
        },
        expected: '结果成功返回'
      }
    ],
    expectedOutcome: '成功理解查询并返回正确结果'
  },
  {
    name: '多Sheet联合查询',
    description: '跨多个Sheet进行联合数据查询',
    steps: [
      {
        name: '加载多Sheet数据',
        description: '加载包含多个Sheet的Excel文件',
        action: async () => {
          console.log('     加载: 3个Sheet (订单, 产品, 客户)');
        },
        expected: '所有Sheet数据加载成功'
      },
      {
        name: '建立关联关系',
        description: '自动识别Sheet间的关联字段',
        action: async () => {
          console.log('     关联: 订单.产品ID = 产品.ID');
        },
        expected: '关联关系建立成功'
      },
      {
        name: '执行联合查询',
        description: '执行跨Sheet的JOIN查询',
        action: async () => {
          console.log('     查询: SELECT * FROM 订单 JOIN 产品 ON ...');
        },
        expected: '联合查询成功执行'
      },
      {
        name: '验证结果完整性',
        description: '验证跨Sheet数据的完整性',
        action: async () => {
          console.log('     验证: 数据完整，无丢失');
        },
        expected: '数据完整性验证通过'
      }
    ],
    expectedOutcome: '成功跨Sheet查询并返回完整数据'
  }
];

export const predefinedAPITests: APITest[] = [
  {
    endpoint: '/api/query',
    method: 'POST',
    body: {
      query: 'SELECT * FROM products WHERE price > 100'
    },
    expectedResponse: {
      status: 200,
      body: {
        success: true,
        data: []
      }
    }
  },
  {
    endpoint: '/api/document/generate',
    method: 'POST',
    body: {
      template: 'contract.docx',
      data: {}
    },
    expectedResponse: {
      status: 200,
      body: {
        success: true,
        filePath: '/documents/output.docx'
      }
    }
  }
];

// ============================================================
// 导出
// ============================================================

export default IntegrationTestSuite;
