/**
 * 虚拟文件系统服务
 *
 * 核心职责：
 * 1. 管理标准化的虚拟文件系统路径
 * 2. 文件摆渡：File → Uint8Array → Pyodide FS
 * 3. 提供文件系统抽象层
 * 4. 支持文件挂载、读取、卸载
 *
 * @author Fullstack Developer
 * @version 1.0.0
 */

import { getPyodideService } from './PyodideService';

/**
 * 标准化路径配置
 */
export const STANDARD_PATHS = {
  INPUT: '/data/input.xlsx',
  OUTPUT: '/data/output.xlsx',
  TEMP_DIR: '/data/temp',
  WORKING_DIR: '/data',
  OUTPUT_DIR: '/output'
} as const;

/**
 * 文件信息
 */
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: number;
}

/**
 * 文件摆渡选项
 */
export interface FileFerryOptions {
  targetPath?: string;
  validateFormat?: boolean;
  maxSize?: number;
}

/**
 * 文件系统服务类
 */
export class FileSystemService {
  private static instance: FileSystemService | null = null;
  private pyodideService = getPyodideService();

  private constructor() {
    console.log('[FileSystemService] Service created');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService();
    }
    return FileSystemService.instance;
  }

  /**
   * 文件摆渡：File → Uint8Array → Pyodide FS
   *
   * 这是核心的文件摆渡方法，将浏览器 File 对象转换为
   * Pyodide 虚拟文件系统中的文件
   *
   * @param file 浏览器 File 对象
   * @param options 摆渡选项
   * @returns 挂载的文件路径
   */
  public async ferryFile(
    file: File,
    options: FileFerryOptions = {}
  ): Promise<string> {
    const {
      targetPath = STANDARD_PATHS.INPUT,
      validateFormat = true,
      maxSize = 50 * 1024 * 1024 // 50MB
    } = options;

    console.log(`[FileSystemService] Starting file ferry: ${file.name} -> ${targetPath}`);

    // 验证文件格式
    if (validateFormat) {
      this.validateExcelFile(file);
    }

    // 验证文件大小
    if (file.size > maxSize) {
      throw new Error(`File size (${file.size}) exceeds maximum allowed size (${maxSize})`);
    }

    try {
      // Step 1: File → ArrayBuffer
      console.log('[FileSystemService] Step 1: Converting File to ArrayBuffer...');
      const arrayBuffer = await file.arrayBuffer();
      console.log(`[FileSystemService] ✅ ArrayBuffer created (${arrayBuffer.byteLength} bytes)`);

      // Step 2: ArrayBuffer → Uint8Array
      console.log('[FileSystemService] Step 2: Converting ArrayBuffer to Uint8Array...');
      const uint8Array = new Uint8Array(arrayBuffer);
      console.log(`[FileSystemService] ✅ Uint8Array created (${uint8Array.length} bytes)`);

      // Step 3: Uint8Array → Pyodide FS
      console.log('[FileSystemService] Step 3: Mounting to Pyodide FS...');
      this.pyodideService.mountFile(file.name, uint8Array, targetPath);
      console.log(`[FileSystemService] ✅ File mounted to ${targetPath}`);

      // 返回挂载的路径
      return targetPath;
    } catch (error) {
      console.error('[FileSystemService] ❌ File ferry failed:', error);
      throw new Error(`Failed to ferry file ${file.name}: ${error}`);
    }
  }

  /**
   * 批量文件摆渡
   *
   * @param files 文件列表
   * @param options 摆渡选项
   * @returns 挂载的文件路径映射
   */
  public async ferryFiles(
    files: File[],
    options: FileFerryOptions = {}
  ): Promise<Map<string, string>> {
    console.log(`[FileSystemService] Ferrying ${files.length} files...`);

    const pathMap = new Map<string, string>();

    for (const file of files) {
      // 生成唯一的目标路径
      const targetPath = options.targetPath ||
        `${STANDARD_PATHS.TEMP_DIR}/${file.name}`;

      try {
        const mountedPath = await this.ferryFile(file, {
          ...options,
          targetPath
        });

        pathMap.set(file.name, mountedPath);
      } catch (error) {
        console.error(`[FileSystemService] Failed to ferry ${file.name}:`, error);
        // 继续处理其他文件
      }
    }

    console.log(`[FileSystemService] ✅ Ferried ${pathMap.size}/${files.length} files`);
    return pathMap;
  }

  /**
   * 从虚拟文件系统读取文件
   *
   * @param path 文件路径
   * @returns Blob 对象
   */
  public readFileAsBlob(path: string): Blob {
    console.log(`[FileSystemService] Reading file as blob: ${path}`);

    try {
      const data = this.pyodideService.readFile(path);

      // 根据文件扩展名确定 MIME 类型
      const mimeType = this.getMimeType(path);

      return new Blob([data], { type: mimeType });
    } catch (error) {
      console.error(`[FileSystemService] ❌ Failed to read file: ${path}`, error);
      throw error;
    }
  }

  /**
   * 从虚拟文件系统读取文件并下载
   *
   * @param path 文件路径
   * @param fileName 下载的文件名（默认使用路径中的文件名）
   */
  public downloadFile(path: string, fileName?: string): void {
    console.log(`[FileSystemService] Downloading file: ${path}`);

    try {
      const blob = this.readFileAsBlob(path);
      const url = URL.createObjectURL(blob);

      // 创建下载链接
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || path.split('/').pop() || 'download';

      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理 URL
      setTimeout(() => URL.revokeObjectURL(url), 100);

      console.log(`[FileSystemService] ✅ File downloaded: ${link.download}`);
    } catch (error) {
      console.error(`[FileSystemService] ❌ Failed to download file: ${path}`, error);
      throw error;
    }
  }

  /**
   * 列出目录中的文件
   *
   * @param path 目录路径
   * @returns 文件信息列表
   */
  public listFiles(path: string = STANDARD_PATHS.WORKING_DIR): FileInfo[] {
    console.log(`[FileSystemService] Listing files in: ${path}`);

    try {
      const status = this.pyodideService.getFileSystemStatus();
      const files: FileInfo[] = [];

      for (const filePath of status.mountedFiles) {
        // 只返回指定目录下的文件
        if (filePath.startsWith(path) || path === STANDARD_PATHS.WORKING_DIR) {
          const fileName = filePath.split('/').pop() || '';
          const stat = this.pyodideService.readFile(filePath); // 这里需要优化

          files.push({
            name: fileName,
            path: filePath,
            size: stat.length || 0,
            type: this.getMimeType(fileName),
            lastModified: Date.now()
          });
        }
      }

      return files;
    } catch (error) {
      console.error('[FileSystemService] ❌ Failed to list files:', error);
      return [];
    }
  }

  /**
   * 删除文件
   *
   * @param path 文件路径
   */
  public deleteFile(path: string): void {
    console.log(`[FileSystemService] Deleting file: ${path}`);

    try {
      this.pyodideService.unlinkFile(path);
      console.log(`[FileSystemService] ✅ File deleted: ${path}`);
    } catch (error) {
      console.error(`[FileSystemService] ❌ Failed to delete file: ${path}`, error);
      throw error;
    }
  }

  /**
   * 清理临时目录
   */
  public cleanupTemp(): void {
    console.log('[FileSystemService] Cleaning up temp directory...');

    try {
      const files = this.listFiles(STANDARD_PATHS.TEMP_DIR);

      for (const file of files) {
        this.deleteFile(file.path);
      }

      console.log('[FileSystemService] ✅ Temp directory cleaned');
    } catch (error) {
      console.error('[FileSystemService] ❌ Failed to cleanup temp:', error);
    }
  }

  /**
   * 获取标准化路径
   *
   * @param fileName 文件名
   * @param type 路径类型（input, output, temp）
   * @returns 标准化路径
   */
  public getStandardPath(
    fileName: string,
    type: 'input' | 'output' | 'temp' = 'input'
  ): string {
    switch (type) {
      case 'input':
        return STANDARD_PATHS.INPUT;
      case 'output':
        return STANDARD_PATHS.OUTPUT;
      case 'temp':
        return `${STANDARD_PATHS.TEMP_DIR}/${fileName}`;
      default:
        return `${STANDARD_PATHS.WORKING_DIR}/${fileName}`;
    }
  }

  /**
   * 验证 Excel 文件格式
   *
   * @param file 文件对象
   */
  private validateExcelFile(file: File): void {
    const validExtensions = ['.xlsx', '.xls'];
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    const hasValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    const hasValidMimeType = validMimeTypes.includes(file.type);

    if (!hasValidExtension && !hasValidMimeType) {
      throw new Error(
        `Invalid file format. Expected Excel file (.xlsx, .xls), got: ${file.name}`
      );
    }

    console.log('[FileSystemService] ✅ File validation passed');
  }

  /**
   * 获取 MIME 类型
   *
   * @param fileName 文件名
   * @returns MIME 类型字符串
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();

    const mimeMap: Record<string, string> = {
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'csv': 'text/csv',
      'txt': 'text/plain',
      'json': 'application/json',
      'pdf': 'application/pdf'
    };

    return mimeMap[extension || ''] || 'application/octet-stream';
  }

  /**
   * 获取文件系统统计信息
   */
  public getStats(): {
    totalFiles: number;
    totalSize: number;
    mountedFiles: string[];
  } {
    const status = this.pyodideService.getFileSystemStatus();

    return {
      totalFiles: status.mountedFiles.length,
      totalSize: status.totalSize,
      mountedFiles: status.mountedFiles
    };
  }
}

/**
 * 导出单例获取函数
 */
export const getFileSystemService = (): FileSystemService => {
  return FileSystemService.getInstance();
};

/**
 * 默认导出
 */
export default FileSystemService;
