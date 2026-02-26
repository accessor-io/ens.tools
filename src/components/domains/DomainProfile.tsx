import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Globe,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Shield,
  Lock,
  Unlock,
  Send,
  FileText,
  Settings,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Database,
  Code,
  Network,
  Calendar,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services';
import { useTransactionManager } from '../../lib/hooks/useTransactionManager';
import { ENSDomain, formatAddress, getAllTextRecords, reverseResolveAddress } from '../../lib/ens';
import { addressDisplayService } from '../../lib/services';
import { eventTracker } from '../../lib/services';
import { auditLogService } from '../../lib/security';
import { GranularPermissions } from '../delegation/GranularPermissions';
import { TransactionConfirmationDialog } from '../TransactionConfirmationDialog';
import { 
  setTextRecord,
  setAddressRecord,
  createSubdomain, 
  setFuses,
  wrapName,
  unwrapName,
  setResolver,
  setReverseRecord,
  setContentHash,
  getContentHash,
  setTTL,
  getTTL,
  setABI,
  getABI,
  renewDomain,
  FUSES,
  combineFuses,
  getActiveFuses,
  COIN_TYPES,
} from '../../lib/ens';
import { getENSStatus, validateExternalUrl } from '../../lib/ens'
import { transferDomainViaRegistry, transferWrappedName } from '../../lib/ens';
import { premiumPriceService } from '../../lib/services/premium-price-service';
import { ensMarketplaceService } from '../../lib/services/ens-marketplace-service';
import {
  ALL_SCHEMAS,
  getRecommendedSchema,
  validateMetadata,
  MetadataSchema,
  STANDARD_KEYS,
} from '../../lib/metadata';
import { useStateRecollection } from '../../lib/adaptive-rendering/state-recollection';

interface DomainProfileProps {
  domain: ENSDomain;
  onClose: () => void;
  onUpdate: () => void;
}

