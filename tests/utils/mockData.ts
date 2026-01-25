/**
 * Mock数据集 - Phase 2
 *
 * 提供各种测试场景的Mock数据
 *
 * @module tests/utils/mockData
 * @version 2.0.0
 */

// ============================================================================
// Excel测试数据集
// ============================================================================

/**
 * 客户数据测试集
 */
export const customerData = {
  clean: [
    { customerId: 1, name: '张三', email: 'zhangsan@example.com', phone: '13800138000', age: 28 },
    { customerId: 2, name: '李四', email: 'lisi@example.com', phone: '13900139000', age: 35 },
    { customerId: 3, name: '王五', email: 'wangwu@example.com', phone: '13700137000', age: 42 },
    { customerId: 4, name: '赵六', email: 'zhaoliu@example.com', phone: '13600136000', age: 29 },
    { customerId: 5, name: '孙七', email: 'sunqi@example.com', phone: '13500135000', age: 31 }
  ],

  withMissingValues: [
    { customerId: 1, name: '张三', email: 'zhangsan@example.com', phone: '13800138000', age: 28 },
    { customerId: 2, name: '', email: 'lisi@example.com', phone: '13900139000', age: null },
    { customerId: 3, name: '王五', email: '', phone: '13700137000', age: 42 },
    { customerId: 4, name: '赵六', email: 'zhaoliu@example.com', phone: '', age: 29 },
    { customerId: 5, name: '孙七', email: 'sunqi@example.com', phone: '13500135000', age: null }
  ],

  withOutliers: [
    { customerId: 1, name: '张三', email: 'zhangsan@example.com', phone: '13800138000', age: 28 },
    { customerId: 2, name: '李四', email: 'lisi@example.com', phone: '13900139000', age: 35 },
    { customerId: 3, name: '王五', email: 'wangwu@example.com', phone: '13700137000', age: 999 }, // 异常值
    { customerId: 4, name: '赵六', email: 'zhaoliu@example.com', phone: '13600136000', age: -5 }, // 异常值
    { customerId: 5, name: '孙七', email: 'sunqi@example.com', phone: '13500135000', age: 31 }
  ],

  withDuplicates: [
    { customerId: 1, name: '张三', email: 'zhangsan@example.com', phone: '13800138000', age: 28 },
    { customerId: 2, name: '李四', email: 'lisi@example.com', phone: '13900139000', age: 35 },
    { customerId: 3, name: '张三', email: 'zhangsan@example.com', phone: '13800138000', age: 28 }, // 重复
    { customerId: 4, name: '王五', email: 'wangwu@example.com', phone: '13700137000', age: 42 },
    { customerId: 5, name: '李四', email: 'lisi@example.com', phone: '13900139000', age: 35 } // 重复
  ],

  withFormatIssues: [
    { customerId: 1, name: '张三', email: 'zhangsan@example.com', phone: '13800138000', age: 28 },
    { customerId: 2, name: '李四', email: 'invalid-email', phone: '13900139000', age: 35 },
    { customerId: 3, name: '王五', email: 'wangwu@example.com', phone: '13700137000', age: 42 },
    { customerId: 4, name: '赵六', email: 'zhaoliu@example', phone: '13600136000', age: 29 },
    { customerId: 5, name: '孙七', email: 'sunqi@example.com', phone: '13500135000', age: 31 }
  ]
};

/**
 * 销售数据测试集
 */
