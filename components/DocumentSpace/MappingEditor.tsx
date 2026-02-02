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
  Info
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

  // 保存编辑
  const handleSave = () => {
    onMappingChange(editedMapping);
    setIsEditing(false);
  };

  // 取消编辑
  const handleCancel = () => {
    setEditedMapping(mappingScheme);
    setIsEditing(false);
  };

  // 添加新映射
  const addMapping = () => {
    const unmapped = templatePlaceholders.find(
      p => !editedMapping.mappings.some(m => m.placeholder === p)
    );

    if (unmapped) {
      setEditedMapping({
        ...editedMapping,
        mappings: [
          ...editedMapping.mappings,
          {
            placeholder: unmapped,
            excelColumn: excelHeaders[0] || ''
          }
        ]
      });
    }
  };

  // 删除映射
  const removeMapping = (index: number) => {
    const mapping = editedMapping.mappings[index];
    setEditedMapping({
      ...editedMapping,
      mappings: editedMapping.mappings.filter((_, i) => i !== index),
      unmappedPlaceholders: [...editedMapping.unmappedPlaceholders, mapping.placeholder]
    });
  };

  // 更新映射
  const updateMapping = (index: number, field: 'placeholder' | 'excelColumn' | 'transform', value: string) => {
    const newMappings = [...editedMapping.mappings];
    newMappings[index] = {
      ...newMappings[index],
      [field]: value
    };
    setEditedMapping({
      ...editedMapping,
      mappings: newMappings
    });
  };

  // 映射完成度
  const mappingProgress = {
    mapped: mappingScheme.mappings.length,
    total: templatePlaceholders.length,
    percentage: Math.round((mappingScheme.mappings.length / templatePlaceholders.length) * 100)
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 头部信息 - 极简白底风格 */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
                <GitBranch className="w-5 h-5 text-blue-600" />
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

            {/* 编辑按钮 */}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm flex items-center gap-2 group"
              >
                <Edit3 className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                编辑映射
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-sm shadow-emerald-200"
                >
                  <Check className="w-4 h-4" />
                  保存更改
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 映射列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* AI说明 */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">映射说明</h3>
                <p className="text-sm text-blue-700 leading-relaxed">
                  {mappingScheme.explanation}
                </p>
              </div>
            </div>
          </div>

          {/* 已映射字段 */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              已映射字段 ({mappingScheme.mappings.length})
            </h3>
            <div className="space-y-3">
              {mappingScheme.mappings.map((mapping, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    {/* 模板占位符 */}
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">模板占位符</label>
                      {isEditing ? (
                        <select
                          value={mapping.placeholder}
                          onChange={(e) => updateMapping(idx, 'placeholder', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {templatePlaceholders.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        <code className="text-sm font-mono bg-orange-50 text-orange-700 px-3 py-2 rounded block font-medium">
                          {mapping.placeholder}
                        </code>
                      )}
                    </div>

                    {/* 箭头 */}
                    <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />

                    {/* Excel列 */}
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">Excel列</label>
                      {isEditing ? (
                        <select
                          value={mapping.excelColumn}
                          onChange={(e) => updateMapping(idx, 'excelColumn', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {excelHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded block">
                          {mapping.excelColumn}
                        </span>
                      )}
                    </div>

                    {/* 转换规则 */}
                    {mapping.transform && (
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 mb-1 block">转换规则</label>
                        <code className="text-xs bg-slate-100 text-slate-700 px-3 py-2 rounded block">
                          {mapping.transform}
                        </code>
                      </div>
                    )}

                    {/* 删除按钮 */}
                    {isEditing && (
                      <button
                        onClick={() => removeMapping(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 添加映射按钮 */}
            {isEditing && mappingScheme.mappings.length < templatePlaceholders.length && (
              <button
                onClick={addMapping}
                className="mt-4 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50/10 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加映射
              </button>
            )}
          </div>

          {/* 筛选条件 */}
          {mappingScheme.filterCondition && (
            <div className="mb-6">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-500" />
                筛选条件
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <code className="text-sm text-emerald-700 font-mono">
                  {mappingScheme.filterCondition}
                </code>
              </div>
            </div>
          )}

          {/* 未映射字段 */}
          {mappingScheme.unmappedPlaceholders.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                未映射字段 ({mappingScheme.unmappedPlaceholders.length})
              </h3>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex flex-wrap gap-2">
                  {mappingScheme.unmappedPlaceholders.map((placeholder, idx) => (
                    <span
                      key={idx}
                      className="text-sm bg-white border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full font-mono"
                    >
                      {placeholder}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-amber-700 mt-3">
                  这些字段没有对应的Excel列，生成文档时将显示为空
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 映射可视化 */}
        <div className="w-80 bg-slate-50 border-l border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">映射可视化</h3>

          <div className="space-y-4">
            {/* 模板 */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Word模板</p>
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                {templatePlaceholders.slice(0, 8).map((p, idx) => (
                  <div key={idx} className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100 mb-1 last:mb-0">
                    {p}
                  </div>
                ))}
                {templatePlaceholders.length > 8 && (
                  <div className="text-xs text-slate-400 text-center pt-1">
                    ...还有 {templatePlaceholders.length - 8} 个
                  </div>
                )}
              </div>
            </div>

            {/* 连接线 */}
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-0.5 h-3 bg-slate-300"></div>
                ))}
              </div>
            </div>

            {/* Excel */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Excel数据</p>
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                {excelHeaders.slice(0, 8).map((h, idx) => (
                  <div key={idx} className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-100 mb-1 last:mb-0">
                    {h}
                  </div>
                ))}
                {excelHeaders.length > 8 && (
                  <div className="text-xs text-slate-400 text-center pt-1">
                    ...还有 {excelHeaders.length - 8} 个
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 统计 */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">映射率</span>
                <span className="font-bold text-emerald-600">{mappingProgress.percentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">已映射</span>
                <span className="font-bold text-slate-700">{mappingProgress.mapped}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">未映射</span>
                <span className="font-bold text-amber-600">{mappingProgress.total - mappingProgress.mapped}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MappingEditor;
