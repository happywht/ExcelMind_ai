/**
 * =====================================================
 * ExcelMind Orchestrator Agent (Phase 10.3) 🧠💖🎻
 * =====================================================
 *
 * The Orchestrator is now a "Manager Persona" Liaison.
 * It combines Liberal Arts (Intuition/Empathy) with STEM (Rigour/Logic).
 *
 * Protocol SIAP v3:
 *   - thought: Internal monologue for logical planning.
 *   - speak:   Managerial voice for user communication (Liberal Arts).
 *   - action:  Machine-readable tool dispatch (STEM).
 */

import { OrchestratorAction, OrchestratorStep, OrchestratorTool, ParallelSubTask } from '../../types';
import { client } from './client';

export interface OrchestratorContext {
    excelFiles: Array<{ fileName: string; sheets: string[]; rowCount: number }>;
    documentFiles: string[];
    sharedContextSnapshot?: string;
}

export type OnOrchestratorStep = (step: OrchestratorStep) => void;

/**
 * 经理人模式提示词 (The Manager Persona)
 */
const ORCHESTRATOR_SYSTEM_PROMPT = (ctx: OrchestratorContext) => `
你是 ExcelMind 的"审计经理人"(Audit Manager, Phase 10.3)。
你不再是一个冷冰冰的路由器，而是一个具备"文理兼修"素质的联络官。

## 你的角色特质
1. **文科思维 (Liberal Arts)**: 关注用户意图，展现专业共情。如果任务模糊，先确认需求；如果是复杂任务，先解释你的分析思路（用人话）。
2. **理工细节 (STEM)**: 在分派任务给底层 Worker 时，必须严谨、准确地使用参数和 JSON 协议。

## 当前沙箱状态 (上下文切片)
- **Excel 文件**: ${ctx.excelFiles.length === 0 ? '无' : ctx.excelFiles.map(f => `${f.fileName} (${f.sheets.join(', ')}, 共${f.rowCount}行)`).join('; ')}
- **文档文件**: ${ctx.documentFiles.length === 0 ? '无' : ctx.documentFiles.join(', ')}
- **已加载上下文摘要**: ${ctx.sharedContextSnapshot || '空'}

## 输出规范 (SIAP v3 混合协议)

你**必须**严格返回以下 JSON 格式：

\`\`\`json
{
  "thought": "你的内心逻辑推演 (不对用户展示，仅用于逻辑对齐)",
  "speak": "你想对用户说的话 (专业、温和、解释性。如果当前步骤是纯后台操作，可以为空)",
  "action": {
    "tool": "工具名",
    "params": { ... }
  }
}
\`\`\`

**可用工具**:
1. \`analyze_excel\`: 委托分析核心处理复杂数据运算。
2. \`read_document\`: 委托文档核心提取文本/表格。
3. \`parallel_dispatch\`: 当需要同时处理 PDF 和 Excel 时使用。
4. \`sync_context\`: 合并双核状态，消除信息差。
5. \`search_context\`: 查找已有的处理结果。
6. \`finish\`: 最终任务汇报（summary 中应包含完整的分析结论）。

## 核心战术指导
- **先沟通再行动**: 如果用户指令如"分析一下"过于宽泛，利用 \`speak\` 询问具体维度，再调用简单工具或等待下一次反馈。
- **解释复杂性**: 在执行复杂的 \`parallel_dispatch\` 前，用 \`speak\` 告诉用户你打算从哪几个维度进行并发分析。
- **融合推理**: 永远记住你是"大脑"， Worker 是"手"。你的价值在于整合两者的观察结果。
`;

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

    let contextBridge: Record<string, string> = {};
    const MAX_TURNS = 10; // 略微增加轮次以支持更多沟通

    for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (signal?.aborted) throw new Error('Aborted');

        const response = await client.messages.create({
            model: 'glm-4-flash',
            max_tokens: 1536,
            system: ORCHESTRATOR_SYSTEM_PROMPT(context),
            messages: history.map(h => ({ role: h.role, content: h.content })),
        });

        const rawText = (response.content?.[0] as any)?.text ?? '';

        // --- 解析 SIAP v3 混合响应 ---
        let parsed: { thought: string; speak?: string; action: OrchestratorAction } | null = null;
        try {
            const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) || rawText.match(/({[\s\S]*})/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1].trim());
            }
        } catch (e) {
            parsed = {
                thought: 'Fallback: parse failed.',
                speak: rawText,
                action: { tool: 'finish', params: { summary: rawText } }
            };
        }

        if (!parsed) return rawText;

        // 构造 UI 步进对象
        const step: OrchestratorStep = {
            thought: parsed.thought,
            speak: parsed.speak,
            action: parsed.action,
            status: 'thinking',
            agentType: 'orchestrator',
            timestamp: Date.now(),
        };

        const { tool, params } = parsed.action;

        // --- 逻辑处理与分发 ---
        if (tool === 'finish') {
            step.status = 'finished';
            onStep(step);
            return parsed.speak || params.summary || '任务已完成。';
        }

        // 处理并行调度
        if (tool === 'parallel_dispatch') {
            const tasks: ParallelSubTask[] = params.tasks || [];
            step.status = 'parallel';
            step.agentType = 'parallel';
            step.parallelGroup = tasks.map(t => ({
                core: t.core,
                tool: t.tool,
                label: t.core === 'doc' ? '📄 文档提取中...' : '📊 数据计算中...',
                status: 'running' as const,
            }));
            onStep(step);

            const taskPromises = tasks.map(async (task, i) => {
                const agentType = task.core === 'doc' ? 'document' : 'excel';
                const instruction = task.params?.instruction || userRequest;
                try {
                    const res = await executeWorker(agentType, instruction, task.params?.fileName);
                    if (step.parallelGroup) step.parallelGroup[i].status = 'done';
                    return { agentType, res };
                } catch (e: any) {
                    if (step.parallelGroup) step.parallelGroup[i].status = 'error';
                    return { agentType, res: `Error: ${e.message}` };
                }
            });

            const results = await Promise.allSettled(taskPromises);
            const observations = results.map(r => r.status === 'fulfilled' ? `[${r.value.agentType}]: ${r.value.res}` : `[ERROR]: ${r.reason}`).join('\n\n');

            step.observation = observations;
            step.status = 'observing';
            onStep(step);

            history.push({ role: 'assistant', content: rawText });
            history.push({ role: 'user', content: `PARALLEL_RESULT:\n${observations}` });
            continue;
        }

        // 常规单核分发
        step.status = 'delegating';
        onStep(step);

        let observation = '';
        if (tool === 'analyze_excel') {
            step.agentType = 'excel';
            onStep(step);
            try {
                observation = await executeWorker('excel', params.instruction || userRequest, params.fileName);
            } catch (e: any) { observation = `Error: ${e.message}`; }
        } else if (tool === 'read_document') {
            step.agentType = 'document';
            onStep(step);
            try {
                observation = await executeWorker('document', params.instruction || userRequest, params.fileName);
            } catch (e: any) { observation = `Error: ${e.message}`; }
        } else if (tool === 'search_context') {
            step.agentType = 'search';
            const query = params.query?.toLowerCase() || '';
            observation = context.sharedContextSnapshot?.toLowerCase().includes(query) ? `Found: ${context.sharedContextSnapshot.substring(0, 500)}` : 'No data found.';
        }

        step.observation = observation;
        step.status = 'observing';
        onStep(step);

        history.push({ role: 'assistant', content: rawText });
        history.push({ role: 'user', content: `OBSERVATION: ${observation}` });
    }

    return '分析轮次过多，建议您细化任务需求。';
};
