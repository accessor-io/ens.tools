import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

interface TreemapNode {
  name: string;
  label?: string;
  address?: string;
  value: number;
  children?: TreemapNode[];
  [key: string]: any;
}

interface TreemapProps {
  title: string;
  description?: string;
  data: TreemapNode;
  width?: number;
  height?: number;
  formatValue?: (value: number) => string;
  onNodeClick?: (node: TreemapNode) => void;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  node: TreemapNode;
  depth: number;
}

const formatCompactValue = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b',
  '#6366f1', '#14b8a6', '#f97316', '#ef4444', '#06b6d4',
];

function squarify(nodes: TreemapNode[], x: number, y: number, width: number, height: number): Rectangle[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [{ x, y, width, height, node: nodes[0], depth: 0 }];
  }

  const totalValue = nodes.reduce((sum, n) => sum + (n.value || 0), 0);
  if (totalValue === 0) return [];

  const rectangles: Rectangle[] = [];
  const isHorizontal = width >= height;

  let currentRow: TreemapNode[] = [];
  let currentRowValue = 0;
  let currentX = x;
  let currentY = y;
  let remainingWidth = width;
  let remainingHeight = height;

  for (const node of nodes) {
    const nodeValue = node.value || 0;
    const newRow = [...currentRow, node];
    const newRowValue = currentRowValue + nodeValue;

    if (isHorizontal) {
      const rowHeight = (newRowValue / totalValue) * height;
      const worstAspect = Math.max(
        ...newRow.map((n) => {
          const cellWidth = ((n.value || 0) / newRowValue) * width;
          return Math.max(cellWidth / rowHeight, rowHeight / cellWidth);
        })
      );

      if (currentRow.length === 0 || worstAspect < 1.5) {
        currentRow = newRow;
        currentRowValue = newRowValue;
      } else {
        // Layout current row
        const rowHeight = (currentRowValue / totalValue) * height;
        let cellX = currentX;
        currentRow.forEach((n) => {
          const cellWidth = ((n.value || 0) / currentRowValue) * width;
          rectangles.push({
            x: cellX,
            y: currentY,
            width: cellWidth,
            height: rowHeight,
            node: n,
            depth: 0,
          });
          cellX += cellWidth;
        });
        currentY += rowHeight;
        remainingHeight -= rowHeight;
        currentRow = [node];
        currentRowValue = nodeValue;
      }
    } else {
      const rowWidth = (newRowValue / totalValue) * width;
      const worstAspect = Math.max(
        ...newRow.map((n) => {
          const cellHeight = ((n.value || 0) / newRowValue) * height;
          return Math.max(rowWidth / cellHeight, cellHeight / rowWidth);
        })
      );

      if (currentRow.length === 0 || worstAspect < 1.5) {
        currentRow = newRow;
        currentRowValue = newRowValue;
      } else {
        // Layout current row
        const rowWidth = (currentRowValue / totalValue) * width;
        let cellY = currentY;
        currentRow.forEach((n) => {
          const cellHeight = ((n.value || 0) / currentRowValue) * height;
          rectangles.push({
            x: currentX,
            y: cellY,
            width: rowWidth,
            height: cellHeight,
            node: n,
            depth: 0,
          });
          cellY += cellHeight;
        });
        currentX += rowWidth;
        remainingWidth -= rowWidth;
        currentRow = [node];
        currentRowValue = nodeValue;
      }
    }
  }

  // Layout remaining row
  if (currentRow.length > 0) {
    const isHorizontal = remainingWidth >= remainingHeight;
    if (isHorizontal) {
      const rowHeight = (currentRowValue / totalValue) * remainingHeight;
      let cellX = currentX;
      currentRow.forEach((n) => {
        const cellWidth = ((n.value || 0) / currentRowValue) * remainingWidth;
        rectangles.push({
          x: cellX,
          y: currentY,
          width: cellWidth,
          height: rowHeight,
          node: n,
          depth: 0,
        });
        cellX += cellWidth;
      });
    } else {
      const rowWidth = (currentRowValue / totalValue) * remainingWidth;
      let cellY = currentY;
      currentRow.forEach((n) => {
        const cellHeight = ((n.value || 0) / currentRowValue) * remainingHeight;
        rectangles.push({
          x: currentX,
          y: cellY,
          width: rowWidth,
          height: cellHeight,
          node: n,
          depth: 0,
        });
        cellY += cellHeight;
      });
    }
  }

  return rectangles;
}

