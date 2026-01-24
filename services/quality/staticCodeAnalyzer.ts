/**
 * 静态代码分析器
 *
 * 使用 AST 分析 Python 代码的安全性和质量
 * 防止危险操作和不良模式
 *
 * @author Backend Developer
 * @version 1.0.0
 */

/**
 * 安全检查结果
 */
export interface SecurityCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  bannedImports: string[];
  bannedFunctions: string[];
  suspiciousPatterns: string[];
}

/**
 * 代码质量检查结果
 */
export interface QualityCheckResult {
  passed: boolean;
  issues: string[];
  suggestions: string[];
  complexity: number;
  maintainabilityIndex: number;
}

/**
 * 完整分析结果
 */
export interface AnalysisResult {
  security: SecurityCheckResult;
  quality: QualityCheckResult;
  canExecute: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 禁止的导入（黑名单）
 */
const BANNED_IMPORTS = [
  'os',
  'requests',
  'subprocess',
  'sys',
  'socket',
  'urllib',
  'urllib2',
  'urllib3',
  'http',
  'ftplib',
  'telnetlib',
  'smtplib',
  'poplib',
  'imaplib',
  'ssl',
  'csv',  // 使用 pandas 替代
  'json',  // 允许，但需要警告
  'pickle',
  'shelve',
  'shutil',
  'tempfile',
  'pathlib'
];

/**
 * 禁止的函数（黑名单）
 */
const BANNED_FUNCTIONS = [
  'eval',
  'exec',
  '__import__',
  'compile',
  'open',  // 文件操作应该通过虚拟文件系统
  'file',
  'input',
  'raw_input',
  'globals',
  'locals',
  'vars',
  'dir'
];

/**
 * 允许的导入（白名单）
 */
const ALLOWED_IMPORTS = [
  'pandas',
  'numpy',
  'math',
  'datetime',
  're',
  'collections',
  'itertools',
  'functools',
  'operator',
  'json',
  'typing'
];

/**
 * 可疑模式（正则表达式）
 */
const SUSPICIOUS_PATTERNS = [
  /__import__\s*\(/,
  /exec\s*\(/,
  /eval\s*\(/,
  /compile\s*\(/,
  /\.\s*__class__\s*\./,
  /\.\s*__bases__\s*\./,
  /\.\s*__subclasses__\s*\(/,
  /\.\s*__mro__\s*\./,
  /os\.environ/,
  /os\.getenv/,
  /os\.system/,
  /subprocess\./,
  /import\s+os\b/,
  /from\s+os\s+import/,
  /import\s+sys\b/,
  /from\s+sys\s+import/
];

/**
 * StaticCodeAnalyzer 类
 *
 * 职责：
 * 1. 检查代码安全性
 * 2. 评估代码质量
 * 3. 检测可疑模式
 * 4. 提供改进建议
 */
export class StaticCodeAnalyzer {
  private enableStrictMode: boolean;

  constructor(strictMode: boolean = true) {
    this.enableStrictMode = strictMode;
  }

  /**
   * 完整分析
   */
  public analyze(code: string): AnalysisResult {
    const security = this.checkSecurity(code);
    const quality = this.checkQuality(code);

    const canExecute = security.passed && quality.passed;
    const riskLevel = this.calculateRiskLevel(security, quality);

    return {
      security,
      quality,
      canExecute,
      riskLevel
    };
  }

  /**
   * 安全检查
   */
  public checkSecurity(code: string): SecurityCheckResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const bannedImports: string[] = [];
    const bannedFunctions: string[] = [];
    const suspiciousPatterns: string[] = [];

    // 1. 检查禁止的导入
    const imports = this.extractImports(code);
    for (const imp of imports) {
      const baseName = imp.split('.')[0];
      if (BANNED_IMPORTS.includes(baseName)) {
        bannedImports.push(imp);
        errors.push(`禁止的导入: ${imp}`);
      }
    }

    // 2. 检查禁止的函数
    const functions = this.extractFunctionCalls(code);
    for (const func of functions) {
      if (BANNED_FUNCTIONS.includes(func)) {
        bannedFunctions.push(func);
        errors.push(`禁止的函数调用: ${func}`);
      }
    }

    // 3. 检查可疑模式
    for (const pattern of SUSPICIOUS_PATTERNS) {
      const matches = code.match(pattern);
      if (matches) {
        matches.forEach(match => {
          suspiciousPatterns.push(match);
          warnings.push(`检测到可疑模式: ${match.substring(0, 50)}...`);
        });
      }
    }

    // 4. 检查不在白名单中的导入（非严格模式下警告）
    if (!this.enableStrictMode) {
      for (const imp of imports) {
        const baseName = imp.split('.')[0];
        if (!ALLOWED_IMPORTS.includes(baseName)) {
          warnings.push(`非标准导入: ${imp}（可能不安全）`);
        }
      }
    }

    const passed = errors.length === 0;

    return {
      passed,
      errors,
      warnings,
      bannedImports,
      bannedFunctions,
      suspiciousPatterns
    };
  }

  /**
   * 质量检查
   */
  public checkQuality(code: string): QualityCheckResult {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 1. 检查代码长度
    if (code.length > 5000) {
      issues.push('代码过长，建议拆分为多个函数');
    }

    // 2. 检查缩进一致性
    const lines = code.split('\n');
    const indents = lines
      .filter(line => line.trim().length > 0)
      .map(line => {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
      });

    if (indents.length > 0) {
      const minIndent = Math.min(...indents);
      if (minIndent % 4 !== 0 && minIndent % 2 !== 0) {
        issues.push('代码缩进不一致，建议使用 4 空格');
      }
    }

    // 3. 检查是否有注释
    const commentLines = lines.filter(line => line.trim().startsWith('#'));
    if (commentLines.length === 0 && code.length > 200) {
      suggestions.push('建议添加注释说明代码逻辑');
    }

    // 4. 检查异常处理
    if (!code.includes('try:') && !code.includes('except')) {
      suggestions.push('建议添加异常处理（try-except）');
    }

    // 5. 检查是否有明显的错误处理
    if (code.includes('import pandas') && !code.includes('pd.read')) {
      suggestions.push('导入了 pandas 但可能未正确使用');
    }

    // 计算复杂度（简化版）
    const complexity = this.calculateComplexity(code);

    // 计算可维护性指数（简化版）
    const maintainabilityIndex = this.calculateMaintainabilityIndex(code, complexity);

    const passed = issues.length === 0;

    return {
      passed,
      issues,
      suggestions,
      complexity,
      maintainabilityIndex
    };
  }

  /**
   * 提取导入语句
   */
  private extractImports(code: string): string[] {
    const imports: string[] = [];

    // 匹配 import x
    const importMatches = code.matchAll(/import\s+([a-zA-Z_][a-zA-Z0-9_.]*)/g);
    for (const match of importMatches) {
      imports.push(match[1]);
    }

    // 匹配 from x import y
    const fromMatches = code.matchAll(/from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+import/g);
    for (const match of fromMatches) {
      imports.push(match[1]);
    }

    return [...new Set(imports)];
  }

  /**
   * 提取函数调用
   */
  private extractFunctionCalls(code: string): string[] {
    const functions: string[] = [];

    // 匹配 function_name(
    const matches = code.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g);
    for (const match of matches) {
      functions.push(match[1]);
    }

    return [...new Set(functions)];
  }

  /**
   * 计算复杂度（简化版圈复杂度）
   */
  private calculateComplexity(code: string): number {
    let complexity = 1; // 基础复杂度

    // 每个控制流语句增加复杂度
    const controlFlowPatterns = [
      /\bif\b/g,
      /\belif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\btry\b/g,
      /\bexcept\b/g,
      /\bwith\b/g,
      /\band\b/g,
      /\bor\b/g
    ];

    for (const pattern of controlFlowPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * 计算可维护性指数（简化版）
   */
  private calculateMaintainabilityIndex(code: string, complexity: number): number {
    const lines = code.split('\n').length;
    const volume = Math.log(lines);

    // MI = 171 - 5.2 * ln(HV) - 0.23 * G - 16.2 * ln(L)
    // 简化版本
    let mi = 100 - (complexity * 0.5) - (volume * 2);

    // 归一化到 0-100
    return Math.max(0, Math.min(100, mi));
  }

  /**
   * 计算风险等级
   */
  private calculateRiskLevel(
    security: SecurityCheckResult,
    quality: QualityCheckResult
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (!security.passed) {
      if (security.bannedImports.length > 0 || security.bannedFunctions.length > 0) {
        return 'critical';
      }
      return 'high';
    }

    if (security.warnings.length > 3) {
      return 'medium';
    }

    if (!quality.passed || quality.complexity > 20) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 生成安全报告
   */
  public generateSecurityReport(result: AnalysisResult): string {
    let report = '=== 静态代码分析报告 ===\n\n';

    // 风险等级
    report += `风险等级: ${result.riskLevel.toUpperCase()}\n`;
    report += `可以执行: ${result.canExecute ? '是' : '否'}\n\n`;

    // 安全检查
    report += '## 安全检查\n';
    report += `状态: ${result.security.passed ? '✅ 通过' : '❌ 失败'}\n`;

    if (result.security.errors.length > 0) {
      report += '\n错误:\n';
      result.security.errors.forEach(err => {
        report += `  ❌ ${err}\n`;
      });
    }

    if (result.security.warnings.length > 0) {
      report += '\n警告:\n';
      result.security.warnings.forEach(warn => {
        report += `  ⚠️ ${warn}\n`;
      });
    }

    // 质量检查
    report += '\n## 质量检查\n';
    report += `状态: ${result.quality.passed ? '✅ 通过' : '❌ 失败'}\n`;
    report += `复杂度: ${result.quality.complexity}\n`;
    report += `可维护性指数: ${result.quality.maintainabilityIndex.toFixed(1)}/100\n`;

    if (result.quality.issues.length > 0) {
      report += '\n问题:\n';
      result.quality.issues.forEach(issue => {
        report += `  ⚠️ ${issue}\n`;
      });
    }

    if (result.quality.suggestions.length > 0) {
      report += '\n建议:\n';
      result.quality.suggestions.forEach(suggestion => {
        report += `  💡 ${suggestion}\n`;
      });
    }

    return report;
  }
}

/**
 * 导出便捷函数
 */
export function analyzeCode(code: string, strictMode: boolean = true): AnalysisResult {
  const analyzer = new StaticCodeAnalyzer(strictMode);
  return analyzer.analyze(code);
}

export function checkCodeSecurity(code: string): SecurityCheckResult {
  const analyzer = new StaticCodeAnalyzer(true);
  return analyzer.checkSecurity(code);
}

export function checkCodeQuality(code: string): QualityCheckResult {
  const analyzer = new StaticCodeAnalyzer(true);
  return analyzer.checkQuality(code);
}
