/**
 * 测试引擎类型定义
 * 定义所有测试相关的接口和类型
 */

// ============================================================
// 函数信息类型
// ============================================================

export interface FunctionInfo {
  /** 函数名 */
  name: string;

  /** 所属类 */
  className?: string;

  /** 文件路径 */
  filePath: string;

  /** 参数列表 */
  parameters: ParameterInfo[];

  /** 返回类型 */
  returnType: string;

  /** 函数体代码 */
  body: string;

  /** 是否异步 */
  isAsync: boolean;

  /** 访问修饰符 */
  accessModifier: 'public' | 'private' | 'protected';

  /** JSDoc注释 */
  jsDoc?: string;
}

export interface ParameterInfo {
  /** 参数名 */
  name: string;

  /** 参数类型 */
  type: string;

  /** 是否可选 */
  optional: boolean;

  /** 默认值 */
  defaultValue?: any;

  /** JSDoc注释 */
  description?: string;
}

// ============================================================
// 类信息类型
// ============================================================

export interface ClassInfo {
  /** 类名 */
  name: string;

  /** 文件路径 */
  filePath: string;

  /** 方法列表 */
  methods: FunctionInfo[];

  /** 属性列表 */
  properties: PropertyInfo[];

  /** 继承的类 */
  extends?: string;

  /** 实现的接口 */
  implements?: string[];

  /** JSDoc注释 */
  jsDoc?: string;
}

export interface PropertyInfo {
  /** 属性名 */
  name: string;

  /** 属性类型 */
  type: string;

  /** 访问修饰符 */
  accessModifier: 'public' | 'private' | 'protected';

  /** 是否只读 */
  readonly: boolean;

  /** 是否静态 */
  static: boolean;

  /** 初始值 */
  initialValue?: any;
}

// ============================================================
// 模块信息类型
// ============================================================

export interface ModuleInfo {
  /** 模块名 */
  name: string;

  /** 模块路径 */
  path: string;

  /** 导出的类 */
  exports: ClassInfo[];

  /** 导出的函数 */
  functions: FunctionInfo[];

  /** 依赖的其他模块 */
  dependencies: string[];

  /** 模块类型 */
  type: 'service' | 'utility' | 'component' | 'infrastructure';
}

// ============================================================
// 测试选项类型
// ============================================================

export interface TestOptions {
  /** 并行执行 */
  parallel?: boolean;

  /** 最大工作进程数 */
  maxWorkers?: number;

  /** 超时时间（毫秒） */
  timeout?: number;

  /** 详细输出 */
  verbose?: boolean;

  /** 测试模式 */
  mode?: 'all' | 'unit' | 'integration' | 'regression' | 'performance';

  /** 覆盖率分析 */
  coverage?: boolean;

  /** 测试过滤模式 */
  pattern?: string;

  /** 只运行失败的测试 */
  onlyFailures?: boolean;
}

// ============================================================
// 测试结果类型
// ============================================================

export interface TestResult {
  /** 总测试数 */
  totalTests: number;

  /** 通过的测试数 */
  passedTests: number;

  /** 失败的测试数 */
  failedTests: number;

  /** 跳过的测试数 */
  skippedTests: number;

  /** 执行时间（毫秒） */
  duration: number;

  /** 成功率 */
  successRate: number;

  /** 测试套件结果 */
  suites: TestSuiteResult[];

  /** 覆盖率数据 */
  coverage?: CoverageData;

  /** 时间戳 */
  timestamp: number;

  /** 执行状态 */
  status: 'passed' | 'failed' | 'partial';

  /** 错误信息（如果测试失败） */
  error?: string;
}

export interface TestSuiteResult {
  /** 套件名称 */
  name: string;

  /** 文件路径 */
  filePath: string;

  /** 测试用例 */
  tests: TestCaseResult[];

  /** 执行时间（毫秒） */
  duration: number;

  /** 状态 */
  status: 'passed' | 'failed';

  /** 错误信息 */
  error?: string;
}

export interface TestCaseResult {
  /** 测试名称 */
  name: string;

  /** 状态 */
  status: 'passed' | 'failed' | 'skipped';

  /** 执行时间（毫秒） */
  duration: number;

  /** 错误信息 */
  error?: TestCaseError;

  /** 重试次数 */
  retries: number;
}

export interface TestCaseError {
  /** 错误消息 */
  message: string;

