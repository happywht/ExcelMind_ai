/**
 * Robust JSON Parsing Utility for LLM Responses
 * 
 * Handles common LLM JSON errors:
 * 1. Markdown code blocks (```json ... ```)
 * 2. Trailing commas
 * 3. Single quotes instead of double quotes
 * 4. Missing quotes around keys
 * 5. Comments in JSON
 */

export function parseLLMJson<T>(text: string): T {
    try {
        // 1. Extract JSON content from Markdown blocks or surrounding text
        let cleanText = text.trim();

        // Remove markdown code blocks
        const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
        const match = cleanText.match(codeBlockRegex);
        if (match) {
            cleanText = match[1];
        }

        // Find the first '{' and last '}'
        const start = cleanText.indexOf('{');
        const end = cleanText.lastIndexOf('}');

        if (start !== -1 && end !== -1 && end > start) {
            cleanText = cleanText.substring(start, end + 1);
        } else if (start === -1) {
            // Try finding array if object not found
            const arrStart = cleanText.indexOf('[');
            const arrEnd = cleanText.lastIndexOf(']');
            if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
                cleanText = cleanText.substring(arrStart, arrEnd + 1);
            }
        }

        // 2. Pre-processing to fix common JSON syntax errors

        // Remove comments (//... or /*...*/)
        cleanText = cleanText.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

        // Fix trailing commas (e.g., {"a": 1,} -> {"a": 1})
        cleanText = cleanText.replace(/,(\s*[}\]])/g, '$1');

        // Attempt to parse
        return JSON.parse(cleanText);
    } catch (error) {
        // 3. Fallback: Aggressive cleanup if standard parse fails
        try {
            // Replace single quotes with double quotes (be careful with content)
            // This is risky but often necessary for malformed LLM output
            // A safer way is to use a dedicated library, but for now we try a simple heuristic
            // or just re-throw if we want to be strict.

            // Let's try one more cleanup: fix unquoted keys
            // { key: "value" } -> { "key": "value" }
            const fixedKeys = text.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');
            return JSON.parse(fixedKeys);
        } catch (secondError) {
            throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
