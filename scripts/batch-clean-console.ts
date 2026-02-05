/**
 * 批量Console语句清理脚本
 *
 * 功能：
 * 1. 自动替换源代码中的console语句为logger
 * 2. 添加logger导入语句
 * 3. 生成详细的清理报告
 * 4. 支持dry-run模式预览
 *
 * 使用方法：
 * npx tsx scripts/batch-clean-console.ts [--dry-run] [--verbose]
 *
 * @author Frontend Developer
 * @version 1.0.0
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 需要处理的源代码文件列表
 * (手动维护，确保只处理真正的源代码)
 */
const SOURCE_FILES = [
  // Components
  'components/FeatureCard.tsx',
  'components/ErrorBoundary.tsx',
  'components/ErrorFallback.tsx',
  'components/KnowledgeChat.tsx',
  'components/SmartExcel.tsx',
  'components/FormulaGen.tsx',
  'components/DocumentSpaceAdvanced.tsx',
  'components/SandboxTaskRunner.tsx',
  'components/BatchGeneration/BatchTaskCreator.tsx',
  'components/BatchGeneration/TaskList.tsx',
  'components/BatchGeneration/TaskList.v2.tsx',
  'components/DataQuality/DataQualityDashboard.tsx',
  'components/DocumentSpace/DocumentPreview.tsx',
  'components/TemplateManagement/TemplateList.tsx',
  'components/TemplateManagement/TemplateEditor.tsx',
  'components/TemplateManagement/TemplateVersionHistory.tsx',
  'components/MappingEditor/MappingEditor.tsx',
  'components/QueryVisualizer/QueryVisualizer.tsx',
  'components/QueryVisualizer/ExportDialog.tsx',
  'components/SQLPreview/SQLFormatter.ts',
  'components/SQLPreview/SQLToolbar.tsx',
  'components/Monitoring/PerformanceDashboard.tsx',
  'components/VirtualWorkspace/VirtualWorkspace.tsx',
  'components/VirtualWorkspace/VirtualFileBrowser.tsx',
  'components/VirtualWorkspace/RelationshipGraph.tsx',
  'components/VirtualWorkspace/WorkspaceRecovery.tsx',
  'components/VirtualWorkspace/utils.ts',

  // Hooks
  'hooks/useWasmExecution.ts',
  'hooks/useWebSocket.ts',
  'hooks/useWebSocketSync.ts',

  // Services
  'services/zhipuService.ts',
  'services/geminiService.ts',
  'services/aiProxyService.ts',
  'services/ai/dataQualityAnalyzer.ts',
  'services/ai/cleaningRecommendationEngine.ts',
  'services/errorLoggingService.ts',
  'services/documentMappingService.ts',
  'services/excelService.ts',
  'services/docxtemplaterService.ts',
  'services/docxGeneratorService.ts',
  'services/intelligentDocumentService.ts',
  'services/TemplateManager.ts',
  'services/BatchGenerationScheduler.ts',
  'services/agentic/aiServiceAdapter.ts',
  'services/agentic/utils.ts',

  // API
  'api/controllers/auditController.ts',
  'api/controllers/batchGenerationController.ts',
  'api/controllers/dataQualityController.ts',
  'api/controllers/templateController.ts',
  'api/middleware/authMiddleware.ts',
  'api/middleware/errorHandler.ts',
  'api/routes/dataQuality.ts',

  // Server
  'server/app.ts',
  'server/index.ts',
  'server/dev-server.ts',
  'server/batchGenerationServer.ts',
  'server/websocket.ts',

  // Utils
  'utils/errorHandler.ts',
  'utils/globalErrorHandlers.ts',
  'utils/auditTrailLogger.ts',
  'utils/fileFerry.ts',

  // Stores
  'stores/queryClient.tsx',
];

/**
 * Console类型到Logger方法的映射
 */
const CONSOLE_TO_LOGGER: Record<string, string> = {
  'console.error': 'logger.error',
  'console.warn': 'logger.warn',
  'console.log': 'logger.info',
  'console.info': 'logger.info',
  'console.debug': 'logger.debug',
};

/**
 * 分析console语句并确定logger方法
 */
function determineLoggerMethod(
  consoleType: string,
  lineContent: string
): string {
  const lowerContent = lineContent.toLowerCase();

  // 错误相关
  if (
    consoleType === 'console.error' ||
    lowerContent.includes('error') ||
    lowerContent.includes('exception') ||
    lowerContent.includes('failed') ||
    lowerContent.includes('catch')
  ) {
    return 'logger.error';
  }

  // 警告相关
  if (
    consoleType === 'console.warn' ||
    lowerContent.includes('warn') ||
    lowerContent.includes('deprecated') ||
    lowerContent.includes('fallback')
  ) {
    return 'logger.warn';
  }

  // 业务日志
  if (
    lowerContent.includes('user') ||
    lowerContent.includes('api') ||
    lowerContent.includes('success') ||
    lowerContent.includes('complete')
  ) {
    return 'logger.info';
  }

  // 默认debug
  return 'logger.debug';
}

