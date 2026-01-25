/**
 * 数据处理辅助函数库
 * 提供复杂的数据提取和转换功能
 */

import Anthropic from "@anthropic-ai/sdk";

// 配置智谱AI客户端
const client = new Anthropic({
  apiKey: process.env.ZHIPU_API_KEY || process.env.API_KEY || '',
  baseURL: 'https://open.bigmodel.cn/api/anthropic',
  dangerouslyAllowBrowser: true
});

/**
 * 辅助函数类型定义
 */
export interface HelperFunction {
  name: string;
  description: string;
  handler: (...args: any[]) => any;
}

/**
 * 辅助函数库类
 */
export class DataHelperFunctions {
  private static functions: Map<string, HelperFunction> = new Map();

  /**
   * 注册所有自定义函数到AlaSQL
   */
  static registerAll(): void {
    // 检查alasql是否存在
    if (typeof alasql === 'undefined') {
      console.warn('AlaSQL未加载，跳过辅助函数注册');
      return;
    }

    // 注册所有辅助函数
    this.register(extractPhone);
    this.register(extractEmail);
    this.register(multiValueSplit);
    this.register(parseDateYear);
    this.register(columnToArray);
    this.register(contains);
    this.register(regexExtract);
    this.register(formatDate);
    this.register(calculateAge);
    this.register(joinStrings);
  }

  /**
   * 注册单个函数
   */
  static register(func: HelperFunction): void {
    this.functions.set(func.name, func);

    // 注册到alasql
    (alasql as any).fn[func.name] = func.handler;
  }

  /**
   * 获取所有函数描述（用于AI理解）
   */
  static getFunctionDescriptions(): string[] {
    return Array.from(this.functions.values()).map(
      func => `- ${func.name}: ${func.description}`
    );
  }
}

// ============================================================
// 日期和时间函数
// ============================================================

/**
 * 提取日期中的年份
 * 支持格式：2023年、2023-01-01、2023/01/01
 */
const parseDateYear: HelperFunction = {
  name: 'parseDateYear',
  description: '从日期字符串中提取年份',
  handler: (dateStr: string): number | null => {
    if (!dateStr) return null;

    // 匹配 "2023年"
    const yearMatch = dateStr.match(/(\d{4})/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
  }
};

/**
 * 格式化日期
 */
const formatDate: HelperFunction = {
  name: 'formatDate',
  description: '格式化日期为指定格式',
  handler: (date: Date | string, format: string = 'YYYY-MM-DD'): string => {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day);
  }
};

/**
 * 计算年龄
 */
const calculateAge: HelperFunction = {
  name: 'calculateAge',
  description: '根据出生日期计算年龄',
  handler: (birthDate: Date | string): number | null => {
    if (!birthDate) return null;

    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    const today = new Date();

    if (isNaN(birth.getTime())) return null;

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }
};

// ============================================================
// 字符串处理函数
// ============================================================

/**
 * 从混合文本中提取电话号码
 * 支持格式：
 * - 电话:021-12345678
 * - 021-12345678
 * - 13812345678
 */
const extractPhone: HelperFunction = {
  name: 'extractPhone',
  description: '从文本中提取电话号码，支持固定电话和手机',
  handler: (text: string): string | null => {
    if (!text) return null;

    // 匹配 "电话:" 或 "手机:" 标签后的号码
    const labeledRegex = /(?:电话|手机|联系电话)[：:]\s*(\d{3,4}-\d{7,8}|\d{11})/;
    let match = text.match(labeledRegex);
    if (match) return match[1];

    // 匹配固定电话：xxx-xxxxxxxx
    const phoneRegex = /(\d{3,4}-\d{7,8})/;
    match = text.match(phoneRegex);
    if (match) return match[1];

    // 匹配手机号：11位数字
    const mobileRegex = /(1[3-9]\d{9})/;
    match = text.match(mobileRegex);
    if (match) return match[1];

    return null;
  }
};

/**
 * 从混合文本中提取邮箱
 * 支持格式：
 * - 邮箱:zhangsan@company.com
 * - zhangsan@company.com
 */
const extractEmail: HelperFunction = {
  name: 'extractEmail',
  description: '从文本中提取邮箱地址',
  handler: (text: string): string | null => {
    if (!text) return null;

    // 匹配 "邮箱:" 标签后的邮箱
    const labeledRegex = /邮箱[：:]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    let match = text.match(labeledRegex);
    if (match) return match[1];

    // 匹配标准邮箱格式
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    match = text.match(emailRegex);
    if (match) return match[1];

    return null;
  }
};

