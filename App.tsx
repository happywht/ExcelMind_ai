import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { FormulaGen } from './components/FormulaGen';
import { SmartExcel } from './components/SmartExcel';
import { KnowledgeChat } from './components/KnowledgeChat';
import { DocumentSpace } from './components/DocumentSpace/index';
import { AppView } from './types';
import { Activity, Zap, ShieldCheck, FileEdit } from 'lucide-react';

const Dashboard: React.FC<{ setView: (v: AppView) => void }> = ({ setView }) => (
  <div className="p-8 max-w-6xl mx-auto">
    <div className="mb-10">
      <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">欢迎使用 ExcelMind AI</h1>
      <p className="text-xl text-slate-500">您的智能数据处理、财务与审计助手。</p>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        onClick={() => setView(AppView.SMART_OPS)}
        className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-emerald-500/30 transition-all cursor-pointer relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-24 bg-gradient-to-br from-emerald-50 to-transparent rounded-full -mr-12 -mt-12 group-hover:from-emerald-100 transition-colors"></div>
        <Zap className="w-10 h-10 text-emerald-500 mb-4 relative z-10" />
        <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">智能处理</h3>
        <p className="text-slate-500 relative z-10">使用自然语言指令自动过滤、排序和转换您的 Excel 文件。</p>
      </div>

      <div
        onClick={() => setView(AppView.FORMULA)}
        className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-500/30 transition-all cursor-pointer relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-24 bg-gradient-to-br from-blue-50 to-transparent rounded-full -mr-12 -mt-12 group-hover:from-blue-100 transition-colors"></div>
        <Activity className="w-10 h-10 text-blue-500 mb-4 relative z-10" />
        <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">公式生成器</h3>
        <p className="text-slate-500 relative z-10">无需手动搜索。只需描述您的逻辑，即可一键复制生成的 Excel 公式。</p>
      </div>

      <div
        onClick={() => setView(AppView.KNOWLEDGE_CHAT)}
        className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-purple-500/30 transition-all cursor-pointer relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-24 bg-gradient-to-br from-purple-50 to-transparent rounded-full -mr-12 -mt-12 group-hover:from-purple-100 transition-colors"></div>
        <ShieldCheck className="w-10 h-10 text-purple-500 mb-4 relative z-10" />
        <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">审计助手</h3>
        <p className="text-slate-500 relative z-10">上传审计准则或财务政策文件，与您的专属知识库进行对话问答。</p>
      </div>

      <div
        onClick={() => setView(AppView.DOCUMENT_SPACE)}
        className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-orange-500/30 transition-all cursor-pointer relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-24 bg-gradient-to-br from-orange-50 to-transparent rounded-full -mr-12 -mt-12 group-hover:from-orange-100 transition-colors"></div>
        <FileEdit className="w-10 h-10 text-orange-500 mb-4 relative z-10" />
        <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">文档空间</h3>
        <p className="text-slate-500 relative z-10">智能填充Word模板，结合Excel数据和AI理解，批量生成文档。</p>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

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
      default:
        return <Dashboard setView={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      <main className="flex-1 h-full overflow-hidden relative">
        {renderView()}
      </main>
    </div>
  );
};

export default App;