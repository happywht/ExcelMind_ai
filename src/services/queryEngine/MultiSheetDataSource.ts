/**
 * 多Sheet数据源管理器
 * 实现跨Sheet数据查询和关联
 * @module MultiSheetDataSource
 */

import { ExcelData } from '../../types.js';
import { SAMPLING_CONFIG } from '../../config/samplingConfig';

// 声明AlaSQL全局变量
declare global {
  const alasql: any;
}

/**
 * 表间关系定义
 */
export interface Relationship {
  fromSheet: string;
  fromColumn: string;
  toSheet: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  confidence: number; // 0-1，关系可信度
}

/**
 * 关系路径（用于多表JOIN）
 */
export interface RelationshipPath {
  path: Array<{
    fromSheet: string;
    toSheet: string;
    onColumn: string;
  }>;
  confidence: number;
  joinType: 'INNER' | 'LEFT' | 'RIGHT';
}

/**
 * 列冲突信息
 */
export interface ColumnConflict {
  columnName: string;
  sheets: string[];
  suggestedResolution: 'prefix' | 'qualify' | 'alias';
  recommendedPrefix?: string;
}

/**
 * 列索引信息
 */
export interface ColumnIndex {
  columnName: string;
  sheets: string[];
  priority?: number; // 优先级，用于冲突解决
  dataType?: 'string' | 'number' | 'date' | 'boolean';
}

/**
 * Sheet元数据
 */
export interface SheetMetadata {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  hasPrimaryKey: boolean;
  primaryKeys?: string[];
  sampleData?: any[];
}

/**
 * 数据源接口
 */
export interface IMultiSheetDataSource {
  registerSheet(sheetName: string, data: any[], priority?: number): void;
  getSheet(sheetName: string): any[];
  findSheetByColumn(columnName: string): string | null;
  createRelationship(fromSheet: string, toSheet: string, onColumn: string): void;
  getRelationships(): Relationship[];
  getSheetNames(): string[];
  getAllColumns(): string[];
  hasSheet(sheetName: string): boolean;
  getColumnsForSheet(sheetName: string): string[];
  clear(): void;
  getStatistics(): {
    sheetCount: number;
    totalRows: number;
    totalColumns: number;
    relationshipCount: number;
    conflictCount: number;
  };
}

/**
 * 内存数据源实现
 * 使用AlaSQL作为底层查询引擎
 * @class MultiSheetDataSource
 */
export class MultiSheetDataSource implements IMultiSheetDataSource {
  private sheets: Map<string, any[]> = new Map();
  private columnIndex: Map<string, ColumnIndex> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private sheetPriority: Map<string, number> = new Map(); // Sheet优先级
  private sheetMetadata: Map<string, SheetMetadata> = new Map();

  constructor() {
    // 如果alasql未初始化，动态导入
    if (typeof alasql === 'undefined') {
      throw new Error('AlaSQL未加载。请确保在项目中安装并导入了alasql库。');
    }
  }

  /**
   * 加载Excel数据到数据源
   * @param excelData - Excel数据对象
   * @example
   * ```typescript
   * const dataSource = new MultiSheetDataSource();
   * dataSource.loadExcelData({
   *   sheets: {
   *     "Sheet1": [{姓名: "张三", 部门: "销售部", 销售额: 100000}],
   *     "Sheet2": [{姓名: "张三", 部门: "销售部", 绩效: "A"}]
   *   },
   *   currentSheetName: "Sheet1"
   * });
   * ```
   */
  loadExcelData(excelData: ExcelData): void {
    if (!excelData || !excelData.sheets) {
      throw new Error('无效的Excel数据结构');
    }

    const sheetNames = Object.keys(excelData.sheets);

    if (sheetNames.length === 0) {
      throw new Error('Excel数据中没有Sheet');
    }

    // 清空现有数据
    this.clear();

    // 加载所有Sheet
    sheetNames.forEach((sheetName, index) => {
      const sheetData = excelData.sheets[sheetName];

      if (Array.isArray(sheetData) && sheetData.length > 0) {
        // 当前Sheet优先级更高
        const priority = sheetName === excelData.currentSheetName ? 10 : 0;
        this.registerSheet(sheetName, sheetData, priority);
      }
    });

    // 自动检测关系
    this.detectRelationships();
  }

