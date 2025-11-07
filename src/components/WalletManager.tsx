import { useEffect, useState } from 'react';
import { useWeb3 } from '../lib/services/web3-provider';
import { ManagedWallet } from '../lib/services/multi-wallet-manager';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Wallet, Plus, Trash2, Check, Copy, ExternalLink, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { formatAddress } from '../lib/ens';
import { WalletSelectionModal } from './WalletSelectionModal';

export function WalletManager() {
  const { getAllWallets, getActiveWallet, switchWallet, removeWallet, addWallet } = useWeb3();
  const [wallets, setWallets] = useState<ManagedWallet[]>([]);
  const [activeWallet, setActiveWallet] = useState<ManagedWallet | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const updateWallets = () => {
      setWallets(getAllWallets());
      setActiveWallet(getActiveWallet());
    };

    updateWallets();
    
    // Subscribe to wallet manager changes
    const interval = setInterval(updateWallets, 1000);
    return () => clearInterval(interval);
  }, [getAllWallets, getActiveWallet, refreshTrigger]);

  const handleSwitchWallet = async (walletId: string) => {
    try {
      await switchWallet(walletId);
      toast.success('Wallet switched');
      setRefreshTrigger((prev) => prev + 1);
    } catch (error: any) {
      toast.error('Failed to switch wallet', {
        description: error?.message || 'Please try again',
      });
    }
  };

  const handleRemoveWallet = (walletId: string) => {
    if (wallets.length === 1) {
      toast.error('Cannot remove the last wallet');
      return;
    }

    const wallet = wallets.find((w) => w.id === walletId);
    if (!wallet) return;

    removeWallet(walletId);
    toast.success('Wallet removed');
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleWalletSelect = async (provider: any, walletId: string) => {
    try {
      // Determine wallet name from walletId
      const walletName = walletId === 'metamask' ? 'MetaMask' :
                        walletId === 'coinbase' ? 'Coinbase Wallet' :
                        walletId === 'brave' ? 'Brave Wallet' :
                        walletId === 'trust' ? 'Trust Wallet' :
                        walletId === 'rainbow' ? 'Rainbow' :
                        walletId;

      await addWallet(provider, walletName, walletId);
      setShowAddModal(false);
      toast.success('Wallet added');
      setRefreshTrigger((prev) => prev + 1);
    } catch (error: any) {
      console.error('Error adding wallet:', error);
      toast.error('Failed to add wallet', {
        description: error?.message || 'Please try again',
      });
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const viewOnExplorer = (address: string, chainId: number) => {
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io',
      5: 'https://goerli.etherscan.io',
      11155111: 'https://sepolia.etherscan.io',
      137: 'https://polygonscan.com',
      42161: 'https://arbiscan.io',
      10: 'https://optimistic.etherscan.io',
      8453: 'https://basescan.org',
    };
    
    const explorerUrl = explorers[chainId] || 'https://etherscan.io';
    window.open(`${explorerUrl}/address/${address}`, '_blank');
  };

  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case 1:
        return 'Ethereum';
      case 5:
        return 'Goerli';
      case 11155111:
        return 'Sepolia';
      case 137:
        return 'Polygon';
      case 42161:
        return 'Arbitrum';
      case 10:
        return 'Optimism';
      case 8453:
        return 'Base';
      default:
        return 'Unknown';
    }
  };

  const getNetworkColor = (chainId: number): string => {
    switch (chainId) {
      case 1:
        return 'bg-blue-600';
      case 5:
      case 11155111:
        return 'bg-amber-600';
      case 137:
        return 'bg-purple-600';
      case 42161:
        return 'bg-cyan-600';
      case 10:
        return 'bg-red-600';
      case 8453:
        return 'bg-blue-500';
      default:
        return 'bg-slate-600';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Wallets</CardTitle>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Wallet
            </Button>
          </DialogTrigger>
          <WalletSelectionModal
            open={showAddModal}
            onOpenChange={setShowAddModal}
            onWalletSelect={handleWalletSelect}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        {wallets.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No wallets connected</p>
            <p className="text-xs mt-1">Click "Add Wallet" to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {wallets.map((wallet) => (
              <Card
                key={wallet.id}
                className={`cursor-pointer transition-colors ${
                  wallet.isActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="h-4 w-4 text-slate-500" />
                        <span className="font-medium text-sm">{wallet.walletName}</span>
                        {wallet.isActive && (
                          <Badge variant="default" className="text-xs">
                            Active
                          </Badge>
                        )}
                        <div className={`h-2 w-2 rounded-full ${getNetworkColor(wallet.chainId)}`} />
                        <span className="text-xs text-slate-500">
                          {getNetworkName(wallet.chainId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-slate-600 break-all">
                          {formatAddress(wallet.address)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddress(wallet.address);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewOnExplorer(wallet.address, wallet.chainId);
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Wallet Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {!wallet.isActive && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSwitchWallet(wallet.id);
                            }}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Switch to this wallet
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddress(wallet.address);
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Address
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            viewOnExplorer(wallet.address, wallet.chainId);
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on Explorer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveWallet(wallet.id);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Wallet
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}








