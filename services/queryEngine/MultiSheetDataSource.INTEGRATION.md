# MultiSheetDataSource 项目集成指南

## 📋 目录

1. [环境准备](#环境准备)
2. [安装步骤](#安装步骤)
3. [集成到现有项目](#集成到现有项目)
4. [React组件集成](#react组件集成)
5. [错误处理](#错误处理)
6. [最佳实践](#最佳实践)
7. [故障排除](#故障排除)

---

## 环境准备

### 前置依赖

```json
{
  "dependencies": {
    "alasql": "^4.16.0"
  },
  "devDependencies": {
    "typescript": "~5.8.2"
  }
}
```

### 确保AlaSQL可用

在HTML中引入（如果使用Web Worker）:

```html
<script src="https://cdn.jsdelivr.net/npm/alasql@4.16.0/dist/alasql.min.js"></script>
```

或在React组件中动态加载:

```typescript
import alasql from 'alasql';
window.alasql = alasql;
```

---

## 安装步骤

### 1. 复制文件到项目

```bash
# 主文件
services/queryEngine/MultiSheetDataSource.ts

# 文档文件（可选）
services/queryEngine/MultiSheetDataSource.README.md
services/queryEngine/MultiSheetDataSource.API.md
services/queryEngine/MultiSheetDataSource.test.md
services/queryEngine/MultiSheetDataSource.example.ts
services/queryEngine/MultiSheetDataSource.SUMMARY.md
services/queryEngine/MultiSheetDataSource.QUICKREF.md
```

### 2. 更新类型定义

确保 `types.ts` 中包含 ExcelData 定义:

```typescript
// types.ts
export interface ExcelData {
  id: string;
  fileName: string;
  sheets: { [sheetName: string]: any[] };
  currentSheetName: string;
  metadata?: {
    [sheetName: string]: {
      comments: { [cellAddress: string]: string };
      notes?: { [cellAddress: string]: string };
      rowCount: number;
      columnCount: number;
    }
  };
}
```

### 3. 更新模块导出

在 `services/queryEngine/index.ts` 中:

```typescript
export {
  MultiSheetDataSource,
  globalDataSource,
  IMultiSheetDataSource,
  Relationship,
  RelationshipPath,
  ColumnConflict,
  ColumnIndex,
  SheetMetadata
} from './MultiSheetDataSource';
```

---

## 集成到现有项目

### 方式1: 作为独立模块使用

```typescript
import { MultiSheetDataSource } from '@/services/queryEngine';

class ExcelDataService {
  private dataSource: MultiSheetDataSource;

  constructor() {
    this.dataSource = new MultiSheetDataSource();
  }

  async loadExcelFile(file: File): Promise<void> {
    // 读取Excel文件
    const excelData = await this.readExcelFile(file);

    // 加载到数据源
    this.dataSource.loadExcelData(excelData);
  }

  getDataStatistics() {
    return this.dataSource.getStatistics();
  }
}
```

### 方式2: 使用全局单例

```typescript
import { globalDataSource } from '@/services/queryEngine';

// 在应用初始化时
globalDataSource.loadExcelData(excelData);

// 在任何地方访问
import { globalDataSource } from '@/services/queryEngine';

const sheets = globalDataSource.getSheetNames();
```

### 方式3: 与React Context集成

```typescript
// DataContext.tsx
import { createContext, useContext } from 'react';
import { MultiSheetDataSource } from '@/services/queryEngine';

interface DataContextValue {
  dataSource: MultiSheetDataSource;
  loadData: (excelData: ExcelData) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }) {
  const dataSource = new MultiSheetDataSource();

  const loadData = (excelData: ExcelData) => {
    dataSource.loadExcelData(excelData);
  };

  return (
    <DataContext.Provider value={{ dataSource, loadData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
```

---

## React组件集成

### 示例1: 数据加载组件

```typescript
import React, { useState } from 'react';
import { useData } from './DataContext';
import { ExcelData } from '@/types';

export function ExcelLoader() {
  const { dataSource, loadData } = useData();
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // 读取Excel文件
      const excelData: ExcelData = await readExcelFile(file);

      // 加载到数据源
      loadData(excelData);

      // 显示统计信息
      const stats = dataSource.getStatistics();
      console.log('数据加载成功:', stats);
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileUpload} accept=".xlsx,.xls" />
      {loading && <p>加载中...</p>}
    </div>
  );
}
```

### 示例2: 数据展示组件

```typescript
import React from 'react';
import { useData } from './DataContext';

export function DataOverview() {
  const { dataSource } = useData();

  const stats = dataSource.getStatistics();
  const conflicts = dataSource.detectColumnConflicts();
  const relationships = dataSource.detectRelationships();

  return (
    <div className="data-overview">
      <h2>数据概览</h2>

      <section>
        <h3>统计信息</h3>
        <ul>
          <li>Sheet数量: {stats.sheetCount}</li>
          <li>总行数: {stats.totalRows}</li>
          <li>总列数: {stats.totalColumns}</li>
          <li>关系数量: {stats.relationshipCount}</li>
          <li>冲突数量: {stats.conflictCount}</li>
        </ul>
      </section>

      {conflicts.length > 0 && (
        <section>
          <h3>列名冲突</h3>
          <ul>
            {conflicts.map((conflict, index) => (
              <li key={index}>
                {conflict.columnName}: {conflict.suggestedResolution}
                ({conflict.sheets.join(', ')})
              </li>
            ))}
          </ul>
        </section>
      )}

      {relationships.length > 0 && (
        <section>
          <h3>表间关系</h3>
          <ul>
            {relationships.map((rel, index) => (
              <li key={index}>
                {rel.fromSheet}.{rel.fromColumn} -> {rel.toSheet}.{rel.toColumn}
                ({rel.type}, 置信度: {(rel.confidence * 100).toFixed(1)}%)
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

### 示例3: 关系路径查询组件

```typescript
import React, { useState } from 'react';
import { useData } from './DataContext';

export function RelationshipPathFinder() {
  const { dataSource } = useData();
  const [fromSheet, setFromSheet] = useState('');
  const [toSheet, setToSheet] = useState('');
  const [paths, setPaths] = useState([]);

  const sheetNames = dataSource.getSheetNames();

  const handleFindPath = () => {
    const result = dataSource.getRelationshipPath(fromSheet, toSheet);
    setPaths(result);
  };

  return (
    <div>
      <h3>查找关系路径</h3>

      <select value={fromSheet} onChange={(e) => setFromSheet(e.target.value)}>
        <option value="">选择起始Sheet</option>
        {sheetNames.map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      <select value={toSheet} onChange={(e) => setToSheet(e.target.value)}>
        <option value="">选择目标Sheet</option>
        {sheetNames.map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      <button onClick={handleFindPath}>查找路径</button>

      {paths.length > 0 && (
        <div>
          <h4>找到 {paths.length} 条路径:</h4>
          {paths.map((path, index) => (
            <div key={index}>
              <strong>路径 {index + 1}</strong> (置信度: {(path.confidence * 100).toFixed(1)}%)
              <ol>
                {path.path.map((step, stepIndex) => (
                  <li key={stepIndex}>
                    {step.fromSheet} -> {step.toSheet} (on: {step.onColumn})
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 错误处理

### 1. 数据加载错误

```typescript
try {
  dataSource.loadExcelData(excelData);
} catch (error) {
  if (error.message.includes('无效的Excel数据结构')) {
    // 处理无效数据
    showErrorMessage('Excel数据格式不正确');
  } else if (error.message.includes('Sheet不存在')) {
    // 处理Sheet不存在
    showErrorMessage('指定的Sheet不存在');
  } else {
    // 其他错误
    showErrorMessage('加载数据时发生错误');
  }
}
```

### 2. 查询错误

```typescript
try {
  const columns = dataSource.getColumns("Sheet1");
} catch (error) {
  if (error.message.includes('Sheet不存在')) {
    // 处理Sheet不存在
    console.warn('Sheet不存在，使用默认值');
    return [];
  }
}
```

### 3. AlaSQL错误

```typescript
try {
  const result = alasql('SELECT * FROM [Sheet1]');
} catch (error) {
  console.error('SQL查询失败:', error);
  // 回退逻辑
  return [];
}
```

---

## 最佳实践

### 1. 数据预检查

```typescript
function validateExcelData(excelData: ExcelData): boolean {
  if (!excelData.sheets || Object.keys(excelData.sheets).length === 0) {
    throw new Error('Excel数据中没有Sheet');
  }

  if (!excelData.currentSheetName) {
    throw new Error('未指定当前Sheet');
  }

  return true;
}

// 使用
if (validateExcelData(excelData)) {
  dataSource.loadExcelData(excelData);
}
```

### 2. 缓存优化

```typescript
class CachedDataSource {
  private dataSource: MultiSheetDataSource;
  private metadataCache: Map<string, SheetMetadata> = new Map();

  getSheetMetadata(sheetName: string): SheetMetadata | undefined {
    if (!this.metadataCache.has(sheetName)) {
      const metadata = this.dataSource.getSheetMetadata(sheetName);
      if (metadata) {
        this.metadataCache.set(sheetName, metadata);
      }
    }
    return this.metadataCache.get(sheetName);
  }

  clearCache() {
    this.metadataCache.clear();
  }
}
```

### 3. 渐进式加载

```typescript
async function loadLargeExcel(dataSource: MultiSheetDataSource, file: File) {
  // 先加载当前Sheet
  const currentSheetData = await readCurrentSheet(file);
  dataSource.registerSheet(currentSheetData.name, currentSheetData.data, 10);

  // 后台加载其他Sheet
  setTimeout(async () => {
    const otherSheets = await readOtherSheets(file);
    otherSheets.forEach(sheet => {
      dataSource.registerSheet(sheet.name, sheet.data, 0);
    });

    // 检测关系
    dataSource.detectRelationships();
  }, 100);
}
```

### 4. 错误边界

```typescript
class DataSourceErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>数据加载失败</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            重新加载
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 故障排除

### 问题1: AlaSQL未定义

**症状**: `ReferenceError: alasql is not defined`

**解决方案**:
```typescript
// 确保AlaSQL已加载
if (typeof alasql === 'undefined') {
  await import('alasql');
  window.alasql = alasql;
}
```

### 问题2: 类型错误

**症状**: TypeScript类型不匹配

**解决方案**:
```typescript
// 确保导入正确的类型
import { ExcelData } from '@/types';

// 类型断言
const excelData = rawData as ExcelData;
```

### 问题3: 内存溢出

**症状**: 处理大文件时内存不足

**解决方案**:
```typescript
// 分批加载
function loadDataInBatches(data: any[], batchSize: number) {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    // 处理批次
  }
}
```

### 问题4: 性能问题

**症状**: 数据加载或查询慢

**解决方案**:
```typescript
// 使用Web Worker
const worker = new Worker('data-worker.js');
worker.postMessage({ excelData });
worker.onmessage = (e) => {
  const result = e.data;
  // 处理结果
};
```

---

## 测试集成

### 单元测试示例

```typescript
import { MultiSheetDataSource } from '@/services/queryEngine';

describe('MultiSheetDataSource Integration', () => {
  test('should load Excel data', () => {
    const dataSource = new MultiSheetDataSource();

    const excelData: ExcelData = {
      id: 'test',
      fileName: 'test.xlsx',
      sheets: {
        'Sheet1': [{ ID: 1, 名称: '测试' }]
      },
      currentSheetName: 'Sheet1'
    };

    dataSource.loadExcelData(excelData);

    expect(dataSource.getSheetNames()).toContain('Sheet1');
  });
});
```

---

## 部署检查清单

- [ ] AlaSQL已正确引入
- [ ] TypeScript类型定义完整
- [ ] 所有依赖已安装
- [ ] 错误处理已实现
- [ ] 性能测试通过
- [ ] 文档已更新
- [ ] 单元测试通过
- [ ] 集成测试通过

---

## 参考资源

- **主文档**: `MultiSheetDataSource.README.md`
- **API参考**: `MultiSheetDataSource.API.md`
- **代码示例**: `MultiSheetDataSource.example.ts`
- **快速参考**: `MultiSheetDataSource.QUICKREF.md`

---

**最后更新**: 2025-12-28
**版本**: 2.0.0
