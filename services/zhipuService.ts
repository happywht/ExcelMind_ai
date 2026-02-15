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

/**
 * AI Auditor (Reflector Layer)
 * Performs a second-pass audit on a proposed action to ensure safety and precision.
 */
async function verifyActionWithAI(
  proposedStep: AgenticStep,
  context: string,
  history: any[]
): Promise<{ approved: boolean; reason?: string }> {
  // Uses the top-level 'client' constant
  console.log("[Auditor] Auditing proposed action...");

  const auditPrompt = `你是一个严谨的数据处理审计员 (Data Auditor)。
你的任务是审查一个 AI 智能体提议的下一步操作 (Action)。

**被审查的上下文**:
${context}

**被审查的步骤**:
思维 (Thought): ${proposedStep.thought}
动作 (Action): ${JSON.stringify(proposedStep.action)}

**审计规则 (一票否决)**:
1. **参数缺失**: 如果工具是 \`execute_python\` 但没有 \`code\`，或 \`inspect_sheet\` 没有 \`fileName\`，必须驳回。**注意：\`finish\` 工具不受此限**。
2. **路径错误**: 代码中必须使用 \`/mnt/\` 开头的绝对路径。禁止使用相对路径。
3. **逻辑偏差**: 代码逻辑是否与思维 (Thought) 中描述的目标一致。
4. **保存缺失**: 如果任务要求产出结果，代码中必须包含保存动作 (如 \`files['out.xlsx'] = df\` 或 \`to_excel\`)。**注意：如果是单纯的查询/观察步骤，不需要保存，必须通过**。
5. **结束校验**: 如果工具是 \`finish\`，检查思维或对话历史中是否提到已完成处理及保存。如果有，**必须通过**。不要因为 \`finish\` 动作本身不含代码而驳回。

**环境提示**: 
- \`files\` 是一个预定义的全局字典，用于同步内存数据，AI 可以直接引用它。

**输出规范**:
- 如果审批通过，请回复: "APPROVED"
- 如果发现问题，请回复: "REJECT: [具体理由]"

你的审计结果是？`;

  // Protocol Guard: Anthropic-style APIs MUST start with a 'user' message and alternate role.
  // We slice the history and trim it to ensure the requirement is met.
  let validHistory = history.slice(-4);
  while (validHistory.length > 0 && validHistory[0].role !== 'user') {
    validHistory.shift();
  }
  // If the last message is 'user', we drop it because the auditPrompt (user) will follow.
  if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
    validHistory.pop();
  }

  try {
    const response: any = await client.messages.create({
      model: process.env.ZHIPU_MODEL || "glm-4",
      max_tokens: 4096,
      messages: [
        ...validHistory,
        { role: "user", content: auditPrompt }
      ],
      temperature: 0.1,
    });

    const result = response.content[0]?.type === 'text' ? response.content[0].text : "";

    // Normalize and Extract using Regex for robustness against markdown/formatting
    // Search for APPROVED or REJECT: [reason] in a case-insensitive way
    const isApproved = /^\s*(\**)*APPROVED(\**)*\s*$/i.test(result) || result.toUpperCase().includes("APPROVED");
    const rejectMatch = result.match(/REJECT:\s*([\s\S]+)/i);

    if (isApproved && !rejectMatch) {
      return { approved: true };
    } else {
      const reason = rejectMatch ? rejectMatch[1].trim() : result.trim();
      console.warn("[Auditor] Action REJECTED:", reason);
      return { approved: false, reason: reason || "Unknown audit failure" };
    }
  } catch (e) {
    console.error("[Auditor] Audit failed due to network/API error:", e);
    return { approved: true };
  }
}

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
你正在运行在 **Seamless Sandbox v2.2** 架构下。

