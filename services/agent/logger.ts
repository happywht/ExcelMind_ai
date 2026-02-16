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
