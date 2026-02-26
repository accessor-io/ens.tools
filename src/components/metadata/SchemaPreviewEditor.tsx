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
import { Separator } from '../ui/separator';
import { 
  FileCode, 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  Eye,
  Edit,
  Copy,
  Download,
  Upload,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { validateENSIPXFull, QAValidator } from '../../lib/metadata/ensipx-validator';
import type { ENSIPXMetadata } from '../../lib/metadata/ensipx-utils';

interface SchemaPreviewEditorProps {
  domain?: string;
  initialMetadata?: Partial<ENSIPXMetadata>;
  onSave?: (metadata: ENSIPXMetadata) => void;
  readOnly?: boolean;
}

export function SchemaPreviewEditor({ 
  domain = '', 
  initialMetadata = {},
  onSave,
  readOnly = false 
}: SchemaPreviewEditorProps) {
  const [metadata, setMetadata] = useState<Partial<ENSIPXMetadata>>(initialMetadata);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [complianceScore, setComplianceScore] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<'json' | 'form'>('form');
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (Object.keys(metadata).length > 0) {
      const result = validateENSIPXFull(metadata);
      setValidationResult(result);
      
      const score = QAValidator.calculateComplianceScore(metadata);
      setComplianceScore(score);
    }
  }, [metadata]);

  const updateField = (path: string[], value: any) => {
    setMetadata(prev => {
      const updated = { ...prev };
      let current: any = updated;
      
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  const addAddress = () => {
    setMetadata(prev => ({
      ...prev,
      addresses: [
        ...(prev.addresses || []),
        { chainId: 1, address: '' }
      ]
    }));
  };

  const removeAddress = (index: number) => {
    setMetadata(prev => ({
      ...prev,
      addresses: prev.addresses?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSave = () => {
    if (validationResult && !validationResult.valid) {
      toast.error('Validation failed', {
        description: 'Please fix all errors before saving'
      });
      return;
    }

    if (onSave) {
      onSave(metadata as ENSIPXMetadata);
      toast.success('Metadata saved', {
        description: 'ENSIP-X metadata has been saved successfully'
      });
    }
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
    toast.success('Copied to clipboard');
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain || 'metadata'}-ensip19.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setMetadata(json);
        toast.success('Metadata imported');
      } catch (error) {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Compliance Score */}
      {complianceScore && (
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-16 h-16 rounded-lg ${
                  complianceScore.score >= 90 ? 'bg-emerald-100' :
                  complianceScore.score >= 80 ? 'bg-blue-100' :
                  complianceScore.score >= 70 ? 'bg-amber-100' :
                  'bg-red-100'
                }`}>
                  <span className={`text-2xl font-semibold ${
                    complianceScore.score >= 90 ? 'text-emerald-700' :
                    complianceScore.score >= 80 ? 'text-blue-700' :
                    complianceScore.score >= 70 ? 'text-amber-700' :
                    'text-red-700'
                  }`}>
                    {complianceScore.score}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">ENS Compliance Score</p>
                  <p className="text-sm text-slate-600 capitalize">{complianceScore.level}</p>
                </div>
              </div>
              <Badge variant={
                complianceScore.score >= 90 ? 'default' :
                complianceScore.score >= 80 ? 'secondary' :
                'destructive'
              }>
                {complianceScore.level.toUpperCase()}
              </Badge>
            </div>

            {/* Breakdown */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {Object.entries(complianceScore.breakdown).map(([name, data]: [string, any]) => (
                <div key={name} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                  <span className="text-sm text-slate-700">{name}</span>
                  {data.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Errors/Warnings */}
      {validationResult && (
        <>
          {validationResult.errors.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium text-red-800">Validation Errors</p>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {validationResult.errors.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {validationResult.warnings.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium text-amber-800">Warnings</p>
                  <ul className="list-disc list-inside text-sm text-amber-700">
                    {validationResult.warnings.map((warning: string, i: number) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={previewMode === 'form' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode('form')}
          >
            <Edit className="h-4 w-4 mr-2" />
            Form
          </Button>
          <Button
            variant={previewMode === 'json' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode('json')}
          >
            <Eye className="h-4 w-4 mr-2" />
            JSON
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyJSON}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={exportJSON}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label>
            <input
              type="file"
              accept=".json"
              onChange={importJSON}
              className="hidden"
            />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
          </label>
          {!readOnly && (
            <Button onClick={handleSave} disabled={validationResult && !validationResult.valid}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Form View */}
      {previewMode === 'form' && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              ENSIP-X Metadata Editor
            </CardTitle>
            <CardDescription>
              Edit contract metadata following ENSIP-X specification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="addresses">Addresses</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              {/* Basic Fields */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={metadata.displayName || ''}
                    onChange={(e) => updateField(['displayName'], e.target.value)}
                    placeholder="Uniswap V3 Governor"
                    disabled={readOnly}
                  />
                  <p className="text-xs text-slate-500">Human-readable contract name (without .eth or subdomain separators)</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Canonical ID</Label>
                    <Input
                      value={metadata.id || ''}
                      onChange={(e) => updateField(['id'], e.target.value)}
                      placeholder="org.protocol.category.role.v1.1"
                      disabled={readOnly}
                    />
                    <p className="text-xs text-slate-500">Unique identifier following ENSIP-X grammar</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Input
                      value={metadata.org || ''}
                      onChange={(e) => updateField(['org'], e.target.value)}
                      placeholder="uniswap"
                      disabled={readOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Protocol</Label>
                    <Input
                      value={metadata.protocol || ''}
                      onChange={(e) => updateField(['protocol'], e.target.value)}
                      placeholder="uniswap-v3"
                      disabled={readOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={metadata.category || ''}
                      onValueChange={(value: any) => updateField(['category'], value)}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {['defi', 'dao', 'l2', 'infra', 'token', 'nft', 'gaming', 'social', 'identity', 'privacy', 'security', 'wallet', 'analytics', 'rwa', 'supply', 'health', 'finance', 'dev', 'art'].map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      value={metadata.role || ''}
                      onChange={(e) => updateField(['role'], e.target.value)}
                      placeholder="governor"
                      disabled={readOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Version</Label>
                    <Input
                      value={metadata.version || ''}
                      onChange={(e) => updateField(['version'], e.target.value)}
                      placeholder="v1-0-0"
                      disabled={readOnly}
                    />
                    <p className="text-xs text-slate-500">Format: v{num}, v{num}-{num}, or v{num}-{num}-{num}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Chain ID</Label>
                    <Input
                      type="number"
                      value={metadata.chainId || ''}
                      onChange={(e) => updateField(['chainId'], parseInt(e.target.value))}
                      placeholder="1"
                      disabled={readOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>ENS Root</Label>
                    <Input
                      value={metadata.ensRoot || ''}
                      onChange={(e) => updateField(['ensRoot'], e.target.value)}
                      placeholder="uniswap.defi.cns.eth"
                      disabled={readOnly}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Metadata Hash</Label>
                  <Input
                    value={metadata.metadataHash || ''}
                    onChange={(e) => updateField(['metadataHash'], e.target.value)}
                    placeholder="0x..."
                    disabled={readOnly}
                  />
                  <p className="text-xs text-slate-500">SHA-256 hash of complete metadata artifact</p>
                </div>
              </TabsContent>

              {/* Addresses */}
              <TabsContent value="addresses" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">Contract addresses by chain</p>
                  {!readOnly && (
                    <Button size="sm" onClick={addAddress}>
                      Add Address
                    </Button>
                  )}
                </div>

                {metadata.addresses?.map((addr, index) => (
                  <Card key={index} className="border">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Chain ID</Label>
                          <Input
                            type="number"
                            value={addr.chainId}
                            onChange={(e) => {
                              const updated = [...(metadata.addresses || [])];
                              updated[index] = { ...updated[index], chainId: parseInt(e.target.value) };
                              updateField(['addresses'], updated);
                            }}
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Address</Label>
                          <Input
                            value={addr.address}
                            onChange={(e) => {
                              const updated = [...(metadata.addresses || [])];
                              updated[index] = { ...updated[index], address: e.target.value };
                              updateField(['addresses'], updated);
                            }}
                            placeholder="0x..."
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Deployed Block</Label>
                          <Input
                            type="number"
                            value={addr.deployedBlock || ''}
                            onChange={(e) => {
                              const updated = [...(metadata.addresses || [])];
                              updated[index] = { ...updated[index], deployedBlock: parseInt(e.target.value) };
                              updateField(['addresses'], updated);
                            }}
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Bytecode Hash</Label>
                          <Input
                            value={addr.bytecodeHash || ''}
                            onChange={(e) => {
                              const updated = [...(metadata.addresses || [])];
                              updated[index] = { ...updated[index], bytecodeHash: e.target.value };
                              updateField(['addresses'], updated);
                            }}
                            placeholder="0x..."
                            disabled={readOnly}
                          />
                        </div>
                      </div>
                      {!readOnly && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="mt-4"
                          onClick={() => removeAddress(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Security */}
              <TabsContent value="security" className="space-y-4 mt-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Security information is critical for ENS compliance. Ensure audit data is verified.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Upgradeability Type</Label>
                    <Select
                      value={metadata.security?.upgradeability || ''}
                      onValueChange={(value: any) => updateField(['security', 'upgradeability'], value)}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {['immutable', 'transparent', 'uups', 'diamond', 'beacon', 'minimal'].map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Contract Owners</Label>
                    <Textarea
                      value={metadata.security?.owners?.join('\n') || ''}
                      onChange={(e) => updateField(['security', 'owners'], e.target.value.split('\n').filter(Boolean))}
                      placeholder="0x...&#10;0x..."
                      disabled={readOnly}
                    />
                    <p className="text-xs text-slate-500">One address per line</p>
                  </div>
                </div>
              </TabsContent>

              {/* Lifecycle */}
              <TabsContent value="lifecycle" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={metadata.lifecycle?.status || ''}
                      onValueChange={(value: any) => updateField(['lifecycle', 'status'], value)}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {['planning', 'development', 'testing', 'deployed', 'deprecated', 'discontinued'].map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Replaced By</Label>
                    <Input
                      value={metadata.lifecycle?.replacedBy || ''}
                      onChange={(e) => updateField(['lifecycle', 'replacedBy'], e.target.value)}
                      placeholder="v2"
                      disabled={readOnly}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Advanced */}
              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Standards (ERC, Interfaces)</Label>
                  <Textarea
                    value={JSON.stringify(metadata.standards || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        updateField(['standards'], JSON.parse(e.target.value));
                      } catch {}
                    }}
                    disabled={readOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    value={metadata.tags?.join(', ') || ''}
                    onChange={(e) => updateField(['tags'], e.target.value.split(', ').filter(Boolean))}
                    placeholder="defi, governance, ethereum"
                    disabled={readOnly}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* JSON View */}
      {previewMode === 'json' && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle>JSON Preview</CardTitle>
            <CardDescription>Raw ENSIP-X metadata</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-50 p-4 rounded border overflow-auto max-h-96">
              <code className="text-sm">{JSON.stringify(metadata, null, 2)}</code>
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

