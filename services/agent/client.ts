import Anthropic from "@anthropic-ai/sdk";

// 配置智谱AI (Using Anthropic SDK Bridge)
export const client = new Anthropic({
    apiKey: process.env.ZHIPU_API_KEY || process.env.API_KEY || '',
    baseURL: 'https://open.bigmodel.cn/api/anthropic',
    dangerouslyAllowBrowser: true // 允许在浏览器环境中使用
});
