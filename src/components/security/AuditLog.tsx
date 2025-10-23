import { useState, useEffect } from 'react';
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
import { auditLogService, AuditEntry } from '../../lib/security';

export function AuditLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    const unsubscribe = auditLogService.subscribe((entries) => {
      setAuditEntries(entries);
    });
    
    setAuditEntries(auditLogService.getEntries());
    
    return unsubscribe;
  }, []);

  const filteredEntries = auditEntries.filter(entry => {
    const matchesSearch = searchQuery === '' || 
      (entry.domain && entry.domain.toLowerCase().includes(searchQuery.toLowerCase())) ||
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.actor && entry.actor.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || entry.status === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const handleExport = () => {
    const csv = auditLogService.export('csv');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

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
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-700">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(entry.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-900">{entry.domain || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-700">{formatAction(entry.action)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-slate-600 font-mono">
                          {entry.actor ? `${entry.actor.slice(0, 6)}...${entry.actor.slice(-4)}` : 'N/A'}
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
                      {entry.status === 'info' && (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Info
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {entry.txHash && (
                          <Button variant="ghost" size="sm" onClick={() => {
                            window.open(`https://etherscan.io/tx/${entry.txHash}`, '_blank');
                          }}>
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Tx
                          </Button>
                        )}
                        <span className="text-slate-600 text-sm">{entry.details}</span>
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
