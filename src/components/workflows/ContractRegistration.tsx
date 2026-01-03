import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Breadcrumb } from '../ui/breadcrumb';
import {
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Save,
  Code,
  Shield,
  Info,
  DollarSign,
  XCircle,
  Copy,
  Download,
  Network,
  Lightbulb,
  Zap,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services';
import { setTextRecord, createSubdomain, combineFuses } from '../../lib/ens/ens-write-operations';
import { DomainSelector } from '../ui/domain-selector';
import { checkNameAvailability } from '../../lib/ens/ens-utils';
import {
  ALL_SCHEMAS,
  getRecommendedSchema,
  validateMetadata,
  MetadataSchema,
  STANDARD_KEYS,
} from '../../lib/metadata/metadata-schemas';
import { storeCompleteMetadataPackage, formatBaseMetadataReference } from '../../lib/services/base-metadata-service';
import { feeCollectionService } from '../../lib/services/fee-collection-service';
import { namehash } from '../../lib/ens/ens-helpers';
import { generateMetadataHash } from '../../lib/metadata/ensipx-utils';
import { formatEther } from 'viem';
import { usePersistentState } from '../../lib/hooks/usePersistentState';

const DRAFT_KEY = 'contract-registration-draft';

export function ContractRegistration() {
  const { walletClient, publicClient, address } = useWeb3();
  const [step, setStep] = useState<'contract' | 'naming' | 'metadata' | 'review'>('contract');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Draft state - auto-save form data
  const [draft, setDraft] = usePersistentState<{
    contractAddress: string;
    contractType: string;
    isProxy: boolean;
    implementationAddress: string;
    parentDomain: string;
    subdomainLabel: string;
    selectedTemplate: string;
    selectedSchemaId: string | null;
    metadata: Record<string, string>;
    step: 'contract' | 'naming' | 'metadata' | 'review';
  }>(DRAFT_KEY, {
    contractAddress: '',
    contractType: '',
    isProxy: false,
    implementationAddress: '',
    parentDomain: '',
    subdomainLabel: '',
    selectedTemplate: '',
    selectedSchemaId: null,
    metadata: {},
    step: 'contract',
  });

  // Contract info
  const [contractAddress, setContractAddress] = useState(draft.contractAddress);
  const [contractType, setContractType] = useState(draft.contractType);
  const [isProxy, setIsProxy] = useState(draft.isProxy);
  const [implementationAddress, setImplementationAddress] = useState(draft.implementationAddress);
  const [isContract, setIsContract] = useState<boolean | null>(null);
  const [isCheckingContract, setIsCheckingContract] = useState(false);
  const [registrationFee, setRegistrationFee] = useState<bigint>(0n);
  const [isLoadingFee, setIsLoadingFee] = useState(false);

  // Naming info
  const [parentDomain, setParentDomain] = useState(draft.parentDomain);
  const [subdomainLabel, setSubdomainLabel] = useState(draft.subdomainLabel);
  const [selectedTemplate, setSelectedTemplate] = useState(draft.selectedTemplate);
  const [namingTab, setNamingTab] = useState<'templates' | 'validator' | 'hierarchy' | 'generator'>('templates');
  const [templateSearch, setTemplateSearch] = useState('');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [nameAvailability, setNameAvailability] = useState<{ available: boolean; checked: boolean }>({ available: false, checked: false });
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    score: number;
    issues: Array<{ type: 'error' | 'warning' | 'info'; message: string }>;
    suggestions: string[];
  } | null>(null);

  // Metadata
  const [selectedSchema, setSelectedSchema] = useState<MetadataSchema | null>(
    draft.selectedSchemaId ? ALL_SCHEMAS.find(s => s.id === draft.selectedSchemaId) || null : null
  );
  const [metadata, setMetadata] = useState<Record<string, string>>(draft.metadata);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // Extended naming templates with categories
  const namingTemplates = [
    { id: 'app', label: 'app', desc: 'Main application contract', category: 'core' },
    { id: 'dao', label: 'dao', desc: 'Governance contract', category: 'core' },
    { id: 'vault', label: 'vault', desc: 'Treasury/vault contract', category: 'core' },
    { id: 'token', label: 'token', desc: 'Token contract', category: 'core' },
    { id: 'registry', label: 'registry', desc: 'Registry contract', category: 'core' },
    { id: 'nft', label: 'nft', desc: 'NFT collection contract', category: 'core' },
    { id: 'staking', label: 'staking', desc: 'Staking contract', category: 'infrastructure' },
    { id: 'oracle', label: 'oracle', desc: 'Price oracle contract', category: 'infrastructure' },
    { id: 'api', label: 'api', desc: 'API gateway contract', category: 'infrastructure' },
    { id: 'bridge', label: 'bridge', desc: 'Cross-chain bridge contract', category: 'infrastructure' },
    { id: 'dev', label: 'dev', desc: 'Development environment', category: 'environment' },
    { id: 'staging', label: 'staging', desc: 'Staging environment', category: 'environment' },
    { id: 'custom', label: '', desc: 'Custom subdomain', category: 'custom' },
  ];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = namingTemplates.find(t => t.id === templateId);
    if (template && template.id !== 'custom') {
      setSubdomainLabel(template.label);
      
      // Auto-select schema based on template
      const schema = getRecommendedSchema(`${template.label}.example.eth`);
      setSelectedSchema(schema);
      
      // Auto-validate the generated name and switch to validator tab
      if (parentDomain) {
        const fullName = `${template.label}.${parentDomain}`;
        const result = validateNaming(fullName);
        setValidationResult(result);
        setNamingTab('validator');
        checkNameAvailabilityAsync(fullName);
      }
    }
  };

  // Check name availability
  const checkNameAvailabilityAsync = async (fullName: string) => {
    if (!publicClient || !fullName || !parentDomain) {
      setNameAvailability({ available: false, checked: false });
      return;
    }
    
    setIsCheckingAvailability(true);
    try {
      const available = await checkNameAvailability(publicClient, fullName);
      setNameAvailability({ available, checked: true });
    } catch (error) {
      console.error('Error checking name availability:', error);
      setNameAvailability({ available: false, checked: false });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Get recommended templates based on contract type
  const getRecommendedTemplates = (): Array<{ id: string; label: string; desc: string; category: string; recommended?: boolean }> => {
    if (!contractType) return namingTemplates.map(t => ({ ...t, recommended: false }));
    
    const typeMap: Record<string, string[]> = {
      'ERC20': ['token'],
      'ERC721': ['nft', 'token'],
      'ERC1155': ['nft', 'token'],
      'Governor': ['dao'],
      'Vault': ['vault'],
      'Staking': ['staking'],
      'Oracle': ['oracle'],
      'Registry': ['registry'],
      'Custom': [],
    };
    
    const recommendedIds = typeMap[contractType] || [];
    return namingTemplates.map(t => ({
      ...t,
      recommended: recommendedIds.includes(t.id),
    }));
  };

  const validateNaming = (name: string): {
    isValid: boolean;
    score: number;
    issues: Array<{ type: 'error' | 'warning' | 'info'; message: string }>;
    suggestions: string[];
  } => {
    const issues: Array<{ type: 'error' | 'warning' | 'info'; message: string }> = [];
    const suggestions: string[] = [];
    let score = 100;

    if (!name.trim()) {
      return {
        isValid: false,
        score: 0,
        issues: [{ type: 'error', message: 'Domain name cannot be empty' }],
        suggestions: []
      };
    }

    const parts = name.toLowerCase().split('.');
    if (parts.length < 2) {
      issues.push({ type: 'error', message: 'Must be a valid subdomain (e.g., app.company.eth)' });
      score -= 30;
    }

    const subdomain = parts[0];
    if (subdomain.length < 2) {
      issues.push({ type: 'warning', message: 'Subdomain is very short (< 2 characters)' });
      score -= 10;
    }
    if (subdomain.length > 20) {
      issues.push({ type: 'warning', message: 'Subdomain is quite long (> 20 characters). Consider abbreviation.' });
      score -= 10;
    }

    if (!/^[a-z0-9-]+$/i.test(subdomain)) {
      issues.push({ type: 'error', message: 'Subdomain contains invalid characters. Use only alphanumeric and hyphens.' });
      score -= 25;
    }

    if (/--/.test(subdomain)) {
      issues.push({ type: 'warning', message: 'Avoid consecutive hyphens' });
      score -= 5;
    }

    if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
      issues.push({ type: 'error', message: 'Subdomain cannot start or end with a hyphen' });
      score -= 15;
    }

    const bestPracticePatterns = ['app', 'dao', 'vault', 'registry', 'api', 'token', 'bridge', 'oracle'];
    const matchesPattern = bestPracticePatterns.some(pattern => subdomain === pattern);
    
    if (matchesPattern) {
      issues.push({ type: 'info', message: '✓ Follows recommended naming pattern' });
      suggestions.push('This is a well-established convention for critical contracts');
    } else {
      suggestions.push('Consider using standard patterns: app, dao, vault, registry, or api');
      score -= 5;
    }

    const envPatterns = ['dev', 'staging', 'prod', 'production'];
    const isEnv = envPatterns.some(env => subdomain.includes(env));
    
    if (isEnv) {
      issues.push({ type: 'info', message: '✓ Environment-specific naming detected' });
      if (subdomain === 'prod' || subdomain === 'production') {
        suggestions.push('Consider omitting environment prefix for production (use "app" instead of "prod-app")');
      }
    }

    if (subdomain.length >= 3 && !subdomain.includes('-')) {
      issues.push({ type: 'info', message: '✓ Clear, descriptive name' });
    }

    if (parts.length === 2 || (parts.length === 3 && parts[2] === 'eth')) {
      if (!isEnv && matchesPattern) {
        suggestions.push('✓ Recommended: Wrap this name and burn CANNOT_UNWRAP, CANNOT_SET_RESOLVER fuses');
      }
    }

    const isValid = !issues.some(issue => issue.type === 'error');

    return {
      isValid,
      score: Math.max(0, score),
      issues,
      suggestions
    };
  };

  const handleValidateName = () => {
    if (subdomainLabel && parentDomain) {
      const fullName = `${subdomainLabel}.${parentDomain}`;
      const result = validateNaming(fullName);
      setValidationResult(result);
    } else {
      toast.error('Please enter both subdomain and parent domain');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const generateHierarchy = () => {
    if (!parentDomain) return [];
    return [
      {
        level: 0,
        name: parentDomain,
        type: 'Root Domain',
        children: [
          { name: `app.${parentDomain}`, type: 'Application', security: 'High' },
          { name: `dao.${parentDomain}`, type: 'Governance', security: 'Critical' },
          { name: `vault.${parentDomain}`, type: 'Treasury', security: 'Critical' },
          { name: `api.${parentDomain}`, type: 'Infrastructure', security: 'Medium' },
          { name: `dev.${parentDomain}`, type: 'Development', security: 'Low' }
        ]
      }
    ];
  };

  const updateMetadataField = (key: string, value: string) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  // Initialize fee collection service
  useEffect(() => {
    if (publicClient && walletClient) {
      feeCollectionService.setClients(publicClient, walletClient);
      loadRegistrationFee();
    }
  }, [publicClient, walletClient]);

  // Load registration fee
  const loadRegistrationFee = async () => {
    if (!publicClient) return;
    setIsLoadingFee(true);
    try {
      const fee = await feeCollectionService.getRegistrationFee();
      setRegistrationFee(fee);
    } catch (error) {
      console.error('Error loading registration fee:', error);
    } finally {
      setIsLoadingFee(false);
    }
  };

  // Check if address is a contract
  useEffect(() => {
    const checkIsContract = async () => {
      if (!contractAddress || !publicClient) {
        setIsContract(null);
        return;
      }

      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        setIsContract(null);
        return;
      }

      setIsCheckingContract(true);
      try {
        const bytecode = await publicClient.getBytecode({ 
          address: contractAddress as `0x${string}` 
        });
        setIsContract(bytecode ? (bytecode !== '0x' && bytecode.length > 2) : false);
      } catch (error) {
        console.error('Error checking if address is contract:', error);
        setIsContract(false);
      } finally {
        setIsCheckingContract(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkIsContract, 500);
    return () => clearTimeout(timeoutId);
  }, [contractAddress, publicClient]);

  // Real-time validation when subdomain or parent changes
  useEffect(() => {
    if (subdomainLabel && parentDomain) {
      const fullName = `${subdomainLabel}.${parentDomain}`;
      const result = validateNaming(fullName);
      setValidationResult(result);
      
      // Check availability with debounce
      const timeoutId = setTimeout(() => {
        checkNameAvailabilityAsync(fullName);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setValidationResult(null);
      setNameAvailability({ available: false, checked: false });
    }
  }, [subdomainLabel, parentDomain]);

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
      const nameHash = namehash(fullName);

      // Step 0: Pay registration fee
      if (registrationFee > 0n && address) {
        toast.info('Paying registration fee...', {
          description: `${formatEther(registrationFee)} ETH`,
        });

        try {
          await feeCollectionService.payRegistrationFee(
            address as `0x${string}`,
            contractAddress as `0x${string}`,
            fullName
          );
          toast.success('Registration fee paid');
        } catch (error) {
          console.error('Error paying registration fee:', error);
          toast.error('Failed to pay registration fee', {
            description: error instanceof Error ? error.message : 'Unknown error',
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Step 1: Create subdomain
      toast.info('Creating subdomain...', {
        description: fullName,
      });

      const fuses = combineFuses(['PARENT_CANNOT_CONTROL', 'CANNOT_UNWRAP']);
      await createSubdomain(walletClient, publicClient, {
        parentName: parentDomain,
        label: subdomainLabel,
        owner: address,
        fuses,
      });

      // Step 2: Store metadata on Base chain for cross-chain resolution
      if (selectedSchema && Object.keys(metadata).length > 0) {
        toast.info('Storing metadata on Base chain...', {
          description: 'Deploying metadata to Base for cross-chain access',
        });

        try {
          const contractMetadata: Record<string, string> = {
            ...metadata,
          };
          
          if (contractAddress) contractMetadata.contractAddress = contractAddress;
          if (contractType) contractMetadata.contractType = contractType;
          if (isProxy && implementationAddress) contractMetadata.implementationAddress = implementationAddress;

          const metadataHash = await generateMetadataHash(contractMetadata);

          // Get current chain ID or default to Ethereum Mainnet
          const currentChainId = publicClient?.chain?.id || 1;
          
          await storeCompleteMetadataPackage(walletClient, {
            nameHash,
            canonicalId: `${contractAddress}-${currentChainId}`,
            metadata: contractMetadata,
            crossChainPointers: [{
              chainId: currentChainId,
              contractAddress,
              metadataHash,
            }],
          });

          toast.success('Metadata stored on Base', {
            description: 'Metadata is now accessible from any EVM network',
          });

          // Store reference pointer in ENS
          const baseMetadataReference = formatBaseMetadataReference({
            nameHash,
            canonicalId: `${contractAddress}-${currentChainId}`,
            metadataHash,
          });

          await setTextRecord(walletClient, publicClient, {
            name: fullName,
            recordType: 'text',
            key: 'metadata.base',
            value: baseMetadataReference,
          });
        } catch (error) {
          console.error('Error storing metadata on Base:', error);
          toast.warning('Failed to store on Base, continuing with ENS-only storage', {
            description: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Step 3-5: Batch all metadata records into a single transaction
      toast.info('Setting metadata records...');
      const { TransactionBuilder } = await import('../../lib/ens/transaction-builder');
      const builder = new TransactionBuilder(publicClient, walletClient);
      
      // Add contract address
      builder.addTextRecord(fullName, STANDARD_KEYS.CONTRACT_ADDRESS, contractAddress);
      
      // Add metadata records
      if (Object.keys(metadata).length > 0) {
        for (const [key, value] of Object.entries(metadata)) {
          if (value) {
            builder.addTextRecord(fullName, key, value);
          }
        }
      }
      
      // Add contract-specific metadata
      if (isProxy && implementationAddress) {
        builder.addTextRecord(fullName, STANDARD_KEYS.IMPLEMENTATION, implementationAddress);
      }
      
      if (contractType) {
        builder.addTextRecord(fullName, STANDARD_KEYS.CONTRACT_TYPE, contractType);
      }
      
      // Execute all metadata updates in a single batched transaction
      await builder.execute();

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

  // Auto-save draft when form changes
  useEffect(() => {
    setDraft({
      contractAddress,
      contractType,
      isProxy,
      implementationAddress,
      parentDomain,
      subdomainLabel,
      selectedTemplate,
      selectedSchemaId: selectedSchema?.id || null,
      metadata,
      step,
    });
  }, [contractAddress, contractType, isProxy, implementationAddress, parentDomain, subdomainLabel, selectedTemplate, selectedSchema, metadata, step, setDraft]);

  // Restore draft on mount
  useEffect(() => {
    if (draft.contractAddress || draft.parentDomain || draft.subdomainLabel) {
      setHasRestoredDraft(true);
      if (draft.step) setStep(draft.step);
      if (draft.selectedSchemaId) {
        const schema = ALL_SCHEMAS.find(s => s.id === draft.selectedSchemaId);
        if (schema) setSelectedSchema(schema);
      }
      toast.info('Draft restored', {
        description: 'Your previous form data has been restored',
      });
    }
  }, []); // Only run on mount

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
    setIsContract(null);
    setIsCheckingContract(false);
    // Clear draft
    setDraft({
      contractAddress: '',
      contractType: '',
      isProxy: false,
      implementationAddress: '',
      parentDomain: '',
      subdomainLabel: '',
      selectedTemplate: '',
      selectedSchemaId: null,
      metadata: {},
      step: 'contract',
    });
  };

  const canProceedToNaming = contractAddress.length > 0 && isContract === true;
  const canProceedToMetadata = parentDomain && subdomainLabel && validationResult?.isValid && nameAvailability.checked && nameAvailability.available;
  const canSubmit = canProceedToMetadata && contractAddress && isContract === true && validationResult?.isValid && nameAvailability.available;

  // Get blocking reasons for next step
  const getNamingBlockers = () => {
    const blockers: string[] = [];
    if (!parentDomain) blockers.push('Select a parent domain');
    if (!subdomainLabel) blockers.push('Enter a subdomain label');
    if (validationResult && !validationResult.isValid) blockers.push('Fix validation errors');
    if (nameAvailability.checked && !nameAvailability.available) blockers.push('Name is already taken');
    return blockers;
  };

  const getMetadataBlockers = () => {
    const blockers: string[] = [];
    if (!selectedSchema) blockers.push('Select a metadata schema');
    if (selectedSchema) {
      const validation = validateMetadata(metadata, selectedSchema);
      if (!validation.valid) {
        blockers.push(...validation.errors);
      }
    }
    return blockers;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">Contract Registration</h2>
          <p className="text-slate-600">
            Register a smart contract to an ENS name with complete metadata
          </p>
        </div>
        {hasRestoredDraft && (
          <Badge variant="outline" className="bg-blue-50 border-blue-200">
            Draft Restored
          </Badge>
        )}
      </div>

      {/* Progress Steps */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <Breadcrumb
            items={['contract', 'naming', 'metadata', 'review'].map((s, idx) => {
              const isNamingStep = s === 'naming';
              const isDisabled = isNamingStep && !canProceedToNaming;
              const currentStepIdx = ['contract', 'naming', 'metadata', 'review'].indexOf(step);
              
              return {
                label: s.charAt(0).toUpperCase() + s.slice(1),
                onClick: idx <= currentStepIdx && !isDisabled ? () => {
                  if (s === 'naming' && !canProceedToNaming) {
                    toast.error('Address must be a contract to proceed with naming');
                    return;
                  }
                  setStep(s as 'contract' | 'naming' | 'metadata' | 'review');
                } : undefined,
                disabled: idx > currentStepIdx || isDisabled,
              };
            })}
            className="mb-4"
          />
          
          {/* Step Status Indicators */}
          <div className="mt-4 space-y-2 text-sm">
            {step === 'naming' && getNamingBlockers().length > 0 && (
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <span>{getNamingBlockers().length} issue{getNamingBlockers().length !== 1 ? 's' : ''} to resolve</span>
              </div>
            )}
            {step === 'metadata' && getMetadataBlockers().length > 0 && (
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <span>{getMetadataBlockers().length} required field{getMetadataBlockers().length !== 1 ? 's' : ''} missing</span>
              </div>
            )}
            {step === 'review' && canSubmit && (
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>All checks passed - ready to register</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            {['contract', 'naming', 'metadata', 'review'].map((s, idx) => {
              const isNamingStep = s === 'naming';
              const isDisabled = isNamingStep && !canProceedToNaming;
              
              return (
                <div 
                  key={s} 
                  className={`flex items-center ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isDisabled ? 'Address must be a contract to proceed' : ''}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      step === s
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : idx < ['contract', 'naming', 'metadata', 'review'].indexOf(step)
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-600'
                        : isDisabled
                        ? 'border-slate-200 bg-slate-50 text-slate-300'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    {idx < ['contract', 'naming', 'metadata', 'review'].indexOf(step) ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <span className={`ml-2 capitalize hidden md:inline ${isDisabled ? 'text-slate-400' : 'text-slate-700'}`}>
                    {s}
                  </span>
                  {idx < 3 && <div className="w-12 h-0.5 bg-slate-200 mx-4 hidden md:block" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs 
        value={step} 
        onValueChange={(v: string) => {
          // Prevent navigation to naming step if not a contract
          if (v === 'naming' && !canProceedToNaming) {
            toast.error('Address must be a contract to proceed with naming');
            return;
          }
          setStep(v as 'contract' | 'naming' | 'metadata' | 'review');
        }}
      >
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
                  <div className="flex items-center gap-2">
                    <Label htmlFor="contract-address">
                      Contract Address <span className="text-red-600">*</span>
                    </Label>
                    <HelpCircle className="h-4 w-4 text-slate-400" />
                    <span className="text-xs text-slate-500">Use proxy address for upgradeable contracts</span>
                  </div>
                  <div className="space-y-2">
                    <Input
                      id="contract-address"
                      placeholder="0x..."
                      value={contractAddress}
                      onChange={(e) => setContractAddress(e.target.value)}
                    />
                    {isCheckingContract && (
                      <p className="text-sm text-slate-500">Checking if address is a contract...</p>
                    )}
                    {!isCheckingContract && contractAddress && isContract === false && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertTitle className="text-red-900">Not a Contract</AlertTitle>
                        <AlertDescription className="text-red-800">
                          This address does not have contract code. Contract naming is only available for smart contracts, not EOA (Externally Owned Accounts).
                        </AlertDescription>
                      </Alert>
                    )}
                    {!isCheckingContract && contractAddress && isContract === true && (
                      <Alert className="border-emerald-200 bg-emerald-50">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <AlertTitle className="text-emerald-900">Contract Detected</AlertTitle>
                        <AlertDescription className="text-emerald-800">
                          This address contains contract code. You can proceed with contract naming.
                        </AlertDescription>
                      </Alert>
                    )}
                    <p className="text-slate-600">
                      The deployed contract address (use proxy for upgradeable contracts)
                    </p>
                    {registrationFee > 0n && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <p className="text-sm text-blue-900">
                            Registration fee: <strong>{formatEther(registrationFee)} ETH</strong>
                            {isLoadingFee && <span className="ml-2 text-blue-600">(loading...)</span>}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
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

              <div className="space-y-4">
                {!canProceedToNaming && contractAddress && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900">Cannot Proceed</AlertTitle>
                    <AlertDescription className="text-amber-800">
                      {isCheckingContract ? (
                        'Checking if address is a contract...'
                      ) : isContract === false ? (
                        'This address is not a contract. Contract registration requires a smart contract address.'
                      ) : (
                        'Please enter a valid contract address to continue.'
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => setStep('naming')}
                    disabled={!canProceedToNaming || isCheckingContract}
                  >
                    {isCheckingContract ? 'Checking...' : 'Next: Naming'}
                  </Button>
                </div>
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
                Choose how you want to name this contract using naming tools
              </CardDescription>
              <div className="mt-4 flex flex-wrap gap-2">
                {contractType && (
                  <Alert className="flex-1 min-w-[300px] border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Recommended:</strong> For {contractType}, use{' '}
                      {getRecommendedTemplates()
                        .filter((t: { recommended?: boolean }) => t.recommended)
                        .slice(0, 2)
                        .map((t: { label: string }) => t.label)
                        .join(' or ')}
                    </AlertDescription>
                  </Alert>
                )}
                {subdomainLabel && parentDomain && validationResult && validationResult.isValid && nameAvailability.available && (
                  <Alert className="flex-1 min-w-[200px] border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-800">
                      <strong>Ready!</strong> Name is valid and available
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="parent-domain">
                      Parent Domain <span className="text-red-600">*</span>
                    </Label>
                    <HelpCircle className="h-4 w-4 text-slate-400" />
                  </div>
                  <DomainSelector
                    value={parentDomain}
                    onValueChange={setParentDomain}
                    placeholder="Select your domain"
                    filterSubdomains={true}
                    allowCustom={true}
                  />
                  <div className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-600">
                      Your root ENS name (must be owned by your connected wallet). This will be the parent for your contract subdomain.
                    </p>
                  </div>
                </div>

              <Tabs value={namingTab} onValueChange={(v: string) => setNamingTab(v as 'templates' | 'validator' | 'hierarchy' | 'generator')} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="templates" className="relative">
                    Templates
                    {contractType && getRecommendedTemplates().some((t: { recommended?: boolean }) => t.recommended) && (
                      <Sparkles className="h-3 w-3 ml-1 text-blue-600" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="validator" className="relative">
                    Validator
                    {validationResult && (
                      <Badge 
                        variant={validationResult.isValid ? 'default' : 'destructive'} 
                        className="ml-1 h-4 px-1 text-xs"
                      >
                        {validationResult.score}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
                  <TabsTrigger value="generator">Bulk Generator</TabsTrigger>
                </TabsList>

                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-4">
                  {/* Template Search */}
                  <div className="space-y-2">
                    <Label>Search Templates</Label>
                    <Input
                      placeholder="Search by name or category..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                    />
                  </div>

                  {/* Recommended Templates */}
                  {contractType && getRecommendedTemplates().some((t: { recommended?: boolean }) => t.recommended) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <Label className="text-blue-900">Recommended for {contractType}</Label>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {getRecommendedTemplates()
                          .filter((t: { recommended?: boolean; id: string; label: string; desc: string }) => t.recommended && (t.id !== 'custom') && (!templateSearch || t.label.toLowerCase().includes(templateSearch.toLowerCase()) || t.desc.toLowerCase().includes(templateSearch.toLowerCase())))
                          .map((template) => (
                            <button
                              key={template.id}
                              onClick={() => handleTemplateSelect(template.id)}
                              className={`p-4 border-2 rounded-lg text-left transition-all relative ${
                                selectedTemplate === template.id
                                  ? 'border-blue-600 bg-blue-50'
                                  : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300'
                              }`}
                            >
                              <Badge className="absolute top-2 right-2" variant="default">Recommended</Badge>
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileCode className="h-4 w-4 text-emerald-600" />
                                    <code className="text-emerald-700 font-semibold">
                                      {template.label || 'custom'}.{parentDomain || 'yourdomain.eth'}
                                    </code>
                                  </div>
                                  <p className="text-slate-600">{template.desc}</p>
                                </div>
                                {selectedTemplate === template.id && (
                                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                )}
                              </div>
                            </button>
                          ))}
                      </div>
                      <Separator />
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Core Infrastructure</Label>
                      <Badge variant="secondary">Critical</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {namingTemplates
                        .filter(t => t.category === 'core' && (!templateSearch || t.label.toLowerCase().includes(templateSearch.toLowerCase()) || t.desc.toLowerCase().includes(templateSearch.toLowerCase())))
                        .map((template) => (
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
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <FileCode className="h-4 w-4 text-blue-600" />
                                <code className="text-blue-600">
                                  {template.label || 'custom'}.{parentDomain || 'yourdomain.eth'}
                                </code>
                              </div>
                              <p className="text-slate-600">{template.desc}</p>
                            </div>
                            {selectedTemplate === template.id && (
                              <CheckCircle2 className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-2 mt-6">
                      <Label>Infrastructure</Label>
                      <Badge variant="secondary">Supporting</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {namingTemplates
                        .filter(t => t.category === 'infrastructure' && (!templateSearch || t.label.toLowerCase().includes(templateSearch.toLowerCase()) || t.desc.toLowerCase().includes(templateSearch.toLowerCase())))
                        .map((template) => (
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
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <FileCode className="h-4 w-4 text-purple-600" />
                                <code className="text-purple-600">
                                  {template.label || 'custom'}.{parentDomain || 'yourdomain.eth'}
                                </code>
                              </div>
                              <p className="text-slate-600">{template.desc}</p>
                            </div>
                            {selectedTemplate === template.id && (
                              <CheckCircle2 className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-2 mt-6">
                      <Label>Environments</Label>
                      <Badge variant="outline">Non-Production</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {namingTemplates
                        .filter(t => t.category === 'environment' && (!templateSearch || t.label.toLowerCase().includes(templateSearch.toLowerCase()) || t.desc.toLowerCase().includes(templateSearch.toLowerCase())))
                        .map((template) => (
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
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <FileCode className="h-4 w-4 text-amber-600" />
                                <code className="text-amber-600">
                                  {template.label || 'custom'}.{parentDomain || 'yourdomain.eth'}
                                </code>
                              </div>
                              <p className="text-slate-600">{template.desc}</p>
                            </div>
                            {selectedTemplate === template.id && (
                              <CheckCircle2 className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    {namingTemplates.filter(t => t.category === 'custom').map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template.id)}
                        className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                          selectedTemplate === template.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-slate-900 font-medium">{template.desc}</p>
                            <p className="text-slate-600 text-sm mt-1">Enter a custom subdomain below</p>
                          </div>
                          {selectedTemplate === template.id && (
                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="subdomain-label">
                        Subdomain Label <span className="text-red-600">*</span>
                      </Label>
                      {subdomainLabel && parentDomain && validationResult && (
                        <Badge variant={
                          validationResult.score >= 80 ? 'default' :
                          validationResult.score >= 60 ? 'secondary' :
                          'destructive'
                        }>
                          Score: {validationResult.score}/100
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="subdomain-label"
                        placeholder="app"
                        value={subdomainLabel}
                        onChange={(e) => {
                          setSubdomainLabel(e.target.value);
                          if (e.target.value && parentDomain) {
                            const fullName = `${e.target.value}.${parentDomain}`;
                            const result = validateNaming(fullName);
                            setValidationResult(result);
                          }
                        }}
                        className={validationResult && !validationResult.isValid ? 'border-red-300' : ''}
                      />
                      <span className="text-slate-600">.{parentDomain || 'yourdomain.eth'}</span>
                    </div>
                    {validationResult && validationResult.issues.length > 0 && (
                      <div className="text-sm space-y-1">
                        {validationResult.issues.filter(i => i.type === 'error').slice(0, 2).map((issue, idx) => (
                          <p key={idx} className="text-red-600">• {issue.message}</p>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-500">
                      Tip: Use lowercase letters, numbers, and hyphens. Avoid special characters.
                    </p>
                  </div>
                </TabsContent>

                {/* Validator Tab */}
                <TabsContent value="validator" className="space-y-4">
                  <div className="space-y-4">
                    {/* Prominent Name Preview */}
                    {subdomainLabel && parentDomain && (
                      <Card className={`border-2 ${
                        validationResult?.isValid && nameAvailability.available
                          ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50'
                          : validationResult && !validationResult.isValid
                          ? 'border-red-200 bg-gradient-to-r from-red-50 to-rose-50'
                          : 'border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50'
                      }`}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Label className="text-slate-600 text-sm">Full ENS Name</Label>
                                {validationResult && (
                                  <Badge variant={
                                    validationResult.score >= 80 ? 'default' :
                                    validationResult.score >= 60 ? 'secondary' :
                                    'destructive'
                                  }>
                                    {validationResult.score}/100
                                  </Badge>
                                )}
                                {nameAvailability.checked && (
                                  <Badge variant={nameAvailability.available ? 'default' : 'destructive'}>
                                    {nameAvailability.available ? 'Available' : 'Taken'}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-2xl font-bold text-slate-900">
                                  {subdomainLabel}.{parentDomain}
                                </code>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopy(`${subdomainLabel}.${parentDomain}`)}
                                    title="Copy name"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  {validationResult?.isValid && nameAvailability.available && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setStep('metadata')}
                                      title="Continue to metadata"
                                    >
                                      <ArrowRight className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {contractAddress && (
                                <p className="text-slate-600 text-sm mt-2">
                                  Will resolve to <code className="text-blue-700">{contractAddress}</code>
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="validate-name">Edit Name</Label>
                      <div className="flex gap-2">
                        <Input
                          id="validate-name"
                          placeholder="app.company.eth"
                          value={subdomainLabel && parentDomain ? `${subdomainLabel}.${parentDomain}` : ''}
                          onChange={(e) => {
                            const parts = e.target.value.split('.');
                            if (parts.length >= 2) {
                              setSubdomainLabel(parts[0]);
                              setParentDomain(parts.slice(1).join('.'));
                            }
                          }}
                        />
                        <Button variant="outline" onClick={handleValidateName}>
                          Re-validate
                        </Button>
                      </div>
                    </div>

                    {/* Name Availability Check */}
                    {subdomainLabel && parentDomain && nameAvailability.checked && (
                      <Alert className={
                        nameAvailability.available
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-red-200 bg-red-50'
                      }>
                        {nameAvailability.available ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <AlertTitle className="text-emerald-900">Name Available</AlertTitle>
                            <AlertDescription className="text-emerald-800">
                              <code>{subdomainLabel}.{parentDomain}</code> is available for registration.
                            </AlertDescription>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-600" />
                            <AlertTitle className="text-red-900">Name Already Taken</AlertTitle>
                            <AlertDescription className="text-red-800">
                              <code>{subdomainLabel}.{parentDomain}</code> is already registered. Please choose a different subdomain.
                            </AlertDescription>
                          </>
                        )}
                      </Alert>
                    )}

                    {isCheckingAvailability && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>Checking name availability...</AlertDescription>
                      </Alert>
                    )}

                    {validationResult && (
                      <div className="space-y-4">
                        <Card className={`border-2 ${
                          validationResult.score >= 80 ? 'border-emerald-200 bg-emerald-50' :
                          validationResult.score >= 60 ? 'border-amber-200 bg-amber-50' :
                          'border-red-200 bg-red-50'
                        }`}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  {validationResult.isValid ? (
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                  ) : (
                                    <XCircle className="h-6 w-6 text-red-600" />
                                  )}
                                  <span className={`text-slate-900 ${
                                    validationResult.score >= 80 ? 'text-emerald-900' :
                                    validationResult.score >= 60 ? 'text-amber-900' :
                                    'text-red-900'
                                  }`}>
                                    {validationResult.isValid ? 'Valid Name' : 'Invalid Name'}
                                  </span>
                                </div>
                                <p className={`${
                                  validationResult.score >= 80 ? 'text-emerald-700' :
                                  validationResult.score >= 60 ? 'text-amber-700' :
                                  'text-red-700'
                                }`}>
                                  Convention Score: {validationResult.score}/100
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopy(subdomainLabel && parentDomain ? `${subdomainLabel}.${parentDomain}` : '')}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {validationResult.issues.length > 0 && (
                          <div className="space-y-2">
                            <Label>Issues & Observations</Label>
                            {validationResult.issues.map((issue, index) => (
                              <Alert
                                key={index}
                                className={
                                  issue.type === 'error' ? 'border-red-200 bg-red-50' :
                                  issue.type === 'warning' ? 'border-amber-200 bg-amber-50' :
                                  'border-blue-200 bg-blue-50'
                                }
                              >
                                {issue.type === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                                {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                                {issue.type === 'info' && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                                <AlertDescription className={
                                  issue.type === 'error' ? 'text-red-800' :
                                  issue.type === 'warning' ? 'text-amber-800' :
                                  'text-blue-800'
                                }>
                                  {issue.message}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        )}

                        {validationResult.suggestions.length > 0 && (
                          <Card className="border-2 border-blue-200 bg-blue-50">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-blue-900">
                                <Lightbulb className="h-5 w-5" />
                                Recommendations
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {validationResult.suggestions.map((suggestion, index) => (
                                <p key={index} className="text-blue-800">• {suggestion}</p>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Hierarchy Tab */}
                <TabsContent value="hierarchy" className="space-y-4">
                  {parentDomain ? (
                    <div className="space-y-4">
                      <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                        <div className="flex items-center gap-3">
                          <Network className="h-6 w-6 text-blue-600" />
                          <div>
                            <p className="text-blue-900">{parentDomain}</p>
                            <p className="text-blue-700">Root Domain • Owner: Multisig Required</p>
                          </div>
                        </div>
                      </div>

                      <div className="ml-8 space-y-3">
                        {generateHierarchy()[0]?.children.map((child, index) => (
                          <div key={index} className="relative">
                            <div className="absolute -left-8 top-5 w-6 h-px bg-slate-300" />
                            <div className={`p-4 border-2 rounded-lg ${
                              child.security === 'Critical' ? 'border-red-200 bg-red-50' :
                              child.security === 'High' ? 'border-amber-200 bg-amber-50' :
                              child.security === 'Medium' ? 'border-blue-200 bg-blue-50' :
                              'border-slate-200 bg-slate-50'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className={`${
                                    child.security === 'Critical' ? 'text-red-900' :
                                    child.security === 'High' ? 'text-amber-900' :
                                    child.security === 'Medium' ? 'text-blue-900' :
                                    'text-slate-900'
                                  }`}>
                                    {child.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`${
                                      child.security === 'Critical' ? 'text-red-700' :
                                      child.security === 'High' ? 'text-amber-700' :
                                      child.security === 'Medium' ? 'text-blue-700' :
                                      'text-slate-700'
                                    }`}>
                                      {child.type}
                                    </span>
                                    <span>•</span>
                                    <Badge variant={
                                      child.security === 'Critical' ? 'destructive' :
                                      child.security === 'High' ? 'secondary' :
                                      'outline'
                                    }>
                                      {child.security} Security
                                    </Badge>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => {
                                  const parts = child.name.split('.');
                                  setSubdomainLabel(parts[0]);
                                  setParentDomain(parts.slice(1).join('.'));
                                  handleTemplateSelect(parts[0]);
                                }}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Alert className="border-emerald-200 bg-emerald-50">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <AlertTitle className="text-emerald-900">Hierarchy Best Practices</AlertTitle>
                        <AlertDescription className="text-emerald-800">
                          • Keep hierarchy depth to 2-3 levels maximum
                          <br />• Use clear, functional names for each subdomain
                          <br />• Apply strictest security to critical infrastructure (dao, vault)
                          <br />• Separate production from development environments
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Please select a parent domain to view the hierarchy
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                {/* Bulk Generator Tab */}
                <TabsContent value="generator" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Generated Subdomains</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const names = namingTemplates
                              .filter(t => t.id !== 'custom')
                              .map(t => `${t.label}.${parentDomain || 'yourdomain.eth'}`)
                              .join('\n');
                            handleCopy(names);
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy All
                        </Button>
                      </div>
                      <Textarea
                        value={namingTemplates
                          .filter(t => t.id !== 'custom')
                          .map(t => `${t.label}.${parentDomain || 'yourdomain.eth'}`)
                          .join('\n')}
                        rows={12}
                        readOnly
                        className="font-mono"
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => {
                        const names = namingTemplates
                          .filter(t => t.id !== 'custom')
                          .map(t => `${t.label}.${parentDomain || 'yourdomain.eth'}`)
                          .join('\n');
                        const blob = new Blob([JSON.stringify(names.split('\n'), null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `ens-names-${parentDomain || 'generated'}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Exported as JSON');
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as JSON
                    </Button>

                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        Review each generated name before deployment. Ensure appropriate security measures (multisig, fuses) are configured for production names.
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Summary Card - Always visible */}
              {subdomainLabel && parentDomain && (
                <Card className={`border-2 ${
                  validationResult?.isValid && nameAvailability.available
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50'
                }`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="text-slate-600 text-sm">Selected Name</Label>
                          {validationResult?.isValid && nameAvailability.available && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          )}
                          {validationResult && !validationResult.isValid && (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <code className="text-lg font-semibold text-slate-900">
                            {subdomainLabel}.{parentDomain}
                          </code>
                          {validationResult && (
                            <Badge variant={
                              validationResult.score >= 80 ? 'default' :
                              validationResult.score >= 60 ? 'secondary' :
                              'destructive'
                            }>
                              {validationResult.score}/100
                            </Badge>
                          )}
                          {nameAvailability.checked && (
                            <Badge variant={nameAvailability.available ? 'default' : 'destructive'}>
                              {nameAvailability.available ? 'Available' : 'Taken'}
                            </Badge>
                          )}
                        </div>
                        {contractAddress && (
                          <p className="text-slate-600 text-sm mt-2">
                            Resolves to <code className="text-blue-700">{contractAddress}</code>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setNamingTab('validator')}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(`${subdomainLabel}.${parentDomain}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {getNamingBlockers().length > 0 && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900">Complete Required Fields</AlertTitle>
                    <AlertDescription className="text-amber-800">
                      <ul className="list-disc list-inside space-y-1">
                        {getNamingBlockers().map((blocker, idx) => (
                          <li key={idx}>{blocker}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                {validationResult && validationResult.score < 60 && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-red-900">Low Validation Score</AlertTitle>
                    <AlertDescription className="text-red-800">
                      Your name has a validation score of {validationResult.score}/100. Consider using a recommended template for better compliance.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep('contract')}>
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      if (!canProceedToMetadata) {
                        toast.error('Please complete all required fields and fix validation errors');
                        return;
                      }
                      setStep('metadata');
                    }}
                    disabled={!canProceedToMetadata}
                  >
                    Next: Metadata
                  </Button>
                </div>
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
                  onValueChange={(id: string) => {
                    const schema = ALL_SCHEMAS.find((s: MetadataSchema) => s.id === id);
                    setSelectedSchema(schema || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a schema" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SCHEMAS.map((schema: MetadataSchema) => (
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

              <div className="space-y-4">
                {getMetadataBlockers().length > 0 && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900">Complete Metadata</AlertTitle>
                    <AlertDescription className="text-amber-800">
                      <ul className="list-disc list-inside space-y-1">
                        {getMetadataBlockers().map((blocker, idx) => (
                          <li key={idx}>{blocker}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep('naming')}>
                    Back
                  </Button>
                  <Button 
                    onClick={() => {
                      if (getMetadataBlockers().length > 0) {
                        toast.error('Please complete all required metadata fields');
                        return;
                      }
                      setStep('review');
                    }}
                  >
                    Next: Review
                  </Button>
                </div>
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
                {registrationFee > 0n && (
                  <>
                    <Alert className="border-blue-200 bg-blue-50">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-900">Registration Fee</AlertTitle>
                      <AlertDescription className="text-blue-800">
                        A fee of <strong>{formatEther(registrationFee)} ETH</strong> will be charged for this registration.
                      </AlertDescription>
                    </Alert>
                    <Separator />
                  </>
                )}

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

              <div className="space-y-4">
                {(!canSubmit || getMetadataBlockers().length > 0) && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-red-900">Cannot Register</AlertTitle>
                    <AlertDescription className="text-red-800">
                      <p className="mb-2">Please fix the following issues before registering:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {!contractAddress && <li>Contract address is required</li>}
                        {!parentDomain && <li>Parent domain is required</li>}
                        {!subdomainLabel && <li>Subdomain label is required</li>}
                        {validationResult && !validationResult.isValid && <li>Name validation failed</li>}
                        {nameAvailability.checked && !nameAvailability.available && <li>Name is already taken</li>}
                        {getMetadataBlockers().map((blocker, idx) => (
                          <li key={idx}>{blocker}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep('metadata')}>
                    Back
                  </Button>
                  <Button
                    onClick={handleRegister}
                    disabled={!canSubmit || isSubmitting || getMetadataBlockers().length > 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Registering...' : 'Register Contract'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
