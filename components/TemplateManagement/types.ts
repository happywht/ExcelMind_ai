/**
 * 模板管理模块 - 类型定义
 *
 * @version 2.0.0
 */

import { TemplateConfig, TemplateMetadata, TemplatePlaceholder } from '../../services/templateAPI';

export type {
  TemplateConfig,
  TemplateMetadata,
  TemplatePlaceholder,
};

export interface TemplateUploadProgress {
  stage: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
}

export interface VariableMapping {
  placeholder: string;
  excelColumn: string;
  dataType: string;
  required: boolean;
  defaultValue?: any;
  transform?: string;
}

export interface MappingValidation {
  valid: boolean;
  errors: Array<{
    placeholder: string;
    message: string;
  }>;
  warnings: Array<{
    placeholder: string;
    message: string;
  }>;
}
