import React, { useState } from 'react';
import { FunctionSquare } from 'lucide-react';
import FormulaGen from '../FormulaGen';
// import KnowledgeChat from '../KnowledgeChat'; // Moved to standalone view

const AITools: React.FC = () => {
    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <FunctionSquare className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            Excel 公式生成器
                        </h2>
                        <p className="text-sm text-slate-500">
                            描述您的逻辑，AI 自动为您生成复杂的 Excel 公式
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                    <FormulaGen />
                </div>
            </div>
        </div>
    );
};

export default AITools;
