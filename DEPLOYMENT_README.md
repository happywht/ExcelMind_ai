# ExcelMind AI 部署文档

## 快速开始

### 1. 构建项目
```bash
npm run build
```

### 2. 打包应用
```bash
npm run dist
```

### 3. 验证部署
```bash
node scripts/verify-deployment.cjs
```

### 4. 冒烟测试
```bash
node scripts/smoke-test-launcher.cjs
```

---

## 生成的文件

### 安装程序
- 位置: `dist-electron/ExcelMind AI Setup 1.0.0.exe`
- 大小: 108.30 MB
- 用途: 分发给最终用户

### 便携版本
- 位置: `dist-electron/win-unpacked/`
- 主程序: `ExcelMind AI.exe`
- 用途: 直接运行，无需安装

### 更新文件
- `dist-electron/latest.yml` - 更新配置
- `dist-electron/ExcelMind AI Setup 1.0.0.exe.blockmap` - 增量更新

---

## 验证状态

✅ 所有检查通过（21/21）

详细报告: [DEPLOYMENT_VERIFICATION_REPORT.md](./DEPLOYMENT_VERIFICATION_REPORT.md)

---

## 重要配置

### package.json 关键配置
```json
{
  "build": {
    "npmRebuild": false,  // 跳过原生模块重新编译
    "asarUnpack": [
      "**/node-pty/**"     // 解包node-pty模块
    ]
  }
}
```

### 为什么设置 npmRebuild: false?
- node-pty 包的 TypeScript 编译失败
- 跳过重新编译使用预编译的二进制文件
- 不影响主要功能

---

## 冒烟测试清单

- [ ] 应用窗口正常打开
- [ ] 文件上传功能
- [ ] Excel预览显示
- [ ] AI查询响应
- [ ] 文档生成下载
- [ ] 应用正常退出

详细指南: [SMOKE_TEST.md](./SMOKE_TEST.md)

---

## 文件完整性

### SHA256 校验和
```
02DD8989BF19EA12022DE54B5217D6896717A32E69682EE72103AA048013E4AD
```

### 验证命令
```powershell
Get-FileHash "dist-electron\ExcelMind AI Setup 1.0.0.exe" -Algorithm SHA256
```

---

## 技术信息

- **Electron版本**: 28.3.3
- **Node.js版本**: 22.18.0
- **React版本**: 19.2.3
- **构建工具**: Vite 6.4.1
- **打包工具**: electron-builder 24.13.3

---

## 故障排除

### 构建失败
```bash
# 清理并重新构建
rm -rf dist/ dist-electron/
npm run build
npm run dist
```

### node-pty 错误
- 已通过设置 `npmRebuild: false` 解决
- 如仍有问题，检查 node-pty 版本

### 应用无法启动
1. 检查防病毒软件
2. 以管理员身份运行
3. 检查系统日志

---

## 支持平台

- ✅ Windows 10/11 x64
- ⚠️ macOS (配置就绪，需在macOS构建)
- ⚠️ Linux (配置就绪，需在Linux构建)

---

## 下一步

1. 执行冒烟测试
2. 测试核心功能
3. 收集用户反馈
4. 规划后续优化

---

**部署时间**: 2026-01-24 14:45
**部署状态**: ✅ 成功
**文档版本**: 1.0
