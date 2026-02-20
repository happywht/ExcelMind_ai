export enum AppView {
  DASHBOARD = 'DASHBOARD',
  SMART_OPS = 'SMART_OPS',
  FORMULA = 'FORMULA',
  KNOWLEDGE_CHAT = 'KNOWLEDGE_CHAT',
  SMART_DOC = 'SMART_DOC',
}

// ChatMessage is defined in the SIAP section below (Phase 9.0)

export interface SheetMetadata {
  comments: { [cellAddress: string]: string };
  notes?: { [cellAddress: string]: string };
  rowCount: number;
  columnCount: number;
}

export interface ExcelData {
  id: string; // Unique ID for React keys
  fileName: string;
  sheets: { [sheetName: string]: any[] }; // Array of objects mapping column headers to row values
  currentSheetName: string;
  metadata?: { [sheetName: string]: SheetMetadata };
}

export interface ProcessingLog {
  id: string;
  fileName: string;
  status: 'pending' | 'success' | 'error';
  message: string;
}

// Agentic reasoning types
export interface AgenticStep {
  thought: string;
  action: {
    tool: 'inspect_sheet' | 'read_rows' | 'execute_python' | 'finish';
    params: any;
  };
  observation?: string;
  logs?: string; // Real-time stdout logs
  status?: 'pending' | 'approving' | 'executing' | 'completed' | 'rejected';
  isPlanning?: boolean;
}

export interface TraceStep {
  turn: number;
  thought: string;
  action: any;
  observation?: string;
  audit?: {
    approved: boolean;
    reason?: string;
  };
  error?: string;
  timestamp: string;
}

export interface TraceSession {
  id: string;
  userPrompt: string;
  initialContext: any;
  startTime: string;
  endTime?: string;
  steps: TraceStep[];
  finalResult?: any;
  error?: string;
}

export interface AIProcessResult {
  steps: AgenticStep[];
  explanation: string;
  finalCode?: string;
  trace?: TraceSession;
  generatedFiles?: string[];
}

// ============================================================
// SIAP: Standardized Inter-Agent Protocol (Phase 10.2) 🎻🧠
// ============================================================

/** Tools the Orchestrator can dispatch to Worker Agents */
export type OrchestratorTool =
  | 'analyze_excel'      // Invoke Smart Excel (Analysis Worker)
  | 'read_document'      // Invoke Smart Document (Doc Worker)
  | 'parallel_dispatch'  // Phase 10.2: Fire multiple sub-tasks concurrently
  | 'search_context'     // Search shared_context for already-loaded data
  | 'sync_context'       // Phase 10.2: Snapshot & merge shared_context from both workers
  | 'write_memo'         // Phase 11.1: Append a note to orchestrator memo
  | 'read_memo'          // Phase 11.1: Read summarized memo for cross-step reasoning
  | 'generate_report'    // Summarize and present results to the user
  | 'finish';            // End conversation turn

/** A single concurrent task within a parallel_dispatch */
export interface ParallelSubTask {
  /** Target worker: 'doc' routes to Doc Worker; 'excel' to Analysis Worker */
  core: 'doc' | 'excel';
  tool: 'analyze_excel' | 'read_document';
  params: OrchestratorAction['params'];
}

/** A single tool call dispatched from the Orchestrator */
export interface OrchestratorAction {
  tool: OrchestratorTool;
  params: {
    instruction?: string;     // Natural language instruction for the worker
    fileName?: string;        // Target file name
    query?: string;           // For search_context / sync_context
    summary?: string;         // For generate_report / finish
    tasks?: ParallelSubTask[]; // Phase 10.2: For parallel_dispatch
    title?: string;           // Phase 11.1: For write_memo note title
    content?: string;         // Phase 11.1: For write_memo note content
    [key: string]: any;
  };
}

/** A step in the Orchestrator's reasoning chain */
export interface OrchestratorStep {
  thought: string;
  /** Phase 10.3: The "Manager Voice" - direct message to the user */
  speak?: string;
  action: OrchestratorAction;
  observation?: string;
  status: 'thinking' | 'delegating' | 'observing' | 'finished' | 'error' | 'parallel';
  /** Which sub-agent handled this step (Phase 10.3: can be an array if multiple dispatch) */
  agentType?: 'excel' | 'document' | 'search' | 'orchestrator' | 'parallel';
  timestamp: number;
  /** Phase 10.2: For parallel steps, the group of sub-tasks fired concurrently */
  parallelGroup?: { core: string; tool: string; label: string; status: 'running' | 'done' | 'error' }[];
}

/** Full chat message, now extended to carry orchestration metadata */
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  /** Orchestration thought steps rendered as "Thought Bubbles" */
  orchestrationSteps?: OrchestratorStep[];
  isStreaming?: boolean;
}

/** RPC Style communication state */
export interface PendingRequest {
  resolve: (val: any) => void;
  reject: (err: any) => void;
  onLog?: (content: string) => void;
  accumulatedLogs: string;
}

export type WorkerMessage = any;
