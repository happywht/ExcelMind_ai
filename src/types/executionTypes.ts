/**
 * 执行可视化类型定义
 * 用于实时展示 AI 执行过程
 */

/**
 * 执行步骤类型
 */
export type ExecutionStepType =
  | 'observe'      // 观察数据
  | 'think'         // AI思考
  | 'act'           // 执行操作
  | 'evaluate'      // 评估结果
  | 'repair'        // 修复错误
  | 'complete';     // 完成

/**
 * 执行步骤状态
 */
export type ExecutionStepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

/**
 * 执行步骤
 */
export interface ExecutionStep {
  id: string;
  type: ExecutionStepType;
  status: ExecutionStepStatus;
  title: string;
  description: string;
  code?: string;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * 执行状态
 */
export interface ExecutionState {
  currentStepId: string | null;
  totalSteps: number;
  completedSteps: number;
  percentage: number;
  isRunning: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
}

/**
 * 执行可视化组件属性
 */
export interface ExecutionVisualizerProps {
  steps: ExecutionStep[];
  state: ExecutionState;
  showCode?: boolean;
  showResult?: boolean;
  compact?: boolean;
  theme?: 'light' | 'dark';
}

/**
 * 步骤渲染选项
 */
export interface StepRenderOptions {
  showIcon: boolean;
  showDuration: boolean;
  showCode: boolean;
  showResult: boolean;
  expandable: boolean;
  defaultExpanded: boolean;
}
