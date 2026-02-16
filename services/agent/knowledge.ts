import { client } from './client';

export const chatWithKnowledgeBase = async (
    query: string,
    history: { role: string; text: string }[],
    contextDocs: string
): Promise<string> => {
    try {
        let systemInstruction = "你是一个专业的财务和审计数据处理助手。请使用中文回答用户的问题。";
        if (contextDocs) {
            systemInstruction += `\n\n请参考以下知识库内容来回答问题：\n${contextDocs}`;
        }

        // 转换历史记录格式（取最近10条）
        const messages: any[] = [];

        // 添加系统指令
        messages.push({
            role: "user",
            content: systemInstruction
        });

        // 添加历史对话
        const recentHistory = history.slice(-10);
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.text
            });
        }

        // 添加当前问题
        messages.push({
            role: 'user',
            content: query
        });

        const response = await client.messages.create({
            model: process.env.ZHIPU_MODEL || "glm-4.7",
            max_tokens: 4096,
            messages: messages
        });

        const text = response.content[0]?.type === 'text' ? response.content[0].text : "";
        return text || "我无法生成回答。";
    } catch (error) {
        console.error("Chat Error:", error);
        return "抱歉，连接 AI 服务时出现错误。";
    }
};
