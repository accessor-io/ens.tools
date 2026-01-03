import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Download,
  Settings,
  AlertTriangle,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services';
import { feeCollectionService, type FeeBalance } from '../../lib/services/fee-collection-service';
import { parseEther, formatEther, type Address } from 'viem';

export function FeeManagement() {
  const { address, isConnected, walletClient, publicClient } = useWeb3();
  const [feeBalance, setFeeBalance] = useState<FeeBalance | null>(null);
  const [registrationFee, setRegistrationFee] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAddress, setAdminAddress] = useState<Address | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawRecipient, setWithdrawRecipient] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isSettingFee, setIsSettingFee] = useState(false);
  const [marketplaceFeeBps, setMarketplaceFeeBps] = useState<number>(0);
  const [newMarketplaceFeeBps, setNewMarketplaceFeeBps] = useState('');
  const [isSettingMarketplaceFee, setIsSettingMarketplaceFee] = useState(false);

  useEffect(() => {
    if (isConnected && publicClient && address) {
      feeCollectionService.setClients(publicClient, walletClient || undefined);
      loadFeeData();
      checkAdminStatus();
      loadAdminAddress();
    }
  }, [isConnected, publicClient, address, walletClient]);

  const loadAdminAddress = async () => {
    try {
      const admin = await feeCollectionService.getAdminAddress();
      setAdminAddress(admin);
    } catch (error) {
      console.error('Error loading admin address:', error);
      setAdminAddress(null);
    }
  };

  const loadFeeData = async () => {
    setIsLoading(true);
    try {
      const [balance, fee, marketplaceFee] = await Promise.all([
        feeCollectionService.getFeeBalance(),
        feeCollectionService.getRegistrationFee(),
        feeCollectionService.getMarketplaceFeeBps(),
      ]);
      setFeeBalance(balance);
      setRegistrationFee(fee);
      setMarketplaceFeeBps(marketplaceFee);
    } catch (error) {
      console.error('Error loading fee data:', error);
      toast.error('Failed to load fee data');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    if (!address) return;
    try {
      const admin = await feeCollectionService.isAdmin(address as Address);
      setIsAdmin(admin);
      if (!admin) {
        console.warn('Not recognized as admin. Check that:');
        console.warn('1. FeeCollection contract is deployed and VITE_FEE_COLLECTION_ADDRESS is set');
        console.warn('2. Your connected address matches the contract admin address');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawRecipient) {
      toast.error('Please enter amount and recipient address');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(withdrawRecipient)) {
      toast.error('Invalid recipient address');
      return;
    }

    setIsWithdrawing(true);
    try {
      const amount = parseEther(withdrawAmount);
      const hash = await feeCollectionService.withdrawFees(
        amount,
        withdrawRecipient as Address
      );

      toast.success('Withdrawal initiated', {
        description: `Transaction: ${hash.slice(0, 10)}...`,
      });

      setWithdrawAmount('');
      setWithdrawRecipient('');
      await loadFeeData();
    } catch (error) {
      console.error('Error withdrawing fees:', error);
      toast.error('Withdrawal failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleSetFee = async () => {
    if (!newFeeAmount) {
      toast.error('Please enter new fee amount');
      return;
    }

    setIsSettingFee(true);
    try {
      const fee = parseEther(newFeeAmount);
      const hash = await feeCollectionService.setRegistrationFee(fee);

      toast.success('Registration fee updated', {
        description: `Transaction: ${hash.slice(0, 10)}...`,
      });

      setNewFeeAmount('');
      await loadFeeData();
    } catch (error) {
      console.error('Error setting fee:', error);
      toast.error('Failed to update fee', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSettingFee(false);
    }
  };

  const handleSetMarketplaceFee = async () => {
    if (!newMarketplaceFeeBps) {
      toast.error('Please enter new marketplace fee');
      return;
    }

    const feeBps = parseInt(newMarketplaceFeeBps);
    if (isNaN(feeBps) || feeBps < 0 || feeBps > 1000) {
      toast.error('Invalid fee. Must be between 0 and 1000 basis points (0-10%)');
      return;
    }

    setIsSettingMarketplaceFee(true);
    try {
      const hash = await feeCollectionService.setMarketplaceFee(feeBps);

      toast.success('Marketplace fee updated', {
        description: `Transaction: ${hash.slice(0, 10)}...`,
      });

      setNewMarketplaceFeeBps('');
      await loadFeeData();
    } catch (error) {
      console.error('Error setting marketplace fee:', error);
      toast.error('Failed to update marketplace fee', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSettingMarketplaceFee(false);
    }
  };

  const handleWithdrawAll = () => {
    if (feeBalance && feeBalance.availableBalance > 0n) {
      setWithdrawAmount(formatEther(feeBalance.availableBalance));
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-slate-900">Fee Management</h2>
          <p className="text-slate-600">Connect your wallet to manage fees</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-slate-900">Fee Management</h2>
        <p className="text-slate-600">Manage registration fees and withdrawals</p>
      </div>

      {/* Debug Info - Contract Address */}
      <Card className="border border-slate-200 bg-slate-50">
        <CardContent className="pt-4">
          <div className="text-xs text-slate-600 space-y-1">
            <div>
              <strong>Contract Address:</strong>{' '}
              <span className="font-mono">
                {feeCollectionService.getContractAddress() === '0x0000000000000000000000000000000000000000'
                  ? 'Not configured (0x0000...)'
                  : feeCollectionService.getContractAddress()}
              </span>
            </div>
            {adminAddress && (
              <div>
                <strong>Contract Admin:</strong>{' '}
                <span className="font-mono">{adminAddress}</span>
              </div>
            )}
            {address && (
              <div>
                <strong>Your Address:</strong>{' '}
                <span className="font-mono">{address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!isAdmin && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Admin Access Required</AlertTitle>
          <AlertDescription className="text-amber-800">
            Only admin addresses can manage fees and withdraw collected amounts.
            <br />
            <br />
            {adminAddress ? (
              <>
                <strong>Contract Admin Address:</strong>
                <div className="font-mono text-sm mt-1 p-2 bg-amber-100 rounded">
                  {adminAddress}
                </div>
                <div className="mt-2">
                  <strong>Your Connected Address:</strong>
                  <div className="font-mono text-sm mt-1 p-2 bg-amber-100 rounded">
                    {address}
                  </div>
                </div>
                <p className="mt-2 text-sm">
                  Connect the wallet that matches the admin address above to enable withdrawals.
                </p>
              </>
            ) : (
              <>
                <strong>To enable withdrawals:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Ensure FeeCollection contract is deployed</li>
                  <li>Set VITE_FEE_COLLECTION_ADDRESS environment variable</li>
                  <li>Connect the wallet address that matches the contract admin</li>
                </ul>
                <br />
                Check browser console for detailed error messages.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Fee Statistics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-bold text-slate-900">
                {feeBalance ? formatEther(feeBalance.totalCollected) : '0.00'} ETH
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Contract Registration</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-bold text-purple-600">
                {feeBalance ? formatEther(feeBalance.registrationFees) : '0.00'} ETH
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Name Registration</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-bold text-indigo-600">
                {feeBalance ? formatEther(feeBalance.nameRegistrationFees) : '0.00'} ETH
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Subdomain Creation</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-bold text-teal-600">
                {feeBalance ? formatEther(feeBalance.subdomainCreationFees) : '0.00'} ETH
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-bold text-cyan-600">
                {feeBalance ? formatEther(feeBalance.transferFees) : '0.00'} ETH
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {feeBalance ? formatEther(feeBalance.marketplaceFees) : '0.00'} ETH
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600">
                {feeBalance ? formatEther(feeBalance.availableBalance) : '0.00'} ETH
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Current Registration Fee</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {formatEther(registrationFee)} ETH
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Marketplace Fee Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">
                  {marketplaceFeeBps / 100}%
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {marketplaceFeeBps} basis points
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <>
          {/* Withdraw Fees */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-600" />
                Withdraw Fees
              </CardTitle>
              <CardDescription>
                Withdraw collected fees to a recipient address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Amount (ETH)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="withdraw-amount"
                      type="number"
                      step="0.001"
                      placeholder="0.0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    {feeBalance && feeBalance.availableBalance > 0n && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleWithdrawAll}
                      >
                        Max
                      </Button>
                    )}
                  </div>
                  {feeBalance && (
                    <p className="text-sm text-slate-500">
                      Available: {formatEther(feeBalance.availableBalance)} ETH
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="withdraw-recipient">Recipient Address</Label>
                  <Input
                    id="withdraw-recipient"
                    placeholder="0x..."
                    value={withdrawRecipient}
                    onChange={(e) => setWithdrawRecipient(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleWithdraw}
                disabled={isWithdrawing || !withdrawAmount || !withdrawRecipient}
                className="w-full"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Withdrawing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Withdraw Fees
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Set Registration Fee */}
            <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Update Registration Fee
              </CardTitle>
              <CardDescription>
                Set the fee amount for contract registrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-fee">New Registration Fee (ETH)</Label>
                <Input
                  id="new-fee"
                  type="number"
                  step="0.001"
                  placeholder="0.01"
                  value={newFeeAmount}
                  onChange={(e) => setNewFeeAmount(e.target.value)}
                />
                <p className="text-sm text-slate-500">
                  Current fee: {formatEther(registrationFee)} ETH
                </p>
              </div>

              <Button
                onClick={handleSetFee}
                disabled={isSettingFee || !newFeeAmount}
                className="w-full"
              >
                {isSettingFee ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Update Fee
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

            {/* Set Marketplace Fee */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  Update Marketplace Fee
                </CardTitle>
                <CardDescription>
                  Set the fee rate for marketplace sales (in basis points)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-marketplace-fee">New Marketplace Fee (Basis Points)</Label>
                  <Input
                    id="new-marketplace-fee"
                    type="number"
                    step="1"
                    placeholder="250"
                    value={newMarketplaceFeeBps}
                    onChange={(e) => setNewMarketplaceFeeBps(e.target.value)}
                  />
                  <p className="text-sm text-slate-500">
                    Current fee: {marketplaceFeeBps} bps ({marketplaceFeeBps / 100}%)
                  </p>
                  <p className="text-xs text-slate-400">
                    Example: 250 = 2.5%, 100 = 1%, max 1000 = 10%
                  </p>
                </div>

                <Button
                  onClick={handleSetMarketplaceFee}
                  disabled={isSettingMarketplaceFee || !newMarketplaceFeeBps}
                  className="w-full"
                >
                  {isSettingMarketplaceFee ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Update Marketplace Fee
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Fee History (placeholder for future implementation) */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Fee History
          </CardTitle>
          <CardDescription>
            Recent fee collection transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Registrant</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>ENS Name</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                  Fee history will be displayed here once transactions are processed
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

