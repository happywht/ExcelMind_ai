
import { MappingScheme, FieldMapping, CrossSheetMapping, LoopMapping, VirtualColumn } from '../types/documentTypes';

export type GapStatus = 'valid' | 'missing_source' | 'type_mismatch' | 'unmapped';

export interface GapItem {
    placeholder: string;
    status: GapStatus;
    suggestion?: string;
    mappedSource?: string; // e.g., "Excel: ColumnA" or "Virtual: Date"
    details?: string;
}

export interface GapReport {
    items: GapItem[];
    summary: {
        total: number;
        valid: number;
        missing: number;
        unmapped: number;
    };
}

/**
 * Analyzes the gap between Template Requirements (Placeholders) and Data Supply (Scheme + Headers)
 */
export const analyzeGaps = (
    placeholders: string[],
    scheme: MappingScheme,
    primaryHeaders: string[],
    allSheetsHeaders: Record<string, string[]> = {}
): GapReport => {

    const items: GapItem[] = placeholders.map(placeholder => {
        // 1. Check Direct Mappings
        const directMapping = scheme.mappings.find(m => m.placeholder === placeholder);
        if (directMapping) {
            // Check if source column exists in Primary Sheet
            // Handle Virtual Columns
            if (directMapping.excelColumn.startsWith('[虚拟] ')) {
                const vcName = directMapping.excelColumn;
                const vc = scheme.virtualColumns?.find(v => v.name === vcName);
                if (vc) {
                    return {
                        placeholder,
                        status: 'valid',
                        mappedSource: `Virtual: ${vc.type}`,
                        details: vc.type === 'ai' ? `Prompt: ${vc.aiPrompt}` : `Value: ${vc.value}`
                    };
                } else {
                    return {
                        placeholder,
                        status: 'missing_source',
                        mappedSource: vcName,
                        details: 'Virtual column definition missing'
                    };
                }
            }

            // Handle Standard Columns
            if (primaryHeaders.includes(directMapping.excelColumn)) {
                return {
                    placeholder,
                    status: 'valid',
                    mappedSource: `Excel: ${directMapping.excelColumn}`
                };
            } else {
                return {
                    placeholder,
                    status: 'missing_source',
                    mappedSource: directMapping.excelColumn,
                    details: `Column not found in sheet "${scheme.primarySheet}"`
                };
            }
        }

        // 2. Check Cross Sheet Mappings
        if (scheme.crossSheetMappings) {
            const crossMapping = scheme.crossSheetMappings.find(m => m.placeholder === placeholder);
            if (crossMapping) {
                const sheetHeaders = allSheetsHeaders[crossMapping.sourceSheet];
                if (!sheetHeaders) {
                    return {
                        placeholder,
                        status: 'missing_source',
                        mappedSource: `Sheet: ${crossMapping.sourceSheet}`,
                        details: 'Source sheet not found'
                    };
                }
                if (!sheetHeaders.includes(crossMapping.sourceColumn)) {
                    return {
                        placeholder,
                        status: 'missing_source',
                        mappedSource: `Sheet: ${crossMapping.sourceSheet}`,
                        details: `Column "${crossMapping.sourceColumn}" not found`
                    };
                }
                return {
                    placeholder,
                    status: 'valid',
                    mappedSource: `Cross-Sheet: ${crossMapping.sourceSheet}.${crossMapping.sourceColumn}`
                };
            }
        }

        // 3. Check Loop Mappings (Nested)
        // Loop mapping structure is complex. Usually placeholders inside loops are not top-level placeholders.
        // However, if the user manually put a loop placeholder like {#Projects} in the list (docxtemplater parses it),
        // we need to check if there is a LoopMapping for it.

        // Basic Loop Check: Check if this placeholder IS a loop start/end tag, or inside one?
        // Usually 'placeholders' passed here are extracted vars. 
        // If docxtemplater extracts "Projects", and we have a loop mapping for "Projects", it's valid.

        if (scheme.loopMappings) {
            const loopMatch = scheme.loopMappings.find(l => l.loopPlaceholder === placeholder || l.loopPlaceholder === `#${placeholder}` || l.loopPlaceholder === placeholder.replace(/^#/, ''));
            if (loopMatch) {
                const sheetHeaders = allSheetsHeaders[loopMatch.sourceSheet];
                if (!sheetHeaders) {
                    return {
                        placeholder,
                        status: 'missing_source',
                        mappedSource: `Loop Source: ${loopMatch.sourceSheet}`,
                        details: 'Loop source sheet not found'
                    };
                }
                return {
                    placeholder,
                    status: 'valid',
                    mappedSource: `Loop: ${loopMatch.sourceSheet}`
                };
            }
        }

        // 4. Fallback: Unmapped
        return {
            placeholder,
            status: 'unmapped',
            suggestion: 'Click to Map'
        };
    });

    const summary = {
        total: items.length,
        valid: items.filter(i => i.status === 'valid').length,
        missing: items.filter(i => i.status === 'missing_source').length,
        unmapped: items.filter(i => i.status === 'unmapped').length
    };

    return { items, summary };
};
