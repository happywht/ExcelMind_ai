/**
 * Agent Parser Module
 * Encapsulates logic for extracting structured actions from AI responses.
 * Handles nested JSON, fuzzy matching, and native tool calls.
 */

// Helper: Normalize tool call structure
export const fuzzyMapAction = (raw: any): any => {
    if (!raw || typeof raw !== 'object') return null;

    // 1. Standard patterns (tool/tool_name/name + params/arguments/input)
    let tool = raw.tool || raw.tool_name || raw.name || raw.function?.name || raw.tool_use?.name;
    let params = raw.params || raw.parameters || raw.arguments || raw.input || raw.function?.arguments;

    // 2. Nested pattern: { "tool_name": { "param_key": "val" } }
    if (!tool) {
        const commonTools = ['execute_python', 'inspect_sheet', 'read_rows', 'finish'];
        const foundKey = Object.keys(raw).find(k => commonTools.includes(k));
        if (foundKey) {
            tool = foundKey;
            params = raw[foundKey];
        }
    }

    if (tool) {
        // Recursive check: Sometimes parameters are nested again
        if (params && typeof params === 'object' && !params.code && !params.fileName && !params.summary) {
            const nested = fuzzyMapAction(params);
            if (nested) return nested;
        }

        return {
            tool: tool,
            params: typeof params === 'string' ? JSON.parse(params) : (params || {})
        };
    }
    return null;
};

// Main Processor
export const extractActionFromResponse = (response: any, text: string): { thought: string; action: any } => {
    let stepData: any = { thought: "", action: null };
    const resp = response as any;

    // 1. Scan ALL content blocks for information (Anthropic Style)
    if (response.content && Array.isArray(response.content)) {
        response.content.forEach((block: any) => {
            if (block.type === 'text') {
                stepData.thought += block.text + "\n";
                // Check for embedded JSON in this text block as a resilient source
                try {
                    const jsonMatch = block.text.match(/\{[\s\S]*\}/g);
                    if (jsonMatch) {
                        const embeddedJson = JSON.parse(jsonMatch[jsonMatch.length - 1]);

                        // Fuzzy Search for Action inside JSON
                        // Path A: Top level action object
                        if (embeddedJson.action) {
                            const mapped = fuzzyMapAction(embeddedJson.action);
                            if (mapped) stepData.action = mapped;
                        }
                        // Path B: Native tool_calls array inside JSON
                        if (!stepData.action && embeddedJson.tool_calls?.[0]) {
                            const mapped = fuzzyMapAction(embeddedJson.tool_calls[0]);
                            if (mapped) stepData.action = mapped;
                        }
                        // Path C: Flat structure (tool + params at top level)
                        if (!stepData.action) {
                            const mapped = fuzzyMapAction(embeddedJson);
                            if (mapped) stepData.action = mapped;
                        }

                        if (embeddedJson.thought) stepData.thought = embeddedJson.thought;
                    }
                } catch (e) { /* Ignore parsing errors for partial text blocks */ }
            }
            if (block.type === 'tool_use') {
                console.log("[Resilience] Detected Native SDK tool_use block");
                stepData.action = fuzzyMapAction(block);
            }
        });
    }

    // 2. Secondary Fallback: Detect native top-level tool_calls (specific to some API wrappers)
    if (!stepData.action && resp.tool_calls && resp.tool_calls.length > 0) {
        console.log("[Resilience] Detected Top-Level Native Tool Calls");
        stepData.action = fuzzyMapAction(resp.tool_calls[0]);
    }

    // --- 3. Strict Argument Guardian ---
    // Fix cases where AI sends a tool name but forgets the actual code/params
    if (stepData.action && stepData.action.tool) {
        const tool = stepData.action.tool;
        const p = stepData.action.params || {};

        if (tool === 'execute_python' && !p.code) {
            console.warn("[Resilience] execute_python missing code, attempting extraction from thought");
            // Try to extract code block from thought if present
            const codeMatch = stepData.thought.match(/```python\n([\s\S]*?)```/);
            if (codeMatch) {
                stepData.action.params = { ...p, code: codeMatch[1].trim() };
            } else {
                console.error("[Resilience] Failed to find code for execute_python");
            }
        }

        if (tool === 'inspect_sheet' && !p.fileName) {
            // Will be handled in loop context with initialContext fallback if needed
            // But for parser purity, we just flag it
            console.warn("[Resilience] inspect_sheet missing fileName");
        }
    }

    // 3. Final Fallback: Search the entire text for finish keywords if still no action
    if (!stepData.action || !stepData.action.tool) {
        const fullText = (stepData.thought || text).toLowerCase();
        if (fullText.includes('finish') || fullText.includes('完成')) {
            stepData.action = { tool: 'finish', params: {} };
        }
    }

    // Default thought if empty
    if (!stepData.thought || stepData.thought.trim() === "") stepData.thought = text || "Thinking...";

    return stepData;
};
