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
      roots: ['<rootDir>/services', '<rootDir>/tests'],
      testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/?(*.)+(spec|test).ts'
      ],
      collectCoverageFrom: [
        'services/**/*.{ts,tsx}',
        '!services/**/*.d.ts',
        '!services/**/*.test.ts',
        '!services/**/*.spec.ts',
        '!services/**/*.demo.ts',
        '!services/**/*.example.ts',
        '!services/**/index.ts'
      ],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: {
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
            },
          },
        ],
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/components'],
      testMatch: [
        '**/__tests__/**/*.test.tsx',
        '**/__tests__/**/*.test.ts',
        '**/?(*.)+(spec|test).tsx'
      ],
      collectCoverageFrom: [
        'components/**/*.{ts,tsx}',
        '!components/**/*.d.ts',
        '!components/**/*.test.ts',
        '!components/**/*.test.tsx',
        '!components/**/*.spec.ts',
        '!components/**/*.spec.tsx',
        '!components/**/index.ts'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@services/(.*)$': '<rootDir>/services/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.test.ts'],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: {
              jsx: 'react-jsx',
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
            },
          },
        ],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@testing-library|dom-accessibility-api)/)',
      ],
    }
  ],

  // 覆盖率配置（全局默认）
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.test.ts',
    '!**/*.test.tsx',
    '!**/*.spec.ts',
    '!**/*.spec.tsx',
    '!**/*.demo.ts',
    '!**/*.example.ts',
    '!**/index.ts'
  ],

  // 覆盖率阈值目标（Week 1要求）
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },

  // 覆盖率报告格式
  coverageReporters: [
    'json',
    'lcov',
    'text',
    'text-summary',
    'html'
  ],

  // 覆盖率输出目录
  coverageDirectory: '<rootDir>/coverage',

  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@shared-types/(.*)$': '<rootDir>/packages/shared-types/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // 全局设置文件
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],

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
