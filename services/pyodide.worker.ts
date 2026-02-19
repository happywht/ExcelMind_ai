/**
 * Dedicated Web Worker for Pyodide execution (V5.1)
 * Ensures heavy Python and data processing runs off the main UI thread.
 */

// Import types for messaging
type WorkerMessage =
    | { type: 'INIT_REQUEST' }
    | { type: 'RUN_REQUEST', code: string, datasets: any, id: string }
    | { type: 'RESPONSE', success: boolean, data?: any, logs?: string, result?: any, id: string, error?: string }
    | { type: 'LOG', content: string }
    | { type: 'INIT_SUCCESS' }
    | { type: 'EXTRACT_TEXT_REQUEST', fileName: string, id: string }
    | { type: 'WRITE_BINARY_FILE', fileName: string, data: ArrayBuffer, id: string }
    | { type: 'CLEAR_CONTEXT', id: string }
    | { type: 'ERROR', error: string };

// Self reference
const ctx: Worker = self as any;

// Pyodide instance
let pyodide: any = null;

async function initPyodide() {
    try {
        console.log('[Worker] Loading Pyodide script...');

        // Load the external script
        (self as any).importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

        pyodide = await (self as any).loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
        });

        console.log('[Worker] Initializing CORE packages (micropip, pandas, numpy)...');
        await pyodide.loadPackage(['micropip', 'pandas', 'numpy']);

        // Set up environment and MUST wait for essential Excel engines
        await pyodide.runPythonAsync(`
            import micropip
            import pandas as pd
            import numpy as np
            import json
            import os
            import sys
            import io

            # Initialize global state explicitly
            if 'files' not in globals():
                globals()['files'] = {}
            files = globals()['files']

            if 'shared_context' not in globals():
                globals()['shared_context'] = {'docs': {}, 'dfs': {}}
            shared_context = globals()['shared_context']

            # Custom Stream for real-time logs
            class RealTimeStream(io.TextIOBase):
                def __init__(self, type_name):
                    self.type_name = type_name
                def write(self, s):
                    if s.strip():
                        import json
                        ctx_post_message(json.dumps({'type': 'STDOUT', 'content': s, 'stream': self.type_name}))
                    return len(s)

            # Register the JS postMessage function in Python scope
            from js import self as js_self
            from pyodide.ffi import to_js
            def ctx_post_message(msg_json):
                # USE to_js with Object.fromEntries to ensure a plain, cloneable JS object
                # This prevents "DataCloneError" by avoiding non-cloneable Proxies
                data = json.loads(msg_json)
                js_obj = to_js(data, dict_converter=js_self.Object.fromEntries)
                js_self.postMessage(js_obj)

            sys.stdout = RealTimeStream('stdout')
            sys.stderr = RealTimeStream('stderr')

            # Mock read_excel will be defined below
        `);

        // Await essential engines AND document tools (ALL BLOCKING FOR STABILITY per user request)
        console.log('[Worker] Installing Sandbox Arsenal (Excel + Docs)...');
        await pyodide.runPythonAsync(`
            import micropip
            # Install ALL dependencies at once to ensure readiness
            await micropip.install([
                'openpyxl', 'xlrd', 
                'scipy', 'matplotlib', 
                'python-docx', 'pypdf'
            ])
            print("Sandbox Arsenal Fully Loaded: Excel + Doc Intelligence")
        `);
        console.log('[Worker] Essential engines and background arsenal ready.');

        ctx.postMessage({ type: 'INIT_SUCCESS' });
    } catch (error: any) {
        console.error('[Worker] Init Failed:', error);
        ctx.postMessage({ type: 'ERROR', error: error.message });
    }
}

