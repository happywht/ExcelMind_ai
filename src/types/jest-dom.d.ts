/**
 * Jest DOM 类型扩展
 * 修复 @testing-library/jest-dom 类型定义问题
 */

import { Matchers } from '@jest/expect';

declare module '@jest/expect' {
  interface Matchers<R = any> {
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
    toBeChecked(): R;
    toHavePartiallyCheckedContent(content: string | RegExp): R;
    toHaveErrorMessage(content: string | RegExp): R;
    toBeRequired(): R;
    toBeInvalid(): R;
    toBeValid(): R;
    toHaveRole(role: string, options?: any): R;
    toHaveAccessibleName(name: string | RegExp): R;
    toBeFocusable(): R;
  }
}

export {};
