import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { 
  Save, 
  Plus, 
  Trash2, 
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Loader2,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { useDomainContext } from '../../lib/contexts/DomainContext';
import { useWeb3 } from '../../lib/services';
import { useTransactionManager } from '../../lib/hooks/useTransactionManager';
import { fetchENSNames, getAllTextRecords, resolveENSName, type ENSDomain } from '../../lib/ens/ens-utils';
import { setTextRecord, setAddressRecord } from '../../lib/ens/ens-write-operations';
import { useStateRecollection } from '../../lib/adaptive-rendering/state-recollection';
import { AIMetadataGenerator } from '../ai/AIMetadataGenerator';

interface TextRecord {
  key: string;
  value: string;
}

export function MetadataEditor() {
  const { selectedDomains, selectedDomain, isBulkMode, selectDomain, selectDomains } = useDomainContext();
  const { address, isConnected, walletClient, publicClient } = useWeb3();
  const txManager = useTransactionManager();
  
  const [availableDomains, setAvailableDomains] = useState<ENSDomain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [textRecords, setTextRecords] = useState<TextRecord[]>([]);
  const [domainAddress, setDomainAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bulkRecords, setBulkRecords] = useState<Record<string, TextRecord[]>>({});
  const [bulkAddresses, setBulkAddresses] = useState<Record<string, string>>({});
  const [selectedBulkDomains, setSelectedBulkDomains] = useState<Set<string>>(new Set());
  
  const { stagedEdits, stageEdit, clearStagedEdits, recallState, requiresRecall } = useStateRecollection(
    'metadata-editor',
    'metadata-editing',
    {
      requiresTransactionStaging: true,
      autoDormantOnContextSwitch: true,
      persistenceType: 'session',
    }
  );
  
  const [previousTextRecords, setPreviousTextRecords] = useState<TextRecord[]>([]);
  const [previousBulkRecords, setPreviousBulkRecords] = useState<Record<string, TextRecord[]>>({});

  // Load available domains
  useEffect(() => {
    if (isConnected && address) {
      loadAvailableDomains();
    }
  }, [isConnected, address]);

  // Load metadata when domain selection changes
  useEffect(() => {
    if (selectedDomain && publicClient) {
      loadDomainMetadata(selectedDomain.name);
      loadDomainAddress(selectedDomain.name);
    } else if (isBulkMode && selectedDomains.length > 0) {
      loadBulkMetadata();
      loadBulkAddresses();
    } else {
      setTextRecords([]);
      setDomainAddress('');
    }
  }, [selectedDomain, isBulkMode, selectedDomains, publicClient]);

  const loadAvailableDomains = async () => {
    if (!address) return;
    
    setIsLoadingDomains(true);
    try {
      const domains = await fetchENSNames(address);
      setAvailableDomains(domains);
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Failed to load domains');
    } finally {
      setIsLoadingDomains(false);
    }
  };

  const loadDomainMetadata = async (domainName: string) => {
    if (!publicClient) return;
    
    setIsLoading(true);
    try {
      const records = await getAllTextRecords(publicClient, domainName);
      if (records.length > 0) {
        setTextRecords(records.map(r => ({ key: r.key, value: r.value })));
      } else {
        setTextRecords([{ key: '', value: '' }]);
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
      toast.error('Failed to load domain metadata');
      setTextRecords([{ key: '', value: '' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDomainAddress = async (domainName: string) => {
    if (!publicClient) return;
    
    try {
      const address = await resolveENSName(publicClient, domainName);
      setDomainAddress(address || '');
    } catch (error) {
      console.error('Error loading address:', error);
      setDomainAddress('');
    }
  };

  const loadBulkAddresses = async () => {
    if (!publicClient) return;
    
    try {
      const addressMap: Record<string, string> = {};
      
      for (const domain of selectedDomains) {
        try {
          const addr = await resolveENSName(publicClient, domain.name);
          addressMap[domain.name] = addr || '';
        } catch (error) {
          console.error(`Error loading address for ${domain.name}:`, error);
          addressMap[domain.name] = '';
        }
      }
      
      setBulkAddresses(addressMap);
    } catch (error) {
      console.error('Error loading bulk addresses:', error);
    }
  };

  const loadBulkMetadata = async () => {
    if (!publicClient) return;
    
    setIsLoading(true);
    try {
      const metadataMap: Record<string, TextRecord[]> = {};
      
      for (const domain of selectedDomains) {
        try {
          const records = await getAllTextRecords(publicClient, domain.name);
          metadataMap[domain.name] = records.map(r => ({ key: r.key, value: r.value }));
        } catch (error) {
          console.error(`Error loading metadata for ${domain.name}:`, error);
          metadataMap[domain.name] = [];
        }
      }
      
      setBulkRecords(metadataMap);
      setSelectedBulkDomains(new Set(selectedDomains.map(d => d.name)));
    } catch (error) {
      console.error('Error loading bulk metadata:', error);
      toast.error('Failed to load bulk metadata');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    if (isBulkMode) {
      await handleBulkSave();
    } else if (selectedDomain) {
      await handleSingleSave(selectedDomain.name);
    } else {
      toast.error('No domain selected');
    }
  };

  const handleSaveAddress = async () => {
    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    if (isBulkMode) {
      await handleBulkAddressSave();
    } else if (selectedDomain) {
      await handleSingleAddressSave(selectedDomain.name);
    } else {
      toast.error('No domain selected');
    }
  };

  const handleSingleAddressSave = async (domainName: string) => {
    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    if (!domainAddress || !/^0x[a-fA-F0-9]{40}$/.test(domainAddress)) {
      toast.error('Invalid address format');
      return;
    }

    setIsSaving(true);
    try {
      const executeFn = async () => {
        return await setAddressRecord(walletClient, publicClient, {
          name: domainName,
          value: domainAddress,
        });
      };

      await txManager.addTransaction(executeFn, {
        description: `Set address record for ${domainName}`,
        onSuccess: async () => {
          await loadDomainAddress(domainName);
        },
      });
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAddressSave = async () => {
    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    setIsSaving(true);
    try {
      const { TransactionBuilder } = await import('../../lib/ens/transaction-builder');
      const builder = new TransactionBuilder(publicClient, walletClient);
      
      let validCount = 0;
      for (const domain of selectedDomains) {
        const address = bulkAddresses[domain.name];
        
        if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
          builder.addAddressRecord(domain.name, address, 60); // ETH coin type
          validCount++;
        }
      }

      if (validCount === 0) {
        toast.error('No valid addresses to save');
        setIsSaving(false);
        return;
      }

      // Execute using transaction manager
      const executeFn = async () => {
        const hashes = await builder.execute();
        return hashes[0]; // Return first hash for tracking
      };

      await txManager.addTransaction(executeFn, {
        description: `Bulk set address records (${validCount} domain${validCount !== 1 ? 's' : ''})`,
        onSuccess: async () => {
          await loadBulkAddresses();
        },
      });
    } catch (error) {
      console.error('Error saving bulk addresses:', error);
      toast.error('Failed to save bulk addresses', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSingleSave = async (domainName: string) => {
    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    setIsSaving(true);
    try {
      const { TransactionBuilder } = await import('../../lib/ens/transaction-builder');
      const builder = new TransactionBuilder(publicClient, walletClient);
      
      // Add all text records to builder
      for (const record of textRecords) {
        if (record.key && record.value) {
          builder.addTextRecord(domainName, record.key, record.value);
        }
      }

      if (builder.getOperationCount() === 0) {
        toast.error('No records to save');
        setIsSaving(false);
        return;
      }

      // Execute using transaction manager
      const operationCount = builder.getOperationCount();
      const executeFn = async () => {
        const hashes = await builder.execute();
        return hashes[0]; // Return first hash for tracking
      };

      await txManager.addTransaction(executeFn, {
        description: `Save metadata for ${domainName} (${operationCount} record${operationCount !== 1 ? 's' : ''})`,
        onSuccess: async () => {
          await loadDomainMetadata(domainName);
          clearStagedEdits('metadata-editor', stagedEdits.filter(e => e.domainName === domainName).map(e => e.id));
        },
      });
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast.error('Failed to save metadata', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkSave = async () => {
    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    setIsSaving(true);
    try {
      const { TransactionBuilder } = await import('../../lib/ens/transaction-builder');
      const builder = new TransactionBuilder(publicClient, walletClient);
      
      // Add all records to builder
      for (const domain of selectedDomains) {
        const records = bulkRecords[domain.name] || [];
        for (const record of records) {
          if (record.key && record.value) {
            builder.addTextRecord(domain.name, record.key, record.value);
          }
        }
      }

      if (builder.getOperationCount() === 0) {
        toast.error('No records to save');
        setIsSaving(false);
        return;
      }

      // Execute using transaction manager
      const totalOps = builder.getOperationCount();
      const executeFn = async () => {
        const hashes = await builder.execute();
        return hashes[0]; // Return first hash for tracking
      };

      await txManager.addTransaction(executeFn, {
        description: `Bulk save metadata (${totalOps} record${totalOps !== 1 ? 's' : ''} across ${selectedDomains.length} domain${selectedDomains.length !== 1 ? 's' : ''})`,
        onSuccess: async () => {
          await loadBulkMetadata();
          const domainNames = selectedDomains.map(d => d.name);
          const editIds = stagedEdits.filter(e => domainNames.includes(e.domainName)).map(e => e.id);
          if (editIds.length > 0) {
            clearStagedEdits(editIds);
          }
        },
      });
    } catch (error) {
      console.error('Error saving bulk metadata:', error);
      toast.error('Failed to save bulk metadata', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRecord = () => {
    if (isBulkMode) {
      // Add record to all selected domains
      const newRecords = { ...bulkRecords };
      selectedDomains.forEach(domain => {
        if (!newRecords[domain.name]) {
          newRecords[domain.name] = [];
        }
        newRecords[domain.name].push({ key: '', value: '' });
      });
      setBulkRecords(newRecords);
    } else {
      setTextRecords([...textRecords, { key: '', value: '' }]);
    }
  };

  const handleRemoveRecord = (index: number, domainName?: string) => {
    if (isBulkMode && domainName) {
      const newRecords = { ...bulkRecords };
      if (newRecords[domainName]) {
        newRecords[domainName] = newRecords[domainName].filter((_, i) => i !== index);
        setBulkRecords(newRecords);
      }
    } else {
      setTextRecords(textRecords.filter((_, i) => i !== index));
    }
  };

  const updateRecord = (index: number, field: 'key' | 'value', value: string, domainName?: string) => {
    if (isBulkMode && domainName) {
      const newRecords = { ...bulkRecords };
      if (newRecords[domainName]) {
        const updated = [...newRecords[domainName]];
        updated[index] = { ...updated[index], [field]: value };
        newRecords[domainName] = updated;
        setBulkRecords(newRecords);
      }
    } else {
      const updated = [...textRecords];
      updated[index][field] = value;
      setTextRecords(updated);
    }
  };

  const toggleBulkDomain = (domainName: string) => {
    const newSet = new Set(selectedBulkDomains);
    if (newSet.has(domainName)) {
      newSet.delete(domainName);
    } else {
      newSet.add(domainName);
    }
    setSelectedBulkDomains(newSet);
  };

  const handleDomainSelect = (domainName: string) => {
    const domain = availableDomains.find(d => d.name === domainName);
    if (domain) {
      selectDomain(domain);
    }
  };

  const handleBulkDomainToggle = (domain: ENSDomain) => {
    const newDomains = selectedBulkDomains.has(domain.name)
      ? selectedDomains.filter(d => d.name !== domain.name)
      : [...selectedDomains, domain];
    selectDomains(newDomains);
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-slate-900">Metadata Editor</h2>
          <p className="text-slate-600">Connect your wallet to edit domain metadata</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-slate-900">Metadata Editor</h2>
            {stagedEdits.length > 0 && (
              <Badge variant="secondary" className="animate-pulse">
                {stagedEdits.length} staged
              </Badge>
            )}
          </div>
          <p className="text-slate-600">
            {isBulkMode 
              ? `Editing ${selectedDomains.length} domain${selectedDomains.length !== 1 ? 's' : ''}`
              : 'Configure resolution records and contract metadata'}
          </p>
        </div>
        <Button onClick={handleSaveMetadata} disabled={isSaving || isLoading}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </>
          )}
        </Button>
      </div>

      {/* Domain Selector */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Select Domain{isBulkMode ? 's' : ''} to Edit</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isBulkMode) {
                    selectDomain(selectedDomains[0] || availableDomains[0]);
                  } else {
                    selectDomains(selectedDomain ? [selectedDomain] : []);
                  }
                }}
              >
                {isBulkMode ? 'Single Mode' : 'Bulk Mode'}
                <Users className="h-4 w-4 ml-2" />
              </Button>
            </div>
            
            {isBulkMode ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Select multiple domains to edit metadata in bulk
                </p>
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {availableDomains.map((domain) => (
                    <div key={domain.name} className="flex items-center space-x-2 p-2 border rounded">
                      <Checkbox
                        checked={selectedDomains.some(d => d.name === domain.name)}
                        onCheckedChange={() => handleBulkDomainToggle(domain)}
                      />
                      <Label className="flex-1 cursor-pointer" onClick={() => handleBulkDomainToggle(domain)}>
                        {domain.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedDomains.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedDomains.map(domain => (
                      <Badge key={domain.name} variant="secondary">
                        {domain.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Select
                value={selectedDomain?.name || ''}
                onValueChange={handleDomainSelect}
                disabled={isLoadingDomains}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingDomains ? 'Loading domains...' : 'Select a domain'} />
                </SelectTrigger>
                <SelectContent>
                  {availableDomains.map((domain) => (
                    <SelectItem key={domain.name} value={domain.name}>
                      {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedDomain && !isBulkMode && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Select a domain to start editing metadata
          </AlertDescription>
        </Alert>
      )}

      {(selectedDomain || isBulkMode) && (
        <>
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              For critical contract names, ensure all metadata is verified before publishing. Address changes should go through DAO governance approval.
            </AlertDescription>
          </Alert>

          {/* Metadata Tabs */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle>
                {isBulkMode 
                  ? `Text Records for ${selectedDomains.length} Domain${selectedDomains.length !== 1 ? 's' : ''}`
                  : `Records for ${selectedDomain?.name || ''}`}
              </CardTitle>
              <CardDescription>Configure all resolution data</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="text">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="addresses">Addresses</TabsTrigger>
                  <TabsTrigger value="text">Text Records</TabsTrigger>
                  <TabsTrigger value="content">Content Hash</TabsTrigger>
                  <TabsTrigger value="abi">ABI</TabsTrigger>
                  <TabsTrigger value="ai">AI Assistant</TabsTrigger>
                </TabsList>

                {/* Text Records */}
                <TabsContent value="text" className="space-y-4 mt-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  ) : isBulkMode ? (
                    <div className="space-y-6">
                      {selectedDomains.map((domain) => {
                        const records = bulkRecords[domain.name] || [{ key: '', value: '' }];
                        return (
                          <div key={domain.name} className="space-y-3 border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <Label className="font-semibold">{domain.name}</Label>
                              <Checkbox
                                checked={selectedBulkDomains.has(domain.name)}
                                onCheckedChange={() => toggleBulkDomain(domain.name)}
                              />
                            </div>
                            <div className="space-y-2">
                              {records.map((record, index) => (
                                <div key={index} className="grid gap-3 md:grid-cols-[200px_1fr_auto] items-start p-3 border rounded-lg bg-white">
                                  <Input
                                    placeholder="Key (e.g., url)"
                                    value={record.key}
                                    onChange={(e) => updateRecord(index, 'key', e.target.value, domain.name)}
                                  />
                                  <Input
                                    placeholder="Value"
                                    value={record.value}
                                    onChange={(e) => updateRecord(index, 'value', e.target.value, domain.name)}
                                  />
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleRemoveRecord(index, domain.name)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              ))}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const newRecords = { ...bulkRecords };
                                  if (!newRecords[domain.name]) {
                                    newRecords[domain.name] = [];
                                  }
                                  newRecords[domain.name].push({ key: '', value: '' });
                                  setBulkRecords(newRecords);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Record
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {textRecords.map((record, index) => (
                        <div key={index} className="grid gap-4 md:grid-cols-[200px_1fr_auto] items-start p-4 border rounded-lg bg-white hover:border-pink-200 hover:shadow-sm transition-all">
                          <Input
                            placeholder="Key (e.g., url)"
                            value={record.key}
                            onChange={(e) => updateRecord(index, 'key', e.target.value)}
                          />
                          <Input
                            placeholder="Value"
                            value={record.value}
                            onChange={(e) => updateRecord(index, 'value', e.target.value)}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveRecord(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isBulkMode && (
                    <Button variant="outline" onClick={handleAddRecord}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Text Record
                    </Button>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-2">
                    <p className="text-blue-900">Recommended Text Records:</p>
                    <div className="grid gap-2 text-blue-800">
                      <p>• <strong>url</strong> - Link to documentation</p>
                      <p>• <strong>description</strong> - Contract purpose</p>
                      <p>• <strong>notice</strong> - Security/upgrade information</p>
                      <p>• <strong>org.auditor</strong> - Audit firm and report link</p>
                      <p>• <strong>project.version</strong> - Contract version</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Address Records */}
                <TabsContent value="addresses" className="space-y-4 mt-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  ) : isBulkMode ? (
                    <div className="space-y-6">
                      {selectedDomains.map((domain) => {
                        const domainAddr = bulkAddresses[domain.name] || '';
                        return (
                          <div key={domain.name} className="space-y-3 border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <Label className="font-semibold">{domain.name}</Label>
                              <Checkbox
                                checked={selectedBulkDomains.has(domain.name)}
                                onCheckedChange={() => toggleBulkDomain(domain.name)}
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="space-y-2">
                                <Label htmlFor={`address-${domain.name}`}>Ethereum Address</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id={`address-${domain.name}`}
                                    placeholder="0x..."
                                    value={domainAddr}
                                    onChange={(e) => {
                                      setBulkAddresses(prev => ({
                                        ...prev,
                                        [domain.name]: e.target.value,
                                      }));
                                    }}
                                  />
                                  {domainAddr && (
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        navigator.clipboard.writeText(domainAddr);
                                        toast.success('Address copied to clipboard');
                                      }}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                {domainAddr && domain.resolvedAddress && (
                                  <p className="text-sm text-slate-600">
                                    Current: {domain.resolvedAddress}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <Button
                        onClick={handleSaveAddress}
                        disabled={isSaving}
                        className="w-full"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving Addresses...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save All Addresses
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="eth-address">Ethereum Address (ETH)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="eth-address"
                            placeholder="0x..."
                            value={domainAddress}
                            onChange={(e) => setDomainAddress(e.target.value)}
                          />
                          {domainAddress && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(domainAddress);
                                toast.success('Address copied to clipboard');
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {selectedDomain?.resolvedAddress && (
                          <p className="text-sm text-slate-600">
                            Current: {selectedDomain.resolvedAddress}
                          </p>
                        )}
                        <p className="text-slate-600 text-sm">
                          For upgradeable contracts, ensure this points to the proxy, not implementation
                        </p>
                      </div>

                      <Button
                        onClick={handleSaveAddress}
                        disabled={isSaving || !domainAddress || !/^0x[a-fA-F0-9]{40}$/.test(domainAddress)}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Address
                          </>
                        )}
                      </Button>

                      <div className="bg-slate-50 p-4 rounded-lg border">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                          <div>
                            <p className="text-slate-900">Best Practice: Multi-Chain Configuration</p>
                            <p className="text-slate-600">Configure addresses for all chains where your contracts are deployed to provide seamless cross-chain UX</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Content Hash - Placeholder for now */}
                <TabsContent value="content" className="space-y-4 mt-6">
                  <div className="text-center py-8 text-slate-500">
                    Content hash editing coming soon
                  </div>
                </TabsContent>

                {/* ABI - Placeholder for now */}
                <TabsContent value="abi" className="space-y-4 mt-6">
                  <div className="text-center py-8 text-slate-500">
                    ABI editing coming soon
                  </div>
                </TabsContent>
                <TabsContent value="ai" className="space-y-4 mt-6">
                  <AIMetadataGenerator domain={selectedDomain?.name} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
