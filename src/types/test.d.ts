/**
 * 测试类型定义
 * 扩展Jest和Testing Library的类型以修复类型错误
 */

import '@testing-library/jest-dom';

// 扩展jest.Matchers以包含jest-dom的自定义匹配器
declare global {
  namespace jest {
    interface Matchers<R, T = any> {
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

// 扩展Expect以支持jest-dom
declare global {
  namespace NodeJS {
    interface Global {
      matchMedia: any;
      IntersectionObserver: any;
      ResizeObserver: any;
      requestAnimationFrame: any;
      cancelAnimationFrame: any;
      XMLSerializer: any;
    }
  }
}

// 确保这个文件被视为模块
export {};
