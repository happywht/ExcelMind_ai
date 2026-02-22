/**
 * Pyodide Service (Phase 13 Facade)
 * Delegating work to specialized engines and managing synchronization.
 */
import { loadAnalysisWorker, runPython, getAnalysisWorker, terminateAnalysisWorker } from './engines/AnalysisEngine';
import { loadDocWorker, extractText as engineExtractText, getDocWorker, terminateDocWorker } from './engines/DocEngine';
import { PendingRequest } from '../types';

const logger = {
    info: (...args: any[]) => console.log('[Info][WorkerFacade]', ...args),
    error: (...args: any[]) => console.error('[Error][WorkerFacade]', ...args),
};

// --- Singleton Re-exports for Phase 7 Legacy compatibility ---
export { loadAnalysisWorker, loadDocWorker, runPython, terminateAnalysisWorker, terminateDocWorker };

/**
 * Super API to Terminate ALL Engines (Used on Project Switch / Final Cleanup)
 */
export const terminateAllEngines = (): void => {
    logger.info('Terminating ALL Python/Doc Engines globally...');
    try { terminateAnalysisWorker(); } catch (e) { console.error('Error terminating AnalysisEngine', e); }
    try { terminateDocWorker(); } catch (e) { console.error('Error terminating DocEngine', e); }
    logger.info('Engines fully disposed.');
};

/**
 * Sync UI state with Analysis Worker files
 */
export const listFiles = async (): Promise<{ [fileName: string]: any }> => {
    const analysisWorker = getAnalysisWorker();
    if (!analysisWorker) throw new Error('Analysis Worker not available');

    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        const handleMsg = (e: MessageEvent) => {
            if (e.data.type === 'LIST_FILES_RESPONSE' && e.data.id === id) {
                analysisWorker.removeEventListener('message', handleMsg);
                resolve(e.data.files);
            }
        };
        analysisWorker.addEventListener('message', handleMsg);
        analysisWorker.postMessage({ type: 'LIST_FILES', id });
    });
};

/**
 * Broadcast Sync for binary files
 */
export const writeFileToSandbox = async (fileName: string, data: ArrayBuffer): Promise<boolean> => {
    await Promise.all([loadAnalysisWorker(), loadDocWorker()]);

    const analysisWorker = getAnalysisWorker();
    const docWorker = getDocWorker();
    const isDoc = fileName.endsWith('.pdf') || fileName.endsWith('.docx');

    const workers = [];
    if (analysisWorker) workers.push(analysisWorker);
    if (docWorker && isDoc) workers.push(docWorker);

    const writePromises = workers.map(w => new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        const bufferCopy = data.slice(0);

        const handleMsg = (e: MessageEvent) => {
            if (e.data.type === 'RESPONSE' && e.data.id === id) {
                w.removeEventListener('message', handleMsg);
                if (e.data.success) resolve(true);
                else reject(new Error(e.data.error));
            }
        };
        w.addEventListener('message', handleMsg);
        w.postMessage({ type: 'WRITE_BINARY_FILE', fileName, data: bufferCopy, id }, [bufferCopy]);
    }));

    await Promise.all(writePromises);
    return true;
};

export const extractText = engineExtractText;

export const resetSandbox = async (): Promise<boolean> => {
    const analysisWorker = getAnalysisWorker();
    if (!analysisWorker) return true;

    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        const handleMsg = (e: MessageEvent) => {
            if (e.data.type === 'RESET_SUCCESS' && e.data.id === id) {
                analysisWorker.removeEventListener('message', handleMsg);
                resolve(true);
            }
        };
        analysisWorker.addEventListener('message', handleMsg);
        analysisWorker.postMessage({ type: 'RESET_REQUEST', id });
    });
};

export const clearContext = async (): Promise<void> => {
    const analysisWorker = getAnalysisWorker();
    if (!analysisWorker) return;

    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        const handleMsg = (e: MessageEvent) => {
            if (e.data.type === 'RESPONSE' && e.data.id === id) {
                analysisWorker.removeEventListener('message', handleMsg);
                if (e.data.success) resolve();
                else reject(new Error(e.data.error));
            }
        };
        analysisWorker.addEventListener('message', handleMsg);
        analysisWorker.postMessage({ type: 'CLEAR_CONTEXT', id });
    });
};

export const readFileFromSandbox = async (fileName: string): Promise<Uint8Array> => {
    const code = `
import base64
import os
path = '/mnt/${fileName}'
if not os.path.exists(path):
    raise FileNotFoundError(f"File not found: {fileName}")
with open(path, 'rb') as f:
    base64.b64encode(f.read()).decode('utf-8')
`;
    const { result } = await runPython(code, {});
    const binaryString = atob(result as string);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};