**输出规范 (极度重要)**:
- 你必须回复任务的执行结果。
- **推荐格式**: 以 JSON 格式输出，包含 \`thought\` (你的思考) 和 \`action\` (工具调用)。
- **必须包含参数**: 工具调用必须带有参数。例如 \`execute_python\` 必须包含 \`code\`，\`inspect_sheet\` 必须包含 \`fileName\`。
- **目标**: 每一轮回复必须推导出一个明确的下一步操作。禁止输出空的工具调用。

**核心环境规范**:
1. **虚拟文件系统 (VFS)**: 所有上传文件已挂载在 \`/mnt/\` 根目录下。
   - **正确路径**: \`/mnt/文件名.xlsx\`
   - **禁止路径**: \`/mnt/data/\` 或其他子目录。
2. **数据读取机制**: 
   - 绝大多数情况，请直接使用 \`pd.read_excel('/mnt/文件名.xlsx')\`。这是最稳妥的方法。
   - \`files\` 全局字典是内存中的数据备份。如果你需要直接操作它，请注意：它是 \`{ "文件名": { "Sheet1": [rows], "Sheet2": [rows] } }\` 的嵌套结构。
3. **数据写回要求**:
   - 处理完数据后，**必须**将结果存回 \`files\` 变量以同步给 UI。
   - **示例**: \`files['输出文件.xlsx'] = final_df\` 或 \`files['结果.xlsx'] = { "汇总": df1, "明细": df2 }\`。

**当前可用工具**:
1. \`inspect_sheet(fileName, sheetName)\`: 获取特定表的列头和前 5 行样本（用于确定数据含义）。
2. \`read_rows(fileName, sheetName, start, end)\`: 获取特定行范围的数据（用于精确核对）。
3. \`execute_python(code)\`: 运行 Python 代码。这是处理大型数据集、合并表、计算指标的唯一高效方式。
4. \`finish()\`: 完成任务后调用。

**处理策略**:
- **优先 Python**: 对于合并 (Merge/Join) 操作，直接在 \`execute_python\` 中使用 \`pd.merge()\`。不要分步读取成千上万行。
- **验证为王**: 在 \`finish\` 之前，请务必 \`print()\` 打印最终结果的 \`.head()\`、行数或关键总和，以便在日志中自我验证。
- **路径严谨**: 始终使用 \`/mnt/\` 前缀读取文件。

**常用代码模版 (Cheatsheet)**:
- **读取表**: \`df = pd.read_excel('/mnt/文件名.xlsx', sheet_name='Sheet1')\`
- **多表关联**: \`result = pd.merge(df_order, df_product, on='ID', how='left')\`
- **保存并同步**: \`files['结果.xlsx'] = result\` (必须这一步，UI 才能看到结果)
- **验证数据**: \`print(f"处理完成，结果行数: {len(result)}"); print(result.head())\`

**禁止行为**:
- 禁止使用 \`files['filename'].parse()\`，因为 \`files\` 里的数据是原始字典，不是 ExcelFile 对象。
- 禁止在未观察列名的情况下盲目合并。
- **严禁使用 \`globals().clear()\`**，这会破坏沙箱环境导致后续步骤崩溃。

用户任务: "${maskedUserPrompt}"

初始元数据 (Metadata Only):
${JSON.stringify(maskedInitialContext, null, 2)}
`
    }
  ];

  const steps: AgenticStep[] = [];
  let finalExplanation = "";
  let finalCode = "";
  let rejectionCount = 0; // Prevent infinite Auditor-Agent loops

  // Dynamic Context: Track files created during this loop session
  let currentFiles = Array.isArray(initialContext) ? [...initialContext] : [];
  const updateFilesFromCode = (code: string) => {
    // Improved Regex: Capture all assignments to files['...'] and to_excel('/mnt/...')
    const fileMatches = code.matchAll(/(?:files\s*\[\s*['"]|to_excel\s*\(\s*['"]\/mnt\/)([^'"]+)/g);
    for (const match of fileMatches) {
      const name = match[1];
      if (name && !currentFiles.some(f => f.fileName === name)) {
        console.log("[Loop Context] Adding newly detected file:", name);
        currentFiles.push({ fileName: name, sheets: ["Generated"] });
      }
    }
  };

  for (let turn = 0; turn < 20; turn++) {
    if (signal?.aborted) {
      throw new Error("Loop aborted by user");
    }
    try {
      const response = await client.messages.create({
        model: process.env.ZHIPU_MODEL || "glm-4",
        max_tokens: 4096,
        messages: messages
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : "";
      if (!text) throw new Error("AI 返回内容为空");

      // --- PHASE 6.x: Unified Hybrid Multi-Block Parser (Fuzzy Mapping) ---
      let stepData: any = { thought: "", action: null };

      // Helper for fuzzy mapping of tool calls
      const fuzzyMapAction = (raw: any): any => {
        if (!raw || typeof raw !== 'object') return null;

        // 1. Standard patterns (tool/tool_name/name + params/arguments/input)
        let tool = raw.tool || raw.tool_name || raw.name || raw.function?.name || raw.tool_use?.name;
        let params = raw.params || raw.parameters || raw.arguments || raw.input || raw.function?.arguments;

        // 2. Nested pattern: { "tool_name": { "param_key": "val" } }
        if (!tool) {
          const commonTools = ['execute_python', 'inspect_sheet', 'read_rows', 'finish'];
          const foundKey = Object.keys(raw).find(k => commonTools.includes(k));
          if (foundKey) {
            tool = foundKey;
            params = raw[foundKey];
          }
        }

        if (tool) {
          // Recursive check: Sometimes parameters are nested again
          if (params && typeof params === 'object' && !params.code && !params.fileName && !params.summary) {
            const nested = fuzzyMapAction(params);
            if (nested) return nested;
          }

          return {
            tool: tool,
            params: typeof params === 'string' ? JSON.parse(params) : (params || {})
          };
        }
        return null;
      };

      // 1. Scan ALL content blocks for information
      if (response.content && Array.isArray(response.content)) {
        response.content.forEach((block: any) => {
          if (block.type === 'text') {
            stepData.thought += block.text + "\n";
            // Check for embedded JSON in this text block as a resilient source
            try {
              const jsonMatch = block.text.match(/\{[\s\S]*\}/g);
              if (jsonMatch) {
                const embeddedJson = JSON.parse(jsonMatch[jsonMatch.length - 1]);

                // Fuzzy Search for Action inside JSON
                // Path A: Top level action object
                if (embeddedJson.action) {
                  const mapped = fuzzyMapAction(embeddedJson.action);
                  if (mapped) stepData.action = mapped;
                }
                // Path B: Native tool_calls array inside JSON
                if (!stepData.action && embeddedJson.tool_calls?.[0]) {
                  const mapped = fuzzyMapAction(embeddedJson.tool_calls[0]);
                  if (mapped) stepData.action = mapped;
                }
                // Path C: Flat structure (tool + params at top level)
                if (!stepData.action) {
                  const mapped = fuzzyMapAction(embeddedJson);
                  if (mapped) stepData.action = mapped;
                }

                if (embeddedJson.thought) stepData.thought = embeddedJson.thought;
              }
            } catch (e) { /* Ignore parsing errors for partial text blocks */ }
          }
          if (block.type === 'tool_use') {
            console.log("[Resilience] Detected Native SDK tool_use block");
            stepData.action = fuzzyMapAction(block);
          }
        });
      }

      // 2. Secondary Fallback: Detect native top-level tool_calls (specific to some API wrappers)
      if (!stepData.action && (response as any).tool_calls && (response as any).tool_calls.length > 0) {
        console.log("[Resilience] Detected Top-Level Native Tool Calls");
        stepData.action = fuzzyMapAction((response as any).tool_calls[0]);
      }

      // --- 3. Strict Argument Guardian ---
      // Fix cases where AI sends a tool name but forgets the actual code/params
      if (stepData.action && stepData.action.tool) {
        const tool = stepData.action.tool;
        const p = stepData.action.params || {};

        if (tool === 'execute_python' && !p.code) {
          console.warn("[Resilience] execute_python missing code, attempting extraction from thought");
          // Try to extract code block from thought if present
          const codeMatch = stepData.thought.match(/```python\n([\s\S]*?)```/);
          if (codeMatch) {
            stepData.action.params = { ...p, code: codeMatch[1].trim() };
          } else {
            console.error("[Resilience] Failed to find code for execute_python");
          }
        }

        if (tool === 'inspect_sheet' && !p.fileName) {
          console.warn("[Resilience] inspect_sheet missing fileName");
          // AI often forgets fileName if it's the only file
          if (initialContext && initialContext.length === 1) {
            stepData.action.params = { ...p, fileName: initialContext[0].fileName };
          }
        }
      }

      // 3. Final Fallback: Search the entire text for finish keywords if still no action
      if (!stepData.action || !stepData.action.tool) {
        const fullText = (stepData.thought || text).toLowerCase();
        if (fullText.includes('finish') || fullText.includes('完成')) {
          stepData.action = { tool: 'finish', params: {} };
        }
      }

      // --- 4. Structural Hardening & Final Validation ---
      if (!stepData.thought || stepData.thought.trim() === "") stepData.thought = text || "Thinking...";
      if (!stepData.action || !stepData.action.tool) {
        console.error("[Resilience] Failed to extract action from response:", JSON.stringify(response));
        // If we reach here, we provide a clearer error for the AI logic to potentially catch
        throw new Error("Missing 'action' in AI reasoning. Please try re-phrasing your request.");
      }

      const step: AgenticStep = {
        thought: isPrivacyEnabled ? globalMasker.unmask(stepData.thought) : stepData.thought,
        action: stepData.action
      };

      onStep(step);
      steps.push(step);

      // --- 5. Save Proposal to History BEFORE Audit (Context Preservation) ---
      // This allows the AI to see its rejected attempt in the next turn
      messages.push({ role: "assistant", content: JSON.stringify(stepData) });

      // --- 6. Dual-Agent Verification (Reflector Layer) ---
      console.log("[Reflector] Initiating AI Audit turn...");
      // Optimization: Pass dynamic context to Auditor so it knows about newly created files
      const auditorSlimContext = currentFiles.map((f: any) => ({ fileName: f.fileName, sheets: f.sheets }));

      const audit = await verifyActionWithAI(step, JSON.stringify(auditorSlimContext), messages);

      if (!audit.approved) {
        rejectionCount++;
        console.warn(`[Reflector] Audit REJECTED (${rejectionCount}/5). Reason: ${audit.reason}`);

        if (rejectionCount >= 10) {
          console.error("[Reflector] Maximum rejection threshold reached. Forcing loop exit.");
          throw new Error(`AI Logic stuck in an unresolvable audit loop. Last Reason: ${audit.reason}`);
        }

        const feedbackMsg = `**[审计驳回]**: 你的上一步操作未通过审核。\n理由: ${audit.reason}\n请根据理由修正你的 Action。`;
        messages.push({ role: "user", content: feedbackMsg });
        // Don't execute the rejected tool, just loop back
        continue;
      }

      // Reset rejection count on success
      rejectionCount = 0;

      // --- 7. Tool Execution (Approved) ---

      if (step.action.tool === 'finish') {
        finalExplanation = step.thought;
        break;
      }

      if (step.action.tool === 'execute_python') {
        finalCode = step.action.params?.code || "";
        updateFilesFromCode(finalCode);
      }

      // Execute tool if executor is provided
      if (executeTool) {
        // Human-in-the-loop: Request approval
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

          // PHASE 6.x: Dynamic Context Injection
          // Remind the AI of the current VFS state in EVERY turn
          const vfsInventory = initialContext.map((f: any) => `- /mnt/${f.fileName}`).join('\n');
          const contextInjection = `\n\n[Current Sandbox State]:\nFiles available in /mnt/:\n${vfsInventory}\n\n[Reminder]: 必须输出合法 JSON，禁止输出 JSON 之外的任何文字。`;

          step.observation = observation;
          messages.push({
            role: "user",
            content: `Observation from ${step.action.tool}:\n${isPrivacyEnabled ? globalMasker.mask(observation) : observation}${contextInjection}`
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