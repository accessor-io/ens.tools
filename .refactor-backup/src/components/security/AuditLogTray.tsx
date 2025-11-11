import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { 
  ChevronUp, 
  ChevronDown, 
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Download,
  Trash2
} from 'lucide-react';
import { auditLogService, AuditEntry } from '../../lib/security';
import { toast } from 'sonner';

export function AuditLogTray() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = auditLogService.subscribe((newEntries) => {
      setEntries(newEntries);
      
      if (!isExpanded && newEntries.length > entries.length) {
        setUnreadCount(newEntries.length - entries.length);
      }
    });

    setEntries(auditLogService.getRecentEntries(50));

    return unsubscribe;
  }, [isExpanded, entries.length]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setUnreadCount(0);
    }
  };

  const handleExport = () => {
    try {
      const csv = auditLogService.export('csv');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ens-audit-log-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Audit log exported');
    } catch (error) {
      toast.error('Failed to export audit log');
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the audit log?')) {
      auditLogService.clear();
      toast.success('Audit log cleared');
    }
  };

  const getStatusIcon = (status: AuditEntry['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-emerald-600" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-amber-600" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-600" />;
      default:
        return <Info className="h-3 w-3 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: AuditEntry['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Success</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Warning</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Info</Badge>;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const recentEntries = entries.slice(0, 10);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto">
        <Card className="border-t-2 border-x-2 border-b-0 rounded-t-lg rounded-b-none shadow-lg">
          <div className="bg-white px-4 py-2 flex items-center justify-between border-b">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggle}
                className="flex items-center gap-2"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
                <span className="font-medium">Audit Log</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <span className="text-sm text-slate-600">
                {entries.length} total entries
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                className="h-8"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="max-h-[400px] overflow-hidden">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {recentEntries.length === 0 ? (
                    <div className="text-center py-8 text-slate-600">
                      No audit entries yet
                    </div>
                  ) : (
                    recentEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="mt-0.5">
                          {getStatusIcon(entry.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-900">
                              {entry.action.replace(/_/g, ' ')}
                            </span>
                            {getStatusBadge(entry.status)}
                            <span className="text-xs text-slate-500 ml-auto">
                              {formatTimestamp(entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 line-clamp-2">
                            {entry.details}
                          </p>
                          {entry.domain && (
                            <p className="text-xs text-slate-500 mt-1">
                              Domain: {entry.domain}
                            </p>
                          )}
                          {entry.txHash && (
                            <p className="text-xs text-slate-500 font-mono">
                              TX: {entry.txHash.slice(0, 10)}...{entry.txHash.slice(-8)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

