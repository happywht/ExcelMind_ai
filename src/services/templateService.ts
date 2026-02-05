/**
 * Word模板处理服务
 * 职责：解析Word文档，提取占位符，生成HTML预览
 * 单一职责原则：只负责模板解析，不涉及数据填充
 */

import mammoth from 'mammoth';
import { TemplateParseResult, TemplateFile } from '../types/documentTypes';

/**
 * 占位符正则表达式：匹配 {{字段名}} 格式
 */
const PLACEHOLDER_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * 从Word文档中提取所有占位符
 * @param docxContent Word文档的文本内容
 * @returns 占位符数组（去重）
 */
export function extractPlaceholders(docxContent: string): string[] {
  const matches = docxContent.match(PLACEHOLDER_REGEX);
  return matches ? [...new Set(matches)] : [];
}

/**
 * 解析Word模板文件
 * @param file Word文档文件（.docx格式）
 * @returns 解析结果，包含占位符列表和HTML预览
 */
export async function parseWordTemplate(file: File): Promise<TemplateParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // 使用mammoth将Word转换为HTML预览
    // 配置styleMap以确保标题等样式能被正确识别
    const result = await mammoth.convertToHtml({ arrayBuffer }, {
      styleMap: [
        "p[style-name='Title'] => h1.doc-title:fresh",
        "p[style-name='Subtitle'] => h2.doc-subtitle:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "comment-reference => sup"
      ]
    });
    const htmlPreview = result.value;

    // 从HTML中提取文本内容，用于识别占位符
    const textContent = htmlPreview.replace(/<[^>]+>/g, ' ');

    // 提取占位符
    const placeholders = extractPlaceholders(textContent);

    // 检测是否有高级特性（用于后续优化）
    const hasConditionalBlocks = textContent.includes('{{#if') || textContent.includes('{{/if}}');
    const hasLoops = textContent.includes('{{#each') || textContent.includes('{{/each}}');

    return {
      placeholders,
      textContent,
      htmlPreview, // ✅ 添加HTML预览，这是关键修复
      hasConditionalBlocks,
      hasLoops
    };
  } catch (error) {
    throw new Error(`模板解析失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 创建TemplateFile对象
 * @param file 上传的Word文件
 * @returns TemplateFile对象
 */
export async function createTemplateFile(file: File): Promise<TemplateFile> {
  const arrayBuffer = await file.arrayBuffer();
  const parseResult = await parseWordTemplate(file);

  return {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
    file,
    name: file.name,
    size: file.size,
    arrayBuffer,
    htmlPreview: parseResult.htmlPreview, // ✅ 修复：使用HTML预览而不是纯文本
    placeholders: parseResult.placeholders
  };
}

/**
 * 高亮显示HTML中的占位符（用于预览）
 * @param html 原始HTML
 * @param placeholders 占位符列表
 * @returns 包含高亮样式的HTML
 */
export function highlightPlaceholdersInHtml(html: string, placeholders: string[]): string {
  let highlightedHtml = html;

  placeholders.forEach(placeholder => {
    // 使用span标签包裹占位符，添加黄色背景
    highlightedHtml = highlightedHtml.replace(
      new RegExp(escapeRegExp(placeholder), 'g'),
      `<span style="background-color: #fef3c7; border-radius: 4px; padding: 2px 6px; font-weight: 500;">${placeholder}</span>`
    );
  });

  return highlightedHtml;
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
