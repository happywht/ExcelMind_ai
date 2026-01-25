# DocumentSpace多Sheet集成测试指南

## 测试准备

### 测试文件
准备以下测试文件：

1. **单Sheet Excel文件** (single_sheet.xlsx)
   - 包含一个工作表（如"员工信息"）
   - 数据：姓名、部门、职位、工资

2. **多Sheet Excel文件** (multi_sheet.xlsx)
   - Sheet1: 员工信息（员工ID、姓名、部门ID、工资）
   - Sheet2: 部门信息（部门ID、部门名称、负责人）

3. **Word模板文件** (template.docx)
   - 占位符：{{姓名}}、{{工资}}、{{部门名称}}、{{部门负责人}}

## 手动测试步骤

### 测试1：单Sheet场景

**步骤：**
1. 打开DocumentSpace组件
2. 上传template.docx
3. 上传single_sheet.xlsx
4. 验证：
   - ✅ SheetSelector显示单Sheet提示
   - ✅ 自动设置第一个Sheet为主Sheet
   - ✅ 不显示辅助Sheet选择器

**预期结果：**
- UI正确显示单Sheet状态
- 映射生成正常工作
- 文档生成正常工作

### 测试2：多Sheet基础功能

**步骤：**
1. 打开DocumentSpace组件
2. 上传template.docx
3. 上传multi_sheet.xlsx
4. 在SheetSelector中：
   - 验证显示两个Sheet（员工信息、部门信息）
   - 选择"员工信息"作为主Sheet
   - 启用"部门信息"作为辅助Sheet
5. 输入AI指令："生成员工工资单，包含部门负责人信息"
6. 点击"生成映射方案"

**预期结果：**
- ✅ SheetSelector正确显示所有Sheet
- ✅ 可以切换主Sheet
- ✅ 可以启用/禁用辅助Sheet
- ✅ 映射方案显示主Sheet信息
- ✅ 映射方案可能包含跨Sheet映射

### 测试3：AI智能选择主Sheet

**步骤：**
1. 上传template.docx
2. 上传multi_sheet.xlsx
3. 不手动选择主Sheet（使用默认）
4. 输入AI指令："生成所有员工的工资单"
5. 点击"生成映射方案"

**预期结果：**
- ✅ AI分析所有Sheet
- ✅ AI选择最合适的主Sheet（可能是"员工信息"）
- ✅ 日志显示AI建议的主Sheet
- ✅ primarySheet状态自动更新

### 测试4：跨Sheet映射显示

**步骤：**
1. 上传包含多Sheet的Excel
2. 生成需要跨Sheet查找的映射
3. 查看映射方案显示区域

**预期结果：**
- ✅ 显示主数据表信息
- ✅ 显示已映射字段列表
- ✅ 显示跨Sheet查找映射（如果有）
- ✅ 跨Sheet映射显示：来源Sheet、来源列、关联字段
- ✅ 显示未映射占位符（如果有）
- ✅ 显示映射置信度

### 测试5：文档生成

**步骤：**
1. 完成映射生成
2. 点击"生成Word文档"

**预期结果：**
- ✅ 使用正确的主Sheet数据
- ✅ 日志显示使用的主Sheet名称
- ✅ 成功生成文档
- ✅ 文档数量与主Sheet行数一致

## 自动化测试建议

### 单元测试
```typescript
describe('DocumentSpace多Sheet集成', () => {
  test('应该自动设置第一个Sheet为主Sheet', () => {
    // 测试代码
  });

  test('应该正确传递Sheet信息给AI映射API', () => {
    // 测试代码
  });

  test('应该更新AI返回的主Sheet选择', () => {
    // 测试代码
  });

  test('应该使用映射方案中的主Sheet生成文档', () => {
    // 测试代码
  });
});
```

