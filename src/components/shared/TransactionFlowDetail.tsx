import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, ChevronDown, ChevronRight, ArrowRight, Copy, Check } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { alchemyService, type TransactionFlow, type AlchemyTransfer } from '@/services/governance/alchemyService';

interface TransactionFlowDetailProps {
  transactionHash: string;
  onClose?: () => void;
}

interface TxComment {
  id: string;
  author: string | null;
  text: string;
  createdAt: string;
}

export function TransactionFlowDetail({ transactionHash, onClose }: TransactionFlowDetailProps) {
  const [flow, setFlow] = useState<TransactionFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTransfers, setExpandedTransfers] = useState<Set<string>>(new Set());
  const [copiedHash, setCopiedHash] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [comments, setComments] = useState<TxComment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const loadFlow = async () => {
      try {
        setLoading(true);
        const flowData = await alchemyService.getTransactionFlow(transactionHash);
        setFlow(flowData);
      } catch (error) {
        console.error('Error loading transaction flow:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFlow();
  }, [transactionHash]);

  // Load any locally stored comments for this transaction
  useEffect(() => {
    try {
      const key = `ensdao_tx_comments:${transactionHash}`;
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as TxComment[];
        if (Array.isArray(parsed)) {
          setComments(parsed);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load transaction comments', error);
    }
  }, [transactionHash]);

  const persistComments = (next: TxComment[]) => {
    setComments(next);
    try {
      const key = `ensdao_tx_comments:${transactionHash}`;
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save transaction comments', error);
    }
  };

  const handleConnectWallet = async () => {
    setWalletError(null);
    const eth = (window as any).ethereum;
    if (!eth) {
      setWalletError('No Ethereum wallet found in this browser.');
      return;
    }
    setConnecting(true);
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      }
    } catch (error: any) {
      setWalletError(error?.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: TxComment = {
      id: `${Date.now()}`,
      author: account,
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
    };
    const next = [comment, ...comments];
    persistComments(next);
    setNewComment('');
  };

  const toggleTransfer = (uniqueId: string) => {
    setExpandedTransfers(prev => {
      const next = new Set(prev);
      if (next.has(uniqueId)) {
        next.delete(uniqueId);
      } else {
        next.add(uniqueId);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatValue = (value: number, asset: string) => {
    if (asset === 'ETH') {
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH`;
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-600">Loading transaction flow details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!flow) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-600">Transaction flow not found</p>
          {onClose && (
            <Button variant="outline" className="mt-4" onClick={onClose}>
              Close
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const timestamp = new Date(flow.timestamp).toLocaleString();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction Flow Details</CardTitle>
              <CardDescription>Detailed breakdown of transaction {formatAddress(transactionHash)}</CardDescription>
            </div>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Transaction Hash</div>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono">{formatAddress(transactionHash)}</code>
                  <button
                    onClick={() => copyToClipboard(transactionHash)}
                    className="p-1 hover:bg-slate-100 rounded"
                  >
                    {copiedHash ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <a
                    href={`https://etherscan.io/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Block Number</div>
                <div className="font-mono text-sm">{flow.blockNumber.toLocaleString()}</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Timestamp</div>
                <div className="text-sm">{timestamp}</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Total Value</div>
                <div className="font-semibold">{formatValue(flow.value, flow.asset)}</div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="text-sm text-slate-600 mb-1">From</div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">{formatAddress(flow.from)}</code>
                    <a
                      href={`https://etherscan.io/address/${flow.from}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <div className="flex-1">
                  <div className="text-sm text-slate-600 mb-1">To</div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">{formatAddress(flow.to)}</code>
                    <a
                      href={`https://etherscan.io/address/${flow.to}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {flow.details && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Transaction Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-slate-600 mb-1">Status</div>
                    <Badge variant={flow.details.status === 1 ? 'default' : 'destructive'}>
                      {flow.details.status === 1 ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-slate-600 mb-1">Gas Used</div>
                    <div className="font-mono">{parseInt(flow.details.gasUsed, 16).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-slate-600 mb-1">Gas Price</div>
                    <div className="font-mono">{parseInt(flow.details.gasPrice, 16).toLocaleString()} wei</div>
                  </div>
                  <div>
                    <div className="text-slate-600 mb-1">Nonce</div>
                    <div>{flow.details.nonce}</div>
                  </div>
                  <div>
                    <div className="text-slate-600 mb-1">Transaction Index</div>
                    <div>{flow.details.transactionIndex}</div>
                  </div>
                  {flow.details.logs && (
                    <div>
                      <div className="text-slate-600 mb-1">Logs</div>
                      <div>{flow.details.logs.length}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {flow.transfers && flow.transfers.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Asset Transfers ({flow.transfers.length})</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flow.transfers.map((transfer: any, idx: number) => {
                        const isExpanded = expandedTransfers.has(transfer.uniqueId);
                        return (
                          <>
                            <TableRow
                              key={transfer.uniqueId}
                              className="cursor-pointer hover:bg-slate-50"
                              onClick={() => toggleTransfer(transfer.uniqueId)}
                            >
                              <TableCell>
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatAddress(transfer.from)}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatAddress(transfer.to)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{transfer.asset}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatValue(transfer.value, transfer.asset)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{transfer.category}</Badge>
                              </TableCell>
                              <TableCell onClick={(e: React.SyntheticEvent) => e.stopPropagation()}>
                                <a
                                  href={`https://etherscan.io/tx/${transfer.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow key={`${transfer.uniqueId}-details`}>
                                <TableCell colSpan={7} className="bg-slate-50 p-4">
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <div className="text-slate-600 mb-1">Block Number</div>
                                      <div className="font-mono">{parseInt(transfer.blockNum, 16).toLocaleString()}</div>
                                    </div>
                                    {transfer.blockTimestamp && (
                                      <div>
                                        <div className="text-slate-600 mb-1">Timestamp</div>
                                        <div>{new Date(transfer.blockTimestamp).toLocaleString()}</div>
                                      </div>
                                    )}
                                    {transfer.erc721TokenId && (
                                      <div>
                                        <div className="text-slate-600 mb-1">Token ID</div>
                                        <div>{transfer.erc721TokenId}</div>
                                      </div>
                                    )}
                                    {transfer.rawContract && (
                                      <>
                                        {transfer.rawContract.address && (
                                          <div>
                                            <div className="text-slate-600 mb-1">Contract</div>
                                            <div className="font-mono text-xs">{formatAddress(transfer.rawContract.address)}</div>
                                          </div>
                                        )}
                                        {transfer.rawContract.decimal && (
                                          <div>
                                            <div className="text-slate-600 mb-1">Decimals</div>
                                            <div>{transfer.rawContract.decimal}</div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {transfer.metadata && Object.keys(transfer.metadata).length > 0 && (
                                      <div className="col-span-full">
                                        <div className="text-slate-600 mb-1">Metadata</div>
                                        <pre className="text-xs bg-white p-2 rounded border overflow-auto">
                                          {JSON.stringify(transfer.metadata, null, 2)}
                                        </pre>
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
              </div>
            )}

            {/* Wallet-connected comments */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Transaction Comments</h3>
                  <p className="text-sm text-slate-600">
                    Connect your wallet to leave contextual comments about this transaction.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {account && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {`${account.slice(0, 6)}...${account.slice(-4)}`}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleConnectWallet}
                    disabled={connecting}
                  >
                    {connecting
                      ? 'Connecting...'
                      : account
                      ? 'Switch Wallet'
                      : 'Connect Wallet'}
                  </Button>
                </div>
              </div>
              {walletError && (
                <p className="text-xs text-red-600">{walletError}</p>
              )}

              {account && (
                <div className="space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e: React.SyntheticEvent) => setNewComment(e.target.value)}
                    placeholder="Add a comment about this transaction..."
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      type="button"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      Post Comment
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {comments.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No comments yet. Connect a wallet to share the first one.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border rounded-md p-2 bg-slate-50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-slate-600">
                          {comment.author
                            ? `${comment.author.slice(0, 6)}...${comment.author.slice(-4)}`
                            : 'Anonymous'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">
                        {comment.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}