async function runPython(code: string, datasets: any, id: string) {
    if (!pyodide) {
        ctx.postMessage({ type: 'RESPONSE', success: false, error: 'Pyodide not initialized', id });
        return;
    }

    try {
        // Transfer data to Python environment (Only if provided)
        if (datasets && Object.keys(datasets).length > 0) {
            ctx.postMessage({ type: 'LOG', content: 'Updating datasets in sandbox...' });

            // Use a chunked or cleaner transfer to avoid large string overhead in the long run
            // For now, keep JSON but ensure it's purposeful
            pyodide.globals.set('__input_data_json', JSON.stringify(datasets));

            await pyodide.runPythonAsync(`
                input_data = json.loads(__input_data_json)
                
                # Setup /mnt if not exists
                if not os.path.exists('/mnt'):
                    os.makedirs('/mnt')
                    
                for fname, content in input_data.items():
                    # Update persistent memory
                    files[fname] = content
                    
                    path = f'/mnt/{fname}'
                    try:
                        if isinstance(content, dict):
                            with pd.ExcelWriter(path, engine='openpyxl') as writer:
                                for sname, sdata in content.items():
                                    pd.DataFrame(sdata or []).to_excel(writer, sheet_name=sname, index=False)
                        else:
                            pd.DataFrame(content).to_excel(path, engine='openpyxl', index=False)
                    except Exception as e:
                        print(f"Warning: Failed to write {fname} to /mnt: {e}")
                
                # Cleanup to free memory
                del __input_data_json
                del input_data
            `);
        }

        // Run user code and capture result properly
        const cleanedCode = (code || '').trim();

        // Inject the code into Python globals as a raw string
        pyodide.globals.set('__user_code_raw', cleanedCode);

        // CRITICAL: Ensure 'files' is anchored in the ACTUAL globals before execution
        await pyodide.runPythonAsync(`globals().update({'files': files})`);

        const wrapper = `
import sys
from io import StringIO

_last_output_capture = None
try:
    _code = globals().get('__user_code_raw', '')
    # Execute in the real global context
    try:
        _last_output_capture = eval(compile(_code, '<string>', 'eval'), globals())
    except SyntaxError:
        exec(compile(_code, '<string>', 'exec'), globals())
        _last_output_capture = "Execution completed (Statement)"
except Exception as e:
    raise e
finally:
    if '__user_code_raw' in globals():
        del globals()['__user_code_raw']
`;
        await pyodide.runPythonAsync(wrapper);

        // Prep response data
        const responseJson = await pyodide.runPythonAsync(`
            # Sync files from /mnt/ back to 'files' variable
            import json
            import os
            
            # Detect new or changed files in /mnt
            if os.path.exists('/mnt'):
                for f in os.listdir('/mnt'):
                    fpath = os.path.join('/mnt', f)
                    # Only sync if it's an excel/csv file and NOT already accurately in 'files'
                    # Or just sync everything for consistency in this tier
                    if f.endswith(('.xlsx', '.xls', '.csv')):
                         try:
                             # We use lazy sync: if 'inspect_sheet' is called later, it will use mocked_read_excel
                             # which already points to the disk if /mnt/ is used.
                             # But for the UI to show the file in the sidebar, we need it in the 'files' dict.
                             if f not in files:
                                 # For newly created files from Python, we need to read them into memory
                                 # so they appear in the UI file list.
                                 if f.endswith('.csv'):
                                     files[f] = pd.read_csv(fpath).to_dict(orient='records')
                                 else:
                                     # Load all sheets for the UI
                                     excel_file = pd.ExcelFile(fpath)
                                     files[f] = {s: excel_file.parse(s).to_dict(orient='records') for s in excel_file.sheet_names}
                         except Exception as e:
                             print(f"Sync Warning: Failed to read back {f}: {e}")

            json.dumps({
                "files": clean_output(files),
                "result": clean_output(_last_output_capture) if '_last_output_capture' in locals() else "No result"
            })
        `);

        const parsed = JSON.parse(responseJson);
        ctx.postMessage({
            type: 'RESPONSE',
            success: true,
            data: parsed.files,
            result: parsed.result,
            id
        });

    } catch (error: any) {
        console.error('[Worker] Execution Error:', error);
        ctx.postMessage({
            type: 'RESPONSE',
            success: false,
            error: error.message,
            id
        });
    }
}

