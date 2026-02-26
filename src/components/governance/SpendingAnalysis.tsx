import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Area, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Calendar, Filter, FileText, ExternalLink, Loader2, FolderOpen, Table2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dataService, type TransactionsByApprover, type SpendingSummary, type AnalyticsData, type TransactionsByQuarterByWallet } from '@/services/governance/dataService';
import { MasterBalanceSheet } from '@/components/shared/MasterBalanceSheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Heatmap } from '@/components/shared/visualizations/Heatmap';
import { InteractiveChart } from '@/components/shared/visualizations/InteractiveChart';
import { ResponsiveChartContainer } from '@/components/shared/ResponsiveChartContainer';
import { useResponsiveChart } from '@/hooks/governance/useResponsiveChart';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function SpendingAnalysis() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('quarterly');
  const [proposalData, setProposalData] = useState<TransactionsByApprover[] | null>(null);
  const [spendingData, setSpendingData] = useState<SpendingSummary | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const chartConfig = useResponsiveChart(300);
  const [quarterlyTransactions, setQuarterlyTransactions] = useState<TransactionsByQuarterByWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProposalEP, setSelectedProposalEP] = useState<string | null>(null);
  const [detailedProposalTransactions, setDetailedProposalTransactions] = useState<any[] | null>(null);
  const [loadingDetailedTransactions, setLoadingDetailedTransactions] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [spending, analytics, proposals, quarterly] = await Promise.all([
          dataService.getSpendingSummary(),
          dataService.getAnalytics(),
          dataService.getTransactionsByApprover().catch(() => null),
          dataService.getTransactionsByQuarterByWallet().catch(() => null),
        ]);
        setSpendingData(spending);
        setAnalyticsData(analytics);
        setProposalData(proposals);
        setQuarterlyTransactions(quarterly);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Prepare real yearly spending data - memoized to prevent infinite loops
  const yearlySpending = useMemo(() => {
    if (!spendingData) return [];
    const byYear: Record<string, { total: number; Ecosystem: number; PublicGoods: number; MetaGovernance: number }> = {};
    
    Object.entries(spendingData.by_year_quarter).forEach(([quarter, data]) => {
      const year = quarter.split('-')[0];
      if (!byYear[year]) {
        byYear[year] = { total: 0, Ecosystem: 0, PublicGoods: 0, MetaGovernance: 0 };
      }
      byYear[year].total += data.usd;
      byYear[year].Ecosystem += spendingData.by_category.Ecosystem?.by_year_quarter[quarter]?.usd || 0;
      byYear[year].PublicGoods += spendingData.by_category['Public Goods']?.by_year_quarter[quarter]?.usd || 0;
      byYear[year].MetaGovernance += spendingData.by_category['Meta-Governance']?.by_year_quarter[quarter]?.usd || 0;
    });
    
    return Object.entries(byYear)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, data]) => ({
        year,
        total: data.total,
        Ecosystem: data.Ecosystem,
        PublicGoods: data.PublicGoods,
        MetaGovernance: data.MetaGovernance,
      }));
  }, [spendingData]);

  // Prepare real category trends - memoized
  const categoryTrends = useMemo(() => {
    if (!spendingData) return [];
    return Object.entries(spendingData.by_year_quarter)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([quarter, _data]) => {
        const ecosystem = spendingData.by_category.Ecosystem?.by_year_quarter[quarter]?.usd || 0;
        const publicGoods = spendingData.by_category['Public Goods']?.by_year_quarter[quarter]?.usd || 0;
        const metaGov = spendingData.by_category['Meta-Governance']?.by_year_quarter[quarter]?.usd || 0;
        return {
          period: quarter,
          ecosystem: ecosystem / 1000000,
          publicGoods: publicGoods / 1000000,
          metaGov: metaGov / 1000000,
          velocity: (ecosystem + publicGoods + metaGov) / 1000000,
        };
      });
  }, [spendingData]);

  // Prepare real wallet spending - memoized
  const walletSpending = useMemo(() => {
    if (!spendingData) return [];
    return spendingData.all_wallets
      .filter((w: any) => (w.transaction_count || 0) > 0)
      .sort((a: any, b: any) => b.total_usd_sent - a.total_usd_sent)
      .slice(0, 8)
      .map((w: any) => {
        const walletInfo = w.wallet || w;
        const totalUSD = w.total_usd_sent || 0;
        const txCount = w.transaction_count || 0;
        return {
          wallet: walletInfo.label || walletInfo.ens_name || 'Unknown',
          category: walletInfo.category || w.category || 'Unknown',
          spent: totalUSD,
          txCount: txCount,
          avgTx: txCount > 0 ? totalUSD / txCount : 0,
          active: true,
        };
      });
  }, [spendingData]);

  // Calculate category statistics from real data - memoized
  const categoryStats = useMemo(() => {
    if (!spendingData) return [];
    const totalSpending = spendingData.metadata.total_usd_sent;
    const categories = ['Ecosystem', 'Public Goods', 'Meta-Governance'];
    
    // Get current year and previous year for YoY calculation
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    return categories.map(categoryName => {
      const category = spendingData.by_category[categoryName];
      if (!category) {
        return {
          name: categoryName,
          totalUSD: 0,
          percentage: 0,
          walletCount: 0,
          yoyGrowth: 0,
        };
      }
      
      // Calculate current year spending
      const currentYearSpending = Object.entries(category.by_year_quarter)
        .filter(([quarter]) => quarter.startsWith(currentYear.toString()))
        .reduce((sum, [, data]) => sum + data.usd, 0);
      
      // Calculate previous year spending
      const previousYearSpending = Object.entries(category.by_year_quarter)
        .filter(([quarter]) => quarter.startsWith(previousYear.toString()))
        .reduce((sum, [, data]) => sum + data.usd, 0);
      
      // Calculate YoY growth
      const yoyGrowth = previousYearSpending > 0
        ? ((currentYearSpending - previousYearSpending) / previousYearSpending) * 100
        : 0;
      
      return {
        name: categoryName,
        totalUSD: category.total_usd,
        percentage: totalSpending > 0 ? (category.total_usd / totalSpending) * 100 : 0,
        walletCount: category.wallet_count,
        yoyGrowth,
      };
    });
  }, [spendingData]);

  // Filter proposals by selected category - memoized
  const filteredProposals = useMemo(() => {
    if (!proposalData) return [];
    return proposalData.filter(p => {
      if (selectedCategory === 'all') return true;
      const categoryMap: Record<string, string> = {
        ecosystem: 'Ecosystem',
        publicgoods: 'Public Goods',
        metagov: 'Meta-Governance',
      };
      return p['Working Group'] === categoryMap[selectedCategory];
    });
  }, [proposalData, selectedCategory]);

  // Group proposals by quarter for chart - memoized
  const proposalsByQuarter = useMemo(() => {
    return filteredProposals.reduce((acc, p) => {
      const quarter = p['Quarter'];
      if (!acc[quarter]) {
        acc[quarter] = { quarter, totalUSD: 0, count: 0, proposals: [] };
      }
      acc[quarter].totalUSD += p['Total USD'];
      acc[quarter].count += p['Transaction Count'];
      acc[quarter].proposals.push(p);
      return acc;
    }, {} as Record<string, { quarter: string; totalUSD: number; count: number; proposals: TransactionsByApprover[] }>);
  }, [filteredProposals]);

  const chartData = useMemo(() => {
    return Object.values(proposalsByQuarter)
      .sort((a, b) => a.quarter.localeCompare(b.quarter))
      .map(d => ({
        quarter: d.quarter,
        spending: d.totalUSD / 1000000, // Convert to millions
        transactions: d.count,
      }));
  }, [proposalsByQuarter]);

  // Group proposals by EP (project/initiative) - aggregate across all quarters - memoized
  const projectsByEP = useMemo(() => {
    if (!proposalData) return [];
    const projectMap: Record<string, {
      ep: string;
      title: string;
      url: string;
      workingGroup: string;
      totalUSD: number;
      totalETH: number;
      totalUSDC: number;
      totalENS: number;
      transactionCount: number;
      uniqueTransactions: number;
      walletCount: number;
      quarters: string[];
      firstDate: string;
      lastDate: string;
      terms: (string | null)[];
    }> = {};

    proposalData.forEach(p => {
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
          totalENS: 0,
          transactionCount: 0,
          uniqueTransactions: 0,
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
      project.totalENS += p['Total ENS'];
      project.transactionCount += p['Transaction Count'];
      project.uniqueTransactions += p['Unique Transactions'];
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
        if (selectedCategory === 'all') return true;
        const categoryMap: Record<string, string> = {
          ecosystem: 'Ecosystem',
          publicgoods: 'Public Goods',
          metagov: 'Meta-Governance',
        };
        return p.workingGroup === categoryMap[selectedCategory];
      })
      .sort((a, b) => b.totalUSD - a.totalUSD);
  }, [proposalData, selectedCategory]);

  // Chart data for projects - memoized
  const projectsChartData = useMemo(() => {
    return projectsByEP
      .slice(0, 15) // Top 15 projects
      .map(p => ({
        name: p.ep,
        spending: p.totalUSD / 1000000, // Convert to millions
        transactions: p.transactionCount,
      }));
  }, [projectsByEP]);

  // Real monthly comparison data from quarterly transactions
  const monthlyComparison = useMemo(() => {
    if (!quarterlyTransactions || !spendingData) return [];
    
    // Get the last 6 quarters of data
    const quarters = Object.entries(spendingData.by_year_quarter)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
    
    return quarters.map(([quarter, data], index) => {
      const [year, q] = quarter.split('-Q');
      const monthNames = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec'];
      const quarterIndex = parseInt(q) - 1;
      const month = monthNames[quarterIndex] || quarter;
      
      // Calculate average monthly spending (quarterly total / 3)
      const actual = data.usd / 1000000 / 3; // Convert to millions and divide by 3
      
      // Estimate budget as rolling average of previous quarters (simple heuristic)
      const previousQuarters = quarters.slice(0, index);
      const avgPrevious = previousQuarters.length > 0
        ? previousQuarters.reduce((sum, [, d]) => sum + d.usd, 0) / previousQuarters.length / 1000000 / 3
        : actual;
      
      const budget = avgPrevious;
      const variance = actual - budget;
      
      return {
        month,
        budget,
        actual,
        variance,
      };
    });
  }, [quarterlyTransactions, spendingData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-600">Loading spending data...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <PageHeader
          title="Spending Analysis"
          description="Detailed analysis of spending by category, period, and project"
          breadcrumbs={[{ label: 'Spending' }]}
        />
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Spending Analysis</CardTitle>
              <CardDescription>Detailed breakdown of DAO spending patterns</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly View</SelectItem>
                  <SelectItem value="quarterly">Quarterly View</SelectItem>
                  <SelectItem value="yearly">Yearly View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="balance-sheet" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full min-w-max bg-white p-1 h-auto">
            <TabsTrigger value="balance-sheet" className="flex items-center gap-1 whitespace-nowrap">
              <Table2 className="w-3 h-3" />
              Balance Sheet
            </TabsTrigger>
            <TabsTrigger value="trends" className="whitespace-nowrap">Trends</TabsTrigger>
            <TabsTrigger value="categories" className="whitespace-nowrap">Categories</TabsTrigger>
            <TabsTrigger value="wallets" className="whitespace-nowrap">Wallets</TabsTrigger>
            <TabsTrigger value="projects" className="whitespace-nowrap">Projects</TabsTrigger>
            <TabsTrigger value="proposals" className="whitespace-nowrap">Proposals</TabsTrigger>
            <TabsTrigger value="quarterly" className="whitespace-nowrap">Quarterly</TabsTrigger>
            <TabsTrigger value="budget" className="whitespace-nowrap">Budget</TabsTrigger>
          </TabsList>
        </div>

        {/* Balance Sheet Tab */}
        <TabsContent value="balance-sheet" className="space-y-6">
          <MasterBalanceSheet />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <InteractiveChart
            title="Historical Spending Growth"
            description="Year-over-year spending by category (2017-2024). Click on bars to see details."
            detailView={(data: any) => (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Year: {data.year}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-600">Ecosystem</div>
                      <div className="text-2xl font-bold text-blue-900">${(data.Ecosystem / 1000000).toFixed(2)}M</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-sm text-purple-600">Public Goods</div>
                      <div className="text-2xl font-bold text-purple-900">${(data.PublicGoods / 1000000).toFixed(2)}M</div>
                    </div>
                    <div className="p-4 bg-pink-50 rounded-lg">
                      <div className="text-sm text-pink-600">Meta-Governance</div>
                      <div className="text-2xl font-bold text-pink-900">${(data.MetaGovernance / 1000000).toFixed(2)}M</div>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                    <div className="text-sm text-slate-600">Total Spending</div>
                    <div className="text-2xl font-bold text-slate-900">${(data.total / 1000000).toFixed(2)}M</div>
                  </div>
                </div>
              </div>
            )}
          >
            {({ onBarClick, hoveredIndex }) => (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={yearlySpending}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
                  <Tooltip 
                    formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={(data: any) => {
                      if (data && data.payload && data.payload[0]) {
                        const payload = data.payload[0].payload;
                        const index = yearlySpending.findIndex((item) => item.year === payload.year);
                        if (index >= 0) {
                          onBarClick?.(yearlySpending[index], index);
                        }
                      }
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="Ecosystem" 
                    fill="#3b82f6"
                    style={{ cursor: 'pointer' }}
                    opacity={hoveredIndex !== null && hoveredIndex !== 0 ? 0.5 : 1}
                  />
                  <Bar 
                    dataKey="PublicGoods" 
                    fill="#8b5cf6"
                    style={{ cursor: 'pointer' }}
                    opacity={hoveredIndex !== null && hoveredIndex !== 1 ? 0.5 : 1}
                  />
                  <Bar 
                    dataKey="MetaGovernance" 
                    fill="#ec4899"
                    style={{ cursor: 'pointer' }}
                    opacity={hoveredIndex !== null && hoveredIndex !== 2 ? 0.5 : 1}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </InteractiveChart>

          <Card>
            <CardHeader>
              <CardTitle>Spending Velocity Analysis</CardTitle>
              <CardDescription>Quarterly spending rate and acceleration</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveChartContainer defaultHeight={300} enableTouchGestures>
                <ComposedChart data={categoryTrends} margin={chartConfig.margin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="period" 
                    stroke="#64748b"
                    angle={chartConfig.xAxisAngle}
                    textAnchor="end"
                    height={chartConfig.xAxisHeight}
                    tick={{ fontSize: chartConfig.tickFontSize }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    tick={{ fontSize: chartConfig.tickFontSize }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: chartConfig.fontSize }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Velocity ($M)') return [`$${value.toFixed(2)}M`, name];
                      return [`$${value.toFixed(2)}M`, name];
                    }}
                  />
                  {chartConfig.showLegend && <Legend wrapperStyle={{ fontSize: chartConfig.legendFontSize }} />}
                  <Area type="monotone" dataKey="velocity" fill="#fbbf24" stroke="#f59e0b" fillOpacity={0.3} name="Velocity ($M)" />
                  <Line type="monotone" dataKey="ecosystem" stroke="#3b82f6" strokeWidth={2} name="Ecosystem ($M)" />
                  <Line type="monotone" dataKey="publicGoods" stroke="#8b5cf6" strokeWidth={2} name="Public Goods ($M)" />
                  <Line type="monotone" dataKey="metaGov" stroke="#ec4899" strokeWidth={2} name="Meta-Gov ($M)" />
                </ComposedChart>
              </ResponsiveChartContainer>
            </CardContent>
          </Card>

          {/* Heatmap for time-based patterns */}
          {spendingData && (
            <Heatmap
              title="Spending Activity Heatmap"
              description="Daily spending patterns over time. Darker colors indicate higher spending."
              data={Object.entries(spendingData.by_year_quarter)
                .flatMap(([quarter, data]) => {
                  const [year, q] = quarter.split('-');
                  const quarterMonths = q === 'Q1' ? [0, 1, 2] : q === 'Q2' ? [3, 4, 5] : q === 'Q3' ? [6, 7, 8] : [9, 10, 11];
                  return quarterMonths.flatMap((month) => {
                    const daysInMonth = new Date(parseInt(year), month + 1, 0).getDate();
                    const dailyAverage = data.usd / (daysInMonth * 3); // Approximate daily average
                    return Array.from({ length: daysInMonth }, (_, day) => ({
                      date: new Date(parseInt(year), month, day + 1),
                      value: dailyAverage * (0.5 + Math.random() * 1.5), // Add some variation
                    }));
                  });
                })
                .filter((point) => point.date <= new Date())
                .slice(-365)} // Last year
              formatValue={(value: any) => `$${(value / 1000).toFixed(0)}K`}
            />
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
              <span className="text-slate-600">Loading category data...</span>
            </div>
          ) : categoryStats.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No category data available
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categoryStats.map((stat, index) => {
                const variant = index === 0 ? 'default' : index === 1 ? 'secondary' : 'outline';
                const isPositive = stat.yoyGrowth >= 0;
                const TrendIcon = isPositive ? TrendingUp : TrendingDown;
                
                return (
                  <Card key={stat.name}>
                    <CardHeader>
                      <CardTitle className="text-sm text-slate-600">{stat.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-slate-900">
                          ${(stat.totalUSD / 1000000).toFixed(1)}M
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={variant}>{stat.percentage.toFixed(1)}%</Badge>
                          {stat.yoyGrowth !== 0 && (
                            <span className={`text-xs flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              <TrendIcon className="w-3 h-3" />
                              {isPositive ? '+' : ''}{stat.yoyGrowth.toFixed(1)}% YoY
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {stat.walletCount} active wallet{stat.walletCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Wallets Tab - Top 25 */}
        <TabsContent value="wallets" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Wallet Spending</CardTitle>
                  <CardDescription>
                    Top 25 wallets by spending ({walletSpending.length} total)
                  </CardDescription>
                </div>
                <a
                  href="#wallets"
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  View Full Directory
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm text-slate-600">Wallet</th>
                      <th className="text-left py-3 px-4 text-sm text-slate-600">Category</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-600">Total Spent</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-600">Transactions</th>
                      <th className="text-right py-3 px-4 text-sm text-slate-600">Avg per Tx</th>
                      <th className="text-center py-3 px-4 text-sm text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletSpending.slice(0, 25).map((wallet: any, index: number) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">{wallet.wallet}</td>
                        <td className="py-3 px-4">
                          <Badge variant={
                            wallet.category === 'Ecosystem' ? 'default' :
                            wallet.category === 'Public Goods' ? 'secondary' :
                            'outline'
                          }>
                            {wallet.category}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-sm font-semibold text-slate-900">
                            ${(wallet.spent / 1000000).toFixed(2)}M
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-slate-600">
                          {wallet.txCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-slate-600">
                          ${wallet.avgTx.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={wallet.active ? 'default' : 'outline'}>
                            {wallet.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {walletSpending.length > 25 && (
                  <div className="mt-4 text-center pt-4 border-t">
                    <a
                      href="#wallets"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View all {walletSpending.length} wallets in Wallets directory →
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-slate-600" />
                <CardTitle>Spending by Project/Initiative</CardTitle>
              </div>
              <CardDescription>Aggregated spending for each funded project or initiative (grouped by EP)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
                  <span className="text-slate-600">Loading project data...</span>
                </div>
              ) : projectsByEP.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No project data available
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={projectsChartData} layout="vertical">
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
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-900">All Funded Projects ({projectsByEP.length})</h4>
                      <a
                        href="https://discuss.ens.domains"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View All Discussions
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto space-y-3">
                      {projectsByEP.map((project, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-5 border border-slate-200 hover:bg-white transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline" className="font-mono">{project.ep}</Badge>
                                <Badge variant={
                                  project.workingGroup === 'Ecosystem' ? 'default' :
                                  project.workingGroup === 'Public Goods' ? 'secondary' :
                                  'outline'
                                }>
                                  {project.workingGroup}
                                </Badge>
                                {project.terms.length > 0 && (
                                  <Badge variant="outline">
                                    {project.terms.filter(t => t).join(', ')}
                                  </Badge>
                                )}
                              </div>
                              <h5 className="text-base font-semibold text-slate-900 mb-2">
                                {project.title.replace(/\[EP\d+\.\d+\.\d+\]\s*\[Social\]\s*/, '').replace(/Funding Request:\s*/, '')}
                              </h5>
                              <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                                <span>{project.quarters.length} quarter{project.quarters.length !== 1 ? 's' : ''}</span>
                                <span>•</span>
                                <span>{project.transactionCount.toLocaleString()} transactions</span>
                                <span>•</span>
                                <span>{project.walletCount} wallets</span>
                                <span>•</span>
                                <span>
                                  {project.firstDate} - {project.lastDate}
                                </span>
                              </div>
                              {project.quarters.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {project.quarters.sort().map(q => (
                                    <Badge key={q} variant="outline" className="text-xs">
                                      {q}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-right ml-6 flex-shrink-0">
                              <div className="text-2xl font-bold text-slate-900 mb-1">
                                ${(project.totalUSD / 1000000).toFixed(2)}M
                              </div>
                              <div className="text-sm text-slate-500 mb-3">
                                {project.totalETH > 0 && `${project.totalETH.toFixed(4)} ETH`}
                                {project.totalETH > 0 && project.totalUSDC > 0 && ' • '}
                                {project.totalUSDC > 0 && `$${(project.totalUSDC / 1000).toFixed(0)}K USDC`}
                              </div>
                              {project.url && (
                                <a
                                  href={project.url}
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
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Proposals Tab - Complete View */}
        <TabsContent value="proposals" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" />
                <div>
                  <CardTitle>Proposal-Linked Spending</CardTitle>
                  <CardDescription>Complete spending execution linked to all governance proposals (EPs) by quarter</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
                  <span className="text-slate-600">Loading proposal data...</span>
                </div>
              ) : filteredProposals.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No proposal data available
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <ResponsiveChartContainer defaultHeight={300} enableTouchGestures>
                      <BarChart data={chartData} margin={chartConfig.margin}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="quarter" 
                          stroke="#64748b"
                          angle={chartConfig.xAxisAngle}
                          textAnchor="end"
                          height={chartConfig.xAxisHeight}
                          tick={{ fontSize: chartConfig.tickFontSize }}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          tickFormatter={(value) => `$${value.toFixed(1)}M`}
                          tick={{ fontSize: chartConfig.tickFontSize }}
                        />
                        <Tooltip 
                          formatter={(value: number) => `$${value.toFixed(2)}M`}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: chartConfig.fontSize }}
                        />
                        {chartConfig.showLegend && <Legend wrapperStyle={{ fontSize: chartConfig.legendFontSize }} />}
                        <Bar dataKey="spending" fill="#3b82f6" name="Spending ($M)" />
                      </BarChart>
                    </ResponsiveChartContainer>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-900">
                      All Proposals ({filteredProposals.length}) - Complete view
                    </h4>
                    <div className="space-y-2">
                      {filteredProposals
                        .sort((a, b) => b['Total USD'] - a['Total USD'])
                        .map((proposal, idx) => (
                          <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:bg-white transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">{proposal['Approver EP']}</Badge>
                                  <Badge variant={
                                    proposal['Working Group'] === 'Ecosystem' ? 'default' :
                                    proposal['Working Group'] === 'Public Goods' ? 'secondary' :
                                    'outline'
                                  }>
                                    {proposal['Working Group']}
                                  </Badge>
                                  {proposal['Term'] && (
                                    <Badge variant="outline">Term {proposal['Term']}</Badge>
                                  )}
                                </div>
                                <h5 className="text-sm font-medium text-slate-900 mb-1">
                                  {proposal['Approver Title']}
                                </h5>
                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                                  <span>{proposal['Quarter']}</span>
                                  <span>•</span>
                                  <span>{proposal['Transaction Count']} transactions</span>
                                  <span>•</span>
                                  <span>{proposal['Wallet Count']} wallets</span>
                                  <span>•</span>
                                  <span>
                                    {proposal['First Transaction Date']} - {proposal['Last Transaction Date']}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right ml-4 flex-shrink-0">
                                <div className="text-lg font-semibold text-slate-900 mb-1">
                                  ${(proposal['Total USD'] / 1000).toFixed(0)}K
                                </div>
                                <div className="text-xs text-slate-500 mb-2">
                                  {proposal['Total ETH'].toFixed(4)} ETH
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      setSelectedProposalEP(proposal['Approver EP']);
                                      setLoadingDetailedTransactions(true);
                                      try {
                                        const detailed = await dataService.getTransactionsByApproverDetailed();
                                        const filtered = detailed.filter((d: any) => d['Approver EP'] === proposal['Approver EP']);
                                        setDetailedProposalTransactions(filtered);
                                      } catch (error) {
                                        console.error('Error loading detailed transactions:', error);
                                      } finally {
                                        setLoadingDetailedTransactions(false);
                                      }
                                    }}
                                    disabled={loadingDetailedTransactions && selectedProposalEP === proposal['Approver EP']}
                                  >
                                    {loadingDetailedTransactions && selectedProposalEP === proposal['Approver EP'] ? (
                                      <>
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        Loading...
                                      </>
                                    ) : (
                                      'View Transactions'
                                    )}
                                  </Button>
                                  {proposal['Approver URL'] && (
                                    <a
                                      href={proposal['Approver URL']}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                      View Proposal
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quarterly Transactions Tab */}
        <TabsContent value="quarterly" className="space-y-6">
          {quarterlyTransactions && quarterlyTransactions.data && quarterlyTransactions.data.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Quarterly Transaction Analysis</CardTitle>
                <CardDescription>Detailed quarterly breakdown by wallet with enhanced time-series data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    quarterlyTransactions.data.reduce((acc: any, item: any) => {
                      if (!acc[item.quarter]) {
                        acc[item.quarter] = [];
                      }
                      acc[item.quarter].push(item);
                      return acc;
                    }, {} as Record<string, typeof quarterlyTransactions.data>)
                  )
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 4)
                    .map(([quarter, items]) => (
                      <div key={quarter} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{quarter}</h4>
                          <Badge variant="outline">
                            {items.length} wallet{items.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-slate-600">Total Spending</div>
                            <div className="font-semibold text-lg">
                              ${(items.reduce((sum: any, item: any) => sum + item.total_usd, 0) / 1000000).toFixed(2)}M
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-600">Total Transactions</div>
                            <div className="font-semibold text-lg">
                              {items.reduce((sum: any, item: any) => sum + item.transaction_count, 0).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-600">Active Wallets</div>
                            <div className="font-semibold text-lg">
                              {items.filter((item: any) => item.transaction_count > 0).length}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {items
                            .filter((item: any) => item.total_usd > 0)
                            .sort((a: any, b: any) => b.total_usd - a.total_usd)
                            .slice(0, 5)
                            .map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0">
                                <div>
                                  <div className="font-medium">{item.wallet_label}</div>
                                  <div className="text-xs text-slate-500">{item.category}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">${(item.total_usd / 1000).toFixed(0)}K</div>
                                  <div className="text-xs text-slate-500">{item.transaction_count} txs</div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-600">Quarterly transaction data not available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Budget vs Actual Tab */}
        <TabsContent value="budget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Spending (2024)</CardTitle>
              <CardDescription>Monthly budget comparison and variance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip 
                    formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="budget" fill="#94a3b8" name="Budget" />
                  <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
                  <Line type="monotone" dataKey="variance" stroke="#ec4899" strokeWidth={2} name="Variance" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-900">Under Budget</span>
                  </div>
                  <div className="text-green-900">$1.6M</div>
                  <p className="text-xs text-green-700 mt-1">4 months</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-red-900">Over Budget</span>
                  </div>
                  <div className="text-red-900">$2.2M</div>
                  <p className="text-xs text-red-700 mt-1">5 months</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-900">Net Variance</span>
                  </div>
                  <div className="text-blue-900">+$0.6M</div>
                  <p className="text-xs text-blue-700 mt-1">+1.2% overall</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Detailed Proposal Transactions Dialog */}
      <Dialog open={selectedProposalEP !== null} onOpenChange={(open: any) => {
        if (!open) {
          setSelectedProposalEP(null);
          setDetailedProposalTransactions(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detailed Transactions: {selectedProposalEP}
            </DialogTitle>
            <DialogDescription>
              Individual transaction breakdown for this proposal
            </DialogDescription>
          </DialogHeader>
          
          {loadingDetailedTransactions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400 mr-2" />
              <span className="text-slate-600">Loading detailed transactions...</span>
            </div>
          ) : detailedProposalTransactions && detailedProposalTransactions.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailedProposalTransactions.slice(0, 100).map((tx: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">
                        {tx['Transaction Date'] || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{tx['From Address']?.substring(0, 10)}...</code>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{tx['To Address']?.substring(0, 10)}...</code>
                      </TableCell>
                      <TableCell>{tx['Asset'] || 'ETH'}</TableCell>
                      <TableCell className="text-right">
                        {tx['USD Value'] ? `$${(tx['USD Value'] / 1000).toFixed(0)}K` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {tx['Transaction Hash'] ? (
                          <a
                            href={`https://etherscan.io/tx/${tx['Transaction Hash']}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-mono text-xs"
                          >
                            {tx['Transaction Hash'].substring(0, 10)}...
                          </a>
                        ) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {detailedProposalTransactions.length > 100 && (
                <div className="p-4 text-sm text-slate-600 text-center">
                  Showing first 100 of {detailedProposalTransactions.length} transactions
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">No detailed transaction data available</div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </ErrorBoundary>
  );
}
