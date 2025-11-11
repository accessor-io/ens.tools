import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Users,
  Building2,
  Search,
  Plus,
  ExternalLink,
  Vote,
  Wallet,
  Shield,
  Globe,
  CheckCircle2,
  TrendingUp,
  Activity,
  GitBranch,
  Coins,
  Network,
  AlertTriangle,
  FileCode,
  Star,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

interface DAO {
  id: string;
  name: string;
  ensName: string;
  description: string;
  category: string;
  chain: string;
  governanceToken: string;
  treasury: string;
  members: number;
  proposals: number;
  status: 'active' | 'inactive' | 'archived';
  verified: boolean;
  website: string;
  social: {
    twitter?: string;
    discord?: string;
    github?: string;
  };
}

export function DAORegistry() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedChain, setSelectedChain] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const mockDAOs: DAO[] = [
    {
      id: '1',
      name: 'Company Protocol',
      ensName: 'company.eth',
      description: 'Decentralized protocol for cross-chain asset management',
      category: 'DeFi',
      chain: 'Ethereum',
      governanceToken: 'COMP',
      treasury: '2.4M ETH',
      members: 12453,
      proposals: 87,
      status: 'active',
      verified: true,
      website: 'https://company.eth',
      social: { twitter: '@company', github: 'company-dao' },
    },
    {
      id: '2',
      name: 'Builder Collective',
      ensName: 'builders.eth',
      description: 'Community-driven development DAO for Web3 infrastructure',
      category: 'Infrastructure',
      chain: 'Ethereum',
      governanceToken: 'BUILD',
      treasury: '850K ETH',
      members: 8234,
      proposals: 156,
      status: 'active',
      verified: true,
      website: 'https://builders.eth',
      social: { twitter: '@builders', discord: 'builders-dao', github: 'builders-collective' },
    },
    {
      id: '3',
      name: 'Art Syndicate',
      ensName: 'art.eth',
      description: 'Curated NFT collection and artist funding DAO',
      category: 'NFT/Art',
      chain: 'Ethereum',
      governanceToken: 'ART',
      treasury: '450K ETH',
      members: 3421,
      proposals: 43,
      status: 'active',
      verified: true,
      website: 'https://art.eth',
      social: { twitter: '@artsyndicate' },
    },
    {
      id: '4',
      name: 'Research Network',
      ensName: 'research.eth',
      description: 'Decentralized science and research funding organization',
      category: 'DeSci',
      chain: 'Ethereum',
      governanceToken: 'RSRCH',
      treasury: '1.2M ETH',
      members: 5678,
      proposals: 92,
      status: 'active',
      verified: false,
      website: 'https://research.eth',
      social: { github: 'research-network' },
    },
    {
      id: '5',
      name: 'MetaVerse Guild',
      ensName: 'metaverse.eth',
      description: 'Gaming and metaverse asset management collective',
      category: 'Gaming',
      chain: 'Polygon',
      governanceToken: 'META',
      treasury: '320K MATIC',
      members: 15234,
      proposals: 67,
      status: 'active',
      verified: true,
      website: 'https://metaverse.eth',
      social: { discord: 'metaverse-guild', twitter: '@metaverseguild' },
    },
    {
      id: '6',
      name: 'Climate Coalition',
      ensName: 'climate.eth',
      description: 'Environmental impact and carbon credit DAO',
      category: 'Impact',
      chain: 'Ethereum',
      governanceToken: 'CLMT',
      treasury: '680K ETH',
      members: 4532,
      proposals: 38,
      status: 'active',
      verified: true,
      website: 'https://climate.eth',
      social: { twitter: '@climatedao', github: 'climate-coalition' },
    },
  ];

  const categories = [
    'all',
    'DeFi',
    'Infrastructure',
    'NFT/Art',
    'DeSci',
    'Gaming',
    'Impact',
    'Social',
  ];

  const chains = ['all', 'Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base'];

  const registryStats = [
    { label: 'Total DAOs', value: '847', icon: Building2, color: 'from-blue-500 to-blue-600' },
    { label: 'Active Members', value: '1.2M', icon: Users, color: 'from-purple-500 to-purple-600' },
    { label: 'Total Treasury', value: '$4.8B', icon: Wallet, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Active Proposals', value: '2,341', icon: Vote, color: 'from-amber-500 to-amber-600' },
  ];

  const filteredDAOs = mockDAOs.filter((dao) => {
    const matchesSearch =
      dao.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dao.ensName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dao.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || dao.category === selectedCategory;
    const matchesChain = selectedChain === 'all' || dao.chain === selectedChain;
    return matchesSearch && matchesCategory && matchesChain;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">DAO Registry</h2>
          <p className="text-slate-600">Discover and manage decentralized autonomous organizations</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Register DAO
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Register New DAO</DialogTitle>
              <DialogDescription>Add a new DAO to the registry</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>DAO Name</Label>
                <Input placeholder="Company Protocol" />
              </div>
              <div className="space-y-2">
                <Label>ENS Name</Label>
                <Input placeholder="company.eth" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="Brief description of the DAO" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter((c) => c !== 'all').map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
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
                      {chains.filter((c) => c !== 'all').map((chain) => (
                        <SelectItem key={chain} value={chain}>
                          {chain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Governance Token Symbol</Label>
                <Input placeholder="TOKEN" />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    toast.success('DAO registered successfully');
                    setIsAddDialogOpen(false);
                  }}
                  className="flex-1"
                >
                  Register DAO
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
        {registryStats.map((stat, index) => (
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search DAOs</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or ENS..."
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
                    <SelectItem key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
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
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDAOs.map((dao) => (
              <Card key={dao.id} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-slate-900">{dao.name}</CardTitle>
                        {dao.verified && (
                          <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                      <CardDescription>{dao.ensName}</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{dao.category}</Badge>
                    <Badge variant="outline">{dao.chain}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-600">{dao.description}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-700">{dao.members.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Vote className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-700">{dao.proposals} proposals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-700">{dao.treasury}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-700">{dao.governanceToken}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {dao.social.twitter && (
                      <Button variant="outline" size="sm" className="flex-1">
                        Twitter
                      </Button>
                    )}
                    {dao.social.github && (
                      <Button variant="outline" size="sm" className="flex-1">
                        GitHub
                      </Button>
                    )}
                    {dao.social.discord && (
                      <Button variant="outline" size="sm" className="flex-1">
                        Discord
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
                    <TableHead>DAO</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Treasury</TableHead>
                    <TableHead>Proposals</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDAOs.map((dao) => (
                    <TableRow key={dao.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-slate-900">{dao.name}</p>
                              {dao.verified && (
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <p className="text-slate-600">{dao.ensName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{dao.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{dao.chain}</Badge>
                      </TableCell>
                      <TableCell>{dao.members.toLocaleString()}</TableCell>
                      <TableCell>{dao.treasury}</TableCell>
                      <TableCell>{dao.proposals}</TableCell>
                      <TableCell>
                        <Badge
                          variant={dao.status === 'active' ? 'default' : 'secondary'}
                        >
                          {dao.status}
                        </Badge>
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

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>DAOs by Category</CardTitle>
                <CardDescription>Distribution across categories</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {['DeFi', 'Infrastructure', 'NFT/Art', 'DeSci', 'Gaming', 'Impact'].map(
                  (category) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">{category}</span>
                        <span className="text-slate-900">
                          {mockDAOs.filter((d) => d.category === category).length}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                          style={{
                            width: `${
                              (mockDAOs.filter((d) => d.category === category).length /
                                mockDAOs.length) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Chain Distribution</CardTitle>
                <CardDescription>DAOs across networks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'].map((chain) => (
                  <div key={chain} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">{chain}</span>
                      <span className="text-slate-900">
                        {mockDAOs.filter((d) => d.chain === chain).length}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-blue-600"
                        style={{
                          width: `${
                            (mockDAOs.filter((d) => d.chain === chain).length /
                              mockDAOs.length) *
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
                <CardTitle>Growth Metrics</CardTitle>
                <CardDescription>Registry growth over time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-slate-600">New DAOs (30d)</p>
                    <p className="text-slate-900">+47</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-slate-600">New Members (30d)</p>
                    <p className="text-slate-900">+23.4K</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-slate-600">Treasury Growth (30d)</p>
                    <p className="text-slate-900">+$127M</p>
                  </div>
                  <Wallet className="h-8 w-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Verification Status</CardTitle>
                <CardDescription>Registry verification metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-emerald-50">
                  <div>
                    <p className="text-emerald-700">Verified DAOs</p>
                    <p className="text-emerald-900">
                      {mockDAOs.filter((d) => d.verified).length} (
                      {Math.round(
                        (mockDAOs.filter((d) => d.verified).length / mockDAOs.length) * 100
                      )}
                      %)
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50">
                  <div>
                    <p className="text-amber-700">Pending Verification</p>
                    <p className="text-amber-900">
                      {mockDAOs.filter((d) => !d.verified).length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                </div>
                <Alert className="border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900">Verification Process</AlertTitle>
                  <AlertDescription className="text-blue-800">
                    DAOs are verified through contract analysis, social proof, and community
                    validation.
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
