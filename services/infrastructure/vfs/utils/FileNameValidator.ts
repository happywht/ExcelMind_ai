/**
 * 文件名验证工具
 *
 * 提供文件名和路径的安全验证功能，防止路径遍历攻击和其他安全问题
 *
 * @module infrastructure/vfs/utils/FileNameValidator
 * @version 1.0.0
 */

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 危险字符黑名单（正则表达式）
 * 这些字符在 Windows 和 Unix 系统上都不允许用于文件名
 */
const DANGEROUS_CHARS = /[<>:"|?*\x00-\x1f]/g;

/**
 * 路径遍历模式检测
 */
const PATH_TRAVERSAL = /\.\./g;

/**
 * 文件名长度限制（遵循大多数文件系统的限制）
 */
const MAX_FILENAME_LENGTH = 255;

/**
 * 允许的文件扩展名白名单
 */
const ALLOWED_EXTENSIONS = [
  // Excel 文件
  '.xlsx', '.xls', '.xlsm', '.xlsb',
  // Word 文件
  '.docx', '.doc', '.docm',
  // PDF 文件
  '.pdf',
  // 文本文件
  '.txt', '.csv', '.md',
  // JSON 和 XML
  '.json', '.xml',
  // 图片文件（用于文档嵌入）
  '.png', '.jpg', '.jpeg', '.gif', '.bmp',
  // 其他常用格式
  '.zip', '.rar',
];

/**
 * 保留的文件名（Windows 系统保留）
 */
const RESERVED_NAMES = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
];

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 错误信息（验证失败时） */
  error?: string;
  /** 警告信息（非致命问题） */
  warning?: string;
}

/**
 * 文件名分析结果
 */
export interface FileNameAnalysis {
  /** 文件名（不含扩展名） */
  name: string;
  /** 扩展名（含点号） */
  extension: string;
  /** 是否为允许的扩展名 */
  isAllowedExtension: boolean;
  /** 是否为保留文件名 */
  isReservedName: boolean;
  /** 包含的危险字符列表 */
  dangerousChars: string[];
  /** 是否包含路径遍历序列 */
  hasPathTraversal: boolean;
}

// ============================================================================
// 验证函数
// ============================================================================

/**
 * 验证文件名
 *
 * @param fileName - 要验证的文件名
 * @param options - 验证选项
 * @returns 验证结果
 *
 * @example
 * ```typescript
 * const result = validateFileName('document.xlsx');
 * if (result.valid) {
 *   console.log('文件名有效');
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateFileName(
  fileName: string,
  options?: {
    /** 是否检查扩展名白名单，默认 true */
    checkExtension?: boolean;
    /** 是否检查保留文件名，默认 true */
    checkReservedNames?: boolean;
    /** 自定义允许的扩展名列表 */
    allowedExtensions?: string[];
    /** 最大文件名长度，默认 255 */
    maxLength?: number;
  }
): ValidationResult {
  const {
    checkExtension = true,
    checkReservedNames = true,
    allowedExtensions = ALLOWED_EXTENSIONS,
    maxLength = MAX_FILENAME_LENGTH,
  } = options || {};

  // 检查是否为空
  if (!fileName || fileName.trim().length === 0) {
    return {
      valid: false,
      error: '文件名不能为空',
    };
  }

  // 检查长度
  if (fileName.length > maxLength) {
    return {
      valid: false,
      error: `文件名过长（最大 ${maxLength} 字符，当前 ${fileName.length} 字符）`,
    };
  }

  // 检查危险字符
  const dangerousChars = findDangerousChars(fileName);
  if (dangerousChars.length > 0) {
    return {
      valid: false,
      error: `文件名包含非法字符: ${dangerousChars.join(', ')}`,
    };
  }

  // 检查路径遍历
  if (PATH_TRAVERSAL.test(fileName)) {
    return {
      valid: false,
      error: '文件名包含路径遍历序列 (..)',
    };
  }

  // 检查是否以点开头（Unix 隐藏文件）
  if (fileName.startsWith('.')) {
    return {
      valid: false,
      error: '不允许使用隐藏文件名（以点开头）',
    };
  }

  // 提取文件名和扩展名
  const lastDotIndex = fileName.lastIndexOf('.');
  const nameWithoutExt = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';

  // 检查保留文件名
  if (checkReservedNames) {
    const baseName = nameWithoutExt.toUpperCase();
    if (RESERVED_NAMES.includes(baseName)) {
      return {
        valid: false,
        error: `"${nameWithoutExt}" 是系统保留的文件名`,
      };
    }
  }

  // 检查扩展名
  if (checkExtension && extension) {
    const extLower = extension.toLowerCase();
    if (!allowedExtensions.includes(extLower)) {
      return {
        valid: false,
        error: `不支持的文件类型: ${extension}`,
      };
    }
  }

  // 检查文件名是否只包含空格
  if (nameWithoutExt.trim().length === 0) {
    return {
      valid: false,
      error: '文件名不能只包含空格或只有扩展名',
    };
  }

  return { valid: true };
}

