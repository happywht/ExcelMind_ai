import { generateWithDocxtemplater } from '../src/services/docxtemplaterService';
import PizZip from 'pizzip';
import { fileURLToPath } from 'url';

// Polyfill Blob if not available
if (typeof global.Blob === 'undefined') {
    global.Blob = class Blob {
        size: number;
        type: string;
        constructor(content: any[], options: any = {}) {
            this.size = content.reduce((acc, curr) => acc + (curr.length || 0), 0);
            this.type = options.type || '';
        }
    } as any;
}

// Polyfill TextEncoder/TextDecoder if not available
if (typeof global.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}

// Polyfill performance if not available
if (typeof global.performance === 'undefined') {
    global.performance = {
        now: () => Date.now()
    } as any;
}

async function runTests() {
    console.log('Running DocxtemplaterService Dry Run Tests...');

    let validTemplateBuffer: ArrayBuffer;

    // Setup
    const zip = new PizZip();
    zip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello {{name}}!</w:t></w:r></w:p></w:body></w:document>');
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');

    validTemplateBuffer = zip.generate({ type: 'arraybuffer' });
    console.log('Template buffer size:', validTemplateBuffer.byteLength);

    try {
        new PizZip(validTemplateBuffer);
        console.log('PizZip creation successful in test');
    } catch (e) {
        console.error('PizZip creation failed in test:', e);
    }

    // Test 1
    try {
        console.log('Test 1: should return empty blob in dry run mode when data is valid');
        const blob = await generateWithDocxtemplater({
            templateBuffer: validTemplateBuffer,
            data: { name: 'World' },
            dryRun: true
        });

        if (blob instanceof Blob && blob.size === 0) {
            console.log('✓ Passed');
        } else {
            console.error('✗ Failed: Expected empty Blob, got size', blob.size);
            process.exit(1);
        }
    } catch (e: any) {
        console.error('✗ Failed with error:', e);
        if (e.details) console.error('Details:', JSON.stringify(e.details, null, 2));
        if (e.stack) console.error('Stack:', e.stack);
        process.exit(1);
    }

    // Test 2
    try {
        console.log('Test 2: should return full blob when dry run is false');
        const blob = await generateWithDocxtemplater({
            templateBuffer: validTemplateBuffer,
            data: { name: 'World' },
            dryRun: false
        });

        if (blob instanceof Blob && blob.size > 0) {
            console.log('✓ Passed');
        } else {
            console.error('✗ Failed: Expected non-empty Blob, got size', blob.size);
            process.exit(1);
        }
    } catch (e: any) {
        console.error('✗ Failed with error:', e);
        process.exit(1);
    }

    console.log('All tests passed!');
}

// Check if running directly
const isDirectRun = () => {
    try {
        if (import.meta && import.meta.url) {
            const currentFile = fileURLToPath(import.meta.url);
            const executedFile = process.argv[1];
            return currentFile === executedFile || executedFile.endsWith(currentFile);
        }
    } catch (e) { }
    return false;
};

if (isDirectRun()) {
    runTests().catch(e => {
        console.error(e);
        process.exit(1);
    });
}
