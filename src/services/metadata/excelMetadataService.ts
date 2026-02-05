/**
 * Excel 元数据提取服务
 *
 * 功能：
 * 1. 提取 Excel 文件结构和类型信息
 * 2. 推断列数据类型
 * 3. 收集样本值
 * 4. 生成 Schema 供 AI 使用
 *
 * @author Backend Developer
 * @version 1.0.0
 */

import { ExcelData } from '../../types';

/**
 * 列数据类型
 */
export type ColumnDataType = 'string' | 'number' | 'date' | 'boolean' | 'mixed';

/**
 * 列元数据
 */
export interface ColumnMetadata {
  name: string;
  type: ColumnDataType;
  nullable: boolean;
  sampleValues: any[];
  uniqueCount?: number;
  pattern?: string;
}

/**
 * Sheet 元数据
 */
export interface SheetMetadata {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnMetadata[];
  hasEmptyValues: boolean;
  hasComments: boolean;
  hasNotes: boolean;
  commentCount: number;
  noteCount: number;
}

/**
 * Excel 完整元数据
 */
export interface ExcelMetadata {
  fileName: string;
  sheetNames: string[];
  sheets: {
    [sheetName: string]: SheetMetadata;
  };
  totalSheets: number;
  totalRows: number;
  totalColumns: number;
}

/**
 * 推断列数据类型
 */
function inferColumnType(values: any[]): ColumnDataType {
  if (values.length === 0) return 'string';

  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNullValues.length === 0) return 'string';

  // 检查是否全为布尔值
  const booleanCount = nonNullValues.filter(v =>
    typeof v === 'boolean' || v === 'true' || v === 'false' || v === 0 || v === 1
  ).length;

  if (booleanCount === nonNullValues.length) return 'boolean';

  // 检查是否全为数字
  const numberCount = nonNullValues.filter(v =>
    typeof v === 'number' && !isNaN(v)
  ).length;

  if (numberCount === nonNullValues.length) return 'number';

  // 检查是否为日期格式
  const dateCount = nonNullValues.filter(v => {
    if (typeof v !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{4}\/\d{2}\/\d{2}/.test(v);
  }).length;

  if (dateCount > nonNullValues.length * 0.8) return 'date';

  // 检查是否混合类型
  const typeSet = new Set(nonNullValues.map(v => typeof v));
  if (typeSet.size > 1) return 'mixed';

  // 默认为字符串
  return 'string';
}

/**
 * 检测数据模式
 */
function detectDataPattern(values: any[]): string | undefined {
  if (values.length === 0) return undefined;

  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNullValues.length === 0) return undefined;

  // 检测邮箱模式
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (nonNullValues.filter(v => emailPattern.test(String(v))).length > nonNullValues.length * 0.8) {
    return 'email';
  }

  // 检测电话号码模式（中国）
  const phonePattern = /^1[3-9]\d{9}$/;
  if (nonNullValues.filter(v => phonePattern.test(String(v))).length > nonNullValues.length * 0.8) {
    return 'phone';
  }

  // 检测身份证号模式
  const idCardPattern = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
  if (nonNullValues.filter(v => idCardPattern.test(String(v))).length > nonNullValues.length * 0.8) {
    return 'id_card';
  }

  // 检测金额模式
  const moneyPattern = /^\d+\.\d{2}$/;
  if (nonNullValues.filter(v => moneyPattern.test(String(v))).length > nonNullValues.length * 0.8) {
    return 'money';
  }

  return undefined;
}

/**
 * 从 ExcelData 提取完整元数据
 */
