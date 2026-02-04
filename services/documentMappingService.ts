/**
 * 文档映射服务
 * 职责：AI智能理解用户需求，生成Excel数据到Word模板的字段映射方案
 * 依赖倒置原则：依赖智谱AI的抽象接口（zhipuService）
 *
 * 版本: v2.0 - 支持多Sheet分析和跨Sheet映射
 */

import { logger } from '@/utils/logger';
import Anthropic from "@anthropic-ai/sdk";
import { MappingScheme, FieldMapping, SheetInfo, CrossSheetMapping } from '../types/documentTypes';
import { SAMPLING_CONFIG } from '../config/samplingConfig';

// 配置智谱AI客户端
// 环境检测：兼容浏览器和Node.js环境
const isNodeEnv = typeof process !== 'undefined' && process.env !== undefined;
let client: Anthropic | null = null;

const getClient = (): Anthropic => {
  if (!client) {
    // 环境检测：兼容浏览器和Node.js环境
    const apiKey = isNodeEnv
      ? (process.env.ZHIPU_API_KEY || process.env.API_KEY || '')
      : (import.meta.env.VITE_ANTHROPIC_API_KEY || '');

    if (!apiKey) {
      throw new Error('AI服务API密钥未配置。请检查环境变量：\n' +
        '- Node.js环境: ZHIPU_API_KEY 或 API_KEY\n' +
        '- 浏览器环境: VITE_ANTHROPIC_API_KEY');
    }

    client = new Anthropic({
      apiKey,
      baseURL: 'https://open.bigmodel.cn/api/anthropic',
      dangerouslyAllowBrowser: true // 允许浏览器环境调用（个人使用可接受）
    });
  }
  return client;
};

/**
 * AI映射生成请求参数（V2 - 增强版）
 */
export interface GenerateMappingParamsV2 {
  allSheetsInfo: SheetInfo[];      // 所有sheet信息
  primarySheet?: string;            // 可选：用户指定的主sheet
  templatePlaceholders: string[];
  userInstruction: string;
}

/**
 * AI映射生成请求参数（V1 - 向后兼容）
 * @deprecated 使用 GenerateMappingParamsV2 代替
 */
interface GenerateMappingParams {
  excelHeaders: string[];
  excelSampleData: any[];
  templatePlaceholders: string[];
  userInstruction: string;
}

/**
 * 生成字段映射方案（V2 - 增强版）
 * 支持多Sheet分析和跨Sheet映射
 * @param params 映射生成参数
 * @returns AI生成的映射方案
 */
