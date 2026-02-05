# DocumentSpace 组件使用指南

## 概述

DocumentSpace是ExcelMind AI的核心组件之一，提供智能文档填充和批量生成功能。

### 版本信息

- **版本**: 2.0.0
- **阶段**: Phase 2 - 完整集成
- **更新日期**: 2025-12-29

## 功能特性

### 核心功能

1. **模板上传与解析**
   - 支持.docx格式Word文档
   - 自动识别占位符（`{{字段名}}`格式）
   - 提供HTML预览和高亮显示

2. **数据导入**
   - 支持.xlsx/.xls/.csv格式
   - 多工作表支持
   - 数据预览和搜索

3. **AI智能映射**
   - 基于Few-Shot Learning的AI映射生成
   - 支持自然语言指令
   - 自动字段匹配和转换规则生成

4. **批量文档生成**
   - 使用docxtemplater引擎
   - 支持条件格式和循环
   - 高质量格式保持（95-98%）

5. **性能监控**
   - 实时性能指标
   - 处理时间追踪
   - 资源使用监控

## 快速开始

### 基本使用

```tsx
import { DocumentSpace } from './components/DocumentSpace';

function App() {
  return (
    <div className="h-screen">
      <DocumentSpace />
    </div>
  );
}
```

### 工作流程

1. **上传Word模板**
   - 点击"Word模板"区域
   - 选择包含占位符的.docx文件
   - 系统自动解析并显示占位符

2. **上传Excel数据**
   - 点击"Excel数据"区域
   - 选择数据文件
   - 预览数据内容

3. **输入AI指令**
   - 在文本框中输入自然语言指令
   - 示例："把销售额大于10万的产品信息填入模板"
   - 点击"生成映射方案"

4. **查看映射方案**
   - AI自动生成字段映射
   - 可以手动调整映射关系
   - 查看筛选条件和未映射字段

5. **生成文档**
   - 点击"生成Word文档"
   - 等待批量生成完成
   - 单个下载或批量下载ZIP

## 组件架构

### 目录结构

```
components/DocumentSpace/
├── DocumentSpace.tsx          # 主组件
├── DocumentSpaceSidebar.tsx   # 左侧边栏
├── DocumentSpaceMain.tsx      # 右侧主内容
├── TemplatePreview.tsx        # 模板预览
├── DataPreview.tsx            # 数据预览
├── MappingEditor.tsx          # 映射编辑器
├── DocumentList.tsx           # 文档列表
├── types.ts                   # 类型定义
└── index.tsx                  # 导出文件
```

### 核心类型

```typescript
interface DocumentSpaceState {
  templateFile: TemplateFile | null;
  dataFile: File | null;
  excelData: any;
  userInstruction: string;
  mappingScheme: MappingScheme | null;
  generatedDocs: GeneratedDocument[];
  activeTab: DocumentSpaceTab;
  selectedDoc: GeneratedDocument | null;
  isProcessing: boolean;
  logs: DocumentProcessingLog[];
  performanceMetrics: PerformanceMetrics;
}
```

## 服务集成

### Phase 1服务

```typescript
// Excel服务
import { readExcelFile } from '../../services/excelService';

// 模板服务
import { createTemplateFile, highlightPlaceholdersInHtml } from '../../services/templateService';

// 映射服务
import { generateFieldMapping } from '../../services/documentMappingService';

// 文档生成服务
import { DocxtemplaterService, downloadDocument, downloadDocumentsAsZip } from '../../services/docxtemplaterService';
```

### Phase 2服务

```typescript
// Few-Shot引擎
import { FewShotEngine, allQueryExamples } from '../../services/ai/fewShotEngine';

// 质量验证
import { AIOutputValidator } from '../../services/quality';

// 性能监控
import { PerformanceTracker, recordMetric, initPerformanceMonitoring } from '../../services/monitoring';
```

## 性能优化

### 监控指标

- **模板解析时间**: 目标 < 2秒
- **数据读取时间**: 目标 < 3秒
- **AI映射生成**: 目标 < 10秒
- **文档生成时间**: 目标 < 5秒/文档

### 优化策略

1. **并发控制**: 批量生成时使用并发限制（默认3）
2. **缓存机制**: Few-Shot引擎结果缓存
3. **懒加载**: 大数据集分页加载
4. **虚拟滚动**: 长列表性能优化

## 质量保证

### AI输出验证

```typescript
const validator = new AIOutputValidator();
const validationResult = validator.validateMappingResult(mapping, {
  templatePlaceholders: templateFile.placeholders,
  excelHeaders: headers
});
```

### 错误处理

- 模板解析失败 → 友好错误提示
- 数据读取失败 → 详细错误信息
- AI映射失败 → 降级策略
- 文档生成失败 → 重试机制

## 最佳实践

### 模板设计

1. 使用清晰的占位符命名：`{{客户名称}}` 而非 `{{name}}`
2. 保持模板结构简单
3. 避免嵌套循环
4. 测试模板验证

### 数据准备

1. 使用清晰的列名
2. 确保数据类型一致
3. 清理空值和无效数据
4. 提供示例数据

### AI指令

1. **好的指令**:
   - "把销售额大于10万的产品信息填入模板，生成产品介绍文档"
   - "筛选北京地区的客户，生成合同文档"

2. **不好的指令**:
   - "生成文档"（太模糊）
   - "把数据填进去"（缺少筛选条件）

## 常见问题

### Q: 占位符没有被识别？

A: 确保占位符格式为 `{{字段名}}`，使用双花括号。

### Q: AI映射不准确？

A: 提供更详细的指令，或手动调整映射关系。

### Q: 文档生成失败？

A: 检查：
1. 模板格式是否正确
2. 映射关系是否完整
3. 数据是否有效

### Q: 性能太慢？

A:
1. 减少数据量
2. 使用筛选条件
3. 降低并发数

## 扩展开发

### 添加新的数据源

```typescript
const handleCustomDataUpload = async (file: File) => {
  const data = await readCustomFile(file);
  setExcelData(data);
};
```

### 自定义映射逻辑

```typescript
const customMappingGenerator = async (params) => {
  // 自定义映射逻辑
  return customMappingScheme;
};
```

### 集成新的文档引擎

```typescript
import { CustomDocumentEngine } from './engines/custom';

const documents = await CustomDocumentEngine.batchGenerate({
  templateBuffer,
  dataList
});
```

## 技术支持

- **文档**: [在线文档](https://docs.excelmind.ai)
- **问题反馈**: [GitHub Issues](https://github.com/excelmind/issues)
- **社区**: [Discord社区](https://discord.gg/excelmind)

## 更新日志

### v2.0.0 (2025-12-29)

- 完整集成Phase 1和Phase 2所有模块
- 添加Few-Shot Learning支持
- 集成质量验证系统
- 实现性能监控
- 优化用户体验

### v1.0.0 (2025-12-20)

- 初始版本
- 基础文档生成功能
- 模板和数据上传
- AI映射生成

## 许可证

MIT License

---

**作者**: ExcelMind AI Team
**最后更新**: 2025-12-29
