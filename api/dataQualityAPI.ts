/**
 * 数据质量分析 API 客户端
 *
 * 提供数据质量分析、清洗建议生成、清洗执行等功能
 *
 * @version 2.0.0
 */

import { API_BASE_URL } from './config';

// ==================== 类型定义 ====================

export interface DataQualityIssue {
  issueId: string;
  issueType: 'missing_value' | 'outlier' | 'duplicate' | 'inconsistent_format' | 'invalid_type';
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: {
    column?: string;
    rows?: number[];
    affectedRows?: number[];
  };
  description: string;
  impact: string;
  affectedPercentage: number;
}

export interface DataQualityAnalysis {
  analysisId: string;
  fileId: string;
  sheetName: string;
  summary: {
    totalRows: number;
    totalColumns: number;
    completeness: number;
    qualityScore: number;
  };
  issues: DataQualityIssue[];
  statistics: {
    missingValues: {
      total: number;
      byColumn: Record<string, number>;
    };
    duplicates: {
      total: number;
      duplicateSets: number;
    };
    formatIssues: {
      total: number;
      byType: Record<string, number>;
    };
    outliers: {
      total: number;
      byColumn: Record<string, number>;
    };
  };
  recommendations: string[];
}

export interface CleaningSuggestion {
  id: string;
  issueId: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  estimatedTime: string;
  canAutoFix: boolean;
  steps: string[];
  autoFixCode?: string;
  manualAction?: {
    type: 'lookup' | 'verify' | 'fill';
    source?: string;
    mapping?: string;
    rowId?: number;
    field?: string;
    suggestedValues?: any[];
  };
  preview?: {
    affectedRows?: number;
    afterFixRows?: number;
    examples?: Array<{ original: any; converted: any }>;
  };
}

export interface CleaningSuggestionResponse {
  analysisId: string;
  suggestions: CleaningSuggestion[];
  totalSuggestions: number;
  canAutoFixCount: number;
  estimatedTotalTime: number;
}

export interface CleaningAction {
  suggestionId: string;
  action: 'auto_fix' | 'manual' | 'skip';
  manualValue?: any;
}

export interface CleaningResult {
  cleanId: string;
  analysisId: string;
  status: 'completed' | 'partial' | 'failed';
  results: Array<{
    suggestionId: string;
    status: 'success' | 'skipped' | 'failed';
    affectedRows?: number;
    message: string;
  }>;
  summary: {
    totalProcessed: number;
    successful: number;
    skipped: number;
    failed: number;
    finalQualityScore: number;
    qualityImprovement: number;
  };
  backupFile?: {
    fileId: string;
    fileName: string;
    expiresAt: string;
  };
}

export interface TransformRule {
  ruleId: string;
  name: string;
  category: string;
  description: string;
  input: {
    columnType: string;
    formats?: string[];
  };
  transformation: {
    type: string;
    pattern?: string;
    replacement?: string;
  };
  output: {
    format: string;
    dataType: string;
  };
}

// ==================== API 客户端类 ====================

class DataQualityAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL || '/api/v2') {
    this.baseUrl = baseUrl;
  }

  /**
   * 分析数据质量
   */
  async analyzeData(
    fileId: string,
    sheetName: string,
    options: {
      checkMissingValues?: boolean;
      checkDuplicates?: boolean;
      checkFormats?: boolean;
      checkOutliers?: boolean;
      sampleSize?: number;
    } = {}
  ): Promise<DataQualityAnalysis> {
    const response = await fetch(`${this.baseUrl}/data-quality/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        sheetName,
        options: {
          checkMissingValues: true,
          checkDuplicates: true,
          checkFormats: true,
          checkOutliers: true,
          sampleSize: 1000,
          ...options,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`分析失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 获取清洗建议
   */
  async getSuggestions(
    analysisId: string,
    options: {
      includeAutoFix?: boolean;
      priority?: 'high' | 'medium' | 'low';
    } = {}
  ): Promise<CleaningSuggestionResponse> {
    const response = await fetch(`${this.baseUrl}/data-quality/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisId,
        options: {
          includeAutoFix: true,
          priority: 'high',
          ...options,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`获取建议失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 执行数据清洗
   */
  async executeCleaning(
    analysisId: string,
    actions: CleaningAction[],
    options: {
      createBackup?: boolean;
      validateAfterClean?: boolean;
    } = {}
  ): Promise<CleaningResult> {
    const response = await fetch(`${this.baseUrl}/data-quality/clean`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisId,
        suggestions: actions,
        options: {
          createBackup: true,
          validateAfterClean: true,
          ...options,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`执行清洗失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 创建转换规则
   */
  async createTransformRule(rule: Omit<TransformRule, 'ruleId'>): Promise<{ ruleId: string; name: string; status: string }> {
    const response = await fetch(`${this.baseUrl}/data-quality/transform-rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rule),
    });

    if (!response.ok) {
      throw new Error(`创建规则失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 获取转换规则列表
   */
  async listTransformRules(params: {
    category?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{
    items: TransformRule[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params.category) queryParams.append('category', params.category);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const response = await fetch(
      `${this.baseUrl}/data-quality/transform-rules?${queryParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`获取规则列表失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * 应用转换规则
   */
  async applyTransformRules(
    fileId: string,
    sheetName: string,
    rules: Array<{ ruleId: string; targetColumn: string }>
  ): Promise<{
    transformId: string;
    status: string;
    results: Array<{
      ruleId: string;
      targetColumn: string;
      status: string;
      affectedRows: number;
      skippedRows: number;
      failedRows: number;
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/data-quality/apply-rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        sheetName,
        rules,
      }),
    });

    if (!response.ok) {
      throw new Error(`应用规则失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }
}

// ==================== 导出单例 ====================

export const dataQualityAPI = new DataQualityAPI();

export default DataQualityAPI;
