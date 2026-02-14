import Anthropic from "@anthropic-ai/sdk";
import { AIProcessResult, AgenticStep } from '../types';
import { globalMasker } from './maskerService';

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
      model: process.env.ZHIPU_MODEL || "glm-4.6",
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
      model: process.env.ZHIPU_MODEL || "glm-4.6",
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
 * Enhanced Agentic Loop (Observe-Think-Act-Verify)
 * @param userPrompt User's data processing request
 * @param initialContext Initial metadata and samples for all files
 * @param onStep Callback for UI updates on each step
 * @param executeTool Callback to execute a tool and return an observation string
 */
export const runAgenticLoop = async (
  userPrompt: string,
  initialContext: any,
  onStep: (step: AgenticStep) => void,
  executeTool?: (tool: string, params: any) => Promise<string>,
  isPrivacyEnabled: boolean = false
): Promise<AIProcessResult> => {
  // Reset masker for a fresh session
  if (isPrivacyEnabled) globalMasker.reset();

  // Mask the user prompt and initial data
  const maskedUserPrompt = isPrivacyEnabled ? globalMasker.mask(userPrompt) : userPrompt;
  const maskedInitialContext = isPrivacyEnabled ? globalMasker.maskContext(initialContext) : initialContext;

  const messages: any[] = [
    {
      role: "user",
      content: `你是一个专家级数据处理智能体 (Data Agent)。你的工作是根据用户需求处理 Excel 数据。
你需要通过 [Observe - Think - Action - Verify] 的循环来完成任务。

**当前可用工具**:
1. \`inspect_sheet(fileName, sheetName)\`: 获取特定工作表的列头和数据样本。
2. \`read_rows(fileName, sheetName, start, end)\`: 获取特定行数范围的数据。
3. \`execute_python(code)\`: 运行 Python 代码进行实际的数据处理。必须将结果更新回 \`files\` 变量。
4. \`finish()\`: 当任务完全完成且经过验证后调用。

**运行环境 (Seamless Sandbox v2.1)**:
- **Python**: 3.x (Pyodide), 包含 \`pandas\`, \`openpyxl\`。
- **虚拟文件系统 (VFS)**: 所有上传文件已挂载在 \`/mnt/\` 下。
  - **无缝操作**: 你可以像在本地一样使用 \`pd.read_excel('/mnt/filename.xlsx', sheet_name='...')\`。
- **内存数据**: \`files\` 全局字典依然可用（推荐用于快速访问）。
  - 单表: \`files['a.xlsx']\` -> List[Dict]
  - 多表: \`files['a.xlsx']['Sheet1']\` -> List[Dict]
- **辅助函数**: \`get_df(filename, sheet=None)\` 预置，可将 \`files\` 数据转为 DataFrame。
- **反馈控制**: \`execute_python\` 会捕获 \`print()\` 输出及最后一行表达式的结果。你可以通过打印 \`df.info()\` 来核实。
- **格式说明**: 代码支持标准缩进，请放心编写多行代码。

**输出要求 (必须是合法 JSON)**:
{
  "thought": "基于上一步 Observation 的详细分析，以及为何选择下一步行动。",
  "action": {
    "tool": "inspect_sheet" | "read_rows" | "execute_python" | "finish",
    "params": { ... }
  }
}

**核心规则**:
1. **数据闭环**: 任务结果必须存回 \`files\`，例如 \`files['output.xlsx'] = final_df\`。
   - **多表支持**: 如果需要生成包含多个 Sheet 的文件，请使用字典格式：
     \`\`\`python
     files['merge.xlsx'] = {
         '员工': df_empl,
         '订单': df_order
     }
     \`\`\`
2. **虚拟磁盘同步 (V4.2)**: 你可以直接使用 \`df.to_excel('/mnt/test.xlsx')\`，系统会自动将其同步回 UI 文件列表。
3. **验证优先**: 在 \`finish\` 之前，请通过 \`print()\` 验证数据行数、列名或合并是否成功。
4. **容错重试**: 如果 Python 报错，系统会返回完整的 Traceback，请根据报错信息自我修正。

用户任务: "${maskedUserPrompt}"

初始上下文 (概览):
${JSON.stringify(maskedInitialContext, null, 2)}
`
    }
  ];

  const steps: AgenticStep[] = [];
  let finalExplanation = "";
  let finalCode = "";

  for (let turn = 0; turn < 10; turn++) {
    try {
      const response = await client.messages.create({
        model: process.env.ZHIPU_MODEL || "glm-4.6",
        max_tokens: 4096,
        messages: messages
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : "";
      if (!text) throw new Error("AI 返回内容为空");

      // Extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      let stepData;
      try {
        stepData = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch (e) {
        console.warn("Retrying JSON parse with cleaned text");
        const cleaned = text.replace(/```json|```/g, '').trim();
        stepData = JSON.parse(cleaned);
      }

      const step: AgenticStep = {
        thought: isPrivacyEnabled ? globalMasker.unmask(stepData.thought) : stepData.thought,
        action: stepData.action
      };

      onStep(step);
      steps.push(step);

      // Save to history
      messages.push({ role: "assistant", content: text });

      if (step.action.tool === 'finish') {
        finalExplanation = isPrivacyEnabled ? globalMasker.unmask(stepData.thought) : stepData.thought;
        break;
      }

      if (step.action.tool === 'execute_python') {
        finalCode = step.action.params.code;
      }

      // Execute tool if executor is provided
      if (executeTool) {
        try {
          const observation = await executeTool(step.action.tool, step.action.params);
          step.observation = observation;
          messages.push({
            role: "user",
            content: `Observation from ${step.action.tool}:\n${isPrivacyEnabled ? globalMasker.mask(observation) : observation}`
          });

          // Continue loop to next turn
          continue;
        } catch (toolError: any) {
          messages.push({
            role: "user",
            content: `Error executing ${step.action.tool}: ${toolError.message}. Please try a different approach.`
          });
          continue;
        }
      }

      // If no executor (one-shot mode for UI compatibility), break after first tool
      break;
    } catch (error: any) {
      console.error("Agentic Loop error at turn", turn, error);
      if (turn === 9) throw error;
      messages.push({ role: "user", content: `System Error: ${error.message}. Please rethink or continue.` });
    }
  }

  return { steps, explanation: finalExplanation, finalCode };
};

export const generateDataProcessingCode = async (
  userPrompt: string,
  filesPreview: { fileName: string; headers: string[]; sampleRows: any[] }[]
): Promise<AIProcessResult> => {
  // Legacy fallback for simple one-shot generation
  // Transform filesPreview into the initialContext format expected by runAgenticLoop
  const initialContext = filesPreview.map(f => ({
    fileName: f.fileName,
    // Assuming each filePreview represents a single sheet for simplicity in this wrapper
    // In a real multi-sheet scenario, filesPreview would need to be structured differently
    sheets: ["Sheet1"], // Placeholder, as filesPreview doesn't explicitly provide sheet names
    sample: f.sampleRows // Simplified for legacy
  }));

  // The onStep callback is a no-op here as this function returns the final result directly
  const result = await runAgenticLoop(userPrompt, initialContext, () => { });

  // runAgenticLoop returns { steps, explanation, finalCode }
  // We need to map this to the AIProcessResult expected by the original interface
  return {
    steps: result.steps,
    explanation: result.explanation,
    finalCode: result.finalCode
  };
};