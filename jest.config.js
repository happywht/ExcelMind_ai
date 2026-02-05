/**
 * Jest 测试配置
 * ExcelMind AI - 自动化测试框架配置
 *
 * 修复版本 v2:
 * - 解决 ESM 模块兼容性问题
 * - 修复 Babel 依赖问题
 * - 优化测试环境配置
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  // 编译器预设
  preset: 'ts-jest',
  testEnvironment: 'node',

  // ESM 模式配置
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          module: 'ESNext',
          moduleResolution: 'bundler',
        },
      },
    ],
  },

  // 测试环境配置（用于 React 组件测试的项目配置）
  projects: [
    {
      displayName: 'services',
      testEnvironment: 'node',
      roots: ['<rootDir>/src/services', '<rootDir>/tests'],
      collectCoverageFrom: [
        'src/services/**/*.{ts,tsx}',
        '!src/services/**/*.d.ts',
        '!src/services/**/*.test.ts',
        '!src/services/**/*.spec.ts',
        '!src/services/**/*.demo.ts',
        '!src/services/**/*.example.ts',
        '!src/services/**/index.ts'
      ],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src/components'],
      testMatch: [
        '**/__tests__/**/*.test.tsx',
        '**/__tests__/**/*.test.ts',
        '**/?(*.)+(spec|test).tsx'
      ],
      collectCoverageFrom: [
        'src/components/**/*.{ts,tsx}',
        '!src/components/**/*.d.ts',
        '!src/components/**/*.test.ts',
        '!src/components/**/*.test.tsx',
        '!src/components/**/*.spec.ts',
        '!src/components/**/*.spec.tsx',
        '!src/components/**/index.ts'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.test.ts'],
      // ...
      // 覆盖率配置（全局默认）
      collectCoverageFrom: [
        'src/services/**/*.{ts,tsx}',
        'src/components/**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/*.test.ts',
        '!**/*.test.tsx',
        '!**/*.spec.ts',
        '!**/*.spec.tsx',
        '!**/*.demo.ts',
        '!**/*.example.ts',
        '!**/index.ts'
      ],

      // 覆盖率输出目录
      coverageDirectory: '<rootDir>/coverage',

      // 模块路径映射
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
        '^@shared-types/(.*)$': '<rootDir>/packages/shared-types/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },

      // 全局设置文件
      setupFilesAfterEnv: ['<rootDir>/src/jest-setup.ts'],

      // 测试超时时间
      testTimeout: 10000,

      // 并行执行
      maxWorkers: '50%',

      // 详细输出
      verbose: true,

      // 清除模拟
      clearMocks: true,
      resetMocks: true,
      restoreMocks: true,

      // 忽略转换的文件
      transformIgnorePatterns: [
        'node_modules/(?!(alasql|@anthropic-ai/sdk|@testing-library|dom-accessibility-api)/)'
      ]
    };
