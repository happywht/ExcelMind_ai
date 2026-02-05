/**
 * 规则创建器
 * 引导式创建自定义规则
 */

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { QualityRule, RuleSeverity, ExecutionType, LocalRule } from '../../types/qualityRule';
import { qualityRuleStorage } from '../../services/qualityRuleStorage';

interface RuleCreatorProps {
  rule?: QualityRule | null;
  onClose: () => void;
  onSave: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

export const RuleCreator: React.FC<RuleCreatorProps> = ({
  rule,
  onClose,
  onSave
}) => {
  // 编辑模式从步骤2开始，创建模式从步骤1开始
  const [currentStep, setCurrentStep] = useState<Step>(rule ? 2 : 1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState(false);

  // 规则数据
  const [ruleData, setRuleData] = useState<Partial<QualityRule>>({
    name: '',
    description: '',
    category: '',
    checkContent: '',
    criteria: '',
    severity: 'P1',
    executionType: 'ai',
    targetColumns: [],
    isEnabled: true,
    isOfficial: false,
    localRule: undefined
  });

  // 加载模板
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    loadTemplates();
    if (rule) {
      // 深拷贝rule对象，确保所有字段都被正确复制
      setRuleData({
        ...rule,
        targetColumns: Array.isArray(rule.targetColumns) ? [...rule.targetColumns] : []
      });
      // 编辑模式：确保不使用模板
      setUseTemplate(false);
    }
  }, [rule]);

