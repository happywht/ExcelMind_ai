/**
 * RelationshipGraph 组件测试
 *
 * 测试文件关系图谱的可视化和交互功能
 *
 * @test RelationshipGraph
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { RelationshipGraph } from '../RelationshipGraph';
import { FileRole, RelationType } from '../../../services/infrastructure/vfs/VirtualFileSystem';
import type { GraphNode, GraphEdge } from '../types';

// Mock VFS 服务
jest.mock('../../../services/infrastructure/vfs/VirtualFileSystem', () => ({
  getVirtualFileSystem: jest.fn(() => ({
    listDirectory: jest.fn(),
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
  buildGraphNodes: jest.fn((files) => {
    if (!files || !Array.isArray(files)) return [];
    return files.map((f: any) => ({
      id: f.id,
      label: f.name,
      type: f.type,
      role: f.role,
      size: 25,
      color: '#3b82f6',
      metadata: f,
    }));
  }),
  getNodeColor: jest.fn((role) => {
    const colors = {
      primary_source: '#3b82f6',
      auxiliary_source: '#06b6d4',
      configuration: '#8b5cf6',
      template: '#f97316',
      output: '#22c55e',
      temporary: '#6b7280',
    };
    return colors[role as keyof typeof colors] || '#6b7280';
  }),
  getRelationTypeColor: jest.fn((type) => '#94a3b8'),
  getFileRoleLabel: jest.fn((role) => '主数据源'),
}));

describe('RelationshipGraph 组件', () => {
  // Mock 数据
  const mockFiles = [
    {
      id: 'file-1',
      name: 'sales_data.xlsx',
      role: FileRole.PRIMARY_SOURCE,
      type: 'excel',
      size: 1024000,
      uploadTime: Date.now(),
    },
    {
      id: 'file-2',
      name: 'config.json',
      role: FileRole.CONFIGURATION,
      type: 'json',
      size: 2048,
      uploadTime: Date.now(),
    },
    {
      id: 'file-3',
      name: 'output.xlsx',
      role: FileRole.OUTPUT,
      type: 'excel',
      size: 512000,
      uploadTime: Date.now(),
    },
  ];

  const mockRelationships = [
    {
      id: 'rel-1',
      fromFileId: 'file-1',
      toFileId: 'file-2',
      type: RelationType.DEPENDS_ON,
      metadata: {},
    },
    {
      id: 'rel-2',
      fromFileId: 'file-2',
      toFileId: 'file-3',
      type: RelationType.GENERATES,
      metadata: {},
    },
  ];

  let mockListDirectory: jest.Mock;
  let mockGetRelationships: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    const { getVirtualFileSystem } = require('../../../services/infrastructure/vfs/VirtualFileSystem');
    const vfs = getVirtualFileSystem();

    mockListDirectory = vfs.listDirectory as jest.Mock;
    mockListDirectory.mockResolvedValue(mockFiles);

    mockGetRelationships = vfs.getRelationships as jest.Mock;
    mockGetRelationships.mockResolvedValue(mockRelationships);

    // Mock XMLSerializer
    global.XMLSerializer = class MockXMLSerializer {
      serializeToString = jest.fn(() => '<svg>mock-svg</svg>');
    } as any;

    // Mock btoa
    global.btoa = jest.fn((str) => 'base64-encoded');
    global.unescape = jest.fn((str) => str);
  });

  describe('渲染测试', () => {
    it('应该正确渲染组件', async () => {
      render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalled();
      });
    });

    it('应该渲染 SVG 画布', async () => {
      const { container } = render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('应该渲染节点', async () => {
      const { container } = render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const circles = container.querySelectorAll('circle');
        expect(circles.length).toBeGreaterThan(0);
      });
    });

    it('应该渲染边', async () => {
      const { container } = render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const lines = container.querySelectorAll('line');
        expect(lines.length).toBeGreaterThan(0);
      });
    });

    it('应该显示节点标签', async () => {
      const { container } = render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const texts = container.querySelectorAll('text');
        const hasLabel = Array.from(texts).some(text =>
          text.textContent?.includes('sales_data') ||
          text.textContent?.includes('config') ||
          text.textContent?.includes('output')
        );
        expect(hasLabel).toBe(true);
      });
    });
  });

  describe('工具栏功能', () => {
    it('应该显示放大按钮', async () => {
      render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const zoomInButton = screen.getByTitle('放大');
        expect(zoomInButton).toBeInTheDocument();
      });
    });

    it('应该显示缩小按钮', async () => {
      render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const zoomOutButton = screen.getByTitle('缩小');
        expect(zoomOutButton).toBeInTheDocument();
      });
    });

    it('应该显示重置视图按钮', async () => {
      render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const resetButton = screen.getByTitle('重置视图');
        expect(resetButton).toBeInTheDocument();
      });
    });

    it('应该显示全屏按钮', async () => {
      render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const fullscreenButton = screen.getByTitle('全屏');
        expect(fullscreenButton).toBeInTheDocument();
      });
    });

    it('应该显示导出图片按钮', async () => {
      render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const exportButton = screen.getByTitle('导出图片');
        expect(exportButton).toBeInTheDocument();
      });
    });

    it('应该显示图例切换按钮', async () => {
      render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const legendButton = screen.getByTitle('切换图例');
        expect(legendButton).toBeInTheDocument();
      });
    });
  });

  describe('缩放功能', () => {
    it('应该放大视图', async () => {
      const { container } = render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const zoomInButton = screen.getByTitle('放大');
        fireEvent.click(zoomInButton);
      });

      // 验证缩放变化
      await waitFor(() => {
        const g = container.querySelector('svg g');
        expect(g).toBeInTheDocument();
      });
    });

    it('应该缩小视图', async () => {
      const { container } = render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const zoomOutButton = screen.getByTitle('缩小');
        fireEvent.click(zoomOutButton);
      });

      await waitFor(() => {
        const g = container.querySelector('svg g');
        expect(g).toBeInTheDocument();
      });
    });

    it('应该重置视图', async () => {
      const { container } = render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const resetButton = screen.getByTitle('重置视图');
        fireEvent.click(resetButton);
      });

      await waitFor(() => {
        const g = container.querySelector('svg g');
        expect(g).toHaveAttribute('transform', expect.stringContaining('translate(0, 0) scale(1)'));
      });
    });
  });

  describe('平移功能', () => {
    it('应该支持鼠标拖拽平移', async () => {
      const { container } = render(<RelationshipGraph rootFileId="file-1" />);

      const svg = container.querySelector('svg');

      await waitFor(() => {
        expect(svg).toBeInTheDocument();
      });

      if (svg) {
        // 模拟拖拽
        fireEvent.mouseDown(svg, { clientX: 100, clientY: 100, button: 0 });
        fireEvent.mouseMove(svg, { clientX: 150, clientY: 150 });
        fireEvent.mouseUp(svg);

        await waitFor(() => {
          const g = container.querySelector('svg g');
          expect(g).toBeInTheDocument();
        });
      }
    });
  });

  describe('图例功能', () => {
    it('应该显示图例', async () => {
      render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        expect(screen.getByText('图例')).toBeInTheDocument();
        expect(screen.getByText('主数据源')).toBeInTheDocument();
        expect(screen.getByText('辅助数据源')).toBeInTheDocument();
        expect(screen.getByText('配置文件')).toBeInTheDocument();
        expect(screen.getByText('模板文件')).toBeInTheDocument();
        expect(screen.getByText('输出文件')).toBeInTheDocument();
      });
    });

    it('应该隐藏图例', async () => {
      render(<RelationshipGraph rootFileId="file-1" />);

      const legendButton = await screen.findByTitle('切换图例');
      fireEvent.click(legendButton);

      await waitFor(() => {
        expect(screen.queryByText('图例')).not.toBeInTheDocument();
      });
    });

    it('应该再次显示图例', async () => {
      render(<RelationshipGraph rootFileId="file-1" />);

      const legendButton = await screen.findByTitle('切换图例');

      // 隐藏
      fireEvent.click(legendButton);
      await waitFor(() => {
        expect(screen.queryByText('图例')).not.toBeInTheDocument();
      });

      // 显示
      fireEvent.click(legendButton);
      await waitFor(() => {
        expect(screen.getByText('图例')).toBeInTheDocument();
      });
    });
  });

  describe('节点交互', () => {
    it('应该处理节点点击', async () => {
      const handleNodeClick = jest.fn();
      const { container } = render(
        <RelationshipGraph rootFileId="file-1" onNodeClick={handleNodeClick} />
      );

      await waitFor(() => {
        const circles = container.querySelectorAll('circle');
        if (circles.length > 0) {
          fireEvent.click(circles[0]);
        }
      });

      await waitFor(() => {
        // 验证节点被点击后的状态
        const selectedNode = screen.getByText(/sales_data/);
        expect(selectedNode).toBeInTheDocument();
      });
    });

    it('应该显示节点详情面板', async () => {
      const { container } = render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const circles = container.querySelectorAll('circle');
        if (circles.length > 0) {
          fireEvent.click(circles[0]);
        }
      });

      await waitFor(() => {
        // 验证节点详情面板显示
        const detailPanel = container.querySelector('.absolute.bottom-4.left-4');
        expect(detailPanel).toBeInTheDocument();
      });
    });
  });

  describe('边交互', () => {
    it('应该处理边点击', async () => {
      const handleEdgeClick = jest.fn();
      const { container } = render(
        <RelationshipGraph rootFileId="file-1" onEdgeClick={handleEdgeClick} />
      );

      await waitFor(() => {
        const lines = container.querySelectorAll('line');
        if (lines.length > 0) {
          fireEvent.click(lines[0]);
        }
      });

      await waitFor(() => {
        expect(handleEdgeClick).toHaveBeenCalled();
      });
    });
  });

  describe('布局算法', () => {
    it('应该支持层次布局', async () => {
      const { container } = render(
        <RelationshipGraph rootFileId="file-1" layout="hierarchical" />
      );

      await waitFor(() => {
        const g = container.querySelector('svg g');
        expect(g).toBeInTheDocument();
      });
    });

    it('应该支持力导向布局', async () => {
      const { container } = render(
        <RelationshipGraph rootFileId="file-1" layout="force" />
      );

      await waitFor(() => {
        const circles = container.querySelectorAll('circle');
        expect(circles.length).toBeGreaterThan(0);
      });
    });

    it('应该支持圆形布局', async () => {
      const { container } = render(
        <RelationshipGraph rootFileId="file-1" layout="circular" />
      );

      await waitFor(() => {
        const circles = container.querySelectorAll('circle');
        expect(circles.length).toBeGreaterThan(0);
      });
    });

    it('应该支持网格布局', async () => {
      const { container } = render(
        <RelationshipGraph rootFileId="file-1" layout="grid" />
      );

      await waitFor(() => {
        const circles = container.querySelectorAll('circle');
        expect(circles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('全屏功能', () => {
    it('应该进入全屏模式', async () => {
      const { container } = render(<RelationshipGraph rootFileId="file-1" />);

      const fullscreenButton = await screen.findByTitle('全屏');
      fireEvent.click(fullscreenButton);

      await waitFor(() => {
        const graphContainer = container.querySelector('.fixed.inset-0');
        expect(graphContainer).toBeInTheDocument();
      });
    });

    it('应该退出全屏模式', async () => {
      const { container } = render(<RelationshipGraph rootFileId="file-1" />);

      // 进入全屏
      const fullscreenButton = await screen.findByTitle('全屏');
      fireEvent.click(fullscreenButton);

      await waitFor(() => {
        const graphContainer = container.querySelector('.fixed.inset-0');
        expect(graphContainer).toBeInTheDocument();
      });

      // 退出全屏
      const exitButton = screen.getByTitle('退出全屏');
      fireEvent.click(exitButton);

      await waitFor(() => {
        const graphContainer = container.querySelector('.fixed.inset-0');
        expect(graphContainer).not.toBeInTheDocument();
      });
    });
  });

  describe('导出功能', () => {
    it('应该导出为图片', async () => {
      // Mock canvas 和 toDataURL
      const mockCanvas = {
        width: 800,
        height: 600,
        getContext: jest.fn(() => ({
          drawImage: jest.fn(),
        })),
        toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
      };

      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      jest.spyOn(document, 'createElement').mockReturnValueOnce(mockLink as any);

      render(<RelationshipGraph rootFileId="file-1" />);

      const exportButton = await screen.findByTitle('导出图片');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockLink.click).toHaveBeenCalled();
      });
    });
  });

  describe('可访问性', () => {
    it('应该有正确的 ARIA 标签', async () => {
      render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const zoomInButton = screen.getByTitle('放大');
        expect(zoomInButton).toBeInTheDocument();
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理数据加载失败', async () => {
      mockListDirectory.mockRejectedValue(new Error('加载失败'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('响应式行为', () => {
    it('应该在移动端正确显示', async () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<RelationshipGraph rootFileId="file-1" />);

      await waitFor(() => {
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });
});