export function DomainProfile({ domain, onClose, onUpdate }: DomainProfileProps) {
  const { walletClient, publicClient, address } = useWeb3();
  const txManager = useTransactionManager();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { stagedEdits, stageEdit, clearStagedEdits, recallState, requiresRecall } = useStateRecollection(
    'domain-profile',
    'editing',
    {
      requiresTransactionStaging: true,
      autoDormantOnContextSwitch: true,
      persistenceType: 'session',
    }
  );
  
  const [previousMetadata, setPreviousMetadata] = useState<Record<string, string>>({});
  
  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean;
    type: 'transfer' | 'wrap' | 'unwrap' | 'resolver' | 'reverse' | 'fuses' | 'metadata' | null;
    data?: any;
  }>({ open: false, type: null });

  // Offer dialog state
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [isDomainForSale, setIsDomainForSale] = useState(false);
  const [domainListing, setDomainListing] = useState<any>(null);

  useEffect(() => {
    eventTracker.trackDomainView(domain.name, address || undefined);
  }, [domain.name, address]);

  useEffect(() => {
    if (publicClient) {
      loadContentHash();
      loadTTL();
      loadABI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain.name, publicClient]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const loadContentHash = async () => {
    if (!publicClient) return;
    try {
      const hash = await getContentHash(publicClient, domain.name);
      if (hash) {
        setContentHashValue(hash);
      }
    } catch (error) {
      console.error('Error loading content hash:', error);
    }
  };

  const loadTTL = async () => {
    if (!publicClient) return;
    try {
      const ttl = await getTTL(publicClient, domain.name);
      setTtlValue(ttl);
      if (ttl !== null) {
        setNewTTL(ttl.toString());
      }
    } catch (error) {
      console.error('Error loading TTL:', error);
    }
  };

  const loadABI = async () => {
    if (!publicClient) return;
    try {
      const abi = await getABI(publicClient, domain.name, abiContentType);
      if (abi) {
        setAbiValue(abi);
        setNewABI(abi);
      } else {
        setAbiValue(null);
        setNewABI('');
      }
    } catch (error) {
      console.error('Error loading ABI:', error);
      setAbiValue(null);
      setNewABI('');
    }
  };
  
  // Metadata state
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [selectedSchema, setSelectedSchema] = useState<MetadataSchema | null>(null);
  
  // Subdomain state
  const [subdomains, setSubdomains] = useState<string[]>([]);
  const [showCreateSubdomain, setShowCreateSubdomain] = useState(false);
  const [newSubdomainLabel, setNewSubdomainLabel] = useState('');
  const [newSubdomainOwner, setNewSubdomainOwner] = useState('');
  
  // Transfer state
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAddress, setTransferAddress] = useState('');
  
  // Resolver and reverse record state
  const [resolverAddress, setResolverAddress] = useState('');
  const [reverseName, setReverseName] = useState('');
  
  // Fuses state
  const [selectedFuses, setSelectedFuses] = useState<string[]>([]);
  const [showFuseManager, setShowFuseManager] = useState(false);

  // Content hash state
  const [contentHashValue, setContentHashValue] = useState<string>('');
  const [isEditingContentHash, setIsEditingContentHash] = useState(false);

  // Renewal state
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewPrice, setRenewPrice] = useState<{ base: string; premium: string; total: string; hasPremium: boolean } | null>(null);
  const [isLoadingRenewPrice, setIsLoadingRenewPrice] = useState(false);

  // TTL state
  const [ttlValue, setTtlValue] = useState<number | null>(null);
  const [isEditingTTL, setIsEditingTTL] = useState(false);
  const [newTTL, setNewTTL] = useState<string>('');

  // ABI state
  const [abiValue, setAbiValue] = useState<string | null>(null);
  const [isEditingABI, setIsEditingABI] = useState(false);
  const [newABI, setNewABI] = useState<string>('');
  const [abiContentType, setAbiContentType] = useState<number>(1); // 1 = JSON, 2 = CBOR

  // ENS name resolution state
  const [ownerENSName, setOwnerENSName] = useState<string | null>(null);
  const [resolverENSName, setResolverENSName] = useState<string | null>(null);
  const [resolvedAddressENSName, setResolvedAddressENSName] = useState<string | null>(null);
  
  // Status indicators
  const [ensStatus, setEnsStatus] = useState<{ hasResolver: boolean; isCCIPRead?: boolean; isDNSSEC?: boolean; resolverAddress?: string }>({
    hasResolver: false,
  });

  useEffect(() => {
    loadDomainDetails();
    loadSubdomains();
    loadENSNames();
    loadENSStatus();
    checkIfDomainForSale();
    
    // Set recommended schema
    const recommended = getRecommendedSchema(domain.name);
    setSelectedSchema(recommended);
    
    // Recall staged edits if available
    if (requiresRecall) {
      const recalled = recallState();
      if (recalled && recalled.stagedEdits.length > 0) {
        const edit = recalled.stagedEdits.find(e => e.domainName === domain.name);
        if (edit && edit.changes.metadata) {
          setMetadata(edit.changes.metadata);
          setIsEditing(true);
        }
      }
    }
  }, [domain, publicClient, requiresRecall, recallState]);
  
  // Stage edits when metadata changes and isEditing is true
  useEffect(() => {
    if (!isEditing || isSaving) {
      setPreviousMetadata({ ...metadata });
      return;
    }
    
    const hasChanges = JSON.stringify(metadata) !== JSON.stringify(previousMetadata);
    if (hasChanges && Object.keys(metadata).length > 0) {
      const changes: Record<string, any> = {};
      Object.entries(metadata).forEach(([key, value]) => {
        if (value) {
          changes[key] = value;
        }
      });
      
      if (Object.keys(changes).length > 0) {
        stageEdit({
          domainName: domain.name,
          editType: 'metadata',
          changes: { metadata },
          requiresTransaction: true,
          canAutoSubmit: false,
        });
      }
    }
    
    setPreviousMetadata({ ...metadata });
  }, [metadata, isEditing, isSaving, domain.name, stageEdit]);

  const loadDomainDetails = async () => {
    if (!publicClient) return;
    
    try {
      const records = await getAllTextRecords(publicClient, domain.name);
      const metadataObj: Record<string, string> = {};
      records.forEach(record => {
        metadataObj[record.key] = record.value;
      });
      setMetadata(metadataObj);
    } catch (error) {
      console.error('Error loading domain details:', error);
    }
  };

  const loadENSNames = async () => {
    if (!publicClient) return;

    try {
      const ownerName = await reverseResolveAddress(publicClient, domain.owner);
      setOwnerENSName(ownerName);
      if (ownerName) {
        addressDisplayService.setENSName(domain.owner, ownerName);
      }

      if (domain.resolver) {
        const resolverName = await reverseResolveAddress(publicClient, domain.resolver);
        setResolverENSName(resolverName);
        if (resolverName) {
          addressDisplayService.setENSName(domain.resolver, resolverName);
        }
      }

      if (domain.resolvedAddress) {
        const resolvedName = await reverseResolveAddress(publicClient, domain.resolvedAddress);
        setResolvedAddressENSName(resolvedName);
        if (resolvedName) {
          addressDisplayService.setENSName(domain.resolvedAddress, resolvedName);
        }
      }
    } catch (error) {
      console.error('Error loading ENS names:', error);
    }
  };

  const loadENSStatus = async () => {
    if (!publicClient) return;
    
    try {
      const status = await getENSStatus(publicClient, domain.name);
      setEnsStatus(status);
    } catch (error) {
      console.error('Error loading ENS status:', error);
    }
  };

  const loadSubdomains = async () => {
    if (!publicClient) return;
    
    try {
      // Use dynamic import to avoid blocking initial render
      const subdomainService = await import('../../lib/ens/subdomain-service');
      const subdomainInfos = await subdomainService.fetchSubdomains(domain.name, publicClient);
      const subdomainNames = subdomainInfos.map(sub => sub.name);
      setSubdomains(subdomainNames);
    } catch (error) {
      console.error('Error loading subdomains:', error);
      // Fallback to empty array on error
      setSubdomains([]);
    }
  };

  const checkIfDomainForSale = async () => {
    if (!publicClient) return;
    
    try {
      const chainId = await publicClient.getChainId();
      const listings = await ensMarketplaceService.getActiveListings(chainId);
      const listing = listings.find(l => l.name.toLowerCase() === domain.name.toLowerCase() && l.status === 'active');
      
      if (listing) {
        setIsDomainForSale(true);
        setDomainListing(listing);
      } else {
        setIsDomainForSale(false);
        setDomainListing(null);
      }
    } catch (error) {
      console.error('Error checking if domain is for sale:', error);
      setIsDomainForSale(false);
      setDomainListing(null);
    }
  };

  const handleCreateOffer = async () => {
    if (!walletClient || !publicClient || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!offerPrice || parseFloat(offerPrice) <= 0) {
      toast.error('Please enter a valid offer price');
      return;
    }

    // Check if user is the owner
    if (address.toLowerCase() === domain.owner.toLowerCase()) {
      toast.error('You cannot make an offer on your own domain');
      return;
    }

    setIsCreatingOffer(true);
    try {
      const chainId = await publicClient.getChainId();
      const normalizedName = domain.name.toLowerCase().trim();
      const namehash = `0x${Buffer.from(normalizedName).toString('hex')}`;
      
      await ensMarketplaceService.createDomainOffer({
        name: normalizedName,
        namehash,
        tokenId: namehash,
        price: offerPrice,
        publicClient,
        walletClient,
        chainId,
      });

      toast.success('Offer created successfully');
      setShowOfferDialog(false);
      setOfferPrice('');
      onUpdate();
    } catch (error: any) {
      console.error('Error creating offer:', error);
      toast.error(error.message || 'Failed to create offer');
    } finally {
      setIsCreatingOffer(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    if (!selectedSchema) {
      toast.error('No schema selected');
      return;
    }

    // Validate metadata
    const validation = validateMetadata(metadata, selectedSchema);
    if (!validation.valid) {
      toast.error('Validation failed', {
        description: validation.errors.join(', '),
      });
      return;
    }

    setIsSaving(true);
    try {
      const { TransactionBuilder } = await import('../../lib/ens/transaction-builder');
      const builder = new TransactionBuilder(publicClient, walletClient);
      
      // Add all text records to builder
      const savedKeys: string[] = [];
      for (const [key, value] of Object.entries(metadata)) {
        if (value) {
          builder.addTextRecord(domain.name, key, value);
          savedKeys.push(key);
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
        description: `Save metadata for ${domain.name} (${operationCount} record${operationCount !== 1 ? 's' : ''})`,
        onSuccess: () => {
          for (const key of savedKeys) {
            eventTracker.trackTextRecordSet(domain.name, key, metadata[key], address || undefined);
            
            if (key === 'name' || key === 'displayName' || key === 'eth.name') {
              auditLogService.trackAction('name_edited', `Name edited for ${domain.name}: ${key}`, {
                domain: domain.name,
                actor: address || undefined,
                status: 'success',
                metadata: {
                  field: key,
                  value: metadata[key],
                },
              });
            }
          }
          setIsEditing(false);
          const editIds = stagedEdits.filter(e => e.domainName === domain.name).map(e => e.id);
          if (editIds.length > 0) {
            clearStagedEdits(editIds);
          }
          onUpdate();
        },
      });
    } catch (error) {
      console.error('Error saving metadata:', error);
      eventTracker.trackTransactionFailed(error instanceof Error ? error.message : 'Unknown error', address || undefined);
      toast.error('Failed to save metadata', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSubdomain = async () => {
    if (!walletClient || !newSubdomainLabel || !newSubdomainOwner) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const fuses = combineFuses(selectedFuses);
      
      await createSubdomain(walletClient, publicClient, {
        parentName: domain.name,
        label: newSubdomainLabel,
        owner: newSubdomainOwner,
        fuses,
        expiry: domain.expiryDate ? BigInt(domain.expiryDate.getTime() / 1000) : BigInt(0),
      });

      toast.success('Subdomain created', {
        description: `${newSubdomainLabel}.${domain.name} has been created`,
      });
      
      setShowCreateSubdomain(false);
      setNewSubdomainLabel('');
      setNewSubdomainOwner(address || '');
      loadSubdomains();
      onUpdate();
    } catch (error) {
      console.error('Error creating subdomain:', error);
      toast.error('Failed to create subdomain', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const _handleTransfer = async () => {
    if (!walletClient || !publicClient || !transferAddress) {
      toast.error('Please enter a valid address');
      return;
    }

    if (!validateExternalUrl(transferAddress) && !transferAddress.startsWith('0x')) {
      toast.error('Invalid address format');
      return;
    }

    setConfirmationDialog({
      open: true,
      type: 'transfer',
      data: { address: transferAddress },
    });
  };

  const executeTransfer = async () => {
    if (!walletClient || !publicClient || !confirmationDialog.data?.address) return;

    const transferAddress = confirmationDialog.data.address;
    
    try {
      const executeFn = async () => {
        if (domain.isWrapped) {
          return await transferWrappedName(walletClient, publicClient, {
            name: domain.name,
            newOwner: transferAddress as `0x${string}`,
          });
        } else {
          return await transferDomainViaRegistry(walletClient, publicClient, {
            name: domain.name,
            newOwner: transferAddress as `0x${string}`,
          });
        }
      };

      await txManager.addTransaction(executeFn, {
        description: `Transfer ${domain.name} to ${transferAddress.slice(0, 10)}...`,
        onSuccess: () => {
          setShowTransfer(false);
          setTransferAddress('');
          onUpdate();
        },
      });
    } catch (error) {
      console.error('Error transferring domain:', error);
      throw error;
    }
  };

  const handleSetResolver = async () => {
    if (!walletClient || !publicClient || !resolverAddress) {
      toast.error('Please enter a valid resolver address');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(resolverAddress)) {
      toast.error('Invalid resolver address format');
      return;
    }

    setConfirmationDialog({
      open: true,
      type: 'resolver',
      data: { address: resolverAddress },
    });
  };

  const executeSetResolver = async () => {
    if (!walletClient || !publicClient || !confirmationDialog.data?.address) return;

    const resolverAddress = confirmationDialog.data.address;

    try {
      const executeFn = async () => {
        return await setResolver(walletClient, publicClient, {
          name: domain.name,
          resolverAddress,
        }) as `0x${string}`;
      };

      await txManager.addTransaction(executeFn, {
        description: `Set resolver for ${domain.name}`,
        onSuccess: () => {
          setResolverAddress('');
          onUpdate();
        },
      });
    } catch (error) {
      console.error('Error setting resolver:', error);
      throw error;
    }
  };

  const handleSetReverseRecord = async () => {
    if (!walletClient || !publicClient || !reverseName) {
      toast.error('Please enter a valid ENS name');
      return;
    }

    try {
      const hash = await setReverseRecord(walletClient, publicClient, {
        address: domain.owner,
        name: reverseName,
      });

      toast.success('Reverse record set', {
        description: `Transaction: ${hash.slice(0, 10)}...`,
      });
      
      setReverseName('');
      onUpdate();
    } catch (error) {
      console.error('Error setting reverse record:', error);
      toast.error('Failed to set reverse record', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleWrap = async () => {
    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    setConfirmationDialog({
      open: true,
      type: 'wrap',
    });
  };

  const executeWrap = async () => {
    if (!walletClient || !publicClient) return;

    try {
      const expiry = domain.expiryDate 
        ? BigInt(Math.floor(domain.expiryDate.getTime() / 1000))
        : BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

      const executeFn = async () => {
        return await wrapName(walletClient, {
          name: domain.name,
          owner: domain.owner as `0x${string}`,
          fuses: 0,
          expiry,
        }) as `0x${string}`;
      };

      await txManager.addTransaction(executeFn, {
        description: `Wrap ${domain.name}`,
        onSuccess: () => {
          onUpdate();
        },
      });
    } catch (error) {
      console.error('Error wrapping name:', error);
      throw error;
    }
  };

  const handleUnwrap = async () => {
    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    setConfirmationDialog({
      open: true,
      type: 'unwrap',
    });
  };

  const executeUnwrap = async () => {
    if (!walletClient || !publicClient) return;

    try {
      const executeFn = async () => {
        return await unwrapName(walletClient, publicClient, {
          name: domain.name,
          newController: domain.owner as `0x${string}`,
        }) as `0x${string}`;
      };

      await txManager.addTransaction(executeFn, {
        description: `Unwrap ${domain.name}`,
        onSuccess: () => {
          onUpdate();
        },
      });
    } catch (error) {
      console.error('Error unwrapping name:', error);
      throw error;
    }
  };

  const handleSetFuses = async () => {
    if (!walletClient) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      const fusesNumber = combineFuses(selectedFuses);
      
      await setFuses(walletClient, {
        name: domain.name,
        fuses: fusesNumber,
      });

      toast.success('Fuses set successfully');
      setShowFuseManager(false);
      onUpdate();
    } catch (error) {
      console.error('Error setting fuses:', error);
      toast.error('Failed to set fuses', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Removed external link - all actions are now native

  const updateMetadataField = (key: string, value: string) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  const toggleFuse = (fuseName: string) => {
    setSelectedFuses(prev =>
      prev.includes(fuseName)
        ? prev.filter(f => f !== fuseName)
        : [...prev, fuseName]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-slate-900">{domain.name}</h2>
              <p className="text-slate-600">Complete domain profile and management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="resolver">Resolver</TabsTrigger>
              <TabsTrigger value="reverse">Reverse</TabsTrigger>
              <TabsTrigger value="wrapper">Wrapper</TabsTrigger>
              <TabsTrigger value="subdomains">Subdomains</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="transfer">Transfer</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Domain Information</CardTitle>
                  <CardDescription>Basic details about this ENS name</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status Indicators */}
                  <div className="flex gap-2 flex-wrap">
                    {isDomainForSale && (
                      <Badge variant="secondary" className="bg-pink-50 text-pink-700 border-pink-200">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        For Sale
                      </Badge>
                    )}
                    {ensStatus.isCCIPRead && (
                      <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Network className="h-3 w-3 mr-1" />
                        CCIP-Read
                      </Badge>
                    )}
                    {ensStatus.isDNSSEC && (
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                        <Shield className="h-3 w-3 mr-1" />
                        DNSSEC
                      </Badge>
                    )}
                    {!ensStatus.hasResolver && (
                      <Badge variant="outline" className="text-amber-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        No Resolver
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-slate-600">Owner</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-slate-900">{formatAddress(domain.owner, ownerENSName)}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(domain.owner)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {domain.resolvedAddress && (
                      <div>
                        <Label className="text-slate-600">Resolved Address</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-slate-900">{formatAddress(domain.resolvedAddress, resolvedAddressENSName)}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(domain.resolvedAddress!)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-slate-600">Type</Label>
                      <div className="mt-1">
                        {domain.isWrapped ? (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                            <Lock className="h-3 w-3 mr-1" />
                            Wrapped
                          </Badge>
                        ) : (
                          <Badge variant="outline">Standard</Badge>
                        )}
                      </div>
                    </div>

                    {domain.expiryDate && (
                      <div>
                        <Label className="text-slate-600">Expiration</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-slate-900">
                            {domain.expiryDate.toLocaleDateString()}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setShowRenewDialog(true);
                              setIsLoadingRenewPrice(true);
                              setRenewPrice(null);
                              
                              if (publicClient) {
                                try {
                                  const duration = 365 * 24 * 60 * 60; // 1 year in seconds
                                  const priceInfo = await premiumPriceService.getPremiumPrice(
                                    publicClient,
                                    domain.name,
                                    duration
                                  );
                                  setRenewPrice(priceInfo || null);
                                } catch (error) {
                                  console.error('Error fetching renewal price:', error);
                                  toast.error('Failed to fetch renewal price');
                                } finally {
                                  setIsLoadingRenewPrice(false);
                                }
                              }
                            }}
                            disabled={!walletClient || !publicClient}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Renew
                          </Button>
                        </div>
                      </div>
                    )}

                    {domain.resolver && (
                      <div className="md:col-span-2">
                        <Label className="text-slate-600">Resolver</Label>
                        <div className="flex items-start gap-2 mt-1">
                          <code className="text-slate-900 break-all flex-1 min-w-0">{formatAddress(domain.resolver, resolverENSName)}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-shrink-0"
                            onClick={() => copyToClipboard(domain.resolver!)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {address && address.toLowerCase() !== domain.owner.toLowerCase() && isDomainForSale && (
                      <Button
                        className="justify-start bg-pink-500 hover:bg-pink-600 text-white"
                        onClick={() => setShowOfferDialog(true)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Make Offer
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Button>
                    )}
                    {address && address.toLowerCase() === domain.owner.toLowerCase() && (
                      <>
                        <Button
                          variant="outline"
                          className="justify-start"
                          onClick={() => setActiveTab('metadata')}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Edit Metadata
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start"
                          onClick={() => setActiveTab('subdomains')}
                        >
                          <Network className="h-4 w-4 mr-2" />
                          Manage Subdomains
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start"
                          onClick={() => setActiveTab('security')}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Configure Security
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start"
                          onClick={() => setActiveTab('transfer')}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Transfer Ownership
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Metadata Tab */}
            <TabsContent value="metadata" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>Metadata & Contract Information</CardTitle>
                        {stagedEdits.length > 0 && (
                          <Badge variant="secondary" className="animate-pulse">
                            {stagedEdits.length} staged
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        Configure text records and contract metadata following ENS standards
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button onClick={handleSaveMetadata} disabled={isSaving}>
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => setIsEditing(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Metadata
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Schema Selector */}
                  <div className="space-y-2">
                    <Label>Metadata Schema</Label>
                    <Select
                      value={selectedSchema?.id || ''}
                      onValueChange={(id: string) => {
                        const schema = ALL_SCHEMAS.find(s => s.id === id);
                        setSelectedSchema(schema || null);
                      }}
                      disabled={!isEditing}
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

                  <Separator />

                  {/* Metadata Fields */}
                  {selectedSchema && (
                    <div className="space-y-4">
                      <h3 className="text-slate-900">Schema Fields</h3>
                      {selectedSchema.fields.map(field => (
                        <div key={field.key} className="space-y-2">
                          <Label htmlFor={field.key}>
                            {field.label}
                            {field.required && <span className="text-red-600 ml-1">*</span>}
                          </Label>
                          <p className="text-slate-600">{field.description}</p>
                          {field.type === 'text' && (
                            <Textarea
                              id={field.key}
                              value={metadata[field.key] || ''}
                              onChange={(e) => updateMetadataField(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              disabled={!isEditing}
                              rows={3}
                            />
                          )}
                          {(field.type === 'url' || field.type === 'address') && (
                            <Input
                              id={field.key}
                              value={metadata[field.key] || ''}
                              onChange={(e) => updateMetadataField(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              disabled={!isEditing}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!selectedSchema && (
                    <Alert>
                      <Database className="h-4 w-4" />
                      <AlertTitle>Select a Schema</AlertTitle>
                      <AlertDescription>
                        Choose a metadata schema to configure standardized contract information
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Records Tab */}
            <TabsContent value="records" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>ENS Records</CardTitle>
                  <CardDescription>Configure address, text, and contenthash records</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-slate-900">Address Records</h3>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Coin
                      </Button>
                    </div>
                    <Alert>
                      <Database className="h-4 w-4" />
                      <AlertDescription>
                        Multicoin address support. Add addresses for ETH, BTC, SOL, and other cryptocurrencies.
                      </AlertDescription>
                    </Alert>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-slate-900">Text Records</h3>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {isEditing ? 'Cancel' : 'Edit'}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(metadata).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Input value={key} disabled className="flex-1" />
                          <Input 
                            value={value} 
                            onChange={(e) => updateMetadataField(key, e.target.value)}
                            disabled={!isEditing}
                            className="flex-2"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-slate-900">Contenthash</h3>
                      {!isEditingContentHash && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingContentHash(true)}
                          disabled={!walletClient || !publicClient}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          {contentHashValue ? 'Edit' : 'Set'}
                        </Button>
                      )}
                    </div>
                    {isEditingContentHash ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Content Hash</Label>
                          <Input
                            placeholder="/ipfs/Qm..., /ipns/..., /bzz/..., or hex string"
                            value={contentHashValue}
                            onChange={(e) => setContentHashValue(e.target.value)}
                          />
                          <p className="text-xs text-slate-500">
                            Supports IPFS (/ipfs/...), IPNS (/ipns/...), Swarm (/bzz/...), or hex string
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!walletClient || !publicClient || !contentHashValue.trim()) {
                                toast.error('Please enter a content hash');
                                return;
                              }

                              try {
                                const executeFn = async () => {
                                  return await setContentHash(walletClient, publicClient, {
                                    name: domain.name,
                                    contentHash: contentHashValue.trim(),
                                  }) as `0x${string}`;
                                };

                                await txManager.addTransaction(executeFn, {
                                  description: `Set content hash for ${domain.name}`,
                                  onSuccess: () => {
                                    setIsEditingContentHash(false);
                                    onUpdate();
                                    loadContentHash();
                                  },
                                });
                              } catch (error) {
                                console.error('Error setting content hash:', error);
                                toast.error('Failed to set content hash', {
                                  description: error instanceof Error ? error.message : 'Unknown error',
                                });
                              }
                            }}
                            disabled={!contentHashValue.trim()}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsEditingContentHash(false);
                              loadContentHash(); // Reset to current value
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {contentHashValue ? (
                          <div className="p-3 bg-slate-50 rounded-lg border">
                            <code className="text-sm break-all">{contentHashValue}</code>
                          </div>
                        ) : (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              No content hash set. Set one to enable decentralized website hosting.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Resolver Tab */}
            <TabsContent value="resolver" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resolver Configuration</CardTitle>
                  <CardDescription>Set the resolver for {domain.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Resolver</Label>
                    <Input value={domain.resolver || 'None'} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>New Resolver Address</Label>
                    <Input 
                      placeholder="0x..." 
                      value={resolverAddress}
                      onChange={(e) => setResolverAddress(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSetResolver} disabled={!resolverAddress || !walletClient || !publicClient}>
                    <Save className="h-4 w-4 mr-2" />
                    Set Resolver
                  </Button>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Changing resolver will require migrating existing records. Backup recommended.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* TTL Configuration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>TTL (Time To Live)</CardTitle>
                      <CardDescription>Set resolver cache TTL for {domain.name}</CardDescription>
                    </div>
                    {!isEditingTTL && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingTTL(true)}
                        disabled={!walletClient || !publicClient}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        {ttlValue !== null ? 'Edit' : 'Set'}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditingTTL ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>TTL (seconds)</Label>
                        <Input
                          type="number"
                          placeholder="300"
                          value={newTTL}
                          onChange={(e) => setNewTTL(e.target.value)}
                        />
                        <p className="text-xs text-slate-500">
                          TTL controls how long resolvers cache records. Common values: 300 (5 min), 3600 (1 hour), 86400 (1 day).
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!walletClient || !publicClient || !newTTL) {
                              toast.error('Please enter a TTL value');
                              return;
                            }

                            const ttl = parseInt(newTTL);
                            if (isNaN(ttl) || ttl < 0) {
                              toast.error('TTL must be a positive number');
                              return;
                            }

                            try {
                              const executeFn = async () => {
                                return await setTTL(walletClient, publicClient, {
                                  name: domain.name,
                                  ttl,
                                }) as `0x${string}`;
                              };

                              await txManager.addTransaction(executeFn, {
                                description: `Set TTL for ${domain.name} to ${ttl} seconds`,
                                onSuccess: () => {
                                  setIsEditingTTL(false);
                                  onUpdate();
                                  loadTTL();
                                },
                              });
                            } catch (error) {
                              console.error('Error setting TTL:', error);
                              toast.error('Failed to set TTL', {
                                description: error instanceof Error ? error.message : 'Unknown error',
                              });
                            }
                          }}
                          disabled={!newTTL}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingTTL(false);
                            loadTTL(); // Reset to current value
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ttlValue !== null ? (
                        <div className="p-3 bg-slate-50 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-700">Current TTL:</span>
                            <span className="text-sm font-mono text-slate-900">{ttlValue} seconds</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {ttlValue < 60 ? `${ttlValue}s` : ttlValue < 3600 ? `${Math.floor(ttlValue / 60)} minutes` : `${Math.floor(ttlValue / 3600)} hours`}
                          </div>
                        </div>
                      ) : (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            No TTL set. Default resolver TTL will be used.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ABI Configuration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>ABI (Application Binary Interface)</CardTitle>
                      <CardDescription>Attach contract ABI to {domain.name}</CardDescription>
                    </div>
                    {!isEditingABI && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingABI(true)}
                        disabled={!walletClient || !publicClient}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        {abiValue ? 'Edit' : 'Set'}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditingABI ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Content Type</Label>
                        <Select value={abiContentType.toString()} onValueChange={(v: string) => setAbiContentType(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">JSON (1)</SelectItem>
                            <SelectItem value="2">CBOR (2)</SelectItem>
                            <SelectItem value="4">URI (4)</SelectItem>
                            <SelectItem value="8">ZIP (8)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>ABI Data (JSON or hex string)</Label>
                        <Textarea
                          placeholder='[{"type":"function","name":"transfer",...}] or 0x...'
                          value={newABI}
                          onChange={(e) => setNewABI(e.target.value)}
                          rows={8}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-slate-500">
                          Paste your contract ABI as JSON array or hex-encoded bytes. JSON is recommended for readability.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!walletClient || !publicClient || !newABI.trim()) {
                              toast.error('Please enter ABI data');
                              return;
                            }

                            try {
                              const executeFn = async () => {
                                return await setABI(walletClient, publicClient, {
                                  name: domain.name,
                                  contentType: abiContentType,
                                  data: newABI.trim(),
                                }) as `0x${string}`;
                              };

                              await txManager.addTransaction(executeFn, {
                                description: `Set ABI for ${domain.name} (contentType: ${abiContentType})`,
                                onSuccess: () => {
                                  setIsEditingABI(false);
                                  onUpdate();
                                  loadABI();
                                },
                              });
                            } catch (error) {
                              console.error('Error setting ABI:', error);
                              toast.error('Failed to set ABI', {
                                description: error instanceof Error ? error.message : 'Unknown error',
                              });
                            }
                          }}
                          disabled={!newABI.trim()}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingABI(false);
                            loadABI(); // Reset to current value
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {abiValue ? (
                        <div className="p-3 bg-slate-50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Current ABI</span>
                            <Badge variant="outline">ContentType: {abiContentType}</Badge>
                          </div>
                          <pre className="text-xs overflow-auto max-h-48 p-2 bg-white rounded border">
                            {abiValue.length > 200 ? `${abiValue.slice(0, 200)}...` : abiValue}
                          </pre>
                        </div>
                      ) : (
                        <Alert>
                          <Code className="h-4 w-4" />
                          <AlertDescription>
                            No ABI set. Attach a contract ABI to enable dApp integration.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reverse Tab */}
            <TabsContent value="reverse" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reverse Record</CardTitle>
                  <CardDescription>Set ENS name for address {domain.owner}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>ENS Name</Label>
                    <Input 
                      placeholder={domain.name} 
                      value={reverseName}
                      onChange={(e) => setReverseName(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSetReverseRecord} disabled={!reverseName}>
                    <Save className="h-4 w-4 mr-2" />
                    Set Reverse Name
                  </Button>
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertDescription>
                      Setting a reverse record allows {domain.owner} to resolve to {domain.name}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Wrapper Tab */}
            <TabsContent value="wrapper" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Name Wrapper</CardTitle>
                  <CardDescription>Enhanced security and permissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {domain.isWrapped ? (
                    <>
                      <Alert className="border-blue-200 bg-blue-50">
                        <Lock className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-900">Name is Wrapped</AlertTitle>
                        <AlertDescription className="text-blue-800">
                          This name has enhanced security features enabled
                        </AlertDescription>
                      </Alert>
                      <Button variant="outline" onClick={handleUnwrap} disabled={!walletClient || !publicClient}>
                        <Unlock className="h-4 w-4 mr-2" />
                        Unwrap Name
                      </Button>
                    </>
                  ) : (
                    <>
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          Wrapping provides enhanced security features and finer-grained permissions
                        </AlertDescription>
                      </Alert>
                      <Button onClick={handleWrap} disabled={!walletClient || !publicClient}>
                        <Lock className="h-4 w-4 mr-2" />
                        Wrap Name
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subdomains Tab */}
            <TabsContent value="subdomains" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Subdomain Management</CardTitle>
                      <CardDescription>
                        Create and manage subdomains under {domain.name}
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowCreateSubdomain(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Subdomain
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {subdomains.length > 0 ? (
                    <div className="space-y-3">
                      {subdomains.map((subdomain, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="text-slate-900">{subdomain}</p>
                              <p className="text-slate-600">Active subdomain</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <Network className="h-4 w-4" />
                      <AlertTitle>No Subdomains</AlertTitle>
                      <AlertDescription>
                        Create your first subdomain to organize your ENS infrastructure
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Hierarchy Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Hierarchy</CardTitle>
                  <CardDescription>Standard subdomain patterns for contracts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { label: 'app', desc: 'Main application contract' },
                      { label: 'dao', desc: 'Governance contracts' },
                      { label: 'vault', desc: 'Treasury/vault contracts' },
                      { label: 'api', desc: 'API endpoints' },
                      { label: 'oracle', desc: 'Price feed oracles' },
                    ].map((pattern) => (
                      <div key={pattern.label} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <code className="text-blue-600">{pattern.label}.{domain.name}</code>
                          <p className="text-slate-600">{pattern.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fuse Management</CardTitle>
                  <CardDescription>
                    Configure permissions and restrictions for wrapped names
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {domain.isWrapped ? (
                    <>
                      <Alert className="border-blue-200 bg-blue-50">
                        <Lock className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-900">Name is Wrapped</AlertTitle>
                        <AlertDescription className="text-blue-800">
                          This name has enhanced security features through the NameWrapper contract
                        </AlertDescription>
                      </Alert>

                      <Button onClick={() => setShowFuseManager(true)} className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Fuses
                      </Button>

                      <div className="space-y-2">
                        <Label>Available Fuses</Label>
                        {Object.keys(FUSES).map((fuseName) => (
                          <div key={fuseName} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="text-slate-900">{fuseName}</p>
                              <p className="text-slate-600">
                                {fuseName.includes('CANNOT') ? 'Restricts' : 'Allows'} specific operations
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-900">Name Not Wrapped</AlertTitle>
                      <AlertDescription className="text-amber-800">
                        Wrap this name to access enhanced security features and fuse controls
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="space-y-6 mt-6">
              <GranularPermissions domainName={domain.name} />
            </TabsContent>

            {/* Transfer Tab */}
            <TabsContent value="transfer" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Transfer Ownership</CardTitle>
                  <CardDescription>
                    Transfer this ENS name to another address
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900">Warning</AlertTitle>
                    <AlertDescription className="text-amber-800">
                      Transferring ownership is permanent and cannot be undone. Make sure you trust the recipient address.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={() => setShowTransfer(true)}
                    variant="destructive"
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Initiate Transfer
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Subdomain Dialog */}
      <Dialog open={showCreateSubdomain} onOpenChange={setShowCreateSubdomain}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subdomain</DialogTitle>
            <DialogDescription>
              Create a new subdomain under {domain.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subdomain-label">Subdomain Label</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain-label"
                  value={newSubdomainLabel}
                  onChange={(e) => setNewSubdomainLabel(e.target.value)}
                  placeholder="app"
                />
                <span className="text-slate-600">.{domain.name}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain-owner">Owner Address</Label>
              <Input
                id="subdomain-owner"
                value={newSubdomainOwner}
                onChange={(e) => setNewSubdomainOwner(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="space-y-2">
              <Label>Fuses (Optional)</Label>
              <div className="space-y-2">
                {['CANNOT_UNWRAP', 'CANNOT_TRANSFER', 'CANNOT_SET_RESOLVER'].map((fuse) => (
                  <div key={fuse} className="flex items-center gap-2">
                    <Switch
                      checked={selectedFuses.includes(fuse)}
                      onCheckedChange={() => toggleFuse(fuse)}
                    />
                    <Label>{fuse}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSubdomain(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubdomain}>Create Subdomain</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer {domain.name}</DialogTitle>
            <DialogDescription>
              Enter the address to transfer ownership to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-900">This action is irreversible</AlertTitle>
              <AlertDescription className="text-red-800">
                Once transferred, you will lose all control over this name
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="transfer-address">Recipient Address</Label>
              <Input
                id="transfer-address"
                value={transferAddress}
                onChange={(e) => setTransferAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransfer(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeTransfer} disabled={!walletClient || !publicClient}>
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fuse Manager Dialog */}
      <Dialog open={showFuseManager} onOpenChange={setShowFuseManager}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Fuses</DialogTitle>
            <DialogDescription>
              Set permissions and restrictions for {domain.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(FUSES).map(([fuseName, _fuseValue]) => (
              <div key={fuseName} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-slate-900">{fuseName}</p>
                  <p className="text-slate-600">
                    {fuseName.includes('CANNOT') ? 'Prevents' : 'Allows'} operation
                  </p>
                </div>
                <Switch
                  checked={selectedFuses.includes(fuseName)}
                  onCheckedChange={() => toggleFuse(fuseName)}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFuseManager(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetFuses}>Apply Fuses</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Confirmation Dialogs */}
      {confirmationDialog.type === 'transfer' && (
        <TransactionConfirmationDialog
          open={confirmationDialog.open}
          onOpenChange={(open) => setConfirmationDialog({ ...confirmationDialog, open })}
          title="Transfer Domain Ownership"
          description={`You are about to transfer ${domain.name} to a new owner.`}
          action="Confirm Transfer"
          details={`Transferring to: ${confirmationDialog.data?.address || ''}`}
          warning="This action is permanent and cannot be undone. You will lose all control over this domain."
          destructive
          requiresConfirmation
          onConfirm={executeTransfer}
        />
      )}

      {confirmationDialog.type === 'wrap' && (
        <TransactionConfirmationDialog
          open={confirmationDialog.open}
          onOpenChange={(open) => setConfirmationDialog({ ...confirmationDialog, open })}
          title="Wrap ENS Name"
          description={`You are about to wrap ${domain.name} using the NameWrapper contract.`}
          action="Wrap Name"
          details="Wrapping provides enhanced security features and finer-grained permissions through fuses."
          requiresConfirmation
          onConfirm={executeWrap}
        />
      )}

      {confirmationDialog.type === 'unwrap' && (
        <TransactionConfirmationDialog
          open={confirmationDialog.open}
          onOpenChange={(open) => setConfirmationDialog({ ...confirmationDialog, open })}
          title="Unwrap ENS Name"
          description={`You are about to unwrap ${domain.name} and return it to the registry.`}
          action="Unwrap Name"
          warning="Unwrapping will remove enhanced security features. This action cannot be undone."
          destructive
          requiresConfirmation
          onConfirm={executeUnwrap}
        />
      )}

      {confirmationDialog.type === 'resolver' && (
        <TransactionConfirmationDialog
          open={confirmationDialog.open}
          onOpenChange={(open) => setConfirmationDialog({ ...confirmationDialog, open })}
          title="Change Resolver"
          description={`You are about to change the resolver for ${domain.name}.`}
          action="Set Resolver"
          details={`New resolver: ${confirmationDialog.data?.address || ''}`}
          warning="Changing resolver will require migrating existing records. Make sure to backup your records first."
          requiresConfirmation
          onConfirm={executeSetResolver}
        />
      )}

      {/* Renewal Dialog */}
      <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Domain</DialogTitle>
            <DialogDescription>
              Renew {domain.name} for 1 year
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {domain.expiryDate && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-700">Current Expiry</span>
                  <span className="text-sm text-slate-900">
                    {domain.expiryDate.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-700">New Expiry</span>
                  <span className="text-sm text-slate-900">
                    {domain.expiryDate ? new Date(new Date(domain.expiryDate).getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString() : '1 year from now'}
                  </span>
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Renewal Cost</span>
                {isLoadingRenewPrice ? (
                  <div className="h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                ) : renewPrice ? (
                  <span className="text-lg font-semibold text-slate-900">
                    {premiumPriceService.formatPrice(renewPrice.total)}
                  </span>
                ) : (
                  <span className="text-sm text-slate-500">Loading...</span>
                )}
              </div>
              {renewPrice && (
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Base price:</span>
                    <span className="text-slate-700">{premiumPriceService.formatPrice(renewPrice.base)}</span>
                  </div>
                  {renewPrice.hasPremium && (
                    <div className="flex justify-between">
                      <span>Premium:</span>
                      <span className="text-amber-600">{premiumPriceService.formatPrice(renewPrice.premium)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t">
                    <span className="font-semibold text-slate-900">Total:</span>
                    <span className="font-semibold text-slate-900">{premiumPriceService.formatPrice(renewPrice.total)}</span>
                  </div>
                </div>
              )}
            </div>

            {renewPrice?.hasPremium && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This domain has a premium renewal fee. The premium portion is non-refundable.
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertDescription>
                Renewing will extend your domain registration by 1 year. Make sure you have enough ETH to cover the renewal cost plus gas fees.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!walletClient || !publicClient) {
                  toast.error('Wallet not connected');
                  return;
                }

                try {
                  const executeFn = async () => {
                    return await renewDomain(walletClient, publicClient, {
                      name: domain.name,
                      duration: 365 * 24 * 60 * 60, // 1 year in seconds
                    }) as `0x${string}`;
                  };

                  await txManager.addTransaction(executeFn, {
                    description: `Renew ${domain.name} for 1 year`,
                    onSuccess: () => {
                      setShowRenewDialog(false);
                      onUpdate();
                    },
                  });
                } catch (error) {
                  console.error('Error renewing domain:', error);
                  toast.error('Failed to renew domain', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                  });
                }
              }}
              disabled={isLoadingRenewPrice || !renewPrice}
            >
              {isLoadingRenewPrice ? (
                'Loading...'
              ) : (
                `Renew for ${renewPrice ? premiumPriceService.formatPrice(renewPrice.total) : '...'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Make an Offer</DialogTitle>
            <DialogDescription>
              Send an offer to the owner of {domain.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {domainListing && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">Current Listing Price</div>
                <div className="text-lg font-semibold text-slate-900">
                  {domainListing.price} {domainListing.currency || 'ETH'}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="offer-price">Offer Price (ETH)</Label>
              <Input
                id="offer-price"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.0"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter your offer amount in ETH
              </p>
            </div>
            <Alert>
              <AlertDescription className="text-xs">
                Your offer will be sent to the domain owner. They can accept or reject your offer.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowOfferDialog(false);
              setOfferPrice('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateOffer}
              disabled={isCreatingOffer || !offerPrice || parseFloat(offerPrice) <= 0}
            >
              {isCreatingOffer ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating Offer...
                </>
              ) : (
                'Send Offer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
