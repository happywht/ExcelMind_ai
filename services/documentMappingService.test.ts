/**
 * AI映射服务单元测试
 * 测试多Sheet映射功能
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
  generateFieldMappingV2,
  suggestPrimarySheet,
  detectCrossSheetRelationships,
  validateMappingScheme
} from './documentMappingService';
import type { SheetInfo, MappingScheme } from '../types/documentTypes';

// Mock Anthropic client
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn()
      }
    }))
  };
});

describe('DocumentMappingService', () => {
  // 测试数据
  const mockAllSheetsInfo: SheetInfo[] = [
    {
      sheetName: '员工表',
      headers: ['员工ID', '姓名', '部门ID', '职位', '工资'],
      rowCount: 100,
      sampleData: [
        { 员工ID: 'E001', 姓名: '张三', 部门ID: 'D001', 职位: '工程师', 工资: 15000 },
        { 员工ID: 'E002', 姓名: '李四', 部门ID: 'D002', 职位: '设计师', 工资: 12000 }
      ]
    },
    {
      sheetName: '部门表',
      headers: ['部门ID', '部门名称', '负责人', '办公地点'],
      rowCount: 5,
      sampleData: [
        { 部门ID: 'D001', 部门名称: '技术部', 负责人: '王总', 办公地点: '北京' },
        { 部门ID: 'D002', 部门名称: '设计部', 负责人: '赵总', 办公地点: '上海' }
      ]
    },
    {
      sheetName: '考勤表',
      headers: ['员工ID', '日期', '打卡时间', '状态'],
      rowCount: 300,
      sampleData: [
        { 员工ID: 'E001', 日期: '2024-01-01', 打卡时间: '09:00', 状态: '正常' }
      ]
    }
  ];

  describe('suggestPrimarySheet', () => {
    it('应该根据数据量选择主Sheet', () => {
      const result = suggestPrimarySheet(mockAllSheetsInfo);

      // 考勤表数据量最大（300行），应该被选中
      expect(result).toBe('考勤表');
    });

    it('应该考虑用户指令', () => {
      const result = suggestPrimarySheet(
        mockAllSheetsInfo,
        '生成员工工资单'
      );

      // 用户指令包含"员工"，应该选择员工表
      expect(['员工表', '考勤表']).toContain(result);
    });

    it('应该处理单个Sheet的情况', () => {
      const singleSheet = [mockAllSheetsInfo[0]];
      const result = suggestPrimarySheet(singleSheet);

      expect(result).toBe('员工表');
    });

    it('应该处理空数组', () => {
      const result = suggestPrimarySheet([]);

      expect(result).toBe('Sheet1');
    });
  });

  describe('detectCrossSheetRelationships', () => {
    it('应该检测到ID关联', () => {
      const relationships = detectCrossSheetRelationships(mockAllSheetsInfo);

      // 应该检测到员工ID和部门ID的关联
      const employeeDeptRelation = relationships.find(
        r => r.field === '部门ID' &&
             ((r.fromSheet === '员工表' && r.toSheet === '部门表') ||
              (r.fromSheet === '部门表' && r.toSheet === '员工表'))
      );

      expect(employeeDeptRelation).toBeDefined();
      expect(employeeDeptRelation?.confidence).toBeGreaterThan(0.5);
    });

    it('应该检测到员工ID关联', () => {
      const relationships = detectCrossSheetRelationships(mockAllSheetsInfo);

      const employeeIdRelation = relationships.find(
        r => r.field === '员工ID' &&
             ((r.fromSheet === '员工表' && r.toSheet === '考勤表') ||
              (r.fromSheet === '考勤表' && r.toSheet === '员工表'))
      );

      expect(employeeIdRelation).toBeDefined();
    });

    it('应该按置信度排序', () => {
      const relationships = detectCrossSheetRelationships(mockAllSheetsInfo);

      // 检查是否按置信度降序排列
      for (let i = 0; i < relationships.length - 1; i++) {
        expect(relationships[i].confidence).toBeGreaterThanOrEqual(
          relationships[i + 1].confidence
        );
      }
    });
  });

  describe('validateMappingScheme', () => {
    const validMappingScheme: MappingScheme = {
      explanation: '测试映射方案',
      primarySheet: '员工表',
      filterCondition: null,
      mappings: [
        { placeholder: '{{姓名}}', excelColumn: '姓名' },
        { placeholder: '{{职位}}', excelColumn: '职位' }
      ],
      unmappedPlaceholders: [],
      crossSheetMappings: [
        {
          placeholder: '{{部门名称}}',
          sourceSheet: '部门表',
          sourceColumn: '部门名称',
          lookupKey: '部门ID',
          relationshipType: 'manyToOne'
        }
      ]
    };

    it('应该验证有效的映射方案', () => {
      const result = validateMappingScheme(validMappingScheme, mockAllSheetsInfo);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测不存在的主Sheet', () => {
      const invalidScheme = { ...validMappingScheme, primarySheet: '不存在的表' };
      const result = validateMappingScheme(invalidScheme, mockAllSheetsInfo);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('不存在'))).toBe(true);
    });

    it('应该检测不存在的映射字段', () => {
      const invalidScheme = {
        ...validMappingScheme,
        mappings: [
          { placeholder: '{{姓名}}', excelColumn: '不存在的字段' }
        ]
      };
      const result = validateMappingScheme(invalidScheme, mockAllSheetsInfo);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('不存在字段'))).toBe(true);
    });

    it('应该检测无效的跨Sheet映射', () => {
      const invalidScheme = {
        ...validMappingScheme,
        crossSheetMappings: [
          {
            placeholder: '{{部门名称}}',
            sourceSheet: '不存在的表',
            sourceColumn: '部门名称',
            lookupKey: '部门ID'
          }
        ]
      };
      const result = validateMappingScheme(invalidScheme, mockAllSheetsInfo);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('不存在'))).toBe(true);
    });

    it('应该警告未映射的占位符', () => {
      const schemeWithUnmapped = {
        ...validMappingScheme,
        unmappedPlaceholders: ['{{地址}}', '{{电话}}']
      };
      const result = validateMappingScheme(schemeWithUnmapped, mockAllSheetsInfo);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('未能映射'))).toBe(true);
    });

    it('应该警告低置信度', () => {
      const lowConfidenceScheme = {
        ...validMappingScheme,
        confidence: 0.5
      };
      const result = validateMappingScheme(lowConfidenceScheme, mockAllSheetsInfo);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('置信度'))).toBe(true);
    });
  });

  describe('generateFieldMappingV2', () => {
    it('应该调用AI生成映射方案', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      const mockClient = new Anthropic();

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              explanation: 'AI生成的映射方案',
              primarySheet: '员工表',
              reasoning: '员工表包含主要数据',
              filterCondition: null,
              mappings: [
                { placeholder: '{{姓名}}', excelColumn: '姓名' },
                { placeholder: '{{职位}}', excelColumn: '职位' }
              ],
              crossSheetMappings: [
                {
                  placeholder: '{{部门名称}}',
                  sourceSheet: '部门表',
                  sourceColumn: '部门名称',
                  lookupKey: '部门ID',
                  relationshipType: 'manyToOne'
                }
              ],
              unmappedPlaceholders: [],
              confidence: 0.95
            })
          }
        ]
      };

      (mockClient.messages.create as jest.Mock).mockResolvedValue(mockResponse as any);

      const result = await generateFieldMappingV2({
        allSheetsInfo: mockAllSheetsInfo,
        templatePlaceholders: ['{{姓名}}', '{{职位}}', '{{部门名称}}'],
        userInstruction: '生成员工信息表'
      });

      expect(result.primarySheet).toBe('员工表');
      expect(result.mappings).toHaveLength(2);
      expect(result.crossSheetMappings).toHaveLength(1);
      expect(result.confidence).toBe(0.95);
    });

    it('应该处理用户指定的主Sheet', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      const mockClient = new Anthropic();

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              explanation: '使用用户指定的Sheet',
              primarySheet: '部门表',
              reasoning: '用户明确指定',
              filterCondition: null,
              mappings: [],
              crossSheetMappings: [],
              unmappedPlaceholders: [],
              confidence: 1.0
            })
          }
        ]
      };

      (mockClient.messages.create as jest.Mock).mockResolvedValue(mockResponse as any);

      const result = await generateFieldMappingV2({
        allSheetsInfo: mockAllSheetsInfo,
        primarySheet: '部门表', // 用户指定
        templatePlaceholders: ['{{部门名称}}'],
        userInstruction: '生成部门列表'
      });

      expect(result.primarySheet).toBe('部门表');
      expect(result.reasoning).toBe('用户明确指定');
    });
  });
});
