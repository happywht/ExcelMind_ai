/**
 * Vitest 测试环境设置
 * 在所有测试运行前执行的初始化代码
 */

// 导入测试库
import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import '@testing-library/jest-dom';

// 导入 AlaSQL 用于集成测试
import alasql from 'alasql';

// 将 AlaSQL 挂载到全局对象
global.alasql = alasql;

// 模拟浏览器环境
global.performance = {
  ...global.performance,
  now: () => Date.now(),
} as any;

// 模拟 IndexedDB
global.indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  cmp: vi.fn(),
} as any;

// 模拟 localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// 模拟 sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// 模拟 Worker
global.Worker = class Worker {
  onmessage: any;
  onerror: any;
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;

  constructor(url: string) {
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
    this.addEventListener = vi.fn();
    this.removeEventListener = vi.fn();
  }
} as any;

// 模拟 window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
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
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// 模拟 HTMLCanvasElement.prototype.toDataURL
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');

// 模拟 XMLSerializer (用于 RelationshipGraph 组件的导出功能)
global.XMLSerializer = class MockXMLSerializer {
  serializeToString(node: any): string {
    return '<svg>mock-svg</svg>';
  }
} as any;

// 模拟 btoa 和 unescape (用于图片导出)
global.btoa = vi.fn((str: string) => 'base64-encoded-string');
global.unescape = vi.fn((str: string) => str);

// 设置环境变量
process.env.NODE_ENV = 'test';

// 全局测试钩子
beforeAll(() => {
  console.log('🧪 Vitest 测试环境初始化完成');
});

afterAll(() => {
  console.log('✅ 所有测试执行完毕');
});

// 每个测试后清理
afterEach(() => {
  vi.clearAllMocks();
});

// 清除文档在每个测试后
afterEach(() => {
  document.body.innerHTML = '';
});

console.log('✅ Vitest 测试环境设置完成');
