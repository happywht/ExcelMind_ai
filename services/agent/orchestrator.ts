/**
 * =====================================================
 * ExcelMind Orchestrator Agent (Phase 9.0) 🎻🧠
 * =====================================================
 *
 * The Orchestrator acts as the high-level "CEO" agent.
 * It receives the user's intent, decides which Worker Agents to dispatch (Smart Excel,
 * Smart Document, or Shared Context), and then synthesizes their results into a final answer.
 *
 * Architecture:
 *   L1: Orchestrator (THIS FILE) — determines strategy
 *   L2: Worker Agents (loop.ts)   — executes tactics, returned via executeTool
 *   L3: Safety Auditor (auditor.ts) — remains as guardrail for Python execution
 */

import { OrchestratorAction, OrchestratorStep, OrchestratorTool } from '../../types';
import { client } from './client';
import { runAgenticLoop } from './loop';

/** Context describing what files are loaded in the current session */
export interface OrchestratorContext {
    /** Metadata of Excel files currently loaded (fileName -> sheet names + info) */
    excelFiles: Array<{ fileName: string; sheets: string[]; rowCount: number }>;
    /** Names of documents processed by Smart Document (from shared_context.docs) */
    documentFiles: string[];
    /** Raw shared_context summary (compact JSON) */
    sharedContextSnapshot?: string;
}

/** Callback for streaming orchestration steps to the UI */
export type OnOrchestratorStep = (step: OrchestratorStep) => void;

/** Callback for when a Worker Agent produces logs during its sub-task */
export type OnWorkerLog = (agentType: 'excel' | 'document', log: string) => void;

// ----------------------------------------------------------------
// Orchestrator System Prompt
// ----------------------------------------------------------------
const ORCHESTRATOR_SYSTEM_PROMPT = (ctx: OrchestratorContext) => `
你是 ExcelMind 的"首席分析指挥官"(Chief Analysis Orchestrator)。你不直接处理数据，而是通过调用专门的子代理(Sub-Agents)来完成任务。

## 当前沙箱状态 (Context Slice)
- **Excel 文件**: ${ctx.excelFiles.length === 0 ? '无' : ctx.excelFiles.map(f => `${f.fileName} (${f.sheets.join(', ')}, 共${f.rowCount}行)`).join('; ')}
- **文档文件**: ${ctx.documentFiles.length === 0 ? '无' : ctx.documentFiles.join(', ')}
- **已加载上下文摘要**: ${ctx.sharedContextSnapshot || '空'}

## 你的工具集 (SIAP Protocol)

你只能返回如下格式的 JSON：

\`\`\`json
{
  "thought": "你的分析思路 (1-2句话，精炼)",
  "action": {
    "tool": "工具名",
    "params": { ... }
  }
}
\`\`\`

**可用工具**:
1. \`analyze_excel\`: 委托 Smart Excel 子代理处理 Excel 任务。
   - params: \`{ "instruction": "具体的数据分析任务", "fileName": "目标文件名(可选)" }\`
2. \`read_document\`: 委托 Smart Document 子代理读取并分析文档。
   - params: \`{ "instruction": "从文档中提取什么信息", "fileName": "目标文件名(可选)" }\`
3. \`search_context\`: 搜索已加载的共享上下文（避免重复处理）。
   - params: \`{ "query": "要查询的信息关键字" }\`
4. \`generate_report\`: 汇总所有子代理的结果，生成最终的用户报告。
   - params: \`{ "summary": "最终汇总内容 (Markdown 格式)" }\`
5. \`finish\`: 对话完成，向用户返回最终答案。
   - params: \`{ "summary": "最终答案" }\`

## 核心原则

- **不猜测数据**：如果不确定某个数字，必须调用 \`analyze_excel\` 去计算，而不是凭印象回答。
- **Context Slicing**：绝对不要把原始数据行放入你的回复，只看元数据和摘要结果。
- **分步推进**：每次只调用一个工具，等待结果后再决定下一步。
- **最多5步**：超过5步未能完成任务，直接调用 \`finish\` 并说明原因。
`;

