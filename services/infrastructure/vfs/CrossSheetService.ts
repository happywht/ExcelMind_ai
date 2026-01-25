/**
 * 跨Sheet访问服务
 *
 * 核心职责：
 * 1. 解析 Sheet 引用
 * 2. 验证引用有效性
 * 3. 解析引用值
 * 4. 检测循环引用
 * 5. 支持深层嵌套引用
 *
 * @module infrastructure/vfs
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { getPyodideService } from '@services/wasm/PyodideService';
import { VirtualFileSystem } from './VirtualFileSystem';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Sheet 引用
 */
export interface SheetReference {
  sourceSheet: string;      // 源 Sheet 名称
  sourceRange: string;      // 源数据范围 (如 "A1:B10")
  targetSheet: string;      // 目标 Sheet 名称
  targetRange: string;      // 目标位置 (如 "C1")
  referenceType: 'value' | 'formula' | 'format';
  fileId?: string;          // 所属文件ID
}

/**
 * 引用验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  referencedSheets: string[];
  circularReferences: string[];
}

/**
 * 解析后的引用值
 */
export interface ResolvedReference {
  reference: SheetReference;
  value: any;
  sourceData: any[][];
  resolvedAt: number;
}

/**
 * 引用分析结果
 */
export interface ReferenceAnalysis {
  totalReferences: number;
  referencesByType: Record<string, number>;
  referencesBySheet: Record<string, number>;
  maxDepth: number;
  circularReferences: SheetReference[];
  externalReferences: SheetReference[];
}

/**
 * Sheet 数据快照
 */
export interface SheetSnapshot {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  data: any[][];
  formulas?: Map<string, string>;
  formats?: Map<string, any>;
  timestamp: number;
}

// ============================================================================
// 跨Sheet服务实现
// ============================================================================

/**
 * 跨Sheet访问服务类
 */
export class CrossSheetService extends EventEmitter {
  private static instance: CrossSheetService | null = null;
  private pyodideService = getPyodideService();
  private vfs: VirtualFileSystem;
  private snapshots: Map<string, SheetSnapshot> = new Map();
  private referenceCache: Map<string, ResolvedReference> = new Map();

