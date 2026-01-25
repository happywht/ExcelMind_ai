/**
 * DocxtemplaterService 快速开始示例
 *
 * 这是一个简化的演示，展示最核心的功能
 */

import {
  DocxtemplaterService,
  TemplateValidator,
  type EnhancedGenerationOptions
} from './docxtemplaterService';

// ============================================================================
// 示例1: 最简单的文档生成
// ============================================================================

async function quickStart() {
  console.log('=== 示例1: 快速开始 ===\n');

  // 步骤1: 上传Word模板（假设通过HTML input获取）
  // <input type="file" id="template" accept=".docx">
  const fileInput = document.getElementById('template') as HTMLInputElement;
  const file = fileInput.files?.[0];

  if (!file) {
    console.error('请先选择模板文件');
    return;
  }

  // 步骤2: 读取模板
  const templateBuffer = await file.arrayBuffer();

  // 步骤3: 验证模板
  const validation = await TemplateValidator.validate(templateBuffer);
  console.log('模板验证结果:', validation);

  if (!validation.valid) {
    console.error('模板无效:', validation.errors);
    return;
  }

  // 步骤4: 准备数据
  const data = {
    姓名: '张三',
    年龄: 30,
    部门: '研发部',
    职位: '软件工程师',
    入职日期: '2020-01-15'
  };

  // 步骤5: 生成文档
  const blob = await DocxtemplaterService.generateDocument({
    templateBuffer,
    data
  });

  // 步骤6: 下载文档
  downloadBlob(blob, '员工信息.docx');
  console.log('✓ 文档生成成功！');
}

// ============================================================================
// 示例2: 带图片的文档
// ============================================================================

async function withImages() {
  console.log('=== 示例2: 带图片的文档 ===\n');

  const templateBuffer = await getTemplateBuffer();

  const data = {
    公司名称: '科技有限公司',
    产品名称: '超级产品',
    产品描述: '这是一个很棒的产品'
  };

  const options: EnhancedGenerationOptions = {
    images: {
      // 方式1: Base64图片
      公司Logo: 'data:image/png;base64,iVBORw0KGgoAAAANS...',

      // 方式2: URL图片
      产品图片: 'https://example.com/product.jpg'
    }
  };

  const blob = await DocxtemplaterService.generateDocument({
    templateBuffer,
    data,
    options
  });

  downloadBlob(blob, '产品介绍.docx');
}

// ============================================================================
// 示例3: 带条件的文档
// ============================================================================

async function withConditions() {
  console.log('=== 示例3: 带条件的文档 ===\n');

  const templateBuffer = await getTemplateBuffer();

  const data = {
    合同编号: 'HT2024001',
    甲方: '公司A',
    乙方: '公司B',
    金额: 100000
  };

  const options: EnhancedGenerationOptions = {
    conditions: {
      // 如果包含附件为true，模板中的{{#包含附件}}...{{/包含附件}}部分会显示
      包含附件: true,

      // 如果需要盖章为true，模板中的{{#需要盖章}}...{{/需要盖章}}部分会显示
      需要盖章: true
    }
  };

  const blob = await DocxtemplaterService.generateDocument({
    templateBuffer,
    data,
    options
  });

  downloadBlob(blob, '合同.docx');
}

// ============================================================================
// 示例4: 带表格循环的文档
// ============================================================================

async function withLoops() {
  console.log('=== 示例4: 带表格循环的文档 ===\n');

  const templateBuffer = await getTemplateBuffer();

  const data = {
    订单编号: 'DD2024001',
    客户名称: '张三',
    订单日期: '2024-01-15'
  };

  const options: EnhancedGenerationOptions = {
    loops: {
      // 表格行数据
      产品列表: [
        { 序号: 1, 产品名称: '产品A', 数量: 2, 单价: 100, 小计: 200 },
        { 序号: 2, 产品名称: '产品B', 数量: 3, 单价: 200, 小计: 600 },
        { 序号: 3, 产品名称: '产品C', 数量: 1, 单价: 500, 小计: 500 }
      ]
    }
  };

  const blob = await DocxtemplaterService.generateDocument({
    templateBuffer,
    data,
    options
  });

  downloadBlob(blob, '订单.docx');
}

// ============================================================================
// 示例5: 批量生成
// ============================================================================

async function batchGenerate() {
  console.log('=== 示例5: 批量生成 ===\n');

  const templateBuffer = await getTemplateBuffer();

  // 多行数据
  const dataList = [
    { 姓名: '张三', 部门: '研发部', 职位: '工程师' },
    { 姓名: '李四', 部门: '销售部', 职位: '经理' },
    { 姓名: '王五', 部门: '市场部', 职位: '专员' },
    { 姓名: '赵六', 部门: '人事部', 职位: '主管' },
    { 姓名: '孙七', 部门: '财务部', 职位: '会计' }
  ];

  const documents = await DocxtemplaterService.batchGenerate({
    templateBuffer,
    dataList,
    options: {
      concurrency: 3,
      onProgress: (current, total) => {
        const percent = ((current / total) * 100).toFixed(1);
        console.log(`进度: ${current}/${total} (${percent}%)`);
      }
    }
  });

  console.log(`✓ 成功生成 ${documents.length} 个文档`);

  // 打包为ZIP下载
  await downloadAsZip(documents, '员工信息包.zip');
}