/**
 * 清理文件名（移除危险字符）
 *
 * 注意：此函数会移除危险字符，但可能导致文件名改变。
 * 建议先使用 validateFileName 验证，只在确认安全的情况下使用。
 *
 * @param fileName - 要清理的文件名
 * @param options - 清理选项
 * @returns 清理后的文件名
 *
 * @example
 * ```typescript
 * const cleaned = sanitizeFileName('file<>name.xlsx');
 * // 返回: 'filename.xlsx'
 * ```
 */
export function sanitizeFileName(
  fileName: string,
  options?: {
    /** 替换字符，默认为空字符串（移除） */
    replacement?: string;
    /** 最大长度，默认 255 */
    maxLength?: number;
    /** 是否小写化，默认 false */
    lowercase?: boolean;
  }
): string {
  const {
    replacement = '',
    maxLength = MAX_FILENAME_LENGTH,
    lowercase = false,
  } = options || {};

  let cleaned = fileName;

  // 移除危险字符
  cleaned = cleaned.replace(DANGEROUS_CHARS, replacement);

  // 移除路径遍历序列
  cleaned = cleaned.replace(PATH_TRAVERSAL, replacement);

  // 移除前导点和空格
  cleaned = cleaned.replace(/^[.\s]+/, '');

  // 替换多个连续空格为单个空格
  cleaned = cleaned.replace(/\s+/g, ' ');

  // 截断过长文件名
  if (cleaned.length > maxLength) {
    // 尝试保留扩展名
    const lastDotIndex = cleaned.lastIndexOf('.');
    if (lastDotIndex > 0) {
      const ext = cleaned.substring(lastDotIndex);
      const name = cleaned.substring(0, lastDotIndex);
      const maxNameLength = maxLength - ext.length;
      cleaned = name.substring(0, maxNameLength) + ext;
    } else {
      cleaned = cleaned.substring(0, maxLength);
    }
  }

  // 移除尾随空格和点
  cleaned = cleaned.trim().replace(/[.]+$/, '');

  // 可选：小写化
  if (lowercase) {
    cleaned = cleaned.toLowerCase();
  }

  return cleaned;
}

/**
 * 验证文件路径
 *
 * @param filePath - 要验证的文件路径
 * @param options - 验证选项
 * @returns 验证结果
 */
