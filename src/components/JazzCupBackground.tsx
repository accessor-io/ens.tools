import { useEffect, useRef } from 'react';

export function JazzCupBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Use dpr for sharpness of canvas on HiDPI screens
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawResponsive = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Set canvas size up for crisp rendering
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
      
      // Update canvas size if needed (handles resize)
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        drawResponsive();
      }
      
      // Reset transform and scale for each frame
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
      style={{ background: '#fff' }}
      aria-hidden="true"
    />
  );
}

function drawPattern(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);

  drawDiagonalRow(ctx, width, height, time);
}

// Single diagonal row that scrolls and animates vertically
function drawDiagonalRow(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const hexRadius = 10;
  const spacing = 80; // Distance between shapes along the diagonal
  const diagonalAngle = Math.PI / 6; // 30 degrees
  
  // Animation parameters
  const scrollSpeed = 0.02; // pixels per millisecond (slower)
  const verticalWaveAmplitude = 15; // Vertical wobble amplitude
  const verticalWaveSpeed = 0.0005; // Vertical animation speed (slower)
  const rotationSpeedX = 0.0001; // X-axis rotation speed (slower)
  const rotationSpeedY = 0.00015; // Y-axis rotation speed (slower)
  
  ctx.save();
  ctx.filter = 'blur(0.35px)';
  ctx.globalAlpha = 1;

  // Calculate diagonal direction vector
  const dx = Math.cos(diagonalAngle);
  const dy = Math.sin(diagonalAngle);
  
  // Calculate diagonal length to cover the screen
  const diagonalLength = Math.sqrt(width * width + height * height);
  
  // Continuous scroll offset (no modulo - smooth infinite scroll)
  const scrollOffset = time * scrollSpeed;
  
  // Calculate the visible range along the diagonal
  // We need to cover the screen plus extra for smooth scrolling
  const padding = spacing * 3; // Extra shapes on each side
  const startPos = -padding;
  const endPos = diagonalLength + padding;
  
  // Calculate which shape indices we need to draw
  const startIndex = Math.floor((startPos + scrollOffset) / spacing);
  const endIndex = Math.ceil((endPos + scrollOffset) / spacing);
  
  // Seeded random function for consistent random properties
  function seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Draw shapes in the visible range
  for (let i = startIndex; i <= endIndex; i++) {
    const seed = i * 7919;
    
    // Add randomness to spawn position along diagonal
    const positionRandomSeed = seed + 5000;
    const positionRandom = seededRandom(positionRandomSeed);
    const positionOffset = (positionRandom - 0.5) * spacing * 0.6; // Random offset up to 30% of spacing
    
    // Base position along diagonal (continuous, no wrapping) with randomness
    const basePos = i * spacing - scrollOffset + positionOffset;
    let x = basePos * dx;
    let y = basePos * dy;
    
    // Add perpendicular randomness (offset perpendicular to diagonal)
    const perpendicularRandomSeed = seed + 6000;
    const perpendicularRandom = seededRandom(perpendicularRandomSeed);
    const perpendicularOffset = (perpendicularRandom - 0.5) * spacing * 0.4; // Perpendicular offset
    
    // Perpendicular direction (90 degrees from diagonal)
    const perpDx = -dy;
    const perpDy = dx;
    x += perpendicularOffset * perpDx;
    y += perpendicularOffset * perpDy;
    
    // Center the diagonal
    x += width / 2;
    y += height / 2;
    
    // Add vertical animation (sine wave that varies per shape)
    // Use the actual shape index for consistent animation per shape
    const verticalOffset = Math.sin(time * verticalWaveSpeed + i * 0.5) * verticalWaveAmplitude;
    y += verticalOffset;
    
    // Only draw if shape is visible on screen (with margin for smooth scrolling)
    if (x > -hexRadius * 4 && x < width + hexRadius * 4 && 
        y > -hexRadius * 4 && y < height + hexRadius * 4) {
      const shouldAccent = seededRandom(seed) < 0.15; // ~15% get accents
      
      // Calculate individual rotation angles for each shape (X and Y axes)
      const rotationX = (time * rotationSpeedX + i * 0.3) * Math.PI * 2;
      const rotationY = (time * rotationSpeedY + i * 0.4) * Math.PI * 2;
      
      draw3DHexagon(ctx, x, y, hexRadius, shouldAccent, seed, rotationX, rotationY);
    }
  }
  
  ctx.restore();
}

