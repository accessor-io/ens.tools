/**
 * Master Database View
 * Displays all account actions from the master database
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Database,
  TrendingUp,
  Calendar,
  User,
  FileText,
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { masterDatabase, MasterDatabaseEntry, QueryFilters, QueryOptions } from '../../lib/database/master-database';
import { AuditActionType } from '../../lib/security/audit-log-service';
import { useWeb3 } from '../../lib/services/web3-provider';
import { toast } from 'sonner';
import { formatEther } from 'viem';

export function MasterDatabaseView() {
  const { address } = useWeb3();
  const [entries, setEntries] = useState<MasterDatabaseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<MasterDatabaseEntry | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<AuditActionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'warning' | 'failed' | 'info'>('all');
  const [domainFilter, setDomainFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [chainIdFilter, setChainIdFilter] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Statistics
  const [stats, setStats] = useState<{
    total: number;
    byAction: Record<string, number>;
    byStatus: Record<string, number>;
    byDomain: Record<string, number>;
    recentActivity: number;
  } | null>(null);

  // Load entries
  const loadEntries = async () => {
    setLoading(true);
    try {
      await masterDatabase.init();

      const filters: QueryFilters = {};
      if (searchTerm) filters.searchTerm = searchTerm;
      if (accountFilter) filters.accountAddress = accountFilter;
      if (actionFilter !== 'all') filters.action = actionFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (domainFilter) filters.domain = domainFilter;
      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);
      if (chainIdFilter) filters.chainId = parseInt(chainIdFilter);

      const options: QueryOptions = {
        limit: pageSize,
        offset: currentPage * pageSize,
        sortBy: 'timestamp',
        sortDirection: 'desc',
      };

      const [fetchedEntries, count] = await Promise.all([
        masterDatabase.queryEntries(filters, options),
        masterDatabase.countEntries(filters),
      ]);

      setEntries(fetchedEntries);
      setTotalCount(count);
    } catch (error) {
      console.error('Error loading entries:', error);
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const statistics = await masterDatabase.getStatistics(accountFilter || undefined);
      setStats(statistics);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  useEffect(() => {
    loadEntries();
    loadStatistics();
  }, [currentPage, pageSize, searchTerm, accountFilter, actionFilter, statusFilter, domainFilter, dateFrom, dateTo, chainIdFilter]);

  // Sync current account filter with connected wallet
  useEffect(() => {
    if (address && !accountFilter) {
      setAccountFilter(address);
    }
  }, [address]);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const filters: QueryFilters = {};
      if (searchTerm) filters.searchTerm = searchTerm;
      if (accountFilter) filters.accountAddress = accountFilter;
      if (actionFilter !== 'all') filters.action = actionFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (domainFilter) filters.domain = domainFilter;
      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);
      if (chainIdFilter) filters.chainId = parseInt(chainIdFilter);

      const data = format === 'json'
        ? await masterDatabase.exportToJSON(filters)
        : await masterDatabase.exportToCSV(filters);

      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `master-database-${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${format.toUpperCase()} successfully`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('ID copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setAccountFilter('');
    setActionFilter('all');
    setStatusFilter('all');
    setDomainFilter('');
    setDateFrom('');
    setDateTo('');
    setChainIdFilter('');
    setCurrentPage(0);
  };

  const hasActiveFilters = searchTerm || accountFilter || actionFilter !== 'all' || statusFilter !== 'all' || domainFilter || dateFrom || dateTo || chainIdFilter;

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      success: { className: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'Success' },
      warning: { className: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Warning' },
      failed: { className: 'bg-red-100 text-red-800 border-red-300', label: 'Failed' },
      info: { className: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Info' },
    };

    const variant = variants[status] || variants.info;
    return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="h-8 w-8" />
          Master Database
        </h1>
        <p className="text-slate-600 mt-2">
          View all account actions and audit log entries across all accounts
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.total.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Recent Activity (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.recentActivity.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {Object.keys(stats.byAction).length}
              </div>
              <p className="text-xs text-slate-500 mt-1">Unique action types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Domains</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {Object.keys(stats.byDomain).length}
              </div>
              <p className="text-xs text-slate-500 mt-1">Unique domains</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={loadEntries}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Account Address</Label>
              <Input
                placeholder="0x..."
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={actionFilter} onValueChange={(value: any) => setActionFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="wallet_connected">Wallet Connected</SelectItem>
                  <SelectItem value="address_record_set">Address Record Set</SelectItem>
                  <SelectItem value="text_record_set">Text Record Set</SelectItem>
                  <SelectItem value="subdomain_created">Subdomain Created</SelectItem>
                  <SelectItem value="domain_transferred">Domain Transferred</SelectItem>
                  <SelectItem value="contract_registered">Contract Registered</SelectItem>
                  <SelectItem value="transaction_confirmed">Transaction Confirmed</SelectItem>
                  <SelectItem value="transaction_failed">Transaction Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                placeholder="example.eth"
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Chain ID</Label>
              <Input
                type="number"
                placeholder="1, 8453, etc."
                value={chainIdFilter}
                onChange={(e) => setChainIdFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Entries</CardTitle>
              <CardDescription>
                Showing {entries.length} of {totalCount.toLocaleString()} entries
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                <Download className="h-4 w-4 mr-1" />
                Export JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No entries found</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Tx Hash</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-xs">
                          {formatTimestamp(entry.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatAction(entry.action)}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {entry.domain || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.accountAddress ? (
                            <span className="text-slate-600">
                              {entry.accountAddress.slice(0, 6)}...{entry.accountAddress.slice(-4)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {entry.details}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.txHash ? (
                            <a
                              href={`https://etherscan.io/tx/${entry.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {entry.txHash.slice(0, 10)}...
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Label>Page Size:</Label>
                  <Select value={pageSize.toString()} onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setCurrentPage(0);
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600">
                    Page {currentPage + 1} of {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Entry Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Entry Details</DialogTitle>
            <DialogDescription>
              Full details for audit log entry
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-600">ID</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                        {selectedEntry.id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyId(selectedEntry.id)}
                      >
                        {copiedId === selectedEntry.id ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-600">Timestamp</Label>
                    <p className="text-sm mt-1">{formatTimestamp(selectedEntry.timestamp)}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Action</Label>
                    <p className="text-sm mt-1">{formatAction(selectedEntry.action)}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedEntry.status)}</div>
                  </div>
                  <div>
                    <Label className="text-slate-600">Domain</Label>
                    <p className="text-sm mt-1 font-mono">{selectedEntry.domain || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Actor</Label>
                    <p className="text-sm mt-1 font-mono">{selectedEntry.actor || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Account Address</Label>
                    <p className="text-sm mt-1 font-mono">{selectedEntry.accountAddress || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Chain ID</Label>
                    <p className="text-sm mt-1">{selectedEntry.chainId || '-'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-600">Details</Label>
                  <p className="text-sm mt-1 bg-slate-50 p-3 rounded">{selectedEntry.details}</p>
                </div>

                {selectedEntry.transaction && (
                  <div>
                    <Label className="text-slate-600">Transaction</Label>
                    <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-semibold">Tx Hash:</span>{' '}
                          {selectedEntry.transaction.txHash ? (
                            <a
                              href={`https://etherscan.io/tx/${selectedEntry.transaction.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-mono"
                            >
                              {selectedEntry.transaction.txHash}
                            </a>
                          ) : (
                            '-'
                          )}
                        </div>
                        <div>
                          <span className="font-semibold">Status:</span>{' '}
                          {selectedEntry.transaction.txStatus || '-'}
                        </div>
                        <div>
                          <span className="font-semibold">Contract:</span>{' '}
                          <span className="font-mono">{selectedEntry.transaction.contractAddress || '-'}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Function:</span>{' '}
                          {selectedEntry.transaction.functionName || '-'}
                        </div>
                        {selectedEntry.transaction.gasUsed && (
                          <div>
                            <span className="font-semibold">Gas Used:</span>{' '}
                            {selectedEntry.transaction.gasUsed.toString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 && (
                  <div>
                    <Label className="text-slate-600">Metadata</Label>
                    <pre className="text-xs bg-slate-50 p-3 rounded mt-1 overflow-auto">
                      {JSON.stringify(selectedEntry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


