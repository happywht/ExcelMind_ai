/**
 * Analysis Engine Controller
 * Manages the lifecycle and communication with the Python/Pandas worker.
 */
import { WorkerMessage, PendingRequest } from '../../types';

let analysisWorker: Worker | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

const pendingRequests = new Map<string, PendingRequest>();

const logger = {
    info: (...args: any[]) => console.log('[Info][AnalysisEngine]', ...args),
    error: (...args: any[]) => console.error('[Error][AnalysisEngine]', ...args),
};

export const loadAnalysisWorker = async (onInit?: () => void): Promise<void> => {
    if (analysisWorker && !isLoading) return;
    if (isLoading) return loadPromise!;

    isLoading = true;
    loadPromise = (async () => {
        try {
            logger.info('Initializing Analysis Web Worker...');
            analysisWorker = new Worker(new URL('../pyodide.worker.ts', import.meta.url));

            return new Promise<void>((resolve, reject) => {
                if (!analysisWorker) return reject(new Error('Analysis Worker creation failed'));

                analysisWorker.onmessage = (e) => {
                    const { type, success, data, result, id, error, content } = e.data;
                    switch (type) {
                        case 'INIT_SUCCESS':
                            logger.info('Initialized successfully.');
                            if (onInit) onInit();
                            resolve();
                            break;
                        case 'RESPONSE': {
                            const pending = pendingRequests.get(id);
                            if (pending) {
                                if (success) pending.resolve({ data, logs: pending.accumulatedLogs, result });
                                else pending.reject(new Error(error + (pending.accumulatedLogs ? `\nLogs:\n${pending.accumulatedLogs}` : '')));
                                pendingRequests.delete(id);
                            }
                            break;
                        }
                        case 'STDOUT': {
                            const pending = pendingRequests.get(id);
                            if (pending) {
                                pending.accumulatedLogs += content;
                                if (pending.onLog) pending.onLog(content);
                            }
                            break;
                        }
                        case 'LIST_FILES_RESPONSE': {
                            const pending = pendingRequests.get(id);
                            if (pending) {
                                pending.resolve(e.data.files);
                                pendingRequests.delete(id);
                            }
                            break;
                        }
                        case 'RESET_SUCCESS':
                        case 'INIT_SUCCESS': // Handled above, but listed for safety
                            const p = pendingRequests.get(id);
                            if (p) { p.resolve(true); pendingRequests.delete(id); }
                            break;
                        case 'ERROR':
                            reject(new Error(error || 'Analysis Worker Error'));
                            break;
                    }
                };

                analysisWorker.onerror = (err) => reject(err instanceof Error ? err : new Error(String(err)));
                analysisWorker.postMessage({ type: 'INIT_REQUEST' });
            });
        } finally {
            isLoading = false;
        }
    })();
    return loadPromise;
};

export const runPython = async (
    code: string,
    datasets: { [fileName: string]: any },
    onLog?: (content: string) => void
): Promise<{ data: { [fileName: string]: any }, logs: string, result: any }> => {
    await loadAnalysisWorker();
    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        pendingRequests.set(id, { resolve, reject, onLog, accumulatedLogs: "" });
        analysisWorker!.postMessage({ type: 'RUN_REQUEST', code, datasets, id });
    });
};

export const getAnalysisWorker = () => analysisWorker;