  /** 错误堆栈 */
  stack: string;

  /** 期望值 */
  expected?: any;

  /** 实际值 */
  actual?: any;
}

// ============================================================
// 测试报告类型
// ============================================================

export interface TestReport {
  /** 报告元数据 */
  metadata: {
    title: string;
    generatedAt: string;
    project: string;
    version: string;
  };

  /** 测试结果摘要 */
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    successRate: number;
  };

  /** 详细结果 */
  details: TestSuiteResult[];

  /** 覆盖率摘要 */
  coverage?: CoverageSummary;

  /** 性能指标 */
  performance?: PerformanceMetrics;

  /** 趋势分析 */
  trends?: TestTrend[];
}

export interface PerformanceMetrics {
  /** 平均执行时间 */
  avgDuration: number;

  /** 最慢测试 */
  slowestTests: {
    name: string;
    duration: number;
  }[];

  /** 内存使用 */
  memoryUsage: {
    used: number;
    total: number;
  };
}

export interface TestTrend {
  /** 日期 */
  date: string;

  /** 成功率 */
  successRate: number;

  /** 覆盖率 */
  coverage: number;

  /** 执行时间 */
  duration: number;
}

// ============================================================
// 覆盖率类型
// ============================================================

export interface CoverageData {
  /** 文件覆盖率 */
  files: Record<string, FileCoverage>;

  /** 总体统计 */
  totals: CoverageTotals;

  /** 覆盖率百分比 */
  percentages: CoveragePercentages;
}

export interface FileCoverage {
  /** 文件路径 */
  path: string;

  /** 语句覆盖率 */
  statements: CoverageMetric;

  /** 分支覆盖率 */
  branches: CoverageMetric;

  /** 函数覆盖率 */
  functions: CoverageMetric;

  /** 行覆盖率 */
  lines: CoverageMetric;
}

export interface CoverageMetric {
  /** 总数 */
  total: number;

  /** 已覆盖数 */
  covered: number;

  /** 跳过数 */
  skipped: number;

  /** 覆盖率百分比 */
  percentage: number;
}

export interface CoverageTotals {
  /** 总语句数 */
  totalStatements: number;

  /** 已覆盖语句数 */
  coveredStatements: number;

  /** 总分支数 */
  totalBranches: number;

  /** 已覆盖分支数 */
  coveredBranches: number;

  /** 总函数数 */
  totalFunctions: number;

  /** 已覆盖函数数 */
  coveredFunctions: number;

  /** 总行数 */
  totalLines: number;

  /** 已覆盖行数 */
  coveredLines: number;
}

export interface CoveragePercentages {
  /** 语句覆盖率 */
  statements: number;

  /** 分支覆盖率 */
  branches: number;

  /** 函数覆盖率 */
  functions: number;

  /** 行覆盖率 */
  lines: number;

  /** 平均覆盖率 */
  average: number;
}

export interface CoverageSummary {
  /** 语句覆盖率 */
  statements: number;

  /** 分支覆盖率 */
  branches: number;

  /** 函数覆盖率 */
  functions: number;

  /** 行覆盖率 */
  lines: number;

  /** 是否达标 */
  meetsThreshold: boolean;

  /** 未达标项 */
  failedThresholds: string[];
}

export interface CoverageThresholds {
  /** 语句覆盖率阈值 */
  statements?: number;

  /** 分支覆盖率阈值 */
  branches?: number;

  /** 函数覆盖率阈值 */
  functions?: number;

  /** 行覆盖率阈值 */
  lines?: number;
}

export interface UncoveredCode {
  /** 文件路径 */
  filePath: string;

  /** 起始行 */
  startLine: number;

  /** 结束行 */
  endLine: number;

  /** 代码类型 */
  type: 'statement' | 'branch' | 'function' | 'line';

  /** 代码片段 */
  code: string;

  /** 原因 */
  reason: string;
}

// ============================================================
// 集成测试类型
// ============================================================

export interface IntegrationTest {
  /** 测试名称 */
  name: string;

  /** 测试描述 */
  description: string;

  /** 测试场景 */
  scenario: E2EScenario | APITest | DataFlowTest;

  /** 测试函数 */
  test: () => Promise<void>;

  /** 设置函数 */
  setup?: () => Promise<void>;

  /** 清理函数 */
  teardown?: () => Promise<void>;

