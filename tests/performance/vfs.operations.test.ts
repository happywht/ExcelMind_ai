/**
 * 虚拟文件系统性能测试
 * 测试文件操作和关系查询性能
 *
 * @author Performance Tester
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { PerformanceTestRunner, PerformanceTestHelpers } from './PerformanceTestRunner';
import { getVirtualFileSystem } from '../../src/services/infrastructure/vfs/VirtualFileSystem';
import { FileRole } from '../../src/services/infrastructure/vfs/VirtualFileSystem/types';

describe('虚拟文件系统性能测试', () => {
  const runner = new PerformanceTestRunner();
  const workspace = getVirtualFileSystem();

  // 设置性能阈值（毫秒）
  const THRESHOLDS = {
    FILE_UPLOAD_1MB: 200,         // 1MB 文件上传 < 200ms
    FILE_LIST_QUERY: 100,         // 文件列表查询 < 100ms
    RELATIONSHIP_QUERY: 150,      // 关系查询 < 150ms
    FILE_DELETE: 50,              // 文件删除 < 50ms
    BATCH_OPERATIONS: 500,        // 批量操作 < 500ms
    GRAPH_QUERY_50: 150,          // 50 关系图查询 < 150ms
    GRAPH_QUERY_100: 300          // 100 关系图查询 < 300ms
  };

  beforeAll(async () => {
    runner.setThresholds(THRESHOLDS);
    await workspace.initialize();
  });

  afterAll(async () => {
    // 生成性能报告
    const fs = await import('fs/promises');
    const path = await import('path');
    const reportDir = path.join(process.cwd(), 'test-results', 'performance');
    await fs.mkdir(reportDir, { recursive: true });

    await runner.saveMarkdownReport(path.join(reportDir, 'vfs-operations-report.md'));
    await runner.saveReport(path.join(reportDir, 'vfs-operations-data.json'));

    runner.printReport();

    await workspace.cleanup();
  });

  /**
   * 辅助函数：创建模拟文件
   */
  function createMockFile(sizeInBytes: number, name?: string): File {
    const data = new Array(sizeInBytes).fill('x').join('');
    const blob = new Blob([data], { type: 'application/octet-stream' });
    return new File([blob], name || `test-file-${Date.now()}.bin`);
  }

  /**
   * 辅助函数：创建模拟 Excel 文件
   */
  function createMockExcelFile(rows: number): File {
    const data = `id,name,value\n` +
      Array.from({ length: rows }, (_, i) =>
        `${i},Item ${i},${Math.random() * 1000}`
      ).join('\n');
    const blob = new Blob([data], { type: 'text/csv' });
    return new File([blob], `mock-excel-${Date.now()}.csv`);
  }

  describe('文件上传性能测试', () => {
    test('1MB 文件上传应该在 200ms 内完成', async () => {
      const file = createMockFile(1 * 1024 * 1024); // 1MB

      const { stats } = await runner.measureAverage(
        'file-upload-1mb',
        async () => {
          await workspace.uploadFile(file, FileRole.PRIMARY_SOURCE);
        },
        10,
        { warmup: 2, delay: 100 }
      );

      console.log(`1MB 文件上传平均时间: ${stats.average.toFixed(2)}ms`);
      expect(stats.average).toBeLessThan(THRESHOLDS.FILE_UPLOAD_1MB);
      expect(stats.passed).toBe(true);
    });

    test('小文件（10KB）上传应该快速完成', async () => {
      const file = createMockFile(10 * 1024); // 10KB

      const { stats } = await runner.measureAverage(
        'file-upload-10kb',
        async () => {
          await workspace.uploadFile(file, FileRole.PRIMARY_SOURCE);
        },
        20,
        { warmup: 3, delay: 50 }
      );

      console.log(`10KB 文件上传平均时间: ${stats.average.toFixed(2)}ms`);

      // 小文件应该快很多
      expect(stats.average).toBeLessThan(50);
    });

    test('大文件（10MB）上传应该在合理时间内完成', async () => {
      const file = createMockFile(10 * 1024 * 1024); // 10MB

      const { duration } = await runner.measureTime(
        'file-upload-10mb',
        async () => {
          await workspace.uploadFile(file, FileRole.PRIMARY_SOURCE);
        }
      );

      console.log(`10MB 文件上传时间: ${duration.toFixed(2)}ms`);

      // 大文件允许更长的时间，但应该接近线性增长
      // 1MB < 200ms, 10MB 应该 < 2s
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('文件列表查询性能测试', () => {
    beforeAll(async () => {
      // 准备测试数据
      const files = Array.from({ length: 100 }, (_, i) =>
        createMockExcelFile(10)
      );

      for (const file of files) {
        await workspace.uploadFile(file, FileRole.PRIMARY_SOURCE);
      }
    });

    test('文件列表查询应该在 100ms 内完成（100 文件）', async () => {
      const { stats } = await runner.measureAverage(
        'file-list-query-100',
        async () => {
          await workspace.listFiles('/');
        },
        20,
        { warmup: 3, delay: 20 }
      );

      console.log(`文件列表查询平均时间（100 文件）: ${stats.average.toFixed(2)}ms`);
      expect(stats.average).toBeLessThan(THRESHOLDS.FILE_LIST_QUERY);
    });

    test('按类型过滤文件查询性能', async () => {
      const { stats } = await runner.measureAverage(
        'file-list-filtered',
        async () => {
          await workspace.listFiles('/', { type: 'excel' });
        },
        20,
        { warmup: 3, delay: 20 }
      );

      console.log(`过滤查询平均时间: ${stats.average.toFixed(2)}ms`);
      expect(stats.average).toBeLessThan(THRESHOLDS.FILE_LIST_QUERY * 1.2);
    });

    test('分页查询性能', async () => {
      const { stats } = await runner.measureAverage(
        'file-list-paginated',
        async () => {
          await workspace.listFiles('/', { page: 1, pageSize: 20 });
        },
        20,
        { warmup: 3, delay: 20 }
      );

      console.log(`分页查询平均时间: ${stats.average.toFixed(2)}ms`);

      // 分页查询应该更快
      expect(stats.average).toBeLessThan(THRESHOLDS.FILE_LIST_QUERY * 0.8);
    });
  });

  describe('文件删除性能测试', () => {
    test('文件删除应该在 50ms 内完成', async () => {
      // 先上传一个文件
      const file = createMockFile(10 * 1024);
      const uploadedFile = await workspace.uploadFile(file, FileRole.PRIMARY_SOURCE);

      const { stats } = await runner.measureAverage(
        'file-delete',
        async () => {
          await workspace.deleteFile(uploadedFile.fileId);
        },
        20,
        { warmup: 3, delay: 20 }
      );

      console.log(`文件删除平均时间: ${stats.average.toFixed(2)}ms`);
      expect(stats.average).toBeLessThan(THRESHOLDS.FILE_DELETE);
    });

    test('批量删除应该高效', async () => {
      // 准备多个文件
      const files = await Promise.all(
        Array.from({ length: 10 }, () =>
          workspace.uploadFile(createMockFile(10 * 1024), FileRole.PRIMARY_SOURCE)
        )
      );

      const { duration } = await runner.measureTime(
        'batch-file-delete',
        async () => {
          await Promise.all(
            files.map(f => workspace.deleteFile(f.fileId))
          );
        }
      );

      const avgPerDelete = duration / files.length;

      console.log(`批量删除总时间: ${duration.toFixed(2)}ms`);
      console.log(`平均每次删除: ${avgPerDelete.toFixed(2)}ms`);

      expect(avgPerDelete).toBeLessThan(THRESHOLDS.FILE_DELETE * 2);
    });
  });

  describe('关系查询性能测试', () => {
    beforeAll(async () => {
      // 准备测试数据：创建文件关系
      const files = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          workspace.uploadFile(createMockExcelFile(10), FileRole.PRIMARY_SOURCE)
        )
      );

      // 创建关系
      for (let i = 0; i < files.length - 1; i++) {
        await workspace.createRelationship({
          sourceFileId: files[i].fileId,
          targetFileId: files[i + 1].fileId,
          relationshipType: 'reference',
          confidence: 0.8
        });
      }
    });

    test('关系查询应该在 150ms 内完成（50 关系）', async () => {
      const { stats } = await runner.measureAverage(
        'relationship-query-50',
        async () => {
          await workspace.getRelationshipGraph({
            rootId: 'root',
            maxDepth: 3
          });
        },
        20,
        { warmup: 3, delay: 20 }
      );

      console.log(`关系查询平均时间（50 关系）: ${stats.average.toFixed(2)}ms`);
      expect(stats.average).toBeLessThan(THRESHOLDS.RELATIONSHIP_QUERY);
    });

    test('关系图谱查询性能（50 节点）', async () => {
      const { duration } = await runner.measureTime(
        'graph-query-50-nodes',
        async () => {
          await workspace.getRelationshipGraph({
            rootId: 'root',
            maxDepth: 5
          });
        }
      );

      console.log(`图谱查询时间（50 节点）: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(THRESHOLDS.GRAPH_QUERY_50);
    });
  });

  describe('批量操作性能测试', () => {
    test('批量上传应该高效', async () => {
      const batchSize = 10;

      const { stats } = await runner.measureAverage(
        'batch-file-upload',
        async () => {
          const files = Array.from({ length: batchSize }, () =>
            createMockFile(50 * 1024)
          );
          await Promise.all(
            files.map(file => workspace.uploadFile(file, FileRole.PRIMARY_SOURCE))
          );
        },
        5,
        { warmup: 1, delay: 200 }
      );

      const avgPerUpload = stats.average / batchSize;

      console.log(`批量上传总时间: ${stats.average.toFixed(2)}ms`);
      console.log(`平均每次上传: ${avgPerUpload.toFixed(2)}ms`);

      expect(avgPerUpload).toBeLessThan(100);
    });

    test('批量查询应该保持性能', async () => {
      // 先获取一些文件 ID
      const files = await workspace.listFiles('/');
      const fileIds = files.slice(0, 20).map(f => f.fileId);

      const { duration } = await runner.measureTime(
        'batch-file-query',
        async () => {
          await Promise.all(
            fileIds.map(id => workspace.getFileById(id))
          );
        }
      );

      const avgPerQuery = duration / fileIds.length;

      console.log(`批量查询总时间: ${duration.toFixed(2)}ms`);
      console.log(`平均每次查询: ${avgPerQuery.toFixed(2)}ms`);

      expect(avgPerQuery).toBeLessThan(20);
    });
  });

  describe('复杂查询性能测试', () => {
    test('深度关系查询性能', async () => {
      const { duration } = await runner.measureTime(
        'deep-relationship-query',
        async () => {
          await workspace.getRelationshipGraph({
            rootId: 'root',
            maxDepth: 10
          });
        }
      );

      console.log(`深度关系查询时间: ${duration.toFixed(2)}ms`);

      // 深度查询允许更长时间
      expect(duration).toBeLessThan(500);
    });

    test('多条件组合查询性能', async () => {
      const { stats } = await runner.measureAverage(
        'complex-filtered-query',
        async () => {
          await workspace.listFiles('/', {
            type: 'excel',
            createdAfter: Date.now() - 86400000,
            minSize: 1024
          });
        },
        20,
        { warmup: 3, delay: 20 }
      );

      console.log(`复杂查询平均时间: ${stats.average.toFixed(2)}ms`);
      expect(stats.average).toBeLessThan(THRESHOLDS.FILE_LIST_QUERY * 2);
    });
  });

  describe('并发操作性能测试', () => {
    test('并发上传应该保持稳定', async () => {
      const concurrentUploads = 10;

      const { stats } = await runner.measureAverage(
        'concurrent-uploads',
        async () => {
          const files = Array.from({ length: concurrentUploads }, () =>
            createMockFile(100 * 1024)
          );
          await Promise.all(
            files.map(file => workspace.uploadFile(file, FileRole.PRIMARY_SOURCE))
          );
        },
        5,
        { warmup: 1, delay: 200 }
      );

      const avgPerUpload = stats.average / concurrentUploads;

      console.log(`并发上传总时间: ${stats.average.toFixed(2)}ms`);
      console.log(`平均每次上传: ${avgPerUpload.toFixed(2)}ms`);

      expect(avgPerUpload).toBeLessThan(150);
    });

    test('读写混合操作性能', async () => {
      const { duration } = await runner.measureTime(
        'mixed-read-write',
        async () => {
          const operations = [
            workspace.listFiles('/'),
            workspace.uploadFile(createMockFile(50 * 1024), FileRole.PRIMARY_SOURCE),
            workspace.listFiles('/'),
            workspace.uploadFile(createMockFile(50 * 1024), FileRole.PRIMARY_SOURCE),
            workspace.listFiles('/')
          ];
          await Promise.all(operations);
        }
      );

      console.log(`混合操作时间: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(THRESHOLDS.BATCH_OPERATIONS);
    });
  });

  describe('内存使用性能测试', () => {
    test('大量文件操作不应该导致内存溢出', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 上传 100 个小文件
      const files = Array.from({ length: 100 }, () => createMockFile(10 * 1024));
      await Promise.all(
        files.map(file => workspace.uploadFile(file, FileRole.PRIMARY_SOURCE))
      );

      // 强制 GC（如果可用）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = (finalMemory - initialMemory) / 1024 / 1024; // MB

      console.log(`内存增长: ${memoryDelta.toFixed(2)}MB`);

      // 内存增长应该合理（< 100MB）
      expect(memoryDelta).toBeLessThan(100);
    });
  });
});