export function validateFilePath(
  filePath: string,
  options?: {
    /** 是否允许绝对路径，默认 false */
    allowAbsolute?: boolean;
    /** 是否允许 Windows 风格路径（C:\），默认 false */
    allowWindowsPaths?: boolean;
  }
): ValidationResult {
  const {
    allowAbsolute = false,
    allowWindowsPaths = false,
  } = options || {};

  // 检查是否为空
  if (!filePath || filePath.trim().length === 0) {
    return {
      valid: false,
      error: '路径不能为空',
    };
  }

  // 检查绝对路径
  if (!allowAbsolute) {
    // Unix 风格绝对路径
    if (filePath.startsWith('/')) {
      return {
        valid: false,
        error: '不允许使用绝对路径（以 / 开头）',
      };
    }

    // Windows 风格绝对路径
    if (!allowWindowsPaths && /^[A-Za-z]:\\/.test(filePath)) {
      return {
        valid: false,
        error: '不允许使用 Windows 绝对路径（如 C:\\）',
      };
    }
  }

  // 检查路径遍历
  if (PATH_TRAVERSAL.test(filePath)) {
    return {
      valid: false,
      error: '路径包含遍历序列 (..)',
    };
  }

  // 检查危险字符
  const dangerousChars = findDangerousChars(filePath);
  if (dangerousChars.length > 0) {
    return {
      valid: false,
      error: `路径包含非法字符: ${dangerousChars.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * 分析文件名
 *
 * @param fileName - 要分析的文件名
 * @returns 文件名分析结果
 */
export function analyzeFileName(fileName: string): FileNameAnalysis {
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';

  // 检查是否为允许的扩展名
  const isAllowedExtension = ALLOWED_EXTENSIONS.includes(extension.toLowerCase());

  // 检查是否为保留文件名
  const isReservedName = RESERVED_NAMES.includes(name.toUpperCase());

  // 查找危险字符
  const dangerousChars = findDangerousChars(fileName);

  // 检查路径遍历
  const hasPathTraversal = PATH_TRAVERSAL.test(fileName);

  return {
    name,
    extension,
    isAllowedExtension,
    isReservedName,
    dangerousChars,
    hasPathTraversal,
  };
}

/**
 * 生成安全的文件名
 *
 * 基于原始文件名生成一个安全的文件名，必要时添加随机后缀
 *
 * @param originalFileName - 原始文件名
 * @param options - 生成选项
 * @returns 安全的文件名
 */
export function generateSafeFileName(
  originalFileName: string,
  options?: {
    /** 添加随机后缀，默认 false */
    randomSuffix?: boolean;
    /** 后缀长度，默认 8 */
    suffixLength?: number;
    /** 前缀，默认无 */
    prefix?: string;
  }
): string {
  const {
    randomSuffix = false,
    suffixLength = 8,
    prefix = '',
  } = options || {};

  // 先清理文件名
  let safeName = sanitizeFileName(originalFileName);

  // 添加前缀
  if (prefix) {
    const lastDotIndex = safeName.lastIndexOf('.');
    if (lastDotIndex > 0) {
      const ext = safeName.substring(lastDotIndex);
      const name = safeName.substring(0, lastDotIndex);
      safeName = `${prefix}${name}${ext}`;
    } else {
      safeName = `${prefix}${safeName}`;
    }
  }

  // 添加随机后缀
  if (randomSuffix) {
    const lastDotIndex = safeName.lastIndexOf('.');
    if (lastDotIndex > 0) {
      const ext = safeName.substring(lastDotIndex);
      const name = safeName.substring(0, lastDotIndex);
      const suffix = Math.random().toString(36).substring(2, 2 + suffixLength);
      safeName = `${name}_${suffix}${ext}`;
    } else {
      const suffix = Math.random().toString(36).substring(2, 2 + suffixLength);
      safeName = `${safeName}_${suffix}`;
    }
  }

  return safeName;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 查找字符串中的危险字符
 *
 * @param str - 要检查的字符串
 * @returns 危险字符列表
 */
function findDangerousChars(str: string): string[] {
  const dangerous: string[] = [];
  const chars = ['<', '>', ':', '"', '|', '?', '*'];

  for (const char of chars) {
    if (str.includes(char)) {
      dangerous.push(char);
    }
  }

  // 检查控制字符（0x00-0x1f）
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0x00 && code <= 0x1f) {
      const char = `\\x${code.toString(16).padStart(2, '0')}`;
      if (!dangerous.includes(char)) {
        dangerous.push(char);
      }
    }
  }

  return dangerous;
}

// ============================================================================
// 导出
// ============================================================================

// 导出常量（供测试使用）
export { ALLOWED_EXTENSIONS, MAX_FILENAME_LENGTH };

export default {
  validateFileName,
  sanitizeFileName,
  validateFilePath,
  analyzeFileName,
  generateSafeFileName,
  ALLOWED_EXTENSIONS,
  MAX_FILENAME_LENGTH,
};
