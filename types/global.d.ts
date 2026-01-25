/**
 * 全局类型定义
 *
 * 扩展浏览器和 Node.js 的全局类型
 */

/**
 * 扩展 Performance 接口，添加 memory 属性
 *
 * 注意：performance.memory 是 Chrome 特有的非标准 API
 * 其他浏览器可能不支持
 */
declare global {
  interface Performance {
    /**
     * 内存信息（Chrome 特有）
     */
    memory?: {
      /** 已使用的 JS 堆大小（字节） */
      usedJSHeapSize: number;
      /** 总分配的 JS 堆大小（字节） */
      totalJSHeapSize: number;
      /** JS 堆大小限制（字节） */
      jsHeapSizeLimit: number;
    };
  }

  interface PerformanceEntry {
    // 确保 PerformanceEntry 类型可用
    name: string;
    entryType: string;
    startTime: number;
    duration: number;
  }

  interface PerformanceObserver {
    observe(options: { entryTypes: string[] }): void;
    disconnect(): void;
  }

  interface Window {
    PerformanceObserver: {
      new(callback: (entries: PerformanceEntryList) => void): PerformanceObserver;
    };
  }

  type PerformanceEntryList = PerformanceEntry[];
}

// 确保这是全局模块
export {};
