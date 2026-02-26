import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { TrendingUp, TrendingDown, DollarSign, Loader2, ExternalLink, AlertCircle, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dataService, type DiscourseReportsSummary, type DiscourseBudgetReports, type SpendingSummary, type TransactionsByApprover } from '@/services/governance/dataService';
import { TransactionFlowDetail } from '@/components/shared/TransactionFlowDetail';
import { ResponsiveChartContainer } from '@/components/shared/ResponsiveChartContainer';
import { useResponsiveChart } from '@/hooks/governance/useResponsiveChart';
import { parseProposalData } from '@/utils/governance/proposalParser'

interface DetailedTransaction {
  'Approver EP': string;
  'Approver Title': string;
  'Working Group': string;
  'Term': string | null;
  'Quarter': string;
  'Transaction Hash': string;
  'Transaction Date': string;
  'From Address': string;
  'To Address': string;
  'Token Type': string;
  'Token Amount': number;
  'Value ETH': number;
  'Value USD': number;
  'Wallet Address': string;
  'Wallet Label': string;
}

interface BudgetItemGroup {
  ep: string;
  title: string;
  url: string;
  quarter: string;
  workingGroup: string;
  term: string | null;
  totalUSD: number;
  totalETH: number;
  totalUSDC: number;
  transactionCount: number;
  transactions: DetailedTransaction[];
}

