export enum AppView {
  DASHBOARD = 'DASHBOARD',
  SMART_OPS = 'SMART_OPS',
  FORMULA = 'FORMULA',
  KNOWLEDGE_CHAT = 'KNOWLEDGE_CHAT',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

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
}
