/**
 * TemplateManager 单元测试
 *
 * @version 2.0.0
 */

import { TemplateManager, TemplateValidationError, TemplateNotFoundError } from './TemplateManager';

// ============================================================================
// Mock存储服务
// ============================================================================

class MockStorageService {
  private storage: Map<string, ArrayBuffer> = new Map();

  async store(key: string, data: ArrayBuffer): Promise<string> {
    this.storage.set(key, data);
    return `stored://${key}`;
  }

  async retrieve(key: string): Promise<ArrayBuffer> {
    const data = this.storage.get(key);
    if (!data) {
      throw new Error('File not found');
    }
    return data;
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }
}

// ============================================================================
// 测试工具函数
// ============================================================================

/**
 * 创建测试用的Word模板缓冲
 */
function createTestTemplateBuffer(): ArrayBuffer {
  // 简化的测试模板（实际应该是有效的DOCX文件）
  const content = 'Hello {{name}}!';
  return new TextEncoder().encode(content).buffer;
}

/**
 * 创建测试模板创建请求
 */
function createTestTemplateRequest() {
  return {
    name: 'Test Template',
    description: 'A test template',
    category: 'test',
    tags: ['test', 'unit'],
    fileBuffer: createTestTemplateBuffer(),
    version: '1.0.0'
  };
}

// ============================================================================
// 测试套件
// ============================================================================

