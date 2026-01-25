/**
 * Tailwind CSS 类名合并工具
 *
 * 使用 clsx 和 tailwind-merge 合并类名
 *
 * @version 2.0.0
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
