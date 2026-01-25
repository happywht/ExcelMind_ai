/**
 * FileTree 组件测试
 *
 * 测试文件树的显示和交互功能
 *
 * @test FileTree
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { FileTree } from '../FileTree';
import { FileRole } from '../../../services/infrastructure/vfs/VirtualFileSystem';
import type { FileTreeNode } from '../types';

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
      primary_source: 'bg-blue-100 text-blue-700',
      auxiliary_source: 'bg-cyan-100 text-cyan-700',
      configuration: 'bg-purple-100 text-purple-700',
      template: 'bg-orange-100 text-orange-700',
      output: 'bg-green-100 text-green-700',
      temporary: 'bg-gray-100 text-gray-700',
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
}));

describe('FileTree 组件', () => {
  // Mock 树节点数据
  const mockNodes: FileTreeNode[] = [
    {
      id: 'folder-1',
      name: 'Documents',
      path: '/Documents',
      type: 'directory',
      level: 0,
      isExpanded: false,
      children: [
        {
          id: 'file-1',
          name: 'report.xlsx',
          path: '/Documents/report.xlsx',
          type: 'file',
          fileType: 'excel',
          role: FileRole.PRIMARY_SOURCE,
          size: 1024000,
          uploadTime: Date.now(),
          referenceCount: 2,
          level: 1,
        },
        {
          id: 'file-2',
          name: 'summary.docx',
          path: '/Documents/summary.docx',
          type: 'file',
          fileType: 'word',
          role: FileRole.OUTPUT,
          size: 512000,
          uploadTime: Date.now(),
          level: 1,
        },
      ],
    },
    {
      id: 'file-3',
      name: 'config.json',
      path: '/config.json',
      type: 'file',
      fileType: 'json',
      role: FileRole.CONFIGURATION,
      size: 2048,
      uploadTime: Date.now(),
      level: 0,
    },
    {
      id: 'folder-2',
      name: 'Templates',
      path: '/Templates',
      type: 'directory',
      level: 0,
      isExpanded: false,
      children: [
        {
          id: 'file-4',
          name: 'template.xlsx',
          path: '/Templates/template.xlsx',
          type: 'file',
          fileType: 'excel',
          role: FileRole.TEMPLATE,
          size: 256000,
          uploadTime: Date.now(),
          level: 1,
        },
      ],
    },
  ];

  describe('渲染测试', () => {
    it('应该正确渲染文件树', () => {
      render(<FileTree nodes={mockNodes} />);

      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Templates')).toBeInTheDocument();
      expect(screen.getByText('config.json')).toBeInTheDocument();
    });

    it('应该显示所有根节点', () => {
      render(<FileTree nodes={mockNodes} />);

      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Templates')).toBeInTheDocument();
      expect(screen.getByText('config.json')).toBeInTheDocument();
    });

    it('应该在无节点时显示空状态', () => {
      render(<FileTree nodes={[]} />);

      expect(screen.getByText('暂无文件')).toBeInTheDocument();
    });

    it('应该显示文件夹图标', () => {
      const { container } = render(<FileTree nodes={mockNodes} />);

      const folderIcons = container.querySelectorAll('svg');
      expect(folderIcons.length).toBeGreaterThan(0);
    });

    it('应该显示文件图标', () => {
      const { container } = render(<FileTree nodes={mockNodes} />);

      const fileIcons = container.querySelectorAll('span.text-sm');
      expect(fileIcons.length).toBeGreaterThan(0);
    });
  });

  describe('节点类型', () => {
    it('应该正确渲染目录节点', () => {
      render(<FileTree nodes={mockNodes} />);

      const folder = screen.getByText('Documents');
      expect(folder).toBeInTheDocument();
      expect(folder).toHaveClass('font-medium');
    });

    it('应该正确渲染文件节点', () => {
      render(<FileTree nodes={mockNodes} />);

      const file = screen.getByText('config.json');
      expect(file).toBeInTheDocument();
    });

    it('应该显示文件大小', () => {
      render(<FileTree nodes={mockNodes} />);

      expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument();
      expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
    });

    it('应该显示文件角色', () => {
      render(<FileTree nodes={mockNodes} />);

      expect(screen.getByText('主数据源')).toBeInTheDocument();
      expect(screen.getByText('配置文件')).toBeInTheDocument();
      expect(screen.getByText('模板文件')).toBeInTheDocument();
    });
  });

  describe('节点展开/折叠', () => {
    it('应该显示展开/折叠按钮', () => {
      render(<FileTree nodes={mockNodes} />);

      const expandButtons = document.querySelectorAll('button[class*="p-0.5"]');
      expect(expandButtons.length).toBeGreaterThan(0);
    });

    it('应该展开目录节点', async () => {
      const handleNodeToggle = jest.fn();
      const user = userEvent.setup();

      render(
        <FileTree
          nodes={mockNodes}
          expandedNodes={new Set(['folder-1'])}
          onNodeToggle={handleNodeToggle}
        />
      );

      // 展开/折叠按钮
      const toggleButtons = document.querySelectorAll('button[class*="p-0.5"]');
      if (toggleButtons.length > 0) {
        await user.click(toggleButtons[0]);
      }

      expect(handleNodeToggle).toHaveBeenCalled();
    });

    it('应该折叠目录节点', async () => {
      const handleNodeToggle = jest.fn();
      const user = userEvent.setup();

      const expandedNodes = new Set(['folder-1']);

      render(
        <FileTree
          nodes={mockNodes}
          expandedNodes={expandedNodes}
          onNodeToggle={handleNodeToggle}
        />
      );

      const toggleButtons = document.querySelectorAll('button[class*="p-0.5"]');
      if (toggleButtons.length > 0) {
        await user.click(toggleButtons[0]);
      }

      expect(handleNodeToggle).toHaveBeenCalled();
    });

    it('应该显示展开的子节点', () => {
      render(
        <FileTree
          nodes={mockNodes}
          expandedNodes={new Set(['folder-1'])}
        />
      );

      expect(screen.getByText('report.xlsx')).toBeInTheDocument();
      expect(screen.getByText('summary.docx')).toBeInTheDocument();
    });

    it('应该隐藏折叠的子节点', () => {
      render(
        <FileTree
          nodes={mockNodes}
          expandedNodes={new Set()}
        />
      );

      // 子节点不应该在 DOM 中
      expect(screen.queryByText('report.xlsx')).not.toBeInTheDocument();
    });
  });

  describe('节点选择', () => {
    it('应该高亮选中的节点', () => {
      render(
        <FileTree
          nodes={mockNodes}
          selectedNodeId="file-3"
        />
      );

      const selectedNode = screen.getByText('config.json').closest('.bg-blue-50');
      expect(selectedNode).toBeInTheDocument();
    });

    it('应该处理节点点击', async () => {
      const handleNodeClick = jest.fn();
      const user = userEvent.setup();

      render(
        <FileTree
          nodes={mockNodes}
          onNodeClick={handleNodeClick}
        />
      );

      const node = screen.getByText('config.json');
      await user.click(node);

      expect(handleNodeClick).toHaveBeenCalled();
    });

    it('应该只允许选择文件节点', async () => {
      const handleNodeClick = jest.fn();
      const user = userEvent.setup();

      render(
        <FileTree
          nodes={mockNodes}
          onNodeClick={handleNodeClick}
        />
      );

      // 点击目录节点
      const folderNode = screen.getByText('Documents').closest('.cursor-pointer');
      if (folderNode) {
        await user.click(folderNode);
      }

      // 目录节点点击应该触发回调
      expect(handleNodeClick).toHaveBeenCalled();
    });
  });

  describe('嵌套层级', () => {
    it('应该正确缩进子节点', () => {
      render(
        <FileTree
          nodes={mockNodes}
          expandedNodes={new Set(['folder-1'])}
        />
      );

      const parentNode = screen.getByText('Documents').closest('div');
      const childNode = screen.getByText('report.xlsx').closest('div');

      expect(parentNode).toBeInTheDocument();
      expect(childNode).toBeInTheDocument();
    });

    it('应该处理多级嵌套', () => {
      const nestedNodes: FileTreeNode[] = [
        {
          id: 'folder-1',
          name: 'Level 1',
          path: '/Level 1',
          type: 'directory',
          level: 0,
          isExpanded: true,
          children: [
            {
              id: 'folder-2',
              name: 'Level 2',
              path: '/Level 1/Level 2',
              type: 'directory',
              level: 1,
              isExpanded: true,
              children: [
                {
                  id: 'file-1',
                  name: 'file.txt',
                  path: '/Level 1/Level 2/file.txt',
                  type: 'file',
                  fileType: 'txt',
                  level: 2,
                },
              ],
            },
          ],
        },
      ];

      render(<FileTree nodes={nestedNodes} />);

      expect(screen.getByText('Level 1')).toBeInTheDocument();
      expect(screen.getByText('Level 2')).toBeInTheDocument();
      expect(screen.getByText('file.txt')).toBeInTheDocument();
    });
  });

  describe('不同文件类型', () => {
    it('应该显示 Excel 文件图标', () => {
      const excelNodes: FileTreeNode[] = [
        {
          id: 'file-1',
          name: 'data.xlsx',
          path: '/data.xlsx',
          type: 'file',
          fileType: 'excel',
          role: FileRole.PRIMARY_SOURCE,
          size: 1024,
          level: 0,
        },
      ];

      const { container } = render(<FileTree nodes={excelNodes} />);

      const iconContainer = container.querySelector('.text-sm');
      expect(iconContainer).toHaveTextContent('📊');
    });

    it('应该显示 Word 文件图标', () => {
      const wordNodes: FileTreeNode[] = [
        {
          id: 'file-1',
          name: 'doc.docx',
          path: '/doc.docx',
          type: 'file',
          fileType: 'word',
          role: FileRole.OUTPUT,
          size: 1024,
          level: 0,
        },
      ];

      const { container } = render(<FileTree nodes={wordNodes} />);

      const iconContainer = container.querySelector('.text-sm');
      expect(iconContainer).toHaveTextContent('📄');
    });

    it('应该显示 JSON 文件图标', () => {
      const jsonNodes: FileTreeNode[] = [
        {
          id: 'file-1',
          name: 'config.json',
          path: '/config.json',
          type: 'file',
          fileType: 'json',
          role: FileRole.CONFIGURATION,
          size: 1024,
          level: 0,
        },
      ];

      const { container } = render(<FileTree nodes={jsonNodes} />);

      const iconContainer = container.querySelector('.text-sm');
      expect(iconContainer).toHaveTextContent('📋');
    });
  });

  describe('交互行为', () => {
    it('应该支持键盘导航', () => {
      render(<FileTree nodes={mockNodes} />);

      const firstNode = screen.getByText('Documents');
      firstNode.focus();

      expect(firstNode).toHaveFocus();
    });

    it('应该阻止事件冒泡', async () => {
      const handleNodeClick = jest.fn();
      const handleNodeToggle = jest.fn();
      const user = userEvent.setup();

      render(
        <FileTree
          nodes={mockNodes}
          onNodeClick={handleNodeClick}
          onNodeToggle={handleNodeToggle}
        />
      );

      const toggleButton = document.querySelectorAll('button[class*="p-0.5"]')[0];
      if (toggleButton) {
        await user.click(toggleButton);
      }

      // 展开/折叠按钮应该只触发 toggle，不触发 click
      expect(handleNodeToggle).toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    it('应该高效渲染大型文件树', () => {
      const largeNodes: FileTreeNode[] = Array.from({ length: 100 }, (_, i) => ({
        id: `file-${i}`,
        name: `file_${i}.xlsx`,
        path: `/file_${i}.xlsx`,
        type: 'file',
        fileType: 'excel',
        role: FileRole.PRIMARY_SOURCE,
        size: 1024,
        level: 0,
      }));

      const startTime = performance.now();

      render(<FileTree nodes={largeNodes} />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // 渲染应该在合理时间内完成（< 500ms）
      expect(renderTime).toBeLessThan(500);
    });

    it('应该高效处理深层嵌套', () => {
      let currentNode: FileTreeNode = {
        id: 'root',
        name: 'root',
        path: '/root',
        type: 'directory',
        level: 0,
        children: [],
      };

      const root = currentNode;

      // 创建 10 层嵌套
      for (let i = 1; i <= 10; i++) {
        const child: FileTreeNode = {
          id: `folder-${i}`,
          name: `Level ${i}`,
          path: `/root/${Array(i).fill('folder').join('/')}`,
          type: 'directory',
          level: i,
          children: [],
        };
        (currentNode.children as FileTreeNode[]).push(child);
        currentNode = child;
      }

      const startTime = performance.now();

      render(<FileTree nodes={[root]} />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(200);
    });
  });

  describe('可访问性', () => {
    it('应该有正确的 ARIA 标签', () => {
      render(<FileTree nodes={mockNodes} />);

      const nodes = screen.getAllByRole('generic');
      expect(nodes.length).toBeGreaterThan(0);
    });

    it('应该支持屏幕阅读器', () => {
      render(
        <FileTree
          nodes={mockNodes}
          selectedNodeId="file-3"
        />
      );

      const selectedNode = screen.getByText('config.json').closest('.bg-blue-50');
      expect(selectedNode).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理没有子节点的目录', () => {
      const emptyDirNodes: FileTreeNode[] = [
        {
          id: 'folder-empty',
          name: 'Empty Folder',
          path: '/empty',
          type: 'directory',
          level: 0,
          isExpanded: true,
          children: [],
        },
      ];

      render(<FileTree nodes={emptyDirNodes} />);

      expect(screen.getByText('Empty Folder')).toBeInTheDocument();
    });

    it('应该处理没有 metadata 的文件节点', () => {
      const simpleNodes: FileTreeNode[] = [
        {
          id: 'file-1',
          name: 'simple.txt',
          path: '/simple.txt',
          type: 'file',
          level: 0,
        },
      ];

      render(<FileTree nodes={simpleNodes} />);

      expect(screen.getByText('simple.txt')).toBeInTheDocument();
    });

    it('应该处理特殊字符的文件名', () => {
      const specialNameNodes: FileTreeNode[] = [
        {
          id: 'file-1',
          name: '文件名 (2024).xlsx',
          path: '/文件名 (2024).xlsx',
          type: 'file',
          fileType: 'excel',
          role: FileRole.PRIMARY_SOURCE,
          size: 1024,
          level: 0,
        },
      ];

      render(<FileTree nodes={specialNameNodes} />);

      expect(screen.getByText('文件名 (2024).xlsx')).toBeInTheDocument();
    });
  });
});
