// 导入 AlaSQL 用于集成测试
import alasql from 'alasql';

// 将 AlaSQL 挂载到全局对象
(global as any).alasql = alasql;


/**
 * Jest 测试环境设置
 * 在所有测试运行前执行的初始化代码
 */

// 模拟浏览器环境
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now())
} as any;

// 模拟 IndexedDB
global.indexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
  cmp: jest.fn()
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
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
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
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// 模拟 Worker
global.Worker = class Worker {
  onmessage: any;
  onerror: any;
  postMessage: jest.Mock;
  terminate: jest.Mock;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;

  constructor(url: string) {
    this.postMessage = jest.fn();
    this.terminate = jest.fn();
    this.addEventListener = jest.fn();
    this.removeEventListener = jest.fn();
  }
} as any;

// 设置环境变量
process.env.NODE_ENV = 'test';

// 测试超时配置
jest.setTimeout(10000);

// 全局测试钩子
beforeAll(() => {
  console.log('🧪 测试环境初始化完成');
});

afterAll(() => {
  console.log('✅ 所有测试执行完毕');
});

// 每个测试后清理
afterEach(() => {
  jest.clearAllMocks();
});