export function extractExcelMetadata(excelData: ExcelData): ExcelMetadata {
  const metadata: ExcelMetadata = {
    fileName: excelData.fileName,
    sheetNames: [],
    sheets: {},
    totalSheets: 0,
    totalRows: 0,
    totalColumns: 0
  };

  // 遍历所有 sheets
  for (const sheetName in excelData.sheets) {
    const sheetData = excelData.sheets[sheetName];

    if (!Array.isArray(sheetData) || sheetData.length === 0) {
      continue;
    }

    metadata.sheetNames.push(sheetName);
    metadata.totalSheets++;

    // 分析列
    const columns: ColumnMetadata[] = [];
    const firstRow = sheetData[0];
    const columnNames = Object.keys(firstRow);

    // 采样数据（前100行）
    const sampleSize = Math.min(sheetData.length, 100);
    const sampleRows = sheetData.slice(0, sampleSize);

    // 为每列收集样本值
    const columnSamples: { [colName: string]: any[] } = {};
    columnNames.forEach(colName => {
      columnSamples[colName] = [];
    });

    sampleRows.forEach(row => {
      columnNames.forEach(colName => {
        columnSamples[colName].push(row[colName]);
      });
    });

    // 构建列元数据
    columnNames.forEach(colName => {
      const samples = columnSamples[colName];
      const nonNullSamples = samples.filter(v => v !== null && v !== undefined && v !== '');
      const uniqueValues = new Set(nonNullSamples);

      columns.push({
        name: colName,
        type: inferColumnType(samples),
        nullable: samples.some(v => v === null || v === undefined || v === ''),
        sampleValues: samples.slice(0, 5),
        uniqueCount: uniqueValues.size,
        pattern: detectDataPattern(samples)
      });
    });

    // 获取 sheet 元数据（注释、标注）
    const sheetMeta = excelData.metadata?.[sheetName];
    const hasComments = sheetMeta?.comments ? Object.keys(sheetMeta.comments).length > 0 : false;
    const hasNotes = sheetMeta?.notes ? Object.keys(sheetMeta.notes).length > 0 : false;
    const commentCount = sheetMeta?.comments ? Object.keys(sheetMeta.comments).length : 0;
    const noteCount = sheetMeta?.notes ? Object.keys(sheetMeta.notes).length : 0;

    // 检查是否有空值
    const hasEmptyValues = columns.some(col => col.nullable);

    metadata.sheets[sheetName] = {
      name: sheetName,
      rowCount: sheetData.length,
      columnCount: columnNames.length,
      columns,
      hasEmptyValues,
      hasComments,
      hasNotes,
      commentCount,
      noteCount
    };

    metadata.totalRows += sheetData.length;
    metadata.totalColumns += columnNames.length;
  }

  return metadata;
}

/**
 * 格式化元数据为字符串（用于 Prompt）
 */
export function formatMetadataForPrompt(metadata: ExcelMetadata): string {
  let output = `**文件名**: ${metadata.fileName}\n`;
  output += `**Sheet 列表**: ${metadata.sheetNames.join(', ')} (${metadata.totalSheets} 个)\n`;
  output += `**总行数**: ${metadata.totalRows}\n`;
  output += `**总列数**: ${metadata.totalColumns}\n\n`;

  output += `**Sheet 详细结构**：\n`;

  Object.entries(metadata.sheets).forEach(([sheetName, sheetInfo]) => {
    output += `\n【${sheetName}】\n`;
    output += `- 行数：${sheetInfo.rowCount}\n`;
    output += `- 列数：${sheetInfo.columnCount}\n`;
    output += `- 可用列名：${sheetInfo.columns.map(c => c.name).join(', ')}\n`;
    output += `- 列详情：\n`;

    sheetInfo.columns.forEach(col => {
      output += `  · ${col.name} (${col.type})`;
      if (col.nullable) output += ' [可为空]';
      if (col.pattern) output += ` [模式: ${col.pattern}]`;
      if (col.uniqueCount !== undefined) output += ` [唯一值: ${col.uniqueCount}]`;
      output += `\n`;
      output += `    示例: ${col.sampleValues.map(v => JSON.stringify(v)).join(', ')}\n`;
    });

    if (sheetInfo.hasComments) {
      output += `- 📝 包含 ${sheetInfo.commentCount} 个单元格注释\n`;
    }

    if (sheetInfo.hasNotes) {
      output += `- 📌 包含 ${sheetInfo.noteCount} 个单元格标注\n`;
    }

    if (sheetInfo.hasEmptyValues) {
      output += `- ⚠️ 该 sheet 包含空值\n`;
    }
  });

  return output;
}

/**
 * 生成简化的 Schema（用于快速提示）
 */
export function generateSimplifiedSchema(metadata: ExcelMetadata): string {
  let schema = `文件: ${metadata.fileName}\n\n`;

  Object.entries(metadata.sheets).forEach(([sheetName, sheetInfo]) => {
    schema += `${sheetName}:\n`;
    schema += `  列: ${sheetInfo.columns.map(c => `${c.name}:${c.type}`).join(', ')}\n`;
  });

  return schema;
}