### 集成测试
```typescript
describe('DocumentSpace端到端测试', () => {
  test('单Sheet场景完整流程', () => {
    // 上传模板 -> 上传数据 -> 生成映射 -> 生成文档
  });

  test('多Sheet场景完整流程', () => {
    // 上传模板 -> 上传多Sheet数据 -> 选择Sheet -> 生成映射 -> 生成文档
  });
});
```

## 性能测试

### 大数据集测试
1. 测试包含100+行的Excel文件
2. 测试包含10+个Sheet的Excel文件
3. 验证UI响应性
4. 验证AI映射生成时间

### 边界情况测试
1. 空Sheet（无数据）
2. Sheet名称包含特殊字符
3. 大量列（50+列）
4. 混合数据类型

## 常见问题排查

### 问题1：SheetSelector不显示
**可能原因：**
- excelData未正确传递
- sheets为空
- 组件渲染条件不满足

**排查方法：**
```typescript
console.log('excelData:', excelData);
console.log('sheets:', excelData?.sheets);
console.log('sheetCount:', Object.keys(excelData?.sheets || {}).length);
```

### 问题2：主Sheet未自动设置
**可能原因：**
- 数据加载时primarySheet已存在
- 条件判断错误

**排查方法：**
```typescript
console.log('primarySheet before:', primarySheet);
console.log('sheetNames:', sheetNames);
console.log('shouldSetPrimary:', sheetNames.length > 0 && !primarySheet);
```

### 问题3：AI映射未使用多Sheet API
**可能原因：**
- 导入错误
- API调用错误
- 参数格式错误

**排查方法：**
```typescript
console.log('allSheetsInfo:', allSheetsInfo);
console.log('primarySheet:', primarySheet);
console.log('using V2 API:', true);
```

## 验收标准

### 功能验收
- ✅ 单Sheet场景正常工作
- ✅ 多Sheet场景正常工作
- ✅ SheetSelector正确显示和交互
- ✅ AI映射使用V2 API
- ✅ 映射方案显示完整信息
- ✅ 文档生成使用正确的主Sheet

### 质量验收
- ✅ 无TypeScript编译错误
- ✅ 无运行时错误
- ✅ UI响应正常
- ✅ 日志记录完整

### 兼容性验收
- ✅ 向后兼容单Sheet场景
- ✅ 不破坏现有功能
- ✅ 保持代码风格一致

## 测试清单

使用此清单确保完整测试：

- [ ] 单Sheet Excel上传和显示
- [ ] 多Sheet Excel上传和显示
- [ ] 主Sheet选择功能
- [ ] 辅助Sheet启用/禁用功能
- [ ] AI映射生成（单Sheet）
- [ ] AI映射生成（多Sheet）
- [ ] 映射方案显示（主Sheet信息）
- [ ] 映射方案显示（跨Sheet映射）
- [ ] 映射方案显示（置信度）
- [ ] 文档生成（使用正确的主Sheet）
- [ ] 日志记录（Sheet相关信息）
- [ ] 错误处理（异常情况）
- [ ] 性能（大数据集）

## 测试报告模板

```markdown
## 测试执行报告

**测试日期：** YYYY-MM-DD
**测试人员：** [姓名]
**测试版本：** v2.1.0

### 测试结果汇总
- 通过的测试：X/Y
- 失败的测试：X/Y
- 阻塞的测试：X/Y

### 详细测试结果
| 测试用例 | 状态 | 备注 |
|---------|------|------|
| 单Sheet场景 | ✅/❌ | |
| 多Sheet场景 | ✅/❌ | |
| ... | ✅/❌ | |

### 发现的问题
1. [问题描述]
   - 重现步骤：
   - 预期结果：
   - 实际结果：
   - 严重程度：

### 改进建议
1. [建议内容]

### 总体评价
- 功能完整性：⭐⭐⭐⭐⭐
- 代码质量：⭐⭐⭐⭐⭐
- 用户体验：⭐⭐⭐⭐⭐
```
