/**
 * DocumentSpace状态管理 - Zustand Store
 *
 * 管理文档空间模块的所有状态，包括文件上传、AI映射、文档生成等
 *
 * @module stores/documentSpaceStore
 * @version 3.0.0 - Zustand集成版本
 *
 * 功能特性:
 * - 集中管理DocumentSpace所有状态
 * - 消除Props Drilling问题
 * - 支持DevTools调试
 * - 支持持久化存储（可选）
 * - 提供便捷Hooks
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useMemo, useCallback } from 'react';
import {
  TemplateFile,
  MappingScheme,
  GeneratedDocument,
  DocumentProcessingLog,
  GenerationMode,
  AggregateConfig,
  SheetInfo
} from '../types/documentTypes';

// ============ 类型定义 ============

/**
 * DocumentSpace Tab类型
 */
export type DocumentSpaceTab =
  | 'upload'
  | 'templates'
  | 'template'
  | 'data'
  | 'mapping'
  | 'preview'
  | 'generate';

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  templateUpload?: number;
  dataUpload?: number;
  aiMapping?: number;
  documentGeneration?: number;
  totalMemory?: number;
  executionTime?: number;
}

/**
 * 处理阶段类型
 */
export type ProcessingStage =
  | 'template_upload'
  | 'data_upload'
  | 'ai_mapping'
  | 'document_generation'
  | 'aggregate_generation';

/**
 * DocumentSpace完整状态接口
 */
export interface DocumentSpaceState {
  // ============ 文件状态 ============

  /** Word模板文件 */
  templateFile: TemplateFile | null;
  /** Excel数据文件 */
  dataFile: File | null;
  /** 解析后的Excel数据 */
  excelData: {
    sheets: Record<string, any[]>;
    currentSheetName: string;
  } | null;

  // ============ AI和映射状态 ============

  /** 用户输入的AI指令 */
  userInstruction: string;
  /** AI生成的映射方案 */
  mappingScheme: MappingScheme | null;
  /** 已生成的文档列表 */
  generatedDocs: GeneratedDocument[];

  // ============ 多Sheet支持状态 ============

  /** 主数据Sheet名称 */
  primarySheet: string;
  /** 启用的Sheet列表 */
  enabledSheets: string[];

  // ============ 生成模式状态 ============

  /** 文档生成模式 */
  generationMode: GenerationMode;
  /** 聚合配置 */
  aggregateConfig: AggregateConfig;

  // ============ UI状态 ============

  /** 当前激活的Tab */
  activeTab: DocumentSpaceTab;
  /** 当前选中的文档 */
  selectedDoc: GeneratedDocument | null;

  // ============ 处理状态 ============

  /** 是否正在处理 */
  isProcessing: boolean;
  /** 当前处理阶段 */
  processingStage: ProcessingStage;
  /** 处理进度 (0-100) */
  progress: number;

  // ============ 日志和监控 ============

  /** 处理日志列表 */
  logs: DocumentProcessingLog[];
  /** 性能指标 */
  performanceMetrics: PerformanceMetrics;

  // ============ 配置常量 ============

  /** 每页显示日志数 */
  logsPerPage: number;
  /** 最大日志数量 */
  maxLogs: number;

  // ============ Actions - 文件操作 ============

  /**
   * 设置模板文件
   */
  setTemplateFile: (file: TemplateFile | null) => void;

  /**
   * 设置数据文件
   */
  setDataFile: (file: File | null) => void;

  /**
   * 设置Excel数据
   */
  setExcelData: (data: DocumentSpaceState['excelData']) => void;

  // ============ Actions - AI和映射 ============

  /**
   * 设置用户指令
   */
  setUserInstruction: (instruction: string) => void;

  /**
   * 设置映射方案
   */
  setMappingScheme: (scheme: MappingScheme | null) => void;

  /**
   * 设置生成的文档列表
   */
  setGeneratedDocs: (docs: GeneratedDocument[]) => void;

  /**
   * 添加单个生成的文档
   */
  addGeneratedDoc: (doc: GeneratedDocument) => void;

  /**
   * 清空生成的文档列表
   */
  clearGeneratedDocs: () => void;

  // ============ Actions - 多Sheet支持 ============

