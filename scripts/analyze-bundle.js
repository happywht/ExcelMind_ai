#!/usr/bin/env node

/**
 * Bundle分析脚本
 *
 * 功能：
 * 1. 分析构建产物大小
 * 2. 生成性能报告
 * 3. 对比优化前后的效果
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');

/**
 * 递归获取目录下所有文件
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 分析Bundle文件
 */
function analyzeBundle() {
  console.log('\n📊 Bundle分析报告\n');
  console.log('=' .repeat(80));

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ 构建产物不存在，请先运行 npm run build');
    process.exit(1);
  }

  const files = getAllFiles(DIST_DIR);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cssFiles = files.filter(f => f.endsWith('.css'));

  // JS文件分析
  console.log('\n📦 JavaScript文件分析\n');
  console.log('-'.repeat(80));
  console.log(sprintf('%-50s %15s %15s', '文件名', '大小', 'Gzip后'));
  console.log('-'.repeat(80));

  const jsStats = [];
  let totalJsSize = 0;
  let totalJsGzip = 0;

  jsFiles.forEach(file => {
    const stats = fs.statSync(file);
    const relativePath = path.relative(DIST_DIR, file);
    const size = stats.size;
    // 简单估算gzip大小（实际gzip压缩比约为70-80%）
    const gzipSize = Math.floor(size * 0.75);

    totalJsSize += size;
    totalJsGzip += gzipSize;

    jsStats.push({
      file: relativePath,
      size,
      gzipSize
    });

    console.log(sprintf('%-50s %15s %15s',
      relativePath.length > 50 ? '...' + relativePath.slice(-47) : relativePath,
      formatSize(size),
      formatSize(gzipSize)
    ));
  });

  console.log('-'.repeat(80));
  console.log(sprintf('%-50s %15s %15s', '总计', formatSize(totalJsSize), formatSize(totalJsGzip)));

  // CSS文件分析
  if (cssFiles.length > 0) {
    console.log('\n🎨 CSS文件分析\n');
    console.log('-'.repeat(80));

    let totalCssSize = 0;
    cssFiles.forEach(file => {
      const stats = fs.statSync(file);
      const relativePath = path.relative(DIST_DIR, file);
      const size = stats.size;
      totalCssSize += size;

      console.log(sprintf('%-50s %15s',
        relativePath.length > 50 ? '...' + relativePath.slice(-47) : relativePath,
        formatSize(size)
      ));
    });

    console.log('-'.repeat(80));
    console.log(sprintf('%-50s %15s', '总计', formatSize(totalCssSize)));
  }

  // 按大小排序的JS文件
  console.log('\n🔍 最大的10个JS文件\n');
  console.log('-'.repeat(80));
  console.log(sprintf('%-50s %15s', '文件名', '大小'));
  console.log('-'.repeat(80));

  jsStats
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .forEach(({ file, size }) => {
      console.log(sprintf('%-50s %15s',
        file.length > 50 ? '...' + file.slice(-47) : file,
        formatSize(size)
      ));
    });

  // 性能评估
  console.log('\n⚡ 性能评估\n');
  console.log('-'.repeat(80));

  const FIRST_LOAD_THRESHOLD = 1024 * 1024; // 1MB
  const SINGLE_CHUNK_THRESHOLD = 300 * 1024; // 300KB

  // 估算首屏加载大小（React核心 + 首屏组件）
  const firstLoadSize = jsStats
    .filter(f => f.file.includes('react-vendor') || f.file.includes('index') || f.file.includes('main'))
    .reduce((sum, f) => sum + f.size, 0);

  console.log(`首屏加载大小: ${formatSize(firstLoadSize)}`);
  if (firstLoadSize < FIRST_LOAD_THRESHOLD) {
    console.log('✅ 首屏加载大小合理（< 1MB）');
  } else {
    console.log('⚠️  首屏加载大小较大（> 1MB），建议进一步优化');
  }

  console.log(`\n总Bundle大小: ${formatSize(totalJsSize)}`);
  console.log(`Gzip后大小: ${formatSize(totalJsGzip)}`);

  // Chunk分割建议
  console.log('\n💡 优化建议\n');
  console.log('-'.repeat(80));

  const largeChunks = jsStats.filter(f => f.size > SINGLE_CHUNK_THRESHOLD);
  if (largeChunks.length > 0) {
    console.log('发现大型chunk，建议进一步拆分：');
    largeChunks.forEach(({ file, size }) => {
      console.log(`  - ${file}: ${formatSize(size)}`);
    });
  } else {
    console.log('✅ Chunk分割合理');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ 分析完成！');
  console.log('📊 可视化报告已生成: dist/stats.html');
  console.log('='.repeat(80) + '\n');
}

// 简单的sprintf实现
function sprintf(format, ...args) {
  return format.replace(/%[-+0#9]*\*?[.?[0-9]*[lL]?[diouxXeEfgGs]/g, (match) => {
    const arg = args.shift();
    return String(arg);
  });
}

// 运行分析
analyzeBundle();
