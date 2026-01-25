/**
 * XSS 防护测试
 *
 * 测试跨站脚本攻击防护措施
 */

import { describe, it, expect } from '@jest/globals';

// ============================================================================
// HTML 内容清理测试
// ============================================================================

describe('HTML 内容清理', () => {
  // 模拟 DOMPurify 的清理功能
  const sanitizeHTML = (html: string, allowedTags: string[] = []): string => {
    let sanitized = html;

    // 移除脚本标签
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 移除事件处理器
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    // 移除 javascript: 协议
    sanitized = sanitized.replace(/javascript:/gi, '');

    // 如果有允许的标签列表，移除其他标签
    if (allowedTags.length > 0) {
      const tagPattern = allowedTags.join('|');
      sanitized = sanitized.replace(
        new RegExp(`<(?!\\/?(${tagPattern})\\b)[^>]+>`, 'gi'),
        ''
      );
    } else {
      // 移除所有 HTML 标签
      sanitized = sanitized.replace(/<[^>]+>/g, '');
    }

    return sanitized;
  };

  describe('脚本标签过滤', () => {
    it('应该移除 <script> 标签', () => {
      const malicious = '<script>alert("XSS")</script>Hello';
      const sanitized = sanitizeHTML(malicious);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toContain('Hello');
    });

    it('应该移除带有属性的脚本标签', () => {
      const malicious =
        '<script type="text/javascript" src="evil.js">alert("XSS")</script>';
      const sanitized = sanitizeHTML(malicious);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('evil.js');
    });

    it('应该移除大写的脚本标签', () => {
      const malicious = '<SCRIPT>alert("XSS")</SCRIPT>';
      const sanitized = sanitizeHTML(malicious);

      expect(sanitized.toUpperCase()).not.toContain('<SCRIPT>');
    });

    it('应该移除混合大小写的脚本标签', () => {
      const malicious = '<ScrIpT>alert("XSS")</ScRipt>';
      const sanitized = sanitizeHTML(malicious);

      expect(sanitized.toLowerCase()).not.toContain('<script>');
    });
  });

  describe('事件处理器过滤', () => {
    it('应该移除 onclick 事件', () => {
      const malicious = '<div onclick="alert(1)">Click me</div>';
      const sanitized = sanitizeHTML(malicious);

      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('alert(1)');
    });

    it('应该移除 onerror 事件', () => {
      const malicious = '<img src="x" onerror="alert(1)">';
      const sanitized = sanitizeHTML(malicious);

      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('alert(1)');
    });

    it('应该移除 onload 事件', () => {
      const malicious = '<body onload="alert(1)">Hello</body>';
      const sanitized = sanitizeHTML(malicious);

      expect(sanitized).not.toContain('onload');
    });

    it('应该移除所有 on* 事件', () => {
      const events = ['onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover'];

      events.forEach((event) => {
        const malicious = `<div ${event}="alert(1)">Test</div>`;
        const sanitized = sanitizeHTML(malicious);

        expect(sanitized).not.toContain(event);
      });
    });
  });

  describe('JavaScript 协议过滤', () => {
    it('应该移除 javascript: 协议', () => {
      const malicious = '<a href="javascript:alert(1)">Click</a>';
      const sanitized = sanitizeHTML(malicious);

      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('href="alert(1)"');
    });

    it('应该移除混合大小写的 javascript: 协议', () => {
      const malicious = '<a href="JaVaScRiPt:alert(1)">Click</a>';
      const sanitized = sanitizeHTML(malicious);

      expect(sanitized.toLowerCase()).not.toContain('javascript:');
    });
  });

  describe('允许的标签', () => {
    it('应该保留允许的标签', () => {
      const html = '<p>Hello</p><strong>World</strong><script>alert(1)</script>';
      const allowedTags = ['p', 'strong'];
      const sanitized = sanitizeHTML(html, allowedTags);

      expect(sanitized).toContain('<p>Hello</p>');
      expect(sanitized).toContain('<strong>World</strong>');
      expect(sanitized).not.toContain('<script>');
    });

    it('应该移除不允许的标签', () => {
      const html = '<p>Hello</p><div>World</div><span>Test</span>';
      const allowedTags = ['p'];
      const sanitized = sanitizeHTML(html, allowedTags);

      expect(sanitized).toContain('<p>Hello</p>');
      expect(sanitized).not.toContain('<div>');
      expect(sanitized).not.toContain('<span>');
    });
  });
});

