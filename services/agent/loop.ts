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
- 你必须回复任务的执行结果。
- **推荐格式**: 以 JSON 格式输出，包含 \`thought\` (你的思考) 和 \`action\` (工具调用)。
- **必须包含参数**: 工具调用必须带有参数。例如 \`execute_python\` 必须包含 \`code\`，\`inspect_sheet\` 必须包含 \`fileName\`。
- **目标**: 每一轮回复必须推导出一个明确的下一步操作。禁止输出空的工具调用。

**核心环境规范**:
1. **虚拟文件系统 (VFS)**: 所有上传文件已挂载在 \`/mnt/\` 根目录下。
   - **正确路径**: \`/mnt/文件名.xlsx\`
   - **禁止路径**: \`/mnt/data/\` 或其他子目录。
2. **高级协同**: 你可以访问 \`shared_context['docs']\` 来获取之前文档分析的结果。如果需要跨文档分析，请优先检查此变量。
3. **数据读取机制**: 
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
        },
        document: {
            role: "user",
            content: `你是一个专家级文档智能分析师 (Document Intelligence Agent)。你的工作是利用 Python 工具深入分析非结构化文档（Word/PDF）。
你正在运行在 **Seamless Sandbox v2.2** 架构下。

**输出规范**:
- 你必须回复任务的执行结果。
- **推荐格式**: JSON \`thought\` + \`action\`。
- **目标**: 通过 Python 脚本读取、提取、分析文档内容，最终回答用户问题或生成报告。

**核心环境规范**:
1. **文件挂载**: 所有文档已挂载在 \`/mnt/\` 目录下（如 \`/mnt/report.docx\`）。
2. **协同存储**: 所有提取的关键信息（尤其是表格）会自动存入 \`shared_context['docs'][文件名]\`。如果用户要求后续进行数据分析，请告知用户数据已就绪，可切换到 Smart Excel 模块进行处理。
3. **工具库**:
   - **Word**: 使用 \`python-docx\` (import docx)。支持读取段落、样式。
   - **PDF**: 使用 \`pdfplumber\` (首选) 或 \`pypdf\`。\`pdfplumber\` 具有极高的文字与表格提取精度。
   - **NLP/Regex**: 使用 standard python libs 进行文本分析。

**当前可用工具**:
1. \`execute_python(code)\`: 运行 Python 代码进行深度分析。
2. \`read_document_page(fileName, page_number)\`: 读取 PDF 的特定页内容。
3. \`search_document(fileName, keyword)\`: 在文档中搜索关键字并返回上下文。
4. \`finish()\`: 完成任务。

**常用代码模版**:
- **高精度读取 PDF (pdfplumber)**:
  \`\`\`python
  import pdfplumber
  with pdfplumber.open('/mnt/report.pdf') as pdf:
      page = pdf.pages[0]
      text = page.extract_text()
      tables = page.extract_tables()
      print(f"Page 1 Text: {text[:200]}")
      print(f"Detected Tables: {len(tables)}")
  \`\`\`
- **识别 Word 结构**:
  \`\`\`python
  import docx
  doc = docx.Document('/mnt/contract.docx')
  for p in doc.paragraphs:
      if 'Heading' in p.style.name:
          print(f"Structure: {p.style.name} -> {p.text}")
  \`\`\`

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
            const err = "Loop aborted by user";
            logger.logError(turn, err);
            throw new Error(err);
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

    const result = { steps, explanation: finalExplanation, finalCode, trace: logger.getTrace() };
    logger.finish(result);
    return result;
};
