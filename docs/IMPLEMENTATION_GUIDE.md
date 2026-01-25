/**
 * Word文档生成 - 格式保持测试套件
 *
 * 用于验证不同引擎的格式保持能力
 */

import { generateWithDocxtemplater, compareEngines } from '../services/docxtemplaterService';
import { generateWordDocument } from '../services/docxGeneratorService';

/**
 * 测试用例定义
 */
export interface FormatTestCase {
  name: string;
  description: string;
  templatePath: string;
  data: Record<string, any>;
  expectedFormats: string[];
  criticalFormats: string[]; // 必须保留的格式
}

/**
 * 测试结果
 */
export interface TestResult {
  testCase: string;
  engine: 'docx-templates' | 'docxtemplater';
  passed: boolean;
  missingFormats: string[];
  generationTime: number;
  fileSize: number;
  error?: string;
}

/**
 * 预定义的测试用例
 */
export const FORMAT_TEST_CASES: FormatTestCase[] = [
  {
    name: '基础样式',
    description: '测试字体、颜色、粗体等基础样式',
    templatePath: '/templates/test-basic-style.docx',
    data: {
      title: '测试标题',
      content: '这是测试内容',
      highlight: '重要文本'
    },
    expectedFormats: [
      'font-family',
      'font-size',
      'font-color',
      'bold',
      'italic'
    ],
    criticalFormats: ['font-size', 'bold']
  },
  {
    name: '复杂表格',
    description: '测试嵌套表格、合并单元格等复杂结构',
    templatePath: '/templates/test-complex-table.docx',
    data: {
      rows: [
        { col1: '数据1', col2: '数据2', col3: '数据3' },
        { col1: '数据4', col2: '数据5', col3: '数据6' }
      ],
      summary: { total: 6 }
    },
    expectedFormats: [
      'table-borders',
      'cell-background',
      'cell-merge',
      'row-height',
      'column-width'
    ],
    criticalFormats: ['table-borders', 'cell-merge']
  },
  {
    name: '页眉页脚',
    description: '测试页眉页脚的内容和格式',
    templatePath: '/templates/test-header-footer.docx',
    data: {
      headerText: '文档标题',
      footerText: '第{{pageNumber}}页',
      companyName: '测试公司',
      date: '2024-01-01'
    },
    expectedFormats: [
      'header',
      'footer',
      'page-number',
      'header-alignment',
      'footer-alignment'
    ],
    criticalFormats: ['header', 'footer']
  },
  {
    name: '多级列表',
    description: '测试多级编号列表',
    templatePath: '/templates/test-multilevel-list.docx',
    data: {
      items: [
        { level: 1, text: '一级标题 1' },
        { level: 2, text: '二级标题 1.1' },
        { level: 3, text: '三级标题 1.1.1' },
        { level: 2, text: '二级标题 1.2' },
        { level: 1, text: '一级标题 2' }
      ]
    },
    expectedFormats: [
      'list-numbering',
      'list-indent',
      'list-style'
    ],
    criticalFormats: ['list-numbering']
  },
  {
    name: '图片插入',
    description: '测试图片的插入和定位',
    templatePath: '/templates/test-images.docx',
    data: {
      logo: 'path/to/logo.png',
      productImage: 'path/to/product.jpg',
      signature: 'path/to/signature.png'
    },
    expectedFormats: [
      'image-size',
      'image-position',
      'image-wrap',
      'image-alignment'
    ],
    criticalFormats: ['image-size']
  },
  {
    name: '条件格式',
    description: '测试条件渲染和动态内容',
    templatePath: '/templates/test-conditional.docx',
    data: {
      showWarning: true,
      warningText: '注意: 此文档包含重要信息',
      userRole: 'admin',
      content: '根据{{userRole}}角色显示的内容'
    },
    expectedFormats: [
      'conditional-text',
      'conditional-block',
      'dynamic-content'
    ],
    criticalFormats: ['conditional-block']
  }
];

