export enum AppView {
  DASHBOARD = 'DASHBOARD',
  SMART_OPS = 'SMART_OPS',
  FORMULA = 'FORMULA',
  KNOWLEDGE_CHAT = 'KNOWLEDGE_CHAT',
  DOCUMENT_SPACE = 'DOCUMENT_SPACE', // 新增：文档空间
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
  metadata?: {
    [sheetName: string]: {
      comments: { [cellAddress: string]: string }; // 单元格注释
      notes?: { [cellAddress: string]: string }; // 单元格标注
      rowCount: number;
      columnCount: number;
    }
  };
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
