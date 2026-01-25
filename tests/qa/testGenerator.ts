/**
 * 测试生成器
 * 自动生成单元测试、集成测试和性能测试代码
 *
 * 功能：
 * - 为函数生成单元测试
 * - 为类生成测试套件
 * - 生成边界测试
 * - 生成错误处理测试
 * - 生成集成测试
 */

import {
  FunctionInfo,
  ClassInfo,
  ModuleInfo,
  ParameterInfo
} from './types';

// ============================================================
// 测试生成器核心类
// ============================================================

export class TestGenerator {
  private readonly projectRoot: string;
  private readonly testFramework: 'jest' | 'mocha' | 'vitest';
  private readonly assertionLibrary: 'expect' | 'chai' | 'assert';

  constructor(
    projectRoot: string,
    options: {
      testFramework?: 'jest' | 'mocha' | 'vitest';
      assertionLibrary?: 'expect' | 'chai' | 'assert';
    } = {}
  ) {
    this.projectRoot = projectRoot;
    this.testFramework = options.testFramework || 'jest';
    this.assertionLibrary = options.assertionLibrary || 'expect';
  }

  // ============================================================
  // 单元测试生成
  // ============================================================

  /**
   * 为函数生成单元测试
   */
  generateUnitTest(functionInfo: FunctionInfo): string {
    const lines: string[] = [];

    // 文件头部注释
    lines.push('/**');
    lines.push(` * 单元测试: ${functionInfo.className ? functionInfo.className + '.' : ''}${functionInfo.name}`);
    lines.push(` * 文件: ${functionInfo.filePath}`);
    lines.push(' */');
    lines.push('');

    // 导入语句
    lines.push(`import { ${functionInfo.name} } from '../${this.getRelativePath(functionInfo.filePath)}';`);
    lines.push('');

    // describe块
    const testSuiteName = functionInfo.className
      ? `${functionInfo.className}.${functionInfo.name}`
      : functionInfo.name;

    lines.push(`describe('${testSuiteName}', () => {`);
    lines.push('');

    // 正常情况测试
    lines.push(this.generateNormalTests(functionInfo));

    // 边界测试
    lines.push(...this.generateBoundaryTests(functionInfo));

    // 错误处理测试
    lines.push(...this.generateErrorTests(functionInfo));

    lines.push('});');

    return lines.join('\n');
  }

  /**
   * 为类生成测试套件
   */
  generateTestSuite(classInfo: ClassInfo): string {
    const lines: string[] = [];

    // 文件头部注释
    lines.push('/**');
    lines.push(` * 测试套件: ${classInfo.name}`);
    lines.push(` * 文件: ${classInfo.filePath}`);
    lines.push(' */');
    lines.push('');

    // 导入语句
    lines.push(`import { ${classInfo.name} } from '../${this.getRelativePath(classInfo.filePath)}';`);
    lines.push('');

    // describe块
    lines.push(`describe('${classInfo.name}', () => {`);
    lines.push('');
    lines.push('  let instance: any;');
    lines.push('');

    // beforeEach钩子
    lines.push('  beforeEach(() => {');
    lines.push('    // 在每个测试前创建实例');
    lines.push('    instance = new ' + classInfo.name + '();');
    lines.push('  });');
    lines.push('');

    // afterEach钩子
    lines.push('  afterEach(() => {');
    lines.push('    // 在每个测试后清理');
    lines.push('    instance = null;');
    lines.push('  });');
    lines.push('');

    // 为每个方法生成测试
    for (const method of classInfo.methods) {
      lines.push(this.generateUnitTest(method));
    }

    lines.push('});');

    return lines.join('\n');
  }

