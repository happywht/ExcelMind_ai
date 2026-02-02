/**
 * 可折叠区块组件
 * 
 * 用于优化侧边栏布局,减少垂直空间占用
 * 
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    icon: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
    badge?: number | string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    icon,
    defaultOpen = true,
    children,
    badge
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="space-y-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-slate-50 group border border-transparent hover:border-slate-200"
            >
                <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 text-slate-400 group-hover:text-emerald-500 transition-colors">{icon}</div>
                    <span className="font-semibold text-slate-700 text-sm group-hover:text-slate-900">{title}</span>
                    {badge !== undefined && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-xs font-bold">
                            {badge}
                        </span>
                    )}
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </button>
            {isOpen && (
                <div className="pl-2 animate-fadeIn">
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleSection;
