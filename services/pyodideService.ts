// Basic logger replacement using console
const logger = {
    info: (...args: any[]) => console.log('[Info][WorkerService]', ...args),
    error: (...args: any[]) => console.error('[Error][WorkerService]', ...args),
    warn: (...args: any[]) => console.warn('[Warn][WorkerService]', ...args),
};

// --- Hyper-Threading State (Phase 10.1) ---
let analysisWorker: Worker | null = null;
let docWorker: Worker | null = null;

let isAnalysisLoading = false;
let isDocLoading = false;

let analysisLoadPromise: Promise<void> | null = null;
let docLoadPromise: Promise<void> | null = null;

// Track pending requests for the RPC-style bridge
const pendingRequests = new Map<string, {
    resolve: (val: any) => void,
    reject: (err: any) => void,
    onLog?: (content: string) => void,
    accumulatedLogs: string
}>();

/**
 * Loads the Analysis (Python/Pandas) Worker
 */
export const loadAnalysisWorker = async (): Promise<void> => {
    if (analysisWorker && !isAnalysisLoading) return;
    if (isAnalysisLoading) return analysisLoadPromise!;

    isAnalysisLoading = true;
    analysisLoadPromise = (async () => {
        try {
            logger.info('Initializing Analysis Web Worker...');
            analysisWorker = new Worker(new URL('./pyodide.worker.ts', import.meta.url));

            return new Promise<void>((resolve, reject) => {
                if (!analysisWorker) return reject(new Error('Analysis Worker creation failed'));
                setupWorkerListeners(analysisWorker, resolve, reject, 'Analysis');
                analysisWorker.postMessage({ type: 'INIT_REQUEST' });
            });
        } catch (error) {
            logger.error('Failed to start Analysis Worker', error);
            isAnalysisLoading = false;
            throw error;
        } finally {
            isAnalysisLoading = false;
        }
    })();
    return analysisLoadPromise;
};

/**
 * Loads the Doc (PDF/Docx) Processing Worker
 */
export const loadDocWorker = async (): Promise<void> => {
    if (docWorker && !isDocLoading) return;
    if (isDocLoading) return docLoadPromise!;

    isDocLoading = true;
    docLoadPromise = (async () => {
        try {
            logger.info('Initializing Document Intelligence Worker...');
            docWorker = new Worker(new URL('./workers/doc.worker.ts', import.meta.url));

            return new Promise<void>((resolve, reject) => {
                if (!docWorker) return reject(new Error('Doc Worker creation failed'));
                setupWorkerListeners(docWorker, resolve, reject, 'Doc');
                docWorker.postMessage({ type: 'INIT_REQUEST' });
            });
        } catch (error) {
            logger.error('Failed to start Doc Worker', error);
            isDocLoading = false;
            throw error;
        } finally {
            isDocLoading = false;
        }
    })();
    return docLoadPromise;
};

// Generic listener setup to avoid code duplication
const setupWorkerListeners = (
    worker: Worker,
    resolveInit: () => void,
    rejectInit: (err: Error) => void,
    workerName: string
) => {
    worker.onmessage = (e) => {
        const { type, success, data, logs, result, id, error, content } = e.data;

        switch (type) {
            case 'INIT_SUCCESS':
                logger.info(`[${workerName}] Initialized successfully.`);
                resolveInit();
                break;
            case 'RESPONSE': {
                const pending = pendingRequests.get(id);
                if (pending) {
                    if (success) {
                        pending.resolve({ data, logs: pending.accumulatedLogs, result });
                    } else {
                        const fullError = error + (pending.accumulatedLogs ? `\nLogs:\n${pending.accumulatedLogs}` : '');
                        pending.reject(new Error(fullError));
                    }
                    pendingRequests.delete(id);
                }
                break;
            }
            case 'STDOUT': {
                const pending = pendingRequests.get(id);
                if (pending) {
                    pending.accumulatedLogs += content;
                    if (pending.onLog) pending.onLog(content);
                } else {
                    logger.info(`[${workerName} Stdout]`, content);
                }
                break;
            }
            case 'LOG':
                if (content) logger.info(`[${workerName} Log]`, content);
                break;
            case 'LIST_FILES_RESPONSE': {
                const pending = pendingRequests.get(id);
                if (pending) {
                    pending.resolve(e.data.files);
                    pendingRequests.delete(id);
                }
                break;
            }
            case 'RESET_SUCCESS': {
                const pending = pendingRequests.get(id);
                if (pending) {
                    pending.resolve(true);
                    pendingRequests.delete(id);
                }
                break;
            }
            case 'ERROR':
                rejectInit(new Error(error || `${workerName} Init Error`));
                break;
        }
    };

    worker.onerror = (err) => {
        rejectInit(err instanceof Error ? err : new Error(String(err)));
    };
};

/**
 * Executes Python code in the Analysis Worker
 */
