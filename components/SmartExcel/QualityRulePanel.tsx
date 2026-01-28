/**
 * 质量规则管理面板
 * 展示、启用、禁用、创建、编辑、删除规则
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Star,
  Clock
} from 'lucide-react';
import { QualityRule, RuleFilter, RuleSeverity } from '../../types/qualityRule';
import { qualityRuleStorage } from '../../services/qualityRuleStorage';
import { RuleCreator } from './RuleCreator';

interface QualityRulePanelProps {
  onRulesChange?: (rules: QualityRule[]) => void;
  onExecuteRules?: (rules: QualityRule[]) => void;
  executing?: boolean;
}

export const QualityRulePanel: React.FC<QualityRulePanelProps> = ({
  onRulesChange,
  onExecuteRules,
  executing = false
}) => {
  const [rules, setRules] = useState<QualityRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<QualityRule[]>([]);
  const [filter, setFilter] = useState<RuleFilter>({});
  const [showCreator, setShowCreator] = useState(false);
  const [editingRule, setEditingRule] = useState<QualityRule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<RuleSeverity | ''>('');

  // 加载规则
  useEffect(() => {
    loadRules();
  }, []);

  // 应用筛选
  useEffect(() => {
    applyFilters();
  }, [rules, filter, searchTerm, selectedCategory, selectedSeverity]);

  const loadRules = async () => {
    const loadedRules = await qualityRuleStorage.listRules();
    setRules(loadedRules);
    onRulesChange?.(loadedRules);
  };

  const applyFilters = () => {
    let filtered = [...rules];

    // 搜索
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term)
      );
    }

    // 分类
    if (selectedCategory) {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    // 严重级别
    if (selectedSeverity) {
      filtered = filtered.filter(r => r.severity === selectedSeverity);
    }

    // 启用状态
    if (filter.isEnabled !== undefined) {
      filtered = filtered.filter(r => r.isEnabled === filter.isEnabled);
    }

    // 官方规则
    if (filter.isOfficial !== undefined) {
      filtered = filtered.filter(r => r.isOfficial === filter.isOfficial);
    }

    setFilteredRules(filtered);
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      await qualityRuleStorage.toggleRule(ruleId);
      await loadRules();
    } catch (error) {
      console.error('切换规则失败:', error);
      alert(`切换规则失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('确定要删除这个规则吗？')) return;

    try {
      await qualityRuleStorage.deleteRule(ruleId);
      await loadRules();
    } catch (error) {
      console.error('删除规则失败:', error);
      alert(`删除规则失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleEditRule = (rule: QualityRule) => {
    setEditingRule(rule);
    setShowCreator(true);
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      await qualityRuleStorage.createFromTemplate(templateId, {});
      await loadRules();
    } catch (error) {
      console.error('从模板创建失败:', error);
    }
  };

  const getSeverityColor = (severity: RuleSeverity): string => {
    switch (severity) {
      case 'P0': return 'text-red-600 bg-red-50 border-red-200';
      case 'P1': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'P2': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'P3': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getExecutionTypeLabel = (type: string): string => {
    switch (type) {
      case 'local': return '本地';
      case 'ai': return 'AI';
      case 'hybrid': return '混合';
      default: return type;
    }
  };

  const categories = Array.from(new Set(rules.map(r => r.category)));
  const enabledCount = filteredRules.filter(r => r.isEnabled).length;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-800">质量规则</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">
              已启用 {enabledCount} / {filteredRules.length}
            </span>
            <button
              onClick={() => {
                setEditingRule(null);
                setShowCreator(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建规则
            </button>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索规则..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">所有分类</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as RuleSeverity | '')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">所有级别</option>
            <option value="P0">P0 - 阻塞</option>
            <option value="P1">P1 - 严重</option>
            <option value="P2">P2 - 一般</option>
            <option value="P3">P3 - 提示</option>
          </select>
        </div>

        {/* 快速筛选 */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilter({ ...filter, isEnabled: true })}
            className={`px-2 py-1 rounded ${
              filter.isEnabled === true ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            已启用
          </button>
          <button
            onClick={() => setFilter({ ...filter, isOfficial: true })}
            className={`px-2 py-1 rounded ${
              filter.isOfficial === true ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            官方模板
          </button>
          <button
            onClick={() => setFilter({})}
            className={`px-2 py-1 rounded ${
              Object.keys(filter).length === 0 ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            全部
          </button>
        </div>
      </div>

      {/* 规则列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredRules.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p>没有找到规则</p>
            <p className="text-xs mt-1">点击"新建规则"创建第一个规则</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRules.map(rule => (
              <div
                key={rule.id}
                className={`p-3 rounded-lg border transition-all ${
                  rule.isEnabled
                    ? 'bg-white border-slate-200 hover:border-emerald-300'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* 启用开关 */}
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      disabled={executing}
                      className="mt-1"
                    >
                      {rule.isEnabled ? (
                        <ToggleRight className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    {/* 规则信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-semibold text-sm ${rule.isEnabled ? 'text-slate-800' : 'text-slate-500'}`}>
                          {rule.name}
                        </h4>
                        {rule.isOfficial && (
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(rule.severity)}`}>
                          {rule.severity}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                          {getExecutionTypeLabel(rule.executionType)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mb-1">{rule.description}</p>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{rule.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          使用 {rule.usageCount} 次
                        </span>
                        <span>•</span>
                        <span>{rule.targetColumns.length > 0 ? rule.targetColumns.join(', ') : '自动检测'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1">
                    {!rule.isOfficial && (
                      <>
                        <button
                          onClick={() => handleEditRule(rule)}
                          disabled={executing || rule.isEnabled}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          disabled={executing || rule.isEnabled}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部操作 */}
      {enabledCount > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => onExecuteRules?.(filteredRules.filter(r => r.isEnabled))}
            disabled={executing}
            className={`
              w-full py-2.5 rounded-lg font-medium text-white transition-all
              flex items-center justify-center gap-2
              ${executing
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-blue-900/20'
              }
            `}
          >
            {executing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                执行中...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                执行检查 ({enabledCount} 条规则)
              </>
            )}
          </button>
        </div>
      )}

      {/* 规则创建器 */}
      {showCreator && (
        <RuleCreator
          rule={editingRule}
          onClose={() => {
            setShowCreator(false);
            setEditingRule(null);
          }}
          onSave={async () => {
            await loadRules();
            setShowCreator(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
};

export default QualityRulePanel;
