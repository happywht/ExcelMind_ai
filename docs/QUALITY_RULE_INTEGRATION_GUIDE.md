# 质量规则系统集成指南

本文档说明如何将质量规则系统集成到 `SmartExcel` 组件中。

---

## 📋 集成步骤

### 步骤1：修改 SmartExcel 组件

文件：`components/SmartExcel.tsx`

#### 1.1 添加导入

在文件顶部添加：

```typescript
import { ModeSwitcher, WorkMode } from './SmartExcel/ModeSwitcher';
import { QualityRulePanel } from './SmartExcel/QualityRulePanel';
import { QualityResultPanel } from './SmartExcel/QualityResultPanel';
import { IssueHighlighter } from './SmartExcel/IssueHighlighter';
import { QualityRule, RuleExecutionResult, BatchExecutionResult } from '../types/qualityRule';
import { ruleRouter } from '../services/ruleRouter';
```

#### 1.2 添加状态

在 `SmartExcel` 组件中添加状态：

```typescript
const [workMode, setWorkMode] = useState<WorkMode>('processing'); // 新增
const [qualityRules, setQualityRules] = useState<QualityRule[]>([]); // 新增
const [qualityResults, setQualityResults] = useState<RuleExecutionResult[]>([]); // 新增
const [batchResult, setBatchResult] = useState<BatchExecutionResult | null>(null); // 新增
const [executingQualityCheck, setExecutingQualityCheck] = useState(false); // 新增
const [selectedIssue, setSelectedIssue] = useState<{row: number, column: string} | null>(null); // 新增
```

#### 1.3 添加质量检查处理函数

```typescript
// 处理规则执行
const handleExecuteQualityRules = async (rules: QualityRule[]) => {
  if (filesData.length === 0) {
    alert('请先上传文件');
    return;
  }

  // 获取当前活动文件的数据
  const activeFile = filesData.find(f => f.id === activeFileId);
  if (!activeFile || !activeSheetName) {
    alert('请选择文件和工作表');
    return;
  }

  const data = activeFile.sheets[activeSheetName];

  setExecutingQualityCheck(true);
  setQualityResults([]);
  setBatchResult(null);

  try {
    const result = await ruleRouter.executeRules(rules, data, {
      sampleSize: data.length > 1000 ? 100 : 0, // 大数据量时采样
      maxIssues: 100
    });

    setQualityResults(result.results);
    setBatchResult(result);
  } catch (error) {
    console.error('质量检查失败:', error);
    alert(`质量检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    setExecutingQualityCheck(false);
  }
};

