
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/utils/logger';

// 确保环境变量已加载
// 注意：在 Electron/Vite 环境中，process.env 可能需要通过 dotenv 加载
import dotenv from 'dotenv';
dotenv.config();

class AIService {
    private client: Anthropic | null = null;
    private model: string = 'glm-4.7';

    constructor() {
        this.initClient();
    }

    private initClient() {
        const apiKey = process.env.ZHIPU_API_KEY;
        const baseURL = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/anthropic';
        this.model = process.env.ZHIPU_MODEL || 'glm-4.7';

        if (!apiKey) {
            logger.warn('AI Service: ZHIPU_API_KEY not found in environment variables.');
            return;
        }

        try {
            this.client = new Anthropic({
                apiKey: apiKey,
                baseURL: baseURL,
            });
            logger.info(`AI Service initialized with model: ${this.model}`);
        } catch (error) {
            logger.error('Failed to initialize AI client:', error);
        }
    }

    /**
     * 处理映射规则
     * @param rule 用户定义的 AI 规则 (e.g. "// AI 提取省份")
     * @param contextData 上下文数据 (通常是 Excel 的一行数据)
     */
    async processMappingRule(rule: string, contextData: Record<string, any>): Promise<string> {
        if (!this.client) {
            this.initClient();
            if (!this.client) {
                throw new Error('AI Service not initialized (Missing API Key)');
            }
        }

        const cleanRule = rule.replace(/^\/\/ AI\s*/i, '').trim();
        const dataContext = JSON.stringify(contextData, null, 2);

        const systemPrompt = `你是一个专业的数据处理助手。你的任务是根据用户提供的规则，从给定的 JSON 数据中提取、转换或生成所需的信息。
请直接返回结果，不要包含任何解释、Markdown 格式或额外的标点符号。如果无法提取，请返回空字符串。`;

        const userMessage = `数据内容:
${dataContext}

处理规则:
${cleanRule}

输出结果:`;

        try {
            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: 1024,
                temperature: 0.1, // 低温度以保证确定性
                system: systemPrompt, // Anthropic SDK 标准写法：system 作为顶层参数
                messages: [
                    { role: 'user', content: userMessage }
                ]
            });

            // Anthropic SDK response structure
            const contentBlock = response.content[0];
            if (contentBlock.type === 'text') {
                return contentBlock.text.trim();
            }
            return '';

        } catch (error) {
            logger.error('AI Processing Error:', error);
            throw error;
        }
    }
}

export const aiService = new AIService();
