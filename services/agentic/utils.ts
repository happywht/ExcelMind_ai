/**
 * 多步分析和自我修复系统 - 工具函数
 *
 * 提供便捷的工具函数和封装
 */

import { logger } from '@/utils/logger';
import { AgenticOrchestrator } from './AgenticOrchestrator';
import { DataFileInfo, TaskResult, OrchestratorConfig } from '../../types/agenticTypes';

/**
 * 执行多步分析的便捷函数
 *
 * @param userPrompt 用户的自然语言指令
 * @param dataFiles 数据文件列表
 * @param config 可选的配置
 * @returns 任务执行结果
 */
export async function executeMultiStepAnalysis(
  userPrompt: string,
  dataFiles: DataFileInfo[],
  config?: Partial<OrchestratorConfig>
): Promise<TaskResult> {
  const orchestrator = new AgenticOrchestrator(config);
  return orchestrator.executeTask(userPrompt, dataFiles);
}

/**
 * 执行带进度回调的多步分析
 *
 * @param userPrompt 用户的自然语言指令
 * @param dataFiles 数据文件列表
 * @param onProgress 进度回调函数
 * @param config 可选的配置
 * @returns 任务执行结果
 */
export async function executeMultiStepAnalysisWithProgress(
  userPrompt: string,
  dataFiles: DataFileInfo[],
  onProgress: (state: any) => void,
  config?: Partial<OrchestratorConfig>
): Promise<TaskResult> {
  const orchestrator = new AgenticOrchestrator(config);
  orchestrator.updateProgress(onProgress);
  return orchestrator.executeTask(userPrompt, dataFiles);
}

/**
 * 验证数据文件格式
 *
 * @param files 数据文件列表
 * @returns 验证结果
 */
