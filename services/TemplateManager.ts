/**
 * 模板管理器 - Phase 2 多模板文档生成核心服务
 *
 * 职责：
 * 1. 模板文件的CRUD操作
 * 2. 模板变量提取和验证
 * 3. 模板预览生成
 * 4. 模板版本管理
 * 5. 模板分类和标签管理
 *
 * @version 2.0.0
 * @module TemplateManager
 */

import { CacheService } from './infrastructure/cacheService';
import { TemplateValidator, ValidationResult } from './docxtemplaterService';
import type {
  TemplateConfig,
  TemplateMetadata,
  UploadTemplateRequest,
  UploadTemplateResponse,
  UpdateTemplateRequest,
  ListTemplatesParams,
  ListTemplatesResponse,
  TemplateStatus
} from '../types/templateGeneration';

// ============================================================================
// 接口定义
// ============================================================================

/**
 * 存储服务接口（抽象）
 */
export interface IStorageService {
  store(key: string, data: ArrayBuffer | Blob): Promise<string>;
  retrieve(key: string): Promise<ArrayBuffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/**
 * 模板过滤器
 */
export interface TemplateFilters {
  category?: string;
  tags?: string[];
  status?: TemplateStatus;
  search?: string;
}

/**
 * 模板列表结果
 */
export interface TemplateList {
  templates: TemplateMetadata[];
  total: number;
  page: number;
  limit: number;
  categories: string[];
  tags: string[];
}

/**
 * 模板创建请求
 */
export interface TemplateCreateRequest {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  fileBuffer: ArrayBuffer;
  version?: string;
}

/**
 * 模板更新请求
 */
export interface TemplateUpdateRequest {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  status?: TemplateStatus;
  defaultMappings?: Record<string, string>;
  validationRules?: any[];
}

// ============================================================================
// 错误类
// ============================================================================

/**
 * 模板验证错误
 */
export class TemplateValidationError extends Error {
  public readonly errors: string[];
  public readonly warnings: string[];

