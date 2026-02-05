const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  const page = await browser.newPage();

  // 监听控制台日志
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text()
    };
    consoleLogs.push(logEntry);

    // 实时报告所有控制台日志
    console.log(`📋 [${logEntry.type}] ${logEntry.text}`);

    // 特别关注 Buffer 相关错误
    if (msg.text().includes('Buffer') || msg.text().includes('buffer')) {
      console.log('🚨🚨🚨 发现 Buffer 相关日志:', msg.type(), msg.text());
    }
  });

  // 监听页面错误
  page.on('pageerror', error => {
    console.log('❌ 页面错误:', error.message);
  });

  try {
    // 1. 导航到应用
    console.log('🌐 正在导航到 http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✅ 页面加载完成');

    // 2. 查找并点击文档空间按钮
    console.log('🔍 查找文档空间按钮...');
    const docSpaceButton = await page.locator(
      'button:has-text("文档空间"), a:has-text("文档空间"), [role="button"]:has-text("文档空间")'
    ).first();

    if (await docSpaceButton.isVisible()) {
      console.log('✅ 找到文档空间按钮');
      await docSpaceButton.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️ 未找到文档空间按钮，可能已经在文档空间页面');
    }

    // 3. 查找文件上传输入框
    console.log('📁 查找文件上传输入框...');
    const fileInputs = await page.locator('input[type="file"]').all();
    console.log('找到文件上传输入框数量:', fileInputs.length);

    if (fileInputs.length === 0) {
      console.log('❌ 未找到文件上传输入框，请检查页面');
      await browser.close();
      return;
    }

    // 4. 上传 Word 模板文件
    console.log('📤 上传 Word 模板文件...');
    const wordFilePath = 'D:/家庭/青聪赋能/excelmind-ai/public/test-files/审计交付_1766329472_Assembled.docx';
    await fileInputs[0].setInputFiles(wordFilePath);
    console.log('✅ Word 模板上传完成');
    await page.waitForTimeout(1000);

    // 5. 上传 Excel 数据文件
    console.log('📤 上传 Excel 数据文件...');
    const excelFilePath = 'D:/家庭/青聪赋能/excelmind-ai/public/test-files/去重人员名单_Updated.xlsx';

    if (fileInputs.length > 1) {
      await fileInputs[1].setInputFiles(excelFilePath);
      console.log('✅ Excel 数据上传完成');
    } else {
      console.log('⚠️ 只有一个上传框，尝试上传到同一个输入框');
      await fileInputs[0].setInputFiles([wordFilePath, excelFilePath]);
    }

    await page.waitForTimeout(3000);

    // 6. 填写 AI 映射指令
    console.log('✍️ 查找 AI 映射指令输入框...');
    const mappingInput = page.locator('textarea').first();

    if (await mappingInput.isVisible()) {
      // 检查 placeholder 文本以确认是正确的输入框
      const placeholder = await mappingInput.getAttribute('placeholder');
      console.log('找到文本区域，placeholder:', placeholder);

      await mappingInput.fill('请将Excel数据映射到Word模板，生成审计文档');
      console.log('✅ AI 映射指令已填写');
    } else {
      console.log('❌ 未找到文本区域输入框');
    }

    await page.waitForTimeout(2000);

    // 7. 点击生成映射方案按钮
    console.log('🔧 查找"生成映射方案"按钮...');
    const generateMappingBtn = page.locator(
      'button:has-text("生成映射方案"), button:has-text("生成映射"), button:has-text("映射")'
    ).first();

    if (await generateMappingBtn.isVisible()) {
      console.log('✅ 找到生成映射方案按钮');

      // 检查按钮是否禁用
      const isDisabled = await generateMappingBtn.isDisabled();
      console.log('按钮状态:', isDisabled ? '禁用' : '启用');

      if (isDisabled) {
        console.log('⚠️ 按钮被禁用，等待启用...');
        // 等待最多30秒让按钮启用
        try {
          await generateMappingBtn.waitFor({ state: 'enabled', timeout: 30000 });
          console.log('✅ 按钮已启用');
        } catch (e) {
          console.log('❌ 按钮在30秒内未启用，跳过此步骤');
        }
      }

      if (await generateMappingBtn.isEnabled()) {
        await generateMappingBtn.click();
        console.log('⏳ 等待映射生成...');
        await page.waitForTimeout(5000);
        console.log('✅ 映射生成完成');
      }
    } else {
      console.log('⚠️ 未找到生成映射方案按钮');
    }

    // 8. 点击生成文档按钮
    console.log('📄 查找"生成文档"按钮...');
    const generateDocBtn = page.locator(
      'button:has-text("生成文档"), button:has-text("生成"), button:has-text("开始生成")'
    ).first();

    if (await generateDocBtn.isVisible()) {
      console.log('✅ 找到生成文档按钮');
      await generateDocBtn.click();
      console.log('⏳ 等待文档生成...');
      await page.waitForTimeout(8000);
      console.log('✅ 文档生成操作完成');
    } else {
      console.log('⚠️ 未找到生成文档按钮');
    }

    // 9. 查找生成的文档信息
    console.log('🔍 查找生成的文档信息...');
    const docInfo = await page.locator('text=/生成|完成|文档|成功/').all();
    console.log('页面上的文档相关信息:', docInfo.length);

    // 10. 测试预览功能
    console.log('👁️ 查找预览按钮...');
    const previewBtn = page.locator(
      'button:has-text("预览"), button:has-text("查看"), [role="button"]:has-text("预览")'
    ).first();

    if (await previewBtn.isVisible()) {
      console.log('✅ 找到预览按钮');
      await previewBtn.click();
      console.log('⏳ 等待预览加载...');
      await page.waitForTimeout(3000);
      console.log('✅ 预览功能测试完成');
    } else {
      console.log('⚠️ 未找到预览按钮');
    }

    // 11. 输出测试结果
    console.log('');
    console.log('========== 📊 测试结果汇总 ==========');
    console.log('控制台日志数量:', consoleLogs.length);

    const errorLogs = consoleLogs.filter(log =>
      log.text.includes('Buffer') ||
      log.text.includes('error') ||
      log.text.includes('Error') ||
      log.type === 'error'
    );

    console.log('错误相关日志数量:', errorLogs.length);

    if (errorLogs.length > 0) {
      console.log('');
      console.log('❌ 发现错误日志:');
      errorLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. [${log.type}] ${log.text}`);
      });
    } else {
      console.log('✅ 未发现 Buffer 相关错误');
    }

    console.log('');
    console.log('🎯 测试完成，保持浏览器打开 30 秒供查看...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('👋 测试结束');
  }
})();
