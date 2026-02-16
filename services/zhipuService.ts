import { AIProcessResult } from '../types';
import { runAgenticLoop } from './agent/loop';
import { generateExcelFormula } from './formulaService';
import { chatWithKnowledgeBase } from './agent/knowledge';
import { client } from './agent/client'; // Export client for reuse if needed, or keep internal

/**
 * ZhipuService (Facade)
 * Acts as the unified entry point for all AI-related services,
 * delegating actual logic to specialized modules in ./agent/ and ./formulaService.ts
 */

export { generateExcelFormula };
export { chatWithKnowledgeBase };
export { runAgenticLoop };

// Legacy Wrapper for backward compatibility
export const generateDataProcessingCode = async (
  userPrompt: string,
  filesPreview: { fileName: string; headers: string[]; sampleRows: any[] }[]
): Promise<AIProcessResult> => {
  // Transform filesPreview into the initialContext format expected by runAgenticLoop
  const initialContext = filesPreview.map(f => ({
    fileName: f.fileName,
    // Assuming each filePreview represents a single sheet for simplicity in this wrapper
    sheets: ["Sheet1"],
    sample: f.sampleRows
  }));

  // Delegate to the new modular loop
  const result = await runAgenticLoop(userPrompt, initialContext, () => { });

  return {
    steps: result.steps,
    explanation: result.explanation,
    finalCode: result.finalCode
  };
};

// Re-export client for advanced usage (optional)
export { client };