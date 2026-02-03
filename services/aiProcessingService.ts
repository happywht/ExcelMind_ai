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
    }
};
