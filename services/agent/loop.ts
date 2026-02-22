import { AIProcessResult, AgenticStep } from '../../types';
import { globalMasker } from '../maskerService';
import { client } from './client';
import { extractActionFromResponse } from './parser';
import { verifyActionWithAI } from './auditor';
import { TraceLogger } from './logger';

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
    signal?: AbortSignal,
    agentMode: 'excel' | 'document' = 'excel'
): Promise<AIProcessResult> => {
    // Initialize Logger
    const logger = new TraceLogger(userPrompt, initialContext);

    // Reset masker for a fresh session
    if (isPrivacyEnabled) globalMasker.reset();

    // Mask the user prompt and initial data
    const maskedUserPrompt = isPrivacyEnabled ? globalMasker.mask(userPrompt) : userPrompt;
    const maskedInitialContext = isPrivacyEnabled ? globalMasker.maskContext(initialContext) : initialContext;

    const systemPrompts = {
        excel: {
            role: "user",
            content: `你是一个专家级数据处理智能体 (Data Agent)。你的工作是根据用户需求处理 Excel 数据。
你正在运行在 **Seamless Sandbox v2.2** 架构下。

**输出规范 (极度重要)**:
- 你必须按照以下 JSON 格式进行回复，包含 \`thought\` (思考) 和 \`action\` (工具调用)。
- **输出范例**:
  \`\`\`json
  {
    "thought": "我需要先查看表的结构...",
    "action": {
      "tool": "inspect_sheet",
      "params": { "fileName": "data.xlsx", "sheetName": "Sheet1" }
    }
  }
  \`\`\`
- **关于代码执行**: 调用 \`execute_python\` 时，你可以将代码放入 JSON 的 \`params.code\` 中，**也可以**为了可读性激在 JSON 之外单独输出一个 \`python\` 代码块。我们的解析器会自动关联。
- **必须包含参数**: 工具调用必须带有参数。目标是每一轮回复必须推导出一个明确的下一步操作。

**核心环境规范**:
1. **虚拟文件系统 (VFS)**: 所有上传文件已挂载在 \`/mnt/\` 根目录下。路径严谨：\`/mnt/文件名.xlsx\`。
2. **数据同步**: 处理完数据后，保存到 \`/mnt/\` (如 \`df.to_excel('/mnt/结果.xlsx')\`)，系统会自动同步给 UI。
3. **优先 Python**: 对于合并 (Merge/Join) 等复杂操作，直接在 \`execute_python\` 中使用 \`pd.merge()\`。

**当前可用工具**:
1. \`inspect_sheet(fileName, sheetName)\`: 获取表头、样本行和 header 诊断信息。如果检测到 Unnamed 列名过多，说明第一行可能不是真正的列名，需要在 pandas 读取时使用 \`skiprows\` 参数。
2. \`read_rows(fileName, sheetName, start, end)\`: 获取特定行数据。
3. \`execute_python(code)\`: 运行高效 Python 代码（推荐使用 pandas）。
4. \`finish(message)\`: 任务完成。

用户任务: "${maskedUserPrompt}"

初始元数据 (Metadata Only):
${JSON.stringify(maskedInitialContext, null, 2)}
`
        },
        document: {
            role: "user",
            content: `你是一个专家级文档阅读理解与公文撰写大师 (Document Intelligence Agent)。
你的核心能力是**直接理解文本内容并生成高质量回答**，而不是写代码。

**黄金法则 (极度重要)**:
- 系统已经为你提取好了文档的全文内容（见下方"初始元数据"中的 textPreview）。
- **你应该直接阅读这些文本，用自己的智慧回答用户的问题**。
- ⚠️ 绝大多数任务（如摘要、审计、润色、问答、比较）**不需要 Python 代码**！请直接使用 \`generate_report\` 输出你的分析成果。

**输出规范**:
- 你必须按照以下 JSON 格式进行回复，包含 \`thought\` 和 \`action\`。
- **核心范例 (首选模式)**: 直接输出富文本
  \`\`\`json
  {
    "thought": "用户要求总结文档的关键条款，我已经阅读了全文内容，现在直出分析报告...",
    "action": {
      "tool": "generate_report",
      "params": { "content": "## 文档关键条款摘要\\n\\n### 1. 合同主体\\n..." }
    }
  }
  \`\`\`
- **降级范例 (仅限特殊场景)**: 只有用户明确要求"帮我生成一个真实的 .docx/.pdf 文件"时才可用
  \`\`\`json
  {
    "thought": "用户要求生成一个物理的 Word 文档存盘，我需要用 Python 创建...",
    "action": {
      "tool": "execute_python",
      "params": { "code": "..." }
    }
  }
  \`\`\`

**当前可用工具 (按优先级排列)**:
1. ⭐ \`generate_report(content)\`: **首选工具**。输出 Markdown 格式的富文本分析结果。用于摘要、审计、比较、回答问题等一切文本处理任务。
2. \`search_document(fileName, keyword)\`: 在文档中极速搜索关键词上下文。
3. \`read_document_page(fileName, page_number)\`: 读取 PDF 特定页的详细内容。
4. \`execute_python(code)\`: **降级工具**。仅在需要生成真实的物理文件（.docx/.pdf）时使用。环境: \`/mnt/\` 挂载，Word 用 \`python-docx\`，PDF 用 \`pypdf\`。
5. \`finish(message)\`: 完成任务并给出最终回答。

用户任务: "${maskedUserPrompt}"

初始元数据 (Metadata):
${JSON.stringify(maskedInitialContext, null, 2)}
`
        }
    };

    const messages: any[] = [
        agentMode === 'excel' ? systemPrompts.excel : systemPrompts.document
    ];

    const steps: AgenticStep[] = [];
    let finalExplanation = "";
    let finalCode = "";
    let rejectionCount = 0; // Prevent infinite Auditor-Agent loops

    // Dynamic Context: Track files created during this loop session
    let currentFiles = Array.isArray(initialContext) ? [...initialContext] : [];
    const updateFilesFromCode = (code: string) => {
        // Phase 10: Removed legacy files['...'] regex (files dict is deprecated, /mnt/ is the only sync channel)
        // Only track explicit /mnt/ write operations to predict newly generated files
        const fileMatches = code.matchAll(/(?:to_excel\s*\(\s*['"]\/mnt\/|to_csv\s*\(\s*['"]\/mnt\/|to_json\s*\(\s*['"]\/mnt\/|open\s*\(\s*['"]\/mnt\/)([^'"]+)/g);
        for (const match of fileMatches) {
            const name = match[1];
            if (name && !currentFiles.some(f => f.fileName === name)) {
                console.log("[Loop Context] Adding newly detected file from /mnt/ write:", name);
                currentFiles.push({ fileName: name, sheets: ["Generated"] });
            }
        }
    };

    for (let turn = 0; turn < 20; turn++) {
        if (signal?.aborted) {
            const err = "Loop aborted by user";
            logger.logError(turn, err);
            throw new Error(err);
        }
        try {
            const response = await client.messages.create({
                model: process.env.ZHIPU_MODEL || "glm-4.7",
                max_tokens: 4096,
                messages: messages
            });

            const text = response.content[0]?.type === 'text' ? response.content[0].text : "";
            if (!text) throw new Error("AI 返回内容为空");

            // --- Parser Layer ---
            const stepData = extractActionFromResponse(response, text);

            // --- Validation Layer ---
            if (!stepData.action || !stepData.action.tool) {
                console.error("[Resilience] Failed to extract action from response:", JSON.stringify(response));
                const err = "Missing 'action' in AI reasoning. Please try re-phrasing your request.";
                logger.logError(turn, err);
                throw new Error(err);
            }

            // Log Step Start
            logger.logStep(turn, stepData.thought, stepData.action);

            const step: AgenticStep = {
                thought: isPrivacyEnabled ? globalMasker.unmask(stepData.thought) : stepData.thought,
                action: stepData.action
            };

            onStep(step);
            steps.push(step);

            // --- Save Proposal to History BEFORE Audit ---
            messages.push({ role: "assistant", content: JSON.stringify(stepData) });

            // --- Reflector Layer (Auditor) ---
            console.log("[Reflector] Initiating AI Audit turn...");
            // Optimization: Pass dynamic context to Auditor so it knows about newly created files
            const auditorSlimContext = currentFiles.map((f: any) => ({ fileName: f.fileName, sheets: f.sheets }));

            // Use the newly implemented auditor module
            const audit = await verifyActionWithAI(step, JSON.stringify(auditorSlimContext), messages);

            // Log Audit Result
            logger.logAudit(turn, audit.approved, audit.reason);

            if (!audit.approved) {
                rejectionCount++;
                console.warn(`[Reflector] Audit REJECTED (${rejectionCount}/5). Reason: ${audit.reason}`);

                if (rejectionCount >= 10) {
                    console.error("[Reflector] Maximum rejection threshold reached. Forcing loop exit.");
                    const err = `AI Logic stuck in an unresolvable audit loop. Last Reason: ${audit.reason}`;
                    logger.logError(turn, err);
                    throw new Error(err);
                }

                const feedbackMsg = `**[审计驳回]**: 你的上一步操作未通过审核。\n理由: ${audit.reason}\n请根据理由修正你的 Action。`;
                messages.push({ role: "user", content: feedbackMsg });
                continue;
            }

            // Reset rejection count on success
            rejectionCount = 0;

            // --- Execution Layer ---

            if (step.action.tool === 'finish') {
                const p = step.action.params || {};
                finalExplanation = p.message || p.summary || p.content || p.text || step.thought;
                break;
            }

            if (step.action.tool === 'execute_python') {
                finalCode = step.action.params?.code || step.action.params?.input || step.action.params?.instruction || "";
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
                            logger.logObservation(turn, obs);
                            messages.push({ role: "user", content: obs });
                            continue;
                        }
                    } catch (e: any) {
                        console.error("Approval flow failed:", e);
                    }
                }

                try {
                    const observation = await executeTool(step.action.tool, step.action.params);

                    // Log Observation
                    logger.logObservation(turn, observation);

                    // Phase 5: Sandbox State Feedback – append current file inventory so AI stays aware
                    const sandboxFileNames = currentFiles.map((f: any) => f.fileName);
                    const stateUpdate = sandboxFileNames.length > 0
                        ? `\n[System Update]: Sandbox files now contain: [${sandboxFileNames.join(', ')}]`
                        : '';

                    // Dynamic Context Injection (Phase 9: Relaxed to not conflict with code-block-outside-JSON rule)
                    const contextInjection = `\n\n[Reminder]: 确保每轮输出包含明确的 JSON action 和 thought。`;

                    step.observation = observation;
                    messages.push({
                        role: "user",
                        content: `Observation from ${step.action.tool}:\n${isPrivacyEnabled ? globalMasker.mask(observation) : observation}${stateUpdate}${contextInjection}`
                    });

                    continue;
                } catch (toolError: any) {
                    const err = `Error executing ${step.action.tool}: ${toolError.message}`;
                    logger.logError(turn, err);
                    messages.push({
                        role: "user",
                        content: `${err}. Please try a different approach.`
                    });
                    continue;
                }
            }

            // If no executor (one-shot mode), break after first tool
            break;
        } catch (error: any) {
            console.error("Agentic Loop error at turn", turn, error);
            logger.logError(turn, error.message);
            if (turn === 19) throw error;
            messages.push({ role: "user", content: `System Error: ${error.message}. Please rethink or continue.` });
        }
    }

    const result = {
        steps,
        explanation: finalExplanation,
        finalCode,
        trace: logger.getTrace(),
        generatedFiles: currentFiles.map(f => f.fileName).filter(n => !initialContext.some((i: any) => i.fileName === n))
    };
    logger.finish(result);
    return result;
};
