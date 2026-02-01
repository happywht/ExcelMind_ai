/**
 * AI服务适配器 - Phase 2 核心服务
 *
 * 职责：封装智谱AI调用，为数据质量模块提供统一的AI接口
 * 功能：清洗建议生成、执行代码生成、数据分析
 *
 * @module services/agentic/aiServiceAdapter
 * @version 1.0.0
 * @description 智能数据处理增强模块的AI服务适配器
 */

import { logger } from '@/utils/logger';
import Anthropic from "@anthropic-ai/sdk";
import { IAIService } from '../../types/dataQuality';

/**
 * AI服务适配器
 *
 * 实现IAIService接口，封装智谱AI的具体调用逻辑
 */
export class AIServiceAdapter implements IAIService {
  private client: Anthropic | null = null;

  /**
   * 构造函数
   */
  constructor() {
    // 延迟初始化客户端
  }

  /**
   * 获取AI客户端（延迟初始化）
   */
  private getClient(): Anthropic {
    if (!this.client) {
      const isNodeEnv = typeof process !== 'undefined' && process.env !== undefined;
      const apiKey = isNodeEnv
        ? (process.env.ZHIPU_API_KEY || process.env.API_KEY || '')
        : (import.meta.env.VITE_ANTHROPIC_API_KEY || '');

      if (!apiKey) {
        throw new Error('AI服务API密钥未配置。请检查环境变量：\n' +
          '- Node.js环境: ZHIPU_API_KEY 或 API_KEY\n' +
          '- 浏览器环境: VITE_ANTHROPIC_API_KEY');
      }

      this.client = new Anthropic({
        apiKey,
        baseURL: 'https://open.bigmodel.cn/api/anthropic',
        dangerouslyAllowBrowser: true // 允许浏览器环境调用（个人使用可接受）
      });
    }
    return this.client;
  }

