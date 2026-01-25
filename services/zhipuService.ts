import Anthropic from "@anthropic-ai/sdk";
import { AIProcessResult } from '../types';
import { SAMPLING_CONFIG } from '../config/samplingConfig';
import { APICircuitBreaker } from './infrastructure/degradation';

// 配置智谱AI
const client = new Anthropic({
  apiKey: process.env.ZHIPU_API_KEY || process.env.API_KEY || '',
  baseURL: 'https://open.bigmodel.cn/api/anthropic',
  dangerouslyAllowBrowser: true // 允许在浏览器环境中使用
});

// 创建熔断器实例（单例）
let circuitBreaker: APICircuitBreaker | null = null;

/**
 * 获取熔断器实例
 */
const getCircuitBreaker = (): APICircuitBreaker => {
  if (!circuitBreaker) {
    circuitBreaker = new APICircuitBreaker({
      failureThreshold: 50,    // 50% 失败率触发熔断
      minimumRequests: 5,      // 至少 5 次请求后才开始熔断判断
      openDuration: 30000,     // 熔断持续 30 秒
      halfOpenMaxCalls: 2      // 半开状态允许 2 次测试请求
    });
  }
  return circuitBreaker;
};

export const generateExcelFormula = async (description: string): Promise<string> => {
  try {
    // 分析用户描述中的关键信息
    const keywords = extractKeywords(description);

    const enhancedPrompt = `你是一个专业的Excel公式专家。请根据用户需求生成准确的Excel公式。

**用户需求**: "${description}"

**关键信息识别**: ${keywords.join(', ')}

**要求**:
1. 生成以 = 开头的完整Excel公式
2. 优先使用现代Excel函数（如XLOOKUP, FILTER, SUMIFS等）
3. 确保公式语法正确，函数参数完整
4. 对于复杂条件，使用IF, IFS, CHOOSE等条件函数
5. 对于数据处理，使用TEXT, VALUE, DATE等格式化函数
6. 避免使用过时的函数（如VLOOKUP，除非必要）

**常用函数参考**:
- 查找: XLOOKUP, INDEX-MATCH, VLOOKUP
- 条件: IF, IFS, COUNTIFS, SUMIFS, AVERAGEIFS
- 文本: TEXT, CONCAT, LEFT, RIGHT, MID, FIND, SEARCH
- 日期: DATE, EDATE, EOMONTH, DATEDIF
- 数学: ROUND, INT, MOD, ABS
- 逻辑: AND, OR, NOT, ISBLANK, ISERROR

**示例格式**:
- 条件判断: =IF(A1>100,"高","低")
- 查找匹配: =XLOOKUP(A1, B:B, C:C, "未找到")
- 条件求和: =SUMIFS(A:A, B:B, ">0", C:C, "销售")

请生成最合适的Excel公式，不要包含markdown代码块或解释文字。`;

    const response = await client.messages.create({
      model: "glm-4.6",
      max_tokens: 1500, // 增加token限制以支持复杂公式
      messages: [{
        role: "user",
        content: enhancedPrompt
      }]
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : "";

    // 验证生成的公式
    const formula = text.trim();
    if (!formula.startsWith('=')) {
      throw new Error('生成的公式必须以=开头');
    }

    // 检查公式基本语法
    if (!validateFormula(formula)) {
      throw new Error('生成的公式语法可能有问题');
    }

    return formula;
  } catch (error) {
    console.error("Formula Gen Error:", error);

    // 降级处理：返回一个基本的安全公式
    return generateFallbackFormula(description);
  }
};

// 提取关键词
const extractKeywords = (description: string): string[] => {
  const keywords = [];
  const lowerDesc = description.toLowerCase();

  // 条件判断关键词
  if (lowerDesc.includes('如果') || lowerDesc.includes('判断') || lowerDesc.includes('当')) {
    keywords.push('条件判断');
  }

  // 查找匹配关键词
  if (lowerDesc.includes('查找') || lowerDesc.includes('匹配') || lowerDesc.includes('对应')) {
    keywords.push('查找匹配');
  }

  // 求和计算关键词
  if (lowerDesc.includes('求和') || lowerDesc.includes('总计') || lowerDesc.includes('合计')) {
    keywords.push('求和计算');
  }

  // 计数统计关键词
  if (lowerDesc.includes('计数') || lowerDesc.includes('统计') || lowerDesc.includes('个数')) {
    keywords.push('计数统计');
  }

  // 平均值关键词
  if (lowerDesc.includes('平均') || lowerDesc.includes('均值')) {
    keywords.push('平均值');
  }

  // 日期处理关键词
  if (lowerDesc.includes('日期') || lowerDesc.includes('时间') || lowerDesc.includes('年月日')) {
    keywords.push('日期处理');
  }

  // 文本处理关键词
  if (lowerDesc.includes('文本') || lowerDesc.includes('字符串') || lowerDesc.includes('字符')) {
    keywords.push('文本处理');
  }

  return keywords;
};

// 基本公式验证
const validateFormula = (formula: string): boolean => {
  try {
    // 检查括号匹配
    let openBrackets = 0;
    for (const char of formula) {
      if (char === '(') openBrackets++;
      if (char === ')') openBrackets--;
      if (openBrackets < 0) return false;
    }

    // 检查函数名格式
    const functionPattern = /[A-Z_][A-Z0-9_]*\s*\(/g;
    const functions = formula.match(functionPattern);

    return true;
  } catch (error) {
    return false;
  }
};

// 降级公式生成
const generateFallbackFormula = (description: string): string => {
  const lowerDesc = description.toLowerCase();

  // 基于关键词生成简单公式
  if (lowerDesc.includes('如果') || lowerDesc.includes('判断')) {
    return '=IF(A1>0,"是","否")';
  }

  if (lowerDesc.includes('求和') || lowerDesc.includes('合计')) {
    return '=SUM(A:A)';
  }

  if (lowerDesc.includes('计数') || lowerDesc.includes('个数')) {
    return '=COUNT(A:A)';
  }

  if (lowerDesc.includes('平均')) {
    return '=AVERAGE(A:A)';
  }

  if (lowerDesc.includes('查找') || lowerDesc.includes('匹配')) {
    return '=VLOOKUP(A1,B:C,3,FALSE)';
  }

  // 默认公式
  return '=A1';
};

export const chatWithKnowledgeBase = async (
  query: string,
  history: { role: string; text: string }[],
  contextDocs: string
): Promise<string> => {
  try {
    let systemInstruction = "你是一个专业的财务和审计数据处理助手。请使用中文回答用户的问题。";
    if (contextDocs) {
      systemInstruction += `\n\n请参考以下知识库内容来回答问题：\n${contextDocs}`;
    }

    // 转换历史记录格式（取最近10条）
    const messages: any[] = [];

    // 添加系统指令
    messages.push({
      role: "user",
      content: systemInstruction
    });

    // 添加历史对话
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    }

    // 添加当前问题
    messages.push({
      role: 'user',
      content: query
    });

    const response = await client.messages.create({
      model: "glm-4.6",
      max_tokens: 4096,
      messages: messages
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : "";
    return text || "我无法生成回答。";
  } catch (error) {
    console.error("Chat Error:", error);
    return "抱歉，连接 AI 服务时出现错误。";
  }
};

/**
 * 清理AI生成的Python代码
 *
 * 优化策略（Phase 1）：
 * - 移除过度修复逻辑
 * - 只保留必要的清理
 * - 避免破坏正确的代码
 */
const sanitizeGeneratedCode = (code: string): string => {
  if (!code) return '';

  let sanitized = code;

  // 1. 移除markdown代码块标记（如果有残留）
  sanitized = sanitized.replace(/^```python\s*\n?/i, '').replace(/```\s*$/, '');
  sanitized = sanitized.replace(/^```json\s*\n?/i, '').replace(/```\s*$/, '');

  // 2. 清理多余的连续空行（最多保留2个）
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // 3. 移除行尾空格
  sanitized = sanitized.replace(/[ \t]+$/gm, '');

  // 4. 确保文件末尾有换行
  if (sanitized && !sanitized.endsWith('\n')) {
    sanitized += '\n';
  }

  // ⚠️ 不再进行以下过度修复：
  // - 不修改缩进（可能破坏代码逻辑）
  // - 不添加/删除括号（可能破坏语法）
  // - 不修改变量名
  // - 不添加类型注解（Python不需要）

  return sanitized.trim();
};

/**
 * 生成 Python 代码来处理数据集
 * 支持 'Observe-Think-Action' 循环
 * 支持多sheet数据处理
 */
export const generateDataProcessingCode = async (
  userPrompt: string,
  filesPreview: ({ fileName: string; headers: string[]; sampleRows: any[]; metadata?: any } & {
    currentSheetName?: string;
    sheets?: { [sheetName: string]: {
      headers: string[];
      sampleRows: any[];
      rowCount: number;
      metadata?: any;
    }};
  })[]
): Promise<AIProcessResult> => {
  const breaker = getCircuitBreaker();
  const startTime = Date.now();

  // 检查熔断器状态
  if (!breaker.allowRequest()) {
    console.warn('[zhipuService] Circuit breaker is OPEN, using fallback');
    return {
      code: "",
      explanation: "AI 服务暂时不可用，请稍后重试。熔断器已开启，请等待系统自动恢复。"
    };
  }

  try {
    // 构建观察上下文
    const fileObservationStr = filesPreview.map(f => {
      let context = `--- FILE: "${f.fileName}" ---\n`;

      // 检查是否有多sheet信息
      if (f.sheets && Object.keys(f.sheets).length > 1) {
        context += `📊 MULTIPLE SHEETS DETECTED (${Object.keys(f.sheets).length} sheets):\n`;

        // 列出所有sheets的基本信息
        Object.entries(f.sheets).forEach(([sheetName, sheetInfo]) => {
          const isCurrentSheet = sheetName === f.currentSheetName;
          context += `  ${isCurrentSheet ? '→' : ' '} Sheet "${sheetName}": ${sheetInfo.rowCount} rows, columns: ${sheetInfo.headers.join(', ')}\n`;
        });

        context += `\n`;

        // 显示当前活动sheet的详细数据
        const currentSheetInfo = f.sheets[f.currentSheetName || ''];
        if (currentSheetInfo) {
          context += `📄 CURRENT SHEET: "${f.currentSheetName}"\n`;
          context += `HEADERS: ${JSON.stringify(currentSheetInfo.headers)}\n`;
          context += `SAMPLE DATA (Top 5 rows):\n${JSON.stringify(currentSheetInfo.sampleRows)}\n\n`;

          // 添加元数据信息（注释和标注）
          if (currentSheetInfo.metadata && currentSheetInfo.metadata.comments && Object.keys(currentSheetInfo.metadata.comments).length > 0) {
            const commentEntries = Object.entries(currentSheetInfo.metadata.comments);
            context += `📝 单元格注释 (${commentEntries.length}个) - 重要审计信息:\n`;
            commentEntries.slice(0, SAMPLING_CONFIG.METADATA_EXTRACTION.DISPLAY_LIMIT).forEach(([cell, text]) => {
              context += `  ${cell}: ${text}\n`;
            });
            if (commentEntries.length > SAMPLING_CONFIG.METADATA_EXTRACTION.DISPLAY_LIMIT) {
              context += `  ... 还有 ${commentEntries.length - SAMPLING_CONFIG.METADATA_EXTRACTION.DISPLAY_LIMIT} 个注释\n`;
            }
          }

          if (currentSheetInfo.metadata && currentSheetInfo.metadata.notes && Object.keys(currentSheetInfo.metadata.notes).length > 0) {
            const noteEntries = Object.entries(currentSheetInfo.metadata.notes);
            context += `\n📌 单元格标注 (${noteEntries.length}个):\n`;
            noteEntries.slice(0, SAMPLING_CONFIG.METADATA_EXTRACTION.DISPLAY_LIMIT).forEach(([cell, text]) => {
              context += `  ${cell}: ${text}\n`;
            });
            if (noteEntries.length > SAMPLING_CONFIG.METADATA_EXTRACTION.DISPLAY_LIMIT) {
              context += `  ... 还有 ${noteEntries.length - SAMPLING_CONFIG.METADATA_EXTRACTION.DISPLAY_LIMIT} 个标注\n`;
            }
          }
        }

        // 显示其他sheets的样本数据
        Object.entries(f.sheets).forEach(([sheetName, sheetInfo]) => {
          if (sheetName !== f.currentSheetName) {
            context += `\n📄 SHEET: "${sheetName}"\n`;
            context += `HEADERS: ${JSON.stringify(sheetInfo.headers)}\n`;
            context += `SAMPLE DATA (Top 5 rows):\n${JSON.stringify(sheetInfo.sampleRows)}\n`;
          }
        });
      } else {
        // 单sheet模式（向后兼容）
        context += `HEADERS: ${JSON.stringify(f.headers)}\n`;
        context += `SAMPLE DATA (Top 5 rows - OBSERVE THESE TO IDENTIFY COLUMNS):\n${JSON.stringify(f.sampleRows)}\n`;

        // 添加元数据信息（注释和标注）
        if (f.metadata && f.metadata.comments && Object.keys(f.metadata.comments).length > 0) {
          const commentEntries = Object.entries(f.metadata.comments);
          context += `\n📝 单元格注释 (${commentEntries.length}个) - 重要审计信息:\n`;
          commentEntries.slice(0, SAMPLING_CONFIG.METADATA_EXTRACTION.DISPLAY_LIMIT).forEach(([cell, text]) => {
            context += `  ${cell}: ${text}\n`;
          });
          if (commentEntries.length > SAMPLING_CONFIG.METADATA_EXTRACTION.DISPLAY_LIMIT) {
            context += `  ... 还有 ${commentEntries.length - SAMPLING_CONFIG.METADATA_EXTRACTION.DISPLAY_LIMIT} 个注释\n`;
          }
        }

        if (f.metadata && f.metadata.notes && Object.keys(f.metadata.notes).length > 0) {
          const noteEntries = Object.entries(f.metadata.notes);
          context += `\n📌 单元格标注 (${noteEntries.length}个):\n`;
          noteEntries.slice(0, SAMPLING_CONFIG.METADATA_EXTRACTION.DISPLAY_LIMIT).forEach(([cell, text]) => {
            context += `  ${cell}: ${text}\n`;
          });
          if (noteEntries.length > SAMPLING_CONFIG.METADATA_EXTRACTION.DISPLAY_LIMIT) {
            context += `  ... 还有 ${noteEntries.length - SAMPLING_CONFIG.METADATA_EXTRACTION.DISPLAY_LIMIT} 个标注\n`;
          }
        }
      }

      return context;
    }).join('\n\n');

    const systemInstruction = `
你是一个高级财务审计数据处理智能体。你的运行环境是 Python 3.x。
你需要执行 [Observe - Think - Action] 的循环来处理用户任务。

**特别注意**: 单元格注释和标注是审计工作的重要信息源！
- 注释可能包含：审批意见、数据来源、异常说明、计算依据等
- 标注可能包含：重要提醒、风险提示、合规说明等
- 在处理数据时，务必考虑这些元数据信息

**🆕 多Sheet支持**:
- 现在支持处理Excel文件中的多个sheets
- 当文件包含多个sheets时，files 字典的值将是嵌套字典
- 格式: files['文件名.xlsx'] = {"Sheet1": [...], "Sheet2": [...], ...}
- 当文件只有一个sheet时，格式保持不变: files['文件名.xlsx'] = [...]
- 你可以访问特定sheet的数据: files['文件名.xlsx']['Sheet2']
- 如果需要跨sheet操作，可以这样: sheet1 = files['文件名.xlsx']['Sheet1']

**Phase 1: OBSERVE (观察)**
你拥有以下文件的样本数据。请仔细阅读样本数据的内容，而不仅仅是列头。
${fileObservationStr}

**Phase 2: THINK (思考)**
1. 分析用户需求。
2. **关键步骤**: 在不同文件中寻找对应列。
   - 不要盲目假设列名（例如不要假设名字一定在 'A' 列）。
   - *必须* 根据样本数据的内容来推断。例如：如果用户说"排除名单"，请在文件样本中寻找包含人名的那一列（可能是 "name", "姓名", "employee_id" 等）。
   - 如果需要跨文件匹配（例如 "File A 中的人名不在 File B 中"），请确保你找到了两个文件中内容格式一致的列（例如都是 "张三" 格式，而不是一个 "张三" 一个 "ID:123"）。
3. 规划数据转换逻辑。
4. **多Sheet场景**: 如果用户提到"使用Sheet2"或"从另一个sheet"，注意识别和处理。

**Phase 3: ACTION (行动/代码生成)**
生成一段 Python 代码来执行任务。

**输入数据结构**:
变量 files 是一个字典。Key 是文件名，Value 根据sheet数量而定：
- 单sheet: Value 是字典列表，例如 files['data.xlsx'] 是一个字典列表
- 多sheet: Value 是包含所有sheets的嵌套字典，例如 files['data.xlsx'] = {"Sheet1": [...], "Sheet2": [...]}

**代码编写规则**:
1. 使用 Python 3 语法
2. **Robust Matching**: 字符串比较时，建议使用 str().strip()
3. **Direct Manipulation**: 直接修改 files 字典或添加新的 Key (新文件)
4. **MUST RETURN**: 代码的最后必须是输出（不需要return语句，直接使用print输出JSON）
5. **可用库**: 可以使用 pandas (import pandas as pd) 进行数据处理
6. **变量声明**: Python 动态类型，无需声明类型
7. **Error Handling**: 在可能出错的地方使用 try-except

**强制要求**:
- 代码必须输出处理后的 files 字典的JSON表示
- 使用 print(json.dumps(files, ensure_ascii=False, default=str)) 输出结果
- 如果创建新文件，格式为: files['新文件名.xlsx'] = newData
- 确保处理后的数据是列表格式或嵌套字典格式（多sheet时）

**多Sheet操作示例**:
# 访问特定sheet
data = files['文件.xlsx']['Sheet2']

# 跨sheet关联
sheet1 = files['文件.xlsx']['Sheet1']
sheet2 = files['文件.xlsx']['Sheet2']

# 更新特定sheet
files['文件.xlsx']['Sheet1'] = new_data

# 创建多sheet结果
files['结果.xlsx'] = {
    '汇总': summary_data,
    '明细': detail_data
}

**Pandas使用示例**:
import pandas as pd
import json

# 将字典列表转为DataFrame
df = pd.DataFrame(files['data.xlsx'])

# 数据处理
filtered = df[df['金额'] > 1000]

# 转回字典列表
files['result.xlsx'] = filtered.to_dict('records')

**输出JSON示例**:
import json
print(json.dumps(files, ensure_ascii=False, default=str))

**重要输出要求**:
- 必须输出纯净的JSON格式，不要包含任何Markdown标记
- 不要使用反引号json或反引号标记
- 直接输出JSON对象，格式如下：

{"explanation": "你的思考过程。明确说明：你识别出 File A 的 '某列' 对应 File B 的 '某列'，并计划如何处理。", "code": "你的 Python 代码字符串"}
`;

    console.log('[AI Service] Sending request to AI...');
    console.log('[AI Service] User prompt:', userPrompt);
    console.log('[AI Service] Files count:', filesPreview.length);

    const response = await client.messages.create({
      model: "glm-4.6",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `${systemInstruction}\n\n用户任务：${userPrompt}`
      }]
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : "";
    if (!text) throw new Error("No response from AI");

    console.log('[AI Service] Raw AI response length:', text.length);
    console.log('[AI Service] Raw AI response:', text);

    // 清理和解析JSON响应
    let result: AIProcessResult;
    try {
      // 1. 移除可能的代码块标记
      let cleanText = text.trim();

      // 2. 处理 ```json ... ``` 格式
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      }
      // 3. 处理 ``` ... ``` 格式
      else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      // 4. 查找JSON对象开始和结束位置
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
      }

      // 5. 解析JSON
      result = JSON.parse(cleanText);

      console.log('[AI Service] Parsed result explanation:', result.explanation);
      console.log('[AI Service] Parsed result code length:', result.code?.length || 0);
      console.log('[AI Service] Parsed result code (BEFORE cleanup):', result.code);

      // 6. 清理代码中的语法问题
      result.code = sanitizeGeneratedCode(result.code);

      console.log('[AI Service] Parsed result code (AFTER cleanup):', result.code);

    } catch (parseError) {
      console.warn('JSON解析失败，尝试从文本中提取内容:', parseError);

      // 尝试手动解析
      try {
        let explanation = '';
        let code = '';

        // 提取 explanation
        const expMatch = text.match(/"explanation"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        if (expMatch) {
          explanation = expMatch[1].replace(/\\"/g, '"');
        } else {
          // 如果找不到格式化的explanation，使用前几行作为解释
          const lines = text.split('\n').filter(line => line.trim());
          explanation = lines.slice(0, 3).join(' ').substring(0, 200);
        }

        // 提取 code
        const codeMatch = text.match(/"code"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        if (codeMatch) {
          code = codeMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
        } else {
          // 如果找不到格式化的code，尝试提取代码块
          const codeBlockMatch = text.match(/```(?:python|javascript|js)?\s*\n([\s\S]*?)\n```/);
          if (codeBlockMatch) {
            code = codeBlockMatch[1];
          } else {
            code = "# AI 响应解析失败，请重试";
          }
        }

        // 清理代码中的语法问题
        code = sanitizeGeneratedCode(code);
        console.log('[AI Service] Manual parse - sanitized code:', code);

        result = {
          explanation: explanation || "AI 响应格式解析失败，原始响应：" + text.substring(0, 200) + "...",
          code: code
        };

      } catch (manualParseError) {
        // 如果手动解析也失败，创建基本响应
        result = {
          explanation: "AI 响应格式解析失败，原始响应：" + text.substring(0, 200) + "...",
          code: "// AI 响应解析失败，请重试"
        };
      }
    }

    // 记录成功到熔断器
    const duration = Date.now() - startTime;
    breaker.recordCall(true, duration);

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("Code Gen Error:", error);

    // 记录失败到熔断器
    breaker.recordCall(false, duration);

    return {
      code: "",
      explanation: "理解指令失败，AI 无法分析样本数据，请检查文件格式或重试。"
    };
  }
};