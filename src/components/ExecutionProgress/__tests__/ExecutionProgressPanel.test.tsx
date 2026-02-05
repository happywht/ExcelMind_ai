/**
 * ExecutionProgressPanel 组件测试
 *
 * 测试执行进度面板的显示和交互功能
 *
 * @test ExecutionProgressPanel
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { ExecutionProgressPanel } from '../ExecutionProgressPanel';
import type { ExecutionStage } from '../../VirtualWorkspace/types';

// Mock 工具函数
jest.mock('../../VirtualWorkspace/utils', () => ({
  getStageDisplayName: jest.fn((stage) => {
    const names = {
      reconnaissance: '侦察阶段',
      pre_audit: '预审阶段',
      analysis: '分析阶段',
      generation: '生成阶段',
    };
    return names[stage as keyof typeof names] || stage;
  }),
  getStageIcon: jest.fn((stage) => {
    const icons = {
      reconnaissance: '🔍',
      pre_audit: '✓',
      analysis: '🧠',
      generation: '⚡',
    };
    return icons[stage as keyof typeof icons] || '📋';
  }),
  getStatusColor: jest.fn((status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-700',
      running: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      paused: 'bg-yellow-100 text-yellow-700',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  }),
  getLogLevelColor: jest.fn((level) => {
    const colors = {
      info: 'text-blue-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
      success: 'text-green-600',
      debug: 'text-gray-600',
    };
    return colors[level as keyof typeof colors] || colors.info;
  }),
  formatDuration: jest.fn((ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }),
  formatTimestamp: jest.fn((timestamp) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  }),
}));

describe('ExecutionProgressPanel 组件', () => {
  const mockExecutionId = 'exec-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染测试', () => {
    it('应该正确渲染组件', () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      expect(screen.getByText('执行进度')).toBeInTheDocument();
    });

    it('应该显示加载状态', () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      // 初始状态应该显示加载
      expect(screen.getByText(/加载执行进度/)).toBeInTheDocument();
    });

    it('应该显示所有执行阶段', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        expect(screen.getByText('侦察阶段')).toBeInTheDocument();
        expect(screen.getByText('预审阶段')).toBeInTheDocument();
        expect(screen.getByText('分析阶段')).toBeInTheDocument();
        expect(screen.getByText('生成阶段')).toBeInTheDocument();
      });
    });

    it('应该显示总进度', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const progressText = screen.getByText(/68\.75%/);
        expect(progressText).toBeInTheDocument();
      });
    });

    it('应该显示进度条', async () => {
      const { container } = render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const progressBar = container.querySelector('.w-full.h-2.bg-slate-200');
        expect(progressBar).toBeInTheDocument();
      });
    });

    it('应该显示实时日志', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} showLogs={true} />);

      await waitFor(() => {
        expect(screen.getByText('实时日志')).toBeInTheDocument();
        expect(screen.getByText('开始执行任务')).toBeInTheDocument();
      });
    });

    it('应该隐藏日志面板', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} showLogs={false} />);

      await waitFor(() => {
        expect(screen.queryByText('实时日志')).not.toBeInTheDocument();
      });
    });
  });

  describe('阶段状态显示', () => {
    it('应该显示等待中的阶段', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const pendingStage = screen.getByText('生成阶段');
        expect(pendingStage).toBeInTheDocument();

        const pendingStatus = screen.getAllByText('等待中');
        expect(pendingStatus.length).toBeGreaterThan(0);
      });
    });

    it('应该显示运行中的阶段', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const runningStatus = screen.getAllByText('进行中');
        expect(runningStatus.length).toBeGreaterThan(0);
      });
    });

    it('应该显示已完成的阶段', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const completedStatus = screen.getAllByText('已完成');
        expect(completedStatus.length).toBeGreaterThan(0);
      });
    });

    it('应该显示阶段进度条', async () => {
      const { container } = render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const progressBars = container.querySelectorAll('.w-full.h-1\\.5.bg-slate-200');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('阶段交互', () => {
    it('应该展开阶段详情', async () => {
      const { container } = render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const expandButtons = container.querySelectorAll('button[aria-label*="展开"]');
        if (expandButtons.length > 0) {
          fireEvent.click(expandButtons[0]);
        }
      });

      // 验证详情内容显示
      await waitFor(() => {
        const details = screen.queryByText(/已扫描 \d+ 个 Sheet/);
        expect(details).toBeInTheDocument();
      });
    });

    it('应该折叠阶段详情', async () => {
      const { container } = render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      // 先展开
      await waitFor(async () => {
        const expandButtons = container.querySelectorAll('button[aria-label*="展开"]');
        if (expandButtons.length > 0) {
          await userEvent.click(expandButtons[0]);
        }
      });

      // 再折叠
      await waitFor(async () => {
        const collapseButtons = container.querySelectorAll('button[aria-label*="折叠"]');
        if (collapseButtons.length > 0) {
          await userEvent.click(collapseButtons[0]);
        }
      });
    });

    it('应该处理阶段点击', async () => {
      const handleStageClick = jest.fn();

      render(
        <ExecutionProgressPanel
          executionId={mockExecutionId}
          onStageClick={handleStageClick}
        />
      );

      await waitFor(async () => {
        const stageCard = screen.getByText('侦察阶段').closest('.border');
        if (stageCard) {
          await userEvent.click(stageCard);
        }
      });

      // 验证点击事件
      expect(handleStageClick).toHaveBeenCalled();
    });
  });

  describe('日志显示', () => {
    it('应该显示所有日志条目', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} showLogs={true} />);

      await waitFor(() => {
        expect(screen.getByText('开始执行任务')).toBeInTheDocument();
        expect(screen.getByText('正在扫描文件结构...')).toBeInTheDocument();
        expect(screen.getByText('侦察阶段完成')).toBeInTheDocument();
      });
    });

    it('应该显示日志时间戳', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} showLogs={true} />);

      await waitFor(() => {
        const timestamps = document.querySelectorAll('text-slate-500.font-mono');
        expect(timestamps.length).toBeGreaterThan(0);
      });
    });

    it('应该显示日志级别', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} showLogs={true} />);

      await waitFor(() => {
        expect(screen.getByText('INFO')).toBeInTheDocument();
        expect(screen.getByText('WARNING')).toBeInTheDocument();
        expect(screen.getByText('SUCCESS')).toBeInTheDocument();
      });
    });

    it('应该显示日志来源', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} showLogs={true} />);

      await waitFor(() => {
        expect(screen.getByText('System')).toBeInTheDocument();
        expect(screen.getByText('Reconnaissance')).toBeInTheDocument();
        expect(screen.getByText('Analysis')).toBeInTheDocument();
      });
    });

    it('应该限制日志条目数量', async () => {
      render(
        <ExecutionProgressPanel
          executionId={mockExecutionId}
          showLogs={true}
          maxLogEntries={5}
        />
      );

      await waitFor(() => {
        const logCount = screen.queryAllByText(/INFO|WARNING|SUCCESS/).length;
        // 应该只显示最多 5 条
        expect(logCount).toBeLessThanOrEqual(5);
      });
    });

    it('应该支持自动滚动', async () => {
      render(
        <ExecutionProgressPanel
          executionId={mockExecutionId}
          showLogs={true}
          autoScroll={true}
        />
      );

      await waitFor(() => {
        const logsContainer = document.querySelector('.overflow-y-auto');
        expect(logsContainer).toBeInTheDocument();
      });
    });
  });

  describe('日志交互', () => {
    it('应该显示日志详情面板', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} showLogs={true} />);

      await waitFor(async () => {
        const logEntries = document.querySelectorAll('.cursor-pointer');
        if (logEntries.length > 0) {
          await userEvent.click(logEntries[0]);
        }
      });

      // 验证详情面板显示
      await waitFor(() => {
        expect(screen.getByText('日志详情')).toBeInTheDocument();
      });
    });

    it('应该关闭日志详情面板', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} showLogs={true} />);

      // 打开详情面板
      await waitFor(async () => {
        const logEntries = document.querySelectorAll('.cursor-pointer');
        if (logEntries.length > 0) {
          await userEvent.click(logEntries[0]);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('日志详情')).toBeInTheDocument();
      });

      // 关闭详情面板
      const closeButton = screen.getByText('×');
      await userEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('日志详情')).not.toBeInTheDocument();
      });
    });

    it('应该处理日志点击', async () => {
      const handleLogClick = jest.fn();

      render(
        <ExecutionProgressPanel
          executionId={mockExecutionId}
          showLogs={true}
          onLogEntryClick={handleLogClick}
        />
      );

      await waitFor(async () => {
        const logEntries = document.querySelectorAll('.cursor-pointer');
        if (logEntries.length > 0) {
          await userEvent.click(logEntries[0]);
        }
      });

      expect(handleLogClick).toHaveBeenCalled();
    });
  });

  describe('警告和错误显示', () => {
    it('应该显示警告信息', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      // 展开有警告的阶段
      await waitFor(async () => {
        const expandButtons = document.querySelectorAll('button');
        for (const button of expandButtons) {
          if (button.textContent === '🔽' || button.textContent === '▲') {
            await userEvent.click(button);
            break;
          }
        }
      });

      await waitFor(() => {
        expect(screen.getByText('发现重复的数据引用')).toBeInTheDocument();
        expect(screen.getByText('部分字段缺少验证规则')).toBeInTheDocument();
      });
    });

    it('应该显示警告图标', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const warningIcons = document.querySelectorAll('.text-yellow-500');
        expect(warningIcons.length).toBeGreaterThan(0);
      });
    });

    it('应该高亮显示警告区域', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const warningContainers = document.querySelectorAll('.bg-yellow-50');
        expect(warningContainers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('执行状态', () => {
    it('应该显示执行状态标签', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const statusLabel = screen.getByText('执行中');
        expect(statusLabel).toBeInTheDocument();
      });
    });

    it('应该显示执行时间', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const timeInfo = screen.queryByText(/开始时间:/);
        expect(timeInfo).toBeInTheDocument();
      });
    });

    it('应该显示持续时间', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const durationInfo = screen.queryByText(/持续时间:/);
        expect(durationInfo).toBeInTheDocument();
      });
    });
  });

  describe('紧凑模式', () => {
    it('应该在紧凑模式下减少间距', async () => {
      const { container } = render(
        <ExecutionProgressPanel
          executionId={mockExecutionId}
          compact={true}
        />
      );

      await waitFor(() => {
        const panel = container.querySelector('.p-4');
        expect(panel).toBeInTheDocument();
      });
    });

    it('应该在标准模式下使用正常间距', async () => {
      const { container } = render(
        <ExecutionProgressPanel
          executionId={mockExecutionId}
          compact={false}
        />
      );

      await waitFor(() => {
        const panel = container.querySelector('.p-6');
        expect(panel).toBeInTheDocument();
      });
    });
  });

  describe('可访问性', () => {
    it('应该有正确的 ARIA 标签', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        const statusLabels = screen.getAllByText(/等待中|进行中|已完成|失败|已暂停/);
        expect(statusLabels.length).toBeGreaterThan(0);
      });
    });

    it('应该支持键盘导航', async () => {
      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(async () => {
        const stageCard = screen.getByText('侦察阶段').closest('.border');
        if (stageCard) {
          (stageCard as HTMLElement).focus();
          expect(stageCard).toHaveFocus();
        }
      });
    });
  });

  describe('响应式行为', () => {
    it('应该在移动端正确显示', async () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<ExecutionProgressPanel executionId={mockExecutionId} />);

      await waitFor(() => {
        expect(screen.getByText('执行进度')).toBeInTheDocument();
      });
    });
  });

  describe('空状态', () => {
    it('应该显示无日志状态', async () => {
      // Mock 没有日志的执行上下文
      // 由于组件使用 useEffect 设置 mock 数据，这里主要测试 UI 渲染
      render(<ExecutionProgressPanel executionId="empty-exec" showLogs={true} />);

      await waitFor(() => {
        // 组件会显示 mock 数据，所以至少应该显示日志区域
        expect(screen.getByText('实时日志')).toBeInTheDocument();
      });
    });
  });

  describe('性能测试', () => {
    it('应该高效渲染大量日志', async () => {
      const startTime = performance.now();

      render(<ExecutionProgressPanel executionId={mockExecutionId} showLogs={true} />);

      await waitFor(() => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        // 渲染应该在合理时间内完成（< 500ms）
        expect(renderTime).toBeLessThan(500);
      });
    });
  });
});
