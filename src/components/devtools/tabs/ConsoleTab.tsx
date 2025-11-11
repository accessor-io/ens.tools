import React, { useRef, useEffect } from 'react';
import { ScrollArea } from '../../ui/scroll-area';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { ConsoleLogItem } from '../ConsoleLogItem';
import { Search, Copy, Download, Trash2, Regex, Save, Filter, Globe, Hash, Zap } from 'lucide-react';
import { formatAddress } from '../../../lib/ens/ens-utils';
import type { ConsoleLog, SavedFilter } from '../types';

interface ConsoleTabProps {
  filteredLogs: ConsoleLog[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  domainFilter: string;
  setDomainFilter: (filter: string) => void;
  useRegexSearch: boolean;
  setUseRegexSearch: (use: boolean) => void;
  savedFilters: SavedFilter[];
  onSaveFilter: () => void;
  onLoadFilter: (filter: SavedFilter) => void;
  onCopyAllLogs: () => void;
  onExportLogs: () => void;
  onClearConsole: () => void;
}

export function ConsoleTab({
  filteredLogs,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  domainFilter,
  setDomainFilter,
  useRegexSearch,
  setUseRegexSearch,
  savedFilters,
  onSaveFilter,
  onLoadFilter,
  onCopyAllLogs,
  onExportLogs,
  onClearConsole,
}: ConsoleTabProps) {
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs]);

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 bg-slate-700 border-b border-slate-500 flex items-center gap-2 px-3 flex-shrink-0" style={{ backgroundColor: '#334155' }}>
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white" />
            <Input
              placeholder="Search logs or domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 text-xs bg-slate-800 border-slate-500 text-white placeholder:text-slate-400"
            />
          </div>
          <Input
            placeholder="Filter by domain..."
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="h-7 w-32 text-xs bg-slate-900 border-slate-600 text-white placeholder:text-slate-400"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-7 text-xs bg-slate-800 border border-slate-500 text-white rounded px-2"
          >
            <option value="all">All</option>
            <option value="log">Log</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          {savedFilters.length > 0 && (
            <div className="flex items-center gap-1 mr-2 border-r border-slate-500 pr-2">
              <Filter className="h-3 w-3 text-white" />
              <select
                value=""
                onChange={(e) => {
                  const filter = savedFilters.find(f => f.name === e.target.value);
                  if (filter) onLoadFilter(filter);
                }}
                className="h-6 text-[10px] bg-slate-800 border border-slate-500 text-white rounded px-1"
              >
                <option value="">Saved filters...</option>
                {savedFilters.map((f, i) => (
                  <option key={i} value={f.name}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-white hover:text-slate-100"
            onClick={onSaveFilter}
            title="Save current filter"
            disabled={!searchQuery && !domainFilter && filterType === 'all'}
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-white hover:text-slate-100"
            onClick={onCopyAllLogs}
            title="Copy all logs"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-white hover:text-slate-100 ${useRegexSearch ? 'bg-blue-950/30 text-blue-400' : ''}`}
            onClick={() => setUseRegexSearch(!useRegexSearch)}
            title="Toggle regex search"
          >
            <Regex className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-white hover:text-slate-100"
            onClick={onExportLogs}
            title="Export logs"
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-white hover:text-slate-100"
            onClick={onClearConsole}
            title="Clear console"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 bg-slate-800">
        <div className="font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="text-white text-center py-8">No logs</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="border-l-2 border-slate-800/50 hover:bg-slate-800/30">
                <ConsoleLogItem
                  log={log}
                  onCopy={(text) => navigator.clipboard.writeText(text)}
                />
                {log.ensContext && (
                  <div className="ml-16 mb-1 flex items-center gap-2 text-[10px] text-white">
                    {log.ensContext.domain && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" />
                        {log.ensContext.domain}
                      </span>
                    )}
                    {log.ensContext.operation && (
                      <span className="flex items-center gap-1">
                        <Zap className="h-2.5 w-2.5" />
                        {log.ensContext.operation}
                      </span>
                    )}
                    {log.ensContext.address && (
                      <span className="flex items-center gap-1">
                        <Hash className="h-2.5 w-2.5" />
                        {formatAddress(log.ensContext.address)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={consoleEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
}







