# Function Calling 原型使用指南

**项目**: ExcelMind AI
**阶段**: Phase 2 - Week 0 技术验证
**状态**: ✅ 验证通过

---

## 📦 文件结构

```
services/functionCalling/
├── types.ts                      # 类型定义
├── ToolRegistry.ts               # 工具注册表
├── FunctionCallingAdapter.ts     # 核心适配器
├── tools.ts                      # 原型工具集
├── index.ts                      # 模块导出
├── demo.ts                       # 演示代码
├── quickTest.ts                  # 快速测试脚本
└── __tests__/
    └── functionCalling.test.ts   # 测试套件
```

---

## 🚀 快速开始

### 1. 运行快速测试

```bash
npx ts-node services/functionCalling/quickTest.ts
```

### 2. 运行单元测试

```bash
npm test -- functionCalling
```

### 3. 在React中使用

```tsx
import { FunctionCallingDemo } from './components/FunctionCallingDemo';

function App() {
  return <FunctionCallingDemo apiKey={process.env.ZHIPU_API_KEY} />;
}
```

### 4. 在浏览器控制台演示

```javascript
// 1. 导入模块
import { runAllDemos } from './services/functionCalling/demo';

// 2. 运行所有演示
await runAllDemos();

// 3. 或单独运行某个演示
import { demo01_basicRegistration } from './services/functionCalling/demo';
await demo01_basicRegistration();
```

---

## 💻 编程示例

### 基础使用

```typescript
import { ToolRegistry, FunctionCallingAdapter, prototypeTools } from './services/functionCalling';

// 1. 初始化工具注册表
const registry = new ToolRegistry();
registry.registerBatch(prototypeTools);

// 2. 创建适配器
const adapter = new FunctionCallingAdapter(
  'your-zhipu-api-key',
  registry,
  {
    maxDepth: 2,           // 最大调用深度
    maxToolsPerTurn: 3,    // 每轮最多工具数
    timeout: 30000,        // 超时时间(ms)
    enableParallel: true   // 启用并行调用
  }
);

// 3. 执行Function Calling
const result = await adapter.execute('检查Excel里的异常记录');

// 4. 处理结果
console.log('AI回复:', result.finalResponse);
console.log('工具调用:', result.toolCalls);
console.log('工具结果:', result.toolResults);
```

### 注册自定义工具

```typescript
registry.register({
  name: 'my_custom_tool',
  description: '我的自定义工具',
  parameters: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: '输入参数'
      },
      threshold: {
        type: 'number',
        description: '阈值'
      }
    },
    required: ['input']
  },
  handler: async (args) => {
    // 工具执行逻辑
    console.log('执行参数:', args);

    // 返回结果
    return {
      success: true,
      data: {
        result: '处理完成',
        value: args.input
      }
    };
  }
});
```

### 多轮对话

```typescript
const context = {
  history: [
    { role: 'user', content: '你好' },
    { role: 'assistant', content: '你好！有什么可以帮助你的？' }
  ]
};

const result = await adapter.execute('分析Excel文件', context);

// 更新历史
context.history.push(
  { role: 'user', content: '分析Excel文件' },
  { role: 'assistant', content: result.finalResponse }
);

// 继续对话
const result2 = await adapter.execute('找出异常数据', context);
```

---

## 🔧 可用工具

### 1. analyze_excel

**描述**: 分析Excel文件，返回结构信息

**参数**:
- `fileName` (string, 必需): Excel文件名
- `sheetName` (string, 可选): 工作表名称

**示例**:
```typescript
await registry.executeTool('analyze_excel', {
  fileName: 'sales_data.xlsx',
  sheetName: 'Sheet1'
});
```

**返回**:
```json
{
  "success": true,
  "data": {
    "fileName": "sales_data.xlsx",
    "sheetName": "Sheet1",
    "rowCount": 500,
    "columns": [
      { "name": "日期", "type": "date", "nullable": false },
      { "name": "产品名称", "type": "string", "nullable": false }
    ],
    "sampleData": [...]
  }
}
```

