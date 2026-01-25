/**
 * 输入验证安全测试
 *
 * 测试用户输入的验证和清理
 * 防止路径遍历、注入攻击等
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// ============================================================================
// 文件名验证测试
// ============================================================================

describe('文件名验证', () => {
  const sanitizeFileName = (fileName: string): string => {
    // 移除路径遍历字符
    let sanitized = fileName.replace(/[\/\\]/g, '_');
    // 移除控制字符
    sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, '');
    // 限制文件名长度
    if (sanitized.length > 255) {
      const ext = sanitized.split('.').pop();
      const name = sanitized.substring(0, 245);
      sanitized = `${name}.${ext}`;
    }
    return sanitized;
  };

  describe('路径遍历防护', () => {
    it('应该拒绝包含 ../ 的文件名', () => {
      const malicious = '../../../etc/passwd';
      const sanitized = sanitizeFileName(malicious);

      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).toBe('________.._____etc_passwd');
    });

    it('应该拒绝包含 ..\\ 的文件名', () => {
      const malicious = '..\\..\\windows\\system32\\config';
      const sanitized = sanitizeFileName(malicious);

      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('\\');
      expect(sanitized).toBe('___________windows_system32_config');
    });

    it('应该拒绝绝对路径', () => {
      const malicious = '/etc/passwd';
      const sanitized = sanitizeFileName(malicious);

      expect(sanitized).not.toContain('/');
      expect(sanitized).toBe('_etc_passwd');
    });

    it('应该拒绝 Windows 绝对路径', () => {
      const malicious = 'C:\\Windows\\System32\\config';
      const sanitized = sanitizeFileName(malicious);

      expect(sanitized).not.toContain(':');
      expect(sanitized).not.toContain('\\');
      expect(sanitized).toBe('C__Windows_System32_config');
    });
  });

  describe('控制字符过滤', () => {
    it('应该移除空字节', () => {
      const malicious = 'file\x00.txt';
      const sanitized = sanitizeFileName(malicious);

      expect(sanitized).not.toContain('\x00');
      expect(sanitized).toBe('file.txt');
    });

    it('应该移除控制字符', () => {
      const malicious = 'file\x1b\x01\x02.txt';
      const sanitized = sanitizeFileName(malicious);

      expect(sanitized).toBe('file.txt');
    });
  });

  describe('文件名长度限制', () => {
    it('应该截断过长的文件名', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFileName(longName);

      expect(sanitized.length).toBeLessThanOrEqual(255);
    });

    it('应该保留文件扩展名', () => {
      const longName = 'a'.repeat(300) + '.xlsx';
      const sanitized = sanitizeFileName(longName);

      expect(sanitized).endsWith('.xlsx');
    });
  });

  describe('合法文件名', () => {
    it('应该接受合法的文件名', () => {
      const validNames = [
        'document.xlsx',
        '报告-2024.docx',
        'data_file.csv',
        'image (1).png',
        'file with spaces.txt',
      ];

      validNames.forEach(name => {
        const sanitized = sanitizeFileName(name);
        expect(sanitized).toBe(name);
      });
    });

    it('应该接受带中文字符的文件名', () => {
      const chineseName = '测试文档.xlsx';
      const sanitized = sanitizeFileName(chineseName);

      expect(sanitized).toBe(chineseName);
    });
  });
});

// ============================================================================
// 文件类型验证测试
// ============================================================================

describe('文件类型验证', () => {
  const FILE_MAGIC_NUMBERS: Record<string, string[]> = {
    excel: ['\x50\x4B\x03\x04', '\x50\x4B\x05\x06'],
    word: ['\x50\x4B\x03\x04'],
    pdf: ['\x25\x50\x44\x46'],
    json: ['\x7B'],
    csv: [],
    txt: [],
  };

  const validateFileMagicNumber = (file: { header: string }, declaredType: string): boolean => {
    const magicNumbers = FILE_MAGIC_NUMBERS[declaredType];
    if (!magicNumbers || magicNumbers.length === 0) {
      return true; // 跳过没有魔数的类型
    }

    return magicNumbers.some(magic => file.header.startsWith(magic));
  };

  describe('Excel 文件验证', () => {
    it('应该接受有效的 Excel 文件', () => {
      const validExcel = {
        header: '\x50\x4B\x03\x04\x14\x00\x06\x00', // ZIP 头 (XLSX)
      };

      expect(validateFileMagicNumber(validExcel, 'excel')).toBe(true);
    });

    it('应该拒绝伪装成 Excel 的文件', () => {
      const fakeExcel = {
        header: '\x00\x00\x00\x00\x00\x00\x00\x00',
      };

      expect(validateFileMagicNumber(fakeExcel, 'excel')).toBe(false);
    });
  });

  describe('PDF 文件验证', () => {
    it('应该接受有效的 PDF 文件', () => {
      const validPdf = {
        header: '\x25\x50\x44\x46\x2D\x31\x2E\x34', // %PDF-1.4
      };

      expect(validateFileMagicNumber(validPdf, 'pdf')).toBe(true);
    });

    it('应该拒绝伪装成 PDF 的文件', () => {
      const fakePdf = {
        header: '\x50\x4B\x03\x04', // ZIP 头
      };

      expect(validateFileMagicNumber(fakePdf, 'pdf')).toBe(false);
    });
  });

  describe('JSON 文件验证', () => {
    it('应该接受有效的 JSON 文件', () => {
      const validJson = {
        header: '\x7B\x22\x6E\x61\x6D\x65\x22', // {"name"
      };

      expect(validateFileMagicNumber(validJson, 'json')).toBe(true);
    });

    it('应该拒绝无效的 JSON 文件', () => {
      const invalidJson = {
        header: '\x50\x4B\x03\x04', // ZIP 头
      };

      expect(validateFileMagicNumber(invalidJson, 'json')).toBe(false);
    });
  });

  describe('文本文件验证', () => {
    it('应该接受任何文本文件（无魔数检查）', () => {
      const textFile = {
        header: 'Hello, world!',
      };

      expect(validateFileMagicNumber(textFile, 'txt')).toBe(true);
      expect(validateFileMagicNumber(textFile, 'csv')).toBe(true);
    });
  });
});

// ============================================================================
// 会话 ID 验证测试
// ============================================================================

describe('会话 ID 验证', () => {
  const validateSessionId = (sessionId: string): boolean => {
    // 会话 ID 应该以 'session_' 开头，后跟至少 16 个字母数字字符
    const pattern = /^session_[a-zA-Z0-9]{16,}$/;
    return pattern.test(sessionId);
  };

  it('应该接受合法的会话 ID', () => {
    const validIds = [
      'session_abc123def456',
      'session_' + 'x'.repeat(32),
      'session_1234567890123456',
    ];

    validIds.forEach(id => {
      expect(validateSessionId(id)).toBe(true);
    });
  });

  it('应该拒绝太短的会话 ID', () => {
    const shortIds = [
      'session_abc',
      'session_12345',
      'session_123456789012345',
    ];

    shortIds.forEach(id => {
      expect(validateSessionId(id)).toBe(false);
    });
  });

  it('应该拒绝没有前缀的 ID', () => {
    const invalidIds = [
      'abc123def456',
      'user_123456',
      '1234567890123456',
    ];

    invalidIds.forEach(id => {
      expect(validateSessionId(id)).toBe(false);
    });
  });

  it('应该拒绝包含特殊字符的会话 ID', () => {
    const invalidIds = [
      'session_abc-123',
      'session_abc_123',
      'session_abc.def',
      'session_abc def',
    ];

    invalidIds.forEach(id => {
      expect(validateSessionId(id)).toBe(false);
    });
  });
});

// ============================================================================
// 用户输入清理测试
// ============================================================================

describe('用户输入清理', () => {
  const sanitizeUserInput = (input: string): string => {
    // 移除 HTML 标签
    let sanitized = input.replace(/<[^>]*>/g, '');
    // 移除 SQL 注入模式
    sanitized = sanitized.replace(/['";\\]/g, '');
    // 移除脚本事件
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    return sanitized;
  };

  it('应该移除 HTML 标签', () => {
    const malicious = '<script>alert("XSS")</script>Hello';
    const sanitized = sanitizeUserInput(malicious);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('</script>');
    expect(sanitized).toBe('alert("XSS")Hello');
  });

  it('应该移除 SQL 注入模式', () => {
    const malicious = "name'; DROP TABLE users; --";
    const sanitized = sanitizeUserInput(malicious);

    expect(sanitized).not.toContain("'");
    expect(sanitized).not.toContain(';');
    expect(sanitized).toBe('name DROP TABLE users --');
  });

  it('应该移除脚本事件处理器', () => {
    const malicious = '<img onerror="alert(1)" src="x">';
    const sanitized = sanitizeUserInput(malicious);

    expect(sanitized).not.toContain('onerror');
    expect(sanitized).toContain('img src="x"');
  });

  it('应该保留合法的文本', () => {
    const validText = 'Hello, world! This is a test.';
    const sanitized = sanitizeUserInput(validText);

    expect(sanitized).toBe(validText);
  });
});

// ============================================================================
// Redis 键验证测试
// ============================================================================

describe('Redis 键验证', () => {
  const validateRedisKey = (key: string): boolean => {
    // Redis 键应该只包含字母、数字、冒号、下划线和连字符
    const pattern = /^[a-zA-Z0-9:_-]+$/;
    return pattern.test(key) && key.length <= 1024;
  };

  it('应该接受合法的 Redis 键', () => {
    const validKeys = [
      'session:abc123',
      'user:123:data',
      'vfs_file_123456',
      'cache:temp:123456',
      'excelmind:session:abc',
    ];

    validKeys.forEach(key => {
      expect(validateRedisKey(key)).toBe(true);
    });
  });

  it('应该拒绝包含空格的键', () => {
    const invalidKeys = [
      'session:abc 123',
      'user data:123',
      'key with spaces',
    ];

    invalidKeys.forEach(key => {
      expect(validateRedisKey(key)).toBe(false);
    });
  });

  it('应该拒绝过长的键', () => {
    const longKey = 'a'.repeat(1025);
    expect(validateRedisKey(longKey)).toBe(false);
  });

  it('应该拒绝包含特殊字符的键', () => {
    const invalidKeys = [
      'session:abc/123',
      'user:123@data',
      'key#tag',
    ];

    invalidKeys.forEach(key => {
      expect(validateRedisKey(key)).toBe(false);
    });
  });
});