export async function generateFieldMappingV2(params: GenerateMappingParamsV2): Promise<MappingScheme> {
  const { allSheetsInfo, primarySheet, templatePlaceholders, userInstruction } = params;

  try {
    // 构建结构化提示词（支持多Sheet分析）
    const prompt = buildMultiSheetMappingPrompt({
      allSheetsInfo,
      primarySheet,
      templatePlaceholders,
      userInstruction
    });

    // 调用智谱AI
    const response = await getClient().messages.create({
      model: "glm-4.6",
      max_tokens: 8192, // 增加token限制以支持多Sheet分析
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : "";
    if (!text) throw new Error("AI未返回响应");

    // 解析AI响应（支持跨Sheet映射）
    const mappingScheme = parseMultiSheetMappingResponse(text, allSheetsInfo);

    // ===========================================
    // Phase 2: Context-Aware Auto-Formatting (Heuristic Layer)
    // ===========================================

    // 动态导入避免可能的循环依赖，虽在此处未必发生，但作为防御性编程
    const { aiProcessingService } = await import('./aiProcessingService');
    const { FormatterService } = await import('./formatterService');

    // 遍历所有生成的映射，尝试应用智能格式化
    // 只处理主Sheet的映射，且没有已有Transform的情况
    if (mappingScheme.primarySheet) {
      const primarySheetInfo = allSheetsInfo.find(s => s.sheetName === mappingScheme.primarySheet);

      if (primarySheetInfo && primarySheetInfo.sampleData) {
        // 并行处理所有各列的分析
        await Promise.all(mappingScheme.mappings.map(async (mapping) => {
          if (mapping.transform) return; // 已有规则则跳过

          // 获取该列的样本数据
          const columnIndex = primarySheetInfo.headers.indexOf(mapping.excelColumn);
          if (columnIndex === -1) return;

          const columnSamples = primarySheetInfo.sampleData.map(row => row[mapping.excelColumn]);

          // 分析列内容
          const analysis = await aiProcessingService.analyzeColumnContent(mapping.excelColumn, columnSamples);

          if (analysis.suggestedFormatter) {
            const formatters = FormatterService.getFormatters();
            const formatter = formatters.find(f => f.id === analysis.suggestedFormatter);

            if (formatter) {
              mapping.transform = formatter.generateCode();
              // 可以在此处添加日志或标记，表明是“智能添加”的
              logger.info(`[Auto-Format] Applied ${formatter.label} to column ${mapping.excelColumn}`);
            }
          }
        }));
      }
    }

    return mappingScheme;

  } catch (error) {
    logger.error("多Sheet映射生成失败:", error);
    throw new Error(`AI映射生成失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 生成字段映射方案（V1 - 向后兼容）
 * @deprecated 使用 generateFieldMappingV2 代替
 */
export async function generateFieldMapping(params: GenerateMappingParams): Promise<MappingScheme> {
  const { excelHeaders, excelSampleData, templatePlaceholders, userInstruction } = params;

  // 转换为新的调用格式
  return generateFieldMappingV2({
    allSheetsInfo: [{
      sheetName: 'Sheet1',
      headers: excelHeaders,
      rowCount: excelSampleData.length,
      sampleData: excelSampleData
    }],
    templatePlaceholders,
    userInstruction
  });
}

/**
 * 构建多Sheet映射提示词
 */
interface MultiSheetMappingPromptParams {
  allSheetsInfo: SheetInfo[];
  primarySheet?: string;
  templatePlaceholders: string[];
  userInstruction: string;
}

function buildMultiSheetMappingPrompt(params: MultiSheetMappingPromptParams): string {
  const { allSheetsInfo, primarySheet, templatePlaceholders, userInstruction } = params;

  // 构建所有Sheet的概览
  const sheetsOverview = allSheetsInfo.map(sheet => {
    return `
工作表名称: ${sheet.sheetName}
- 数据行数: ${sheet.rowCount}
- 字段列表: ${sheet.headers.join(', ')}
- 样本数据(前${SAMPLING_CONFIG.DOCUMENT_MAPPING.PREVIEW_ROWS}行):
${JSON.stringify(sheet.sampleData.slice(0, SAMPLING_CONFIG.DOCUMENT_MAPPING.PREVIEW_ROWS), null, 2)}
`;
  }).join('\n');

  return `
你是专业的智能文档映射专家。你的任务是将Excel多Sheet数据智能映射到Word模板的占位符。

【Excel文件结构 - 多工作表】
文件包含 ${allSheetsInfo.length} 个工作表:
${sheetsOverview}

${primarySheet ? `【用户指定主工作表】${primarySheet}` : ''}

【Word模板占位符】
检测到 ${templatePlaceholders.length} 个占位符:
${templatePlaceholders.map(p => `  - ${p}`).join('\n')}

【用户指令】
"${userInstruction}"

【任务要求】
1. **选择主工作表**: 如果用户未指定，智能选择最合适的主工作表（通常是包含主要数据的工作表）
2. **字段映射**: 将主工作表的字段映射到模板占位符（考虑语义相似度）
3. **跨Sheet关联**: 识别需要从其他工作表查找的字段，建立关联关系
4. **数据筛选**: 根据用户指令确定是否需要筛选数据
5. **生成方案**: 生成完整可执行的映射方案

【跨Sheet映射场景】
- 当模板需要的字段在主Sheet中不存在时，查找其他Sheet
- 识别关联字段（如"部门ID"、"员工ID"等）
- 确定关系类型（oneToOne: 一对一, manyToOne: 多对一）

【输出格式要求】
必须输出纯净的JSON格式，不要包含任何Markdown标记：
{
  "explanation": "映射思路的详细说明",
  "primarySheet": "选择的主工作表名称",
  "reasoning": "选择该主工作表的原因",
  "filterCondition": "筛选条件的JavaScript代码或null",
  "mappings": [
    {
      "placeholder": "{{占位符}}",
      "excelColumn": "主Sheet中的列名",
      "transform": "数据转换代码(可选)"
    }
  ],
  "crossSheetMappings": [
    {
      "placeholder": "{{跨Sheet占位符}}",
      "sourceSheet": "来源工作表名称",
      "sourceColumn": "来源列名",
      "lookupKey": "关联字段（在主Sheet和来源Sheet中都存在）",
      "relationshipType": "oneToOne或manyToOne",
      "transform": "数据转换代码(可选)"
    }
  ],
  "unmappedPlaceholders": ["未能映射的占位符"],
  "loopMappings": [
    {
      "id": "自动生成的ID",
      "loopPlaceholder": "循环占位符(如Projects)",
      "type": "group_by", // 或 'lookup'
      "groupByColumn": "分组字段(仅group_by)",
      "mappings": [
        // 循环内部的字段映射
        {"placeholder": "{{ItemName}}", "excelColumn": "ItemName"}
      ]
    }
  ],
  "virtualColumns": [
    {
      "id": "vcol_1",
      "name": "显式名称",
      "type": "const",
      "value": "静态值"
    }
  ],
  "confidence": 0.95
}

【高级模式说明】
1. **列表循环 (Loop)**:
   - 如果模板包含 {#Projects}...{/Projects} 结构，请生成 loopMappings。
   - type: "group_by" (单表分组) 或 "lookup" (跨表关联)。

2. **分组融合 (Group Merge / Flattening)**:
   - 如果模板包含 {{Name1}}, {{Name2}} 这种带索引的占位符，说明用户希望将多行数据融合到同一页。
   - 处理方式：
     1. 创建一个 loopMappings (type="group_by")，按主键(如InvoiceNo)分组。
     2. 在 mappings (主层级) 中，将 {{Name1}} 映射到 Name_1 (系统会自动拍平分组数据)。
     3. 告诉用户：系统会自动生成 Column_Index 格式的变量。

3. **虚拟列 (Virtual Column)**:
   - 用于生成静态文本 (type="const") 或 简单变量。

【多Sheet映射示例】

示例1 - 简单单Sheet映射:
用户指令: "把员工信息填入模板"
工作表:
  - 员工表: {姓名, 部门, 职位, 工资}
  - 部门表: {部门ID, 部门名称, 负责人}
占位符: [{{姓名}}, {{部门}}, {{职位}}]
输出:
{
  "explanation": "员工表包含所需的主要数据，直接从员工表映射字段",
  "primarySheet": "员工表",
  "reasoning": "员工表包含所有需要的字段（姓名、部门、职位），无需跨Sheet查找",
  "filterCondition": null,
  "mappings": [
    {"placeholder": "{{姓名}}", "excelColumn": "姓名"},
    {"placeholder": "{{部门}}", "excelColumn": "部门"},
    {"placeholder": "{{职位}}", "excelColumn": "职位"}
  ],
  "crossSheetMappings": [],
  "unmappedPlaceholders": [],
  "confidence": 1.0
}

示例2 - 跨Sheet查找关联数据:
用户指令: "生成员工工资单，包含部门负责人信息"
工作表:
  - 员工表: {员工ID, 姓名, 部门ID, 工资}
  - 部门表: {部门ID, 部门名称, 负责人}
占位符: [{{姓名}}, {{工资}}, {{部门负责人}}]
输出:
{
  "explanation": "主数据来自员工表，部门负责人信息需要通过部门ID关联到部门表",
  "primarySheet": "员工表",
  "reasoning": "员工表是主要数据源，包含员工ID、姓名、工资等核心信息",
  "filterCondition": null,
  "mappings": [
    {"placeholder": "{{姓名}}", "excelColumn": "姓名"},
    {"placeholder": "{{工资}}", "excelColumn": "工资"}
  ],
  "crossSheetMappings": [
    {
      "placeholder": "{{部门负责人}}",
      "sourceSheet": "部门表",
      "sourceColumn": "负责人",
      "lookupKey": "部门ID",
      "relationshipType": "manyToOne",
      "transform": null
    }
  ],
  "unmappedPlaceholders": [],
  "confidence": 0.95
}

示例3 - 筛选+跨Sheet映射:
用户指令: "生成销售部门所有员工的工资单"
工作表:
  - 员工表: {员工ID, 姓名, 部门ID, 工资}
  - 部门表: {部门ID, 部门名称}
占位符: [{{姓名}}, {{工资}}, {{部门名称}}]
输出:
{
  "explanation": "筛选销售部门的员工，从员工表获取基础信息，通过部门ID关联部门表获取部门名称",
  "primarySheet": "员工表",
  "reasoning": "员工表包含主要数据和筛选字段（部门ID）",
  "filterCondition": "row['部门ID'] === '销售部' || row['部门名称'] === '销售部'",
  "mappings": [
    {"placeholder": "{{姓名}}", "excelColumn": "姓名"},
    {"placeholder": "{{工资}}", "excelColumn": "工资"}
  ],
  "crossSheetMappings": [
    {
      "placeholder": "{{部门名称}}",
      "sourceSheet": "部门表",
      "sourceColumn": "部门名称",
      "lookupKey": "部门ID",
      "relationshipType": "manyToOne"
    }
  ],
  "unmappedPlaceholders": [],
  "confidence": 0.9
}

示例4 - 分组融合 (Flattening):
用户指令: "将同一Session的多个演讲者填入模板 (Name1, Name2)"
Excel: {SessionID, SpeakerName, Topic}
模板: [{{SessionID}}, {{SpeakerName1}}, {{SpeakerName2}}]
输出:
{
  "explanation": "检测到带索引的占位符，使用分组融合模式。按SessionID分组，并映射扁平化后的变量。",
  "primarySheet": "Sheet1",
  "mappings": [
    {"placeholder": "{{SessionID}}", "excelColumn": "SessionID"},
    {"placeholder": "{{SpeakerName1}}", "excelColumn": "SpeakerName_1"},
    {"placeholder": "{{SpeakerName2}}", "excelColumn": "SpeakerName_2"}
  ],
  "loopMappings": [
    {
      "id": "loop_session",
      "loopPlaceholder": "Matches", // 隐式循环
      "type": "group_by",
      "groupByColumn": "SessionID",
      "mappings": []
    }
  ],
  "unmappedPlaceholders": [],
  "confidence": 0.95
}

现在请处理上述用户任务，输出JSON格式。
`;
}

/**
 * 构建AI映射提示词（V1版本 - 向后兼容）
 */
interface MappingPromptParams {
  excelHeaders: string[];
  excelSampleData: any[];
  templatePlaceholders: string[];
  userInstruction: string;
}

function buildMappingPrompt(params: MappingPromptParams): string {
  const { excelHeaders, excelSampleData, templatePlaceholders, userInstruction } = params;

  return `
你是专业的智能文档映射专家。你的任务是将Excel数据字段智能映射到Word模板的占位符。

【Excel数据结构】
列名: ${JSON.stringify(excelHeaders)}
样本数据(前${SAMPLING_CONFIG.DOCUMENT_MAPPING.PREVIEW_ROWS}行):
${JSON.stringify(excelSampleData.slice(0, SAMPLING_CONFIG.DOCUMENT_MAPPING.PREVIEW_ROWS), null, 2)}

【Word模板占位符】
检测到 ${templatePlaceholders.length} 个占位符:
${templatePlaceholders.map(p => `  - ${p}`).join('\n')}

【用户指令】
"${userInstruction}"

【任务要求】
1. 理解用户指令的语义意图
2. 智能匹配Excel列名和模板占位符（考虑语义相似度）
3. 确定是否需要筛选数据（如"销售额大于10万"）
4. 生成可执行的映射方案

【输出格式要求】
必须输出纯净的JSON格式，不要包含任何Markdown标记：
{"explanation": "映射思路的详细说明", "filterCondition": "筛选条件的JavaScript代码或null", "mappings": [{"placeholder": "{{占位符}}", "excelColumn": "对应的Excel列名", "transform": "数据转换代码(可选)"}], "unmappedPlaceholders": ["未能映射的占位符"]}

【映射示例】
示例1 - 筛选映射:
用户指令: "把所有销售额大于10万的产品填入模板"
输出:
{
  "explanation": "筛选销售额列大于100000的行，将产品名称、销售额、类别字段映射到对应占位符",
  "filterCondition": "row['销售额'] > 100000",
  "mappings": [
    {"placeholder": "{{产品名称}}", "excelColumn": "产品名称"},
    {"placeholder": "{{销售额}}", "excelColumn": "销售额"},
    {"placeholder": "{{类别}}", "excelColumn": "类别"}
  ],
  "unmappedPlaceholders": []
}

示例2 - 简单映射:
用户指令: "把客户信息填入模板"
输出:
{
  "explanation": "将Excel中的客户名称、联系电话、地址字段直接映射到对应占位符",
  "filterCondition": null,
  "mappings": [
    {"placeholder": "{{客户名}}", "excelColumn": "客户名称"},
    {"placeholder": "{{电话}}", "excelColumn": "联系电话"},
    {"placeholder": "{{地址}}", "excelColumn": "详细地址"}
  ],
  "unmappedPlaceholders": []
}

现在请处理上述用户任务，输出JSON格式。
`;
}

import { parseLLMJson } from './utils/jsonUtils';

/**
 * 解析多Sheet映射响应
 * 支持跨Sheet映射、主Sheet选择等增强功能
 */
function parseMultiSheetMappingResponse(text: string, allSheetsInfo: SheetInfo[]): MappingScheme {
  try {
    // 使用增强的JSON解析工具
    const result = parseLLMJson<any>(text);

    // 验证必需字段
    if (!result.explanation || !result.primarySheet) {
      throw new Error("AI响应缺少必需字段");
    }

    // 验证主Sheet是否存在
    const primarySheetExists = allSheetsInfo.some(sheet => sheet.sheetName === result.primarySheet);
    if (!primarySheetExists) {
      logger.warn(`AI选择的主Sheet "${result.primarySheet}" 不存在，使用第一个Sheet`);
      result.primarySheet = allSheetsInfo[0]?.sheetName || 'Sheet1';
    }

    // 验证mappings数组
    if (!Array.isArray(result.mappings)) {
      result.mappings = [];
    }

    // 验证crossSheetMappings数组（如果存在）
    if (result.crossSheetMappings && !Array.isArray(result.crossSheetMappings)) {
      result.crossSheetMappings = [];
    }

    // 验证unmappedPlaceholders数组
    if (!Array.isArray(result.unmappedPlaceholders)) {
      result.unmappedPlaceholders = [];
    }

    // 验证跨Sheet映射的来源Sheet是否存在
    if (result.crossSheetMappings && result.crossSheetMappings.length > 0) {
      result.crossSheetMappings = result.crossSheetMappings.filter((mapping: CrossSheetMapping) => {
        const sourceExists = allSheetsInfo.some(sheet => sheet.sheetName === mapping.sourceSheet);
        if (!sourceExists) {
          logger.warn(`跨Sheet映射的来源Sheet "${mapping.sourceSheet}" 不存在，已忽略`);
          return false;
        }
        return true;
      });
    }

    // 附加所有Sheet信息到结果中
    result.allSheetsInfo = allSheetsInfo;

    return result as MappingScheme;

  } catch (error) {
    logger.error("多Sheet映射JSON解析失败，使用降级策略:", error);
    return createFallbackMapping(text, allSheetsInfo);
  }
}

/**
 * 解析AI映射响应（V1版本 - 向后兼容）
 * 支持多种格式：纯净JSON、Markdown代码块
 */
function parseMappingResponse(text: string): MappingScheme {
  try {
    // 使用增强的JSON解析工具
    const result = parseLLMJson<any>(text);

    // 验证结果格式
    if (!result.explanation || !Array.isArray(result.mappings)) {
      throw new Error("AI响应格式无效");
    }

    // 为V1兼容性添加默认primarySheet
    if (!result.primarySheet) {
      result.primarySheet = 'Sheet1';
    }

    return result as MappingScheme;

  } catch (error) {
    logger.error("JSON解析失败，使用降级策略:", error);

    // 降级策略：返回基础映射
    return createFallbackMappingLegacy(text);
  }
}

/**
 * 创建降级映射方案（当AI解析失败时）
 * V2版本 - 支持多Sheet
 */
function createFallbackMapping(aiResponse: string, allSheetsInfo?: SheetInfo[]): MappingScheme {
  const fallback: MappingScheme = {
    explanation: `AI解析失败，使用降级策略。原始响应：${aiResponse.substring(0, 200)}...`,
    primarySheet: allSheetsInfo?.[0]?.sheetName || 'Sheet1',
    filterCondition: null,
    mappings: [],
    unmappedPlaceholders: [],
    crossSheetMappings: []
  };

  if (allSheetsInfo) {
    fallback.allSheetsInfo = allSheetsInfo;
  }

  return fallback;
}

/**
 * 创建降级映射方案（V1版本 - 向后兼容）
 */
function createFallbackMappingLegacy(aiResponse: string): MappingScheme {
  return {
    explanation: `AI解析基于语义匹配：${aiResponse.substring(0, 200)}...`,
    primarySheet: 'Sheet1',
    filterCondition: null,
    mappings: [],
    unmappedPlaceholders: [] // 将在调用方填充
  };
}

// ============================================================================
// 辅助工具函数
// ============================================================================

/**
 * 智能选择主工作表
 * 基于数据行数、字段数量、字段语义等因素综合评估
 */
export function suggestPrimarySheet(allSheetsInfo: SheetInfo[], userInstruction?: string): string {
  if (allSheetsInfo.length === 0) {
    return 'Sheet1';
  }

  if (allSheetsInfo.length === 1) {
    return allSheetsInfo[0].sheetName;
  }

  // 评分系统
  const scoredSheets = allSheetsInfo.map(sheet => {
    let score = 0;

    // 因素1: 数据行数（权重：40%）
    // 标准化到0-40分
    const maxRows = Math.max(...allSheetsInfo.map(s => s.rowCount));
    score += (sheet.rowCount / maxRows) * 40;

    // 因素2: 字段数量（权重：20%）
    // 适中的字段数量得分更高（5-20个字段）
    const fieldCount = sheet.headers.length;
    if (fieldCount >= 5 && fieldCount <= 20) {
      score += 20;
    } else if (fieldCount > 0) {
      score += Math.max(0, 20 - Math.abs(fieldCount - 10));
    }

    // 因素3: 字段语义相关性（权重：30%）
    // 常见主数据字段关键词
    const mainDataKeywords = [
      '姓名', '名称', '标题', 'ID', '编号',
      '产品', '客户', '员工', '订单', '销售',
      '金额', '数量', '日期', '时间'
    ];

    const relevanceScore = sheet.headers.filter(header =>
      mainDataKeywords.some(keyword => header.includes(keyword))
    ).length;

    score += Math.min(30, relevanceScore * 5);

    // 因素4: 用户指令匹配（权重：10%）
    if (userInstruction) {
      const instructionLower = userInstruction.toLowerCase();
      const sheetNameLower = sheet.sheetName.toLowerCase();

      // 检查Sheet名称是否在用户指令中
      if (instructionLower.includes(sheetNameLower)) {
        score += 10;
      }

      // 检查字段是否在用户指令中
      const fieldMatchScore = sheet.headers.filter(header =>
        instructionLower.includes(header.toLowerCase())
      ).length;

      score += Math.min(10, fieldMatchScore * 2);
    }

    return { sheetName: sheet.sheetName, score };
  });

  // 选择得分最高的Sheet
  scoredSheets.sort((a, b) => b.score - a.score);
  return scoredSheets[0].sheetName;
}

/**
 * 检测跨Sheet关联关系
 * 自动识别可能的关联字段（如ID字段）
 */
export function detectCrossSheetRelationships(allSheetsInfo: SheetInfo[]): Array<{
  fromSheet: string;
  toSheet: string;
  field: string;
  confidence: number;
}> {
  const relationships: Array<{
    fromSheet: string;
    toSheet: string;
    field: string;
    confidence: number;
  }> = [];

  // 常见关联字段模式
  const relationshipPatterns = [
    /ID$/i,           // 以ID结尾
    /^ID/i,           // 以ID开头
    /编号$/i,         // 以编号结尾
    /代码$/i,         // 以代码结尾
    /No\.$/i,         // 以No.结尾
  ];

  // 遍历所有Sheet组合
  for (let i = 0; i < allSheetsInfo.length; i++) {
    for (let j = i + 1; j < allSheetsInfo.length; j++) {
      const sheet1 = allSheetsInfo[i];
      const sheet2 = allSheetsInfo[j];

      // 查找共同字段
      const commonFields = sheet1.headers.filter(header =>
        sheet2.headers.includes(header)
      );

      // 评估每个共同字段的关联可能性
      commonFields.forEach(field => {
        let confidence = 0.5; // 基础置信度

        // 如果字段名匹配关联模式，提高置信度
        if (relationshipPatterns.some(pattern => pattern.test(field))) {
          confidence += 0.3;
        }

        // 如果字段在两个Sheet中都是唯一的可能性高
        const isLikelyUnique = field.includes('ID') || field.includes('编号') || field.includes('代码');
        if (isLikelyUnique) {
          confidence += 0.2;
        }

        relationships.push({
          fromSheet: sheet1.sheetName,
          toSheet: sheet2.sheetName,
          field,
          confidence: Math.min(1.0, confidence)
        });
      });
    }
  }

  // 按置信度排序
  return relationships.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 验证映射方案的完整性
 */
export function validateMappingScheme(
  scheme: MappingScheme,
  allSheetsInfo: SheetInfo[]
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 验证1: 主Sheet是否存在
  const primarySheetExists = allSheetsInfo.some(
    sheet => sheet.sheetName === scheme.primarySheet
  );
  if (!primarySheetExists) {
    errors.push(`主Sheet "${scheme.primarySheet}" 不存在`);
  }

  // 验证2: 主Sheet映射的字段是否存在
  const primarySheet = allSheetsInfo.find(
    sheet => sheet.sheetName === scheme.primarySheet
  );

  if (primarySheet) {
    scheme.mappings.forEach(mapping => {
      if (!primarySheet.headers.includes(mapping.excelColumn)) {
        errors.push(`主Sheet "${scheme.primarySheet}" 中不存在字段 "${mapping.excelColumn}"`);
      }
    });
  }

  // 验证3: 跨Sheet映射的Sheet和字段是否存在
  if (scheme.crossSheetMappings) {
    scheme.crossSheetMappings.forEach(crossMapping => {
      const sourceSheet = allSheetsInfo.find(
        sheet => sheet.sheetName === crossMapping.sourceSheet
      );

      if (!sourceSheet) {
        errors.push(`跨Sheet映射的来源Sheet "${crossMapping.sourceSheet}" 不存在`);
      } else if (!sourceSheet.headers.includes(crossMapping.sourceColumn)) {
        errors.push(`来源Sheet "${crossMapping.sourceSheet}" 中不存在字段 "${crossMapping.sourceColumn}"`);
      }
    });
  }

  // 警告1: 未映射的占位符
  if (scheme.unmappedPlaceholders.length > 0) {
    warnings.push(`${scheme.unmappedPlaceholders.length} 个占位符未能映射: ${scheme.unmappedPlaceholders.join(', ')}`);
  }

  // 警告2: 低置信度
  if (scheme.confidence !== undefined && scheme.confidence < 0.7) {
    warnings.push(`映射方案置信度较低 (${scheme.confidence})，建议人工审核`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
