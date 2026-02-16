import { client } from './agent/client';
import { extractKeywords, validateFormula, generateFallbackFormula } from './agent/tools';

/**
 * Service: Formula Generation
 * Focuses purely on translating natural language to Excel formulas.
 */

export const generateExcelFormula = async (description: string): Promise<string> => {
    try {
        // Analyse user description
        const keywords = extractKeywords(description);

        const enhancedPrompt = `你是一个专业的Excel公式专家。请根据用户需求生成准确的Excel公式。

**用户需求**: "${description}"

**关键信息识别**: ${keywords.join(', ')}

**要求**:
1. 生成以 = 开头的完整Excel公式
2. 优先使用现代Excel函数（如XLOOKUP, FILTER, SUMIFS等）
3. 确保公式语法正确，函数参数完整
4. 对于复杂条件，使用IF, IFS, CHOOSE等条件函数
5. 对于数据处理，使用TEXT, VALUE, DATE等格式化函数
6. 避免使用过时的函数（如VLOOKUP，除非必要）

**常用函数参考**:
- 查找: XLOOKUP, INDEX-MATCH, VLOOKUP
- 条件: IF, IFS, COUNTIFS, SUMIFS, AVERAGEIFS
- 文本: TEXT, CONCAT, LEFT, RIGHT, MID, FIND, SEARCH
- 日期: DATE, EDATE, EOMONTH, DATEDIF
- 数学: ROUND, INT, MOD, ABS
- 逻辑: AND, OR, NOT, ISBLANK, ISERROR

**示例格式**:
- 条件判断: =IF(A1>100,"高","低")
- 查找匹配: =XLOOKUP(A1, B:B, C:C, "未找到")
- 条件求和: =SUMIFS(A:A, B:B, ">0", C:C, "销售")

请生成最合适的Excel公式，不要包含markdown代码块或解释文字。`;

        const response = await client.messages.create({
            model: process.env.ZHIPU_MODEL || "glm-4.7",
            max_tokens: 1500, // Increased token limit for complex formulas
            messages: [{
                role: "user",
                content: enhancedPrompt
            }]
        });

        const text = response.content[0]?.type === 'text' ? response.content[0].text : "";

        // Validate generated formula
        const formula = text.trim();
        if (!formula.startsWith('=')) {
            throw new Error('生成的公式必须以=开头');
        }

        // Check basic syntax
        if (!validateFormula(formula)) {
            throw new Error('生成的公式语法可能有问题');
        }

        return formula;
    } catch (error) {
        console.error("Formula Gen Error:", error);

        // Fallback: Return a basic safe formula
        return generateFallbackFormula(description);
    }
};
