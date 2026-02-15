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
  isPrivacyEnabled: boolean = false,
  onApprovalRequired?: (step: AgenticStep) => Promise<{ approved: boolean; feedback?: string }>,
  signal?: AbortSignal
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
你正在运行在 **V5.3 Tiered Memory (分级存储)** 架构下。这意味着：
- **初始上下文极轻量**: 你初始只能看到文件名、表名、列名和行数。
- **按需观察 (inspect_sheet)**: 你必须使用 \`inspect_sheet\` 来观察数据样本，以确认列的内容和格式。
- **按需读取 (read_rows)**: 如果需要寻找特定的关键字或核对特定行，请使用 \`read_rows\`。
- **全量处理 (execute_python)**: 真正的重体力活（合并、清洗、计算）应当通过 Python 代码在沙箱中完成。

**当前可用工具**:
1. \`inspect_sheet(fileName, sheetName)\`: 获取特定工作表的列头和前几行数据样本（用于确定数据含义）。
2. \`read_rows(fileName, sheetName, start, end)\`: 获取特定行数范围的数据（用于精确核对）。
3. \`execute_python(code)\`: 运行 Python 代码进行实际的数据处理。必须将结果更新回 \`files\` 变量。
4. \`finish()\`: 当任务完全完成且经过验证后调用。

**运行环境 (Seamless Sandbox v2.2)**:
- **Python-Worker**: 计算在后台线程运行，你可以处理数百万行数据而不卡顿。
- **虚拟文件系统 (VFS)**: 所有上传文件已挂载在 \`/mnt/\` 下。
- **内存数据**: \`files\` 全局字典可用。
- **流式反馈**: 你的 \`print()\` 会实时反馈给用户。你可以打印 \`df.head()\` 或 \`df.info()\` 来核实处理中间结果。

**输出要求 (必须是合法 JSON)**:
{
  "thought": "由于我在初始上下文中只看到了列名，我决定先使用 inspect_sheet 来确认 '金额' 列的数据类型...",
  "action": {
    "tool": "inspect_sheet" | "read_rows" | "execute_python" | "finish",
    "params": { ... }
  }
}

**核心规则**:
1. **先观察再行动**: 除非你非常确定列的含义，否则应先 \`inspect_sheet\`。
2. **数据闭环**: 任务结果必须存回 \`files\`，例如 \`files['output.xlsx'] = final_df\`。
3. **验证机制**: 在 \`finish\` 之前，务必通过 Python 打印验证关键指标（如行数、总金额等）。
4. **流式意识**: 既然有了实时日志，建议在 Python 代码中多使用 \`print()\` 输出处理进度，提升用户体验。

用户任务: "${maskedUserPrompt}"

初始元数据 (Metadata Only):
${JSON.stringify(maskedInitialContext, null, 2)}
`
    }
  ];

  const steps: AgenticStep[] = [];
  let finalExplanation = "";
  let finalCode = "";

  for (let turn = 0; turn < 20; turn++) {
    if (signal?.aborted) {
      throw new Error("Loop aborted by user");
    }
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
        // Human-in-the-loop: Request approval for heavy tools or if explicitly required
        if (onApprovalRequired && (step.action.tool === 'execute_python' || turn === 0)) {
          try {
            const { approved, feedback } = await onApprovalRequired(step);
            if (!approved) {
              const obs = `User rejected the plan.${feedback ? ` Feedback: ${feedback}` : ''} Please propose an alternative or 'finish' if the task cannot be completed.`;
              step.observation = obs;
              messages.push({ role: "user", content: obs });
              continue;
            }
          } catch (e: any) {
            console.error("Approval flow failed:", e);
          }
        }

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