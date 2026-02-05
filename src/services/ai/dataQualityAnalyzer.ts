/**
 * 数据质量分析器 - Phase 2 核心服务
 *
 * 职责：自动检测Excel数据中的质量问题
 * 功能：缺失值检测、异常值检测、重复行检测、格式一致性检测
 *
 * @module services/ai/dataQualityAnalyzer
 * @version 1.0.0
 * @description 智能数据处理增强模块的核心分析器
 */

import { logger } from '@/utils/logger';
import {
  DataQualityReport,
  DataQualityIssue,
  DataQualityIssueType,
  IssueSeverity,
  IssueStatistics,
  ColumnStatistics,
  DataType,
  DataDistribution,
  AnalysisOptions,
  CustomRule,
  OutlierDetectionMethod,
  IAIService,
  ICacheService
} from '../../types/dataQuality';
import { ExcelData } from '../../types';

// ============================================================================
// 辅助类型和接口
// ============================================================================

/**
 * 检测结果
 */
interface DetectionResult {
  /** 检测到的问题 */
  issues: DataQualityIssue[];
  /** 检测器名称 */
  detectorName: string;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 列统计信息（内部）
 */
interface InternalColumnStats {
  /** 列名 */
  columnName: string;
  /** 数据类型 */
  dataType: DataType;
  /** 空值数量 */
  nullCount: number;
  /** 唯一值数量 */
  uniqueCount: number;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 平均值 */
  mean?: number;
  /** 中位数 */
  median?: number;
  /** 标准差 */
  stdDev?: number;
  /** 众数 */
  mode?: any;
  /** 样本值 */
  sampleValues: any[];
  /** 数据分布 */
  distribution?: DataDistribution[];
  /** 包含的行索引 */
  rowIndices: number[];
}

/**
 * 分析器配置
 */
interface AnalyzerConfig {
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存TTL（毫秒） */
  cacheTTL?: number;
  /** 并行检测 */
  parallelDetection?: boolean;
  /** 最大采样大小 */
  maxSampleSize?: number;
}

// ============================================================================
// 缺失值检测器
// ============================================================================

/**
 * 缺失值检测器
 * 检测数据中的空值、null、undefined等缺失情况
 */
class MissingValueDetector {
  /**
   * 检测缺失值
   */
  async detect(
    data: any[],
    columnName: string,
    options?: AnalysisOptions
  ): Promise<DataQualityIssue | null> {
    const startTime = Date.now();
    const affectedRows: number[] = [];
    const totalRows = data.length;

    // 检测每一行
    data.forEach((row, index) => {
      if (this.isMissing(row[columnName])) {
        affectedRows.push(index);
      }
    });

    // 如果没有缺失值，返回null
    if (affectedRows.length === 0) {
      return null;
    }

    const affectedPercentage = (affectedRows.length / totalRows) * 100;
    const severity = this.calculateSeverity(affectedPercentage);

    return {
      issueId: this.generateIssueId('missing', columnName),
      issueType: DataQualityIssueType.MISSING_VALUE,
      severity,
      affectedColumns: [columnName],
      affectedRows,
      description: `列 "${columnName}" 中发现 ${affectedRows.length} 个缺失值 (${affectedPercentage.toFixed(2)}%)`,
      statistics: {
        affectedRowCount: affectedRows.length,
        affectedPercentage,
        distribution: { [columnName]: affectedRows.length }
      }
    };
  }

  /**
   * 判断值是否缺失
   */
  private isMissing(value: any): boolean {
    return value === null ||
           value === undefined ||
           value === '' ||
           (typeof value === 'string' && value.trim() === '') ||
           (typeof value === 'number' && isNaN(value));
  }

  /**
   * 计算严重程度
   */
  private calculateSeverity(percentage: number): IssueSeverity {
    if (percentage > 20) return 'critical';
    if (percentage > 10) return 'high';
    if (percentage > 5) return 'medium';
    return 'low';
  }

