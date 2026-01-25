/**
 * 覆盖率分析器
 * 分析代码覆盖率并生成报告
 *
 * 功能：
 * - 分析代码覆盖率
 * - 生成覆盖率报告
 * - 检查覆盖率是否达标
 * - 识别未覆盖的代码
 */

import fs from 'fs';
import path from 'path';
import {
  CoverageData,
  CoverageReport,
  CoverageThresholds,
  FileCoverage,
  CoveragePercentages,
  UncoveredCode
} from './types';

// ============================================================
// 覆盖率分析器核心类
// ============================================================

export class CoverageAnalyzer {
  private readonly projectRoot: string;
  private readonly coverageThresholds: CoverageThresholds;
  private coverageData: CoverageData | null = null;

  constructor(
    projectRoot: string,
    thresholds: CoverageThresholds = {}
  ) {
    this.projectRoot = projectRoot;
    this.coverageThresholds = {
      statements: thresholds.statements ?? 90,
      branches: thresholds.branches ?? 85,
      functions: thresholds.functions ?? 95,
      lines: thresholds.lines ?? 90
    };
  }

  // ============================================================
  // 覆盖率分析
  // ============================================================

  /**
   * 分析代码覆盖率
   */
  analyzeCoverage(projectPath?: string): CoverageData {
    const targetPath = projectPath || this.projectRoot;

    console.log('🔍 分析代码覆盖率...');
    console.log(`   项目路径: ${targetPath}`);
    console.log(`   目标阈值:`);
    console.log(`     - 语句: ${this.coverageThresholds.statements}%`);
    console.log(`     - 分支: ${this.coverageThresholds.branches}%`);
    console.log(`     - 函数: ${this.coverageThresholds.functions}%`);
    console.log(`     - 行: ${this.coverageThresholds.lines}%`);
    console.log('');

    try {
      // 读取覆盖率数据
      const coverageJsonPath = path.join(targetPath, 'coverage', 'coverage-final.json');

      if (!fs.existsSync(coverageJsonPath)) {
        console.warn('⚠️  覆盖率数据文件不存在，请先运行测试并生成覆盖率报告');
        return this.createEmptyCoverageData();
      }

      const rawCoverage = JSON.parse(fs.readFileSync(coverageJsonPath, 'utf-8'));

      // 解析覆盖率数据
      this.coverageData = this.parseCoverageData(rawCoverage);

      // 计算总体统计
      this.calculateTotals();

      console.log('✅ 覆盖率分析完成');
      console.log('');

      return this.coverageData;
    } catch (error) {
      console.error('❌ 覆盖率分析失败:', error);
      return this.createEmptyCoverageData();
    }
  }

