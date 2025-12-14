// 测试智谱AI集成
import { generateExcelFormula } from './services/zhipuService.js';

async function testZhipuAI() {
  console.log('🧪 开始测试智谱AI集成...');

  try {
    // 测试公式生成
    console.log('📝 测试Excel公式生成...');
    const testDescription = "如果A列大于100，显示'高'，否则显示'低'";
    const formula = await generateExcelFormula(testDescription);

    console.log(`✅ 测试输入: ${testDescription}`);
    console.log(`✅ 生成结果: ${formula}`);

    if (formula && formula.startsWith('=')) {
      console.log('🎉 智谱AI集成测试成功！');
    } else {
      console.log('❌ 公式格式不正确，可能有问题');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testZhipuAI();