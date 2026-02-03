/**
 * 映射编辑器组件
 *
 * 功能：
 * - 显示映射方案
 * - 可视化映射关系
 * - 支持手动编辑映射
 * - 显示筛选条件
 *
 * @version 2.0.0
 */

import React, { useState } from 'react';
import {
  GitBranch,
  ArrowRight,
  Edit3,
  Check,
  X,
  Plus,
  Trash2,
  Code,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye
} from 'lucide-react';
import { MappingScheme } from '../../types/documentTypes';

interface MappingEditorProps {
  mappingScheme: MappingScheme;
  templatePlaceholders: string[];
  excelHeaders: string[];
  onMappingChange: (mapping: MappingScheme) => void;
}

const MappingEditor: React.FC<MappingEditorProps> = ({
  mappingScheme,
  templatePlaceholders,
  excelHeaders,
  onMappingChange
}) => {

  const [isEditing, setIsEditing] = useState(false);
  const [editedMapping, setEditedMapping] = useState<MappingScheme>(mappingScheme);

  // 临时：为了演示AI规则，初始化时如果没数据，就造一个AI规则的假数据
  React.useEffect(() => {
    if (mappingScheme.mappings.length > 0 && !mappingScheme.mappings.some(m => m.ruleType === 'ai')) {
      // 仅用于演示：将最后一个映射改为 AI 规则（如果存在）
      // 实际生产中这里应该是真实的后端数据
      // 这里不做自动篡改，只在渲染层处理 demo 效果，或者手动添加
    }
  }, [mappingScheme]);

  // 监听外部属性变化，同步到内部状态
  React.useEffect(() => {
    setEditedMapping(mappingScheme);
  }, [mappingScheme]);

  // 辅助函数：根据当前的映射列表，重新计算完整状态（包括未映射字段）
  const updateStateWithMappings = (newMappings: import('../../types/documentTypes').FieldMapping[]) => {
    // 计算未映射的字段
    const newUnmapped = templatePlaceholders.filter(
      p => !newMappings.some(m => m.placeholder === p)
    );

    setEditedMapping({
      ...editedMapping,
      mappings: newMappings,
      unmappedPlaceholders: newUnmapped
    });
  };

  // 保存编辑
  const handleSave = () => {
    onMappingChange(editedMapping);
    setIsEditing(false);
  };

  // 取消编辑
  const handleCancel = () => {
    setEditedMapping(mappingScheme); // 恢复到原始 props
    setIsEditing(false);
  };

  // 添加新映射
  const addMapping = () => {
    // 优先尝试找未映射的字段
    let placeholderToAdd = templatePlaceholders.find(
      p => !editedMapping.mappings.some(m => m.placeholder === p)
    );

    // 如果都映射了，就默认用第一个，或者空字符串
    if (!placeholderToAdd) {
      placeholderToAdd = templatePlaceholders[0] || '';
    }

    const newMappings = [
      ...editedMapping.mappings,
      {
        placeholder: placeholderToAdd,
        excelColumn: excelHeaders[0] || '',
        ruleType: 'direct' as const // 默认为直接映射
      }
    ];

    updateStateWithMappings(newMappings);
  };

  // 删除映射
  const removeMapping = (index: number) => {
    const newMappings = editedMapping.mappings.filter((_, i) => i !== index);
    updateStateWithMappings(newMappings);
  };

  // 更新映射
  const updateMapping = (index: number, field: keyof import('../../types/documentTypes').FieldMapping, value: string) => {
    const newMappings = [...editedMapping.mappings];
    newMappings[index] = {
      ...newMappings[index],
      [field]: value
    };

    // 简单的类型自动推断
    if (field === 'transform') {
      if (value.trim().startsWith('// AI')) {
        newMappings[index].ruleType = 'ai';
      } else if (value.trim()) {
        newMappings[index].ruleType = 'script';
      } else {
        newMappings[index].ruleType = 'direct';
      }
    }

    // 如果修改的是 placeholder，可能会影响未映射列表，所以也需要重算
    updateStateWithMappings(newMappings);
  };

  // 映射完成度
  const mappingProgress = {
    mapped: mappingScheme.mappings.length,
    total: templatePlaceholders.length,
    percentage: Math.round((mappingScheme.mappings.length / templatePlaceholders.length) * 100)
  };

  // 渲染规则内容
  const renderRuleContent = (mapping: import('../../types/documentTypes').FieldMapping) => {
    // 模拟或者根据 ruleType 判断
    // 如果 transform 内容以 "// AI" 开头，或者 ruleType 为 ai，则显示 AI 样式
    const isAI = mapping.ruleType === 'ai' || (mapping.transform && mapping.transform.startsWith('// AI'));

    if (isAI) {
      return (
        <div className="flex items-center gap-2 text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded border border-purple-100 w-full">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
          <span className="font-semibold flex-shrink-0">AI 规则:</span>
          <span className="truncate italic opacity-90">{mapping.transform?.replace('// AI', '').trim() || '根据上下文智能分析'}</span>
        </div>
      );
    }

    if (mapping.transform) {
      return (
        <div className="truncate text-xs text-slate-500 bg-slate-100 px-2 py-1.5 rounded border border-slate-200 font-mono w-full" title={mapping.transform}>
          {mapping.transform}
        </div>
      );
    }

    return <span className="text-xs text-slate-300 italic pl-1">直接映射</span>;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 h-full">
      {/* 头部信息 - 极简白底风格 */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                <GitBranch className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-lg">字段映射方案</span>
                <span className="text-xs text-slate-500">配置 Excel 列与 Word 占位符的对应关系</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 映射进度 */}
            <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
              <div className="text-right">
                <p className="text-xs text-slate-500">映射完成度</p>
                <p className="text-sm font-bold text-slate-700">
                  <span className="text-emerald-600">{mappingProgress.mapped}</span>
                  <span className="text-slate-400 mx-1">/</span>
                  {mappingProgress.total}
                </p>
              </div>
              <div className="w-24 bg-slate-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${mappingProgress.percentage}%` }}
                />
              </div>
            </div>

            {/* 操作按钮区 */}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm flex items-center gap-2 group"
              >
                <Edit3 className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                编辑映射
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-sm shadow-emerald-200"
                >
                  <Check className="w-4 h-4" />
                  保存更改
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 主要内容区域 - 移除右侧预览后，占据全宽并居中最大宽度限制 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white max-w-5xl mx-auto w-full shadow-sm border-x border-slate-100 h-full">

          {/* AI说明 */}
          <div className="flex-shrink-0 p-5 border-b border-slate-100 bg-blue-50/30">
            <div className="flex items-start gap-3 text-sm text-blue-800">
              <Info className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-500" />
              <div className="leading-relaxed opacity-90">
                <span className="font-semibold block mb-1">AI 映射分析：</span>
                {mappingScheme.explanation}
              </div>
            </div>
          </div>

          {/* 表头 */}
          <div className="flex-shrink-0 bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="w-[30%]">模板占位符</div>
            <div className="w-8 flex-shrink-0"></div>
            <div className="w-[25%] px-2">Excel 列</div>
            <div className="flex-1 px-4">转换规则 / AI 逻辑</div>
            {isEditing && <div className="w-12 text-right">操作</div>}
          </div>

          {/* 列表内容 (滚动区域) */}
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <div className="space-y-2">
              {(isEditing ? editedMapping.mappings : mappingScheme.mappings).map((mapping, idx) => (
                <div
                  key={idx}
                  className={`group flex items-center px-4 py-3 rounded-lg border transition-all ${isEditing ? 'hover:bg-slate-50 border-slate-200' : 'hover:bg-slate-50 border-transparent hover:border-slate-100'}`}
                >
                  {/* 模板占位符 */}
                  <div className="w-[30%] min-w-0 pr-2">
                    {isEditing ? (
                      <div className="relative">
                        <select
                          value={mapping.placeholder}
                          onChange={(e) => updateMapping(idx, 'placeholder', e.target.value)}
                          className="w-full pl-2 pr-8 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                        >
                          {templatePlaceholders.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2" title={mapping.placeholder}>
                        <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"></div>
                        <code className="text-sm font-mono text-slate-700 truncate font-medium">{mapping.placeholder}</code>
                      </div>
                    )}
                  </div>

                  {/* 箭头 */}
                  <div className="w-8 flex-shrink-0 flex justify-center">
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                  </div>

                  {/* Excel列 */}
                  <div className="w-[25%] min-w-0 px-2">
                    {isEditing ? (
                      <div className="relative">
                        <select
                          value={mapping.excelColumn}
                          onChange={(e) => updateMapping(idx, 'excelColumn', e.target.value)}
                          className="w-full pl-2 pr-8 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                        >
                          {excelHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2" title={mapping.excelColumn}>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
                        <span className="text-sm font-medium text-slate-700 truncate">{mapping.excelColumn}</span>
                      </div>
                    )}
                  </div>

                  {/* 转换规则 - 增强显示 */}
                  <div className="flex-1 min-w-0 px-4">
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-300"
                        placeholder="输入JS代码或以 // AI 开头输入规则"
                        value={mapping.transform || ''}
                        onChange={(e) => updateMapping(idx, 'transform', e.target.value)}
                      />
                    ) : renderRuleContent(mapping)}
                  </div>

                  {/* 删除按钮 */}
                  {isEditing && (
                    <div className="w-12 flex justify-end">
                      <button
                        onClick={() => removeMapping(idx)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除映射"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* 编辑模式下的添加按钮 */}
              {isEditing && (
                <div className="pt-2 px-1">
                  <button
                    onClick={addMapping}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-sm font-medium hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    添加新映射
                  </button>
                </div>
              )}
            </div>

            {/* 未映射提示区 */}
            {(isEditing ? editedMapping : mappingScheme).unmappedPlaceholders.length > 0 && (
              <div className="mt-8 mx-4 mb-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-amber-600 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  未映射字段 ({(isEditing ? editedMapping : mappingScheme).unmappedPlaceholders.length})
                </div>
                <p className="text-xs text-slate-400 mb-3">以下字段未配置映射，生成文档时可能为空：</p>
                <div className="flex flex-wrap gap-2">
                  {(isEditing ? editedMapping : mappingScheme).unmappedPlaceholders.map((p, idx) => (
                    <span key={idx} className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded-full font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="h-12"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MappingEditor;
