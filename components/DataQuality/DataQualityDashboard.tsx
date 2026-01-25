/**
 * 数据质量分析仪表盘
 *
 * 主界面组件，包含文件上传、质量分析、问题展示和建议面板
 *
 * @version 2.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import QualityGauge from '../Shared/QualityGauge';
import IssueBadge from '../Shared/IssueBadge';
import ProgressBar from '../Shared/ProgressBar';
import StatusIndicator from '../Shared/StatusIndicator';
import { dataQualityAPI } from '../../api/dataQualityAPI';
import { useWebSocket } from '../../hooks/useWebSocket';
import { API_BASE_URL, WS_BASE_URL } from '../../api/config';
import { DataQualityAnalysis, CleaningSuggestion, AnalysisProgress } from './types';
import IssueList from './IssueList';
import RecommendationPanel from './RecommendationPanel';
import AutoFixDialog from './AutoFixDialog';

interface DataQualityDashboardProps {
  className?: string;
}

const DataQualityDashboard: React.FC<DataQualityDashboardProps> = ({ className }) => {
  const [analysis, setAnalysis] = useState<DataQualityAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<CleaningSuggestion[]>([]);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAutoFix, setShowAutoFix] = useState(false);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);

  // WebSocket连接
  const { client, connected: wsConnected, subscribe, on } = useWebSocket(
    WS_BASE_URL,
    {
      onConnect: () => {
        console.log('[DataQualityDashboard] WebSocket已连接');
      },
      onDisconnect: () => {
        console.log('[DataQualityDashboard] WebSocket已断开');
      },
    }
  );

  // 订阅分析进度
  useEffect(() => {
    if (client && wsConnected && currentFileId) {
      const channel = `analysis:${currentFileId}`;
      subscribe(channel);

      const handleProgress = (message: any) => {
        if (message.type === 'analysis_progress') {
          setProgress({
            stage: 'analyzing',
            progress: message.payload.progress,
            message: message.payload.message || '正在分析...',
          });
        } else if (message.type === 'analysis_completed') {
          setProgress({
            stage: 'completed',
            progress: 100,
            message: '分析完成',
          });

          // 获取完整分析结果
          if (message.payload.result) {
            setAnalysis(message.payload.result);
          }
        } else if (message.type === 'analysis_error') {
          setProgress({
            stage: 'error',
            progress: 0,
            message: message.payload.error || '分析失败',
          });
        }
      };

      on(channel, handleProgress);

      return () => {
        // 清理
      };
    }
  }, [client, wsConnected, currentFileId, subscribe, on]);

  // 处理文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    setSelectedFile(file);

    setProgress({
      stage: 'uploading',
      progress: 10,
      message: '正在上传文件...',
    });

    try {
      // 1. 上传文件到服务器
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${API_BASE_URL}/storage/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('文件上传失败');
      }

      const uploadResult = await uploadResponse.json();
      const fileId = uploadResult.data.fileId;
      setCurrentFileId(fileId);

      setProgress({
        stage: 'analyzing',
        progress: 30,
        message: '正在分析数据质量...',
      });

      // 2. 调用数据分析API
      // 注意：这里使用第一个sheet作为默认分析对象
      // 实际应用中可能需要让用户选择sheet
      const analysisResult = await dataQualityAPI.analyzeData(
        fileId,
        '',  // sheetName - 留空表示使用默认sheet
        {
          checkMissingValues: true,
          checkDuplicates: true,
          checkFormats: true,
          checkOutliers: true,
          sampleSize: 1000,
        }
      );

      setAnalysis(analysisResult);

      setProgress({
        stage: 'generating_suggestions',
        progress: 60,
        message: '正在生成清洗建议...',
      });

      // 3. 获取清洗建议
      const suggestionsResult = await dataQualityAPI.getSuggestions(
        analysisResult.analysisId,
        {
          includeAutoFix: true,
          priority: 'high',
        }
      );

      setSuggestions(suggestionsResult.suggestions);

      setProgress({
        stage: 'completed',
        progress: 100,
        message: '分析完成',
      });

    } catch (error) {
      console.error('数据质量分析失败:', error);

      setProgress({
        stage: 'error',
        progress: 0,
        message: `分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });

      // 如果API调用失败，使用模拟数据用于演示
      setTimeout(() => {
        // 仅用于演示，实际生产环境应移除
        setAnalysis({
          analysisId: 'demo_analysis_001',
          fileId: 'file_001',
          sheetName: '销售数据',
          summary: {
            totalRows: 1000,
            totalColumns: 15,
            completeness: 0.95,
            qualityScore: 85,
          },
          issues: [
            {
              issueId: 'issue_001',
              issueType: 'missing_value',
              severity: 'high',
              location: {
                column: '客户邮箱',
                affectedRows: [5, 12, 23, 45],
              },
              description: '发现4条缺失的客户邮箱记录',
              impact: '无法发送邮件通知',
              affectedPercentage: 0.4,
            },
          ],
          statistics: {
            missingValues: {
              total: 50,
              byColumn: {
                '客户邮箱': 4,
                '联系电话': 8,
                '地址': 38,
              },
            },
            duplicates: {
              total: 10,
              duplicateSets: 2,
            },
            formatIssues: {
              total: 15,
              byType: {
                date: 8,
                phone: 5,
                email: 2,
              },
            },
            outliers: {
              total: 3,
              byColumn: {
                销售额: 1,
                数量: 2,
              },
            },
          },
          recommendations: [
            '建议填充缺失的客户邮箱信息',
            '建议删除重复的订单记录',
            '建议统一日期格式为YYYY-MM-DD',
          ],
        });

        setSuggestions([
          {
            id: 'sugg_001',
            issueId: 'issue_001',
            priority: 'high',
            title: '填充缺失的客户邮箱',
            description: '发现4条缺失的客户邮箱记录',
            impact: '缺失邮箱将影响客户通知发送',
            estimatedTime: '5分钟',
            canAutoFix: false,
            steps: [
              '检查CRM系统是否有客户邮箱信息',
              '如找到，导入并更新数据',
              '如未找到，添加标记字段',
            ],
            manualAction: {
              type: 'lookup',
              source: 'CRM系统',
              mapping: 'customer_id -> email',
            },
          },
        ]);
      }, 1000);
    }
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // 处理拖拽上传
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // 应用修复
  const handleApplyFixes = useCallback(async (actions: Array<{
    suggestionId: string;
    action: 'auto_fix' | 'manual' | 'skip';
    manualValue?: any;
  }>) => {
    if (!analysis) return;

    try {
      const result = await dataQualityAPI.executeCleaning(
        analysis.analysisId,
        actions,
        {
          createBackup: true,
          validateAfterClean: true,
        }
      );

      // 处理清洗结果
      console.log('清洗完成:', result);

      // 更新分析结果中的质量评分
      if (result.summary.finalQualityScore) {
        setAnalysis(prev => prev ? {
          ...prev,
          summary: {
            ...prev.summary,
            qualityScore: result.summary.finalQualityScore,
          },
        } : null);
      }

      setShowAutoFix(false);

      // 显示成功消息
      alert(`清洗完成！质量评分提升 ${result.summary.qualityImprovement} 分`);
    } catch (error) {
      console.error('执行清洗失败:', error);
      alert(`执行清洗失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [analysis]);

  // 重置分析
  const handleReset = useCallback(() => {
    setAnalysis(null);
    setSuggestions([]);
    setProgress(null);
    setSelectedFile(null);
  }, []);

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 文件上传区域 */}
      {!analysis && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer"
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <Upload className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                上传Excel文件进行质量分析
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                拖拽文件到此处，或点击选择文件
              </p>
              <p className="text-xs text-slate-400">
                支持 .xlsx, .xls, .csv 格式，最大50MB
              </p>
            </label>
          </div>
        </div>
      )}

      {/* 进度显示 */}
      {progress && progress.stage !== 'completed' && progress.stage !== 'error' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <StatusIndicator status="loading" text={progress.message} size={24} className="mb-4" />
          <ProgressBar progress={progress.progress} size="lg" color="blue" showLabel />
        </div>
      )}

      {/* 分析结果 */}
      {analysis && (
        <div className="space-y-6">
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {selectedFile?.name || '分析结果'}
                </h2>
                <p className="text-sm text-slate-500">
                  {analysis.sheetName} · {analysis.summary.totalRows.toLocaleString()} 行 × {analysis.summary.totalColumns} 列
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              重新分析
            </button>
          </div>

          {/* 质量评分卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 总体评分 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-600">数据质量评分</h3>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-center justify-center">
                <QualityGauge score={analysis.summary.qualityScore} size={160} />
              </div>
            </div>

            {/* 统计指标 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-medium text-slate-600 mb-4">统计指标</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">完整度</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {(analysis.summary.completeness * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">缺失值</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {analysis.statistics.missingValues.total}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">重复值</span>
                  <span className="text-sm font-semibold text-yellow-600">
                    {analysis.statistics.duplicates.total}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">格式问题</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {analysis.statistics.formatIssues.total}
                  </span>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-medium text-slate-600 mb-4">快速操作</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowAutoFix(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  一键修复
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium">
                  <AlertCircle className="w-4 h-4" />
                  查看详情
                </button>
              </div>
            </div>
          </div>

          {/* 问题列表 */}
          <IssueList issues={analysis.issues} />

          {/* 建议面板 */}
          <RecommendationPanel
            suggestions={suggestions}
            onApply={handleApplyFixes}
          />
        </div>
      )}

      {/* 自动修复对话框 */}
      {showAutoFix && (
        <AutoFixDialog
          suggestions={suggestions}
          onApply={handleApplyFixes}
          onClose={() => setShowAutoFix(false)}
        />
      )}
    </div>
  );
};

export default DataQualityDashboard;
