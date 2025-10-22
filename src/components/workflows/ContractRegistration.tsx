import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Save,
  ExternalLink,
  Code,
  Shield,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../lib/web3-provider';
import { setTextRecord, createSubdomain, combineFuses } from '../lib/ens-write-operations';
import {
  ALL_SCHEMAS,
  getRecommendedSchema,
  validateMetadata,
  MetadataSchema,
  STANDARD_KEYS,
} from '../lib/metadata-schemas';

interface ContractInfo {
  address: string;
  ensName: string;
  contractType: string;
  isProxy: boolean;
  implementationAddress?: string;
}

export function ContractRegistration() {
  const { walletClient, publicClient, address } = useWeb3();
  const [step, setStep] = useState<'contract' | 'naming' | 'metadata' | 'review'>('contract');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contract info
  const [contractAddress, setContractAddress] = useState('');
  const [contractType, setContractType] = useState('');
  const [isProxy, setIsProxy] = useState(false);
  const [implementationAddress, setImplementationAddress] = useState('');

  // Naming info
  const [parentDomain, setParentDomain] = useState('');
  const [subdomainLabel, setSubdomainLabel] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Metadata
  const [selectedSchema, setSelectedSchema] = useState<MetadataSchema | null>(null);
  const [metadata, setMetadata] = useState<Record<string, string>>({});

  // Common naming templates
  const namingTemplates = [
    { id: 'app', label: 'app', desc: 'Main application contract' },
    { id: 'dao', label: 'dao', desc: 'Governance contract' },
    { id: 'vault', label: 'vault', desc: 'Treasury/vault contract' },
    { id: 'token', label: 'token', desc: 'Token contract' },
    { id: 'nft', label: 'nft', desc: 'NFT collection contract' },
    { id: 'staking', label: 'staking', desc: 'Staking contract' },
    { id: 'oracle', label: 'oracle', desc: 'Price oracle contract' },
    { id: 'registry', label: 'registry', desc: 'Registry contract' },
    { id: 'custom', label: '', desc: 'Custom subdomain' },
  ];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = namingTemplates.find(t => t.id === templateId);
    if (template && template.id !== 'custom') {
      setSubdomainLabel(template.label);
      
      // Auto-select schema based on template
      const schema = getRecommendedSchema(`${template.label}.example.eth`);
      setSelectedSchema(schema);
    }
  };

  const updateMetadataField = (key: string, value: string) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  const handleRegister = async () => {
    if (!walletClient || !publicClient || !address) {
      toast.error('Wallet not connected');
      return;
    }

    // Validate
    if (!contractAddress || !parentDomain || !subdomainLabel) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedSchema) {
      const validation = validateMetadata(metadata, selectedSchema);
      if (!validation.valid) {
        toast.error('Metadata validation failed', {
          description: validation.errors.join(', '),
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const fullName = `${subdomainLabel}.${parentDomain}`;

      // Step 1: Create subdomain
      toast.info('Creating subdomain...', {
        description: fullName,
      });

      const fuses = combineFuses(['PARENT_CANNOT_CONTROL', 'CANNOT_UNWRAP']);
      await createSubdomain(walletClient, {
        parentName: parentDomain,
        label: subdomainLabel,
        owner: address,
        fuses,
      });

      // Step 2: Set contract address record
      toast.info('Setting contract address...');
      await setTextRecord(walletClient, publicClient, {
        name: fullName,
        recordType: 'text',
        key: STANDARD_KEYS.CONTRACT_ADDRESS,
        value: contractAddress,
      });

      // Step 3: Set metadata
      if (Object.keys(metadata).length > 0) {
        toast.info('Setting metadata records...');
        for (const [key, value] of Object.entries(metadata)) {
          if (value) {
            await setTextRecord(walletClient, publicClient, {
              name: fullName,
              recordType: 'text',
              key,
              value,
            });
          }
        }
      }

      // Step 4: Set contract-specific metadata
      if (isProxy && implementationAddress) {
        await setTextRecord(walletClient, publicClient, {
          name: fullName,
          recordType: 'text',
          key: STANDARD_KEYS.IMPLEMENTATION,
          value: implementationAddress,
        });
      }

      if (contractType) {
        await setTextRecord(walletClient, publicClient, {
          name: fullName,
          recordType: 'text',
          key: STANDARD_KEYS.CONTRACT_TYPE,
          value: contractType,
        });
      }

      toast.success('Contract registered successfully!', {
        description: `${fullName} now resolves to ${contractAddress}`,
      });

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error registering contract:', error);
      toast.error('Registration failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('contract');
    setContractAddress('');
    setContractType('');
    setIsProxy(false);
    setImplementationAddress('');
    setParentDomain('');
    setSubdomainLabel('');
    setSelectedTemplate('');
    setMetadata({});
    setSelectedSchema(null);
  };

  const canProceedToNaming = contractAddress.length > 0;
  const canProceedToMetadata = parentDomain && subdomainLabel;
  const canSubmit = canProceedToMetadata && contractAddress;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-slate-900">Contract Registration</h2>
        <p className="text-slate-600">
          Register a smart contract to an ENS name with complete metadata
        </p>
      </div>

      {/* Progress Steps */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {['contract', 'naming', 'metadata', 'review'].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step === s
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : idx < ['contract', 'naming', 'metadata', 'review'].indexOf(step)
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {idx < ['contract', 'naming', 'metadata', 'review'].indexOf(step) ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className="ml-2 text-slate-700 capitalize hidden md:inline">{s}</span>
                {idx < 3 && <div className="w-12 h-0.5 bg-slate-200 mx-4 hidden md:block" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={step} onValueChange={(v) => setStep(v as any)}>
        {/* Contract Info Step */}
        <TabsContent value="contract">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-blue-600" />
                Contract Information
              </CardTitle>
              <CardDescription>
                Enter the smart contract details you want to register
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900">Contract Ownership</AlertTitle>
                <AlertDescription className="text-blue-800">
                  You must own or control the contract to register it. For upgradeable contracts, use the proxy address.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contract-address">
                    Contract Address <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="contract-address"
                    placeholder="0x..."
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                  />
                  <p className="text-slate-600">
                    The deployed contract address (use proxy for upgradeable contracts)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract-type">Contract Type</Label>
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger id="contract-type">
                      <SelectValue placeholder="Select contract type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ERC20">ERC20 Token</SelectItem>
                      <SelectItem value="ERC721">ERC721 NFT</SelectItem>
                      <SelectItem value="ERC1155">ERC1155 Multi-Token</SelectItem>
                      <SelectItem value="Governor">Governor/DAO</SelectItem>
                      <SelectItem value="Vault">Vault/Treasury</SelectItem>
                      <SelectItem value="Staking">Staking</SelectItem>
                      <SelectItem value="Oracle">Oracle</SelectItem>
                      <SelectItem value="Registry">Registry</SelectItem>
                      <SelectItem value="Custom">Custom Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-proxy"
                    checked={isProxy}
                    onChange={(e) => setIsProxy(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is-proxy">This is an upgradeable/proxy contract</Label>
                </div>

                {isProxy && (
                  <div className="space-y-2">
                    <Label htmlFor="implementation">Implementation Address</Label>
                    <Input
                      id="implementation"
                      placeholder="0x..."
                      value={implementationAddress}
                      onChange={(e) => setImplementationAddress(e.target.value)}
                    />
                    <p className="text-slate-600">
                      The implementation contract address (if using a proxy pattern)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setStep('naming')}
                  disabled={!canProceedToNaming}
                >
                  Next: Naming
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Naming Step */}
        <TabsContent value="naming">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-blue-600" />
                ENS Name Configuration
              </CardTitle>
              <CardDescription>
                Choose how you want to name this contract
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="parent-domain">
                  Parent Domain <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="parent-domain"
                  placeholder="company.eth"
                  value={parentDomain}
                  onChange={(e) => setParentDomain(e.target.value)}
                />
                <p className="text-slate-600">
                  Your root ENS name (must be owned by your connected wallet)
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Naming Template</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {namingTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        selectedTemplate === template.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <code className="text-blue-600">
                          {template.label || 'custom'}.{parentDomain || 'example.eth'}
                        </code>
                        {selectedTemplate === template.id && (
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <p className="text-slate-600 mt-1">{template.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain-label">
                  Subdomain Label <span className="text-red-600">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="subdomain-label"
                    placeholder="app"
                    value={subdomainLabel}
                    onChange={(e) => setSubdomainLabel(e.target.value)}
                  />
                  <span className="text-slate-600">.{parentDomain || 'example.eth'}</span>
                </div>
              </div>

              {subdomainLabel && parentDomain && (
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-900">Full ENS Name</AlertTitle>
                  <AlertDescription className="text-emerald-800">
                    <code>{subdomainLabel}.{parentDomain}</code> will resolve to <code>{contractAddress}</code>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setStep('contract')}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep('metadata')}
                  disabled={!canProceedToMetadata}
                >
                  Next: Metadata
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata Step */}
        <TabsContent value="metadata">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Contract Metadata
              </CardTitle>
              <CardDescription>
                Add standardized metadata for better discoverability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Metadata Schema</Label>
                <Select
                  value={selectedSchema?.id || ''}
                  onValueChange={(id) => {
                    const schema = ALL_SCHEMAS.find(s => s.id === id);
                    setSelectedSchema(schema || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a schema" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SCHEMAS.map(schema => (
                      <SelectItem key={schema.id} value={schema.id}>
                        {schema.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSchema && (
                  <p className="text-slate-600">{selectedSchema.description}</p>
                )}
              </div>

              {selectedSchema && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    {selectedSchema.fields.map(field => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={field.key}>
                          {field.label}
                          {field.required && <span className="text-red-600 ml-1">*</span>}
                        </Label>
                        <p className="text-slate-600">{field.description}</p>
                        {field.type === 'text' && field.key === STANDARD_KEYS.DESCRIPTION ? (
                          <Textarea
                            id={field.key}
                            value={metadata[field.key] || ''}
                            onChange={(e) => updateMetadataField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            rows={3}
                          />
                        ) : (
                          <Input
                            id={field.key}
                            value={metadata[field.key] || ''}
                            onChange={(e) => updateMetadataField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setStep('naming')}>
                  Back
                </Button>
                <Button onClick={() => setStep('review')}>
                  Next: Review
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Step */}
        <TabsContent value="review">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Review & Register
              </CardTitle>
              <CardDescription>
                Review all details before registering the contract
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-600">Contract Address</Label>
                  <p className="text-slate-900 break-all">{contractAddress}</p>
                </div>

                {contractType && (
                  <div>
                    <Label className="text-slate-600">Contract Type</Label>
                    <p className="text-slate-900">{contractType}</p>
                  </div>
                )}

                {isProxy && implementationAddress && (
                  <div>
                    <Label className="text-slate-600">Implementation</Label>
                    <p className="text-slate-900 break-all">{implementationAddress}</p>
                  </div>
                )}

                <Separator />

                <div>
                  <Label className="text-slate-600">ENS Name</Label>
                  <p className="text-slate-900">
                    <code className="text-blue-600">{subdomainLabel}.{parentDomain}</code>
                  </p>
                </div>

                <Separator />

                {selectedSchema && Object.keys(metadata).length > 0 && (
                  <>
                    <div>
                      <Label className="text-slate-600">Metadata Schema</Label>
                      <p className="text-slate-900">{selectedSchema.name}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-600">Metadata Fields</Label>
                      {Object.entries(metadata).map(([key, value]) => (
                        value && (
                          <div key={key} className="p-3 border rounded-lg">
                            <code className="text-slate-700">{key}</code>
                            <p className="text-slate-900 mt-1">{value}</p>
                          </div>
                        )
                      ))}
                    </div>
                  </>
                )}
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">Confirm Transaction</AlertTitle>
                <AlertDescription className="text-amber-800">
                  This will create a subdomain and set all metadata records. Make sure all information is correct.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setStep('metadata')}>
                  Back
                </Button>
                <Button
                  onClick={handleRegister}
                  disabled={!canSubmit || isSubmitting}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Registering...' : 'Register Contract'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
