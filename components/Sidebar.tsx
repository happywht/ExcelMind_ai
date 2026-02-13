import {
  LayoutDashboard,
  FileSpreadsheet,
  FunctionSquare,
  MessageSquareText,
  Bot,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  isExpanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isExpanded, setExpanded }) => {
  const menuItems = [
    { id: AppView.DASHBOARD, label: '仪表盘', icon: LayoutDashboard },
    { id: AppView.SMART_OPS, label: '智能处理', icon: FileSpreadsheet },
    { id: AppView.FORMULA, label: '公式生成器', icon: FunctionSquare },
    { id: AppView.KNOWLEDGE_CHAT, label: '审计助手', icon: MessageSquareText },
  ];

  return (
    <div className={`${isExpanded ? 'w-64' : 'w-20'} bg-slate-900 text-white h-screen flex flex-col shadow-xl flex-shrink-0 z-20 transition-all duration-300 ease-in-out relative`}>
      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!isExpanded)}
        className="absolute -right-3 top-20 bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-full shadow-lg border-2 border-slate-900 z-30 transition-colors"
      >
        {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <div className={`p-6 flex items-center gap-3 border-b border-slate-800 overflow-hidden ${isExpanded ? 'justify-start' : 'justify-center'}`}>
        <div className="bg-emerald-500 p-2 rounded-lg flex-shrink-0">
          <Bot className="w-6 h-6 text-white" />
        </div>
        {isExpanded && (
          <div className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
            <h1 className="font-bold text-xl tracking-tight text-white leading-none">ExcelMind</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">AI 数据助手</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                } ${isExpanded ? '' : 'justify-center px-0'}`}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              {isExpanded && (
                <span className="font-semibold text-sm whitespace-nowrap overflow-hidden text-ellipsis animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>
              )}
              {!isExpanded && isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-400 rounded-l-full shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
              )}
            </button>
          );
        })}
      </nav>

      {isExpanded && (
        <div className="p-4 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-slate-800/40 rounded-xl p-4 text-[11px] text-slate-400 border border-slate-700/50">
            <p className="mb-2 font-bold text-slate-300 flex items-center gap-2">
              <Zap className="w-3 h-3 text-emerald-400" />
              使用提示:
            </p>
            <p className="leading-relaxed">在智能处理中尝试“合并这三个表格并生成总计”。</p>
          </div>
        </div>
      )}
    </div>
  );
};
import { Zap } from 'lucide-react';
