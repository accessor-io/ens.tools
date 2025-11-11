/**
 * Fee Preview Component
 * Shows fee estimates before operations
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Calculator, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { feeCollectionService, FeeEstimate } from '../../lib/services/fee-collection-service';
import { formatEther } from 'viem';
import { useWeb3 } from '../../lib/services';

interface FeePreviewProps {
  operation: 'registration' | 'nameRegistration' | 'subdomainCreation' | 'transfer' | 'marketplace';
  salePrice?: bigint;
  gasEstimate?: bigint;
  showGas?: boolean;
}

export function FeePreview({ operation, salePrice, gasEstimate, showGas = false }: FeePreviewProps) {
  const { publicClient, address } = useWeb3();
  const [feeEstimate, setFeeEstimate] = useState<FeeEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);

  useEffect(() => {
    if (!publicClient) return;

    const loadFeeEstimate = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        feeCollectionService.setClients(publicClient, undefined);
        
        // Get gas price if showing gas
        if (showGas && gasEstimate) {
          const price = await publicClient.getGasPrice();
          setGasPrice(price);
        }

        const estimate = await feeCollectionService.estimateFee(operation, salePrice);
        
        if (showGas && gasEstimate && gasPrice) {
          const totalEstimate = await feeCollectionService.estimateTotalCost(
            operation as any,
            gasEstimate,
            gasPrice
          );
          setFeeEstimate(totalEstimate);
        } else {
          setFeeEstimate(estimate);
        }
      } catch (err) {
        console.error('Error estimating fee:', err);
        setError(err instanceof Error ? err.message : 'Failed to estimate fee');
      } finally {
        setIsLoading(false);
      }
    };

    loadFeeEstimate();
  }, [operation, salePrice, publicClient, gasEstimate, showGas, gasPrice]);

  const getOperationLabel = () => {
    switch (operation) {
      case 'registration':
        return 'Contract Registration';
      case 'nameRegistration':
        return 'Name Registration';
      case 'subdomainCreation':
        return 'Subdomain Creation';
      case 'transfer':
        return 'Domain Transfer';
      case 'marketplace':
        return 'Marketplace Sale';
      default:
        return 'Operation';
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Fee Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Fee Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!feeEstimate) {
    return null;
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          Fee Estimate
        </CardTitle>
        <CardDescription>{getOperationLabel()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Operation Fee</span>
            <Badge variant="outline" className="text-lg font-semibold">
              {feeEstimate.formattedFee} ETH
            </Badge>
          </div>

          {showGas && gasEstimate && gasPrice && feeEstimate.gasEstimate && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Gas Estimate</span>
                <Badge variant="outline" className="text-sm">
                  {gasEstimate.toLocaleString()} units
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Gas Cost</span>
                <Badge variant="outline" className="text-sm">
                  {formatEther(gasEstimate * gasPrice)} ETH
                </Badge>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Total Cost</span>
                  <Badge className="text-lg font-bold bg-blue-600">
                    {feeEstimate.totalCost ? formatEther(feeEstimate.totalCost) : feeEstimate.formattedFee} ETH
                  </Badge>
                </div>
              </div>
            </>
          )}

          {operation === 'marketplace' && salePrice && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Sale Price</span>
                <span className="text-slate-700">{formatEther(salePrice)} ETH</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Marketplace Fee (2.5%)</span>
                <span className="text-slate-700">{feeEstimate.formattedFee} ETH</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-slate-700">Seller Receives</span>
                <span className="text-slate-900">{formatEther(salePrice - feeEstimate.fee)} ETH</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}



