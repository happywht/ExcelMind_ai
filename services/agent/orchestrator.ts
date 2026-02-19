/**
 * =====================================================
 * ExcelMind Orchestrator Agent (Phase 10.2) 🎻🧠⚡
 * =====================================================
 *
 * The Orchestrator is the high-level "Commander" agent.
 * It decides which Worker Core to dispatch to (Analysis or Doc),
 * can fire tasks in PARALLEL using Promise.all, and merges the
 * context snapshots from both workers before final reasoning.
 *
 * Architecture (Phase 10.2):
 *   L0: User Request (KnowledgeChat)
 *   L1: Orchestrator (THIS FILE)  — decides strategy, fires parallel tasks
 *   L2a: Analysis Worker (loop.ts + pyodide.worker.ts)  — heavy computation
 *   L2b: Doc Worker     (loop.ts + doc.worker.ts)        — lightweight extraction
 *   L3: Safety Auditor (auditor.ts) — guardrail per Python execution
 */

import { OrchestratorAction, OrchestratorStep, OrchestratorTool, ParallelSubTask } from '../../types';
import { client } from './client';

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
// Orchestrator System Prompt (Phase 10.2 - Parallel Dispatch Aware)
// ----------------------------------------------------------------
const ORCHESTRATOR_SYSTEM_PROMPT = (ctx: OrchestratorContext) => `
你是 ExcelMind 的"首席分析指挥官"(Chief Analysis Orchestrator, Phase 10.2)。
你现在拥有一个双核执行引擎：
- **Analysis Core** (分析核心): 专门进行 Python/Pandas 数据运算
- **Doc Core**      (文档核心): 专门进行 PDF/Word 快速文本提取

## 当前沙箱状态 (Context Slice)
- **Excel 文件**: ${ctx.excelFiles.length === 0 ? '无' : ctx.excelFiles.map(f => `${f.fileName} (${f.sheets.join(', ')}, 共${f.rowCount}行)`).join('; ')}
- **文档文件**: ${ctx.documentFiles.length === 0 ? '无' : ctx.documentFiles.join(', ')}
- **已加载上下文摘要**: ${ctx.sharedContextSnapshot || '空'}

## 你的工具集 (SIAP Protocol v2)

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
1. \`analyze_excel\`: 委托 **Analysis Core** 处理 Excel/数据运算任务。
   - params: \`{ "instruction": "具体的数据分析任务", "fileName": "目标文件名(可选)" }\`
2. \`read_document\`: 委托 **Doc Core** 读取并提取文档文本/结构。
   - params: \`{ "instruction": "从文档中提取什么信息", "fileName": "目标文件名(可选)" }\`
3. \`parallel_dispatch\`: ⚡ **新工具** — 同时触发多个子任务，两个核心并行执行。
   - params: \`{ "tasks": [ { "core": "doc", "tool": "read_document", "params": {...} }, { "core": "excel", "tool": "analyze_excel", "params": {...} } ] }\`
   - 适用场景: 用户同时有 PDF 和 Excel 两类文件需要处理时，使用此工具节省时间。
4. \`sync_context\`: 同步两个核心的共享状态，生成统一的上下文摘要，供后续推理使用。
   - params: \`{ "query": "需要验证的关键信息" }\`
5. \`search_context\`: 搜索已加载的共享上下文（避免重复处理）。
   - params: \`{ "query": "要查询的信息关键字" }\`
6. \`generate_report\`: 汇总所有子代理的结果，生成最终用户报告。
   - params: \`{ "summary": "最终汇总内容 (Markdown 格式)" }\`
7. \`finish\`: 对话完成，向用户返回最终答案。
   - params: \`{ "summary": "最终答案" }\`

## 核心策略 (Phase 10.2 Upgrade)

- **并行优先**: 如果任务涉及既有 PDF/Word 也有 Excel，优先使用 \`parallel_dispatch\` 并发处理，节省时间。
- **不猜测数据**: 如果不确定某个数字，必须调用 \`analyze_excel\` 去计算，绝不凭印象回答。
- **Context Slicing**: 绝对不要把原始数据行放入你的回复，只看元数据和摘要结果。
- **最多6步**: 超过6步未能完成任务，直接调用 \`finish\` 并说明原因。
`;

// ----------------------------------------------------------------
// Orchestrator Entry Point (Phase 10.2)
// ----------------------------------------------------------------

