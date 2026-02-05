export enum AppView {
  DASHBOARD = 'DASHBOARD',
  SMART_OPS = 'SMART_OPS',
  FORMULA = 'FORMULA',
  KNOWLEDGE_CHAT = 'KNOWLEDGE_CHAT',
  DOCUMENT_SPACE = 'DOCUMENT_SPACE', // 文档空间
  BATCH_GENERATION = 'BATCH_GENERATION', // 新增：批量生成
  DATA_QUALITY = 'DATA_QUALITY', // 新增：数据质量分析
  AUDIT_ASSISTANT = 'AUDIT_ASSISTANT', // 新增：审计助手 (独立功能)
  AI_TOOLS = 'AI_TOOLS', // AI工具箱 (公式)
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ExcelData {
  id?: string; // Unique ID for React keys (可选)
  fileName?: string;
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