  private readonly REFERENCE_PATTERN =
    /(?:=)?'?([^']+?)'?!([A-Z]+\d+)(?::([A-Z]+\d+))?/g;

  private constructor(vfs?: VirtualFileSystem) {
    super();
    this.vfs = vfs || VirtualFileSystem.getInstance();
    console.log('[CrossSheetService] Service created');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(vfs?: VirtualFileSystem): CrossSheetService {
    if (!CrossSheetService.instance) {
      CrossSheetService.instance = new CrossSheetService(vfs);
    }
    return CrossSheetService.instance;
  }

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    console.log('[CrossSheetService] Initializing...');

    // TODO: 从持久化存储恢复缓存

    console.log('[CrossSheetService] ✅ Initialization complete');
    this.emit('initialized');
  }

  // ========================================================================
  // 引用解析
  // ========================================================================

  /**
   * 解析 Sheet 引用
   */
  public parseReferences(
    sheetName: string,
    data: any[][],
    fileId?: string
  ): SheetReference[] {
    console.log(`[CrossSheetService] Parsing references for sheet: ${sheetName}`);

    const references: SheetReference[] = [];

    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const cellValue = data[row][col];

        if (typeof cellValue === 'string' || cellValue instanceof String) {
          const matches = this.extractReferences(cellValue.toString());

          for (const match of matches) {
            references.push({
              sourceSheet: match.sheetName,
              sourceRange: match.range,
              targetSheet: sheetName,
              targetRange: this.indexToRange(row, col),
              referenceType: this.detectReferenceType(cellValue.toString()),
              fileId,
            });
          }
        }
      }
    }

    console.log(`[CrossSheetService] Found ${references.length} references`);
    return references;
  }

  /**
   * 批量解析多个 Sheet 的引用
   */
  public async parseAllReferences(
    sheets: Map<string, any[][]>,
    fileId?: string
  ): Promise<Map<string, SheetReference[]>> {
    const result = new Map<string, SheetReference[]>();

    for (const [sheetName, data] of sheets.entries()) {
      const references = this.parseReferences(sheetName, data, fileId);
      result.set(sheetName, references);
    }

    return result;
  }

  // ========================================================================
  // 引用验证
  // ========================================================================

  /**
   * 验证引用有效性
   */
  public async validateReferences(
    refs: SheetReference[],
    availableSheets: string[]
  ): Promise<ValidationResult> {
    console.log(`[CrossSheetService] Validating ${refs.length} references`);

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      referencedSheets: [],
      circularReferences: [],
    };

    const referencedSheets = new Set<string>();

    for (const ref of refs) {
      // 检查源 Sheet 是否存在
      if (!availableSheets.includes(ref.sourceSheet)) {
        result.errors.push(
          `Sheet "${ref.sourceSheet}" not found (referenced from ${ref.targetSheet})`
        );
        result.valid = false;
      }

      // 检查源 Sheet 是否为目标 Sheet（自引用）
      if (ref.sourceSheet === ref.targetSheet) {
        result.warnings.push(
          `Self-reference detected in ${ref.targetSheet} (${ref.targetRange})`
        );
      }

      // 记录被引用的 Sheet
      referencedSheets.add(ref.sourceSheet);

      // 验证范围格式
      if (!this.isValidRange(ref.sourceRange)) {
        result.errors.push(
          `Invalid range format: ${ref.sourceRange} in ${ref.targetSheet}`
        );
        result.valid = false;
      }
    }

    result.referencedSheets = Array.from(referencedSheets);

    // 检测循环引用
    result.circularReferences = await this.detectCircularReferences(refs);

    if (result.circularReferences.length > 0) {
      result.valid = false;
      result.errors.push(
        `Found ${result.circularReferences.length} circular reference(s)`
      );
    }

    console.log(`[CrossSheetService] Validation result: ${result.valid ? 'VALID' : 'INVALID'}`);

    return result;
  }

  /**
   * 检测循环引用
   */
  public async detectCircularReferences(
    refs: SheetReference[]
  ): Promise<string[]> {
    console.log('[CrossSheetService] Detecting circular references');

    const circularRefs: string[] = [];

    // 构建引用图
    const graph = new Map<string, Set<string>>();

    for (const ref of refs) {
      if (!graph.has(ref.targetSheet)) {
        graph.set(ref.targetSheet, new Set());
      }
      graph.get(ref.targetSheet)!.add(ref.sourceSheet);
    }

    // 使用 DFS 检测循环
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (node: string, path: string[]): boolean => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || new Set();

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (detectCycle(neighbor, path)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // 找到循环
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          circularRefs.push(cycle.join(' -> ') + ' -> ' + neighbor);
          return true;
        }
      }

      path.pop();
      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        detectCycle(node, []);
      }
    }

    console.log(`[CrossSheetService] Found ${circularRefs.length} circular references`);

    return circularRefs;
  }

  // ========================================================================
  // 引用解析
  // ========================================================================

  /**
   * 解析引用值
   */
  public async resolveReferences(
    refs: SheetReference[],
    sheetData: Map<string, any[][]>
  ): Promise<Map<string, ResolvedReference>> {
    console.log(`[CrossSheetService] Resolving ${refs.length} references`);

    const result = new Map<string, ResolvedReference>();

    for (const ref of refs) {
      try {
        const resolved = await this.resolveReference(ref, sheetData);
        result.set(this.getReferenceKey(ref), resolved);
      } catch (error) {
        console.error(`[CrossSheetService] Failed to resolve reference:`, ref, error);
      }
    }

    console.log(`[CrossSheetService] Resolved ${result.size} references`);

    return result;
  }

  /**
   * 解析单个引用
   */
  public async resolveReference(
    ref: SheetReference,
    sheetData: Map<string, any[][]>
  ): Promise<ResolvedReference> {
    // 检查缓存
    const cacheKey = this.getReferenceKey(ref);
    const cached = this.referenceCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    console.log(`[CrossSheetService] Resolving reference: ${ref.sourceSheet}!${ref.sourceRange}`);

    // 获取源数据
    const sourceData = sheetData.get(ref.sourceSheet);
    if (!sourceData) {
      throw new Error(`Source sheet not found: ${ref.sourceSheet}`);
    }

    // 解析范围并提取数据
    const extractedData = this.extractRangeData(sourceData, ref.sourceRange);

    const resolved: ResolvedReference = {
      reference: ref,
      value: this.extractValue(extractedData, ref.referenceType),
      sourceData: extractedData,
      resolvedAt: Date.now(),
    };

    // 缓存结果
    this.referenceCache.set(cacheKey, resolved);

    return resolved;
  }

  // ========================================================================
  // Sheet 数据管理
  // ========================================================================

  /**
   * 创建 Sheet 快照
   */
  public async createSnapshot(
    fileId: string,
    sheetName: string,
    data: any[][]
  ): Promise<SheetSnapshot> {
    console.log(`[CrossSheetService] Creating snapshot for ${fileId}:${sheetName}`);

    const snapshot: SheetSnapshot = {
      sheetName,
      rowCount: data.length,
      columnCount: data.length > 0 ? data[0].length : 0,
      data: this.cloneData(data),
      formulas: new Map(), // TODO: 提取公式
      formats: new Map(),   // TODO: 提取格式
      timestamp: Date.now(),
    };

    const key = this.getSnapshotKey(fileId, sheetName);
    this.snapshots.set(key, snapshot);

    console.log(`[CrossSheetService] ✅ Snapshot created: ${key}`);

    return snapshot;
  }

  /**
   * 获取 Sheet 快照
   */
  public getSnapshot(fileId: string, sheetName: string): SheetSnapshot | undefined {
    const key = this.getSnapshotKey(fileId, sheetName);
    return this.snapshots.get(key);
  }

  /**
   * 批量创建快照
   */
  public async createBatchSnapshots(
    fileId: string,
    sheets: Map<string, any[][]>
  ): Promise<Map<string, SheetSnapshot>> {
    const result = new Map<string, SheetSnapshot>();

    for (const [sheetName, data] of sheets.entries()) {
      const snapshot = await this.createSnapshot(fileId, sheetName, data);
      result.set(sheetName, snapshot);
    }

    return result;
  }

  /**
   * 清理过期快照
   */
  public cleanupExpiredSnapshots(olderThan: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, snapshot] of this.snapshots.entries()) {
      if (now - snapshot.timestamp > olderThan) {
        this.snapshots.delete(key);
        cleaned++;
      }
    }

    console.log(`[CrossSheetService] Cleaned up ${cleaned} expired snapshots`);

    return cleaned;
  }

  // ========================================================================
  // 引用分析
  // ========================================================================

  /**
   * 分析引用关系
   */
  public async analyzeReferences(
    refs: SheetReference[]
  ): Promise<ReferenceAnalysis> {
    console.log(`[CrossSheetService] Analyzing ${refs.length} references`);

    const analysis: ReferenceAnalysis = {
      totalReferences: refs.length,
      referencesByType: {},
      referencesBySheet: {},
      maxDepth: 0,
      circularReferences: [],
      externalReferences: [],
    };

    // 统计引用类型
    for (const ref of refs) {
      analysis.referencesByType[ref.referenceType] =
        (analysis.referencesByType[ref.referenceType] || 0) + 1;

      analysis.referencesBySheet[ref.sourceSheet] =
        (analysis.referencesBySheet[ref.sourceSheet] || 0) + 1;
    }

    // 计算最大深度
    analysis.maxDepth = this.calculateMaxDepth(refs);

    // 检测循环引用
    const circularRefIds = await this.detectCircularReferences(refs);
    analysis.circularReferences = refs.filter(ref =>
      circularRefIds.some(c => c.includes(ref.sourceSheet))
    );

    // 找出外部引用（引用其他文件的 Sheet）
    analysis.externalReferences = refs.filter(ref =>
      ref.fileId && this.isExternalReference(ref)
    );

    return analysis;
  }

  // ========================================================================
  // 辅助方法
  // ========================================================================

  /**
   * 从字符串中提取引用
   */
  private extractReferences(text: string): Array<{
    sheetName: string;
    range: string;
  }> {
    const matches: Array<{ sheetName: string; range: string }> = [];

    let match;
    while ((match = this.REFERENCE_PATTERN.exec(text)) !== null) {
      const sheetName = match[1];
      const startCell = match[2];
      const endCell = match[3] || startCell;

      matches.push({
        sheetName,
        range: `${startCell}:${endCell}`,
      });
    }

    // 重置正则表达式的lastIndex
    this.REFERENCE_PATTERN.lastIndex = 0;

    return matches;
  }

  /**
   * 检测引用类型
   */
  private detectReferenceType(value: string): 'value' | 'formula' | 'format' {
    if (value.startsWith('=')) {
      return 'formula';
    }
    if (value.includes('!') && !value.startsWith('=')) {
      return 'value';
    }
    return 'value';
  }

  /**
   * 将行列索引转换为范围
   */
  private indexToRange(row: number, col: number): string {
    return `${this.colToLetter(col)}${row + 1}`;
  }

  /**
   * 将列号转换为字母
   */
  private colToLetter(col: number): string {
    let letter = '';
    while (col >= 0) {
      letter = String.fromCharCode((col % 26) + 65) + letter;
      col = Math.floor(col / 26) - 1;
    }
    return letter;
  }

  /**
   * 验证范围格式
   */
  private isValidRange(range: string): boolean {
    const rangePattern = /^[A-Z]+\d+:[A-Z]+\d+$/;
    return rangePattern.test(range);
  }

  /**
   * 从数据中提取指定范围的值
   */
  private extractRangeData(data: any[][], range: string): any[][] {
    const [start, end] = range.split(':');
    const startRow = this.parseCellPosition(start);
    const endRow = this.parseCellPosition(end);

    const result: any[][] = [];

    for (let row = startRow.row; row <= endRow.row && row < data.length; row++) {
      const rowData: any[] = [];
      for (
        let col = startRow.col;
        col <= endRow.col && col < data[row].length;
        col++
      ) {
        rowData.push(data[row][col]);
      }
      result.push(rowData);
    }

    return result;
  }

  /**
   * 解析单元格位置
   */
  private parseCellPosition(cell: string): { row: number; col: number } {
    const match = cell.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      return { row: 0, col: 0 };
    }

    const colStr = match[1];
    const rowStr = match[2];

    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }

    return {
      row: parseInt(rowStr, 10) - 1,
      col: col - 1,
    };
  }

  /**
   * 从提取的数据中获取值
   */
  private extractValue(
    data: any[][],
    type: 'value' | 'formula' | 'format'
  ): any {
    if (data.length === 0 || data[0].length === 0) {
      return null;
    }

    // 单个单元格
    if (data.length === 1 && data[0].length === 1) {
      return data[0][0];
    }

    // 多个单元格
    return data;
  }

  /**
   * 深度克隆数据
   */
  private cloneData(data: any[][]): any[][] {
    return data.map(row => [...row]);
  }

  /**
   * 生成快照键
   */
  private getSnapshotKey(fileId: string, sheetName: string): string {
    return `${fileId}:${sheetName}`;
  }

  /**
   * 生成引用键
   */
  private getReferenceKey(ref: SheetReference): string {
    return `${ref.targetSheet}:${ref.targetRange}->${ref.sourceSheet}:${ref.sourceRange}`;
  }

  /**
   * 计算引用图的最大深度
   */
  private calculateMaxDepth(refs: SheetReference[]): number {
    const graph = new Map<string, Set<string>>();

    for (const ref of refs) {
      if (!graph.has(ref.targetSheet)) {
        graph.set(ref.targetSheet, new Set());
      }
      graph.get(ref.targetSheet)!.add(ref.sourceSheet);
    }

    let maxDepth = 0;

    const dfs = (node: string, visited: Set<string>, depth: number): void => {
      maxDepth = Math.max(maxDepth, depth);

      const neighbors = graph.get(node) || new Set();

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          dfs(neighbor, visited, depth + 1);
          visited.delete(neighbor);
        }
      }
    };

    for (const node of graph.keys()) {
      dfs(node, new Set(), 0);
    }

    return maxDepth;
  }

  /**
   * 检查是否为外部引用
   */
  private isExternalReference(ref: SheetReference): boolean {
    // TODO: 实现外部引用检测逻辑
    return false;
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.referenceCache.clear();
    console.log('[CrossSheetService] Cache cleared');
  }

  /**
   * 获取缓存统计
   */
  public getCacheStats(): {
    size: number;
    snapshots: number;
  } {
    return {
      size: this.referenceCache.size,
      snapshots: this.snapshots.size,
    };
  }
}

// ============================================================================
// 导出
// ============================================================================

/**
 * 导出单例获取函数
 */
export const getCrossSheetService = (vfs?: VirtualFileSystem): CrossSheetService => {
  return CrossSheetService.getInstance(vfs);
};

/**
 * 默认导出
 */
export default CrossSheetService;
