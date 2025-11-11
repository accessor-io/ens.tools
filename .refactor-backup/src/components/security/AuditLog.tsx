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
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Code,
  Layers,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { auditLogService, AuditEntry } from '../../lib/security';
import { toast } from 'sonner';

export function AuditLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedBatchActions, setExpandedBatchActions] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [selectedBatchAction, setSelectedBatchAction] = useState<string | null>(null);
  const [showCallData, setShowCallData] = useState(false);
  const [showDecodedState, setShowDecodedState] = useState(false);
  const [includeCallData, setIncludeCallData] = useState(false);

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

  const toggleRowExpansion = (entryId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedRows(newExpanded);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatCallData = (callData: string | undefined) => {
    if (!callData) return 'N/A';
    if (callData.length > 100) {
      return `${callData.slice(0, 50)}...${callData.slice(-50)}`;
    }
    return callData;
  };

  const toggleBatchAction = (entryId: string, actionIndex: number) => {
    const key = `${entryId}-${actionIndex}`;
    const newExpanded = new Set(expandedBatchActions);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedBatchActions(newExpanded);
  };

  const highlightCallDataForAction = (
    batchCallData: string,
    actionCallData: string,
    startPos: number,
    endPos: number
  ) => {
    const fullHex = batchCallData.startsWith('0x') ? batchCallData.slice(2) : batchCallData;
    const actionHex = actionCallData.startsWith('0x') ? actionCallData.slice(2) : actionCallData;
    
    // Find the action in the batch
    const searchStart = fullHex.indexOf(actionHex);
    if (searchStart === -1) {
      // Fallback: use provided positions
      const before = fullHex.slice(0, startPos * 2);
      const highlighted = fullHex.slice(startPos * 2, endPos * 2);
      const after = fullHex.slice(endPos * 2);
      return { before, highlighted, after };
    }
    
    const before = fullHex.slice(0, searchStart);
    const highlighted = fullHex.slice(searchStart, searchStart + actionHex.length);
    const after = fullHex.slice(searchStart + actionHex.length);
    
    return { before, highlighted, after };
  };

  const isBatchTransaction = (entry: AuditEntry): boolean => {
    return entry.action === 'batch_action_tx' || 
           (entry.transaction && 'batchActions' in entry.transaction && entry.transaction.batchActions !== undefined);
  };

  const formatStateChange = (stateChange: any) => {
    return JSON.stringify(stateChange, null, 2);
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
          <div className="flex gap-4 items-center">
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
            <Button
              variant={includeCallData ? "default" : "outline"}
              onClick={() => setIncludeCallData(!includeCallData)}
              className="flex items-center gap-2"
            >
              {includeCallData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {includeCallData ? 'Hide' : 'Show'} Call Data
            </Button>
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
                {filteredEntries.map((entry) => {
                  const isExpanded = expandedRows.has(entry.id);
                  const hasTransaction = !!entry.transaction;
                  const hasCallData = !!entry.transaction?.callData;
                  const hasStateChanges = !!entry.stateChanges && entry.stateChanges.length > 0;
                  
                  return (
                    <>
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
                              {entry.transaction?.txStatus === 'pending' ? 'Pending' : 'Info'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-slate-600 text-sm">{entry.details}</span>
                            {entry.txHash && (
                              <Button variant="ghost" size="sm" onClick={() => {
                                window.open(`https://etherscan.io/tx/${entry.txHash}`, '_blank');
                              }}>
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Tx
                              </Button>
                            )}
                            {hasTransaction && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRowExpansion(entry.id)}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasTransaction && (
                        <TableRow key={`${entry.id}-expanded`}>
                          <TableCell colSpan={6} className="bg-slate-50">
                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                {entry.transaction?.contractAddress && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Contract</p>
                                    <div className="flex items-center gap-2">
                                      <code className="text-sm">{entry.transaction.contractAddress}</code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(entry.transaction!.contractAddress!, 'Address')}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                {entry.transaction?.functionName && !isBatchTransaction(entry) && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Function</p>
                                    <code className="text-sm">{entry.transaction.functionName}</code>
                                  </div>
                                )}
                                {isBatchTransaction(entry) && 'totalActions' in entry.transaction && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Total Actions</p>
                                    <code className="text-sm">{entry.transaction.totalActions || 0}</code>
                                  </div>
                                )}
                                {entry.transaction?.gasUsed && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Gas Used</p>
                                    <code className="text-sm">{entry.transaction.gasUsed.toString()}</code>
                                  </div>
                                )}
                                {entry.transaction?.blockNumber && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Block</p>
                                    <code className="text-sm">{entry.transaction.blockNumber.toString()}</code>
                                  </div>
                                )}
                              </div>
                              
                              {/* Batch Actions Display */}
                              {isBatchTransaction(entry) && 'batchActions' in entry.transaction && entry.transaction.batchActions && (
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-semibold text-slate-700">Batch Actions ({entry.transaction.batchActions.length})</p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedEntry(entry);
                                        setShowCallData(true);
                                      }}
                                    >
                                      <Code className="h-3 w-3 mr-1" />
                                      View Full Call Data
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {entry.transaction.batchActions.map((batchAction, index) => {
                                      const actionKey = `${entry.id}-${index}`;
                                      const isActionExpanded = expandedBatchActions.has(actionKey);
                                      const callDataHighlight = highlightCallDataForAction(
                                        entry.transaction!.callData || '',
                                        batchAction.callData,
                                        batchAction.callDataStart,
                                        batchAction.callDataEnd
                                      );
                                      
                                      return (
                                        <div key={index} className="border border-slate-200 rounded-lg bg-white">
                                          <button
                                            onClick={() => toggleBatchAction(entry.id, index)}
                                            className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                          >
                                            <div className="flex items-center gap-3">
                                              <span className="text-xs font-mono text-slate-500">#{index + 1}</span>
                                              <div className="text-left">
                                                <p className="text-sm font-semibold text-slate-900">{batchAction.actionName}</p>
                                                <p className="text-xs text-slate-600">{batchAction.description}</p>
                                              </div>
                                            </div>
                                            {isActionExpanded ? (
                                              <ChevronUp className="h-4 w-4 text-slate-500" />
                                            ) : (
                                              <ChevronDown className="h-4 w-4 text-slate-500" />
                                            )}
                                          </button>
                                          
                                          {isActionExpanded && (
                                            <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50">
                                              <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                  <p className="text-slate-500 mb-1">Contract</p>
                                                  <code className="text-slate-900">{batchAction.contract}</code>
                                                </div>
                                                <div>
                                                  <p className="text-slate-500 mb-1">Function</p>
                                                  <code className="text-slate-900">{batchAction.functionName}</code>
                                                </div>
                                              </div>
                                              
                                              {entry.transaction?.callData && (
                                                <div>
                                                  <p className="text-xs text-slate-500 mb-2">Call Data (highlighted portion for this action)</p>
                                                  <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-xs overflow-x-auto border border-slate-700">
                                                    <code>
                                                      <span className="text-slate-400">{callDataHighlight.before}</span>
                                                      <span className="bg-yellow-500 text-yellow-900 font-bold px-1">{callDataHighlight.highlighted}</span>
                                                      <span className="text-slate-400">{callDataHighlight.after}</span>
                                                    </code>
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {batchAction.args && batchAction.args.length > 0 && (
                                                <div>
                                                  <p className="text-xs text-slate-500 mb-2">Arguments</p>
                                                  <div className="bg-slate-100 p-2 rounded font-mono text-xs overflow-x-auto">
                                                    <pre>{JSON.stringify(batchAction.args, null, 2)}</pre>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {/* Regular Call Data Display (for non-batch transactions) */}
                              {!isBatchTransaction(entry) && hasCallData && (includeCallData || isExpanded) && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-slate-500">Call Data</p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedEntry(entry);
                                        setShowCallData(true);
                                      }}
                                    >
                                      <Code className="h-3 w-3 mr-1" />
                                      View Full
                                    </Button>
                                  </div>
                                  <div className="bg-slate-100 text-slate-900 p-3 rounded font-mono text-xs overflow-x-auto border border-slate-200">
                                    <code>{formatCallData(entry.transaction!.callData)}</code>
                                  </div>
                                </div>
                              )}

                              {entry.transaction?.functionArgs && entry.transaction.functionArgs.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-2">Function Arguments</p>
                                  <div className="bg-slate-100 p-3 rounded font-mono text-xs overflow-x-auto">
                                    <pre>{JSON.stringify(entry.transaction.functionArgs, null, 2)}</pre>
                                  </div>
                                </div>
                              )}

                              {hasStateChanges && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-slate-500">State Changes ({entry.stateChanges!.length})</p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedEntry(entry);
                                        setShowDecodedState(true);
                                      }}
                                    >
                                      <Layers className="h-3 w-3 mr-1" />
                                      Decode & View
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {entry.stateChanges!.slice(0, 2).map((change, idx) => (
                                      <div key={idx} className="bg-blue-50 border border-blue-200 p-2 rounded text-xs">
                                        <p className="font-semibold text-blue-900">{change.event}</p>
                                        <p className="text-blue-700 font-mono">{change.contract}</p>
                                      </div>
                                    ))}
                                    {entry.stateChanges!.length > 2 && (
                                      <p className="text-xs text-slate-500">+ {entry.stateChanges!.length - 2} more changes</p>
                                    )}
                                  </div>
                                </div>
                              )}
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

          {filteredEntries.length === 0 && (
            <div className="text-center py-8 text-slate-600">
              No audit entries found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Data Dialog */}
      <Dialog open={showCallData} onOpenChange={setShowCallData}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Transaction Call Data</DialogTitle>
            <DialogDescription>
              Complete call data for transaction {selectedEntry?.txHash?.slice(0, 20)}...
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {selectedEntry?.transaction?.callData && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">Call Data (Hex)</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(selectedEntry.transaction!.callData!, 'Call data')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-slate-100 text-slate-900 p-4 rounded font-mono text-xs break-all border border-slate-200">
                    <code>{selectedEntry.transaction.callData}</code>
                  </div>
                </div>
              )}
              {selectedEntry?.transaction?.functionName && (
                <div>
                  <p className="text-sm font-semibold mb-2">Function</p>
                  <code className="bg-slate-100 p-2 rounded block">{selectedEntry.transaction.functionName}</code>
                </div>
              )}
              {selectedEntry?.transaction?.functionArgs && selectedEntry.transaction.functionArgs.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Arguments</p>
                  <div className="bg-slate-100 p-4 rounded font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(selectedEntry.transaction.functionArgs, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Decoded State Changes Dialog */}
      <Dialog open={showDecodedState} onOpenChange={setShowDecodedState}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Decoded State Changes</DialogTitle>
            <DialogDescription>
              Decoded events and state changes from transaction logs
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {selectedEntry?.stateChanges && selectedEntry.stateChanges.length > 0 ? (
                selectedEntry.stateChanges.map((change, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">{change.event}</p>
                        <p className="text-sm text-slate-500 font-mono">{change.contract}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(formatStateChange(change), 'State change')}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    {change.from && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">From</p>
                        <code className="text-xs bg-red-50 p-2 rounded block">
                          {typeof change.from === 'object' ? JSON.stringify(change.from, null, 2) : String(change.from)}
                        </code>
                      </div>
                    )}
                    {change.to && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">To</p>
                        <code className="text-xs bg-green-50 p-2 rounded block">
                          {typeof change.to === 'object' ? JSON.stringify(change.to, null, 2) : String(change.to)}
                        </code>
                      </div>
                    )}
                    {change.decoded && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Decoded Data</p>
                        <div className="bg-slate-50 p-3 rounded font-mono text-xs overflow-x-auto">
                          <pre>{formatStateChange(change.decoded)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : selectedEntry?.decodedLogs && selectedEntry.decodedLogs.length > 0 ? (
                selectedEntry.decodedLogs.map((log, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <p className="font-semibold mb-2">{log.eventName || 'Unknown Event'}</p>
                    <div className="bg-slate-50 p-3 rounded font-mono text-xs overflow-x-auto">
                      <pre>{formatStateChange(log)}</pre>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No decoded state changes available for this transaction.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
