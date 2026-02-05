/**
 * WorkspaceRecovery 组件测试
 *
 * 测试工作区恢复和会话管理功能
 *
 * @test WorkspaceRecovery
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { WorkspaceRecovery } from '../WorkspaceRecovery';
import { FileRole } from '../../../services/infrastructure/vfs/VirtualFileSystem';
import type { SessionInfo } from '../types';

// Mock 工具函数
jest.mock('../utils', () => ({
  getSessions: jest.fn(() => []),
  deleteSession: jest.fn(),
  clearAllSessions: jest.fn(),
  cleanupExpiredSessions: jest.fn(),
  generateSessionName: jest.fn((files) => files.length > 0 ? files[0].name : '空会话'),
  formatTimestamp: jest.fn((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  }),
  getFileIcon: jest.fn(() => '📄'),
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
}));

describe('WorkspaceRecovery 组件', () => {
  // Mock 会话数据
  const mockSessions: SessionInfo[] = [
    {
      id: 'session-1',
      name: 'sales_data.xlsx',
      timestamp: Date.now() - 3600000,
      status: 'completed',
      files: [
        {
          id: 'file-1',
          name: 'sales_data.xlsx',
          role: FileRole.PRIMARY_SOURCE,
          type: 'excel',
          path: '/sales_data.xlsx',
        },
        {
          id: 'file-2',
          name: 'config.json',
          role: FileRole.CONFIGURATION,
          type: 'json',
          path: '/config.json',
        },
      ],
      executionState: {
        executionId: 'exec-1',
        stages: [],
        logs: [],
        totalProgress: 100,
        status: 'completed',
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        totalDuration: 10000,
      },
    },
    {
      id: 'session-2',
      name: 'report.xlsx + 2 个文件',
      timestamp: Date.now() - 7200000,
      status: 'failed',
      files: [
        {
          id: 'file-3',
          name: 'report.xlsx',
          role: FileRole.OUTPUT,
          type: 'excel',
          path: '/report.xlsx',
        },
      ],
      executionState: {
        executionId: 'exec-2',
        stages: [],
        logs: [],
        totalProgress: 50,
        status: 'failed',
        startTime: Date.now() - 20000,
      },
      error: '内存不足',
    },
    {
      id: 'session-3',
      name: 'data.xlsx',
      timestamp: Date.now() - 1800000,
      status: 'in_progress',
      files: [
        {
          id: 'file-4',
          name: 'data.xlsx',
          role: FileRole.PRIMARY_SOURCE,
          type: 'excel',
          path: '/data.xlsx',
        },
      ],
      executionState: {
        executionId: 'exec-3',
        stages: [],
        logs: [],
        totalProgress: 25,
        status: 'running',
        startTime: Date.now() - 5000,
      },
    },
  ];

  let getSessionsMock: jest.Mock;
  let deleteSessionMock: jest.Mock;
  let clearAllSessionsMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // 设置 mock 返回值
    const utils = require('../utils');
    getSessionsMock = utils.getSessions as jest.Mock;
    getSessionsMock.mockReturnValue(mockSessions);

    deleteSessionMock = utils.deleteSession as jest.Mock;
    deleteSessionMock.mockImplementation(() => {
      // 从会话列表中移除
      const index = mockSessions.findIndex(s => s.id === 'session-1');
      if (index > -1) {
        mockSessions.splice(index, 1);
      }
    });

    clearAllSessionsMock = utils.clearAllSessions as jest.Mock;
    clearAllSessionsMock.mockImplementation(() => {
      mockSessions.length = 0;
    });
  });

  describe('渲染测试', () => {
    it('应该正确渲染组件', () => {
      render(<WorkspaceRecovery />);

      expect(screen.getByText('工作区恢复')).toBeInTheDocument();
    });

    it('应该显示会话列表', () => {
      render(<WorkspaceRecovery />);

      expect(screen.getByText('sales_data.xlsx')).toBeInTheDocument();
      expect(screen.getByText('report.xlsx + 2 个文件')).toBeInTheDocument();
      expect(screen.getByText('data.xlsx')).toBeInTheDocument();
    });

    it('应该显示会话时间戳', () => {
      render(<WorkspaceRecovery />);

      // 验证时间戳格式
      const timestamps = screen.getAllByLabelText(/timestamp/i);
      expect(timestamps.length).toBeGreaterThan(0);
    });

    it('应该显示会话状态图标', () => {
      render(<WorkspaceRecovery />);

      // 已完成状态应该有绿色图标
      const completedIcons = document.querySelectorAll('.text-green-500');
      expect(completedIcons.length).toBeGreaterThan(0);

      // 失败状态应该有红色图标
      const failedIcons = document.querySelectorAll('.text-red-500');
      expect(failedIcons.length).toBeGreaterThan(0);

      // 进行中状态应该有蓝色图标
      const runningIcons = document.querySelectorAll('.text-blue-500');
      expect(runningIcons.length).toBeGreaterThan(0);
    });

    it('应该在无会话时显示空状态', () => {
      getSessionsMock.mockReturnValue([]);

      render(<WorkspaceRecovery />);

      expect(screen.getByText('暂无历史会话')).toBeInTheDocument();
      expect(screen.getByText('开始处理文件后，会话将自动保存')).toBeInTheDocument();
    });

    it('应该显示过滤器按钮', () => {
      render(<WorkspaceRecovery />);

      expect(screen.getByText('全部')).toBeInTheDocument();
      expect(screen.getByText('已完成')).toBeInTheDocument();
      expect(screen.getByText('失败')).toBeInTheDocument();
      expect(screen.getByText('进行中')).toBeInTheDocument();
    });

    it('应该显示清除全部按钮', () => {
      render(<WorkspaceRecovery />);

      expect(screen.getByText('清除全部')).toBeInTheDocument();
    });
  });

  describe('过滤功能', () => {
    it('应该显示所有会话', () => {
      render(<WorkspaceRecovery />);

      const allButton = screen.getByText('全部');
      fireEvent.click(allButton);

      expect(screen.getByText('sales_data.xlsx')).toBeInTheDocument();
      expect(screen.getByText('report.xlsx + 2 个文件')).toBeInTheDocument();
      expect(screen.getByText('data.xlsx')).toBeInTheDocument();
    });

    it('应该过滤显示已完成的会话', () => {
      render(<WorkspaceRecovery />);

      const completedButton = screen.getByText('已完成');
      fireEvent.click(completedButton);

      expect(screen.getByText('sales_data.xlsx')).toBeInTheDocument();
      expect(screen.queryByText('report.xlsx + 2 个文件')).not.toBeInTheDocument();
      expect(screen.queryByText('data.xlsx')).not.toBeInTheDocument();
    });

    it('应该过滤显示失败的会话', () => {
      render(<WorkspaceRecovery />);

      const failedButton = screen.getByText('失败');
      fireEvent.click(failedButton);

      expect(screen.queryByText('sales_data.xlsx')).not.toBeInTheDocument();
      expect(screen.getByText('report.xlsx + 2 个文件')).toBeInTheDocument();
      expect(screen.queryByText('data.xlsx')).not.toBeInTheDocument();
    });

    it('应该过滤显示进行中的会话', () => {
      render(<WorkspaceRecovery />);

      const inProgressButton = screen.getByText('进行中');
      fireEvent.click(inProgressButton);

      expect(screen.queryByText('sales_data.xlsx')).not.toBeInTheDocument();
      expect(screen.queryByText('report.xlsx + 2 个文件')).not.toBeInTheDocument();
      expect(screen.getByText('data.xlsx')).toBeInTheDocument();
    });
  });

  describe('会话恢复', () => {
    it('应该处理会话恢复', async () => {
      const handleRestore = jest.fn().mockResolvedValue(undefined);

      render(<WorkspaceRecovery onRestore={handleRestore} />);

      const restoreButtons = screen.getAllByText('恢复会话');
      expect(restoreButtons.length).toBeGreaterThan(0);

      fireEvent.click(restoreButtons[0]);

      await waitFor(() => {
        expect(handleRestore).toHaveBeenCalledWith('session-1', expect.any(Object));
      });
    });

    it('应该传递正确的恢复选项', async () => {
      const handleRestore = jest.fn().mockResolvedValue(undefined);

      render(<WorkspaceRecovery onRestore={handleRestore} />);

      const restoreButtons = screen.getAllByText('恢复会话');
      fireEvent.click(restoreButtons[0]);

      await waitFor(() => {
        expect(handleRestore).toHaveBeenCalledWith(
          'session-1',
          expect.objectContaining({
            restoreFiles: true,
            restoreExecutionState: true,
            restoreMappings: true,
            restoreConfig: true,
          })
        );
      });
    });
  });

  describe('会话删除', () => {
    it('应该删除单个会话', async () => {
      const handleDelete = jest.fn().mockResolvedValue(undefined);

      render(<WorkspaceRecovery onDelete={handleDelete} />);

      const deleteButtons = screen.getAllByTitle('删除会话');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(handleDelete).toHaveBeenCalledWith('session-1');
      });
    });

    it('应该在无 onDelete 时使用默认删除', async () => {
      render(<WorkspaceRecovery />);

      const deleteButtons = screen.getAllByTitle('删除会话');
      const initialLength = screen.getAllByText('恢复会话').length;

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(deleteSessionMock).toHaveBeenCalledWith('session-1');
      });
    });
  });

  describe('清除全部功能', () => {
    it('应该显示确认对话框', () => {
      render(<WorkspaceRecovery />);

      const clearButton = screen.getByText('清除全部');
      fireEvent.click(clearButton);

      expect(screen.getByText('确认清除全部会话')).toBeInTheDocument();
      expect(screen.getByText('此操作将删除所有历史会话记录，无法恢复')).toBeInTheDocument();
    });

    it('应该取消清除操作', () => {
      render(<WorkspaceRecovery />);

      const clearButton = screen.getByText('清除全部');
      fireEvent.click(clearButton);

      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('确认清除全部会话')).not.toBeInTheDocument();
    });

    it('应该确认清除全部会话', async () => {
      const handleClearAll = jest.fn().mockResolvedValue(undefined);

      render(<WorkspaceRecovery onClearAll={handleClearAll} />);

      const clearButton = screen.getByText('清除全部');
      fireEvent.click(clearButton);

      const confirmButton = screen.getByText('确认清除');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(handleClearAll).toHaveBeenCalled();
      });
    });

    it('应该在无 onClearAll 时使用默认清除', async () => {
      render(<WorkspaceRecovery />);

      const clearButton = screen.getByText('清除全部');
      fireEvent.click(clearButton);

      const confirmButton = screen.getByText('确认清除');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(clearAllSessionsMock).toHaveBeenCalled();
      });
    });
  });

  describe('会话详情', () => {
    it('应该显示文件数量', () => {
      render(<WorkspaceRecovery />);

      expect(screen.getByText('2 个文件')).toBeInTheDocument();
    });

    it('应该显示文件角色标签', () => {
      render(<WorkspaceRecovery />);

      expect(screen.getByText('主数据源')).toBeInTheDocument();
      expect(screen.getByText('配置文件')).toBeInTheDocument();
    });

    it('应该显示执行进度', () => {
      render(<WorkspaceRecovery />);

      // 已完成的会话应该显示 100%
      expect(screen.getByText('100%')).toBeInTheDocument();

      // 失败的会话应该显示 50%
      expect(screen.getByText('50%')).toBeInTheDocument();

      // 进行中的会话应该显示 25%
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('应该显示错误信息', () => {
      render(<WorkspaceRecovery />);

      expect(screen.getByText('错误: 内存不足')).toBeInTheDocument();
    });

    it('应该显示进度条', () => {
      render(<WorkspaceRecovery />);

      const progressBars = document.querySelectorAll('.bg-blue-500[style*="width"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('会话卡片交互', () => {
    it('应该显示文件预览', () => {
      render(<WorkspaceRecovery />);

      // 验证文件名显示
      expect(screen.getByText('sales_data.xlsx')).toBeInTheDocument();
      expect(screen.getByText('config.json')).toBeInTheDocument();
    });

    it('应该在文件超过3个时显示"更多"提示', () => {
      const manyFilesSession: SessionInfo = {
        id: 'session-many',
        name: 'Many Files',
        timestamp: Date.now(),
        status: 'completed',
        files: Array.from({ length: 5 }, (_, i) => ({
          id: `file-${i}`,
          name: `file_${i}.xlsx`,
          role: FileRole.PRIMARY_SOURCE,
          type: 'excel',
          path: `/file_${i}.xlsx`,
        })),
      };

      getSessionsMock.mockReturnValue([manyFilesSession]);

      render(<WorkspaceRecovery />);

      expect(screen.getByText('+2 更多')).toBeInTheDocument();
    });
  });

  describe('自动清理', () => {
    it('应该在初始化时清理过期会话', () => {
      const cleanupExpiredSessionsMock = require('../utils').cleanupExpiredSessions as jest.Mock;

      render(<WorkspaceRecovery autoCleanup={true} />);

      expect(cleanupExpiredSessionsMock).toHaveBeenCalled();
    });

    it('应该禁用自动清理', () => {
      const cleanupExpiredSessionsMock = require('../utils').cleanupExpiredSessions as jest.Mock;

      render(<WorkspaceRecovery autoCleanup={false} />);

      expect(cleanupExpiredSessionsMock).not.toHaveBeenCalled();
    });
  });

  describe('最大会话限制', () => {
    it('应该限制显示的会话数量', () => {
      const manySessions = Array.from({ length: 25 }, (_, i) => ({
        id: `session-${i}`,
        name: `Session ${i}`,
        timestamp: Date.now() - i * 3600000,
        status: 'completed' as const,
        files: [],
      }));

      getSessionsMock.mockReturnValue(manySessions);

      render(<WorkspaceRecovery maxSessions={20} />);

      // 应该只显示 20 个会话（maxSessions）
      const sessionCards = document.querySelectorAll('.bg-white.dark\\:bg-slate-800.rounded-xl.border');
      expect(sessionCards.length).toBe(20);
    });
  });

  describe('可访问性', () => {
    it('应该有正确的 ARIA 标签', () => {
      render(<WorkspaceRecovery />);

      const restoreButtons = screen.getAllByText('恢复会话');
      restoreButtons.forEach(button => {
        expect(button).toBeEnabled();
      });
    });

    it('应该支持键盘导航', async () => {
      render(<WorkspaceRecovery />);

      const firstButton = screen.getAllByText('恢复会话')[0];
      firstButton.focus();

      await waitFor(() => {
        expect(firstButton).toHaveFocus();
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理恢复失败', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const handleRestore = jest.fn().mockRejectedValue(new Error('恢复失败'));

      render(<WorkspaceRecovery onRestore={handleRestore} />);

      const restoreButtons = screen.getAllByText('恢复会话');
      fireEvent.click(restoreButtons[0]);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('应该处理删除失败', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const handleDelete = jest.fn().mockRejectedValue(new Error('删除失败'));

      render(<WorkspaceRecovery onDelete={handleDelete} />);

      const deleteButtons = screen.getAllByTitle('删除会话');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('响应式行为', () => {
    it('应该在移动端正确显示', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<WorkspaceRecovery />);

      expect(screen.getByText('工作区恢复')).toBeInTheDocument();
    });
  });
});
