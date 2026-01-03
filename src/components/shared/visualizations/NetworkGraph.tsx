import { useMemo, useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, RotateCw, ExternalLink, Network } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NetworkNode {
  id: string;
  label: string;
  address?: string;
  category?: string;
  value?: number;
  type?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface NetworkLink {
  source: string | NetworkNode;
  target: string | NetworkNode;
  value: number;
  count?: number;
}

interface NetworkGraphProps {
  title: string;
  description?: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
  width?: number;
  height?: number;
  onNodeClick?: (node: NetworkNode) => void;
}

const COLORS: Record<string, string> = {
  Ecosystem: '#3b82f6',
  'Public Goods': '#8b5cf6',
  'Meta-Governance': '#ec4899',
  wallet: '#10b981',
  contract: '#f59e0b',
  default: '#64748b',
};

export function NetworkGraph({
  title,
  description,
  nodes: initialNodes,
  links: initialLinks,
  width = 800,
  height = 600,
  onNodeClick,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Create node map for quick lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, NetworkNode>();
    initialNodes.forEach((node) => {
      map.set(node.id, { ...node, x: width / 2, y: height / 2, vx: 0, vy: 0 });
    });
    return map;
  }, [initialNodes, width, height]);

  // Initialize force simulation positions
  const [nodes, setNodes] = useState<NetworkNode[]>(() => {
    return Array.from(nodeMap.values());
  });

  // Force simulation
  useEffect(() => {
    const alpha = 1;
    const iterations = 50;

    const simulate = () => {
      const newNodes = [...nodes];
      const linkMap = new Map<string, NetworkLink[]>();

      // Build link map
      initialLinks.forEach((link) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;

        if (!linkMap.has(sourceId)) linkMap.set(sourceId, []);
        if (!linkMap.has(targetId)) linkMap.set(targetId, []);
        linkMap.get(sourceId)!.push(link);
        linkMap.get(targetId)!.push(link);
      });

      // Simple force-directed layout
      for (let iter = 0; iter < iterations; iter++) {
        // Repulsion between all nodes
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const nodeA = newNodes[i];
            const nodeB = newNodes[j];
            if (!nodeA.x || !nodeA.y || !nodeB.x || !nodeB.y) continue;

            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (200 * 200) / distance;

            const fx = (dx / distance) * force * 0.01;
            const fy = (dy / distance) * force * 0.01;

            nodeA.vx = (nodeA.vx || 0) - fx;
            nodeA.vy = (nodeA.vy || 0) - fy;
            nodeB.vx = (nodeB.vx || 0) + fx;
            nodeB.vy = (nodeB.vy || 0) + fy;
          }
        }

        // Attraction along links
        initialLinks.forEach((link) => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;

          const sourceNode = newNodes.find((n) => n.id === sourceId);
          const targetNode = newNodes.find((n) => n.id === targetId);

          if (!sourceNode || !targetNode || !sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) return;

          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = distance * 0.02;

          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          sourceNode.vx = (sourceNode.vx || 0) + fx;
          sourceNode.vy = (sourceNode.vy || 0) + fy;
          targetNode.vx = (targetNode.vx || 0) - fx;
          targetNode.vy = (targetNode.vy || 0) - fy;
        });

        // Apply velocity and center gravity
        newNodes.forEach((node) => {
          if (node.x === undefined || node.y === undefined) return;

          node.vx = (node.vx || 0) * 0.9;
          node.vy = (node.vy || 0) * 0.9;

          node.x += node.vx || 0;
          node.y += node.vy || 0;

          // Center gravity
          const dx = width / 2 - node.x;
          const dy = height / 2 - node.y;
          node.x += dx * 0.01;
          node.y += dy * 0.01;

          // Boundary constraints
          node.x = Math.max(50, Math.min(width - 50, node.x));
          node.y = Math.max(50, Math.min(height - 50, node.y));
        });
      }

      setNodes(newNodes);
    };

    simulate();
  }, [initialNodes, initialLinks, width, height]);

  const getNodeColor = (node: NetworkNode): string => {
    if (node.category) return COLORS[node.category] || COLORS.default;
    if (node.type) return COLORS[node.type] || COLORS.default;
    return COLORS.default;
  };

  const getNodeSize = (node: NetworkNode): number => {
    const baseSize = 8;
    if (node.value) {
      return baseSize + Math.sqrt(node.value / 1_000_000) * 3;
    }
    return baseSize;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(Math.max(0.5, Math.min(2, zoom * delta)));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(2, zoom * 1.2))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.5, zoom * 0.8))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative border border-slate-200 rounded-lg overflow-hidden">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Links */}
              {initialLinks.map((link, index) => {
                const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                const sourceNode = nodes.find((n) => n.id === sourceId);
                const targetNode = nodes.find((n) => n.id === targetId);

                if (!sourceNode || !targetNode || !sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) {
                  return null;
                }

                const strokeWidth = Math.max(1, Math.min(5, Math.sqrt(link.value / 1_000_000) * 2));

                return (
                  <line
                    key={`link-${index}`}
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke="#94a3b8"
                    strokeWidth={strokeWidth}
                    strokeOpacity={0.4}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                if (node.x === undefined || node.y === undefined) return null;

                const color = getNodeColor(node);
                const size = getNodeSize(node);
                const isSelected = selectedNode?.id === node.id;

                return (
                  <TooltipProvider key={node.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <g>
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={size}
                            fill={color}
                            stroke={isSelected ? '#0f172a' : '#fff'}
                            strokeWidth={isSelected ? 3 : 2}
                            className="cursor-pointer transition-all hover:r-4"
                            onClick={() => {
                              setSelectedNode(node);
                              onNodeClick?.(node);
                            }}
                          />
                          {node.label && size > 10 && (
                            <text
                              x={node.x}
                              y={node.y + size + 12}
                              textAnchor="middle"
                              className="text-xs fill-slate-700 pointer-events-none"
                            >
                              {node.label.length > 15 ? `${node.label.substring(0, 12)}...` : node.label}
                            </text>
                          )}
                        </g>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <div className="font-semibold">{node.label}</div>
                          {node.address && (
                            <div className="text-xs text-slate-500 font-mono">{node.address}</div>
                          )}
                          {node.category && (
                            <Badge variant="outline" className="text-xs">
                              {node.category}
                            </Badge>
                          )}
                          {node.value && (
                            <div className="text-sm font-medium">
                              ${(node.value / 1_000_000).toFixed(2)}M
                            </div>
                          )}
                          {node.address && (
                            <a
                              href={`https://etherscan.io/address/${node.address}`}
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
            </g>
          </svg>
        </div>

        {selectedNode && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{selectedNode.label}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNode(null)}
              >
                ×
              </Button>
            </div>
            {selectedNode.address && (
              <div className="text-xs text-slate-600 font-mono mb-2">{selectedNode.address}</div>
            )}
            {selectedNode.category && (
              <Badge variant="outline" className="mb-2">
                {selectedNode.category}
              </Badge>
            )}
            {selectedNode.value && (
              <div className="text-sm font-medium">
                Value: ${(selectedNode.value / 1_000_000).toFixed(2)}M
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



