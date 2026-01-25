/**
 * 第三方库类型声明文件
 *
 * 为缺少类型定义的第三方库提供类型声明
 *
 * @version 1.0.0
 */

// ============================================================
// @storybook/react 类型声明
// ============================================================

declare module '@storybook/react' {
  import { ComponentType, ReactNode } from 'react';

  export interface Meta<T = {}> {
    title: string;
    component?: ComponentType<T>;
    parameters?: Record<string, unknown>;
    tags?: string[];
    argTypes?: Record<string, unknown>;
  }

  export interface StoryObj<T = {}> {
    args?: T;
    parameters?: Record<string, unknown>;
  }

  export interface StoryContext<T = {}> {
    args: T;
    globals: Record<string, unknown>;
  }

  export function storiesOf(name: string, module: NodeModule): any;
}

// ============================================================
// @google/genai 类型声明
// ============================================================

declare module '@google/genai' {
  export interface GoogleGenAIOptions {
    apiKey?: string;
    baseURL?: string;
  }

  export class GoogleGenAI {
    constructor(options: GoogleGenAIOptions);
    models: ModelsAPI;
  }

  export interface ModelsAPI {
    generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse>;
  }

  export interface GenerateContentRequest {
    model: string;
    contents?: string | Content[];
    config?: {
      systemInstruction?: string;
      responseMimeType?: string;
      [key: string]: unknown;
    };
  }

  export interface Content {
    role: string;
    parts: Part[];
  }

  export interface Part {
    text?: string;
    [key: string]: unknown;
  }

  export interface GenerateContentResponse {
    text?: string;
    candidates?: Candidate[];
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  }

  export interface Candidate {
    content?: Content;
    finishReason?: string;
    index?: number;
  }
}

// ============================================================
// PizZip 类型扩展
// ============================================================

declare module 'pizzip' {
  import JSZip from 'jszip';

  interface JSZipObject {
    async(type: 'string' | 'base64' | 'blob' | 'uint8array' | 'arraybuffer'): Promise<any>;
    asText(): string;
    asBinary(): string;
    asNodeBuffer(): Buffer;
    asUint8Array(): Uint8Array;
    asArrayBuffer(): ArrayBuffer;
  }

  class PizZip extends JSZip {
    constructor(data?: string | ArrayBuffer | Uint8Array | Buffer, options?: any);
    load(data: string | ArrayBuffer | Uint8Array | Buffer, options?: any): PizZip;
    file(path: string): JSZipObject | null;
    file(path: string, data: any, options?: any): PizZip;
    generate(options?: {
      type?: 'blob' | 'base64' | 'arraybuffer' | 'binarystring' | 'uint8array' | 'string';
      compression?: 'DEFLATE' | 'NONE';
      compressionOptions?: { level?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; };
      mimeType?: string;
    }): any;
  }

  export default PizZip;
  export { PizZip };
}

// ============================================================
// JSZip 类型扩展
// ============================================================

declare module 'jszip' {
  interface JSZipObject {
    async(type: 'string' | 'base64' | 'blob' | 'uint8array' | 'arraybuffer'): Promise<any>;
  }

  export default class JSZip {
    constructor();
    load(data: any, options?: any): JSZip;
    file(path: string): JSZipObject | null;
    file(path: string, data: any, options?: any): JSZip;
    folder(name: string): JSZip;
    generateAsync(options?: any): Promise<Blob>;
  }
}

// ============================================================
// docx-templates 类型声明
// ============================================================

declare module 'docx-templates' {
  export interface CreateReportOptions {
    template: Buffer;
    data: any;
    outputBufferSize?: number;
    cmdDelimiter?: [string, string];
    processLineBreaks?: boolean;
    noSandbox?: boolean;
    sandbox?: any;
  }

  export function createReport(options: CreateReportOptions): Promise<Buffer>;
}

// ============================================================
// PDF.js 动态导入类型声明
// ============================================================

declare module 'pdfjs-dist/types/src/pdf' {
  const pdfjs: any;
  export default pdfjs;
}

declare module 'pdfjs-dist' {
  import * as pdfjs from 'pdfjs-dist/types/src/pdf';
  export default pdfjs;
  export * from 'pdfjs-dist/types/src/pdf';
}