  /**
   * 设置主Sheet
   */
  setPrimarySheet: (sheet: string) => void;

  /**
   * 设置启用的Sheet列表
   */
  setEnabledSheets: (sheets: string[]) => void;

  /**
   * 切换Sheet的启用状态
   */
  toggleEnabledSheet: (sheet: string) => void;

  // ============ Actions - 生成模式 ============

  /**
   * 设置生成模式
   */
  setGenerationMode: (mode: GenerationMode) => void;

  /**
   * 设置聚合配置
   */
  setAggregateConfig: (config: AggregateConfig) => void;

  // ============ Actions - UI状态 ============

  /**
   * 设置当前激活的Tab
   */
  setActiveTab: (tab: DocumentSpaceTab) => void;

  /**
   * 设置选中的文档
   */
  setSelectedDoc: (doc: GeneratedDocument | null) => void;

  // ============ Actions - 处理状态 ============

  /**
   * 设置处理状态
   */
  setIsProcessing: (processing: boolean) => void;

  /**
   * 设置处理阶段
   */
  setProcessingStage: (stage: ProcessingStage) => void;

  /**
   * 设置处理进度
   */
  setProgress: (progress: number) => void;

  /**
   * 开始处理
   */
  startProcessing: (stage: ProcessingStage) => void;

  /**
   * 完成处理
   */
  finishProcessing: () => void;

  /**
   * 更新处理进度
   */
  updateProgress: (progress: number) => void;

  // ============ Actions - 日志和监控 ============

  /**
   * 添加日志
   */
  addLog: (log: Omit<DocumentProcessingLog, 'id' | 'timestamp'>) => void;

  /**
   * 清空日志
   */
  clearLogs: () => void;

  /**
   * 设置性能指标
   */
  setPerformanceMetrics: (metrics: PerformanceMetrics) => void;

  /**
   * 更新单个性能指标
   */
  updatePerformanceMetric: (key: keyof PerformanceMetrics, value: number) => void;

  // ============ Actions - 重置 ============

  /**
   * 重置所有状态
   */
  reset: () => void;

  /**
   * 重置文件状态
   */
  resetFileState: () => void;

  /**
   * 重置生成状态
   */
  resetGenerationState: () => void;
}

// ============ 初始状态 ============

const initialState: Omit<
  DocumentSpaceState,
  | 'setTemplateFile'
  | 'setDataFile'
  | 'setExcelData'
  | 'setUserInstruction'
  | 'setMappingScheme'
  | 'setGeneratedDocs'
  | 'addGeneratedDoc'
  | 'clearGeneratedDocs'
  | 'setPrimarySheet'
  | 'setEnabledSheets'
  | 'toggleEnabledSheet'
  | 'setGenerationMode'
  | 'setAggregateConfig'
  | 'setActiveTab'
  | 'setSelectedDoc'
  | 'setIsProcessing'
  | 'setProcessingStage'
  | 'setProgress'
  | 'startProcessing'
  | 'finishProcessing'
  | 'updateProgress'
  | 'addLog'
  | 'clearLogs'
  | 'setPerformanceMetrics'
  | 'updatePerformanceMetric'
  | 'reset'
  | 'resetFileState'
  | 'resetGenerationState'
> = {
  // 文件状态
  templateFile: null,
  dataFile: null,
  excelData: null,

  // AI和映射状态
  userInstruction: '',
  mappingScheme: null,
  generatedDocs: [],

  // 多Sheet支持状态
  primarySheet: '',
  enabledSheets: [],

  // 生成模式状态
  generationMode: 'individual',
  aggregateConfig: { rules: [] },

  // UI状态
  activeTab: 'templates',
  selectedDoc: null,

  // 处理状态
  isProcessing: false,
  processingStage: 'template_upload',
  progress: 0,

  // 日志和监控
  logs: [],
  performanceMetrics: {},

  // 配置常量
  logsPerPage: 20,
  maxLogs: 100
};

// ============ Store创建 ============

