/**
 * 服务层类型修复脚本
 *
 * 自动修复常见的服务层类型问题
 */

const fs = require('fs');
const path = require('path');

// 修复配置
const fixes = [
  {
    file: 'services/queryEngine/DataQueryEngine.ts',
    pattern: /setDataSource\s*\([^)]*\)/g,
    message: '检查 DataQueryEngine 的 setDataSource 方法'
  },
  {
    file: 'components/DocumentSpaceAdvanced.tsx',
    pattern: /enableCache\s*:\s*true/,
    replacement: '// enableCache: true, // 已在接口中移除',
    message: '移除 DocumentSpaceAdvanced 中的 enableCache 属性'
  },
  {
    file: 'components/QueryVisualizer/QueryVisualizerExample.tsx',
    pattern: /tables\s*:\s*{/,
    replacement: '// tables: { // 已在接口中移除',
    message: '移除 QueryVisualizerExample 中的 tables 属性'
  }
];

function applyFixes() {
  console.log('开始应用类型修复...\n');

  let appliedCount = 0;

  fixes.forEach(fix => {
    const filePath = path.join(__dirname, '..', fix.file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${fix.file}`);
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');

      if (fix.replacement) {
        // 应用替换
        const newContent = content.replace(fix.pattern, fix.replacement);
        if (newContent !== content) {
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log(`✅ 已修复: ${fix.message}`);
          appliedCount++;
        }
      } else {
        // 仅检查
        if (fix.pattern.test(content)) {
          console.log(`🔍 发现: ${fix.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ 修复失败 ${fix.file}:`, error.message);
    }
  });

  console.log(`\n完成！共应用 ${appliedCount} 个修复。`);
}

// 运行修复
applyFixes();
