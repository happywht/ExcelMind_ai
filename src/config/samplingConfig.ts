/**
 * Excel数据采样配置
 * 统一管理各场景下的数据采样行数限制
 */

export const SAMPLING_CONFIG = {
  /**
   * AI分析场景 - 提供更多数据给AI参考
   * AI需要足够的数据样本来理解数据模式、发现异常和做出准确判断
   */
  AI_ANALYSIS: {
    SAMPLE_ROWS: 100,  // AI分析时采样行数
    MAX_CONTEXT_ROWS: 150  // AI上下文中最多使用的行数
  },

  /**
   * UI预览场景 - 平衡性能和用户体验
   * UI渲染需要考虑性能，避免渲染过多数据导致卡顿
   */
  UI_PREVIEW: {
    TABLE_ROWS: 200,    // 表格预览行数
    SAMPLE_ROWS: 50,    // 快速预览采样行数
    SIDEBAR_ITEMS: 20   // 侧边栏列表项数
  },

  /**
   * Few-Shot示例场景 - 示例不需要太多
   * Few-Shot学习只需要少量代表性示例
   */
  FEW_SHOT_EXAMPLES: {
    MAX_EXAMPLES: 20,   // 最大示例数量
    MIN_EXAMPLES: 5     // 最小示例数量
  },

  /**
   * 文档映射场景 - 需要足够样本来理解映射关系
   */
  DOCUMENT_MAPPING: {
    SAMPLE_ROWS: 50,    // 文档映射采样行数
    PREVIEW_ROWS: 10    // 预览显示行数
  },

  /**
   * 查询引擎场景 - 查询结果限制
   */
  QUERY_ENGINE: {
    MAX_RESULT_ROWS: 1000,  // 最大返回行数
    SAMPLE_ROWS: 20,        // 统计采样行数
    TOP_COLUMNS: 100        // 列信息展示数量
  },

  /**
   * 元数据提取场景 - 注释和标注提取
   */
  METADATA_EXTRACTION: {
    MAX_COMMENTS: 50,   // 最大注释数量
    MAX_NOTES: 50,      // 最大标注数量
    DISPLAY_LIMIT: 10   // 显示限制
  },

  /**
   * 历史记录场景
   */
  HISTORY: {
    MAX_ITEMS: 50,      // 最大历史记录数
    DISPLAY_ITEMS: 20   // 显示记录数
  }
} as const;

/**
 * 获取指定场景的采样配置
 */
export const getSamplingConfig = (scenario: keyof typeof SAMPLING_CONFIG) => {
  return SAMPLING_CONFIG[scenario];
};

/**
 * 安全地截取数组，避免越界
 */
export const safeSlice = <T>(arr: T[], start: number, end: number): T[] => {
  if (!Array.isArray(arr) || arr.length === 0) {
    return [];
  }
  return arr.slice(start, Math.min(end, arr.length));
};

/**
 * 根据配置获取采样数据
 */
export const getSampleData = <T>(
  data: T[],
  scenario: keyof typeof SAMPLING_CONFIG,
  configKey: string
): T[] => {
  const config = SAMPLING_CONFIG[scenario];
  const limit = (config as any)[configKey] || 10;
  return safeSlice(data, 0, limit);
};
