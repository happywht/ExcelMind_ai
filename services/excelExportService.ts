import ExcelJS from 'exceljs';

export interface AuditSheetStyles {
    headerColor: string;
    headerFontColor: string;
    borderColor: string;
    rowAlternateColor: string;
}

const DEFAULT_STYLES: AuditSheetStyles = {
    headerColor: 'FF1F4E78', // Dark Blue
    headerFontColor: 'FFFFFFFF', // White
    borderColor: 'FFD9D9D9', // Light Grey
    rowAlternateColor: 'FFF2F2F2' // Very Light Grey
};

/**
 * AuditExportService
 * Handles the generation of professional, standardized audit workpapers.
 */
export class AuditExportService {
    /**
     * Generates a standardized Excel file with audit branding and formulas.
     */
    public async generateStandardWorkpaper(
        filename: string,
        projectName: string,
        data: any[],
        headers: string[],
        sheetName: string = '审计审定表'
    ): Promise<Blob> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName, {
            headerFooter: {
                firstHeader: `&L${projectName}&R&D`,
                firstFooter: '&C第 &P 页，共 &N 页'
            }
        });

        // 1. Setup Columns
        worksheet.columns = headers.map(h => ({
            header: h,
            key: h,
            width: 15
        }));

        // 2. Style Header
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: DEFAULT_STYLES.headerColor }
            };
            cell.font = {
                bold: true,
                color: { argb: DEFAULT_STYLES.headerFontColor },
                size: 11
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // 3. Add Data Rows
        data.forEach((row, index) => {
            const addedRow = worksheet.addRow(row);

            // Alternate row shading
            if (index % 2 === 1) {
                addedRow.eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: DEFAULT_STYLES.rowAlternateColor }
                    };
                });
            }

            // Add borders and handle formula detection
            addedRow.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // If the value looks like a formula (starts with =), treat it as such
                const value = cell.value;
                if (typeof value === 'string' && value.startsWith('=')) {
                    cell.value = { formula: value.substring(1), result: undefined };
                }
            });
        });

        // 4. Auto-filter
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: headers.length }
        };

        // 5. Freeze top row
        worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

        const buffer = await workbook.xlsx.writeBuffer();
        return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    /**
     * Batch export multiple sheets into one professional workbook.
     */
    public async generateMultiSheetAuditReport(
        projectName: string,
        sheets: { name: string, headers: string[], data: any[] }[]
    ): Promise<Blob> {
        const workbook = new ExcelJS.Workbook();

        for (const s of sheets) {
            const worksheet = workbook.addWorksheet(s.name);
            worksheet.columns = s.headers.map(h => ({ header: h, key: h, width: 15 }));

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

            s.data.forEach(rowData => {
                const row = worksheet.addRow(rowData);
                row.eachCell(cell => {
                    const val = cell.value;
                    if (typeof val === 'string' && val.startsWith('=')) {
                        cell.value = { formula: val.substring(1), result: undefined };
                    }
                });
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
}

export const auditExportService = new AuditExportService();
