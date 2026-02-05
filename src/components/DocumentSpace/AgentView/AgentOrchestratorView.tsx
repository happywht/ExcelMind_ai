
import React, { useMemo } from 'react';
import {
    Database,
    ArrowRight,
    FileText,
    Search,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Wand2,
    Plug
} from 'lucide-react';
import { MappingScheme } from '../../../types/documentTypes';
import { analyzeGaps, GapItem, GapStatus } from '../../../services/gapAnalysisService';

interface AgentOrchestratorViewProps {
    mappingScheme: MappingScheme;
    templatePlaceholders: string[];
    excelHeaders: string[]; // Primary Headers
    allSheetsHeaders?: Record<string, string[]>;
    primarySheetData?: any[];
    onAutoFix?: (placeholder: string) => void;
    onSelectGap?: (placeholder: string) => void;
}

const AgentOrchestratorView: React.FC<AgentOrchestratorViewProps> = ({
    mappingScheme,
    templatePlaceholders,
    excelHeaders,
    allSheetsHeaders,
    primarySheetData,
    onAutoFix,
    onSelectGap
}) => {

    // Real-time Gap Analysis
    const gapReport = useMemo(() => {
        return analyzeGaps(
            templatePlaceholders,
            mappingScheme,
            excelHeaders,
            allSheetsHeaders
        );
    }, [templatePlaceholders, mappingScheme, excelHeaders, allSheetsHeaders]);

    // Group items by status
    const validItems = gapReport.items.filter(i => i.status === 'valid');
    const gapItems = gapReport.items.filter(i => i.status !== 'valid');

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-violet-500" />
                        Agent Orchestrator (Data Supply Chain)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Visualize and repair the gap between Data Supply and Template Demand</p>
                </div>

                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-bold">{validItems.length}</span> Connected
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-bold">{gapItems.filter(i => i.status === 'missing_source').length}</span> Missing Source
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-100">
                        <Plug className="w-4 h-4" />
                        <span className="font-bold">{gapItems.filter(i => i.status === 'unmapped').length}</span> Unmapped
                    </div>
                </div>
            </div>

            {/* 3-Column Layout */}
            <div className="flex-1 flex overflow-hidden p-6 gap-6">

                {/* 1. Supply Column (Excel) */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center gap-2">
                        <Database className="w-4 h-4 text-slate-500" />
                        <h3 className="font-bold text-slate-700">Data Supply (Excel)</h3>
                        <span className="ml-auto text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600">
                            {excelHeaders.length} Cols
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {excelHeaders.map(col => (
                            <div key={col} className="p-2 bg-slate-50 border border-slate-100 rounded text-sm text-slate-600 flex items-center gap-2 group hover:border-slate-300 transition-colors cursor-default">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-blue-400"></div>
                                <span className="truncate flex-1">{col}</span>
                                {/* Sample Data Preview */}
                                {primarySheetData && primarySheetData.length > 0 && (
                                    <span className="text-xs text-slate-400 truncate max-w-[80px]">
                                        {sampleValue(primarySheetData[0][col])}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Orchestrator Column (The Pipes) */}
                <div className="w-1/3 flex flex-col gap-4">
                    {/* Gap List */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                            <Plug className="w-4 h-4 text-slate-500" />
                            <h3 className="font-bold text-slate-700">Connections & Gaps</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0">
                            {/* Priority: Show Gaps First */}
                            {gapItems.map(item => (
                                <div
                                    key={item.placeholder}
                                    className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                                    onClick={() => onSelectGap?.(item.placeholder)}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {getStatusIcon(item.status)}
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium text-slate-800 truncate">{item.placeholder}</span>
                                            <span className="text-xs text-slate-400 truncate">{item.details || item.suggestion || 'Unmapped'}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-violet-100 text-violet-600 rounded-md text-xs font-semibold hover:bg-violet-200 transition-all"
                                        onClick={(e) => { e.stopPropagation(); onAutoFix?.(item.placeholder); }}
                                    >
                                        Repair
                                    </button>
                                </div>
                            ))}

                            {/* Connected Items (Success) */}
                            <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                                Active Connections ({validItems.length})
                            </div>
                            {validItems.map(item => (
                                <div key={item.placeholder} className="p-3 border-b border-slate-50 flex items-center justify-between opacity-70 hover:opacity-100">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-slate-700">{item.placeholder}</span>
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <ArrowRight className="w-3 h-3" />
                                                {item.mappedSource}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Demand Column (Word Template) */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <h3 className="font-bold text-slate-700">Template Demand</h3>
                        <span className="ml-auto text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600">
                            {templatePlaceholders.length} Requirements
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {templatePlaceholders.map(ph => {
                            const status = gapReport.items.find(i => i.placeholder === ph)?.status || 'unmapped';
                            return (
                                <div key={ph} className={`p-2 border rounded text-sm flex items-center gap-2 ${status === 'valid'
                                        ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800'
                                        : 'bg-white border-dashed border-slate-300 text-slate-500'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'valid' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                    <span className="font-mono text-xs">{`{{${ph}}}`}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper for data sample
const sampleValue = (val: any) => {
    if (val === undefined || val === null) return '-';
    return String(val);
};

const getStatusIcon = (status: GapStatus) => {
    switch (status) {
        case 'valid': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
        case 'unmapped': return <XCircle className="w-4 h-4 text-red-500" />;
        case 'missing_source': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        default: return <Search className="w-4 h-4 text-slate-400" />;
    }
};

export default AgentOrchestratorView;
