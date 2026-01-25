/**
 * DocxtemplaterService 使用示例
 *
 * 本文件展示了如何使用新的docxtemplater文档生成服务
 */

import {
  DocxtemplaterService,
  DocumentEngineFactory,
  TemplateValidator,
  generateWithDocxtemplater,
  type EnhancedGenerationOptions,
  type BatchOptions,
  type ImageOptions,
  ErrorCode,
  DocxGenerationError
} from './docxtemplaterService';

// ============================================================================
// 示例1: 基础文档生成
// ============================================================================

/**
 * 最简单的文档生成示例
 */
async function basicExample() {
  // 假设你有一个Word模板和对应的ArrayBuffer
  const templateBuffer: ArrayBuffer = /* 从文件上传获取 */;

  // 准备数据
  const data = {
    姓名: '张三',
    年龄: 30,
    职位: '软件工程师',
    部门: '研发部',
    入职日期: '2020-01-15'
  };

  try {
    // 生成文档
    const blob = await DocxtemplaterService.generateDocument({
      templateBuffer,
      data
    });

    // 下载文档
    downloadBlob(blob, '员工信息.docx');
    console.log('文档生成成功！');
  } catch (error) {
    console.error('生成失败:', error);
  }
}

// ============================================================================
// 示例2: 高级特性（条件、循环、图片）
// ============================================================================

/**
 * 使用高级特性的文档生成
 */
async function advancedExample() {
  const templateBuffer: ArrayBuffer = /* 从文件上传获取 */;

  const data = {
    公司名称: '科技有限公司',
    合同编号: 'HT2024001',
    签订日期: '2024-01-15'
  };

  // 配置高级选项
  const options: EnhancedGenerationOptions = {
    // 条件格式
    conditions: {
      包含附件: true,
      需要盖章: true
    },

    // 循环数据（表格行）
    loops: {
      产品列表: [
        { 产品名称: '产品A', 数量: 10, 单价: 100, 小计: 1000 },
        { 产品名称: '产品B', 数量: 5, 单价: 200, 小计: 1000 },
        { 产品名称: '产品C', 数量: 2, 单价: 500, 小计: 1000 }
      ]
    },

    // 图片插入
    images: {
      公司Logo: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      产品图片: 'https://example.com/product.jpg'
    },

    // 格式保持级别
    preserveFormatting: 'maximum'
  };

  try {
    const blob = await DocxtemplaterService.generateDocument({
      templateBuffer,
      data,
      options
    });

    downloadBlob(blob, '销售合同.docx');
  } catch (error) {
    if (error instanceof DocxGenerationError) {
      console.error(`错误码: ${error.code}`);
      console.error(`错误信息: ${error.message}`);
      console.error(`详细信息:`, error.details);
    }
  }
}

// ============================================================================
// 示例3: 批量生成
// ============================================================================

/**
 * 批量生成多个文档
 */
async function batchExample() {
  const templateBuffer: ArrayBuffer = /* 从文件上传获取 */;

  // 准备多行数据
  const dataList = [
    { 姓名: '张三', 部门: '研发部', 职位: '工程师' },
    { 姓名: '李四', 部门: '销售部', 职位: '经理' },
    { 姓名: '王五', 部门: '市场部', 职位: '专员' },
    { 姓名: '赵六', 部门: '人事部', 职位: '主管' },
    { 姓名: '孙七', 部门: '财务部', 职位: '会计' }
  ];

  // 配置批量选项
  const options: BatchOptions = {
    concurrency: 3,         // 并发生成3个
    batchSize: 10,          // 每批处理10个
    continueOnError: true,  // 遇到错误继续
    retryCount: 2,          // 失败重试2次
    onProgress: (current, total) => {
      console.log(`进度: ${current}/${total} (${((current / total) * 100).toFixed(1)}%)`);
    }
  };

  try {
    const documents = await DocxtemplaterService.batchGenerate({
      templateBuffer,
      dataList,
      options
    });

    console.log(`成功生成 ${documents.length} 个文档`);

    // 下载所有文档为ZIP
    await downloadAsZip(documents, '员工信息包.zip');
  } catch (error) {
    console.error('批量生成失败:', error);
  }
}

// ============================================================================
// 示例4: 模板验证
// ============================================================================

/**
 * 验证模板有效性
 */