export const useDocumentSpaceStore = create<DocumentSpaceState>()(
  devtools(
    (set, get) => ({
      // ============ 初始状态 ============

      ...initialState,

      // ============ Actions - 文件操作 ============

      setTemplateFile: (file) => set({ templateFile: file }, false, 'setTemplateFile'),

      setDataFile: (file) => set({ dataFile: file }, false, 'setDataFile'),

      setExcelData: (data) => set({ excelData: data }, false, 'setExcelData'),

      // ============ Actions - AI和映射 ============

      setUserInstruction: (instruction) =>
        set({ userInstruction: instruction }, false, 'setUserInstruction'),

      setMappingScheme: (scheme) =>
        set({ mappingScheme: scheme }, false, 'setMappingScheme'),

      setGeneratedDocs: (docs) => set({ generatedDocs: docs }, false, 'setGeneratedDocs'),

      addGeneratedDoc: (doc) =>
        set((state) => ({
          generatedDocs: [...state.generatedDocs, doc]
        }), false, 'addGeneratedDoc'),

      clearGeneratedDocs: () => set({ generatedDocs: [] }, false, 'clearGeneratedDocs'),

      // ============ Actions - 多Sheet支持 ============

      setPrimarySheet: (sheet) => set({ primarySheet: sheet }, false, 'setPrimarySheet'),

      setEnabledSheets: (sheets) =>
        set({ enabledSheets: sheets }, false, 'setEnabledSheets'),

      toggleEnabledSheet: (sheet) =>
        set((state) => ({
          enabledSheets: state.enabledSheets.includes(sheet)
            ? state.enabledSheets.filter(s => s !== sheet)
            : [...state.enabledSheets, sheet]
        }), false, 'toggleEnabledSheet'),

      // ============ Actions - 生成模式 ============

      setGenerationMode: (mode) =>
        set({ generationMode: mode }, false, 'setGenerationMode'),

      setAggregateConfig: (config) =>
        set({ aggregateConfig: config }, false, 'setAggregateConfig'),

      // ============ Actions - UI状态 ============

      setActiveTab: (tab) => set({ activeTab: tab }, false, 'setActiveTab'),

      setSelectedDoc: (doc) => set({ selectedDoc: doc }, false, 'setSelectedDoc'),

      // ============ Actions - 处理状态 ============

      setIsProcessing: (processing) =>
        set({ isProcessing: processing }, false, 'setIsProcessing'),

      setProcessingStage: (stage) =>
        set({ processingStage: stage }, false, 'setProcessingStage'),

      setProgress: (progress) => set({ progress }, false, 'setProgress'),

      startProcessing: (stage) =>
        set(
          { isProcessing: true, processingStage: stage, progress: 0 },
          false,
          'startProcessing'
        ),

      finishProcessing: () =>
        set(
          { isProcessing: false, progress: 100 },
          false,
          'finishProcessing'
        ),

      updateProgress: (progress) =>
        set({ progress }, false, 'updateProgress'),

      // ============ Actions - 日志和监控 ============

      addLog: (log) => set((state) => {
        const newLog: DocumentProcessingLog = {
          ...log,
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now()
        };

        let logs = [newLog, ...state.logs];

        // 限制日志数量，防止内存泄漏
        if (logs.length > state.maxLogs) {
          logs = logs.slice(0, state.maxLogs);
        }

        return { logs };
      }, false, 'addLog'),

      clearLogs: () => set({ logs: [] }, false, 'clearLogs'),

      setPerformanceMetrics: (metrics) =>
        set({ performanceMetrics: metrics }, false, 'setPerformanceMetrics'),

      updatePerformanceMetric: (key, value) =>
        set((state) => ({
          performanceMetrics: {
            ...state.performanceMetrics,
            [key]: value
          }
        }), false, 'updatePerformanceMetric'),

      // ============ Actions - 重置 ============

      reset: () => set(initialState, false, 'reset'),

      resetFileState: () => set({
        templateFile: null,
        dataFile: null,
        excelData: null
      }, false, 'resetFileState'),

      resetGenerationState: () => set({
        mappingScheme: null,
        generatedDocs: [],
        selectedDoc: null
      }, false, 'resetGenerationState')
    }),
    {
      name: 'DocumentSpaceStore',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);

// ============ 便捷Hooks ============

/**
 * 获取文件相关状态
 */
export const useDocumentSpaceFiles = () =>
  useDocumentSpaceStore((state) => ({
    templateFile: state.templateFile,
    dataFile: state.dataFile,
    excelData: state.excelData
  }));

/**
 * 获取AI和映射相关状态
 */
export const useDocumentSpaceMapping = () =>
  useDocumentSpaceStore((state) => ({
    userInstruction: state.userInstruction,
    mappingScheme: state.mappingScheme,
    generatedDocs: state.generatedDocs
  }));

/**
 * 获取Sheet配置相关状态
 */
export const useDocumentSpaceSheets = () =>
  useDocumentSpaceStore((state) => ({
    primarySheet: state.primarySheet,
    enabledSheets: state.enabledSheets
  }));

/**
 * 获取生成模式相关状态
 */
export const useDocumentSpaceGeneration = () =>
  useDocumentSpaceStore((state) => ({
    generationMode: state.generationMode,
    aggregateConfig: state.aggregateConfig
  }));

/**
 * 获取UI相关状态
 */
export const useDocumentSpaceUI = () =>
  useDocumentSpaceStore((state) => ({
    activeTab: state.activeTab,
    selectedDoc: state.selectedDoc
  }));

/**
 * 获取处理状态
 */
export const useDocumentSpaceProcessing = () =>
  useDocumentSpaceStore((state) => ({
    isProcessing: state.isProcessing,
    processingStage: state.processingStage,
    progress: state.progress
  }));

/**
 * 获取日志和监控
 */
export const useDocumentSpaceLogs = () =>
  useDocumentSpaceStore((state) => ({
    logs: state.logs,
    logsPerPage: state.logsPerPage,
    maxLogs: state.maxLogs
  }));

/**
 * 获取性能指标
 */
export const useDocumentSpaceMetrics = () =>
  useDocumentSpaceStore((state) => state.performanceMetrics);

/**
 * 获取可用字段列表（从Excel数据中提取）
 */
export const useAvailableFields = () =>
  useDocumentSpaceStore((state) => {
    if (!state.excelData?.sheets || !state.excelData.currentSheetName) {
      return [];
    }

    const currentSheet = state.excelData.sheets[state.excelData.currentSheetName];
    if (!currentSheet || currentSheet.length === 0) {
      return [];
    }

    return Object.keys(currentSheet[0] || {});
  });

/**
 * 获取所有操作方法
 *
 * ⚠️ 优化：使用浅比较选择器，避免每次创建新对象
 */
export const useDocumentSpaceActions = () => {
  // 使用选择器，但利用Zustand的浅比较特性
  // Zustand会确保当且仅当选择的结果发生引用变化时才触发重新渲染
  return useDocumentSpaceStore((state) => ({
    // 文件操作
    setTemplateFile: state.setTemplateFile,
    setDataFile: state.setDataFile,
    setExcelData: state.setExcelData,

    // AI和映射
    setUserInstruction: state.setUserInstruction,
    setMappingScheme: state.setMappingScheme,
    setGeneratedDocs: state.setGeneratedDocs,
    addGeneratedDoc: state.addGeneratedDoc,
    clearGeneratedDocs: state.clearGeneratedDocs,

    // Sheet配置
    setPrimarySheet: state.setPrimarySheet,
    setEnabledSheets: state.setEnabledSheets,
    toggleEnabledSheet: state.toggleEnabledSheet,

    // 生成模式
    setGenerationMode: state.setGenerationMode,
    setAggregateConfig: state.setAggregateConfig,

    // UI状态
    setActiveTab: state.setActiveTab,
    setSelectedDoc: state.setSelectedDoc,

    // 处理状态
    setIsProcessing: state.setIsProcessing,
    setProcessingStage: state.setProcessingStage,
    setProgress: state.setProgress,
    startProcessing: state.startProcessing,
    finishProcessing: state.finishProcessing,
    updateProgress: state.updateProgress,

    // 日志和监控
    addLog: state.addLog,
    clearLogs: state.clearLogs,
    setPerformanceMetrics: state.setPerformanceMetrics,
    updatePerformanceMetric: state.updatePerformanceMetric,

    // 重置
    reset: state.reset,
    resetFileState: state.resetFileState,
    resetGenerationState: state.resetGenerationState
  }), Object.is); // 使用引用相等比较，只有当store中的函数引用改变时才重新渲染
};

/**
 * 获取计算属性 - 是否可以生成映射
 */
export const useCanGenerateMapping = () =>
  useDocumentSpaceStore((state) =>
    Boolean(
      state.templateFile &&
      state.excelData &&
      state.userInstruction.trim() &&
      !state.isProcessing
    )
  );

/**
 * 获取计算属性 - 是否可以生成文档
 */
export const useCanGenerateDocs = () =>
  useDocumentSpaceStore((state) =>
    Boolean(state.mappingScheme && !state.isProcessing)
  );

/**
 * 组合Hook - 获取DocumentSpace所有状态和操作
 * 适用于需要完整访问的场景
 *
 * ⚠️ 重要：这个hook必须使用选择器来避免无限循环
 * 不能直接返回整个store，因为每次调用都会创建新的对象引用
 */
export const useDocumentSpace = () => {
  const store = useDocumentSpaceStore();

  // 使用useMemo确保返回的对象引用稳定
  // 只有当store中的值真正改变时才返回新对象
  return useMemo(() => ({
    // 文件状态
    templateFile: store.templateFile,
    dataFile: store.dataFile,
    excelData: store.excelData,

    // AI和映射状态
    userInstruction: store.userInstruction,
    mappingScheme: store.mappingScheme,
    generatedDocs: store.generatedDocs,

    // 多Sheet支持状态
    primarySheet: store.primarySheet,
    enabledSheets: store.enabledSheets,

    // 生成模式状态
    generationMode: store.generationMode,
    aggregateConfig: store.aggregateConfig,

    // UI状态
    activeTab: store.activeTab,
    selectedDoc: store.selectedDoc,

    // 处理状态
    isProcessing: store.isProcessing,
    processingStage: store.processingStage,
    progress: store.progress,

    // 日志和监控
    logs: store.logs,
    performanceMetrics: store.performanceMetrics,
    logsPerPage: store.logsPerPage,
    maxLogs: store.maxLogs,

    // 操作方法
    setTemplateFile: store.setTemplateFile,
    setDataFile: store.setDataFile,
    setExcelData: store.setExcelData,
    setUserInstruction: store.setUserInstruction,
    setMappingScheme: store.setMappingScheme,
    setGeneratedDocs: store.setGeneratedDocs,
    setActiveTab: store.setActiveTab,
    setSelectedDoc: store.setSelectedDoc,
    setPrimarySheet: store.setPrimarySheet,
    setEnabledSheets: store.setEnabledSheets,
    setGenerationMode: store.setGenerationMode,
    setAggregateConfig: store.setAggregateConfig,
    startProcessing: store.startProcessing,
    finishProcessing: store.finishProcessing,
    updateProgress: store.updateProgress,
    addLog: store.addLog,
    clearLogs: store.clearLogs,
    updatePerformanceMetric: store.updatePerformanceMetric
  }), [
    store.templateFile,
    store.dataFile,
    store.excelData,
    store.userInstruction,
    store.mappingScheme,
    store.generatedDocs,
    store.primarySheet,
    store.enabledSheets,
    store.generationMode,
    store.aggregateConfig,
    store.activeTab,
    store.selectedDoc,
    store.isProcessing,
    store.processingStage,
    store.progress,
    store.logs,
    store.performanceMetrics,
    store.logsPerPage,
    store.maxLogs,
    // 注意：操作方法（函数）引用是稳定的，不需要在依赖数组中
  ]);
};

/**
 * 获取计算属性 - 使用独立的hook避免无限循环
 */
export const useDocumentSpaceComputed = () => {
  const store = useDocumentSpaceStore();

  return useMemo(() => ({
    canGenerateMapping: Boolean(
      store.templateFile &&
      store.excelData &&
      store.userInstruction.trim() &&
      !store.isProcessing
    ),
    canGenerateDocs: Boolean(store.mappingScheme && !store.isProcessing),
    availableFields: (() => {
      if (!store.excelData?.sheets || !store.excelData.currentSheetName) {
        return [];
      }
      const currentSheet = store.excelData.sheets[store.excelData.currentSheetName];
      if (!currentSheet || currentSheet.length === 0) {
        return [];
      }
      return Object.keys(currentSheet[0] || {});
    })()
  }), [
    store.templateFile,
    store.excelData,
    store.userInstruction,
    store.isProcessing,
    store.mappingScheme
  ]);
};