  /**
   * 解析覆盖率数据
   */
  private parseCoverageData(rawCoverage: any): CoverageData {
    const files: Record<string, FileCoverage> = {};

    for (const [filePath, fileData] of Object.entries(rawCoverage)) {
      const coverage = fileData as any;

      // 计算语句覆盖率
      const statements = this.calculateMetric(coverage.s);

      // 计算分支覆盖率
      const branches = this.calculateMetric(coverage.b);

      // 计算函数覆盖率
      const functions = this.calculateMetric(coverage.f);

      // 计算行覆盖率
      const lines = this.calculateLineCoverage(coverage);

      files[filePath] = {
        path: filePath,
        statements,
        branches,
        functions,
        lines
      };
    }

    return {
      files,
      totals: {
        totalStatements: 0,
        coveredStatements: 0,
        totalBranches: 0,
        coveredBranches: 0,
        totalFunctions: 0,
        coveredFunctions: 0,
        totalLines: 0,
        coveredLines: 0
      },
      percentages: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
        average: 0
      }
    };
  }

  /**
   * 计算指标
   */
  private calculateMetric(data: any): any {
    if (!data) {
      return { total: 0, covered: 0, skipped: 0, percentage: 0 };
    }

    let total = 0;
    let covered = 0;
    let skipped = 0;

    for (const key in data) {
      const value = data[key];

      if (typeof value === 'number') {
        total++;
        if (value > 0) {
          covered++;
        }
      } else if (Array.isArray(value)) {
        // 分支数据可能是数组
        total += value.length;
        covered += value.filter((v: any) => v > 0).length;
      }
    }

    return {
      total,
      covered,
      skipped,
      percentage: total > 0 ? (covered / total) * 100 : 0
    };
  }

  /**
   * 计算行覆盖率
   */
  private calculateLineCoverage(coverage: any): any {
    if (!coverage.statementMap || !coverage.s) {
      return { total: 0, covered: 0, skipped: 0, percentage: 0 };
    }

    const lines = new Set<number>();
    const coveredLines = new Set<number>();

    for (const [key, count] of Object.entries(coverage.s)) {
      const statementMap = (coverage.statementMap as any)[key];

      if (statementMap) {
        const startLine = statementMap.start.line;
        const endLine = statementMap.end?.line || startLine;

        for (let line = startLine; line <= endLine; line++) {
          lines.add(line);
          if ((count as number) > 0) {
            coveredLines.add(line);
          }
        }
      }
    }

    const total = lines.size;
    const covered = coveredLines.size;

    return {
      total,
      covered,
      skipped: 0,
      percentage: total > 0 ? (covered / total) * 100 : 0
    };
  }

  /**
   * 计算总体统计
   */
  private calculateTotals(): void {
    if (!this.coverageData) return;

    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;

    for (const file of Object.values(this.coverageData.files)) {
      totalStatements += file.statements.total;
      coveredStatements += file.statements.covered;

      totalBranches += file.branches.total;
      coveredBranches += file.branches.covered;

      totalFunctions += file.functions.total;
      coveredFunctions += file.functions.covered;

      totalLines += file.lines.total;
      coveredLines += file.lines.covered;
    }

    this.coverageData.totals = {
      totalStatements,
      coveredStatements,
      totalBranches,
      coveredBranches,
      totalFunctions,
      coveredFunctions,
      totalLines,
      coveredLines
    };

    // 计算百分比
    this.coverageData.percentages = {
      statements: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
      branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
      functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
      lines: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
      average: 0
    };

    // 计算平均覆盖率
    const { percentages } = this.coverageData;
    percentages.average = (
      percentages.statements +
      percentages.branches +
      percentages.functions +
      percentages.lines
    ) / 4;
  }

  // ============================================================
  // 报告生成
  // ============================================================

  /**
   * 生成覆盖率报告
   */
  generateCoverageReport(coverage?: CoverageData): string {
    const data = coverage || this.coverageData;

    if (!data) {
      return '无覆盖率数据';
    }

    const lines: string[] = [];

    lines.push('');
    lines.push('═'.repeat(60));
    lines.push('📊 代码覆盖率报告');
    lines.push('═'.repeat(60));
    lines.push('');

    // 总体覆盖率
    lines.push('📈 总体覆盖率:');
    lines.push(`   语句: ${this.formatPercentage(data.percentages.statements)}`);
    lines.push(`   分支: ${this.formatPercentage(data.percentages.branches)}`);
    lines.push(`   函数: ${this.formatPercentage(data.percentages.functions)}`);
    lines.push(`   行:   ${this.formatPercentage(data.percentages.lines)}`);
    lines.push(`   平均: ${this.formatPercentage(data.percentages.average)}`);
    lines.push('');

    // 阈值检查
    const thresholdCheck = this.checkThresholds(data);
    if (thresholdCheck) {
      lines.push('✅ 阈值检查: 通过');
      lines.push('');
    } else {
      lines.push('❌ 阈值检查: 未通过');
      const failedThresholds = this.getFailedThresholds(data);
      failedThresholds.forEach(item => {
        lines.push(`   - ${item.metric}: ${item.current}% < ${item.required}%`);
      });
      lines.push('');
    }

    // 文件覆盖率详情
    lines.push('📁 文件覆盖率详情:');
    lines.push('');

    const sortedFiles = Object.values(data.files)
      .sort((a, b) => a.lines.percentage - b.lines.percentage);

    for (const file of sortedFiles) {
      const fileName = path.basename(file.path);
      const relativePath = path.relative(this.projectRoot, file.path);
      const status = this.getCoverageStatus(file.lines.percentage);

      lines.push(`${status.icon} ${fileName}`);
      lines.push(`   路径: ${relativePath}`);
      lines.push(`   语句: ${this.formatPercentage(file.statements.percentage)} | ` +
                `分支: ${this.formatPercentage(file.branches.percentage)} | ` +
                `函数: ${this.formatPercentage(file.functions.percentage)} | ` +
                `行: ${this.formatPercentage(file.lines.percentage)}`);
      lines.push('');
    }

    lines.push('═'.repeat(60));

    return lines.join('\n');
  }

  /**
   * 生成HTML覆盖率报告
   */
  generateHtmlReport(coverage?: CoverageData): string {
    const data = coverage || this.coverageData;

    if (!data) {
      return '<html><body><h1>无覆盖率数据</h1></body></html>';
    }

    const sortedFiles = Object.values(data.files)
      .sort((a, b) => a.lines.percentage - b.lines.percentage);

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>代码覆盖率报告 - ExcelMind AI</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 { color: #2c3e50; margin-bottom: 10px; }
        .summary { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px; }
        .metric { text-align: center; padding: 15px; border-radius: 6px; }
        .metric-high { background: #d4edda; }
        .metric-medium { background: #fff3cd; }
        .metric-low { background: #f8d7da; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #6c757d; font-size: 0.9em; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin-top: 10px; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .progress-high { background: linear-gradient(90deg, #28a745, #20c997); }
        .progress-medium { background: linear-gradient(90deg, #ffc107, #fd7e14); }
        .progress-low { background: linear-gradient(90deg, #dc3545, #c82333); }
        .files { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; font-weight: 600; color: #495057; }
        tr:hover { background: #f8f9fa; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; }
        .badge-high { background: #d4edda; color: #155724; }
        .badge-medium { background: #fff3cd; color: #856404; }
        .badge-low { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 代码覆盖率报告</h1>

        <div class="summary">
            <h2>总体覆盖率</h2>
            <div class="metrics">
                <div class="metric ${this.getMetricClass(data.percentages.statements)}">
                    <div class="metric-value">${data.percentages.statements.toFixed(1)}%</div>
                    <div class="metric-label">语句覆盖</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(data.percentages.statements)}" style="width: ${data.percentages.statements}%"></div>
                    </div>
                </div>
                <div class="metric ${this.getMetricClass(data.percentages.branches)}">
                    <div class="metric-value">${data.percentages.branches.toFixed(1)}%</div>
                    <div class="metric-label">分支覆盖</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(data.percentages.branches)}" style="width: ${data.percentages.branches}%"></div>
                    </div>
                </div>
                <div class="metric ${this.getMetricClass(data.percentages.functions)}">
                    <div class="metric-value">${data.percentages.functions.toFixed(1)}%</div>
                    <div class="metric-label">函数覆盖</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(data.percentages.functions)}" style="width: ${data.percentages.functions}%"></div>
                    </div>
                </div>
                <div class="metric ${this.getMetricClass(data.percentages.lines)}">
                    <div class="metric-value">${data.percentages.lines.toFixed(1)}%</div>
                    <div class="metric-label">行覆盖</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(data.percentages.lines)}" style="width: ${data.percentages.lines}%"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="files">
            <h2>文件覆盖率详情</h2>
            <table>
                <thead>
                    <tr>
                        <th>文件</th>
                        <th>语句</th>
                        <th>分支</th>
                        <th>函数</th>
                        <th>行</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedFiles.map(file => {
                        const status = this.getCoverageStatus(file.lines.percentage);
                        return `
                            <tr>
                                <td>${path.basename(file.path)}</td>
                                <td>${file.statements.percentage.toFixed(1)}%</td>
                                <td>${file.branches.percentage.toFixed(1)}%</td>
                                <td>${file.functions.percentage.toFixed(1)}%</td>
                                <td>${file.lines.percentage.toFixed(1)}%</td>
                                <td><span class="badge ${status.class}">${status.text}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
    `;
  }

  // ============================================================
  // 阈值检查
  // ============================================================

  /**
   * 检查覆盖率是否达标
   */
  checkThresholds(coverage: CoverageData, thresholds?: CoverageThresholds): boolean {
    const targetThresholds = thresholds || this.coverageThresholds;
    const { percentages } = coverage;

    const checks = [
      targetThresholds.statements ? percentages.statements >= targetThresholds.statements : true,
      targetThresholds.branches ? percentages.branches >= targetThresholds.branches : true,
      targetThresholds.functions ? percentages.functions >= targetThresholds.functions : true,
      targetThresholds.lines ? percentages.lines >= targetThresholds.lines : true
    ];

    return checks.every(check => check);
  }

  /**
   * 获取未达标的阈值项
   */
  private getFailedThresholds(coverage: CoverageData): Array<{ metric: string; current: number; required: number }> {
    const failures: Array<{ metric: string; current: number; required: number }> = [];
    const { percentages } = coverage;

    if (this.coverageThresholds.statements && percentages.statements < this.coverageThresholds.statements) {
      failures.push({
        metric: '语句',
        current: percentages.statements,
        required: this.coverageThresholds.statements
      });
    }

    if (this.coverageThresholds.branches && percentages.branches < this.coverageThresholds.branches) {
      failures.push({
        metric: '分支',
        current: percentages.branches,
        required: this.coverageThresholds.branches
      });
    }

    if (this.coverageThresholds.functions && percentages.functions < this.coverageThresholds.functions) {
      failures.push({
        metric: '函数',
        current: percentages.functions,
        required: this.coverageThresholds.functions
      });
    }

    if (this.coverageThresholds.lines && percentages.lines < this.coverageThresholds.lines) {
      failures.push({
        metric: '行',
        current: percentages.lines,
        required: this.coverageThresholds.lines
      });
    }

    return failures;
  }

  // ============================================================
  // 未覆盖代码识别
  // ============================================================

  /**
   * 识别未覆盖的代码
   */
  findUncoveredCode(coverage: CoverageData): UncoveredCode[] {
    const uncovered: UncoveredCode[] = [];

    for (const [filePath, fileCoverage] of Object.entries(coverage.files)) {
      // 未覆盖的语句
      if (fileCoverage.statements.total > fileCoverage.statements.covered) {
        uncovered.push({
          filePath,
          startLine: 0,
          endLine: 0,
          type: 'statement',
          code: '',
          reason: `有${fileCoverage.statements.total - fileCoverage.statements.covered}个语句未覆盖`
        });
      }

      // 未覆盖的分支
      if (fileCoverage.branches.total > fileCoverage.branches.covered) {
        uncovered.push({
          filePath,
          startLine: 0,
          endLine: 0,
          type: 'branch',
          code: '',
          reason: `有${fileCoverage.branches.total - fileCoverage.branches.covered}个分支未覆盖`
        });
      }

      // 未覆盖的函数
      if (fileCoverage.functions.total > fileCoverage.functions.covered) {
        uncovered.push({
          filePath,
          startLine: 0,
          endLine: 0,
          type: 'function',
          code: '',
          reason: `有${fileCoverage.functions.total - fileCoverage.functions.covered}个函数未覆盖`
        });
      }
    }

    return uncovered;
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 格式化百分比
   */
  private formatPercentage(value: number): string {
    const formatted = value.toFixed(1);
    const status = this.getCoverageStatus(value);
    return `${status.icon} ${formatted}%`;
  }

  /**
   * 获取覆盖率状态
   */
  private getCoverageStatus(percentage: number): { icon: string; text: string; class: string } {
    if (percentage >= 90) {
      return { icon: '✅', text: '优秀', class: 'badge-high' };
    } else if (percentage >= 70) {
      return { icon: '⚠️', text: '良好', class: 'badge-medium' };
    } else {
      return { icon: '❌', text: '需改进', class: 'badge-low' };
    }
  }

  /**
   * 获取指标样式类
   */
  private getMetricClass(percentage: number): string {
    if (percentage >= 90) return 'metric-high';
    if (percentage >= 70) return 'metric-medium';
    return 'metric-low';
  }

  /**
   * 获取进度条样式类
   */
  private getProgressClass(percentage: number): string {
    if (percentage >= 90) return 'progress-high';
    if (percentage >= 70) return 'progress-medium';
    return 'progress-low';
  }

  /**
   * 创建空的覆盖率数据
   */
  private createEmptyCoverageData(): CoverageData {
    return {
      files: {},
      totals: {
        totalStatements: 0,
        coveredStatements: 0,
        totalBranches: 0,
        coveredBranches: 0,
        totalFunctions: 0,
        coveredFunctions: 0,
        totalLines: 0,
        coveredLines: 0
      },
      percentages: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
        average: 0
      }
    };
  }
}

// ============================================================
// 导出
// ============================================================

export default CoverageAnalyzer;
