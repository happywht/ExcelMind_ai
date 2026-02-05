
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ExcelData, AppView } from '../types';
import { TemplateFile } from '../types/documentTypes';

// Extend ExcelData to match what's used in SmartExcel if needed, 
// ensuring compatibility with documentTypes.
// For now, we assume documentTypes.ExcelData is the standard.

interface WorkspaceState {
    currentExcelData: ExcelData | null;
    currentTemplate: TemplateFile | null;
    currentView: AppView;
    // New global state for Multi-File Workspace (SmartExcel)
    filesData: ExcelData[];
    activeFileId: string | null;
}

interface WorkspaceContextType extends WorkspaceState {
    setExcelData: (data: ExcelData | null) => void;
    setTemplate: (template: TemplateFile | null) => void;
    setView: (view: AppView) => void;
    clearWorkspace: () => void;

    // File Management Methods
    setFilesData: (files: ExcelData[]) => void;
    setActiveFileId: (id: string | null) => void;
    addFiles: (files: ExcelData[]) => void;
    removeFile: (id: string) => void;
    updateFile: (id: string, updates: Partial<ExcelData>) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentExcelData, setCurrentExcelData] = useState<ExcelData | null>(null);
    const [currentTemplate, setCurrentTemplate] = useState<TemplateFile | null>(null);
    const [currentView, setOriginalView] = useState<AppView>(AppView.DASHBOARD);

    // Global State for SmartExcel
    const [filesData, setFilesData] = useState<ExcelData[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);

    const setView = (view: AppView) => {
        setOriginalView(view);
    };

    const setExcelData = (data: ExcelData | null) => {
        setCurrentExcelData(data);
    };

    const setTemplate = (template: TemplateFile | null) => {
        setCurrentTemplate(template);
    };

    const clearWorkspace = () => {
        setCurrentExcelData(null);
        setCurrentTemplate(null);
        // Optional: Clear file list on workspace clear? 
        // For now, let's keep them separate or clear all if needed.
    };

    const addFiles = (newFiles: ExcelData[]) => {
        setFilesData(prev => [...prev, ...newFiles]);
    };

    const removeFile = (id: string) => {
        setFilesData(prev => prev.filter(f => f.id !== id));
        if (activeFileId === id) {
            setActiveFileId(null);
        }
    };

    const updateFile = (id: string, updates: Partial<ExcelData>) => {
        setFilesData(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    return (
        <WorkspaceContext.Provider
            value={{
                currentExcelData,
                currentTemplate,
                currentView,
                filesData,
                activeFileId,
                setExcelData,
                setTemplate,
                setView,
                clearWorkspace,
                setFilesData,
                setActiveFileId,
                addFiles,
                removeFile,
                updateFile
            }}
        >
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
};
