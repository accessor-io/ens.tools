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
  Code,
  Shield,
  Info,
  Award,
  GitBranch,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../lib/web3-provider';
import { setTextRecord, createSubdomain, combineFuses } from '../lib/ens-write-operations';
import {
  ENSIP19Metadata,
  ENSIP19_CATEGORIES,
  ENSIP19Category,
  ProxyType,
  PROXY_TYPES,
  LifecycleStatus,
  LIFECYCLE_STATUSES,
  generateCanonicalId,
  generateMetadataHash,
  normalizeVersion,
  ENSIP19_SUBCATEGORIES,
} from '../lib/ensip19-utils';
import { validateENSIP19Full, QAValidator } from '../lib/ensip19-validator';
import {
  generateHierarchicalDomain,
  getRecommendedSubcategories,
} from '../lib/ensip19-hierarchical';
import { STANDARD_KEYS } from '../lib/metadata-schemas';

type WorkflowStep = 'contract' | 'naming' | 'classification' | 'security' | 'lifecycle' | 'review';

export function UnifiedContractRegistration() {
  const { walletClient, publicClient, address } = useWeb3();
  const [step, setStep] = useState<WorkflowStep>('contract');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complianceScore, setComplianceScore] = useState<number | null>(null);
  const [validationMode, setValidationMode] = useState<'basic' | 'ensip19'>('ensip19');

  // Contract information
  const [contractAddress, setContractAddress] = useState('');
  const [contractType, setContractType] = useState('');
  const [isProxy, setIsProxy] = useState(false);
  const [implementationAddress, setImplementationAddress] = useState('');
  const [deployedBlock, setDeployedBlock] = useState('');

  // Naming information
  const [parentDomain, setParentDomain] = useState('');
  const [subdomainLabel, setSubdomainLabel] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // ENSIP-19 Basic information
  const [org, setOrg] = useState('');
  const [protocol, setProtocol] = useState('');
  const [role, setRole] = useState('');
  const [variant, setVariant] = useState('');
  const [version, setVersion] = useState('v1-0-0');
  const [chainId, setChainId] = useState(1);

  // Classification
  const [category, setCategory] = useState<ENSIP19Category>('defi');
  const [subcategory, setSubcategory] = useState('');
  const [tags, setTags] = useState('');

  // Security
  const [proxyType, setProxyType] = useState<ProxyType>('immutable');
  const [owners, setOwners] = useState('');
  const [auditFirm, setAuditFirm] = useState('');
  const [auditDate, setAuditDate] = useState('');
  const [auditReport, setAuditReport] = useState('');

  // Lifecycle
  const [lifecycleStatus, setLifecycleStatus] = useState<LifecycleStatus>('deployed');
  const [lifecycleSince, setLifecycleSince] = useState('');
  const [replacedBy, setReplacedBy] = useState('');

  // Standards
  const [ercs, setErcs] = useState('');
  const [interfaces, setInterfaces] = useState('');

  const availableSubcategories = getRecommendedSubcategories(category);

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
      setRole(template.label);
    }
  };

  const generateENSIP19Metadata = async (): Promise<Partial<ENSIP19Metadata>> => {
    const canonicalId = generateCanonicalId({
      org,
      protocol,
      category,
      role,
      version,
      chainId,
      variant: variant || undefined,
    });

    const metadata: Partial<ENSIP19Metadata> = {
      id: canonicalId,
      org,
      protocol,
      category,
      role,
      version,
      chainId,
      addresses: [
        {
          chainId,
          address: contractAddress,
          deployedBlock: deployedBlock ? parseInt(deployedBlock) : undefined,
        },
      ],
    };

    // Add optional fields
    if (variant) metadata.variant = variant;
    if (subcategory) metadata.subcategory = subcategory;

    // Generate ENS root
    metadata.ensRoot = generateHierarchicalDomain({
      org,
      category,
      subcategory: subcategory || undefined,
    });

    // Add proxy information
    if (proxyType !== 'immutable') {
      metadata.proxy = {
        proxyType,
        implementationAddress: implementationAddress || undefined,
      };
      
      if (implementationAddress && metadata.addresses[0]) {
        metadata.addresses[0].implementation = implementationAddress;
      }
    }

    // Add security
    const ownersList = owners.split(',').map(o => o.trim()).filter(Boolean);
    metadata.security = {
      upgradeability: proxyType,
      owners: ownersList.length > 0 ? ownersList : undefined,
    };

    if (auditFirm && auditDate && auditReport) {
      metadata.security.audits = [
        {
          firm: auditFirm,
          date: auditDate,
          report: auditReport,
        },
      ];
    }

    // Add lifecycle
    metadata.lifecycle = {
      status: lifecycleStatus,
      since: lifecycleSince || undefined,
      replacedBy: replacedBy || undefined,
    };

    // Add standards
    const ercsList = ercs.split(',').map(e => e.trim()).filter(Boolean);
    const interfacesList = interfaces.split(',').map(i => i.trim()).filter(Boolean);
    
    if (ercsList.length > 0 || interfacesList.length > 0) {
      metadata.standards = {
        ercs: ercsList.length > 0 ? ercsList : undefined,
        interfaces: interfacesList.length > 0 ? interfacesList : undefined,
      };
    }

    // Add tags
    const tagsList = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagsList.length > 0) {
      metadata.tags = tagsList;
    }

    // Generate metadata hash
    metadata.metadataHash = await generateMetadataHash(metadata);

    return metadata;
  };

  const handleValidate = async () => {
    try {
      const metadata = await generateENSIP19Metadata();
      const validation = validateENSIP19Full(metadata);
      const score = QAValidator.calculateComplianceScore(metadata);

      setComplianceScore(score.score);

      if (validation.errors.length > 0) {
        toast.error('Validation failed', {
          description: validation.errors.join('; '),
        });
      } else {
        toast.success(`ENSIP-19 compliant! Score: ${score.score}/100 (${score.level})`, {
          description: validation.warnings.length > 0
            ? `Warnings: ${validation.warnings.join('; ')}`
            : 'All validations passed',
        });
      }

      if (validation.warnings.length > 0) {
        console.warn('Validation warnings:', validation.warnings);
      }
    } catch (error) {
      toast.error('Validation error', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleRegister = async () => {
    if (!walletClient || !publicClient || !address) {
      toast.error('Wallet not connected');
      return;
    }

    setIsSubmitting(true);
    try {
      let ensName: string;
      let metadataJson: string;

      if (validationMode === 'ensip19') {
        // Generate full ENSIP-19 metadata
        const metadata = await generateENSIP19Metadata();

        // Validate
        const validation = validateENSIP19Full(metadata);
        if (!validation.valid) {
          toast.error('Metadata validation failed', {
            description: validation.errors.join('; '),
          });
          setIsSubmitting(false);
          return;
        }

        ensName = metadata.ensRoot || `${role}.${org}.cns.eth`;
        metadataJson = JSON.stringify(metadata, null, 2);

        // Create ENS subdomain
        toast.info('Creating ENS subdomain...', {
          description: ensName,
        });

        // Store ENSIP-19 metadata
        await setTextRecord(walletClient, publicClient, {
          name: ensName,
          recordType: 'text',
          key: 'ensip19.id',
          value: metadata.id!,
        });

        await setTextRecord(walletClient, publicClient, {
          name: ensName,
          recordType: 'text',
          key: 'ensip19.hash',
          value: metadata.metadataHash!,
        });

        await setTextRecord(walletClient, publicClient, {
          name: ensName,
          recordType: 'text',
          key: 'ensip19.metadata',
          value: metadataJson,
        });
      } else {
        // Basic registration
        ensName = `${subdomainLabel}.${parentDomain}`;

        // Create subdomain
        toast.info('Creating subdomain...', {
          description: ensName,
        });

        const fuses = combineFuses(['PARENT_CANNOT_CONTROL', 'CANNOT_UNWRAP']);
        await createSubdomain(walletClient, {
          parentName: parentDomain,
          label: subdomainLabel,
          owner: address,
          fuses,
        });

        // Basic metadata
        const basicMetadata = {
          contractAddress,
          contractType,
          isProxy,
          implementationAddress: isProxy ? implementationAddress : undefined,
          deployedBlock: deployedBlock ? parseInt(deployedBlock) : undefined,
        };

        metadataJson = JSON.stringify(basicMetadata, null, 2);
      }

      // Store contract address
      await setTextRecord(walletClient, publicClient, {
        name: ensName,
        recordType: 'text',
        key: 'eth.contract.address',
        value: contractAddress,
      });

      // Store contract type
      if (contractType) {
        await setTextRecord(walletClient, publicClient, {
          name: ensName,
          recordType: 'text',
          key: STANDARD_KEYS.CONTRACT_TYPE,
          value: contractType,
        });
      }

      // Store implementation address for proxies
      if (isProxy && implementationAddress) {
        await setTextRecord(walletClient, publicClient, {
          name: ensName,
          recordType: 'text',
          key: STANDARD_KEYS.IMPLEMENTATION,
          value: implementationAddress,
        });
      }

      toast.success('Contract registered successfully!', {
        description: `${ensName} is now ${validationMode === 'ensip19' ? 'ENSIP-19 compliant' : 'registered'}`,
      });

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Registration error:', error);
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
    setDeployedBlock('');
    setParentDomain('');
    setSubdomainLabel('');
    setSelectedTemplate('');
    setOrg('');
    setProtocol('');
    setRole('');
    setVariant('');
    setVersion('v1-0-0');
    setChainId(1);
    setCategory('defi');
    setSubcategory('');
    setTags('');
    setProxyType('immutable');
    setOwners('');
    setAuditFirm('');
    setAuditDate('');
    setAuditReport('');
    setLifecycleStatus('deployed');
    setLifecycleSince('');
    setReplacedBy('');
    setErcs('');
    setInterfaces('');
    setComplianceScore(null);
  };

  const canProceedToNaming = contractAddress.length > 0;
  const canProceedToClassification = parentDomain && subdomainLabel;
  const canProceedToSecurity = validationMode === 'basic' || (org && protocol && role && version);
  const canSubmit = canProceedToClassification && contractAddress;

  const steps = validationMode === 'ensip19' 
    ? ['contract', 'naming', 'classification', 'security', 'lifecycle', 'review']
    : ['contract', 'naming', 'review'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 flex items-center gap-2">
            <Award className="h-6 w-6 text-blue-600" />
            Unified Contract Registration
          </h2>
          <p className="text-slate-600">
            Register contracts with optional ENSIP-19 compliance
          </p>
        </div>
        {complianceScore !== null && (
          <Badge
            variant={complianceScore >= 90 ? 'default' : complianceScore >= 70 ? 'secondary' : 'destructive'}
            className="text-lg px-4 py-2"
          >
            Score: {complianceScore}/100
          </Badge>
        )}
      </div>

      {/* Mode Selection */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Label>Registration Mode</Label>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                onClick={() => setValidationMode('basic')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  validationMode === 'basic'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Basic Registration</h3>
                    <p className="text-slate-600">Simple contract registration with essential metadata</p>
                  </div>
                  {validationMode === 'basic' && (
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </button>
              <button
                onClick={() => setValidationMode('ensip19')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  validationMode === 'ensip19'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">ENSIP-19 Compliant</h3>
                    <p className="text-slate-600">Full specification compliance with canonical ID grammar</p>
                  </div>
                  {validationMode === 'ensip19' && (
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {validationMode === 'ensip19' && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">ENSIP-19 Standard</AlertTitle>
          <AlertDescription className="text-blue-800">
            This registration follows the ENSIP-19 specification with canonical ID grammar, metadata hashing, and full compliance validation.
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Steps */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step === s
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : idx < steps.indexOf(step)
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {idx < steps.indexOf(step) ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className="ml-2 text-slate-700 capitalize hidden md:inline">{s}</span>
                {idx < steps.length - 1 && <div className="w-12 h-0.5 bg-slate-200 mx-4 hidden md:block" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={step} onValueChange={(v) => setStep(v as WorkflowStep)}>
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

                <div className="space-y-2">
                  <Label htmlFor="deployed-block">Deployed Block (Optional)</Label>
                  <Input
                    id="deployed-block"
                    type="number"
                    placeholder="12345678"
                    value={deployedBlock}
                    onChange={(e) => setDeployedBlock(e.target.value)}
                  />
                </div>
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
                  onClick={() => setStep(validationMode === 'ensip19' ? 'classification' : 'review')}
                  disabled={!canProceedToClassification}
                >
                  Next: {validationMode === 'ensip19' ? 'Classification' : 'Review'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classification Step (ENSIP-19 only) */}
        {validationMode === 'ensip19' && (
          <TabsContent value="classification">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-blue-600" />
                  ENSIP-19 Classification
                </CardTitle>
                <CardDescription>
                  Complete ENSIP-19 metadata for full compliance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="org">
                      Organization <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="org"
                      placeholder="uniswap"
                      value={org}
                      onChange={(e) => setOrg(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                    <p className="text-slate-600">Lowercase, hyphen-separated</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="protocol">
                      Protocol <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="protocol"
                      placeholder="uniswap"
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))}
                    />
                    <p className="text-slate-600">Protocol identifier</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">
                      Contract Role <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="role"
                      placeholder="router"
                      value={role}
                      onChange={(e) => setRole(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                    <p className="text-slate-600">Contract function (e.g., router, factory, vault)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="variant">Variant (Optional)</Label>
                    <Input
                      id="variant"
                      placeholder="v3"
                      value={variant}
                      onChange={(e) => setVariant(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                    <p className="text-slate-600">Protocol variant identifier</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="version">
                      Version <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="version"
                      placeholder="v1-0-0"
                      value={version}
                      onChange={(e) => setVersion(normalizeVersion(e.target.value))}
                    />
                    <p className="text-slate-600">Format: v{'{'}num{'}'}-{'{'}num{'}'}-{'{'}num{'}'}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chainId">
                      Chain ID <span className="text-red-600">*</span>
                    </Label>
                    <Select value={chainId.toString()} onValueChange={(v) => setChainId(parseInt(v))}>
                      <SelectTrigger id="chainId">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Ethereum Mainnet (1)</SelectItem>
                        <SelectItem value="10">Optimism (10)</SelectItem>
                        <SelectItem value="137">Polygon (137)</SelectItem>
                        <SelectItem value="8453">Base (8453)</SelectItem>
                        <SelectItem value="42161">Arbitrum (42161)</SelectItem>
                        <SelectItem value="11155111">Sepolia (11155111)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Primary Category <span className="text-red-600">*</span>
                    </Label>
                    <Select value={category} onValueChange={(v) => {
                      setCategory(v as ENSIP19Category);
                      setSubcategory('');
                    }}>
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENSIP19_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Subcategory</Label>
                    <Select value={subcategory} onValueChange={setSubcategory}>
                      <SelectTrigger id="subcategory">
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubcategories.map((sub) => (
                          <SelectItem key={sub} value={sub}>
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-slate-600">
                      {availableSubcategories.length} recommended subcategories for {category}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ercs">ERC Standards (comma-separated)</Label>
                    <Input
                      id="ercs"
                      placeholder="ERC20, ERC721"
                      value={ercs}
                      onChange={(e) => setErcs(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interfaces">Interface IDs (comma-separated)</Label>
                    <Input
                      id="interfaces"
                      placeholder="0x01ffc9a7, 0x80ac58cd"
                      value={interfaces}
                      onChange={(e) => setInterfaces(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      placeholder="dex, swap, amm"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
                </div>

                {org && protocol && role && version && (
                  <Alert className="border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertTitle className="text-emerald-900">Canonical ID Preview</AlertTitle>
                    <AlertDescription className="text-emerald-800 font-mono">
                      {org}.{protocol}.{category}.{role}{variant ? `.${variant}` : ''}.{version}.{chainId}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep('naming')}>
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep('security')}
                    disabled={!canProceedToSecurity}
                  >
                    Next: Security
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Security Step (ENSIP-19 only) */}
        {validationMode === 'ensip19' && (
          <TabsContent value="security">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Security Information
                </CardTitle>
                <CardDescription>
                  Proxy configuration, audits, and ownership details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="proxy-type">Proxy Type</Label>
                  <Select value={proxyType} onValueChange={(v) => setProxyType(v as ProxyType)}>
                    <SelectTrigger id="proxy-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROXY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {proxyType !== 'immutable' && (
                  <div className="space-y-2">
                    <Label htmlFor="implementation">Implementation Address</Label>
                    <Input
                      id="implementation"
                      placeholder="0x..."
                      value={implementationAddress}
                      onChange={(e) => setImplementationAddress(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="owners">Contract Owners (comma-separated addresses)</Label>
                  <Textarea
                    id="owners"
                    placeholder="0x..., 0x..."
                    value={owners}
                    onChange={(e) => setOwners(e.target.value)}
                    rows={2}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-slate-900">Security Audit</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="audit-firm">Audit Firm</Label>
                    <Input
                      id="audit-firm"
                      placeholder="Trail of Bits"
                      value={auditFirm}
                      onChange={(e) => setAuditFirm(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="audit-date">Audit Date</Label>
                      <Input
                        id="audit-date"
                        type="date"
                        value={auditDate}
                        onChange={(e) => setAuditDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="audit-report">Audit Report URL</Label>
                      <Input
                        id="audit-report"
                        placeholder="https://..."
                        value={auditReport}
                        onChange={(e) => setAuditReport(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep('classification')}>
                    Back
                  </Button>
                  <Button onClick={() => setStep('lifecycle')}>
                    Next: Lifecycle
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Lifecycle Step (ENSIP-19 only) */}
        {validationMode === 'ensip19' && (
          <TabsContent value="lifecycle">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Lifecycle Management
                </CardTitle>
                <CardDescription>
                  Deployment status and version management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="status">Lifecycle Status</Label>
                  <Select value={lifecycleStatus} onValueChange={(v) => setLifecycleStatus(v as LifecycleStatus)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIFECYCLE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="since">Deployed Since</Label>
                  <Input
                    id="since"
                    type="datetime-local"
                    value={lifecycleSince}
                    onChange={(e) => setLifecycleSince(e.target.value)}
                  />
                </div>

                {lifecycleStatus === 'deprecated' && (
                  <div className="space-y-2">
                    <Label htmlFor="replaced-by">Replaced By (Canonical ID)</Label>
                    <Input
                      id="replaced-by"
                      placeholder="org.protocol.category.role.v2-0-0.1"
                      value={replacedBy}
                      onChange={(e) => setReplacedBy(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep('security')}>
                    Back
                  </Button>
                  <Button onClick={() => setStep('review')}>
                    Next: Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

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
                    <code className="text-blue-600">
                      {validationMode === 'ensip19' 
                        ? generateHierarchicalDomain({ org, category, subcategory: subcategory || undefined })
                        : `${subdomainLabel}.${parentDomain}`
                      }
                    </code>
                  </p>
                </div>

                {validationMode === 'ensip19' && (
                  <>
                    <div>
                      <Label className="text-slate-600">Canonical ID</Label>
                      <p className="text-slate-900 font-mono">
                        {org}.{protocol}.{category}.{role}{variant ? `.${variant}` : ''}.{version}.{chainId}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-600">Category</Label>
                      <p className="text-slate-900">
                        {category.toUpperCase()}
                        {subcategory && ` / ${subcategory}`}
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-600">Proxy Type</Label>
                      <p className="text-slate-900">{proxyType}</p>
                    </div>

                    <div>
                      <Label className="text-slate-600">Lifecycle Status</Label>
                      <p className="text-slate-900">{lifecycleStatus}</p>
                    </div>
                  </>
                )}
              </div>

              {validationMode === 'ensip19' && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleValidate} className="flex-1">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Validate ENSIP-19
                    </Button>
                  </div>
                </>
              )}

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">Confirm Transaction</AlertTitle>
                <AlertDescription className="text-amber-800">
                  This will {validationMode === 'ensip19' ? 'create an ENS subdomain and store ENSIP-19 metadata' : 'create a subdomain and set metadata records'}. Make sure all information is correct.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setStep(validationMode === 'ensip19' ? 'lifecycle' : 'naming')}>
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