export const runPython = async (
    code: string,
    datasets: { [fileName: string]: any },
    onLog?: (content: string) => void
): Promise<{ data: { [fileName: string]: any }, logs: string, result: any }> => {
    await loadAnalysisWorker();
    if (!analysisWorker) throw new Error('Analysis Worker not available');

    return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        pendingRequests.set(requestId, { resolve, reject, onLog, accumulatedLogs: "" });

        // Safety timeout (60s)
        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.get(requestId)!.reject(new Error('Python execution timed out (60s)'));
                pendingRequests.delete(requestId);
            }
        }, 60000);

        analysisWorker!.postMessage({
            type: 'RUN_REQUEST',
            code,
            datasets,
            id: requestId
        });
    });
};

/**
 * Sync UI state with Analysis Worker files
 */
export const listFiles = async (): Promise<{ [fileName: string]: any }> => {
    await loadAnalysisWorker();
    if (!analysisWorker) throw new Error('Analysis Worker not available');

    return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        pendingRequests.set(requestId, { resolve, reject, accumulatedLogs: "" });
        analysisWorker!.postMessage({ type: 'LIST_FILES', id: requestId });

        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.get(requestId)!.reject(new Error('List files timed out'));
                pendingRequests.delete(requestId);
            }
        }, 5000);
    });
};

/**
 * Reset both workers
 */
export const resetSandbox = async (): Promise<boolean> => {
    await Promise.all([loadAnalysisWorker(), loadDocWorker()]);

    // Reset helper
    const resetWorker = (w: Worker) => new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        pendingRequests.set(id, { resolve, reject, accumulatedLogs: "" });
        w.postMessage({ type: 'RESET_REQUEST', id });
        setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                reject(new Error('Reset timeout'));
            }
        }, 5000);
    });

    try {
        if (analysisWorker) await resetWorker(analysisWorker);
        // Doc worker might not track state as heavily, but good to clean /mnt
        // Note: doc.worker doesn't currently implement RESET_REQUEST logic in our new file
        // We might want to add it, but for now we focus on Analysis.
        return true;
    } catch (e) {
        console.error("Reset failed", e);
        return false;
    }
};

/**
 * Write binary file to BOTH workers (Broadcast Sync)
 */
export const writeFileToSandbox = async (fileName: string, data: ArrayBuffer): Promise<boolean> => {
    // We MUST write to Analysis worker for generic file usage
    await loadAnalysisWorker();

    // We SHOULD write to Doc worker if it's a value-add file
    const isDoc = fileName.endsWith('.pdf') || fileName.endsWith('.docx');
    if (isDoc) {
        // Init doc worker in background if not ready?
        // No, if we are writing a doc, we likely intend to extract it.
        await loadDocWorker();
    }

    const workers = [];
    if (analysisWorker) workers.push(analysisWorker);
    if (docWorker && isDoc) workers.push(docWorker); // Only sync docs to doc worker to save memory/time?
    // Actually, consistency is better. But let's save overhead. Only sync relevant files.

    const writePromises = workers.map(w => new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        pendingRequests.set(id, { resolve, reject, accumulatedLogs: "" });

        // Clone buffer for multiple messages? 
        // ArrayBuffer is transferred, so it becomes unusable.
        // We must copy it if sending to multiple workers.
        const bufferCopy = data.slice(0);

        // Actually, we need N copies for N workers.
        // The last one can use the original or a copy.
        // Since we map, let's just use slice(0) for everyone to be safe.

        w.postMessage({
            type: 'WRITE_BINARY_FILE',
            fileName,
            data: bufferCopy,
            id
        }, [bufferCopy]);

        setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                reject(new Error('Write timeout'));
            }
        }, 10000);
    }));

    await Promise.all(writePromises);
    return true;
};

/**
 * Extract text using the Specialized Doc Worker
 */
export const extractText = async (fileName: string): Promise<{ text: string, tables: any[][][], structure: any[], meta: any }> => {
    await loadDocWorker();
    if (!docWorker) throw new Error('Doc Worker not available');

    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        const handleMsg = (e: MessageEvent) => {
            const { type, success, data, error, id: resId } = e.data;
            if (type === 'RESPONSE' && resId === id) {
                docWorker?.removeEventListener('message', handleMsg);
                if (success) resolve(data);
                else reject(new Error(error));
            }
        };
        docWorker.addEventListener('message', handleMsg);
        docWorker.postMessage({ type: 'EXTRACT_TEXT_REQUEST', fileName, id });
    });
};

/**
 * Clear context (Analysis only)
 */
export const clearContext = async (): Promise<void> => {
    await loadAnalysisWorker();
    if (!analysisWorker) throw new Error('Analysis Worker not available');

    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        const handleMsg = (e: MessageEvent) => {
            const { type, success, error, id: resId } = e.data;
            if (type === 'RESPONSE' && resId === id) {
                analysisWorker?.removeEventListener('message', handleMsg);
                if (success) resolve();
                else reject(new Error(error));
            }
        };
        analysisWorker.addEventListener('message', handleMsg);
        analysisWorker.postMessage({ type: 'CLEAR_CONTEXT', id });
    });
};
