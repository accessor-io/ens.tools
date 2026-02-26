import { useEffect, useRef } from 'react';

export function JazzCupBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    
    const animate = (time: number) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);
      
      drawBackground(ctx, width, height, time);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    window.addEventListener('resize', resize);
    
    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  // Deep dark background
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, width, height);

  // Subtle radial gradient from center
  const centerX = width * 0.5;
  const centerY = height * 0.3;
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.8);
  gradient.addColorStop(0, 'rgba(132, 204, 22, 0.03)');
  gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.01)');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw grid
  drawGrid(ctx, width, height, time);
  
  // Draw glow orbs
  drawGlowOrbs(ctx, width, height, time);
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, _time: number) {
  const gridSize = 60;
  const lineWidth = 0.5;
  
  ctx.save();
  ctx.strokeStyle = 'rgba(39, 39, 42, 0.8)';
  ctx.lineWidth = lineWidth;
  
  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Intersection dots
  ctx.fillStyle = 'rgba(63, 63, 70, 0.5)';
  for (let x = 0; x <= width; x += gridSize) {
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}

function drawGlowOrbs(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  
  // Lime glow - top area
  const orb1X = width * 0.7 + Math.sin(time * 0.0002) * 50;
  const orb1Y = height * 0.2 + Math.cos(time * 0.00015) * 30;
  const gradient1 = ctx.createRadialGradient(orb1X, orb1Y, 0, orb1X, orb1Y, 400);
  gradient1.addColorStop(0, 'rgba(132, 204, 22, 0.08)');
  gradient1.addColorStop(0.4, 'rgba(132, 204, 22, 0.02)');
  gradient1.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient1;
  ctx.fillRect(0, 0, width, height);
  
  // Cyan glow - bottom area
  const orb2X = width * 0.2 + Math.cos(time * 0.00018) * 40;
  const orb2Y = height * 0.75 + Math.sin(time * 0.00022) * 25;
  const gradient2 = ctx.createRadialGradient(orb2X, orb2Y, 0, orb2X, orb2Y, 350);
  gradient2.addColorStop(0, 'rgba(34, 211, 238, 0.06)');
  gradient2.addColorStop(0.4, 'rgba(34, 211, 238, 0.015)');
  gradient2.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient2;
  ctx.fillRect(0, 0, width, height);
  
  ctx.restore();
}
