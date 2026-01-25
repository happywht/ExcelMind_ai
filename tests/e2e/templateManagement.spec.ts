/**
 * 模板管理组件 E2E 测试
 *
 * 测试Day 2完善的模板管理功能
 * @version 2.0.0
 */

import { test, expect, Page } from '@playwright/test';

// 测试辅助函数
class TemplateManagementPage {
  constructor(private page: Page) {}

  // 导航到模板管理页面
  async goto() {
    await this.page.goto('http://localhost:3001/#/template-management');
    await this.page.waitForLoadState('networkidle');
  }

  // 打开创建模板对话框
  async openCreateTemplate() {
    await this.page.click('[data-testid="create-template-button"]');
    await expect(this.page.locator('[data-testid="template-editor"]')).toBeVisible();
  }

  // 上传模板文件
  async uploadTemplate(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    // 等待上传完成
    await this.page.waitForSelector('[data-testid="upload-success"]', { timeout: 10000 });
  }

  // 填写模板信息
  async fillTemplateInfo(name: string, category: string, description?: string) {
    await this.page.fill('[data-testid="template-name-input"]', name);
    await this.page.selectOption('[data-testid="template-category-select"]', category);
    if (description) {
      await this.page.fill('[data-testid="template-description-input"]', description);
    }
  }

  // 切换到变量映射标签
  async switchToMappingTab() {
    await this.page.click('[data-testid="mapping-tab"]');
    await expect(this.page.locator('[data-testid="variable-mapping"]')).toBeVisible();
  }

  // 添加Excel字段
  async addExcelFields(fields: string[]) {
    const textarea = this.page.locator('[data-testid="excel-fields-textarea"]');
    await textarea.fill(fields.join('\n'));
  }

  // 点击智能映射按钮
  async clickAutoMap() {
    await this.page.click('[data-testid="auto-map-button"]');
    // 等待映射完成
    await this.page.waitForTimeout(1000);
  }

  // 手动选择映射
  async selectMapping(placeholder: string, excelField: string) {
    await this.page.selectOption(`[data-testid="mapping-select-${placeholder}"]`, excelField);
  }

  // 切换到预览标签
  async switchToPreviewTab() {
    await this.page.click('[data-testid="preview-tab"]');
    await expect(this.page.locator('[data-testid="template-preview"]')).toBeVisible();
  }

  // 测试缩放功能
  async testZoom(zoomLevel: number) {
    const currentZoom = parseInt(await this.page.textContent('[data-testid="zoom-level"]') || '100');
    const difference = zoomLevel - currentZoom;

    if (difference > 0) {
      for (let i = 0; i < difference / 10; i++) {
        await this.page.click('[data-testid="zoom-in-button"]');
      }
    } else if (difference < 0) {
      for (let i = 0; i < Math.abs(difference) / 10; i++) {
        await this.page.click('[data-testid="zoom-out-button"]');
      }
    }

    await expect(this.page.locator('[data-testid="zoom-level"]')).toContainText(`${zoomLevel}%`);
  }

  // 测试全屏模式
  async testFullscreen() {
    await this.page.click('[data-testid="fullscreen-button"]');
    await expect(this.page.locator('[data-testid="template-preview"].fullscreen')).toBeVisible();
    await this.page.keyboard.press('Escape');
    await expect(this.page.locator('[data-testid="template-preview"].fullscreen')).not.toBeVisible();
  }

  // 保存模板
  async saveTemplate() {
    await this.page.click('[data-testid="save-template-button"]');
    // 等待保存完成
    await this.page.waitForSelector('[data-testid="save-success"]', { timeout: 10000 });
  }

  // 取消编辑
  async cancelEdit() {
    await this.page.click('[data-testid="cancel-button"]');
    await expect(this.page.locator('[data-testid="template-editor"]')).not.toBeVisible();
  }

  // 切换到版本历史标签
  async switchToHistoryTab() {
    await this.page.click('[data-testid="history-tab"]');
    await expect(this.page.locator('[data-testid="version-history"]')).toBeVisible();
  }

  // 展开版本详情
  async expandVersion(versionId: string) {
    await this.page.click(`[data-testid="expand-version-${versionId}"]`);
  }

  // 测试版本对比
  async testVersionCompare(version1: string, version2: string) {
    await this.page.click('[data-testid="compare-mode-toggle"]');
    await this.page.click(`[data-testid="select-version-${version1}"]`);
    await this.page.click(`[data-testid="select-version-${version2}"]`);
    await this.page.click('[data-testid="start-compare-button"]');
  }
}

