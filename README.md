<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ExcelMind AI - 智能Excel处理工具

基于智谱AI的智能Excel处理工具，支持自然语言指令处理、公式生成和审计问答功能。

## 🌟 核心功能

- **智能处理 (v3.4 Premium)** 
  - **动态三栏布局**: 文件库、数据预览、思维枢纽独立面版，支持灵活折叠。
  - **可伸缩指令栏**: 悬浮式透明指令栏，支持多行输入及一键折叠（气泡模式）。
  - **OTAV 推理引擎**: 自研 Observe-Think-Act-Verify 闭环引擎，推理过程可视化。
- **公式生成器** - 根据自然语言描述生成Excel公式
- **审计助手** - 基于知识库的财务和审计问答系统
- **多文件处理** - 支持跨文件核对、合并和筛选

## 🚀 快速开始

**环境要求：** Node.js

### 1. 安装依赖
```bash
npm install
```

### 2. 配置智谱AI API密钥
在 [`.env.local`](.env.local) 文件中设置您的智谱API密钥：
```
ZHIPU_API_KEY=your_zhipu_api_key_here
```

### 3. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000 开始使用。

## 📋 技术栈

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **AI服务**: 智谱AI (GLM-4.6)
- **文档处理**: XLSX, PDF.js, Mammoth

## 🔧 项目结构

```
├── components/          # React组件
│   ├── FormulaGen.tsx   # 公式生成器
│   ├── KnowledgeChat.tsx # 知识聊天
│   └── SmartExcel.tsx   # 智能Excel处理
├── services/            # 服务层
│   ├── zhipuService.ts  # 智谱AI服务
│   └── excelService.ts  # Excel处理服务
└── types.ts            # TypeScript类型定义
```