export function BudgetAnalysis() {
  const [reportsSummary, setReportsSummary] = useState<DiscourseReportsSummary | null>(null);
  const [budgetReports, setBudgetReports] = useState<DiscourseBudgetReports | null>(null);
  const [spendingData, setSpendingData] = useState<SpendingSummary | null>(null);
  const [proposalTransactions, setProposalTransactions] = useState<TransactionsByApprover[] | null>(null);
  const [detailedTransactions, setDetailedTransactions] = useState<DetailedTransaction[] | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedWorkingGroup, setSelectedWorkingGroup] = useState<string>('all');
  const chartConfig = useResponsiveChart(400);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedTransactionHash, setSelectedTransactionHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [reports, budgets, spending, transactions, detailed] = await Promise.all([
          dataService.getDiscourseReportsSummary().catch(() => null),
          dataService.getDiscourseBudgetReports().catch(() => null),
          dataService.getSpendingSummary().catch(() => null),
          dataService.getTransactionsByApprover().catch(() => null),
          dataService.getTransactionsByApproverDetailed().catch(() => null),
        ]);
        setReportsSummary(reports);
        setBudgetReports(budgets);
        setSpendingData(spending);
        setProposalTransactions(transactions);
        setDetailedTransactions(detailed);
      } catch (error) {
        console.error('Error loading budget data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getAvailableYears = () => {
    if (!spendingData) return [];
    const years = new Set<string>();
    Object.keys(spendingData.by_year_quarter).forEach(quarter => {
      years.add(quarter.split('-')[0]);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  };

  const getBudgetVsActualData = () => {
    if (!proposalTransactions || !spendingData) return [];

    const data: Array<{
      quarter: string;
      workingGroup: string;
      budget: number;
      actual: number;
      variance: number;
      variancePercent: number;
    }> = [];

    const workingGroups = ['Ecosystem', 'Public Goods', 'Meta-Governance'];
    const quarters = new Set<string>();

    proposalTransactions.forEach(tx => {
      quarters.add(tx.Quarter);
    });

    workingGroups.forEach(wg => {
      Array.from(quarters).forEach(quarter => {
        const wgTransactions = proposalTransactions!.filter(
          tx => tx['Working Group'] === wg && tx.Quarter === quarter
        );
        
        const actual = wgTransactions.reduce((sum, tx) => sum + tx['Total USD'], 0);
        
        // Extract budget from Discourse reports by matching quarter and working group
        let budget = 0;
        if (budgetReports?.reports) {
          const quarterYear = quarter.split('-')[0];
          const quarterNum = quarter.split('-')[1]?.replace('Q', '');
          const wgName = wg === 'Public Goods' ? 'Public Goods' : wg;
          
          // Search for matching budget reports
          const matchingReports = budgetReports.reports.filter((report: any) => {
            const title = (report.title || '').toLowerCase();
            const summary = (report.summary || '').toLowerCase();
            const matchesWG = title.includes(wgName.toLowerCase()) || summary.includes(wgName.toLowerCase());
            const matchesQuarter = title.includes(quarter.toLowerCase()) || summary.includes(quarter.toLowerCase()) || 
                                  title.includes(`${quarterYear}-Q${quarterNum}`) || summary.includes(`${quarterYear}-Q${quarterNum}`);
            return matchesWG && matchesQuarter;
          });
          
          // Extract budget amounts using improved parser
          matchingReports.forEach((report: any) => {
            const text = report.summary || report.title || '';
            const parsed = parseProposalData(text);
            
            // Use extracted amounts (prefer USDC/USD)
            parsed.amounts.forEach((amt: any) => {
              if (amt.currency === 'USDC' || amt.currency === 'USD') {
                budget += amt.value;
              }
            });
            
            // Also check budget items for line-item totals
            parsed.budgetItems.forEach((item: any) => {
              if (item.currency === 'USDC' || item.currency === 'USD') {
                budget += item.amount;
              }
            });
          });
        }
        
        // Fallback: if no budget found, use a conservative estimate based on actual
        if (budget === 0 && actual > 0) {
          budget = actual * 0.9; // Assume 90% of actual was budgeted
        }
        
        const variance = actual - budget;
        const variancePercent = budget > 0 ? (variance / budget) * 100 : 0;

        data.push({
          quarter,
          workingGroup: wg,
          budget,
          actual,
          variance,
          variancePercent,
        });
      });
    });

    return data.sort((a, b) => a.quarter.localeCompare(b.quarter));
  };

  const getFilteredData = () => {
    let data = getBudgetVsActualData();
    
    if (selectedYear !== 'all') {
      data = data.filter(d => d.quarter.startsWith(selectedYear));
    }
    
    if (selectedWorkingGroup !== 'all') {
      data = data.filter(d => d.workingGroup === selectedWorkingGroup);
    }
    
    return data;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const getVarianceColor = (percent: number) => {
    if (Math.abs(percent) < 5) return 'text-slate-600';
    if (percent > 0) return 'text-red-600';
    return 'text-green-600';
  };

  const getBudgetItemsByGroup = (): BudgetItemGroup[] => {
    if (!detailedTransactions || !proposalTransactions) return [];

    const grouped = new Map<string, BudgetItemGroup>();

    detailedTransactions.forEach(tx => {
      const key = `${tx['Approver EP']}-${tx.Quarter}-${tx['Working Group']}`;
      
      if (!grouped.has(key)) {
        const proposalTx = proposalTransactions.find(
          p => p['Approver EP'] === tx['Approver EP'] && 
               p.Quarter === tx.Quarter && 
               p['Working Group'] === tx['Working Group']
        );
        
        grouped.set(key, {
          ep: tx['Approver EP'],
          title: tx['Approver Title'],
          url: proposalTx?.['Approver URL'] || '',
          quarter: tx.Quarter,
          workingGroup: tx['Working Group'],
          term: tx.Term,
          totalUSD: 0,
          totalETH: 0,
          totalUSDC: 0,
          transactionCount: 0,
          transactions: [],
        });
      }

      const group = grouped.get(key)!;
      group.transactions.push(tx);
      group.totalUSD += tx['Value USD'];
      group.totalETH += tx['Value ETH'];
      if (tx['Token Type'] === 'USDC') {
        group.totalUSDC += tx['Token Amount'];
      }
      group.transactionCount += 1;
    });

    return Array.from(grouped.values()).sort((a, b) => {
      if (a.quarter !== b.quarter) return a.quarter.localeCompare(b.quarter);
      if (a.workingGroup !== b.workingGroup) return a.workingGroup.localeCompare(b.workingGroup);
      return a.ep.localeCompare(b.ep);
    });
  };

  const getFilteredBudgetItems = () => {
    let items = getBudgetItemsByGroup();
    
    if (selectedYear !== 'all') {
      items = items.filter(item => item.quarter.startsWith(selectedYear));
    }
    
    if (selectedWorkingGroup !== 'all') {
      items = items.filter(item => item.workingGroup === selectedWorkingGroup);
    }
    
    return items;
  };

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const chartData = getFilteredData().reduce((acc, item) => {
    const key = `${item.quarter}-${item.workingGroup}`;
    if (!acc[key]) {
      acc[key] = {
        quarter: item.quarter,
        workingGroup: item.workingGroup,
        budget: 0,
        actual: 0,
      };
    }
    acc[key].budget += item.budget;
    acc[key].actual += item.actual;
    return acc;
  }, {} as Record<string, { quarter: string; workingGroup: string; budget: number; actual: number }>);

  const chartDataArray = Object.values(chartData).map(item => ({
    ...item,
    budget: item.budget / 1000000,
    actual: item.actual / 1000000,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Analysis"
        description="Budget vs actual spending analysis by working group and period"
        breadcrumbs={[{ label: 'Budget' }]}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Budget vs Actual Analysis
          </CardTitle>
          <CardDescription>
            Compare approved budgets from Discourse reports with actual spending by working group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {getAvailableYears().map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedWorkingGroup} onValueChange={setSelectedWorkingGroup}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Working Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Working Groups</SelectItem>
                <SelectItem value="Ecosystem">Ecosystem</SelectItem>
                <SelectItem value="Public Goods">Public Goods</SelectItem>
                <SelectItem value="Meta-Governance">Meta-Governance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {chartDataArray.length > 0 ? (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Budget vs Actual Comparison</h3>
                <ResponsiveChartContainer defaultHeight={400} enableTouchGestures enablePinchZoom>
                  <ComposedChart data={chartDataArray} margin={chartConfig.margin}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="quarter" 
                      angle={chartConfig.xAxisAngle}
                      textAnchor="end"
                      height={chartConfig.xAxisHeight}
                      tick={{ fontSize: chartConfig.tickFontSize }}
                    />
                    <YAxis 
                      label={{ value: 'Amount (M USD)', angle: -90, position: 'insideLeft' }}
                      tick={{ fontSize: chartConfig.tickFontSize }}
                    />
                    <Tooltip 
                      formatter={(value: number) => `$${value.toFixed(2)}M`}
                      contentStyle={{ fontSize: chartConfig.fontSize }}
                    />
                    {chartConfig.showLegend && <Legend wrapperStyle={{ fontSize: chartConfig.legendFontSize }} />}
                    <Bar dataKey="budget" fill="#8b5cf6" name="Budget" />
                    <Bar dataKey="actual" fill="#10b981" name="Actual" />
                    <Line 
                      type="monotone" 
                      dataKey="budget" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveChartContainer>
              </div>

              {getFilteredBudgetItems().length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Budget Items by Quarter and Group</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Budget Item (EP)</TableHead>
                          <TableHead>Quarter</TableHead>
                          <TableHead>Working Group</TableHead>
                          <TableHead>Term</TableHead>
                          <TableHead>Transactions</TableHead>
                          <TableHead>Total USD</TableHead>
                          <TableHead>Total ETH</TableHead>
                          <TableHead>Total USDC</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredBudgetItems().map((item) => {
                        const rowKey = `${item.ep}-${item.quarter}-${item.workingGroup}`;
                        const isExpanded = expandedRows.has(rowKey);
                        
                        return (
                          <>
                            <TableRow 
                              key={rowKey}
                              className="cursor-pointer hover:bg-slate-50"
                              onClick={() => toggleRow(rowKey)}
                            >
                              <TableCell>
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline">{item.ep}</Badge>
                                  <a 
                                    href={item.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {item.title.length > 60 ? `${item.title.slice(0, 60)}...` : item.title}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.quarter}</Badge>
                              </TableCell>
                              <TableCell>{item.workingGroup}</TableCell>
                              <TableCell>{item.term || '-'}</TableCell>
                              <TableCell>{item.transactionCount}</TableCell>
                              <TableCell>{formatCurrency(item.totalUSD)}</TableCell>
                              <TableCell>{item.totalETH.toFixed(4)}</TableCell>
                              <TableCell>{formatCurrency(item.totalUSDC)}</TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow key={`${rowKey}-expanded`}>
                                <TableCell colSpan={9} className="bg-slate-50 p-4">
                                  <div className="space-y-4">
                                    <h4 className="font-semibold text-sm mb-2">Individual Transactions ({item.transactions.length})</h4>
                                    <div className="border rounded-lg overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>From</TableHead>
                                            <TableHead>To</TableHead>
                                            <TableHead>Token</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>USD Value</TableHead>
                                            <TableHead>Wallet</TableHead>
                                            <TableHead>Hash</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {item.transactions
                                            .sort((a, b) => new Date(b['Transaction Date']).getTime() - new Date(a['Transaction Date']).getTime())
                                            .map((tx, txIdx) => (
                                            <TableRow key={`${rowKey}-tx-${txIdx}`}>
                                              <TableCell className="text-sm">{tx['Transaction Date']}</TableCell>
                                              <TableCell className="text-sm">
                                                <div className="flex items-center gap-2 min-w-0 whitespace-nowrap">
                                                  {tx['From Label'] && (
                                                    <span
                                                      className="truncate text-slate-900"
                                                      title={tx['From Label']}
                                                    >
                                                      {tx['From Label']}
                                                    </span>
                                                  )}
                                                  <a 
                                                    href={`https://etherscan.io/address/${tx['From Address']}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 text-xs font-mono flex-shrink-0"
                                                  >
                                                    {formatAddress(tx['From Address'])}
                                                  </a>
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-sm">
                                                <div className="flex items-center gap-2 min-w-0 whitespace-nowrap">
                                                  {tx['To Label'] && (
                                                    <span
                                                      className="truncate text-slate-900"
                                                      title={tx['To Label']}
                                                    >
                                                      {tx['To Label']}
                                                    </span>
                                                  )}
                                                  <a 
                                                    href={`https://etherscan.io/address/${tx['To Address']}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 text-xs font-mono flex-shrink-0"
                                                  >
                                                    {formatAddress(tx['To Address'])}
                                                  </a>
                                                </div>
                                              </TableCell>
                                              <TableCell>
                                                <Badge variant="outline">{tx['Token Type']}</Badge>
                                              </TableCell>
                                              <TableCell className="text-sm">
                                                {tx['Token Amount'].toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                              </TableCell>
                                              <TableCell className="text-sm font-semibold">
                                                {formatCurrency(tx['Value USD'])}
                                              </TableCell>
                                              <TableCell className="text-sm">
                                                {tx['Wallet Label'] || formatAddress(tx['Wallet Address'])}
                                              </TableCell>
                                              <TableCell className="text-sm font-mono">
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    onClick={() => setSelectedTransactionHash(tx['Transaction Hash'])}
                                                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                  >
                                                    {formatAddress(tx['Transaction Hash'])}
                                                    <Search className="w-3 h-3" />
                                                  </button>
                                                  <a 
                                                    href={`https://etherscan.io/tx/${tx['Transaction Hash']}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    <ExternalLink className="w-3 h-3" />
                                                  </a>
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quarter</TableHead>
                      <TableHead>Working Group</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Variance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredData().map((item, idx) => (
                      <TableRow key={`${item.quarter}-${item.workingGroup}-${idx}`}>
                        <TableCell>
                          <Badge variant="outline">{item.quarter}</Badge>
                        </TableCell>
                        <TableCell>{item.workingGroup}</TableCell>
                        <TableCell>{formatCurrency(item.budget)}</TableCell>
                        <TableCell>{formatCurrency(item.actual)}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${getVarianceColor(item.variancePercent)}`}>
                            {item.variance > 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {formatCurrency(Math.abs(item.variance))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={getVarianceColor(item.variancePercent)}>
                            {item.variancePercent > 0 ? '+' : ''}{item.variancePercent.toFixed(2)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedTransactionHash && (
                <div className="mt-6">
                  <TransactionFlowDetail
                    transactionHash={selectedTransactionHash}
                    onClose={() => setSelectedTransactionHash(null)}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
              <p className="text-slate-600 mb-2">No budget data available</p>
              <p className="text-sm text-slate-500">
                Budget data will be available once Discourse reports are fully integrated
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

