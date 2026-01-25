/**
 * 共享类型库编译性能测试
 * 测试 TypeScript 类型库的编译性能
 *
 * @author Performance Tester
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execSync } from 'child_process';
import { PerformanceTestRunner } from './PerformanceTestRunner';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('共享类型库编译性能测试', () => {
  const runner = new PerformanceTestRunner();

  // 设置性能阈值（毫秒）
  const THRESHOLDS = {
    COMPILE_TIME: 5000,      // 编译时间 < 5s
    TYPE_CHECK: 3000,        // 类型检查 < 3s
    DECLARATION_GEN: 2000,   // 声明文件生成 < 2s
    INCREMENTAL_BUILD: 1000  // 增量编译 < 1s
  };

  beforeAll(() => {
    runner.setThresholds(THRESHOLDS);
  });

  afterAll(async () => {
    // 生成性能报告
    const reportDir = path.join(process.cwd(), 'test-results', 'performance');
    await fs.mkdir(reportDir, { recursive: true });

    await runner.saveMarkdownReport(path.join(reportDir, 'shared-types-compile-report.md'));
    await runner.saveReport(path.join(reportDir, 'shared-types-compile-data.json'));

    runner.printReport();
  });

  describe('完整编译测试', () => {
    test('应该在 5 秒内完成完整编译', async () => {
      // 清理之前的构建
      const distPath = path.join(process.cwd(), 'packages', 'shared-types', 'dist');
      try {
        await fs.rm(distPath, { recursive: true, force: true });
      } catch (error) {
        // 忽略错误
      }

      const { stats } = await runner.measureAverage(
        'shared-types-full-compile',
        async () => {
          execSync('cd packages/shared-types && npm run build', {
            encoding: 'utf-8',
            stdio: 'pipe'
          });
        },
        3, // 运行 3 次取平均
        { warmup: 1, delay: 500 }
      );

      console.log(`平均编译时间: ${stats.average.toFixed(2)}ms`);
      expect(stats.average).toBeLessThan(THRESHOLDS.COMPILE_TIME);
      expect(stats.passed).toBe(true);
    }, 30000);

    test('应该在 3 秒内完成类型检查', async () => {
      const { stats } = await runner.measureAverage(
        'shared-types-type-check',
        async () => {
          execSync('cd packages/shared-types && npx tsc --noEmit', {
            encoding: 'utf-8',
            stdio: 'pipe'
          });
        },
        5,
        { warmup: 1, delay: 200 }
      );

      console.log(`类型检查时间: ${stats.average.toFixed(2)}ms`);
      expect(stats.average).toBeLessThan(THRESHOLDS.TYPE_CHECK);
      expect(stats.passed).toBe(true);
    }, 30000);
  });

  describe('声明文件生成测试', () => {
    test('应该在 2 秒内生成声明文件', async () => {
      const { stats } = await runner.measureAverage(
        'shared-types-declaration-gen',
        async () => {
          execSync('cd packages/shared-types && npx tsc --emitDeclarationOnly', {
            encoding: 'utf-8',
            stdio: 'pipe'
          });
        },
        5,
        { warmup: 1, delay: 200 }
      );

      console.log(`声明文件生成时间: ${stats.average.toFixed(2)}ms`);
      expect(stats.average).toBeLessThan(THRESHOLDS.DECLARATION_GEN);
      expect(stats.passed).toBe(true);
    }, 20000);

    test('生成的声明文件应该完整', async () => {
      const typesPath = path.join(process.cwd(), 'packages', 'shared-types', 'types');
      const files = await fs.readdir(typesPath);

      const declarationFiles = files.filter(f => f.endsWith('.d.ts') || f.endsWith('.d.ts.map'));

      console.log(`生成的声明文件数量: ${declarationFiles.length}`);
      expect(declarationFiles.length).toBeGreaterThan(0);
    });
  });

  describe('增量编译测试', () => {
    test('增量编译应该快于完整编译', async () => {
      // 首先进行完整编译
      execSync('cd packages/shared-types && npm run build', {
        encoding: 'utf-8',
        stdio: 'pipe'
      });

      // 等待一下确保文件系统同步
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 修改一个文件
      const testFile = path.join(process.cwd(), 'packages', 'shared-types', 'types', 'executionTypes.ts');
      const content = await fs.readFile(testFile, 'utf-8');
      await fs.writeFile(testFile, content + '\n// 测试增量编译\n');

      // 测量增量编译时间
      const { duration } = await runner.measureTime(
        'shared-types-incremental-build',
        async () => {
          execSync('cd packages/shared-types && npm run build', {
            encoding: 'utf-8',
            stdio: 'pipe'
          });
        }
      );

      console.log(`增量编译时间: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(THRESHOLDS.INCREMENTAL_BUILD);

      // 恢复文件
      await fs.writeFile(testFile, content);

      // 再次编译以恢复原状
      execSync('cd packages/shared-types && npm run build', {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
    }, 15000);
  });

  describe('编译产物大小测试', () => {
    test('编译产物大小应该合理', async () => {
      const distPath = path.join(process.cwd(), 'packages', 'shared-types', 'dist');

      async function getDirectorySize(dirPath: string): Promise<number> {
        let totalSize = 0;
        const files = await fs.readdir(dirPath, { withFileTypes: true });

        for (const file of files) {
          const fullPath = path.join(dirPath, file.name);
          if (file.isDirectory()) {
            totalSize += await getDirectorySize(fullPath);
          } else if (file.isFile()) {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
          }
        }

        return totalSize;
      }

      const size = await getDirectorySize(distPath);
      const sizeInMB = size / 1024 / 1024;

      console.log(`编译产物大小: ${sizeInMB.toFixed(2)}MB`);

      // 类型库应该相对较小（< 5MB）
      expect(sizeInMB).toBeLessThan(5);
    });

    test('每个类型文件的大小应该合理', async () => {
      const typesPath = path.join(process.cwd(), 'packages', 'shared-types', 'types');
      const files = await fs.readdir(typesPath);

      const fileSizes: Array<{ name: string; size: number }> = [];

      for (const file of files) {
        if (file.endsWith('.ts')) {
          const filePath = path.join(typesPath, file);
          const stats = await fs.stat(filePath);
          fileSizes.push({ name: file, size: stats.size });
        }
      }

      // 找出最大的文件
      fileSizes.sort((a, b) => b.size - a.size);

      console.log('最大的 5 个类型文件:');
      fileSizes.slice(0, 5).forEach(({ name, size }) => {
        console.log(`  ${name}: ${(size / 1024).toFixed(2)}KB`);
      });

      // 最大的文件不应该超过 100KB
      expect(fileSizes[0].size).toBeLessThan(100 * 1024);
    });
  });

  describe('编译性能回归测试', () => {
    test('与基线对比性能', async () => {
      // 这里可以与保存的基线数据进行对比
      // 首先运行测试获取当前性能
      const { stats } = await runner.measureAverage(
        'shared-types-baseline-compare',
        async () => {
          execSync('cd packages/shared-types && npm run build', {
            encoding: 'utf-8',
            stdio: 'pipe'
          });
        },
        3,
        { warmup: 1, delay: 500 }
      );

      console.log(`当前编译时间: ${stats.average.toFixed(2)}ms`);

      // 可以在这里与历史基线数据对比
      // 如果性能下降超过 10%，应该警告

      // 示例：假设基线是 3000ms
      const BASELINE_COMPILE_TIME = 3000;
      const degradation = ((stats.average - BASELINE_COMPILE_TIME) / BASELINE_COMPILE_TIME) * 100;

      console.log(`性能变化: ${degradation > 0 ? '+' : ''}${degradation.toFixed(1)}%`);

      // 允许 20% 的性能波动
      expect(Math.abs(degradation)).toBeLessThan(20);
    }, 30000);
  });
});
