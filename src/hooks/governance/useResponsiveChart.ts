import { useMemo, useState, useEffect } from 'react';
import { useIsMobile } from '@/components/ui/use-mobile';

export interface ResponsiveChartConfig {
  height: number;
  fontSize: number;
  tickFontSize: number;
  legendFontSize: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  xAxisAngle: number;
  xAxisHeight: number;
  showLegend: boolean;
  compact: boolean;
}

export function useResponsiveChart(
  defaultHeight: number = 400,
  options?: {
    mobileHeight?: number;
    tabletHeight?: number;
    compact?: boolean;
  }
): ResponsiveChartConfig {
  const isMobile = useIsMobile();
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTablet = useMemo(() => width >= 768 && width < 1024, [width]);

  return useMemo(() => {
    const mobileHeight = options?.mobileHeight ?? Math.min(defaultHeight * 0.6, 250);
    const tabletHeight = options?.tabletHeight ?? Math.min(defaultHeight * 0.8, 320);
    const height = isMobile ? mobileHeight : isTablet ? tabletHeight : defaultHeight;

    if (isMobile || options?.compact) {
      return {
        height,
        fontSize: 10,
        tickFontSize: 9,
        legendFontSize: 10,
        margin: {
          top: 10,
          right: 10,
          bottom: 40,
          left: 40,
        },
        xAxisAngle: -45,
        xAxisHeight: 60,
        showLegend: true,
        compact: true,
      };
    }

    if (isTablet) {
      return {
        height,
        fontSize: 11,
        tickFontSize: 10,
        legendFontSize: 11,
        margin: {
          top: 15,
          right: 15,
          bottom: 50,
          left: 50,
        },
        xAxisAngle: -30,
        xAxisHeight: 70,
        showLegend: true,
        compact: false,
      };
    }

    return {
      height,
      fontSize: 12,
      tickFontSize: 11,
      legendFontSize: 12,
      margin: {
        top: 20,
        right: 20,
        bottom: 60,
        left: 60,
      },
      xAxisAngle: -45,
      xAxisHeight: 80,
      showLegend: true,
      compact: false,
    };
  }, [isMobile, isTablet, defaultHeight, options]);
}







