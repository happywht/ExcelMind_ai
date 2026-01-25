/**
 * 性能监控仪表板组件
 *
 * 实时显示系统性能指标、趋势图和告警信息
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Clock,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  XCircle,
  BarChart3,
  Settings,
  RefreshCw,
  Download
} from 'lucide-react';
import {
  RealTimeMetrics,
  PerformanceAlert,
  PerformanceReport,
  OptimizationSuggestion
} from '../../services/monitoring/types';

// ============================================================================
// 类型定义
// ============================================================================

interface PerformanceDashboardProps {
  /** 刷新间隔（毫秒） */
  refreshInterval?: number;
  /** 是否显示实时更新 */
  showRealTime?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  status?: 'good' | 'warning' | 'error';
  onClick?: () => void;
}

interface AlertPanelProps {
  alerts: PerformanceAlert[];
  onDismiss?: (alertId: string) => void;
  onClearAll?: () => void;
}

interface SuggestionItemProps {
  suggestion: OptimizationSuggestion;
  onApply?: (suggestionId: string) => void;
}

// ============================================================================
// MetricCard 组件
// ============================================================================

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  trend,
  trendValue,
  status = 'good',
  onClick
}) => {
  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  };

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4 text-red-500" />,
    down: <TrendingDown className="w-4 h-4 text-green-500" />,
    neutral: <Minus className="w-4 h-4 text-gray-400" />
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${statusColors[status]}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{title}</span>
        {icon && <span className="opacity-70">{icon}</span>}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold">
          {typeof value === 'number' ? value.toFixed(2) : value}
        </span>
        {unit && <span className="text-sm opacity-70">{unit}</span>}
      </div>
      {trend && trendValue !== undefined && (
        <div className="flex items-center mt-2 text-sm">
          {trendIcons[trend]}
          <span className="ml-1 opacity-70">{trendValue.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// AlertPanel 组件
// ============================================================================

const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, onDismiss, onClearAll }) => {
  const severityColors = {
    info: 'border-blue-500 bg-blue-50',
    warning: 'border-yellow-500 bg-yellow-50',
    error: 'border-red-500 bg-red-50',
    critical: 'border-purple-500 bg-purple-50'
  };

  const severityIcons = {
    info: <CheckCircle className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    critical: <AlertTriangle className="w-5 h-5 text-purple-500 animate-pulse" />
  };

  if (alerts.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg">
        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
        <p>暂无活跃告警</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">活跃告警 ({alerts.length})</h3>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            清除全部
          </button>
        )}
      </div>
      {alerts.map(alert => (
        <div
          key={alert.alertId}
          className={`p-4 rounded-lg border-l-4 ${severityColors[alert.threshold.severity]}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {severityIcons[alert.threshold.severity]}
              <div className="flex-1">
                <p className="font-medium">{alert.message}</p>
                <p className="text-sm opacity-70 mt-1">
                  当前值: {alert.currentValue} |
                  阈值: {alert.threshold.operator} {alert.threshold.threshold}
                </p>
                <p className="text-xs opacity-50 mt-1">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            {onDismiss && !alert.resolved && (
              <button
                onClick={() => onDismiss(alert.alertId)}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// SuggestionItem 组件
// ============================================================================

const SuggestionItem: React.FC<SuggestionItemProps> = ({ suggestion, onApply }) => {
  const priorityColors = {
    high: 'border-red-500 bg-red-50',
    medium: 'border-yellow-500 bg-yellow-50',
    low: 'border-green-500 bg-green-50'
  };

  const priorityLabels = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级'
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 ${priorityColors[suggestion.priority]}`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold">{suggestion.title}</h4>
        <span className="text-xs px-2 py-1 rounded bg-white">
          {priorityLabels[suggestion.priority]}
        </span>
      </div>
      <p className="text-sm mb-3 opacity-80">{suggestion.description}</p>

      <div className="bg-white bg-opacity-50 rounded p-3 mb-3">
        <p className="text-sm font-medium mb-1">预期改进:</p>
        <div className="flex items-baseline space-x-2">
          <span className="text-lg font-bold">
            {suggestion.estimatedImprovement.currentValue.toFixed(2)}
          </span>
          <ArrowRight className="w-4 h-4" />
          <span className="text-lg font-bold text-green-600">
            {suggestion.estimatedImprovement.expectedValue.toFixed(2)}
          </span>
          <span className="text-sm text-green-600">
            ({suggestion.estimatedImprovement.improvementPercentage > 0 ? '+' : ''}
            {suggestion.estimatedImprovement.improvementPercentage.toFixed(1)}%)
          </span>
        </div>
      </div>

      {onApply && (
        <button
          onClick={() => onApply(suggestion.id)}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          查看详情
        </button>
      )}
    </div>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

// ============================================================================
// PerformanceDashboard 主组件
// ============================================================================

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  refreshInterval = 10000,
  showRealTime = true,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'suggestions'>('overview');

  // 加载实时指标
  const loadRealTimeMetrics = useCallback(async () => {
    try {
      // 这里调用实际的监控服务
      // const metrics = await getRealTimeMetrics();
      // setMetrics(metrics);

      // 模拟数据
      setMetrics({
        timestamp: Date.now(),
        query: {
          avgResponseTime: 45 + Math.random() * 20,
          queriesPerSecond: 2 + Math.random() * 3,
          activeQueries: Math.floor(Math.random() * 5)
        },
        ai: {
          avgResponseTime: 1500 + Math.random() * 500,
          callsPerMinute: 10 + Math.random() * 20,
          successRate: 95 + Math.random() * 5
        },
        document: {
          avgGenerationTime: 300 + Math.random() * 200,
          documentsPerMinute: 5 + Math.random() * 10,
          successRate: 98 + Math.random() * 2
        },
        resources: {
          memoryUsage: 40 + Math.random() * 30,
          cpuUsage: 20 + Math.random() * 40,
          storageUsage: 10 + Math.random() * 5
        },
        ux: {
          avgPageLoadTime: 800 + Math.random() * 400,
          errorRate: Math.random() * 2,
          activeSessions: 5 + Math.floor(Math.random() * 10)
        }
      });
    } catch (error) {
      console.error('加载实时指标失败:', error);
    }
  }, []);

  // 加载告警
  const loadAlerts = useCallback(async () => {
    try {
      // const alerts = await getPerformanceAlerts();
      // setAlerts(alerts);

      // 模拟数据
      setAlerts([]);
    } catch (error) {
      console.error('加载告警失败:', error);
    }
  }, []);

  // 加载性能报告
  const loadReport = useCallback(async () => {
    try {
      // const report = await getPerformanceReport();
      // setReport(report);

      // 模拟数据
      setReport({
        reportId: 'demo',
        timeRange: { from: Date.now() - 3600000, to: Date.now() },
        generatedAt: Date.now(),
        summary: {
          query: { totalQueries: 150, avgResponseTime: 45, slowQueryCount: 2, cacheHitRate: 85 },
          ai: { totalCalls: 50, avgResponseTime: 1800, successRate: 98, totalTokens: 50000 },
          document: { totalGenerated: 30, avgGenerationTime: 350, successRate: 100 },
          resources: { avgMemoryUsage: 150, peakMemoryUsage: 200, avgCpuUsage: 35 }
        },
        metrics: [],
        score: {
          overall: 85,
          query: 90,
          ai: 80,
          document: 95,
          resources: 85,
          grade: 'A'
        },
        suggestions: [
          {
            id: 'opt_1',
            type: 'query',
            priority: 'medium',
            title: '优化慢查询',
            description: '为常用查询添加索引可以提升性能',
            estimatedImprovement: {
              metric: 'query.execution_time',
              currentValue: 150,
              expectedValue: 75,
              improvementPercentage: 50
            },
            steps: ['添加索引', '优化查询语句'],
            relatedMetrics: ['query.execution_time']
          }
        ]
      });
    } catch (error) {
      console.error('加载报告失败:', error);
    }
  }, []);

  // 刷新数据
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      loadRealTimeMetrics(),
      loadAlerts(),
      loadReport()
    ]);
    setLastRefresh(new Date());
    setIsLoading(false);
  }, [loadRealTimeMetrics, loadAlerts, loadReport]);

  // 初始化和定时刷新
  useEffect(() => {
    refreshAll();

    if (showRealTime) {
      const interval = setInterval(refreshAll, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshAll, showRealTime, refreshInterval]);

  // 处理告警关闭
  const handleDismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.alertId !== alertId));
  }, []);

  // 处理清除所有告警
  const handleClearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  if (!metrics || !report) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">性能监控仪表板</h1>
          <p className="text-sm text-gray-500">
            最后更新: {lastRefresh.toLocaleString()}
          </p>
        </div>
        <button
          onClick={refreshAll}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>刷新</span>
        </button>
      </div>

      {/* 性能评分卡片 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">总体性能评分</p>
            <p className="text-4xl font-bold mt-1">{report.score.overall}</p>
            <p className="text-sm mt-2">等级: {report.score.grade}</p>
          </div>
          <BarChart3 className="w-16 h-16 opacity-50" />
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: '概览', icon: Activity },
            { id: 'alerts', label: '告警', icon: AlertTriangle },
            { id: 'suggestions', label: '优化建议', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.id === 'alerts' && alerts.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {alerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* 标签页内容 */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 查询性能 */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Database className="w-5 h-5 mr-2" />
                查询性能
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="平均响应时间"
                  value={metrics.query.avgResponseTime}
                  unit="ms"
                  icon={<Clock className="w-5 h-5" />}
                  status={metrics.query.avgResponseTime < 100 ? 'good' : metrics.query.avgResponseTime < 200 ? 'warning' : 'error'}
                />
                <MetricCard
                  title="查询速率"
                  value={metrics.query.queriesPerSecond}
                  unit="qps"
                  icon={<Activity className="w-5 h-5" />}
                  status="good"
                />
                <MetricCard
                  title="缓存命中率"
                  value={report.summary.query.cacheHitRate}
                  unit="%"
                  icon={<Zap className="w-5 h-5" />}
                  status={report.summary.query.cacheHitRate > 80 ? 'good' : report.summary.query.cacheHitRate > 50 ? 'warning' : 'error'}
                />
              </div>
            </section>

            {/* AI性能 */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                AI性能
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="平均响应时间"
                  value={metrics.ai.avgResponseTime}
                  unit="ms"
                  icon={<Clock className="w-5 h-5" />}
                  status={metrics.ai.avgResponseTime < 2000 ? 'good' : metrics.ai.avgResponseTime < 4000 ? 'warning' : 'error'}
                />
                <MetricCard
                  title="调用速率"
                  value={metrics.ai.callsPerMinute}
                  unit="cpm"
                  icon={<Activity className="w-5 h-5" />}
                  status="good"
                />
                <MetricCard
                  title="成功率"
                  value={metrics.ai.successRate}
                  unit="%"
                  icon={<CheckCircle className="w-5 h-5" />}
                  status={metrics.ai.successRate > 95 ? 'good' : metrics.ai.successRate > 90 ? 'warning' : 'error'}
                />
              </div>
            </section>

            {/* 资源使用 */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                资源使用
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard
                  title="内存使用"
                  value={metrics.resources.memoryUsage}
                  unit="%"
                  icon={<Database className="w-5 h-5" />}
                  status={metrics.resources.memoryUsage < 60 ? 'good' : metrics.resources.memoryUsage < 80 ? 'warning' : 'error'}
                />
                <MetricCard
                  title="CPU使用"
                  value={metrics.resources.cpuUsage}
                  unit="%"
                  icon={<Activity className="w-5 h-5" />}
                  status={metrics.resources.cpuUsage < 60 ? 'good' : metrics.resources.cpuUsage < 80 ? 'warning' : 'error'}
                />
              </div>
            </section>
          </div>
        )}

        {activeTab === 'alerts' && (
          <AlertPanel
            alerts={alerts}
            onDismiss={handleDismissAlert}
            onClearAll={handleClearAllAlerts}
          />
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">优化建议</h2>
            {report.suggestions.length > 0 ? (
              report.suggestions.map(suggestion => (
                <SuggestionItem
                  key={suggestion.id}
                  suggestion={suggestion}
                />
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>系统运行良好，暂无优化建议</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;
