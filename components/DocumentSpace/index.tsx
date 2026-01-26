/**
 * DocumentSpace组件 - 索引文件
 *
 * 导出所有DocumentSpace相关组件
 *
 * @version 2.0.0 - Phase 2 集成版本
 */

// 主组件
export { default as DocumentSpace } from './DocumentSpace';

// 子组件
export { default as DocumentSpaceSidebar } from './DocumentSpaceSidebar';
export { default as DocumentSpaceMain } from './DocumentSpaceMain';
export { default as TemplatePreview } from './TemplatePreview';
export { default as DataPreview } from './DataPreview';
export { default as MappingEditor } from './MappingEditor';
export { default as DocumentList } from './DocumentList';
export { default as SheetSelector } from './SheetSelector';

// 类型定义
export * from './types';

// 默认导出以支持React.lazy()
export { default } from './DocumentSpace';
