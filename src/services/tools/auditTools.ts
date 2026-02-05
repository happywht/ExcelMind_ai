/**
 * 预定义审计工具库
 *
 * 提供经过测试的、安全的数据处理函数
 * 引导 AI 使用这些函数而不是生成未知代码
 *
 * @author Backend Developer
 * @version 1.0.0
 */

/**
 * 工具函数分类
 */
export enum ToolCategory {
  DATA_VALIDATION = 'data_validation',
  DATA_CLEANING = 'data_cleaning',
  DATA_TRANSFORMATION = 'data_transformation',
  DATA_ANALYSIS = 'data_analysis',
  DATA_AGGREGATION = 'data_aggregation'
}

/**
 * 工具函数定义
 */
export interface ToolFunction {
  name: string;
  category: ToolCategory;
  description: string;
  parameters: { name: string; type: string; description: string }[];
  code: string;
  examples: string[];
}

/**
 * 预定义工具库
 */
export const AUDIT_TOOLS: ToolFunction[] = [
  // === 数据验证 ===
  {
    name: 'safe_numeric_convert',
    category: ToolCategory.DATA_VALIDATION,
    description: '安全地将列转换为数值类型，失败值转为 NaN',
    parameters: [
      { name: 'df', type: 'pd.DataFrame', description: '数据框' },
      { name: 'col_name', type: 'str', description: '列名' }
    ],
    code: `def safe_numeric_convert(df: pd.DataFrame, col_name: str) -> pd.DataFrame:
    """
    安全地将列转换为数值类型，失败值转为 NaN
    """
    df[col_name] = pd.to_numeric(df[col_name], errors='coerce')
    return df`,
    examples: [
      'df = safe_numeric_convert(df, "金额")',
      'df = safe_numeric_convert(df, "数量")'
    ]
  },
  {
    name: 'validate_column_exists',
    category: ToolCategory.DATA_VALIDATION,
    description: '验证列是否存在，不存在则抛出清晰的错误信息',
    parameters: [
      { name: 'df', type: 'pd.DataFrame', description: '数据框' },
      { name: 'col_name', type: 'str', description: '列名' }
    ],
    code: `def validate_column_exists(df: pd.DataFrame, col_name: str) -> bool:
    """
    验证列是否存在
    """
    if col_name not in df.columns:
        available = ', '.join(df.columns.tolist())
        raise ValueError(f"列 '{col_name}' 不存在。可用列: {available}")
    return True`,
    examples: [
      'validate_column_exists(df, "姓名")',
      'if validate_column_exists(df, "金额"): ...'
    ]
  },

  // === 数据清洗 ===
  {
    name: 'clean_whitespace',
    category: ToolCategory.DATA_CLEANING,
    description: '清理字符串列的首尾空格',
    parameters: [
      { name: 'df', type: 'pd.DataFrame', description: '数据框' },
      { name: 'col_name', type: 'str', description: '列名' }
    ],
    code: `def clean_whitespace(df: pd.DataFrame, col_name: str) -> pd.DataFrame:
    """
    清理字符串列的首尾空格
    """
    df[col_name] = df[col_name].astype(str).str.strip()
    return df`,
    examples: [
      'df = clean_whitespace(df, "姓名")',
      'df = clean_whitespace(df, "地址")'
    ]
  },
  {
    name: 'remove_duplicates',
    category: ToolCategory.DATA_CLEANING,
    description: '删除重复行，保留第一次出现的记录',
    parameters: [
      { name: 'df', type: 'pd.DataFrame', description: '数据框' },
      { name: 'subset', type: 'list', description: '用于判断重复的列名列表（可选）' }
    ],
    code: `def remove_duplicates(df: pd.DataFrame, subset=None) -> pd.DataFrame:
    """
    删除重复行
    """
    return df.drop_duplicates(subset=subset, keep='first')`,
    examples: [
      'df = remove_duplicates(df)',
      'df = remove_duplicates(df, subset=["姓名", "身份证号"])'
    ]
  },
  {
    name: 'fill_missing_values',
    category: ToolCategory.DATA_CLEANING,
    description: '填充缺失值',
    parameters: [
      { name: 'df', type: 'pd.DataFrame', description: '数据框' },
      { name: 'col_name', type: 'str', description: '列名' },
      { name: 'value', type: 'any', description: '填充值' }
    ],
    code: `def fill_missing_values(df: pd.DataFrame, col_name: str, value) -> pd.DataFrame:
    """
    填充缺失值
    """
    df[col_name] = df[col_name].fillna(value)
    return df`,
    examples: [
      'df = fill_missing_values(df, "金额", 0)',
      'df = fill_missing_values(df, "备注", "无")'
    ]
  },

  // === 数据转换 ===
  {
    name: 'calculate_variance',
    category: ToolCategory.DATA_TRANSFORMATION,
    description: '计算两列之间的差异',
    parameters: [
      { name: 'df', type: 'pd.DataFrame', description: '数据框' },
      { name: 'primary_col', type: 'str', description: '主列名' },
      { name: 'compare_col', type: 'str', description: '比较列名' },
      { name: 'output_col', type: 'str', description: '输出列名（可选）' }
    ],
    code: `def calculate_variance(df: pd.DataFrame, primary_col: str, compare_col: str, output_col: str = 'variance') -> pd.DataFrame:
    """
    计算两列之间的差异
    """
    df[output_col] = df[primary_col] - df[compare_col]
    return df`,
    examples: [
      'df = calculate_variance(df, "系统金额", "手工金额", "差异")',
      'df = calculate_variance(df, "数量A", "数量B")'
    ]
  },
  {
    name: 'merge_dataframes',
    category: ToolCategory.DATA_TRANSFORMATION,
    description: '合并两个数据框',
    parameters: [
      { name: 'left', type: 'pd.DataFrame', description: '左数据框' },
      { name: 'right', type: 'pd.DataFrame', description: '右数据框' },
      { name: 'on', type: 'str', description: '连接键' },
      { name: 'how', type: 'str', description: '连接方式: inner, left, right, outer' }
    ],
    code: `def merge_dataframes(left: pd.DataFrame, right: pd.DataFrame, on: str, how: str = 'inner') -> pd.DataFrame:
    """
    合并两个数据框
    """
    return pd.merge(left, right, on=on, how=how)`,
    examples: [
      'result = merge_dataframes(df1, df2, "姓名", "inner")',
      'result = merge_dataframes(main_data, ref_data, "ID", "left")'
    ]
  },
  {
    name: 'filter_by_condition',
    category: ToolCategory.DATA_TRANSFORMATION,
    description: '根据条件过滤数据',
    parameters: [
      { name: 'df', type: 'pd.DataFrame', description: '数据框' },
      { name: 'column', type: 'str', description: '列名' },
      { name: 'operator', type: 'str', description: '操作符: >, <, ==, !=, >=, <=' },
      { name: 'value', type: 'any', description: '比较值' }
    ],
    code: `def filter_by_condition(df: pd.DataFrame, column: str, operator: str, value) -> pd.DataFrame:
    """
    根据条件过滤数据
    """
    if operator == '>':
        return df[df[column] > value]
    elif operator == '<':
        return df[df[column] < value]
    elif operator == '==':
        return df[df[column] == value]
    elif operator == '!=':
        return df[df[column] != value]
    elif operator == '>=':
        return df[df[column] >= value]
    elif operator == '<=':
        return df[df[column] <= value]
    else:
        raise ValueError(f"不支持的操作符: {operator}")`,
    examples: [
      'filtered = filter_by_condition(df, "金额", ">", 1000)',
      'filtered = filter_by_condition(df, "状态", "==", "正常")'
    ]
  },

  // === 数据分析 ===
  {
    name: 'find_anomalies',
    category: ToolCategory.DATA_ANALYSIS,
    description: '使用标准差方法查找异常值',
    parameters: [
      { name: 'df', type: 'pd.DataFrame', description: '数据框' },
      { name: 'col_name', type: 'str', description: '列名' },
      { name: 'threshold', type: 'float', description: '标准差倍数（默认3）' }
    ],
    code: `def find_anomalies(df: pd.DataFrame, col_name: str, threshold: float = 3) -> pd.DataFrame:
    """
    使用标准差方法查找异常值
    """
    mean = df[col_name].mean()
    std = df[col_name].std()
    lower = mean - threshold * std
    upper = mean + threshold * std
    return df[(df[col_name] < lower) | (df[col_name] > upper)]`,
    examples: [
      'anomalies = find_anomalies(df, "金额")',
      'anomalies = find_anomalies(df, "数量", threshold=2)'
    ]
  },
  {
    name: 'calculate_statistics',
    category: ToolCategory.DATA_ANALYSIS,
    description: '计算列的统计信息',
    parameters: [
      { name: 'df', type: 'pd.DataFrame', description: '数据框' },
      { name: 'col_name', type: 'str', description: '列名' }
    ],
    code: `def calculate_statistics(df: pd.DataFrame, col_name: str) -> dict:
    """
    计算列的统计信息
    """
    return {
        'count': df[col_name].count(),
        'mean': df[col_name].mean(),
        'std': df[col_name].std(),
        'min': df[col_name].min(),
        'max': df[col_name].max(),
        'median': df[col_name].median(),
        'sum': df[col_name].sum()
    }`,
    examples: [
      'stats = calculate_statistics(df, "金额")',
      'stats = calculate_statistics(df, "数量")'
    ]
  },

  // === 数据聚合 ===
  {
    name: 'group_and_aggregate',
    category: ToolCategory.DATA_AGGREGATION,
    description: '分组聚合',
    parameters: [
      { name: 'df', type: 'pd.DataFrame', description: '数据框' },
      { name: 'group_col', type: 'str', description: '分组列名' },
      { name: 'agg_col', type: 'str', description: '聚合列名' },
      { name: 'method', type: 'str', description: '聚合方法: sum, mean, count, min, max' }
    ],
    code: `def group_and_aggregate(df: pd.DataFrame, group_col: str, agg_col: str, method: str = 'sum') -> pd.DataFrame:
    """
    分组聚合
    """
    if method == 'sum':
        return df.groupby(group_col)[agg_col].sum().reset_index()
    elif method == 'mean':
        return df.groupby(group_col)[agg_col].mean().reset_index()
    elif method == 'count':
        return df.groupby(group_col).agg({agg_col: 'count'}).reset_index()
    elif method == 'min':
        return df.groupby(group_col)[agg_col].min().reset_index()
    elif method == 'max':
        return df.groupby(group_col)[agg_col].max().reset_index()
    else:
        raise ValueError(f"不支持的聚合方法: {method}")`,
    examples: [
      'result = group_and_aggregate(df, "部门", "金额", "sum")',
      'result = group_and_aggregate(df, "类别", "数量", "mean")'
    ]
  },
  {
    name: 'pivot_table',
    category: ToolCategory.DATA_AGGREGATION,
    description: '创建数据透视表',
    parameters: [
      { name: 'df', type: 'pd.DataFrame', description: '数据框' },
      { name: 'index', type: 'str', description: '行索引列' },
      { name: 'columns', type: 'str', description: '列索引列' },
      { name: 'values', type: 'str', description: '值列' },
      { name: 'aggfunc', type: 'str', description: '聚合函数（默认sum）' }
    ],
    code: `def pivot_table(df: pd.DataFrame, index: str, columns: str, values: str, aggfunc: str = 'sum') -> pd.DataFrame:
    """
    创建数据透视表
    """
    return df.pivot_table(index=index, columns=columns, values=values, aggfunc=aggfunc, fill_value=0)`,
    examples: [
      'pivot = pivot_table(df, "部门", "月份", "金额")',
      'pivot = pivot_table(df, "类别", "年份", "数量", "mean")'
    ]
  }
];

