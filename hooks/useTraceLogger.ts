import { useState, useCallback } from 'react';
import { TraceSession } from '../types';

export const useTraceLogger = () => {
    const [lastTrace, setLastTrace] = useState<TraceSession | null>(null);

    const downloadTrace = useCallback(() => {
        if (!lastTrace) return;
        const blob = new Blob([JSON.stringify(lastTrace, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `excelmind_trace_${lastTrace.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [lastTrace]);

    return {
        lastTrace,
        setLastTrace,
        downloadTrace
    };
};
