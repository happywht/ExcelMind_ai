// Basic logger replacement using console
const logger = {
    info: (...args: any[]) => console.log('[Info][WorkerService]', ...args),
    error: (...args: any[]) => console.error('[Error][WorkerService]', ...args),
    warn: (...args: any[]) => console.warn('[Warn][WorkerService]', ...args),
};

// Worker instance and initialization state
let worker: Worker | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

// Track pending requests for the RPC-style bridge
const pendingRequests = new Map<string, {
    resolve: (val: any) => void,
    reject: (err: any) => void,
    onLog?: (content: string) => void,
    accumulatedLogs: string
}>();

/**
 * Loads the Pyodide Worker and waits for initialization
 */
export const loadPyodide = async (): Promise<void> => {
    if (worker && !isLoading) return;
    if (isLoading) return loadPromise!;

    isLoading = true;
    loadPromise = (async () => {
        try {
            logger.info('Initializing Pyodide Web Worker...');

            // Vite-specific worker instantiation (Classic mode for CDN compatibility)
            worker = new Worker(new URL('./pyodide.worker.ts', import.meta.url));

            return new Promise<void>((resolve, reject) => {
                if (!worker) return reject(new Error('Worker creation failed'));

                worker.onmessage = (e) => {
                    const { type, success, data, logs, result, id, error, content } = e.data;

                    switch (type) {
                        case 'INIT_SUCCESS':
                            logger.info('Worker initialized successfully.');
                            isLoading = false;
                            resolve();
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
                                logger.info('[Worker Stdout]', content);
                            }
                            break;
                        }
                        case 'LOG':
                            if (content) logger.info('[Worker Log]', content);
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
                            isLoading = false;
                            reject(new Error(error || 'Worker Init Error'));
                            break;
                    }
                };

                worker.onerror = (err) => {
                    isLoading = false;
                    reject(err);
                };

                worker.postMessage({ type: 'INIT_REQUEST' });
            });
        } catch (error) {
            logger.error('Failed to start Pyodide Worker', error);
            isLoading = false;
            throw error;
        }
    })();

    return loadPromise;
};

/**
 * Executes Python code in the background Web Worker
 * @param code Python code string
 * @param datasets Map of filename -> data array or multi-sheet object
 * @param onLog Optional callback for real-time stdout logs
 */
export const runPython = async (
    code: string,
    datasets: { [fileName: string]: any },
    onLog?: (content: string) => void
): Promise<{ data: { [fileName: string]: any }, logs: string, result: any }> => {
    // Ensure worker is ready
    await loadPyodide();

    if (!worker) {
        throw new Error('Pyodide Worker not available');
    }

    return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        pendingRequests.set(requestId, { resolve, reject, onLog, accumulatedLogs: "" });

        // Set a safety timeout for the request (e.g., 60s)
        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.get(requestId)!.reject(new Error('Python execution timed out (60s)'));
                pendingRequests.delete(requestId);
            }
        }, 60000);

        worker!.postMessage({
            type: 'RUN_REQUEST',
            code,
            datasets,
            id: requestId
        });
    });
};

/**
 * Utility to sync UI state with worker files
 */
export const listFiles = async (): Promise<{ [fileName: string]: any }> => {
    await loadPyodide();
    if (!worker) throw new Error('Worker not available');

    return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        pendingRequests.set(requestId, { resolve, reject, accumulatedLogs: "" });
        worker!.postMessage({ type: 'LIST_FILES', id: requestId });

        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.get(requestId)!.reject(new Error('List files timed out'));
                pendingRequests.delete(requestId);
            }
        }, 5000);
    });
};

/**
 * Force wipe the sandbox environment
 */
export const resetSandbox = async (): Promise<boolean> => {
    await loadPyodide();
    if (!worker) throw new Error('Worker not available');

    return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        pendingRequests.set(requestId, { resolve, reject, accumulatedLogs: "" });
        worker!.postMessage({ type: 'RESET_REQUEST', id: requestId });

        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.get(requestId)!.reject(new Error('Reset sandbox timed out'));
                pendingRequests.delete(requestId);
            }
        }, 5000);
    });
};

/**
 * Write a binary file directly to the sandbox /mnt/ directory
 * @param fileName Name of the file (e.g., "contract.docx")
 * @param data Binary content
 */
export const writeFileToSandbox = async (fileName: string, data: ArrayBuffer): Promise<boolean> => {
    await loadPyodide();
    if (!worker) throw new Error('Worker not available');

    return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        pendingRequests.set(requestId, { resolve, reject, accumulatedLogs: "" });

        // Use Transferable objects for performance with large files
        worker!.postMessage({
            type: 'WRITE_BINARY_FILE',
            fileName,
            data,
            id: requestId
        }, [data]);

        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.get(requestId)!.reject(new Error('Write binary file timed out'));
                pendingRequests.delete(requestId);
            }
        }, 10000);
    });
};

/**
 * Extract text and metadata from a document in the sandbox
 * @param fileName Name of the file (must exist in sandbox)
 */
export const extractText = async (fileName: string): Promise<{ text: string, tables: any[][][], structure: any[], meta: any }> => {
    await loadPyodide();
    if (!worker) throw new Error('Worker not available');

    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        const handleMsg = (e: MessageEvent) => {
            const { type, success, data, error, id: resId } = e.data;
            if (type === 'RESPONSE' && resId === id) {
                worker?.removeEventListener('message', handleMsg);
                if (success) resolve(data);
                else reject(new Error(error));
            }
        };
        worker.addEventListener('message', handleMsg);
        worker.postMessage({ type: 'EXTRACT_TEXT_REQUEST', fileName, id });
    });
};

/**
 * Clear the Python context (User variables) but keep system state
 */
export const clearContext = async (): Promise<void> => {
    await loadPyodide();
    if (!worker) throw new Error('Worker not available');

    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        const handleMsg = (e: MessageEvent) => {
            const { type, success, error, id: resId } = e.data;
            if (type === 'RESPONSE' && resId === id) {
                worker?.removeEventListener('message', handleMsg);
                if (success) resolve();
                else reject(new Error(error));
            }
        };
        worker.addEventListener('message', handleMsg);
        worker.postMessage({ type: 'CLEAR_CONTEXT', id });
    });
};