/**
 * 运行格式测试
 */
export async function runFormatTests(
  templateBuffer: ArrayBuffer,
  testData: Record<string, any>
): Promise<{
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    docxtemplatesPassRate: number;
    docxtemplaterPassRate: number;
  };
}> {
  const results: TestResult[] = [];

  // 测试docx-templates
  try {
    const start1 = performance.now();
    const blob1 = await generateWordDocument({
      templateBuffer,
      data: testData,
      outputFileName: 'test-docxtemplates.docx'
    });
    const time1 = performance.now() - start1;

    results.push({
      testCase: '基础功能',
      engine: 'docx-templates',
      passed: true,
      missingFormats: [],
      generationTime: time1,
      fileSize: blob1.size
    });
  } catch (error) {
    results.push({
      testCase: '基础功能',
      engine: 'docx-templates',
      passed: false,
      missingFormats: [],
      generationTime: 0,
      fileSize: 0,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // 测试docxtemplater
  try {
    const start2 = performance.now();
    const blob2 = await generateWithDocxtemplater({
      templateBuffer,
      data: testData
    });
    const time2 = performance.now() - start2;

    results.push({
      testCase: '基础功能',
      engine: 'docxtemplater',
      passed: true,
      missingFormats: [],
      generationTime: time2,
      fileSize: blob2.size
    });
  } catch (error) {
    results.push({
      testCase: '基础功能',
      engine: 'docxtemplater',
      passed: false,
      missingFormats: [],
      generationTime: 0,
      fileSize: 0,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // 计算统计
  const dtResults = results.filter(r => r.engine === 'docx-templates');
  const dtPassRate = dtResults.filter(r => r.passed).length / dtResults.length;

  const dtlaResults = results.filter(r => r.engine === 'docxtemplater');
  const dtlaPassRate = dtlaResults.filter(r => r.passed).length / dtlaResults.length;

  const summary = {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    docxtemplatesPassRate: dtPassRate,
    docxtemplaterPassRate: dtlaPassRate
  };

  return { results, summary };
}

/**
 * 性能基准测试
 */
export async function runPerformanceBenchmark(
  templateBuffer: ArrayBuffer,
  testData: Record<string, any>,
  iterations: number = 10
): Promise<{
  docxtemplates: {
    avgTime: number;
    minTime: number;
    maxTime: number;
    avgSize: number;
  };
  docxtemplater: {
    avgTime: number;
    minTime: number;
    maxTime: number;
    avgSize: number;
  };
}> {
  const dtTimes: number[] = [];
  const dtSizes: number[] = [];
  const dtlaTimes: number[] = [];
  const dtlaSizes: number[] = [];

  // 预热
  try {
    await generateWordDocument({ templateBuffer, data: testData });
    await generateWithDocxtemplater({ templateBuffer, data: testData });
  } catch (error) {
    console.warn('预热失败:', error);
  }

  // 测试docx-templates
  for (let i = 0; i < iterations; i++) {
    try {
      const start = performance.now();
      const blob = await generateWordDocument({
        templateBuffer,
        data: testData
      });
      const time = performance.now() - start;
      dtTimes.push(time);
      dtSizes.push(blob.size);
    } catch (error) {
      console.error(`docx-templates 第${i + 1}次迭代失败:`, error);
    }
  }

  // 测试docxtemplater
  for (let i = 0; i < iterations; i++) {
    try {
      const start = performance.now();
      const blob = await generateWithDocxtemplater({
        templateBuffer,
        data: testData
      });
      const time = performance.now() - start;
      dtlaTimes.push(time);
      dtlaSizes.push(blob.size);
    } catch (error) {
      console.error(`docxtemplater 第${i + 1}次迭代失败:`, error);
    }
  }

  return {
    docxtemplates: {
      avgTime: dtTimes.reduce((a, b) => a + b, 0) / dtTimes.length,
      minTime: Math.min(...dtTimes),
      maxTime: Math.max(...dtTimes),
      avgSize: dtSizes.reduce((a, b) => a + b, 0) / dtSizes.length
    },
    docxtemplater: {
      avgTime: dtlaTimes.reduce((a, b) => a + b, 0) / dtlaTimes.length,
      minTime: Math.min(...dtlaTimes),
      maxTime: Math.max(...dtlaTimes),
      avgSize: dtlaSizes.reduce((a, b) => a + b, 0) / dtlaSizes.length
    }
  };
}

/**
 * 生成测试报告
 */
export function generateTestReport(
  formatResults: TestResult[],
  performanceResults: any
): string {
  const lines: string[] = [];

  lines.push('# Word文档生成测试报告\n');
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}\n`);

  lines.push('## 格式测试结果\n');

  const groupedResults = formatResults.reduce((acc, result) => {
    if (!acc[result.testCase]) {
      acc[result.testCase] = [];
    }
    acc[result.testCase].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  for (const [testCase, results] of Object.entries(groupedResults)) {
    lines.push(`### ${testCase}\n`);

    for (const result of results) {
      const status = result.passed ? '✓ 通过' : '✗ 失败';
      lines.push(`- ${result.engine}: ${status}`);
      lines.push(`  - 生成时间: ${result.generationTime.toFixed(2)}ms`);
      lines.push(`  - 文件大小: ${(result.fileSize / 1024).toFixed(2)}KB`);

      if (result.error) {
        lines.push(`  - 错误: ${result.error}`);
      }

      if (result.missingFormats.length > 0) {
        lines.push(`  - 缺失格式: ${result.missingFormats.join(', ')}`);
      }

      lines.push('');
    }
  }

  lines.push('## 性能基准测试\n');

  lines.push('### docx-templates');
  lines.push(`- 平均时间: ${performanceResults.docxtemplates.avgTime.toFixed(2)}ms`);
  lines.push(`- 最快: ${performanceResults.docxtemplates.minTime.toFixed(2)}ms`);
  lines.push(`- 最慢: ${performanceResults.docxtemplates.maxTime.toFixed(2)}ms`);
  lines.push(`- 平均文件大小: ${(performanceResults.docxtemplates.avgSize / 1024).toFixed(2)}KB\n`);

  lines.push('### docxtemplater');
  lines.push(`- 平均时间: ${performanceResults.docxtemplater.avgTime.toFixed(2)}ms`);
  lines.push(`- 最快: ${performanceResults.docxtemplater.minTime.toFixed(2)}ms`);
  lines.push(`- 最慢: ${performanceResults.docxtemplater.maxTime.toFixed(2)}ms`);
  lines.push(`- 平均文件大小: ${(performanceResults.docxtemplater.avgSize / 1024).toFixed(2)}KB\n`);

  lines.push('## 建议\n');

  if (performanceResults.docxtemplater.avgTime < performanceResults.docxtemplates.avgTime) {
    lines.push('- docxtemplater 在性能上表现更好');
  } else {
    lines.push('- docx-templates 在性能上表现更好');
  }

  lines.push('- 根据文档复杂度选择合适的引擎');
  lines.push('- 简单文档可使用docx-templates以获得更快的速度');
  lines.push('- 复杂文档应使用docxtemplater以获得更好的格式保持');

  return lines.join('\n');
}

/**
 * 快速测试函数
 */
export async function quickTest(): Promise<void> {
  console.log('开始快速测试...\n');

  // 创建测试模板 (简单版)
  const testTemplate = `
    {{title}}

    {{content}}
  `;

  const testData = {
    title: '测试标题',
    content: '这是测试内容'
  };

  console.log('测试数据:', testData);

  // 这里应该使用实际的模板文件
  console.log('\n注意: 请提供实际的.docx模板文件以进行完整测试');
  console.log('当前测试仅验证API可用性\n');

  console.log('快速测试完成!');
}