  /**
   * 注册Sheet数据
   * @param sheetName - Sheet名称
   * @param data - 数据数组
   * @param priority - 优先级（默认0，当前Sheet建议设为10）
   */
  registerSheet(sheetName: string, data: any[], priority: number = 0): void {
    if (!Array.isArray(data)) {
      throw new Error(`Sheet数据必须是数组: ${sheetName}`);
    }

    if (data.length === 0) {
      console.warn(`Sheet ${sheetName} 没有数据，跳过注册`);
      return;
    }

    this.sheets.set(sheetName, data);
    this.sheetPriority.set(sheetName, priority);

    // 构建列索引
    const columns = Object.keys(data[0]);
    columns.forEach(col => this.indexColumn(sheetName, col));

    // 创建Sheet元数据
    this.sheetMetadata.set(sheetName, {
      name: sheetName,
      rowCount: data.length,
      columnCount: columns.length,
      columns,
      hasPrimaryKey: this.detectPrimaryKey(sheetName),
      primaryKeys: this.findPrimaryKeys(sheetName),
      sampleData: data.slice(0, SAMPLING_CONFIG.QUERY_ENGINE.SAMPLE_ROWS) // 使用配置的采样行数
    });

    // 创建AlaSQL表
    try {
      alasql(`CREATE TABLE IF NOT EXISTS [${this.escapeTableName(sheetName)}]`);
      alasql.tables[this.escapeTableName(sheetName)] = { data };
    } catch (error) {
      console.warn(`创建AlaSQL表失败: ${sheetName}`, error);
    }
  }

  /**
   * 获取Sheet数据
   * @param sheetName - Sheet名称
   * @returns 数据数组
   */
  getSheet(sheetName: string): any[] {
    return this.sheets.get(sheetName) || [];
  }

  /**
   * 获取所有Sheet名称
   * @returns Sheet名称数组
   * @example
   * ```typescript
   * const sheetNames = dataSource.getSheetNames();
   * console.log(sheetNames); // ["Sheet1", "Sheet2", "Sheet3"]
   * ```
   */
  getSheetNames(): string[] {
    return Array.from(this.sheets.keys());
  }

  /**
   * 获取指定Sheet的列信息
   * @param sheetName - Sheet名称
   * @returns 列名数组
   * @throws {Error} 如果Sheet不存在
   * @example
   * ```typescript
   * const columns = dataSource.getColumns("Sheet1");
   * console.log(columns); // ["姓名", "部门", "销售额"]
   * ```
   */
  getColumns(sheetName: string): string[] {
    if (!this.hasSheet(sheetName)) {
      throw new Error(`Sheet不存在: ${sheetName}`);
    }

    const metadata = this.sheetMetadata.get(sheetName);
    return metadata?.columns || [];
  }

  /**
   * 获取Sheet元数据
   * @param sheetName - Sheet名称
   * @returns Sheet元数据
   */
  getSheetMetadata(sheetName: string): SheetMetadata | undefined {
    return this.sheetMetadata.get(sheetName);
  }

  /**
   * 获取所有Sheet的元数据
   * @returns Sheet元数据数组
   */
  getAllSheetMetadata(): SheetMetadata[] {
    return Array.from(this.sheetMetadata.values());
  }

  /**
   * 检查Sheet是否存在
   * @param sheetName - Sheet名称
   * @returns 是否存在
   */
  hasSheet(sheetName: string): boolean {
    return this.sheets.has(sheetName);
  }

