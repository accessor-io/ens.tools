import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import { useEffect } from 'react';

export function WalletConnectRainbow() {
  const { address } = useAccount();
  const chainId = useChainId();
  // Set global variables for master database sync (maintain compatibility)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__ENS_ACCOUNT_ADDRESS__ = address || null;
      (window as any).__ENS_CHAIN_ID__ = chainId || null;
      if (!(window as any).__ENS_SESSION_ID__) {
        (window as any).__ENS_SESSION_ID__ = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
    }
  }, [address, chainId]);

  // Debug: Log wallet detection when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      const ethereum = (window as any).ethereum;
      if (ethereum) {
        console.log('Wallet detection:', {
          hasEthereum: !!ethereum,
          isMetaMask: ethereum.isMetaMask,
          isCoinbaseWallet: ethereum.isCoinbaseWallet,
          isBraveWallet: ethereum.isBraveWallet,
          hasProviders: !!ethereum.providers,
          providersCount: ethereum.providers?.length || 0,
        });
      } else {
        console.log('No wallet detected. Make sure you have a wallet extension installed (MetaMask, Coinbase Wallet, etc.)');
      }
    }
  }, []);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-4 py-2 text-sm font-medium shadow-lg shadow-violet-500/50 transition-colors"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-red-300 bg-red-50 text-red-700 px-4 py-2 text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 12, height: 12 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ''}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

