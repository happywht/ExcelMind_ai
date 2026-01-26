/**
 * 修复导入语句语法错误
 *
 * 问题：logger导入被错误地插入到多行import语句中间
 * 解决：移除错误的导入，在文件顶部重新添加正确的导入
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * 需要修复的文件列表
 */
const FILES_TO_FIX = [
  'components/FeatureCard.tsx',
  'components/Monitoring/PerformanceDashboard.tsx',
  'components/VirtualWorkspace/VirtualWorkspace.tsx',
  'components/VirtualWorkspace/VirtualFileBrowser.tsx',
  'components/VirtualWorkspace/WorkspaceRecovery.tsx',
  'components/BatchGeneration/BatchTaskCreator.tsx',
  'components/BatchGeneration/TaskProgress.tsx',
  'components/TemplateManagement/TemplateList.tsx',
  'components/TemplateManagement/TemplateEditor.tsx',
  'components/TemplateManagement/TemplateVersionHistory.tsx',
  'components/QueryVisualizer/QueryVisualizer.tsx',
  'components/QueryVisualizer/ExportDialog.tsx',
  'components/DocumentSpace/DocumentPreview.tsx',
  'components/Sidebar.tsx',
  'hooks/useWasmExecution.ts',
  'hooks/useWebSocket.ts',
  'hooks/useWebSocketSync.ts',
  'api/controllers/auditController.ts',
  'api/controllers/batchGenerationController.ts',
  'api/controllers/dataQualityController.ts',
  'api/controllers/templateController.ts',
  'api/middleware/authMiddleware.ts',
  'api/middleware/errorHandler.ts',
  'api/routes/dataQuality.ts',
  'api/routes/v2.ts',
  'server/app.ts',
  'server/index.ts',
  'server/dev-server.ts',
  'server/batchGenerationServer.ts',
  'server/websocket.ts',
  'utils/errorHandler.ts',
  'utils/globalErrorHandlers.ts',
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
  'utils/auditTrailLogger.ts',
  'utils/fileFerry.ts',
  'stores/queryClient.tsx',
];

/**
 * 修复单个文件的导入语句
 */
function fixFileImports(filePath: string): boolean {
  try {
    const fullPath = join(process.cwd(), filePath);
    let content = readFileSync(fullPath, 'utf-8');

    // 检查是否有错误的导入语句
    const hasBadImport = /import \{[\s\S]*?import \{ logger \} from '@\/utils\/logger';/m.test(content);

    if (!hasBadImport) {
      return false;
    }

    // 移除错误的logger导入
    content = content.replace(/\nimport \{ logger \} from '@\/utils\/logger';\n/g, '\n');

    // 检查是否已经有正确的logger导入
    if (content.includes("from '@/utils/logger'")) {
      // 已经有导入，不需要再添加
      writeFileSync(fullPath, content, 'utf-8');
      return true;
    }

    // 找到第一个import语句
    const lines = content.split('\n');
    let firstImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        firstImportIndex = i;
        break;
      }
    }

    if (firstImportIndex >= 0) {
      // 在第一个import之前添加logger导入
      lines.splice(firstImportIndex, 0, `import { logger } from '@/utils/logger';`);
      content = lines.join('\n');
      writeFileSync(fullPath, content, 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 修复导入语句语法错误\n');

  let fixed = 0;
  let skipped = 0;

  FILES_TO_FIX.forEach((filePath) => {
    const result = fixFileImports(filePath);
    if (result) {
      console.log(`✅ ${filePath}`);
      fixed++;
    } else {
      skipped++;
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`修复文件: ${fixed}`);
  console.log(`跳过文件: ${skipped}`);
  console.log('='.repeat(60));
  console.log('\n✅ 修复完成！');
}

main();