  constructor(errors: string[], warnings: string[] = []) {
    super(`模板验证失败: ${errors.join(', ')}`);
    this.name = 'TemplateValidationError';
    this.errors = errors;
    this.warnings = warnings;

    Object.setPrototypeOf(this, TemplateValidationError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

/**
 * 模板未找到错误
 */
export class TemplateNotFoundError extends Error {
  constructor(public readonly templateId: string) {
    super(`模板不存在: ${templateId}`);
    this.name = 'TemplateNotFoundError';
    Object.setPrototypeOf(this, TemplateNotFoundError.prototype);
  }
}

// ============================================================================
// 核心服务类
// ============================================================================

/**
 * 模板管理器
 *
 * 功能特性：
 * - 模板上传和验证
 * - 模板存储和缓存
 * - 模板查询和列表
 * - 模板更新和删除
 * - 模板预览生成
 */
export class TemplateManager {
  private cache: CacheService;
  private storage: IStorageService;

  // 模板存储前缀
  private static readonly STORAGE_PREFIX = 'templates/';
  private static readonly CACHE_TTL = 3600; // 1小时
  private static readonly CACHE_KEY_PREFIX = 'template:';

  constructor(
    storageService: IStorageService,
    cacheService?: CacheService
  ) {
    this.storage = storageService;
    this.cache = cacheService || this.createDefaultCache();
  }

  // ========================================================================
  // 公共方法 - CRUD操作
  // ========================================================================

  /**
   * 创建新模板
   *
   * @param request - 模板创建请求
   * @returns 创建的模板配置
   * @throws TemplateValidationError
   */
  async createTemplate(request: TemplateCreateRequest): Promise<TemplateConfig> {
    // 1. 验证模板文件
    const validation = await this.validateTemplate(request.fileBuffer);
    if (!validation.valid) {
      throw new TemplateValidationError(validation.errors, validation.warnings);
    }

    // 2. 提取占位符
    const placeholders = await this.extractVariables(request.fileBuffer);

    // 3. 生成模板ID
    const templateId = this.generateTemplateId();

    // 4. 存储模板文件
    const storageKey = TemplateManager.STORAGE_PREFIX + templateId;
    await this.storage.store(storageKey, request.fileBuffer);

    // 5. 创建元数据
    const metadata: TemplateMetadata = {
      id: templateId,
      name: request.name,
      description: request.description,
      category: request.category,
      tags: request.tags || [],
      version: request.version || '1.0.0',
      status: 'active' as TemplateStatus,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fileSize: request.fileBuffer.byteLength,
      placeholderCount: placeholders.length,
      complexity: validation.complexity
    };

    // 6. 创建模板配置
    const config: TemplateConfig = {
      metadata,
      fileBuffer: request.fileBuffer,
      placeholders,
      previewHtml: await this.generatePreview(request.fileBuffer)
    };

    // 7. 缓存模板配置
    await this.cacheTemplate(templateId, config);

    return config;
  }

  /**
   * 获取模板
   *
   * @param id - 模板ID
   * @returns 模板配置
   * @throws TemplateNotFoundError
   */
  async getTemplate(id: string): Promise<TemplateConfig> {
    // 1. 尝试从缓存获取
    const cached = await this.loadFromCache(id);
    if (cached) {
      return cached;
    }

    // 2. 从存储加载
    const storageKey = TemplateManager.STORAGE_PREFIX + id;
    const exists = await this.storage.exists(storageKey);
    if (!exists) {
      throw new TemplateNotFoundError(id);
    }

    const fileBuffer = await this.storage.retrieve(storageKey);

    // 3. 提取占位符和验证
    const placeholders = await this.extractVariables(fileBuffer);
    const validation = await this.validateTemplate(fileBuffer);

    // 4. 重建元数据（从存储恢复时需要）
    const metadata: TemplateMetadata = {
      id,
      name: 'Unknown', // 需要从元数据存储中获取
      status: 'active' as TemplateStatus,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fileSize: fileBuffer.byteLength,
      placeholderCount: placeholders.length,
      complexity: validation.complexity,
      version: '1.0.0'
    };

    const config: TemplateConfig = {
      metadata,
      fileBuffer,
      placeholders,
      previewHtml: await this.generatePreview(fileBuffer)
    };

    // 5. 缓存
    await this.cacheTemplate(id, config);

    return config;
  }

  /**
   * 更新模板
   *
   * @param id - 模板ID
   * @param updates - 更新内容
   * @returns 更新后的模板配置
   */
  async updateTemplate(id: string, updates: TemplateUpdateRequest): Promise<TemplateConfig> {
    // 1. 获取现有模板
    const existing = await this.getTemplate(id);

    // 2. 更新元数据
    const metadata = { ...existing.metadata };
    if (updates.name !== undefined) metadata.name = updates.name;
    if (updates.description !== undefined) metadata.description = updates.description;
    if (updates.category !== undefined) metadata.category = updates.category;
    if (updates.tags !== undefined) metadata.tags = updates.tags;
    if (updates.status !== undefined) metadata.status = updates.status;
    metadata.updatedAt = Date.now();

    // 3. 更新配置
    const updated: TemplateConfig = {
      ...existing,
      metadata,
      defaultMappings: updates.defaultMappings || existing.defaultMappings,
      validationRules: updates.validationRules || existing.validationRules
    };

    // 4. 更新缓存
    await this.cacheTemplate(id, updated);

    return updated;
  }

  /**
   * 删除模板
   *
   * @param id - 模板ID
   */
  async deleteTemplate(id: string): Promise<void> {
    // 1. 删除存储文件
    const storageKey = TemplateManager.STORAGE_PREFIX + id;
    await this.storage.delete(storageKey);

    // 2. 删除缓存
    await this.removeFromCache(id);
  }

  /**
   * 列出模板
   *
   * @param filters - 过滤条件
   * @returns 模板列表
   */
  async listTemplates(filters: TemplateFilters = {}): Promise<TemplateList> {
    // TODO: 实现从元数据存储查询
    // 当前简化实现：从缓存获取所有模板

    const templates: TemplateMetadata[] = [];
    const categories = new Set<string>();
    const tags = new Set<string>();

    // 从缓存中收集所有模板
    // 实际实现应该从专门的元数据存储中查询

    return {
      templates,
      total: templates.length,
      page: 1,
      limit: templates.length,
      categories: Array.from(categories),
      tags: Array.from(tags)
    };
  }

  // ========================================================================
  // 公共方法 - 验证和提取
  // ========================================================================

  /**
   * 验证模板
   *
   * @param templateBuffer - 模板文件缓冲
   * @returns 验证结果
   */
  async validateTemplate(templateBuffer: ArrayBuffer): Promise<ValidationResult> {
    return await TemplateValidator.validate(templateBuffer);
  }

  /**
   * 提取模板变量
   *
   * @param templateBuffer - 模板文件缓冲
   * @returns 占位符列表
   */
  async extractVariables(templateBuffer: ArrayBuffer): Promise<string[]> {
    return await TemplateValidator.extractPlaceholders(templateBuffer);
  }

  /**
   * 生成模板预览
   *
   * @param templateBuffer - 模板文件缓冲
   * @returns HTML预览
   */
  async generatePreview(templateBuffer: ArrayBuffer): Promise<string> {
    // 使用mammoth生成HTML预览
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.convertToHtml({ arrayBuffer: templateBuffer });
      return result.value;
    } catch (error) {
      console.error('生成预览失败:', error);
      return '<p>预览生成失败</p>';
    }
  }

  // ========================================================================
  // 私有方法 - 缓存管理
  // ========================================================================

  /**
   * 缓存模板
   */
  private async cacheTemplate(id: string, config: TemplateConfig): Promise<void> {
    const cacheKey = this.buildCacheKey(id);

    // 只缓存元数据，不缓存完整的fileBuffer（太大）
    const cacheData = {
      metadata: config.metadata,
      placeholders: config.placeholders,
      previewHtml: config.previewHtml,
      defaultMappings: config.defaultMappings,
      validationRules: config.validationRules
    };

    await this.cache.set(cacheKey, cacheData, TemplateManager.CACHE_TTL);
  }

  /**
   * 从缓存加载模板
   */
  private async loadFromCache(id: string): Promise<TemplateConfig | null> {
    const cacheKey = this.buildCacheKey(id);
    const cached = await this.cache.get<any>(cacheKey);

    if (!cached) {
      return null;
    }

    // 从存储加载fileBuffer
    const storageKey = TemplateManager.STORAGE_PREFIX + id;
    const fileBuffer = await this.storage.retrieve(storageKey);

    return {
      metadata: cached.value.metadata,
      fileBuffer,
      placeholders: cached.value.placeholders,
      defaultMappings: cached.value.defaultMappings,
      validationRules: cached.value.validationRules,
      previewHtml: cached.value.previewHtml
    };
  }

  /**
   * 从缓存移除模板
   */
  private async removeFromCache(id: string): Promise<void> {
    const cacheKey = this.buildCacheKey(id);
    await this.cache.delete(cacheKey);
  }

  /**
   * 构建缓存键
   */
  private buildCacheKey(id: string): string {
    return TemplateManager.CACHE_KEY_PREFIX + id;
  }

  // ========================================================================
  // 私有方法 - 工具函数
  // ========================================================================

  /**
   * 生成模板ID
   */
  private generateTemplateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `tpl_${timestamp}_${random}`;
  }

  /**
   * 创建默认缓存服务
   */
  private createDefaultCache(): CacheService {
    // 动态导入避免循环依赖
    const { createCacheService } = require('./infrastructure');
    return createCacheService();
  }
}

// ============================================================================
// 导出
// ============================================================================

export default TemplateManager;
