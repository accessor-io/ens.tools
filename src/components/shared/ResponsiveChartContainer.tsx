import React, { useRef, useEffect, useState } from 'react';
import { ResponsiveContainer } from 'recharts';
import { useResponsiveChart } from '@/hooks/governance/useResponsiveChart';
import { useTouchGestures } from '@/hooks/governance/useTouchGestures';
import { cn } from '@/components/ui/utils';

interface ResponsiveChartContainerProps {
  children: React.ReactNode;
  defaultHeight?: number;
  mobileHeight?: number;
  tabletHeight?: number;
  className?: string;
  enableTouchGestures?: boolean;
  enablePinchZoom?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  compact?: boolean;
}

export function ResponsiveChartContainer({
  children,
  defaultHeight = 400,
  mobileHeight,
  tabletHeight,
  className,
  enableTouchGestures = true,
  enablePinchZoom = false,
  onSwipeLeft,
  onSwipeRight,
  compact,
}: ResponsiveChartContainerProps) {
  const chartConfig = useResponsiveChart(defaultHeight, {
    mobileHeight,
    tabletHeight,
    compact,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  const { touchState, touchHandlers } = useTouchGestures({
    onSwipeLeft,
    onSwipeRight,
    enablePinchZoom,
    onPinchZoom: enablePinchZoom
      ? (scale: any) => {
          setZoom((prev) => Math.max(0.5, Math.min(3, prev * scale)));
        }
      : undefined,
  });

  useEffect(() => {
    if (!enablePinchZoom || !containerRef.current) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)));
      }
    };

    const container = containerRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [enablePinchZoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enablePinchZoom) return;
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!enablePinchZoom || !panStartRef.current) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    panStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{
        transform: enablePinchZoom
          ? `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`
          : undefined,
        transformOrigin: 'center center',
        touchAction: enablePinchZoom ? 'none' : 'pan-x pan-y',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      {...(enableTouchGestures ? touchHandlers : {})}
    >
      <ResponsiveContainer width="100%" height={chartConfig.height}>
        {children}
      </ResponsiveContainer>
      {enablePinchZoom && zoom !== 1 && (
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-slate-600 shadow-sm">
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}







