/**
 * 映射编辑器单元测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MappingEditor } from './MappingEditor';
import { MappingScheme } from '../../types/documentTypes';

describe('MappingEditor', () => {
  const mockMappingScheme: MappingScheme = {
    explanation: '测试映射方案',
    filterCondition: null,
    primarySheet: 'Sheet1',
    mappings: [
      {
        placeholder: '{{产品名称}}',
        excelColumn: '产品名称'
      },
      {
        placeholder: '{{销售额}}',
        excelColumn: '销售额',
        transform: 'Number(value).toFixed(2)'
      }
    ],
    unmappedPlaceholders: ['{{库存}}']
  };

  const mockExcelInfo = {
    headers: ['产品名称', '销售额', '库存'],
    sheets: ['Sheet1'],
    sampleData: [
      { '产品名称': 'iPhone', '销售额': 9999, '库存': 100 }
    ]
  };

  const mockTemplateInfo = {
    placeholders: ['{{产品名称}}', '{{销售额}}', '{{库存}}']
  };

  it('应该正确渲染映射编辑器', () => {
    render(
      <MappingEditor
        mappingScheme={mockMappingScheme}
        excelInfo={mockExcelInfo}
        templateInfo={mockTemplateInfo}
      />
    );

    expect(screen.getByText('字段映射编辑器')).toBeInTheDocument();
    expect(screen.getByText('2 个映射')).toBeInTheDocument();
    expect(screen.getByText('1 个未映射')).toBeInTheDocument();
  });

  it('应该显示所有映射关系', () => {
    render(
      <MappingEditor
        mappingScheme={mockMappingScheme}
        excelInfo={mockExcelInfo}
        templateInfo={mockTemplateInfo}
      />
    );

    expect(screen.getByText('{{产品名称}}')).toBeInTheDocument();
    expect(screen.getByText('{{销售额}}')).toBeInTheDocument();
    expect(screen.getByText('产品名称')).toBeInTheDocument();
    expect(screen.getByText('销售额')).toBeInTheDocument();
  });

  it('应该调用onChange回调', async () => {
    const handleChange = jest.fn();
    render(
      <MappingEditor
        mappingScheme={mockMappingScheme}
        excelInfo={mockExcelInfo}
        templateInfo={mockTemplateInfo}
        onChange={handleChange}
      />
    );

    // 触发映射变更
    const newMapping: MappingScheme = {
      ...mockMappingScheme,
      mappings: [
        ...mockMappingScheme.mappings,
        { placeholder: '{{库存}}', excelColumn: '库存' }
      ]
    };

    // 这里需要通过实际交互来触发onChange
    // 例如点击添加映射按钮等
  });

  it('应该在只读模式下禁用编辑功能', () => {
    render(
      <MappingEditor
        mappingScheme={mockMappingScheme}
        excelInfo={mockExcelInfo}
        templateInfo={mockTemplateInfo}
        config={{ readonly: true }}
      />
    );

    // 检查编辑相关的按钮是否被禁用
    const addButton = screen.queryByText('+ 添加映射');
    expect(addButton).not.toBeInTheDocument();
  });

  it('应该正确显示未映射字段面板', async () => {
    render(
      <MappingEditor
        mappingScheme={mockMappingScheme}
        excelInfo={mockExcelInfo}
        templateInfo={mockTemplateInfo}
      />
    );

    // 点击显示未映射字段按钮
    const showButton = screen.getByText('显示未映射字段');
    fireEvent.click(showButton);

    await waitFor(() => {
      expect(screen.getByText('{{库存}}')).toBeInTheDocument();
    });
  });

  it('应该调用AI自动映射回调', async () => {
    const handleAutoMap = jest.fn().mockResolvedValue(mockMappingScheme);
    render(
      <MappingEditor
        mappingScheme={mockMappingScheme}
        excelInfo={mockExcelInfo}
        templateInfo={mockTemplateInfo}
        onAutoMap={handleAutoMap}
      />
    );

    const autoMapButton = screen.getByText('AI自动映射');
    fireEvent.click(autoMapButton);

    await waitFor(() => {
      expect(handleAutoMap).toHaveBeenCalled();
    });
  });

  it('应该验证映射方案', async () => {
    const handleValidate = jest.fn().mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
      unmappedCount: 1,
      mappedCount: 2
    });

    render(
      <MappingEditor
        mappingScheme={mockMappingScheme}
        excelInfo={mockExcelInfo}
        templateInfo={mockTemplateInfo}
        onValidate={handleValidate}
      />
    );

    const validateButton = screen.getByText('验证映射');
    fireEvent.click(validateButton);

    await waitFor(() => {
      expect(handleValidate).toHaveBeenCalled();
    });
  });

  it('应该隐藏预览当showPreview为false时', () => {
    render(
      <MappingEditor
        mappingScheme={mockMappingScheme}
        excelInfo={mockExcelInfo}
        templateInfo={mockTemplateInfo}
        config={{ showPreview: false }}
      />
    );

    expect(screen.queryByText('映射预览')).not.toBeInTheDocument();
  });

  it('应该显示AI建议信息', () => {
    render(
      <MappingEditor
        mappingScheme={mockMappingScheme}
        excelInfo={mockExcelInfo}
        templateInfo={mockTemplateInfo}
        aiInfo={{
          explanation: '测试AI说明',
          confidence: 0.95
        }}
      />
    );

    expect(screen.getByText('AI 映射说明')).toBeInTheDocument();
    expect(screen.getByText('测试AI说明')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });
});

describe('TransformEditor', () => {
  it('应该应用预设转换函数', () => {
    // 这里需要单独测试TransformEditor组件
    // 或者将其作为子组件进行测试
  });

  it('应该验证自定义JavaScript表达式', () => {
    // 测试语法验证功能
  });

  it('应该显示转换预览', () => {
    // 测试预览功能
  });
});

describe('MappingValidator', () => {
  it('应该检测未映射的必填占位符', () => {
    // 测试验证逻辑
  });

  it('应该检测不存在的Excel列', () => {
    // 测试Excel列验证
  });

  it('应该检测转换函数语法错误', () => {
    // 测试转换函数验证
  });
});

describe('UnmappedPanel', () => {
  it('应该显示未映射的占位符和列', () => {
    // 测试未映射字段显示
  });

  it('应该支持快速映射', () => {
    // 测试快速映射功能
  });
});