export const salesData = {
  clean: [
    { saleId: 1, productId: 'P001', quantity: 10, price: 99.99, total: 999.9, saleDate: '2024-01-01' },
    { saleId: 2, productId: 'P002', quantity: 5, price: 199.99, total: 999.95, saleDate: '2024-01-02' },
    { saleId: 3, productId: 'P003', quantity: 8, price: 49.99, total: 399.92, saleDate: '2024-01-03' },
    { saleId: 4, productId: 'P001', quantity: 15, price: 99.99, total: 1499.85, saleDate: '2024-01-04' },
    { saleId: 5, productId: 'P004', quantity: 20, price: 29.99, total: 599.8, saleDate: '2024-01-05' }
  ],

  withMissingValues: [
    { saleId: 1, productId: 'P001', quantity: 10, price: 99.99, total: 999.9, saleDate: '2024-01-01' },
    { saleId: 2, productId: '', quantity: 5, price: 199.99, total: 999.95, saleDate: '' },
    { saleId: 3, productId: 'P003', quantity: null, price: 49.99, total: 399.92, saleDate: '2024-01-03' },
    { saleId: 4, productId: 'P001', quantity: 15, price: null, total: 1499.85, saleDate: '2024-01-04' },
    { saleId: 5, productId: 'P004', quantity: 20, price: 29.99, total: null, saleDate: '2024-01-05' }
  ],

  withOutliers: [
    { saleId: 1, productId: 'P001', quantity: 10, price: 99.99, total: 999.9, saleDate: '2024-01-01' },
    { saleId: 2, productId: 'P002', quantity: 5, price: 199.99, total: 999.95, saleDate: '2024-01-02' },
    { saleId: 3, productId: 'P003', quantity: 9999, price: 49.99, total: 399.92, saleDate: '2024-01-03' }, // 异常值
    { saleId: 4, productId: 'P001', quantity: 15, price: 99.99, total: 999999999, saleDate: '2024-01-04' }, // 异常值
    { saleId: 5, productId: 'P004', quantity: 20, price: 29.99, total: 599.8, saleDate: '2024-01-05' }
  ],

  withDuplicates: [
    { saleId: 1, productId: 'P001', quantity: 10, price: 99.99, total: 999.9, saleDate: '2024-01-01' },
    { saleId: 2, productId: 'P002', quantity: 5, price: 199.99, total: 999.95, saleDate: '2024-01-02' },
    { saleId: 3, productId: 'P001', quantity: 10, price: 99.99, total: 999.9, saleDate: '2024-01-01' }, // 重复
    { saleId: 4, productId: 'P003', quantity: 8, price: 49.99, total: 399.92, saleDate: '2024-01-03' },
    { saleId: 5, productId: 'P002', quantity: 5, price: 199.99, total: 999.95, saleDate: '2024-01-02' } // 重复
  ]
};

/**
 * 员工数据测试集
 */
export const employeeData = {
  clean: [
    { employeeId: 'E001', name: '张三', department: 'IT', position: '开发工程师', salary: 15000, joinDate: '2020-01-15' },
    { employeeId: 'E002', name: '李四', department: 'HR', position: 'HR经理', salary: 18000, joinDate: '2019-06-20' },
    { employeeId: 'E003', name: '王五', department: 'Finance', position: '财务分析师', salary: 16000, joinDate: '2021-03-10' },
    { employeeId: 'E004', name: '赵六', department: 'IT', position: '测试工程师', salary: 14000, joinDate: '2020-08-05' },
    { employeeId: 'E005', name: '孙七', department: 'Sales', position: '销售代表', salary: 12000, joinDate: '2022-02-28' }
  ],

  withMissingValues: [
    { employeeId: 'E001', name: '张三', department: 'IT', position: '开发工程师', salary: 15000, joinDate: '2020-01-15' },
    { employeeId: 'E002', name: '', department: 'HR', position: 'HR经理', salary: null, joinDate: '2019-06-20' },
    { employeeId: 'E003', name: '王五', department: '', position: '财务分析师', salary: 16000, joinDate: '' },
    { employeeId: 'E004', name: '赵六', department: 'IT', position: '', salary: 14000, joinDate: '2020-08-05' },
    { employeeId: 'E005', name: '孙七', department: 'Sales', position: '销售代表', salary: null, joinDate: '2022-02-28' }
  ],

  withOutliers: [
    { employeeId: 'E001', name: '张三', department: 'IT', position: '开发工程师', salary: 15000, joinDate: '2020-01-15' },
    { employeeId: 'E002', name: '李四', department: 'HR', position: 'HR经理', salary: 18000, joinDate: '2019-06-20' },
    { employeeId: 'E003', name: '王五', department: 'Finance', position: '财务分析师', salary: 999999, joinDate: '2021-03-10' }, // 异常值
    { employeeId: 'E004', name: '赵六', department: 'IT', position: '测试工程师', salary: -5000, joinDate: '2020-08-05' }, // 异常值
    { employeeId: 'E005', name: '孙七', department: 'Sales', position: '销售代表', salary: 12000, joinDate: '2022-02-28' }
  ],

  withDuplicates: [
    { employeeId: 'E001', name: '张三', department: 'IT', position: '开发工程师', salary: 15000, joinDate: '2020-01-15' },
    { employeeId: 'E002', name: '李四', department: 'HR', position: 'HR经理', salary: 18000, joinDate: '2019-06-20' },
    { employeeId: 'E003', name: '张三', department: 'IT', position: '开发工程师', salary: 15000, joinDate: '2020-01-15' }, // 重复
    { employeeId: 'E004', name: '王五', department: 'Finance', position: '财务分析师', salary: 16000, joinDate: '2021-03-10' },
    { employeeId: 'E005', name: '李四', department: 'HR', position: 'HR经理', salary: 18000, joinDate: '2019-06-20' } // 重复
  ]
};

