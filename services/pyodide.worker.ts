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

            # Step 1: Install Essential Excel engines (BLOCKING)
            print("[Worker] Installing essential Excel engines (openpyxl, xlrd)...")
            if not os.path.exists('/mnt'):
                os.makedirs('/mnt')
            try:
                pass 
            except Exception as e:
                print(f"Error during essential load: {e}")

            # Define Arsenal Loading logic
            async def load_extra_arsenal():
                try:
                    # Optional Analytics (Audit Tier - loaded in background)
                    await micropip.install(['scipy', 'matplotlib'])
                    print("Sandbox Arsenal Background Tier Loaded: scipy, matplotlib")
                except Exception as e:
                    print(f"Warning: Background Arsenal failed to load: {e}")

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

            # Backup original read_excel
            _original_read_excel = pd.read_excel

            # Global files storage for virtual datasets
            files = {}

            # Improved mock for pd.read_excel to support virtual data access
            def mocked_read_excel(path, *args, **kwargs):
                if isinstance(path, str) and path.startswith('/mnt/'):
                    fname = path.replace('/mnt/', '')
                    if 'files' in globals() and fname in files:
                        data = files[fname]
                        sheet_name = kwargs.get('sheet_name', 0)
                        
                        if sheet_name is None:
                            if isinstance(data, dict):
                                return {sname: pd.DataFrame(sdata) for sname, sdata in data.items()}
                            else:
                                return {'Result': pd.DataFrame(data)}

                        if isinstance(data, dict):
                            if isinstance(sheet_name, int):
                                try:
                                    sheet_name = list(data.keys())[sheet_name]
                                except IndexError:
                                    return pd.DataFrame()
                            return pd.DataFrame(data.get(sheet_name, []))
                        else:
                            return pd.DataFrame(data)
                            
                return _original_read_excel(path, *args, **kwargs)
            
            pd.read_excel = mocked_read_excel

            def clean_output(obj):
                if isinstance(obj, pd.DataFrame):
                    return obj.to_dict(orient='records')
                if isinstance(obj, dict):
                    return {k: clean_output(v) for k, v in obj.items()}
                if isinstance(obj, list):
                    return [clean_output(i) for i in obj]
                try:
                    json.dumps(obj)
                    return obj
                except:
                    return str(obj)
        `);

        // Await essential engines before proceeding
        console.log('[Worker] Awaiting essential Excel engines...');
        await pyodide.runPythonAsync('import micropip; await micropip.install(["openpyxl", "xlrd"])');
        console.log('[Worker] Essential engines ready.');

        // Trigger optional analytics in the background
        pyodide.runPythonAsync('import asyncio; asyncio.ensure_future(load_extra_arsenal())');

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
        const cleanedCode = code.trim();

        // Inject the code into Python globals as a raw string to avoid character escaping hell
        pyodide.globals.set('__user_code_raw', cleanedCode);

        const wrapper = `
import sys
from io import StringIO

_last_output_capture = None
try:
    # Use globals()['__user_code_raw'] to get the exact code without string interpolation issues
    _code = globals().get('__user_code_raw', '')
    try:
        # We execute the code and capture the last result
        _last_output_capture = eval(compile(_code, '<string>', 'eval'), globals())
    except SyntaxError:
        # If it's not an expression, just execute it
        exec(compile(_code, '<string>', 'exec'), globals())
        _last_output_capture = "Execution completed (Statement)"
except Exception as e:
    raise e
finally:
    # Cleanup the temporary code variable
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
                        globals().clear()
                        # Re-register core essentials if needed or just wipe most
                        print("Sandbox Reset Completed.")
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
    }
};
