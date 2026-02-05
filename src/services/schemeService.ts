
import { ExcelMindScheme, SchemeValidationResult } from '../types/scheme';
import { TemplatePlaceholder } from './templateService';
import { FieldMapping } from './documentMappingService';
import { LoopConfig, VirtualColumn } from '../types/documentTypes';

/**
 * Generates an ExcelMind Scheme object from current state.
 */
export const generateScheme = (
    placeholders: TemplatePlaceholder[],
    mappingRules: FieldMapping[],
    loopConfigs: LoopConfig[],
    virtualColumns: VirtualColumn[] = [],
    metaInfo: { sourceTemplateName?: string; description?: string } = {}
): ExcelMindScheme => {
    return {
        version: '1.0',
        meta: {
            createdAt: Date.now(),
            appName: 'ExcelMind AI',
            description: metaInfo.description,
            sourceTemplateName: metaInfo.sourceTemplateName
        },
        config: {
            placeholders,
            mappingRules,
            loopConfigs,
            virtualColumns,
            // formattingRules: {} // Integrated into mappingRules for now
        }
    };
};

/**
 * Downloads the scheme as a .ems (JSON) file.
 */
export const downloadSchemeFile = (scheme: ExcelMindScheme, fileName: string = 'config.ems') => {
    const jsonString = JSON.stringify(scheme, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.ems') ? fileName : `${fileName}.ems`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Parses and validates a .ems file content.
 */
export const parseScheme = (jsonContent: string): SchemeValidationResult => {
    try {
        const scheme = JSON.parse(jsonContent) as ExcelMindScheme;

        // Basic Structure Validation
        if (scheme.version !== '1.0') {
            return { valid: false, errors: [`Unsupported version: ${scheme.version}`], warnings: [] };
        }
        if (!scheme.config || !Array.isArray(scheme.config.mappingRules)) {
            return { valid: false, errors: ['Invalid scheme structure: missing configuration or mapping rules'], warnings: [] };
        }

        return { valid: true, errors: [], warnings: [], scheme };
    } catch (e) {
        return { valid: false, errors: ['Invalid JSON format'], warnings: [] };
    }
};

/**
 * Validates if the scheme matches the current template (Placeholders check).
 */
export const validateSchemeAgainstTemplate = (
    scheme: ExcelMindScheme,
    currentPlaceholders: TemplatePlaceholder[]
): { compatible: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    const schemeKeys = new Set(scheme.config.placeholders.map(p => p.name));
    const currentKeys = new Set(currentPlaceholders.map(p => p.name));

    // Check for missing keys in current template (Scheme has it, Template doesn't)
    // This is okay, just means we have extra rules.

    // Check for missing keys in scheme (Template has it, Scheme doesn't)
    // This means some fields won't be mapped.
    let missingCount = 0;
    currentPlaceholders.forEach(p => {
        if (!schemeKeys.has(p.name)) {
            missingCount++;
        }
    });

    if (missingCount > 0) {
        warnings.push(`Warning: ${missingCount} placeholders in the current template are not defined in the imported scheme.`);
    }

    return { compatible: true, warnings };
};
