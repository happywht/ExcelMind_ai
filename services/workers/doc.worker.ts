// @ts-nocheck
import type { PyodideInterface } from 'pyodide';

// Explicitly declare global Pyodide types
declare global {
    interface Window {
        loadPyodide: (config: { indexURL: string }) => Promise<PyodideInterface>;
    }
}

// Import Pyodide (CDN version for Worker compatibility)
importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

let pyodide: PyodideInterface | null = null;
const ctx: Worker = self as any;

// Initialize the Document Intelligence Worker
ctx.onmessage = async (e: MessageEvent) => {
    const { type, id, code, data, fileName } = e.data;

    switch (type) {
        case 'INIT_REQUEST':
            try {
                // Initialize Pyodide
                pyodide = await self.loadPyodide({
                    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
                });

                // Install ONLY lightweight extraction dependencies
                await pyodide.loadPackage(['micropip']);
                const micropip = pyodide.pyimport('micropip');

                console.log('[DocWorker] Installing Extraction Arsenal...');
                // Note: No pandas, scipy, matplotlib = FAST INIT
                await micropip.install(['python-docx', 'pypdf']);

                console.log('[DocWorker] Securing environment...');
                // Security: Remove access to JS network API if present
                await pyodide.runPythonAsync(`
                    import sys
                    if 'js' in sys.modules:
                        import js
                        if hasattr(js, 'fetch'):
                            del js.fetch
                    if 'pyodide.http' in sys.modules:
                        del sys.modules['pyodide.http']
                `);

                // Define extraction logic
                await pyodide.runPythonAsync(`
                    import json
                    import traceback
                    import os
                    from pypdf import PdfReader
                    import docx

                    def extract_doc_structure(fpath):
                        structure = []
                        doc = docx.Document(fpath)
                        for para in doc.paragraphs:
                            if para.style.name.startswith('Heading'):
                                level = int(para.style.name.replace('Heading ', ''))
                                structure.append({'text': para.text, 'level': level})
                        return structure

                    def process_extraction(fname):
                        result = {"text": "", "tables": [], "structure": [], "meta": {"engine": "default"}}
                        fpath = f'/mnt/{fname}'
                        
                        try:
                            if fname.endswith('.docx'):
                                doc = docx.Document(fpath)
                                full_text = []
                                for para in doc.paragraphs:
                                    full_text.append(para.text)
                                result["text"] = '\\n'.join(full_text)
                                result["structure"] = extract_doc_structure(fpath)
                                result["meta"]["engine"] = "python-docx"
                                result["tables"] = [] # python-docx table extraction to be added if needed

                            elif fname.endswith('.pdf'):
                                reader = PdfReader(fpath)
                                text = ""
                                for page in reader.pages:
                                    text += page.extract_text() + "\\n"
                                result["text"] = text
                                result["meta"]["engine"] = "pypdf"
                        
                            return json.dumps({"success": True, "data": result}, ensure_ascii=False)
                        except Exception as e:
                            return json.dumps({"success": False, "error": str(e), "trace": traceback.format_exc()}, ensure_ascii=False)
                `);

                ctx.postMessage({ type: 'INIT_SUCCESS' });
            } catch (error: any) {
                console.error('[DocWorker] Init Failed:', error);
                ctx.postMessage({ type: 'ERROR', error: error.message });
            }
            break;

        case 'WRITE_BINARY_FILE':
            (async () => {
                if (!pyodide) return;
                try {
                    try { pyodide.FS.mkdir('/mnt'); } catch (e) { /* ignore */ }
                    pyodide.FS.writeFile(`/mnt/${fileName}`, new Uint8Array(data));
                    ctx.postMessage({ type: 'RESPONSE', success: true, id });
                } catch (err: any) {
                    ctx.postMessage({ type: 'RESPONSE', success: false, error: err.message, id });
                }
            })();
            break;

        case 'READ_BINARY_FILE':
            (async () => {
                if (!pyodide) return;
                const { fileName, id } = e.data;
                try {
                    const path = `/mnt/${fileName}`;
                    if (!pyodide.FS.analyzePath(path).exists) {
                        throw new Error(`File not found: ${fileName}`);
                    }
                    const data = pyodide.FS.readFile(path);
                    ctx.postMessage({ type: 'RESPONSE', success: true, data, id }, [data.buffer]);
                } catch (err: any) {
                    console.error('[DocWorker] Read Binary Failed:', err);
                    ctx.postMessage({ type: 'RESPONSE', success: false, error: err.message, id });
                }
            })();
            break;

        case 'EXTRACT_TEXT_REQUEST':
            (async () => {
                if (!pyodide) return;
                const { fileName } = e.data;
                try {
                    // SECURE execution: Avoid string concatenation vulnerability
                    pyodide.globals.set('__target_doc', fileName);
                    const resultJson = pyodide.runPython(`process_extraction(__target_doc)`);
                    const res = JSON.parse(resultJson);
                    if (res.success) {
                        ctx.postMessage({ type: 'RESPONSE', success: true, data: res.data, id });
                    } else {
                        ctx.postMessage({ type: 'RESPONSE', success: false, error: res.error, id });
                    }
                } catch (err: any) {
                    ctx.postMessage({ type: 'RESPONSE', success: false, error: err.message, id });
                }
            })();
            break;
    }
};