// ============================================================================
// 示例6: 完整流程（验证+生成+错误处理）
// ============================================================================

async function completeWorkflow() {
  console.log('=== 示例6: 完整流程 ===\n');

  try {
    // 1. 获取模板
    const templateBuffer = await getTemplateBuffer();

    // 2. 验证模板
    const validation = await TemplateValidator.validate(templateBuffer);

    if (!validation.valid) {
      console.error('❌ 模板验证失败:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      return;
    }

    console.log('✓ 模板验证通过');
    console.log(`  - 占位符数量: ${validation.placeholderCount}`);
    console.log(`  - 复杂度: ${validation.complexity}`);

    if (validation.warnings.length > 0) {
      console.warn('⚠️  警告:');
      validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
    }

    // 3. 提取占位符
    const placeholders = await TemplateValidator.extractPlaceholders(templateBuffer);
    console.log('✓ 检测到的占位符:', placeholders);

    // 4. 准备数据
    const data = {
      姓名: '张三',
      年龄: 30,
      部门: '研发部',
      职位: '软件工程师'
    };

    // 5. 生成文档
    console.log('正在生成文档...');
    const blob = await DocxtemplaterService.generateDocument({
      templateBuffer,
      data,
      options: { preserveFormatting: 'maximum' }
    });

    // 6. 下载
    downloadBlob(blob, '输出文档.docx');
    console.log('✓ 文档生成成功！');

  } catch (error) {
    console.error('❌ 生成失败:', error);

    if (error instanceof Error) {
      console.error(`错误类型: ${error.name}`);
      console.error(`错误消息: ${error.message}`);
    }
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取模板Buffer（模拟）
 */
async function getTemplateBuffer(): Promise<ArrayBuffer> {
  const fileInput = document.getElementById('template') as HTMLInputElement;
  const file = fileInput.files?.[0];

  if (!file) {
    throw new Error('请先选择模板文件');
  }

  return await file.arrayBuffer();
}

/**
 * 下载Blob
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
 * 下载为ZIP
 */
async function downloadAsZip(
  documents: Array<{ blob: Blob; fileName: string }>,
  zipName: string
) {
  const JSZipModule = await import('jszip');
  const JSZip = JSZipModule.default || JSZipModule;
  const zip = new JSZip();

  documents.forEach(doc => {
    zip.file(doc.fileName, doc.blob);
  });

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE'
  });

  downloadBlob(zipBlob, zipName);
}

// ============================================================================
// Word模板示例
// ============================================================================

/**
 * Word模板中的占位符示例：
 *
 * 简单变量:
 *   {{姓名}}
 *   {{年龄}}
 *   {{部门}}
 *
 * 条件:
 *   {{#包含附件}}
 *   本合同包含以下附件：
 *   附件1: xxx
 *   {{/包含附件}}
 *
 * 循环（表格行）:
 *   {{#产品列表}}
 *   {{序号}}  {{产品名称}}  {{数量}}  {{单价}}  {{小计}}
 *   {{/产品列表}}
 */

// ============================================================================
// HTML示例
// ============================================================================

/**
 * 对应的HTML示例:
 *
 * ```html
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   <title>文档生成器</title>
 * </head>
 * <body>
 *   <h1>文档生成器</h1>
 *
 *   <div>
 *     <label>选择Word模板:</label>
 *     <input type="file" id="template" accept=".docx">
 *   </div>
 *
 *   <div>
 *     <button onclick="quickStart()">示例1: 快速开始</button>
 *     <button onclick="withImages()">示例2: 带图片</button>
 *     <button onclick="withConditions()">示例3: 带条件</button>
 *     <button onclick="withLoops()">示例4: 带表格</button>
 *     <button onclick="batchGenerate()">示例5: 批量生成</button>
 *     <button onclick="completeWorkflow()">示例6: 完整流程</button>
 *   </div>
 *
 *   <div id="output"></div>
 *
 *   <script type="module" src="./docxtemplaterService.demo.ts"></script>
 * </body>
 * </html>
 * ```
 */

// 导出函数供HTML使用
(window as any).quickStart = quickStart;
(window as any).withImages = withImages;
(window as any).withConditions = withConditions;
(window as any).withLoops = withLoops;
(window as any).batchGenerate = batchGenerate;
(window as any).completeWorkflow = completeWorkflow;
