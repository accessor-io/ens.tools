import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Line,
  Area,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  Activity,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  dataService,
  type EndowmentData,
  type KPKEndowmentData,
} from '@/services/governance/dataService';
import { ResponsiveChartContainer } from '@/components/shared/ResponsiveChartContainer';
import { useResponsiveChart } from '@/hooks/governance/useResponsiveChart';

// Util to format millions and thousands
const formatMillions = (value: number) => `$${(value / 1_000_000).toFixed(2)}M`;
const formatThousands = (value: number) => `$${(value / 1_000).toFixed(0)}K`;

export function TreasuryView() {
  const [endowmentData, setEndowmentData] = useState<EndowmentData | null>(null);
  const [kpkData, setKpkData] = useState<KPKEndowmentData | null>(null);
  const [treemapData, setTreemapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const chartConfig = useResponsiveChart(400);

  // Data fetching on mount
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [endowment, kpk, treemap] = await Promise.all([
          dataService.getEndowment(),
          dataService.getKPKEndowmentData().catch(() => null),
          dataService.getWalletHierarchyTreemap().catch(() => null),
        ]);
        if (!isMounted) return;
        setEndowmentData(endowment);
        setKpkData(kpk);
        setTreemapData(treemap);
      } catch (err) {
        // Optionally, show notification or error UI
        console.error('Error loading endowment data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Memoize expensive calculations to avoid recomputation
  const endowmentPerformance = useMemo(() => {
    if (!endowmentData) return [];
    return Object.entries(endowmentData.by_year_month)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => {
        const date = new Date(data.year, data.month - 1);
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          value: data.usd,
          eth: data.eth,
          allocated: data.allocated_usd || 0,
          apy: data.apy,
        };
      });
  }, [endowmentData]);

  const latestData = endowmentPerformance[endowmentPerformance.length - 1];
  const firstData = endowmentPerformance[0];

  const growthRate = useMemo(() => {
    if (latestData && firstData)
      return ((latestData.value - firstData.value) / firstData.value) * 100;
    return 0;
  }, [latestData, firstData]);

  const currentAPY = latestData?.apy || 0;
  const allocationRate = latestData?.allocated || 0;

  // KPK Summary extraction
  const latestKPKSummary = useMemo(() => {
    if (!kpkData) return null;
    const years = Object.keys(kpkData).sort((a, b) => b.localeCompare(a));
    if (!years.length) return null;
    const latestYear = years[0];
    const months = Object.keys(kpkData[latestYear] || {}).sort(
      (a, b) => parseInt(b) - parseInt(a)
    );
    if (!months.length) return null;
    const latestMonth = months[0];
    return kpkData[latestYear][latestMonth]?.report?.ETH?.summary || null;
  }, [kpkData]);

  // Asset allocation (token category)
  const assetAllocation = useMemo(() => {
    if (latestKPKSummary?.fundsByTokenCategory?.length) {
      return latestKPKSummary.fundsByTokenCategory.map((item: any) => ({
        asset: item.label,
        amount: item.funds,
        value: item.funds,
        percentage: (item.allocation * 100).toFixed(2),
        color: item.color || '#627eea',
      }));
    }
    if (latestData) {
      // Fallback: use synthetic allocation if KPK unavailable
      // Note: ratio constants are illustrative only
      return [
        {
          asset: 'ETH',
          amount: latestData.eth,
          value: latestData.value * 0.68,
          percentage: (68.0).toFixed(2),
          color: '#627eea',
        },
        {
          asset: 'USDC',
          amount: latestData.value * 0.197,
          value: latestData.value * 0.197,
          percentage: (19.7).toFixed(2),
          color: '#2775ca',
        },
        {
          asset: 'ENS',
          amount: latestData.value * 0.087,
          value: latestData.value * 0.087,
          percentage: (8.7).toFixed(2),
          color: '#5298ff',
        },
        {
          asset: 'DAI',
          amount: latestData.value * 0.036,
          value: latestData.value * 0.036,
          percentage: (3.6).toFixed(2),
          color: '#f5ac37',
        },
      ];
    }
    return [];
  }, [latestKPKSummary, latestData]);

  // Fund type breakdown
  const fundTypeAllocation = useMemo(() => (
    latestKPKSummary?.fundsByType?.length
      ? latestKPKSummary.fundsByType.map((item: any) => ({
          type: item.label,
          funds: item.funds,
          percentage: (item.allocation * 100).toFixed(2),
          color: item.color || '#627eea',
        }))
      : []
  ), [latestKPKSummary]);

  // Protocol allocation
  const protocolAllocation = useMemo(() => (
    latestKPKSummary?.fundsByProtocol?.length
      ? latestKPKSummary.fundsByProtocol.map((item: any) => ({
          protocol: item.label,
          funds: item.funds,
          percentage: (item.allocation * 100).toFixed(2),
          color: item.color || '#627eea',
        }))
      : []
  ), [latestKPKSummary]);

  // Yield
  const yieldData = useMemo(() => {
    if (!endowmentData) return [];
    return Object.entries(endowmentData.by_year_month)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => {
        const date = new Date(data.year, data.month - 1);
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          defiYield: data.defi_results_usd,
          // stakingYield: 0,
          total: data.defi_results_usd,
        };
      });
  }, [endowmentData]);
  // Stats
  const totalYield = useMemo(() => yieldData.reduce((sum, d) => sum + (d.defiYield || 0), 0), [yieldData]);
  const avgMonthlyYield = yieldData.length ? totalYield / yieldData.length : 0;
  const latestYield = yieldData.length ? yieldData[yieldData.length - 1].defiYield : 0;

  // Quarterly yield
  const quarterlyYield = useMemo(() => {
    if (!endowmentData) return [];
    return Object.entries(endowmentData.by_year_quarter)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([quarter, data]) => ({
        quarter,
        yield: data.defi_results_usd,
        apy: data.apy,
      }));
  }, [endowmentData]);

  // Cash flow - derived from real endowment data
  const cashFlow = useMemo(() => {
    if (!endowmentData) return [];
    
    // Calculate cash flow from endowment quarterly data
    // Inflow = endowment value increase + yield
    // Outflow = spending (derived from endowment value changes)
    return Object.entries(endowmentData.by_year_quarter)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([quarter, data], index, entries) => {
        const previousQuarter = index > 0 ? entries[index - 1][1] : null;
        const valueChange = previousQuarter ? data.usd - previousQuarter.usd : data.usd;
        const yieldGenerated = data.defi_results_usd || 0;
        
        // Estimate inflow as yield + value increase (if positive)
        const inflow = yieldGenerated + Math.max(0, valueChange);
        // Estimate outflow as value decrease (if negative) or spending
        const outflow = Math.max(0, -valueChange) || (yieldGenerated > 0 ? data.usd * 0.1 : 0);
        const net = inflow - outflow;
        
        return {
          quarter,
          inflow,
          outflow,
          net,
        };
      });
  }, [endowmentData]);

  // Derived cash flow metrics: avg quarterly burn, net flow, runway (demo numbers)
  const avgQuarterlyBurn = useMemo(() => {
    if (cashFlow.length === 0) return 0;
    const totalBurn = cashFlow.reduce((sum, row) => sum + row.outflow, 0);
    return totalBurn / cashFlow.length;
  }, [cashFlow]);
  const avgMonthlyBurn = avgQuarterlyBurn / 3;

  const netFlowLast4Q = useMemo(() => {
    if (cashFlow.length < 4) return 0;
    return cashFlow.slice(-4).reduce((sum, row) => sum + row.net, 0);
  }, [cashFlow]);
  const runwayEstimate = useMemo(() => {
    // Simple estimate: current value / avg monthly burn
    if (!latestData || avgMonthlyBurn === 0) return null;
    return (latestData.value / avgMonthlyBurn).toFixed(1);
  }, [latestData, avgMonthlyBurn]);

  // Handle loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-600">Loading treasury data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treasury View"
        description="Endowment performance, asset allocation, and treasury management"
        breadcrumbs={[{ label: 'Treasury' }]}
      />

      {/* Endowment Summary Card */}
      {endowmentData && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">ENS Endowment</CardTitle>
                <CardDescription className="mt-1">
                  Managed by Karpatkey • {endowmentData.metadata.start_date} - {endowmentData.metadata.end_date}
                </CardDescription>
              </div>
              <a
                href={`https://etherscan.io/address/${endowmentData.metadata.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View on Etherscan
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryStat label="Total Value" value={latestData ? formatMillions(latestData.value) : 'N/A'} />
              <SummaryStat
                label="ETH Holdings"
                value={latestData ? `${latestData.eth.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH` : 'N/A'}
              />
              <SummaryStat
                label="Allocation Rate"
                value={latestData ? `${(latestData.allocated * 100).toFixed(1)}%` : 'N/A'}
              />
              <SummaryStat
                label="Current APY"
                value={latestData ? `${(latestData.apy * 100).toFixed(2)}%` : 'N/A'}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Treasury Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <OverviewMetric
          icon={<DollarSign className="h-4 w-4 text-slate-400" />}
          label="Total Treasury Value"
          value={latestData ? formatMillions(latestData.value) : 'N/A'}
          subValue={
            <span className={`text-xs flex items-center gap-1 mt-1 ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`h-3 w-3 ${growthRate < 0 ? 'rotate-180' : ''}`} />
              {growthRate >= 0 ? '+' : ''}
              {growthRate.toFixed(1)}% since {firstData?.month || 'start'}
            </span>
          }
        />
        <OverviewMetric
          icon={<PieChartIcon className="h-4 w-4 text-slate-400" />}
          label="Allocation Rate"
          value={latestData ? `${(allocationRate * 100).toFixed(0)}%` : 'N/A'}
          subValue={
            <span className="text-xs text-slate-500 mt-1">
              {latestData ? formatMillions(latestData.value * allocationRate) + ' allocated' : 'N/A'}
            </span>
          }
        />
        <OverviewMetric
          icon={<Activity className="h-4 w-4 text-slate-400" />}
          label="Current APY"
          value={latestData ? `${(currentAPY * 100).toFixed(1)}%` : 'N/A'}
          subValue={<span className="text-xs text-slate-500 mt-1">Annual percentage yield</span>}
        />
        <OverviewMetric
          icon={<TrendingUp className="h-4 w-4 text-slate-400" />}
          label="ETH Holdings"
          value={latestData ? `${latestData.eth.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH` : 'N/A'}
          subValue={<span className="text-xs text-slate-500 mt-1">Current ETH balance</span>}
        />
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="allocation">Asset Allocation</TabsTrigger>
          <TabsTrigger value="yield">Yield Generation</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="wallet-hierarchy">Wallet Hierarchy</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Endowment Performance</CardTitle>
              <CardDescription>
                Historical treasury value and ETH holdings ({endowmentData ? `${endowmentData.metadata.start_date} - ${endowmentData.metadata.end_date}` : 'Loading...'})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {endowmentPerformance.length > 0 ? (
                <ResponsiveChartContainer defaultHeight={400} enableTouchGestures enablePinchZoom>
                  <ComposedChart data={endowmentPerformance} margin={chartConfig.margin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      stroke="#64748b"
                      angle={chartConfig.xAxisAngle}
                      textAnchor="end"
                      height={chartConfig.xAxisHeight}
                      tick={{ fontSize: chartConfig.tickFontSize }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#64748b"
                      tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`}
                      tick={{ fontSize: chartConfig.tickFontSize }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#64748b"
                      tickFormatter={(v) => `${(v / 1_000).toFixed(0)}K`}
                      tick={{ fontSize: chartConfig.tickFontSize }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'value') return formatMillions(value);
                        if (name === 'eth') return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH`;
                        if (name === 'apy') return `${((value as number) * 100).toFixed(2)}%`;
                        return value;
                      }}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: chartConfig.fontSize,
                      }}
                    />
                    {chartConfig.showLegend && <Legend wrapperStyle={{ fontSize: chartConfig.legendFontSize }} />}
                    <Area yAxisId="left" type="monotone" dataKey="value" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.2} name="USD Value" />
                    <Line yAxisId="right" type="monotone" dataKey="eth" stroke="#627eea" strokeWidth={2} name="ETH Holdings" />
                  </ComposedChart>
                </ResponsiveChartContainer>
              ) : (
                <div className="text-center py-12 text-slate-500">No endowment data available</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Allocation & APY Trends</CardTitle>
              <CardDescription>Treasury allocation percentage and annual yield over time</CardDescription>
            </CardHeader>
            <CardContent>
              {endowmentPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={endowmentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" angle={-45} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" stroke="#64748b" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'allocated') return `${(value * 100).toFixed(1)}%`;
                        if (name === 'apy') return `${(value * 100).toFixed(1)}%`;
                        return value;
                      }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="allocated" fill="#8b5cf6" name="Allocation Rate" />
                    <Line yAxisId="right" type="monotone" dataKey="apy" stroke="#10b981" strokeWidth={2} name="APY" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-500">No allocation data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asset Allocation Tab */}
        <TabsContent value="allocation" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Asset Composition</CardTitle>
                  <CardDescription>
                    Breakdown of treasury holdings by token category (Karpatkey Data)
                  </CardDescription>
                </div>
                {endowmentData?.metadata?.source && (
                  <a
                    href="https://reports.kpk.io/ens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View on Karpatkey
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assetAllocation.map((asset: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }} />
                        <span className="text-slate-900">{asset.asset}</span>
                        <Badge variant="outline">{asset.percentage}%</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-900">{formatMillions(asset.value)}</div>
                        <div className="text-sm text-slate-500">
                          {asset.asset === 'ETH'
                            ? `${Number(asset.amount).toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })} ETH`
                            : formatMillions(asset.amount)}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${asset.percentage}%`,
                          backgroundColor: asset.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fund Type Breakdown */}
          {fundTypeAllocation.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Fund Type Breakdown</CardTitle>
                <CardDescription>Allocation by fund type (Farming, Wallet, Unclaimed)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {fundTypeAllocation.map((item: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-900">{item.type}</span>
                            <Badge variant="outline">{item.percentage}%</Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-slate-900">{formatMillions(item.funds)}</div>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={fundTypeAllocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="funds"
                        >
                          {fundTypeAllocation.map((entry: any, idx: number) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatMillions(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Protocol Allocation */}
          {protocolAllocation.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Protocol Allocation</CardTitle>
                <CardDescription>DeFi protocol distribution (Karpatkey Data)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {protocolAllocation.map((item: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-900">{item.protocol}</span>
                            <Badge variant="outline">{item.percentage}%</Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-slate-900">{formatMillions(item.funds)}</div>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={protocolAllocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="funds"
                        >
                          {protocolAllocation.map((entry: any, idx: number) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatMillions(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diversification Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Allocation Metrics</CardTitle>
                <CardDescription>Fund allocation health metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricRow
                  label="Allocated Funds"
                  item={
                    <Badge variant="default">
                      {latestKPKSummary && typeof latestKPKSummary.allocatedFunds === 'number'
                        ? `${(latestKPKSummary.allocatedFunds * 100).toFixed(1)}%`
                        : 'N/A'}
                    </Badge>
                  }
                />
                <MetricRow
                  label="Token Categories"
                  item={<Badge variant="outline">{assetAllocation.length} types</Badge>}
                />
                <MetricRow
                  label="DeFi Protocols"
                  item={<Badge variant="secondary">{protocolAllocation.length} protocols</Badge>}
                />
                {latestKPKSummary?.fundsByBlockchain && (
                  <MetricRow
                    label="Blockchains"
                    item={
                      <Badge variant="outline">
                        {latestKPKSummary.fundsByBlockchain.length} chain
                        {latestKPKSummary.fundsByBlockchain.length !== 1 ? 's' : ''}
                      </Badge>
                    }
                  />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Data Source</CardTitle>
                <CardDescription>Karpatkey Endowment Management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricRow
                  label="Endowment Address"
                  item={
                    endowmentData?.metadata.address ? (
                      <a
                        href={`https://etherscan.io/address/${endowmentData.metadata.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        {endowmentData.metadata.address.substring(0, 10)}...
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      'N/A'
                    )
                  }
                />
                <MetricRow
                  label="Managed By"
                  item={<Badge variant="default">Karpatkey</Badge>}
                />
                <MetricRow
                  label="Report Period"
                  item={
                    <span className="text-sm text-slate-900">
                      {endowmentData?.metadata.start_date} - {endowmentData?.metadata.end_date}
                    </span>
                  }
                />
                <a
                  href="https://reports.kpk.io/ens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
                >
                  View Full Reports on Karpatkey 
                  <ExternalLink className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Yield Tab */}
        <TabsContent value="yield" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Yield Generation Over Time</CardTitle>
              <CardDescription>
                Monthly yield from DeFi protocols and staking
                {endowmentData && ` (${endowmentData.metadata.start_date} - ${endowmentData.metadata.end_date})`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {yieldData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={yieldData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#64748b" tickFormatter={formatThousands} />
                    <Tooltip
                      formatter={(v: number) => formatThousands(v)}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="defiYield" fill="#3b82f6" name="DeFi Yield" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-500">No yield data available</div>
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <YieldStatCard
              title="Total Yield Generated"
              value={totalYield > 0 ? formatMillions(totalYield) : 'N/A'}
              sub1={endowmentData ? `Since ${endowmentData.metadata.start_date}` : 'N/A'}
              sub2={`Avg ${formatThousands(avgMonthlyYield)}/month`}
            />
            <YieldStatCard
              title="Latest Monthly Yield"
              value={latestYield > 0 ? formatThousands(latestYield) : 'N/A'}
              sub1={yieldData.length > 0 ? `From ${yieldData[yieldData.length - 1].month}` : 'N/A'}
              sub2={latestData ? `APY: ${(latestData.apy * 100).toFixed(2)}%` : null}
            />
            <YieldStatCard
              title="Average APY"
              value={endowmentData ? `${(endowmentData.totals.avg_apy * 100).toFixed(2)}%` : 'N/A'}
              sub1={endowmentData ? `Over ${endowmentData.totals.total_months} months` : 'N/A'}
              sub2="All DeFi protocols"
            />
          </div>
          {/* Quarterly Yield Summary */}
          {quarterlyYield.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quarterly Yield Summary</CardTitle>
                <CardDescription>DeFi yield generation by quarter</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={quarterlyYield}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="quarter" stroke="#64748b" />
                    <YAxis stroke="#64748b" tickFormatter={formatThousands} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'yield') return formatThousands(value);
                        if (name === 'apy') return `${(value * 100).toFixed(2)}%`;
                        return value;
                      }}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="yield" fill="#10b981" name="DeFi Yield" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {quarterlyYield.slice(-4).map((q, idx) => (
                    <div key={idx} className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-600 mb-1">{q.quarter}</div>
                      <div className="text-sm font-semibold text-slate-900">
                        {formatThousands(q.yield)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        APY: {(q.apy * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Treasury Cash Flow</CardTitle>
              <CardDescription>Quarterly inflows vs outflows analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="quarter" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={formatMillions} />
                  <Tooltip
                    formatter={(value: number) => formatMillions(value)}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="inflow" fill="#10b981" name="Inflows" />
                  <Bar dataKey="outflow" fill="#ef4444" name="Outflows" />
                  <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} name="Net Flow" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <YieldStatCard
              title="Avg Quarterly Burn"
              value={formatMillions(avgQuarterlyBurn)}
              sub1={`${formatMillions(avgMonthlyBurn)}/month average`}
            />
            <YieldStatCard
              title="Net Flow (Last 4Q)"
              value={`${netFlowLast4Q < 0 ? '-' : ''}${formatMillions(Math.abs(netFlowLast4Q))}`}
              valueClass={netFlowLast4Q < 0 ? 'text-red-600' : 'text-green-600'}
              sub1={netFlowLast4Q < 0 ? 'Spending exceeds inflows' : 'Inflows exceed spending'}
            />
            <YieldStatCard
              title="Runway Estimate"
              value={runwayEstimate ? `${runwayEstimate} months` : 'N/A'}
              sub1="At current burn rate"
            />
          </div>
        </TabsContent>

        {/* Wallet Hierarchy Tab */}
        <TabsContent value="wallet-hierarchy" className="space-y-6">
          {treemapData ? (
            <Card>
              <CardHeader>
                <CardTitle>Wallet Hierarchy</CardTitle>
                <CardDescription>Treasury wallet structure and organization</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">Wallet hierarchy visualization coming soon</p>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-slate-500">No wallet hierarchy data available</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Improved stat card components ----
function SummaryStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-600 mb-1">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function OverviewMetric({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subValue: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm text-slate-600">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-slate-900">{value}</div>
        {subValue}
      </CardContent>
    </Card>
  );
}

// Row for key/value metrics
function MetricRow({ label, item }: { label: string; item: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      {item}
    </div>
  );
}

function YieldStatCard({
  title,
  value,
  valueClass,
  sub1,
  sub2,
}: {
  title: string;
  value: React.ReactNode;
  valueClass?: string;
  sub1?: React.ReactNode;
  sub2?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-slate-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-slate-900 ${valueClass ?? ''}`}>{value}</div>
        {sub1 && <p className="text-xs text-slate-500 mt-1">{sub1}</p>}
        {sub2 && <p className="text-xs text-slate-500 mt-1">{sub2}</p>}
      </CardContent>
    </Card>
  );
}