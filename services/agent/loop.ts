import { AIProcessResult, AgenticStep } from '../../types';
import { globalMasker } from '../maskerService';
import { client } from './client';
import { extractActionFromResponse } from './parser';
import { verifyActionWithAI } from './auditor';

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
        const fileMatches = code.matchAll(/(?:files\s*\[\s*['"]|to_excel\s*\(\s*['"]\/mnt\/|to_csv\s*\(\s*['"]\/mnt\/|to_json\s*\(\s*['"]\/mnt\/)([^'"]+)/g);
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

            // --- Parser Layer ---
            const stepData = extractActionFromResponse(response, text);

            // --- Validation Layer ---
            if (!stepData.action || !stepData.action.tool) {
                console.error("[Resilience] Failed to extract action from response:", JSON.stringify(response));
                throw new Error("Missing 'action' in AI reasoning. Please try re-phrasing your request.");
            }

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

            if (!audit.approved) {
                rejectionCount++;
                console.warn(`[Reflector] Audit REJECTED (${rejectionCount}/5). Reason: ${audit.reason}`);

                if (rejectionCount >= 10) {
                    console.error("[Reflector] Maximum rejection threshold reached. Forcing loop exit.");
                    throw new Error(`AI Logic stuck in an unresolvable audit loop. Last Reason: ${audit.reason}`);
                }

                const feedbackMsg = `**[审计驳回]**: 你的上一步操作未通过审核。\n理由: ${audit.reason}\n请根据理由修正你的 Action。`;
                messages.push({ role: "user", content: feedbackMsg });
                continue;
            }

            // Reset rejection count on success
            rejectionCount = 0;

            // --- Execution Layer ---

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

                    // Dynamic Context Injection
                    const vfsInventory = initialContext.map((f: any) => `- /mnt/${f.fileName}`).join('\n');
                    const contextInjection = `\n\n[Current Sandbox State]:\nFiles available in /mnt/:\n${vfsInventory}\n\n[Reminder]: 必须输出合法 JSON，禁止输出 JSON 之外的任何文字。`;

                    step.observation = observation;
                    messages.push({
                        role: "user",
                        content: `Observation from ${step.action.tool}:\n${isPrivacyEnabled ? globalMasker.mask(observation) : observation}${contextInjection}`
                    });

                    continue;
                } catch (toolError: any) {
                    messages.push({
                        role: "user",
                        content: `Error executing ${step.action.tool}: ${toolError.message}. Please try a different approach.`
                    });
                    continue;
                }
            }

            // If no executor (one-shot mode), break after first tool
            break;
        } catch (error: any) {
            console.error("Agentic Loop error at turn", turn, error);
            if (turn === 19) throw error; // Changed from 9 to 19 (loop goes to 20)
            messages.push({ role: "user", content: `System Error: ${error.message}. Please rethink or continue.` });
        }
    }

    return { steps, explanation: finalExplanation, finalCode };
};
