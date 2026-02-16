/**
 * Help modules for Formula Generation and Validation
 */

// 提取关键词
export const extractKeywords = (description: string): string[] => {
    const keywords = [];
    const lowerDesc = description.toLowerCase();

    // 条件判断关键词
    if (lowerDesc.includes('如果') || lowerDesc.includes('判断') || lowerDesc.includes('当')) {
        keywords.push('条件判断');
    }

    // 查找匹配关键词
    if (lowerDesc.includes('查找') || lowerDesc.includes('匹配') || lowerDesc.includes('对应')) {
        keywords.push('查找匹配');
    }

    // 求和计算关键词
    if (lowerDesc.includes('求和') || lowerDesc.includes('总计') || lowerDesc.includes('合计')) {
        keywords.push('求和计算');
    }

    // 计数统计关键词
    if (lowerDesc.includes('计数') || lowerDesc.includes('统计') || lowerDesc.includes('个数')) {
        keywords.push('计数统计');
    }

    // 平均值关键词
    if (lowerDesc.includes('平均') || lowerDesc.includes('均值')) {
        keywords.push('平均值');
    }

    // 日期处理关键词
    if (lowerDesc.includes('日期') || lowerDesc.includes('时间') || lowerDesc.includes('年月日')) {
        keywords.push('日期处理');
    }

    // 文本处理关键词
    if (lowerDesc.includes('文本') || lowerDesc.includes('字符串') || lowerDesc.includes('字符')) {
        keywords.push('文本处理');
    }

    return keywords;
};

// 基本公式验证
export const validateFormula = (formula: string): boolean => {
    try {
        // 检查括号匹配
        let openBrackets = 0;
        for (const char of formula) {
            if (char === '(') openBrackets++;
            if (char === ')') openBrackets--;
            if (openBrackets < 0) return false;
        }

        // 检查函数名格式
        // const functionPattern = /[A-Z_][A-Z0-9_]*\s*\(/g;
        // const functions = formula.match(functionPattern);

        return true;
    } catch (error) {
        return false;
    }
};

// 降级公式生成
export const generateFallbackFormula = (description: string): string => {
    const lowerDesc = description.toLowerCase();

    // 基于关键词生成简单公式
    if (lowerDesc.includes('如果') || lowerDesc.includes('判断')) {
        return '=IF(A1>0,"是","否")';
    }

    if (lowerDesc.includes('求和') || lowerDesc.includes('合计')) {
        return '=SUM(A:A)';
    }

    if (lowerDesc.includes('计数') || lowerDesc.includes('个数')) {
        return '=COUNT(A:A)';
    }

    if (lowerDesc.includes('平均')) {
        return '=AVERAGE(A:A)';
    }

    if (lowerDesc.includes('查找') || lowerDesc.includes('匹配')) {
        return '=VLOOKUP(A1,B:C,3,FALSE)';
    }

    // 默认公式
    return '=A1';
};
