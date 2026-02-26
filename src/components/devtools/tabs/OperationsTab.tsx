import React, { useState, useCallback } from 'react';
import { ScrollArea } from '../../ui/scroll-area';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Search, Download, Trash2, FileText, RefreshCw, Globe, Bookmark, BookmarkCheck, Settings as SettingsIcon, CheckCircle2, Play } from 'lucide-react';
import { formatAddress } from '../../../lib/ens/ens-utils';
import type { ENSOperation } from '../types';

interface OperationsTabProps {
  filteredOperations: ENSOperation[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  domainFilter: string;
  setDomainFilter: (filter: string) => void;
  autoRefresh: boolean;
  setAutoRefresh: (refresh: boolean) => void;
  onExportOperations: () => void;
  onExportToCSV: () => void;
  onClearOperations: () => void;
  onReplayOperation: (op: ENSOperation) => void;
  publicClient: any;
}

export function OperationsTab({
  filteredOperations,
  searchQuery,
  setSearchQuery,
  domainFilter,
  setDomainFilter,
  autoRefresh,
  setAutoRefresh,
  onExportOperations,
  onExportToCSV,
  onClearOperations,
  onReplayOperation,
  publicClient,
}: OperationsTabProps) {
  const [selectedOperation, setSelectedOperation] = useState<ENSOperation | null>(null);
  const [bookmarkedOperations, setBookmarkedOperations] = useState<Set<string>>(new Set());
  const [operationComparison, setOperationComparison] = useState<string[]>([]);

  const toggleBookmark = useCallback((opId: string) => {
    setBookmarkedOperations(prev => {
      const next = new Set(prev);
      if (next.has(opId)) {
        next.delete(opId);
      } else {
        next.add(opId);
      }
      return next;
    });
  }, []);

  const toggleComparison = useCallback((opId: string) => {
    setOperationComparison(prev => {
      if (prev.includes(opId)) {
        return prev.filter(id => id !== opId);
      } else if (prev.length < 2) {
        return [...prev, opId];
      } else {
        return [prev[1], opId];
      }
    });
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 bg-slate-700 border-b border-slate-500 flex items-center gap-2 px-3 flex-shrink-0" style={{ backgroundColor: '#334155' }}>
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
          <Input
            placeholder="Search operations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs bg-slate-900 border-slate-600 text-slate-200 placeholder:text-slate-400 flex-1"
          />
        </div>
        <Input
          placeholder="Filter by domain..."
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="h-7 w-32 text-xs bg-slate-900 border-slate-600 text-slate-200 placeholder:text-slate-400"
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-slate-300 hover:text-slate-100 ${autoRefresh ? 'bg-blue-950/30 text-blue-400' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Auto-refresh"
          >
            <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-white hover:text-slate-100"
            onClick={onExportOperations}
            title="Export operations (JSON)"
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-white hover:text-slate-100"
            onClick={onExportToCSV}
            title="Export operations (CSV)"
          >
            <FileText className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-white hover:text-slate-100"
            onClick={onClearOperations}
            title="Clear operations"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="font-mono text-xs">
          <div className="grid grid-cols-12 gap-2 px-2 py-1.5 bg-[#252526] border-b border-slate-700 text-slate-400 text-[10px] font-semibold">
            <div className="col-span-1.5">Time</div>
            <div className="col-span-1.5">Type</div>
            <div className="col-span-2.5">Operation</div>
            <div className="col-span-3">Domain/Address</div>
            <div className="col-span-1.5">Duration</div>
            <div className="col-span-2">Status</div>
          </div>
          {filteredOperations.length === 0 ? (
            <div className="text-slate-500 text-center py-8">No operations</div>
          ) : (
            filteredOperations.map((op) => (
              <div key={op.id}>
                <div
                  className={`
                    grid grid-cols-12 gap-2 px-2 py-1.5 border-b border-slate-800/50 cursor-pointer
                    hover:bg-slate-800/50 transition-colors
                    ${selectedOperation?.id === op.id ? 'bg-slate-800/70' : ''}
                  `}
                  onClick={() => setSelectedOperation(selectedOperation?.id === op.id ? null : op)}
                >
                  <div className="col-span-1.5 text-slate-500 text-[10px]">
                    {op.timestamp.toLocaleTimeString()}
                  </div>
                  <div className="col-span-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      op.type === 'resolve' ? 'bg-blue-950/30 text-blue-400' :
                      op.type === 'query' ? 'bg-purple-950/30 text-purple-400' :
                      op.type === 'transaction' ? 'bg-green-950/30 text-green-400' :
                      'bg-slate-800/30 text-slate-400'
                    }`}>
                      {op.type}
                    </span>
                  </div>
                  <div className="col-span-2.5 text-slate-300 font-semibold truncate">
                    {op.operation}
                  </div>
                  <div className="col-span-3 text-slate-400 truncate">
                    {op.domain ? (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{op.domain}</span>
                      </span>
                    ) : op.address ? (
                      <span className="font-mono text-[10px] truncate">
                        {formatAddress(op.address)}
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </div>
                  <div className="col-span-1.5 text-slate-500 text-[10px]">
                    {op.duration !== undefined ? `${op.duration}ms` : '-'}
                  </div>
                  <div className="col-span-2">
                    {op.error ? (
                      <span className="text-red-400 text-[10px]">Error</span>
                    ) : op.result ? (
                      <span className="text-green-400 text-[10px]">Success</span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Pending</span>
                    )}
                  </div>
                </div>
                {selectedOperation?.id === op.id && (
                  <div className="col-span-12 p-3 bg-[#252526] border-b border-slate-800/50">
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">Operation ID:</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => toggleBookmark(op.id)}
                            title="Bookmark operation"
                          >
                            {bookmarkedOperations.has(op.id) ? (
                              <BookmarkCheck className="h-3 w-3 text-yellow-400" />
                            ) : (
                              <Bookmark className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => toggleComparison(op.id)}
                            title="Compare operations"
                          >
                            {operationComparison.includes(op.id) ? (
                              <CheckCircle2 className="h-3 w-3 text-blue-400" />
                            ) : (
                              <SettingsIcon className="h-3 w-3" />
                            )}
                          </Button>
                          {['getEnsAddress', 'getEnsResolver', 'getEnsName', 'inspectDomain'].includes(op.operation) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => onReplayOperation(op)}
                              title="Replay operation"
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {op.duration !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Duration:</span>
                          <span className="text-slate-300">{op.duration}ms</span>
                        </div>
                      )}
                      {op.error && (
                        <div>
                          <span className="text-slate-400">Error:</span>
                          <div className="text-red-400 mt-1 font-mono text-[10px] break-all">{op.error}</div>
                        </div>
                      )}
                      {op.result && (
                        <div>
                          <span className="text-slate-400">Result:</span>
                          <pre className="text-slate-300 mt-1 text-[10px] overflow-auto max-h-32 bg-[#1e1e1e] p-2 rounded">
                            {JSON.stringify(op.result, null, 2)}
                          </pre>
                        </div>
                      )}
                      {op.details && Object.keys(op.details).length > 0 && (
                        <div>
                          <span className="text-slate-400">Details:</span>
                          <pre className="text-slate-300 mt-1 text-[10px] overflow-auto max-h-32 bg-[#1e1e1e] p-2 rounded">
                            {JSON.stringify(op.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}


















