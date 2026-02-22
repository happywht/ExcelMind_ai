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
1. **意图检查**: 检查模型是否合理调用了工具。如果是 \`execute_python\`，请聚焦于代码的安全性和逻辑性。（注意：代码可能存在于 JSON 外部的 Markdown 代码块中，不要因为参数里没有直接看到 \`code\` 就驳回。）
2. **路径错误**: 代码中必须使用 \`/mnt/\` 开头的绝对路径。禁止使用相对路径。
3. **安全拦截**: 如果代码包含可能导致无限循环 (如没有终止条件的 \`while True\`) 或者恶意系统调用 (试图越权访问非 \`/mnt\` 文件)，必须驳回。
4. **结束校验**: 如果工具是 \`finish\`，检查思维或对话历史中是否提到已完成处理。如果有，**必须通过**。不要因为 \`finish\` 动作本身不含代码而驳回。

**环境提示**: 
- 审计员无法直接读取外部文件，但在上下文中可以查看已加载的文件名。请确保代码引用的是存在的文件。
- \`clean_output\` 已在沙箱中预定义，用于处理输出。
- 如果是数据修改任务，检查代码是否有对 \`/mnt/\` 下文件的有效操作，或者仅仅是安全性的探查。代码并不必须包含保存动作。

**输出格式 (极度重要)**:
你必须输出以下 JSON 格式（不要输出任何其他内容）:
\`\`\`json
{ "approved": true }
\`\`\`
或者
\`\`\`json
{ "approved": false, "reason": "具体理由" }
\`\`\``;

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
            model: process.env.ZHIPU_MODEL || "glm-4.7",
            max_tokens: 4096,
            messages: [
                ...validHistory,
                { role: "user", content: auditPrompt }
            ],
            temperature: 0.1,
        });

        const result = response.content[0]?.type === 'text' ? response.content[0].text : "";

        // Phase 9: Structured JSON Parsing (Primary) with text fallback
        try {
            // Try to extract JSON from response (may be wrapped in ```json ... ```)
            const jsonMatch = result.match(/```json\s*([\s\S]*?)```/) || result.match(/(\{[\s\S]*\})/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1].trim());
                if (typeof parsed.approved === 'boolean') {
                    if (parsed.approved) {
                        return { approved: true };
                    } else {
                        console.warn("[Auditor] Action REJECTED (JSON):", parsed.reason);
                        return { approved: false, reason: parsed.reason || "审计未通过" };
                    }
                }
            }
        } catch (jsonErr) {
            console.warn("[Auditor] JSON parse failed, falling back to text matching:", jsonErr);
        }

        // Fallback: Legacy text-based matching for backward compatibility
        const isApproved = /^\s*(\**)*APPROVED(\**)*\s*$/i.test(result) || (result.toUpperCase().includes("APPROVED") && !result.toUpperCase().includes("REJECT"));
        const rejectMatch = result.match(/REJECT(?:ION)?:\s*([\s\S]+)/i);

        if (isApproved && !rejectMatch) {
            return { approved: true };
        } else {
            const reason = rejectMatch ? rejectMatch[1].trim() : result.trim();
            console.warn("[Auditor] Action REJECTED (text fallback):", reason);
            return { approved: false, reason: reason || "Unknown audit failure" };
        }
    } catch (e) {
        console.error("[Auditor] Audit failed due to network/API error:", e);
        // Fail-Closed for safety
        return { approved: false, reason: "系统内部审计服务暂不可用，为确保安全，已拦截操作。" };
    }
}