  /**
   * 生成问题ID
   */
  private generateIssueId(type: string, column: string): string {
    return `${type}_${column}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// 异常值检测器
// ============================================================================

/**
 * 异常值检测器
 * 使用统计方法（IQR、Z-Score）检测数值异常值
 */
class OutlierDetector {
  /**
   * 检测异常值
   */
  async detect(
    data: any[],
    columnStats: InternalColumnStats,
    options?: AnalysisOptions
  ): Promise<DataQualityIssue | null> {
    const { columnName, dataType, min, max, mean, stdDev, rowIndices } = columnStats;

    // 只处理数值类型
    if (dataType !== 'number' || mean === undefined || stdDev === undefined) {
      return null;
    }

    const method = options?.outlierMethod || 'iqr';
    const threshold = options?.outlierThreshold || 1.5;

    let affectedRows: number[] = [];

    if (method === 'iqr') {
      affectedRows = this.detectUsingIQR(data, columnName, threshold, rowIndices);
    } else if (method === 'zscore') {
      affectedRows = this.detectUsingZScore(data, columnName, mean, stdDev, threshold, rowIndices);
    }

    if (affectedRows.length === 0) {
      return null;
    }

    const totalRows = data.length;
    const affectedPercentage = (affectedRows.length / totalRows) * 100;
    const severity = this.calculateSeverity(affectedPercentage);

    return {
      issueId: this.generateIssueId('outlier', columnName),
      issueType: DataQualityIssueType.OUTLIER,
      severity,
      affectedColumns: [columnName],
      affectedRows,
      description: `列 "${columnName}" 中发现 ${affectedRows.length} 个异常值 (${affectedPercentage.toFixed(2)}%)，使用 ${method.toUpperCase()} 方法检测`,
      statistics: {
        affectedRowCount: affectedRows.length,
        affectedPercentage,
        distribution: { [columnName]: affectedRows.length }
      }
    };
  }

  /**
   * 使用IQR方法检测异常值
   */
  private detectUsingIQR(
    data: any[],
    columnName: string,
    threshold: number,
    rowIndices: number[]
  ): number[] {
    // 提取数值
    const values: number[] = [];
    const indexMap = new Map<number, number>();

    data.forEach((row, index) => {
      const value = row[columnName];
      if (typeof value === 'number' && !isNaN(value)) {
        values.push(value);
        indexMap.set(values.length - 1, index);
      }
    });

    if (values.length < 4) return []; // 数据太少，无法计算IQR

    // 计算四分位数
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.calculateQuartile(sorted, 0.25);
    const q3 = this.calculateQuartile(sorted, 0.75);
    const iqr = q3 - q1;

    const lowerBound = q1 - threshold * iqr;
    const upperBound = q3 + threshold * iqr;

    // 检测异常值
    const affectedRows: number[] = [];
    values.forEach((value, i) => {
      if (value < lowerBound || value > upperBound) {
        affectedRows.push(indexMap.get(i) || i);
      }
    });

    return affectedRows;
  }

  /**
   * 使用Z-Score方法检测异常值
   */
  private detectUsingZScore(
    data: any[],
    columnName: string,
    mean: number,
    stdDev: number,
    threshold: number,
    rowIndices: number[]
  ): number[] {
    if (stdDev === 0) return []; // 标准差为0，无法计算Z-Score

    const affectedRows: number[] = [];

    data.forEach((row, index) => {
      const value = row[columnName];
      if (typeof value === 'number' && !isNaN(value)) {
        const zScore = Math.abs((value - mean) / stdDev);
        if (zScore > threshold) {
          affectedRows.push(index);
        }
      }
    });

    return affectedRows;
  }

  /**
   * 计算四分位数
   */
  private calculateQuartile(sorted: number[], percentile: number): number {
    const index = (sorted.length - 1) * percentile;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * 计算严重程度
   */
  private calculateSeverity(percentage: number): IssueSeverity {
    if (percentage > 5) return 'high';
    if (percentage > 2) return 'medium';
    return 'low';
  }

  /**
   * 生成问题ID
   */
  private generateIssueId(type: string, column: string): string {
    return `${type}_${column}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// 重复行检测器
// ============================================================================

/**
 * 重复行检测器
 * 检测完全重复或部分重复的行
 */
class DuplicateDetector {
  /**
   * 检测重复行
   */
  async detect(
    data: any[],
    options?: AnalysisOptions
  ): Promise<DataQualityIssue | null> {
    const startTime = Date.now();
    const rowSignatures = new Map<string, number[]>();
    const duplicateRows: number[] = [];

    // 计算每一行的签名
    data.forEach((row, index) => {
      const signature = JSON.stringify(row);
      if (!rowSignatures.has(signature)) {
        rowSignatures.set(signature, []);
      }
      rowSignatures.get(signature)!.push(index);
    });

    // 找出重复的行
    rowSignatures.forEach((indices, signature) => {
      if (indices.length > 1) {
        // 保留第一个，其他都是重复的
        duplicateRows.push(...indices.slice(1));
      }
    });

    if (duplicateRows.length === 0) {
      return null;
    }

    const totalRows = data.length;
    const affectedPercentage = (duplicateRows.length / totalRows) * 100;
    const severity = this.calculateSeverity(affectedPercentage);

    return {
      issueId: this.generateIssueId('duplicate', 'all'),
      issueType: DataQualityIssueType.DUPLICATE_ROW,
      severity,
      affectedColumns: [],
      affectedRows: duplicateRows,
      description: `发现 ${duplicateRows.length} 个重复行 (${affectedPercentage.toFixed(2)}%)`,
      statistics: {
        affectedRowCount: duplicateRows.length,
        affectedPercentage,
        distribution: { 'all': duplicateRows.length }
      }
    };
  }

  /**
   * 计算严重程度
   */
  private calculateSeverity(percentage: number): IssueSeverity {
    if (percentage > 10) return 'high';
    if (percentage > 5) return 'medium';
    return 'low';
  }

  /**
   * 生成问题ID
   */
  private generateIssueId(type: string, column: string): string {
    return `${type}_${column}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// 格式一致性检测器
// ============================================================================

/**
 * 格式一致性检测器
 * 检测日期、邮箱、电话等格式的不一致性
 */
class FormatConsistencyDetector {
  /**
   * 格式模式
   */
  private static readonly FORMAT_PATTERNS = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^[\d\s\-+()]{7,20}$/,
    date: /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/
  };

  /**
   * 检测格式不一致
   */
  async detect(
    data: any[],
    columnStats: InternalColumnStats,
    options?: AnalysisOptions
  ): Promise<DataQualityIssue | null> {
    const { columnName, dataType, sampleValues } = columnStats;

    // 只检测字符串类型
    if (dataType !== 'string') {
      return null;
    }

    // 推断格式类型
    const formatType = this.inferFormatType(sampleValues);
    if (!formatType) return null;

    const pattern = FormatConsistencyDetector.FORMAT_PATTERNS[formatType];
    const invalidRows: number[] = [];

    // 检测不符合格式的行
    data.forEach((row, index) => {
      const value = row[columnName];
      if (value && typeof value === 'string' && !pattern.test(value)) {
        invalidRows.push(index);
      }
    });

    if (invalidRows.length === 0) {
      return null;
    }

    const totalRows = data.length;
    const affectedPercentage = (invalidRows.length / totalRows) * 100;
    const severity = this.calculateSeverity(affectedPercentage);

    return {
      issueId: this.generateIssueId('format', columnName),
      issueType: DataQualityIssueType.FORMAT_INCONSISTENCY,
      severity,
      affectedColumns: [columnName],
      affectedRows: invalidRows,
      description: `列 "${columnName}" 中发现 ${invalidRows.length} 个无效的${formatType}格式 (${affectedPercentage.toFixed(2)}%)`,
      statistics: {
        affectedRowCount: invalidRows.length,
        affectedPercentage,
        distribution: { [columnName]: invalidRows.length }
      }
    };
  }

  /**
   * 推断格式类型
   */
  private inferFormatType(samples: any[]): 'email' | 'phone' | 'date' | null {
    if (samples.length === 0) return null;

    const nonEmptySamples = samples.filter(s => s && typeof s === 'string' && s.trim().length > 0);
    if (nonEmptySamples.length === 0) return null;

    // 检查是否为邮箱
    const emailCount = nonEmptySamples.filter(s =>
      FormatConsistencyDetector.FORMAT_PATTERNS.email.test(s)
    ).length;
    if (emailCount / nonEmptySamples.length > 0.8) return 'email';

    // 检查是否为电话
    const phoneCount = nonEmptySamples.filter(s =>
      FormatConsistencyDetector.FORMAT_PATTERNS.phone.test(s)
    ).length;
    if (phoneCount / nonEmptySamples.length > 0.8) return 'phone';

    // 检查是否为日期
    const dateCount = nonEmptySamples.filter(s =>
      FormatConsistencyDetector.FORMAT_PATTERNS.date.test(s)
    ).length;
    if (dateCount / nonEmptySamples.length > 0.8) return 'date';

    return null;
  }

  /**
   * 计算严重程度
   */
  private calculateSeverity(percentage: number): IssueSeverity {
    if (percentage > 10) return 'high';
    if (percentage > 5) return 'medium';
    return 'low';
  }

  /**
   * 生成问题ID
   */
  private generateIssueId(type: string, column: string): string {
    return `${type}_${column}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// 数据质量分析器（主类）
// ============================================================================

/**
 * 数据质量分析器
 *
 * 核心职责：
 * 1. 协调各个检测器进行数据质量检测
 * 2. 聚合检测结果生成完整报告
 * 3. 计算数据质量评分
 * 4. 生成列统计信息
 */
export class DataQualityAnalyzer {
  private readonly missingValueDetector: MissingValueDetector;
  private readonly outlierDetector: OutlierDetector;
  private readonly duplicateDetector: DuplicateDetector;
  private readonly formatConsistencyDetector: FormatConsistencyDetector;
  private readonly config: AnalyzerConfig;

  // 流式处理配置
  private readonly MAX_BATCH_SIZE = 10000;
  private readonly MAX_MEMORY_USAGE = 500 * 1024 * 1024; // 500MB
  private readonly GC_INTERVAL = 5; // 每5个批次执行一次GC

  // 缓存管理
  private columnStatsCache?: Map<string, InternalColumnStats[]>;
  private detectorCache?: Map<string, DetectionResult[]>;

  /**
   * 构造函数
   */
  constructor(
    private readonly aiService: IAIService,
    private readonly cacheService?: ICacheService,
    config?: AnalyzerConfig
  ) {
    this.missingValueDetector = new MissingValueDetector();
    this.outlierDetector = new OutlierDetector();
    this.duplicateDetector = new DuplicateDetector();
    this.formatConsistencyDetector = new FormatConsistencyDetector();

    this.config = {
      enableCache: true,
      cacheTTL: 1800000, // 30分钟
      parallelDetection: true,
      maxSampleSize: 10000,
      ...config
    };

    // 初始化缓存
    this.columnStatsCache = new Map();
    this.detectorCache = new Map();
  }

  /**
   * 分析数据质量
   *
   * @param data Excel数据
   * @param options 分析选项
   * @returns 数据质量报告
   */
  async analyze(
    data: ExcelData,
    options?: AnalysisOptions
  ): Promise<DataQualityReport> {
    const startTime = Date.now();

    try {
      // 1. 提取当前sheet的数据
      const sheetData = this.extractSheetData(data);
      if (!sheetData || sheetData.length === 0) {
        throw new Error('没有可分析的数据');
      }

      // 2. 检查缓存
      if (this.config.enableCache && this.cacheService) {
        const cacheKey = this.generateCacheKey(data, options);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
          logger.debug('[DataQualityAnalyzer] 使用缓存的分析结果');
          return cached;
        }
      }

      // 3. 根据数据大小选择处理方式
      if (sheetData.length < this.MAX_BATCH_SIZE) {
        // 小数据集: 直接处理
        return await this.analyzeSmallDataset(data, sheetData, options);
      } else {
        // 大数据集: 使用流式处理并合并结果
        logger.debug(`[DataQualityAnalyzer] 大数据集检测 (${sheetData.length} 行), 使用流式处理`);
        return await this.analyzeLargeDataset(data, sheetData, options);
      }
    } catch (error) {
      logger.error('[DataQualityAnalyzer] 分析失败:', error);
      throw error;
    }
  }

  /**
   * 流式数据分析 - 支持处理大文件
   */
  async *analyzeStreaming(
    data: ExcelData,
    options?: AnalysisOptions
  ): AsyncGenerator<DataQualityReport, void, unknown> {
    const sheetData = this.extractSheetData(data);
    const totalRows = sheetData.length;
    let processedRows = 0;

    logger.debug(`[DataQualityAnalyzer] 开始流式分析: ${totalRows} 行`);

    // 分批处理
    for (let i = 0; i < totalRows; i += this.MAX_BATCH_SIZE) {
      // 检查内存使用
      const memoryUsage = process.memoryUsage().heapUsed;
      if (memoryUsage > this.MAX_MEMORY_USAGE) {
        logger.warn(`[DataQualityAnalyzer] 内存使用过高: ${Math.round(memoryUsage / 1024 / 1024)}MB, 强制GC`);
        await this.forceGarbageCollection();
      }

      const batch = sheetData.slice(i, Math.min(i + this.MAX_BATCH_SIZE, totalRows));
      const batchNumber = Math.floor(i / this.MAX_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(totalRows / this.MAX_BATCH_SIZE);

      logger.debug(`[DataQualityAnalyzer] 处理批次 ${batchNumber}/${totalBatches}, 大小: ${batch.length} 行`);

      // 处理当前批次
      const result = await this.processBatch(batch, processedRows, options);

      processedRows += batch.length;

      // 更新进度
      result.summary = {
        progress: Math.round((processedRows / totalRows) * 100),
        totalRows,
        processedRows
      } as any;

      yield result;

      // 定期执行GC
      if (batchNumber % this.GC_INTERVAL === 0) {
        await this.releaseMemory();
      }
    }

    logger.debug(`[DataQualityAnalyzer] 流式分析完成: ${totalRows} 行`);
  }

  /**
   * 处理单个批次
   */
  private async processBatch(
    batch: any[],
    offset: number,
    options?: AnalysisOptions
  ): Promise<DataQualityReport> {
    // 批次处理逻辑
    const columnStats = await this.generateColumnStats(batch);
    const detectionResults = await this.runDetectors(batch, columnStats, options);

    return {
      reportId: this.generateReportId(),
      fileName: `batch_${offset}`,
      sheetName: 'batch',
      totalRows: batch.length,
      totalColumns: columnStats.length,
      timestamp: Date.now(),
      qualityScore: this.calculateQualityScore(
        this.aggregateIssues(detectionResults),
        batch
      ),
      issues: this.aggregateIssues(detectionResults),
      columnStats: this.convertToExportStats(columnStats),
      dataSample: this.extractSample(batch, 10)
    } as any;
  }

  /**
   * 强制垃圾回收
   */
  private async forceGarbageCollection(): Promise<void> {
    if (global.gc) {
      return new Promise(resolve => {
        global.gc();
        // 等待GC完成
        setTimeout(resolve, 100);
      });
    } else {
      logger.warn('[DataQualityAnalyzer] 全局GC不可用。请使用 --expose-gc 标志启动Node');
    }
  }

  /**
   * 释放内存
   */
  private async releaseMemory(): Promise<void> {
    // 清理缓存
    this.clearCache();

    // 强制GC
    await this.forceGarbageCollection();

    // 记录内存状态
    const memUsage = process.memoryUsage();
    logger.debug(`[DataQualityAnalyzer] 内存状态:`, {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    });
  }

  /**
   * 清理缓存
   */
  private clearCache(): void {
    // 清理内部缓存
    if (this.columnStatsCache) {
      this.columnStatsCache.clear();
    }
    if (this.detectorCache) {
      this.detectorCache.clear();
    }
  }

  /**
   * 分析小数据集
   */
  private async analyzeSmallDataset(
    data: ExcelData,
    sheetData: any[],
    options?: AnalysisOptions
  ): Promise<DataQualityReport> {
    const startTime = Date.now();

    // 生成列统计信息
    const columnStats = await this.generateColumnStats(sheetData);

    // 并行执行所有检测器
    const detectionResults = await this.runAllDetectors(sheetData, columnStats, options);

    // 聚合检测结果
    const issues = this.aggregateIssues(detectionResults);

    // 执行自定义规则检测
    if (options?.customRules && options.customRules.length > 0) {
      const customIssues = await this.runCustomRules(sheetData, options.customRules);
      issues.push(...customIssues);
    }

    // 计算质量评分
    const qualityScore = this.calculateQualityScore(issues, sheetData);

    // 构建报告
    const report: DataQualityReport = {
      reportId: this.generateReportId(),
      fileName: data.fileName,
      sheetName: data.currentSheetName,
      totalRows: sheetData.length,
      totalColumns: columnStats.length,
      timestamp: Date.now(),
      qualityScore,
      issues,
      columnStats: this.convertToExportStats(columnStats),
      dataSample: this.extractSample(sheetData, 10)
    };

    // 缓存报告
    if (this.config.enableCache && this.cacheService) {
      const cacheKey = this.generateCacheKey(data, options);
      await this.cacheService.set(cacheKey, report, this.config.cacheTTL);
    }

    const duration = Date.now() - startTime;
    logger.debug(`[DataQualityAnalyzer] 分析完成，耗时 ${duration}ms`);

    return report;
  }

  /**
   * 分析大数据集（使用流式处理）
   */
  private async analyzeLargeDataset(
    data: ExcelData,
    sheetData: any[],
    options?: AnalysisOptions
  ): Promise<DataQualityReport> {
    const reports: DataQualityReport[] = [];

    // 使用流式处理
    for await (const report of this.analyzeStreaming(data, options)) {
      reports.push(report);
    }

    // 合并所有报告
    return this.mergeReports(reports, data);
  }

  /**
   * 合并多个报告
   */
  private mergeReports(reports: DataQualityReport[], originalData: ExcelData): DataQualityReport {
    if (reports.length === 0) {
      throw new Error('没有报告可合并');
    }

    // 合并统计信息
    const totalRows = reports.reduce((sum, r) => sum + r.totalRows, 0);
    const allIssues = reports.flatMap(r => r.issues);
    const allColumnStats = reports.flatMap(r => r.columnStats);

    // 计算平均质量分数
    const avgQualityScore = reports.reduce((sum, r) => sum + r.qualityScore, 0) / reports.length;

    return {
      reportId: this.generateReportId(),
      fileName: originalData.fileName,
      sheetName: originalData.currentSheetName,
      totalRows,
      totalColumns: allColumnStats.length,
      timestamp: Date.now(),
      qualityScore: avgQualityScore,
      issues: allIssues,
      columnStats: allColumnStats,
      dataSample: reports[0].dataSample
    };
  }

  /**
   * 提取当前sheet的数据
   */
  private extractSheetData(data: ExcelData): any[] {
    const sheetName = data.currentSheetName;
    return data.sheets[sheetName] || [];
  }

  /**
   * 运行所有检测器
   */
  private async runAllDetectors(
    data: any[],
    columnStats: InternalColumnStats[],
    options?: AnalysisOptions
  ): Promise<DetectionResult[]> {
    return await this.runDetectors(data, columnStats, options);
  }

  /**
   * 运行检测器(核心逻辑)
   */
  private async runDetectors(
    data: any[],
    columnStats: InternalColumnStats[],
    options?: AnalysisOptions
  ): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    // 1. 检测缺失值
    if (options?.detectMissing !== false) {
      const missingStart = Date.now();
      for (const stats of columnStats) {
        const issue = await this.missingValueDetector.detect(data, stats.columnName, options);
        if (issue) {
          results.push({
            issues: [issue],
            detectorName: 'MissingValueDetector',
            executionTime: Date.now() - missingStart
          });
        }
      }
    }

    // 2. 检测异常值
    if (options?.detectOutliers !== false) {
      const outlierStart = Date.now();
      for (const stats of columnStats) {
        const issue = await this.outlierDetector.detect(data, stats, options);
        if (issue) {
          results.push({
            issues: [issue],
            detectorName: 'OutlierDetector',
            executionTime: Date.now() - outlierStart
          });
        }
      }
    }

    // 3. 检测重复行
    if (options?.detectDuplicates !== false) {
      const duplicateStart = Date.now();
      const issue = await this.duplicateDetector.detect(data, options);
      if (issue) {
        results.push({
          issues: [issue],
          detectorName: 'DuplicateDetector',
          executionTime: Date.now() - duplicateStart
        });
      }
    }

    // 4. 检测格式一致性
    if (options?.detectFormat !== false) {
      const formatStart = Date.now();
      for (const stats of columnStats) {
        const issue = await this.formatConsistencyDetector.detect(data, stats, options);
        if (issue) {
          results.push({
            issues: [issue],
            detectorName: 'FormatConsistencyDetector',
            executionTime: Date.now() - formatStart
          });
        }
      }
    }

    return results;
  }

  /**
   * 聚合检测结果
   */
  private aggregateIssues(results: DetectionResult[]): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];

    results.forEach(result => {
      issues.push(...result.issues);
    });

    // 按严重程度排序
    const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return issues;
  }

  /**
   * 运行自定义规则
   */
  private async runCustomRules(
    data: any[],
    rules: CustomRule[]
  ): Promise<DataQualityIssue[]> {
    const issues: DataQualityIssue[] = [];

    for (const rule of rules) {
      const affectedRows: number[] = [];

      data.forEach((row, index) => {
        try {
          if (rule.rule(row, index)) {
            affectedRows.push(index);
          }
        } catch (error) {
          logger.error(`[DataQualityAnalyzer] 自定义规则执行失败: ${rule.name}`, error);
        }
      });

      if (affectedRows.length > 0) {
        const affectedPercentage = (affectedRows.length / data.length) * 100;
        issues.push({
          issueId: this.generateIssueId('custom', rule.ruleId),
          issueType: DataQualityIssueType.DATA_INCONSISTENCY,
          severity: rule.severity,
          affectedColumns: [],
          affectedRows,
          description: rule.description,
          statistics: {
            affectedRowCount: affectedRows.length,
            affectedPercentage,
            distribution: { [rule.ruleId]: affectedRows.length }
          }
        });
      }
    }

    return issues;
  }

  /**
   * 生成列统计信息
   */
  private async generateColumnStats(data: any[]): Promise<InternalColumnStats[]> {
    if (data.length === 0) return [];

    // 获取所有列名
    const columns = Object.keys(data[0]);
    const stats: InternalColumnStats[] = [];

    for (const column of columns) {
      const columnStats = await this.analyzeColumn(data, column);
      stats.push(columnStats);
    }

    return stats;
  }

  /**
   * 分析单个列
   */
  private async analyzeColumn(data: any[], columnName: string): Promise<InternalColumnStats> {
    const values = data.map(row => row[columnName]);
    const rowIndices = data.map((_, index) => index);

    // 推断数据类型
    const dataType = this.inferDataType(values);

    // 计算基本统计
    const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
    const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined && v !== ''));
    const uniqueCount = uniqueValues.size;