function draw3DHexagon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  accent?: boolean,
  seed?: number,
  rotationX?: number,
  rotationY?: number
) {
  ctx.save();
  
  // Seeded random function for consistent but random edge selection
  const seededRandom = (s: number): number => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  // Random number of points from 3 to 8
  const baseSeed = seed || 0;
  const pointsRand = seededRandom(baseSeed);
  const points = Math.floor(pointsRand * 6) + 3; // 3 to 8 points
  
  // Random base rotation angle for shape variation (0 to 2π)
  const rotationSeed = baseSeed + 1000;
  const baseRotationAngle = seededRandom(rotationSeed) * Math.PI * 2;
  
  // Random scale variation for more perspective variation (0.85 to 1.15)
  const scaleSeed = baseSeed + 2000;
  const baseScaleVariation = 0.85 + seededRandom(scaleSeed) * 0.3;
  
  // Apply 3D rotation
  const rotX = rotationX || 0;
  const rotY = rotationY || 0;
  
  // Apply base rotation and scale
  ctx.translate(centerX, centerY);
  ctx.rotate(baseRotationAngle);
  ctx.scale(baseScaleVariation, baseScaleVariation);
  
  const angleStep = (Math.PI * 2) / points;
  const hexPoints: { x: number; y: number }[] = [];

  // Generate points and apply 3D rotation transform
  for (let i = 0; i < points; i++) {
    const angle = i * angleStep - Math.PI / 6;
    
    // 2D coordinates of the point on the shape
    const localX = radius * Math.cos(angle);
    const localY = radius * Math.sin(angle);
    const localZ = 0; // Assume shape is flat in Z
    
    // Apply 3D rotation around X-axis (pitch)
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    let x1 = localX;
    let y1 = localY * cosX - localZ * sinX;
    let z1 = localY * sinX + localZ * cosX;
    
    // Apply 3D rotation around Y-axis (yaw)
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    let x2 = x1 * cosY + z1 * sinY;
    let y2 = y1;
    let z2 = -x1 * sinY + z1 * cosY;
    
    // Project to 2D with perspective (simulate depth)
    const perspective = 300; // Perspective distance
    const scale = perspective / (perspective + z2);
    const projectedX = x2 * scale;
    const projectedY = y2 * scale;
    
    hexPoints.push({ x: projectedX, y: projectedY });
  }

  // Fill with 3D gradient (light from top-left)
  ctx.beginPath();
  for (let i = 0; i < hexPoints.length; i++) {
    const p = hexPoints[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();

  // 3D gradient simulating light from top-left
  const lightX = centerX - radius * 0.6;
  const lightY = centerY - radius * 0.6;
  const gradient = ctx.createRadialGradient(
    lightX, lightY, 0,
    centerX, centerY, radius * 1.8
  );
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
  gradient.addColorStop(0.3, 'rgba(99, 102, 241, 0.25)');
  gradient.addColorStop(0.7, 'rgba(59, 130, 246, 0.12)');
  gradient.addColorStop(1, 'rgba(8, 12, 20, 0.08)');
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Add subtle inner highlight for 3D depth
  ctx.beginPath();
  for (let i = 0; i < hexPoints.length; i++) {
    const p = hexPoints[i];
    const t = 0.3; // shrink factor
    const highlightX = centerX + (p.x - centerX) * t;
    const highlightY = centerY + (p.y - centerY) * t;
    if (i === 0) ctx.moveTo(highlightX, highlightY);
    else ctx.lineTo(highlightX, highlightY);
  }
  ctx.closePath();
  const highlightGradient = ctx.createRadialGradient(
    lightX, lightY, 0,
    centerX, centerY, radius * 0.8
  );
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlightGradient;
  ctx.fill();

  // Hex edges: 3D effect with light/dark edges based on angle
  const shadowOffset = 1.5;
  const edgeInset = 2; // Spacing from shape edge to drawn edge line
  
  // Calculate actual center of transformed points
  let avgX = 0;
  let avgY = 0;
  for (const p of hexPoints) {
    avgX += p.x;
    avgY += p.y;
  }
  const transformedCenterX = avgX / hexPoints.length;
  const transformedCenterY = avgY / hexPoints.length;
  
  // Create inset edge points (moved inward from shape boundary)
  const insetPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < hexPoints.length; i++) {
    const p = hexPoints[i];
    // Calculate direction from center to point
    const dx = p.x - transformedCenterX;
    const dy = p.y - transformedCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Move point inward by edgeInset (only if distance is sufficient)
    if (dist > edgeInset) {
      const insetX = transformedCenterX + (dx / dist) * (dist - edgeInset);
      const insetY = transformedCenterY + (dy / dist) * (dist - edgeInset);
      insetPoints.push({ x: insetX, y: insetY });
    } else {
      insetPoints.push({ x: p.x, y: p.y });
    }
  }
  
  for (let i = 0; i < points; i++) {
    const a = insetPoints[i];
    const b = insetPoints[(i + 1) % points];
    
    // Calculate edge midpoint and angle to determine if it's a "top" or "bottom" edge
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const edgeAngle = Math.atan2(b.y - a.y, b.x - a.x);
    const toLightAngle = Math.atan2(lightY - midY, lightX - midX);
    const angleDiff = Math.abs(edgeAngle - toLightAngle);
    const isTopEdge = Math.cos(angleDiff) > 0.3; // Edge facing light
    
    // Draw background shadow edge first
    ctx.beginPath();
    ctx.moveTo(a.x + shadowOffset, a.y + shadowOffset);
    ctx.lineTo(b.x + shadowOffset, b.y + shadowOffset);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    
    // Draw main edge with 3D lighting
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);

    // Random edge style selection with 3D lighting variation
    const edgeSeed = seed ? seed + i * 137 : i * 137;
    const rand = seededRandom(edgeSeed);
    
    if (rand < 0.25) {
      // Thick edge - lighter if top edge, darker if bottom
      ctx.strokeStyle = isTopEdge 
        ? 'rgba(150, 180, 255, 0.5)' 
        : 'rgba(8, 12, 20, 0.4)';
      ctx.lineWidth = 0.9;
    } else if (rand < 0.5) {
      // Thin edge - lighter if top edge
      ctx.strokeStyle = isTopEdge 
        ? 'rgba(100, 150, 255, 0.35)' 
        : 'rgba(59, 130, 246, 0.25)';
      ctx.lineWidth = 0.2;
    } else {
      // Medium edge - lighter if top edge
      ctx.strokeStyle = isTopEdge 
        ? 'rgba(120, 160, 255, 0.4)' 
        : 'rgba(8, 12, 20, 0.35)';
      ctx.lineWidth = 0.6;
    }
    ctx.stroke();
    
    // Add highlight on top edges for extra 3D effect
    if (isTopEdge) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.3;
      ctx.stroke();
    }
  }

  // Optional: draw some diagonals for a more "3D" look
  if (accent) {
    const numDiagonals = Math.floor(points / 2);
    for (let i = 0; i < numDiagonals; i++) {
      ctx.beginPath();
      const drawDiagonals = (a: { x: number; y: number }, b: { x: number; y: number }, depth: number) => {
        if (depth <= 0) return;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(8,12,20,${0.18 / depth})`;
        ctx.lineWidth = 0.25 / depth;
        ctx.stroke();

        // Calculate midpoints slightly offset for recursive nesting
        const offset = 0.10 * radius * depth;
        const midA = {
          x: (a.x + centerX) / 2 + offset,
          y: (a.y + centerY) / 2 - offset,
        };
        const midB = {
          x: (b.x + centerX) / 2 + offset,
          y: (b.y + centerY) / 2 - offset,
        };

        drawDiagonals(midA, midB, depth - 1);
      };

      const a = hexPoints[i];
      const b = hexPoints[(i + Math.floor(points / 2)) % points];
      drawDiagonals(a, b, 2); // depth=2 for two nested layers
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(8,12,20,0.18)';
      ctx.lineWidth = 0.25;
      ctx.stroke();
    }
  }

  ctx.restore();
}
