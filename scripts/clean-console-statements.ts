/**
 * Console语句清理脚本
 *
 * 功能：
 * 1. 扫描所有源代码文件中的console语句
 * 2. 根据策略分类处理（保留/替换/删除）
 * 3. 自动替换为统一的logger
 * 4. 生成清理报告
 *
 * @author Frontend Developer
 * @version 1.0.0
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

/**
 * Console语句类型
 */
type ConsoleType = 'log' | 'debug' | 'info' | 'warn' | 'error';

/**
 * 处理策略
 */
type ProcessingStrategy = 'keep' | 'replace' | 'delete';

/**
 * Console语句信息
 */
interface ConsoleStatement {
  file: string;
  line: number;
  type: ConsoleType;
  content: string;
  strategy: ProcessingStrategy;
  reason: string;
}

/**
 * 清理配置
 */
interface CleanConfig {
  includePatterns: string[];
  excludePatterns: string[];
  fileExtensions: string[];
}

/**
 * 清理统计
 */
interface CleanStats {
  totalFiles: number;
  processedFiles: number;
  totalStatements: number;
  keptStatements: number;
  replacedStatements: number;
  deletedStatements: number;
  errors: number;
}

/**
 * 默认配置
 */
const defaultConfig: CleanConfig = {
  includePatterns: [
    'components/**/*',
    'services/**/*',
    'api/**/*',
    'hooks/**/*',
    'stores/**/*',
    'utils/**/*',
    'server/**/*',
    'App.tsx',
  ],
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    'dist-electron/**',
    'coverage/**',
    'tests/**',
    'test/**',
    'scripts/**',
    'docs/**',
    '*.md',
    '*.json',
  ],
  fileExtensions: ['.ts', '.tsx', '.js', '.jsx', '.cjs'],
};

/**
 * 判断console语句的处理策略
 */
function determineStrategy(
  content: string,
  context: string
): { strategy: ProcessingStrategy; reason: string } {
  const lowerContent = content.toLowerCase();
  const lowerContext = context.toLowerCase();

  // 保留策略
  if (
    lowerContent.includes('error') ||
    lowerContent.includes('exception') ||
    lowerContent.includes('failed') ||
    lowerContent.includes('catch') ||
    lowerContext.includes('try') ||
    lowerContext.includes('catch') ||
    lowerContext.includes('error boundary') ||
    lowerContext.includes('error handler')
  ) {
    return {
      strategy: 'replace',
      reason: '错误处理相关，替换为logger.error()',
    };
  }

  if (
    lowerContent.includes('warn') ||
    lowerContent.includes('deprecated') ||
    lowerContent.includes('fallback')
  ) {
    return {
      strategy: 'replace',
      reason: '警告相关，替换为logger.warn()',
    };
  }

  // 删除策略（纯调试）
  if (
    lowerContent.includes('debug') ||
    lowerContent.includes('test') ||
    lowerContent.includes('temp') ||
    lowerContent.includes('todo') ||
    lowerContent.includes('fixme') ||
    lowerContent.startsWith('//') ||
    /^\s*\/\//.test(content)
  ) {
    return {
      strategy: 'delete',
      reason: '临时调试语句，可以删除',
    };
  }

  // 替换策略（有意义的日志）
  if (
    lowerContent.includes('user') ||
    lowerContent.includes('api') ||
    lowerContent.includes('data') ||
    lowerContent.includes('component') ||
    lowerContent.includes('render') ||
    lowerContent.includes('mount') ||
    lowerContent.includes('update') ||
    lowerContent.includes('success') ||
    lowerContent.includes('complete')
  ) {
    return {
      strategy: 'replace',
      reason: '有意义的业务日志，替换为logger.info()或logger.debug()',
    };
  }

  // 默认策略
  return {
    strategy: 'replace',
    reason: '一般日志，替换为logger.debug()',
  };
}

/**
 * 递归扫描目录
 */
function scanDirectory(
  dir: string,
  extensions: string[],
  excludePatterns: string[]
): string[] {
  const files: string[] = [];

  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // 检查是否在排除列表中
        const relativePath = fullPath.replace(process.cwd(), '').replace(/\\/g, '/');
        const isExcluded = excludePatterns.some(pattern => {
          const regex = new RegExp(
            pattern.replace(/\*/g, '.*').replace(/\//g, '\\\\/')
          );
          return regex.test(relativePath);
        });

        if (!isExcluded) {
          files.push(...scanDirectory(fullPath, extensions, excludePatterns));
        }
      } else if (stat.isFile()) {
        const ext = extname(fullPath);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`扫描目录失败: ${dir}`, error);
  }

  return files;
}

/**
 * 分析文件中的console语句
 */
function analyzeFile(filePath: string): ConsoleStatement[] {
  const statements: ConsoleStatement[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const consoleMatch = line.match(/console\.(log|debug|info|warn|error)\(/);
      if (consoleMatch) {
        const type = consoleMatch[1] as ConsoleType;
        const { strategy, reason } = determineStrategy(line, content);

        statements.push({
          file: filePath,
          line: index + 1,
          type,
          content: line.trim(),
          strategy,
          reason,
        });
      }
    });
  } catch (error) {
    console.error(`分析文件失败: ${filePath}`, error);
  }

  return statements;
}

/**
 * 替换console语句为logger
 */
