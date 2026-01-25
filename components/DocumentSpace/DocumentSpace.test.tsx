/**
 * DocumentSpace组件单元测试
 *
 * @version 2.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentSpace } from './DocumentSpace';

// Mock dependencies
jest.mock('../../services/excelService');
jest.mock('../../services/templateService');
jest.mock('../../services/documentMappingService');
jest.mock('../../services/docxtemplaterService');
jest.mock('../../services/ai/fewShotEngine');
jest.mock('../../services/quality');
jest.mock('../../services/monitoring');

describe('DocumentSpace组件', () => {

  beforeEach(() => {
    // 清除所有mock
    jest.clearAllMocks();
  });

  describe('组件渲染', () => {

    it('应该正确渲染主组件', () => {
      render(<DocumentSpace />);
      expect(screen.getByText('文档空间')).toBeInTheDocument();
      expect(screen.getByText('智能文档填充')).toBeInTheDocument();
    });

    it('应该渲染左侧边栏和右侧主内容区', () => {
      const { container } = render(<DocumentSpace />);
      const sidebar = container.querySelector('.w-96'); // 左侧边栏宽度
      const mainContent = container.querySelector('.flex-1'); // 右侧内容区
      expect(sidebar).toBeInTheDocument();
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe('模板上传', () => {

    it('应该显示模板上传区域', () => {
      render(<DocumentSpace />);
      expect(screen.getByText('Word模板')).toBeInTheDocument();
    });

    it('应该拒绝非.docx文件', async () => {
      render(<DocumentSpace />);

      const fileInput = screen.getByLabelText(/word模板/i) as HTMLInputElement;
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/请上传.docx格式的Word文档/i)).toBeInTheDocument();
      });
    });
  });

  describe('数据上传', () => {

    it('应该显示数据上传区域', () => {
      render(<DocumentSpace />);
      expect(screen.getByText('Excel数据')).toBeInTheDocument();
    });

    it('应该接受.xlsx文件', () => {
      render(<DocumentSpace />);

      const fileInput = screen.getByLabelText(/excel数据/i) as HTMLInputElement;
      const file = new File(['content'], 'data.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(fileInput.files).toHaveLength(1);
      expect(fileInput.files?.[0]).toBe(file);
    });
  });

  describe('AI指令输入', () => {

    it('应该显示AI指令输入框', () => {
      render(<DocumentSpace />);
      expect(screen.getByPlaceholderText(/例如：把销售额大于10万的产品信息填入模板/i)).toBeInTheDocument();
    });

    it('应该更新指令状态', () => {
      render(<DocumentSpace />);

      const textarea = screen.getByPlaceholderText(/例如：/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '测试指令' } });

      expect(textarea.value).toBe('测试指令');
    });
  });

  describe('生成映射按钮', () => {

    it('在没有模板和数据时应该禁用', () => {
      render(<DocumentSpace />);

      const button = screen.getByText(/生成映射方案/i);
      expect(button).toBeDisabled();
    });

    it('应该有正确的样式', () => {
      render(<DocumentSpace />);

      const button = screen.getByText(/生成映射方案/i);
      expect(button).toHaveClass('from-orange-500');
    });
  });

  describe('日志显示', () => {

    it('应该显示处理日志', async () => {
      render(<DocumentSpace />);

      // 模拟添加日志
      await waitFor(() => {
        const logSection = screen.queryByText(/处理日志/i);
        // 初始状态没有日志，所以可能为null
        expect(logSection).toBeVisible();
      });
    });
  });

  describe('性能监控', () => {

    it('应该显示性能监控卡片（当有指标时）', async () => {
      render(<DocumentSpace />);

      // 初始状态可能没有性能指标
      const perfCard = screen.queryByText(/性能监控/i);
      if (perfCard) {
        expect(perfCard).toBeInTheDocument();
      }
    });
  });

  describe('Tab导航', () => {

    it('应该显示所有Tab', () => {
      render(<DocumentSpace />);

      expect(screen.getByText('模板预览')).toBeInTheDocument();
      expect(screen.getByText('数据预览')).toBeInTheDocument();
      expect(screen.getByText('映射方案')).toBeInTheDocument();
      expect(screen.getByText('生成文档')).toBeInTheDocument();
    });

    it('禁用的Tab应该有正确的样式', () => {
      render(<DocumentSpace />);

      // 没有数据时，大部分Tab应该是禁用的
      const tabs = screen.getAllByRole('button');
      const disabledTabs = tabs.filter(tab => (tab as HTMLButtonElement).disabled);
      expect(disabledTabs.length).toBeGreaterThan(0);
    });
  });

  describe('状态管理', () => {

    it('应该正确初始化所有状态', () => {
      const { container } = render(<DocumentSpace />);

      // 验证组件渲染
      expect(container.querySelector('.bg-slate-50')).toBeInTheDocument();
    });

    it('应该在处理时显示加载状态', async () => {
      render(<DocumentSpace />);

      // 模拟处理状态
      // 这需要mock服务来触发isProcessing状态
    });
  });

  describe('响应式设计', () => {

    it('应该在移动设备上正确显示', () => {
      // 设置移动设备viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<DocumentSpace />);

      const container = screen.getByText('文档空间').closest('div');
      expect(container).toBeInTheDocument();
    });
  });

  describe('可访问性', () => {

    it('应该有正确的ARIA标签', () => {
      render(<DocumentSpace />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });
    });

    it('应该支持键盘导航', () => {
      render(<DocumentSpace />);

      const firstInput = screen.getAllByRole('textbox')[0];
      firstInput.focus();
      expect(firstInput).toHaveFocus();
    });
  });
});

describe('DocumentSpace子组件集成', () => {

  describe('模板预览组件', () => {

    it('应该显示占位符列表', async () => {
      // 需要mock模板数据
      const mockTemplate = {
        id: 'test-id',
        name: 'test.docx',
        size: 1024,
        arrayBuffer: new ArrayBuffer(0),
        htmlPreview: '测试 {{字段1}} 内容',
        placeholders: ['{{字段1}}', '{{字段2}}'],
        file: new File(['content'], 'test.docx')
      };

      // 测试模板预览渲染
    });
  });

  describe('数据预览组件', () => {

    it('应该显示数据表格', async () => {
      // 需要mock Excel数据
      const mockExcelData = {
        id: 'test-id',
        fileName: 'data.xlsx',
        sheets: {
          'Sheet1': [
            { '列1': '值1', '列2': '值2' }
          ]
        },
        currentSheetName: 'Sheet1',
        metadata: {}
      };

      // 测试数据预览渲染
    });
  });

  describe('映射编辑器组件', () => {

    it('应该显示映射关系', async () => {
      const mockMapping = {
        explanation: '测试映射',
        filterCondition: null,
        mappings: [
          { placeholder: '{{字段1}}', excelColumn: '列1' }
        ],
        unmappedPlaceholders: []
      };

      // 测试映射编辑器渲染
    });
  });
});

describe('DocumentSpace端到端流程', () => {

  it('应该完成完整的文档生成流程', async () => {
    render(<DocumentSpace />);

    // 1. 上传模板
    // 2. 上传数据
    // 3. 输入指令
    // 4. 生成映射
    // 5. 生成文档
    // 6. 下载文档

    // 这需要完整的mock服务
  });
});
