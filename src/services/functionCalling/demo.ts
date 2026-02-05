/**
 * Function Calling 原型演示
 * Phase 2 Week 0 技术验证
 *
 * 运行方式：
 * npm run dev
 * 然后在浏览器控制台执行此代码
 */

import { ToolRegistry } from './ToolRegistry';
import { FunctionCallingAdapter } from './FunctionCallingAdapter';
import { prototypeTools } from './tools';

/**
 * 演示1: 基础工具注册
 */
export async function demo01_basicRegistration() {
  console.log('=== 演示1: 基础工具注册 ===\n');

  // 1. 创建工具注册表
  const registry = new ToolRegistry();

  // 2. 注册原型工具
  registry.registerBatch(prototypeTools);

  // 3. 查看已注册工具
  console.log('已注册工具:', registry.getToolNames());
  console.log('工具定义:', registry.getToolDefinitions());

  return registry;
}

/**
 * 演示2: 手动执行工具
 */
export async function demo02_manualExecution() {
  console.log('\n=== 演示2: 手动执行工具 ===\n');

  const registry = new ToolRegistry();
  registry.registerBatch(prototypeTools);

  // 执行Excel分析
  console.log('执行 analyze_excel...');
  const analyzeResult = await registry.executeTool('analyze_excel', {
    fileName: 'sales_data.xlsx',
    sheetName: 'Sheet1'
  });
  console.log('结果:', JSON.stringify(analyzeResult, null, 2));

  // 执行异常检测
  console.log('\n执行 detect_anomalies...');
  const anomalyResult = await registry.executeTool('detect_anomalies', {
    fileName: 'sales_data.xlsx',
    columnName: '金额',
    threshold: 5000,
    condition: 'greater_than'
  });
  console.log('结果:', JSON.stringify(anomalyResult, null, 2));

  // 执行文档填充
  console.log('\n执行 fill_document...');
  const fillResult = await registry.executeTool('fill_document', {
    templateFile: 'contract_template.docx',
    dataFile: 'sales_data.xlsx',
    outputFileName: 'contract_output.docx',
    mappings: [
      { placeholder: '{{产品名称}}', column: 'product_name' },
      { placeholder: '{{金额}}', column: 'amount' }
    ]
  });
  console.log('结果:', JSON.stringify(fillResult, null, 2));
}

/**
 * 演示3: Function Calling 完整流程
 */
export async function demo03_functionCalling() {
  console.log('\n=== 演示3: Function Calling 完整流程 ===\n');

  // 1. 初始化
  const registry = new ToolRegistry();
  registry.registerBatch(prototypeTools);

  const adapter = new FunctionCallingAdapter(
    process.env.ZHIPU_API_KEY || 'your-api-key',
    registry,
    {
      maxDepth: 2,
      maxToolsPerTurn: 3,
      timeout: 30000,
      enableParallel: true
    }
  );

  // 2. 测试场景1: 异常检测
  console.log('场景1: 异常检测');
  console.log('用户: "帮我检查 Excel 里有没有超过5000元的异常记录"\n');

  const result1 = await adapter.execute(
    '帮我检查 Excel 里有没有超过5000元的异常记录'
  );

  console.log('AI回复:', result1.finalResponse);
  console.log('工具调用:', result1.toolCalls);
  console.log('工具结果:', result1.toolResults);
  console.log('迭代次数:', result1.iterations);
  console.log('成功:', result1.success);

  // 3. 测试场景2: Excel分析
  console.log('\n场景2: Excel分析');
  console.log('用户: "分析一下我的销售数据文件"\n');

  const result2 = await adapter.execute(
    '分析一下我的销售数据文件 sales_data.xlsx'
  );

  console.log('AI回复:', result2.finalResponse);
  console.log('工具调用:', result2.toolCalls);

  // 4. 测试场景3: 文档生成
  console.log('\n场景3: 文档生成');
  console.log('用户: "用sales.xlsx的数据填充template.docx"\n');

  const result3 = await adapter.execute(
    '用sales.xlsx的数据填充template.docx，生成产品介绍文档'
  );

  console.log('AI回复:', result3.finalResponse);
  console.log('工具调用:', result3.toolCalls);
}

/**
 * 演示4: 多轮对话
 */
export async function demo04_multiTurnConversation() {
  console.log('\n=== 演示4: 多轮对话 ===\n');

  const registry = new ToolRegistry();
  registry.registerBatch(prototypeTools);

  const adapter = new FunctionCallingAdapter(
    process.env.ZHIPU_API_KEY || 'your-api-key',
    registry
  );

  // 第一轮
  console.log('第一轮对话');
  console.log('用户: "你好"\n');

  const context1 = {
    history: []
  };

  const result1 = await adapter.execute('你好', context1);
  console.log('AI:', result1.finalResponse);

  // 第二轮（保持历史）
  console.log('\n第二轮对话');
  console.log('用户: "帮我分析Excel文件"\n');

  const context2 = {
    history: [
      { role: 'user' as const, content: '你好' },
      { role: 'assistant' as const, content: result1.finalResponse }
    ]
  };

  const result2 = await adapter.execute('帮我分析Excel文件', context2);
  console.log('AI:', result2.finalResponse);
  console.log('工具调用:', result2.toolCalls);
}

/**
 * 演示5: 调用链限制测试
 */
export async function demo05_chainLimits() {
  console.log('\n=== 演示5: 调用链限制测试 ===\n');

  const registry = new ToolRegistry();
  registry.registerBatch(prototypeTools);

  // 限制深度为1
  const adapter = new FunctionCallingAdapter(
    process.env.ZHIPU_API_KEY || 'your-api-key',
    registry,
    { maxDepth: 1, maxToolsPerTurn: 2 }
  );

  console.log('配置: maxDepth=1, maxToolsPerTurn=2');
  console.log('用户: "执行复杂的多步操作"\n');

  const result = await adapter.execute('执行复杂的多步操作');

  console.log('迭代次数:', result.iterations);
  console.log('实际深度不超过1:', result.iterations <= 1);
  console.log('工具调用数:', result.toolCalls.length);
}

/**
 * 主函数：运行所有演示
 */
export async function runAllDemos() {
  console.log('🚀 Function Calling 原型演示\n');
  console.log('=====================================\n');

  try {
    await demo01_basicRegistration();
    await demo02_manualExecution();
    await demo03_functionCalling();
    await demo04_multiTurnConversation();
    await demo05_chainLimits();

    console.log('\n=====================================');
    console.log('✅ 所有演示完成！');
  } catch (error) {
    console.error('❌ 演示失败:', error);
  }
}

// 导出演示函数，供浏览器控制台使用
if (typeof window !== 'undefined') {
  (window as any).functionCallingDemo = {
    demo01: demo01_basicRegistration,
    demo02: demo02_manualExecution,
    demo03: demo03_functionCalling,
    demo04: demo04_multiTurnConversation,
    demo05: demo05_chainLimits,
    runAll: runAllDemos
  };

  console.log('💡 提示: 在控制台执行 functionCallingDemo.runAll() 运行所有演示');
}
