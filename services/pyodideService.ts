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

            // We load Pyodide from CDN
            // In a production app, you might want to host these files yourself
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

            logger.info('Pyodide loaded. Installing pandas...');
            await pyodide.loadPackage(['pandas', 'micropip']);

            // Standard setup
            await pyodide.runPythonAsync(`
        import pandas as pd
        import json
        import io
      `);

            logger.info('Pyodide and pandas are ready.');
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
 * Executes Python code with data input
 * @param code Python code string
 * @param datasets Map of filename -> data array or multi-sheet object
 */
export const runPython = async (
    code: string,
    datasets: { [fileName: string]: any }
): Promise<{ [fileName: string]: any }> => {
    const instance = await loadPyodide();

    // 1. Transfer data to Python
    // We convert JS objects to JSON strings and then load them in Python
    instance.globals.set('__input_data_json', JSON.stringify(datasets));

    await instance.runPythonAsync(`
    import json
    files = json.loads(__input_data_json)
    
    # helper to convert dict of lists to dataframes
    def get_df(filename, sheet=None):
        data = files.get(filename)
        if isinstance(data, dict) and sheet:
            return pd.DataFrame(data.get(sheet, []))
        elif isinstance(data, list):
            return pd.DataFrame(data)
        return pd.DataFrame()

    # User code will run here
  `);

    try {
        // 2. Run user code
        // The code should manipulate the 'files' object
        await instance.runPythonAsync(code);

        // 3. Retrieve result
        const resultJson = await instance.runPythonAsync(`
      # Ensure everything is serializable back to JSON
      def clean_output(obj):
          if isinstance(obj, pd.DataFrame):
              return obj.to_dict(orient='records')
          if isinstance(obj, dict):
              return {k: clean_output(v) for k, v in obj.items()}
          if isinstance(obj, list):
              return [clean_output(i) for i in obj]
          return obj

      json.dumps(clean_output(files))
    `);

        return JSON.parse(resultJson);
    } catch (error: any) {
        logger.error('Python execution error in Sandbox', error);
        throw new Error(`Python Sandbox Error: ${error.message}`);
    }
};
