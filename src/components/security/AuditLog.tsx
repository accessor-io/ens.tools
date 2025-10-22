import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { 
  Search, 
  Filter, 
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

interface AuditEntry {
  timestamp: string;
  domain: string;
  action: string;
  actor: string;
  txHash: string;
  status: 'success' | 'warning' | 'failed';
  details: string;
}

export function AuditLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const auditEntries: AuditEntry[] = [
    {
      timestamp: '2025-10-16 14:32:15',
      domain: 'app.company.eth',
      action: 'Text Record Updated',
      actor: '0x742d35Cc6634C0532925a3b844Bc9e7595f35a3',
      txHash: '0xabcd1234...',
      status: 'success',
      details: 'Updated "url" text record to https://app.company.com'
    },
    {
      timestamp: '2025-10-15 09:21:44',
      domain: 'dao.company.eth',
      action: 'Fuse Burned',
      actor: '0xdD870fA1b7C4700F2BD7f44238821C26f7392148',
      txHash: '0xef567890...',
      status: 'success',
      details: 'Burned CANNOT_TRANSFER fuse via DAO multisig'
    },
    {
      timestamp: '2025-10-14 16:45:22',
      domain: 'vault.company.eth',
      action: 'Resolver Changed',
      actor: '0x583031D1113aD414F02576BD6afaBfb302140225',
      txHash: '0x12345abc...',
      status: 'warning',
      details: 'Changed to custom resolver contract'
    },
    {
      timestamp: '2025-10-14 11:18:09',
      domain: 'app.company.eth',
      action: 'Address Record Updated',
      actor: '0x742d35Cc6634C0532925a3b844Bc9e7595f35a3',
      txHash: '0x67890def...',
      status: 'success',
      details: 'Updated ETH address to new proxy contract'
    },
    {
      timestamp: '2025-10-13 08:55:31',
      domain: 'dev.company.eth',
      action: 'Controller Transfer',
      actor: '0xdD870fA1b7C4700F2BD7f44238821C26f7392148',
      txHash: '0xfedcba98...',
      status: 'success',
      details: 'Controller delegated to operational wallet'
    },
    {
      timestamp: '2025-10-12 15:22:18',
      domain: 'staging.company.eth',
      action: 'Renewal Failed',
      actor: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
      txHash: '0x11223344...',
      status: 'failed',
      details: 'Insufficient funds for renewal transaction'
    },
    {
      timestamp: '2025-10-11 13:40:55',
      domain: 'dao.company.eth',
      action: 'Name Wrapped',
      actor: '0xdD870fA1b7C4700F2BD7f44238821C26f7392148',
      txHash: '0x55667788...',
      status: 'success',
      details: 'Converted to ERC-1155 via Name Wrapper'
    },
    {
      timestamp: '2025-10-10 10:15:42',
      domain: 'app.company.eth',
      action: 'Subdomain Created',
      actor: '0x742d35Cc6634C0532925a3b844Bc9e7595f35a3',
      txHash: '0x99aabbcc...',
      status: 'success',
      details: 'Created api.app.company.eth subdomain'
    }
  ];

  const filteredEntries = auditEntries.filter(entry => {
    const matchesSearch = searchQuery === '' || 
      entry.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.actor.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || entry.status === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const handleExport = () => {
    // In a real app, this would generate and download a CSV/JSON file
    alert('Exporting audit log...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">Audit Log</h2>
          <p className="text-slate-600">Complete transaction history and change tracking</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Log
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-2">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle>Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">{auditEntries.length}</div>
            <p className="text-slate-600">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle>Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-900 text-emerald-600">
              {auditEntries.filter(e => e.status === 'success').length}
            </div>
            <p className="text-slate-600">Completed actions</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle>Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-900 text-amber-600">
              {auditEntries.filter(e => e.status === 'warning').length}
            </div>
            <p className="text-slate-600">Flagged events</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle>Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-900 text-red-600">
              {auditEntries.filter(e => e.status === 'failed').length}
            </div>
            <p className="text-slate-600">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by domain, action, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="success">Success Only</SelectItem>
                <SelectItem value="warning">Warnings Only</SelectItem>
                <SelectItem value="failed">Failed Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Event History ({filteredEntries.length} events)</CardTitle>
          <CardDescription>Chronological log of all ENS operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-700">
                        <Clock className="h-3 w-3" />
                        {entry.timestamp}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-900">{entry.domain}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-700">{entry.action}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-slate-600 font-mono">
                          {entry.actor.slice(0, 6)}...{entry.actor.slice(-4)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.status === 'success' && (
                        <Badge variant="default" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Success
                        </Badge>
                      )}
                      {entry.status === 'warning' && (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Warning
                        </Badge>
                      )}
                      {entry.status === 'failed' && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Tx
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredEntries.length === 0 && (
            <div className="text-center py-8 text-slate-600">
              No audit entries found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
