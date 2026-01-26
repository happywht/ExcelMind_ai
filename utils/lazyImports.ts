/**
 * 第三方库懒加载工具
 *
 * 用于延迟加载大型第三方库，减少初始Bundle大小
 */

/**
 * 动态加载XLSX库（Excel处理）
 * 使用场景：需要处理Excel文件时
 */
export const loadXLSX = async () => {
  const xlsx = await import('xlsx');
  return xlsx;
};

/**
 * 动态加载DOCX模板库（Word文档处理）
 * 使用场景：需要生成Word文档时
 */
export const loadDocxTemplate = async () => {
  const { default: docxtemplater } = await import('docxtemplater');
  const { default: PizZip } = await import('pizzip');
  const DocxtemplaterImageModule = await import('docxtemplater-image-module-free');

  return {
    docxtemplater,
    PizZip,
    DocxtemplaterImageModule
  };
};

/**
 * 动态加载Mammoth库（Word文档转换）
 * 使用场景：需要将Word转换为HTML时
 */
export const loadMammoth = async () => {
  const { default: mammoth } = await import('mammoth');
  return mammoth;
};

/**
 * 动态加载PDF.js（PDF处理）
 * 使用场景：需要处理PDF文件时
 */
export const loadPDFJS = async () => {
  const pdfjsLib = await import('pdfjs-dist');

  // 设置Worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  return pdfjsLib;
};

/**
 * 动态加载AlaSQL（SQL处理）
 * 使用场景：需要执行SQL查询时
 */
export const loadAlaSQL = async () => {
  const alasql = await import('alasql');
  return alasql;
};

/**
 * 动态加载Monaco Editor（代码编辑器）
 * 使用场景：需要显示代码编辑器时
 */
export const loadMonacoEditor = async () => {
  const { loader } = await import('@monaco-editor/react');
  return loader;
};

/**
 * 动态加载Recharts（图表库）
 * 使用场景：需要显示图表时
 */
export const loadRecharts = async () => {
  const recharts = await import('recharts');
  return recharts;
};

/**
 * 缓存已加载的模块
 */
const moduleCache = new Map<string, any>();

/**
 * 带缓存的模块加载器
 * 避免重复加载同一模块
 */
export const loadModuleWithCache = async <T>(
  key: string,
  loader: () => Promise<T>
): Promise<T> => {
  if (moduleCache.has(key)) {
    return moduleCache.get(key);
  }

  const module = await loader();
  moduleCache.set(key, module);
  return module;
};

/**
 * 预加载常用模块
 * 在浏览器空闲时预加载可能需要的模块
 */
export const preloadModules = async () => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(async () => {
      // 预加载最常用的模块
      try {
        await loadModuleWithCache('xlsx', loadXLSX);
        console.log('[预加载] XLSX模块已缓存');
      } catch (error) {
        console.warn('[预加载] XLSX模块加载失败:', error);
      }
    });
  }
};