  /**
   * 检测列名冲突
   * @returns 列冲突信息数组
   * @example
   * ```typescript
   * const conflicts = dataSource.detectColumnConflicts();
   * console.log(conflicts);
   * // [
   * // //   {
   * * //     columnName: "姓名",
   * * //     sheets: ["Sheet1", "Sheet2"],
   * * //     suggestedResolution: "qualify",
   * * //     recommendedPrefix: "Sheet1"
   * * //   }
   * * // ]
   * ```
   */
  detectColumnConflicts(): ColumnConflict[] {
    const conflicts: ColumnConflict[] = [];

    this.columnIndex.forEach((index, columnName) => {
      if (index.sheets.length > 1) {
        // 存在冲突
        const conflict: ColumnConflict = {
          columnName,
          sheets: [...index.sheets],
          suggestedResolution: this.suggestResolution(columnName, index.sheets)
        };

        // 根据优先级推荐前缀
        const sortedSheets = [...index.sheets].sort((a, b) => {
          const priorityA = this.sheetPriority.get(a) || 0;
          const priorityB = this.sheetPriority.get(b) || 0;
          return priorityB - priorityA;
        });

        conflict.recommendedPrefix = sortedSheets[0];
        conflicts.push(conflict);
      }
    });

    return conflicts;
  }

  /**
   * 建议冲突解决方案
   * @private
   */
  private suggestResolution(columnName: string, sheets: string[]): 'prefix' | 'qualify' | 'alias' {
    // 如果列名是常见主键名（ID、编号等），建议使用限定符
    const commonKeyPatterns = /^(id|编号|ID|code|Code)/;
    if (commonKeyPatterns.test(columnName)) {
      return 'qualify';
    }

    // 如果只有两个Sheet，建议使用别名
    if (sheets.length === 2) {
      return 'alias';
    }

    // 默认使用前缀
    return 'prefix';
  }

  /**
   * 智能查找包含指定字段的Sheet
   * @param columnName - 列名
   * @returns Sheet名称或null
   */
  findSheetByColumn(columnName: string): string | null {
    const index = this.columnIndex.get(columnName);
    if (!index || index.sheets.length === 0) {
      // 尝试模糊匹配
      return this.fuzzyMatchColumn(columnName);
    }

    if (index.sheets.length === 1) {
      return index.sheets[0];
    }

    // 多个Sheet包含该列，根据优先级选择
    return this.resolveColumnConflict(columnName, index.sheets);
  }

  /**
   * 模糊匹配字段名
   * @private
   */
  private fuzzyMatchColumn(columnName: string): string | null {
    const allColumns = this.getAllColumns();
    const normalizedInput = columnName.toLowerCase().replace(/[\s_\-]/g, '');

    // 精确匹配
    for (const col of allColumns) {
      const normalizedCol = col.toLowerCase().replace(/[\s_\-]/g, '');
      if (normalizedCol === normalizedInput) {
        const index = this.columnIndex.get(col)!;
        return index.sheets[0];
      }
    }

    // 包含匹配
    for (const col of allColumns) {
      const normalizedCol = col.toLowerCase().replace(/[\s_\-]/g, '');
      if (normalizedCol.includes(normalizedInput) || normalizedInput.includes(normalizedCol)) {
        const index = this.columnIndex.get(col)!;
        return index.sheets[0];
      }
    }

    return null;
  }

  /**
   * 解决字段冲突
   * @private
   */
  private resolveColumnConflict(columnName: string, sheets: string[]): string {
    // 策略1：优先级排序
    const sorted = [...sheets].sort((a, b) => {
      const priorityA = this.sheetPriority.get(a) || 0;
      const priorityB = this.sheetPriority.get(b) || 0;
      return priorityB - priorityA;
    });

    // 策略2：选择数据量大的表（可能为主表）
    if (sorted.length > 1) {
      const maxDataSheet = sorted.reduce((max, current) => {
        return this.sheets.get(current)!.length > this.sheets.get(max)!.length
          ? current
          : max;
      });

      return maxDataSheet;
    }

    return sorted[0];
  }

