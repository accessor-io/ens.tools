import { useAccount, useChainId } from 'wagmi';
import type { NetworkContextState } from '../types';
import { getDefaultContextState } from '../context-registry';

/**
 * Hook to access network context state
 * Integrates with wagmi for wallet and network information
 */
export function useNetworkContext(): NetworkContextState {
  try {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();

    return {
      chainId,
      networkStatus: isConnected && address ? 'connected' : 'disconnected',
      account: address || null,
      isConnected: isConnected && !!address,
    };
  } catch {
    return getDefaultContextState('network');
  }
}