    // 提取样本值
    const sampleValues = values.filter(v => v !== null && v !== undefined && v !== '').slice(0, 10);

    let min: number | undefined;
    let max: number | undefined;
    let mean: number | undefined;
    let median: number | undefined;
    let stdDev: number | undefined;
    let mode: any;

    // 数值类型的额外统计
    if (dataType === 'number') {
      const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
      if (numericValues.length > 0) {
        min = Math.min(...numericValues);
        max = Math.max(...numericValues);
        mean = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;

        const sorted = [...numericValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        median = sorted.length % 2 !== 0
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2;

        const variance = numericValues.reduce((sum, v) => sum + Math.pow(v - mean!, 2), 0) / numericValues.length;
        stdDev = Math.sqrt(variance);
      }
    }

    // 计算众数
    const valueCount = new Map<any, number>();
    values.forEach(v => {
      if (v !== null && v !== undefined && v !== '') {
        valueCount.set(v, (valueCount.get(v) || 0) + 1);
      }
    });
    let maxCount = 0;
    valueCount.forEach((count, v) => {
      if (count > maxCount) {
        maxCount = count;
        mode = v;
      }
    });

    // 计算分布
    const distribution: DataDistribution[] = [];
    valueCount.forEach((count, value) => {
      distribution.push({
        value,
        count,
        percentage: (count / values.length) * 100
      });
    });
    distribution.sort((a, b) => b.count - a.count);
    distribution.slice(0, 20); // 只保留前20个

    return {
      columnName,
      dataType,
      nullCount,
      uniqueCount,
      min,
      max,
      mean,
      median,
      stdDev,
      mode,
      sampleValues,
      distribution: distribution.slice(0, 20),
      rowIndices
    };
  }