/**
 * 检查文件是否已经导入了logger
 */
function hasLoggerImport(content: string): boolean {
  return (
    content.includes("from '@/utils/logger'") ||
    content.includes("from '../src/utils/logger'") ||
    content.includes("from '../../src/utils/logger'") ||
    content.includes("from './utils/logger'") ||
    content.includes('from "@/utils/logger"') ||
    content.includes('from "../src/utils/logger"') ||
    content.includes('from "../../src/utils/logger"') ||
    content.includes('from "./utils/logger"')
  );
}

/**
 * 添加logger导入语句
 */
function addLoggerImport(content: string, filePath: string): string {
  if (hasLoggerImport(content)) {
    return content;
  }

  // 确定导入路径
  const importPath = filePath.includes('/components/')
    ? '@/utils/logger'
    : filePath.includes('/services/')
    ? '@/utils/logger'
    : filePath.includes('/api/')
    ? '@/utils/logger'
    : filePath.includes('/hooks/')
    ? '@/utils/logger'
    : '@/utils/logger';

  // 查找最后一个import语句
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    // 在最后一个import后添加
    const insertLine = lastImportIndex + 1;
    lines.splice(insertLine, 0, `import { logger } from '${importPath}';`);
    return lines.join('\n');
  }

  // 没有import，在文件开头添加
  return `import { logger } from '${importPath}';\n${content}`;
}

/**
 * 处理单个文件
 */
function processFile(
  filePath: string,
  dryRun: boolean,
  verbose: boolean
): {
  modified: boolean;
  changes: number;
  errors: string[];
} {
  const result = {
    modified: false,
    changes: 0,
    errors: [],
  };

  try {
    const fullPath = join(process.cwd(), filePath);
    const content = readFileSync(fullPath, 'utf-8');
    let modifiedContent = content;
    let changeCount = 0;

    // 查找并替换console语句
    const lines = modifiedContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let modifiedLine = line;

      // 检查所有console类型
      for (const [consoleMethod, loggerMethod] of Object.entries(
        CONSOLE_TO_LOGGER
      )) {
        if (line.includes(consoleMethod + '(')) {
          // 确定logger方法
          const determinedMethod = determineLoggerMethod(
            consoleMethod,
            line
          );

          // 替换
          modifiedLine = line.replace(
            new RegExp(consoleMethod.replace('.', '\\.') + '\\(', 'g'),
            determinedMethod + '('
          );

          if (modifiedLine !== line) {
            changeCount++;
            if (verbose) {
              console.log(`  ${filePath}:${i + 1}`);
              console.log(`    ${line.trim()}`);
              console.log(`    -> ${modifiedLine.trim()}`);
            }
          }
        }
      }

      lines[i] = modifiedLine;
    }

    if (changeCount > 0) {
      modifiedContent = lines.join('\n');

      // 添加logger导入
      modifiedContent = addLoggerImport(modifiedContent, filePath);

      result.modified = true;
      result.changes = changeCount;

      if (!dryRun) {
        writeFileSync(fullPath, modifiedContent, 'utf-8');
        console.log(`✅ ${filePath}: ${changeCount} changes`);
      } else {
        console.log(`[DRY-RUN] ${filePath}: ${changeCount} changes`);
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    console.error(`❌ Error processing ${filePath}:`, error);
  }

  return result;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  console.log('🚀 批量Console清理工具\n');
  console.log(`模式: ${dryRun ? 'DRY-RUN (预览)' : 'LIVE (实际修改)'}`);
  console.log(`详细输出: ${verbose ? '开启' : '关闭'}\n`);

  const results = {
    total: SOURCE_FILES.length,
    processed: 0,
    modified: 0,
    totalChanges: 0,
    errors: 0,
  };

  console.log(`📂 处理 ${results.total} 个源文件...\n`);

  SOURCE_FILES.forEach((filePath) => {
    const result = processFile(filePath, dryRun, verbose);

    results.processed++;
    if (result.modified) {
      results.modified++;
      results.totalChanges += result.changes;
    }
    if (result.errors.length > 0) {
      results.errors++;
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 清理统计:\n');
  console.log(`  总文件数: ${results.total}`);
  console.log(`  处理文件: ${results.processed}`);
  console.log(`  修改文件: ${results.modified}`);
  console.log(`  Console替换: ${results.totalChanges}条`);
  console.log(`  错误数量: ${results.errors}`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n⚠️  这是DRY-RUN模式，没有实际修改文件');
    console.log('💡 去掉 --dry-run 参数以执行实际修改\n');
  } else {
    console.log('\n✅ 清理完成！');
    console.log('💡 建议运行 git diff 查看修改\n');
  }
}

// 运行
main();
