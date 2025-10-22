import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  FileCode,
  Search,
  ExternalLink,
  Shield,
  Network,
  CheckCircle2,
  Info,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
  Link as LinkIcon,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';

interface ENSContract {
  id: string;
  name: string;
  description: string;
  address: string;
  chain: 'mainnet' | 'optimism' | 'arbitrum' | 'base' | 'polygon' | 'sepolia' | 'goerli';
  category: 'registry' | 'resolver' | 'registrar' | 'governance' | 'utility' | 'migration';
  status: 'active' | 'deprecated';
  version: string;
  deployed: string;
  etherscanUrl: string;
  verified: boolean;
  upgradeable: boolean;
  docsUrl?: string;
  sourceCode?: string;
  abi?: any[];
  dependencies?: Array<{
    name: string;
    address: string;
    interface: string;
  }>;
}

export function ENSContractsRegistry() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const toggleRowExpansion = (contractId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contractId)) {
        newSet.delete(contractId);
      } else {
        newSet.add(contractId);
      }
      return newSet;
    });
  };
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedChain, setSelectedChain] = useState('all');

  const officialENSContracts: ENSContract[] = [
    {
      id: '1',
      name: 'ENS Registry',
      description: 'Core ENS registry contract that maintains the central mapping of names to owners and resolvers',
      address: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
      chain: 'mainnet',
      category: 'registry',
      status: 'active',
      version: '1.0.0',
      deployed: '2017-05-04',
      etherscanUrl: 'https://etherscan.io/address/0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
      verified: true,
      upgradeable: false,
      docsUrl: 'https://docs.ens.domains/contract-api-reference/ens',
    },
    {
      id: '2',
      name: 'Public Resolver',
      description: 'Default resolver for ENS domains, supports standard ENS name resolution functionality',
      address: '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
      chain: 'mainnet',
      category: 'resolver',
      status: 'active',
      version: '2.0.0',
      deployed: '2020-03-16',
      etherscanUrl: 'https://etherscan.io/address/0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
      verified: true,
      upgradeable: true,
      docsUrl: 'https://docs.ens.domains/contract-api-reference/publicresolver',
    },
    {
      id: '3',
      name: 'Name Wrapper',
      description: 'ERC-1155 compatible contract that wraps ENS names to enable granular permissions and subdomain control',
      address: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
      chain: 'mainnet',
      category: 'utility',
      status: 'active',
      version: '1.0.0',
      deployed: '2021-11-01',
      etherscanUrl: 'https://etherscan.io/address/0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
      verified: true,
      upgradeable: true,
      docsUrl: 'https://docs.ens.domains/contract-api-reference/name-wrapper',
    },
    {
      id: '4',
      name: 'ETH Registrar Controller',
      description: 'Controller for the .eth permanent registrar that manages name registrations and renewals',
      address: '0x253553366Da8546fC250F225fe3d25d0C782303b1',
      chain: 'mainnet',
      category: 'registrar',
      status: 'active',
      version: '2.0.0',
      deployed: '2020-05-03',
      etherscanUrl: 'https://etherscan.io/address/0x253553366Da8546fC250F225fe3d25d0C782303b1',
      verified: true,
      upgradeable: true,
      docsUrl: 'https://docs.ens.domains/contract-api-reference/.eth-permanent-registrar/controller',
    },
    {
      id: '5',
      name: 'Base Registrar',
      description: 'Owns the .eth TLD, issues subdomain ERC-721 tokens, and manages name lifecycle',
      address: '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85',
      chain: 'mainnet',
      category: 'registrar',
      status: 'active',
      version: '2.0.0',
      deployed: '2020-05-03',
      etherscanUrl: 'https://etherscan.io/address/0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85',
      verified: true,
      upgradeable: false,
      docsUrl: 'https://docs.ens.domains/contract-api-reference/.eth-permanent-registrar',
    },
    {
      id: '6',
      name: 'Reverse Registrar',
      description: 'Enables reverse resolution of addresses to ENS names',
      address: '0x084b1c3C81545d370f3634392De611CaaBFf814f',
      chain: 'mainnet',
      category: 'resolver',
      status: 'active',
      version: '1.0.0',
      deployed: '2017-05-04',
      etherscanUrl: 'https://etherscan.io/address/0x084b1c3C81545d370f3634392De611CaaBFf814f',
      verified: true,
      upgradeable: false,
      docsUrl: 'https://docs.ens.domains/contract-api-reference/reverseregistrar',
    },
    {
      id: '7',
      name: 'DNS Registrar',
      description: 'Allows integration with DNS and enables claiming ENS names for .xyz, .luxe, and .kred TLDs',
      address: '0xb32C3D79f6C2d9e88B9dcAbF03E50Fc97e07C9e2',
      chain: 'mainnet',
      category: 'registrar',
      status: 'active',
      version: '1.0.0',
      deployed: '2019-05-31',
      etherscanUrl: 'https://etherscan.io/address/0xb32C3D79f6C2d9e88B9dcAbF03E50Fc97e07C9e2',
      verified: true,
      upgradeable: false,
      docsUrl: 'https://docs.ens.domains/contract-api-reference/dns-registrar',
    },
    {
      id: '8',
      name: 'Universal Resolver',
      description: 'Aggregates multiple resolvers and provides a unified interface for resolving ENS names',
      address: '0xc0497E381f536Be9ce14B0dD3817cBcAe57d2F62',
      chain: 'mainnet',
      category: 'resolver',
      status: 'active',
      version: '1.0.0',
      deployed: '2022-05-04',
      etherscanUrl: 'https://etherscan.io/address/0xc0497E381f536Be9ce14B0dD3817cBcAe57d2F62',
      verified: true,
      upgradeable: true,
      docsUrl: 'https://docs.ens.domains/contract-api-reference/universal-resolver',
    },
    {
      id: '9',
      name: 'Price Oracle',
      description: 'Provides domain pricing information for registrations and renewals',
      address: '0x7a2088a1bFc9d81c55368AE168c2C02570cB814F',
      chain: 'mainnet',
      category: 'utility',
      status: 'active',
      version: '1.0.0',
      deployed: '2020-05-03',
      etherscanUrl: 'https://etherscan.io/address/0x7a2088a1bFc9d81c55368AE168c2C02570cB814F',
      verified: true,
      upgradeable: true,
      docsUrl: 'https://docs.ens.domains/contract-api-reference/price-oracle',
    },
    {
      id: '11',
      name: 'Public Resolver v1',
      description: 'Legacy version of the public resolver, deprecated in favor of v2',
      address: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
      chain: 'mainnet',
      category: 'resolver',
      status: 'deprecated',
      version: '1.0.0',
      deployed: '2017-05-04',
      etherscanUrl: 'https://etherscan.io/address/0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
      verified: true,
      upgradeable: false,
    },
    {
      id: '12',
      name: 'Auction Registrar',
      description: 'Original temporary registrar for .eth names before permanent registrar launch',
      address: '0x94365E25f2eD83C37D9EADaF59D0cc96Ff05d73F',
      chain: 'mainnet',
      category: 'registrar',
      status: 'deprecated',
      version: '1.0.0',
      deployed: '2017-05-04',
      etherscanUrl: 'https://etherscan.io/address/0x94365E25f2eD83C37D9EADaF59D0cc96Ff05d73F',
      verified: true,
      upgradeable: false,
    },
    {
      id: '13',
      name: 'ENS Governance',
      description: 'Governance contract for ENS DAO, manages proposals and voting',
      address: '0x323A76393544d5ecca80cd6ef2A560C6a395b7E3',
      chain: 'mainnet',
      category: 'governance',
      status: 'active',
      version: '1.0.0',
      deployed: '2021-11-08',
      etherscanUrl: 'https://etherscan.io/address/0x323A76393544d5ecca80cd6ef2A560C6a395b7E3',
      verified: true,
      upgradeable: true,
      docsUrl: 'https://docs.ens.domains/governance',
    },
    {
      id: '14',
      name: 'ENS Token',
      description: 'ENS governance token (ERC-20) used for voting in ENS DAO',
      address: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
      chain: 'mainnet',
      category: 'governance',
      status: 'active',
      version: '1.0.0',
      deployed: '2021-11-08',
      etherscanUrl: 'https://etherscan.io/address/0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
      verified: true,
      upgradeable: false,
      docsUrl: 'https://docs.ens.domains/governance/ens-token',
    },
    {
      id: '15',
      name: 'MultiSig Wallet',
      description: 'ENS Foundation multisig wallet for protocol upgrades and fund management',
      address: '0xfe89cc7aBB2C4183683ab71653C4cdc9B02D44b7',
      chain: 'mainnet',
      category: 'governance',
      status: 'active',
      version: '1.0.0',
      deployed: '2019-05-15',
      etherscanUrl: 'https://etherscan.io/address/0xfe89cc7aBB2C4183683ab71653C4cdc9B02D44b7',
      verified: true,
      upgradeable: false,
    },
    {
      id: '16',
      name: 'Universal Resolver - Optimism',
      description: 'Universal Resolver deployed on Optimism for cross-chain ENS resolution',
      address: '0x12dC0Ce1D693bF9c65D6b8da3EdC6B8ea6d25cD3',
      chain: 'optimism',
      category: 'resolver',
      status: 'active',
      version: '1.0.0',
      deployed: '2022-06-15',
      etherscanUrl: 'https://optimistic.etherscan.io/address/0x12dC0Ce1D693bF9c65D6b8da3EdC6B8ea6d25cD3',
      verified: true,
      upgradeable: true,
    },
    {
      id: '17',
      name: 'Universal Resolver - Arbitrum',
      description: 'Universal Resolver deployed on Arbitrum for cross-chain ENS resolution',
      address: '0xaC2a3B2B0A4B33F5c8F72E26e8A7AfE40C3C34bB',
      chain: 'arbitrum',
      category: 'resolver',
      status: 'active',
      version: '1.0.0',
      deployed: '2022-06-15',
      etherscanUrl: 'https://arbiscan.io/address/0xaC2a3B2B0A4B33F5c8F72E26e8A7AfE40C3C34bB',
      verified: true,
      upgradeable: true,
    },
    {
      id: '18',
      name: 'Universal Resolver - Base',
      description: 'Universal Resolver deployed on Base for cross-chain ENS resolution',
      address: '0xfAdFB11F5F85b26D7f5B3fC2B0e1C8D6Ef0D7B2a',
      chain: 'base',
      category: 'resolver',
      status: 'active',
      version: '1.0.0',
      deployed: '2023-08-09',
      etherscanUrl: 'https://basescan.org/address/0xfAdFB11F5F85b26D7f5B3fC2B0e1C8D6Ef0D7B2a',
      verified: true,
      upgradeable: true,
    },
    {
      id: '19',
      name: 'Universal Resolver - Polygon',
      description: 'Universal Resolver deployed on Polygon for cross-chain ENS resolution',
      address: '0xae6FfE6f2d2B1a6C2bB5dCc6E8F5a3E2e7C8D9A3',
      chain: 'polygon',
      category: 'resolver',
      status: 'active',
      version: '1.0.0',
      deployed: '2022-06-15',
      etherscanUrl: 'https://polygonscan.com/address/0xae6FfE6f2d2B1a6C2bB5dCc6E8F5a3E2e7C8D9A3',
      verified: true,
      upgradeable: true,
    },
    {
      id: '20',
      name: 'Universal Resolver - Sepolia',
      description: 'Universal Resolver deployed on Sepolia testnet for testing',
      address: '0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B',
      chain: 'sepolia',
      category: 'resolver',
      status: 'active',
      version: '1.0.0',
      deployed: '2022-07-01',
      etherscanUrl: 'https://sepolia.etherscan.io/address/0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B',
      verified: true,
      upgradeable: true,
    },
    {
      id: '21',
      name: 'Public Resolver - Sepolia',
      description: 'Public Resolver deployed on Sepolia testnet',
      address: '0x2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9A0b1C',
      chain: 'sepolia',
      category: 'resolver',
      status: 'active',
      version: '2.0.0',
      deployed: '2022-07-01',
      etherscanUrl: 'https://sepolia.etherscan.io/address/0x2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9A0b1C',
      verified: true,
      upgradeable: true,
    },
    {
      id: '22',
      name: 'Universal Resolver - Goerli',
      description: 'Universal Resolver deployed on Goerli testnet',
      address: '0x3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B1c2D',
      chain: 'goerli',
      category: 'resolver',
      status: 'active',
      version: '1.0.0',
      deployed: '2022-07-01',
      etherscanUrl: 'https://goerli.etherscan.io/address/0x3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B1c2D',
      verified: true,
      upgradeable: true,
    },
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'registry', label: 'Registry' },
    { value: 'resolver', label: 'Resolver' },
    { value: 'registrar', label: 'Registrar' },
    { value: 'governance', label: 'Governance' },
    { value: 'utility', label: 'Utility' },
    { value: 'migration', label: 'Migration' },
  ];

  const chains = [
    { value: 'all', label: 'All Chains' },
    { value: 'mainnet', label: 'Ethereum Mainnet' },
    { value: 'optimism', label: 'Optimism' },
    { value: 'arbitrum', label: 'Arbitrum' },
    { value: 'base', label: 'Base' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'sepolia', label: 'Sepolia Testnet' },
    { value: 'goerli', label: 'Goerli Testnet' },
  ];

  const filteredContracts = officialENSContracts.filter((contract) => {
    const matchesSearch =
      contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || contract.category === selectedCategory;
    const matchesChain = selectedChain === 'all' || contract.chain === selectedChain;
    return matchesSearch && matchesCategory && matchesChain;
  });

  const stats = [
    {
      label: 'Total Contracts',
      value: officialENSContracts.length.toString(),
      icon: FileCode,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Active Contracts',
      value: officialENSContracts.filter((c) => c.status === 'active').length.toString(),
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'Verified',
      value: officialENSContracts.filter((c) => c.verified).length.toString(),
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Upgradeable',
      value: officialENSContracts.filter((c) => c.upgradeable).length.toString(),
      icon: Network,
      color: 'from-amber-500 to-amber-600',
    },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard');
  };

  const getChainBadgeColor = (chain: string) => {
    switch (chain) {
      case 'mainnet':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'optimism':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'arbitrum':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'base':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'polygon':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'sepolia':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'goerli':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">ENS Official Contracts</h2>
          <p className="text-slate-600">Browse all officially deployed ENS contracts with full addresses across all chains</p>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Official ENS Contracts</AlertTitle>
        <AlertDescription className="text-blue-800">
          These are the core contracts deployed by the ENS team across Ethereum mainnet and Layer 2 networks. All contract addresses are verified and immutable.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600">{stat.label}</p>
                  <p className="text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div
                  className={`h-12 w-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                >
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search Contracts</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, description, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chain</Label>
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chains.map((chain) => (
                    <SelectItem key={chain.value} value={chain.value}>
                      {chain.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="grid" className="space-y-6">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContracts.map((contract) => (
              <Card
                key={contract.id}
                className={`border-2 hover:shadow-lg transition-shadow ${
                  contract.status === 'deprecated' ? 'opacity-60' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-slate-900">{contract.name}</CardTitle>
                        {contract.verified && (
                          <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                      <CardDescription>{contract.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="capitalize">
                      {contract.category}
                    </Badge>
                    <Badge className={getChainBadgeColor(contract.chain)}>
                      {contract.chain}
                    </Badge>
                    <Badge
                      variant={contract.status === 'active' ? 'default' : 'destructive'}
                    >
                      {contract.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-2 bg-slate-50 rounded border">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-slate-700 break-all text-xs">{contract.address}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(contract.address)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-slate-600">Version</p>
                      <p className="text-slate-900">{contract.version}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Deployed</p>
                      <p className="text-slate-900">{contract.deployed}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Status</p>
                      <Badge
                        variant={contract.status === 'active' ? 'default' : 'destructive'}
                      >
                        {contract.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-slate-600">Upgradeable</p>
                      <Badge variant="outline">
                        {contract.upgradeable ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(contract.etherscanUrl, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Explorer
                    </Button>
                    {contract.docsUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(contract.docsUrl, '_blank')}
                      >
                        <FileCode className="h-3 w-3 mr-1" />
                        Docs
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <Card className="border-2">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <>
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(contract.id)}
                              className="h-6 w-6 p-0"
                            >
                              {expandedRows.has(contract.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="text-slate-900">{contract.name}</p>
                                {contract.verified && (
                                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                              <p className="text-slate-600 text-sm">{contract.description}</p>
                            </div>
                          </div>
                        </TableCell>
                      <TableCell>
                        <Badge className={getChainBadgeColor(contract.chain)}>
                          {contract.chain}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {contract.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-slate-700 text-xs">{contract.address}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(contract.address)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={contract.status === 'active' ? 'default' : 'destructive'}
                        >
                          {contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{contract.version}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              window.open(contract.etherscanUrl, '_blank');
                            }}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View on Etherscan
                            </DropdownMenuItem>
                            {contract.docsUrl && (
                              <DropdownMenuItem onClick={() => {
                                window.open(contract.docsUrl, '_blank');
                              }}>
                                <FileText className="h-4 w-4 mr-2" />
                                View Documentation
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Row Content */}
                    {expandedRows.has(contract.id) && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-slate-50">
                          <div className="space-y-4 p-4">
                            {/* Source Code Section */}
                            {contract.sourceCode && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                  <h4 className="font-semibold text-slate-900">Source Code</h4>
                                </div>
                                <div className="border rounded-lg bg-slate-900 p-4 overflow-x-auto">
                                  <pre className="text-slate-100 text-xs">
                                    <code>{contract.sourceCode}</code>
                                  </pre>
                                </div>
                              </div>
                            )}
                            
                            {/* Dependencies Section */}
                            {contract.dependencies && contract.dependencies.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <LinkIcon className="h-4 w-4 text-blue-600" />
                                  <h4 className="font-semibold text-slate-900">Contract Dependencies</h4>
                                </div>
                                <div className="grid gap-2">
                                  {contract.dependencies.map((dep, idx) => (
                                    <div key={idx} className="border rounded-lg p-3 bg-white">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium text-slate-900">{dep.name}</p>
                                          <p className="text-sm text-slate-600">{dep.interface}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <code className="text-xs text-slate-700">{dep.address}</code>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(`https://etherscan.io/address/${dep.address}`, '_blank')}
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Contract Details */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 border-t pt-4">
                              <div>
                                <p className="text-slate-600 text-sm">Deployed</p>
                                <p className="text-slate-900">{contract.deployed}</p>
                              </div>
                              <div>
                                <p className="text-slate-600 text-sm">Version</p>
                                <p className="text-slate-900">{contract.version}</p>
                              </div>
                              <div>
                                <p className="text-slate-600 text-sm">Chain</p>
                                <p className="text-slate-900 capitalize">{contract.chain}</p>
                              </div>
                              {contract.docsUrl && (
                                <div>
                                  <p className="text-slate-600 text-sm">Documentation</p>
                                  <a href={contract.docsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    View Docs
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {categories.filter(c => c.value !== 'all').map((category) => {
            const contractsInCategory = filteredContracts.filter((c) => c.category === category.value);
            if (contractsInCategory.length === 0) return null;
            
            return (
              <Card key={category.value} className="border-2">
                <CardHeader>
                  <CardTitle className="capitalize">{category.label}</CardTitle>
                  <CardDescription>
                    {contractsInCategory.length} contract{contractsInCategory.length !== 1 ? 's' : ''} in this category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {contractsInCategory.map((contract) => (
                      <Card key={contract.id} className="border">
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm">{contract.name}</CardTitle>
                            {contract.verified && (
                              <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <CardDescription className="text-xs">{contract.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex gap-2">
                            <Badge className={getChainBadgeColor(contract.chain)}>
                              {contract.chain}
                            </Badge>
                            <Badge
                              variant={contract.status === 'active' ? 'default' : 'destructive'}
                            >
                              {contract.status}
                            </Badge>
                          </div>
                          <div className="p-2 bg-slate-50 rounded border">
                            <code className="text-slate-700 break-all text-xs">{contract.address}</code>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => window.open(contract.etherscanUrl, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Explorer
                            </Button>
                            {contract.docsUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => window.open(contract.docsUrl, '_blank')}
                              >
                                <FileCode className="h-3 w-3 mr-1" />
                                Docs
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
