import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import {
  Globe,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  FileText,
  Network,
  Send,
  Lock,
  Unlock,
  Settings,
  Copy,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services';
import { ENSDomain, fetchENSNames } from '../../lib/ens';
import {
  setTextRecord,
  setAddressRecord,
  createSubdomain,
  transferDomainViaRegistry,
  transferWrappedName,
  wrapName,
  unwrapName,
  setFuses,
  combineFuses,
  FUSES,
} from '../../lib/ens';
import { Alert, AlertDescription } from '../ui/alert';

type WorkflowStep = 'select-domains' | 'select-action' | 'configure-action' | 'schedule';

type ActionType =
  | 'edit-metadata'
  | 'set-address'
  | 'create-subdomain'
  | 'transfer'
  | 'wrap'
  | 'unwrap'
  | 'set-fuses'
  | 'set-resolver'
  | 'batch-metadata';

interface ActionConfig {
  type: ActionType;
  label: string;
  description: string;
  icon: React.ElementType;
  requiresSingleDomain: boolean;
}

const AVAILABLE_ACTIONS: ActionConfig[] = [
  {
    type: 'edit-metadata',
    label: 'Edit Metadata',
    description: 'Add or update text records (description, URLs, social links, etc.)',
    icon: FileText,
    requiresSingleDomain: false,
  },
  {
    type: 'set-address',
    label: 'Set Address Record',
    description: 'Set ETH or multi-chain address resolution',
    icon: Network,
    requiresSingleDomain: false,
  },
  {
    type: 'batch-metadata',
    label: 'Batch Update Metadata',
    description: 'Apply the same metadata changes to multiple domains',
    icon: Copy,
    requiresSingleDomain: false,
  },
  {
    type: 'create-subdomain',
    label: 'Create Subdomain',
    description: 'Create a new subdomain under the selected domain',
    icon: Plus,
    requiresSingleDomain: true,
  },
  {
    type: 'transfer',
    label: 'Transfer Ownership',
    description: 'Transfer domain ownership to another address',
    icon: Send,
    requiresSingleDomain: false,
  },
  {
    type: 'wrap',
    label: 'Wrap Domain',
    description: 'Wrap domain in NameWrapper for advanced permissions',
    icon: Lock,
    requiresSingleDomain: false,
  },
  {
    type: 'unwrap',
    label: 'Unwrap Domain',
    description: 'Unwrap domain from NameWrapper',
    icon: Unlock,
    requiresSingleDomain: false,
  },
  {
    type: 'set-fuses',
    label: 'Configure Fuses',
    description: 'Set permission fuses for wrapped domains',
    icon: Settings,
    requiresSingleDomain: false,
  },
];

export function GuidedWorkflow() {
  const { address, isConnected, walletClient, publicClient } = useWeb3();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('select-domains');
  const [domains, setDomains] = useState<ENSDomain[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Action configuration state
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');
  const [metadataRecords, setMetadataRecords] = useState<Array<{ key: string; value: string }>>([]);
  const [addressValue, setAddressValue] = useState('');
  const [coinType, setCoinType] = useState('60');
  const [subdomainLabel, setSubdomainLabel] = useState('');
  const [subdomainOwner, setSubdomainOwner] = useState('');
  const [transferAddress, setTransferAddress] = useState('');
  const [selectedFuses, setSelectedFuses] = useState<string[]>([]);
  const [resolverAddress, setResolverAddress] = useState('');
  
  // Scheduling state
  const [scheduleType, setScheduleType] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    if (isConnected && address) {
      loadDomains();
    } else {
      setDomains([]);
    }
  }, [isConnected, address]);

  const loadDomains = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      const fetchedDomains = await fetchENSNames(address);
      setDomains(fetchedDomains);
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Failed to load domains');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'select-domains':
        return 25;
      case 'select-action':
        return 50;
      case 'configure-action':
        return 75;
      case 'schedule':
        return 100;
    }
  };

  const handleDomainToggle = (domainName: string) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainName)) {
        next.delete(domainName);
      } else {
        next.add(domainName);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedDomains.size === domains.length) {
      setSelectedDomains(new Set());
    } else {
      setSelectedDomains(new Set(domains.map((d) => d.name)));
    }
  };

  const handleNext = () => {
    if (currentStep === 'select-domains') {
      if (selectedDomains.size === 0) {
        toast.error('Please select at least one domain');
        return;
      }
      setCurrentStep('select-action');
    } else if (currentStep === 'select-action') {
      if (!selectedAction) {
        toast.error('Please select an action');
        return;
      }
      
      const actionConfig = AVAILABLE_ACTIONS.find((a) => a.type === selectedAction);
      if (actionConfig?.requiresSingleDomain && selectedDomains.size > 1) {
        toast.error('This action can only be performed on a single domain');
        return;
      }
      
      setCurrentStep('configure-action');
    } else if (currentStep === 'configure-action') {
      if (!validateConfiguration()) {
        return;
      }
      setCurrentStep('schedule');
    }
  };

  const handleBack = () => {
    if (currentStep === 'select-action') {
      setCurrentStep('select-domains');
    } else if (currentStep === 'configure-action') {
      setCurrentStep('select-action');
    } else if (currentStep === 'schedule') {
      setCurrentStep('configure-action');
    }
  };

  const validateConfiguration = (): boolean => {
    if (!selectedAction) return false;

    switch (selectedAction) {
      case 'edit-metadata':
      case 'batch-metadata':
        if (metadataRecords.length === 0) {
          toast.error('Please add at least one metadata record');
          return false;
        }
        break;
      case 'set-address':
        if (!addressValue || !addressValue.match(/^0x[a-fA-F0-9]{40}$/)) {
          toast.error('Please enter a valid address');
          return false;
        }
        break;
      case 'create-subdomain':
        if (!subdomainLabel || !subdomainOwner) {
          toast.error('Please fill in all required fields');
          return false;
        }
        if (selectedDomains.size !== 1) {
          toast.error('Subdomain creation requires exactly one parent domain');
          return false;
        }
        break;
      case 'transfer':
        if (!transferAddress || !transferAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          toast.error('Please enter a valid transfer address');
          return false;
        }
        break;
      case 'set-resolver':
        if (!resolverAddress || !resolverAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          toast.error('Please enter a valid resolver address');
          return false;
        }
        break;
    }
    return true;
  };

  const handleAddMetadataRecord = () => {
    if (!metadataKey.trim() || !metadataValue.trim()) {
      toast.error('Please fill in both key and value');
      return;
    }
    setMetadataRecords([...metadataRecords, { key: metadataKey, value: metadataValue }]);
    setMetadataKey('');
    setMetadataValue('');
  };

  const handleRemoveMetadataRecord = (index: number) => {
    setMetadataRecords(metadataRecords.filter((_, i) => i !== index));
  };

  const handleToggleFuse = (fuseName: string) => {
    setSelectedFuses((prev) =>
      prev.includes(fuseName) ? prev.filter((f) => f !== fuseName) : [...prev, fuseName]
    );
  };

  const handleExecute = async () => {
    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    if (scheduleType === 'scheduled') {
      toast.info('Scheduling not yet implemented. Executing immediately.');
    }

    setIsLoading(true);
    const domainArray = Array.from(selectedDomains);

    try {
      switch (selectedAction) {
        case 'edit-metadata':
        case 'batch-metadata':
          for (const domainName of domainArray) {
            for (const record of metadataRecords) {
              await setTextRecord(walletClient, publicClient, {
                name: domainName,
                key: record.key,
                value: record.value,
              });
            }
          }
          toast.success('Metadata updated successfully');
          break;

        case 'set-address':
          for (const domainName of domainArray) {
            await setAddressRecord(walletClient, publicClient, {
              name: domainName,
              recordType: 'address',
              value: addressValue,
            });
          }
          toast.success('Address record set successfully');
          break;

        case 'create-subdomain':
          if (domainArray.length === 1) {
            await createSubdomain(walletClient, publicClient, {
              parentName: domainArray[0],
              label: subdomainLabel,
              owner: subdomainOwner,
              fuses: 0,
              expiry: BigInt(0),
            });
            toast.success('Subdomain created successfully');
          }
          break;

        case 'transfer':
          for (const domainName of domainArray) {
            const domain = domains.find((d) => d.name === domainName);
            if (domain?.isWrapped) {
              await transferWrappedName(walletClient, publicClient, {
                name: domainName,
                newOwner: transferAddress as `0x${string}`,
              });
            } else {
              await transferDomainViaRegistry(walletClient, publicClient, {
                name: domainName,
                newOwner: transferAddress as `0x${string}`,
              });
            }
          }
          toast.success('Transfer completed successfully');
          break;

        case 'wrap':
          for (const domainName of domainArray) {
            await wrapName(walletClient, {
              name: domainName,
              owner: address!,
              fuses: 0,
              expiry: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60),
            });
          }
          toast.success('Domains wrapped successfully');
          break;

        case 'unwrap':
          for (const domainName of domainArray) {
            await unwrapName(walletClient, publicClient, {
              name: domainName,
              newController: address!,
            });
          }
          toast.success('Domains unwrapped successfully');
          break;

        case 'set-fuses':
          const fuses = combineFuses(selectedFuses as any[]);
          for (const domainName of domainArray) {
            await setFuses(walletClient, publicClient, {
              name: domainName,
              fuses,
            });
          }
          toast.success('Fuses set successfully');
          break;
      }

      await loadDomains();
      setSelectedDomains(new Set());
      setCurrentStep('select-domains');
      setSelectedAction(null);
    } catch (error: any) {
      console.error('Error executing action:', error);
      toast.error('Failed to execute action', {
        description: error.message || 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-domains':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Select Domains</h3>
                <p className="text-sm text-muted-foreground">
                  Choose one or more domains to manage
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedDomains.size === domains.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading domains...</div>
            ) : domains.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No domains found. Please connect your wallet or check your address.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {domains.map((domain) => (
                  <Card
                    key={domain.name}
                    className={`cursor-pointer transition-colors ${
                      selectedDomains.has(domain.name)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleDomainToggle(domain.name)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <Checkbox
                        checked={selectedDomains.has(domain.name)}
                        onCheckedChange={() => handleDomainToggle(domain.name)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{domain.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {domain.isWrapped ? 'Wrapped' : 'Standard'}
                        </div>
                      </div>
                      {domain.isWrapped && (
                        <Badge variant="secondary">Wrapped</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedDomains.size > 0 && (
              <div className="pt-4 border-t">
                <Badge variant="secondary">
                  {selectedDomains.size} domain{selectedDomains.size !== 1 ? 's' : ''} selected
                </Badge>
              </div>
            )}
          </div>
        );

      case 'select-action':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Choose Action</h3>
              <p className="text-sm text-muted-foreground">
                What would you like to do with the selected domain{selectedDomains.size > 1 ? 's' : ''}?
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {AVAILABLE_ACTIONS.map((action) => {
                const Icon = action.icon;
                const isDisabled = action.requiresSingleDomain && selectedDomains.size > 1;
                const isSelected = selectedAction === action.type;

                return (
                  <Card
                    key={action.type}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                        : isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => !isDisabled && setSelectedAction(action.type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 mt-0.5 text-primary" />
                        <div className="flex-1">
                          <div className="font-medium">{action.label}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {action.description}
                          </div>
                          {action.requiresSingleDomain && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Single domain only
                            </Badge>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );

      case 'configure-action':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Configure Action</h3>
              <p className="text-sm text-muted-foreground">
                Set up the parameters for your action
              </p>
            </div>

            {selectedAction === 'edit-metadata' || selectedAction === 'batch-metadata' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Metadata Records</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Key (e.g., description, url)"
                      value={metadataKey}
                      onChange={(e) => setMetadataKey(e.target.value)}
                    />
                    <Input
                      placeholder="Value"
                      value={metadataValue}
                      onChange={(e) => setMetadataValue(e.target.value)}
                    />
                    <Button onClick={handleAddMetadataRecord}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {metadataRecords.length > 0 && (
                  <div className="space-y-2">
                    {metadataRecords.map((record, index) => (
                      <Card key={index}>
                        <CardContent className="flex items-center justify-between p-3">
                          <div>
                            <div className="font-medium text-sm">{record.key}</div>
                            <div className="text-sm text-muted-foreground">{record.value}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMetadataRecord(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : selectedAction === 'set-address' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    placeholder="0x..."
                    value={addressValue}
                    onChange={(e) => setAddressValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Coin Type</Label>
                  <Select value={coinType} onValueChange={setCoinType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">ETH (60)</SelectItem>
                      <SelectItem value="0">BTC (0)</SelectItem>
                      <SelectItem value="3">DOGE (3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : selectedAction === 'create-subdomain' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Parent Domain</Label>
                  <Input
                    value={Array.from(selectedDomains)[0] || ''}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subdomain Label</Label>
                  <Input
                    placeholder="app"
                    value={subdomainLabel}
                    onChange={(e) => setSubdomainLabel(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The subdomain will be: {subdomainLabel && `${subdomainLabel}.${Array.from(selectedDomains)[0]}`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Owner Address</Label>
                  <Input
                    placeholder="0x..."
                    value={subdomainOwner}
                    onChange={(e) => setSubdomainOwner(e.target.value)}
                  />
                </div>
              </div>
            ) : selectedAction === 'transfer' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Transfer To Address</Label>
                  <Input
                    placeholder="0x..."
                    value={transferAddress}
                    onChange={(e) => setTransferAddress(e.target.value)}
                  />
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will transfer ownership of {selectedDomains.size} domain{selectedDomains.size !== 1 ? 's' : ''}. This action cannot be undone.
                  </AlertDescription>
                </Alert>
              </div>
            ) : selectedAction === 'set-fuses' ? (
              <div className="space-y-4">
                <Label>Select Fuses</Label>
                <div className="space-y-2">
                  {Object.entries(FUSES).map(([key, value]) => {
                    const fuseDescriptions: Record<string, string> = {
                      CANNOT_UNWRAP: 'Prevents unwrapping the domain',
                      CANNOT_BURN_FUSES: 'Prevents burning additional fuses',
                      CANNOT_TRANSFER: 'Prevents transferring ownership',
                      CANNOT_SET_RESOLVER: 'Prevents changing the resolver',
                      CANNOT_SET_TTL: 'Prevents modifying TTL',
                      CANNOT_CREATE_SUBDOMAIN: 'Prevents creating subdomains',
                      CANNOT_APPROVE: 'Prevents setting approvals',
                      PARENT_CANNOT_CONTROL: 'Parent loses control (emancipation)',
                      CAN_EXTEND_EXPIRY: 'Allows parent to extend expiry',
                    };
                    return (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedFuses.includes(key)}
                          onCheckedChange={() => handleToggleFuse(key)}
                        />
                        <Label className="font-normal cursor-pointer">
                          {key} - {fuseDescriptions[key] || 'Fuse option'}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Apply Now or Schedule</h3>
              <p className="text-sm text-muted-foreground">
                Choose when to execute this action
              </p>
            </div>

            <RadioGroup value={scheduleType} onValueChange={(v: any) => setScheduleType(v)}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="now" id="now" />
                <Label htmlFor="now" className="flex-1 cursor-pointer">
                  <div className="font-medium">Apply Now</div>
                  <div className="text-sm text-muted-foreground">
                    Execute the action immediately
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="scheduled" id="scheduled" />
                <Label htmlFor="scheduled" className="flex-1 cursor-pointer">
                  <div className="font-medium">Schedule for Later</div>
                  <div className="text-sm text-muted-foreground">
                    Execute at a specific date and time
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {scheduleType === 'scheduled' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Scheduling functionality is coming soon. Actions will execute immediately for now.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Action:</span>
                  <span className="text-sm font-medium">
                    {AVAILABLE_ACTIONS.find((a) => a.type === selectedAction)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Domains:</span>
                  <span className="text-sm font-medium">{selectedDomains.size}</span>
                </div>
                <Separator />
                <div className="text-sm">
                  <div className="text-muted-foreground mb-1">Selected domains:</div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(selectedDomains).map((name) => (
                      <Badge key={name} variant="outline">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-muted-foreground text-center">
            Please connect your wallet to start managing your ENS domains
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Guided Domain Management</h2>
        <p className="text-muted-foreground">
          Step-by-step workflow to manage your ENS domains
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Step {['1', '2', '3', '4'][['select-domains', 'select-action', 'configure-action', 'schedule'].indexOf(currentStep)]} of 4</CardTitle>
              <CardDescription>
                {currentStep === 'select-domains' && 'Select domains to manage'}
                {currentStep === 'select-action' && 'Choose an action'}
                {currentStep === 'configure-action' && 'Configure action parameters'}
                {currentStep === 'schedule' && 'Apply now or schedule'}
              </CardDescription>
            </div>
            <Badge variant="secondary">{Math.round(getStepProgress())}%</Badge>
          </div>
          <Progress value={getStepProgress()} className="mt-4" />
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStepContent()}

          <Separator />

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 'select-domains'}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex gap-2">
              {currentStep === 'schedule' ? (
                <Button onClick={handleExecute} disabled={isLoading}>
                  {isLoading ? 'Executing...' : 'Execute Action'}
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

