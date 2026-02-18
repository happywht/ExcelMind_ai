import { useState, useRef, useCallback } from 'react';
import { runPython, resetSandbox } from '../services/pyodideService';
import { ExcelData, AgenticStep } from '../types';

export const usePyodide = () => {
    const isSandboxDirty = useRef(true);
    const [filesData, setFilesData] = useState<ExcelData[]>([]);
    const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
    const filesDataRef = useRef<ExcelData[]>([]);

    // Keep ref in sync
    filesDataRef.current = filesData;

    const executeCodeInSandbox = useCallback(async (
        code: string,
        onLog: (log: string) => void
    ) => {
        const currentFiles = filesDataRef.current;

        // Optimize: Only sync full data if dirty
        const currentDataMap = isSandboxDirty.current
            ? Object.fromEntries(currentFiles.map(f => [f.fileName, f.sheets]))
            : {};

        const { data: newData, logs, result } = await runPython(code, currentDataMap, onLog);

        // Reset dirty flag after successful sync
        if (isSandboxDirty.current) isSandboxDirty.current = false;

        // Sync back state
        setFilesData(prev => {
            const updated = [...prev];
            const newFileIds = new Set<string>(); // To track new files added by Python

            Object.entries(newData).forEach(([fn, sheets]) => {
                const sheetObj = typeof sheets === 'object' && !Array.isArray(sheets) ? sheets : { 'Result': sheets };

                // Calculate metadata for the new sheets
                const metadata: { [sheet: string]: { rowCount: number; columnCount: number; comments: any } } = {};
                Object.entries(sheetObj).forEach(([sname, sdata]: [string, any]) => {
                    const rows = Array.isArray(sdata) ? sdata : [];
                    metadata[sname] = {
                        rowCount: rows.length,
                        columnCount: rows.length > 0 ? Object.keys(rows[0]).length : 0,
                        comments: {}
                    };
                });

                const existingFileIdx = updated.findIndex(x => x.fileName === fn);
                if (existingFileIdx !== -1) {
                    updated[existingFileIdx] = {
                        ...updated[existingFileIdx],
                        sheets: sheetObj,
                        metadata: { ...(updated[existingFileIdx].metadata || {}), ...metadata },
                        currentSheetName: Object.keys(sheetObj)[0]
                    };
                } else {
                    const newFileId = fn + '-' + Date.now();
                    updated.push({
                        id: newFileId,
                        fileName: fn,
                        sheets: sheetObj,
                        metadata: metadata,
                        currentSheetName: Object.keys(sheetObj)[0]
                    });
                    newFileIds.add(newFileId);
                }
            });

            filesDataRef.current = updated;

            // Auto-select new files
            if (newFileIds.size > 0) {
                setSelectedFileIds(prevSelected => {
                    const newSelection = new Set(prevSelected);
                    newFileIds.forEach(id => newSelection.add(id));
                    return newSelection;
                });
            }

            return updated;
        });

        return { logs, result, newData };
    }, []);

    const resetFiles = useCallback(async () => {
        await resetSandbox();
        setFilesData([]);
        filesDataRef.current = [];
        setSelectedFileIds(new Set());
        isSandboxDirty.current = true;
    }, []);

    // Helper to manually add files (e.g. from Upload)
    const addFiles = useCallback((newFiles: ExcelData[]) => {
        setFilesData(prev => {
            const existingNames = new Set(prev.map(f => f.fileName));
            // Only add files that don't already exist by name
            const trulyNew = newFiles.filter(f => !existingNames.has(f.fileName));

            if (trulyNew.length === 0) return prev;

            const updated = [...prev, ...trulyNew];
            filesDataRef.current = updated;
            return updated;
        });
        isSandboxDirty.current = true;
    }, []);

    // Helper to remove files
    const removeFile = useCallback((id: string) => {
        setFilesData(prev => {
            const updated = prev.filter(f => f.id !== id);
            filesDataRef.current = updated;
            return updated;
        });
        setSelectedFileIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
        isSandboxDirty.current = true;
    }, []);

    return {
        filesData,
        setFilesData, // Exposed for edge cases, but prefer addFiles
        filesDataRef,
        isSandboxDirty,
        executeCodeInSandbox,
        resetFiles,
        addFiles,
        removeFile,
        selectedFileIds,
        setSelectedFileIds
    };
};
