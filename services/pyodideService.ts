// Basic logger replacement using console
const logger = {
    info: (...args: any[]) => console.log('[Info]', ...args),
    error: (...args: any[]) => console.error('[Error]', ...args),
    warn: (...args: any[]) => console.warn('[Warn]', ...args),
};

// Pyodide instance type hint
let pyodide: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

/**
 * Loads Pyodide and installs necessary packages
 */
export const loadPyodide = async (): Promise<any> => {
    if (pyodide) return pyodide;
    if (isLoading) return loadPromise;

    isLoading = true;
    loadPromise = (async () => {
        try {
            logger.info('Loading Pyodide...');

            if (!(window as any).loadPyodide) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
                document.head.appendChild(script);

                await new Promise((resolve) => {
                    script.onload = resolve;
                });
            }

            pyodide = await (window as any).loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
            });

            logger.info('Pyodide loaded. Initializing micropip for robust package management...');
            await pyodide.loadPackage('micropip');

            // Use micropip to install pandas and openpyxl
            // This is more robust for engine registration than loadPackage for some reason in certain CDN mirrors
            const micropip = pyodide.pyimport('micropip');
            await micropip.install(['pandas', 'openpyxl']);

            // Standard setup & Mocked IO layer
            await pyodide.runPythonAsync(`
                import pandas as pd
                import json
                import io
                import os
                import openpyxl
                
                # Verify Excel support immediately
                try:
                    pd.DataFrame().to_excel(io.BytesIO(), engine='openpyxl')
                    print("Sandbox: Excel engine (openpyxl) registered successfully.")
                except Exception as e:
                    print(f"Sandbox Warning: Excel engine registration issues: {e}")

                # Mocked IO to support seamless /mnt path access without actual disk IO
                _original_read_excel = pd.read_excel
                
                def mocked_read_excel(path, *args, **kwargs):
                    if isinstance(path, str) and path.startswith('/mnt/'):
                        fname = path.replace('/mnt/', '')
                        if 'files' in globals() and fname in files:
                            data = files[fname]
                            sheet_name = kwargs.get('sheet_name', 0)
                            
                            if isinstance(data, dict):
                                if isinstance(sheet_name, int):
                                    sheet_name = list(data.keys())[sheet_name]
                                return pd.DataFrame(data.get(sheet_name, []))
                            else:
                                return pd.DataFrame(data)
                                
                    return _original_read_excel(path, *args, **kwargs)
                
                pd.read_excel = mocked_read_excel
            `);

            logger.info('Pyodide environment (v2.2) is fully initialized.');
            isLoading = false;
            return pyodide;
        } catch (error) {
            logger.error('Failed to load Pyodide', error);
            isLoading = false;
            throw error;
        }
    })();

    return loadPromise;
};

/**
 * Executes Python code with data input and virtual file system mapping
 * @param code Python code string
 * @param datasets Map of filename -> data array or multi-sheet object
 */
export const runPython = async (
    code: string,
    datasets: { [fileName: string]: any }
): Promise<{ data: { [fileName: string]: any }, logs: string, result: any }> => {
    const instance = await loadPyodide();

    // 1. Prepare Environment & VFS
    // Support stdout redirection
    await instance.runPythonAsync(`
        import sys
        import io
        import json
        import pandas as pd
        
        # Buffer for stdout
        sys.stdout = io.StringIO()
        
        # Data helper
        def get_df(filename, sheet=None):
            if filename not in files:
                return pd.DataFrame()
            data = files[filename]
            if isinstance(data, dict) and sheet:
                return pd.DataFrame(data.get(sheet, []))
            elif isinstance(data, list):
                return pd.DataFrame(data)
            return pd.DataFrame()

        # Input data
        files = {}
    `);

    // 2. Transfer data to Python and Sync to Virtual Filesystem
    instance.globals.set('__input_data_json', JSON.stringify(datasets));
    await instance.runPythonAsync(`
        input_data = json.loads(__input_data_json)
        files.update(input_data)
        
        # Map to virtual filesystem for seamless read_excel support
        if not os.path.exists('/mnt'):
            os.makedirs('/mnt')
            
        for fname, content in input_data.items():
            path = f'/mnt/{fname}'
            try:
                if isinstance(content, dict):
                    # Multi-sheet
                    with pd.ExcelWriter(path, engine='openpyxl') as writer:
                        for sname, sdata in content.items():
                            if sdata:
                                pd.DataFrame(sdata).to_excel(writer, sheet_name=sname, index=False)
                            else:
                                # Create empty sheet if no data
                                pd.DataFrame().to_excel(writer, sheet_name=sname, index=False)
                else:
                    # Single sheet (List of records)
                    pd.DataFrame(content).to_excel(path, engine='openpyxl', index=False)
            except Exception as e:
                print(f"Warning: Failed to write {fname} to /mnt: {e}")
    `);

    try {
        // 3. Run user code and capture result
        // We trim the code to remove leading/trailing newlines which can cause IndentationError in runPython
        const cleanedCode = code.trim();
        const lastValue = await instance.runPythonAsync(cleanedCode);

        // 4. Retrieve logs and modified data
        // We capture the output and results in a single structured object
        // NOTE: We also scan /mnt/ for any NEWLY created files that might not be in the 'files' variable
        const finalResultJson = await instance.runPythonAsync(`
            stdout_val = sys.stdout.getvalue()
            
            # Sync files from /mnt/ back to 'files' variable if they exist as physical files
            import os
            if os.path.exists('/mnt'):
                for f in os.listdir('/mnt'):
                    if f.endswith('.xlsx') or f.endswith('.xls'):
                        try:
                            # If it was modified/created, try to load it into 'files'
                            # We only do this if it's not already 'better' represented in 'files' or if we want force sync
                            # For simplicity, we trust the /mnt/ version as the final authority for physical exports
                            sheet_data = pd.read_excel(f'/mnt/{f}', sheet_name=None)
                            files[f] = {sname: df.to_dict(orient='records') for sname, df in sheet_data.items()}
                        except Exception as e:
                            print(f"Sync Warning: Failed to re-read {f} from /mnt: {e}")

            def clean_output(obj):
                if isinstance(obj, pd.DataFrame):
                    return obj.to_dict(orient='records')
                if isinstance(obj, dict):
                    return {k: clean_output(v) for k, v in obj.items()}
                if isinstance(obj, list):
                    return [clean_output(i) for i in obj]
                return obj

            import json
            json.dumps({
                "files": clean_output(files),
                "logs": stdout_val,
                "last_value": clean_output(lastValue) if 'lastValue' in locals() else None
            })
        `);

        const parsed = JSON.parse(finalResultJson);

        return {
            data: parsed.files,
            logs: parsed.logs,
            result: parsed.last_value
        };
    } catch (error: any) {
        const errorLogs = await instance.runPythonAsync(`sys.stdout.getvalue()`).catch(() => "");
        logger.error('Python execution error in Sandbox', error);
        throw new Error(`Python Sandbox Error: ${error.message}\nLogs:\n${errorLogs}`);
    }
};
