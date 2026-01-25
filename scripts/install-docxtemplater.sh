# Word文档格式保持解决方案 - 实施脚本

## 1. 安装依赖

### 方式一: 使用npm
```bash
# 核心库
npm install docxtemplater pizzip

# 图片处理模块
npm install docxtemplater-image-module-free

# HTML转Word模块 (可选)
npm install docxtemplater-html-module
```

### 方式二: 使用pnpm (推荐,更快)
```bash
# 核心库
pnpm add docxtemplater pizzip

# 图片处理模块
pnpm add docxtemplater-image-module-free

# HTML转Word模块 (可选)
pnpm add docxtemplater-html-module
```

### 方式三: 使用yarn
```bash
# 核心库
yarn add docxtemplater pizzip

# 图片处理模块
yarn add docxtemplater-image-module-free

# HTML转Word模块 (可选)
yarn add docxtemplater-html-module
```

## 2. 开发依赖安装

### 类型定义
```bash
# 使用npm
npm install --save-dev @types/pizzip

# 使用pnpm
pnpm add -D @types/pizzip

# 使用yarn
yarn add -D @types/pizzip
```

## 3. 完整的package.json更新

将以下依赖添加到你的package.json:

```json
{
  "dependencies": {
    "docxtemplater": "^3.46.0",
    "pizzip": "^3.1.6",
    "docxtemplater-image-module-free": "^1.1.1",
    "docxtemplater-html-module": "^1.1.0"
  },
  "devDependencies": {
    "@types/pizzip": "^3.1.6"
  }
}
```

## 4. 验证安装

创建测试脚本 `test-docxtemplater.js`:

```javascript
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

console.log('✓ PizZip version:', PizZip.version);
console.log('✓ Docxtemplater loaded successfully');

// 测试基本功能
const testZip = new PizZip();
console.log('✓ PizZip initialization successful');

console.log('\n所有依赖安装成功!');
```

运行测试:
```bash
node test-docxtemplater.js
```

## 5. 清理脚本 (如果需要回退)

```bash
# 移除docxtemplater相关依赖
npm uninstall docxtemplater pizzip docxtemplater-image-module-free docxtemplater-html-module
npm uninstall @types/pizzip

# 或使用pnpm
pnpm remove docxtemplater pizzip docxtemplater-image-module-free docxtemplater-html-module
pnpm remove @types/pizzip
```

## 6. TypeScript配置更新

在 `tsconfig.json` 中确保包含:

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  }
}
```

## 7. Vite配置 (如果使用Vite)

在 `vite.config.ts` 中添加:

```typescript
export default defineConfig({
  // ... 其他配置
  optimizeDeps: {
    include: ['docxtemplater', 'pizzip']
  },
  define: {
    global: 'globalThis'
  }
});
```

## 8. 故障排除

### 问题1: 找不到模块 'pizzip'
**解决方案:**
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

### 问题2: TypeScript类型错误
**解决方案:**
```bash
# 安装类型定义
npm install --save-dev @types/pizzip

# 或创建自定义类型声明文件
# 创建: src/types/pizzip.d.ts
declare module 'pizzip';
```

### 问题3: 在Electron中使用失败
**解决方案:**
确保在主进程中使用,或在渲染进程的preload脚本中加载。

## 9. 性能优化建议

### 生产环境构建优化
```json
{
  "scripts": {
    "build": "vite build",
    "build:optimized": "vite build --mode production"
  }
}
```

### 懒加载 (按需加载)
```typescript
// 仅在需要时加载
async function loadDocxtemplater() {
  const { default: Docxtemplater } = await import('docxtemplater');
  const { default: PizZip } = await import('pizzip');
  return { Docxtemplater, PizZip };
}
```

## 10. 版本兼容性

| Package | Version | Notes |
|---------|---------|-------|
| docxtemplater | ^3.46.0 | 最新稳定版 |
| pizzip | ^3.1.6 | 兼容docxtemplater |
| docxtemplater-image-module-free | ^1.1.1 | 图片处理 |
| Node.js | >=14.0.0 | 最低要求 |
| TypeScript | >=4.5.0 | 类型支持 |

## 11. 下一步

安装完成后,请查看:
1. `services/docxtemplaterService.ts` - 核心服务实现
2. `components/DocumentGeneratorConfig.tsx` - 配置界面
3. `docs/word-format-preservation-solution.md` - 完整技术方案

## 12. 快速开始示例

```typescript
import { generateWithDocxtemplater } from './services/docxtemplaterService';

// 基础使用
const blob = await generateWithDocxtemplater({
  templateBuffer: templateArrayBuffer,
  data: {
    title: '文档标题',
    content: '文档内容'
  }
});

// 下载文档
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'output.docx';
a.click();
```

---

**安装完成后,建议运行完整测试以确保一切正常工作。**