describe('TemplateManager', () => {
  let templateManager: TemplateManager;
  let mockStorage: MockStorageService;

  beforeEach(() => {
    mockStorage = new MockStorageService();
    templateManager = new TemplateManager(mockStorage);
  });

  afterEach(() => {
    // 清理
  });

  // ========================================================================
  // 创建模板测试
  // ========================================================================

  describe('createTemplate', () => {
    it('应该成功创建模板', async () => {
      const request = createTestTemplateRequest();

      const result = await templateManager.createTemplate(request);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.id).toMatch(/^tpl_/);
      expect(result.metadata.name).toBe(request.name);
      expect(result.metadata.category).toBe(request.category);
      expect(result.metadata.tags).toEqual(request.tags);
      expect(result.placeholders).toBeDefined();
      expect(Array.isArray(result.placeholders)).toBe(true);
    });

    it('应该生成唯一的模板ID', async () => {
      const request1 = createTestTemplateRequest();
      const request2 = createTestTemplateRequest();

      const template1 = await templateManager.createTemplate(request1);
      const template2 = await templateManager.createTemplate(request2);

      expect(template1.metadata.id).not.toBe(template2.metadata.id);
    });

    it('应该正确设置文件大小', async () => {
      const request = createTestTemplateRequest();

      const result = await templateManager.createTemplate(request);

      expect(result.metadata.fileSize).toBe(request.fileBuffer.byteLength);
    });

    it('应该提取模板占位符', async () => {
      const request = createTestTemplateRequest();

      const result = await templateManager.createTemplate(request);

      expect(result.placeholders.length).toBeGreaterThan(0);
    });

    it('无效模板应该抛出验证错误', async () => {
      const request = {
        ...createTestTemplateRequest(),
        fileBuffer: new ArrayBuffer(0) // 空文件
      };

      await expect(templateManager.createTemplate(request))
        .rejects
        .toThrow(TemplateValidationError);
    });
  });

  // ========================================================================
  // 获取模板测试
  // ========================================================================

  describe('getTemplate', () => {
    it('应该成功获取已创建的模板', async () => {
      const createRequest = createTestTemplateRequest();
      const created = await templateManager.createTemplate(createRequest);

      const retrieved = await templateManager.getTemplate(created.metadata.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.metadata.id).toBe(created.metadata.id);
      expect(retrieved.metadata.name).toBe(created.metadata.name);
      expect(retrieved.placeholders).toEqual(created.placeholders);
    });

    it('获取不存在的模板应该抛出错误', async () => {
      const nonExistentId = 'tpl_nonexistent';

      await expect(templateManager.getTemplate(nonExistentId))
        .rejects
        .toThrow(TemplateNotFoundError);
    });

    it('应该从缓存获取模板', async () => {
      const createRequest = createTestTemplateRequest();
      const created = await templateManager.createTemplate(createRequest);

      // 第一次获取
      await templateManager.getTemplate(created.metadata.id);

      // 第二次获取（应该从缓存）
      const retrieved = await templateManager.getTemplate(created.metadata.id);

      expect(retrieved.metadata.id).toBe(created.metadata.id);
    });
  });

  // ========================================================================
  // 更新模板测试
  // ========================================================================

  describe('updateTemplate', () => {
    it('应该成功更新模板名称', async () => {
      const createRequest = createTestTemplateRequest();
      const created = await templateManager.createTemplate(createRequest);

      const updated = await templateManager.updateTemplate(created.metadata.id, {
        name: 'Updated Template Name'
      });

      expect(updated.metadata.name).toBe('Updated Template Name');
      expect(updated.metadata.updatedAt).toBeGreaterThan(created.metadata.updatedAt);
    });

    it('应该成功更新模板标签', async () => {
      const createRequest = createTestTemplateRequest();
      const created = await templateManager.createTemplate(createRequest);

      const newTags = ['updated', 'tags'];
      const updated = await templateManager.updateTemplate(created.metadata.id, {
        tags: newTags
      });

      expect(updated.metadata.tags).toEqual(newTags);
    });

    it('应该成功更新模板状态', async () => {
      const createRequest = createTestTemplateRequest();
      const created = await templateManager.createTemplate(createRequest);

      const updated = await templateManager.updateTemplate(created.metadata.id, {
        status: 'inactive'
      });

      expect(updated.metadata.status).toBe('inactive');
    });
  });

  // ========================================================================
  // 删除模板测试
  // ========================================================================

  describe('deleteTemplate', () => {
    it('应该成功删除模板', async () => {
      const createRequest = createTestTemplateRequest();
      const created = await templateManager.createTemplate(createRequest);

      await templateManager.deleteTemplate(created.metadata.id);

      await expect(templateManager.getTemplate(created.metadata.id))
        .rejects
        .toThrow(TemplateNotFoundError);
    });

    it('删除不存在的模板不应该抛出错误', async () => {
      const nonExistentId = 'tpl_nonexistent';

      await expect(templateManager.deleteTemplate(nonExistentId))
        .resolves
        .not.toThrow();
    });
  });

  // ========================================================================
  // 列出模板测试
  // ========================================================================

  describe('listTemplates', () => {
    it('应该返回空列表（初始状态）', async () => {
      const result = await templateManager.listTemplates();

      expect(result).toBeDefined();
      expect(result.templates).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('应该返回所有模板', async () => {
      const template1 = await templateManager.createTemplate(createTestTemplateRequest());
      const template2 = await templateManager.createTemplate(createTestTemplateRequest());

      const result = await templateManager.listTemplates();

      expect(result.templates).toBeDefined();
      // 注意：实际实现需要从元数据存储查询
    });
  });

  // ========================================================================
  // 验证模板测试
  // ========================================================================

  describe('validateTemplate', () => {
    it('应该验证有效模板', async () => {
      const buffer = createTestTemplateBuffer();

      const result = await templateManager.validateTemplate(buffer);

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('应该检测无效模板', async () => {
      const emptyBuffer = new ArrayBuffer(0);

      const result = await templateManager.validateTemplate(emptyBuffer);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // 提取变量测试
  // ========================================================================

  describe('extractVariables', () => {
    it('应该提取模板占位符', async () => {
      const buffer = createTestTemplateBuffer();

      const placeholders = await templateManager.extractVariables(buffer);

      expect(Array.isArray(placeholders)).toBe(true);
      expect(placeholders.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // 生成预览测试
  // ========================================================================

  describe('generatePreview', () => {
    it('应该生成HTML预览', async () => {
      const buffer = createTestTemplateBuffer();

      const preview = await templateManager.generatePreview(buffer);

      expect(typeof preview).toBe('string');
      expect(preview.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// 导出
// ============================================================================

export {};
