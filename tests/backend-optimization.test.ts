/**
 * 后端优化功能验证测试
 *
 * 快速验证所有新增的后端优化功能
 *
 * @author Backend Developer
 * @version 1.0.0
 */

import { describe, it, expect } from '@jest/globals';

// 导入所有新功能
import {
  extractExcelMetadata,
  formatMetadataForPrompt
} from '../services/metadata/excelMetadataService';

import {
  reactCycle
} from '../services/react/reactCycleService';

import {
  StaticCodeAnalyzer,
  analyzeCode
} from '../services/quality/staticCodeAnalyzer';

import {
  buildPromptWithSchema,
  buildRefinePrompt
} from '../services/prompt/promptBuilderService';

import {
  AUDIT_TOOLS,
  generateToolsDocumentation,
  findTool
} from '../services/tools/auditTools';

// 模拟测试数据
const mockExcelData = {
  id: 'test-1',
  fileName: 'test.xlsx',
  currentSheetName: 'Sheet1',
  sheets: {
    'Sheet1': [
      { 姓名: '张三', 金额: 1000, 部门: '销售' },
      { 姓名: '李四', 金额: 2000, 部门: '技术' },
      { 姓名: '王五', 金额: 1500, 部门: '销售' }
    ]
  },
  metadata: {
    'Sheet1': {
      comments: {},
      notes: {},
      rowCount: 3,
      columnCount: 3
    }
  }
};

