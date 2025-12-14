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

export interface ExcelData {
  id: string; // Unique ID for React keys
  fileName: string;
  sheets: { [sheetName: string]: any[] }; // Array of objects
  currentSheetName: string;
}

export interface ProcessingLog {
  id: string;
  fileName: string;
  status: 'pending' | 'success' | 'error';
  message: string;
}

// We no longer use simple operation lists. 
// We now rely on the AI to generate a transformation script.
export interface AIProcessResult {
  code: string;
  explanation: string;
}
