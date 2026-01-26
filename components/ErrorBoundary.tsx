/**
 * ErrorBoundary - React 错误边界组件
 *
 * 捕获组件树中的JavaScript错误，防止整个应用崩溃
 * 提供友好的错误提示界面和恢复机制
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';
import { logError } from '../services/errorLoggingService';
import { logger } from '@/utils/logger';

/**
 * ErrorBoundary 的 Props 接口
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  /** 自定义错误回退组件 */
  fallback?: React.ComponentType<ErrorFallbackProps>;
  /** 错误回调函数 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 是否显示错误详情（开发者模式） */
  showDetails?: boolean;
  /** 自定义错误日志记录器 */
  errorLogger?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * ErrorFallback 组件的 Props 接口
 */
export interface ErrorFallbackProps {
  error: Error;
  errorInfo?: ErrorInfo;
  retry: () => void;
  resetError: () => void;
  showDetails?: boolean;
}

/**
 * ErrorBoundary 的 State 接口
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary 组件
 *
 * 使用 Class 组件实现，因为需要使用 React 的错误边界生命周期方法
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * 在渲染阶段捕获错误
   * 更新 state 触发重新渲染显示错误界面
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * 在提交阶段捕获错误信息
   * 用于记录错误日志
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 更新 state 保存错误信息
    this.setState({
      errorInfo,
    });

    // 记录错误日志
    try {
      if (this.props.errorLogger) {
        this.props.errorLogger(error, errorInfo);
      } else {
        logError(error, {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (loggingError) {
      // 如果日志记录失败，至少在控制台输出
      logger.error('Failed to log error:', loggingError);
      logger.error('Original error:', error, errorInfo);
    }

    // 调用自定义错误回调
    this.props.onError?.(error, errorInfo);
  }

  /**
   * 重试处理 - 重新渲染子组件
   */
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * 完全重置 - 刷新页面
   */
  handleReset = (): void => {
    // 清除状态
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // 刷新页面
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback: FallbackComponent, showDetails = true } = this.props;

    if (hasError && error) {
      // 使用自定义或默认的错误回退组件
      const ErrorFallbackComponent = FallbackComponent || ErrorFallback;

      return (
        <ErrorFallbackComponent
          error={error}
          errorInfo={errorInfo || undefined}
          retry={this.handleRetry}
          resetError={this.handleReset}
          showDetails={showDetails}
        />
      );
    }

    return children;
  }
}

/**
 * 函数式错误边界 Hook（用于特定场景）
 * 注意：真正的错误边界必须使用 Class 组件
 * 这个 Hook 主要用于辅助错误处理
 */
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}

export default ErrorBoundary;