async function validationExample() {
  const templateBuffer: ArrayBuffer = /* 从文件上传获取 */;

  // 验证模板
  const validationResult = TemplateValidator.validate(templateBuffer);

  console.log('模板验证结果:');
  console.log(`- 有效性: ${validationResult.valid ? '✓' : '✗'}`);
  console.log(`- 占位符数量: ${validationResult.placeholderCount}`);
  console.log(`- 复杂度: ${validationResult.complexity}`);

  if (validationResult.errors.length > 0) {
    console.error('错误:');
    validationResult.errors.forEach(err => console.error(`  - ${err}`));
  }

  if (validationResult.warnings.length > 0) {
    console.warn('警告:');
    validationResult.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }

  // 提取占位符
  const placeholders = TemplateValidator.extractPlaceholders(templateBuffer);
  console.log('占位符列表:', placeholders);

  // 检测复杂度
  const complexity = TemplateValidator.detectComplexity(templateBuffer);
  console.log('模板复杂度:', complexity);
}

// ============================================================================
// 示例5: 智能引擎选择
// ============================================================================

/**
 * 使用引擎工厂自动选择最佳引擎
 */
async function engineSelectionExample() {
  const templateBuffer: ArrayBuffer = /* 从文件上传获取 */;

  // 检测模板复杂度
  const complexity = TemplateValidator.detectComplexity(templateBuffer);

  // 选择最佳引擎
  const selectedEngine = await DocumentEngineFactory.selectEngine(complexity);
  console.log('选择的引擎:', selectedEngine);

  // 使用渐进式降级策略
  const data = { 姓名: '张三', 年龄: 30 };

  try {
    const blob = await DocumentEngineFactory.generateWithFallback(
      templateBuffer,
      data
    );

    downloadBlob(blob, '输出文档.docx');
  } catch (error) {
    console.error('所有引擎都失败了:', error);
  }
}

// ============================================================================
// 示例6: 自定义图片处理
// ============================================================================

/**
 * 使用自定义图片选项
 */
