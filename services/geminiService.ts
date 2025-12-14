import { GoogleGenAI } from "@google/genai";
import { AIProcessResult } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateExcelFormula = async (description: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: `你是一个 Excel 公式生成专家。
      用户需求: "${description}"。
      请只返回以 = 开头的 Excel 公式。不要包含 markdown 代码块或任何解释文字。`,
    });
    return response.text?.trim() || "生成公式失败";
  } catch (error) {
    console.error("Formula Gen Error:", error);
    return "=ERROR()";
  }
};

export const chatWithKnowledgeBase = async (
  query: string,
  history: { role: string; text: string }[],
  contextDocs: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    let systemInstruction = "你是一个专业的财务和审计数据处理助手。请使用中文回答用户的问题。";
    if (contextDocs) {
      systemInstruction += `\n\n请参考以下知识库内容来回答问题：\n${contextDocs}`;
    }

    const contents = history.slice(-10).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: query }]
    });

    const response = await ai.models.generateContent({
      model,
      config: { systemInstruction },
      contents: contents,
    });

    return response.text || "我无法生成回答。";
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
  filesPreview: { fileName: string; headers: string[]; sampleRows: any[] }[]
): Promise<AIProcessResult> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // Construct a rich observation context
    const fileObservationStr = filesPreview.map(f => 
      `--- FILE: "${f.fileName}" ---
       HEADERS: ${JSON.stringify(f.headers)}
       SAMPLE DATA (Top 5 rows - OBSERVE THESE TO IDENTIFY COLUMNS): 
       ${JSON.stringify(f.sampleRows)}
       `
    ).join('\n\n');

    const systemInstruction = `
      你是一个高级数据处理智能体 (Data Engineer Agent)。你的运行环境是浏览器的 Web Worker (JavaScript)。
      你需要执行 [Observe - Think - Action] 的循环来处理用户任务。

      **Phase 1: OBSERVE (观察)**
      你拥有以下文件的样本数据。请仔细阅读样本数据的内容，而不仅仅是列头。
      ${fileObservationStr}

      **Phase 2: THINK (思考)**
      1. 分析用户需求。
      2. **关键步骤**: 在不同文件中寻找对应列。
         - 不要盲目假设列名（例如不要假设名字一定在 'A' 列）。
         - *必须* 根据样本数据的内容来推断。例如：如果用户说“排除名单”，请在文件样本中寻找包含人名的那一列（可能是 "name", "姓名", "employee_id" 等）。
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
      3. **Return**: 必须 \`return files;\`。
      4. **No External Libs**: 只能使用原生 JS (ES6+)。
      5. **Safety**: 代码只包含函数体，不要包含 \`function() {}\` 包裹。

      **输出格式 (JSON)**:
      {
        "explanation": "你的思考过程。明确说明：你识别出 File A 的 '某列' 对应 File B 的 '某列'，并计划如何处理。",
        "code": "你的 JavaScript 代码字符串"
      }
    `;

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const result = JSON.parse(text) as AIProcessResult;
    return result;

  } catch (error) {
    console.error("Code Gen Error:", error);
    return {
      code: "",
      explanation: "理解指令失败，AI 无法分析样本数据，请检查文件格式或重试。"
    };
  }
};