function replaceConsoleWithLogger(
  content: string,
  statements: ConsoleStatement[]
): string {
  let modifiedContent = content;

  statements.forEach(statement => {
    if (statement.strategy === 'replace') {
      const originalLine = statement.content;
      let replacement = originalLine;

      // 确定logger方法
      let loggerMethod = 'debug';
      if (statement.type === 'error') {
        loggerMethod = 'error';
      } else if (statement.type === 'warn') {
        loggerMethod = 'warn';
      } else if (statement.reason.includes('业务日志')) {
        loggerMethod = 'info';
      }

      // 替换console.xxx为logger.xxx
      replacement = originalLine.replace(
        /console\.(log|debug|info|warn|error)\(/,
        `logger.${loggerMethod}(`
      );

      // 更新内容
      const lineIndex = statement.line - 1;
      const lines = modifiedContent.split('\n');
      if (lines[lineIndex]) {
        lines[lineIndex] = replacement;
        modifiedContent = lines.join('\n');
      }
    }
  });

  return modifiedContent;
}

/**
 * 添加logger导入
 */
function addLoggerImport(content: string): string {
  // 检查是否已经导入logger
  if (content.includes("from '@/utils/logger'") ||
      content.includes('from "./utils/logger"') ||
      content.includes('from "../utils/logger"') ||
      content.includes("from '../../utils/logger'")) {
    return content;
  }

  // 查找最后一个import语句
  const importRegex = /import\s+.*\s+from\s+['"][^'"]+['"];?\s*\n/g;
  const imports = content.match(importRegex);

  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastIndex = content.lastIndexOf(lastImport);
    const insertPosition = lastIndex + lastImport.length;

    const loggerImport = "import { logger } from '@/utils/logger';\n";

    return (
      content.slice(0, insertPosition) +
      loggerImport +
      content.slice(insertPosition)
    );
  }

  // 没有import，在文件开头添加
  return "import { logger } from '@/utils/logger';\n" + content;
}

/**
 * 生成清理报告
 */
function generateReport(
  stats: CleanStats,
  statements: ConsoleStatement[]
): string {
  const report = `
# Console语句清理报告

## 📊 统计信息

- 扫描文件总数: ${stats.totalFiles}
- 处理文件数量: ${stats.processedFiles}
- Console语句总数: ${stats.totalStatements}
- 保留语句数量: ${stats.keptStatements}
- 替换语句数量: ${stats.replacedStatements}
- 删除语句数量: ${stats.deletedStatements}
- 处理错误数量: ${stats.errors}

## 📁 处理的文件（按数量排序）

${
  statements
    .reduce((acc, stmt) => {
      acc[stmt.file] = (acc[stmt.file] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
    | Object.entries({})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([file, count]) => `- ${file}: ${count}条`)
    .join('\n')
}

## 🎯 处理策略分布

- 保留 (KEEP): ${statements.filter(s => s.strategy === 'keep').length}条
- 替换 (REPLACE): ${statements.filter(s => s.strategy === 'replace').length}条
- 删除 (DELETE): ${statements.filter(s => s.strategy === 'delete').length}条

## 📝 详细清单

### 保留的Console语句

${statements
  .filter(s => s.strategy === 'keep')
  .map(
    s => `- ${s.file}:${s.line} [${s.type.toUpperCase()}] ${s.reason}`
  )
  .join('\n')}

### 替换的Console语句

${statements
  .filter(s => s.strategy === 'replace')
  .map(
    s => `- ${s.file}:${s.line} [${s.type.toUpperCase()}] ${s.reason}`
  )
  .join('\n')}

### 删除的Console语句

${statements
  .filter(s => s.strategy === 'delete')
  .map(
    s => `- ${s.file}:${s.line} [${s.type.toUpperCase()}] ${s.reason}`
  )
  .join('\n')}

## ✅ 下一步行动

1. 审查保留的console语句，确认是否需要保留
2. 测试替换后的logger功能
3. 运行构建测试确保没有破坏性变更
4. 提交代码并创建Pull Request

---

生成时间: ${new Date().toISOString()}
`;

  return report;
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始清理Console语句...\n');

  // 扫描文件
  console.log('📂 扫描源代码文件...');
  const files = scanDirectory(
    process.cwd(),
    defaultConfig.fileExtensions,
    defaultConfig.excludePatterns
  );
  console.log(`✅ 找到 ${files.length} 个源代码文件\n`);

  // 分析文件
  console.log('🔍 分析Console语句...');
  const allStatements: ConsoleStatement[] = [];
  const processedFiles: string[] = [];

  files.forEach(file => {
    const statements = analyzeFile(file);
    if (statements.length > 0) {
      allStatements.push(...statements);
      processedFiles.push(file);
    }
  });

  console.log(`✅ 发现 ${allStatements.length} 条Console语句\n`);

  // 统计信息
  const stats: CleanStats = {
    totalFiles: files.length,
    processedFiles: processedFiles.length,
    totalStatements: allStatements.length,
    keptStatements: allStatements.filter(s => s.strategy === 'keep').length,
    replacedStatements: allStatements.filter(s => s.strategy === 'replace').length,
    deletedStatements: allStatements.filter(s => s.strategy === 'delete').length,
    errors: 0,
  };

  // 生成报告
  console.log('📊 生成清理报告...');
  const report = generateReport(stats, allStatements);
  writeFileSync('CONSOLE_CLEANUP_REPORT.md', report, 'utf-8');
  console.log('✅ 报告已保存到 CONSOLE_CLEANUP_REPORT.md\n');

  // 输出统计
  console.log('📈 清理统计:');
  console.log(`  - 扫描文件: ${stats.totalFiles}个`);
  console.log(`  - 处理文件: ${stats.processedFiles}个`);
  console.log(`  - Console语句: ${stats.totalStatements}条`);
  console.log(`  - 保留: ${stats.keptStatements}条`);
  console.log(`  - 替换: ${stats.replacedStatements}条`);
  console.log(`  - 删除: ${stats.deletedStatements}条\n`);

  console.log('✅ 清理分析完成！');
  console.log('📝 请查看 CONSOLE_CLEANUP_REPORT.md 了解详细信息\n');
}

// 运行主函数
main();
