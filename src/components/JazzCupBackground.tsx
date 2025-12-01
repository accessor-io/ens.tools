import { useEffect, useRef } from 'react';

export function JazzCupBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawResponsive = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    drawResponsive();
    
    const animate = (timestamp: number) => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        drawResponsive();
      }
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      
      drawPattern(ctx, width, height, timestamp);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    window.addEventListener('resize', drawResponsive);
    
    return () => {
      window.removeEventListener('resize', drawResponsive);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: '#f8fafc' }}
      aria-hidden="true"
    />
  );
}

function drawPattern(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  // Base background - subtle warm gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#f8fafc');
  bgGradient.addColorStop(0.5, '#f1f5f9');
  bgGradient.addColorStop(1, '#faf5ff');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw subtle aurora gradient orbs
  drawAuroraOrbs(ctx, width, height, time);
  
  // Draw floating grid dots
  drawFloatingDots(ctx, width, height, time);
}

function drawAuroraOrbs(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  ctx.save();
  
  // Orb 1 - Cyan/Sky (top right) - very subtle
  const orb1X = width * 0.8 + Math.sin(time * 0.0003) * 30;
  const orb1Y = height * 0.15 + Math.cos(time * 0.0004) * 20;
  const gradient1 = ctx.createRadialGradient(orb1X, orb1Y, 0, orb1X, orb1Y, 500);
  gradient1.addColorStop(0, 'rgba(14, 165, 233, 0.04)');
  gradient1.addColorStop(0.5, 'rgba(14, 165, 233, 0.015)');
  gradient1.addColorStop(1, 'rgba(14, 165, 233, 0)');
  ctx.fillStyle = gradient1;
  ctx.fillRect(0, 0, width, height);
  
  // Orb 2 - Pink/Rose (bottom left) - very subtle
  const orb2X = width * 0.15 + Math.cos(time * 0.00025) * 25;
  const orb2Y = height * 0.85 + Math.sin(time * 0.00035) * 20;
  const gradient2 = ctx.createRadialGradient(orb2X, orb2Y, 0, orb2X, orb2Y, 400);
  gradient2.addColorStop(0, 'rgba(236, 72, 153, 0.03)');
  gradient2.addColorStop(0.5, 'rgba(236, 72, 153, 0.01)');
  gradient2.addColorStop(1, 'rgba(236, 72, 153, 0)');
  ctx.fillStyle = gradient2;
  ctx.fillRect(0, 0, width, height);
  
  ctx.restore();
}

function drawFloatingDots(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  ctx.save();
  
  const gridSize = 100;
  const dotRadius = 1;
  
  for (let x = 0; x < width + gridSize; x += gridSize) {
    for (let y = 0; y < height + gridSize; y += gridSize) {
      // Very subtle offset
      const offsetX = Math.sin(time * 0.0003 + y * 0.008) * 2;
      const offsetY = Math.cos(time * 0.0002 + x * 0.008) * 2;
      
      const dotX = x + offsetX;
      const dotY = y + offsetY;
      
      // Very subtle, uniform opacity
      const opacity = 0.08;
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(148, 163, 184, ${opacity})`;
      ctx.fill();
    }
  }
  
  ctx.restore();
}