ctx.onmessage = (e: MessageEvent) => {
    const { type, code, datasets, id } = e.data;

    switch (type) {
        case 'INIT_REQUEST':
            initPyodide();
            break;
        case 'RUN_REQUEST':
            runPython(code, datasets, id);
            break;
        case 'LIST_FILES':
            (async () => {
                if (!pyodide) return;
                try {
                    const filesMetadata = await pyodide.runPythonAsync(`
                        import os
                        import json
                        res = {}
                        if not os.path.exists('/mnt'):
                            os.makedirs('/mnt')
                        for f in os.listdir('/mnt'):
                            try:
                                # Simple metadata sync
                                res[f] = clean_output(files.get(f, {}))
                            except:
                                res[f] = {}
                        json.dumps(res)
                    `);
                    ctx.postMessage({ type: 'LIST_FILES_RESPONSE', files: JSON.parse(filesMetadata), id });
                } catch (err) {
                    console.error('[Worker] List Files Failed:', err);
                }
            })();
            break;
        case 'RESET_REQUEST':
            (async () => {
                if (!pyodide) return;
                try {
                    await pyodide.runPythonAsync(`
                        import os
                        import shutil
                        if os.path.exists('/mnt'):
                            shutil.rmtree('/mnt')
                        os.makedirs('/mnt')
                        files.clear()
                        # Safe cleanup: Don't use globals().clear() as it nukes pandas/np/etc.
                        print("Sandbox Files and State Cleared.")
                    `);
                    // We might need to re-init some parts or just let it be clean
                    ctx.postMessage({ type: 'RESET_SUCCESS', id });
                    // Optional: Re-init environment setup if globals().clear() was too aggressive
                    // For now, we clear 'files' and '/mnt' specifically.
                } catch (err) {
                    console.error('[Worker] Reset Failed:', err);
                }
            })();
            break;
        case 'EXTRACT_TEXT_REQUEST':
            (async () => {
                if (!pyodide) return;
                const { fileName, id } = e.data;
                try {
                    // Ensure the file exists in /mnt/
                    // It should have been synced via RUN_REQUEST or manually before this call?
                    // Actually, for Smart Document, we might need to sync it first if it was just uploaded.
                    // But usually we sync via a separate call or part of the flow.
                    // Let's assume the file is securely in /mnt/ or 'files' global.

                    const resultJson = await pyodide.runPythonAsync(`
import json
import os
import traceback

fname = "${fileName}"
fpath = f'/mnt/{fname}'

result = {"text": "", "tables": [], "meta": {}, "structure": []}
_extract_res = ""

try:
    # Verify file existence
    if not os.path.exists(fpath):
        raise FileNotFoundError(f"File {fname} not found in sandbox /mnt/")
    
    # helper to save to shared_context
    def save_to_context(data):
        if 'shared_context' in globals():
            globals()['shared_context']['docs'][fname] = data
        
    if fname.endswith('.docx'):
        import docx
        doc = docx.Document(fpath)
        
        # Combined text extraction with structure
        lines = []
        for p in doc.paragraphs:
            text = p.text.strip()
            if not text: continue
            
            lines.append(text)
            
            # Identify Headings
            style_name = p.style.name.lower()
            if 'heading' in style_name:
                level = 1
                if '1' in style_name: level = 1
                elif '2' in style_name: level = 2
                elif '3' in style_name: level = 3
                result["structure"].append({"type": "heading", "level": level, "text": text})
        
        result["text"] = '\\n'.join(lines)
        
        # Extract tables
        for table in doc.tables:
            tbl_data = []
            for row in table.rows:
                tbl_data.append([cell.text for cell in row.cells])
            result["tables"].append(tbl_data)
            
    elif fname.endswith('.pdf'):
        try:
            import pdfplumber
            with pdfplumber.open(fpath) as pdf:
                full_text = []
                for page in pdf.pages:
                    full_text.append(page.extract_text() or "")
                    # Extract tables from each page if any
                    tables = page.extract_tables()
                    for table in tables:
                        if table: result["tables"].append(table)
                result["text"] = '\\n'.join(full_text)
                result["meta"]["engine"] = "pdfplumber"
        except ImportError:
            # Fallback to pypdf
            from pypdf import PdfReader
            reader = PdfReader(fpath)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\\n"
            result["text"] = text
            result["meta"]["engine"] = "pypdf"
        
    save_to_context(result)
    _extract_res = json.dumps({"success": True, "data": result})
except Exception as e:
    _extract_res = json.dumps({"success": False, "error": str(e), "trace": traceback.format_exc()})

_extract_res
                    `);

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

        case 'WRITE_BINARY_FILE':
            (async () => {
                if (!pyodide) return;
                const { fileName, data, id } = e.data;
                try {
                    // Ensure /mnt exists
                    pyodide.FS.mkdir('/mnt');
                } catch (e) { /* ignore if exists */ }

                try {
                    const view = new Uint8Array(data);
                    pyodide.FS.writeFile(`/mnt/${fileName}`, view);
                    console.log(`[Worker] Wrote binary file ${fileName} to /mnt/`);
                    ctx.postMessage({ type: 'RESPONSE', success: true, id });
                } catch (err: any) {
                    console.error('[Worker] Write Binary Failed:', err);
                    ctx.postMessage({ type: 'RESPONSE', success: false, error: err.message, id });
                }
            })();
            break;

        case 'CLEAR_CONTEXT':
            (async () => {
                if (!pyodide) return;
                const { id } = e.data;
                try {
                    await pyodide.runPythonAsync(`
import pandas as pd
# Keep system modules and essential globals
keep_list = ['micropip', 'pandas', 'numpy', 'json', 'os', 'sys', 'io', 'files', 'shared_context', 'load_extra_arsenal', 'ctx_post_message', 'mocked_read_excel', 'clean_output', 'RealTimeStream', '_original_read_excel', 'open', 'exit', 'quit', 'get_ipython']

# Reset shared_context but keep the structure
globals()['shared_context'] = {'docs': {}, 'dfs': {}}

# Clear user variables
for var in list(globals().keys()):
    if var not in keep_list and not var.startswith('_') and var not in __builtins__:
        del globals()[var]
                    `);
                    console.log('[Worker] Context Cleared.');
                    ctx.postMessage({ type: 'RESPONSE', success: true, id });
                } catch (err: any) {
                    ctx.postMessage({ type: 'RESPONSE', success: false, error: err.message, id });
                }
            })();
            break;
    }
};
