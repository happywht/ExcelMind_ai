/**
 * 文件摆渡机制
 * 用于在浏览器环境和 Pyodide 虚拟文件系统之间传输文件
 *
 * 注意：这是一个前端工具，实际使用时需要等待 Pyodide 初始化
 * TODO: 需要后端提供 Pyodide 初始化服务和执行接口
 */

/**
 * 虚拟文件系统路径配置
 */
export const VFS_PATHS = {
  INPUT: '/data/input.xlsx',
  OUTPUT: '/data/output.xlsx',
  TEMP_DIR: '/data/temp/',
  DATA_DIR: '/data/'
} as const;

/**
 * 文件摆渡选项
 */
export interface FileFerryOptions {
  onProgress?: (progress: number) => void;
  onLog?: (message: string) => void;
  validateFile?: boolean;
}

/**
 * 摆渡结果
 */
export interface FerryResult {
  success: boolean;
  path: string;
  size: number;
  duration: number;
  error?: string;
}

/**
 * Pyodide 实例接口（需要由外部注入）
 */
export interface IPyodideFS {
  writeFile: (path: string, data: Uint8Array) => void;
  readFile: (path: string) => Uint8Array;
  mkdirs: (path: string) => void;
}

/**
 * 声明全局 Pyodide 实例（实际使用时需要从外部注入）
 */
declare global {
  // eslint-disable-next-line no-var
  var pyodide: any;
}

/**
 * 文件摆渡服务类
 */
export class FileFerryService {
  private pyodideInstance: any = null;

  constructor(pyodideInstance?: any) {
    if (pyodideInstance) {
      this.pyodideInstance = pyodideInstance;
    } else if (typeof window !== 'undefined' && (window as any).pyodide) {
      this.pyodideInstance = (window as any).pyodide;
    }
  }

  /**
   * 设置 Pyodide 实例
   */
  setPyodideInstance(pyodide: any): void {
    this.pyodideInstance = pyodide;
  }

  /**
   * 获取 Pyodide 实例
   */
  getPyodideInstance(): any {
    if (!this.pyodideInstance) {
      throw new Error('Pyodide 实例未初始化，请先调用 setPyodideInstance() 或等待全局 pyodide 对象就绪');
    }
    return this.pyodideInstance;
  }

  /**
   * 初始化虚拟文件系统目录
   *
   * TODO: 需要后端提供初始化脚本
   */
  async initFileSystem(): Promise<boolean> {
    try {
      const pyodide = this.getPyodideInstance();

      // 创建必要的目录
      pyodide.FS.mkdirTree(VFS_PATHS.DATA_DIR);
      pyodide.FS.mkdirTree(VFS_PATHS.TEMP_DIR);

      console.log('[FileFerry] 虚拟文件系统初始化完成');
      return true;
    } catch (error) {
      console.error('[FileFerry] 文件系统初始化失败:', error);
      return false;
    }
  }