/**
 * 生成工具库文档（用于 Prompt）
 */
export function generateToolsDocumentation(): string {
  let doc = '**可用的审计工具函数**（优先使用这些函数）：\n\n';

  const groupedTools: { [category: string]: ToolFunction[] } = {};
  AUDIT_TOOLS.forEach(tool => {
    if (!groupedTools[tool.category]) {
      groupedTools[tool.category] = [];
    }
    groupedTools[tool.category].push(tool);
  });

  Object.entries(groupedTools).forEach(([category, tools]) => {
    doc += `### ${category}\n`;
    tools.forEach(tool => {
      doc += `- **${tool.name}**: ${tool.description}\n`;
      doc += `  参数: ${tool.parameters.map(p => `${p.name} (${p.type})`).join(', ')}\n`;
      if (tool.examples.length > 0) {
        doc += `  示例: ${tool.examples[0]}\n`;
      }
    });
    doc += '\n';
  });

  return doc;
}

/**
 * 生成工具库代码（注入到生成的 Python 代码中）
 */
export function generateToolsCode(): string {
  let code = '# ===== 预定义审计工具库 =====\n\n';

  AUDIT_TOOLS.forEach(tool => {
    code += `# ${tool.description}\n`;
    code += tool.code;
    code += '\n\n';
  });

  code += '# ===== 工具库结束 =====\n\n';

  return code;
}

/**
 * 查找工具函数
 */
export function findTool(name: string): ToolFunction | undefined {
  return AUDIT_TOOLS.find(tool => tool.name === name);
}

/**
 * 根据类别获取工具
 */
export function getToolsByCategory(category: ToolCategory): ToolFunction[] {
  return AUDIT_TOOLS.filter(tool => tool.category === category);
}
