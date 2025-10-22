import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../lib/web3-provider';
import { ENSDomain, formatAddress, getAllTextRecords } from '../lib/ens-utils';
import { 
  setTextRecord, 
  createSubdomain, 
  transferDomain, 
  setFuses,
  FUSES,
  combineFuses,
  getActiveFuses,
} from '../lib/ens-write-operations';
import {
  ALL_SCHEMAS,
  getRecommendedSchema,
  validateMetadata,
  MetadataSchema,
  STANDARD_KEYS,
} from '../lib/metadata-schemas';

interface DomainProfileProps {
  domain: ENSDomain;
  onClose: () => void;
  onUpdate: () => void;
}

export function DomainProfile({ domain, onClose, onUpdate }: DomainProfileProps) {
  const { walletClient, publicClient, address } = useWeb3();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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
  
  // Fuses state
  const [selectedFuses, setSelectedFuses] = useState<string[]>([]);
  const [showFuseManager, setShowFuseManager] = useState(false);

  useEffect(() => {
    loadDomainDetails();
    loadSubdomains();
    
    // Set recommended schema
    const recommended = getRecommendedSchema(domain.name);
    setSelectedSchema(recommended);
  }, [domain]);

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

  const loadSubdomains = async () => {
    // Mock subdomain loading - in production, query The Graph for subdomains
    const mockSubdomains = [
      `app.${domain.name}`,
      `api.${domain.name}`,
      `dao.${domain.name}`,
    ];
    setSubdomains(mockSubdomains);
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
      // Save each text record
      for (const [key, value] of Object.entries(metadata)) {
        if (value) {
          await setTextRecord(walletClient, publicClient, {
            name: domain.name,
            recordType: 'text',
            key,
            value,
          });
        }
      }

      toast.success('Metadata saved successfully');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving metadata:', error);
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
      
      await createSubdomain(walletClient, {
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

  const handleTransfer = async () => {
    if (!walletClient || !transferAddress) {
      toast.error('Please enter a valid address');
      return;
    }

    try {
      await transferDomain(walletClient, {
        name: domain.name,
        newOwner: transferAddress,
      });

      toast.success('Transfer initiated', {
        description: `${domain.name} is being transferred to ${formatAddress(transferAddress)}`,
      });
      
      setShowTransfer(false);
      setTransferAddress('');
      onUpdate();
    } catch (error) {
      console.error('Error transferring domain:', error);
      toast.error('Failed to transfer domain', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
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

  const viewOnENSApp = () => {
    window.open(`https://app.ens.domains/${domain.name}`, '_blank');
  };

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
            <Button variant="outline" size="sm" onClick={viewOnENSApp}>
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="subdomains">Subdomains</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-slate-600">Owner</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-slate-900">{formatAddress(domain.owner)}</code>
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
                          <code className="text-slate-900">{formatAddress(domain.resolvedAddress)}</code>
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
                        <p className="text-slate-900 mt-1">
                          {domain.expiryDate.toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {domain.resolver && (
                      <div className="md:col-span-2">
                        <Label className="text-slate-600">Resolver</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-slate-900 break-all">{formatAddress(domain.resolver)}</code>
                          <Button
                            variant="ghost"
                            size="sm"
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
                      <CardTitle>Metadata & Contract Information</CardTitle>
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
                      onValueChange={(id) => {
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
            <Button variant="destructive" onClick={handleTransfer}>
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
            {Object.entries(FUSES).map(([fuseName, fuseValue]) => (
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
    </div>
  );
}