// ----------------------------------------------------------------
// Orchestrator Entry Point
// ----------------------------------------------------------------

/**
 * Runs the high-level Orchestrator loop.
 *
 * @param userRequest    The user's question/request.
 * @param context        Current session context (which files are loaded).
 * @param onStep         Callback to stream orchestration steps to the UI.
 * @param executeWorker  Callback to invoke a Worker Agent (Smart Excel or Smart Doc).
 * @param signal         AbortSignal for cancellation.
 * @returns              The final answer text.
 */
export const runOrchestrator = async (
    userRequest: string,
    context: OrchestratorContext,
    onStep: OnOrchestratorStep,
    executeWorker: (agentType: 'excel' | 'document', instruction: string, fileName?: string) => Promise<string>,
    signal?: AbortSignal,
): Promise<string> => {
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [
        { role: 'user', content: userRequest }
    ];

    // Run at most 8 orchestration turns to prevent loops
    const MAX_TURNS = 8;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (signal?.aborted) throw new Error('Aborted');

        // --- Call the Orchestrator LLM ---
        const response = await client.messages.create({
            model: 'glm-4-flash',
            max_tokens: 1024,
            system: ORCHESTRATOR_SYSTEM_PROMPT(context),
            messages: history.map(h => ({ role: h.role, content: h.content })),
        });

        const rawText = (response.content?.[0] as any)?.text ?? '';

        // --- Parse JSON from response ---
        let parsed: { thought: string; action: OrchestratorAction } | null = null;
        try {
            const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) || rawText.match(/({[\s\S]*})/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1].trim());
            }
        } catch (e) {
            // If response is plain text, treat as finish
            parsed = {
                thought: 'Synthesis complete.',
                action: { tool: 'finish', params: { summary: rawText } }
            };
        }

        if (!parsed) {
            return rawText; // Fallback: return raw text
        }

        const step: OrchestratorStep = {
            thought: parsed.thought,
            action: parsed.action,
            status: 'thinking',
            agentType: 'orchestrator',
            timestamp: Date.now(),
        };

        // --- Dispatch Tool Action ---
        const { tool, params } = parsed.action;

        if (tool === 'finish' || tool === 'generate_report') {
            step.status = 'finished';
            onStep(step);
            return params.summary || '任务完成。';
        }

        step.status = 'delegating';
        onStep(step);

        let observation = '';

        if (tool === 'analyze_excel') {
            step.agentType = 'excel';
            step.status = 'delegating';
            onStep(step);
            try {
                observation = await executeWorker('excel', params.instruction || userRequest, params.fileName);
            } catch (e: any) {
                observation = `Error from Excel Agent: ${e.message}`;
            }

        } else if (tool === 'read_document') {
            step.agentType = 'document';
            step.status = 'delegating';
            onStep(step);
            try {
                observation = await executeWorker('document', params.instruction || userRequest, params.fileName);
            } catch (e: any) {
                observation = `Error from Document Agent: ${e.message}`;
            }

        } else if (tool === 'search_context') {
            step.agentType = 'search';
            // Search the shared context snapshot we received
            const query = params.query?.toLowerCase() || '';
            const snapshot = context.sharedContextSnapshot || '';
            if (snapshot && snapshot.toLowerCase().includes(query)) {
                observation = `Found in shared_context: ${snapshot.substring(0, 800)}`;
            } else {
                observation = 'No relevant data found in shared context. A Worker Agent may need to process the file first.';
            }
        }

        // Update step with observation
        step.observation = observation;
        step.status = 'observing';
        onStep(step);

        // Feed result back to Orchestrator
        history.push({ role: 'assistant', content: rawText });
        history.push({ role: 'user', content: `OBSERVATION: ${observation}` });
    }

    return '已达到最大分析轮次，请将任务拆分后重试。';
};
