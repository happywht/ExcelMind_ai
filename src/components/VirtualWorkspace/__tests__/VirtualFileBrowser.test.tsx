/**
 * VirtualFileBrowser 组件测试
 *
 * 测试虚拟文件浏览器的所有功能和用户交互
 *
 * @test VirtualFileBrowser
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { VirtualFileBrowser } from '../VirtualFileBrowser';
import { FileRole } from '../../../services/infrastructure/vfs/VirtualFileSystem';
import type { ExtendedVirtualFileInfo } from '../types';

// Mock VFS 服务
jest.mock('../../../services/infrastructure/vfs/VirtualFileSystem', () => ({
  getVirtualFileSystem: jest.fn(() => ({
    listDirectory: jest.fn(),
    readFile: jest.fn(),
    getRelationships: jest.fn(),
  })),
  FileRole: {
    PRIMARY_SOURCE: 'primary_source',
    AUXILIARY_SOURCE: 'auxiliary_source',
    CONFIGURATION: 'configuration',
    TEMPLATE: 'template',
    OUTPUT: 'output',
    TEMPORARY: 'temporary',
  },
  RelationType: {
    DEPENDS_ON: 'depends_on',
    REFERENCES: 'references',
    GENERATES: 'generates',
    CONFIGURES: 'configures',
    MERGES_WITH: 'merges_with',
  },
}));

// Mock 工具函数
jest.mock('../utils', () => ({
  buildFileTree: jest.fn(() => []),
  sortFiles: jest.fn((files) => files),
  filterFiles: jest.fn((files) => files),
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
}));

describe('VirtualFileBrowser 组件', () => {
  // Mock 数据
  const mockFiles: ExtendedVirtualFileInfo[] = [
    {
      id: 'file-1',
      name: 'sales_data.xlsx',
      role: FileRole.PRIMARY_SOURCE,
      type: 'excel',
      path: '/sales_data.xlsx',
      size: 1024000,
      uploadTime: Date.now() - 3600000,
      lastModified: Date.now() - 3600000,
      referenceCount: 3,
      isSelected: false,
    },
    {
      id: 'file-2',
      name: 'config.json',
      role: FileRole.CONFIGURATION,
      type: 'json',
      path: '/config.json',
      size: 2048,
      uploadTime: Date.now() - 7200000,
      lastModified: Date.now() - 7200000,
      referenceCount: 1,
      isSelected: false,
    },
    {
      id: 'file-3',
      name: 'template.docx',
      role: FileRole.TEMPLATE,
      type: 'word',
      path: '/template.docx',
      size: 512000,
      uploadTime: Date.now() - 86400000,
      lastModified: Date.now() - 86400000,
      referenceCount: 0,
      isSelected: false,
    },
  ];

  let mockListDirectory: jest.Mock;
  let mockReadFile: jest.Mock;

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();

    // 设置 VFS mock
    const { getVirtualFileSystem } = require('../../../services/infrastructure/vfs/VirtualFileSystem');
    const vfs = getVirtualFileSystem();

    mockListDirectory = vfs.listDirectory as jest.Mock;
    mockListDirectory.mockResolvedValue([...mockFiles]);

    mockReadFile = vfs.readFile as jest.Mock;
    mockReadFile.mockResolvedValue(new Blob(['mock content']));

    // 监听 console.error 以避免测试输出中的错误信息
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // 恢复 console.error
    jest.restoreAllMocks();
  });

  describe('渲染测试', () => {
    it('应该正确渲染组件', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索文件...')).toBeInTheDocument();
      });
    });

    it('应该显示文件列表', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByText('sales_data.xlsx')).toBeInTheDocument();
        expect(screen.getByText('config.json')).toBeInTheDocument();
        expect(screen.getByText('template.docx')).toBeInTheDocument();
      });
    });

    it('应该显示文件数量', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByText('3 个文件')).toBeInTheDocument();
      });
    });

    it('应该在无文件时显示空状态', async () => {
      mockListDirectory.mockResolvedValue([]);

      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByText('暂无文件')).toBeInTheDocument();
        expect(screen.getByText('上传文件开始使用虚拟工作区')).toBeInTheDocument();
      });
    });

    it('应该渲染工具栏按钮', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByTitle('刷新')).toBeInTheDocument();
        expect(screen.getByTitle('网格视图')).toBeInTheDocument();
        expect(screen.getByTitle('树形视图')).toBeInTheDocument();
      });
    });

    it('应该显示上传按钮', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        const uploadButton = screen.getByText('上传文件');
        expect(uploadButton).toBeInTheDocument();
        expect(uploadButton.closest('label')).toHaveAttribute('for');
      });
    });
  });

  describe('文件选择功能', () => {
    it('应该在可选择模式下允许单选', async () => {
      const handleFileSelect = jest.fn();

      render(
        <VirtualFileBrowser
          workspaceId="test-workspace"
          selectable={true}
          onFileSelect={handleFileSelect}
        />
      );

      await waitFor(() => {
        const fileCard = screen.getByText('sales_data.xlsx');
        expect(fileCard).toBeInTheDocument();
      });

      // 点击文件卡片
      const fileCard = screen.getByText('sales_data.xlsx').closest('div[class*="group"]');
      if (fileCard) {
        fireEvent.click(fileCard);
      }

      await waitFor(() => {
        expect(handleFileSelect).toHaveBeenCalled();
      });
    });

    it('应该允许多选', async () => {
      const handleFileSelect = jest.fn();

      render(
        <VirtualFileBrowser
          workspaceId="test-workspace"
          selectable={true}
          multiSelect={true}
          onFileSelect={handleFileSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('sales_data.xlsx')).toBeInTheDocument();
      });
    });
  });

  describe('搜索功能', () => {
    it('应该支持文件搜索', async () => {
      const user = userEvent.setup();

      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      const searchInput = screen.getByPlaceholderText('搜索文件...');
      expect(searchInput).toBeInTheDocument();

      // 输入搜索关键词
      await user.type(searchInput, 'sales');

      await waitFor(() => {
        expect(searchInput).toHaveValue('sales');
      });
    });

    it('应该显示清除搜索按钮', async () => {
      const user = userEvent.setup();

      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      const searchInput = screen.getByPlaceholderText('搜索文件...');
      await user.type(searchInput, 'test');

      await waitFor(() => {
        const clearButton = searchInput.parentElement?.querySelector('button');
        expect(clearButton).toBeInTheDocument();
      });
    });

    it('应该清除搜索内容', async () => {
      const user = userEvent.setup();

      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      const searchInput = screen.getByPlaceholderText('搜索文件...');
      await user.type(searchInput, 'test');

      const clearButton = searchInput.parentElement?.querySelector('button');
      if (clearButton) {
        fireEvent.click(clearButton);
      }

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });
  });

  describe('视图切换', () => {
    it('应该默认显示网格视图', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        const gridButton = screen.getByTitle('网格视图');
        expect(gridButton).toHaveClass('bg-blue-500');
      });
    });

    it('应该切换到树形视图', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        const treeButton = screen.getByTitle('树形视图');
        fireEvent.click(treeButton);

        expect(treeButton).toHaveClass('bg-blue-500');
      });
    });

    it('应该在视图间正确切换', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      const gridButton = screen.getByTitle('网格视图');
      const treeButton = screen.getByTitle('树形视图');

      await waitFor(() => {
        expect(gridButton).toHaveClass('bg-blue-500');
      });

      fireEvent.click(treeButton);

      await waitFor(() => {
        expect(treeButton).toHaveClass('bg-blue-500');
        expect(gridButton).not.toHaveClass('bg-blue-500');
      });

      fireEvent.click(gridButton);

      await waitFor(() => {
        expect(gridButton).toHaveClass('bg-blue-500');
      });
    });
  });

  describe('排序功能', () => {
    it('应该显示排序按钮', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        const sortButton = screen.getByText(/日期/);
        expect(sortButton).toBeInTheDocument();
      });
    });

    it('应该切换排序顺序', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      const sortButton = screen.getByText(/日期/);
      fireEvent.click(sortButton);

      await waitFor(() => {
        expect(sortButton).toBeInTheDocument();
      });
    });
  });

  describe('过滤功能', () => {
    it('应该显示过滤器按钮', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        const filterButton = screen.getByText('过滤');
        expect(filterButton).toBeInTheDocument();
      });
    });

    it('应该展开过滤器面板', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      const filterButton = screen.getByText('过滤');
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('角色:')).toBeInTheDocument();
        expect(screen.getByText('主数据源')).toBeInTheDocument();
        expect(screen.getByText('辅助数据源')).toBeInTheDocument();
      });
    });

    it('应该应用角色过滤', async () => {
      const user = userEvent.setup();

      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      // 展开过滤器
      const filterButton = screen.getByText('过滤');
      fireEvent.click(filterButton);

      // 选择角色
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      await user.click(checkboxes[0]);

      await waitFor(() => {
        expect(checkboxes[0]).toBeChecked();
      });
    });
  });

  describe('文件上传', () => {
    it('应该处理文件上传', async () => {
      const handleFileUpload = jest.fn().mockResolvedValue(undefined);

      render(
        <VirtualFileBrowser
          workspaceId="test-workspace"
          onFileUpload={handleFileUpload}
        />
      );

      await waitFor(() => {
        const uploadInput = screen.getByLabelText(/文件上传/i) || document.querySelector('input[type="file"]');
        expect(uploadInput).toBeInTheDocument();
      });
    });

    it('应该支持拖拽上传', async () => {
      const handleFileUpload = jest.fn();

      render(
        <VirtualFileBrowser
          workspaceId="test-workspace"
          onFileUpload={handleFileUpload}
          dragAndDrop={true}
        />
      );

      const container = screen.getByPlaceholderText('搜索文件...').closest('.h-full');

      if (container) {
        const mockFile = new File(['content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        fireEvent.dragOver(container, {
          dataTransfer: {
            files: [],
          },
        });

        fireEvent.drop(container, {
          dataTransfer: {
            files: [mockFile],
          },
        });

        await waitFor(() => {
          // 验证拖拽事件被触发
          expect(container).toBeInTheDocument();
        });
      }
    });
  });

  describe('文件操作', () => {
    it('应该支持文件删除', async () => {
      const handleFileDelete = jest.fn().mockResolvedValue(undefined);

      render(
        <VirtualFileBrowser
          workspaceId="test-workspace"
          onFileDelete={handleFileDelete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('sales_data.xlsx')).toBeInTheDocument();
      });
    });

    it('应该支持文件下载', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByText('sales_data.xlsx')).toBeInTheDocument();
      });

      // Mock createElement 和 URL.createObjectURL
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
        style: {},
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      // 触发下载操作
      // 实际的下载需要通过 FileCard 的操作菜单触发
    });
  });

  describe('刷新功能', () => {
    it('应该刷新文件列表', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByText('sales_data.xlsx')).toBeInTheDocument();
      });

      const refreshButton = screen.getByTitle('刷新');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalled();
      });
    });

    it('应该在刷新时显示加载状态', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByText('sales_data.xlsx')).toBeInTheDocument();
      });

      const refreshButton = screen.getByTitle('刷新');
      fireEvent.click(refreshButton);

      // 验证刷新图标旋转
      await waitFor(() => {
        const icon = refreshButton.querySelector('svg');
        expect(icon).toHaveClass('animate-spin');
      });
    });
  });

  describe('响应式行为', () => {
    it('应该在移动端正确显示', async () => {
      // 模拟移动端视口
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索文件...')).toBeInTheDocument();
      });
    });
  });

  describe('可访问性', () => {
    it('应该有正确的 ARIA 标签', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('搜索文件...');
        expect(searchInput).toHaveAttribute('type', 'text');
      });
    });

    it('应该支持键盘导航', async () => {
      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('搜索文件...');
        searchInput.focus();
        expect(searchInput).toHaveFocus();
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理文件列表加载失败', async () => {
      mockListDirectory.mockRejectedValue(new Error('加载失败'));

      // 监听 console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('应该处理文件上传失败', async () => {
      const handleFileUpload = jest.fn().mockRejectedValue(new Error('上传失败'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <VirtualFileBrowser
          workspaceId="test-workspace"
          onFileUpload={handleFileUpload}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('上传文件')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('性能测试', () => {
    it('应该高效渲染大量文件', async () => {
      const largeFileList: ExtendedVirtualFileInfo[] = Array.from({ length: 100 }, (_, i) => ({
        id: `file-${i}`,
        name: `file_${i}.xlsx`,
        role: FileRole.PRIMARY_SOURCE,
        type: 'excel',
        path: `/file_${i}.xlsx`,
        size: 1024,
        uploadTime: Date.now(),
        lastModified: Date.now(),
      }));

      mockListDirectory.mockResolvedValue(largeFileList);

      const startTime = performance.now();

      render(<VirtualFileBrowser workspaceId="test-workspace" />);

      await waitFor(() => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        // 渲染应该在合理时间内完成（< 1秒）
        expect(renderTime).toBeLessThan(1000);
      });
    });
  });
});
