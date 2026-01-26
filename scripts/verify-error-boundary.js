#!/usr/bin/env node

/**
 * 错误边界系统验证脚本
 *
 * 验证所有错误边界相关文件是否正确创建和集成
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 开始验证错误边界系统...\n');

const projectRoot = process.cwd();
const filesToCheck = [
  {
    path: 'components/ErrorBoundary.tsx',
    description: '错误边界核心组件',
    required: true,
  },
  {
    path: 'components/ErrorFallback.tsx',
    description: '错误回退UI组件',
    required: true,
  },
  {
    path: 'services/errorLoggingService.ts',
    description: '错误日志服务',
    required: true,
  },
  {
    path: 'utils/globalErrorHandlers.ts',
    description: '全局错误处理器',
    required: true,
  },
  {
    path: 'components/ErrorBoundaryExample.tsx',
    description: '错误边界测试组件',
    required: false,
  },
  {
    path: 'docs/ERROR_BOUNDARY_USAGE.md',
    description: '使用指南文档',
    required: false,
  },
  {
    path: 'docs/ERROR_BOUNDARY_QUICKSTART.md',
    description: '快速启动指南',
    required: false,
  },
  {
    path: 'ERROR_BOUNDARY_IMPLEMENTATION_REPORT.md',
    description: '实施报告',
    required: false,
  },
];

let allPassed = true;

// 检查文件是否存在
console.log('📁 检查文件存在性:');
filesToCheck.forEach(({ path: filePath, description, required }) => {
  const fullPath = path.join(projectRoot, filePath);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    const stats = fs.statSync(fullPath);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`  ✅ ${description}: ${filePath} (${size} KB)`);
  } else {
    console.log(`  ${required ? '❌' : '⚠️'}  ${description}: ${filePath} - 未找到`);
    if (required) {
      allPassed = false;
    }
  }
});

console.log('\n');

// 检查App.tsx是否集成了错误边界
console.log('🔧 检查App.tsx集成:');
const appPath = path.join(projectRoot, 'App.tsx');
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf-8');

  if (appContent.includes('ErrorBoundary')) {
    console.log('  ✅ 已导入ErrorBoundary');
  } else {
    console.log('  ❌ 未导入ErrorBoundary');
    allPassed = false;
  }

  if (appContent.includes('startGlobalErrorHandlers')) {
    console.log('  ✅ 已启动全局错误处理');
  } else {
    console.log('  ⚠️  未启动全局错误处理');
  }

  if (appContent.includes('<ErrorBoundary')) {
    console.log('  ✅ 已使用ErrorBoundary包裹应用');
  } else {
    console.log('  ❌ 未使用ErrorBoundary包裹应用');
    allPassed = false;
  }
} else {
  console.log('  ❌ App.tsx文件不存在');
  allPassed = false;
}

console.log('\n');

// 检查关键功能
console.log('⚙️  检查关键功能:');

const errorBoundaryPath = path.join(projectRoot, 'components/ErrorBoundary.tsx');
if (fs.existsSync(errorBoundaryPath)) {
  const errorBoundaryContent = fs.readFileSync(errorBoundaryPath, 'utf-8');

  const features = [
    { name: 'getDerivedStateFromError', check: () => errorBoundaryContent.includes('getDerivedStateFromError') },
    { name: 'componentDidCatch', check: () => errorBoundaryContent.includes('componentDidCatch') },
    { name: 'TypeScript类型定义', check: () => errorBoundaryContent.includes('interface ErrorBoundaryProps') },
    { name: '自定义fallback支持', check: () => errorBoundaryContent.includes('fallback') },
    { name: '错误回调函数', check: () => errorBoundaryContent.includes('onError') },
  ];

  features.forEach(({ name, check }) => {
    if (check()) {
      console.log(`  ✅ ${name}`);
    } else {
      console.log(`  ❌ ${name} - 未实现`);
      allPassed = false;
    }
  });
} else {
  console.log('  ❌ ErrorBoundary.tsx不存在');
  allPassed = false;
}

console.log('\n');

// 检查错误日志服务
console.log('📊 检查错误日志服务:');

const loggingServicePath = path.join(projectRoot, 'services/errorLoggingService.ts');
if (fs.existsSync(loggingServicePath)) {
  const loggingContent = fs.readFileSync(loggingServicePath, 'utf-8');

  const features = [
    { name: '控制台日志', check: () => loggingContent.includes('enableConsole') },
    { name: '本地存储', check: () => loggingContent.includes('enableLocalStorage') },
    { name: '远程上报', check: () => loggingContent.includes('enableRemote') },
    { name: '自定义上报', check: () => loggingContent.includes('customReporter') },
    { name: '错误统计', check: () => loggingContent.includes('getErrorStats') },
    { name: '导出日志', check: () => loggingContent.includes('exportLogs') },
  ];

  features.forEach(({ name, check }) => {
    if (check()) {
      console.log(`  ✅ ${name}`);
    } else {
      console.log(`  ❌ ${name} - 未实现`);
      allPassed = false;
    }
  });
} else {
  console.log('  ❌ errorLoggingService.ts不存在');
  allPassed = false;
}

console.log('\n');

// 检查全局错误处理
console.log('🌍 检查全局错误处理:');

const globalHandlerPath = path.join(projectRoot, 'utils/globalErrorHandlers.ts');
if (fs.existsSync(globalHandlerPath)) {
  const globalHandlerContent = fs.readFileSync(globalHandlerPath, 'utf-8');

  const features = [
    { name: '全局错误监听', check: () => globalHandlerContent.includes('addEventListener') },
    { name: 'Promise rejection捕获', check: () => globalHandlerContent.includes('unhandledrejection') },
    { name: '启动/停止控制', check: () => globalHandlerContent.includes('start') && globalHandlerContent.includes('stop') },
    { name: '自定义处理', check: () => globalHandlerContent.includes('customHandler') },
  ];

  features.forEach(({ name, check }) => {
    if (check()) {
      console.log(`  ✅ ${name}`);
    } else {
      console.log(`  ❌ ${name} - 未实现`);
      allPassed = false;
    }
  });
} else {
  console.log('  ❌ globalErrorHandlers.ts不存在');
  allPassed = false;
}

console.log('\n');

// 统计代码量
console.log('📈 代码量统计:');

let totalLines = 0;
let totalSize = 0;

filesToCheck.forEach(({ path: filePath }) => {
  const fullPath = path.join(projectRoot, filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n').length;
    const size = fs.statSync(fullPath).size;

    totalLines += lines;
    totalSize += size;

    console.log(`  📄 ${filePath}: ${lines} 行, ${(size / 1024).toFixed(2)} KB`);
  }
});

console.log(`  📊 总计: ${totalLines} 行, ${(totalSize / 1024).toFixed(2)} KB\n`);

// 最终结果
console.log('='.repeat(60));
if (allPassed) {
  console.log('✅ 所有验证通过！错误边界系统已成功实施。');
  console.log('='.repeat(60));
  process.exit(0);
} else {
  console.log('❌ 部分验证失败，请检查上述错误。');
  console.log('='.repeat(60));
  process.exit(1);
}
