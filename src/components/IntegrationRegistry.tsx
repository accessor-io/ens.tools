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
  Plug,
  Search,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Code,
  Database,
  Cloud,
  Webhook,
  Lock,
  Activity,
  Zap,
  FileCode,
  Package,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  type: 'contract' | 'api' | 'oracle' | 'bridge' | 'ipfs' | 'subgraph' | 'relayer';
  description: string;
  status: 'active' | 'inactive' | 'deprecated';
  endpoint?: string;
  address?: string;
  chain: string;
  ensName?: string;
  version: string;
  calls24h: number;
  uptime: string;
  verified: boolean;
}

export function IntegrationRegistry() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const mockIntegrations: Integration[] = [
    {
      id: '1',
      name: 'Chainlink Price Feed',
      type: 'oracle',
      description: 'ETH/USD price feed oracle for accurate market data',
      status: 'active',
      address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      chain: 'Ethereum',
      ensName: 'oracle.company.eth',
      version: '4.0.0',
      calls24h: 45678,
      uptime: '99.98%',
      verified: true,
    },
    {
      id: '2',
      name: 'Treasury API Gateway',
      type: 'api',
      description: 'RESTful API for treasury operations and reporting',
      status: 'active',
      endpoint: 'https://api.company.eth/v1',
      chain: 'Ethereum',
      ensName: 'api.company.eth',
      version: '1.2.3',
      calls24h: 12456,
      uptime: '99.95%',
      verified: true,
    },
    {
      id: '3',
      name: 'Cross-chain Bridge',
      type: 'bridge',
      description: 'Multi-chain asset bridge for L1/L2 transfers',
      status: 'active',
      address: '0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a',
      chain: 'Ethereum',
      ensName: 'bridge.company.eth',
      version: '2.1.0',
      calls24h: 8934,
      uptime: '99.92%',
      verified: true,
    },
    {
      id: '4',
      name: 'IPFS Metadata Storage',
      type: 'ipfs',
      description: 'Decentralized storage for contract metadata and assets',
      status: 'active',
      endpoint: 'ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      chain: 'Multi-chain',
      version: '1.0.0',
      calls24h: 23456,
      uptime: '99.99%',
      verified: true,
    },
    {
      id: '5',
      name: 'The Graph Subgraph',
      type: 'subgraph',
      description: 'Indexed blockchain data for DAO operations',
      status: 'active',
      endpoint: 'https://api.thegraph.com/subgraphs/name/company-dao',
      chain: 'Ethereum',
      version: '1.5.2',
      calls24h: 34567,
      uptime: '99.94%',
      verified: true,
    },
    {
      id: '6',
      name: 'Gelato Relayer',
      type: 'relayer',
      description: 'Automated transaction execution and gas abstraction',
      status: 'active',
      address: '0x3CACa7b48D0573D793d3b0279b5F0029180E83b6',
      chain: 'Ethereum',
      ensName: 'relayer.company.eth',
      version: '3.0.1',
      calls24h: 5678,
      uptime: '99.89%',
      verified: true,
    },
    {
      id: '7',
      name: 'Legacy Registry Contract',
      type: 'contract',
      description: 'Deprecated registry contract (migrated to v2)',
      status: 'deprecated',
      address: '0x1234567890123456789012345678901234567890',
      chain: 'Ethereum',
      version: '1.0.0',
      calls24h: 234,
      uptime: '98.50%',
      verified: true,
    },
    {
      id: '8',
      name: 'UMA Optimistic Oracle',
      type: 'oracle',
      description: 'Optimistic oracle for proposal validation',
      status: 'active',
      address: '0xfb55F43fB9F48F63f9269DB7Dde3BbBe1ebDC0dE',
      chain: 'Ethereum',
      version: '2.3.0',
      calls24h: 1234,
      uptime: '99.97%',
      verified: false,
    },
  ];

  const integrationTypes = [
    { value: 'all', label: 'All Types', icon: Package },
    { value: 'contract', label: 'Contracts', icon: FileCode },
    { value: 'api', label: 'APIs', icon: Cloud },
    { value: 'oracle', label: 'Oracles', icon: Database },
    { value: 'bridge', label: 'Bridges', icon: Zap },
    { value: 'ipfs', label: 'IPFS', icon: Package },
    { value: 'subgraph', label: 'Subgraphs', icon: Activity },
    { value: 'relayer', label: 'Relayers', icon: Webhook },
  ];

  const filteredIntegrations = mockIntegrations.filter((integration) => {
    const matchesSearch =
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.ensName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || integration.type === selectedType;
    return matchesSearch && matchesType;
  });

  const stats = [
    {
      label: 'Active Integrations',
      value: mockIntegrations.filter((i) => i.status === 'active').length.toString(),
      icon: Plug,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'API Calls (24h)',
      value: mockIntegrations
        .reduce((sum, i) => sum + i.calls24h, 0)
        .toLocaleString(),
      icon: Activity,
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Avg Uptime',
      value: '99.94%',
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'Verified',
      value: mockIntegrations.filter((i) => i.verified).length.toString(),
      icon: CheckCircle2,
      color: 'from-amber-500 to-amber-600',
    },
  ];

  const getTypeIcon = (type: string) => {
    const typeData = integrationTypes.find((t) => t.value === type);
    return typeData ? typeData.icon : Code;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">Integration Registry</h2>
          <p className="text-slate-600">Manage contracts, APIs, and external services</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Integration</DialogTitle>
              <DialogDescription>Register a new contract, API, or service</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Integration Name</Label>
                <Input placeholder="Chainlink Price Feed" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select integration type" />
                  </SelectTrigger>
                  <SelectContent>
                    {integrationTypes
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
                <Label>Description</Label>
                <Input placeholder="Brief description of the integration" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contract Address / Endpoint</Label>
                  <Input placeholder="0x... or https://..." />
                </div>
                <div className="space-y-2">
                  <Label>ENS Name (optional)</Label>
                  <Input placeholder="oracle.company.eth" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chain</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select chain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectItem value="arbitrum">Arbitrum</SelectItem>
                      <SelectItem value="optimism">Optimism</SelectItem>
                      <SelectItem value="multi">Multi-chain</SelectItem>
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
                    toast.success('Integration added successfully');
                    setIsAddDialogOpen(false);
                  }}
                  className="flex-1"
                >
                  Add Integration
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

      {/* Filters */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Search Integrations</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, ENS, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Integration Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {integrationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredIntegrations.map((integration) => {
              const TypeIcon = getTypeIcon(integration.type);
              return (
                <Card
                  key={integration.id}
                  className={`border-2 hover:shadow-lg transition-shadow ${
                    integration.status === 'deprecated'
                      ? 'opacity-60'
                      : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-slate-900 truncate">
                              {integration.name}
                            </CardTitle>
                            {integration.verified && (
                              <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          {integration.ensName && (
                            <CardDescription>{integration.ensName}</CardDescription>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="capitalize">
                        {integration.type}
                      </Badge>
                      <Badge
                        variant={
                          integration.status === 'active'
                            ? 'default'
                            : integration.status === 'deprecated'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {integration.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-slate-600">{integration.description}</p>
                    {(integration.address || integration.endpoint) && (
                      <div className="p-2 bg-slate-50 rounded border">
                        <code className="text-slate-700 break-all">
                          {integration.address || integration.endpoint}
                        </code>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-slate-600">Chain</p>
                        <p className="text-slate-900">{integration.chain}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Version</p>
                        <p className="text-slate-900">{integration.version}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Calls (24h)</p>
                        <p className="text-slate-900">{integration.calls24h.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Uptime</p>
                        <p className="text-emerald-600">{integration.uptime}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <Card className="border-2">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Integration</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Calls (24h)</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIntegrations.map((integration) => {
                    const TypeIcon = getTypeIcon(integration.type);
                    return (
                      <TableRow key={integration.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                              <TypeIcon className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="text-slate-900">{integration.name}</p>
                                {integration.verified && (
                                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                              {integration.ensName && (
                                <p className="text-slate-600">{integration.ensName}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {integration.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              integration.status === 'active'
                                ? 'default'
                                : integration.status === 'deprecated'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {integration.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{integration.chain}</TableCell>
                        <TableCell>{integration.version}</TableCell>
                        <TableCell>{integration.calls24h.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className="text-emerald-600">{integration.uptime}</span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Integration Health</CardTitle>
                <CardDescription>Real-time status monitoring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockIntegrations
                  .filter((i) => i.status === 'active')
                  .slice(0, 5)
                  .map((integration) => (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full ${
                            parseFloat(integration.uptime) > 99.5
                              ? 'bg-emerald-500'
                              : parseFloat(integration.uptime) > 99
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                        />
                        <div>
                          <p className="text-slate-900">{integration.name}</p>
                          <p className="text-slate-600">{integration.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-600">{integration.uptime}</p>
                        <p className="text-slate-600">{integration.calls24h.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>API Call Distribution</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockIntegrations
                  .sort((a, b) => b.calls24h - a.calls24h)
                  .slice(0, 5)
                  .map((integration) => (
                    <div key={integration.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">{integration.name}</span>
                        <span className="text-slate-900">{integration.calls24h.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                          style={{
                            width: `${
                              (integration.calls24h /
                                Math.max(...mockIntegrations.map((i) => i.calls24h))) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Integration Types</CardTitle>
                <CardDescription>Distribution by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {integrationTypes
                  .filter((t) => t.value !== 'all')
                  .map((type) => {
                    const count = mockIntegrations.filter((i) => i.type === type.value).length;
                    return (
                      <div key={type.value} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <type.icon className="h-5 w-5 text-blue-600" />
                          <span className="text-slate-900">{type.label}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Alerts & Warnings</CardTitle>
                <CardDescription>Integration issues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-900">Deprecated Integration</AlertTitle>
                  <AlertDescription className="text-amber-800">
                    Legacy Registry Contract should be migrated to v2
                  </AlertDescription>
                </Alert>
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900">Unverified Integration</AlertTitle>
                  <AlertDescription className="text-blue-800">
                    UMA Optimistic Oracle requires verification
                  </AlertDescription>
                </Alert>
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-900">All Systems Operational</AlertTitle>
                  <AlertDescription className="text-emerald-800">
                    7 of 8 integrations operating normally
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
