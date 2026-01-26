/**
 * 错误边界测试页面
 *
 * 访问此页面以测试错误边界的各种功能
 */

import React from 'react';
import { ErrorBoundaryTest } from '../components/ErrorBoundaryExample';

const ErrorTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <ErrorBoundaryTest />
    </div>
  );
};

export default ErrorTestPage;