/**
 * 分割多值单元格
 * 支持自定义分隔符
 */
const multiValueSplit: HelperFunction = {
  name: 'multiValueSplit',
  description: '将包含多个值的字符串分割为数组，支持逗号、分号、顿号等分隔符',
  handler: (text: string, separator: string = 'auto'): string[] => {
    if (!text) return [];

    let actualSeparator = separator;

    if (separator === 'auto') {
      // 自动检测分隔符
      if (text.includes('；')) actualSeparator = '；';
      else if (text.includes(',')) actualSeparator = ',';
      else if (text.includes(';')) actualSeparator = ';';
      else if (text.includes('、')) actualSeparator = '、';
      else return [text]; // 没有识别到分隔符，返回原值
    }

    return text
      .split(actualSeparator)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
};

/**
 * 使用正则表达式提取匹配的内容
 */
const regexExtract: HelperFunction = {
  name: 'regexExtract',
  description: '使用正则表达式从文本中提取匹配的内容',
  handler: (text: string, pattern: string, flags: string = ''): string | null => {
    if (!text || !pattern) return null;

    try {
      const regex = new RegExp(pattern, flags);
      const match = text.match(regex);
      return match ? match[1] || match[0] : null;
    } catch (error) {
      console.warn('正则表达式错误:', error);
      return null;
    }
  }
};

/**
 * 检查文本是否包含指定内容
 */
const contains: HelperFunction = {
  name: 'contains',
  description: '检查文本是否包含指定的子字符串（不区分大小写）',
  handler: (text: string, search: string): boolean => {
    if (!text || !search) return false;
    return text.toLowerCase().includes(search.toLowerCase());
  }
};

// ============================================================
// 数组和聚合函数
// ============================================================

/**
 * 将列值转换为数组（用于IN查询）
 */
const columnToArray: HelperFunction = {
  name: 'columnToArray',
  description: '将查询结果中的指定列转换为数组',
  handler: (rows: any[], columnName: string): any[] => {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => row[columnName]).filter(v => v !== undefined && v !== null);
  }
};

/**
 * 将数组元素连接为字符串
 */
const joinStrings: HelperFunction = {
  name: 'joinStrings',
  description: '将数组元素用指定分隔符连接为字符串',
  handler: (arr: any[], separator: string = ','): string => {
    if (!Array.isArray(arr)) return String(arr);
    return arr.join(separator);
  }
};

// ============================================================
// AI增强函数
// ============================================================

/**
 * 智能字段映射
 * 使用AI将用户输入的字段名映射到实际的列名
 */
export async function intelligentFieldMapping(
  userInput: string,
  availableColumns: string[]
): Promise<{ column: string; confidence: number }[]> {
  const prompt = `
将用户输入的字段名映射到实际的列名。

用户输入: "${userInput}"

可用列名:
${availableColumns.map((col, i) => `${i + 1}. ${col}`).join('\n')}

请输出JSON格式，包含最匹配的列名和置信度(0-1):
[
  {"column": "实际列名", "confidence": 0.95, "reason": "匹配原因"}
]

只返回前3个最匹配的结果。
`;

  try {
    const response = await client.messages.create({
      model: "glm-4.6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : "";
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error('AI字段映射失败:', error);
    return [];
  }
}

/**
 * 智能值提取
 * 从非结构化文本中提取结构化数据
 */
export async function intelligentValueExtraction(
  text: string,
  dataType: 'phone' | 'email' | 'date' | 'amount' | 'person'
): Promise<any> {
  const typePrompts = {
    phone: '电话号码（支持手机和固话）',
    email: '电子邮件地址',
    date: '日期（包括年月日）',
    amount: '金额数字（包括货币单位）',
    person: '人名'
  };

  const prompt = `
从以下文本中提取${typePrompts[dataType]}：

文本: "${text}"

请输出JSON格式:
{"value": "提取的值", "confidence": 0.95, "original": "原始匹配文本"}
`;

  try {
    const response = await client.messages.create({
      model: "glm-4.6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : "";
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error('AI值提取失败:', error);
    return null;
  }
}

// ============================================================
// 初始化和导出
// ============================================================

/**
 * 自动注册所有函数
 */
export function initializeHelperFunctions(): void {
  DataHelperFunctions.registerAll();
  console.log('辅助函数库已初始化，已注册函数:', DataHelperFunctions.getFunctionDescriptions());
}

// 如果在浏览器环境，自动初始化
if (typeof window !== 'undefined') {
  initializeHelperFunctions();
}
