/**
 * DocumentGenerator组件
 *
 * 负责文档生成的控制和配置
 *
 * @version 1.0.0
 *
 * 功能：
 * - 生成模式选择
 * - 聚合配置展示
 * - 生成按钮控制
 * - 生成进度显示
 * - 统计信息展示
 */

import React from 'react';
import {
  Download,
  Loader2,
  FileDown,
  Settings,
  Zap,
  Users,
  FileText
} from 'lucide-react';
import { MappingScheme, GenerationMode, AggregateConfig } from '../../types/documentTypes';

export interface DocumentGeneratorProps {
  /** 映射方案 */
  mappingScheme: MappingScheme | null;
  /** 生成模式 */
  generationMode: GenerationMode;
  /** 聚合配置 */
  aggregateConfig: AggregateConfig;
  /** 是否正在生成 */
  isGenerating: boolean;
  /** 生成进度 (0-100) */
  progress: number;
  /** 当前阶段 */
  stage?: string;
  /** 是否可以生成 */
  canGenerate: boolean;
  /** 模式变更回调 */
  onModeChange: (mode: GenerationMode) => void;
  /** 聚合配置变更回调 */
  onAggregateConfigChange: (config: AggregateConfig) => void;
  /** 生成文档回调 */
  onGenerate: () => Promise<void>;
}

/**
 * DocumentGenerator组件
 *
 * 单一职责：控制文档生成流程
 */
export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  mappingScheme,
  generationMode,
  aggregateConfig,
  isGenerating,
  progress,
  stage,
  canGenerate,
  onModeChange,
  onAggregateConfigChange,
  onGenerate
}) => {
  if (!mappingScheme) {
    return null;
  }

  // 处理生成
  const handleGenerate = async () => {
    if (!canGenerate || isGenerating) return;
    await onGenerate();
  };

  // 获取生成阶段文本
  const getStageText = (): string => {
    if (!stage) return '正在生成文档...';
    switch (stage) {
      case 'document_generation':
        return '正在生成文档...';
      case 'aggregate_generation':
        return '正在生成汇总文档...';
      default:
        return '处理中...';
    }
  };

  return (
    <div className="space-y-3">
      {/* 标题 */}
      <h3 className="font-semibold text-slate-700 flex items-center gap-2">
        <FileDown className="w-4 h-4 text-teal-500" />
        文档生成
      </h3>

      {/* 生成模式选择 */}
      <div className="bg-gradient-to-br from-slate-50 to-teal-50 rounded-lg p-4 border border-teal-200 space-y-3">
        {/* 模式切换 */}
        <div>
          <p className="text-xs font-medium text-slate-700 mb-2 flex items-center gap-1">
            <Settings className="w-3 h-3" />
            生成模式
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onModeChange('individual')}
              disabled={isGenerating}
              className={`
                p-3 rounded-lg text-sm font-medium transition-all
                ${generationMode === 'individual'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-teal-100 border border-slate-200'
                }
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <FileText className="w-4 h-4" />
                <span>逐行生成</span>
              </div>
              <p className="text-[10px] opacity-80">
                为每行数据生成独立文档
              </p>
            </button>

            <button
              onClick={() => onModeChange('aggregate')}
              disabled={isGenerating}
              className={`
                p-3 rounded-lg text-sm font-medium transition-all
                ${generationMode === 'aggregate'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-purple-100 border border-slate-200'
                }
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-4 h-4" />
                <span>聚合汇总</span>
              </div>
              <p className="text-[10px] opacity-80">
                按规则汇总数据生成文档
              </p>
            </button>
          </div>
        </div>

        {/* 聚合配置（仅在聚合模式显示） */}
        {generationMode === 'aggregate' && (
          <div className="pt-3 border-t border-teal-200">
            <p className="text-xs font-medium text-slate-700 mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              聚合规则 ({aggregateConfig.rules?.length || 0})
            </p>
            <div className="bg-white rounded-lg p-2.5 border border-slate-200 max-h-32 overflow-y-auto">
              {aggregateConfig.rules && aggregateConfig.rules.length > 0 ? (
                <div className="space-y-1">
                  {aggregateConfig.rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-slate-50 px-2 py-1.5 rounded flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-700">{rule.field}</span>
                      <span className="text-purple-600 font-medium">
                        {rule.operation}
                        {rule.alias && ` → ${rule.alias}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">
                  暂无聚合规则，将使用默认配置
                </p>
              )}
            </div>
          </div>
        )}

        {/* 预计生成数量 */}
        {generationMode === 'individual' && mappingScheme.primarySheet && (
          <div className="pt-3 border-t border-teal-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">使用主数据表</span>
              <span className="font-medium text-slate-800">
                {mappingScheme.primarySheet}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 生成进度 */}
      {isGenerating && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm font-medium text-blue-700">
                {getStageText()}
              </span>
            </div>
            <span className="text-sm font-bold text-blue-700">{progress}%</span>
          </div>
          {/* 进度条 */}
          <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        className={`
          w-full py-3 rounded-lg font-medium transition-all duration-200
          flex items-center justify-center gap-2 shadow-md
          ${canGenerate && !isGenerating
            ? generationMode === 'aggregate'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:shadow-lg'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }
        `}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            生成中... ({progress}%)
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            {generationMode === 'aggregate' ? '生成汇总文档' : '生成Word文档'}
          </>
        )}
      </button>

      {/* 提示信息 */}
      {!canGenerate && !isGenerating && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
          <span>请先生成映射方案</span>
        </div>
      )}
    </div>
  );
};

export default DocumentGenerator;
