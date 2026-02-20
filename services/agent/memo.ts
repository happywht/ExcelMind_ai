/**
 * =====================================================
 * Orchestrator Memorandum (Phase 11.1) 📓
 * =====================================================
 *
 * 备忘录机制：为指挥官提供跨轮次的"草稿本"能力。
 *
 * 设计原则：
 * - 超轻量：纯内存，无持久化，会话结束即清除。
 * - 分批写入：每次 append 一条带标题的笔记。
 * - 摘要读取：read 只返回压缩摘要（≤1200 字符），避免撑爆 Context。
 *
 * 使用场景：
 * - 对比 5 年财报：每年一次 `write_memo`，最后一次 `read_memo` 汇总。
 * - 多文件交叉分析：每个文件的关键指标写入 Memo，最后综合推理。
 */

export interface MemoEntry {
    title: string;       // 笔记标题，例如 "Q1 2021 净利润"
    content: string;     // 提取的关键数据
    timestamp: number;   // 写入时间
    source?: string;     // 数据来源文件名（可选）
}

export class Memorandum {
    private entries: MemoEntry[] = [];
    private readonly MAX_CONTENT_PER_ENTRY = 400; // per entry content limit

    /** 追加一条笔记 */
    append(title: string, content: string, source?: string): void {
        // 截断过长 content，保留关键信息
        const truncated = content.length > this.MAX_CONTENT_PER_ENTRY
            ? content.substring(0, this.MAX_CONTENT_PER_ENTRY) + '... [truncated]'
            : content;

        this.entries.push({
            title,
            content: truncated,
            timestamp: Date.now(),
            source,
        });
    }

    /**
     * 读取备忘录摘要（供 Orchestrator LLM 使用）
     * 格式化为可读的 Markdown，总长度受限。
     */
    read(maxChars = 1400): string {
        if (this.entries.length === 0) {
            return '(备忘录为空，尚未记录任何笔记)';
        }

        let summary = `📓 **备忘录摘要** (共 ${this.entries.length} 条记录)\n\n`;
        for (const entry of this.entries) {
            const line = `**[${entry.title}]**${entry.source ? ` (来源: ${entry.source})` : ''}\n${entry.content}\n\n`;
            if ((summary + line).length > maxChars) {
                summary += `... (${this.entries.length - this.entries.indexOf(entry)} 条记录因长度限制被省略)`;
                break;
            }
            summary += line;
        }
        return summary.trim();
    }

    /** 清除所有笔记（任务完成后调用） */
    clear(): void {
        this.entries = [];
    }

    /** 当前笔记数量 */
    get count(): number {
        return this.entries.length;
    }

    /** 是否为空 */
    get isEmpty(): boolean {
        return this.entries.length === 0;
    }
}

/** 全局单例：每次 runOrchestrator 调用时由外部传入，实现会话级隔离 */
export const createMemo = (): Memorandum => new Memorandum();
