import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 懒加载错误边界
 * 专门处理组件懒加载失败的情况
 */
class LazyLoadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Lazy load error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center h-screen bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center space-y-6">
            {/* 错误图标 */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            {/* 错误标题 */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">加载失败</h2>
              <p className="text-slate-600">
                组件加载失败，可能是网络问题或资源暂时不可用。
              </p>
            </div>

            {/* 错误详情（开发环境） */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-slate-100 rounded-lg p-4 text-left">
                <p className="text-xs font-mono text-slate-700 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* 重试按钮 */}
            <button
              onClick={this.handleRetry}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>重新加载</span>
            </button>

            {/* 额外提示 */}
            <p className="text-xs text-slate-400">
              如果问题持续存在，请检查网络连接或联系技术支持。
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LazyLoadErrorBoundary;
