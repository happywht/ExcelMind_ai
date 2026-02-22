/**
 * =====================================================
 * ExcelMind Orchestrator Agent (Phase 11.1) 📓🧠💖🎻
 * =====================================================
 *
 * Phase 11.1 新能力：Memorandum (备忘录机制)
 * - write_memo: 将单文件分析结果写入草稿本
 * - read_memo:  将草稿本摘要注入下一次推理的上下文
 * - 突破单次 Context 限制，支持跨文件多步推理
 *
 * 架构层次：
 *   L0  用户请求 (KnowledgeChat)
 *   L1  Orchestrator (THIS FILE) - 指挥官 / 经理人
 *   L1b Memorandum (memo.ts) - 草稿本
 *   L2a Analysis Worker - 计算核心
 *   L2b Doc Worker      - 文档核心
 *   L3  Safety Auditor  - 安全护栏
 */

import { OrchestratorAction, OrchestratorStep, ParallelSubTask } from '../../types';
import { client } from './client';
import { Memorandum, createMemo } from './memo';
import { extractActionFromResponse } from './parser';

export interface OrchestratorContext {
    excelFiles: Array<{ fileName: string; sheets: string[]; rowCount: number }>;
    documentFiles: string[];
    sharedContextSnapshot?: string;
}

export type OnOrchestratorStep = (step: OrchestratorStep) => void;

// ----------------------------------------------------------------
// 系统提示词 (Phase 11.1: 经理人 + 备忘录 双能力)
// ----------------------------------------------------------------
const ORCHESTRATOR_SYSTEM_PROMPT = (ctx: OrchestratorContext, memo: Memorandum) => `
你是 ExcelMind 的"审计经理人"(Audit Manager, Phase 11.1)。
你现在拥有一个强大的新工具：**备忘录 (Memorandum)**。

## 你的角色
1. **经理人直觉 (文科)**：理解用户意图，用"人话"解释你的思路与进展。
2. **分析严谨 (理工)**：精确调用 Worker 核心，记录并整合每一步的分析结果。
3. **长程记忆 (备忘录)**：对于复杂多步任务，分批写入笔记，最终汇总。

## 当前状态
- **Excel 文件**: ${ctx.excelFiles.length === 0 ? '无' : ctx.excelFiles.map(f => `${f.fileName} (${f.sheets.join(', ')}, ${f.rowCount}行)`).join('; ')}
- **文档文件**: ${ctx.documentFiles.length === 0 ? '无' : ctx.documentFiles.join(', ')}
- **上下文摘要**: ${ctx.sharedContextSnapshot || '空'}
- **备忘录状态**: ${memo.isEmpty ? '空 (尚未记录)' : `已有 ${memo.count} 条记录`}

${!memo.isEmpty ? `## 当前备忘录摘要\n${memo.read(1000)}` : ''}

## 输出格式 (SIAP v3)

必须返回以下 JSON：
\`\`\`json
{
  "thought": "内心逻辑推演",
  "speak": "对用户说的人话 (可选，在关键节点说明进展或询问)",
  "action": { "tool": "工具名", "params": { ... } }
}
\`\`\`

## 工具清单

1. \`analyze_excel\`: 让分析核心运行 Python/Pandas。
   - params: \`{ "instruction": "...", "fileName": "..." }\`
2. \`read_document\`: 让文档核心提取文本。
   - params: \`{ "instruction": "...", "fileName": "..." }\`
3. \`parallel_dispatch\`: 并发执行多个任务（同时有 PDF 和 Excel 时用）.
   - params: \`{ "tasks": [{...}, {...}] }\`
4. \`write_memo\`: ⭐ 【新工具】将关键发现写入备忘录。
   - params: \`{ "title": "笔记标题", "content": "核心指标或结论", "fileName": "来源文件名" }\`
   - **使用时机**：分析完一个文件后，将核心指标写入备忘录，然后继续下一个文件。
5. \`read_memo\`: ⭐ 【新工具】读取备忘录，进行跨文件综合推理。
   - params: \`{}\` （无需参数，直接读取）
   - **使用时机**：所有文件都分析完毕，准备做最终汇总对比时使用。
6. \`search_context\`: 查找已有数据。
   - params: \`{ "query": "..." }\`
7. \`finish\`: 返回最终答案。
   - params: \`{ "summary": "Markdown 格式的完整结论" }\`

## 核心战术
- **多文件任务必用备忘录**：每分析一个文件就 \`write_memo\`，最后 \`read_memo\` 做汇总，绝不试图在一次 LLM 调用中记住所有文件的所有细节。
- **先说再做**：执行耗时任务前，用 \`speak\` 告知用户进展（如"我现在先分析 2021 年的报表..."）。
- **最多 10 步**：超过限制后直接 finish，总结当前成果。
`;