### 2. detect_anomalies

**描述**: 检测数据异常

**参数**:
- `fileName` (string, 必需): Excel文件名
- `columnName` (string, 必需): 要检查的列名
- `threshold` (number, 必需): 异常阈值
- `condition` (string, 必需): 检测条件 (greater_than, less_than, equals)

**示例**:
```typescript
await registry.executeTool('detect_anomalies', {
  fileName: 'sales.xlsx',
  columnName: '金额',
  threshold: 5000,
  condition: 'greater_than'
});
```

**返回**:
```json
{
  "success": true,
  "data": {
    "totalRows": 500,
    "anomalyCount": 23,
    "threshold": 5000,
    "condition": "greater_than",
    "anomalies": [...],
    "summary": "发现 23 笔异常记录"
  }
}
```

### 3. fill_document

**描述**: 填充Word文档模板

**参数**:
- `templateFile` (string, 必需): Word模板文件名
- `dataFile` (string, 必需): Excel数据文件名
- `outputFileName` (string, 必需): 输出文件名
- `mappings` (array, 必需): 映射关系

**示例**:
```typescript
await registry.executeTool('fill_document', {
  templateFile: 'template.docx',
  dataFile: 'data.xlsx',
  outputFileName: 'output.docx',
  mappings: [
    { placeholder: '{{产品名称}}', column: 'product_name' },
    { placeholder: '{{金额}}', column: 'amount' }
  ]
});
```

**返回**:
```json
{
  "success": true,
  "data": {
    "templateFile": "template.docx",
    "dataFile": "data.xlsx",
    "outputFileName": "output.docx",
    "processedCount": 10,
    "mappings": [...],
    "downloadUrl": "/api/v1/download/output.docx",
    "summary": "成功生成 10 个文档"
  }
}
```

---

## ⚙️ 配置选项

### FunctionCallingConfig

```typescript
interface FunctionCallingConfig {
  maxDepth: number;           // 最大调用深度 (默认: 2)
  maxToolsPerTurn: number;    // 每轮最多工具数 (默认: 3)
  timeout: number;            // 超时时间(ms) (默认: 30000)
  enableParallel: boolean;    // 启用并行调用 (默认: true)
}
```

### 更新配置

```typescript
adapter.updateConfig({
  maxDepth: 5,
  maxToolsPerTurn: 10
});
```

### 获取配置

```typescript
const config = adapter.getConfig();
console.log(config);
```

---

## 🧪 测试

### 运行所有测试

```bash
npm test -- functionCalling
```

### 运行特定测试

```bash
npm test -- functionCalling.test.ts
```

### 测试覆盖率

```bash
npm test -- --coverage --testPathPattern=functionCalling
```

---

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 工具注册时间 | < 10ms |
| 工具执行时间 | < 50ms |
| API调用延迟 | 1-3s |
| 总体响应时间 | 2-5s |
| 内存占用 | < 50MB |

---

## 🎯 下一步

### Phase 2 Week 1-2

- [ ] 集成真实Excel处理（XLSX库）
- [ ] 集成文档生成（docxtemplater）
- [ ] 添加更多工具
- [ ] 实现工具结果缓存

### Phase 2 Week 3-4

- [ ] UI集成和可视化
- [ ] 性能优化
- [ ] 监控和日志
- [ ] E2E测试

---

## 📚 相关文档

- [验证报告](./FUNCTION_CALLING_VALIDATION_REPORT.md)
- [API规范](./API_SPECIFICATION.md)
- [架构文档](./ARCHITECTURE.md)

---

## 🤝 贡献

欢迎提交问题和改进建议！

---

**状态**: ✅ Phase 2 准备就绪
**验证**: 通过
**下一步**: 开始 Phase 2 Week 1 开发