  const loadTemplates = async () => {
    const templateList = await qualityRuleStorage.getTemplates();
    setTemplates(templateList);
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleSave = async () => {
    try {
      // 编辑模式：保留原有ID和元数据
      if (rule) {
        const updatedRule = {
          ...ruleData,
          id: rule.id, // 保留原ID
          createdAt: rule.createdAt, // 保留创建时间
          updatedAt: new Date().toISOString(), // 更新修改时间
          usageCount: rule.usageCount // 保留使用次数
        };
        await qualityRuleStorage.saveRule(updatedRule as Omit<QualityRule, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>);
      } else if (useTemplate && selectedTemplate) {
        // 从模板创建
        await qualityRuleStorage.createFromTemplate(selectedTemplate, ruleData);
      } else {
        // 全新创建
        await qualityRuleStorage.saveRule(ruleData as Omit<QualityRule, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>);
      }
      onSave();
    } catch (error) {
      console.error('保存规则失败:', error);
      alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // 编辑模式不需要选择模板，可以直接跳过
        if (rule) return true;
        return useTemplate ? selectedTemplate !== null : true;
      case 2:
        return ruleData.name && ruleData.description && ruleData.category;
      case 3:
        // 目标列可以为空（自动检测），所以总是可以继续
        return true;
      case 4:
        return ruleData.checkContent && ruleData.criteria;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const updateRuleData = (field: string, value: any) => {
    setRuleData(prev => ({ ...prev, [field]: value }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">
        {rule ? '编辑规则' : '选择创建方式'}
      </h3>

      {/* 编辑模式：显示当前规则信息 */}
      {rule && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-800 mb-2">
            <Check className="w-4 h-4" />
            <span className="font-semibold">正在编辑规则</span>
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            <div><strong>名称：</strong>{rule.name}</div>
            <div><strong>分类：</strong>{rule.category}</div>
            <div><strong>描述：</strong>{rule.description}</div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            点击"下一步"可修改规则的所有内容
          </p>
        </div>
      )}

      {/* 只在创建模式显示选择按钮 */}
      {!rule && (
        <>
          <div className="space-y-3">
            <button
              onClick={() => {
                setUseTemplate(true);
                setSelectedTemplate(templates[0]?.id || null);
              }}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                useTemplate ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800">从模板创建</span>
                {useTemplate && <Check className="w-5 h-5 text-emerald-600" />}
              </div>
              <p className="text-sm text-slate-600">基于官方模板快速创建规则，然后自定义修改</p>
            </button>

            <button
              onClick={() => setUseTemplate(false)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                !useTemplate ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800">自定义创建</span>
                {!useTemplate && <Check className="w-5 h-5 text-blue-600" />}
              </div>
              <p className="text-sm text-slate-600">完全自定义规则，适用于特殊业务需求</p>
            </button>
          </div>

          {useTemplate && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                选择模板
              </label>
              <select
                value={selectedTemplate || ''}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">请选择模板...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">基本信息</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          规则名称 *
        </label>
        <input
          type="text"
          value={ruleData.name || ''}
          onChange={(e) => updateRuleData('name', e.target.value)}
          placeholder="例如：邮箱格式检查"
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          规则描述 *
        </label>
        <textarea
          value={ruleData.description || ''}
          onChange={(e) => updateRuleData('description', e.target.value)}
          placeholder="简要描述这个规则的作用..."
          rows={3}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          规则分类 *
        </label>
        <select
          value={ruleData.category || ''}
          onChange={(e) => updateRuleData('category', e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          <option value="">请选择分类...</option>
          <option value="格式检查">格式检查</option>
          <option value="完整性检查">完整性检查</option>
          <option value="一致性检查">一致性检查</option>
          <option value="合理性检查">合理性检查</option>
          <option value="唯一性检查">唯一性检查</option>
          <option value="业务规则">业务规则</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          严重级别
        </label>
        <div className="flex gap-2">
          {(['P0', 'P1', 'P2', 'P3'] as RuleSeverity[]).map(severity => (
            <button
              key={severity}
              onClick={() => updateRuleData('severity', severity)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                ruleData.severity === severity
                  ? severity === 'P0' ? 'bg-red-100 text-red-700 border-2 border-red-300'
                  : severity === 'P1' ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                  : severity === 'P2' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                  : 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:border-slate-300'
              }`}
            >
              {severity}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {ruleData.severity === 'P0' && '阻塞问题：必须修复'}
          {ruleData.severity === 'P1' && '严重问题：应该修复'}
          {ruleData.severity === 'P2' && '一般问题：建议修复'}
          {ruleData.severity === 'P3' && '提示性问题：可选修复'}
        </p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">选择目标列</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          目标列名（用逗号分隔）
        </label>
        <textarea
          value={ruleData.targetColumns?.join(', ') || ''}
          onChange={(e) => updateRuleData('targetColumns', e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean))}
          placeholder="例如：邮箱, 手机号, 联系电话"
          rows={3}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
        />
        <p className="text-xs text-slate-500 mt-1">
          如果留空，系统将自动检测包含关键字的列
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          执行方式
        </label>
        <div className="space-y-2">
          <button
            onClick={() => updateRuleData('executionType', 'local')}
            className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
              ruleData.executionType === 'local'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="font-semibold text-slate-800 mb-1">本地执行</div>
            <div className="text-sm text-slate-600">快速、免费，适合标准化检查</div>
          </button>

          <button
            onClick={() => updateRuleData('executionType', 'ai')}
            className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
              ruleData.executionType === 'ai'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-blue-300'
            }`}
          >
            <div className="font-semibold text-slate-800 mb-1">AI执行</div>
            <div className="text-sm text-slate-600">灵活、有成本，适合复杂业务逻辑</div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">定义规则内容</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          检查内容 *
        </label>
        <textarea
          value={ruleData.checkContent || ''}
          onChange={(e) => updateRuleData('checkContent', e.target.value)}
          placeholder="例如：检查所有包含'邮箱'的列"
          rows={3}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
        />
        <p className="text-xs text-slate-500 mt-1">
          用自然语言描述要检查什么
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          评判标准 *
        </label>
        <textarea
          value={ruleData.criteria || ''}
          onChange={(e) => updateRuleData('criteria', e.target.value)}
          placeholder="例如：必须包含@符号，且@后必须有域名"
          rows={3}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
        />
        <p className="text-xs text-slate-500 mt-1">
          用自然语言描述什么样的数据是合格的
        </p>
      </div>

      {ruleData.executionType === 'local' && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-medium text-blue-800 mb-1">
            本地执行需要配置
          </div>
          <p className="text-xs text-blue-600">
            本地执行需要在下一步中配置具体的检查逻辑（正则表达式、范围等）
          </p>
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">确认并测试</h3>

      <div className="p-4 bg-slate-50 rounded-lg space-y-3">
        <div>
          <span className="text-sm font-medium text-slate-600">规则名称：</span>
          <span className="text-sm text-slate-800 ml-2">{ruleData.name}</span>
        </div>
        <div>
          <span className="text-sm font-medium text-slate-600">分类：</span>
          <span className="text-sm text-slate-800 ml-2">{ruleData.category}</span>
        </div>
        <div>
          <span className="text-sm font-medium text-slate-600">严重级别：</span>
          <span className={`text-sm ml-2 px-2 py-0.5 rounded ${
            ruleData.severity === 'P0' ? 'bg-red-100 text-red-700' :
            ruleData.severity === 'P1' ? 'bg-orange-100 text-orange-700' :
            ruleData.severity === 'P2' ? 'bg-yellow-100 text-yellow-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {ruleData.severity}
          </span>
        </div>
        <div>
          <span className="text-sm font-medium text-slate-600">执行方式：</span>
          <span className="text-sm text-slate-800 ml-2">
            {ruleData.executionType === 'local' ? '本地执行' : 'AI执行'}
          </span>
        </div>
        <div>
          <span className="text-sm font-medium text-slate-600">目标列：</span>
          <span className="text-sm text-slate-800 ml-2">
            {ruleData.targetColumns?.length ? ruleData.targetColumns.join(', ') : '自动检测'}
          </span>
        </div>
        <div>
          <span className="text-sm font-medium text-slate-600">检查内容：</span>
          <p className="text-sm text-slate-800 mt-1">{ruleData.checkContent}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-slate-600">评判标准：</span>
          <p className="text-sm text-slate-800 mt-1">{ruleData.criteria}</p>
        </div>
      </div>

      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="flex items-center gap-2 text-emerald-800 mb-1">
          <Check className="w-4 h-4" />
          <span className="font-semibold">准备就绪</span>
        </div>
        <p className="text-sm text-emerald-700">
          点击"完成"创建规则，创建后可以在规则列表中启用并执行
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {rule ? '编辑规则' : '创建新规则'}
            </h2>
            {rule && (
              <p className="text-xs text-slate-500 mt-1">
                正在编辑：{rule.name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 进度指示 */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <React.Fragment key={step}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm transition-all ${
                  step === currentStep
                    ? 'bg-emerald-600 text-white'
                    : step < currentStep
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {step < currentStep ? <Check className="w-4 h-4" /> : step}
                </div>
                {step < 5 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    step < currentStep ? 'bg-emerald-600' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-600">
            <span>方式</span>
            <span>基本信息</span>
            <span>目标列</span>
            <span>规则内容</span>
            <span>确认</span>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            上一步
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>

            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                <Check className="w-4 h-4" />
                完成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleCreator;