// ----------------------------------------------------------------
// 主函数 (Phase 11.1)
// ----------------------------------------------------------------
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

    // Phase 10.2: 跨轮次上下文桥接
    let contextBridge: Record<string, string> = {};
    // Phase 11.1: 每次对话创建独立草稿本
    const memo: Memorandum = createMemo();

    const MAX_TURNS = 10;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (signal?.aborted) throw new Error('Aborted');

        const response = await client.messages.create({
            model: process.env.ZHIPU_MODEL || 'glm-4.7',
            max_tokens: 1536,
            system: ORCHESTRATOR_SYSTEM_PROMPT(context, memo),
            messages: history.map(h => ({ role: h.role, content: h.content })),
        });

        const rawText = (response.content?.[0] as any)?.text ?? '';

        // 解析 SIAP v3 混合响应 (Unified Parser)
        const parsedState = extractActionFromResponse(response, rawText);

        // Map to local structure
        const parsed = {
            thought: parsedState.thought,
            speak: parsedState.speak,
            action: parsedState.action as OrchestratorAction
        };

        if (!parsed.action) return rawText;

        const step: OrchestratorStep = {
            thought: parsed.thought,
            speak: parsed.speak,
            action: parsed.action,
            status: 'thinking',
            agentType: 'orchestrator',
            timestamp: Date.now(),
        };

        const { tool, params } = parsed.action;

        // ── finish ────────────────────────────────────────────────
        if (tool === 'finish' || tool === 'generate_report') {
            step.status = 'finished';
            memo.clear(); // 任务完成，清理草稿本
            onStep(step);
            return parsed.speak || params.summary || '任务已完成。';
        }

        // ── Phase 11.1: write_memo ────────────────────────────────
        if (tool === 'write_memo') {
            step.status = 'observing';
            step.agentType = 'orchestrator';
            const title = params.title || `记录 #${memo.count + 1}`;
            const content = params.content || params.instruction || '(空)';
            memo.append(title, content, params.fileName || params.source);
            step.observation = `📓 已写入备忘录: "${title}" (共 ${memo.count} 条)`;
            onStep(step);
            history.push({ role: 'assistant', content: rawText });
            history.push({ role: 'user', content: `MEMO_WRITE_OK: ${step.observation}` });
            continue;
        }

        // ── Phase 11.1: read_memo ─────────────────────────────────
        if (tool === 'read_memo') {
            step.status = 'observing';
            step.agentType = 'orchestrator';
            const memoContent = memo.read();
            step.observation = memoContent;
            onStep(step);
            history.push({ role: 'assistant', content: rawText });
            history.push({ role: 'user', content: `MEMO_READ_RESULT:\n${memoContent}` });
            continue;
        }

        // ── Phase 10.2: parallel_dispatch ────────────────────────
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
                try {
                    const res = await executeWorker(agentType, task.params?.instruction || userRequest, task.params?.fileName);
                    if (step.parallelGroup) step.parallelGroup[i].status = 'done';
                    return { agentType, res };
                } catch (e: any) {
                    if (step.parallelGroup) step.parallelGroup[i].status = 'error';
                    return { agentType, res: `Error: ${e.message}` };
                }
            });

            const results = await Promise.allSettled(taskPromises);
            const obs = results.map(r => r.status === 'fulfilled'
                ? `[${r.value.agentType}]: ${r.value.res}`
                : `[ERROR]: ${r.reason}`
            ).join('\n\n');

            step.observation = obs;
            step.status = 'observing';
            onStep(step);
            history.push({ role: 'assistant', content: rawText });
            history.push({ role: 'user', content: `PARALLEL_RESULT:\n${obs}` });
            continue;
        }

        // ── 常规单核分发 ──────────────────────────────────────────
        step.status = 'delegating';
        let observation = '';

        if (tool === 'analyze_excel') {
            step.agentType = 'excel';
            onStep(step);
            try {
                observation = await executeWorker('excel', params.instruction || userRequest, params.fileName);
                contextBridge['excel'] = observation;
            } catch (e: any) { observation = `Error: ${e.message}`; }

        } else if (tool === 'read_document') {
            step.agentType = 'document';
            onStep(step);
            try {
                observation = await executeWorker('document', params.instruction || userRequest, params.fileName);
                contextBridge['document'] = observation;
            } catch (e: any) { observation = `Error: ${e.message}`; }

        } else if (tool === 'sync_context') {
            step.agentType = 'search';
            const bridgeParts = Object.entries(contextBridge).map(([k, v]) => `[${k}]: ${v.substring(0, 400)}`);
            const snap = context.sharedContextSnapshot ? `[Snapshot]: ${context.sharedContextSnapshot.substring(0, 400)}` : '';
            observation = [snap, ...bridgeParts].filter(Boolean).join('\n\n') || 'No cross-worker context available.';

        } else if (tool === 'search_context') {
            step.agentType = 'search';
            const q = params.query?.toLowerCase() || '';
            const snap = context.sharedContextSnapshot || '';
            if (snap.toLowerCase().includes(q)) {
                observation = `Found in snapshot: ${snap.substring(0, 600)}`;
            } else {
                const match = Object.entries(contextBridge).find(([, v]) => v.toLowerCase().includes(q));
                observation = match ? `Found in bridge[${match[0]}]: ${match[1].substring(0, 500)}` : 'No match found.';
            }
        }

        step.observation = observation;
        step.status = 'observing';
        onStep(step);
        history.push({ role: 'assistant', content: rawText });
        history.push({ role: 'user', content: `OBSERVATION: ${observation}` });
    }

    memo.clear();
    return '已达最大分析轮次。';
};
