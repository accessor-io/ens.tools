import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Wallet, ExternalLink, AlertCircle, Smartphone, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

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

// Industry standard wallet configuration
const KNOWN_WALLETS: Record<string, { 
  name: string; 
  icon?: string; 
  downloadUrl: string; 
  detection?: (ethereum: any) => boolean;
  category: 'popular' | 'mobile' | 'hardware' | 'other';
  priority: number; // Lower = higher priority
}> = {
  metamask: {
    name: 'MetaMask',
    icon: undefined,
    downloadUrl: 'https://metamask.io/download/',
    detection: (ethereum: any) => ethereum?.isMetaMask || ethereum?.providerMap?.get('MetaMask') || false,
    category: 'popular',
    priority: 1,
  },
  coinbase: {
    name: 'Coinbase Wallet',
    icon: undefined,
    downloadUrl: 'https://www.coinbase.com/wallet',
    detection: (ethereum: any) => ethereum?.isCoinbaseWallet || ethereum?.providers?.some((p: any) => p.isCoinbaseWallet) || false,
    category: 'popular',
    priority: 2,
  },
  walletconnect: {
    name: 'WalletConnect',
    icon: undefined,
    downloadUrl: 'https://walletconnect.com/',
    category: 'popular',
    priority: 3,
  },
  rainbow: {
    name: 'Rainbow',
    icon: undefined,
    downloadUrl: 'https://rainbow.me/',
    detection: (ethereum: any) => ethereum?.isRainbow || false,
    category: 'popular',
    priority: 4,
  },
  trust: {
    name: 'Trust Wallet',
    icon: undefined,
    downloadUrl: 'https://trustwallet.com/',
    detection: (ethereum: any) => ethereum?.isTrust || ethereum?.isTrustWallet || false,
    category: 'mobile',
    priority: 5,
  },
  phantom: {
    name: 'Phantom',
    icon: undefined,
    downloadUrl: 'https://phantom.app/',
    detection: (ethereum: any) => ethereum?.isPhantom || false,
    category: 'mobile',
    priority: 6,
  },
  ledger: {
    name: 'Ledger',
    icon: undefined,
    downloadUrl: 'https://www.ledger.com/ledger-live',
    detection: (ethereum: any) => ethereum?.isLedger || false,
    category: 'hardware',
    priority: 7,
  },
  brave: {
    name: 'Brave Wallet',
    icon: undefined,
    downloadUrl: 'https://brave.com/wallet/',
    detection: (ethereum: any) => ethereum?.isBraveWallet || ethereum?._isProvider === true && ethereum?.isBraveWallet || false,
    category: 'other',
    priority: 8,
  },
  zerion: {
    name: 'Zerion',
    icon: undefined,
    downloadUrl: 'https://zerion.io/',
    detection: (ethereum: any) => ethereum?.isZerion || false,
    category: 'other',
    priority: 9,
  },
  frame: {
    name: 'Frame',
    icon: undefined,
    downloadUrl: 'https://frame.sh/',
    detection: (ethereum: any) => ethereum?.isFrame || false,
    category: 'other',
    priority: 10,
  },
  okx: {
    name: 'OKX Wallet',
    icon: undefined,
    downloadUrl: 'https://www.okx.com/web3',
    detection: (ethereum: any) => ethereum?.isOKExWallet || ethereum?.isOkxWallet || false,
    category: 'other',
    priority: 11,
  },
  bitget: {
    name: 'Bitget Wallet',
    icon: undefined,
    downloadUrl: 'https://web3.bitget.com/',
    detection: (ethereum: any) => ethereum?.isBitKeep || ethereum?.isBitget || false,
    category: 'other',
    priority: 12,
  },
  tokenpocket: {
    name: 'TokenPocket',
    icon: undefined,
    downloadUrl: 'https://tokenpocket.pro/',
    detection: (ethereum: any) => ethereum?.isTokenPocket || false,
    category: 'mobile',
    priority: 13,
  },
  imtoken: {
    name: 'imToken',
    icon: undefined,
    downloadUrl: 'https://token.im/',
    detection: (ethereum: any) => ethereum?.isImToken || false,
    category: 'mobile',
    priority: 14,
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

    // Sort: installed first, then by priority, then alphabetical
    wallets.sort((a, b) => {
      if (a.isInstalled && !b.isInstalled) return -1;
      if (!a.isInstalled && b.isInstalled) return 1;
      
      const aPriority = KNOWN_WALLETS[a.id]?.priority || 999;
      const bPriority = KNOWN_WALLETS[b.id]?.priority || 999;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
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
  
  // Categorize wallets
  const popularWallets = [...installedWallets, ...notInstalledWallets]
    .filter(w => KNOWN_WALLETS[w.id]?.category === 'popular')
    .slice(0, 6);
  const mobileWallets = [...installedWallets, ...notInstalledWallets]
    .filter(w => KNOWN_WALLETS[w.id]?.category === 'mobile');
  const hardwareWallets = [...installedWallets, ...notInstalledWallets]
    .filter(w => KNOWN_WALLETS[w.id]?.category === 'hardware');
  const otherWallets = [...installedWallets, ...notInstalledWallets]
    .filter(w => KNOWN_WALLETS[w.id]?.category === 'other' || !KNOWN_WALLETS[w.id]);

  const renderWalletButton = (wallet: WalletInfo, showStatus = true) => {
    const isConnectingThis = isConnecting === wallet.id;
    const walletConfig = KNOWN_WALLETS[wallet.id];
    const categoryIcon = walletConfig?.category === 'mobile' ? Smartphone : 
                        walletConfig?.category === 'hardware' ? Shield : Wallet;

    return (
      <Button
        key={wallet.id}
        variant={wallet.isInstalled ? "outline" : "ghost"}
        className={`w-full justify-start h-auto py-3 px-4 transition-all ${
          wallet.isInstalled 
            ? 'hover:bg-slate-50 hover:border-slate-300' 
            : 'border border-slate-200 hover:bg-slate-50'
        }`}
        onClick={() => handleWalletClick(wallet)}
        disabled={isConnecting !== null}
      >
        <div className="flex items-center gap-3 w-full">
          {wallet.icon && wallet.icon.startsWith('data:') ? (
            <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 rounded-lg" />
          ) : wallet.icon ? (
            <span className="text-2xl">{wallet.icon}</span>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              {React.createElement(categoryIcon, { className: "h-4 w-4 text-white" })}
            </div>
          )}
          <div className="flex-1 text-left">
            <div className="font-semibold text-slate-900">{wallet.name}</div>
            {showStatus && (
              <div className="text-xs text-slate-500 mt-0.5">
                {isConnectingThis ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Connecting...
                  </span>
                ) : wallet.isInstalled ? (
                  'Click to connect'
                ) : (
                  'Not installed'
                )}
              </div>
            )}
          </div>
          {!wallet.isInstalled && (
            <ExternalLink className="h-4 w-4 text-slate-400" />
          )}
          {isConnectingThis && wallet.isInstalled && (
            <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
          )}
        </div>
      </Button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Connect a Wallet</DialogTitle>
          <DialogDescription>
            Connect with one of our available wallet providers or create a new wallet
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="popular" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="mobile">Mobile</TabsTrigger>
            <TabsTrigger value="hardware">Hardware</TabsTrigger>
            <TabsTrigger value="more">More</TabsTrigger>
          </TabsList>

          <TabsContent value="popular" className="mt-4 space-y-3">
            {popularWallets.length > 0 ? (
              <div className="grid gap-2">
                {popularWallets.map((wallet) => renderWalletButton(wallet))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Wallet className="h-10 w-10 text-slate-400 mx-auto" />
                <p className="text-sm text-slate-600">No popular wallets available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mobile" className="mt-4 space-y-3">
            {mobileWallets.length > 0 ? (
              <div className="grid gap-2">
                {mobileWallets.map((wallet) => renderWalletButton(wallet))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Smartphone className="h-10 w-10 text-slate-400 mx-auto" />
                <p className="text-sm text-slate-600">No mobile wallets available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="hardware" className="mt-4 space-y-3">
            {hardwareWallets.length > 0 ? (
              <div className="grid gap-2">
                {hardwareWallets.map((wallet) => renderWalletButton(wallet))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Shield className="h-10 w-10 text-slate-400 mx-auto" />
                <p className="text-sm text-slate-600">No hardware wallets available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="more" className="mt-4 space-y-3">
            {otherWallets.length > 0 ? (
              <div className="grid gap-2">
                {otherWallets.map((wallet) => renderWalletButton(wallet))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Wallet className="h-10 w-10 text-slate-400 mx-auto" />
                <p className="text-sm text-slate-600">No additional wallets available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {detectedWallets.length === 0 && (
          <div className="py-8 text-center space-y-3 border-t mt-4 pt-4">
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

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-slate-500 text-center">
            New to Ethereum?{' '}
            <a 
              href="https://ethereum.org/en/wallets/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-violet-600 hover:underline"
            >
              Learn more about wallets
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

