/**
 * DataMasker Service (V4.0 Privacy Shield)
 * Provides semantics-preserving masking to protect sensitive entities (Names, Organizations)
 * while keeping numbers, dates, and summaries intact for AI reasoning.
 */

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
            const skipKeywords = [
                '张表', '公式', '科目', '金额', '日期', '摘要', '合计', '序号', '名称', '类型', '工作',
                '文件', '利润', '收入', '支出', '核对', '匹配', '查找', '导出', '导入', '点击', '按钮',
                '公司', '工作表', '工作簿', '单元格', '列头', '表头', '样本', '数据'
            ];

            if (skipKeywords.some(k => match === k || (match.length <= 2 && k.includes(match)))) return match;

            // Avoid masking if it's purely descriptive (heuristic: check for common suffixes)
            const commonDescSuffixes = ['表', '项', '类', '额', '率', '数', '位'];
            if (commonDescSuffixes.some(s => match.endsWith(s))) return match;

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
            const skipColumns = ['摘要', '备注', '说明', 'abstract', 'summary', 'note', 'comment'];
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