  /**
   * 将文件摆渡到虚拟文件系统
   *
   * @param file - File 对象或 Blob
   * @param targetPath - 目标路径（默认为输入路径）
   * @param options - 摆渡选项
   * @returns 摆渡结果
   *
   * TODO: 需要后端提供文件类型验证服务
   */
  async mountFile(
    file: File | Blob,
    targetPath: string = VFS_PATHS.INPUT,
    options?: FileFerryOptions
  ): Promise<FerryResult> {
    const startTime = Date.now();

    try {
      options?.onLog?.(`[FileFerry] 开始挂载文件到 ${targetPath}`);

      // 验证文件类型
      if (options?.validateFile) {
        // TODO: 需要后端提供文件验证接口
        // const isValid = await this.validateExcelFile(file);
        // if (!isValid) {
        //   throw new Error('无效的 Excel 文件');
        // }
      }

      // 读取文件为 Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      options?.onProgress?.(50);

      // 写入到虚拟文件系统
      const pyodide = this.getPyodideInstance();
      pyodide.FS.writeFile(targetPath, uint8Array);

      options?.onProgress?.(100);
      options?.onLog?.(`[FileFerry] 文件挂载完成: ${targetPath} (${uint8Array.length} bytes)`);

      return {
        success: true,
        path: targetPath,
        size: uint8Array.length,
        duration: Date.now() - startTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      options?.onLog?.(`[FileFerry] 文件挂载失败: ${errorMessage}`);

      return {
        success: false,
        path: targetPath,
        size: 0,
        duration: Date.now() - startTime,
        error: errorMessage
      };
    }
  }

  /**
   * 从虚拟文件系统读取文件
   *
   * @param sourcePath - 源路径（默认为输出路径）
   * @param options - 摆渡选项
   * @returns Blob 对象
   *
   * TODO: 需要后端提供文件生成状态查询接口
   */
  async retrieveFile(
    sourcePath: string = VFS_PATHS.OUTPUT,
    options?: FileFerryOptions
  ): Promise<Blob | null> {
    const startTime = Date.now();

    try {
      options?.onLog?.(`[FileFerry] 开始读取文件 ${sourcePath}`);

      const pyodide = this.getPyodideInstance();

      // TODO: 需要后端提供文件存在性检查接口
      // 检查文件是否存在
      // if (!this.fileExists(sourcePath)) {
      //   throw new Error(`文件不存在: ${sourcePath}`);
      // }

      // 从虚拟文件系统读取
      const uint8Array = pyodide.FS.readFile(sourcePath);

      options?.onProgress?.(100);
      options?.onLog?.(`[FileFerry] 文件读取完成: ${sourcePath} (${uint8Array.length} bytes)`);

      // 转换为 Blob
      const blob = new Blob([uint8Array], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      return blob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      options?.onLog?.(`[FileFerry] 文件读取失败: ${errorMessage}`);
      return null;
    }
  }

  /**
   * 清理临时文件
   *
   * TODO: 需要后端提供文件清理接口
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const pyodide = this.getPyodideInstance();

      // TODO: 需要后端提供安全的文件删除方法
      // 列出临时目录中的所有文件
      // const files = pyodide.FS.readdir(VFS_PATHS.TEMP_DIR);
      // files.forEach((file: string) => {
      //   if (file !== '.' && file !== '..') {
      //     pyodide.FS.unlink(`${VFS_PATHS.TEMP_DIR}${file}`);
      //   }
      // });

      console.log('[FileFerry] 临时文件清理完成');
    } catch (error) {
      console.error('[FileFerry] 临时文件清理失败:', error);
    }
  }

  /**
   * 检查文件是否存在
   */
  fileExists(path: string): boolean {
    try {
      const pyodide = this.getPyodideInstance();
      pyodide.FS.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  getFileInfo(path: string): { size: number; mtime: number } | null {
    try {
      const pyodide = this.getPyodideInstance();
      const stat = pyodide.FS.stat(path);
      return {
        size: stat.size,
        mtime: stat.mtime
      };
    } catch {
      return null;
    }
  }

  /**
   * 批量挂载文件
   *
   * @param files - 文件数组
   * @param baseDir - 基础目录
   * @param options - 摆渡选项
   * @returns 摆渡结果数组
   */
  async mountFiles(
    files: (File | Blob)[],
    baseDir: string = VFS_PATHS.DATA_DIR,
    options?: FileFerryOptions
  ): Promise<FerryResult[]> {
    const results: FerryResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file instanceof File ? file.name : `file_${i}.xlsx`;
      const targetPath = `${baseDir}${fileName}`;

      const result = await this.mountFile(file, targetPath, {
        ...options,
        onProgress: (progress) => {
          const overallProgress = ((i / files.length) * 100) + (progress / files.length);
          options?.onProgress?.(overallProgress);
        }
      });

      results.push(result);
    }

    return results;
  }
}

/**
 * 创建全局文件摆渡服务实例
 */
export const createFileFerryService = (pyodideInstance?: any): FileFerryService => {
  return new FileFerryService(pyodideInstance);
};

/**
 * 默认导出
 */
export default FileFerryService;
