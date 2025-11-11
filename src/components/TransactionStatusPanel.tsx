import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useTransactionManager } from '../lib/hooks/useTransactionManager';
import { Transaction, TransactionStatus } from '../lib/services/transaction-manager';
import { CheckCircle2, XCircle, Clock, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function TransactionStatusPanel() {
  const txManager = useTransactionManager();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateTransactions = () => {
      setTransactions(txManager.getAllTransactions());
    };

    updateTransactions();
    const interval = setInterval(updateTransactions, 2000);
    return () => clearInterval(interval);
  }, [txManager]);

  const pendingTransactions = transactions.filter(
    (tx) => tx.status === 'pending' || tx.status === 'submitted'
  );
  const hasPending = pendingTransactions.length > 0;

  if (transactions.length === 0 && !hasPending) {
    return null;
  }

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'submitted':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const variants: Record<TransactionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      confirmed: 'default',
      failed: 'destructive',
      submitted: 'secondary',
      pending: 'outline',
      replaced: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const openEtherscan = (hash: string) => {
    if (!hash) return;
    const chainId = 1; // Mainnet - could be dynamic
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io',
      11155111: 'https://sepolia.etherscan.io',
      8453: 'https://basescan.org',
      42161: 'https://arbiscan.io',
      10: 'https://optimistic.etherscan.io',
      137: 'https://polygonscan.com',
    };
    const explorerUrl = explorers[chainId] || 'https://etherscan.io';
    window.open(`${explorerUrl}/tx/${hash}`, '_blank');
  };

  const handleRetry = async (tx: Transaction) => {
    if (tx.status === 'failed') {
      await txManager.retryTransaction(tx.id);
    }
  };

  const handleClear = () => {
    txManager.clearCompleted();
    setTransactions(txManager.getAllTransactions());
  };

  return (
    <Card className="fixed bottom-24 right-4 w-96 max-w-[calc(100vw-2rem)] max-h-[600px] z-50 shadow-lg animate-in slide-in-from-bottom-2 duration-300 md:w-96">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Transaction Status</CardTitle>
            <CardDescription className="text-xs">
              {pendingTransactions.length > 0
                ? `${pendingTransactions.length} pending`
                : `${transactions.length} total`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {hasPending && (
              <Badge variant="secondary" className="animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {transactions
            .sort((a, b) => {
              const aTime = a.submittedAt?.getTime() || 0;
              const bTime = b.submittedAt?.getTime() || 0;
              return bTime - aTime;
            })
            .slice(0, isExpanded ? transactions.length : 5)
            .map((tx) => (
              <div
                key={tx.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-all duration-200"
              >
                <div className="mt-0.5">{getStatusIcon(tx.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    {getStatusBadge(tx.status)}
                  </div>
                  {tx.hash && (
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs text-slate-600 font-mono">
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => openEtherscan(tx.hash!)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {tx.submittedAt && (
                    <p className="text-xs text-slate-500">
                      {formatDistanceToNow(tx.submittedAt, { addSuffix: true })}
                    </p>
                  )}
                  {tx.error && (
                    <p className="text-xs text-red-600 mt-1">{tx.error}</p>
                  )}
                  {tx.status === 'failed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={() => handleRetry(tx)}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </div>
        {transactions.length > 5 && !isExpanded && (
          <p className="text-xs text-slate-500 mt-2 text-center">
            +{transactions.length - 5} more transactions
          </p>
        )}
        {transactions.some((tx) => tx.status === 'confirmed' || tx.status === 'failed') && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3"
            onClick={handleClear}
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Clear Completed
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

