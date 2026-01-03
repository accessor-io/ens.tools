import { useRef, useCallback, useState } from 'react';

export interface TouchGestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchZoom?: (scale: number) => void;
  swipeThreshold?: number;
  enablePinchZoom?: boolean;
}

export interface TouchState {
  isTouching: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  distance: number;
  scale: number;
}

export function useTouchGestures(handlers: TouchGestureHandlers = {}) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number; distance: number } | null>(null);
  const [touchState, setTouchState] = useState<TouchState>({
    isTouching: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    distance: 0,
    scale: 1,
  });

  const threshold = handlers.swipeThreshold ?? 50;
  const enablePinchZoom = handlers.enablePinchZoom ?? false;

  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };
        setTouchState({
          isTouching: true,
          startX: touch.clientX,
          startY: touch.clientY,
          currentX: touch.clientX,
          currentY: touch.clientY,
          distance: 0,
          scale: 1,
        });
      } else if (e.touches.length === 2 && enablePinchZoom) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = getDistance(touch1, touch2);
        lastTouchRef.current = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
          distance,
        };
        setTouchState((prev) => ({
          ...prev,
          isTouching: true,
          distance,
          scale: prev.scale,
        }));
      }
    },
    [enablePinchZoom, getDistance]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1 && touchStartRef.current) {
        const touch = e.touches[0];
        setTouchState((prev) => ({
          ...prev,
          currentX: touch.clientX,
          currentY: touch.clientY,
        }));
      } else if (e.touches.length === 2 && enablePinchZoom && lastTouchRef.current) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = getDistance(touch1, touch2);
        const scale = distance / lastTouchRef.current.distance;
        setTouchState((prev) => ({
          ...prev,
          distance,
          scale: Math.max(0.5, Math.min(3, prev.scale * scale)),
        }));
        if (handlers.onPinchZoom) {
          handlers.onPinchZoom(scale);
        }
        lastTouchRef.current = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
          distance,
        };
      }
    },
    [enablePinchZoom, handlers, getDistance]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (deltaTime < 300 && (absX > threshold || absY > threshold)) {
        if (absX > absY) {
          if (deltaX > threshold && handlers.onSwipeRight) {
            handlers.onSwipeRight();
          } else if (deltaX < -threshold && handlers.onSwipeLeft) {
            handlers.onSwipeLeft();
          }
        } else {
          if (deltaY > threshold && handlers.onSwipeDown) {
            handlers.onSwipeDown();
          } else if (deltaY < -threshold && handlers.onSwipeUp) {
            handlers.onSwipeUp();
          }
        }
      }

      touchStartRef.current = null;
      lastTouchRef.current = null;
      setTouchState({
        isTouching: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        distance: 0,
        scale: 1,
      });
    },
    [handlers, threshold]
  );

  return {
    touchState,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}







