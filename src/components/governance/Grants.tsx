import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { ExternalLink, Search, Loader2, Award, Calendar, DollarSign, Users, TrendingUp, Filter, FolderOpen, FileText, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { dataService, type TransactionsByApprover, type Proposal } from '@/services/governance/dataService';

interface GrantRound {
  id: number;
  title: string;
  description: string;
  snapshotSpaceId: string;
  snapshotProposalId: string;
  proposalStart: string;
  proposalEnd: string;
  votingStart: string;
  votingEnd: string;
  allocationTokenAmount: string;
  allocationTokenAddress: string;
  maxWinnerCount: number;
  createdAt: string;
  updatedAt: string;
  houseId: string;
  scholarship: boolean;
  grantsCount: number;
}

interface Grant {
  id: number;
  roundId: number;
  title: string;
  description: string;
  recipientAddress: string;
  amount: string;
  tokenAddress: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const GRANTS_API_BASE = 'https://ensgrants.xyz/api';
const BUILDER_GRANTS_URL = 'https://builder.ensgrants.xyz';

export function Grants() {
  const [rounds, setRounds] = useState<GrantRound[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [roundGrants, setRoundGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGrants, setLoadingGrants] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [initiatives, setInitiatives] = useState<TransactionsByApprover[] | null>(null);
  const [loadingInitiatives, setLoadingInitiatives] = useState(true);
  const [initiativeSearchQuery, setInitiativeSearchQuery] = useState('');
  const [selectedInitiativeCategory, setSelectedInitiativeCategory] = useState('all');
  const [roundSortBy, setRoundSortBy] = useState<'date' | 'allocation' | 'grants'>('date');
  const [roundSortOrder, setRoundSortOrder] = useState<'asc' | 'desc'>('desc');
  const [initiativeSortBy, setInitiativeSortBy] = useState<'spending' | 'transactions' | 'name'>('spending');
  const [initiativeSortOrder, setInitiativeSortOrder] = useState<'asc' | 'desc'>('desc');
  const [grantProposals, setGrantProposals] = useState<Proposal[]>([]);
  const [loadingGrantProposals, setLoadingGrantProposals] = useState(true);

  useEffect(() => {
    const loadRounds = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${GRANTS_API_BASE}/rounds`);
        if (!response.ok) throw new Error('Failed to fetch rounds');
        const data = await response.json();
        setRounds(data);
      } catch (error) {
        console.error('Error loading grant rounds:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRounds();
  }, []);

  useEffect(() => {
    const loadGrantProposals = async () => {
      try {
        setLoadingGrantProposals(true);
        const data = await dataService.getAllProposals().catch(() => null);
        if (!data?.topics) {
          setGrantProposals([]);
          return;
        }

        const proposals = Object.values(data.topics);
        const grants = proposals
          .filter((proposal) => {
            const categories = proposal.categories?.map((c) => c.toLowerCase()) ?? [];
            const categoryMatch = categories.some((category) => category.includes('grant'));
            const titleMatch = proposal.title?.toLowerCase().includes('grant');
            return categoryMatch || titleMatch;
          })
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setGrantProposals(grants);
      } catch (error) {
        console.error('Error loading grant proposals:', error);
        setGrantProposals([]);
      } finally {
        setLoadingGrantProposals(false);
      }
    };

    loadGrantProposals();
  }, []);

  useEffect(() => {
    const loadInitiatives = async () => {
      try {
        setLoadingInitiatives(true);
        const data = await dataService.getTransactionsByApprover().catch(() => null);
        setInitiatives(data);
      } catch (error) {
        console.error('Error loading initiatives:', error);
      } finally {
        setLoadingInitiatives(false);
      }
    };
    loadInitiatives();
  }, []);

  useEffect(() => {
    if (selectedRound) {
      loadRoundGrants(selectedRound);
    }
  }, [selectedRound]);

  const loadRoundGrants = async (roundId: number) => {
    try {
      setLoadingGrants(true);
      const response = await fetch(`${GRANTS_API_BASE}/rounds/${roundId}/grants`);
      if (!response.ok) throw new Error('Failed to fetch grants');
      const data = await response.json();
      setRoundGrants(data);
    } catch (error) {
      console.error(`Error loading grants for round ${roundId}:`, error);
      setRoundGrants([]);
    } finally {
      setLoadingGrants(false);
    }
  };

  const getHouseName = (houseId: string) => {
    return houseId === '1' ? 'Ecosystem' : houseId === '2' ? 'Public Goods' : 'Unknown';
  };

  const formatETH = (wei: string) => {
    const eth = parseFloat(wei) / 1e18;
    return eth.toFixed(4);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const exportRoundsToCSV = () => {
    const headers = ['Title', 'House', 'Type', 'Allocation (ETH)', 'Grants', 'Start Date', 'End Date'];
    const rows = filteredRounds.map(round => [
      round.title,
      getHouseName(round.houseId),
      round.scholarship ? 'Scholarship' : 'Regular',
      formatETH(round.allocationTokenAmount),
      round.grantsCount.toString(),
      formatDate(round.proposalStart),
      formatDate(round.proposalEnd),
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ens-grant-rounds-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportInitiativesToCSV = () => {
    const headers = ['EP', 'Title', 'Working Group', 'Total USD', 'Total ETH', 'Transactions', 'Quarters'];
    const rows = initiativesByEP.map(init => [
      init.ep,
      init.title,
      init.workingGroup,
      init.totalUSD.toFixed(2),
      init.totalETH.toFixed(4),
      init.transactionCount.toString(),
      init.quarters.join('; '),
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ens-initiatives-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRounds = rounds
    .filter(round => {
      const matchesSearch = 
        round.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        round.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesHouse = selectedHouse === 'all' || round.houseId === selectedHouse;
      const matchesType = selectedType === 'all' || 
        (selectedType === 'scholarship' && round.scholarship) ||
        (selectedType === 'regular' && !round.scholarship);
      
      return matchesSearch && matchesHouse && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (roundSortBy === 'date') {
        comparison = new Date(a.proposalStart).getTime() - new Date(b.proposalStart).getTime();
      } else if (roundSortBy === 'allocation') {
        comparison = parseFloat(a.allocationTokenAmount) - parseFloat(b.allocationTokenAmount);
      } else if (roundSortBy === 'grants') {
        comparison = a.grantsCount - b.grantsCount;
      }
      return roundSortOrder === 'asc' ? comparison : -comparison;
    });

  // Calculate statistics
  const totalRounds = rounds.length;
  const ecosystemRounds = rounds.filter(r => r.houseId === '1').length;
  const publicGoodsRounds = rounds.filter(r => r.houseId === '2').length;
  const totalAllocation = rounds.reduce((sum, r) => {
    const amount = parseFloat(r.allocationTokenAmount) / 1e18;
    return sum + amount;
  }, 0);
  const totalGrants = rounds.reduce((sum, r) => sum + r.grantsCount, 0);

  // Prepare chart data
  const roundsByHouse = [
    { name: 'Ecosystem', value: ecosystemRounds, color: '#3b82f6' },
    { name: 'Public Goods', value: publicGoodsRounds, color: '#8b5cf6' },
  ];

  const allocationByHouse = rounds.reduce((acc, round) => {
    const house = getHouseName(round.houseId);
    const amount = parseFloat(round.allocationTokenAmount) / 1e18;
    if (!acc[house]) acc[house] = 0;
    acc[house] += amount;
    return acc;
  }, {} as Record<string, number>);

  const allocationChartData = Object.entries(allocationByHouse).map(([name, value]) => ({
    name,
    value: value,
    color: name === 'Ecosystem' ? '#3b82f6' : '#8b5cf6',
  }));

  // Timeline data
  const timelineData = rounds
    .sort((a, b) => new Date(a.proposalStart).getTime() - new Date(b.proposalStart).getTime())
    .map(round => ({
      date: formatDate(round.proposalStart),
      round: round.title,
      allocation: parseFloat(round.allocationTokenAmount) / 1e18,
      grants: round.grantsCount,
      house: getHouseName(round.houseId),
    }));

  // Group initiatives by EP (project/initiative) - aggregate across all quarters
  const initiativesByEP = initiatives ? (() => {
    const projectMap: Record<string, {
      ep: string;
      title: string;
      url: string;
      workingGroup: string;
      totalUSD: number;
      totalETH: number;
      totalUSDC: number;
      transactionCount: number;
      walletCount: number;
      quarters: string[];
      firstDate: string;
      lastDate: string;
      terms: (string | null)[];
    }> = {};

    initiatives.forEach(p => {
      const ep = p['Approver EP'];
      if (!projectMap[ep]) {
        projectMap[ep] = {
          ep,
          title: p['Approver Title'],
          url: p['Approver URL'],
          workingGroup: p['Working Group'],
          totalUSD: 0,
          totalETH: 0,
          totalUSDC: 0,
          transactionCount: 0,
          walletCount: 0,
          quarters: [],
          firstDate: p['First Transaction Date'],
          lastDate: p['Last Transaction Date'],
          terms: [],
        };
      }

      const project = projectMap[ep];
      project.totalUSD += p['Total USD'];
      project.totalETH += p['Total ETH'];
      project.totalUSDC += p['Total USDC'];
      project.transactionCount += p['Transaction Count'];
      project.walletCount = Math.max(project.walletCount, p['Wallet Count']);
      
      if (!project.quarters.includes(p['Quarter'])) {
        project.quarters.push(p['Quarter']);
      }
      
      if (p['Term'] && !project.terms.includes(p['Term'])) {
        project.terms.push(p['Term']);
      }

      if (p['First Transaction Date'] < project.firstDate) {
        project.firstDate = p['First Transaction Date'];
      }
      if (p['Last Transaction Date'] > project.lastDate) {
        project.lastDate = p['Last Transaction Date'];
      }
    });

    return Object.values(projectMap)
      .filter(p => {
        if (selectedInitiativeCategory === 'all') return true;
        const categoryMap: Record<string, string> = {
          ecosystem: 'Ecosystem',
          publicgoods: 'Public Goods',
          metagov: 'Meta-Governance',
        };
        return p.workingGroup === categoryMap[selectedInitiativeCategory];
      })
      .filter(p => {
        if (!initiativeSearchQuery) return true;
        const query = initiativeSearchQuery.toLowerCase();
        return p.title.toLowerCase().includes(query) || 
               p.ep.toLowerCase().includes(query) ||
               p.workingGroup.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        let comparison = 0;
        if (initiativeSortBy === 'spending') {
          comparison = a.totalUSD - b.totalUSD;
        } else if (initiativeSortBy === 'transactions') {
          comparison = a.transactionCount - b.transactionCount;
        } else if (initiativeSortBy === 'name') {
          comparison = a.title.localeCompare(b.title);
        }
        return initiativeSortOrder === 'asc' ? comparison : -comparison;
      });
  })() : [];

  // Initiatives statistics
  const totalInitiatives = initiativesByEP.length;
  const totalInitiativeSpending = initiativesByEP.reduce((sum, p) => sum + p.totalUSD, 0);
  const initiativesByCategory = initiativesByEP.reduce((acc, p) => {
    acc[p.workingGroup] = (acc[p.workingGroup] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Chart data for initiatives
  const initiativesChartData = initiativesByEP
    .slice(0, 10)
    .map(p => ({
      name: p.ep,
      spending: p.totalUSD / 1000000,
    }));

  const recentGrantProposals = grantProposals.slice(0, 15);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-600">Loading grants data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ENS Grants & Initiatives"
        description="Small Grants, Public Goods Builders Grants, and Funded Initiatives"
        breadcrumbs={[{ label: 'Grants' }]}
      />

      {/* Main Tabs */}
      <Tabs defaultValue="grants" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white">
          <TabsTrigger value="grants" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Grants Program
          </TabsTrigger>
          <TabsTrigger value="initiatives" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Funded Initiatives
          </TabsTrigger>
        </TabsList>

        {/* Grants Tab */}
        <TabsContent value="grants" className="space-y-6">
          {/* Header and Filters */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>ENS Grants Program</CardTitle>
                    <CardDescription>Small Grants and Public Goods Builders Grants</CardDescription>
                  </div>
                  <button
                    onClick={exportRoundsToCSV}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search rounds..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-[300px]"
                    />
                  </div>
                  <Select value={selectedHouse} onValueChange={setSelectedHouse}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Houses</SelectItem>
                      <SelectItem value="1">Ecosystem</SelectItem>
                      <SelectItem value="2">Public Goods</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="regular">Regular Grants</SelectItem>
                      <SelectItem value="scholarship">Scholarships</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={roundSortBy} onValueChange={(v) => setRoundSortBy(v as 'date' | 'allocation' | 'grants')}>
                    <SelectTrigger className="w-[180px]">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Sort by Date</SelectItem>
                      <SelectItem value="allocation">Sort by Allocation</SelectItem>
                      <SelectItem value="grants">Sort by Grants</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => setRoundSortOrder(roundSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    title={`Sort ${roundSortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                  >
                    {roundSortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-slate-600">Total Rounds</CardTitle>
                <Award className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-slate-900">{totalRounds}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {ecosystemRounds} Ecosystem, {publicGoodsRounds} Public Goods
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-slate-600">Total Allocation</CardTitle>
                <DollarSign className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-slate-900">{totalAllocation.toFixed(2)} ETH</div>
                <p className="text-xs text-slate-500 mt-1">
                  {formatCurrency(totalAllocation * 3000)} (est.)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-slate-600">Total Grants</CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-slate-900">{totalGrants}</div>
                <p className="text-xs text-slate-500 mt-1">Across all rounds</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-slate-600">Avg per Round</CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-slate-900">
                  {totalRounds > 0 ? (totalAllocation / totalRounds).toFixed(2) : '0'} ETH
                </div>
                <p className="text-xs text-slate-500 mt-1">Average allocation</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rounds by House</CardTitle>
                <CardDescription>Distribution of grant rounds</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roundsByHouse}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {roundsByHouse.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Allocation by House</CardTitle>
                <CardDescription>Total ETH allocated by house</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={allocationChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" tickFormatter={(value) => `${value.toFixed(1)} ETH`} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)} ETH`} />
                    <Legend />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Rounds List */}
          <Card>
            <CardHeader>
              <CardTitle>Grant Rounds</CardTitle>
              <CardDescription>All ENS grant rounds from ensgrants.xyz</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white">
                  <TabsTrigger value="list">Rounds List</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-3 mt-4">
                  {filteredRounds.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      No rounds found matching your criteria
                    </div>
                  ) : (
                    filteredRounds.map((round) => (
                      <Card 
                        key={round.id} 
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => setSelectedRound(round.id === selectedRound ? null : round.id)}
                      >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{round.title}</CardTitle>
                            <Badge variant={round.houseId === '1' ? 'default' : 'secondary'}>
                              {getHouseName(round.houseId)}
                            </Badge>
                            {round.scholarship && (
                              <Badge variant="outline">Scholarship</Badge>
                            )}
                          </div>
                          <CardDescription className="line-clamp-2 mb-3">
                            {round.description}
                          </CardDescription>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(round.proposalStart)} - {formatDate(round.proposalEnd)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              <span>{formatETH(round.allocationTokenAmount)} ETH</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{round.grantsCount} grants</span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col gap-2">
                          <a
                            href={`https://ensgrants.xyz/rounds/${round.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Round
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {round.snapshotProposalId && (
                            <a
                              href={`https://snapshot.org/#/${round.snapshotSpaceId}/proposal/${round.snapshotProposalId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Snapshot
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {selectedRound === round.id && (
                      <CardContent className="pt-0">
                        {loadingGrants ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
                            <span className="text-slate-600">Loading grants...</span>
                          </div>
                        ) : roundGrants.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <p>No individual grant details available</p>
                            <p className="text-xs mt-1">
                              Visit the round page to see all grants
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 mt-4">
                            <h4 className="text-sm font-medium text-slate-900">
                              Grants ({roundGrants.length})
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-slate-200">
                                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-600">Project</th>
                                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-600">Recipient</th>
                                    <th className="text-right py-2 px-3 text-xs font-medium text-slate-600">Amount</th>
                                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-600">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {roundGrants.map((grant) => (
                                    <tr key={grant.id} className="border-b border-slate-100 hover:bg-slate-50">
                                      <td className="py-2 px-3">
                                        <div className="text-sm text-slate-900">{grant.title}</div>
                                        {grant.description && (
                                          <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                                            {grant.description}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2 px-3">
                                        <code className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                          {grant.recipientAddress.substring(0, 10)}...{grant.recipientAddress.substring(34)}
                                        </code>
                                      </td>
                                      <td className="py-2 px-3 text-right text-sm text-slate-900">
                                        {formatETH(grant.amount)} ETH
                                      </td>
                                      <td className="py-2 px-3">
                                        <Badge variant="outline">{grant.status}</Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Grants Timeline</CardTitle>
                      <CardDescription>Allocation and grant counts over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" angle={-45} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" stroke="#64748b" tickFormatter={(value) => `${value.toFixed(1)} ETH`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'allocation') return `${value.toFixed(2)} ETH`;
                          if (name === 'grants') return `${value} grants`;
                          return value;
                        }}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="allocation" fill="#3b82f6" name="Allocation (ETH)" />
                      <Line yAxisId="right" type="monotone" dataKey="grants" stroke="#10b981" strokeWidth={2} name="Grant Count" />
                    </ComposedChart>
                  </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Builder Grants Link */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-blue-900">Public Goods Builders Grants</CardTitle>
              </div>
              <CardDescription>Large-scale grants for foundational public goods projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700 mb-2">
                    The ENS Public Goods Builders Grants program supports foundational public goods in the Ethereum and Web3 ecosystems.
                  </p>
                  <p className="text-xs text-slate-600">
                    Visit builder.ensgrants.xyz to view current rounds and apply for grants.
                  </p>
                </div>
                <a
                  href={BUILDER_GRANTS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm font-medium ml-4"
                >
                  View Builder Grants
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Grant Discussions from Raw JSON */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-1">
                <CardTitle>Grant Discussions (raw/all_proposals_initiatives.json)</CardTitle>
                <CardDescription>
                  Topics tagged as grants in Discuss ENS (loaded from local raw JSON)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingGrantProposals ? (
                <div className="flex items-center justify-center py-8 text-slate-600">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading grant discussions...
                </div>
              ) : recentGrantProposals.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No grant-tagged discussions found in the raw dataset
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {recentGrantProposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-slate-900 mb-1">
                            {proposal.title}
                          </h4>
                          <p className="text-xs text-slate-500 mb-2">
                            Created {formatDate(proposal.created_at)} • {proposal.post_count} posts •{' '}
                            {proposal.views.toLocaleString()} views
                          </p>
                          {proposal.categories?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {proposal.categories.map((category) => (
                                <Badge key={category} variant="outline" className="text-[11px]">
                                  {category}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {proposal.excerpt && (
                            <p className="text-sm text-slate-600 line-clamp-2">{proposal.excerpt}</p>
                          )}
                        </div>
                        <a
                          href={proposal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 flex-shrink-0"
                        >
                          View Topic
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Initiatives Tab */}
        <TabsContent value="initiatives" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Funded Initiatives & Projects</CardTitle>
                    <CardDescription>Governance proposals and initiatives with executed spending</CardDescription>
                  </div>
                  <button
                    onClick={exportInitiativesToCSV}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search initiatives..."
                      value={initiativeSearchQuery}
                      onChange={(e) => setInitiativeSearchQuery(e.target.value)}
                      className="pl-10 w-[300px]"
                    />
                  </div>
                  <Select value={selectedInitiativeCategory} onValueChange={setSelectedInitiativeCategory}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="ecosystem">Ecosystem</SelectItem>
                      <SelectItem value="publicgoods">Public Goods</SelectItem>
                      <SelectItem value="metagov">Meta-Governance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={initiativeSortBy} onValueChange={(v) => setInitiativeSortBy(v as 'spending' | 'transactions' | 'name')}>
                    <SelectTrigger className="w-[180px]">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spending">Sort by Spending</SelectItem>
                      <SelectItem value="transactions">Sort by Transactions</SelectItem>
                      <SelectItem value="name">Sort by Name</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => setInitiativeSortOrder(initiativeSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    title={`Sort ${initiativeSortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                  >
                    {initiativeSortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-slate-600">Total Initiatives</CardTitle>
                <FolderOpen className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-slate-900">{totalInitiatives}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {initiativesByCategory['Ecosystem'] || 0} Ecosystem, {initiativesByCategory['Public Goods'] || 0} Public Goods, {initiativesByCategory['Meta-Governance'] || 0} Meta-Gov
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-slate-600">Total Spending</CardTitle>
                <DollarSign className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-slate-900">{formatCurrency(totalInitiativeSpending)}</div>
                <p className="text-xs text-slate-500 mt-1">Across all initiatives</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-slate-600">Total Transactions</CardTitle>
                <FileText className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-slate-900">
                  {initiativesByEP.reduce((sum, p) => sum + p.transactionCount, 0).toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 mt-1">Transaction count</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-slate-600">Avg per Initiative</CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-slate-900">
                  {totalInitiatives > 0 ? formatCurrency(totalInitiativeSpending / totalInitiatives) : '$0'}
                </div>
                <p className="text-xs text-slate-500 mt-1">Average spending</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {initiativesChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Initiatives by Spending</CardTitle>
                <CardDescription>Top 10 funded initiatives</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={initiativesChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" tickFormatter={(value) => `$${value.toFixed(1)}M`} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" width={80} />
                    <Tooltip 
                      formatter={(value: number) => `$${value.toFixed(2)}M`}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="spending" fill="#3b82f6" name="Total Spending ($M)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Initiatives List */}
          <Card>
            <CardHeader>
              <CardTitle>All Funded Initiatives</CardTitle>
              <CardDescription>Governance proposals with executed spending from discuss.ens.domains</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInitiatives ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
                  <span className="text-slate-600">Loading initiatives...</span>
                </div>
              ) : initiativesByEP.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No initiatives found matching your criteria
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {initiativesByEP.map((initiative, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-5 border border-slate-200 hover:bg-white transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">{initiative.ep}</Badge>
                            <Badge variant={
                              initiative.workingGroup === 'Ecosystem' ? 'default' :
                              initiative.workingGroup === 'Public Goods' ? 'secondary' :
                              'outline'
                            }>
                              {initiative.workingGroup}
                            </Badge>
                            {initiative.terms.length > 0 && (
                              <Badge variant="outline">
                                {initiative.terms.filter(t => t).join(', ')}
                              </Badge>
                            )}
                          </div>
                          <h5 className="text-base font-semibold text-slate-900 mb-2">
                            {initiative.title.replace(/\[EP\d+\.\d+\.\d+\]\s*\[Social\]\s*/, '').replace(/Funding Request:\s*/, '')}
                          </h5>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                            <span>{initiative.quarters.length} quarter{initiative.quarters.length !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>{initiative.transactionCount.toLocaleString()} transactions</span>
                            <span>•</span>
                            <span>{initiative.walletCount} wallets</span>
                            <span>•</span>
                            <span>
                              {initiative.firstDate} - {initiative.lastDate}
                            </span>
                          </div>
                          {initiative.quarters.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {initiative.quarters.sort().map(q => (
                                <Badge key={q} variant="outline" className="text-xs">
                                  {q}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-6 flex-shrink-0">
                          <div className="text-2xl font-bold text-slate-900 mb-1">
                            {formatCurrency(initiative.totalUSD)}
                          </div>
                          <div className="text-sm text-slate-500 mb-3">
                            {initiative.totalETH > 0 && `${initiative.totalETH.toFixed(4)} ETH`}
                            {initiative.totalETH > 0 && initiative.totalUSDC > 0 && ' • '}
                            {initiative.totalUSDC > 0 && `${formatCurrency(initiative.totalUSDC)} USDC`}
                          </div>
                          {initiative.url && (
                            <a
                              href={initiative.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1 justify-end"
                            >
                              View on Discuss
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

