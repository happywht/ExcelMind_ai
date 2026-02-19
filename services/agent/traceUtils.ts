import { TraceSession } from '../../types';

/**
 * Converts a TraceSession JSON object into a human-readable Markdown report.
 */
export function traceToMarkdown(session: TraceSession): string {
    let md = `# ExcelMind Execution Trace Log\n\n`;
    md += `- **Session ID**: \`${session.id}\`\n`;
    md += `- **Start Time**: ${session.startTime}\n`;
    md += `- **End Time**: ${session.endTime || 'N/A'}\n`;
    md += `- **User Prompt**: ${session.userPrompt}\n\n`;
    md += `## Execution Chain of Thought\n\n`;

    session.steps.forEach((step) => {
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

    if (session.finalResult) {
        md += `## Final Result\n${session.finalResult.explanation || 'Task completed.'}\n`;
    }

    if (session.error) {
        md += `## ⛔ Global Error\n${session.error}\n`;
    }

    return md;
}
