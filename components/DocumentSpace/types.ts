/**
 * DocumentSpace组件 - 类型定义
 * 扩展核心文档类型，添加UI相关类型
 */

import {
  TemplateFile,
  MappingScheme,
  GeneratedDocument,
  DocumentProcessingLog
} from '../../types/documentTypes';

// ============================================================================
// Tab 类型
// ============================================================================

export type DocumentSpaceTab =
  | 'upload'
  | 'templates'
  | 'template'
  | 'data'
  | 'mapping'
  | 'preview'
  | 'generate';

// ============================================================================
// 状态管理类型
// ============================================================================

export interface DocumentSpaceState {
  // 文件状态
  templateFile: TemplateFile | null;
  dataFile: File | null;
  excelData: any;

  // AI和映射状态
  userInstruction: string;
  mappingScheme: MappingScheme | null;
  generatedDocs: GeneratedDocument[];

  // UI状态
  activeTab: DocumentSpaceTab;
  selectedDoc: GeneratedDocument | null;
  currentSheetName: string;

  // 处理状态
  isProcessing: boolean;
  processingStage: string;
  progress: number;

  // 日志和监控
  logs: DocumentProcessingLog[];
  performanceMetrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
  templateUpload?: number;
  dataUpload?: number;
  aiMapping?: number;
  documentGeneration?: number;
  totalMemory?: number;
  executionTime?: number;
}

// ============================================================================
// 事件处理器类型
// ============================================================================

export interface DocumentSpaceHandlers {
  onTemplateUpload: (file: File) => Promise<void>;
  onDataUpload: (file: File) => Promise<void>;
  onInstructionChange: (instruction: string) => void;
  onGenerateMapping: () => Promise<void>;
  onGenerateDocs: () => Promise<void>;
  onDownloadDoc: (doc: GeneratedDocument) => void;
  onDownloadAll: () => Promise<void>;
  onTabChange: (tab: DocumentSpaceTab) => void;
  onDocSelect: (doc: GeneratedDocument | null) => void;
  onSheetChange: (sheetName: string) => void;
}

// ============================================================================
// 组件Props类型
// ============================================================================

export interface DocumentSpaceProps {
  initialState?: Partial<DocumentSpaceState>;
}

export interface DocumentSpaceSidebarProps {
  templateFile: TemplateFile | null;
  dataFile: File | null;
  userInstruction: string;
  mappingScheme: MappingScheme | null;
  generatedDocs: GeneratedDocument[];
  isProcessing: boolean;
  processingStage: string;
  progress: number;
  logs: DocumentProcessingLog[];
  performanceMetrics: PerformanceMetrics;
  onTemplateUpload: (file: File) => Promise<void>;
  onDataUpload: (file: File) => Promise<void>;
  onInstructionChange: (instruction: string) => void;
  onGenerateMapping: () => Promise<void>;
  onGenerateDocs: () => Promise<void>;
  onDownloadDoc: (doc: GeneratedDocument) => void;
  onDownloadAll: () => Promise<void>;
}

export interface DocumentSpaceMainProps {
  activeTab: DocumentSpaceTab;
  templateFile: TemplateFile | null;
  excelData: any;
  mappingScheme: MappingScheme | null;
  generatedDocs: GeneratedDocument[];
  selectedDoc: GeneratedDocument | null;
  performanceMetrics: PerformanceMetrics;
  onTabChange: (tab: DocumentSpaceTab) => void;
  onDocSelect: (doc: GeneratedDocument | null) => void;
  onSheetChange: (sheetName: string) => void;
}

export interface TemplatePreviewProps {
  templateFile: TemplateFile;
}

export interface DataPreviewProps {
  excelData: any;
  currentSheetName: string;
  onSheetChange: (sheetName: string) => void;
}

export interface MappingEditorProps {
  mappingScheme: MappingScheme;
  templatePlaceholders: string[];
  excelHeaders: string[];
  onMappingChange: (mapping: MappingScheme) => void;
}

export interface DocumentListProps {
  documents: GeneratedDocument[];
  selectedDoc: GeneratedDocument | null;
  onSelect: (doc: GeneratedDocument) => void;
  onDownload: (doc: GeneratedDocument) => void;
  onDownloadAll: () => Promise<void>;
  performanceMetrics?: PerformanceMetrics;
}

export interface PerformancePanelProps {
  metrics: PerformanceMetrics;
}

export interface LogPanelProps {
  logs: DocumentProcessingLog[];
  onClear?: () => void;
  onExport?: () => void;
}

// ============================================================================
// 辅助类型
// ============================================================================

export interface TabConfig {
  id: DocumentSpaceTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  badge?: number | string;
}

export interface ProcessingStage {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
}

// ============================================================================
// 常量
// ============================================================================

export const TAB_CONFIGS: TabConfig[] = [
  { id: 'upload', label: '上传', icon: () => null },
  { id: 'templates', label: '模板库', icon: () => null },
  { id: 'template', label: '模板预览', icon: () => null },
  { id: 'data', label: '数据预览', icon: () => null },
  { id: 'mapping', label: '映射方案', icon: () => null },
  { id: 'preview', label: '文档预览', icon: () => null },
  { id: 'generate', label: '生成文档', icon: () => null }
];

export const PROCESSING_STAGES: ProcessingStage[] = [
  { id: 'template_upload', label: '上传模板', status: 'pending' },
  { id: 'data_upload', label: '上传数据', status: 'pending' },
  { id: 'ai_mapping', label: 'AI生成映射', status: 'pending' },
  { id: 'document_generation', label: '生成文档', status: 'pending' }
];