// ============================================================================
// 数据质量分析结果Mock
// ============================================================================

export const mockDataQualityReports = {
  clean: {
    reportId: 'report_clean',
    fileId: 'file_001',
    sheetName: 'Sheet1',
    totalRows: 5,
    totalColumns: 5,
    qualityScore: 100,
    issues: [],
    columnStats: [
      { columnName: 'customerId', dataType: 'number', nullCount: 0, uniqueCount: 5 },
      { columnName: 'name', dataType: 'string', nullCount: 0, uniqueCount: 5 },
      { columnName: 'email', dataType: 'string', nullCount: 0, uniqueCount: 5 }
    ],
    dataSample: [
      { customerId: 1, name: '张三', email: 'zhangsan@example.com' }
    ]
  },

  withMissingValues: {
    reportId: 'report_missing',
    fileId: 'file_002',
    sheetName: 'Sheet1',
    totalRows: 5,
    totalColumns: 5,
    qualityScore: 60,
    issues: [
      {
        issueId: 'issue_missing_1',
        issueType: 'missing_value',
        severity: 'medium',
        affectedColumns: ['name', 'age'],
        affectedRows: [1, 2, 4],
        description: '发现3个缺失值',
        statistics: {
          affectedRowCount: 3,
          affectedPercentage: 60,
          distribution: { name: 1, age: 2 }
        }
      }
    ],
    columnStats: [
      { columnName: 'customerId', dataType: 'number', nullCount: 0, uniqueCount: 5 },
      { columnName: 'name', dataType: 'string', nullCount: 1, uniqueCount: 4 },
      { columnName: 'age', dataType: 'number', nullCount: 2, uniqueCount: 3 }
    ],
    dataSample: [
      { customerId: 1, name: '张三', age: 28 }
    ]
  },

  withOutliers: {
    reportId: 'report_outliers',
    fileId: 'file_003',
    sheetName: 'Sheet1',
    totalRows: 5,
    totalColumns: 5,
    qualityScore: 70,
    issues: [
      {
        issueId: 'issue_outlier_1',
        issueType: 'outlier',
        severity: 'high',
        affectedColumns: ['age'],
        affectedRows: [2, 3],
        description: '发现2个异常值',
        statistics: {
          affectedRowCount: 2,
          affectedPercentage: 40,
          distribution: { age: 2 }
        }
      }
    ],
    columnStats: [
      { columnName: 'customerId', dataType: 'number', nullCount: 0, uniqueCount: 5 },
      { columnName: 'age', dataType: 'number', nullCount: 0, uniqueCount: 5, min: -5, max: 999, mean: 217.6 }
    ],
    dataSample: [
      { customerId: 1, name: '张三', age: 28 }
    ]
  }
};

// ============================================================================
// 清洗建议Mock
// ============================================================================

export const mockCleaningSuggestions = {
  fillMissingValues: [
    {
      suggestionId: 'suggestion_fill_mean',
      issueId: 'issue_missing_1',
      strategy: {
        strategyId: 'fill_mean',
        name: '使用平均值填充',
        type: 'fill',
        description: '对于数值列，使用列的平均值填充缺失值',
        applicableIssues: ['missing_value'],
        estimatedComplexity: 'low',
        requiresCodeGeneration: true
      },
      priority: 'high',
      impactAssessment: {
        qualityImprovement: 85,
        dataLossRisk: 'none',
        executionTimeEstimate: 500,
        sideEffects: []
      },
      code: "data['age'].fillna(data['age'].mean(), inplace=True)",
      explanation: '使用年龄列的平均值填充缺失的年龄数据'
    }
  ],

  removeOutliers: [
    {
      suggestionId: 'suggestion_remove_outliers',
      issueId: 'issue_outlier_1',
      strategy: {
        strategyId: 'remove_outliers',
        name: '删除异常值',
        type: 'delete',
        description: '删除检测到的异常值',
        applicableIssues: ['outlier'],
        estimatedComplexity: 'low',
        requiresCodeGeneration: true
      },
      priority: 'medium',
      impactAssessment: {
        qualityImprovement: 90,
        dataLossRisk: 'medium',
        executionTimeEstimate: 300,
        sideEffects: ['可能删除有效数据']
      },
      code: "data = data[(data['age'] >= lower_bound) & (data['age'] <= upper_bound)]",
      explanation: '删除超出合理范围的异常年龄数据'
    }
  ]
};