  /**
   * 推断数据类型
   */
  private inferDataType(values: any[]): DataType {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

    if (nonNullValues.length === 0) return 'unknown';

    // 检查是否为布尔值
    const booleanCount = nonNullValues.filter(v =>
      typeof v === 'boolean' || v === 'true' || v === 'false'
    ).length;
    if (booleanCount / nonNullValues.length > 0.8) return 'boolean';

    // 检查是否为数字
    const numberCount = nonNullValues.filter(v =>
      typeof v === 'number' && !isNaN(v)
    ).length;
    if (numberCount / nonNullValues.length > 0.8) return 'number';

    // 检查是否为日期
    const dateCount = nonNullValues.filter(v => {
      if (typeof v !== 'string') return false;
      const date = new Date(v);
      return !isNaN(date.getTime());
    }).length;
    if (dateCount / nonNullValues.length > 0.8) return 'date';

    // 检查是否为对象
    const objectCount = nonNullValues.filter(v => typeof v === 'object').length;
    if (objectCount / nonNullValues.length > 0.8) return 'object';

    return 'string';
  }

  /**
   * 计算质量评分
   */
  private calculateQualityScore(issues: DataQualityIssue[], data: any[]): number {
    const totalRows = data.length;
    if (totalRows === 0) return 100;

    const severityWeight = {
      'critical': 50,
      'high': 20,
      'medium': 10,
      'low': 5
    };

    let penalty = 0;
    issues.forEach(issue => {
      const affectedRatio = issue.statistics.affectedPercentage / 100;
      penalty += severityWeight[issue.severity] * affectedRatio;
    });

    return Math.max(0, Math.min(100, 100 - penalty));
  }