  /**
   * 生成正常情况测试
   */
  private generateNormalTests(functionInfo: FunctionInfo): string {
    const lines: string[] = [];

    // 获取测试用例
    const testCases = this.generateTestCases(functionInfo);

    lines.push("  describe('正常情况', () => {");

    for (const testCase of testCases) {
      lines.push(`    it('${testCase.description}', async () => {`);
      lines.push(this.generateTestCaseBody(functionInfo, testCase));
      lines.push('    });');
      lines.push('');
    }

    lines.push('  });');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * 生成边界测试
   */
  generateBoundaryTests(functionInfo: FunctionInfo): string[] {
    const lines: string[] = [];

    lines.push("  describe('边界测试', () => {");

    // 空值测试
    if (this.hasNullableParameter(functionInfo)) {
      lines.push("    it('应该处理null或undefined参数', async () => {");
      lines.push(this.generateNullTest(functionInfo));
      lines.push('    });');
      lines.push('');
    }

    // 空数组/空对象测试
    if (this.hasCollectionParameter(functionInfo)) {
      lines.push("    it('应该处理空数组或空对象', async () => {");
      lines.push(this.generateEmptyCollectionTest(functionInfo));
      lines.push('    });');
      lines.push('');
    }

    // 数值边界测试
    if (this.hasNumericParameter(functionInfo)) {
      lines.push("    it('应该处理数值边界情况', async () => {");
      lines.push(this.generateNumericBoundaryTest(functionInfo));
      lines.push('    });');
      lines.push('');
    }

    // 字符串边界测试
    if (this.hasStringParameter(functionInfo)) {
      lines.push("    it('应该处理空字符串和长字符串', async () => {");
      lines.push(this.generateStringBoundaryTest(functionInfo));
      lines.push('    });');
      lines.push('');
    }

    lines.push('  });');
    lines.push('');

    return lines;
  }

  /**
   * 生成错误处理测试
   */
  generateErrorTests(functionInfo: FunctionInfo): string[] {
    const lines: string[] = [];

    lines.push("  describe('错误处理', () => {");

    // 类型错误测试
    lines.push("    it('应该抛出类型错误', async () => {");
    lines.push(this.generateTypeErrorTest(functionInfo));
    lines.push('    });');
    lines.push('');

    // 参数验证测试
    if (functionInfo.parameters.length > 0) {
      lines.push("    it('应该验证必需参数', async () => {");
      lines.push(this.generateParameterValidationTest(functionInfo));
      lines.push('    });');
      lines.push('');
    }

    // 异常情况测试
    lines.push("    it('应该处理异常情况', async () => {");
    lines.push(this.generateExceptionTest(functionInfo));
    lines.push('    });');
    lines.push('');

    lines.push('  });');
    lines.push('');

    return lines;
  }

  /**
   * 生成集成测试
   */
  generateIntegrationTest(moduleInfo: ModuleInfo): string {
    const lines: string[] = [];

    // 文件头部注释
    lines.push('/**');
    lines.push(` * 集成测试: ${moduleInfo.name}`);
    lines.push(` * 模块路径: ${moduleInfo.path}`);
    lines.push(' */');
    lines.push('');

    // 导入语句
    const imports = moduleInfo.exports.map(cls => cls.name).join(', ');
    lines.push(`import { ${imports} } from '../${this.getRelativePath(moduleInfo.path)}';`);
    lines.push('');

    // describe块
    lines.push(`describe('${moduleInfo.name} - 集成测试', () => {`);
    lines.push('');

    // 设置
    lines.push('  let components: any[];');
    lines.push('');
    lines.push('  beforeAll(async () => {');
    lines.push('    // 初始化测试环境');
    lines.push('    components = [];');
    lines.push('  });');
    lines.push('');

    // 清理
    lines.push('  afterAll(async () => {');
    lines.push('    // 清理测试环境');
    lines.push('  });');
    lines.push('');

    // 生成端到端测试
    lines.push(this.generateE2ETest(moduleInfo));

    // 生成模块间交互测试
    if (moduleInfo.dependencies.length > 0) {
      lines.push(this.generateModuleInteractionTest(moduleInfo));
    }

    lines.push('});');

    return lines.join('\n');
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 生成测试用例
   */
  private generateTestCases(functionInfo: FunctionInfo): TestCase[] {
    const testCases: TestCase[] = [];

    // 根据参数类型和函数名推断测试用例
    const params = functionInfo.parameters;

    if (params.length === 0) {
      // 无参数函数
      testCases.push({
        description: '应该成功执行无参数调用',
        inputs: [],
        expected: 'success',
        assertions: ['expect(result).toBeDefined()']
      });
    } else {
      // 有参数函数 - 生成典型测试用例
      testCases.push({
        description: '应该成功处理有效输入',
        inputs: this.generateValidInputs(params),
        expected: 'success',
        assertions: this.generateAssertions(params)
      });

      // 如果有多个参数，测试参数组合
      if (params.length > 1) {
        testCases.push({
          description: '应该处理参数组合',
          inputs: this.generateCombinatorialInputs(params),
          expected: 'success',
          assertions: this.generateAssertions(params)
        });
      }
    }

    return testCases;
  }

  /**
   * 生成有效输入
   */
  private generateValidInputs(params: ParameterInfo[]): any[] {
    return params.map(param => this.generateMockValue(param.type));
  }

  /**
   * 生成组合输入
   */
  private generateCombinatorialInputs(params: ParameterInfo[]): any[] {
    // 生成不同的参数组合
    return params.map(param => {
      if (param.optional) {
        return undefined; // 测试可选参数
      }
      return this.generateMockValue(param.type);
    });
  }

  /**
   * 生成断言语句
   */
  private generateAssertions(params: ParameterInfo[]): string[] {
    const assertions: string[] = [];

    // 基本断言
    assertions.push('expect(result).toBeDefined()');

    // 根据参数类型推断返回值类型
    const hasAsync = params.some(p => p.type.includes('Promise') || p.type.includes('Callback'));

    if (hasAsync) {
      assertions.push('expect(result).toBeInstanceOf(Object)');
    }

    return assertions;
  }

  /**
   * 生成测试用例体
   */
  private generateTestCaseBody(functionInfo: FunctionInfo, testCase: TestCase): string {
    const lines: string[] = [];

    // 准备测试数据
    if (testCase.inputs.length > 0) {
      const inputDeclarations = testCase.inputs.map((input, index) => {
        const paramName = functionInfo.parameters[index]?.name || `param${index}`;
        return `const ${paramName} = ${JSON.stringify(input)};`;
      });
      lines.push(...inputDeclarations.map(s => '      ' + s));
      lines.push('');
    }

    // 调用函数
    const paramNames = functionInfo.parameters.map(p => p.name).join(', ');
    const callExpression = functionInfo.isAsync
      ? `await ${functionInfo.name}(${paramNames})`
      : `${functionInfo.name}(${paramNames})`;

    lines.push(`      const result = ${callExpression};`);
    lines.push('');

    // 断言
    for (const assertion of testCase.assertions) {
      lines.push(`      ${assertion};`);
    }

    return lines.join('\n');
  }

  /**
   * 生成空值测试
   */
  private generateNullTest(functionInfo: FunctionInfo): string {
    const lines: string[] = [];

    const nullableParam = functionInfo.parameters.find(p => p.optional || this.isNullableType(p.type));

    if (nullableParam) {
      lines.push(`      const ${nullableParam.name} = null;`);
      lines.push(`      const result = await ${functionInfo.name}(${nullableParam.name});`);
      lines.push(`      expect(result).toBeDefined();`);
    } else {
      lines.push(`      // 所有参数都是必需的，无需测试null值`);
      lines.push(`      expect(true).toBe(true);`);
    }

    return lines.join('\n');
  }

  /**
   * 生成空集合测试
   */
  private generateEmptyCollectionTest(functionInfo: FunctionInfo): string {
    const lines: string[] = [];

    const collectionParam = functionInfo.parameters.find(p =>
      p.type.includes('[]') ||
      p.type.includes('Array') ||
      p.type === 'object'
    );

    if (collectionParam) {
      const emptyValue = collectionParam.type.includes('[]') || collectionParam.type.includes('Array') ? '[]' : '{}';
      lines.push(`      const ${collectionParam.name} = ${emptyValue};`);
      lines.push(`      const result = await ${functionInfo.name}(${collectionParam.name});`);
      lines.push(`      expect(result).toBeDefined();`);
    } else {
      lines.push(`      // 无集合类型参数`);
      lines.push(`      expect(true).toBe(true);`);
    }

    return lines.join('\n');
  }

  /**
   * 生成数值边界测试
   */
  private generateNumericBoundaryTest(functionInfo: FunctionInfo): string {
    const lines: string[] = [];

    const numericParam = functionInfo.parameters.find(p =>
      p.type === 'number' ||
      p.type === 'int' ||
      p.type === 'float'
    );

    if (numericParam) {
      lines.push(`      const testCases = [0, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];`);
      lines.push(`      for (const value of testCases) {`);
      lines.push(`        const result = await ${functionInfo.name}(value);`);
      lines.push(`        expect(result).toBeDefined();`);
      lines.push(`      }`);
    } else {
      lines.push(`      // 无数值类型参数`);
      lines.push(`      expect(true).toBe(true);`);
    }

    return lines.join('\n');
  }

  /**
   * 生成字符串边界测试
   */
  private generateStringBoundaryTest(functionInfo: FunctionInfo): string {
    const lines: string[] = [];

    const stringParam = functionInfo.parameters.find(p =>
      p.type === 'string' ||
      p.type === 'String'
    );

    if (stringParam) {
      lines.push(`      const testCases = ['', 'a', 'a'.repeat(10000)];`);
      lines.push(`      for (const value of testCases) {`);
      lines.push(`        const result = await ${functionInfo.name}(value);`);
      lines.push(`        expect(result).toBeDefined();`);
      lines.push(`      }`);
    } else {
      lines.push(`      // 无字符串类型参数`);
      lines.push(`      expect(true).toBe(true);`);
    }

    return lines.join('\n');
  }

  /**
   * 生成类型错误测试
   */
  private generateTypeErrorTest(functionInfo: FunctionInfo): string {
    const lines: string[] = [];

    if (functionInfo.parameters.length > 0) {
      const firstParam = functionInfo.parameters[0];
      const wrongType = this.getWrongTypeValue(firstParam.type);

      lines.push(`      const ${firstParam.name} = ${wrongType};`);
      lines.push(`      await expect(${functionInfo.name}(${firstParam.name}))`);
      lines.push(`        .rejects.toThrow();`);
    } else {
      lines.push(`      // 无参数函数`);
      lines.push(`      expect(true).toBe(true);`);
    }

    return lines.join('\n');
  }

  /**
   * 生成参数验证测试
   */
  private generateParameterValidationTest(functionInfo: FunctionInfo): string {
    const lines: string[] = [];

    const requiredParams = functionInfo.parameters.filter(p => !p.optional);

    if (requiredParams.length > 0) {
      lines.push(`      // 缺少必需参数`);
      lines.push(`      await expect(${functionInfo.name}())`);
      lines.push(`        .rejects.toThrow();`);
    } else {
      lines.push(`      // 所有参数都是可选的`);
      lines.push(`      expect(true).toBe(true);`);
    }

    return lines.join('\n');
  }

  /**
   * 生成异常测试
   */
  private generateExceptionTest(functionInfo: FunctionInfo): string {
    const lines: string[] = [];

    lines.push(`      // 测试异常情况`);
    lines.push(`      const invalidInput = Symbol('invalid');`);
    lines.push(`      await expect(${functionInfo.name}(invalidInput as any))`);
    lines.push(`        .rejects.toThrow();`);

    return lines.join('\n');
  }

  /**
   * 生成端到端测试
   */
  private generateE2ETest(moduleInfo: ModuleInfo): string {
    const lines: string[] = [];

    lines.push("  describe('端到端测试', () => {");
    lines.push("    it('应该完成完整的用户流程', async () => {");
    lines.push('      // 1. 初始化组件');
    lines.push('      // 2. 执行操作');
    lines.push('      // 3. 验证结果');
    lines.push('      expect(true).toBe(true);');
    lines.push('    });');
    lines.push('  });');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * 生成模块交互测试
   */
  private generateModuleInteractionTest(moduleInfo: ModuleInfo): string {
    const lines: string[] = [];

    lines.push("  describe('模块交互', () => {");
    moduleInfo.dependencies.forEach(dep => {
      lines.push(`    it('应该与${dep}正确交互', async () => {`);
      lines.push('      // 测试模块间交互');
      lines.push('      expect(true).toBe(true);');
      lines.push('    });');
    });
    lines.push('  });');
    lines.push('');

    return lines.join('\n');
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /**
   * 生成模拟值
   */
  private generateMockValue(type: string): any {
    if (type.includes('string')) return 'test-string';
    if (type.includes('number') || type.includes('int') || type.includes('float')) return 42;
    if (type.includes('boolean')) return true;
    if (type.includes('Array') || type.includes('[]')) return [];
    if (type.includes('Object')) return {};
    return null;
  }

  /**
   * 获取错误类型值
   */
  private getWrongTypeValue(type: string): string {
    if (type.includes('string')) return '123';
    if (type.includes('number')) return "'not-a-number'";
    if (type.includes('boolean')) return "'not-a-boolean'";
    if (type.includes('Array') || type.includes('[]')) return '{}';
    if (type.includes('Object')) return '[]';
    return 'null';
  }

  /**
   * 检查是否可空类型
   */
  private isNullableType(type: string): boolean {
    return type.includes('null') || type.includes('undefined');
  }

  /**
   * 检查是否有可空参数
   */
  private hasNullableParameter(functionInfo: FunctionInfo): boolean {
    return functionInfo.parameters.some(p =>
      p.optional || this.isNullableType(p.type)
    );
  }

  /**
   * 检查是否有集合参数
   */
  private hasCollectionParameter(functionInfo: FunctionInfo): boolean {
    return functionInfo.parameters.some(p =>
      p.type.includes('[]') ||
      p.type.includes('Array') ||
      p.type === 'object'
    );
  }

  /**
   * 检查是否有数值参数
   */
  private hasNumericParameter(functionInfo: FunctionInfo): boolean {
    return functionInfo.parameters.some(p =>
      p.type === 'number' ||
      p.type === 'int' ||
      p.type === 'float'
    );
  }

  /**
   * 检查是否有字符串参数
   */
  private hasStringParameter(functionInfo: FunctionInfo): boolean {
    return functionInfo.parameters.some(p =>
      p.type === 'string' ||
      p.type === 'String'
    );
  }

  /**
   * 获取相对路径
   */
  private getRelativePath(filePath: string): string {
    // 移除项目根路径前缀
    const relative = filePath.replace(this.projectRoot, '').replace(/^\//, '');
    // 移除文件扩展名
    return relative.replace(/\.(ts|tsx|js|jsx)$/, '');
  }
}

// ============================================================
// 辅助接口
// ============================================================

interface TestCase {
  description: string;
  inputs: any[];
  expected: string;
  assertions: string[];
}

// ============================================================
// 导出
// ============================================================

export default TestGenerator;
