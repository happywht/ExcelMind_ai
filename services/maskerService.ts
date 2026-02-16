/**
 * DataMasker Service (V4.0 Privacy Shield)
 * Provides semantics-preserving masking to protect sensitive entities (Names, Organizations)
 * while keeping numbers, dates, and summaries intact for AI reasoning.
 */
import { MASKER_CONFIG } from '../config/maskerConfig';

export interface MaskingMap {
    [original: string]: string;
}

export class DataMasker {
    private map: MaskingMap = {};
    private reverseMap: MaskingMap = {};
    private entityCounter = 1;

    /**
     * Identifies and masks entities in a text string.
     * If an entity was already masked, it uses the existing token.
     */
    public mask(text: string): string {
        if (!text || typeof text !== 'string') return text;

        // Improved regex for Chinese entities (2-6 chars)
        const entityRegex = /[\u4e00-\u9fa5]{2,6}/g;

        return text.replace(entityRegex, (match) => {
            // Extended skip keywords for accounting and common UI labels
            const skipKeywords = MASKER_CONFIG.SKIP_KEYWORDS;

            if (skipKeywords.some(k => match === k || (match.length <= 2 && k.includes(match)))) return match;

            // Avoid masking if it's purely descriptive (heuristic: check for common suffixes)
            if (MASKER_CONFIG.DESC_SUFFIXES.some(s => match.endsWith(s))) return match;

            if (!this.map[match]) {
                const token = `ENTITY_${this.entityCounter.toString().padStart(3, '0')}`;
                this.map[match] = token;
                this.reverseMap[token] = match;
                this.entityCounter++;
            }
            return this.map[match];
        });
    }

    /**
     * Specialized masking for the data structure sent to AI (initialContext).
     * It deep-masks strings in the samples while ignoring headers and key columns like '摘要'.
     */
    public maskContext(context: any): any {
        const maskedContext = JSON.parse(JSON.stringify(context));

        const walk = (obj: any, parentKey?: string) => {
            // Respect '摘要' (summary) and '备注' (note) columns - do not mask
            const skipColumns = MASKER_CONFIG.PRESERVE_COLUMNS;
            if (parentKey && skipColumns.some(sc => parentKey.toLowerCase().includes(sc))) {
                return obj;
            }

            if (typeof obj === 'string') {
                return this.mask(obj);
            } else if (Array.isArray(obj)) {
                return obj.map(item => walk(item, parentKey));
            } else if (typeof obj === 'object' && obj !== null) {
                const newObj: any = {};
                for (const key in obj) {
                    if (key === 'fileName' || key === 'sheets' || key === 'headers') {
                        newObj[key] = obj[key];
                    } else {
                        newObj[key] = walk(obj[key], key);
                    }
                }
                return newObj;
            }
            return obj;
        };

        return walk(maskedContext);
    }

    /**
     * Reverses tokens in AI's response (thoughts, explanations) back to original values.
     */
    public unmask(text: string): string {
        if (!text) return text;
        let unmasked = text;
        for (const token in this.reverseMap) {
            // Use global regex replacement for tokens
            const regex = new RegExp(token, 'g');
            unmasked = unmasked.replace(regex, this.reverseMap[token]);
        }
        return unmasked;
    }

    /**
     * Resets the masker for a new session.
     */
    public reset(): void {
        this.map = {};
        this.reverseMap = {};
        this.entityCounter = 1;
    }
}

export const globalMasker = new DataMasker();