  /**
   * 分析数据
   *
   * @param prompt 分析提示词
   * @returns AI生成的分析结果
   */
  async analyze(prompt: string): Promise<string> {
    try {
      const response = await this.getClient().messages.create({
        model: 'glm-4.6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      if (response.content[0]?.type === 'text') {
        return response.content[0].text;
      }

      throw new Error('AI响应格式错误');
    } catch (error) {
      logger.error('[AIServiceAdapter] 分析失败:', error);
      throw new Error(`AI分析失败: ${error.message}`);
    }
  }

  /**
   * 生成代码
   *
   * @param prompt 代码生成提示词
   * @returns AI生成的代码
   */
  async generateCode(prompt: string): Promise<string> {
    try {
      const enhancedPrompt = `${prompt}

请只返回代码，不要包含markdown代码块标记（如\`\`\`python），不要包含任何解释文字。

直接返回可执行的Python代码。`;

      const response = await this.getClient().messages.create({
        model: 'glm-4.6',
        max_tokens: 3000,
        messages: [{ role: 'user', content: enhancedPrompt }]
      });

      if (response.content[0]?.type === 'text') {
        let code = response.content[0].text.trim();

        // 移除可能的markdown代码块标记
        code = code.replace(/^```python\n?/, '').replace(/^```\n?/, '');
        code = code.replace(/\n```$/g, '').trim();

        return code;
      }

      throw new Error('AI响应格式错误');
    } catch (error) {
      logger.error('[AIServiceAdapter] 代码生成失败:', error);
      throw new Error(`代码生成失败: ${error.message}`);
    }
  }

  /**
   * 生成清洗建议
   *
   * @param issues 数据质量问题列表
   * @returns AI生成的清洗建议
   */
  async generateCleaningRecommendations(issues: any[]): Promise<string> {
    const prompt = this.buildCleaningPrompt(issues);
    return await this.analyze(prompt);
  }

  /**
   * 生成数据清洗执行代码
   *
   * @param strategy 清洗策略
   * @param dataSample 数据样本
   * @returns Python执行代码
   */
  async generateCleaningCode(strategy: any, dataSample?: any[]): Promise<string> {
    const prompt = this.buildCodePrompt(strategy, dataSample);
    return await this.generateCode(prompt);
  }

  /**
   * 分析数据特征
   *
   * @param data 数据
   * @returns 数据特征分析结果
   */
  async analyzeDataCharacteristics(data: any[]): Promise<string> {
    const prompt = this.buildDataAnalysisPrompt(data);
    return await this.analyze(prompt);
  }

  /**
   * 构建清洗建议提示词
   */
  private buildCleaningPrompt(issues: any[]): string {
    return `作为数据质量专家，请分析以下数据问题并提供清洗建议：

**发现的问题**：
${issues.map((issue, i) => `
${i + 1}. ${issue.issueType || issue.type}
   - 位置: ${issue.affectedColumns?.join(', ') || issue.location?.column || '未知'}
   - 影响行数: ${issue.statistics?.affectedRowCount || issue.affectedRows?.length || 0}
   - 严重程度: ${issue.severity}
   - 描述: ${issue.description}
`).join('\n')}

请为每个问题提供：
1. 问题原因分析
2. 推荐的清洗策略（填充、删除、替换、标准化等）
3. 预期改善效果
4. 风险评估
5. 执行复杂度评估

请以JSON格式返回建议，格式如下：
{
  "recommendations": [
    {
      "issueIndex": 1,
      "strategy": "fill_mean",
      "strategyName": "使用平均值填充",
      "reasoning": "详细解释为什么选择这个策略",
      "expectedImpact": {
        "dataRetentionRate": 1.0,
        "qualityImprovement": 15,
        "affectedRows": 100
      },
      "riskLevel": "low",
      "priority": 0.9,
      "estimatedTime": 500
    }
  ]
}`;
  }

  /**
   * 构建代码生成提示词
   */
  private buildCodePrompt(strategy: any, dataSample?: any[]): string {
    const { strategyId, name, type, parameters } = strategy;

    return `生成Python代码来执行以下数据清洗策略：

**策略**: ${name}
**类型**: ${type}
**参数**: ${JSON.stringify(parameters, null, 2)}

**数据结构**：
- 变量 files 是字典，key是文件名，value是数据数组
- 每行数据是字典，key是列名
- 目标列: ${parameters.targetColumn}

**要求**：
1. 使用pandas进行数据处理
2. 修改files字典中的数据
3. 最后使用print输出JSON格式的files字典
4. 添加错误处理
5. 代码要健壮，处理各种边界情况

**数据样本**：
${JSON.stringify(dataSample?.slice(0, 5) || [], null, 2)}

**示例代码框架**：
\`\`\`python
import pandas as pd
import json

def clean_data(files):
    try:
        # 获取数据
        file_name = list(files.keys())[0]
        data = pd.DataFrame(files[file_name])

        # TODO: 实现清洗逻辑
        # 策略: ${name}
        # 类型: ${type}

        # 保存结果
        files[file_name] = data.to_dict('records')

        return json.dumps(files, ensure_ascii=False, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)

# 执行清洗
print(clean_data(files))
\`\`\`

请根据策略生成完整的Python代码。`;
  }

  /**
   * 构建数据分析提示词
   */
  private buildDataAnalysisPrompt(data: any[]): string {
    const sampleSize = Math.min(data.length, 20);
    const sample = data.slice(0, sampleSize);

    return `分析以下数据的特征：

**数据样本**（前${sampleSize}行）：
${JSON.stringify(sample, null, 2)}

请分析：
1. 数据类型分布
2. 可能的缺失值情况
3. 可能的异常值情况
4. 数据格式的一致性
5. 数据质量评估
6. 改进建议

请以JSON格式返回分析结果。`;
  }
}

/**
 * 创建AI服务适配器实例
 */
export function createAIServiceAdapter(): AIServiceAdapter {
  return new AIServiceAdapter();
}

// 导出默认实例
export const aiServiceAdapter = new AIServiceAdapter();
