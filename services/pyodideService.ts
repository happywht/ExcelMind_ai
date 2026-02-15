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

        worker!.postMessage({
            type: 'RUN_REQUEST',
            code,
            datasets,
            id: requestId
        });

        // Set a safety timeout for the request (e.g., 60s)
        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.get(requestId)!.reject(new Error('Python execution timed out (60s)'));
                pendingRequests.delete(requestId);
            }
        }, 60000);
    });
};