  /**
   * 创建表间关系
   * @param fromSheet - 源Sheet名称
   * @param toSheet - 目标Sheet名称
   * @param onColumn - 关联列名
   * @example
   * ```typescript
   * dataSource.createRelationship("Sheet1", "Sheet2", "姓名");
   * ```
   */
  createRelationship(
    fromSheet: string,
    toSheet: string,
    onColumn: string,
    type: 'one-to-one' | 'one-to-many' | 'many-to-many' = 'one-to-many'
  ): void {
    if (!this.hasSheet(fromSheet) || !this.hasSheet(toSheet)) {
      throw new Error(`无法创建关系：Sheet不存在`);
    }

    const key = `${fromSheet}.${toSheet}.${onColumn}`;
    const relationship: Relationship = {
      fromSheet,
      fromColumn: onColumn,
      toSheet,
      toColumn: onColumn,
      type,
      confidence: this.calculateRelationshipConfidence(fromSheet, toSheet, onColumn)
    };

    this.relationships.set(key, relationship);
  }

  /**
   * 自动检测表间关系
   * @returns 检测到的关系数组
   * @example
   * ```typescript
   * const relationships = dataSource.detectRelationships();
   * console.log(relationships);
   * // [
   * * //   {
   * * //     fromSheet: "Sheet1",
   * * //     fromColumn: "姓名",
   * * //     toSheet: "Sheet2",
   * * //     toColumn: "姓名",
   * * //     type: "one-to-one",
   * * //     confidence: 0.95
   * * //   }
   * * // ]
   * ```
   */
  detectRelationships(): Relationship[] {
    const detected: Relationship[] = [];
    const sheetNames = this.getSheetNames();

    // 清除旧的自动检测关系
    this.relationships.clear();

    // 两两比较Sheet，查找共同字段
    for (let i = 0; i < sheetNames.length; i++) {
      for (let j = i + 1; j < sheetNames.length; j++) {
        const sheet1 = sheetNames[i];
        const sheet2 = sheetNames[j];

        const commonColumns = this.findCommonColumns(sheet1, sheet2);

        // 对每个共同字段创建关系
        commonColumns.forEach(column => {
          const type = this.determineRelationshipType(sheet1, sheet2, column);
          const confidence = this.calculateRelationshipConfidence(sheet1, sheet2, column);

          const relationship: Relationship = {
            fromSheet: sheet1,
            fromColumn: column,
            toSheet: sheet2,
            toColumn: column,
            type,
            confidence
          };

          const key = `${sheet1}.${sheet2}.${column}`;
          this.relationships.set(key, relationship);
          detected.push(relationship);
        });
      }
    }

    return detected;
  }

  /**
   * 确定关系类型
   * @private
   */
  private determineRelationshipType(
    sheet1: string,
    sheet2: string,
    column: string
  ): 'one-to-one' | 'one-to-many' | 'many-to-many' {
    const data1 = this.getSheet(sheet1);
    const data2 = this.getSheet(sheet2);

    // 检查列值是否唯一
    const isUnique1 = this.isColumnUnique(sheet1, column);
    const isUnique2 = this.isColumnUnique(sheet2, column);

    if (isUnique1 && isUnique2) {
      return 'one-to-one';
    } else if (isUnique1 || isUnique2) {
      return 'one-to-many';
    } else {
      return 'many-to-many';
    }
  }

  /**
   * 计算关系可信度
   * @private
   */
  private calculateRelationshipConfidence(
    sheet1: string,
    sheet2: string,
    column: string
  ): number {
    let confidence = 0.5; // 基础分

    // 检查列名是否包含常见关键字
    const commonKeyWords = ['id', 'ID', '编号', 'code', 'Code', '编号', '工号', '学号'];
    if (commonKeyWords.some(keyword => column.includes(keyword))) {
      confidence += 0.2;
    }

    // 检查数据重叠度
    const data1 = this.getSheet(sheet1);
    const data2 = this.getSheet(sheet2);

    const values1 = new Set(data1.map(row => row[column]));
    const values2 = new Set(data2.map(row => row[column]));

    // 计算交集
    let intersection = 0;
    values1.forEach(v => {
      if (values2.has(v)) intersection++;
    });

    const union = values1.size + values2.size - intersection;
    const overlapRatio = union > 0 ? intersection / union : 0;

    confidence += overlapRatio * 0.3;

    return Math.min(confidence, 1.0);
  }