// ============================================================================
// React JSX 安全性测试
// ============================================================================

describe('React JSX 安全性', () => {
  it('应该默认转义特殊字符', () => {
    const userInput = '<script>alert("XSS")</script>';
    // React 默认行为：将内容作为文本处理
    const output = userInput;

    expect(output).toContain('&lt;');
    expect(output).toContain('&gt;');
    expect(output).not.toContain('<script>');
  });

  it('应该转义 HTML 实体', () => {
    const userInput = '<div>Test</div>';
    // React 默认行为
    const output = userInput;

    expect(output).toContain('&lt;div&gt;');
  });

  it('应该安全处理引号', () => {
    const userInput = '" onclick="alert(1)';
    // React 默认行为
    const output = userInput;

    expect(output).toContain('&quot;');
  });
});

// ============================================================================
// dangerouslySetInnerHTML 替代方案测试
// ============================================================================

describe('安全的 HTML 渲染', () => {
  const createSafeHTMLRenderer = (allowedTags: string[] = []) => {
    return (html: string): { __html: string } => {
      const sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      return { __html: sanitized };
    };
  };

  it('应该清理 HTML 后再使用 dangerouslySetInnerHTML', () => {
    const renderSafeHTML = createSafeHTMLRenderer(['p', 'strong']);
    const malicious = '<script>alert(1)</script><p>Hello</p>';

    const safeHTML = renderSafeHTML(malicious);

    expect(safeHTML.__html).not.toContain('<script>');
    expect(safeHTML.__html).toContain('<p>Hello</p>');
  });

  it('应该移除所有危险内容', () => {
    const renderSafeHTML = createSafeHTMLRenderer();
    const malicious =
      '<script>alert(1)</script><img src=x onerror=alert(2)><a href=javascript:alert(3)>Click</a>';

    const safeHTML = renderSafeHTML(malicious);

    expect(safeHTML.__html).not.toContain('<script>');
    expect(safeHTML.__html).not.toContain('onerror');
    expect(safeHTML.__html).not.toContain('javascript:');
  });
});

// ============================================================================
// URL 安全性测试
// ============================================================================

describe('URL 安全性', () => {
  const sanitizeURL = (url: string): string => {
    // 移除 javascript: 协议
    if (url.trim().toLowerCase().startsWith('javascript:')) {
      return '#';
    }

    // 移除 data: 协议（可能包含恶意代码）
    if (url.trim().toLowerCase().startsWith('data:')) {
      return '#';
    }

    // 移除 vbscript: 协议
    if (url.trim().toLowerCase().startsWith('vbscript:')) {
      return '#';
    }

    return url;
  };

  it('应该移除 javascript: URL', () => {
    const malicious = 'javascript:alert(1)';
    const sanitized = sanitizeURL(malicious);

    expect(sanitized).toBe('#');
  });

  it('应该移除 data: URL', () => {
    const malicious = 'data:text/html,<script>alert(1)</script>';
    const sanitized = sanitizeURL(malicious);

    expect(sanitized).toBe('#');
  });

  it('应该保留合法的 HTTP/HTTPS URL', () => {
    const validUrls = [
      'https://example.com',
      'http://example.com/path',
      'https://example.com?param=value',
    ];

    validUrls.forEach((url) => {
      expect(sanitizeURL(url)).toBe(url);
    });
  });

  it('应该保留相对 URL', () => {
    const relativeUrls = ['/path', '../path', '#anchor'];

    relativeUrls.forEach((url) => {
      expect(sanitizeURL(url)).toBe(url);
    });
  });
});

// ============================================================================
// CSS 安全性测试
// ============================================================================

