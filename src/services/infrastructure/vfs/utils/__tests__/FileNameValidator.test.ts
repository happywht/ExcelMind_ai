/**
 * FileNameValidator 单元测试
 *
 * 测试范围：
 * - 文件名验证
 * - 文件名清理
 * - 路径验证
 * - 文件名分析
 * - 生成安全文件名
 */

import {
  validateFileName,
  sanitizeFileName,
  validateFilePath,
  analyzeFileName,
  generateSafeFileName,
  ALLOWED_EXTENSIONS,
  MAX_FILENAME_LENGTH,
} from '../FileNameValidator';

// ============================================================================
// 测试套件
// ============================================================================

describe('FileNameValidator', () => {
  // ========================================================================
  // validateFileName 测试
  // ========================================================================

  describe('validateFileName', () => {
    describe('路径遍历攻击防护', () => {
      it('应该拒绝包含路径遍历的文件名', () => {
        const result = validateFileName('../../../etc/passwd');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('路径遍历');
      });

      it('应该拒绝包含相对路径的文件名', () => {
        const result = validateFileName('../sensitive.txt');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('路径遍历');
      });

      it('应该拒绝混合路径遍历的文件名', () => {
        const result = validateFileName('normal/../../etc/passwd');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('路径遍历');
      });
    });

    describe('危险字符检测', () => {
      it('应该拒绝包含尖括号的文件名', () => {
        const result = validateFileName('file<name>.xlsx');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('非法字符');
      });

      it('应该拒绝包含冒号的文件名', () => {
        const result = validateFileName('file:name.xlsx');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('非法字符');
      });

      it('应该拒绝包含引号的文件名', () => {
        const result = validateFileName('file"name.xlsx');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('非法字符');
      });

      it('应该拒绝包含管道符的文件名', () => {
        const result = validateFileName('file|name.xlsx');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('非法字符');
      });

      it('应该拒绝包含问号的文件名', () => {
        const result = validateFileName('file?name.xlsx');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('非法字符');
      });

      it('应该拒绝包含星号的文件名', () => {
        const result = validateFileName('file*name.xlsx');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('非法字符');
      });

      it('应该拒绝包含控制字符的文件名', () => {
        const result = validateFileName('file\x00name.xlsx');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('非法字符');
      });
    });

    describe('文件名长度限制', () => {
      it('应该拒绝过长的文件名', () => {
        const longName = 'a'.repeat(MAX_FILENAME_LENGTH + 1) + '.xlsx';
        const result = validateFileName(longName);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('过长');
      });

      it('应该接受刚好等于最大长度的文件名', () => {
        const name = 'a'.repeat(MAX_FILENAME_LENGTH - 5) + '.xlsx';
        const result = validateFileName(name);
        expect(result.valid).toBe(true);
      });
    });

    describe('扩展名验证', () => {
      it('应该接受允许的文件扩展名', () => {
        const allowedExtensions = ['.xlsx', '.xls', '.docx', '.pdf', '.json', '.csv', '.txt'];

        for (const ext of allowedExtensions) {
          const result = validateFileName(`test${ext}`);
          expect(result.valid).toBe(true);
        }
      });

      it('应该拒绝不允许的文件扩展名', () => {
        const result = validateFileName('test.exe');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('不支持的文件类型');
      });

      it('应该接受没有扩展名的文件名', () => {
        const result = validateFileName('README');
        expect(result.valid).toBe(true);
      });
    });

    describe('保留文件名检测', () => {
      it('应该拒绝 Windows 保留文件名（大写）', () => {
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];

        for (const name of reservedNames) {
          const result = validateFileName(`${name}.txt`);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('系统保留');
        }
      });

      it('应该拒绝 Windows 保留文件名（小写）', () => {
        const result = validateFileName('con.txt');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('系统保留');
      });

      it('应该拒绝 Windows 保留文件名（混合大小写）', () => {
        const result = validateFileName('CoN.txt');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('系统保留');
      });
    });

    describe('隐藏文件检测', () => {
      it('应该拒绝以点开头的隐藏文件名', () => {
        const result = validateFileName('.hidden');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('隐藏文件');
      });

      it('应该拒绝只有扩展名的文件名（以点开头）', () => {
        const result = validateFileName('.txt');
        expect(result.valid).toBe(false);
      });
    });

    describe('空文件名检测', () => {
      it('应该拒绝空字符串', () => {
        const result = validateFileName('');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('不能为空');
      });

      it('应该拒绝只有空格的文件名', () => {
        const result = validateFileName('   ');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('不能为空');
      });

      it('应该拒绝只有扩展名的文件名', () => {
        const result = validateFileName('.xlsx');
        expect(result.valid).toBe(false);
      });
    });

    describe('有效文件名', () => {
      it('应该接受普通文件名', () => {
        const validNames = [
          'document.xlsx',
          'data-file.csv',
          'report_final.pdf',
          'image123.png',
          '我的文档.docx',
          'file with spaces.txt',
          'file-with-dashes.json',
          'file_with_underscores.xml',
        ];

        for (const name of validNames) {
          const result = validateFileName(name);
          expect(result.valid).toBe(true);
        }
      });

      it('应该接受中文文件名', () => {
        const result = validateFileName('测试文档.xlsx');
        expect(result.valid).toBe(true);
      });

      it('应该接受包含数字的文件名', () => {
        const result = validateFileName('file123.xlsx');
        expect(result.valid).toBe(true);
      });
    });

    describe('自定义验证选项', () => {
      it('应该禁用扩展名检查', () => {
        const result = validateFileName('test.exe', { checkExtension: false });
        expect(result.valid).toBe(true);
      });

      it('应该使用自定义允许的扩展名', () => {
        const result = validateFileName('test.exe', {
          allowedExtensions: ['.exe', '.dll'],
        });
        expect(result.valid).toBe(true);
      });

      it('应该禁用保留文件名检查', () => {
        const result = validateFileName('CON.txt', { checkReservedNames: false });
        expect(result.valid).toBe(true);
      });

      it('应该使用自定义最大长度', () => {
        const longName = 'a'.repeat(100) + '.xlsx';
        const result = validateFileName(longName, { maxLength: 50 });
        expect(result.valid).toBe(false);
      });
    });
  });

  // ========================================================================
  // sanitizeFileName 测试
  // ========================================================================

  describe('sanitizeFileName', () => {
    it('应该移除危险字符', () => {
      const sanitized = sanitizeFileName('file<>name.xlsx');
      expect(sanitized).toBe('filename.xlsx');
    });

    it('应该移除路径遍历序列', () => {
      const sanitized = sanitizeFileName('../../etc/passwd');
      expect(sanitized).not.toContain('..');
    });

    it('应该移除前导点和空格', () => {
      const sanitized = sanitizeFileName('  .hidden.txt');
      expect(sanitized).not.toMatch(/^[\s.]/);
    });

    it('应该移除尾随空格和点', () => {
      const sanitized = sanitizeFileName('file.   ');
      expect(sanitized).not.toMatch(/[.\s]$/);
    });

    it('应该将多个空格合并为单个空格', () => {
      const sanitized = sanitizeFileName('file    name.xlsx');
      expect(sanitized).toBe('file name.xlsx');
    });

    it('应该截断过长的文件名', () => {
      const longName = 'a'.repeat(300) + '.xlsx';
      const sanitized = sanitizeFileName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(MAX_FILENAME_LENGTH);
    });

    it('应该保留文件扩展名', () => {
      const longName = 'a'.repeat(300) + '.xlsx';
      const sanitized = sanitizeFileName(longName);
      expect(sanitized).toMatch(/\.xlsx$/);
    });

    it('应该支持自定义替换字符', () => {
      const sanitized = sanitizeFileName('file<>name.xlsx', { replacement: '_' });
      expect(sanitized).toBe('file__name.xlsx');
    });

    it('应该支持小写化', () => {
      const sanitized = sanitizeFileName('FILE.NAME.XLSX', { lowercase: true });
      expect(sanitized).toBe('file.name.xlsx');
    });
  });

  // ========================================================================
  // validateFilePath 测试
  // ========================================================================

  describe('validateFilePath', () => {
    it('应该拒绝绝对路径（Unix）', () => {
      const result = validateFilePath('/etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('绝对路径');
    });

    it('应该拒绝绝对路径（Windows）', () => {
      const result = validateFilePath('C:\\Windows\\System32');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('绝对路径');
    });

    it('应该拒绝包含路径遍历的路径', () => {
      const result = validateFilePath('data/../etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('遍历序列');
    });

    it('应该接受相对路径', () => {
      const result = validateFilePath('data/documents/file.xlsx');
      expect(result.valid).toBe(true);
    });

    it('应该允许绝对路径（配置允许）', () => {
      const result = validateFilePath('/etc/passwd', { allowAbsolute: true });
      expect(result.valid).toBe(true);
    });

    it('应该允许 Windows 路径（配置允许）', () => {
      const result = validateFilePath('C:\\data\\file.xlsx', {
        allowWindowsPaths: true,
      });
      expect(result.valid).toBe(true);
    });

    it('应该拒绝空路径', () => {
      const result = validateFilePath('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不能为空');
    });
  });

  // ========================================================================
  // analyzeFileName 测试
  // ========================================================================

  describe('analyzeFileName', () => {
    it('应该正确解析文件名和扩展名', () => {
      const analysis = analyzeFileName('document.xlsx');
      expect(analysis.name).toBe('document');
      expect(analysis.extension).toBe('.xlsx');
    });

    it('应该处理没有扩展名的文件名', () => {
      const analysis = analyzeFileName('README');
      expect(analysis.name).toBe('README');
      expect(analysis.extension).toBe('');
    });

    it('应该检测允许的扩展名', () => {
      const analysis = analyzeFileName('test.xlsx');
      expect(analysis.isAllowedExtension).toBe(true);
    });

    it('应该检测不允许的扩展名', () => {
      const analysis = analyzeFileName('test.exe');
      expect(analysis.isAllowedExtension).toBe(false);
    });

    it('应该检测保留文件名', () => {
      const analysis = analyzeFileName('CON.txt');
      expect(analysis.isReservedName).toBe(true);
    });

    it('应该检测危险字符', () => {
      const analysis = analyzeFileName('file<name>.xlsx');
      expect(analysis.dangerousChars.length).toBeGreaterThan(0);
      expect(analysis.dangerousChars).toContain('<');
      expect(analysis.dangerousChars).toContain('>');
    });

    it('应该检测路径遍历', () => {
      const analysis = analyzeFileName('../file.xlsx');
      expect(analysis.hasPathTraversal).toBe(true);
    });

    it('应该处理多个点的情况', () => {
      const analysis = analyzeFileName('file.name.test.xlsx');
      expect(analysis.name).toBe('file.name.test');
      expect(analysis.extension).toBe('.xlsx');
    });
  });

  // ========================================================================
  // generateSafeFileName 测试
  // ========================================================================

  describe('generateSafeFileName', () => {
    it('应该清理危险字符', () => {
      const safe = generateSafeFileName('file<>name.xlsx');
      expect(safe).not.toContain('<');
      expect(safe).not.toContain('>');
    });

    it('应该添加随机后缀（配置启用）', () => {
      const safe = generateSafeFileName('document.xlsx', { randomSuffix: true });
      expect(safe).toMatch(/document_[a-z0-9]+\.xlsx/);
    });

    it('应该添加前缀（配置启用）', () => {
      const safe = generateSafeFileName('document.xlsx', { prefix: 'backup_' });
      expect(safe.startsWith('backup_')).toBe(true);
    });

    it('应该同时添加前缀和随机后缀', () => {
      const safe = generateSafeFileName('doc.xlsx', {
        prefix: 'backup_',
        randomSuffix: true,
      });
      expect(safe).toMatch(/backup_doc_[a-z0-9]+\.xlsx/);
    });

    it('应该使用自定义后缀长度', () => {
      const safe = generateSafeFileName('file.xlsx', {
        randomSuffix: true,
        suffixLength: 16,
      });
      const match = safe.match(/file_([a-z0-9]+)\.xlsx/);
      expect(match && match[1].length).toBe(16);
    });

    it('应该保留文件扩展名', () => {
      const safe = generateSafeFileName('document.xlsx');
      expect(safe.endsWith('.xlsx')).toBe(true);
    });
  });

  // ========================================================================
  // 边界条件测试
  // ========================================================================

  describe('边界条件', () => {
    it('应该处理非常短的文件名', () => {
      const result = validateFileName('a.txt');
      expect(result.valid).toBe(true);
    });

    it('应该处理包含特殊 Unicode 字符的文件名', () => {
      const result = validateFileName('文件🎉.xlsx');
      expect(result.valid).toBe(true);
    });

    it('应该处理包含多个点的文件名', () => {
      const result = validateFileName('file.name.with.many.dots.txt');
      expect(result.valid).toBe(true);
    });

    it('应该处理全角字符', () => {
      const result = validateFileName('ｆｉｌｅ．ｔｘｔ');
      expect(result.valid).toBe(true);
    });
  });
});
