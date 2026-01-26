/**
 * 错误边界测试组件
 *
 * 用于测试和演示错误边界功能
 */

import React, { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { AlertTriangle, Bug, RefreshCw } from 'lucide-react';

/**
 * 抛出同步错误的组件
 */
function ThrowSyncError() {
  throw new Error('这是一个测试用的同步错误');
}

/**
 * 测试组件
 */
export const ErrorBoundaryTest: React.FC = () => {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [testType, setTestType] = useState<'sync' | 'async' | 'global'>('sync');

  /**
   * 触发同步错误
   */
  const triggerSyncError = () => {
    setShouldThrow(true);
  };

  /**
   * 触发异步错误
   */
  const triggerAsyncError = () => {
    // Promise rejection（会被全局错误处理器捕获）
    Promise.reject(new Error('这是一个测试用的 Promise rejection'));
    alert('已触发 Promise rejection，请查看控制台和错误日志');
  };

  /**
   * 触发全局错误
   */
  const triggerGlobalError = () => {
    // setTimeout 中的错误（会被全局错误处理器捕获）
    setTimeout(() => {
      throw new Error('这是一个测试用的全局错误');
    }, 100);
    alert('已触发全局错误，请查看控制台和错误日志');
  };

  /**
   * 重置测试状态
   */
  const resetTest = () => {
    setShouldThrow(false);
    setTestType('sync');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">错误边界测试</h1>
        <p className="text-slate-600">测试和演示错误边界的各种功能</p>
      </div>

      {/* 测试控制面板 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Bug className="w-5 h-5" />
          测试控制面板
        </h2>

        <div className="space-y-4">
          {/* 测试类型选择 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              选择测试类型
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setTestType('sync');
                  setShouldThrow(false);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  testType === 'sync'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                同步错误
              </button>
              <button
                onClick={() => setTestType('async')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  testType === 'async'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                异步错误
              </button>
              <button
                onClick={() => setTestType('global')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  testType === 'global'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                全局错误
              </button>
            </div>
          </div>

          {/* 测试说明 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-900 mb-1">测试说明</p>
                <ul className="text-sm text-amber-800 space-y-1">
                  {testType === 'sync' && (
                    <>
                      <li>• 同步错误会被 ErrorBoundary 捕获</li>
                      <li>• 会显示友好的错误回退界面</li>
                      <li>• 可以点击"重试操作"恢复</li>
                    </>
                  )}
                  {testType === 'async' && (
                    <>
                      <li>• 异步错误会被全局错误处理器捕获</li>
                      <li>• 错误会记录到本地存储</li>
                      <li>• 不会显示错误回退界面</li>
                    </>
                  )}
                  {testType === 'global' && (
                    <>
                      <li>• 全局错误会被全局错误处理器捕获</li>
                      <li>• 错误会记录到控制台和本地存储</li>
                      <li>• 不会导致应用崩溃</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* 触发按钮 */}
          <div className="flex flex-wrap gap-3">
            {testType === 'sync' && (
              <button
                onClick={triggerSyncError}
                disabled={shouldThrow}
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AlertTriangle className="w-5 h-5" />
                触发同步错误
              </button>
            )}

            {testType === 'async' && (
              <button
                onClick={triggerAsyncError}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                <AlertTriangle className="w-5 h-5" />
                触发异步错误
              </button>
            )}

            {testType === 'global' && (
              <button
                onClick={triggerGlobalError}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
              >
                <AlertTriangle className="w-5 h-5" />
                触发全局错误
              </button>
            )}

            <button
              onClick={resetTest}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              重置测试
            </button>
          </div>
        </div>
      </div>

      {/* 错误边界测试区域 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">错误边界测试区域</h2>

        <ErrorBoundary key={shouldThrow ? 'error' : 'normal'}>
          {shouldThrow && testType === 'sync' ? (
            <ThrowSyncError />
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-600">一切正常！点击上方按钮触发错误</p>
            </div>
          )}
        </ErrorBoundary>
      </div>

      {/* 使用说明 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">使用说明</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>选择测试类型（同步/异步/全局错误）</li>
          <li>点击对应的触发按钮</li>
          <li>观察错误界面的显示和错误日志的记录</li>
          <li>使用"重试操作"或"刷新页面"恢复</li>
          <li>打开浏览器控制台查看详细的错误日志</li>
          <li>在控制台执行 <code className="bg-blue-100 px-1 rounded">JSON.parse(localStorage.getItem('errordetails'))</code> 查看存储的错误日志</li>
        </ol>
      </div>
    </div>
  );
};

export default ErrorBoundaryTest;
