import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Wallet, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WalletInfo {
  id: string;
  name: string;
  icon?: string;
  provider: any;
  isInstalled: boolean;
  downloadUrl?: string;
}

export interface WalletSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWalletSelect: (provider: any, walletId: string) => Promise<void>;
}

// Common wallet providers to detect
const KNOWN_WALLETS: Record<string, { name: string; icon?: string; downloadUrl: string; detection?: (ethereum: any) => boolean }> = {
  metamask: {
    name: 'MetaMask',
    icon: undefined,
    downloadUrl: 'https://metamask.io/download/',
    detection: (ethereum: any) => ethereum?.isMetaMask || ethereum?.providerMap?.get('MetaMask') || false,
  },
  coinbase: {
    name: 'Coinbase Wallet',
    icon: undefined,
    downloadUrl: 'https://www.coinbase.com/wallet',
    detection: (ethereum: any) => ethereum?.isCoinbaseWallet || ethereum?.providers?.some((p: any) => p.isCoinbaseWallet) || false,
  },
  trust: {
    name: 'Trust Wallet',
    icon: undefined,
    downloadUrl: 'https://trustwallet.com/',
    detection: (ethereum: any) => ethereum?.isTrust || ethereum?.isTrustWallet || false,
  },
  rainbow: {
    name: 'Rainbow',
    icon: undefined,
    downloadUrl: 'https://rainbow.me/',
    detection: (ethereum: any) => ethereum?.isRainbow || false,
  },
  brave: {
    name: 'Brave Wallet',
    icon: undefined,
    downloadUrl: 'https://brave.com/wallet/',
    detection: (ethereum: any) => ethereum?.isBraveWallet || ethereum?._isProvider === true && ethereum?.isBraveWallet || false,
  },
  ledger: {
    name: 'Ledger',
    icon: undefined,
    downloadUrl: 'https://www.ledger.com/ledger-live',
    detection: (ethereum: any) => ethereum?.isLedger || false,
  },
  zerion: {
    name: 'Zerion',
    icon: undefined,
    downloadUrl: 'https://zerion.io/',
    detection: (ethereum: any) => ethereum?.isZerion || false,
  },
  frame: {
    name: 'Frame',
    icon: undefined,
    downloadUrl: 'https://frame.sh/',
    detection: (ethereum: any) => ethereum?.isFrame || false,
  },
  coinbaseWalletSDK: {
    name: 'Coinbase Wallet',
    icon: undefined,
    downloadUrl: 'https://www.coinbase.com/wallet',
  },
  phantom: {
    name: 'Phantom',
    icon: undefined,
    downloadUrl: 'https://phantom.app/',
    detection: (ethereum: any) => ethereum?.isPhantom || false,
  },
  okx: {
    name: 'OKX Wallet',
    icon: undefined,
    downloadUrl: 'https://www.okx.com/web3',
    detection: (ethereum: any) => ethereum?.isOKExWallet || ethereum?.isOkxWallet || false,
  },
  bitget: {
    name: 'Bitget Wallet',
    icon: undefined,
    downloadUrl: 'https://web3.bitget.com/',
    detection: (ethereum: any) => ethereum?.isBitKeep || ethereum?.isBitget || false,
  },
  tokenpocket: {
    name: 'TokenPocket',
    icon: undefined,
    downloadUrl: 'https://tokenpocket.pro/',
    detection: (ethereum: any) => ethereum?.isTokenPocket || false,
  },
  walletconnect: {
    name: 'WalletConnect',
    icon: undefined,
    downloadUrl: 'https://walletconnect.com/',
  },
  imtoken: {
    name: 'imToken',
    icon: undefined,
    downloadUrl: 'https://token.im/',
    detection: (ethereum: any) => ethereum?.isImToken || false,
  },
};

