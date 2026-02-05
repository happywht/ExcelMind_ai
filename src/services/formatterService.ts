
/**
 * Formatter Service
 * 
 * Manages built-in data formatters and generates JavaScript code for mappings.
 * Used to provide "Low-Code" configuration capabilities in the Mapping Editor.
 */

export interface FormatterDefinition {
    id: string;
    label: string;
    category: 'date' | 'number' | 'text' | 'mask';
    description: string;
    // Generate the JS code. 'val' is the variable name (default 'value')
    generateCode: (params?: any) => string;
}

export const PRESET_FORMATTERS: FormatterDefinition[] = [
    // --- Date Formatters ---
    {
        id: 'DATE_ISO',
        label: '日期 (2023-12-31)',
        category: 'date',
        description: '标准 ISO 日期格式',
        generateCode: () => `
      if (!value) return '';
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return date.toISOString().split('T')[0];
    `.trim()
    },
    {
        id: 'DATE_CN',
        label: '日期 (2023年12月31日)',
        category: 'date',
        description: '中文日期格式',
        generateCode: () => `
      if (!value) return '';
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return \`\${date.getFullYear()}年\${date.getMonth() + 1}月\${date.getDate()}日\`;
    `.trim()
    },
    {
        id: 'DATE_DOT',
        label: '日期 (2023.12.31)',
        category: 'date',
        description: '点号分隔日期',
        generateCode: () => `
      if (!value) return '';
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return \`\${date.getFullYear()}.\${String(date.getMonth() + 1).padStart(2, '0')}.\${String(date.getDate()).padStart(2, '0')}\`;
    `.trim()
    },

    // --- Number Formatters ---
    {
        id: 'CURRENCY_CN',
        label: '金额 (¥1,000.00)',
        category: 'number',
        description: '人民币格式，保留两位小数',
        generateCode: () => `
      if (value === null || value === undefined || value === '') return '';
      const num = parseFloat(String(value));
      if (isNaN(num)) return value;
      return '¥' + num.toFixed(2).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
    `.trim()
    },
    {
        id: 'NUMBER_THOUSAND',
        label: '数字 (1,000)',
        category: 'number',
        description: '千分位分隔',
        generateCode: () => `
      if (value === null || value === undefined || value === '') return '';
      const num = parseFloat(String(value));
      if (isNaN(num)) return value;
      return num.toLocaleString();
    `.trim()
    },

    // --- Text Formatters ---
    {
        id: 'TRIM',
        label: '去除首尾空格',
        category: 'text',
        description: '自动清理文本前后的空白字符',
        generateCode: () => `return String(value || '').trim();`
    },
    {
        id: 'UPPERCASE',
        label: '转大写 (ABC)',
        category: 'text',
        description: '转换为大写字母',
        generateCode: () => `return String(value || '').toUpperCase();`
    },

    // --- Mask Formatters ---
    {
        id: 'MASK_PHONE',
        label: '手机号脱敏 (138****0000)',
        category: 'mask',
        description: '隐藏手机号中间四位',
        generateCode: () => `
      const str = String(value || '');
      if (str.length !== 11) return str;
      return str.replace(/(\\d{3})\\d{4}(\\d{4})/, '$1****$2');
    `.trim()
    },
    {
        id: 'MASK_ID',
        label: '身份证脱敏 (末4位)',
        category: 'mask',
        description: '隐藏身份证号中间部分，只保留首尾',
        generateCode: () => `
       const str = String(value || '');
       if (str.length < 10) return str;
       return str.substring(0, 3) + '***********' + str.substring(str.length - 4);
    `.trim()
    }
];

export const FormatterService = {
    getFormatters: () => PRESET_FORMATTERS,

    getFormattersByCategory: () => {
        const grouped: Record<string, FormatterDefinition[]> = {};
        PRESET_FORMATTERS.forEach(f => {
            if (!grouped[f.category]) grouped[f.category] = [];
            grouped[f.category].push(f);
        });
        return grouped;
    }
};