  /**
   * 转换为导出格式
   */
  private convertToExportStats(internalStats: InternalColumnStats[]): ColumnStatistics[] {
    return internalStats.map(stats => ({
      columnName: stats.columnName,
      dataType: stats.dataType,
      nullCount: stats.nullCount,
      uniqueCount: stats.uniqueCount,
      min: stats.min,
      max: stats.max,
      mean: stats.mean,
      median: stats.median,
      stdDev: stats.stdDev,
      mode: stats.mode,
      sampleValues: stats.sampleValues,
      distribution: stats.distribution
    }));
  }

  /**
   * 提取数据样本
   */
  private extractSample(data: any[], size: number): any[] {
    return data.slice(0, size);
  }

  /**
   * 生成报告ID
   */
  private generateReportId(): string {
    return `dq_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成问题ID
   */
  private generateIssueId(type: string, column: string): string {
    return `${type}_${column}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(data: ExcelData, options?: AnalysisOptions): string {
    // 简化版本：使用文件名和sheet名生成缓存键
    // 生产环境应使用更复杂的哈希算法
    const optionsStr = options ? JSON.stringify(options) : '';
    return `dq_analysis:${data.fileName}:${data.currentSheetName}:${optionsStr}`;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建数据质量分析器
 */
export function createDataQualityAnalyzer(
  aiService: IAIService,
  cacheService?: ICacheService,
  config?: AnalyzerConfig
): DataQualityAnalyzer {
  return new DataQualityAnalyzer(aiService, cacheService, config);
}
