/**
 * Prompt 构建服务
 *
 * 职责：
 * 1. 构建包含 Schema 的增强 Prompt
 * 2. 集成预定义工具库
 * 3. 生成优化的错误反馈 Prompt
 *
 * @author Backend Developer
 * @version 1.0.0
 */

import { ExcelMetadata } from '../metadata/excelMetadataService';
import { generateToolsDocumentation } from '../tools/auditTools';

/**
 * Prompt 构建配置
 */
export interface PromptBuilderConfig {
  includeSchema: boolean;
  includeTools: boolean;
  includeConstraints: boolean;
  includeExamples: boolean;
  verboseMode: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: PromptBuilderConfig = {
  includeSchema: true,
  includeTools: true,
  includeConstraints: true,
  includeExamples: true,
  verboseMode: false
};

/**
 * 构建包含 Schema 的增强 Prompt
 *
 * @param metadata Excel 元数据
 * @param userQuery 用户查询
 * @param config 配置
 * @returns 增强 Prompt
 */
export function buildPromptWithSchema(
  metadata: ExcelMetadata,
  userQuery: string,
  config?: Partial<PromptBuilderConfig>
): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  let prompt = `你是一个专业的 Excel 数据处理助手，使用 Python 3 和 pandas 库。\n\n`;

  // 1. Schema 信息
  if (finalConfig.includeSchema) {
    prompt += `## 数据结构信息\n`;
    prompt += formatSchemaInfo(metadata);
    prompt += `\n`;
  }

  // 2. 可用工具
  if (finalConfig.includeTools) {
    prompt += `## 可用工具函数\n`;
    prompt += generateToolsDocumentation();
    prompt += `\n`;
  }

  // 3. 重要约束
  if (finalConfig.includeConstraints) {
    prompt += `## 重要约束\n`;
    prompt += generateConstraints(metadata);
    prompt += `\n`;
  }

  // 4. 代码示例
  if (finalConfig.includeExamples) {
    prompt += `## 代码示例\n`;
    prompt += generateCodeExamples(metadata);
    prompt += `\n`;
  }

  // 5. 用户需求
  prompt += `## 用户需求\n`;
  prompt += `${userQuery}\n\n`;

  // 6. 输出要求
  prompt += `## 输出要求\n`;
  prompt += generateOutputRequirements();

  return prompt;
}

/**
 * 格式化 Schema 信息
 */
