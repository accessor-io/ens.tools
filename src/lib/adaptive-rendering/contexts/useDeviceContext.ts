import { useEffect, useState, useMemo } from 'react';
import type { DeviceContextState } from '../types';
import { getDefaultContextState } from '../context-registry';

/**
 * Hook to access device context state
 * Tracks viewport, device type, orientation, and capabilities
 */
export function useDeviceContext(): DeviceContextState {
  const [deviceState, setDeviceState] = useState<DeviceContextState>(() => {
    if (typeof window === 'undefined') {
      return getDefaultContextState('device');
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (width < 640) {
      deviceType = 'mobile';
    } else if (width < 1024) {
      deviceType = 'tablet';
    }

    return {
      viewport: { width, height },
      deviceType,
      orientation: width > height ? 'landscape' : 'portrait',
      touchSupport: 'ontouchstart' in window,
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDeviceState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (width < 640) {
        deviceType = 'mobile';
      } else if (width < 1024) {
        deviceType = 'tablet';
      }

      setDeviceState({
        viewport: { width, height },
        deviceType,
        orientation: width > height ? 'landscape' : 'portrait',
        touchSupport: 'ontouchstart' in window,
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      });
    };

    window.addEventListener('resize', updateDeviceState);
    window.addEventListener('orientationchange', updateDeviceState);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleReducedMotion = () => {
      setDeviceState((prev) => ({
        ...prev,
        prefersReducedMotion: mediaQuery.matches,
      }));
    };
    mediaQuery.addEventListener('change', handleReducedMotion);

    return () => {
      window.removeEventListener('resize', updateDeviceState);
      window.removeEventListener('orientationchange', updateDeviceState);
      mediaQuery.removeEventListener('change', handleReducedMotion);
    };
  }, []);

  return deviceState;
}
