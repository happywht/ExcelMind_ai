/**
 * ErrorFallback - 错误回退UI组件
 *
 * 当应用发生错误时显示友好的错误提示界面
 * 提供重试、刷新页面等恢复机制
 */

import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Home, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { ErrorFallbackProps } from './ErrorBoundary';
import { colors } from '../tokens/design-tokens';
import { logger } from '@/utils/logger';

/**
 * ErrorFallback 组件
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  retry,
  resetError,
  showDetails = true,
}) => {
  const [showDetailsExpanded, setShowDetailsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * 复制错误信息到剪贴板
   */
  const copyErrorDetails = async (): Promise<void> => {
    const errorText = `
错误信息: ${error.message}
错误堆栈:
${error.stack}

${errorInfo ? `组件堆栈:\n${errorInfo.componentStack}` : ''}
时间: ${new Date().toLocaleString('zh-CN')}
页面URL: ${window.location.href}
用户代理: ${navigator.userAgent}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy error details:', err);
    }
  };

  /**
   * 返回主页
   */
  const goHome = (): void => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* 主错误卡片 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 顶部装饰条 */}
          <div className="h-2 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />

          {/* 内容区域 */}
          <div className="p-8">
            {/* 错误图标和标题 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">哎呀，出错了！</h1>
                <p className="text-slate-500 mt-1">应用遇到了意外错误，但别担心，我们有办法解决</p>
              </div>
            </div>

            {/* 错误描述 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-amber-900 font-medium mb-1">错误详情</p>
                  <p className="text-amber-800 text-sm">{error.message || '未知错误'}</p>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={retry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                重试操作
              </button>

              <button
                onClick={resetError}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                刷新页面
              </button>

              <button
                onClick={goHome}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors duration-200"
              >
                <Home className="w-4 h-4" />
                返回主页
              </button>
            </div>

            {/* 错误详情（可展开） */}
            {showDetails && errorInfo && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowDetailsExpanded(!showDetailsExpanded)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors duration-200"
                >
                  <span className="font-medium text-slate-700">技术详情</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyErrorDetails();
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded transition-colors duration-200"
                      title="复制错误信息"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          复制
                        </>
                      )}
                    </button>
                    {showDetailsExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {showDetailsExpanded && (
                  <div className="p-4 bg-slate-900 overflow-x-auto">
                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                      <code>
{`错误信息: ${error.message}

错误堆栈:
${error.stack}

${errorInfo.componentStack ? `组件堆栈:\n${errorInfo.componentStack}` : ''}

时间: ${new Date().toLocaleString('zh-CN')}
页面URL: ${window.location.href}
用户代理: ${navigator.userAgent}`}
                      </code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部提示 */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-200">
            <p className="text-sm text-slate-600 text-center">
              如果问题持续存在，请尝试{' '}
              <button
                onClick={copyErrorDetails}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                复制错误信息
              </button>{' '}
              并联系技术支持
            </p>
          </div>
        </div>

        {/* 额外提示 */}
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-500">
            错误已自动记录，我们会持续改进产品体验
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