  /** 超时时间 */
  timeout?: number;

  /** 重试次数 */
  retries?: number;
}

export interface E2EScenario {
  /** 场景名称 */
  name: string;

  /** 场景描述 */
  description: string;

  /** 测试步骤 */
  steps: TestStep[];

  /** 预期结果 */
  expectedOutcome: string;
}

export interface TestStep {
  /** 步骤名称 */
  name: string;

  /** 步骤描述 */
  description: string;

  /** 执行动作 */
  action: () => Promise<void>;

  /** 预期结果 */
  expected: any;

  /** 超时时间 */
  timeout?: number;
}

export interface APITest {
  /** API端点 */
  endpoint: string;

  /** HTTP方法 */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /** 请求参数 */
  params?: any;

  /** 请求体 */
  body?: any;

  /** 预期响应 */
  expectedResponse: {
    status: number;
    body?: any;
    headers?: Record<string, string>;
  };

  /** Mock配置 */
  mock?: {
    response: any;
    delay?: number;
    error?: Error;
  };
}

export interface DataFlowTest {
  /** 数据源 */
  source: {
    type: 'excel' | 'database' | 'api' | 'file';
    config: any;
  };

  /** 数据转换 */
  transformations: {
    name: string;
    transform: (data: any) => any;
  }[];

  /** 预期输出 */
  expectedOutput: any;

  /** 验证函数 */
  validate: (result: any) => boolean;
}

export interface IntegrationTestResult {
  /** 测试名称 */
  name: string;

  /** 状态 */
  status: 'passed' | 'failed';

  /** 执行时间（毫秒） */
  duration: number;

  /** 测试步骤结果 */
  steps: {
    name: string;
    status: 'passed' | 'failed';
    duration: number;
    error?: string;
  }[];

  /** 错误信息 */
  error?: string;

  /** 截图（UI测试） */
  screenshot?: string;
}

export interface E2ETestResult extends IntegrationTestResult {
  /** 场景名称 */
  scenarioName: string;

  /** 执行的步骤 */
  executedSteps: TestStep[];
}

// ============================================================
// 回归测试类型
// ============================================================

export interface RegressionTest {
  /** 测试名称 */
  name: string;

  /** 模块 */
  module: string;

  /** 测试函数 */
  test: () => Promise<void>;

  /** 基线结果 */
  baseline: BaselineResult;

  /** 允许的偏差 */
  tolerance?: number;

  /** 重要级别 */
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface BaselineResult {
  /** 数据 */
  data: any;

  /** 性能指标 */
  performance: {
    duration: number;
    memory: number;
  };

  /** 时间戳 */
  timestamp: number;

  /** 版本 */
  version: string;
}

export interface RegressionTestResult {
  /** 测试名称 */
  name: string;

  /** 模块 */
  module: string;

  /** 状态 */
  status: 'passed' | 'failed' | 'degraded';

  /** 当前结果 */
  current: BaselineResult;

  /** 与基线的差异 */
  diff: ComparisonDiff;

  /** 是否在容忍范围内 */
  withinTolerance: boolean;
}

export interface ComparisonDiff {
  /** 数据差异 */
  data: {
    passed: boolean;
    differences: string[];
  };

  /** 性能差异 */
  performance: {
    durationChange: number;
    durationChangePercent: number;
    memoryChange: number;
    memoryChangePercent: number;
  };

  /** 整体通过 */
  passed: boolean;
}

export interface ComparisonReport {
  /** 比较时间 */
  timestamp: number;

  /** 当前版本 */
  currentVersion: string;

  /** 基线版本 */
  baselineVersion: string;

  /** 测试数量 */
  totalTests: number;

  /** 通过的测试 */
  passedTests: number;

  /** 失败的测试 */
  failedTests: number;

  /** 性能退化 */
  degradedTests: number;

  /** 详细差异 */
  differences: RegressionTestResult[];

  /** 总结 */
  summary: string;
}

// ============================================================
// 性能测试类型
// ============================================================

export interface PerformanceTest {
  /** 测试名称 */
  name: string;

  /** 测试函数 */
  test: () => Promise<void> | void;

  /** 基准配置 */
  benchmark: {
    /** 迭代次数 */
    iterations: number;

    /** 预热次数 */
    warmupIterations: number;

    /** 并发数 */
    concurrency: number;
  };

