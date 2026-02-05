import { TemplatePlaceholder } from '../services/templateService';
import { FieldMapping } from '../services/documentMappingService';
import { LoopConfig, VirtualColumn } from './documentTypes';

/**
 * ExcelMind Scheme (.ems)
 * A lightweight JSON format to store mapping logic and configurations.
 * 
 * Version 1.0
 */
export interface ExcelMindScheme {
    version: '1.0';
    meta: {
        createdAt: number;
        appName: 'ExcelMind AI';
        appVersion?: string;
        description?: string; // Optional user description
        sourceTemplateName?: string; // Information only, to hint which Word doc this belongs to
    };
    config: {
        // 1. Target Structure (What placeholders are we filling?)
        placeholders: TemplatePlaceholder[];

        // 2. Mapping Logic (How do we fill them?)
        mappingRules: FieldMapping[];

        // 3. Transformations (Formatter configurations)
        // Note: If formatters are stored within FieldMapping (FormatterConfig), 
        // we might not need a separate record. 
        // But if we have global named formatters, they go here.
        // For now, FieldMapping includes FormatterConfig, so this is optional or for future extensibility.
        formattingRules?: Record<string, any>;

        // 4. Advanced Logic (Loops and Virtuals)
        loopConfigs: LoopConfig[];

        // Virtual Columns are arguably part of the Mapping Logic (preprocessing)
        virtualColumns: VirtualColumn[];

        // 5. Global Settings
        globalSettings?: {
            outputFileNaming?: string; // e.g., "${Department}_Report.docx"
        };
    };
}

/**
 * Validation Result for Scheme Import
 */
export interface SchemeValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    scheme?: ExcelMindScheme;
}