// 处理问题点击
const handleIssueClick = (row: number, column: string) => {
  setSelectedIssue({ row, column });
  // 可以滚动到该行
  const tableRow = document.querySelector(`tr[data-row="${row}"]`);
  if (tableRow) {
    tableRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

// 处理规则变化
const handleRulesChange = (rules: QualityRule[]) => {
  setQualityRules(rules);
};
```

#### 1.4 修改UI渲染

在主渲染部分添加模式切换：

```tsx
{/* 在 Header 中添加模式切换器 */}
<div className="bg-white border-b border-slate-200 px-6 py-4">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-xl font-bold text-slate-800">智能多文件处理工作区</h2>
      <p className="text-sm text-slate-500">上传多个文件，进行跨表核对、合并或筛选</p>
    </div>

    {/* 新增：模式切换器 */}
    <ModeSwitcher
      currentMode={workMode}
      onModeChange={setWorkMode}
      disabled={filesData.length === 0}
    />
  </div>
</div>
```

#### 1.5 条件渲染不同模式

```tsx
{/* 左侧面板 */}
<div className="w-[400px] flex flex-col border-r border-slate-200 bg-white">
  {workMode === 'processing' ? (
    <>
      {/* 原有的文件列表和控制台 */}
      {/* ... 保留原有代码 ... */}
    </>
  ) : (
    <>
      {/* 质量检查模式：规则管理面板 */}
      <QualityRulePanel
        onRulesChange={handleRulesChange}
        onExecuteRules={handleExecuteQualityRules}
        executing={executingQualityCheck}
      />
    </>
  )}
</div>

{/* 右侧面板 */}
<div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
  {workMode === 'quality' && qualityResults.length > 0 ? (
    /* 质量检查结果面板 */
    <QualityResultPanel
      results={qualityResults}
      batchResult={batchResult}
      data={activeSheetData || []}
      onIssueClick={handleIssueClick}
      onClose={() => {
        setQualityResults([]);
        setBatchResult(null);
      }}
    />
  ) : activeFile && activeSheetData ? (
    /* 数据预览（包裹在 IssueHighlighter 中） */
    <IssueHighlighter
      data={activeSheetData}
      issues={qualityResults.flatMap(r => r.issues)}
      highlightedCell={selectedIssue}
      onCellClick={handleIssueClick}
    >
      {({ getCellStyle, getCellClassName, handleCellClick }) => (
        <div className="flex-1 flex flex-col m-4 bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
          {/* ... 保留原有的表格预览代码 ... */}

          {/* 在表格单元格中应用样式 */}
          <tbody>
            {activeSheetData.slice(0, 200).map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-blue-50/30">
                {Object.entries(row).map(([col, cell], cIdx) => (
                  <td
                    key={cIdx}
                    style={getCellClassName(rIdx, col)}
                    className={getCellClassName(rIdx, col)}
                    onClick={() => handleCellClick(rIdx, col)}
                  >
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </div>
      )}
    </IssueHighlighter>
  ) : (
    /* 空状态 */
    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
      <Layers className="w-16 h-16 mb-4 opacity-20" />
      <p className="font-medium">选择左侧文件以预览数据</p>
    </div>
  )}
</div>
```

---

## 🎨 UI布局建议

### 方案A：左右分栏（推荐）

```
+------------------+--------------------------+
|  左侧面板 (400px) |   右侧面板 (flex-1)       |
|                  |                          |
|  - 文件列表      |  - 数据预览 / 结果展示   |
|  - 规则管理      |                          |
|  - 执行控制      |                          |
|  - 日志          |                          |
+------------------+--------------------------+
```

### 方案B：上下分栏

```
+------------------------------------------+
|           顶部工具栏 (60px)              |
|  - 模式切换  - 操作按钮  - 状态指示      |
+------------------------------------------+
|                                        |
|           主内容区 (flex-1)              |
|  - 数据预览 / 规则管理 / 结果展示        |
|                                        |
+------------------------------------------+
|           底部日志区 (150px)             |
+------------------------------------------+
```

---

## 🔌 API集成说明

### 与现有API的集成

质量规则系统已经集成了现有的 `smartProcessApi`：

```typescript
// services/aiRuleExecutor.ts
const { smartProcessApi } = await import('../services/api/smartProcessApi');

const response = await smartProcessApi.execute({
  command: prompt,  // AI提示
  files: [],        // 无需传递文件（数据在提示中）
  options: {
    useAgenticMode: false,
    maxRetries: 1,
    qualityThreshold: 0.0,
    enableAutoRepair: false
  }
});

const result = await smartProcessApi.waitForCompletion(response.taskId, {
  pollInterval: 1000,
  timeout: 60000
});
```

### 与AgenticOrchestrator的集成

如果需要使用AgenticOrchestrator的完整功能：

```typescript
// services/aiRuleExecutor.ts
import { AgenticOrchestrator } from './agentic';

const orchestrator = new AgenticOrchestrator();
const result = await orchestrator.executeTask(prompt, []);
```

---

## 🧪 测试建议

### 单元测试

```typescript
// tests/unit/ruleStorage.test.ts
describe('QualityRuleStorage', () => {
  test('should save and retrieve rule', async () => {
    const rule = { /* ... */ };
    const saved = await qualityRuleStorage.saveRule(rule);
    const retrieved = await qualityRuleStorage.getRule(saved.id);
    expect(retrieved).toEqual(saved);
  });
});

// tests/unit/ruleExecutor.test.ts
describe('LocalRuleExecutor', () => {
  test('should execute not_null rule', async () => {
    const rule = { /* ... */ localRule: { type: 'not_null' } };
    const data = [{ col: 'value' }, { col: null }];
    const result = await localRuleExecutor.executeRule(rule, data);
    expect(result.issues.length).toBe(1);
  });
});
```

### 集成测试

```typescript
// tests/integration/qualityCheckWorkflow.test.ts
describe('Quality Check Workflow', () => {
  test('should execute full workflow', async () => {
    // 1. 创建规则
    const rule = await qualityRuleStorage.saveRule({ /* ... */ });

    // 2. 执行规则
    const result = await ruleRouter.executeRules([rule], testData);

    // 3. 验证结果
    expect(result.results.length).toBe(1);
    expect(result.results[0].ruleId).toBe(rule.id);
  });
});
```

### E2E测试

```typescript
// tests/e2e/qualityCheckMode.spec.ts
test('quality check mode e2e', async ({ page }) => {
  await page.goto('/smart-excel');

  // 1. 上传文件
  await page.click('text=添加文件');
  await page.setInputFiles('input[type="file"]', 'test.xlsx');

  // 2. 切换到质量检查模式
  await page.click('text=质量检查模式');

  // 3. 启用规则
  await page.click('text=必填字段检查');
  await page.click('button[title="启用"]');

  // 4. 执行检查
  await page.click('text=执行检查');

  // 5. 验证结果
  await page.waitForSelector('text=检查结果');
  expect(await page.textContent('text=失败')).toBeTruthy();
});
```

---

## 📊 数据流图

```
用户操作
   ↓
规则管理面板
   ↓
规则存储
   ↓
规则路由器
   ↓
   ├→ 本地执行器 → 快速检查
   │
   └→ AI执行器 → 智能检查
       ↓
   API服务
       ↓
   AgenticOrchestrator
       ↓
   AI模型
       ↓
执行结果
   ↓
结果展示面板
   ↓
问题高亮组件
```

---

## 🔧 配置选项

### LocalStorage配置

```typescript
// 规则存储
localStorage.setItem('excelmind_quality_rules', JSON.stringify(rules));

// 使用统计
localStorage.setItem('excelmind_rule_usage_stats', JSON.stringify(stats));
```

### 执行选项

```typescript
interface RuleExecutionOptions {
  stopOnFirstError?: boolean;    // 遇到第一个错误是否停止
  maxIssues?: number;            // 每个规则最多记录的问题数
  sampleSize?: number;           // 采样大小（0表示全量检查）
  enableCache?: boolean;         // 是否启用结果缓存
  parallel?: boolean;            // 是否并行执行
}
```

---

## 🎯 性能优化建议

1. **缓存策略**
   - 本地规则结果缓存（默认启用）
   - AI规则结果缓存（根据数据哈希）

2. **采样策略**
   - 小数据（<100行）：全量检查
   - 中数据（100-1000行）：采样100行
   - 大数据（>1000行）：采样50-100行

3. **并行执行**
   - 本地规则：并行执行
   - AI规则：串行执行（控制成本）

4. **懒加载**
   - 规则列表：分页加载（>50条）
   - 问题列表：分页加载（>20条）

---

## 🚀 部署检查清单

- [ ] 所有文件已创建
- [ ] 类型定义已导出
- [ ] SmartExcel组件已修改
- [ ] UI布局已调整
- [ ] 事件处理已绑定
- [ ] 错误处理已添加
- [ ] 加载状态已处理
- [ ] 单元测试已编写
- [ ] 集成测试已编写
- [ ] E2E测试已编写
- [ ] 文档已更新

---

## 📝 总结

本文档提供了质量规则系统集成的完整指南，包括：

1. ✅ 详细的集成步骤
2. ✅ 代码示例
3. ✅ UI布局建议
4. ✅ API集成说明
5. ✅ 测试建议
6. ✅ 数据流图
7. ✅ 配置选项
8. ✅ 性能优化建议

按照本指南操作，即可完成质量规则系统的集成。

**建议实施顺序**：

1. 先修改 SmartExcel 组件，添加基础功能
2. 测试模式切换和规则管理
3. 测试规则执行和结果展示
4. 最后添加问题高亮功能

**预计时间**：2-3小时

---

**文档版本**：1.0
**最后更新**：2026-01-28
