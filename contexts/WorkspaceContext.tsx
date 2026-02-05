
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
}

interface WorkspaceContextType extends WorkspaceState {
    setExcelData: (data: ExcelData | null) => void;
    setTemplate: (template: TemplateFile | null) => void;
    setView: (view: AppView) => void;
    clearWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentExcelData, setCurrentExcelData] = useState<ExcelData | null>(null);
    const [currentTemplate, setCurrentTemplate] = useState<TemplateFile | null>(null);
    const [currentView, setOriginalView] = useState<AppView>(AppView.DASHBOARD);

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
    };

    return (
        <WorkspaceContext.Provider
            value={{
                currentExcelData,
                currentTemplate,
                currentView,
                setExcelData,
                setTemplate,
                setView,
                clearWorkspace,
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
