/**
 * QA测试引擎主入口
 * 导出所有测试工具和框架
 */

// 核心类
export { TestGenerator } from './testGenerator';
export { TestRunner } from './testRunner';
export { CoverageAnalyzer } from './coverageAnalyzer';
export { IntegrationTestSuite, predefinedE2EScenarios, predefinedAPITests } from './integrationTestSuite';
export { RegressionTestSuite, createCommonRegressionTests } from './regressionTestSuite';
export { PerformanceTestSuite, createCommonPerformanceTests } from './performanceTestSuite';

// 类型定义
export * from './types';

// 导入类型供内部使用
import { TestRunner } from './testRunner';
import { TestGenerator } from './testGenerator';
import { CoverageAnalyzer } from './coverageAnalyzer';
import { IntegrationTestSuite } from './integrationTestSuite';
import { RegressionTestSuite } from './regressionTestSuite';
import { PerformanceTestSuite } from './performanceTestSuite';

// 工厂函数
export function createTestEngine(projectRoot: string) {
  return {
    generator: new TestGenerator(projectRoot),
    runner: new TestRunner(projectRoot),
    coverage: new CoverageAnalyzer(projectRoot),
    integration: new IntegrationTestSuite(),
    regression: new RegressionTestSuite(),
    performance: new PerformanceTestSuite()
  };
}

// 便捷函数
export async function runAllTests(projectRoot: string) {
  const runner = new TestRunner(projectRoot);
  return runner.runAllTests();
}

export async function analyzeCoverage(projectRoot: string) {
  const analyzer = new CoverageAnalyzer(projectRoot);
  return analyzer.analyzeCoverage();
}

export async function generateTestReport(projectRoot: string) {
  const runner = new TestRunner(projectRoot);
  const result = await runner.runAllTests();
  return runner.generateReport(result);
}
