import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock,
  Loader2,
  ArrowRight,
  Shield,
  Users,
  FileCheck,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services/web3-provider';
import { permissionService, PermissionCheckResult } from '../../lib/delegation/permission-service';
import { delegationPlanner, DelegationPlan } from '../../lib/delegation/delegation-planner';
import { executeDelegationPlan } from '../../lib/ens/ens-write-operations';
import { Address } from 'viem';

type Step = 'contract' | 'manager' | 'review' | 'execute' | 'complete';

export function PreflightChecker() {
  const { walletClient, publicClient, address } = useWeb3();
  const [step, setStep] = useState<Step>('contract');
  const [contractAddress, setContractAddress] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [managerAddress, setManagerAddress] = useState('');
  const [backupManagerAddress, setBackupManagerAddress] = useState('');
  const [permissionCheck, setPermissionCheck] = useState<PermissionCheckResult | null>(null);
  const [delegationPlan, setDelegationPlan] = useState<DelegationPlan | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleCheckContract = async () => {
    if (!contractAddress || !publicClient || !address) {
      toast.error('Please enter a contract address');
      return;
    }

    setIsChecking(true);
    try {
      const result = await permissionService.checkPermissions(
        publicClient,
        contractAddress as Address,
        address as Address,
        suggestedName || undefined
      );

      setPermissionCheck(result);

      if (result.canManageENS) {
        const plan = await delegationPlanner.createDelegationPlan(
          publicClient,
          result,
          address as Address,
          undefined
        );
        setDelegationPlan(plan);
        setManagerAddress(address);
        toast.success('Contract checked successfully');
        setStep('manager');
      } else {
        toast.warning('You do not have permission to manage ENS for this contract');
      }
    } catch (error) {
      console.error('Error checking contract:', error);
      toast.error('Failed to check contract', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSetManager = async () => {
    if (!managerAddress || !permissionCheck || !publicClient) {
      toast.error('Please enter a manager address');
      return;
    }

    setIsChecking(true);
    try {
      const plan = await delegationPlanner.createDelegationPlan(
        publicClient,
        permissionCheck,
        managerAddress as Address,
        backupManagerAddress ? (backupManagerAddress as Address) : undefined
      );

      setDelegationPlan(plan);
      toast.success('Delegation plan created');
      setStep('review');
    } catch (error) {
      console.error('Error creating delegation plan:', error);
      toast.error('Failed to create delegation plan', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleExecute = async () => {
    if (!walletClient || !publicClient || !delegationPlan || !address) {
      toast.error('Missing required information');
      return;
    }

    setIsExecuting(true);
    try {
      const simulation = await delegationPlanner.simulateDelegationPlan(
        publicClient,
        delegationPlan,
        address as Address
      );

      if (!simulation.success) {
        toast.error('Simulation failed', {
          description: simulation.error,
        });
        return;
      }

      const actions = delegationPlan.actions.map(action => ({
        contract: action.contract,
        functionName: action.functionName,
        args: action.args,
      }));

      const hashes = await executeDelegationPlan(walletClient, publicClient, actions);

      toast.success('Delegation executed successfully', {
        description: `${hashes.length} transactions confirmed`,
      });

      setStep('complete');
    } catch (error) {
      console.error('Error executing delegation:', error);
      toast.error('Failed to execute delegation', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const renderContractStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Identify Contract</CardTitle>
        <CardDescription>
          Enter the contract address you want to assign an ENS name to
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contract-address">Contract Address</Label>
          <Input
            id="contract-address"
            placeholder="0x..."
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="suggested-name">Suggested ENS Name (Optional)</Label>
          <Input
            id="suggested-name"
            placeholder="mycontract.eth"
            value={suggestedName}
            onChange={(e) => setSuggestedName(e.target.value)}
          />
        </div>
        <Button 
          onClick={handleCheckContract}
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <FileCheck className="mr-2 h-4 w-4" />
              Check Contract
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderManagerStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Configure Manager</CardTitle>
        <CardDescription>
          Set up a dedicated account or multisig to manage ENS metadata
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissionCheck && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Recommendation</AlertTitle>
            <AlertDescription>
              {permissionCheck.contractOwnership.isSafe ? (
                <span>This contract is a Safe multisig - using it as the manager is recommended.</span>
              ) : (
                <span>Consider using a dedicated EOA or multisig account for ENS management.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="manager-address">Manager Address</Label>
          <Input
            id="manager-address"
            placeholder="0x..."
            value={managerAddress}
            onChange={(e) => setManagerAddress(e.target.value)}
          />
          <p className="text-sm text-slate-600">
            This account will have permission to update ENS metadata
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="backup-manager">Backup Manager (Optional)</Label>
          <Input
            id="backup-manager"
            placeholder="0x..."
            value={backupManagerAddress}
            onChange={(e) => setBackupManagerAddress(e.target.value)}
          />
          <p className="text-sm text-slate-600">
            Emergency backup address for recovery
          </p>
        </div>

        <Button 
          onClick={handleSetManager}
          disabled={isChecking || !managerAddress}
          className="w-full"
        >
          {isChecking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Planning...
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-4 w-4" />
              Continue to Review
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderReviewStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Review Delegation Plan</CardTitle>
        <CardDescription>
          Review the transactions that will be executed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {delegationPlan && (
          <>
            <div className="space-y-2">
              <h4 className="font-semibold">Manager Address</h4>
              <p className="text-sm text-slate-600 font-mono">{delegationPlan.recommendedManager}</p>
            </div>

            {delegationPlan.backupManager && (
              <div className="space-y-2">
                <h4 className="font-semibold">Backup Manager</h4>
                <p className="text-sm text-slate-600 font-mono">{delegationPlan.backupManager}</p>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold">Actions to Execute</h4>
              <div className="space-y-2">
                {delegationPlan.actions.map((action, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 border rounded">
                    {action.critical ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {action.contract.slice(0, 6)}...{action.contract.slice(-4)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Metadata Records</h4>
              <div className="space-y-1">
                {delegationPlan.metadataRecords.map((record, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-slate-600">{record.key}</span>
                    <span className="font-mono text-xs">{record.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleExecute}
              disabled={isExecuting}
              className="w-full"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Execute Delegation
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderCompleteStep = () => (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="text-green-900">Delegation Complete</CardTitle>
        <CardDescription className="text-green-700">
          The manager account now has permission to update ENS metadata
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          <span>Manager permissions configured</span>
        </div>
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          <span>Metadata records updated</span>
        </div>
        <Button 
          onClick={() => {
            setStep('contract');
            setContractAddress('');
            setSuggestedName('');
            setManagerAddress('');
            setBackupManagerAddress('');
            setPermissionCheck(null);
            setDelegationPlan(null);
          }}
          className="w-full"
        >
          Start New Delegation
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Preflight Checker</h1>
        <p className="text-slate-600 mt-2">
          Verify contract ownership and set up ENS management delegation
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <div className={`px-3 py-1 rounded-full ${step === 'contract' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}>
          1. Contract
        </div>
        <ArrowRight className="h-4 w-4" />
        <div className={`px-3 py-1 rounded-full ${step === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}>
          2. Manager
        </div>
        <ArrowRight className="h-4 w-4" />
        <div className={`px-3 py-1 rounded-full ${step === 'review' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'}`}>
          3. Review
        </div>
        <ArrowRight className="h-4 w-4" />
        <div className={`px-3 py-1 rounded-full ${step === 'complete' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
          4. Complete
        </div>
      </div>

      {step === 'contract' && renderContractStep()}
      {step === 'manager' && renderManagerStep()}
      {step === 'review' && renderReviewStep()}
      {step === 'complete' && renderCompleteStep()}
    </div>
  );
}

