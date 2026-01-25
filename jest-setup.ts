/**
 * Jest测试环境全局设置
 * 为所有测试文件提供必要的类型扩展和全局变量
 */

// 导入jest-dom以扩展匹配器
import '@testing-library/jest-dom';

// 扩展Expect类型以包含jest-dom匹配器
declare global {
  namespace JestMatchers {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toHaveTextContent(content: string | RegExp): R;
      toHaveAttribute(name: string, value?: any): R;
      toHaveClass(...classNames: string[]): R;
      toHaveStyle(css: Record<string, any>): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeEmpty(): R;
      toContainElement(element: HTMLElement | null): R;
      toHaveFocus(): R;
      toBeInTheDOM(): R;
      toHaveValue(value?: any): R;
    }
  }
}

// 设置全局mock
global.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 0) as unknown as number;
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock');

global.XMLSerializer = class MockXMLSerializer {
  serializeToString(node: any): string {
    return '<svg>mock-svg</svg>';
  }
} as any;

global.btoa = jest.fn((str: string) => 'base64-encoded-string');
global.unescape = jest.fn((str: string) => str);

export {};