async function customImageExample() {
  const templateBuffer: ArrayBuffer = /* 从文件上传获取 */;

  // 自定义图片处理
  const imageOptions: ImageOptions = {
    getImage: async (tagValue, tagName) => {
      console.log(`加载图片: ${tagName} = ${tagValue}`);

      // 如果是base64
      if (tagValue.startsWith('data:')) {
        const base64Data = tagValue.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      }

      // 如果是URL
      if (tagValue.startsWith('http')) {
        const response = await fetch(tagValue);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      // 从本地文件系统（Electron环境）
      // return fs.readFileSync(tagValue);

      throw new Error(`不支持的图片格式: ${tagValue}`);
    },

    getSize: async (tagValue) => {
      // 可以根据标签值返回不同的尺寸
      if (tagValue.includes('logo')) {
        return [100, 100];  // Logo: 100x100
      } else if (tagValue.includes('banner')) {
        return [800, 200];  // Banner: 800x200
      } else {
        return [300, 300];  // 默认: 300x300
      }
    },

    centered: false  // 不居中
  };

  const data = {
    标题: '带图片的文档',
    logo: 'data:image/png;base64,...',
    banner: 'https://example.com/banner.jpg'
  };

  try {
    const blob = await generateWithDocxtemplater({
      templateBuffer,
      data,
      imageOptions
    });

    downloadBlob(blob, '带图片的文档.docx');
  } catch (error) {
    console.error('生成失败:', error);
  }
}

// ============================================================================
// 示例7: 错误处理
// ============================================================================

/**
 * 完善的错误处理示例
 */
async function errorHandlingExample() {
  const templateBuffer: ArrayBuffer = /* 从文件上传获取 */;

  const data = {
    // 故意缺少必需的数据
  };

  try {
    const blob = await DocxtemplaterService.generateDocument({
      templateBuffer,
      data
    });

    downloadBlob(blob, '输出.docx');
  } catch (error) {
    if (error instanceof DocxGenerationError) {
      // 根据错误码进行不同的处理
      switch (error.code) {
        case ErrorCode.INVALID_TEMPLATE:
          console.error('模板无效，请检查模板文件');
          break;

        case ErrorCode.MISSING_DATA:
          console.error('缺少必需的数据:', error.details);
          break;

        case ErrorCode.IMAGE_LOAD_FAILED:
          console.error('图片加载失败:', error.details);
          break;

        case ErrorCode.RENDER_FAILED:
          console.error('渲染失败:', error.message);
          break;

        default:
          console.error('未知错误:', error.message);
      }

      // 记录完整错误信息
      console.error('完整错误:', error.toJSON());
    } else {
      console.error('非预期错误:', error);
    }
  }
}

// ============================================================================
// 示例8: 性能对比
// ============================================================================

/**
 * 对比两个引擎的性能
 */
async function performanceComparisonExample() {
  const templateBuffer: ArrayBuffer = /* 从文件上传获取 */;

  const testData = {
    姓名: '张三',
    年龄: 30,
    部门: '研发部',
    职位: '软件工程师'
  };

  // 运行性能对比
  const { compareEngines } = await import('./docxtemplaterService');
  const results = await compareEngines(templateBuffer, testData);

  console.log('性能对比结果:');
  console.log('docxtemplater引擎:');
  console.log(`  - 耗时: ${results.docxtemplater.time}ms`);
  console.log(`  - 文件大小: ${results.docxtemplater.size} bytes`);
  console.log(`  - 成功: ${results.docxtemplater.success ? '是' : '否'}`);

  console.log('docx-templates引擎:');
  console.log(`  - 耗时: ${results.legacy.time}ms`);
  console.log(`  - 文件大小: ${results.legacy.size} bytes`);
  console.log(`  - 成功: ${results.legacy.success ? '是' : '否'}`);

  // 计算性能提升
  if (results.docxtemplater.success && results.legacy.success) {
    const speedup = ((results.legacy.time - results.docxtemplater.time) / results.legacy.time * 100).toFixed(1);
    console.log(`docxtemplater比docx-templates快 ${speedup}%`);
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 下载Blob为文件
 */
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 下载多个文档为ZIP
 */
async function downloadAsZip(documents: Array<{ blob: Blob; fileName: string }>, zipName: string) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // 添加所有文档到ZIP
  documents.forEach(doc => {
    zip.file(doc.fileName, doc.blob);
  });

  // 生成ZIP
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // 下载ZIP
  downloadBlob(zipBlob, zipName);
}

// ============================================================================
// 模板语法示例
// ============================================================================

/**
 * Word模板中的占位符语法示例
 *
 * 1. 简单变量:
 *    {{姓名}}
 *    {{年龄}}
 *
 * 2. 条件格式:
 *    {{#包含附件}}
 *    本合同包含以下附件：
 *    {{/包含附件}}
 *
 * 3. 循环（表格行）:
 *    {{#产品列表}}
 *    {{产品名称}}  {{数量}}  {{单价}}  {{小计}}
 *    {{/产品列表}}
 *
 * 4. 嵌套循环:
 *    {{#部门列表}}
 *    部门: {{部门名称}}
 *      {{#员工列表}}
 *      - {{姓名}} ({{职位}})
 *      {{/员工列表}}
 *    {{/部门列表}}
 */

// ============================================================================
// 在React组件中使用
// ============================================================================

/**
 * React组件使用示例
 */
import React, { useState } from 'react';

function DocumentGeneratorComponent() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setTemplateFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!templateFile) {
      alert('请先上传模板文件');
      return;
    }

    setGenerating(true);
    setProgress(0);

    try {
      // 读取模板
      const templateBuffer = await templateFile.arrayBuffer();

      // 验证模板
      const validationResult = TemplateValidator.validate(templateBuffer);
      if (!validationResult.valid) {
        alert('模板无效: ' + validationResult.errors.join(', '));
        return;
      }

      // 准备数据
      const data = {
        姓名: '张三',
        部门: '研发部',
        职位: '软件工程师'
      };

      // 生成文档
      const blob = await DocxtemplaterService.generateDocument({
        templateBuffer,
        data
      });

      // 下载
      downloadBlob(blob, '生成的文档.docx');
      alert('文档生成成功！');

    } catch (error) {
      console.error('生成失败:', error);
      alert('生成失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">文档生成器</h1>

      <div className="space-y-4">
        <div>
          <label className="block mb-2">上传Word模板:</label>
          <input
            type="file"
            accept=".docx"
            onChange={handleTemplateUpload}
            className="border rounded p-2"
          />
        </div>

        {generating && (
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!templateFile || generating}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {generating ? '生成中...' : '生成文档'}
        </button>
      </div>
    </div>
  );
}

export default DocumentGeneratorComponent;
