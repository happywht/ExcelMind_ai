/**
 * 前端组件渲染性能测试
 * 测试 React 组件的渲染性能
 *
 * @author Performance Tester
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { render, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PerformanceTestRunner } from './PerformanceTestRunner';
import { VirtualFileBrowser } from '../../components/VirtualWorkspace/VirtualFileBrowser';
import { RelationshipGraph } from '../../components/VirtualWorkspace/RelationshipGraph';
import { ExecutionProgressPanel } from '../../components/ExecutionProgress/ExecutionProgressPanel';
import {
  createMockVirtualFile,
  createMockVirtualFileList,
  createMockExecutionContext,
  createMockGraphData,
  asMock
} from '../src/utils/test-helpers';
import { ExtendedVirtualFileInfo, GraphNode, GraphEdge, ExecutionContext } from '../../components/VirtualWorkspace/types';

// 扩展Jest匹配器类型
declare global {
  namespace JestMatchers {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeVisible(): R;
    }
  }
}

describe('前端组件渲染性能测试', () => {
  const runner = new PerformanceTestRunner();

  // 设置性能阈值（毫秒）
  const THRESHOLDS = {
    FILE_BROWSER_RENDER: 100,       // 文件浏览器渲染 < 100ms
    PROGRESS_PANEL_RENDER: 80,      // 进度面板渲染 < 80ms
    GRAPH_RENDER_50: 300,           // 50 节点图渲染 < 300ms
    GRAPH_RENDER_100: 500,          // 100 节点图渲染 < 500ms
    RE_RENDER_TIME: 50,             // 重新渲染时间 < 50ms
    STATE_UPDATE_TIME: 30           // 状态更新时间 < 30ms
  };

  beforeAll(() => {
    runner.setThresholds(THRESHOLDS);
  });

  afterAll(async () => {
    // 生成性能报告
    const fs = await import('fs/promises');
    const path = await import('path');
    const reportDir = path.join(process.cwd(), 'test-results', 'performance');
    await fs.mkdir(reportDir, { recursive: true });

    await runner.saveMarkdownReport(path.join(reportDir, 'component-rendering-report.md'));
    await runner.saveReport(path.join(reportDir, 'component-rendering-data.json'));

    runner.printReport();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * 辅助函数：创建模拟文件数据
   */
  function createMockFiles(count: number): ExtendedVirtualFileInfo[] {
    return createMockVirtualFileList(count);
  }

  /**
   * 辅助函数：创建模拟关系图数据
   */
  function createMockGraphDataLocal(nodeCount: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const data = createMockGraphData(nodeCount, nodeCount - 1);
    return data;
  }

  /**
   * 辅助函数：创建模拟执行进度数据
   */
  function createMockProgress(): ExecutionContext {
    return createMockExecutionContext({
      executionId: 'test-execution',
      totalProgress: 65,
      status: 'running',
      logs: [
        { id: 'log-1', timestamp: Date.now() - 5000, level: 'info', message: '开始执行' },
        { id: 'log-2', timestamp: Date.now() - 4000, level: 'info', message: '上传文件' },
        { id: 'log-3', timestamp: Date.now() - 3000, level: 'info', message: '分析中' }
      ]
    });
  }

  describe('VirtualFileBrowser 渲染性能', () => {
    test('应该在 100ms 内渲染 10 个文件', async () => {
      const mockFiles = createMockFiles(10);

      const { stats } = await runner.measureAverage(
        'file-browser-render-10',
        async () => {
          const { container } = render(
            <VirtualFileBrowser
              workspaceId="test-workspace"
              files={mockFiles}
            />
          );

          await waitFor(() => {
            expect(container.querySelector('[data-testid="file-browser"]')).toBeInTheDocument();
          });
        },
        10,
        { warmup: 2, delay: 50 }
      );

      console.log(`FileBrowser 渲染时间（10 文件）: ${stats.average.toFixed(2)}ms`);
      expect(stats.average).toBeLessThan(THRESHOLDS.FILE_BROWSER_RENDER);
    });

    test('应该在 150ms 内渲染 50 个文件', async () => {
      const mockFiles = createMockFiles(50);

      const { duration } = await runner.measureTime(
        'file-browser-render-50',
        async () => {
          const { container } = render(
            <VirtualFileBrowser
              workspaceId="test-workspace"
              files={mockFiles}
            />
          );

          await waitFor(() => {
            expect(container.querySelector('[data-testid="file-browser"]')).toBeInTheDocument();
          });
        }
      );

      console.log(`FileBrowser 渲染时间（50 文件）: ${duration.toFixed(2)}ms`);

      // 50 个文件允许更长的渲染时间
      expect(duration).toBeLessThan(THRESHOLDS.FILE_BROWSER_RENDER * 1.5);
    });

    test('重新渲染应该快速完成', async () => {
      const initialFiles = createMockFiles(10);
      const updatedFiles = createMockFiles(15);

      const { container, rerender } = render(
        <VirtualFileBrowser
          workspaceId="test-workspace"
          files={initialFiles}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="file-browser"]')).toBeInTheDocument();
      });

      const { duration } = await runner.measureTime(
        'file-browser-rerender',
        async () => {
          rerender(
            <VirtualFileBrowser
              workspaceId="test-workspace"
              files={updatedFiles}
            />
          );
        }
      );

      console.log(`FileBrowser 重新渲染时间: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(THRESHOLDS.RE_RENDER_TIME);
    });
  });

  describe('RelationshipGraph 渲染性能', () => {
    test('应该在 300ms 内渲染 50 个节点', async () => {
      const graphData = createMockGraphDataLocal(50);

      const { stats } = await runner.measureAverage(
        'relationship-graph-render-50',
        async () => {
          const { container } = render(
            <RelationshipGraph
              rootFileId="node-0"
              data={graphData}
              maxDepth={5}
            />
          );

          await waitFor(() => {
            expect(container.querySelector('[data-testid="relationship-graph"]')).toBeInTheDocument();
          });
        },
        5,
        { warmup: 2, delay: 100 }
      );

      console.log(`RelationshipGraph 渲染时间（50 节点）: ${stats.average.toFixed(2)}ms`);
      expect(stats.average).toBeLessThan(THRESHOLDS.GRAPH_RENDER_50);
    });

    test('应该在 500ms 内渲染 100 个节点', async () => {
      const graphData = createMockGraphDataLocal(100);

      const { duration } = await runner.measureTime(
        'relationship-graph-render-100',
        async () => {
          const { container } = render(
            <RelationshipGraph
              rootFileId="node-0"
              data={graphData}
              maxDepth={10}
            />
          );

          await waitFor(() => {
            expect(container.querySelector('[data-testid="relationship-graph"]')).toBeInTheDocument();
          });
        }
      );

      console.log(`RelationshipGraph 渲染时间（100 节点）: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(THRESHOLDS.GRAPH_RENDER_100);
    });

    test('图谱交互响应时间', async () => {
      const graphData = createMockGraphDataLocal(50);

      const { container } = render(
        <RelationshipGraph
          rootFileId="node-0"
          data={graphData}
          maxDepth={5}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="relationship-graph"]')).toBeInTheDocument();
      });

      // 模拟节点点击
      const { duration } = runner.measureTimeSync(
        'graph-node-click',
        () => {
          const node = container.querySelector('[data-node-id="node-1"]');
          if (node) {
            node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        }
      );

      console.log(`图谱节点点击响应时间: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('ExecutionProgressPanel 渲染性能', () => {
    test('应该在 80ms 内完成初始渲染', async () => {
      const mockProgress = createMockProgress();

      const { stats } = await runner.measureAverage(
        'progress-panel-render',
        async () => {
          const { container } = render(
            <ExecutionProgressPanel
              executionId="test-execution"
              progress={mockProgress}
              showLogs
            />
          );

          await waitFor(() => {
            expect(container.querySelector('[data-testid="execution-progress"]')).toBeInTheDocument();
          });
        },
        10,
        { warmup: 2, delay: 50 }
      );

      console.log(`ExecutionProgressPanel 渲染时间: ${stats.average.toFixed(2)}ms`);
      expect(stats.average).toBeLessThan(THRESHOLDS.PROGRESS_PANEL_RENDER);
    });

    test('进度更新应该快速响应', async () => {
      const initialProgress = createMockProgress();
      const updatedProgress = { ...initialProgress, progress: 75, currentStep: '生成结果' };

      const { container, rerender } = render(
        <ExecutionProgressPanel
          executionId="test-execution"
          progress={initialProgress}
          showLogs
        />
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="execution-progress"]')).toBeInTheDocument();
      });

      const { duration } = await runner.measureTime(
        'progress-panel-update',
        async () => {
          rerender(
            <ExecutionProgressPanel
              executionId="test-execution"
              progress={updatedProgress}
              showLogs
            />
          );
        }
      );

      console.log(`进度更新时间: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(THRESHOLDS.STATE_UPDATE_TIME);
    });

    test('日志更新性能', async () => {
      const initialProgress = createMockProgress();
      const updatedProgress = createMockExecutionContext({
        ...initialProgress,
        logs: [
          ...initialProgress.logs,
          { id: 'log-new', timestamp: Date.now(), level: 'info', message: '新日志' }
        ]
      });

      const { container, rerender } = render(
        <ExecutionProgressPanel
          executionId="test-execution"
          progress={initialProgress}
          showLogs
        />
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="execution-progress"]')).toBeInTheDocument();
      });

      const { duration } = await runner.measureTime(
        'progress-logs-update',
        async () => {
          rerender(
            <ExecutionProgressPanel
              executionId="test-execution"
              progress={updatedProgress}
              showLogs
            />
          );
        }
      );

      console.log(`日志更新时间: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(THRESHOLDS.STATE_UPDATE_TIME);
    });
  });

  describe('组件交互性能测试', () => {
    test('文件选择操作响应时间', async () => {
      const mockFiles = createMockFiles(10);

      const { container } = render(
        <VirtualFileBrowser
          workspaceId="test-workspace"
          files={mockFiles}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="file-browser"]')).toBeInTheDocument();
      });

      const { duration } = runner.measureTimeSync(
        'file-selection',
        () => {
          const checkbox = container.querySelector('[data-file-id="file-0"] input[type="checkbox"]');
          if (checkbox) {
            checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        }
      );

      console.log(`文件选择响应时间: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(20);
    });

    test('滚动性能测试', async () => {
      const mockFiles = createMockFiles(100);

      const { container } = render(
        <VirtualFileBrowser
          workspaceId="test-workspace"
          files={mockFiles}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="file-browser"]')).toBeInTheDocument();
      });

      const { duration } = runner.measureTimeSync(
        'file-list-scroll',
        () => {
          const list = container.querySelector('[data-testid="file-list"]');
          if (list) {
            list.dispatchEvent(new WheelEvent('wheel', { deltaY: 500 }));
          }
        }
      );

      console.log(`滚动响应时间: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(30);
    });
  });

  describe('内存使用性能测试', () => {
    test('频繁渲染不应该导致内存泄漏', async () => {
      const mockFiles = createMockFiles(20);

      const initialMemory = process.memoryUsage().heapUsed;

      // 渲染 50 次
      for (let i = 0; i < 50; i++) {
        const { container } = render(
          <VirtualFileBrowser
            workspaceId="test-workspace"
            files={mockFiles}
          />
        );

        await waitFor(() => {
          expect(container.querySelector('[data-testid="file-browser"]')).toBeInTheDocument();
        });

        cleanup();
      }

      // 强制 GC（如果可用）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = (finalMemory - initialMemory) / 1024 / 1024; // MB

      console.log(`内存增长: ${memoryDelta.toFixed(2)}MB`);

      // 内存增长应该 < 50MB
      expect(memoryDelta).toBeLessThan(50);
    });
  });

  describe('复杂场景性能测试', () => {
    test('多个组件同时渲染性能', async () => {
      const mockFiles = createMockFiles(20);
      const graphData = createMockGraphDataLocal(30);
      const mockProgress = createMockProgress();

      const { duration } = await runner.measureTime(
        'multiple-components-render',
        async () => {
          const { container } = render(
            <>
              <VirtualFileBrowser
                workspaceId="test-workspace"
                files={mockFiles}
              />
              <RelationshipGraph
                rootFileId="node-0"
                data={graphData}
                maxDepth={5}
              />
              <ExecutionProgressPanel
                executionId="test-execution"
                progress={mockProgress}
                showLogs
              />
            </>
          );

          await waitFor(() => {
            expect(container.querySelector('[data-testid="file-browser"]')).toBeInTheDocument();
            expect(container.querySelector('[data-testid="relationship-graph"]')).toBeInTheDocument();
            expect(container.querySelector('[data-testid="execution-progress"]')).toBeInTheDocument();
          });
        }
      );

      console.log(`多组件渲染时间: ${duration.toFixed(2)}ms`);

      // 多组件渲染应该合理
      expect(duration).toBeLessThan(THRESHOLDS.FILE_BROWSER_RENDER * 3);
    });
  });
});
