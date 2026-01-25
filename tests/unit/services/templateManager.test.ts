/**
 * 模板管理器 - 单元测试
 *
 * @module tests/unit/services/templateManager
 * @version 2.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateManager } from '../../../services/TemplateManager';
import { TemplateInfo, TemplateVariable } from '../../../types';
import { MockFileService, MockCacheService } from '../../../utils/apiMock';
import { createMockTemplateInfo } from '../../../utils/testHelpers';

// ============================================================================
// 测试数据
// ============================================================================

const mockTemplateVariables: TemplateVariable[] = [
  {
    name: 'contractNumber',
    type: 'text',
    description: '合同编号',
    required: true,
    defaultValue: ''
  },
  {
    name: 'partyA',
    type: 'text',
    description: '甲方名称',
    required: true,
    defaultValue: ''
  },
  {
    name: 'partyB',
    type: 'text',
    description: '乙方名称',
    required: true,
    defaultValue: ''
  },
  {
    name: 'amount',
    type: 'number',
    description: '合同金额',
    required: true,
    defaultValue: ''
  },
  {
    name: 'signDate',
    type: 'date',
    description: '签订日期',
    required: true,
    defaultValue: ''
  }
];

const mockTemplateContent = `
合同编号：%contractNumber%
甲方：%partyA%
乙方：%partyB%
合同金额：%amount%元
签订日期：%signDate%
`;

// ============================================================================
// 测试套件
// ============================================================================

describe('TemplateManager', () => {
  let manager: TemplateManager;
  let mockFileService: MockFileService;
  let mockCacheService: MockCacheService;

  beforeEach(() => {
    mockFileService = new MockFileService();
    mockCacheService = new MockCacheService();
    manager = new TemplateManager(mockFileService as any, mockCacheService as any);
  });

  afterEach(() => {
    mockFileService.reset();
    mockCacheService.reset();
  });

  describe('基本功能测试', () => {
    it('应该成功初始化管理器', () => {
      expect(manager).toBeDefined();
      expect(manager.createTemplate).toBeInstanceOf(Function);
      expect(manager.getTemplate).toBeInstanceOf(Function);
      expect(manager.updateTemplate).toBeInstanceOf(Function);
      expect(manager.deleteTemplate).toBeInstanceOf(Function);
      expect(manager.listTemplates).toBeInstanceOf(Function);
    });

    it('应该成功创建模板', async () => {
      const templateData = {
        name: '测试合同模板',
        description: '这是一个测试模板',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      };

      const template = await manager.createTemplate(templateData);

      expect(template).toBeDefined();
      expect(template.templateId).toBeDefined();
      expect(template.name).toBe(templateData.name);
      expect(template.description).toBe(templateData.description);
    });

    it('应该成功获取模板', async () => {
      const templateData = {
        name: '测试合同模板',
        description: '这是一个测试模板',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      };

      const createdTemplate = await manager.createTemplate(templateData);
      const retrievedTemplate = await manager.getTemplate(createdTemplate.templateId);

      expect(retrievedTemplate).toBeDefined();
      expect(retrievedTemplate?.templateId).toBe(createdTemplate.templateId);
      expect(retrievedTemplate?.name).toBe(templateData.name);
    });

    it('应该成功更新模板', async () => {
      const templateData = {
        name: '测试合同模板',
        description: '这是一个测试模板',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      };

      const template = await manager.createTemplate(templateData);

      const updateData = {
        name: '更新后的模板名称',
        description: '更新后的描述'
      };

      const updatedTemplate = await manager.updateTemplate(template.templateId, updateData);

      expect(updatedTemplate).toBeDefined();
      expect(updatedTemplate.name).toBe(updateData.name);
      expect(updatedTemplate.description).toBe(updateData.description);
    });

    it('应该成功删除模板', async () => {
      const templateData = {
        name: '测试合同模板',
        description: '这是一个测试模板',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      };

      const template = await manager.createTemplate(templateData);

      await manager.deleteTemplate(template.templateId);

      const deletedTemplate = await manager.getTemplate(template.templateId);
      expect(deletedTemplate).toBeNull();
    });

    it('应该成功列出所有模板', async () => {
      // 创建多个模板
      await manager.createTemplate({
        name: '合同模板1',
        description: '描述1',
        filePath: '/templates/test1.docx',
        content: mockTemplateContent
      });

      await manager.createTemplate({
        name: '合同模板2',
        description: '描述2',
        filePath: '/templates/test2.docx',
        content: mockTemplateContent
      });

      const templates = await manager.listTemplates();

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('变量提取功能', () => {
    it('应该正确提取模板变量', async () => {
      const templateData = {
        name: '变量测试模板',
        description: '测试变量提取',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      };

      const template = await manager.createTemplate(templateData);

      expect(template.variables).toBeDefined();
      expect(template.variables.length).toBeGreaterThan(0);
    });

    it('应该正确识别变量类型', async () => {
      const templateContent = `
姓名：%name%
年龄：%age%
工资：%salary%
生日：%birthday%
是否激活：%isActive%
      `;

      const template = await manager.createTemplate({
        name: '类型测试模板',
        description: '测试变量类型识别',
        filePath: '/templates/test.docx',
        content: templateContent
      });

      expect(template.variables).toBeDefined();
      expect(template.variables.length).toBe(5);
    });

    it('应该标记必填变量', async () => {
      const template = await manager.createTemplate({
        name: '必填测试模板',
        description: '测试必填变量',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      });

      const requiredVariables = template.variables.filter(v => v.required);
      expect(requiredVariables.length).toBeGreaterThan(0);
    });
  });

  describe('模板验证功能', () => {
    it('应该验证模板内容格式', async () => {
      const invalidTemplateData = {
        name: '',
        description: '测试',
        filePath: '',
        content: ''
      };

      await expect(
        manager.createTemplate(invalidTemplateData)
      ).rejects.toThrow();
    });

    it('应该验证变量名称有效性', async () => {
      const invalidVariableContent = '合同编号：%invalid variable name%';

      const templateData = {
        name: '无效变量模板',
        description: '测试无效变量',
        filePath: '/templates/test.docx',
        content: invalidVariableContent
      };

      // 应该处理或警告无效的变量名
      const template = await manager.createTemplate(templateData);
      expect(template).toBeDefined();
    });
  });

  describe('模板预览功能', () => {
    it('应该生成模板预览', async () => {
      const templateData = {
        name: '预览测试模板',
        description: '测试预览功能',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      };

      const template = await manager.createTemplate(templateData);

      const previewData = {
        contractNumber: 'CT2024001',
        partyA: '甲方公司',
        partyB: '乙方公司',
        amount: 100000,
        signDate: '2024-01-01'
      };

      const preview = await manager.previewTemplate(template.templateId, previewData);

      expect(preview).toBeDefined();
      expect(preview.content).toContain(previewData.contractNumber);
      expect(preview.content).toContain(previewData.partyA);
    });

    it('应该处理缺失的预览数据', async () => {
      const templateData = {
        name: '预览测试模板',
        description: '测试预览功能',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      };

      const template = await manager.createTemplate(templateData);

      const incompleteData = {
        contractNumber: 'CT2024001'
        // 缺少其他必需变量
      };

      const preview = await manager.previewTemplate(template.templateId, incompleteData);

      expect(preview).toBeDefined();
      // 应该使用默认值或占位符
    });
  });

  describe('模板搜索功能', () => {
    it('应该按名称搜索模板', async () => {
      await manager.createTemplate({
        name: '销售合同模板',
        description: '销售合同',
        filePath: '/templates/sales.docx',
        content: mockTemplateContent
      });

      await manager.createTemplate({
        name: '采购合同模板',
        description: '采购合同',
        filePath: '/templates/purchase.docx',
        content: mockTemplateContent
      });

      const results = await manager.searchTemplates('销售');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toContain('销售');
    });

    it('应该按标签搜索模板', async () => {
      const template = await manager.createTemplate({
        name: '标签测试模板',
        description: '测试标签',
        filePath: '/templates/test.docx',
        content: mockTemplateContent,
        tags: ['合同', '销售']
      });

      const results = await manager.searchTemplates('', ['合同']);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('模板版本管理', () => {
    it('应该跟踪模板版本', async () => {
      const templateData = {
        name: '版本测试模板',
        description: '初始版本',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      };

      const v1 = await manager.createTemplate(templateData);

      // 更新模板
      const v2 = await manager.updateTemplate(v1.templateId, {
        description: '更新版本'
      });

      expect(v2.updatedAt).toBeGreaterThanOrEqual(v1.updatedAt);
    });

    it('应该支持模板回滚', async () => {
      const templateData = {
        name: '回滚测试模板',
        description: '初始描述',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      };

      const v1 = await manager.createTemplate(templateData);

      await manager.updateTemplate(v1.templateId, {
        description: '修改后的描述'
      });

      const v2 = await manager.getTemplate(v1.templateId);
      expect(v2?.description).toBe('修改后的描述');

      // 回滚到v1
      const rolledBack = await manager.rollbackTemplate(v1.templateId, v1.updatedAt);
      expect(rolledBack.description).toBe('初始描述');
    });
  });

  describe('缓存功能', () => {
    it('应该缓存模板数据', async () => {
      const templateData = {
        name: '缓存测试模板',
        description: '测试缓存',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      };

      const template1 = await manager.createTemplate(templateData);
      const template2 = await manager.getTemplate(template1.templateId);

      expect(template1).toEqual(template2);
    });

    it('应该在更新时清除缓存', async () => {
      const template = await manager.createTemplate({
        name: '缓存清除测试',
        description: '原始描述',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      });

      // 第一次获取（缓存）
      await manager.getTemplate(template.templateId);

      // 更新模板
      await manager.updateTemplate(template.templateId, {
        description: '更新后的描述'
      });

      // 再次获取（应该是更新后的数据）
      const updated = await manager.getTemplate(template.templateId);
      expect(updated?.description).toBe('更新后的描述');
    });
  });

  describe('批量操作', () => {
    it('应该支持批量创建模板', async () => {
      const templates = Array.from({ length: 5 }, (_, i) => ({
        name: `批量模板${i + 1}`,
        description: `描述${i + 1}`,
        filePath: `/templates/batch${i + 1}.docx`,
        content: mockTemplateContent
      }));

      const created = await manager.batchCreateTemplates(templates);

      expect(created).toBeDefined();
      expect(created.length).toBe(5);
    });

    it('应该支持批量删除模板', async () => {
      const templates = await manager.batchCreateTemplates([
        {
          name: '批量删除1',
          description: '描述1',
          filePath: '/templates/bd1.docx',
          content: mockTemplateContent
        },
        {
          name: '批量删除2',
          description: '描述2',
          filePath: '/templates/bd2.docx',
          content: mockTemplateContent
        }
      ]);

      const templateIds = templates.map(t => t.templateId);
      await manager.batchDeleteTemplates(templateIds);

      for (const id of templateIds) {
        const template = await manager.getTemplate(id);
        expect(template).toBeNull();
      }
    });
  });

  describe('错误处理', () => {
    it('应该处理不存在的模板ID', async () => {
      const result = await manager.getTemplate('non_existent_id');
      expect(result).toBeNull();
    });

    it('应该处理无效的更新数据', async () => {
      const template = await manager.createTemplate({
        name: '测试模板',
        description: '描述',
        filePath: '/templates/test.docx',
        content: mockTemplateContent
      });

      await expect(
        manager.updateTemplate(template.templateId, { name: '' })
      ).rejects.toThrow();
    });

    it('应该处理文件服务错误', async () => {
      mockFileService.setShouldFail(true);

      await expect(
        manager.createTemplate({
          name: '错误测试',
          description: '测试',
          filePath: '/templates/test.docx',
          content: mockTemplateContent
        })
      ).rejects.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量模板', async () => {
      const templates = Array.from({ length: 100 }, (_, i) => ({
        name: `性能测试模板${i + 1}`,
        description: `性能测试${i + 1}`,
        filePath: `/templates/perf${i + 1}.docx`,
        content: mockTemplateContent
      }));

      const startTime = Date.now();
      await manager.batchCreateTemplates(templates);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // 5秒内完成
    });

    it('应该快速搜索模板', async () => {
      // 创建100个模板
      const templates = Array.from({ length: 100 }, (_, i) => ({
        name: `搜索测试${i + 1}`,
        description: `描述${i + 1}`,
        filePath: `/templates/search${i + 1}.docx`,
        content: mockTemplateContent
      }));

      await manager.batchCreateTemplates(templates);

      const startTime = Date.now();
      const results = await manager.searchTemplates('搜索测试');
      const duration = Date.now() - startTime;

      expect(results.length).toBe(100);
      expect(duration).toBeLessThan(1000); // 1秒内完成
    });
  });
});

// ============================================================================
// 集成测试
// ============================================================================

describe('TemplateManager 集成测试', () => {
  let manager: TemplateManager;
  let mockFileService: MockFileService;
  let mockCacheService: MockCacheService;

  beforeEach(() => {
    mockFileService = new MockFileService();
    mockCacheService = new MockCacheService();
    manager = new TemplateManager(mockFileService as any, mockCacheService as any);
  });

  afterEach(() => {
    mockFileService.reset();
    mockCacheService.reset();
  });

  it('应该完成完整的模板生命周期', async () => {
    // 1. 创建模板
    const created = await manager.createTemplate({
      name: '完整生命周期测试',
      description: '初始描述',
      filePath: '/templates/lifecycle.docx',
      content: mockTemplateContent
    });

    // 2. 获取模板
    const retrieved = await manager.getTemplate(created.templateId);
    expect(retrieved).toBeDefined();

    // 3. 更新模板
    const updated = await manager.updateTemplate(created.templateId, {
      description: '更新后的描述'
    });
    expect(updated.description).toBe('更新后的描述');

    // 4. 预览模板
    const preview = await manager.previewTemplate(created.templateId, {
      contractNumber: 'CT001',
      partyA: '甲方',
      partyB: '乙方',
      amount: 1000,
      signDate: '2024-01-01'
    });
    expect(preview).toBeDefined();

    // 5. 删除模板
    await manager.deleteTemplate(created.templateId);
    const deleted = await manager.getTemplate(created.templateId);
    expect(deleted).toBeNull();
  });

  it('应该处理复杂的模板变量场景', async () => {
    const complexContent = `
合同编号：%contractNumber%
甲方：%partyA%
乙方：%partyB%
金额：%amount%元
日期：%signDate%

明细：
%items:loop%
- %items.name%: %items.price%元
%items:end%

总计：%totalAmount%元
    `;

    const template = await manager.createTemplate({
      name: '复杂模板',
      description: '测试复杂变量',
      filePath: '/templates/complex.docx',
      content: complexContent
    });

    expect(template.variables).toBeDefined();
    expect(template.variables.length).toBeGreaterThan(0);
  });
});
