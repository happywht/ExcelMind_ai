import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { AppView } from './types';
import { Activity, Zap, ShieldCheck, FileEdit, Package, FolderOpen, CheckCircle } from 'lucide-react';

// 🔧 开发模式：暴露Zustand Store用于调试
if (import.meta.env.DEV) {
  import('./stores/documentSpaceStore').then(({ useDocumentSpaceStore }) => {
    (window as any).__ZUSTAND_STORE__ = useDocumentSpaceStore;
    console.log('✅ Zustand Store 已暴露到 window.__ZUSTAND_STORE__');
  });
}

// ✨ 懒加载核心功能组件
const SmartExcel = lazy(() => import('./components/SmartExcel'));
const FormulaGen = lazy(() => import('./components/FormulaGen'));
const KnowledgeChat = lazy(() => import('./components/KnowledgeChat'));

// DocumentSpace - 文档空间组件
const DocumentSpace = lazy(() => import('./components/DocumentSpace').then(module => ({ default: module.DocumentSpace })));

// ✨ 懒加载新增功能组件
const TaskListV2 = lazy(() => import('./components/BatchGeneration/TaskList'));
const TemplateList = lazy(() => import('./components/TemplateManagement/TemplateList'));
const TemplateEditor = lazy(() => import('./components/TemplateManagement/TemplateEditor'));
const DataQualityDashboard = lazy(() => import('./components/DataQuality/DataQualityDashboard'));

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

    {/* 7个功能卡片 - 使用优化的FeatureCard组件 */}
    <FeatureCardGrid>
      {/* 原有4个功能卡片 */}
      <FeatureCard
        title="智能处理"
        description="使用自然语言指令自动过滤、排序和转换您的 Excel 文件。"
        icon="Zap"
        color="emerald"
        status="hot"
        shortcut="1"
        onClick={() => setView(AppView.SMART_OPS)}
      />

      <FeatureCard
        title="公式生成器"
        description="无需手动搜索。只需描述您的逻辑，即可一键复制生成的 Excel 公式。"
        icon="Activity"
        color="blue"
        shortcut="2"
        onClick={() => setView(AppView.FORMULA)}
      />

      <FeatureCard
        title="审计助手"
        description="上传审计准则或财务政策文件，与您的专属知识库进行对话问答。"
        icon="ShieldCheck"
        color="purple"
        shortcut="3"
        onClick={() => setView(AppView.KNOWLEDGE_CHAT)}
      />

      <FeatureCard
        title="文档空间"
        description="智能填充Word模板，结合Excel数据和AI理解，批量生成文档。"
        icon="FileEdit"
        color="orange"
        status="new"
        shortcut="4"
        onClick={() => setView(AppView.DOCUMENT_SPACE)}
      />

      {/* 新增3个功能卡片 */}
      <FeatureCard
        title="批量生成"
        description="批量处理文档生成任务，支持并发生成和实时进度跟踪。"
        icon="Package"
        color="cyan"
        status="new"
        shortcut="5"
        onClick={() => setView(AppView.BATCH_GENERATION)}
      />

      <FeatureCard
        title="模板管理"
        description="管理和编辑Word模板，支持变量映射和模板预览。"
        icon="FolderOpen"
        color="pink"
        status="new"
        shortcut="6"
        onClick={() => setView(AppView.TEMPLATE_MANAGEMENT)}
      />

      <FeatureCard
        title="数据质量"
        description="智能数据质量检查，自动识别数据异常并提供清洗建议。"
        icon="CheckCircle"
        color="amber"
        status="new"
        shortcut="7"
        onClick={() => setView(AppView.DATA_QUALITY)}
      />
    </FeatureCardGrid>
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

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
      case AppView.FORMULA:
        return <FormulaGen />;
      case AppView.KNOWLEDGE_CHAT:
        return <KnowledgeChat />;
      case AppView.DOCUMENT_SPACE:
        return <DocumentSpace />;
      // 新增功能路由
      case AppView.BATCH_GENERATION:
        return (
          <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">批量文档生成</h1>
            <TaskListV2 />
          </div>
        );
      case AppView.TEMPLATE_MANAGEMENT:
        return (
          <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">模板管理</h1>
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <TemplateList onSelectTemplate={(templateId) => logger.debug('Selected template:', { templateId })} />
              </div>
              <div>
                <TemplateEditor />
              </div>
            </div>
          </div>
        );
      case AppView.DATA_QUALITY:
        return (
          <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">数据质量分析</h1>
            <DataQualityDashboard />
          </div>
        );
      default:
        return <Dashboard setView={setCurrentView} />;
    }
  };

  return (
    <ErrorBoundary
      onError={handleError}
      showDetails={import.meta.env.DEV} // 开发环境显示错误详情
    >
      <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
        <Sidebar currentView={currentView} setView={setCurrentView} />
        <main className="flex-1 h-full overflow-hidden relative">
          {/* ✨ 使用Suspense包裹懒加载组件 */}
          <LazyLoadErrorBoundary>
            <Suspense fallback={<LoadingFallback message="加载功能模块中..." />}>
              {renderView()}
            </Suspense>
          </LazyLoadErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
