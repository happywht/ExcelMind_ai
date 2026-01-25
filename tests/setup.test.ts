/**
 * React 组件测试环境设置
 *
 * 为 React Testing Library 和 Jest 配置测试环境
 */

// 导入 @testing-library/jest-dom 的自定义匹配器
import '@testing-library/jest-dom';

// 模拟 window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// 模拟 IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// 模拟 ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// 模拟 requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 0) as unknown as number;
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// 模拟 URL.createObjectURL 和 URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// 模拟 HTMLCanvasElement.prototype.toDataURL
HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock');

// 模拟 XMLSerializer (用于 RelationshipGraph 组件的导出功能)
global.XMLSerializer = class MockXMLSerializer {
  serializeToString(node: any): string {
    return '<svg>mock-svg</svg>';
  }
} as any;

// 模拟 btoa 和 unescape (用于图片导出)
global.btoa = jest.fn((str: string) => 'base64-encoded-string');
global.unescape = jest.fn((str: string) => str);

// 清除文档在每个测试后
afterEach(() => {
  document.body.innerHTML = '';
});

console.log('✅ React 组件测试环境初始化完成');
