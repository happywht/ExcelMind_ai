/**
 * 文件关系图谱组件
 *
 * 核心功能：
 * - 可视化文件之间的依赖关系
 * - 支持多种布局算法
 * - 交互式缩放和平移
 * - 节点和边的详细信息显示
 *
 * @module VirtualWorkspace
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Layers,
  Network,
} from 'lucide-react';
import { getVirtualFileSystem, RelationType } from '../../services/infrastructure/vfs/VirtualFileSystem';
import type {
  GraphNode,
  GraphEdge,
  GraphLayout,
  GraphViewOptions,
  RelationshipGraphProps,
  ExtendedVirtualFileInfo,
} from './types';
import {
import { logger } from '@/utils/logger';
  buildGraphNodes,
  getNodeColor,
  getRelationTypeColor,
  getFileRoleLabel,
} from './utils';

/**
 * 关系图谱组件
 */
export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  rootFileId,
  maxDepth = 3,
  layout = 'hierarchical',
  data: propData,
  viewOptions = {},
  onNodeClick,
  onEdgeClick,
  onNodeDoubleClick,
}) => {
  // ===== 状态管理 =====

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showLegend, setShowLegend] = useState(true);

  const svgRef = useRef<SVGSVGElement>(null);
  const vfs = useMemo(() => getVirtualFileSystem(), []);

  // ===== 数据加载 =====

  /**
   * 加载图数据
   */
  const loadGraphData = useCallback(async () => {
    try {
      const files = await vfs.listDirectory();
      const extended: ExtendedVirtualFileInfo[] = files.map(f => ({
        ...f,
        referenceCount: 0,
        isSelected: false,
      }));

      // 构建节点
      const graphNodes = buildGraphNodes(extended);
      setNodes(graphNodes);

      // 构建边（从文件关系服务获取）
      const graphEdges: GraphEdge[] = [];
      for (const file of extended) {
        const relationships = await vfs.getRelationships(file.id);
        for (const rel of relationships) {
          graphEdges.push({
            id: rel.id,
            source: rel.fromFileId,
            target: rel.toFileId,
            type: rel.type,
            label: rel.type,
            color: getRelationTypeColor(rel.type),
            animated: rel.type === RelationType.DEPENDS_ON,
            metadata: rel.metadata,
          });
        }
      }
      setEdges(graphEdges);
    } catch (error) {
      logger.error('Failed to load graph data:', error);
    }
  }, [vfs]);

  useEffect(() => {
    // 如果直接传入了data prop，使用它
    if (propData) {
      setNodes(propData.nodes);
      setEdges(propData.edges);
    } else {
      loadGraphData();
    }
  }, [loadGraphData, propData]);

  // ===== 节点位置计算 =====

  /**
   * 计算节点位置
   */
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();

    if (layout === 'hierarchical') {
      // 层次布局
      const levels = new Map<string, number>();
      const visited = new Set<string>();

      const calculateLevel = (nodeId: string, level: number) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        levels.set(nodeId, level);

        const outgoing = edges.filter(e => e.source === nodeId);
        for (const edge of outgoing) {
          calculateLevel(edge.target, level + 1);
        }
      };

      // 从根节点开始计算
      const roots = nodes.filter(n => !edges.some(e => e.target === n.id));
      for (const root of roots) {
        calculateLevel(root.id, 0);
      }

      // 分配位置
      const nodesByLevel = new Map<number, GraphNode[]>();
      for (const [nodeId, level] of levels) {
        if (!nodesByLevel.has(level)) {
          nodesByLevel.set(level, []);
        }
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          nodesByLevel.get(level)!.push(node);
        }
      }

      const levelHeight = 120;
      const nodeSpacing = 150;

      for (const [level, levelNodes] of nodesByLevel) {
        const totalWidth = (levelNodes.length - 1) * nodeSpacing;
        const startX = -totalWidth / 2;

        levelNodes.forEach((node, index) => {
          positions.set(node.id, {
            x: startX + index * nodeSpacing,
            y: level * levelHeight,
          });
        });
      }
    } else if (layout === 'force') {
      // 力导向布局（简化版）
      const width = 800;
      const height = 600;
      const centerX = width / 2;
      const centerY = height / 2;

      nodes.forEach((node, index) => {
        const angle = (index / nodes.length) * 2 * Math.PI;
        const radius = 200;
        positions.set(node.id, {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      });
    } else if (layout === 'circular') {
      // 圆形布局
      const centerX = 400;
      const centerY = 300;
      const radius = Math.min(nodes.length * 30, 250);

      nodes.forEach((node, index) => {
        const angle = (index / nodes.length) * 2 * Math.PI;
        positions.set(node.id, {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      });
    } else {
      // 网格布局
      const gridSize = Math.ceil(Math.sqrt(nodes.length));
      const spacing = 150;

      nodes.forEach((node, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        positions.set(node.id, {
          x: col * spacing,
          y: row * spacing,
        });
      });
    }

    return positions;
  }, [nodes, edges, layout]);

  // ===== 交互处理 =====

  /**
   * 处理节点点击
   */
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    if (onNodeClick) {
      onNodeClick(node);
    }
  }, [onNodeClick]);

  /**
   * 处理边点击
   */
  const handleEdgeClick = useCallback((edge: GraphEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    if (onEdgeClick) {
      onEdgeClick(edge);
    }
  }, [onEdgeClick]);

  /**
   * 处理缩放
   */
  const handleZoom = useCallback((delta: number) => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale * (1 + delta))),
    }));
  }, []);

  /**
   * 处理平移
   */
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  }, [isDragging, dragStart]);

  const handlePanEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * 重置视图
   */
  const handleResetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  /**
   * 导出图片
   */
  const handleExportImage = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const link = document.createElement('a');
      link.download = `relationship-graph-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  // ===== 渲染 =====

  return (
    <div className={`relative bg-white dark:bg-slate-900 rounded-xl overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* 工具栏 */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2">
        <button
          onClick={() => handleZoom(0.2)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="放大"
        >
          <ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
        <button
          onClick={() => handleZoom(-0.2)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="重置视图"
        >
          <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />
        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`p-2 rounded-lg transition-colors ${
            showLegend
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}
          title="切换图例"
        >
          <Network className="w-4 h-4" />
        </button>
        <button
          onClick={handleExportImage}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="导出图片"
        >
          <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title={isFullscreen ? '退出全屏' : '全屏'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          ) : (
            <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          )}
        </button>
      </div>

      {/* 图例 */}
      {showLegend && (
        <div className="absolute top-4 right-4 z-10 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 max-w-xs">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">图例</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">主数据源</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">辅助数据源</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">配置文件</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">模板文件</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">输出文件</span>
            </div>
          </div>
        </div>
      )}

      {/* SVG 画布 */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-move"
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* 边 */}
          {edges.map(edge => {
            const source = nodePositions.get(edge.source);
            const target = nodePositions.get(edge.target);
            if (!source || !target) return null;

            const isSelected = selectedEdge?.id === edge.id;
            const strokeWidth = isSelected ? 3 : 2;

            return (
              <g key={edge.id}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={edge.color || '#94a3b8'}
                  strokeWidth={strokeWidth}
                  strokeOpacity={isSelected ? 1 : 0.6}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdgeClick(edge);
                  }}
                  className="cursor-pointer hover:stroke-opacity-100 transition-all"
                />
                {edge.label && (
                  <text
                    x={(source.x + target.x) / 2}
                    y={(source.y + target.y) / 2}
                    textAnchor="middle"
                    className="text-xs fill-slate-600 dark:fill-slate-400 pointer-events-none"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* 节点 */}
          {nodes.map(node => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            const isSelected = selectedNode?.id === node.id;
            const radius = node.size || 25;

            return (
              <g key={node.id}>
                {/* 节点圆圈 */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected ? radius + 5 : radius}
                  fill={node.color || '#6b7280'}
                  stroke={isSelected ? '#3b82f6' : '#ffffff'}
                  strokeWidth={isSelected ? 3 : 2}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(node);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (onNodeDoubleClick) {
                      onNodeDoubleClick(node);
                    }
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />

                {/* 节点标签 */}
                <text
                  x={pos.x}
                  y={pos.y + radius + 15}
                  textAnchor="middle"
                  className="text-xs fill-slate-700 dark:fill-slate-300 pointer-events-none"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* 节点详情面板 */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 max-w-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {selectedNode.label}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {getFileRoleLabel(selectedNode.role)}
              </p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <span className="text-slate-400">&times;</span>
            </button>
          </div>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <div>类型: {selectedNode.type}</div>
            <div>大小: {selectedNode.metadata?.size ? `${(selectedNode.metadata.size / 1024).toFixed(1)} KB` : '未知'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationshipGraph;
