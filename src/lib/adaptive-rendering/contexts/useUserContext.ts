import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { userConfigService } from '../../services/user-config-service';
import type { UserContextState } from '../types';
import { getDefaultContextState } from '../context-registry';

/**
 * Hook to access user context state
 * Reads user preferences and permissions from config service
 */
export function useUserContext(): UserContextState {
  const { address } = useAccount();

  const userState = useMemo<UserContextState>(() => {
    const defaultState = getDefaultContextState('user');

    if (!address) {
      return defaultState;
    }

    try {
      const userConfig = userConfigService.getUserConfig(address);
      
      return {
        preferences: {
          ...userConfig.displayOptions,
          consoleColors: userConfig.consoleColors,
          auditLogEnabled: userConfig.auditLogEnabled,
          notifications: userConfig.notifications,
        },
        permissions: undefined,
        role: undefined,
      };
    } catch (error) {
      console.warn('Error loading user context:', error);
      return defaultState;
    }
  }, [address]);

  return userState;
}
