/**
 * 模板管理 API 客户端
 *
 * 提供模板上传、管理、查询等功能
 *
 * @version 2.0.0
 */

import { API_BASE_URL } from './config';

// ==================== 类型定义 ====================

export interface TemplatePlaceholder {
  key: string;
  rawPlaceholder: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'image';
  required: boolean;
  context?: {
    section: string;
    position: number;
  };
}

export interface TemplateMetadata {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'active' | 'inactive' | 'archived';
  tags: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
  fileSize: number;
  placeholderCount: number;
  complexity: 'simple' | 'complex';
  hasLoops: boolean;
  hasConditionals: boolean;
  hasTables: boolean;
  pageCount: number;
  wordCount: number;
}

export interface TemplateConfig {
  metadata: TemplateMetadata;
  fileBuffer?: ArrayBuffer;
  placeholders: TemplatePlaceholder[];
  previewHtml?: string;
}

export interface TemplateMapping {
  placeholder: string;
  excelColumn: string;
  confidence: number;
}

export interface TemplateUploadResponse {
  templateId: string;
  name: string;
  status: string;
  file: {
    fileName: string;
    fileSize: number;
    uploadTime: string;
  };
  metadata: {
    placeholders: TemplatePlaceholder[];
    hasLoops: boolean;
    hasConditionals: boolean;
    pageCount: number;
  };
}

export interface TemplateListResponse {
  items: TemplateMetadata[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface TemplateUsageStats {
  totalGenerations: number;
  lastUsed: string;
  successRate: number;
}

export interface TemplateDetail extends TemplateMetadata {
  file: {
    fileName: string;
    fileSize: number;
    uploadTime: string;
    downloadUrl: string;
  };
  metadata: {
    placeholders: TemplatePlaceholder[];
    hasLoops: boolean;
    hasConditionals: boolean;
    hasTables: boolean;
    pageCount: number;
    wordCount: number;
  };
  defaultMappings: {
    mappings: TemplateMapping[];
    filterCondition: string | null;
  };
  usageStats: TemplateUsageStats;
}

// ==================== API 客户端类 ====================

class TemplateAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL || '/api/v2') {
    this.baseUrl = baseUrl;
  }

  /**
   * 上传模板
   */
  async uploadTemplate(
    file: File,
    metadata: {
      name: string;
      description: string;
      category: string;
      tags?: string[];
      mappings?: { placeholders: TemplatePlaceholder[] };
    }
  ): Promise<TemplateUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', metadata.name);
    formData.append('description', metadata.description);
    formData.append('category', metadata.category);
    if (metadata.tags) {
      formData.append('tags', JSON.stringify(metadata.tags));
    }
    if (metadata.mappings) {
      formData.append('mappings', JSON.stringify(metadata.mappings));
    }

    const response = await fetch(`${this.baseUrl}/templates`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`上传模板失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 获取模板列表
   */
  async listTemplates(params: {
    category?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<TemplateListResponse> {
    const queryParams = new URLSearchParams();
    if (params.category) queryParams.append('category', params.category);
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.order) queryParams.append('order', params.order);

    const response = await fetch(
      `${this.baseUrl}/templates?${queryParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`获取模板列表失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 获取模板详情
   */
  async getTemplate(templateId: string): Promise<TemplateDetail> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`);

    if (!response.ok) {
      throw new Error(`获取模板详情失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 更新模板
   */
  async updateTemplate(
    templateId: string,
    updates: {
      name?: string;
      description?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<{ templateId: string; updatedAt: string }> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`更新模板失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 删除模板
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`删除模板失败: ${response.statusText}`);
    }
  }

  /**
   * 下载模板
   */
  async downloadTemplate(templateId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}/download`);

    if (!response.ok) {
      throw new Error(`下载模板失败: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * 验证模板
   */
  async validateTemplate(file: File): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    placeholders: TemplatePlaceholder[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/templates/validate`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`验证模板失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 提取模板占位符
   */
  async extractPlaceholders(file: File): Promise<TemplatePlaceholder[]> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/templates/extract-placeholders`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`提取占位符失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }
}

// ==================== 导出单例 ====================

export const templateAPI = new TemplateAPI();

export default TemplateAPI;
