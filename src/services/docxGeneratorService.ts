/**
 * Word文档生成服务
 * 职责：基于映射方案和Excel数据，生成填充后的Word文档
 * 单一职责原则：只负责文档生成，不涉及映射解析和模板处理
 */

import { logger } from '@/utils/logger';
import { createReport } from 'docx-templates';
import * as JSZip from 'jszip';
import { MappingScheme, FieldMapping, GeneratedDocument } from '../types/documentTypes';

/**
 * 文档生成参数
 */
interface GenerateDocumentParams {
  templateBuffer: ArrayBuffer;
  data: Record<string, any>;
  outputFileName?: string;
}

/**
 * 批量生成参数
 */
interface BatchGenerateParams {
  templateBuffer: ArrayBuffer;
  excelData: any[];
  mappingScheme: MappingScheme;
  baseFileName: string;
}

/**
 * 生成单个Word文档
 * @param params 生成参数
 * @returns 生成的文档Blob
 */
export async function generateWordDocument(params: GenerateDocumentParams): Promise<Blob> {
  const { templateBuffer, data, outputFileName = 'output.docx' } = params;

  try {
    // 使用docx-templates生成文档
    const report = await createReport({
      template: Buffer.from(templateBuffer),
      data: data,
      cmdDelimiter: ['{{', '}}']  // 确保占位符格式一致
    });

    return new Blob([report], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  } catch (error) {
    throw new Error(`文档生成失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 应用筛选条件到Excel数据
 * @param excelData 原始Excel数据
 * @param filterCondition 筛选条件JavaScript代码
 * @returns 筛选后的数据
 */
function applyFilter(excelData: any[], filterCondition: string | null): any[] {
  if (!filterCondition) {
    return excelData;
  }

  try {
    // 创建安全的筛选函数
    const filterFunc = new Function('row', `
      "use strict";
      try {
        return ${filterCondition};
      } catch (e) {
        logger.warn("筛选条件执行失败:", e);
        return true;
      }
    `);

    return excelData.filter(row => {
      try {
        return filterFunc(row);
      } catch (error) {
        logger.error('筛选行数据失败:', error);
        return true;  // 筛选失败时保留该行
      }
    });
  } catch (error) {
    logger.error('筛选条件解析失败，返回全部数据:', error);
    return excelData;
  }
}

/**
 * 应用数据转换
 * @param value 原始值
 * @param transform 转换代码
 * @returns 转换后的值
 */
function applyTransform(value: any, transform?: string): any {
  if (!transform) {
    return value;
  }

  try {
    const transformFunc = new Function('value', `return ${transform}`);
    return transformFunc(value);
  } catch (error) {
    logger.error('数据转换失败，返回原值:', error);
    return value;
  }
}

/**
 * 构建文档数据对象
 * @param rowData Excel行数据
 * @param mappings 字段映射方案
 * @returns 文档数据对象
 */
function buildDocumentData(rowData: any, mappings: FieldMapping[]): Record<string, any> {
  const data: Record<string, any> = {};

  mappings.forEach(mapping => {
    const { placeholder, excelColumn, transform } = mapping;

    // 提取占位符名称（去除{{ }}）
    const placeholderName = placeholder.replace(/\{\{|\}\}/g, '').trim();

    // 获取Excel数据
    const rawValue = rowData[excelColumn];

    // 应用转换
    data[placeholderName] = applyTransform(rawValue, transform);
  });

  return data;
}

/**
 * 批量生成Word文档
 * @param params 批量生成参数
 * @returns 生成的文档列表
 */
export async function generateMultipleDocuments(params: BatchGenerateParams): Promise<GeneratedDocument[]> {
  const { templateBuffer, excelData, mappingScheme, baseFileName } = params;

  try {
    // 1. 应用筛选条件
    const filteredData = applyFilter(excelData, mappingScheme.filterCondition);

    if (filteredData.length === 0) {
      throw new Error('没有符合条件的数据可生成文档');
    }

    // 2. 为每行数据生成文档
    const documents: GeneratedDocument[] = [];

    for (let i = 0; i < filteredData.length; i++) {
      const rowData = filteredData[i];

      // 构建文档数据
      const documentData = buildDocumentData(rowData, mappingScheme.mappings);

      // 生成文档
      const blob = await generateWordDocument({
        templateBuffer,
        data: documentData,
        outputFileName: `${baseFileName}_${i + 1}.docx`
      });

      // 确定文档文件名（尝试使用数据中的标识字段）
      let docFileName = `${baseFileName}_${i + 1}.docx`;

      // 尝试从数据中找到合适的命名字段
      const nameFields = ['name', '名称', 'title', '标题', 'subject', '主题'];
      for (const field of nameFields) {
        if (documentData[field]) {
          docFileName = `${documentData[field]}.docx`;
          break;
        }
      }

      documents.push({
        blob,
        fileName: docFileName,
        dataIndex: i,
        recordData: rowData
      });
    }

    return documents;

  } catch (error) {
    throw new Error(`批量生成失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 创建ZIP压缩包（用于批量下载）
 * @param documents 文档列表
 * @param zipName ZIP文件名
 * @returns ZIP Blob
 */
export async function createDownloadZip(documents: GeneratedDocument[], zipName: string = 'documents.zip'): Promise<Blob> {
  try {
    const zip = new (JSZip as any)();

    // 添加所有文档到ZIP
    documents.forEach(doc => {
      zip.file(doc.fileName, doc.blob);
    });

    // 生成ZIP
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });

    return zipBlob;

  } catch (error) {
    throw new Error(`ZIP创建失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 下载单个文档
 * @param blob 文档Blob
 * @param fileName 文件名
 */
export function downloadDocument(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 批量下载文档（打包为ZIP）
 * @param documents 文档列表
 * @param zipName ZIP文件名
 */
export async function downloadDocumentsAsZip(documents: GeneratedDocument[], zipName: string = 'documents.zip'): Promise<void> {
  const zipBlob = await createDownloadZip(documents, zipName);
  downloadDocument(zipBlob, zipName);
}
