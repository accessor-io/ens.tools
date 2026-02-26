
import { ScrollArea } from '../../ui/scroll-area';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Trash2 } from 'lucide-react';
import type { NetworkRequest } from '../types';

interface NetworkTabProps {
  networkRequests: NetworkRequest[];
  onClearNetwork: () => void;
}

export function NetworkTab({
  networkRequests,
  onClearNetwork,
}: NetworkTabProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="h-10 bg-[#252526] border-b border-slate-700 flex items-center gap-2 px-3 flex-shrink-0" style={{ backgroundColor: '#252526' }}>
        <div className="text-xs text-slate-400">Network Requests</div>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-white hover:text-slate-100"
          onClick={onClearNetwork}
          title="Clear network requests"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="font-mono text-xs">
          <div className="grid grid-cols-12 gap-2 px-2 py-1.5 bg-[#252526] border-b border-slate-700 text-slate-400 text-[10px] font-semibold">
            <div className="col-span-2">Time</div>
            <div className="col-span-1">Method</div>
            <div className="col-span-5">URL</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-1">ENS</div>
          </div>
          {networkRequests.length === 0 ? (
            <div className="text-slate-500 text-center py-8">No network requests</div>
          ) : (
            networkRequests.map((req) => (
              <div
                key={req.id}
                className="grid grid-cols-12 gap-2 px-2 py-1.5 border-b border-slate-800/50 hover:bg-slate-800/30"
              >
                <div className="col-span-2 text-slate-500 text-[10px]">
                  {req.timestamp.toLocaleTimeString()}
                </div>
                <div className="col-span-1">
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                    {req.method}
                  </Badge>
                </div>
                <div className="col-span-5 text-slate-300 truncate" title={req.url}>
                  {req.url}
                </div>
                <div className="col-span-1">
                  {req.status ? (
                    <span className={`text-[10px] ${
                      req.status >= 200 && req.status < 300 ? 'text-green-400' :
                      req.status >= 400 ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {req.status}
                    </span>
                  ) : req.error ? (
                    <span className="text-[10px] text-red-400">Error</span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Pending</span>
                  )}
                </div>
                <div className="col-span-2 text-slate-500 text-[10px]">
                  {req.duration ? `${req.duration}ms` : '-'}
                </div>
                <div className="col-span-1">
                  {req.isENSRelated && (
                    <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                      ENS
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}


