export function validateDataFiles(files: DataFileInfo[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(files) || files.length === 0) {
    errors.push('至少需要提供一个数据文件');
    return { valid: false, errors };
  }

  for (const file of files) {
    if (!file.fileName) {
      errors.push('文件必须包含 fileName 属性');
    }

    if (!file.id) {
      errors.push(`文件 ${file.fileName} 缺少 id 属性`);
    }

    if (!file.sheets || Object.keys(file.sheets).length === 0) {
      errors.push(`文件 ${file.fileName} 没有包含任何 sheet 数据`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 格式化执行时间为可读字符串
 *
 * @param milliseconds 毫秒数
 * @returns 格式化的时间字符串
 */
export function formatExecutionTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  } else if (milliseconds < 60000) {
    const seconds = Math.round(milliseconds / 1000);
    return `${seconds}s`;
  } else {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.round((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * 格式化质量分数为百分比
 *
 * @param score 质量分数（0-1）
 * @returns 百分比字符串
 */
export function formatQualityScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * 判断任务是否成功
 *
 * @param result 任务结果
 * @returns 是否成功
 */
export function isTaskSuccessful(result: TaskResult): boolean {
  return result.success && result.executionSummary.failedSteps === 0;
}

/**
 * 获取任务摘要信息
 *
 * @param result 任务结果
 * @returns 摘要信息对象
 */
export function getTaskSummary(result: TaskResult) {
  return {
    success: result.success,
    duration: formatExecutionTime(result.executionSummary.totalTime),
    steps: result.executionSummary.totalSteps,
    successful: result.executionSummary.successfulSteps,
    failed: result.executionSummary.failedSteps,
    retried: result.executionSummary.retriedSteps,
    quality: result.qualityReport
      ? formatQualityScore(result.qualityReport.overallQuality)
      : 'N/A',
    outputFiles: result.data ? Object.keys(result.data).length : 0
  };
}

/**
 * 创建进度日志器
 *
 * @param prefix 日志前缀
 * @returns 日志函数
 */
export function createProgressLogger(prefix: string = '') {
  return (state: any) => {
    const timestamp = new Date().toISOString();
    const phase = state.progress?.currentPhase || 'Unknown';
    const percentage = state.progress?.percentage || 0;
    const message = state.progress?.message || '';

    logger.debug(`[${timestamp}] ${prefix}${phase} (${percentage}%) - ${message}`);
  };
}

/**
 * 错误分类助手
 *
 * @param errorMessage 错误消息
 * @returns 错误类别和建议
 */
export function analyzeError(errorMessage: string): {
  category: string;
  suggestion: string;
} {
  const lowerMessage = errorMessage.toLowerCase();

  // 列未找到错误
  if (lowerMessage.includes('column') || lowerMessage.includes('key')) {
    return {
      category: 'COLUMN_ERROR',
      suggestion: '检查数据文件中的列名是否正确，可能需要重新检查列名映射'
    };
  }

  // AI服务错误
  if (lowerMessage.includes('ai') || lowerMessage.includes('api')) {
    return {
      category: 'AI_SERVICE_ERROR',
      suggestion: 'AI服务调用失败，请检查网络连接或稍后重试'
    };
  }

  // 代码执行错误
  if (lowerMessage.includes('syntax') || lowerMessage.includes('execution')) {
    return {
      category: 'CODE_EXECUTION_ERROR',
      suggestion: '代码执行出错，系统将尝试自动修复或重新生成代码'
    };
  }

  // 默认
  return {
    category: 'UNKNOWN_ERROR',
    suggestion: '发生未知错误，请查看详细日志信息'
  };
}

/**
 * 估算执行时间
 *
 * @param fileCount 文件数量
 * @param dataRowCount 数据行数
 * @param complexity 复杂度（1-10）
 * @returns 估算的毫秒数
 */
export function estimateExecutionTime(
  fileCount: number,
  dataRowCount: number,
  complexity: number = 5
): number {
  const baseTime = 5000; // 基础时间5秒
  const fileFactor = fileCount * 2000; // 每个文件2秒
  const dataFactor = Math.min(dataRowCount / 100, 10) * 1000; // 数据因素
  const complexityFactor = complexity * 1000; // 复杂度因素

  return baseTime + fileFactor + dataFactor + complexityFactor;
}

/**
 * 生成任务报告
 *
 * @param result 任务结果
 * @returns 格式化的报告字符串
 */
export function generateTaskReport(result: TaskResult): string {
  const summary = getTaskSummary(result);
  const lines: string[] = [];

  lines.push('='.repeat(50));
  lines.push('任务执行报告');
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`状态: ${result.success ? '成功' : '失败'}`);
  lines.push(`执行时间: ${summary.duration}`);
  lines.push(`总步骤数: ${summary.steps}`);
  lines.push(`成功步骤: ${summary.successful}`);
  lines.push(`失败步骤: ${summary.failed}`);
  lines.push(`重试次数: ${summary.retried}`);
  lines.push(`质量评分: ${summary.quality}`);
  lines.push(`输出文件数: ${summary.outputFiles}`);
  lines.push('');

  if (result.logs && result.logs.length > 0) {
    lines.push('执行日志:');
    lines.push('-'.repeat(50));
    result.logs.slice(-10).forEach(log => {
      lines.push(`  ${log}`);
    });
    lines.push('');
  }

  if (result.qualityReport) {
    lines.push('质量报告:');
    lines.push('-'.repeat(50));
    lines.push(`  总体质量: ${formatQualityScore(result.qualityReport.overallQuality)}`);
    lines.push(`  总问题数: ${result.qualityReport.totalIssues}`);
    lines.push(`  严重问题: ${result.qualityReport.criticalIssues}`);

    if (result.qualityReport.suggestions.length > 0) {
      lines.push('  建议:');
      result.qualityReport.suggestions.forEach(suggestion => {
        lines.push(`    - ${suggestion}`);
      });
    }
  }

  lines.push('');
  lines.push('='.repeat(50));

  return lines.join('\n');
}
