/**
 * Excel Parser Worker (V7.2 Performance)
 * Offloads blocking XLSX file parsing from the main UI thread.
 */
import * as XLSX from 'xlsx';

// Define the shape of data returned to the main thread
interface ParsedSheet {
    name: string;
    data: any[];
    metadata: {
        comments: { [cellAddress: string]: string };
        notes: { [cellAddress: string]: string };
        rowCount: number;
        columnCount: number;
    };
}

interface WorkerResponse {
    type: 'SUCCESS' | 'ERROR';
    fileName: string;
    sheets?: { [sheetName: string]: any[] };
    metadata?: { [sheetName: string]: any };
    error?: string;
    firstSheetName?: string;
    id?: string;
}

// Listen for messages from the main thread
self.onmessage = async (e: MessageEvent) => {
    const { file, id } = e.data;

    try {
        if (!file) throw new Error("No file provided to worker.");

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const sheets: { [sheetName: string]: any[] } = {};
        const metadata: { [sheetName: string]: any } = {};
        let firstSheetName = '';

        workbook.SheetNames.forEach((name, index) => {
            if (index === 0) firstSheetName = name;
            const worksheet = workbook.Sheets[name];

            // Read main table data
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            sheets[name] = jsonData;

            // Extract metadata: comments and notes
            const comments: { [cellAddress: string]: string } = {};
            const notes: { [cellAddress: string]: string } = {};

            // Iterate all cells in the sheet for metadata
            // Optimization: Only scan if the sheet is not empty
            if (worksheet['!ref']) {
                for (const cellAddress in worksheet) {
                    if (cellAddress.startsWith('!')) continue;

                    const cell = worksheet[cellAddress];

                    // Extract cell comments (c)
                    if (cell.c) {
                        cell.c.forEach((comment: any) => {
                            if (comment.a && comment.t) {
                                const commentText = comment.t;
                                const author = comment.a || '';
                                comments[cellAddress] = author ? `[` + author + `]: ` + commentText : commentText;
                            }
                        });
                    }

                    // Extract cell notes/annotations (n)
                    if (cell.n) {
                        notes[cellAddress] = cell.n;
                    }
                }
            }

            // Calculate dimensions
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

            metadata[name] = {
                comments,
                notes,
                rowCount: range.e.r + 1,
                columnCount: range.e.c + 1
            };
        });

        // Send success response
        const response: WorkerResponse = {
            type: 'SUCCESS',
            fileName: file.name,
            sheets,
            metadata,
            firstSheetName,
            id
        };
        self.postMessage(response);

    } catch (err: any) {
        // Send error response
        const response: WorkerResponse = {
            type: 'ERROR',
            fileName: file ? file.name : 'Unknown',
            error: err.message,
            id
        };
        self.postMessage(response);
    }
};
