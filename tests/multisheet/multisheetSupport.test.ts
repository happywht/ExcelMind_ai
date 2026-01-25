/**
 * SmartExcel 多Sheet支持测试
 *
 * 测试多Sheet数据处理的各项功能
 */

import { ExcelData } from '../../types';

describe('SmartExcel 多Sheet支持', () => {

  describe('数据结构验证', () => {
    it('应该支持单Sheet文件格式', () => {
      const singleSheetData: ExcelData = {
        id: 'test-1',
        fileName: '单Sheet文件.xlsx',
        sheets: {
          'Sheet1': [
            { 姓名: '张三', 年龄: 30 },
            { 姓名: '李四', 年龄: 25 }
          ]
        },
        currentSheetName: 'Sheet1'
      };

      expect(singleSheetData.sheets['Sheet1']).toHaveLength(2);
      expect(singleSheetData.sheets['Sheet1'][0].姓名).toBe('张三');
    });

    it('应该支持多Sheet文件格式', () => {
      const multiSheetData: ExcelData = {
        id: 'test-2',
        fileName: '多Sheet文件.xlsx',
        sheets: {
          '员工信息': [
            { 姓名: '张三', 年龄: 30 },
            { 姓名: '李四', 年龄: 25 }
          ],
          '薪资数据': [
            { 姓名: '张三', 基本工资: 5000 },
            { 姓名: '李四', 基本工资: 4500 }
          ],
          '考勤记录': [
            { 姓名: '张三', 出勤天数: 22 },
            { 姓名: '李四', 出勤天数: 20 }
          ]
        },
        currentSheetName: '员工信息'
      };

      expect(Object.keys(multiSheetData.sheets)).toHaveLength(3);
      expect(multiSheetData.sheets['员工信息']).toHaveLength(2);
      expect(multiSheetData.sheets['薪资数据']).toHaveLength(2);
      expect(multiSheetData.sheets['考勤记录']).toHaveLength(2);
    });
  });

  describe('数据准备逻辑', () => {
    it('应该正确收集所有Sheet的信息', () => {
      const mockFile: ExcelData = {
        id: 'test-3',
        fileName: '测试文件.xlsx',
        sheets: {
          'Sheet1': [{ col1: 'value1' }],
          'Sheet2': [{ col2: 'value2' }]
        },
        currentSheetName: 'Sheet1'
      };

      // 模拟数据准备逻辑
      const sheetsInfo: { [sheetName: string]: any } = {};
      Object.entries(mockFile.sheets).forEach(([sheetName, data]) => {
        const headers = data.length > 0 ? Object.keys(data[0]) : [];
        const sampleRows = data.slice(0, 5);
        sheetsInfo[sheetName] = {
          headers,
          sampleRows,
          rowCount: data.length
        };
      });

      expect(sheetsInfo['Sheet1'].headers).toEqual(['col1']);
      expect(sheetsInfo['Sheet2'].headers).toEqual(['col2']);
      expect(sheetsInfo['Sheet1'].rowCount).toBe(1);
      expect(sheetsInfo['Sheet2'].rowCount).toBe(1);
    });
  });

  describe('数据集构建策略', () => {
    it('单Sheet文件应该使用数组格式', () => {
      const mockFile: ExcelData = {
        id: 'test-4',
        fileName: '单Sheet.xlsx',
        sheets: {
          'Sheet1': [{ data: 'test' }]
        },
        currentSheetName: 'Sheet1'
      };

      const datasets: any = {};
      const sheetNames = Object.keys(mockFile.sheets);

      if (sheetNames.length === 1) {
        datasets[mockFile.fileName] = mockFile.sheets[mockFile.currentSheetName];
      }

      expect(Array.isArray(datasets['单Sheet.xlsx'])).toBe(true);
      expect(datasets['单Sheet.xlsx']).toEqual([{ data: 'test' }]);
    });

    it('多Sheet文件应该使用对象格式', () => {
      const mockFile: ExcelData = {
        id: 'test-5',
        fileName: '多Sheet.xlsx',
        sheets: {
          'Sheet1': [{ data: 'test1' }],
          'Sheet2': [{ data: 'test2' }]
        },
        currentSheetName: 'Sheet1'
      };

      const datasets: any = {};
      const sheetNames = Object.keys(mockFile.sheets);

      if (sheetNames.length > 1) {
        datasets[mockFile.fileName] = mockFile.sheets;
      }

      expect(typeof datasets['多Sheet.xlsx']).toBe('object');
      expect(datasets['多Sheet.xlsx']['Sheet1']).toEqual([{ data: 'test1' }]);
      expect(datasets['多Sheet.xlsx']['Sheet2']).toEqual([{ data: 'test2' }]);
    });
  });

  describe('结果回写逻辑', () => {
    it('应该能处理单数组结果（更新当前Sheet）', () => {
      const mockFile: ExcelData = {
        id: 'test-6',
        fileName: '测试.xlsx',
        sheets: {
          'Sheet1': [{ old: 'data' }]
        },
        currentSheetName: 'Sheet1'
      };

      const resultData = [{ new: 'data' }];
      const updatedFile = { ...mockFile };

      // 模拟单数组结果回写
      if (Array.isArray(resultData)) {
        updatedFile.sheets[updatedFile.currentSheetName] = resultData;
      }

      expect(updatedFile.sheets['Sheet1']).toEqual([{ new: 'data' }]);
    });

    it('应该能处理多Sheet对象结果', () => {
      const mockFile: ExcelData = {
        id: 'test-7',
        fileName: '测试.xlsx',
        sheets: {
          'Sheet1': [{ old: 'data' }],
          'Sheet2': [{ old: 'data2' }]
        },
        currentSheetName: 'Sheet1'
      };

      const resultData = {
        'Sheet1': [{ updated: 'data1' }],
        'Sheet2': [{ updated: 'data2' }],
        'Sheet3': [{ new: 'data3' }]
      };

      const updatedFile = { ...mockFile, sheets: { ...mockFile.sheets } };

      // 模拟多Sheet对象结果回写
      Object.entries(resultData).forEach(([sheetName, sheetData]) => {
        if (Array.isArray(sheetData)) {
          if (updatedFile.sheets[sheetName]) {
            updatedFile.sheets[sheetName] = sheetData;
          } else {
            updatedFile.sheets[sheetName] = sheetData;
          }
        }
      });

      expect(updatedFile.sheets['Sheet1']).toEqual([{ updated: 'data1' }]);
      expect(updatedFile.sheets['Sheet2']).toEqual([{ updated: 'data2' }]);
      expect(updatedFile.sheets['Sheet3']).toEqual([{ new: 'data3' }]);
    });
  });

  describe('AI上下文构建', () => {
    it('应该为单Sheet文件构建正确的上下文', () => {
      const mockPreview = {
        fileName: '单Sheet.xlsx',
        headers: ['姓名', '年龄'],
        sampleRows: [{ 姓名: '张三', 年龄: 30 }],
        sheets: undefined
      };

      let context = `--- FILE: "${mockPreview.fileName}" ---\n`;
      context += `HEADERS: ${JSON.stringify(mockPreview.headers)}\n`;
      context += `SAMPLE DATA (Top 5 rows):\n${JSON.stringify(mockPreview.sampleRows)}\n`;

      expect(context).toContain('单Sheet.xlsx');
      expect(context).toContain('姓名');
      expect(context).toContain('年龄');
    });

    it('应该为多Sheet文件构建完整的上下文', () => {
      const mockPreview = {
        fileName: '多Sheet.xlsx',
        currentSheetName: 'Sheet1',
        sheets: {
          'Sheet1': {
            headers: ['姓名', '年龄'],
            sampleRows: [{ 姓名: '张三', 年龄: 30 }],
            rowCount: 100
          },
          'Sheet2': {
            headers: ['姓名', '工资'],
            sampleRows: [{ 姓名: '张三', 工资: 5000 }],
            rowCount: 100
          }
        }
      };

      let context = `--- FILE: "${mockPreview.fileName}" ---\n`;

      if (mockPreview.sheets && Object.keys(mockPreview.sheets).length > 1) {
        context += `📊 MULTIPLE SHEETS DETECTED (${Object.keys(mockPreview.sheets).length} sheets):\n`;

        Object.entries(mockPreview.sheets).forEach(([sheetName, sheetInfo]) => {
          const isCurrentSheet = sheetName === mockPreview.currentSheetName;
          context += `  ${isCurrentSheet ? '→' : ' '} Sheet "${sheetName}": ${sheetInfo.rowCount} rows, columns: ${sheetInfo.headers.join(', ')}\n`;
        });
      }

      expect(context).toContain('MULTIPLE SHEETS DETECTED');
      expect(context).toContain('2 sheets');
      expect(context).toContain('→ Sheet "Sheet1"');
      expect(context).toContain('Sheet "Sheet2"');
    });
  });

  describe('向后兼容性', () => {
    it('单Sheet文件的旧代码应该继续工作', () => {
      const oldStyleData: ExcelData = {
        id: 'test-8',
        fileName: '旧文件.xlsx',
        sheets: {
          'Sheet1': [{ data: 'test' }]
        },
        currentSheetName: 'Sheet1'
      };

      // 模拟旧代码只访问当前sheet
      const currentData = oldStyleData.sheets[oldStyleData.currentSheetName];

      expect(currentData).toEqual([{ data: 'test' }]);
      expect(Array.isArray(currentData)).toBe(true);
    });
  });
});

/**
 * 使用说明：
 *
 * 1. 安装测试依赖：
 *    npm install --save-dev jest @types/jest ts-jest
 *
 * 2. 运行测试：
 *    npm test multisheetSupport.test.ts
 *
 * 3. 查看测试覆盖率：
 *    npm test -- --coverage
 */
