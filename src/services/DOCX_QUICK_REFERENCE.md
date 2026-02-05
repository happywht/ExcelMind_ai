# DocxtemplaterService - 快速参考指南

## 快速开始（3步）

```typescript
// 1. 导入
import { DocxtemplaterService } from './services/docxtemplaterService';

// 2. 生成
const blob = await DocxtemplaterService.generateDocument({
  templateBuffer: await file.arrayBuffer(),
  data: { 姓名: '张三', 年龄: 30 }
});

// 3. 下载
downloadBlob(blob, 'output.docx');
```

## 常用API

### 基础生成
```typescript
DocxtemplaterService.generateDocument({
  templateBuffer,
  data
})
```

### 高级选项
```typescript
DocxtemplaterService.generateDocument({
  templateBuffer,
  data,
  options: {
    conditions: { 包含附件: true },
    loops: { 产品列表: [...] },
    images: { logo: 'data:image/png;base64,...' },
    preserveFormatting: 'maximum'
  }
})
```

### 批量生成
```typescript
DocxtemplaterService.batchGenerate({
  templateBuffer,
  dataList: [...],
  options: {
    concurrency: 3,
    onProgress: (c, t) => console.log(`${c}/${t}`)
  }
})
```

### 模板验证
```typescript
TemplateValidator.validate(templateBuffer)
// → { valid, errors, warnings, placeholderCount, complexity }
```

### 智能生成（带降级）
```typescript
DocumentEngineFactory.generateWithFallback(
  templateBuffer,
  data
)
```

## Word模板语法

| 语法 | 示例 | 说明 |
|------|------|------|
| 简单变量 | `{{姓名}}` | 替换为数据值 |
| 条件 | `{{#条件}}...{{/条件}}` | 条件为true时显示 |
| 循环 | `{{#列表}}...{{/列表}}` | 遍历数组 |

## 错误处理

```typescript
try {
  const blob = await DocxtemplaterService.generateDocument(...);
} catch (error) {
  if (error instanceof DocxGenerationError) {
    console.error(error.code);    // 错误码
    console.error(error.message); // 错误信息
    console.error(error.details); // 详细信息
  }
}
```

## 错误码

| 代码 | 说明 |
|------|------|
| `INVALID_TEMPLATE` | 模板无效 |
| `MISSING_DATA` | 缺少数据 |
| `IMAGE_LOAD_FAILED` | 图片加载失败 |
| `RENDER_FAILED` | 渲染失败 |

## React示例

```typescript
import { DocxtemplaterService, TemplateValidator } from './services/docxtemplaterService';

function Generator() {
  const [file, setFile] = useState<File | null>(null);

  const generate = async () => {
    const buffer = await file.arrayBuffer();
    const validation = TemplateValidator.validate(buffer);

    if (!validation.valid) {
      alert('模板无效');
      return;
    }

    const blob = await DocxtemplaterService.generateDocument({
      templateBuffer: buffer,
      data: { 姓名: '张三' }
    });

    downloadBlob(blob, 'out.docx');
  };

  return (
    <>
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <button onClick={generate}>生成</button>
    </>
  );
}
```

## 文件位置

| 文件 | 说明 |
|------|------|
| `docxtemplaterService.ts` | 核心服务 |
| `docxtemplaterService.example.ts` | 完整示例 |
| `docxtemplaterService.demo.ts` | 快速演示 |
| `docxtemplaterService.test.ts` | 单元测试 |
| `DOCXTEMPLATER_SERVICE_README.md` | 详细文档 |

## 性能提示

- ✅ 使用`batchGenerate`处理多个文档
- ✅ 设置`concurrency: 3-5`提升批量性能
- ✅ 启用`preserveFormatting: 'maximum'`获得最佳格式
- ✅ 使用`generateWithFallback`确保生成成功

## 更多帮助

- 详细文档: `DOCXTEMPLATER_SERVICE_README.md`
- 完整示例: `docxtemplaterService.example.ts`
- 测试用例: `docxtemplaterService.test.ts`