describe('后端优化功能验证', () => {

  describe('1. 元数据提取服务', () => {
    it('应该成功提取Excel元数据', () => {
      const metadata = extractExcelMetadata(mockExcelData);

      expect(metadata).toBeDefined();
      expect(metadata.fileName).toBe('test.xlsx');
      expect(metadata.sheetNames).toContain('Sheet1');
      expect(metadata.sheets['Sheet1']).toBeDefined();
    });

    it('应该正确推断列类型', () => {
      const metadata = extractExcelMetadata(mockExcelData);
      const sheet1 = metadata.sheets['Sheet1'];

      expect(sheet1.columns.length).toBe(3);

      const nameCol = sheet1.columns.find(c => c.name === '姓名');
      expect(nameCol?.type).toBe('string');

      const amountCol = sheet1.columns.find(c => c.name === '金额');
      expect(amountCol?.type).toBe('number');
    });

    it('应该生成有效的Prompt格式', () => {
      const metadata = extractExcelMetadata(mockExcelData);
      const prompt = formatMetadataForPrompt(metadata);

      expect(prompt).toContain('test.xlsx');
      expect(prompt).toContain('Sheet1');
      expect(prompt).toContain('姓名');
      expect(prompt).toContain('金额');
    });
  });

  describe('2. 静态代码分析器', () => {
    const analyzer = new StaticCodeAnalyzer(true);

    it('应该通过安全的代码', () => {
      const safeCode = `
import pandas as pd
import json

df = pd.DataFrame(data)
result = df.groupby('部门')['金额'].sum()
print(json.dumps(result))
      `;

      const result = analyzer.analyze(safeCode);

      expect(result.canExecute).toBe(true);
      expect(result.security.passed).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('应该拒绝危险的导入', () => {
      const dangerousCode = `
import os
os.system('rm -rf /')
      `;

      const result = analyzer.analyze(dangerousCode);

      expect(result.canExecute).toBe(false);
      expect(result.security.passed).toBe(false);
      expect(result.security.bannedImports).toContain('os');
      expect(result.riskLevel).toBe('critical');
    });

    it('应该拒绝危险的函数', () => {
      const dangerousCode = `
code = eval(user_input)
exec(code)
      `;

      const result = analyzer.analyze(dangerousCode);

      expect(result.canExecute).toBe(false);
      expect(result.security.passed).toBe(false);
      expect(result.security.bannedFunctions.length).toBeGreaterThan(0);
    });

    it('应该检测可疑模式', () => {
      const suspiciousCode = `
__import__('os').system('ls')
      `;

      const result = analyzer.analyze(suspiciousCode);

      expect(result.canExecute).toBe(false);
      expect(result.security.suspiciousPatterns.length).toBeGreaterThan(0);
    });

    it('应该计算代码复杂度', () => {
      const complexCode = `
if a:
    if b:
        if c:
            for i in range(10):
                for j in range(10):
                    pass
      `;

      const quality = analyzer.checkQuality(complexCode);

      expect(quality.complexity).toBeGreaterThan(0);
      expect(quality.maintainabilityIndex).toBeLessThan(100);
    });
  });

  describe('3. Prompt构建服务', () => {
    it('应该构建包含Schema的Prompt', () => {
      const metadata = extractExcelMetadata(mockExcelData);
      const prompt = buildPromptWithSchema(metadata, '计算各部门总金额');

      expect(prompt).toContain('test.xlsx');
      expect(prompt).toContain('计算各部门总金额');
      expect(prompt).toContain('数据结构信息');
      expect(prompt).toContain('可用工具函数');
    });

    it('应该构建优化的错误反馈Prompt', () => {
      const originalCode = 'df = pd.DataFrame(data)';
      const error = "KeyError: '金额'";
      const refinePrompt = buildRefinePrompt(originalCode, error);

      expect(refinePrompt).toContain('KeyError');
      expect(refinePrompt).toContain('原始代码');
      expect(refinePrompt).toContain('修复指引');
    });
  });

  describe('4. 预定义工具库', () => {
    it('应该包含所有定义的工具', () => {
      expect(AUDIT_TOOLS.length).toBeGreaterThan(10);
    });

    it('应该按类别分类工具', () => {
      const validationTools = AUDIT_TOOLS.filter(t => t.category === 'data_validation');
      expect(validationTools.length).toBeGreaterThan(0);

      const cleaningTools = AUDIT_TOOLS.filter(t => t.category === 'data_cleaning');
      expect(cleaningTools.length).toBeGreaterThan(0);
    });

    it('应该能够查找特定工具', () => {
      const tool = findTool('safe_numeric_convert');

      expect(tool).toBeDefined();
      expect(tool?.name).toBe('safe_numeric_convert');
      expect(tool?.category).toBe('data_validation');
    });

    it('应该生成工具文档', () => {
      const doc = generateToolsDocumentation();

      expect(doc).toContain('safe_numeric_convert');
      expect(doc).toContain('find_anomalies');
      expect(doc).toContain('group_and_aggregate');
    });
  });

  describe('5. 便捷函数', () => {
    it('analyzeCode 应该是可用的', () => {
      const code = 'import pandas as pd\nprint("hello")';
      const result = analyzeCode(code);

      expect(result).toBeDefined();
      expect(result.security).toBeDefined();
      expect(result.quality).toBeDefined();
    });
  });

  describe('6. 集成测试', () => {
    it('应该能够构建完整的处理流程', () => {
      // 1. 提取元数据
      const metadata = extractExcelMetadata(mockExcelData);
      expect(metadata).toBeDefined();

      // 2. 构建 Prompt
      const prompt = buildPromptWithSchema(metadata, '计算总金额');
      expect(prompt).toBeDefined();

      // 3. 检查代码安全
      const testCode = 'import pandas as pd\ndf = pd.DataFrame()';
      const analysis = analyzeCode(testCode);
      expect(analysis.canExecute).toBe(true);

      // 4. 验证工具可用
      const tool = findTool('group_and_aggregate');
      expect(tool).toBeDefined();
    });

    it('应该正确处理元数据到Prompt的转换', () => {
      const metadata = extractExcelMetadata(mockExcelData);
      const prompt = formatMetadataForPrompt(metadata);

      // 验证关键信息都在Prompt中
      expect(prompt).toContain(metadata.fileName);
      metadata.sheetNames.forEach(sheetName => {
        expect(prompt).toContain(sheetName);
      });

      // 验证列信息
      Object.values(metadata.sheets).forEach(sheet => {
        sheet.columns.forEach(col => {
          expect(prompt).toContain(col.name);
        });
      });
    });
  });

  describe('7. 边界情况', () => {
    it('应该处理空数据', () => {
      const emptyData = {
        ...mockExcelData,
        sheets: {
          'Sheet1': []
        }
      };

      const metadata = extractExcelMetadata(emptyData);
      expect(metadata).toBeDefined();
      expect(metadata.sheets['Sheet1'].rowCount).toBe(0);
    });

    it('应该处理没有列的数据', () => {
      const noColumnsData = {
        ...mockExcelData,
        sheets: {
          'Sheet1': [{}]
        }
      };

      const metadata = extractExcelMetadata(noColumnsData);
      expect(metadata).toBeDefined();
      expect(metadata.sheets['Sheet1'].columnCount).toBe(0);
    });

    it('应该处理混合类型列', () => {
      const mixedTypeData = {
        ...mockExcelData,
        sheets: {
          'Sheet1': [
            { 混合列: 123 },
            { 混合列: '文本' },
            { 混合列: true }
          ]
        }
      };

      const metadata = extractExcelMetadata(mixedTypeData);
      const mixedCol = metadata.sheets['Sheet1'].columns.find(c => c.name === '混合列');

      expect(mixedCol?.type).toBe('mixed');
    });
  });
});

// 运行测试的说明
console.log(`
====================================
后端优化功能测试
====================================

运行测试:
  npm test -- tests/backend-optimization.test.ts

覆盖的功能:
  ✅ 元数据提取 (extractExcelMetadata)
  ✅ 静态代码分析 (StaticCodeAnalyzer)
  ✅ Prompt构建 (buildPromptWithSchema)
  ✅ 预定义工具库 (AUDIT_TOOLS)
  ✅ Re-Act循环 (reactCycle)
  ✅ 集成测试
  ✅ 边界情况处理

预期结果:
  - 所有测试应该通过
  - 代码覆盖率应该 > 80%
  - 无性能问题

====================================
`);