/**
 * Runs the high-level Orchestrator loop with parallel dispatch support.
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

    // Phase 10.2: accumulated context bridge — merges results from both workers
    let contextBridge: Record<string, string> = {};

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

        // ----------------------------------------------------------------
        // Phase 10.2: PARALLEL DISPATCH — Fire & Forget both workers
        // ----------------------------------------------------------------
        if (tool === 'parallel_dispatch') {
            const tasks: ParallelSubTask[] = params.tasks || [];

            // Build the parallelGroup for UI rendering
            step.status = 'parallel';
            step.agentType = 'parallel';
            step.parallelGroup = tasks.map(t => ({
                core: t.core,
                tool: t.tool,
                label: t.core === 'doc' ? '📄 文档核心 提取中...' : '📊 分析核心 运算中...',
                status: 'running' as const,
            }));
            onStep(step);

            // Fire all sub-tasks concurrently with Promise.allSettled (fail-safe)
            const taskPromises = tasks.map(async (task, i) => {
                const agentType = task.core === 'doc' ? 'document' : 'excel';
                const instruction = task.params?.instruction || userRequest;
                const fileName = task.params?.fileName;
                try {
                    const result = await executeWorker(agentType, instruction, fileName);
                    // Update group entry to 'done'
                    if (step.parallelGroup) step.parallelGroup[i].status = 'done';
                    return { agentType, result };
                } catch (e: any) {
                    if (step.parallelGroup) step.parallelGroup[i].status = 'error';
                    return { agentType, result: `Error from ${agentType}: ${e.message}` };
                }
            });

            // Wait for ALL parallel tasks to complete
            const results = await Promise.allSettled(taskPromises);

            // Aggregate observations
            const observations: string[] = [];
            for (const r of results) {
                if (r.status === 'fulfilled') {
                    const { agentType, result } = r.value;
                    contextBridge[agentType] = result;
                    observations.push(`[${agentType.toUpperCase()} CORE]: ${result}`);
                } else {
                    observations.push(`[ERROR]: ${r.reason}`);
                }
            }

            const combinedObs = observations.join('\n\n---\n\n');
            step.observation = combinedObs;
            step.status = 'observing';
            onStep(step);

            history.push({ role: 'assistant', content: rawText });
            history.push({ role: 'user', content: `PARALLEL_OBSERVATION:\n${combinedObs}` });
            continue;
        }

        // ----------------------------------------------------------------
        // Phase 10.2: SYNC CONTEXT — Merge shared_context from both workers
        // ----------------------------------------------------------------
        if (tool === 'sync_context') {
            step.status = 'observing';
            step.agentType = 'search';
            onStep(step);

            // Build a context summary from the bridge + snapshot
            const bridgeParts = Object.entries(contextBridge).map(
                ([k, v]) => `[${k.toUpperCase()}]: ${v.substring(0, 500)}`
            );
            const snapshot = context.sharedContextSnapshot
                ? `[Sandbox Snapshot]: ${context.sharedContextSnapshot.substring(0, 500)}`
                : '';

            const syncSummary = [snapshot, ...bridgeParts].filter(Boolean).join('\n\n');
            const observation = syncSummary || 'No cross-worker context available yet.';

            step.observation = observation;
            onStep(step);

            history.push({ role: 'assistant', content: rawText });
            history.push({ role: 'user', content: `CONTEXT_SYNC_RESULT:\n${observation}` });
            continue;
        }

        // ----------------------------------------------------------------
        // Standard Sequential Dispatch
        // ----------------------------------------------------------------
        step.status = 'delegating';
        onStep(step);

        let observation = '';

        if (tool === 'analyze_excel') {
            step.agentType = 'excel';
            onStep(step);
            try {
                observation = await executeWorker('excel', params.instruction || userRequest, params.fileName);
                contextBridge['excel'] = observation;
            } catch (e: any) {
                observation = `Error from Excel Agent: ${e.message}`;
            }

        } else if (tool === 'read_document') {
            step.agentType = 'document';
            onStep(step);
            try {
                observation = await executeWorker('document', params.instruction || userRequest, params.fileName);
                contextBridge['document'] = observation;
            } catch (e: any) {
                observation = `Error from Document Agent: ${e.message}`;
            }

        } else if (tool === 'search_context') {
            step.agentType = 'search';
            const query = params.query?.toLowerCase() || '';
            const snapshot = context.sharedContextSnapshot || '';
            if (snapshot && snapshot.toLowerCase().includes(query)) {
                observation = `Found in shared_context: ${snapshot.substring(0, 800)}`;
            } else if (contextBridge && Object.values(contextBridge).some(v => v.toLowerCase().includes(query))) {
                const match = Object.entries(contextBridge).find(([, v]) => v.toLowerCase().includes(query));
                observation = `Found in context bridge [${match?.[0]}]: ${match?.[1]?.substring(0, 600)}`;
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
