import { useEffect, useState } from 'react';
import { useWeb3 } from '../lib/web3-provider';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Wallet, ChevronDown, LogOut, Network, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatAddress } from '../lib/ens-utils';
import { reverseResolveAddress } from '../lib/ens-utils';

export function WalletConnect() {
  const { address, isConnected, chainId, connect, disconnect, switchNetwork, publicClient } = useWeb3();
  const [ensName, setEnsName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch ENS name for connected address
  useEffect(() => {
    async function fetchENSName() {
      if (isConnected && address && publicClient) {
        setIsLoading(true);
        try {
          const name = await reverseResolveAddress(publicClient, address);
          setEnsName(name);
        } catch (error) {
          console.error('Error fetching ENS name:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setEnsName(null);
      }
    }

    fetchENSName();
  }, [isConnected, address, publicClient]);

  const getNetworkName = (chainId: number | null): string => {
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

  const getNetworkColor = (chainId: number | null): string => {
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

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    }
  };

  const viewOnExplorer = () => {
    if (address && chainId) {
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
    }
  };

  if (!isConnected) {
    return (
      <Button onClick={connect} className="gap-2">
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-4 py-2 text-sm ring-offset-white transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
          <div className={`h-2 w-2 rounded-full ${getNetworkColor(chainId)}`} />
          <span className="hidden md:inline">
            {isLoading ? 'Loading...' : ensName || (address ? formatAddress(address) : 'Connected')}
          </span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Wallet Connected</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-2 space-y-3">
          {/* ENS Name or Address */}
          <div>
            <p className="text-slate-600 mb-1">Account</p>
            {ensName ? (
              <div>
                <p className="text-slate-900">{ensName}</p>
                <code className="text-slate-600 break-all">{address}</code>
              </div>
            ) : (
              <code className="text-slate-900 break-all">{address}</code>
            )}
          </div>

          {/* Network */}
          <div>
            <p className="text-slate-600 mb-1">Network</p>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getNetworkColor(chainId)}`} />
              <span className="text-slate-900">{getNetworkName(chainId)}</span>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Actions */}
        <DropdownMenuItem onClick={copyAddress}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Address
        </DropdownMenuItem>

        <DropdownMenuItem onClick={viewOnExplorer}>
          <ExternalLink className="h-4 w-4 mr-2" />
          View on Explorer
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => switchNetwork(1)}>
          <Network className="h-4 w-4 mr-2" />
          Switch to Mainnet
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => switchNetwork(11155111)}>
          <Network className="h-4 w-4 mr-2" />
          Switch to Sepolia
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={disconnect} className="text-red-600">
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
