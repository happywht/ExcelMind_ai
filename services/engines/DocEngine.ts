/**
 * Document Intelligence Engine Controller
 */
import { PendingRequest } from '../../types';

let docWorker: Worker | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

const pendingRequests = new Map<string, PendingRequest>();

const logger = {
    info: (...args: any[]) => console.log('[Info][DocEngine]', ...args),
    error: (...args: any[]) => console.error('[Error][DocEngine]', ...args),
};

export const loadDocWorker = async (onInit?: () => void): Promise<void> => {
    if (docWorker && !isLoading) return;
    if (isLoading) return loadPromise!;

    isLoading = true;
    loadPromise = (async () => {
        try {
            logger.info('Initializing Document Intelligence Worker...');
            docWorker = new Worker(new URL('../workers/doc.worker.ts', import.meta.url));

            return new Promise<void>((resolve, reject) => {
                if (!docWorker) return reject(new Error('Doc Worker creation failed'));

                docWorker.onmessage = (e) => {
                    const { type, success, data, id, error } = e.data;
                    switch (type) {
                        case 'INIT_SUCCESS':
                            logger.info('Initialized successfully.');
                            if (onInit) onInit();
                            resolve();
                            break;
                        case 'RESPONSE': {
                            const pending = pendingRequests.get(id);
                            if (pending) {
                                if (success) pending.resolve(data);
                                else pending.reject(new Error(error));
                                pendingRequests.delete(id);
                            }
                            break;
                        }
                        case 'ERROR':
                            reject(new Error(error || 'Doc Worker Error'));
                            break;
                    }
                };

                docWorker.onerror = (err) => reject(err instanceof Error ? err : new Error(String(err)));
                docWorker.postMessage({ type: 'INIT_REQUEST' });
            });
        } finally {
            isLoading = false;
        }
    })();
    return loadPromise;
};

export const extractText = async (fileName: string): Promise<any> => {
    await loadDocWorker();
    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        pendingRequests.set(id, { resolve, reject, accumulatedLogs: "" });
        docWorker!.postMessage({ type: 'EXTRACT_TEXT_REQUEST', fileName, id });
    });
};

export const getDocWorker = () => docWorker;

export const terminateDocWorker = (): void => {
    if (docWorker) {
        logger.info('Terminating Document Intelligence Worker to free memory...');
        docWorker.terminate();
        docWorker = null;
        isLoading = false;
        loadPromise = null;
    }
    // Reject all pending requests
    for (const [id, pending] of pendingRequests.entries()) {
        pending.reject(new Error('Doc Worker was terminated'));
        pendingRequests.delete(id);
    }
};
