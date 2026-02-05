# 多步分析系统快速修复参考

## 🚨 常见错误及解决方案

### 错误 1: TypeError - Cannot read properties of undefined

**症状**:
```
zhipuService.ts:480:134 - Cannot read properties of undefined (reading 'join')
```

**原因**: `sheetInfo.headers` 未定义或不是数组

**解决方案**:
```typescript
// ❌ 错误写法
context += `... ${sheetInfo.headers.join(', ')}\n`;

// ✅ 正确写法
const headers = sheetInfo?.headers ?? [];
const headersStr = Array.isArray(headers) ? headers.join(', ') : 'N/A';
context += `... ${headersStr}\n`;
```

**相关文件**:
- `services/zhipuService.ts:480`

---

### 错误 2: ReferenceError - codeGenerationResult is not defined

**症状**:
```
AgenticOrchestrator.ts:1139 - codeGenerationResult is not defined
```

**原因**: catch 块中引用可能在 try 块中未定义的变量

**解决方案**:
```typescript
// ❌ 错误写法
try {
  const codeGenerationResult = await generateDataProcessingCode(...);
} catch (error) {
  console.log(codeGenerationResult.code); // 可能未定义
}

// ✅ 正确写法
let codeGenerationResult: AIProcessResult | null = null;
try {
  codeGenerationResult = await generateDataProcessingCode(...);
} catch (error) {
  console.log(codeGenerationResult?.code || 'No code generated');
}
```

**相关文件**:
- `services/agentic/AgenticOrchestrator.ts:395-543`

---

### 错误 3: KeyError - 列名不存在

**症状**:
```
KeyError: '销售额'
```

**原因**: 数据结构中缺少预期的列

**解决方案**:
```typescript
// 1. 验证列名存在
const validateColumns = (data: any[], requiredColumns: string[]) => {
  if (data.length === 0) return false;
  const availableColumns = Object.keys(data[0]);
  return requiredColumns.every(col => availableColumns.includes(col));
};

// 2. 使用数据验证工具
import { DataValidator } from './dataValidationUtils';
const validation = DataValidator.validateFilesPreview(filesPreview, 'zhipu');
```

**相关文件**:
- `services/agentic/dataValidationUtils.ts`

---

## 🛠️ 数据结构规范

### AgenticOrchestrator → zhipuService 数据传递

**正确格式**:
```typescript
{
  fileName: "test.xlsx",
  currentSheetName: "Sheet1",
  sheets: {
    "Sheet1": {
      headers: ["列1", "列2", "列3"],      // 必需：数组
      sampleRows: [{ "列1": 1, "列2": 2 }], // 必需：数组
      rowCount: 100,                        // 可选：数字
      metadata: { ... }                     // 可选：对象
    }
  },
  metadata: { ... } // 可选：文件级元数据
}
```

**验证代码**:
```typescript
import { DataValidator } from './dataValidationUtils';

// 验证数据结构
const validation = DataValidator.validateFilesPreview(filesPreview, 'zhipu');
if (!validation.isValid) {
  console.error('验证失败:', validation.errors);

  // 尝试自动修复
  filesPreview = DataValidator.sanitizeFilesPreview(filesPreview);
}
```

---

## 📋 调试清单

### 当遇到错误时，按以下步骤排查：

1. **检查数据结构**
   ```typescript
   console.log('filesPreview 结构:', JSON.stringify(filesPreview[0], null, 2));
   ```

2. **验证数据完整性**
   ```typescript
   const validation = DataValidator.validateFilesPreview(filesPreview, 'zhipu');
   console.log('验证结果:', validation);
   ```

3. **查看增强日志**
   ```typescript
   const logs = EnhancedLogger.getLogs();
   console.log('错误日志:', EnhancedLogger.filterLogsByTimeRange(startTime, endTime));
   ```

4. **检查性能指标**
   ```typescript
   const stats = EnhancedLogger.getPerformanceStats('codeGeneration');
   console.log('性能统计:', stats);
   ```

---

## 🔧 快速修复工具

### 1. 自动修复数据结构

```typescript
import { DataValidator } from './dataValidationUtils';

// 清理和修复数据
const fixedData = DataValidator.sanitizeFilesPreview(filesPreview);
```

### 2. 带降级策略的代码生成

```typescript
import { generateCodeWithFallback } from './resilientCodeGenerator';

// 自动降级生成代码
const result = await generateCodeWithFallback(userInput, filesPreview);
```

### 3. 安全访问嵌套属性

```typescript
import { DataValidator } from './dataValidationUtils';

// 安全访问
const headers = DataValidator.safeGet(file, 'sheets.Sheet1.headers', []);
```

---

## 📊 性能优化建议

### 1. 减少数据传递量

```typescript
// ❌ 传递完整数据
filesPreview: file.sheets // 可能很大

// ✅ 只传递预览数据
filesPreview: {
  sheets: {
    "Sheet1": {
      headers: [...],
      sampleRows: data.slice(0, 5), // 只取前5行
      rowCount: data.length
    }
  }
}
```

### 2. 添加缓存

```typescript
// 缓存验证结果
private validationCache = new Map<string, DataValidationResult>();

const validateFilesPreview(filesPreview: any[]) {
  const cacheKey = JSON.stringify(filesPreview);

  if (this.validationCache.has(cacheKey)) {
    return this.validationCache.get(cacheKey);
  }

  const result = /* 执行验证 */;
  this.validationCache.set(cacheKey, result);
  return result;
}
```

### 3. 异步处理

```typescript
// 并行处理多个文件
await Promise.all(
  filesPreview.map(file => this.processFile(file))
);
```

---

## 🧪 测试用例

### 单元测试示例

```typescript
import { DataValidator } from './dataValidationUtils';

describe('DataValidator', () => {
  test('应该验证正确的数据结构', () => {
    const data = [{
      fileName: 'test.xlsx',
      sheets: {
        'Sheet1': {
          headers: ['A', 'B'],
          sampleRows: [{ A: 1, B: 2 }],
          rowCount: 1
        }
      }
    }];

    const result = DataValidator.validateFilesPreview(data, 'zhipu');
    expect(result.isValid).toBe(true);
  });

  test('应该检测缺失的 headers', () => {
    const data = [{
      fileName: 'test.xlsx',
      sheets: {
        'Sheet1': {
          sampleRows: [],
          rowCount: 0
        }
      }
    }];

    const result = DataValidator.validateFilesPreview(data, 'zhipu');
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});
```

---

## 📞 获取帮助

### 查看详细文档
- 完整分析报告: `MULTISTEP_ERROR_ANALYSIS_AND_FIX.md`
- 数据验证工具: `services/agentic/dataValidationUtils.ts`
- 增强日志工具: `services/agentic/enhancedLogger.ts`
- 韧性代码生成: `services/agentic/resilientCodeGenerator.ts`

### 导出诊断信息
```typescript
// 导出日志
const logs = EnhancedLogger.exportLogsAsJSON();
fs.writeFileSync('debug-logs.json', logs);

// 导出性能统计
const stats = EnhancedLogger.getPerformanceStats();
fs.writeFileSync('performance-stats.json', JSON.stringify(stats, null, 2));

// 导出错误统计
const errors = EnhancedLogger.getErrorStats();
fs.writeFileSync('error-stats.json', JSON.stringify(errors, null, 2));
```

---

**最后更新**: 2026-01-23
**维护者**: AI Assistant (Claude Code)