  /** 性能阈值 */
  thresholds: {
    /** 最大执行时间（毫秒） */
    maxDuration: number;

    /** 最大内存使用（字节） */
    maxMemory: number;

    /** 最小吞吐量（操作/秒） */
    minThroughput?: number;
  };
}

export interface PerformanceTestResult {
  /** 测试名称 */
  name: string;

  /** 状态 */
  status: 'passed' | 'failed';

  /** 执行时间（毫秒） */
  duration: number;

  /** 平均执行时间（毫秒） */
  avgDuration: number;

  /** 最小执行时间（毫秒） */
  minDuration: number;

  /** 最大执行时间（毫秒） */
  maxDuration: number;

  /** 百分位数 */
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };

  /** 内存使用 */
  memoryUsage: {
    used: number;
    peak: number;
  };

  /** 吞吐量（操作/秒） */
  throughput: number;

  /** 是否达到阈值 */
  meetsThreshold: boolean;

  /** 阈值违规 */
  thresholdViolations: string[];
}

export interface LoadTestScenario {
  /** 场景名称 */
  name: string;

  /** 测试函数 */
  test: () => Promise<void>;

  /** 负载配置 */
  load: {
    /** 并发用户数 */
    concurrentUsers: number;

    /** 请求速率（请求/秒） */
    requestRate: number;

    /** 持续时间（秒） */
    duration: number;

    /** 逐步增加 */
    rampUp?: {
      enabled: boolean;
      initialUsers: number;
      rampUpTime: number;
    };
  };

  /** 性能阈值 */
  thresholds: {
    /** 最大响应时间（毫秒） */
    maxResponseTime: number;

    /** 最小请求成功率 */
    minSuccessRate: number;

    /** 最大错误率 */
    maxErrorRate: number;
  };
}

export interface LoadTestResult {
  /** 场景名称 */
  name: string;

  /** 状态 */
  status: 'passed' | 'failed';

  /** 执行时间（毫秒） */
  duration: number;

  /** 请求总数 */
  totalRequests: number;

  /** 成功请求数 */
  successfulRequests: number;

  /** 失败请求数 */
  failedRequests: number;

  /** 成功率 */
  successRate: number;

  /** 错误率 */
  errorRate: number;

  /** 平均响应时间（毫秒） */
  avgResponseTime: number;

  /** 最大响应时间（毫秒） */
  maxResponseTime: number;

  /** 吞吐量（请求/秒） */
  throughput: number;

  /** 并发用户数 */
  concurrentUsers: number;

  /** 时间序列数据 */
  timeSeries: {
    timestamp: number;
    responseTime: number;
    successRate: number;
    activeUsers: number;
  }[];
}

export interface StressTestScenario {
  /** 场景名称 */
  name: string;

  /** 测试函数 */
  test: () => Promise<void>;

  /** 压力配置 */
  stress: {
    /** 初始负载 */
    initialLoad: number;

    /** 负载增量 */
    loadIncrement: number;

    /** 增量间隔（秒） */
    incrementInterval: number;

    /** 最大负载 */
    maxLoad: number;

    /** 失败阈值 */
    failureThreshold: number;
  };

  /** 监控指标 */
  metrics: {
    cpu: number;
    memory: number;
    responseTime: number;
    errorRate: number;
  };
}

export interface StressTestResult {
  /** 场景名称 */
  name: string;

  /** 状态 */
  status: 'passed' | 'failed' | 'broken';

  /** 断裂点 */
  breakingPoint: {
    load: number;
    reason: string;
  };

  /** 测试数据 */
  testData: {
    load: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
  }[];

  /** 系统限制 */
  systemLimits: {
    maxConcurrentUsers: number;
    maxRequestsPerSecond: number;
    maxMemoryUsage: number;
  };
}

export interface PerformanceReport {
  /** 报告元数据 */
  metadata: {
    title: string;
    generatedAt: string;
    project: string;
    version: string;
  };

  /** 性能测试摘要 */
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    avgDuration: number;
    totalDuration: number;
  };

  /** 详细结果 */
  results: PerformanceTestResult[];

  /** 负载测试结果 */
  loadResults?: LoadTestResult[];

  /** 压力测试结果 */
  stressResults?: StressTestResult[];

  /** 性能趋势 */
  trends?: {
    date: string;
    avgResponseTime: number;
    throughput: number;
  }[];

  /** 性能建议 */
  recommendations: string[];
}
