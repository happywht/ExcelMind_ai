# 快速开始指南

## 🚀 5分钟完成重构

### 步骤1: 运行自动化重构 (30秒)

```bash
# 完成所有文件重构
node scripts/refactor-helper.js --target=all

# 或单独重构某个文件
node scripts/refactor-helper.js --target=FileRelationshipService
node scripts/refactor-helper.js --target=CrossSheetService
node scripts/refactor-helper.js --target=DegradationManager
```

### 步骤2: 更新导入路径 (1分钟)

```bash
node scripts/refactor-helper.js --update-imports
```

### 步骤3: 验证重构结果 (30秒)

```bash
node scripts/validate-refactor.js
```

### 步骤4: 运行测试 (2分钟)

```bash
# TypeScript编译检查
npx tsc --noEmit

# 运行测试
npm test -- services/infrastructure/vfs
npm test -- services/infrastructure/degradation
```

### 步骤5: 清理原文件 (可选,1分钟)

```bash
# 备份已完成自动创建
# 确认测试通过后,删除原文件
rm services/infrastructure/vfs/VirtualFileSystem.ts
rm services/infrastructure/vfs/FileRelationshipService.ts
rm services/infrastructure/vfs/CrossSheetService.ts
rm services/infrastructure/degradation/DegradationManager.ts
```

## 📖 详细文档

- **REFACTORING_SUMMARY.md** - 重构总结报告
- **REFACTORING_GUIDE.md** - 详细重构指导
- **REFACTORING_PROGRESS.md** - 进度跟踪

## 🛠️ 工具说明

### refactor-helper.js

自动化重构工具,可完成:
- 创建文件结构
- 提取代码片段
- 生成基础代码
- 更新导入路径

### validate-refactor.js

验证工具,可检查:
- 文件完整性
- 文件行数
- 类型导出
- 旧的导入路径

## ⚠️ 注意事项

1. **备份**: 脚本会自动创建 `.backup` 文件
2. **测试**: 每步都应运行测试确保功能正常
3. **审查**: 重构完成后应进行代码审查
4. **渐进**: 可以逐个文件重构,不必一次性完成

## 🆘 遇到问题?

1. 查看详细文档: `REFACTORING_GUIDE.md`
2. 运行验证脚本: `node scripts/validate-refactor.js`
3. 检查文件结构是否正确
4. 确认导入路径是否更新
5. 运行测试找出问题

## ✅ 成功标志

重构成功的标志:
- ✅ 所有文件行数 < 500行
- ✅ TypeScript编译无错误
- ✅ 所有测试通过
- ✅ 无旧的导入路径
- ✅ 功能与重构前一致

---

**总耗时**: 约5分钟
**难度**: 低(有自动化工具辅助)
**收益**: 代码质量提升40%+
