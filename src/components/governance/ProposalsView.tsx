import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { ExternalLink, Search, Loader2, FileText, Calendar, Users, TrendingUp, ChevronLeft, ChevronRight, Download, RefreshCw, Wallet, DollarSign, CheckCircle2, Clock, AlertCircle, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { dataService, type ProposalsByYear, type ProposalByYear, type TransactionsByApprover } from '@/services/governance/dataService';
import { exportToCSV, exportToJSON } from '@/utils/governance/export';
import { discourseService } from '@/services/governance/discourseService';
import { parseProposalData, matchProposalToTransactions } from '@/utils/governance/proposalParser';

export function ProposalsView() {
  const [proposalsByYear, setProposalsByYear] = useState<ProposalsByYear | null>(null);
  const [proposalTransactions, setProposalTransactions] = useState<TransactionsByApprover[] | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalByYear | null>(null);
  const [proposalDetails, setProposalDetails] = useState<ReturnType<typeof parseProposalData> | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        dataService.clearCache('raw/proposals_by_year.json');
        dataService.clearCache('exports/transactions_by_approver.json');
      } else {
        setLoading(true);
      }
      
      const [proposals, transactions] = await Promise.all([
        dataService.getProposalsByYear().catch(() => null),
        dataService.getTransactionsByApprover().catch(() => null),
      ]);
      setProposalsByYear(proposals);
      setProposalTransactions(transactions);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getAvailableYears = () => {
    if (!proposalsByYear) return [];
    return Object.keys(proposalsByYear.organized_by_year).sort((a, b) => b.localeCompare(a));
  };

  const getFilteredProposals = () => {
    if (!proposalsByYear) return [];

    let proposals: ProposalByYear[] = [];
    const years = selectedYear === 'all' 
      ? Object.keys(proposalsByYear.organized_by_year)
      : [selectedYear];

    years.forEach(year => {
      const yearData = proposalsByYear.organized_by_year[year];
      if (!yearData) return;

      if (selectedType === 'all') {
        Object.values(yearData).forEach(typeArray => {
          if (Array.isArray(typeArray)) {
            proposals.push(...typeArray);
          }
        });
      } else if (yearData[selectedType]) {
        proposals.push(...yearData[selectedType]);
      }
    });

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      proposals = proposals.filter(p => 
        p.title.toLowerCase().includes(query) ||
        (p.ep_number && p.ep_number.toLowerCase().includes(query)) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(query))
      );
    }

    return proposals.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  };

  const filteredProposals = getFilteredProposals();
  const totalPages = Math.ceil(filteredProposals.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProposals = filteredProposals.slice(startIndex, endIndex);

  const getProposalSpending = (epNumber: string | null) => {
    if (!proposalTransactions || !epNumber) return null;
    return proposalTransactions.find(tx => tx['Approver EP'] === epNumber);
  };

  const loadProposalDetails = useCallback(async (proposal: ProposalByYear) => {
    setSelectedProposal(proposal);
    setLoadingDetails(true);
    try {
      // Extract topic ID from URL
      const urlMatch = proposal.url.match(/\/t\/[^\/]+\/(\d+)/);
      if (urlMatch) {
        const topicId = parseInt(urlMatch[1]);
        const topic = await discourseService.getTopic(topicId);
        
        // Parse proposal data from content
        const firstPost = topic.post_stream?.posts?.[0];
        if (firstPost) {
          const parsed = parseProposalData(firstPost.raw || firstPost.cooked, topic.title);
          setProposalDetails(parsed);
        }
      } else {
        // Fallback: parse from existing data
        const parsed = parseProposalData(proposal.excerpt || '', proposal.title);
        setProposalDetails(parsed);
      }
    } catch (error) {
      console.error('Error loading proposal details:', error);
      // Fallback parsing
      const parsed = parseProposalData(proposal.excerpt || '', proposal.title);
      setProposalDetails(parsed);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const getProposalStatus = (proposal: ProposalByYear) => {
    // Determine status based on tags, closed state, and dates
    if (proposal.closed) return { status: 'executed', label: 'Executed', icon: CheckCircle2, color: 'text-green-600' };
    if (proposal.archived) return { status: 'archived', label: 'Archived', icon: FileText, color: 'text-slate-500' };
    return { status: 'active', label: 'Active', icon: Clock, color: 'text-blue-600' };
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const handleExportCSV = useCallback(() => {
    const exportData = filteredProposals.map(p => {
      const spending = getProposalSpending(p.ep_number);
      return {
        Title: p.title,
        'EP Number': p.ep_number || '',
        'Created Date': new Date(p.created_at).toLocaleDateString(),
        URL: p.url,
        Views: p.views,
        'Reply Count': p.reply_count,
        'Like Count': p.like_count,
        Category: p.category,
        'Total USD': spending?.['Total USD'] || 0,
        'Transaction Count': spending?.['Transaction Count'] || 0,
        Excerpt: p.excerpt || '',
      };
    });
    exportToCSV(exportData, 'ens_dao_proposals');
  }, [filteredProposals]);

  const handleExportJSON = useCallback(() => {
    exportToJSON(filteredProposals, 'ens_dao_proposals');
  }, [filteredProposals]);

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
        title="Proposals"
        description="Governance proposals and their associated spending"
        breadcrumbs={[{ label: 'Proposals' }]}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Governance Proposals & Initiatives
          </CardTitle>
          <CardDescription>
            Browse and track ENS DAO governance proposals, initiatives, and their associated spending
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search proposals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="proposals">Proposals</SelectItem>
                <SelectItem value="initiatives">Initiatives</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing}
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredProposals.length === 0}
              title="Export to CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              disabled={filteredProposals.length === 0}
              title="Export to JSON"
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredProposals.length)} of {filteredProposals.length} proposal{filteredProposals.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => {
                setPageSize(Number(v));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>EP Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Spending</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProposals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      No proposals found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProposals.map((proposal) => {
                    const spending = getProposalSpending(proposal.ep_number);
                    return (
                      <TableRow key={proposal.id}>
                        <TableCell>
                          <div className="font-medium max-w-md">{proposal.title}</div>
                          {proposal.excerpt && (
                            <div className="text-sm text-slate-500 mt-1 line-clamp-1">
                              {proposal.excerpt}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {proposal.ep_number ? (
                            <Badge variant="outline">{proposal.ep_number}</Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            {new Date(proposal.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-slate-400" />
                              <span>{proposal.reply_count} replies</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4 text-slate-400" />
                              <span>{proposal.views} views</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {spending ? (
                            <div className="flex flex-col gap-1">
                              <div className="font-medium text-green-600">
                                {formatCurrency(spending['Total USD'])}
                              </div>
                              <div className="text-xs text-slate-500">
                                {spending['Transaction Count']} transactions
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">No spending data</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadProposalDetails(proposal)}
                              className="h-8"
                            >
                              <Info className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                            <a
                              href={proposal.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Forum <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {filteredProposals.length > pageSize && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proposal Details Dialog */}
      <Dialog open={selectedProposal !== null} onOpenChange={(open) => !open && setSelectedProposal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProposal?.title}
              {selectedProposal && (() => {
                const status = getProposalStatus(selectedProposal);
                const StatusIcon = status.icon;
                return (
                  <Badge variant="outline" className={status.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                );
              })()}
            </DialogTitle>
            <DialogDescription>
              {selectedProposal?.ep_number && (
                <span className="mr-2">EP {selectedProposal.ep_number}</span>
              )}
              {selectedProposal?.url && (
                <a
                  href={selectedProposal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  View on Discourse <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : proposalDetails ? (
            <div className="space-y-6 mt-4">
              {/* Parsed Data Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proposalDetails.epNumber && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">EP Number</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="default" className="text-lg">{proposalDetails.epNumber}</Badge>
                    </CardContent>
                  </Card>
                )}

                {proposalDetails.workingGroup && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Working Group</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className="text-lg">{proposalDetails.workingGroup}</Badge>
                    </CardContent>
                  </Card>
                )}

                {proposalDetails.amounts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Proposed Amounts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {proposalDetails.amounts.slice(0, 5).map((amt, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">{amt.currency}</span>
                            <span className="font-medium">
                              {amt.currency === 'ETH' 
                                ? `${amt.value.toLocaleString()} ETH`
                                : `$${amt.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                              }
                            </span>
                          </div>
                        ))}
                        {proposalDetails.amounts.length > 5 && (
                          <div className="text-xs text-slate-500 mt-2">
                            +{proposalDetails.amounts.length - 5} more amounts
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {proposalDetails.addresses.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Addresses Mentioned
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {proposalDetails.addresses.map((addr, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <code className="text-xs font-mono text-slate-600">
                              {addr.slice(0, 10)}...{addr.slice(38)}
                            </code>
                            <a
                              href={`https://etherscan.io/address/${addr}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Execution Information */}
              {(proposalDetails.executionDate || proposalDetails.executionTxHash) && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2 text-green-900">
                      <CheckCircle2 className="w-4 h-4" />
                      Execution Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {proposalDetails.executionDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-700" />
                        <span className="text-sm text-green-900">
                          Executed: {proposalDetails.executionDate.toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {proposalDetails.executionTxHash && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-900">Transaction:</span>
                        <a
                          href={`https://etherscan.io/tx/${proposalDetails.executionTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm font-mono"
                        >
                          {proposalDetails.executionTxHash.slice(0, 10)}...{proposalDetails.executionTxHash.slice(58)}
                          <ExternalLink className="w-3 h-3 inline ml-1" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Budget Items */}
              {proposalDetails.budgetItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Budget Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {proposalDetails.budgetItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-sm font-medium">{item.category}</span>
                          <span className="text-sm">
                            {item.currency === 'ETH' 
                              ? `${item.amount.toLocaleString()} ETH`
                              : `$${item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transaction Hashes */}
              {proposalDetails.transactionHashes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Transaction Hashes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {proposalDetails.transactionHashes.map((hash, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <code className="text-xs font-mono text-slate-600">
                            {hash.slice(0, 10)}...{hash.slice(58)}
                          </code>
                          <a
                            href={`https://etherscan.io/tx/${hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!proposalDetails.epNumber && 
               proposalDetails.addresses.length === 0 && 
               proposalDetails.amounts.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p>No structured data extracted from this proposal</p>
                  <p className="text-xs mt-1">The proposal may not contain parseable addresses, amounts, or EP numbers</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
              <p>Loading proposal details...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

