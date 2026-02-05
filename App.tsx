import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { AppView } from './types';
import { Activity, Zap, ShieldCheck, FileEdit, Package, FolderOpen, CheckCircle } from 'lucide-react';

// ✨ 懒加载核心功能组件
// ✨ 懒加载核心功能组件
const SmartExcel = lazy(() => import('./components/SmartExcel'));
const DocumentSpace = lazy(() => import('./components/DocumentSpace/index'));
const AITools = lazy(() => import('./components/AITools'));

// ✨ 懒加载新增功能组件
const KnowledgeChat = lazy(() => import('./components/KnowledgeChat'));
// const TemplateList = lazy(() => import('./components/TemplateManagement/TemplateList')); // Deprecated
// const TemplateEditor = lazy(() => import('./components/TemplateManagement/TemplateEditor')); // Deprecated

// 导入优化的UI组件
import { FeatureCard, FeatureCardGrid } from './components/FeatureCard';

// 导入错误边界
import ErrorBoundary from './components/ErrorBoundary';
import LazyLoadErrorBoundary from './components/LazyLoadErrorBoundary';

// 导入加载状态组件
import LoadingFallback from './components/LoadingFallback';

// 导入全局错误处理
import { startGlobalErrorHandlers } from './utils/globalErrorHandlers';

// 导入统一日志系统
import { logger } from './utils/logger';

// 导入预加载工具
import { preloadModules } from './utils/lazyImports';

const Dashboard: React.FC<{ setView: (v: AppView) => void }> = ({ setView }) => (
  <div className="p-8 max-w-7xl mx-auto">
    <div className="mb-10">
      <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">欢迎使用 ExcelMind AI</h1>
      <p className="text-xl text-slate-500">您的智能数据处理、财务与审计助手。</p>
    </div>

    <FeatureCardGrid>
      {/* 1. 数据清洗与转换 */}
      <FeatureCard
        title="数据工坊"
        description="导入 Excel 数据，使用自然语言或质量规则进行清洗、转换和预处理。"
        icon="FileSpreadsheet"
        color="emerald"
        status="hot"
        shortcut="1"
        onClick={() => setView(AppView.SMART_OPS)}
      />

      {/* 2. 文档批量生成 */}
      <FeatureCard
        title="文档生成"
        description="基于 Excel 数据和 Word 模板，批量生成合同、报告或通知单。"
        icon="FileEdit"
        color="orange"
        status="new"
        shortcut="2"
        onClick={() => setView(AppView.DOCUMENT_SPACE)}
      />

      {/* 3. 审计助手 (新独立) */}
      <FeatureCard
        title="审计助手"
        description="上传审计准则或财务政策文件，与您的专属知识库进行对话问答。"
        icon="Bot"
        color="pink" // Changed from purple to pink/distinct
        status="hot"
        shortcut="3"
        onClick={() => setView(AppView.AUDIT_ASSISTANT)}
      />

      {/* 4. 公式生成器 (原AI工具箱) */}
      <FeatureCard
        title="公式生成器"
        description="无需手动搜索。只需描述您的逻辑，即可一键复制生成的 Excel 公式。"
        icon="FunctionSquare"
        color="purple"
        shortcut="4"
        onClick={() => setView(AppView.AI_TOOLS)}
      />
    </FeatureCardGrid>
  </div>
);



// import { templateAPI } from './services/templateAPI'; // Deprecated
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';

const AppContent: React.FC = () => {
  const { currentView, setView, setTemplate, setExcelData } = useWorkspace();

  // 启动全局错误处理
  useEffect(() => {
    startGlobalErrorHandlers({
      showAlert: false, // 生产环境不显示原生alert
      devMode: import.meta.env.DEV, // 开发模式显示详细错误
    });

    // 预加载常用模块（在浏览器空闲时）
    preloadModules();
  }, []);

  /**
   * 错误处理回调
   */
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // 可以在这里添加额外的错误处理逻辑
    // 例如：发送到监控服务、显示通知等
    logger.error('Application error:', { error, errorInfo });
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.SMART_OPS:
        return <SmartExcel />;
      case AppView.AI_TOOLS:
        return <AITools />; // Will be refactored to just FormulaGen
      case AppView.AUDIT_ASSISTANT: // 新增
        return (
          <div className="h-full p-4">
            <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <KnowledgeChat />
            </div>
          </div>
        );
      case AppView.DOCUMENT_SPACE:
        return <DocumentSpace />;
      /* Deprecated
      case AppView.TEMPLATE_MANAGEMENT:
        return (...)
      */
      default:
        return <Dashboard setView={setView} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Sidebar currentView={currentView} setView={setView} />
      <main className="flex-1 h-full overflow-hidden relative">
        {/* ✨ 使用Suspense包裹懒加载组件 */}
        <LazyLoadErrorBoundary>
          <Suspense fallback={<LoadingFallback message="加载功能模块中..." />}>
            {renderView()}
          </Suspense>
        </LazyLoadErrorBoundary>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary
      showDetails={import.meta.env.DEV}
    >
      <WorkspaceProvider>
        <AppContent />
      </WorkspaceProvider>
    </ErrorBoundary>
  );
};

export default App;