export function Treemap({
  title,
  description,
  data,
  width = 800,
  height = 600,
  formatValue = formatCompactValue,
  onNodeClick,
}: TreemapProps) {
  const [hoveredNode, setHoveredNode] = useState<TreemapNode | null>(null);

  const rectangles = useMemo(() => {
    if (!data || !data.children || data.children.length === 0) return [];

    const nodes = data.children
      .filter((child) => (child.value || 0) > 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    return squarify(nodes, 0, 0, width, height);
  }, [data, width, height]);

  const getColor = (index: number, category?: string): string => {
    if (category) {
      const categoryColors: Record<string, string> = {
        Ecosystem: '#3b82f6',
        'Public Goods': '#8b5cf6',
        'Meta-Governance': '#ec4899',
      };
      return categoryColors[category] || COLORS[index % COLORS.length];
    }
    return COLORS[index % COLORS.length];
  };

  const getNodeLabel = (node: TreemapNode): string => {
    return node.label || node.name || 'Unknown';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg width={width} height={height} className="border border-slate-200 rounded-lg">
            {rectangles.map((rect, index) => {
              const isHovered = hoveredNode === rect.node;
              const color = getColor(index, rect.node.category);
              const label = getNodeLabel(rect.node);
              const canShowLabel = rect.width > 80 && rect.height > 40;

              return (
                <TooltipProvider key={`${rect.node.name}-${index}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <g>
                        <rect
                          x={rect.x}
                          y={rect.y}
                          width={rect.width}
                          height={rect.height}
                          fill={color}
                          fillOpacity={isHovered ? 0.9 : 0.7}
                          stroke="#fff"
                          strokeWidth={isHovered ? 2 : 1}
                          className="cursor-pointer transition-all"
                          onClick={() => onNodeClick?.(rect.node)}
                          onMouseEnter={() => setHoveredNode(rect.node)}
                          onMouseLeave={() => setHoveredNode(null)}
                        />
                        {canShowLabel && (
                          <text
                            x={rect.x + rect.width / 2}
                            y={rect.y + rect.height / 2 - 6}
                            textAnchor="middle"
                            className="text-xs font-semibold fill-white"
                            style={{ fontSize: Math.min(rect.width / label.length, 12) }}
                          >
                            {label.length > 20 ? `${label.substring(0, 17)}...` : label}
                          </text>
                        )}
                        {canShowLabel && (
                          <text
                            x={rect.x + rect.width / 2}
                            y={rect.y + rect.height / 2 + 6}
                            textAnchor="middle"
                            className="text-xs fill-white fill-opacity-90"
                            style={{ fontSize: Math.min(rect.width / 10, 10) }}
                          >
                            {formatValue(rect.node.value || 0)}
                          </text>
                        )}
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <div className="font-semibold">{getNodeLabel(rect.node)}</div>
                        {rect.node.address && (
                          <div className="text-xs text-slate-500 font-mono">{rect.node.address}</div>
                        )}
                        {rect.node.category && (
                          <Badge variant="outline" className="text-xs">
                            {rect.node.category}
                          </Badge>
                        )}
                        <div className="text-sm font-medium">{formatValue(rect.node.value || 0)}</div>
                        {rect.node.address && (
                          <a
                            href={`https://etherscan.io/address/${rect.node.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            View on Etherscan <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}



