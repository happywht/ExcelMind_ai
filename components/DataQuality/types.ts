/**
 * 数据质量模块 - 类型定义
 *
 * @version 2.0.0
 */

import { DataQualityAnalysis, DataQualityIssue, CleaningSuggestion, CleaningResult } from '../../services/dataQualityAPI';

export type {
  DataQualityAnalysis,
  DataQualityIssue,
  CleaningSuggestion,
  CleaningResult,
};

export interface AnalysisProgress {
  stage: 'uploading' | 'analyzing' | 'generating_suggestions' | 'completed' | 'error';
  progress: number;
  message: string;
}

export interface QualityMetrics {
  score: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  validity: number;
}

export interface IssueGroup {
  severity: 'critical' | 'high' | 'medium' | 'low';
  count: number;
  issues: DataQualityIssue[];
}

export interface CleaningSummary {
  totalIssues: number;
  autoFixable: number;
  manualRequired: number;
  estimatedTime: number;
}

export interface QualityTrend {
  date: string;
  score: number;
  issues: number;
}
