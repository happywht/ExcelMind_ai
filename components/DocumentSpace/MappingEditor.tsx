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
  Table,
  Ghost, // Virtual Column Icon
  ChevronDown,
  ChevronRight,
  List,
  Wand2
} from 'lucide-react';
import { MappingScheme, VirtualColumn } from '../../types/documentTypes';

import { FormatterService } from '../../services/formatterService';

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

  // Phase 3: Virtual Columns State
  const [showVirtualModal, setShowVirtualModal] = useState(false);
  const [newVirtualCol, setNewVirtualCol] = useState<Partial<VirtualColumn>>({
    type: 'const',
    value: ''
  });

  // Phase 4: Auto Config State
  const [isAutoConfiguring, setIsAutoConfiguring] = useState(false);

  // Virtual Column Helpers
  const addVirtualColumn = () => {
    if (!newVirtualCol.name || !newVirtualCol.value) {
      alert('请填写名称和值');
      return;
    }

    const virtualCol: VirtualColumn = {
      id: `vc_${Date.now()}`,
      name: `[虚拟] ${newVirtualCol.name}`, // Add prefix to distinguish
      type: newVirtualCol.type as any || 'const',
      value: newVirtualCol.value || ''
    };

    const currentVirtual = editedMapping.virtualColumns || [];
    const newVirtual = [...currentVirtual, virtualCol];

    setEditedMapping({
      ...editedMapping,
      virtualColumns: newVirtual
    });

    // Reset form
    setNewVirtualCol({ type: 'const', value: '' });
    setShowVirtualModal(false);
  };

  const removeVirtualColumn = (id: string) => {
    const currentVirtual = editedMapping.virtualColumns || [];
    const newVirtual = currentVirtual.filter(v => v.id !== id);
    setEditedMapping({
      ...editedMapping,
      virtualColumns: newVirtual
    });
  };

  // Get combined source columns
  const virtualColumns = editedMapping.virtualColumns || [];


  // AI 测试状态
  const [testingIndex, setTestingIndex] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, AIProcessResult | null>>({});

  // Phase 2: Smart Suggestions State
  const [suggestions, setSuggestions] = useState<Record<number, string>>({});

  // Effect: Analyze columns for smart suggestions
  React.useEffect(() => {
    const analyzeMappings = async () => {
      // 检查 sampleData 是否存在（它是单个对象，不是数组）
      if (!sampleData) return;

      const newSuggestions: Record<number, string> = {};

      // 使用 Promise.all 并行分析
      await Promise.all(mappingScheme.mappings.map(async (mapping, idx) => {
        if (mapping.transform && mapping.transform.length > 20) return;

        const col = mapping.excelColumn;
        const val = sampleData[col];
        if (val !== undefined && val !== null) {
          const analysis = await aiProcessingService.analyzeColumnContent(col, [val]);
          if (analysis.suggestedFormatter) {
            newSuggestions[idx] = analysis.suggestedFormatter;
          }
        }
      }));

      setSuggestions(newSuggestions);
    };

    analyzeMappings();
  }, [mappingScheme, sampleData]);



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
    newCrossMappings?: import('../../types/documentTypes').CrossSheetMapping[],
    newLoopMappings?: import('../../types/documentTypes').LoopMapping[]
  ) => {
    const currentCross = newCrossMappings || editedMapping.crossSheetMappings || [];
    const currentLoops = newLoopMappings || editedMapping.loopMappings || [];

    // 计算未映射的字段
    // A placeholder is unmapped if it is NOT in newMappings AND NOT in currentCross AND NOT in currentLoops
    const newUnmapped = templatePlaceholders.filter(
      p => !newMappings.some(m => m.placeholder === p) &&
        !currentCross.some(cm => cm.placeholder === p) &&
        !currentLoops.some(l => l.loopPlaceholder === p || l.mappings.some(m => m.placeholder === p))
    );

    setEditedMapping({
      ...editedMapping,
      mappings: newMappings,
      crossSheetMappings: currentCross,
      loopMappings: currentLoops,
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
  const updateMapping = (index: number, field: keyof import('../../types/documentTypes').FieldMapping, value: any) => {
    const newMappings = [...editedMapping.mappings];
    const currentMapping = { ...newMappings[index], [field]: value };

    // Phase 5: Auto-generate transform if format changes
    if (field === 'format') {
      // Find the formatter definition
      const formatter = FormatterService.getFormatters().find(f => f.id === value);
      if (formatter) {
        currentMapping.transform = formatter.generateCode();
        currentMapping.ruleType = 'script';
      }
    }

    newMappings[index] = currentMapping;

    // 简单的类型自动推断
    if (field === 'transform') {
      if (typeof value === 'string' && value.trim().startsWith('// AI')) {
        newMappings[index].ruleType = 'ai';
      } else if (value && String(value).trim()) {
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

  // ===== Loop Mapping Handlers (Phase 3) =====

  const [expandedLoopIndex, setExpandedLoopIndex] = useState<number | null>(null);

  const addLoopMapping = () => {
    const availableSheets = Object.keys(allSheetsHeaders || {}).filter(s => s !== mappingScheme.primarySheet);
    const defaultSheet = availableSheets[0] || '';

    const newLoop: import('../../types/documentTypes').LoopMapping = {
      id: `loop_${Date.now()}`,
      loopPlaceholder: 'Loop',
      type: 'lookup', // Default to Lookup for backward compatibility
      sourceSheet: defaultSheet,
      foreignKey: excelHeaders[0] || '', // Used as Foreign Key (Lookup) or potentially Group Column? 
      // Ideally separate them. For new loop, we init defaults.
      groupByColumn: excelHeaders[0] || '',
      mappings: []
    };

    const currentLoops = editedMapping.loopMappings || [];
    updateStateWithMappings(editedMapping.mappings, undefined, [...currentLoops, newLoop]);
    setExpandedLoopIndex(currentLoops.length); // Auto expand new one
  };

  const removeLoopMapping = (index: number) => {
    const currentLoops = editedMapping.loopMappings || [];
    const newLoops = currentLoops.filter((_, i) => i !== index);
    updateStateWithMappings(editedMapping.mappings, undefined, newLoops);
    if (expandedLoopIndex === index) setExpandedLoopIndex(null);
  };

  const updateLoopMapping = (index: number, field: keyof import('../../types/documentTypes').LoopMapping, value: string) => {
    const currentLoops = [...(editedMapping.loopMappings || [])];
    currentLoops[index] = {
      ...currentLoops[index],
      [field]: value
    };

    // Auto specific logic when Type changes
    if (field === 'type') {
      // Maybe reset defaults? For now keep it simple.
    }

    updateStateWithMappings(editedMapping.mappings, undefined, currentLoops);
  };

  const addLoopFieldMapping = (loopIndex: number) => {
    const currentLoops = [...(editedMapping.loopMappings || [])];
    const loop = currentLoops[loopIndex];
    const headers = allSheetsHeaders[loop.sourceSheet] || [];

    // Find a placeholder not yet mapped in this loop
    // (We allow reusing placeholders from main list as they might be scoped)

    const newFieldMapping: import('../../types/documentTypes').FieldMapping = {
      placeholder: templatePlaceholders[0] || '',
      excelColumn: headers[0] || '',
      ruleType: 'direct'
    };

    loop.mappings = [...loop.mappings, newFieldMapping];
    currentLoops[loopIndex] = loop;

    updateStateWithMappings(editedMapping.mappings, undefined, currentLoops);
  };

  const updateLoopFieldMapping = (loopIndex: number, mappingIndex: number, field: keyof import('../../types/documentTypes').FieldMapping, value: string) => {
    const currentLoops = [...(editedMapping.loopMappings || [])];
    const loop = currentLoops[loopIndex];
    const newMappings = [...loop.mappings];

    newMappings[mappingIndex] = {
      ...newMappings[mappingIndex],
      [field]: value
    };

    loop.mappings = newMappings;
    currentLoops[loopIndex] = loop;

    updateStateWithMappings(editedMapping.mappings, undefined, currentLoops);
  };

  const removeLoopFieldMapping = (loopIndex: number, mappingIndex: number) => {
    const currentLoops = [...(editedMapping.loopMappings || [])];
    const loop = currentLoops[loopIndex];
    loop.mappings = loop.mappings.filter((_, i) => i !== mappingIndex);
    currentLoops[loopIndex] = loop;

    updateStateWithMappings(editedMapping.mappings, undefined, currentLoops);
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
            <div className="flex gap-2">
              {/* Virtual Columns Manager Trigger */}
              <button
                onClick={() => setShowVirtualModal(true)}
                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all shadow-sm flex items-center gap-2"
                title="管理虚拟列"
              >
                <Ghost className="w-4 h-4" />
                <span className="hidden sm:inline">虚拟列</span>
                {virtualColumns.length > 0 && (
                  <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full font-bold">
                    {virtualColumns.length}
                  </span>
                )}
              </button>

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
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 主要内容区域 - 移除右侧预览后，占据全宽并居中最大宽度限制 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white max-w-5xl mx-auto w-full shadow-sm border-x border-slate-100 h-full relative">

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

          {/* Virtual Columns Modal */}
          {showVirtualModal && (
            <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <Ghost className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-slate-800">虚拟列管理 (Virtual Columns)</h3>
                  </div>
                  <button onClick={() => setShowVirtualModal(false)} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                  {/* Add New Form */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-6">
                    <h4 className="text-xs font-bold text-purple-800 mb-3 uppercase tracking-wider">新建虚拟列</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-purple-700 mb-1">列名称</label>
                        <input
                          type="text"
                          placeholder="例如: 打印时间"
                          className="w-full px-3 py-2 border border-purple-200 rounded text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                          value={newVirtualCol.name || ''}
                          onChange={e => setNewVirtualCol({ ...newVirtualCol, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-purple-700 mb-1">类型</label>
                          <select
                            className="w-full px-3 py-2 border border-purple-200 rounded text-sm focus:border-purple-500"
                            value={newVirtualCol.type}
                            onChange={e => setNewVirtualCol({ ...newVirtualCol, type: e.target.value as any })}
                          >
                            <option value="const">静态文本 (Const)</option>
                            <option value="var">系统变量 (Variable)</option>
                            <option value="ai">AI 生成 (AI)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-purple-700 mb-1">
                            {newVirtualCol.type === 'ai' ? '占位符名称' : '值 / 表达式'}
                          </label>
                          <input
                            type="text"
                            placeholder={newVirtualCol.type === 'ai' ? '例如: 试用期评价' : '输入值...'}
                            className="w-full px-3 py-2 border border-purple-200 rounded text-sm focus:border-purple-500"
                            value={newVirtualCol.value || ''}
                            onChange={e => setNewVirtualCol({ ...newVirtualCol, value: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* AI Prompt Input (Phase 4) */}
                      {newVirtualCol.type === 'ai' && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-purple-700 mb-1 flex items-center justify-between">
                            <span>AI 生成指令 (Prompt)</span>
                            <span className="text-xs text-purple-400 font-normal">可用 {"{{字段名}}"} 引用当前行数据</span>
                          </label>
                          <textarea
                            className="w-full px-3 py-2 border border-purple-200 rounded text-sm focus:border-purple-500 h-20 resize-none"
                            placeholder="例如: 根据 {{入职日期}} 和 {{基本工资}} 生成一段试用期评价，要求语气由正式转为轻松..."
                            value={newVirtualCol.aiPrompt || ''}
                            onChange={e => setNewVirtualCol({ ...newVirtualCol, aiPrompt: e.target.value })}
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-purple-700 mb-1">
                          {newVirtualCol.type === 'const' ? '文本内容' : newVirtualCol.type === 'var' ? '变量名' : 'Prompt'}
                        </label>
                        {newVirtualCol.type === 'var' ? (
                          <select
                            className="w-full px-3 py-2 border border-purple-200 rounded text-sm"
                            value={newVirtualCol.value}
                            onChange={e => setNewVirtualCol({ ...newVirtualCol, value: e.target.value })}
                          >
                            <option value="">请选择...</option>
                            <option value="CurrentDate">当前日期 (YYYY-MM-DD)</option>
                            <option value="CurrentTime">当前时间 (HH:mm:ss)</option>
                            <option value="UUID">唯一ID (UUID)</option>
                            <option value="RowIndex">行号 (Row Index)</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder={newVirtualCol.type === 'ai' ? '例如: 总结备注列的情感' : '例如: 绝密文件'}
                            className="w-full px-3 py-2 border border-purple-200 rounded text-sm"
                            value={newVirtualCol.value || ''}
                            onChange={e => setNewVirtualCol({ ...newVirtualCol, value: e.target.value })}
                          />
                        )}
                      </div>
                    </div>
                    <button
                      onClick={addVirtualColumn}
                      className="w-full py-2 bg-purple-600 text-white rounded font-medium text-sm hover:bg-purple-700 transition"
                    >
                      添加
                    </button>
                  </div>
                </div>

                {/* List Existing */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">已定义虚拟列 ({virtualColumns.length})</h4>
                  {virtualColumns.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                      暂无虚拟列
                    </div>
                  ) : (
                    virtualColumns.map(vc => (
                      <div key={vc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-purple-200 transition">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${vc.type === 'ai' ? 'bg-amber-100 text-amber-600' : vc.type === 'var' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                            {vc.type === 'ai' ? <Code className="w-4 h-4" /> : vc.type === 'var' ? <Code className="w-4 h-4" /> : <div className="font-bold text-xs">TXT</div>}
                          </div>
                          <div>
                            <div className="font-bold text-slate-700 text-sm">{vc.name}</div>
                            <div className="text-xs text-slate-400">
                              <span className="uppercase font-bold mr-1">{vc.type}</span>
                              {vc.value}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeVirtualColumn(vc.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          )
          }

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
                  {((isEditing ? editedMapping.mappings : mappingScheme.mappings) || []).map((mapping, idx) => (
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
                              <optgroup label="Excel Columns">
                                {excelHeaders.map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </optgroup>
                              {virtualColumns.length > 0 && (
                                <optgroup label="Virtual Columns (虚拟列)">
                                  {virtualColumns.map(v => (
                                    <option key={v.id} value={v.name}>{v.name}</option>
                                  ))}
                                </optgroup>
                              )}
                              {/* AI/Flattened Columns (not in headers) */}
                              {mapping.excelColumn &&
                                !excelHeaders.includes(mapping.excelColumn) &&
                                !virtualColumns.some(v => v.name === mapping.excelColumn) && (
                                  <optgroup label="AI Generated / Flattened">
                                    <option value={mapping.excelColumn}>{mapping.excelColumn}</option>
                                  </optgroup>
                                )}
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

                              {/* 格式化器按钮 (New) */}
                              <div className="relative group/formatter">
                                <button
                                  className={`p-2 rounded-lg transition-colors border border-transparent 
                                    ${suggestions[idx]
                                      ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                                      : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                  title={suggestions[idx] ? "智能建议可用" : "内置格式化工具"}
                                >
                                  {suggestions[idx] ? <div className="relative"><Code className="w-4 h-4" /><div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" /></div> : <Code className="w-4 h-4" />}
                                </button>

                                {/* Dropdown Menu (Absolute) */}
                                <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 hidden group-hover/formatter:block">
                                  <div className="p-2">
                                    <div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase tracking-wider flex justify-between">
                                      <span>预置格式化</span>
                                      {suggestions[idx] && <span className="text-amber-500 flex items-center gap-1"><Eye className="w-3 h-3" /> 智能推荐</span>}
                                    </div>
                                    {FormatterService.getFormatters().map(fmt => {
                                      const isSuggested = suggestions[idx] === fmt.id;
                                      return (
                                        <button
                                          key={fmt.id}
                                          onClick={() => updateMapping(idx, 'format', fmt.id)}
                                          className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex flex-col mb-1 relative
                                                    ${isSuggested
                                              ? 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                                              : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-transparent'}`}
                                        >
                                          <div className="flex justify-between items-center w-full">
                                            <span className="font-medium">{fmt.label}</span>
                                            {isSuggested && <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 text-[10px] rounded-full font-bold">推荐</span>}
                                          </div>
                                          <span className={`text-xs ${isSuggested ? 'text-amber-700/80' : 'text-slate-400'}`}>{fmt.description}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
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

            {/* === Loop Mappings (Phase 3) === */}
            {((isEditing ? editedMapping.loopMappings : mappingScheme.loopMappings)?.length > 0 || isEditing) && (
              <div className="pt-4 border-t border-slate-200 mt-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
                  <h3 className="text-sm font-bold text-slate-700">列表/表格映射 (Table Generation)</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Many-to-One</span>
                </div>

                <div className="space-y-3">
                  {((isEditing ? editedMapping.loopMappings : mappingScheme.loopMappings) || []).map((loop, idx) => {
                    const isExpanded = expandedLoopIndex === idx;
                    const isGroupBy = loop.type === 'group_by';

                    return (
                      <div key={`loop-${idx}`} className={`rounded-lg border overflow-hidden ${isEditing ? 'border-cyan-200 shadow-sm' : 'border-slate-200'}`}>
                        {/* Loop Header */}
                        <div className="flex items-center p-3 bg-cyan-50/30 gap-3">
                          <button
                            onClick={() => setExpandedLoopIndex(isExpanded ? null : idx)}
                            className="p-1 rounded hover:bg-cyan-100 text-slate-500 transition-colors"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>

                          <div className="flex-1 grid grid-cols-12 gap-3 items-center">
                            {/* 1. Loop Tag */}
                            <div className="col-span-3 flex items-center gap-2">
                              {isGroupBy ? <List className="w-4 h-4 text-orange-500" /> : <Table className="w-4 h-4 text-cyan-600" />}
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:border-cyan-500 font-mono bg-white"
                                  value={loop.loopPlaceholder}
                                  onChange={(e) => updateLoopMapping(idx, 'loopPlaceholder', e.target.value)}
                                  placeholder="Loop Tag"
                                />
                              ) : (
                                <span className="font-mono font-bold text-sm text-cyan-700">#{loop.loopPlaceholder}</span>
                              )}
                            </div>

                            {/* 2. Type Selector (Editing Only) */}
                            <div className="col-span-3">
                              {isEditing ? (
                                <select
                                  value={loop.type || 'lookup'}
                                  onChange={(e) => updateLoopMapping(idx, 'type', e.target.value as any)}
                                  className="w-full px-2 py-1.5 text-xs font-medium border border-slate-200 rounded bg-white focus:border-cyan-500"
                                >
                                  <option value="lookup">🔗 Cross-Sheet (Lookup)</option>
                                  <option value="group_by">📂 Group By (List)</option>
                                </select>
                              ) : (
                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${isGroupBy ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-cyan-50 text-cyan-600 border-cyan-100'}`}>
                                  {isGroupBy ? 'Group By' : 'Lookup'}
                                </span>
                              )}
                            </div>

                            {/* 3. Config Area (Dynamic) */}
                            <div className="col-span-5 flex items-center gap-2">
                              {isGroupBy ? (
                                // Group By Config
                                <>
                                  <span className="text-xs text-slate-400 whitespace-nowrap">Group By:</span>
                                  {isEditing ? (
                                    <select
                                      value={loop.groupByColumn}
                                      onChange={(e) => updateLoopMapping(idx, 'groupByColumn', e.target.value)}
                                      className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white"
                                    >
                                      {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                  ) : (
                                    <span className="text-xs font-medium bg-white px-2 py-1 border rounded">{loop.groupByColumn || '-'}</span>
                                  )}
                                </>
                              ) : (
                                // Lookup Config
                                <>
                                  {isEditing ? (
                                    <>
                                      {/* Source */}
                                      <select
                                        value={loop.sourceSheet}
                                        onChange={(e) => updateLoopMapping(idx, 'sourceSheet', e.target.value)}
                                        className="w-1/2 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white"
                                        title="Source Sheet"
                                      >
                                        {Object.keys(allSheetsHeaders || {}).filter(s => s !== (isEditing ? editedMapping.primarySheet : mappingScheme.primarySheet)).map(s => (
                                          <option key={s} value={s}>{s}</option>
                                        ))}
                                      </select>
                                      <span className="text-slate-300">.</span>
                                      {/* Key */}
                                      <select
                                        value={loop.foreignKey}
                                        onChange={(e) => updateLoopMapping(idx, 'foreignKey', e.target.value)}
                                        className="w-1/2 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white"
                                        title="Match Key"
                                      >
                                        {/* Should list Source Sheet Columns ideally, currently logic uses excelHeaders which is Primary. 
                                            Wait, 'foreignKey' for Lookup usually means 'Linked By' column in Primary Sheet? 
                                            The logic in loopProcessingService says: joinValue = mainRow[loop.foreignKey]. 
                                            So yes, foreignKey is column in PRIMARY sheet. 
                                            And we assume Source Sheet has SAME column name. 
                                        */}
                                        {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                      </select>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-1 text-xs">
                                      <span className="bg-white px-2 py-1 border rounded text-slate-600">{loop.sourceSheet}</span>
                                      <span className="text-slate-300">on</span>
                                      <span className="font-mono">{loop.foreignKey}</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Delete */}
                            {isEditing && (
                              <div className="col-span-1 text-right">
                                <button onClick={() => removeLoopMapping(idx)} className="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Loop Content (Expanded) */}
                        {isExpanded && (
                          <div className="bg-slate-50 p-3 border-t border-cyan-100 shadow-inner">
                            <div className="space-y-2 pl-8">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  Inner Mappings ({(loop.mappings || []).length})
                                </h5>
                                <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border">
                                  {isGroupBy ? 'Select columns from this sheet' : `Select columns from ${loop.sourceSheet || 'Source'}`}
                                </span>
                              </div>

                              {(loop.mappings || []).map((m, mIdx) => (
                                <div key={mIdx} className="flex items-center gap-3 bg-white p-2 border border-slate-200 rounded shadow-sm">
                                  <ArrowRight className="w-3 h-3 text-slate-300" />
                                  {/* Child Placeholder */}
                                  <div className="flex-1">
                                    {isEditing ? (
                                      <select
                                        value={m.placeholder}
                                        onChange={(e) => updateLoopFieldMapping(idx, mIdx, 'placeholder', e.target.value)}
                                        className="w-full text-xs p-1.5 border border-slate-200 rounded bg-slate-50 hover:bg-white focus:bg-white focus:border-cyan-500 transition-colors"
                                      >
                                        {templatePlaceholders.map(p => <option key={p} value={p}>{p}</option>)}
                                      </select>
                                    ) : (
                                      <code className="text-xs font-medium text-slate-700">{m.placeholder}</code>
                                    )}
                                  </div>
                                  <span className="text-slate-300">→</span>
                                  {/* Child Source Column */}
                                  <div className="flex-1">
                                    {isEditing ? (
                                      <select
                                        value={m.excelColumn}
                                        onChange={(e) => updateLoopFieldMapping(idx, mIdx, 'excelColumn', e.target.value)}
                                        className="w-full text-xs p-1.5 border border-slate-200 rounded bg-slate-50 hover:bg-white focus:bg-white focus:border-cyan-500 transition-colors"
                                      >
                                        {/* 
                                           Columns Source:
                                           - If Group By: Use Primary Sheet Headers (excelHeaders)
                                           - If Lookup: Use Source Sheet Headers (allSheetsHeaders[loop.sourceSheet])
                                        */}
                                        {(isGroupBy ? excelHeaders : (allSheetsHeaders?.[loop.sourceSheet || ''] || [])).map(h => <option key={h} value={h}>{h}</option>)}
                                      </select>
                                    ) : (
                                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{m.excelColumn}</span>
                                    )}
                                  </div>
                                  {/* Remove Child */}
                                  {isEditing && (
                                    <button onClick={() => removeLoopFieldMapping(idx, mIdx)} className="text-slate-300 hover:text-red-500 p-1">
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}

                              {isEditing && (
                                <button
                                  onClick={() => addLoopFieldMapping(idx)}
                                  className="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1 mt-3 px-2 py-1 hover:bg-cyan-50 rounded transition-colors"
                                >
                                  <Plus className="w-3 h-3" /> Add Field to Loop
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isEditing && (
                    <div className="pt-2 px-1">
                      <button
                        onClick={addLoopMapping}
                        className="w-full py-2 border-2 border-dashed border-cyan-200 rounded-lg text-cyan-600/70 text-xs font-bold hover:border-cyan-400 hover:text-cyan-700 hover:bg-cyan-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3 h-3" />
                        添加列表循环 (Table)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 未映射提示区 */}
            {((isEditing ? editedMapping : mappingScheme).unmappedPlaceholders || []).length > 0 && (
              <div className="mt-8 mx-4 mb-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-amber-600 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  未映射字段 ({(isEditing ? editedMapping : mappingScheme).unmappedPlaceholders.length})
                </div>
                <p className="text-xs text-slate-400 mb-3">以下字段未配置映射，生成文档时可能为空：</p>
                <div className="flex flex-wrap gap-2">
                  {((isEditing ? editedMapping : mappingScheme).unmappedPlaceholders || []).map((p, idx) => (
                    <span key={idx} className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded-full font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="h-12"></div>
          </div>
        </div >
      </div >
    </div >
  );
};

export default MappingEditor;
