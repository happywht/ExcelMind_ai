/**
 * WASM 集成测试脚本
 *
 * 快速验证 WASM 模块的安装和基本功能
 *
 * 运行方式：
 * ```bash
 * npx tsx scripts/test-wasm-integration.ts
 * ```
 */

import { getPyodideService } from '../src/services/wasm/PyodideService';
import { getFileSystemService, STANDARD_PATHS } from '../src/services/wasm/FileSystemService';
import { getExecutionEngine } from '../src/services/wasm/ExecutionEngine';
import { getWasmIntegration } from '../src/services/wasm/WasmIntegrationLayer';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testPyodideService() {
  section('测试 1: Pyodide 服务');

  try {
    log('初始化 Pyodide 服务...', 'yellow');

    const service = getPyodideService({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
      packages: ['pandas', 'openpyxl', 'numpy']
    });

    log('正在加载 Pyodide (可能需要 5-10 秒)...', 'yellow');
    await service.initialize();

    if (service.isReady()) {
      log('✅ Pyodide 初始化成功', 'green');

      // 测试代码执行
      log('测试代码执行...', 'yellow');
      const result = await service.execute('print("Hello from Pyodide!")');

      if (result.success) {
        log('✅ 代码执行成功', 'green');
      } else {
        log(`❌ 代码执行失败: ${result.error}`, 'red');
      }

      // 测试文件系统状态
      const fsStatus = service.getFileSystemStatus();
      log(`文件系统状态: ${fsStatus.mountedFiles.length} 个文件, ${fsStatus.totalSize} 字节`, 'blue');

      return true;
    } else {
      log('❌ Pyodide 未能就绪', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 测试失败: ${error}`, 'red');
    return false;
  }
}

async function testFileSystemService() {
  section('测试 2: 文件系统服务');

  try {
    const fs = getFileSystemService();

    log('测试标准路径...', 'yellow');
    log(`INPUT: ${STANDARD_PATHS.INPUT}`, 'blue');
    log(`OUTPUT: ${STANDARD_PATHS.OUTPUT}`, 'blue');
    log(`TEMP: ${STANDARD_PATHS.TEMP_DIR}`, 'blue');

    log('✅ 文件系统服务就绪', 'green');

    // 测试文件系统统计
    const stats = fs.getStats();
    log(`文件系统统计: ${stats.totalFiles} 个文件, ${stats.totalSize} 字节`, 'blue');

    return true;
  } catch (error) {
    log(`❌ 测试失败: ${error}`, 'red');
    return false;
  }
}

async function testExecutionEngine() {
  section('测试 3: 执行引擎');

  try {
    const engine = getExecutionEngine();

    log('准备测试数据...', 'yellow');
    const datasets = {
      'test.xlsx': [
        { name: 'Alice', age: 30, salary: 50000 },
        { name: 'Bob', age: 25, salary: 45000 },
        { name: 'Charlie', age: 35, salary: 60000 }
      ]
    };

    log('测试代码执行...', 'yellow');
    const code = `
import pandas as pd
import json

# 读取数据
df = pd.DataFrame(files['test.xlsx'])

# 计算平均薪资
average_salary = df['salary'].mean()

# 输出结果
result = {
    'average_salary': average_salary,
    'count': len(df),
    'names': df['name'].tolist()
}

# 更新 files
files['result.xlsx'] = [{'average_salary': average_salary, 'count': len(df)}]

# 输出
print(json.dumps(files, ensure_ascii=False, default=str))
`;

    const result = await engine.execute(code, datasets, {
      timeout: 30000,
      enableSecurityCheck: true,
      maxMemoryMB: 500,
      outputFormat: 'json'
    });

    if (result.success) {
      log('✅ 执行引擎测试成功', 'green');
      log(`输出数据: ${JSON.stringify(result.data, null, 2)}`, 'blue');
      return true;
    } else {
      log(`❌ 执行失败: ${result.error}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 测试失败: ${error}`, 'red');
    return false;
  }
}

async function testWasmIntegration() {
  section('测试 4: WASM 集成层');

  try {
    const integration = getWasmIntegration({
      enableWasm: true,
      fallbackToNode: true
    });

    log('初始化集成层...', 'yellow');
    await integration.initialize();

    if (integration.isReady()) {
      log('✅ 集成层初始化成功', 'green');

      // 测试执行模式
      const mode = integration.getExecutionMode();
      log(`执行模式: ${mode}`, 'blue');

      // 测试性能指标
      const metrics = integration.getPerformanceMetrics();
      log(`性能指标:`, 'blue');
      log(`  - 总执行次数: ${metrics.totalExecutions}`, 'blue');
      log(`  - 成功率: ${(metrics.successRate * 100).toFixed(2)}%`, 'blue');
      log(`  - 平均执行时间: ${metrics.averageExecutionTime.toFixed(2)}ms`, 'blue');

      return true;
    } else {
      log('❌ 集成层未能就绪', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 测试失败: ${error}`, 'red');
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + '█'.repeat(60));
  log('  WASM 集成测试套件', 'cyan');
  log('  Phase 2 核心架构验证', 'cyan');
  console.log('█'.repeat(60));

  const results = {
    pyodide: false,
    fileSystem: false,
    executionEngine: false,
    integration: false
  };

  try {
    results.pyodide = await testPyodideService();
    results.fileSystem = await testFileSystemService();
    results.executionEngine = await testExecutionEngine();
    results.integration = await testWasmIntegration();
  } catch (error) {
    log(`\n❌ 测试套件异常: ${error}`, 'red');
  }

  // 输出总结
  section('测试总结');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  log(`Pyodide 服务: ${results.pyodide ? '✅ 通过' : '❌ 失败'}`, results.pyodide ? 'green' : 'red');
  log(`文件系统服务: ${results.fileSystem ? '✅ 通过' : '❌ 失败'}`, results.fileSystem ? 'green' : 'red');
  log(`执行引擎: ${results.executionEngine ? '✅ 通过' : '❌ 失败'}`, results.executionEngine ? 'green' : 'red');
  log(`WASM 集成层: ${results.integration ? '✅ 通过' : '❌ 失败'}`, results.integration ? 'green' : 'red');

  console.log('\n' + '='.repeat(60));
  log(`总计: ${passed}/${total} 测试通过`, passed === total ? 'green' : 'yellow');
  console.log('='.repeat(60) + '\n');

  // 退出码
  process.exit(passed === total ? 0 : 1);
}

// 运行测试
runAllTests().catch(error => {
  log(`\n💥 未捕获的错误: ${error}`, 'red');
  console.error(error);
  process.exit(1);
});