export function WalletSelectionModal({ open, onOpenChange, onWalletSelect }: WalletSelectionModalProps) {
  const [detectedWallets, setDetectedWallets] = useState<WalletInfo[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Reset state when modal opens
      setIsConnecting(null);
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        detectWallets();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Reset when modal closes
      setIsConnecting(null);
    }
  }, [open]);

  // Set up EIP-6963 listener on mount (not just when modal opens)
  useEffect(() => {
    const handleProviderAnnounce = (event: CustomEvent) => {
      const detail = event.detail;
      const provider = detail.provider || detail;
      const info = detail.info || {};
      
      const walletId = info.uuid || info.name?.toLowerCase().replace(/\s+/g, '') || `provider-${Date.now()}`;
      const walletName = info.name || 'Unknown Wallet';
      const walletIcon = info.icon;

      // Update detected wallets state
      setDetectedWallets(prev => {
        // Check if already added
        if (prev.some(w => w.id === walletId)) {
          return prev;
        }
        
        return [...prev, {
          id: walletId,
          name: walletName,
          icon: walletIcon,
          provider: provider,
          isInstalled: true,
        }];
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('eip6963:announceProvider', handleProviderAnnounce as EventListener);
      // Request wallet providers announce themselves
      window.dispatchEvent(new Event('eip6963:requestProvider'));
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('eip6963:announceProvider', handleProviderAnnounce as EventListener);
      }
    };
  }, []);

  const detectWallets = () => {
    const wallets: WalletInfo[] = [];
    const detectedIds = new Set<string>();

    if (typeof window === 'undefined') {
      setDetectedWallets([]);
      return;
    }

    const ethereum = (window as any).ethereum;

    // Debug logging
    console.log('Detecting wallets...', { 
      hasEthereum: !!ethereum, 
      hasProviders: !!ethereum?.providers,
      providersCount: ethereum?.providers?.length || 0 
    });

    // Request EIP-6963 providers again (in case they announce late)
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('eip6963:requestProvider'));
      }
    } catch (e) {
      console.debug('EIP-6963 request failed:', e);
    }

    // Check for window.ethereum.providers (multiple providers)
    if (ethereum?.providers && Array.isArray(ethereum.providers)) {
      console.log(`Found ${ethereum.providers.length} providers in ethereum.providers`);
      ethereum.providers.forEach((provider: any, index: number) => {
        let walletId = `provider-${index}`;
        let walletName = `Wallet ${index + 1}`;
        let walletIcon = undefined;

        // Try to identify the provider
        if (provider.isMetaMask && !detectedIds.has('metamask')) {
          walletId = 'metamask';
          walletName = KNOWN_WALLETS.metamask.name;
          walletIcon = KNOWN_WALLETS.metamask.icon || walletIcon;
          detectedIds.add('metamask');
          console.log('Detected MetaMask');
        } else if (provider.isCoinbaseWallet && !detectedIds.has('coinbase')) {
          walletId = 'coinbase';
          walletName = KNOWN_WALLETS.coinbase.name;
          walletIcon = KNOWN_WALLETS.coinbase.icon || walletIcon;
          detectedIds.add('coinbase');
          console.log('Detected Coinbase Wallet');
        } else if (provider.isBraveWallet && !detectedIds.has('brave')) {
          walletId = 'brave';
          walletName = KNOWN_WALLETS.brave.name;
          walletIcon = KNOWN_WALLETS.brave.icon || walletIcon;
          detectedIds.add('brave');
          console.log('Detected Brave Wallet');
        } else {
          // Check all known wallets
          for (const [id, info] of Object.entries(KNOWN_WALLETS)) {
            if (info.detection && info.detection(provider) && !detectedIds.has(id)) {
              walletId = id;
              walletName = info.name;
              walletIcon = info.icon || walletIcon;
              detectedIds.add(id);
              console.log(`Detected ${info.name}`);
              break;
            }
          }
        }

        wallets.push({
          id: walletId,
          name: walletName,
          icon: walletIcon,
          provider,
          isInstalled: true,
        });
      });
    }

    // Check for direct window.ethereum (single provider)
    // Only check if we haven't found any wallets yet, or if ethereum.providers doesn't exist
    if (ethereum && (!ethereum.providers || !Array.isArray(ethereum.providers) || ethereum.providers.length === 0)) {
      let walletId = 'ethereum';
      let walletName = 'Ethereum Provider';
      let walletIcon = undefined;

      // Try to identify which wallet it is
      for (const [id, info] of Object.entries(KNOWN_WALLETS)) {
        if (info.detection && info.detection(ethereum)) {
          walletId = id;
          walletName = info.name;
          walletIcon = info.icon || walletIcon;
          detectedIds.add(id);
          break;
        }
      }

      // Fallback to simple checks
      if (!detectedIds.has('metamask') && ethereum.isMetaMask) {
        walletId = 'metamask';
        walletName = KNOWN_WALLETS.metamask.name;
        walletIcon = KNOWN_WALLETS.metamask.icon || walletIcon;
        detectedIds.add('metamask');
        console.log('Detected MetaMask (direct)');
      } else if (!detectedIds.has('coinbase') && ethereum.isCoinbaseWallet) {
        walletId = 'coinbase';
        walletName = KNOWN_WALLETS.coinbase.name;
        walletIcon = KNOWN_WALLETS.coinbase.icon || walletIcon;
        detectedIds.add('coinbase');
        console.log('Detected Coinbase Wallet (direct)');
      } else if (!detectedIds.has('brave') && ethereum.isBraveWallet) {
        walletId = 'brave';
        walletName = KNOWN_WALLETS.brave.name;
        walletIcon = KNOWN_WALLETS.brave.icon || walletIcon;
        detectedIds.add('brave');
        console.log('Detected Brave Wallet (direct)');
      }

      // Only add if we haven't already added this provider
      if (!detectedIds.has(walletId)) {
        wallets.push({
          id: walletId,
          name: walletName,
          icon: walletIcon,
          provider: ethereum,
          isInstalled: true,
        });
        detectedIds.add(walletId);
        console.log(`Added ${walletName} as installed wallet`);
      }
    }

    // Add known wallets that aren't installed (for download links)
    // Only add if we haven't detected them and they're not in the detected list
    Object.entries(KNOWN_WALLETS).forEach(([id, info]) => {
      // Skip duplicates (coinbase vs coinbaseWalletSDK, etc.)
      if (id === 'coinbaseWalletSDK' && detectedIds.has('coinbase')) {
        return;
      }

      if (!detectedIds.has(id)) {
        wallets.push({
          id,
          name: info.name,
          icon: info.icon,
          provider: null,
          isInstalled: false,
          downloadUrl: info.downloadUrl,
        });
      }
    });

    // Sort: installed first, then alphabetical
    wallets.sort((a, b) => {
      if (a.isInstalled && !b.isInstalled) return -1;
      if (!a.isInstalled && b.isInstalled) return 1;
      return a.name.localeCompare(b.name);
    });

    setDetectedWallets(wallets);
  };

  const handleWalletClick = async (wallet: WalletInfo) => {
    if (!wallet.isInstalled) {
      if (wallet.downloadUrl) {
        window.open(wallet.downloadUrl, '_blank');
        toast.info(`Opening ${wallet.name} download page...`);
      }
      return;
    }

    if (!wallet.provider || !wallet.provider.request) {
      toast.error(`Cannot connect to ${wallet.name}`, {
        description: 'Wallet provider is not available',
      });
      return;
    }

    setIsConnecting(wallet.id);
    try {
      // Pass the provider directly to the select handler
      await onWalletSelect(wallet.provider, wallet.id);
      // Modal will be closed by the parent component on success
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      // Don't show error here - parent component handles it
      // Just reset connecting state
    } finally {
      setIsConnecting(null);
    }
  };

  const installedWallets = detectedWallets.filter(w => w.isInstalled);
  const notInstalledWallets = detectedWallets.filter(w => !w.isInstalled);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Choose a wallet to connect to your account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {installedWallets.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-700">Installed Wallets</h3>
              <div className="grid gap-2">
                {installedWallets.map((wallet) => (
                  <Button
                    key={wallet.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-4"
                    onClick={() => handleWalletClick(wallet)}
                    disabled={isConnecting !== null}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {wallet.icon && (
                        <span className="text-2xl">{wallet.icon}</span>
                      )}
                      {wallet.icon && wallet.icon.startsWith('data:') && (
                        <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 rounded" />
                      )}
                      {!wallet.icon && <Wallet className="h-6 w-6 text-slate-500" />}
                      <div className="flex-1 text-left">
                        <div className="font-medium">{wallet.name}</div>
                        <div className="text-xs text-slate-500">
                          {isConnecting === wallet.id ? 'Connecting...' : 'Click to connect'}
                        </div>
                      </div>
                      {isConnecting === wallet.id && (
                        <div className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {notInstalledWallets.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-700">Get a Wallet</h3>
              <div className="grid gap-2">
                {notInstalledWallets.map((wallet) => (
                  <Button
                    key={wallet.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-4 border border-slate-200"
                    onClick={() => handleWalletClick(wallet)}
                    disabled={isConnecting !== null}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {wallet.icon && (
                        <span className="text-2xl">{wallet.icon}</span>
                      )}
                      <div className="flex-1 text-left">
                        <div className="font-medium">{wallet.name}</div>
                        <div className="text-xs text-slate-500">Not installed</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {detectedWallets.length === 0 && (
            <div className="py-8 text-center space-y-3">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto" />
              <div>
                <p className="font-medium text-slate-900">No wallets detected</p>
                <p className="text-sm text-slate-600 mt-1">
                  Please install a Web3 wallet to continue
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.open('https://ethereum.org/en/wallets/', '_blank')}
                className="mt-4"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Browse Wallets
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

