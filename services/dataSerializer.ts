
import { ExcelData } from '../types';

/**
 * Serializes Excel Data into a text format suitable for LLM Context.
 * It summarizes the structure, headers, and provides sample rows.
 */
export const formatExcelDataForAI = (excelData: ExcelData): string => {
    let context = `DOCUMENT: ${excelData.fileName}\n`;
    context += `TYPE: Excel Spreadsheet\n`;
    context += `SHEETS: ${Object.keys(excelData.sheets).join(', ')}\n\n`;

    Object.entries(excelData.sheets).forEach(([sheetName, rows]) => {
        context += `--- SHEET: ${sheetName} ---\n`;

        // Metadata if available
        if (excelData.metadata && excelData.metadata[sheetName]) {
            const meta = excelData.metadata[sheetName];
            context += `Dimemsions: ${meta.rowCount} rows x ${meta.columnCount} columns\n`;
        } else {
            context += `Row Count: ${rows.length}\n`;
        }

        if (rows.length === 0) {
            context += `(Empty Sheet)\n\n`;
            return;
        }

        // Get Headers
        const headers = Object.keys(rows[0]);
        context += `Columns: ${headers.join(', ')}\n`;

        // Type Inference (Simple)
        context += `Column Types:\n`;
        headers.forEach(header => {
            const sampleValue = rows[0][header];
            const type = typeof sampleValue;
            context += `  - ${header}: ${type} (e.g., "${String(sampleValue).substring(0, 50)}")\n`;
        });

        // Sample Data (First 5 rows)
        context += `\nSample Data (First 5 Rows):\n`;
        // Create Markdown Table
        context += `| ${headers.join(' | ')} |\n`;
        context += `| ${headers.map(() => '---').join(' | ')} |\n`;

        rows.slice(0, 5).forEach(row => {
            const rowStr = headers.map(h => {
                const val = row[h];
                if (val === null || val === undefined) return '';
                return String(val).replace(/\n/g, ' ').substring(0, 50); // Escape newlines and truncate
            }).join(' | ');
            context += `| ${rowStr} |\n`;
        });

        context += `\n`;
    });

    return context;
};

/**
 * Formats multiple files.
 */
export const formatWorkspaceFilesForAI = (files: ExcelData[], activeFileId?: string | null): string => {
    if (files.length === 0) return "No active Excel files in workspace.";

    let output = "=== CURRENT WORKSPACE EXCEL DATA ===\n\n";

    // Sort to put active file first
    const sortedFiles = [...files].sort((a, b) => {
        if (a.id === activeFileId) return -1;
        if (b.id === activeFileId) return 1;
        return 0;
    });

    sortedFiles.forEach(file => {
        output += formatExcelDataForAI(file);
        output += "\n=====================================\n\n";
    });

    return output;
};
