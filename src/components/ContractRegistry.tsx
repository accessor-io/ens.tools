import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  FileCode,
  Search,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Lock,
  Unlock,
  Network,
  GitBranch,
  Code,
  Layers,
  Database,
  Zap,
  Users,
  Activity,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

interface Contract {
  id: string;
  name: string;
  ensName: string;
  address: string;
  chain: string;
  type: 'dao' | 'treasury' | 'token' | 'nft' | 'defi' | 'registry' | 'bridge' | 'other';
  status: 'active' | 'paused' | 'deprecated' | 'upgrading';
  security: 'critical' | 'high' | 'medium' | 'low';
  version: string;
  owner: string;
  multisig: boolean;
  upgradeable: boolean;
  verified: boolean;
  deployed: string;
  interactions24h: number;
  tvl?: string;
}

export function ContractRegistry() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedChain, setSelectedChain] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const mockContracts: Contract[] = [
    {
      id: '1',
      name: 'DAO Governor',
      ensName: 'dao.company.eth',
      address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      chain: 'Ethereum',
      type: 'dao',
      status: 'active',
      security: 'critical',
      version: '2.1.0',
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0f35a3',
      multisig: true,
      upgradeable: true,
      verified: true,
      deployed: '2024-01-15',
      interactions24h: 1234,
    },
    {
      id: '2',
      name: 'Treasury Vault',
      ensName: 'vault.company.eth',
      address: '0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a',
      chain: 'Ethereum',
      type: 'treasury',
      status: 'active',
      security: 'critical',
      version: '3.0.2',
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0f35a3',
      multisig: true,
      upgradeable: false,
      verified: true,
      deployed: '2024-02-01',
      interactions24h: 234,
      tvl: '$2.4M',
    },
    {
      id: '3',
      name: 'Governance Token',
      ensName: 'token.company.eth',
      address: '0x1234567890123456789012345678901234567890',
      chain: 'Ethereum',
      type: 'token',
      status: 'active',
      security: 'high',
      version: '1.0.0',
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0f35a3',
      multisig: true,
      upgradeable: false,
      verified: true,
      deployed: '2023-12-01',
      interactions24h: 5678,
    },
    {
      id: '4',
      name: 'NFT Collection',
      ensName: 'nft.company.eth',
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      chain: 'Ethereum',
      type: 'nft',
      status: 'active',
      security: 'high',
      version: '1.2.0',
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0f35a3',
      multisig: false,
      upgradeable: true,
      verified: true,
      deployed: '2024-03-10',
      interactions24h: 3456,
    },
    {
      id: '5',
      name: 'Registry Contract',
      ensName: 'registry.company.eth',
      address: '0x9876543210987654321098765432109876543210',
      chain: 'Ethereum',
      type: 'registry',
      status: 'active',
      security: 'high',
      version: '2.5.1',
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0f35a3',
      multisig: true,
      upgradeable: true,
      verified: true,
      deployed: '2024-01-20',
      interactions24h: 8901,
    },
    {
      id: '6',
      name: 'Bridge Contract',
      ensName: 'bridge.company.eth',
      address: '0x3CACa7b48D0573D793d3b0279b5F0029180E83b6',
      chain: 'Ethereum',
      type: 'bridge',
      status: 'active',
      security: 'critical',
      version: '1.8.0',
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0f35a3',
      multisig: true,
      upgradeable: true,
      verified: true,
      deployed: '2024-02-15',
      interactions24h: 2345,
      tvl: '$850K',
    },
    {
      id: '7',
      name: 'Staking Pool',
      ensName: 'staking.company.eth',
      address: '0xfedcbafedcbafedcbafedcbafedcbafedcbafed',
      chain: 'Ethereum',
      type: 'defi',
      status: 'active',
      security: 'high',
      version: '2.0.0',
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0f35a3',
      multisig: true,
      upgradeable: true,
      verified: true,
      deployed: '2024-03-01',
      interactions24h: 4567,
      tvl: '$680K',
    },
    {
      id: '8',
      name: 'Legacy Registry',
      ensName: 'legacy.company.eth',
      address: '0x1111111111111111111111111111111111111111',
      chain: 'Ethereum',
      type: 'registry',
      status: 'deprecated',
      security: 'medium',
      version: '1.0.0',
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0f35a3',
      multisig: false,
      upgradeable: false,
      verified: true,
      deployed: '2023-06-01',
      interactions24h: 12,
    },
  ];

  const contractTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'dao', label: 'DAO' },
    { value: 'treasury', label: 'Treasury' },
    { value: 'token', label: 'Token' },
    { value: 'nft', label: 'NFT' },
    { value: 'defi', label: 'DeFi' },
    { value: 'registry', label: 'Registry' },
    { value: 'bridge', label: 'Bridge' },
    { value: 'other', label: 'Other' },
  ];

  const chains = ['all', 'Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base'];

  const filteredContracts = mockContracts.filter((contract) => {
    const matchesSearch =
      contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.ensName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || contract.type === selectedType;
    const matchesChain = selectedChain === 'all' || contract.chain === selectedChain;
    return matchesSearch && matchesType && matchesChain;
  });

  const stats = [
    {
      label: 'Total Contracts',
      value: mockContracts.length.toString(),
      icon: FileCode,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Critical Security',
      value: mockContracts.filter((c) => c.security === 'critical').length.toString(),
      icon: Shield,
      color: 'from-red-500 to-red-600',
    },
    {
      label: 'Multisig Protected',
      value: mockContracts.filter((c) => c.multisig).length.toString(),
      icon: Lock,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'Verified',
      value: mockContracts.filter((c) => c.verified).length.toString(),
      icon: CheckCircle2,
      color: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">Contract Registry</h2>
          <p className="text-slate-600">Comprehensive smart contract management and monitoring</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Register Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Register New Contract</DialogTitle>
              <DialogDescription>Add a new smart contract to the registry</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Contract Name</Label>
                <Input placeholder="DAO Governor" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ENS Name</Label>
                  <Input placeholder="dao.company.eth" />
                </div>
                <div className="space-y-2">
                  <Label>Contract Address</Label>
                  <Input placeholder="0x..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes
                        .filter((t) => t.value !== 'all')
                        .map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chain</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select chain" />
                    </SelectTrigger>
                    <SelectContent>
                      {chains
                        .filter((c) => c !== 'all')
                        .map((chain) => (
                          <SelectItem key={chain} value={chain}>
                            {chain}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Security Level</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input placeholder="1.0.0" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    toast.success('Contract registered successfully');
                    setIsAddDialogOpen(false);
                  }}
                  className="flex-1"
                >
                  Register Contract
                </Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
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

      {/* Security Alert */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-900">Security Notice</AlertTitle>
        <AlertDescription className="text-red-800">
          3 contracts marked as critical. Ensure multisig protection and regular security audits.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search Contracts</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, ENS, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contract Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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
                    <SelectItem key={chain} value={chain}>
                      {chain === 'all' ? 'All Chains' : chain}
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
          <TabsTrigger value="security">Security Overview</TabsTrigger>
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
                      <CardDescription>{contract.ensName}</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="capitalize">
                      {contract.type}
                    </Badge>
                    <Badge
                      variant={
                        contract.security === 'critical'
                          ? 'destructive'
                          : contract.security === 'high'
                          ? 'default'
                          : 'outline'
                      }
                    >
                      {contract.security}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-2 bg-slate-50 rounded border">
                    <code className="text-slate-700 break-all">{contract.address}</code>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-slate-600">Chain</p>
                      <p className="text-slate-900">{contract.chain}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Version</p>
                      <p className="text-slate-900">{contract.version}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Status</p>
                      <Badge
                        variant={
                          contract.status === 'active'
                            ? 'default'
                            : contract.status === 'deprecated'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {contract.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-slate-600">Deployed</p>
                      <p className="text-slate-900">{contract.deployed}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-2">
                      {contract.multisig && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <Lock className="h-3 w-3 mr-1" />
                          Multisig
                        </Badge>
                      )}
                      {contract.upgradeable && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <GitBranch className="h-3 w-3 mr-1" />
                          Upgradeable
                        </Badge>
                      )}
                    </div>
                  </div>
                  {contract.tvl && (
                    <div className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
                      <span className="text-amber-700">TVL</span>
                      <span className="text-amber-900">{contract.tvl}</span>
                    </div>
                  )}
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
                    <TableHead>Type</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Protection</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-slate-900">{contract.name}</p>
                              {contract.verified && (
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <p className="text-slate-600">{contract.ensName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {contract.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            contract.security === 'critical'
                              ? 'destructive'
                              : contract.security === 'high'
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {contract.security}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            contract.status === 'active'
                              ? 'default'
                              : contract.status === 'deprecated'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{contract.chain}</TableCell>
                      <TableCell>{contract.version}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {contract.multisig ? (
                            <Lock className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Unlock className="h-4 w-4 text-amber-600" />
                          )}
                          {contract.upgradeable && (
                            <GitBranch className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Security Distribution</CardTitle>
                <CardDescription>Contracts by security level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {['critical', 'high', 'medium', 'low'].map((level) => {
                  const count = mockContracts.filter((c) => c.security === level).length;
                  return (
                    <div key={level} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 capitalize">{level}</span>
                        <span className="text-slate-900">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            level === 'critical'
                              ? 'bg-red-600'
                              : level === 'high'
                              ? 'bg-amber-600'
                              : level === 'medium'
                              ? 'bg-blue-600'
                              : 'bg-emerald-600'
                          }`}
                          style={{
                            width: `${(count / mockContracts.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Protection Status</CardTitle>
                <CardDescription>Security measures deployed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-emerald-50">
                  <div>
                    <p className="text-emerald-700">Multisig Protected</p>
                    <p className="text-emerald-900">{mockContracts.filter((c) => c.multisig).length} contracts</p>
                  </div>
                  <Lock className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                  <div>
                    <p className="text-blue-700">Upgradeable</p>
                    <p className="text-blue-900">{mockContracts.filter((c) => c.upgradeable).length} contracts</p>
                  </div>
                  <GitBranch className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-purple-50">
                  <div>
                    <p className="text-purple-700">Verified</p>
                    <p className="text-purple-900">{mockContracts.filter((c) => c.verified).length} contracts</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Contract Types</CardTitle>
                <CardDescription>Distribution by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {contractTypes
                  .filter((t) => t.value !== 'all')
                  .map((type) => {
                    const count = mockContracts.filter((c) => c.type === type.value).length;
                    if (count === 0) return null;
                    return (
                      <div key={type.value} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-slate-700">{type.label}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Activity Metrics</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-slate-600">Total Interactions</p>
                    <p className="text-slate-900">{mockContracts.reduce((sum, c) => sum + c.interactions24h, 0).toLocaleString()}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-slate-600">Active Contracts</p>
                    <p className="text-slate-900">{mockContracts.filter((c) => c.status === 'active').length}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                </div>
                <Alert className="border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900">Best Practices</AlertTitle>
                  <AlertDescription className="text-blue-800">
                    All critical contracts should use multisig control and undergo regular security audits.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
