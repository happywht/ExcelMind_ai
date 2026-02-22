/**
 * Agent Parser Module
 * Encapsulates logic for extracting structured actions from AI responses.
 * Handles nested JSON, fuzzy matching, and native tool calls.
 */

// Helper: Normalize tool call structure
export const fuzzyMapAction = (raw: any): any => {
    if (!raw) return null;

    // Phase 5: Handle GLM-4.7 returning action as a string (e.g., "action": "execute_python") and code block outside JSON
    if (typeof raw === 'string') {
        const toolPattern = /^[a-zA-Z_0-9]+$/;
        if (toolPattern.test(raw)) {
            return { tool: raw, params: {} };
        }
        return null;
    }

    if (typeof raw !== 'object') return null;

    // 1. Standard patterns (tool/tool_name/name + params/arguments/input)
    let tool = raw.tool || raw.tool_name || raw.name || raw.function?.name || raw.tool_use?.name;
    let params = raw.params || raw.parameters || raw.arguments || raw.input || raw.function?.arguments;

    // 2. Nested pattern: { "tool_name": { "param_key": "val" } }
    if (!tool) {
        const commonTools = ['execute_python', 'inspect_sheet', 'read_rows', 'finish', 'generate_report', 'generate_rich_text', 'write_memo', 'read_memo', 'read_document', 'read_document_page', 'search_document', 'analyze_excel', 'parallel_dispatch', 'search_context', 'sync_context'];
        const foundKey = Object.keys(raw).find(k => commonTools.includes(k));
        if (foundKey) {
            tool = foundKey;
            params = raw[foundKey];
        }
    }

    if (tool) {
        // Recursive check: Sometimes parameters are nested again
        if (params && typeof params === 'object' && !params.code && !params.fileName && !params.summary && !params.instruction && !params.query) {
            const nested = fuzzyMapAction(params);
            if (nested) return nested;
        }

        const finalParams = typeof params === 'string' ? JSON.parse(params) : (params || {});

        // --- Robustness: Auto-map aliases for execute_python ---
        if (tool === 'execute_python') {
            if (!finalParams.code && finalParams.input) finalParams.code = finalParams.input;
            if (!finalParams.code && finalParams.instruction) finalParams.code = finalParams.instruction;
        }

        return {
            tool: tool,
            params: finalParams
        };
    }
    return null;
};

// Main Processor
export const extractActionFromResponse = (response: any, text: string): { thought: string; speak?: string; action: any } => {
    let stepData: any = { thought: "", speak: "", action: null };
    const resp = response as any;

    // 1. Scan ALL content blocks for information (Anthropic Style)
    if (response.content && Array.isArray(response.content)) {
        response.content.forEach((block: any) => {
            if (block.type === 'text') {
                stepData.thought += block.text + "\n";
                // Check for embedded JSON in this text block as a resilient source
                try {
                    // Phase 10: Priority matching - sort candidates by length DESC to find the most complete JSON first
                    const jsonMatches = block.text.match(/\{[\s\S]*?\}/g);
                    if (jsonMatches) {
                        // Sort longer (more complete) JSON first to avoid matching inner sub-objects
                        const sorted = [...jsonMatches].sort((a, b) => b.length - a.length);
                        for (const jsonStr of sorted) {
                            try {
                                const embeddedJson = JSON.parse(jsonStr);
                                let candidateAction = null;

                                if (embeddedJson.action) {
                                    candidateAction = fuzzyMapAction(embeddedJson.action);
                                    if (embeddedJson.speak) stepData.speak = embeddedJson.speak;
                                } else if (embeddedJson.tool_calls?.[0]) {
                                    candidateAction = fuzzyMapAction(embeddedJson.tool_calls[0]);
                                } else {
                                    candidateAction = fuzzyMapAction(embeddedJson);
                                    if (embeddedJson.speak) stepData.speak = embeddedJson.speak;
                                }

                                if (candidateAction) {
                                    stepData.action = candidateAction;
                                    if (embeddedJson.thought) stepData.thought = embeddedJson.thought;
                                    if (embeddedJson.speak) stepData.speak = embeddedJson.speak;
                                    break;
                                }
                            } catch (e) { /* Invalid JSON chunk, skip */ }
                        }
                    }
                } catch (e) { /* Ignore parsing errors for partial text blocks */ }
            }
            if (block.type === 'tool_use') {
                console.log("[Resilience] Detected Native SDK tool_use block");
                stepData.action = fuzzyMapAction(block);
            }
        });
    }

    // 2. Fallback: Parse raw text if structured content didn't yield result (OpenAI/GLM style usually returns text)
    if (!stepData.action && text) {
        // Try cleaning markdown code blocks
        const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/({[\s\S]*})/);
        if (jsonMatch) {
            try {
                const embeddedJson = JSON.parse(jsonMatch[1].trim());
                if (embeddedJson.action) {
                    stepData.action = fuzzyMapAction(embeddedJson.action);
                    if (embeddedJson.speak) stepData.speak = embeddedJson.speak;
                }
                else stepData.action = fuzzyMapAction(embeddedJson);

                if (embeddedJson.thought) stepData.thought = embeddedJson.thought;
                if (embeddedJson.speak) stepData.speak = embeddedJson.speak;
            } catch (e) { console.warn("Failed to parse fallback JSON block"); }
        }
    }

    // 3. Secondary Fallback: Detect native top-level tool_calls (specific to some API wrappers)
    if (!stepData.action && resp.tool_calls && resp.tool_calls.length > 0) {
        console.log("[Resilience] Detected Top-Level Native Tool Calls");
        stepData.action = fuzzyMapAction(resp.tool_calls[0]);
    }

    // --- 4. Strict Argument Guardian ---
    // Fix cases where AI sends a tool name but forgets the actual code/params
    if (stepData.action && stepData.action.tool) {
        const tool = stepData.action.tool;
        const p = stepData.action.params || {};

        if (tool === 'execute_python' && !p.code) {
            console.warn("[Resilience] execute_python missing code, attempting extraction from full text response");
            // Try to extract code block from full text instead of just thought, because LLM often places it OUTSIDE the JSON
            const codeMatch = text.match(/```python\n([\s\S]*?)```/) || text.match(/```\n([\s\S]*?)```/);
            if (codeMatch) {
                stepData.action.params = { ...p, code: codeMatch[1].trim() };
            } else {
                console.error("[Resilience] Failed to find code for execute_python in full text");
            }
        }
    }

    // 5. Final Fallback: Search the entire text for finish keywords if still no action
    if (!stepData.action || !stepData.action.tool) {
        const fullText = (stepData.thought || text).toLowerCase();
        if (fullText.includes('finish') || fullText.includes('完成')) {
            stepData.action = { tool: 'finish', params: { summary: text } };
        }
    }

    // Default thought if empty
    if (!stepData.thought || stepData.thought.trim() === "") stepData.thought = text || "Thinking...";

    return stepData;
};
