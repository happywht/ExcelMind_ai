/**
 * AI Processing Service
 * 
 * 负责处理前端的 AI 规则试运行请求。
 * 目前阶段（Phase 4 Start）先使用 Mock 实现，打通 UI 流程。
 * 后续将替换为对 server 端 API 的真实调用。
 */

export interface AIProcessResult {
    result: string;
    confidence?: number;
    cost?: number; // token cost
    error?: string;
}

export const aiProcessingService = {
    /**
     * 执行 AI 规则处理
     * @param rule 用户输入的 AI 规则 (例如: "// AI 提取其中的省市区")
     * @param contextValue 当前单元格的原始值，或整行数据 Context
     * @returns 处理结果
     */
    async processRule(rule: string, contextValue: string | Record<string, any>): Promise<AIProcessResult> {
        const cleanRule = rule.replace(/^\/\/ AI\s*/i, '').trim();

        // 如果 contextValue 是字符串，尝试转为对象或直接传递
        const context = typeof contextValue === 'string' ? { value: contextValue } : contextValue;

        try {
            const response = await fetch('/api/ai/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rule: cleanRule,
                    context
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }

            const data = await response.json();
            return {
                result: data.result,
                cost: data.duration // 暂时用 duration 代替 cost
            };

        } catch (error: any) {
            console.error('[AI Service] Process Failed:', error);
            return {
                result: '',
                error: error.message || 'AI 服务连接失败'
            };
        }
    },

    /**
     * 生成单元格内容 (Phase 4)
     * 根据当前行数据和 Prompt 生成内容
     * @param prompt 用户指令
     * @param rowData 当前行数据
     */
    async generateCellContent(prompt: string, rowData: any): Promise<AIProcessResult> {
        return this.processRule(prompt, rowData);
    },

    /**
     * 智能自动配置映射 (Phase 4)
     * 分析模板和Excel结构，自动生成映射方案
     * @param placeholders Word模板中的占位符列表
     * @param allSheetsHeaders 所有Sheet的表头信息 { sheetName: headers[] }
     */
    async autoConfigMapping(placeholders: string[], allSheetsHeaders: Record<string, string[]>): Promise<import('../types/documentTypes').MappingScheme | null> {
        try {
            // Construct a prompt for the AI
            const context = {
                placeholders,
                sheets: allSheetsHeaders
            };

            // Re-use processRule or a dedicated endpoint?
            // For MVP, we can reuse processRule with a specific instruction, or better, add a dedicated endpoint if backend supports.
            // Since we are mocking/using the generic process endpoint:

            const prompt = `
            Task: Auto-configure mapping between Word Template and Excel Sheets.
            
            Template Placeholders: ${JSON.stringify(placeholders)}
            
            Excel Sheets Headers: ${JSON.stringify(allSheetsHeaders)}
            
            Instructions:
            1. Analyze the semantic relationship between Placeholders and Excel Headers.
            2. Identifying Output Structure: You must return a valid JSON object matching the 'MappingScheme' interface.
            3. CRITICAL: Your JSON must include a "mappings" array. Do not just echo the input.
            
            Output JSON Format Example:
            {
              "explanation": "Brief reasoning",
              "primarySheet": "Sheet1",
              "mappings": [
                { "placeholder": "{{Name}}", "excelColumn": "EmployeeName", "ruleType": "direct" },
                { "placeholder": "{{Date}}", "excelColumn": "JoinDate", "format": "yyyy-MM-dd" }
              ],
              "unmappedPlaceholders": []
            }
            
            IMPORTANT: Return ONLY the JSON code block. No conversational filler.
            `;

            // Calling the same endpoint. In real implementation, this should be a separate 'v2/ai/generate-mapping' or similar.
            // But for now, let's use the generic one and expect JSON result.
            const response = await fetch('/api/ai/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rule: "AUTO_CONFIG",
                    context: context,
                    instruction: prompt // The backend might need to handle this special rule or just treat rule string as instruction
                })
            });

            if (!response.ok) throw new Error("Backend request failed");
            const data = await response.json();

            // 1. Parsing Logic
            let scheme: import('../types/documentTypes').MappingScheme | null = null;
            try {
                let jsonStr = data.result;
                // Attempt to extract JSON from markdown code blocks
                const jsonMatch = jsonStr.match(/```json\s*(\{[\s\S]*?\})\s*```/) || jsonStr.match(/```\s*(\{[\s\S]*?\})\s*```/);
                if (jsonMatch) {
                    jsonStr = jsonMatch[1];
                } else if (jsonStr.indexOf('{') > -1) {
                    // Fallback: try to find the JSON object boundaries
                    const firstOpen = jsonStr.indexOf('{');
                    const lastClose = jsonStr.lastIndexOf('}');
                    if (lastClose > firstOpen) {
                        jsonStr = jsonStr.substring(firstOpen, lastClose + 1);
                    }
                }

                scheme = JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to parse AI Auto-Config result", e, data.result);
                // Don't return null yet, try fallback
            }

            // 2. Client-Side Fallback (Local Heuristic)
            // If AI failed or returned empty mappings, we do it ourselves.
            if (!scheme || !scheme.mappings || !Array.isArray(scheme.mappings) || scheme.mappings.length === 0) {
                console.warn("AI returned empty/invalid mappings, using Local Heuristic Fallback.");
                const fallbackMappings: import('../types/documentTypes').FieldMapping[] = [];
                const fallbackUnmapped: string[] = [];

                // Simple Exact/Fuzzy Match Logic
                const allHeaders = Object.values(allSheetsHeaders).flat();

                placeholders.forEach(ph => {
                    const cleanPh = ph.replace(/[{}]/g, '').trim();
                    // 1. Exact Name Match
                    const exactMatch = allHeaders.find(h => h === cleanPh);
                    if (exactMatch) {
                        fallbackMappings.push({
                            placeholder: ph,
                            excelColumn: exactMatch,
                            ruleType: 'direct'
                        });
                        return;
                    }

                    // 2. Fuzzy Match (Contains)
                    const fuzzyMatch = allHeaders.find(h => h.includes(cleanPh) || cleanPh.includes(h));
                    if (fuzzyMatch) {
                        fallbackMappings.push({
                            placeholder: ph,
                            excelColumn: fuzzyMatch,
                            ruleType: 'direct' // Mark as direct for now
                        });
                        return;
                    }

                    fallbackUnmapped.push(ph);
                });

                scheme = {
                    explanation: "AI Service Unavailable or returned empty. Using Local Best-Effort Matching.",
                    primarySheet: Object.keys(allSheetsHeaders)[0] || 'Sheet1',
                    filterCondition: null,
                    mappings: fallbackMappings,
                    unmappedPlaceholders: fallbackUnmapped,
                    confidence: 0.5
                };
            }

            // Safety check
            if (!scheme.mappings) scheme.mappings = [];
            return scheme as import('../types/documentTypes').MappingScheme;

        } catch (error) {
            console.error('Auto Config Failed:', error);
            // Even on error, try to return a Local Fallback instead of null?
            // For now, return null to show error alert.
            return null;
        }
    },

    /**
     * 分析列内容以推断类型
     * @param header 列名
     * @param samples 样本数据（前几行）
     */
    async analyzeColumnContent(header: string, samples: any[]): Promise<{ type: string; confidence: number; suggestedFormatter?: string }> {
        // 简易规则匹配 (Mock for Phase 2 MVP)
        // 实际项目应调用 LLM 分析

        const sampleValues = samples.filter(v => v !== null && v !== undefined && v !== '').map(String);
        if (sampleValues.length === 0) return { type: 'text', confidence: 0.1 };

        // 1. Check Date
        const isDate = sampleValues.every(v => !isNaN(Date.parse(v)) && (v.includes('-') || v.includes('/') || v.includes('年')));
        if (isDate) {
            return { type: 'date', confidence: 0.9, suggestedFormatter: 'DATE_CN' };
        }

        // 2. Check Currency/Number
        const isNumber = sampleValues.every(v => !isNaN(parseFloat(v.replace(/[¥,]/g, ''))));
        if (isNumber) {
            // Check if it looks like currency (has currency symbol or 2 decimal places usually)
            if (header.includes('金额') || header.includes('费') || header.includes('钱')) {
                return { type: 'number', confidence: 0.85, suggestedFormatter: 'CURRENCY_CN' };
            }
            return { type: 'number', confidence: 0.8 };
        }

        // 3. Check Phone (China)
        const isPhone = sampleValues.some(v => /^1[3-9]\d{9}$/.test(v.replace(/\s/g, '')));
        if (isPhone || header.includes('手机') || header.includes('电话')) {
            return { type: 'text', confidence: 0.95, suggestedFormatter: 'MASK_PHONE' };
        }

        // 4. Check ID Card
        const isID = sampleValues.some(v => /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(v));
        if (isID || header.includes('身份证') || header.includes('证件')) {
            return { type: 'text', confidence: 0.95, suggestedFormatter: 'MASK_ID' };
        }

        return { type: 'text', confidence: 0.5 };
    }
};
