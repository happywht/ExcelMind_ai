/**
 * VirtualFileSystem 单元测试
 *
 * 测试范围:
 * - 文件上传和读取
 * - 文件删除和更新
 * - 目录操作
 * - 文件关系管理
 * - 版本管理
 * - 统计信息
 * - 临时文件清理
 */

import { VirtualFileSystem, FileRole, RelationType, VFSConfig } from '../VirtualFileSystem';

// ============================================================================
// Mock PyodideService
// ============================================================================

const mockPyodideService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  createDirectory: jest.fn(),
  unlinkFile: jest.fn(),
  mountFile: jest.fn(),
};

jest.mock('../../wasm/PyodideService', () => ({
  getPyodideService: () => mockPyodideService,
}));

// ============================================================================
// 测试辅助函数
// ============================================================================

const createMockFile = (name: string, size: number = 1024): File => {
  const file = {
    name,
    size,
    lastModified: Date.now(),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(size)),
  } as unknown as File;

  return file;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// 测试套件
// ============================================================================

describe('VirtualFileSystem', () => {
  let vfs: VirtualFileSystem;

  beforeEach(async () => {
    // 清理单例
    (VirtualFileSystem as any).instance = null;

    // 配置 VFS
    const config: VFSConfig = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      enableVersioning: true,
      enableRelationships: true,
      redis: {
        host: 'localhost',
        port: 6379,
        password: undefined,
      },
    };

    vfs = VirtualFileSystem.getInstance(config);
    await vfs.initialize();
  });

  afterEach(async () => {
    // 清理
    (VirtualFileSystem as any).instance = null;
  });

  // ========================================================================
  // 初始化测试
  // ========================================================================

  describe('初始化', () => {
    it('应该成功初始化', async () => {
      expect(mockPyodideService.initialize).toHaveBeenCalled();
      expect(mockPyodideService.createDirectory).toHaveBeenCalled();
    });

    it('应该创建标准目录结构', async () => {
      const standardPaths = ['/mnt', '/mnt/data', '/mnt/temp', '/mnt/output', '/mnt/config', '/mnt/template'];

      standardPaths.forEach(path => {
        expect(mockPyodideService.createDirectory).toHaveBeenCalledWith(path);
      });
    });

    it('应该避免重复初始化', async () => {
      await vfs.initialize();

      expect(mockPyodideService.initialize).toHaveBeenCalledTimes(1);
    });

    it('应该返回单例实例', () => {
      const vfs2 = VirtualFileSystem.getInstance();

      expect(vfs2).toBe(vfs);
    });
  });

  // ========================================================================
  // 文件上传测试
  // ========================================================================

  describe('文件上传', () => {
    it('应该成功上传文件', async () => {
      const file = createMockFile('test.xlsx', 1024);

      mockPyodideService.mountFile.mockImplementation((name: string, data: Uint8Array, path: string) => {
        // Mock implementation
      });

      const fileInfo = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE, {
        comment: 'Test upload',
        metadata: { source: 'test' },
      });

      expect(fileInfo).toBeDefined();
      expect(fileInfo.id).toBeDefined();
      expect(fileInfo.name).toBe('test.xlsx');
      expect(fileInfo.role).toBe(FileRole.PRIMARY_SOURCE);
      expect(fileInfo.type).toBe('excel');
      expect(fileInfo.size).toBe(1024);
      expect(fileInfo.path).toBe('/mnt/data/test.xlsx');
    });

    it('应该根据角色设置正确的路径', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const configFile = createMockFile('config.json');
      const configInfo = await vfs.uploadFile(configFile, FileRole.CONFIGURATION);

      expect(configInfo.path).toBe('/mnt/config/config.json');

      const templateFile = createMockFile('template.xlsx');
      const templateInfo = await vfs.uploadFile(templateFile, FileRole.TEMPLATE);

      expect(templateInfo.path).toBe('/mnt/template/template.xlsx');

      const outputFile = createMockFile('output.xlsx');
      const outputInfo = await vfs.uploadFile(outputFile, FileRole.OUTPUT);

      expect(outputInfo.path).toBe('/mnt/output/output.xlsx');

      const tempFile = createMockFile('temp.xlsx');
      const tempInfo = await vfs.uploadFile(tempFile, FileRole.TEMPORARY);

      expect(tempInfo.path).toBe('/mnt/temp/temp.xlsx');
    });

    it('应该检测文件类型', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const excelFile = createMockFile('data.xlsx');
      const excelInfo = await vfs.uploadFile(excelFile, FileRole.PRIMARY_SOURCE);
      expect(excelInfo.type).toBe('excel');

      const wordFile = createMockFile('document.docx');
      const wordInfo = await vfs.uploadFile(wordFile, FileRole.AUXILIARY_SOURCE);
      expect(wordInfo.type).toBe('word');

      const pdfFile = createMockFile('report.pdf');
      const pdfInfo = await vfs.uploadFile(pdfFile, FileRole.PRIMARY_SOURCE);
      expect(pdfInfo.type).toBe('pdf');

      const csvFile = createMockFile('data.csv');
      const csvInfo = await vfs.uploadFile(csvFile, FileRole.PRIMARY_SOURCE);
      expect(csvInfo.type).toBe('csv');

      const jsonFile = createMockFile('data.json');
      const jsonInfo = await vfs.uploadFile(jsonFile, FileRole.PRIMARY_SOURCE);
      expect(jsonInfo.type).toBe('json');

      const txtFile = createMockFile('readme.txt');
      const txtInfo = await vfs.uploadFile(txtFile, FileRole.PRIMARY_SOURCE);
      expect(txtInfo.type).toBe('txt');
    });

    it('应该拒绝超大文件', async () => {
      const hugeFile = createMockFile('huge.xlsx', 100 * 1024 * 1024); // 100MB

      await expect(vfs.uploadFile(hugeFile, FileRole.PRIMARY_SOURCE)).rejects.toThrow();
    });

    it('应该支持自定义目标路径', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file = createMockFile('custom.xlsx');
      const fileInfo = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE, {
        targetPath: '/custom/path/file.xlsx',
      });

      expect(fileInfo.path).toBe('/custom/path/file.xlsx');
    });

    it('应该添加元数据', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file = createMockFile('data.xlsx');
      const metadata = { department: 'finance', year: 2024 };

      const fileInfo = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE, {
        metadata,
      });

      expect(fileInfo.metadata).toEqual(metadata);
    });
  });

  // ========================================================================
  // 文件读取测试
  // ========================================================================

  describe('文件读取', () => {
    it('应该成功读取文件', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file = createMockFile('read-test.xlsx');
      const uploaded = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE);

      const fileData = new Uint8Array([1, 2, 3, 4, 5]);
      mockPyodideService.readFile.mockReturnValue(fileData);

      const blob = await vfs.readFile(uploaded.id);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(5);
    });

    it('应该抛出错误对于不存在的文件', async () => {
      await expect(vfs.readFile('non-existent-id')).rejects.toThrow('File not found');
    });

    it('应该返回正确的 MIME 类型', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});
      mockPyodideService.readFile.mockReturnValue(new Uint8Array());

      const excelFile = createMockFile('test.xlsx');
      const uploaded = await vfs.uploadFile(excelFile, FileRole.PRIMARY_SOURCE);

      const blob = await vfs.readFile(uploaded.id);

      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });

  // ========================================================================
  // 文件删除测试
  // ========================================================================

  describe('文件删除', () => {
    it('应该成功删除文件', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});
      mockPyodideService.unlinkFile.mockImplementation(() => {});

      const file = createMockFile('delete-test.xlsx');
      const uploaded = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE);

      await vfs.deleteFile(uploaded.id);

      await expect(vfs.readFile(uploaded.id)).rejects.toThrow('File not found');
    });

    it('应该拒绝删除被依赖的文件', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file1 = createMockFile('file1.xlsx');
      const file2 = createMockFile('file2.xlsx');

      const uploaded1 = await vfs.uploadFile(file1, FileRole.PRIMARY_SOURCE);
      const uploaded2 = await vfs.uploadFile(file2, FileRole.PRIMARY_SOURCE);

      // 创建依赖关系
      await vfs.addRelationship(uploaded2.id, uploaded1.id, RelationType.DEPENDS_ON);

      await expect(vfs.deleteFile(uploaded1.id)).rejects.toThrow('Cannot delete file');
    });

    it('应该抛出错误对于不存在的文件', async () => {
      await expect(vfs.deleteFile('non-existent-id')).rejects.toThrow('File not found');
    });
  });

  // ========================================================================
  // 文件更新测试
  // ========================================================================

  describe('文件更新', () => {
    it('应该成功更新文件角色', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file = createMockFile('update-test.xlsx');
      const uploaded = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE);

      const updated = await vfs.updateFile(uploaded.id, {
        role: FileRole.AUXILIARY_SOURCE,
      });

      expect(updated.role).toBe(FileRole.AUXILIARY_SOURCE);
      expect(updated.id).toBe(uploaded.id);
    });

    it('应该更新文件元数据', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file = createMockFile('metadata-test.xlsx');
      const uploaded = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE, {
        metadata: { version: 1 },
      });

      const updated = await vfs.updateFile(uploaded.id, {
        metadata: { version: 2, author: 'test' },
      });

      expect(updated.metadata).toEqual({ version: 2, author: 'test' });
    });

    it('应该更新最后修改时间', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file = createMockFile('time-test.xlsx');
      const uploaded = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE);

      const originalModified = uploaded.lastModified;

      await wait(100);

      const updated = await vfs.updateFile(uploaded.id, {});

      expect(updated.lastModified).toBeGreaterThan(originalModified);
    });

    it('应该抛出错误对于不存在的文件', async () => {
      await expect(vfs.updateFile('non-existent-id', {})).rejects.toThrow('File not found');
    });
  });

  // ========================================================================
  // 目录操作测试
  // ========================================================================

  describe('目录操作', () => {
    it('应该创建目录', async () => {
      await vfs.createDirectory('/custom/directory');

      expect(mockPyodideService.createDirectory).toHaveBeenCalledWith('/custom/directory');
    });

    it('应该列出根目录内容', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file1 = createMockFile('file1.xlsx');
      const file2 = createMockFile('file2.xlsx');

      await vfs.uploadFile(file1, FileRole.PRIMARY_SOURCE);
      await vfs.uploadFile(file2, FileRole.OUTPUT);

      const files = await vfs.listDirectory('/mnt');

      expect(files.length).toBeGreaterThanOrEqual(2);
    });

    it('应该列出指定目录的内容', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file = createMockFile('data.xlsx');
      await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE);

      const files = await vfs.listDirectory('/mnt/data');

      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.some(f => f.name === 'data.xlsx')).toBe(true);
    });

    it('应该返回空数组对于空目录', async () => {
      const files = await vfs.listDirectory('/non/existent/path');

      expect(files).toEqual([]);
    });
  });

  // ========================================================================
  // 文件关系测试
  // ========================================================================

  describe('文件关系管理', () => {
    it('应该成功添加关系', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file1 = createMockFile('source.xlsx');
      const file2 = createMockFile('target.xlsx');

      const uploaded1 = await vfs.uploadFile(file1, FileRole.PRIMARY_SOURCE);
      const uploaded2 = await vfs.uploadFile(file2, FileRole.OUTPUT);

      const relationship = await vfs.addRelationship(
        uploaded1.id,
        uploaded2.id,
        RelationType.GENERATES,
        { description: 'Test relationship' }
      );

      expect(relationship.id).toBeDefined();
      expect(relationship.fromFileId).toBe(uploaded1.id);
      expect(relationship.toFileId).toBe(uploaded2.id);
      expect(relationship.type).toBe(RelationType.GENERATES);
      expect(relationship.metadata).toEqual({ description: 'Test relationship' });
    });

    it('应该拒绝循环依赖', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file1 = createMockFile('file1.xlsx');
      const file2 = createMockFile('file2.xlsx');

      const uploaded1 = await vfs.uploadFile(file1, FileRole.PRIMARY_SOURCE);
      const uploaded2 = await vfs.uploadFile(file2, FileRole.PRIMARY_SOURCE);

      // 创建 file1 -> file2
      await vfs.addRelationship(uploaded1.id, uploaded2.id, RelationType.DEPENDS_ON);

      // 尝试创建 file2 -> file1（应该失败）
      await expect(
        vfs.addRelationship(uploaded2.id, uploaded1.id, RelationType.DEPENDS_ON)
      ).rejects.toThrow('circular dependency');
    });

    it('应该获取文件的所有关系', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file1 = createMockFile('file1.xlsx');
      const file2 = createMockFile('file2.xlsx');
      const file3 = createMockFile('file3.xlsx');

      const uploaded1 = await vfs.uploadFile(file1, FileRole.PRIMARY_SOURCE);
      const uploaded2 = await vfs.uploadFile(file2, FileRole.OUTPUT);
      const uploaded3 = await vfs.uploadFile(file3, FileRole.AUXILIARY_SOURCE);

      await vfs.addRelationship(uploaded1.id, uploaded2.id, RelationType.GENERATES);
      await vfs.addRelationship(uploaded1.id, uploaded3.id, RelationType.REFERENCES);

      const relationships = await vfs.getRelationships(uploaded1.id);

      expect(relationships.length).toBe(2);
      expect(relationships.every(r => r.fromFileId === uploaded1.id)).toBe(true);
    });

    it('应该验证源文件和目标文件存在', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file = createMockFile('file.xlsx');
      const uploaded = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE);

      await expect(
        vfs.addRelationship(uploaded.id, 'non-existent-id', RelationType.DEPENDS_ON)
      ).rejects.toThrow('Target file not found');

      await expect(
        vfs.addRelationship('non-existent-id', uploaded.id, RelationType.DEPENDS_ON)
      ).rejects.toThrow('Source file not found');
    });

    it('应该在禁用时拒绝关系操作', async () => {
      (VirtualFileSystem as any).instance = null;

      const vfsNoRelations = VirtualFileSystem.getInstance({ enableRelationships: false });
      await vfsNoRelations.initialize();

      mockPyodideService.mountFile.mockImplementation(() => {});

      const file1 = createMockFile('file1.xlsx');
      const file2 = createMockFile('file2.xlsx');

      const uploaded1 = await vfsNoRelations.uploadFile(file1, FileRole.PRIMARY_SOURCE);
      const uploaded2 = await vfsNoRelations.uploadFile(file2, FileRole.PRIMARY_SOURCE);

      await expect(
        vfsNoRelations.addRelationship(uploaded1.id, uploaded2.id, RelationType.DEPENDS_ON)
      ).rejects.toThrow('Relationship management is disabled');
    });
  });

  // ========================================================================
  // 版本管理测试
  // ========================================================================

  describe('版本管理', () => {
    it('应该在启用版本控制时创建版本', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});
      mockPyodideService.writeFile.mockImplementation(() => {});
      mockPyodideService.readFile.mockReturnValue(new Uint8Array());

      const file = createMockFile('version-test.xlsx');
      const uploaded = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE, {
        comment: 'Initial version',
      });

      const versions = await vfs.getVersions(uploaded.id);

      expect(versions.length).toBe(1);
      expect(versions[0].comment).toBe('Initial version');
    });

    it('应该创建多个版本', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});
      mockPyodideService.writeFile.mockImplementation(() => {});
      mockPyodideService.readFile.mockReturnValue(new Uint8Array());

      const file = createMockFile('multi-version.xlsx');
      const uploaded = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE);

      await vfs.createVersion(uploaded.id, 'Version 2');
      await vfs.createVersion(uploaded.id, 'Version 3');

      const versions = await vfs.getVersions(uploaded.id);

      expect(versions.length).toBe(3);
      expect(versions[0].version).toBe(1);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(3);
    });

    it('应该限制版本数量', async () => {
      (VirtualFileSystem as any).instance = null;

      const vfsLimited = VirtualFileSystem.getInstance({ maxVersions: 3 });
      await vfsLimited.initialize();

      mockPyodideService.mountFile.mockImplementation(() => {});
      mockPyodideService.writeFile.mockImplementation(() => {});
      mockPyodideService.readFile.mockReturnValue(new Uint8Array());

      const file = createMockFile('limited-version.xlsx');
      const uploaded = await vfsLimited.uploadFile(file, FileRole.PRIMARY_SOURCE);

      await vfsLimited.createVersion(uploaded.id, 'V2');
      await vfsLimited.createVersion(uploaded.id, 'V3');
      await vfsLimited.createVersion(uploaded.id, 'V4');
      await vfsLimited.createVersion(uploaded.id, 'V5');

      const versions = await vfsLimited.getVersions(uploaded.id);

      expect(versions.length).toBe(3); // 最多保留 3 个版本
    });

    it('应该恢复版本', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});
      mockPyodideService.writeFile.mockImplementation(() => {});
      mockPyodideService.readFile.mockReturnValue(new Uint8Array([1, 2, 3]));

      const file = createMockFile('restore-test.xlsx');
      const uploaded = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE);

      const version = await vfs.createVersion(uploaded.id, 'Before changes');

      await vfs.restoreVersion(uploaded.id, version.id);

      expect(mockPyodideService.writeFile).toHaveBeenCalled();
    });

    it('应该在禁用时拒绝版本操作', async () => {
      (VirtualFileSystem as any).instance = null;

      const vfsNoVersioning = VirtualFileSystem.getInstance({ enableVersioning: false });
      await vfsNoVersioning.initialize();

      mockPyodideService.mountFile.mockImplementation(() => {});

      const file = createMockFile('no-version.xlsx');
      const uploaded = await vfsNoVersioning.uploadFile(file, FileRole.PRIMARY_SOURCE);

      await expect(
        vfsNoVersioning.createVersion(uploaded.id, 'Should fail')
      ).rejects.toThrow('Versioning is disabled');
    });
  });

  // ========================================================================
  // 统计信息测试
  // ========================================================================

  describe('统计信息', () => {
    it('应该返回正确的统计信息', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file1 = createMockFile('file1.xlsx', 1024);
      const file2 = createMockFile('file2.xlsx', 2048);

      await vfs.uploadFile(file1, FileRole.PRIMARY_SOURCE);
      await vfs.uploadFile(file2, FileRole.OUTPUT);

      const stats = await vfs.getStats();

      expect(stats.totalFiles).toBe(2);
      expect(stats.totalSize).toBe(3072);
      expect(stats.filesByRole[FileRole.PRIMARY_SOURCE]).toBe(1);
      expect(stats.filesByRole[FileRole.OUTPUT]).toBe(1);
      expect(stats.filesByType['excel']).toBe(2);
    });

    it('应该统计版本数量', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});
      mockPyodideService.writeFile.mockImplementation(() => {});
      mockPyodideService.readFile.mockReturnValue(new Uint8Array());

      const file = createMockFile('version-stats.xlsx');
      const uploaded = await vfs.uploadFile(file, FileRole.PRIMARY_SOURCE);

      await vfs.createVersion(uploaded.id, 'V2');
      await vfs.createVersion(uploaded.id, 'V3');

      const stats = await vfs.getStats();

      expect(stats.totalVersions).toBe(3);
    });

    it('应该统计关系数量', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const file1 = createMockFile('file1.xlsx');
      const file2 = createMockFile('file2.xlsx');
      const file3 = createMockFile('file3.xlsx');

      const uploaded1 = await vfs.uploadFile(file1, FileRole.PRIMARY_SOURCE);
      const uploaded2 = await vfs.uploadFile(file2, FileRole.OUTPUT);
      const uploaded3 = await vfs.uploadFile(file3, FileRole.AUXILIARY_SOURCE);

      await vfs.addRelationship(uploaded1.id, uploaded2.id, RelationType.GENERATES);
      await vfs.addRelationship(uploaded1.id, uploaded3.id, RelationType.REFERENCES);

      const stats = await vfs.getStats();

      expect(stats.totalRelationships).toBe(2);
    });
  });

  // ========================================================================
  // 临时文件清理测试
  // ========================================================================

  describe('临时文件清理', () => {
    it('应该清理过期的临时文件', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});
      mockPyodideService.unlinkFile.mockImplementation(() => {});

      const oldTempFile = createMockFile('old-temp.xlsx');
      const uploaded = await vfs.uploadFile(oldTempFile, FileRole.TEMPORARY);

      // 修改上传时间使其过期
      const fileInfo = (vfs as any).files.get(uploaded.id);
      fileInfo.uploadTime = Date.now() - 4000000; // > 1 hour ago

      const cleaned = await vfs.cleanupTempFiles(3600000);

      expect(cleaned).toBeGreaterThan(0);
    });

    it('应该保留新的临时文件', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const newTempFile = createMockFile('new-temp.xlsx');
      await vfs.uploadFile(newTempFile, FileRole.TEMPORARY);

      const cleaned = await vfs.cleanupTempFiles(3600000);

      expect(cleaned).toBe(0);
    });

    it('应该只清理临时文件', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});
      mockPyodideService.unlinkFile.mockImplementation(() => {});

      const primaryFile = createMockFile('primary.xlsx');
      const uploaded = await vfs.uploadFile(primaryFile, FileRole.PRIMARY_SOURCE);

      // 修改上传时间
      const fileInfo = (vfs as any).files.get(uploaded.id);
      fileInfo.uploadTime = Date.now() - 4000000;

      const cleaned = await vfs.cleanupTempFiles(3600000);

      expect(cleaned).toBe(0);
    });
  });

  // ========================================================================
  // 错误处理测试
  // ========================================================================

  describe('错误处理', () => {
    it('应该在未初始化时抛出错误', async () => {
      (VirtualFileSystem as any).instance = null;

      const vfsNew = VirtualFileSystem.getInstance();

      await expect(vfsNew.uploadFile(createMockFile('test.xlsx'), FileRole.PRIMARY_SOURCE))
        .rejects.toThrow('not initialized');
    });

    it('应该处理无效文件ID', async () => {
      await expect(vfs.readFile('invalid-id')).rejects.toThrow();
      await expect(vfs.deleteFile('invalid-id')).rejects.toThrow();
      await expect(vfs.updateFile('invalid-id', {})).rejects.toThrow();
    });
  });

  // ========================================================================
  // 边界条件测试
  // ========================================================================

  describe('边界条件', () => {
    it('应该处理空文件', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const emptyFile = createMockFile('empty.xlsx', 0);
      const uploaded = await vfs.uploadFile(emptyFile, FileRole.PRIMARY_SOURCE);

      expect(uploaded.size).toBe(0);
    });

    it('应该处理特殊文件名', async () => {
      mockPyodideService.mountFile.mockImplementation(() => {});

      const specialFile = createMockFile('file with spaces & special!@#.xlsx');
      const uploaded = await vfs.uploadFile(specialFile, FileRole.PRIMARY_SOURCE);

      expect(uploaded.name).toBe('file with spaces & special!@#.xlsx');
    });
  });
});
