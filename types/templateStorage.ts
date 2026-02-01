/**
 * 模板存储相关类型定义
 */

export interface LocalTemplateMetadata {
  id: string;
  name: string;
  fileName: string;
  description?: string;
  category?: string;
  tags?: string[];
  placeholders?: string[];
  createdAt: number;
  updatedAt: number;
  fileSize: number;
  thumbnailUrl?: string;
}

export interface TemplateStorageConfig {
  maxFileSize?: number; // 最大文件大小 (bytes)
  allowedExtensions?: string[]; // 允许的文件扩展名
  storagePath?: string; // 存储路径
}
