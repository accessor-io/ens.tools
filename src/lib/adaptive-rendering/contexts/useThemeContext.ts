import { useEffect, useState, useMemo } from 'react';
import { userConfigService } from '../../services/user-config-service';
import type { ThemeContextState } from '../types';
import { getDefaultContextState } from '../context-registry';

/**
 * Hook to access theme context state
 * Reads from user config service and system preferences
 */
export function useThemeContext(): ThemeContextState {
  const [themeState, setThemeState] = useState<ThemeContextState>(() => {
    const defaultState = getDefaultContextState('theme');
    
    if (typeof window === 'undefined') {
      return defaultState;
    }

    try {
      const account = localStorage.getItem('ens_last_account') || '';
      const userConfig = account ? userConfigService.getUserConfig(account) : null;
      
      if (userConfig?.displayOptions) {
        return {
          theme: userConfig.displayOptions.theme || defaultState.theme,
          compactMode: userConfig.displayOptions.compactMode ?? defaultState.compactMode,
          highContrast: false,
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        };
      }
    } catch (error) {
      console.warn('Error loading theme context:', error);
    }

    return defaultState;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateTheme = () => {
      try {
        const account = localStorage.getItem('ens_last_account') || '';
        const userConfig = account ? userConfigService.getUserConfig(account) : null;
        
        if (userConfig?.displayOptions) {
          setThemeState((prev) => ({
            ...prev,
            theme: userConfig.displayOptions.theme || prev.theme,
            compactMode: userConfig.displayOptions.compactMode ?? prev.compactMode,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          }));
        }
      } catch (error) {
        console.warn('Error updating theme context:', error);
      }
    };

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', updateTheme);
    
    const interval = setInterval(updateTheme, 1000);
    
    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
      clearInterval(interval);
    };
  }, []);

  return themeState;
}