// ============================================================================
// 模板管理Mock
// ============================================================================

export const mockTemplates = {
  basic: {
    templateId: 'template_001',
    name: '基础合同模板',
    description: '标准合同文档模板',
    filePath: '/templates/basic_contract.docx',
    variables: [
      { name: '合同编号', type: 'text', description: '合同唯一编号', required: true, defaultValue: '' },
      { name: '甲方名称', type: 'text', description: '甲方公司名称', required: true, defaultValue: '' },
      { name: '乙方名称', type: 'text', description: '乙方公司名称', required: true, defaultValue: '' },
      { name: '合同金额', type: 'number', description: '合同总金额', required: true, defaultValue: '' },
      { name: '签订日期', type: 'date', description: '合同签订日期', required: true, defaultValue: '' }
    ],
    createdAt: 1704067200000,
    updatedAt: 1704067200000
  },

  advanced: {
    templateId: 'template_002',
    name: '高级报告模板',
    description: '包含多个变量和表格的复杂报告模板',
    filePath: '/templates/advanced_report.docx',
    variables: [
      { name: '报告标题', type: 'text', description: '报告的标题', required: true, defaultValue: '' },
      { name: '作者', type: 'text', description: '报告作者', required: true, defaultValue: '' },
      { name: '生成日期', type: 'date', description: '报告生成日期', required: true, defaultValue: '' },
      { name: '数据表格', type: 'table', description: '数据表格内容', required: true, defaultValue: '' },
      { name: '图表数据', type: 'json', description: '图表数据JSON', required: false, defaultValue: '' }
    ],
    createdAt: 1704067200000,
    updatedAt: 1704067200000
  }
};

// ============================================================================
// 批量生成任务Mock
// ============================================================================

export const mockBatchTasks = {
  pending: {
    taskId: 'task_001',
    name: '批量生成合同文档',
    templateId: 'template_001',
    dataSourceId: 'data_001',
    status: 'pending',
    progress: 0,
    totalItems: 100,
    completedItems: 0,
    failedItems: 0,
    outputDirectory: '/output/contracts',
    createdAt: 1704067200000,
    startedAt: null,
    completedAt: null,
    error: null
  },

  running: {
    taskId: 'task_002',
    name: '批量生成报告文档',
    templateId: 'template_002',
    dataSourceId: 'data_002',
    status: 'running',
    progress: 45,
    totalItems: 200,
    completedItems: 90,
    failedItems: 2,
    outputDirectory: '/output/reports',
    createdAt: 1704067200000,
    startedAt: 1704067260000,
    completedAt: null,
    error: null
  },

  completed: {
    taskId: 'task_003',
    name: '批量生成证书文档',
    templateId: 'template_003',
    dataSourceId: 'data_003',
    status: 'completed',
    progress: 100,
    totalItems: 50,
    completedItems: 50,
    failedItems: 0,
    outputDirectory: '/output/certificates',
    createdAt: 1704067200000,
    startedAt: 1704067260000,
    completedAt: 1704067560000,
    error: null
  },

  failed: {
    taskId: 'task_004',
    name: '批量生成发票文档',
    templateId: 'template_004',
    dataSourceId: 'data_004',
    status: 'failed',
    progress: 30,
    totalItems: 150,
    completedItems: 45,
    failedItems: 5,
    outputDirectory: '/output/invoices',
    createdAt: 1704067200000,
    startedAt: 1704067260000,
    completedAt: null,
    error: '模板文件未找到'
  }
};

// ============================================================================
// API响应Mock
// ============================================================================

export const mockApiResponses = {
  success: {
    success: true,
    data: {},
    message: '操作成功',
    meta: {
      requestId: 'req_001',
      timestamp: 1704067200000,
      version: '2.0.0'
    }
  },

  error: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: '请求参数验证失败',
      details: [
        { field: 'fileId', message: 'fileId is required' }
      ]
    },
    meta: {
      requestId: 'req_002',
      timestamp: 1704067200000,
      version: '2.0.0'
    }
  }
};

// ============================================================================
// 导出所有Mock数据
// ============================================================================

export default {
  customerData,
  salesData,
  employeeData,
  mockDataQualityReports,
  mockCleaningSuggestions,
  mockTemplates,
  mockBatchTasks,
  mockApiResponses
};
