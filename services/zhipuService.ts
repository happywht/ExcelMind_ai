import Anthropic from "@anthropic-ai/sdk";
import { AIProcessResult } from '../types';

// 配置智谱AI
const client = new Anthropic({
  apiKey: process.env.ZHIPU_API_KEY || process.env.API_KEY || '',
  baseURL: 'https://open.bigmodel.cn/api/anthropic',
  dangerouslyAllowBrowser: true // 允许在浏览器环境中使用
});

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
 * Generates JavaScript code to transform the dataset based on user prompt.
 * Now supports 'Observe-Think-Action' loop by receiving sample data.
 */
export const generateDataProcessingCode = async (
  userPrompt: string,
  filesPreview: { fileName: string; headers: string[]; sampleRows: any[]; metadata?: any }[]
): Promise<AIProcessResult> => {
  try {
    // Construct a rich observation context
    const fileObservationStr = filesPreview.map(f => {
      let context = `--- FILE: "${f.fileName}" ---\n`;
      context += `HEADERS: ${JSON.stringify(f.headers)}\n`;
      context += `SAMPLE DATA (Top 5 rows - OBSERVE THESE TO IDENTIFY COLUMNS):\n${JSON.stringify(f.sampleRows)}\n`;

      // 添加元数据信息（注释和标注）- 这些在审计中很重要！
      if (f.metadata && f.metadata.comments && Object.keys(f.metadata.comments).length > 0) {
        const commentEntries = Object.entries(f.metadata.comments);
        context += `\n📝 单元格注释 (${commentEntries.length}个) - 重要审计信息:\n`;
        commentEntries.slice(0, 10).forEach(([cell, text]) => {
          context += `  ${cell}: ${text}\n`;
        });
        if (commentEntries.length > 10) {
          context += `  ... 还有 ${commentEntries.length - 10} 个注释\n`;
        }
      }

      if (f.metadata && f.metadata.notes && Object.keys(f.metadata.notes).length > 0) {
        const noteEntries = Object.entries(f.metadata.notes);
        context += `\n📌 单元格标注 (${noteEntries.length}个):\n`;
        noteEntries.slice(0, 10).forEach(([cell, text]) => {
          context += `  ${cell}: ${text}\n`;
        });
        if (noteEntries.length > 10) {
          context += `  ... 还有 ${noteEntries.length - 10} 个标注\n`;
        }
      }

      return context;
    }).join('\n\n');

    const systemInstruction = `
      你是一个高级财务审计数据处理智能体。你的运行环境是浏览器的 Web Worker (JavaScript)。
      你需要执行 [Observe - Think - Action] 的循环来处理用户任务。

      **特别注意**: 单元格注释和标注是审计工作的重要信息源！
      - 注释可能包含：审批意见、数据来源、异常说明、计算依据等
      - 标注可能包含：重要提醒、风险提示、合规说明等
      - 在处理数据时，务必考虑这些元数据信息

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

      **Phase 3: ACTION (行动/代码生成)**
      生成一段 JavaScript 代码来执行任务。

      **输入数据结构**:
      变量 \`files\` 是一个对象。 Key 是文件名，Value 是数据数组。
      例如: \`files['data.xlsx']\` 是一个对象数组。

      **代码编写规则**:
      1. **Robust Matching**: 字符串比较时，建议使用 \`.toString().trim()\`, 甚至在必要时匹配前需要归一化。
      2. **Direct Manipulation**: 直接修改 \`files\` 对象或添加新的 Key (新文件)。
      3. **MUST RETURN**: 代码的最后一句必须是 \`return files;\`，确保返回修改后的数据。
      4. **No External Libs**: 只能使用原生 JS (ES6+)。
      5. **Safety**: 代码只包含函数体，不要包含 \`function() {}\` 包裹。
      6. **Error Handling**: 在可能出错的地方使用 try-catch，但仍然要 return files。
      7. **变量声明**: 使用 let/const 而不是 var。

      **强制要求**:
      - 代码必须以 \`return files;\` 结尾
      - 如果创建新文件，格式必须为: \`files['新文件名.xlsx'] = newData;\`
      - 确保处理后的数据是数组格式
      - **重要**: 不要使用反引号 (\`) 或模板字符串语法
      - 使用普通引号 ("" 或 '') 而非模板字符串
      - 避免在字符串中使用未转义的特殊字符

      **重要输出要求**:
      - 必须输出纯净的JSON格式，不要包含任何Markdown标记
      - 不要使用反引号json或反引号标记
      - 直接输出JSON对象，格式如下：

      {"explanation": "你的思考过程。明确说明：你识别出 File A 的 '某列' 对应 File B 的 '某列'，并计划如何处理。", "code": "你的 JavaScript 代码字符串"}
    `;

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
          const codeBlockMatch = text.match(/```(?:javascript|js)?\s*\n([\s\S]*?)\n```/);
          if (codeBlockMatch) {
            code = codeBlockMatch[1];
          } else {
            code = "// AI 响应解析失败，请重试";
          }
        }

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

    return result;

  } catch (error) {
    console.error("Code Gen Error:", error);
    return {
      code: "",
      explanation: "理解指令失败，AI 无法分析样本数据，请检查文件格式或重试。"
    };
  }
};