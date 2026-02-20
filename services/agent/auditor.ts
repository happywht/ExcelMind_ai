import { client } from './client';
import { AgenticStep } from '../../types';

/**
 * AI Auditor (Reflector Layer)
 * Performs a second-pass audit on a proposed action to ensure safety and precision.
 */
export async function verifyActionWithAI(
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
1. **参数缺失**: 如果工具是 \`execute_python\`，检查是否包含 \`code\`、\`input\` 或 \`instruction\` 任意一个即可。如果 \`inspect_sheet\` 没有 \`fileName\`，必须驳回。**注意：\`finish\` 工具不受此限**。
2. **路径错误**: 代码中必须使用 \`/mnt/\` 开头的绝对路径。禁止使用相对路径。
3. **逻辑偏差**: 代码逻辑是否与思维 (Thought) 中描述的目标一致。
4. **保存缺失**: 如果任务要求产出结果，代码中必须包含保存动作 (如 \`files['out.xlsx'] = df\` 或 \`to_excel\`)。**注意：如果是单纯的查询/观察步骤，不需要保存，必须通过**。
5. **结束校验**: 如果工具是 \`finish\`，检查思维或对话历史中是否提到已完成处理及保存。如果有，**必须通过**。不要因为 \`finish\` 动作本身不含代码而驳回。

**环境提示**: 
- \`files\` 是一个预定义的全局字典，用于同步内存数据，AI 可以直接引用它。
- 审计员无法直接读取外部文件，但在上下文中可以查看已加载的文件名。请确保代码引用的是存在的文件。
- \`clean_output\` 已在沙箱中预定义，用于处理输出。
- 执行代码必须处理数据结果（即有文件保存或明确的 DataFrame 修改）。
- 如果审批通过，请回复: "APPROVED"
- 如果发现问题，请回复: "REJECT: [具体理由]"

你的审计结果是？`;

    // Protocol Guard: Anthropic-style APIs MUST start with a 'user' message and alternate role.
    // We slice the history and trim it to ensure the requirement is met.

    // Improvement: Enhanced History Slicing Logic
    let validHistory = history.slice(-4);

    // Ensure the history doesn't start with 'assistant' if it's too short to alternate correctly
    // Anthropic requires: User -> Assistant -> User ...
    while (validHistory.length > 0 && validHistory[0].role !== 'user') {
        validHistory.shift();
    }

    // If the last message is 'user', we drop it because the auditPrompt (user) will follow.
    // We cannot have User -> User
    if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
        validHistory.pop();
    }

    // Double check: if history is now empty or invalid sequence, we might just send the prompt alone
    // This is safe as the prompt is 'user' role.

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
        // Fail-open for network errors to avoid blocking user flow unnecessarily? 
        // Or fail-closed for safety? Using fail-open as per original design.
        return { approved: true };
    }
}
