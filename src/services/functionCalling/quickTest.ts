/**
 * Function Calling 快速测试脚本
 * Phase 2 Week 0 技术验证
 *
 * 运行方式：
 * npx ts-node services/functionCalling/quickTest.ts
 */

import { ToolRegistry } from './ToolRegistry';
import { FunctionCallingAdapter } from './FunctionCallingAdapter';
import { prototypeTools } from './tools';

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

function separator(char: string = '=', length: number = 50) {
  console.log(char.repeat(length));
}

async function runQuickTest() {
  log('\n🚀 Function Calling 快速测试\n', 'cyan');
  separator('=', 50);

  // 测试1: 工具注册
  log('\n测试1: 工具注册', 'yellow');
  separator('-', 30);

  try {
    const registry = new ToolRegistry();
    registry.registerBatch(prototypeTools);

    const toolNames = registry.getToolNames();
    log(`✅ 成功注册 ${toolNames.length} 个工具:`, 'green');
    toolNames.forEach(name => log(`   - ${name}`, 'blue'));

    const tools = registry.getToolDefinitions();
    log(`\n工具定义格式验证:`, 'green');
    tools.forEach(tool => {
      log(`   ${tool.name}:`, 'blue');
      log(`     描述: ${tool.description}`, 'reset');
      log(`     参数: ${Object.keys(tool.inputSchema.properties).join(', ')}`, 'reset');
    });
  } catch (error) {
    log(`❌ 工具注册失败: ${error}`, 'red');
    return;
  }

  // 测试2: 工具执行
  log('\n测试2: 工具执行', 'yellow');
  separator('-', 30);

  try {
    const registry = new ToolRegistry();
    registry.registerBatch(prototypeTools);

    // 执行 analyze_excel
    log('\n执行 analyze_excel...', 'blue');
    const analyzeResult = await registry.executeTool('analyze_excel', {
      fileName: 'test.xlsx'
    });
    log(`✅ 成功: ${JSON.stringify(analyzeResult.data).substring(0, 100)}...`, 'green');

    // 执行 detect_anomalies
    log('\n执行 detect_anomalies...', 'blue');
    const anomalyResult = await registry.executeTool('detect_anomalies', {
      fileName: 'sales.xlsx',
      columnName: '金额',
      threshold: 5000,
      condition: 'greater_than'
    });
    log(`✅ 成功: 发现 ${anomalyResult.data.anomalyCount} 笔异常`, 'green');

    // 执行 fill_document
    log('\n执行 fill_document...', 'blue');
    const fillResult = await registry.executeTool('fill_document', {
      templateFile: 'template.docx',
      dataFile: 'data.xlsx',
      outputFileName: 'output.docx',
      mappings: [
        { placeholder: '{{产品名称}}', column: 'product_name' }
      ]
    });
    log(`✅ 成功: 生成 ${fillResult.data.processedCount} 个文档`, 'green');
  } catch (error) {
    log(`❌ 工具执行失败: ${error}`, 'red');
    return;
  }

  // 测试3: 适配器初始化
  log('\n测试3: 适配器初始化', 'yellow');
  separator('-', 30);

  try {
    const registry = new ToolRegistry();
    registry.registerBatch(prototypeTools);

    const adapter = new FunctionCallingAdapter(
      'test-api-key',
      registry,
      {
        maxDepth: 2,
        maxToolsPerTurn: 3,
        timeout: 30000,
        enableParallel: true
      }
    );

    const config = adapter.getConfig();
    log(`✅ 适配器初始化成功:`, 'green');
    log(`   最大深度: ${config.maxDepth}`, 'blue');
    log(`   每轮最大工具数: ${config.maxToolsPerTurn}`, 'blue');
    log(`   超时时间: ${config.timeout}ms`, 'blue');
    log(`   并行调用: ${config.enableParallel}`, 'blue');
  } catch (error) {
    log(`❌ 适配器初始化失败: ${error}`, 'red');
    return;
  }

  // 测试4: 配置更新
  log('\n测试4: 配置更新', 'yellow');
  separator('-', 30);

  try {
    const registry = new ToolRegistry();
    registry.registerBatch(prototypeTools);

    const adapter = new FunctionCallingAdapter('test-key', registry);
    adapter.updateConfig({ maxDepth: 5, maxToolsPerTurn: 10 });

    const newConfig = adapter.getConfig();
    log(`✅ 配置更新成功:`, 'green');
    log(`   新的最大深度: ${newConfig.maxDepth}`, 'blue');
    log(`   新的最大工具数: ${newConfig.maxToolsPerTurn}`, 'blue');
  } catch (error) {
    log(`❌ 配置更新失败: ${error}`, 'red');
    return;
  }

  // 测试5: 错误处理
  log('\n测试5: 错误处理', 'yellow');
  separator('-', 30);

  try {
    const registry = new ToolRegistry();
    registry.registerBatch(prototypeTools);

    // 尝试执行不存在的工具
    try {
      await registry.executeTool('non_existent_tool', {});
      log(`❌ 应该抛出错误但没有`, 'red');
    } catch (error) {
      log(`✅ 正确抛出错误: ${(error as Error).message}`, 'green');
    }
  } catch (error) {
    log(`❌ 错误处理测试失败: ${error}`, 'red');
  }

  // 总结
  log('\n' + '='.repeat(50), 'cyan');
  log('🎉 所有测试通过！', 'green');
  log('', 'reset');
  log('📋 测试结果总结:', 'yellow');
  log('   ✅ 工具注册: 正常', 'green');
  log('   ✅ 工具执行: 正常', 'green');
  log('   ✅ 适配器初始化: 正常', 'green');
  log('   ✅ 配置更新: 正常', 'green');
  log('   ✅ 错误处理: 正常', 'green');
  log('', 'reset');
  log('🚀 Phase 2 Week 0 技术验证: 完成', 'cyan');
  log('📝 详细报告: FUNCTION_CALLING_VALIDATION_REPORT.md', 'blue');
  separator('=', 50);
}

// 运行测试
if (require.main === module) {
  runQuickTest().catch(error => {
    log(`\n❌ 测试运行失败: ${error}`, 'red');
    process.exit(1);
  });
}

export { runQuickTest };
