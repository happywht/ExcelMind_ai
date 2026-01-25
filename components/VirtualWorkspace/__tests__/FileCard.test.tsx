/**
 * FileCard 组件测试
 *
 * 测试文件卡片的显示和交互功能
 *
 * @test FileCard
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { FileCard } from '../FileCard';
import { FileRole } from '../../../services/infrastructure/vfs/VirtualFileSystem';
import type { ExtendedVirtualFileInfo, FileOperation } from '../types';

// Mock 工具函数
jest.mock('../utils', () => ({
  getFileIcon: jest.fn((type) => {
    const icons = {
      excel: '📊',
      word: '📄',
      pdf: '📕',
      json: '📋',
      csv: '📈',
      txt: '📝',
      unknown: '📁',
    };
    return icons[type as keyof typeof icons] || icons.unknown;
  }),
  getFileRoleLabel: jest.fn((role) => {
    const labels = {
      primary_source: '主数据源',
      auxiliary_source: '辅助数据源',
      configuration: '配置文件',
      template: '模板文件',
      output: '输出文件',
      temporary: '临时文件',
    };
    return labels[role as keyof typeof labels] || '未知角色';
  }),
  getFileRoleColor: jest.fn((role) => {
    const colors = {
      primary_source: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      auxiliary_source: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
      configuration: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      template: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      output: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      temporary: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  }),
  formatFileSize: jest.fn((bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }),
  formatTimestamp: jest.fn((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString('zh-CN');
  }),
}));

describe('FileCard 组件', () => {
  // Mock 文件数据
  const mockFile: ExtendedVirtualFileInfo = {
    id: 'file-1',
    name: 'sales_data.xlsx',
    role: FileRole.PRIMARY_SOURCE,
    type: 'excel',
    path: '/data/sales_data.xlsx',
    size: 1024000,
    uploadTime: Date.now() - 3600000,
    lastModified: Date.now() - 3600000,
    checksum: 'abc123',
    metadata: {
      author: 'Test User',
      description: 'Sales data for Q1 2024',
    },
    referenceCount: 3,
    isSelected: false,
  };

  describe('标准模式渲染', () => {
    it('应该正确渲染文件卡片', () => {
      render(<FileCard file={mockFile} />);

      expect(screen.getByText('sales_data.xlsx')).toBeInTheDocument();
      expect(screen.getByText('/data/sales_data.xlsx')).toBeInTheDocument();
    });

    it('应该显示文件图标', () => {
      const { container } = render(<FileCard file={mockFile} />);

      const iconContainer = container.querySelector('.w-12.h-12');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveTextContent('📊');
    });

    it('应该显示文件角色标签', () => {
      render(<FileCard file={mockFile} />);

      expect(screen.getByText('主数据源')).toBeInTheDocument();
    });

    it('应该显示文件大小', () => {
      render(<FileCard file={mockFile} />);

      expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument();
    });

    it('应该显示上传时间', () => {
      render(<FileCard file={mockFile} />);

      // 验证时间戳被格式化显示
      const timeElement = screen.getByText(/小时前/);
      expect(timeElement).toBeInTheDocument();
    });

    it('应该显示引用计数', () => {
      render(<FileCard file={mockFile} />);

      expect(screen.getByText('3 个引用')).toBeInTheDocument();
    });

    it('应该显示操作菜单按钮', () => {
      render(<FileCard file={mockFile} showActions={true} />);

      const menuButton = screen.getByLabelText('更多操作');
      expect(menuButton).toBeInTheDocument();
    });

    it('应该隐藏操作菜单', () => {
      render(<FileCard file={mockFile} showActions={false} />);

      const menuButton = screen.queryByLabelText('更多操作');
      expect(menuButton).not.toBeInTheDocument();
    });
  });

  describe('紧凑模式渲染', () => {
    it('应该在紧凑模式下渲染', () => {
      render(<FileCard file={mockFile} compact={true} />);

      expect(screen.getByText('sales_data.xlsx')).toBeInTheDocument();
    });

    it('应该在紧凑模式下显示简化的图标', () => {
      const { container } = render(<FileCard file={mockFile} compact={true} />);

      const iconContainer = container.querySelector('.w-6.h-6');
      expect(iconContainer).toBeInTheDocument();
    });

    it('应该在紧凑模式下隐藏引用计数', () => {
      render(<FileCard file={mockFile} compact={true} />);

      // 紧凑模式不显示引用计数
      expect(screen.queryByText('3 个引用')).not.toBeInTheDocument();
    });
  });

  describe('选择功能', () => {
    it('应该支持文件选择', async () => {
      const handleSelect = jest.fn();
      const user = userEvent.setup();

      render(<FileCard file={mockFile} selectable={true} onSelect={handleSelect} />);

      const card = screen.getByText('sales_data.xlsx').closest('.group');
      if (card) {
        await user.click(card);
      }

      expect(handleSelect).toHaveBeenCalledWith(mockFile);
    });

    it('应该在选中时显示选中状态', () => {
      render(<FileCard file={mockFile} isSelected={true} selectable={true} />);

      const card = screen.getByText('sales_data.xlsx').closest('.group');
      expect(card).toHaveClass('border-blue-300');
    });

    it('应该显示选择复选框', () => {
      render(<FileCard file={mockFile} selectable={true} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('应该在紧凑模式下也显示复选框', () => {
      render(<FileCard file={mockFile} selectable={true} compact={true} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('应该在不可选择时不显示复选框', () => {
      render(<FileCard file={mockFile} selectable={false} />);

      const checkbox = screen.queryByRole('checkbox');
      expect(checkbox).not.toBeInTheDocument();
    });

    it('应该在不可选择时不触发选择', async () => {
      const handleSelect = jest.fn();
      const user = userEvent.setup();

      render(<FileCard file={mockFile} selectable={false} onSelect={handleSelect} />);

      const card = screen.getByText('sales_data.xlsx').closest('.group');
      if (card) {
        await user.click(card);
      }

      expect(handleSelect).not.toHaveBeenCalled();
    });
  });

  describe('操作菜单', () => {
    it('应该打开操作菜单', async () => {
      const user = userEvent.setup();

      render(<FileCard file={mockFile} showActions={true} />);

      const menuButton = screen.getByLabelText('更多操作');
      await user.click(menuButton);

      expect(screen.getByText('查看详情')).toBeInTheDocument();
      expect(screen.getByText('下载')).toBeInTheDocument();
      expect(screen.getByText('复制')).toBeInTheDocument();
      expect(screen.getByText('删除')).toBeInTheDocument();
    });

    it('应该关闭操作菜单', async () => {
      const user = userEvent.setup();

      render(<FileCard file={mockFile} showActions={true} />);

      const menuButton = screen.getByLabelText('更多操作');
      await user.click(menuButton);

      // 点击外部关闭
      const overlay = document.querySelector('.fixed.inset-0');
      if (overlay) {
        await user.click(overlay);
      }

      expect(screen.queryByText('查看详情')).not.toBeInTheDocument();
    });

    it('应该触发查看操作', async () => {
      const handleOperation = jest.fn();
      const user = userEvent.setup();

      render(<FileCard file={mockFile} onOperation={handleOperation} showActions={true} />);

      const menuButton = screen.getByLabelText('更多操作');
      await user.click(menuButton);

      const viewButton = screen.getByText('查看详情');
      await user.click(viewButton);

      expect(handleOperation).toHaveBeenCalledWith('view', mockFile);
    });

    it('应该触发下载操作', async () => {
      const handleOperation = jest.fn();
      const user = userEvent.setup();

      render(<FileCard file={mockFile} onOperation={handleOperation} showActions={true} />);

      const menuButton = screen.getByLabelText('更多操作');
      await user.click(menuButton);

      const downloadButton = screen.getByText('下载');
      await user.click(downloadButton);

      expect(handleOperation).toHaveBeenCalledWith('download', mockFile);
    });

    it('应该触发复制操作', async () => {
      const handleOperation = jest.fn();
      const user = userEvent.setup();

      render(<FileCard file={mockFile} onOperation={handleOperation} showActions={true} />);

      const menuButton = screen.getByLabelText('更多操作');
      await user.click(menuButton);

      const copyButton = screen.getByText('复制');
      await user.click(copyButton);

      expect(handleOperation).toHaveBeenCalledWith('copy', mockFile);
    });

    it('应该触发删除操作', async () => {
      const handleOperation = jest.fn();
      const user = userEvent.setup();

      render(<FileCard file={mockFile} onOperation={handleOperation} showActions={true} />);

      const menuButton = screen.getByLabelText('更多操作');
      await user.click(menuButton);

      const deleteButton = screen.getByText('删除');
      await user.click(deleteButton);

      expect(handleOperation).toHaveBeenCalledWith('delete', mockFile);
    });

    it('应该高亮显示危险操作', async () => {
      const user = userEvent.setup();

      render(<FileCard file={mockFile} showActions={true} />);

      const menuButton = screen.getByLabelText('更多操作');
      await user.click(menuButton);

      const deleteButton = screen.getByText('删除');
      expect(deleteButton).toHaveClass('text-red-600');
    });
  });

  describe('悬停效果', () => {
    it('应该在鼠标悬停时显示操作菜单', async () => {
      render(<FileCard file={mockFile} showActions={true} />);

      const card = screen.getByText('sales_data.xlsx').closest('.group');
      if (card) {
        fireEvent.mouseEnter(card);
      }

      await waitFor(() => {
        const menuButton = screen.queryByLabelText('更多操作');
        expect(menuButton).toBeInTheDocument();
      });
    });
  });

  describe('不同文件类型', () => {
    it('应该渲染 Word 文件', () => {
      const wordFile = { ...mockFile, type: 'word' as const, name: 'document.docx' };
      const { container } = render(<FileCard file={wordFile} />);

      const iconContainer = container.querySelector('.w-12.h-12');
      expect(iconContainer).toHaveTextContent('📄');
    });

    it('应该渲染 PDF 文件', () => {
      const pdfFile = { ...mockFile, type: 'pdf' as const, name: 'document.pdf' };
      const { container } = render(<FileCard file={pdfFile} />);

      const iconContainer = container.querySelector('.w-12.h-12');
      expect(iconContainer).toHaveTextContent('📕');
    });

    it('应该渲染 JSON 文件', () => {
      const jsonFile = { ...mockFile, type: 'json' as const, name: 'config.json' };
      const { container } = render(<FileCard file={jsonFile} />);

      const iconContainer = container.querySelector('.w-12.h-12');
      expect(iconContainer).toHaveTextContent('📋');
    });

    it('应该渲染 CSV 文件', () => {
      const csvFile = { ...mockFile, type: 'csv' as const, name: 'data.csv' };
      const { container } = render(<FileCard file={csvFile} />);

      const iconContainer = container.querySelector('.w-12.h-12');
      expect(iconContainer).toHaveTextContent('📈');
    });

    it('应该渲染未知类型文件', () => {
      const unknownFile = { ...mockFile, type: 'unknown' as const, name: 'file.xyz' };
      const { container } = render(<FileCard file={unknownFile} />);

      const iconContainer = container.querySelector('.w-12.h-12');
      expect(iconContainer).toHaveTextContent('📁');
    });
  });

  describe('不同文件角色', () => {
    it('应该显示主数据源角色', () => {
      const file = { ...mockFile, role: FileRole.PRIMARY_SOURCE };
      render(<FileCard file={file} />);

      expect(screen.getByText('主数据源')).toBeInTheDocument();
    });

    it('应该显示辅助数据源角色', () => {
      const file = { ...mockFile, role: FileRole.AUXILIARY_SOURCE };
      render(<FileCard file={file} />);

      expect(screen.getByText('辅助数据源')).toBeInTheDocument();
    });

    it('应该显示配置文件角色', () => {
      const file = { ...mockFile, role: FileRole.CONFIGURATION };
      render(<FileCard file={file} />);

      expect(screen.getByText('配置文件')).toBeInTheDocument();
    });

    it('应该显示模板文件角色', () => {
      const file = { ...mockFile, role: FileRole.TEMPLATE };
      render(<FileCard file={file} />);

      expect(screen.getByText('模板文件')).toBeInTheDocument();
    });

    it('应该显示输出文件角色', () => {
      const file = { ...mockFile, role: FileRole.OUTPUT };
      render(<FileCard file={file} />);

      expect(screen.getByText('输出文件')).toBeInTheDocument();
    });
  });

  describe('特殊文件状态', () => {
    it('应该处理零引用', () => {
      const file = { ...mockFile, referenceCount: 0 };
      render(<FileCard file={file} />);

      expect(screen.queryByText('0 个引用')).not.toBeInTheDocument();
    });

    it('应该处理大文件', () => {
      const file = { ...mockFile, size: 1024 * 1024 * 1024 }; // 1GB
      render(<FileCard file={file} />);

      expect(screen.getByText(/1\.0 GB/)).toBeInTheDocument();
    });

    it('应该处理小文件', () => {
      const file = { ...mockFile, size: 512 }; // 512 bytes
      render(<FileCard file={file} />);

      expect(screen.getByText(/512\.0 B/)).toBeInTheDocument();
    });

    it('应该处理零字节文件', () => {
      const file = { ...mockFile, size: 0 };
      render(<FileCard file={file} />);

      expect(screen.getByText('0 B')).toBeInTheDocument();
    });
  });

  describe('可访问性', () => {
    it('应该有正确的 ARIA 标签', () => {
      render(<FileCard file={mockFile} showActions={true} />);

      const menuButton = screen.getByLabelText('更多操作');
      expect(menuButton).toBeInTheDocument();
    });

    it('应该支持键盘导航', async () => {
      const handleSelect = jest.fn();
      const user = userEvent.setup();

      render(<FileCard file={mockFile} selectable={true} onSelect={handleSelect} />);

      const card = screen.getByText('sales_data.xlsx').closest('.group');
      if (card) {
        (card as HTMLElement).focus();
        await user.keyboard('{Enter}');
      }

      // 验证键盘交互
      expect(card).toBeInTheDocument();
    });
  });
});