function formatSchemaInfo(metadata: ExcelMetadata): string {
  let info = `**文件名**: ${metadata.fileName}\n`;
  info += `**Sheet 列表**: ${metadata.sheetNames.join(', ')}\n\n`;

  info += `### Sheet 详细结构\n`;

  Object.entries(metadata.sheets).forEach(([sheetName, sheetInfo]) => {
    info += `\n#### 【${sheetName}】\n`;
    info += `- **行数**: ${sheetInfo.rowCount}\n`;
    info += `- **列数**: ${sheetInfo.columnCount}\n`;
    info += `- **可用列名**: \`${sheetInfo.columns.map(c => c.name).join('`, `')}\`\n\n`;

    info += `**列详情**:\n`;
    sheetInfo.columns.forEach(col => {
      info += `- \`${col.name}\` (${col.type})`;
      if (col.nullable) info += ` [可为空]`;
      if (col.pattern) info += ` [模式: ${col.pattern}]`;
      if (col.uniqueCount !== undefined) info += ` [唯一值: ${col.uniqueCount}]`;
      info += `\n`;
      info += `  - 示例值: ${col.sampleValues.map(v => `\`${JSON.stringify(v)}\``).join(', ')}\n`;
    });

    // 元数据信息
    if (sheetInfo.hasComments || sheetInfo.hasNotes) {
      info += `\n**元数据**:\n`;
      if (sheetInfo.hasComments) {
        info += `- 📝 包含 ${sheetInfo.commentCount} 个单元格注释\n`;
      }
      if (sheetInfo.hasNotes) {
        info += `- 📌 包含 ${sheetInfo.noteCount} 个单元格标注\n`;
      }
    }

    if (sheetInfo.hasEmptyValues) {
      info += `- ⚠️ 该 sheet 包含空值，处理时请注意\n`;
    }
  });

  return info;
}

/**
 * 生成约束条件
 */
function generateConstraints(metadata: ExcelMetadata): string {
  let constraints = `1. **严格基于列名**: 必须使用上述"可用列名"中的列名，禁止虚构不存在的列\n`;
  constraints += `2. **优先使用工具函数**: 优先使用上述"可用工具函数"，避免重复造轮子\n`;
  constraints += `3. **保持简洁**: 遵循 KISS 原则，优先使用简单直接的 pandas 操作\n`;
  constraints += `4. **类型安全**: 处理前先检查数据类型，必要时进行类型转换\n`;
  constraints += `5. **空值处理**: 考虑可能存在的空值，使用 fillna() 或 dropna() 处理\n`;
  constraints += `6. **多Sheet处理**: 如果涉及多个sheet，使用正确的sheet名称访问数据\n`;

  // 根据元数据添加特定约束
  Object.values(metadata.sheets).forEach(sheetInfo => {
    if (sheetInfo.hasEmptyValues) {
      constraints += `7. **空值警告**: Sheet "${sheetInfo.name}" 包含空值，务必处理\n`;
    }
  });

  return constraints;
}

/**
 * 生成代码示例
 */
function generateCodeExamples(metadata: ExcelMetadata): string {
  let examples = `### 基本操作示例\n\n`;

  // 获取第一个 sheet 的第一列作为示例
  const firstSheet = Object.values(metadata.sheets)[0];
  if (firstSheet && firstSheet.columns.length > 0) {
    const firstCol = firstSheet.columns[0];
    const sampleSheetName = firstSheet.name;

    examples += `#### 1. 读取数据\n`;
    examples += `\`\`\`python\n`;
    examples += `import pandas as pd\n`;
    examples += `import json\n\n`;
    examples += `# 单sheet文件\n`;
    examples += `df = pd.DataFrame(files['${metadata.fileName}'])\n\n`;
    examples += `# 多sheet文件\n`;
    examples += `sheet_data = files['${metadata.fileName}']['${sampleSheetName}']\n`;
    examples += `df = pd.DataFrame(sheet_data)\n`;
    examples += `\`\`\`\n\n`;

    examples += `#### 2. 使用工具函数\n`;
    examples += `\`\`\`python\n`;
    examples += `# 安全转换数值\n`;
    examples += `df = safe_numeric_convert(df, '${firstCol.name}')\n\n`;
    examples += `# 查找异常值\n`;
    examples += `anomalies = find_anomalies(df, '${firstCol.name}')\n\n`;
    examples += `# 分组聚合\n`;
    examples += `result = group_and_aggregate(df, '分组列', '${firstCol.name}', 'sum')\n`;
    examples += `\`\`\`\n\n`;

    examples += `#### 3. 输出结果\n`;
    examples += `\`\`\`python\n`;
    examples += `# 更新现有sheet\n`;
    examples += `files['${metadata.fileName}']['${sampleSheetName}'] = df.to_dict('records')\n\n`;
    examples += `# 创建新文件\n`;
    examples += `files['结果.xlsx'] = df.to_dict('records')\n\n`;
    examples += `# 输出JSON\n`;
    examples += `print(json.dumps(files, ensure_ascii=False, default=str))\n`;
    examples += `\`\`\`\n`;
  }

  return examples;
}

/**
 * 生成输出要求
 */
function generateOutputRequirements(): string {
  return `请生成简洁的 Python 代码来解决上述需求。

**输出格式**（必须严格遵守）：
\`\`\`json
{
  "explanation": "你的思考过程和实现逻辑",
  "code": "完整的Python代码"
}
\`\`\`

**代码要求**：
- 必须导入必要的库（pandas, json等）
- 优先使用预定义工具函数
- 必须处理可能的异常情况
- 代码必须简洁、清晰、可读
- 必须输出 JSON 格式结果`;
}

/**
 * 构建优化的错误反馈 Prompt
 *
 * @param originalCode 原始代码
 * @param error 错误信息
 * @param metadata 元数据
 * @returns 修复 Prompt
 */
export function buildRefinePrompt(
  originalCode: string,
  error: string,
  metadata?: ExcelMetadata
): string {
  let prompt = `之前生成的代码执行出错了，请分析并修复。\n\n`;

  prompt += `## 错误信息\n`;
  prompt += `\`\`\`\n${error}\n\`\`\`\n\n`;

  prompt += `## 原始代码\n`;
  prompt += `\`\`\`python\n${originalCode}\n\`\`\`\n\n`;

  // 如果有元数据，提供数据结构信息
  if (metadata) {
    prompt += `## 数据结构参考\n`;
    prompt += formatSchemaInfo(metadata);
    prompt += `\n`;
  }

  prompt += `## 修复指引\n`;
  prompt += `1. **仔细阅读错误信息**，找出根本原因\n`;
  prompt += `2. **检查列名**：确保使用的列名在上述数据结构中存在\n`;
  prompt += `3. **检查数据类型**：确保操作前进行了正确的类型转换\n`;
  prompt += `4. **简化逻辑**：如果复杂操作出错，尝试更简单的方法\n`;
  prompt += `5. **处理空值**：确保代码能处理空值情况\n\n`;

  prompt += `## 输出格式\n`;
  prompt += `请只返回修复后的完整 JSON，不要额外解释：\n`;
  prompt += `\`\`\`json\n`;
  prompt += `{\n`;
  prompt += `  "explanation": "简要说明修复了什么问题",\n`;
  prompt += `  "code": "修复后的完整Python代码"\n`;
  prompt += `}\n`;
  prompt += `\`\`\`\n`;

  return prompt;
}

/**
 * 构建带工具库注入的代码模板
 *
 * @param userCode 用户生成的代码
 * @returns 完整代码（包含工具库）
 */
export function buildCodeWithTools(userCode: string): string {
  // 这里可以注入预定义工具函数的代码
  // 为了简洁，暂时只添加导入语句
  return `import pandas as pd
import json
import numpy as np
from datetime import datetime

# 用户代码
${userCode}
`;
}

/**
 * 导出便捷函数
 */
export const createPromptBuilder = (config?: Partial<PromptBuilderConfig>) => {
  return {
    build: (metadata: ExcelMetadata, query: string) => buildPromptWithSchema(metadata, query, config),
    refine: (code: string, error: string, meta?: ExcelMetadata) => buildRefinePrompt(code, error, meta)
  };
};
