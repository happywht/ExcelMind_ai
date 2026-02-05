import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FunctionSquare,
  MessageSquareText,
  Bot,
  FileEdit,
  Package,
  FolderOpen,
  CheckCircle
} from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const menuItems = [
    { id: AppView.DASHBOARD, label: '仪表盘', icon: LayoutDashboard },
    { id: AppView.SMART_OPS, label: '数据工坊', icon: FileSpreadsheet }, // 原智能处理 + 数据质量
    { id: AppView.DOCUMENT_SPACE, label: '文档生成', icon: FileEdit }, // 原文档空间 + 批量生成
    { id: AppView.AUDIT_ASSISTANT, label: '审计助手', icon: Bot }, // 独立出来的审计助手
    { id: AppView.AI_TOOLS, label: '公式生成器', icon: FunctionSquare }, // 原AI工具箱，现仅保留公式
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col shadow-xl flex-shrink-0 z-20">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-emerald-500 p-2 rounded-lg">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tight">ExcelMind</h1>
          <p className="text-xs text-slate-400">AI 数据助手</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400">
          <p className="mb-1 font-semibold text-slate-300">使用帮助:</p>
          如果使用碰到问题，请咨询老王。
        </div>
      </div>
    </div>
  );
};