describe('CSS 安全性', () => {
  const sanitizeCSS = (css: string): string => {
    // 移除 javascript: 表达式
    let sanitized = css.replace(/expression\s*\(.*?\)/gi, '');

    // 移除 url(javascript:)
    sanitized = sanitized.replace(/url\s*\(\s*["']?javascript:/gi, 'url("data:text/plain,"');

    // 移除 @import with javascript:
    sanitized = sanitized.replace(/@import\s+["']?javascript:/gi, '@import "data:text/plain,"');

    return sanitized;
  };

  it('应该移除 CSS 表达式', () => {
    const malicious = 'width: expression(alert(1))';
    const sanitized = sanitizeCSS(malicious);

    expect(sanitized).not.toContain('expression(');
    expect(sanitized).not.toContain('alert(1)');
  });

  it('应该移除 url(javascript:)', () => {
    const malicious = 'background: url(javascript:alert(1))';
    const sanitized = sanitizeCSS(malicious);

    expect(sanitized.toLowerCase()).not.toContain('javascript:');
  });

  it('应该移除 @import javascript:', () => {
    const malicious = '@import "javascript:alert(1)"';
    const sanitized = sanitizeCSS(malicious);

    expect(sanitized.toLowerCase()).not.toContain('javascript:');
  });

  it('应该保留合法的 CSS', () => {
    const validCSS = 'color: red; font-size: 14px;';
    const sanitized = sanitizeCSS(validCSS);

    expect(sanitized).toBe(validCSS);
  });
});

// ============================================================================
// CSP (Content Security Policy) 测试
// ============================================================================

describe('Content Security Policy', () => {
  const validateCSP = (csp: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // 检查是否有 default-src
    if (!csp.includes('default-src')) {
      errors.push('缺少 default-src 指令');
    }

    // 检查是否禁用了 unsafe-inline
    if (csp.includes("script-src 'unsafe-inline'")) {
      errors.push('script-src 包含 unsafe-inline，存在 XSS 风险');
    }

    // 检查是否禁用了 unsafe-eval
    if (csp.includes("'unsafe-eval'")) {
      errors.push('包含 unsafe-eval，存在代码注入风险');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  it('应该接受安全的 CSP 策略', () => {
    const safeCSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'";
    const result = validateCSP(safeCSP);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('应该拒绝缺少 default-src 的策略', () => {
    const invalidCSP = "script-src 'self'; style-src 'self'";
    const result = validateCSP(invalidCSP);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('缺少 default-src 指令');
  });

  it('应该警告 unsafe-inline 的使用', () => {
    const riskyCSP = "default-src 'self'; script-src 'self' 'unsafe-inline'";
    const result = validateCSP(riskyCSP);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("script-src 包含 unsafe-inline，存在 XSS 风险");
  });

  it('应该警告 unsafe-eval 的使用', () => {
    const riskyCSP = "default-src 'self'; script-src 'self' 'unsafe-eval'";
    const result = validateCSP(riskyCSP);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('包含 unsafe-eval，存在代码注入风险');
  });
});

// ============================================================================
// 输入输出编码测试
// ============================================================================

describe('输入输出编码', () => {
  const encodeHTML = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  };

  const encodeJS = (str: string): string => {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\f/g, '\\f');
  };

  describe('HTML 编码', () => {
    it('应该编码 HTML 特殊字符', () => {
      const input = '<script>alert("XSS")</script>';
      const encoded = encodeHTML(input);

      expect(encoded).toContain('&lt;script&gt;');
      expect(encoded).toContain('&quot;');
      expect(encoded).not.toContain('<script>');
    });

    it('应该编码 & 符号', () => {
      const input = 'Tom & Jerry';
      const encoded = encodeHTML(input);

      expect(encoded).toBe('Tom &amp; Jerry');
    });

    it('应该编码引号', () => {
      const input = '"Hello" \'World\'';
      const encoded = encodeHTML(input);

      expect(encoded).toContain('&quot;');
      expect(encoded).toContain('&#x27;');
    });
  });

  describe('JavaScript 编码', () => {
    it('应该编码特殊字符用于 JavaScript 字符串', () => {
      const input = "It's a \"test\"";
      const encoded = encodeJS(input);

      const expected = String.raw`It\'s a \"test\"`;
      expect(encoded).toBe(expected);
    });

    it('应该编码换行符', () => {
      const input = 'Line 1\nLine 2';
      const encoded = encodeJS(input);

      expect(encoded).toBe('Line 1\\nLine 2');
    });

    it('应该编码反斜杠', () => {
      const input = 'path\\to\\file';
      const encoded = encodeJS(input);

      expect(encoded).toBe('path\\\\to\\\\file');
    });
  });
});
