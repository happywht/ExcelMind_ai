// esbuild configuration for backend bundling
import * as esbuild from 'esbuild';

// Node.js built-in modules to mark as external
const nodeBuiltins = [
    'fs', 'path', 'os', 'crypto', 'http', 'https', 'net', 'tls',
    'zlib', 'stream', 'util', 'events', 'buffer', 'url', 'querystring',
    'child_process', 'cluster', 'dgram', 'dns', 'readline', 'repl',
    'tty', 'v8', 'vm', 'worker_threads', 'perf_hooks', 'async_hooks',
    'inspector', 'trace_events', 'assert', 'console', 'constants',
    'domain', 'module', 'process', 'punycode', 'string_decoder', 'timers'
];

await esbuild.build({
    entryPoints: ['server/standalone-entry.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: 'dist-backend/index.js',
    minify: true,
    sourcemap: true,
    external: [
        ...nodeBuiltins,
        '*.node',  // Native modules
    ],
    banner: {
        js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
    }
});

console.log('✅ Backend bundled successfully');