  /**
   * 检查列值是否唯一
   * @private
   */
  private isColumnUnique(sheetName: string, columnName: string): boolean {
    const data = this.getSheet(sheetName);
    const values = new Set(data.map(row => row[columnName]));
    return values.size === data.length;
  }

  /**
   * 获取关系路径（用于多表JOIN）
   * @param fromSheet - 起始Sheet
   * @param toSheet - 目标Sheet
   * @returns 关系路径数组
   * @example
   * ```typescript
   * const paths = dataSource.getRelationshipPath("Sheet1", "Sheet3");
   * console.log(paths);
   * // [
   * * //   {
   * * //     path: [
   * * //       { fromSheet: "Sheet1", toSheet: "Sheet2", onColumn: "姓名" },
   * * //       { fromSheet: "Sheet2", toSheet: "Sheet3", onColumn: "部门" }
   * * //     ],
   * * //     confidence: 0.85,
   * * //     joinType: "INNER"
   * * //   }
   * * // ]
   * ```
   */
  getRelationshipPath(fromSheet: string, toSheet: string): RelationshipPath[] {
    if (!this.hasSheet(fromSheet) || !this.hasSheet(toSheet)) {
      return [];
    }

    // 直接关系
    const directPath = this.findDirectPath(fromSheet, toSheet);
    if (directPath) {
      return [directPath];
    }

    // 间接关系（通过其他Sheet）
    const indirectPaths = this.findIndirectPaths(fromSheet, toSheet, 3); // 最多3跳

    // 按可信度排序
    return indirectPaths.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 查找直接路径
   * @private
   */
  private findDirectPath(fromSheet: string, toSheet: string): RelationshipPath | null {
    const relationships = Array.from(this.relationships.values());

    for (const relationship of relationships) {
      if (relationship.fromSheet === fromSheet && relationship.toSheet === toSheet) {
        return {
          path: [
            {
              fromSheet: relationship.fromSheet,
              toSheet: relationship.toSheet,
              onColumn: relationship.fromColumn
            }
          ],
          confidence: relationship.confidence,
          joinType: 'INNER'
        };
      }
    }
    return null;
  }

  /**
   * 查找间接路径（BFS）
   * @private
   */
  private findIndirectPaths(
    fromSheet: string,
    toSheet: string,
    maxDepth: number
  ): RelationshipPath[] {
    const paths: RelationshipPath[] = [];
    const queue: Array<{ current: string; path: RelationshipPath['path']; visited: Set<string> }> = [];

    queue.push({
      current: fromSheet,
      path: [],
      visited: new Set([fromSheet])
    });

    while (queue.length > 0) {
      const { current, path, visited } = queue.shift()!;

      if (path.length > 0 && current === toSheet) {
        // 计算路径可信度
        const pathConfidence = this.calculatePathConfidence(path);
        paths.push({
          path,
          confidence: pathConfidence,
          joinType: 'LEFT'
        });
        continue;
      }

      if (path.length >= maxDepth) {
        continue;
      }

      // 查找从current出发的所有关系
      const relationships = Array.from(this.relationships.values());
      for (const relationship of relationships) {
        if (relationship.fromSheet === current && !visited.has(relationship.toSheet)) {
          const newPath = [
            ...path,
            {
              fromSheet: relationship.fromSheet,
              toSheet: relationship.toSheet,
              onColumn: relationship.fromColumn
            }
          ];
          const newVisited = new Set(visited);
          newVisited.add(relationship.toSheet);

          queue.push({
            current: relationship.toSheet,
            path: newPath,
            visited: newVisited
          });
        }
      }
    }

    return paths;
  }

  /**
   * 计算路径可信度
   * @private
   */
  private calculatePathConfidence(path: RelationshipPath['path']): number {
    if (path.length === 0) return 0;

    // 路径可信度 = 各段关系可信度的乘积，并随着跳数衰减
    let confidence = 1.0;
    path.forEach(step => {
      const relationship = this.findRelationship(step.fromSheet, step.toSheet, step.onColumn);
      if (relationship) {
        confidence *= relationship.confidence;
      }
    });

    // 每增加一跳，可信度降低10%
    confidence *= Math.pow(0.9, path.length - 1);

    return confidence;
  }

  /**
   * 查找特定关系
   * @private
   */
  private findRelationship(
    fromSheet: string,
    toSheet: string,
    column: string
  ): Relationship | undefined {
    const key = `${fromSheet}.${toSheet}.${column}`;
    return this.relationships.get(key);
  }

  /**
   * 获取所有关系
   * @returns 关系数组
   */
  getRelationships(): Relationship[] {
    return Array.from(this.relationships.values());
  }

  /**
   * 获取所有列名
   * @returns 所有列名数组（去重）
   */
  getAllColumns(): string[] {
    return Array.from(this.columnIndex.keys());
  }

  /**
   * 获取指定Sheet的列名
   * @param sheetName - Sheet名称
   * @returns 列名数组
   */
  getColumnsForSheet(sheetName: string): string[] {
    const data = this.getSheet(sheetName);
    if (data.length === 0) return [];

    return Object.keys(data[0]);
  }

  /**
   * 查找两个Sheet的共同字段
   * @param sheet1 - 第一个Sheet名称
   * @param sheet2 - 第二个Sheet名称
   * @returns 共同字段名数组
   * @example
   * ```typescript
   * const commonColumns = dataSource.findCommonColumns("Sheet1", "Sheet2");
   * console.log(commonColumns); // ["姓名", "部门"]
   * ```
   */
  findCommonColumns(sheet1: string, sheet2: string): string[] {
    const cols1 = new Set(this.getColumnsForSheet(sheet1));
    const cols2 = new Set(this.getColumnsForSheet(sheet2));

    return Array.from(cols1).filter(col => cols2.has(col));
  }

  /**
   * 检测主键
   * @private
   */
  private detectPrimaryKey(sheetName: string): boolean {
    const primaryKeys = this.findPrimaryKeys(sheetName);
    return primaryKeys.length > 0;
  }

  /**
   * 查找主键列
   * @private
   */
  private findPrimaryKeys(sheetName: string): string[] {
    const data = this.getSheet(sheetName);
    if (data.length === 0) return [];

    const columns = Object.keys(data[0]);
    const primaryKeys: string[] = [];

    columns.forEach(column => {
      // 检查列值是否唯一
      const values = new Set(data.map(row => row[column]));
      const isUnique = values.size === data.length;

      // 检查列名是否包含主键关键词
      const keyPatterns = /^(id|ID|编号|code|Code|工号|学号)/;
      const hasKeyName = keyPatterns.test(column);

      if (isUnique && (hasKeyName || column === 'id')) {
        primaryKeys.push(column);
      }
    });

    return primaryKeys;
  }

  /**
   * 索引列
   * @private
   */
  private indexColumn(sheetName: string, columnName: string): void {
    if (!this.columnIndex.has(columnName)) {
      this.columnIndex.set(columnName, {
        columnName,
        sheets: [],
        dataType: this.detectColumnDataType(sheetName, columnName)
      });
    }

    const index = this.columnIndex.get(columnName)!;
    if (!index.sheets.includes(sheetName)) {
      index.sheets.push(sheetName);
    }
  }

  /**
   * 检测列数据类型
   * @private
   */
  private detectColumnDataType(
    sheetName: string,
    columnName: string
  ): 'string' | 'number' | 'date' | 'boolean' {
    const data = this.getSheet(sheetName);
    if (data.length === 0) return 'string';

    const sampleValue = data[0][columnName];

    if (typeof sampleValue === 'number') return 'number';
    if (typeof sampleValue === 'boolean') return 'boolean';

    // 尝试检测日期
    if (sampleValue instanceof Date) return 'date';

    // 检查日期字符串
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
      /^\d{2}\/\d{2}\/\d{4}$/  // DD/MM/YYYY
    ];

    if (typeof sampleValue === 'string' && datePatterns.some(p => p.test(sampleValue))) {
      return 'date';
    }

    return 'string';
  }

