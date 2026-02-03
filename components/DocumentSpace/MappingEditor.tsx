/**
 * 映射编辑器组件
 *
 * 功能：
 * - 显示映射方案
 * - 可视化映射关系
 * - 支持手动编辑映射
 * - 显示筛选条件
 * - 支持 AI 规则试运行与调试
 *
 * @version 2.1.0
 */

import React, { useState } from 'react';
import { aiProcessingService, AIProcessResult } from '../../services/aiProcessingService';
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
  Eye,
  Minimize2,
  Maximize2,
  Play,
  Loader2,
  Table
} from 'lucide-react';
import { MappingScheme } from '../../types/documentTypes';

interface MappingEditorProps {
  mappingScheme: MappingScheme;
  templatePlaceholders: string[];
  excelHeaders: string[]; // This is actually just for the primary sheet
  sampleData?: Record<string, any>; // 第一行数据，用于试运行
  onMappingChange: (mapping: MappingScheme) => void;
  allSheetsHeaders?: Record<string, string[]>; // Optional for backward compatibility, but required for cross-sheet
}

const MappingEditor: React.FC<MappingEditorProps> = ({
  mappingScheme,
  templatePlaceholders,
  excelHeaders,
  sampleData,
  onMappingChange,
  allSheetsHeaders = {}
}) => {

  const [isEditing, setIsEditing] = useState(false);
  const [editedMapping, setEditedMapping] = useState<MappingScheme>(mappingScheme);
  const [isFullScreen, setIsFullScreen] = useState(false); // 全屏状态

  // AI 测试状态
  const [testingIndex, setTestingIndex] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, AIProcessResult | null>>({});

  // 临时：为了演示AI规则，初始化时如果没数据，就造一个AI规则的假数据
  React.useEffect(() => {
    if (mappingScheme.mappings.length > 0 && !mappingScheme.mappings.some(m => m.ruleType === 'ai')) {
      // 仅用于演示：将最后一个映射改为 AI 规则（如果存在）
    }
  }, [mappingScheme]);

  // 监听外部属性变化，同步到内部状态
  React.useEffect(() => {
    setEditedMapping(mappingScheme);
  }, [mappingScheme]);

  // 辅助函数：根据当前的映射列表，重新计算完整状态（包括未映射字段）
  const updateStateWithMappings = (
    newMappings: import('../../types/documentTypes').FieldMapping[],
    newCrossMappings?: import('../../types/documentTypes').CrossSheetMapping[]
  ) => {
    const currentCross = newCrossMappings || editedMapping.crossSheetMappings || [];

    // 计算未映射的字段
    // A placeholder is unmapped if it is NOT in newMappings AND NOT in currentCross
    const newUnmapped = templatePlaceholders.filter(
      p => !newMappings.some(m => m.placeholder === p) &&
        !currentCross.some(cm => cm.placeholder === p)
    );

    setEditedMapping({
      ...editedMapping,
      mappings: newMappings,
      crossSheetMappings: currentCross,
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
      p => !editedMapping.mappings.some(m => m.placeholder === p) &&
        !(editedMapping.crossSheetMappings || []).some(cm => cm.placeholder === p)
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

  // ===== Cross-Sheet Handlers =====

  const addCrossMapping = () => {
    // Determine available sheets (exclude primary)
    // Note: mappingScheme.primarySheet might be undefined initially, use excelHeaders/keys if needed?
    // But realistically we need the list of sheet names from allSheetsHeaders keys.
    const availableSheets = Object.keys(allSheetsHeaders || {}).filter(s => s !== mappingScheme.primarySheet);
    const defaultSheet = availableSheets[0] || '';
    const defaultHeaders = allSheetsHeaders[defaultSheet] || [];

    let placeholderToAdd = templatePlaceholders.find(
      p => !editedMapping.mappings.some(m => m.placeholder === p) &&
        !(editedMapping.crossSheetMappings || []).some(cm => cm.placeholder === p)
    );
    if (!placeholderToAdd) placeholderToAdd = templatePlaceholders[0] || '';

    const newCross = [
      ...(editedMapping.crossSheetMappings || []),
      {
        placeholder: placeholderToAdd,
        sourceSheet: defaultSheet,
        lookupKey: excelHeaders[0] || '', // Key in Primary Sheet (Foreign Key)
        sourceColumn: defaultHeaders[0] || '', // Target Value in Source Sheet
        relationshipType: 'one_to_one' as const // Default
      }
    ];

    updateStateWithMappings(editedMapping.mappings, newCross);
  };

  const removeCrossMapping = (index: number) => {
    const newCross = (editedMapping.crossSheetMappings || []).filter((_, i) => i !== index);
    updateStateWithMappings(editedMapping.mappings, newCross);
  };

  const updateCrossMapping = (index: number, field: keyof import('../../types/documentTypes').CrossSheetMapping, value: string) => {
    const newCross = [...(editedMapping.crossSheetMappings || [])];
    const currentItem = newCross[index];

    // If source sheet changes, reset source column
    if (field === 'sourceSheet') {
      const newHeaders = allSheetsHeaders[value] || [];
      newCross[index] = {
        ...currentItem,
        sourceSheet: value,
        sourceColumn: newHeaders[0] || ''
      };
    } else {
      newCross[index] = {
        ...currentItem,
        [field]: value
      };
    }

    updateStateWithMappings(editedMapping.mappings, newCross);
  };

  // 处理 AI 规则测试
  const handleTestRule = async (index: number, rule: string) => {
    if (!sampleData) {
      alert('需要有Excel数据才能试运行规则');
      return;
    }

    setTestingIndex(index);
    setTestResults(prev => ({ ...prev, [index]: null })); // 清除旧结果

    try {
      const result = await aiProcessingService.processRule(rule, sampleData);
      setTestResults(prev => ({ ...prev, [index]: result }));
    } catch (err) {
      console.error(err);
      setTestResults(prev => ({ ...prev, [index]: { result: '', error: '测试失败, 请重试' } }));
    } finally {
      setTestingIndex(null);
    }
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
    <div className={`flex-1 flex flex-col overflow-hidden bg-slate-50 transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* 头部信息 - 极简白底风格 */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              {/* 全屏切换按钮 - 移到标题左侧或作为独立功能 */}
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title={isFullScreen ? "退出全屏" : "全屏编辑"}
              >
                {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>

              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                <GitBranch className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-lg">字段映射方案</span>
                <span className="text-xs text-slate-500">配置 Excel 列与 Word 占位符的对应关系</span>
              </div>
              {/* Dry Run 提示 */}
              {sampleData && (
                <div className="ml-4 px-3 py-1 bg-purple-50 text-purple-600 text-xs rounded-full flex items-center gap-1 border border-purple-100">
                  <Play className="w-3 h-3" />
                  AI 试运行已就绪 (数据源: Excel 第1行)
                </div>
              )}
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
            {/* 映射列表容器 */}
            <div className="space-y-6">

              {/* === 主表映射区域 === */}
              <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-sm font-bold text-slate-700">主表映射 (Primary Sheet)</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Current Sheet</span>
                </div>

                <div className="space-y-2">
                  {(isEditing ? editedMapping.mappings : mappingScheme.mappings).map((mapping, idx) => (
                    <div
                      key={`main-${idx}`}
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
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                className={`flex-1 px-3 py-2 border rounded text-xs font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-300 ${mapping.transform?.startsWith('// AI') ? 'border-purple-300 bg-purple-50/50 text-purple-800' : 'border-slate-200'}`}
                                placeholder="输入JS代码或以 // AI 开头输入规则"
                                value={mapping.transform || ''}
                                onChange={(e) => updateMapping(idx, 'transform', e.target.value)}
                              />

                              {/* AI 试运行按钮 */}
                              {mapping.transform?.trim().startsWith('// AI') && (
                                <button
                                  onClick={() => handleTestRule(idx, mapping.transform!)}
                                  disabled={testingIndex === idx}
                                  className="p-2 text-purple-600 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50"
                                  title="试运行 AI 规则 (使用第一行数据)"
                                >
                                  {testingIndex === idx ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-current" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* 测试结果展示 */}
                            {testResults[idx] && (
                              <div className={`text-xs p-2 rounded border ${testResults[idx]?.error ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                <span className="font-bold mr-1">
                                  {testResults[idx]?.error ? 'Error:' : 'Preview:'}
                                </span>
                                {testResults[idx]?.error || testResults[idx]?.result}
                              </div>
                            )}
                          </div>
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
                        添加主表映射
                      </button>
                    </div>
                  )}
                </div>
              </div>


              {/* === 跨表关联区域 === */}
              {/* 仅当存在 cross mappings 或者处于编辑模式时显示 */}
              {((isEditing ? editedMapping.crossSheetMappings : mappingScheme.crossSheetMappings)?.length > 0 || isEditing) && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                    <h3 className="text-sm font-bold text-slate-700">跨表关联 (Cross-Sheet VLOOKUP)</h3>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Foreign Keys</span>
                  </div>

                  <div className="space-y-2">
                    {/* Header for Cross Sheet Table (Simplified) */}
                    {((isEditing ? editedMapping.crossSheetMappings : mappingScheme.crossSheetMappings) || []).map((crossMap, idx) => (
                      <div key={`cross-${idx}`} className={`group flex items-start flex-col sm:flex-row sm:items-center px-4 py-3 rounded-lg border bg-purple-50/30 ${isEditing ? 'border-purple-200' : 'border-transparent'}`}>

                        {/* 1. Target Placeholder */}
                        <div className="w-full sm:w-[25%] pr-2 mb-2 sm:mb-0">
                          {isEditing ? (
                            <select
                              value={crossMap.placeholder}
                              onChange={(e) => updateCrossMapping(idx, 'placeholder', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white focus:border-purple-500"
                            >
                              {templatePlaceholders.map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                              <code className="text-sm font-medium text-slate-700 truncate">{crossMap.placeholder}</code>
                            </div>
                          )}
                        </div>

                        <div className="hidden sm:block w-6 text-center text-slate-300">←</div>

                        {/* 2. Source Sheet + Column */}
                        <div className="flex-1 flex gap-2 w-full">
                          {isEditing ? (
                            <>
                              {/* Source Sheet Selector */}
                              <select
                                value={crossMap.sourceSheet}
                                onChange={(e) => updateCrossMapping(idx, 'sourceSheet', e.target.value)}
                                className="w-1/3 px-2 py-1.5 border border-slate-200 rounded text-xs bg-white focus:border-purple-500"
                                title="Source Sheet"
                              >
                                {Object.keys(allSheetsHeaders || {}).filter(s => s !== (isEditing ? editedMapping.primarySheet : mappingScheme.primarySheet)).map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>

                              <span className="text-slate-400 py-1">.</span>

                              {/* Source Column Selector */}
                              <select
                                value={crossMap.sourceColumn}
                                onChange={(e) => updateCrossMapping(idx, 'sourceColumn', e.target.value)}
                                className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs bg-white focus:border-purple-500"
                                title="Target Value Column"
                              >
                                {(allSheetsHeaders?.[crossMap.sourceSheet] || []).map(col => (
                                  <option key={col} value={col}>{col}</option>
                                ))}
                              </select>
                            </>
                          ) : (
                            <div className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-purple-100">
                              <Table className="w-3 h-3 text-purple-500" />
                              <span className="font-bold text-slate-700">{crossMap.sourceSheet}</span>
                              <span className="text-slate-400">.</span>
                              <span className="text-purple-700">{crossMap.sourceColumn}</span>
                            </div>
                          )}
                        </div>

                        {/* 3. Lookup Key (ON ...) */}
                        <div className="mt-2 sm:mt-0 sm:ml-4 w-full sm:w-[30%] flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono">ON:</span>
                          {isEditing ? (
                            <div className="flex-1 flex gap-1 items-center">
                              {/* Key in Primary Sheet */}
                              <select
                                value={crossMap.lookupKey}
                                onChange={(e) => updateCrossMapping(idx, 'lookupKey', e.target.value)}
                                className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs bg-white focus:border-purple-500"
                                title="Foreign Key in Primary Sheet"
                              >
                                {excelHeaders.map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                              <span className="text-slate-300">=</span>
                              {/* Key in Source Sheet - Simplified: Assume same name or Primary Key */}
                              {/* For now, VLOOKUP logic usually implies looking up the Value in Key Column? */}
                              {/* Let's simplify: Lookup 'lookupKey' value (from Primary) inside generic First Column of Source? */}
                              {/* Actually crossSheetMappings definition says: lookupKey needs to match. */}
                              {/* Typically: PrimarySheet[LookupKey] == SourceSheet[LookupKey] */}
                              {/* So we display it as a join condition */}
                              <div className="text-xs text-slate-500 truncate" title="Assumes same column name in source sheet">
                                {crossMap.lookupKey}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              <span>Key:</span>
                              <span className="font-mono font-bold">{crossMap.lookupKey}</span>
                            </div>
                          )}
                        </div>

                        {/* 4. Actions */}
                        {isEditing && (
                          <div className="hidden sm:flex w-8 justify-end ml-2">
                            <button
                              onClick={() => removeCrossMapping(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Button */}
                    {isEditing && (
                      <div className="pt-2 px-1">
                        <button
                          onClick={addCrossMapping}
                          className="w-full py-2 border-2 border-dashed border-purple-200 rounded-lg text-purple-600/70 text-xs font-bold hover:border-purple-400 hover:text-purple-700 hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3 h-3" />
                          添加跨表关联
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 未映射提示区 (保持原位) */}

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
