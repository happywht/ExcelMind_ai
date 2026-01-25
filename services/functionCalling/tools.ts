/**
 * ExcelMind AI - 原型工具集
 * Phase 2 Week 0 技术验证
 */

import { ToolFunction } from './types';

/**
 * 工具1: analyze_excel
 * 分析Excel文件结构和内容
 */
export const analyzeExcelTool: ToolFunction = {
  name: 'analyze_excel',
  description: '分析Excel文件，返回行数、列名、数据类型等结构信息',
  parameters: {
    type: 'object',
    properties: {
      fileName: {
        type: 'string',
        description: 'Excel文件名'
      },
      sheetName: {
        type: 'string',
        description: '工作表名称（可选，默认第一个sheet）'
      }
    },
    required: ['fileName']
  },
  handler: async (args) => {
    // 模拟Excel分析
    const mockData = {
      fileName: args.fileName,
      sheetName: args.sheetName || 'Sheet1',
      rowCount: Math.floor(Math.random() * 1000) + 100,
      columns: [
        { name: '日期', type: 'date', nullable: false },
        { name: '产品名称', type: 'string', nullable: false },
        { name: '数量', type: 'number', nullable: true },
        { name: '单价', type: 'number', nullable: false },
        { name: '金额', type: 'number', nullable: false },
        { name: '备注', type: 'string', nullable: true }
      ],
      sampleData: [
        { 日期: '2025-01-15', 产品名称: '产品A', 数量: 10, 单价: 100, 金额: 1000, 备注: '' },
        { 日期: '2025-01-16', 产品名称: '产品B', 数量: 5, 单价: 200, 金额: 1000, 备注: '促销' }
      ]
    };

    return {
      success: true,
      data: mockData
    };
  }
};

/**
 * 工具2: detect_anomalies
 * 检测数据异常（如金额超过阈值）
 */
export const detectAnomaliesTool: ToolFunction = {
  name: 'detect_anomalies',
  description: '检测Excel数据中的异常记录，如金额超过阈值、负数等',
  parameters: {
    type: 'object',
    properties: {
      fileName: {
        type: 'string',
        description: 'Excel文件名'
      },
      columnName: {
        type: 'string',
        description: '要检查的列名（如"金额"）'
      },
      threshold: {
        type: 'number',
        description: '异常阈值（如5000表示超过5000为异常）'
      },
      condition: {
        type: 'string',
        description: '检测条件：greater_than（大于）, less_than（小于）, equals（等于）',
        enum: ['greater_than', 'less_than', 'equals']
      }
    },
    required: ['fileName', 'columnName', 'threshold', 'condition']
  },
  handler: async (args) => {
    // 模拟异常检测
    const anomalyCount = Math.floor(Math.random() * 50) + 1;
    const mockAnomalies = Array.from({ length: Math.min(anomalyCount, 5) }, (_, i) => ({
      row: i + 2,
      value: args.threshold + (Math.random() * 1000 + 100),
      description: `金额${args.condition === 'greater_than' ? '超过' : '低于'}阈值`
    }));

    return {
      success: true,
      data: {
        totalRows: Math.floor(Math.random() * 1000) + 100,
        anomalyCount,
        threshold: args.threshold,
        condition: args.condition,
        anomalies: mockAnomalies,
        summary: `发现 ${anomalyCount} 笔异常记录`
      }
    };
  }
};

/**
 * 工具3: fill_document
 * 基于Excel数据填充Word文档模板
 */
export const fillDocumentTool: ToolFunction = {
  name: 'fill_document',
  description: '使用Excel数据填充Word文档模板中的占位符',
  parameters: {
    type: 'object',
    properties: {
      templateFile: {
        type: 'string',
        description: 'Word模板文件名'
      },
      dataFile: {
        type: 'string',
        description: 'Excel数据文件名'
      },
      outputFileName: {
        type: 'string',
        description: '输出文件名'
      },
      mappings: {
        type: 'array',
        description: '映射关系：模板占位符 -> Excel列名',
        items: {
          type: 'object',
          properties: {
            placeholder: { type: 'string', description: '占位符，如{{产品名称}}' },
            column: { type: 'string', description: 'Excel列名' }
          }
        }
      }
    },
    required: ['templateFile', 'dataFile', 'outputFileName', 'mappings']
  },
  handler: async (args) => {
    // 模拟文档填充
    const processedCount = Math.floor(Math.random() * 20) + 1;

    return {
      success: true,
      data: {
        templateFile: args.templateFile,
        dataFile: args.dataFile,
        outputFileName: args.outputFileName,
        processedCount,
        mappings: args.mappings,
        downloadUrl: `/api/v1/download/${args.outputFileName}`,
        summary: `成功生成 ${processedCount} 个文档`
      }
    };
  }
};

/**
 * 导出所有原型工具
 */
export const prototypeTools: ToolFunction[] = [
  analyzeExcelTool,
  detectAnomaliesTool,
  fillDocumentTool
];