  /**
   * 转义表名（AlaSQL要求）
   * @private
   */
  private escapeTableName(name: string): string {
    return name.replace(/\]/g, '\\]'); // 转义右方括号
  }

  /**
   * 获取数据统计信息
   * @returns 统计信息对象
   * @example
   * ```typescript
   * const stats = dataSource.getStatistics();
   * console.log(stats);
   * // {
   * * //   sheetCount: 3,
   * * //   totalRows: 1500,
   * * //   totalColumns: 25,
   * * //   relationshipCount: 5
   * * // }
   * ```
   */
  getStatistics(): {
    sheetCount: number;
    totalRows: number;
    totalColumns: number;
    relationshipCount: number;
    conflictCount: number;
  } {
    let totalRows = 0;
    let totalColumns = 0;

    this.sheets.forEach((data, sheetName) => {
      totalRows += data.length;
      totalColumns += this.getColumnsForSheet(sheetName).length;
    });

    const conflicts = this.detectColumnConflicts();

    return {
      sheetCount: this.sheets.size,
      totalRows,
      totalColumns,
      relationshipCount: this.relationships.size,
      conflictCount: conflicts.length
    };
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.sheets.clear();
    this.columnIndex.clear();
    this.relationships.clear();
    this.sheetPriority.clear();
    this.sheetMetadata.clear();

    // 清空AlaSQL表
    try {
      alasql('DROP TABLE IF EXISTS *');
    } catch (error) {
      console.warn('清空AlaSQL表失败', error);
    }
  }

  /**
   * 导出为JSON（用于调试）
   * @returns JSON对象
   */
  toJSON(): any {
    return {
      sheets: Array.from(this.sheets.entries()).map(([name, data]) => ({
        name,
        rowCount: data.length,
        columns: this.getColumnsForSheet(name)
      })),
      relationships: this.getRelationships(),
      statistics: this.getStatistics(),
      conflicts: this.detectColumnConflicts()
    };
  }

  /**
   * 生成数据源摘要报告
   * @returns 格式化的摘要字符串
   * @example
   * ```typescript
   * const report = dataSource.generateSummaryReport();
   * console.log(report);
   * // MultiSheet数据源摘要
   * * // ===================
   * * // Sheet数量: 3
   * * // 总行数: 1500
   * * // 总列数: 25
   * * // 关系数量: 5
   * * // 冲突数量: 2
   * * //
   * * // Sheet列表:
   * * // - Sheet1: 1000行, 10列
   * * // - Sheet2: 300行, 8列
   * * // - Sheet3: 200行, 7列
   * ```
   */
  generateSummaryReport(): string {
    const stats = this.getStatistics();
    const sheetMetadata = this.getAllSheetMetadata();
    const relationships = this.getRelationships();
    const conflicts = this.detectColumnConflicts();

    let report = 'MultiSheet数据源摘要\n';
    report += '===================\n';
    report += `Sheet数量: ${stats.sheetCount}\n`;
    report += `总行数: ${stats.totalRows}\n`;
    report += `总列数: ${stats.totalColumns}\n`;
    report += `关系数量: ${stats.relationshipCount}\n`;
    report += `冲突数量: ${stats.conflictCount}\n\n`;

    report += 'Sheet列表:\n';
    sheetMetadata.forEach(meta => {
      report += `- ${meta.name}: ${meta.rowCount}行, ${meta.columnCount}列\n`;
    });

    if (relationships.length > 0) {
      report += '\n检测到的关系:\n';
      relationships.forEach((rel, index) => {
        report += `${index + 1}. ${rel.fromSheet}.${rel.fromColumn} -> ${rel.toSheet}.${rel.toColumn} (${rel.type}, 置信度: ${rel.confidence.toFixed(2)})\n`;
      });
    }

    if (conflicts.length > 0) {
      report += '\n列冲突:\n';
      conflicts.forEach((conflict, index) => {
        report += `${index + 1}. "${conflict.columnName}" 存在于 ${conflict.sheets.join(', ')} (建议: ${conflict.suggestedResolution})\n`;
      });
    }

    return report;
  }
}

/**
 * 导出单例实例（可选）
 */
export const globalDataSource = new MultiSheetDataSource();
