/**
 * Fee History Component
 * Displays fee payment history and analytics
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, History, TrendingUp, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { feeCollectionService } from '../../lib/services/fee-collection-service';
import { formatEther } from 'viem';
import { useWeb3 } from '../../lib/services/web3-provider';
import { Address } from 'viem';

interface FeeTransaction {
  hash: string;
  type: 'registration' | 'nameRegistration' | 'subdomainCreation' | 'transfer' | 'marketplace';
  amount: bigint;
  timestamp: number;
  from: Address;
  to?: Address;
  ensName?: string;
}

export function FeeHistory() {
  const { publicClient, address } = useWeb3();
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0n,
    byType: {} as Record<string, bigint>,
    count: 0,
  });

  useEffect(() => {
    if (!publicClient || !address) return;

    const loadFeeHistory = async () => {
      setIsLoading(true);
      try {
        feeCollectionService.setClients(publicClient, undefined);
        
        // In a real implementation, you would fetch events from the contract
        // For now, we'll show a placeholder
        // TODO: Implement event fetching from FeeCollection contract
        
        const feeBalance = await feeCollectionService.getFeeBalance();
        
        // Calculate stats
        const byType: Record<string, bigint> = {
          registration: feeBalance.registrationFees,
          nameRegistration: feeBalance.nameRegistrationFees,
          subdomainCreation: feeBalance.subdomainCreationFees,
          transfer: feeBalance.transferFees,
          marketplace: feeBalance.marketplaceFees,
        };

        setStats({
          total: feeBalance.totalCollected,
          byType,
          count: 0, // Would be actual transaction count
        });

        // Placeholder transactions - in production, fetch from contract events
        setTransactions([]);
      } catch (error) {
        console.error('Error loading fee history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeeHistory();
  }, [publicClient, address]);

  const filteredTransactions = transactions.filter(tx => 
    selectedType === 'all' || tx.type === selectedType
  );

  const exportToCSV = () => {
    const headers = ['Type', 'Amount (ETH)', 'Timestamp', 'From', 'To', 'ENS Name', 'Transaction Hash'];
    const rows = filteredTransactions.map(tx => [
      tx.type,
      formatEther(tx.amount),
      new Date(tx.timestamp * 1000).toISOString(),
      tx.from,
      tx.to || '',
      tx.ensName || '',
      tx.hash,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'registration':
        return 'Contract Registration';
      case 'nameRegistration':
        return 'Name Registration';
      case 'subdomainCreation':
        return 'Subdomain Creation';
      case 'transfer':
        return 'Transfer';
      case 'marketplace':
        return 'Marketplace';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'registration':
        return 'bg-purple-100 text-purple-800';
      case 'nameRegistration':
        return 'bg-indigo-100 text-indigo-800';
      case 'subdomainCreation':
        return 'bg-cyan-100 text-cyan-800';
      case 'transfer':
        return 'bg-blue-100 text-blue-800';
      case 'marketplace':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Fee History & Analytics
              </CardTitle>
              <CardDescription>View fee payment history and statistics</CardDescription>
            </div>
            {filteredTransactions.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600">Total Fees Collected</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {formatEther(stats.total)} ETH
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600">Total Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {stats.count}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Average Fee
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {stats.count > 0 ? formatEther(stats.total / BigInt(stats.count)) : '0.00'} ETH
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Fees by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.byType).map(([type, amount]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-slate-600">{getTypeLabel(type)}</span>
                          <Badge className={getTypeColor(type)}>
                            {formatEther(amount)} ETH
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transactions" className="space-y-4">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="all">All Types</option>
                    <option value="registration">Contract Registration</option>
                    <option value="nameRegistration">Name Registration</option>
                    <option value="subdomainCreation">Subdomain Creation</option>
                    <option value="transfer">Transfer</option>
                    <option value="marketplace">Marketplace</option>
                  </select>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <History className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No fee transactions found</p>
                    <p className="text-sm mt-2">Fee history will appear here once transactions are made</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTransactions.map((tx, index) => (
                      <Card key={index} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className={getTypeColor(tx.type)}>
                                {getTypeLabel(tx.type)}
                              </Badge>
                              <span className="text-slate-600">
                                {new Date(tx.timestamp * 1000).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-slate-900">
                                {formatEther(tx.amount)} ETH
                              </div>
                              {tx.ensName && (
                                <div className="text-sm text-slate-500">{tx.ensName}</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


