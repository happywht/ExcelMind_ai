/**
 * TraceLogger Module
 * Captures granular execution details for debugging and optimization.
 */

import { TraceSession } from '../../types';

export class TraceLogger {
    private session: TraceSession;

    constructor(userPrompt: string, initialContext: any) {
        this.session = {
            id: `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userPrompt,
            initialContext,
            startTime: new Date().toISOString(),
            steps: []
        };
    }

    logStep(turn: number, thought: string, action: any) {
        this.session.steps.push({
            turn,
            thought,
            action,
            timestamp: new Date().toISOString()
        });
    }

    logObservation(turn: number, observation: string) {
        const step = this.session.steps.find(s => s.turn === turn);
        if (step) {
            step.observation = observation;
        }
    }

    logAudit(turn: number, approved: boolean, reason?: string) {
        const step = this.session.steps.find(s => s.turn === turn);
        if (step) {
            step.audit = { approved, reason };
        }
    }

    logError(turn: number, error: string) {
        const step = this.session.steps.find(s => s.turn === turn);
        if (step) {
            step.error = error;
        } else {
            this.session.error = error;
        }
    }

    finish(finalResult: any) {
        this.session.endTime = new Date().toISOString();
        this.session.finalResult = finalResult;
    }

    getTrace(): TraceSession {
        return this.session;
    }

    exportJSON(): string {
        return JSON.stringify(this.session, null, 2);
    }

    exportMarkdown(): string {
        let md = `# ExcelMind Execution Trace Log\n\n`;
        md += `- **Session ID**: \`${this.session.id}\`\n`;
        md += `- **Start Time**: ${this.session.startTime}\n`;
        md += `- **End Time**: ${this.session.endTime || 'N/A'}\n`;
        md += `- **User Prompt**: ${this.session.userPrompt}\n\n`;
        md += `## Execution Chain of Thought\n\n`;

        this.session.steps.forEach((step, index) => {
            md += `### Turn ${step.turn + 1}\n`;
            md += `#### 🧠 Thought\n${step.thought}\n\n`;
            md += `#### 🛠️ Action\n\`\`\`json\n${JSON.stringify(step.action, null, 2)}\n\`\`\`\n\n`;

            if (step.observation) {
                md += `#### 👁️ Observation\n\`\`\`\n${step.observation}\n\`\`\`\n\n`;
            }

            if (step.audit) {
                md += `#### 🛡️ Audit\n- **Approved**: ${step.audit.approved ? '✅' : '❌'}\n`;
                if (step.audit.reason) md += `- **Reason**: ${step.audit.reason}\n`;
                md += `\n`;
            }

            if (step.error) {
                md += `#### ❌ Error\n> ${step.error}\n\n`;
            }

            md += `---\n\n`;
        });

        if (this.session.finalResult) {
            md += `## Final Result\n${this.session.finalResult.explanation || 'Task completed.'}\n`;
        }

        if (this.session.error) {
            md += `## ⛔ Global Error\n${this.session.error}\n`;
        }

        return md;
    }

    downloadMarkdown() {
        if (typeof window === 'undefined') return;

        const blob = new Blob([this.exportMarkdown()], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `excelmind_trace_${this.session.id}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    download() {
        if (typeof window === 'undefined') return;

        const blob = new Blob([this.exportJSON()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `excelmind_trace_${this.session.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
