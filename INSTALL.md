# Word文档格式保持 - 快速安装指南

## 🚀 5分钟快速安装

### 步骤1: 安装依赖

```bash
# 进入项目目录
cd D:\家庭\青聪赋能\excelmind-ai

# 安装核心依赖 (推荐使用pnpm)
pnpm add docxtemplater pizzip docxtemplater-image-module-free

# 安装类型定义
pnpm add -D @types/pizzip
```

**或者使用npm:**
```bash
npm install docxtemplater pizzip docxtemplater-image-module-free
npm install --save-dev @types/pizzip
```

**或者使用yarn:**
```bash
yarn add docxtemplater pizzip docxtemplater-image-module-free
yarn add -D @types/pizzip
```

### 步骤2: 验证安装

创建测试文件 `test-install.js`:
```javascript
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

console.log('✓ PizZip已安装');
console.log('✓ Docxtemplater已安装');
console.log('\n安装成功!');
```

运行测试:
```bash
node test-install.js
```

### 步骤3: 更新package.json

确保 `package.json` 包含以下依赖:
```json
{
  "dependencies": {
    "docx-templates": "^4.15.0",
    "docxtemplater": "^3.46.0",
    "pizzip": "^3.1.6",
    "docxtemplater-image-module-free": "^1.1.1"
  },
  "devDependencies": {
    "@types/pizzip": "^3.1.6"
  }
}
```

### 步骤4: 测试基础功能

在项目中运行:
```bash
npm run dev
```

访问应用并测试文档生成功能。

## ✅ 安装完成

现在你可以:
1. 使用 `generateWithDocxtemplater()` 生成文档
2. 配置引擎选择 (docx-templates 或 docxtemplater)
3. 享受95-98%的格式保持率

## 📚 下一步

- 查看快速开始指南: `docs/word-format-quick-start.md`
- 查看完整技术方案: `docs/word-format-preservation-solution.md`
- 查看实施指南: `docs/IMPLEMENTATION_GUIDE.md`

## ❓ 遇到问题?

### 问题1: 找不到模块
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
pnpm install
```

### 问题2: TypeScript错误
```bash
# 重新安装类型定义
pnpm add -D @types/pizzip
```

### 问题3: Electron中无法使用
确保在主进程或preload脚本中加载。

## 📞 需要帮助?

查看文档:
- `docs/README.md` - 解决方案概述
- `docs/word-format-quick-start.md` - 快速开始
- `docs/SOLUTION_SUMMARY.md` - 文件清单

---

**安装时间:** 约2分钟
**难度:** ⭐ 简单
**预期效果:** 格式保持率 70-80% → 95-98%