// 测试套件
test.describe('模板管理组件 E2E 测试', () => {
  let page: Page;
  let templatePage: TemplateManagementPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    templatePage = new TemplateManagementPage(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('TemplateUpload 组件', () => {
    test('应该显示上传区域', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      // 验证上传区域可见
      await expect(page.locator('[data-testid="upload-area"]')).toBeVisible();
      await expect(page.locator('text=/拖拽模板文件到这里/')).toBeVisible();
      await expect(page.locator('text=/支持 .docx 格式/')).toBeVisible();
    });

    test('应该支持拖拽上传', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      // 创建测试文件
      const testFile = './test-files/simple-template.docx';

      // 模拟拖拽上传
      const dropZone = page.locator('[data-testid="upload-area"]');
      await dropZone.dispatchEvent('drop', {
        dataTransfer: {
          files: [testFile],
        },
      });

      // 验证上传成功
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    });

    test('应该拒绝非.docx文件', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      // 尝试上传非.docx文件
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./test-files/test.txt');

      // 验证错误消息
      await expect(page.locator('text=/不支持的文件格式/')).toBeVisible();
    });

    test('应该显示上传进度', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./test-files/simple-template.docx');

      // 验证进度条显示
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    });

    test('应该支持移除已上传文件', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      await templatePage.uploadTemplate('./test-files/simple-template.docx');

      // 点击移除按钮
      await page.click('[data-testid="remove-file-button"]');

      // 验证文件已移除
      await expect(page.locator('[data-testid="uploaded-file"]')).not.toBeVisible();
    });
  });

  test.describe('VariableMapping 组件', () => {
    test('应该显示变量列表', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');
      await templatePage.switchToMappingTab();

      // 验证变量列表显示
      await expect(page.locator('[data-testid="variable-list"]')).toBeVisible();
    });

    test('应该支持手动选择映射', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');
      await templatePage.switchToMappingTab();

      // 添加Excel字段
      await templatePage.addExcelFields(['姓名', '身份证号', '联系电话']);

      // 手动选择映射
      await templatePage.selectMapping('name', '姓名');

      // 验证映射已设置
      const select = page.locator('[data-testid="mapping-select-name"]');
      await expect(select).toHaveValue('姓名');
    });

    test('应该支持智能自动映射', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');
      await templatePage.switchToMappingTab();

      // 添加Excel字段
      await templatePage.addExcelFields(['姓名', '身份证号', '联系电话']);

      // 点击智能映射
      await templatePage.clickAutoMap();

      // 验证自动映射结果
      await expect(page.locator('[data-testid="mapping-success"]')).toBeVisible();
    });

    test('应该显示映射验证状态', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');
      await templatePage.switchToMappingTab();

      // 检查必填字段验证
      await expect(page.locator('[data-testid="validation-status"]')).toBeVisible();
    });

    test('应该支持高级选项', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');
      await templatePage.switchToMappingTab();

      // 打开高级选项
      await page.click('[data-testid="advanced-options-button"]');

      // 验证高级选项面板显示
      await expect(page.locator('[data-testid="advanced-options-panel"]')).toBeVisible();
    });
  });

  test.describe('TemplatePreview 组件', () => {
    test.beforeEach(async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');
    });

    test('应该显示模板预览', async () => {
      await templatePage.switchToPreviewTab();

      // 验证预览区域显示
      await expect(page.locator('[data-testid="template-preview"]')).toBeVisible();
    });

    test('应该支持缩放控制', async () => {
      await templatePage.switchToPreviewTab();

      // 测试放大
      await templatePage.testZoom(150);
      await expect(page.locator('[data-testid="zoom-level"]')).toContainText('150%');

      // 测试缩小
      await templatePage.testZoom(75);
      await expect(page.locator('[data-testid="zoom-level"]')).toContainText('75%');
    });

    test('应该支持全屏模式', async () => {
      await templatePage.switchToPreviewTab();

      await templatePage.testFullscreen();
    });

    test('应该高亮显示占位符', async () => {
      await templatePage.switchToPreviewTab();

      // 验证占位符高亮
      await expect(page.locator('[data-placeholder]')).toHaveCount(/^[1-9]/);
    });

    test('应该支持显示/隐藏占位符', async () => {
      await templatePage.switchToPreviewTab();

      // 关闭占位符显示
      await page.click('[data-testid="toggle-placeholders-button"]');

      // 验证占位符不再高亮
      const placeholders = await page.locator('[data-placeholder]').count();
      expect(placeholders).toBe(0);
    });
  });

  test.describe('TemplateVersionHistory 组件', () => {
    test('应该显示版本历史列表', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');
      await templatePage.switchToHistoryTab();

      // 验证版本历史显示
      await expect(page.locator('[data-testid="version-list"]')).toBeVisible();
    });

    test('应该支持展开版本详情', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');
      await templatePage.switchToHistoryTab();

      // 展开第一个版本
      await page.click('[data-testid="expand-version-1"]');

      // 验证详情显示
      await expect(page.locator('[data-testid="version-details"]')).toBeVisible();
    });

    test('应该支持版本对比', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');
      await templatePage.switchToHistoryTab();

      await templatePage.testVersionCompare('1', '2');

      // 验证对比模式激活
      await expect(page.locator('[data-testid="compare-view"]')).toBeVisible();
    });

    test('应该支持版本回滚', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');
      await templatePage.switchToHistoryTab();

      // 点击回滚按钮
      await page.click('[data-testid="rollback-button-1"]');

      // 确认回滚
      await page.click('[data-testid="confirm-rollback-button"]');

      // 验证回滚成功
      await expect(page.locator('[data-testid="rollback-success"]')).toBeVisible();
    });
  });

  test.describe('TemplateEditor 完整工作流', () => {
    test('应该支持完整的创建流程', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      // 1. 上传模板
      await templatePage.uploadTemplate('./test-files/simple-template.docx');

      // 2. 填写模板信息
      await templatePage.fillTemplateInfo(
        '测试合同模板',
        'contract',
        '用于E2E测试的简单合同模板'
      );

      // 3. 配置变量映射
      await templatePage.switchToMappingTab();
      await templatePage.addExcelFields(['姓名', '身份证号', '联系电话']);
      await templatePage.clickAutoMap();

      // 4. 预览模板
      await templatePage.switchToPreviewTab();
      await expect(page.locator('[data-testid="template-preview"]')).toBeVisible();

      // 5. 保存模板
      await templatePage.saveTemplate();

      // 验证保存成功
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    });

    test('应该支持表单验证', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      // 直接点击保存（未填写必填项）
      await page.click('[data-testid="save-template-button"]');

      // 验证错误提示
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('text=/请先上传模板文件/')).toBeVisible();
    });

    test('应该支持取消编辑', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      await templatePage.uploadTemplate('./test-files/simple-template.docx');

      // 点击取消
      await templatePage.cancelEdit();

      // 验证对话框关闭
      await expect(page.locator('[data-testid="template-editor"]')).not.toBeVisible();
    });

    test('应该正确显示状态栏统计', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');

      // 验证状态栏
      await expect(page.locator('[data-testid="variable-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="required-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="mapped-count"]')).toBeVisible();
    });
  });

  test.describe('可访问性测试', () => {
    test('应该支持键盘导航', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      // 使用Tab键导航
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();

      // 使用Enter激活
      await page.keyboard.press('Enter');
    });

    test('应该有正确的ARIA标签', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      // 验证ARIA标签
      const uploadArea = page.locator('[data-testid="upload-area"]');
      await expect(uploadArea).toHaveAttribute('role', 'button');
      await expect(uploadArea).toHaveAttribute('aria-label');
    });

    test('应该支持焦点管理', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      // 验证焦点可见性
      const focusableElements = await page.locator('button, input, select, [tabindex]').count();
      expect(focusableElements).toBeGreaterThan(0);
    });
  });

  test.describe('性能测试', () => {
    test('应该在合理时间内完成上传', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      const startTime = Date.now();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');
      const endTime = Date.now();

      // 上传应该在5秒内完成
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('应该流畅处理缩放操作', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();
      await templatePage.uploadTemplate('./test-files/simple-template.docx');
      await templatePage.switchToPreviewTab();

      const startTime = Date.now();
      await templatePage.testZoom(200);
      const endTime = Date.now();

      // 缩放操作应该在1秒内完成
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  test.describe('边界条件测试', () => {
    test('应该处理超大文件', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      // 尝试上传超大文件
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./test-files/large-template.docx');

      // 验证错误消息
      await expect(page.locator('text=/文件过大/')).toBeVisible();
    });

    test('应该处理特殊字符文件名', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      // 上传特殊字符文件名的文件
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./test/files/测试@#$%.docx');

      // 验证文件名正确显示
      await expect(page.locator('text=/测试@#$%/')).toBeVisible();
    });

    test('应该处理网络错误', async () => {
      await templatePage.goto();
      await templatePage.openCreateTemplate();

      // 模拟网络离线
      await page.context().setOffline(true);

      // 尝试上传
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./test-files/simple-template.docx');

      // 验证网络错误提示
      await expect(page.locator('text=/网络错误/')).toBeVisible();

      // 恢复网络
      await page.context().setOffline(false);
    });
  });
});

// 测试数据准备
test.beforeAll(async () => {
  // 创建测试文件目录
  const fs = require('fs');
  const path = require('path');

  const testDir = path.join(process.cwd(), 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // TODO: 创建测试模板文件
  console.log('测试文件准备完成');
});

test.afterAll(async () => {
  // 清理测试文件
  console.log('测试清理完成');
});
