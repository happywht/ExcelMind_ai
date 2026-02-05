/**
 * 审计轨迹日志器
 * 用于记录和生成审计轨迹报告
 */

import type {
  AuditTrailEntry,
  AuditTrailDetails,
  AuditTrailReport,
  AuditTrailMetadata,
  IAuditTrailLogger,
  AuditTrailStatus
} from '../types/auditTrailTypes';
import { logger } from '@/utils/logger';

/**
 * 审计轨迹日志器实现
 */
export class AuditTrailLogger implements IAuditTrailLogger {
  private trail: AuditTrailEntry[] = [];
  private sessionId: string;
  private taskId?: string;
  private startTime: number;

  constructor(taskId?: string) {
    this.sessionId = this.generateSessionId();
    this.taskId = taskId;
    this.startTime = Date.now();
  }

  /**
   * 记录审计事件
   */
  log(action: string, details: AuditTrailDetails, status: AuditTrailStatus): void {
    const entry: AuditTrailEntry = {
      id: this.generateEntryId(),
      timestamp: new Date().toISOString(),
      action,
      details,
      status,
      stepNumber: this.trail.length + 1
    };

    if (status === 'error' && details.errorMessage) {
      entry.errorMessage = details.errorMessage;
    }

    this.trail.push(entry);

    // 控制台输出（开发模式）
    if (process.env.NODE_ENV === 'development') {
      const emoji = this.statusToEmoji(status);
      logger.debug(`[AuditTrail] ${emoji} ${action}`, details);
    }
  }

  /**
   * 生成审计报告
   */
  generateReport(): AuditTrailReport {
    const successfulSteps = this.trail.filter(e => e.status === 'success').length;
    const failedSteps = this.trail.filter(e => e.status === 'error').length;
    const totalExecutionTime = Date.now() - this.startTime;

    const metadata: AuditTrailMetadata = {
      reportId: this.generateReportId(),
      generatedAt: new Date().toISOString(),
      sessionId: this.sessionId,
      taskId: this.taskId,
      totalSteps: this.trail.length,
      successfulSteps,
      failedSteps,
      totalExecutionTime
    };

    return {
      metadata,
      entries: [...this.trail]
    };
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.trail = [];
    this.startTime = Date.now();
  }

  /**
   * 获取所有条目
   */
  getEntries(): AuditTrailEntry[] {
    return [...this.trail];
  }

  /**
   * 生成文本格式报告
   */
  generateTextReport(): string {
    const report = this.generateReport();

    return `
# ExcelMind AI 审计轨迹报告

生成时间：${new Date(report.metadata.generatedAt).toLocaleString('zh-CN')}
会话 ID：${report.metadata.sessionId}
${report.metadata.taskId ? `任务 ID：${report.metadata.taskId}` : ''}

---
## 执行摘要

- 总步骤数：${report.metadata.totalSteps}
- 成功步骤：${report.metadata.successfulSteps}
- 失败步骤：${report.metadata.failedSteps}
- 总执行时间：${(report.metadata.totalExecutionTime / 1000).toFixed(2)} 秒
- 成功率：${((report.metadata.successfulSteps / report.metadata.totalSteps) * 100).toFixed(1)}%

---
## 详细轨迹

${report.entries.map(entry => `
**${this.formatTimestamp(entry.timestamp)}** - ${this.statusToEmoji(entry.status)} **${entry.action}**

${Object.entries(entry.details).map(([key, value]) => {
  if (key === 'code' && typeof value === 'string') {
    return `- ${key}:\n\`\`\`python\n${value}\n\`\`\``;
  }
  return `- ${key}: ${JSON.stringify(value)}`;
}).join('\n')}

${entry.errorMessage ? `❌ 错误：${entry.errorMessage}` : ''}
`).join('\n---\n')}

---
✅ 报告结束
    `.trim();
  }

  /**
   * 生成会话 ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 生成条目 ID
   */
  private generateEntryId(): string {
    return `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 生成报告 ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * 状态转表情符号
   */
  private statusToEmoji(status: AuditTrailStatus): string {
    const emojiMap = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      pending: '⏳'
    };
    return emojiMap[status] || 'ℹ️';
  }
}

/**
 * 创建全局审计日志器实例
 */
export const createAuditLogger = (taskId?: string): AuditTrailLogger => {
  return new AuditTrailLogger(taskId);
};

/**
 * 默认导出
 */
export default AuditTrailLogger;
