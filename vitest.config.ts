/**
 * Vitest 测试配置
 * ExcelMind AI - 自动化测试框架配置
 *
 * 优势:
 * - 原生支持 ESM
 * - 与 Vite 完美集成
 * - 更快的测试执行速度
 * - 更好的 TypeScript 支持
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()] as any,
  test: {
    // 全局配置
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      './tests/setup.vitest.ts',
      './tests/mocks/indexedDB.ts'  // 添加IndexedDB mock
    ],

    // 测试文件匹配模式
    include: [
      'services/**/__tests__/**/*.test.ts',
      'services/**/*.{test,test.*}.{ts,tsx}',
      'components/**/__tests__/**/*.test.tsx',
      'components/**/*.{test,test.*}.{ts,tsx}',
      'packages/**/__tests__/**/*.test.ts',
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],

    // 排除文件
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.git',
      '.cache',
    ],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.config.ts',
        '**/*.config.js',
        '**/*.demo.ts',
        '**/*.example.ts',
        '**/index.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },

    // 测试超时
    testTimeout: 10000,
    hookTimeout: 10000,

    // 并行执行
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      }
    },

    // 隔离
    isolate: true,

    // 报告器
    reporters: ['verbose', 'json'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@services': path.resolve(__dirname, 'services'),
      '@components': path.resolve(__dirname, 'components'),
      '@types': path.resolve(__dirname, 'types'),
      '@utils': path.resolve(__dirname, 'utils'),
      '@config': path.resolve(__dirname, 'config'),
      '@tests': path.resolve(__dirname, 'tests'),
    },
  },
});
