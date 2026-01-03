import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  Download,
  Copy,
  Shield,
  Clock,
  History,
  Eye,
  FileJson,
  Database,
  Sparkles,
  Search,
  Save,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDomainContext } from '../../lib/contexts/DomainContext';
import { useWeb3 } from '../../lib/services';
import { fetchENSNames, type ENSDomain } from '../../lib/ens/ens-utils';
import { useEffect, useState } from 'react';

interface MetadataField {
  key: string;
  value: string;
  type: 'text' | 'url' | 'address' | 'email' | 'number';
  verified: boolean;
  lastModified: string;
  standard: boolean;
}

interface MetadataTemplate {
  name: string;
  description: string;
  category: string;
  fields: Omit<MetadataField, 'verified' | 'lastModified'>[];
}

export function MetadataTools() {
  const { selectedDomain, selectDomain } = useDomainContext();
  const { address, isConnected } = useWeb3();
  const [availableDomains, setAvailableDomains] = useState<ENSDomain[]>([]);
  const [localSelectedDomain, setLocalSelectedDomain] = useState(selectedDomain?.name || '');
  
  useEffect(() => {
    if (selectedDomain) {
      setLocalSelectedDomain(selectedDomain.name);
    }
  }, [selectedDomain]);
  
  useEffect(() => {
    if (isConnected && address) {
      loadDomains();
    }
  }, [isConnected, address]);
  
  const loadDomains = async () => {
    if (!address) return;
    try {
      const domains = await fetchENSNames(address);
      setAvailableDomains(domains);
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  };
  
  const handleDomainSelect = (domainName: string) => {
    setLocalSelectedDomain(domainName);
    const domain = availableDomains.find(d => d.name === domainName);
    if (domain) {
      selectDomain(domain);
    }
  };
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([
    {
      key: 'avatar',
      value: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      type: 'url',
      verified: true,
      lastModified: '2025-03-15',
      standard: true,
    },
    {
      key: 'description',
      value: 'Main application contract for Company Protocol',
      type: 'text',
      verified: true,
      lastModified: '2025-03-15',
      standard: true,
    },
    {
      key: 'url',
      value: 'https://company.eth',
      type: 'url',
      verified: true,
      lastModified: '2025-03-10',
      standard: true,
    },
    {
      key: 'email',
      value: 'contact@company.eth',
      type: 'email',
      verified: false,
      lastModified: '2025-03-08',
      standard: true,
    },
    {
      key: 'com.twitter',
      value: '@company',
      type: 'text',
      verified: true,
      lastModified: '2025-03-15',
      standard: true,
    },
    {
      key: 'com.github',
      value: 'company-dao',
      type: 'text',
      verified: true,
      lastModified: '2025-03-15',
      standard: true,
    },
    {
      key: 'com.discord',
      value: 'company-dao',
      type: 'text',
      verified: false,
      lastModified: '2025-03-01',
      standard: true,
    },
    {
      key: 'notice',
      value: 'This contract is governed by Company DAO. Upgrades require multisig approval.',
      type: 'text',
      verified: true,
      lastModified: '2025-02-20',
      standard: false,
    },
  ]);

  const metadataTemplates: MetadataTemplate[] = [
    {
      name: 'DAO Governance Contract',
      description: 'Standard metadata for DAO governance contracts',
      category: 'dao',
      fields: [
        { key: 'description', value: '', type: 'text', standard: true },
        { key: 'url', value: '', type: 'url', standard: true },
        { key: 'notice', value: 'Governed by DAO. Requires multisig for upgrades.', type: 'text', standard: false },
        { key: 'com.twitter', value: '', type: 'text', standard: true },
        { key: 'com.github', value: '', type: 'text', standard: true },
        { key: 'com.discord', value: '', type: 'text', standard: true },
      ],
    },
    {
      name: 'Treasury/Vault Contract',
      description: 'Security-focused metadata for treasury contracts',
      category: 'treasury',
      fields: [
        { key: 'description', value: 'Treasury vault managed by multisig', type: 'text', standard: true },
        { key: 'notice', value: 'CRITICAL: Multi-signature required for all transactions', type: 'text', standard: false },
        { key: 'security', value: 'Multisig controlled, time-locked withdrawals', type: 'text', standard: false },
        { key: 'contact', value: '', type: 'email', standard: false },
      ],
    },
    {
      name: 'Token Contract',
      description: 'Standard ERC-20/ERC-721 metadata',
      category: 'token',
      fields: [
        { key: 'description', value: '', type: 'text', standard: true },
        { key: 'url', value: '', type: 'url', standard: true },
        { key: 'avatar', value: '', type: 'url', standard: true },
        { key: 'decimals', value: '18', type: 'number', standard: false },
        { key: 'totalSupply', value: '', type: 'number', standard: false },
      ],
    },
    {
      name: 'API/Service Endpoint',
      description: 'Metadata for API and service contracts',
      category: 'service',
      fields: [
        { key: 'description', value: '', type: 'text', standard: true },
        { key: 'url', value: '', type: 'url', standard: true },
        { key: 'api.version', value: '1.0.0', type: 'text', standard: false },
        { key: 'api.documentation', value: '', type: 'url', standard: false },
      ],
    },
    {
      name: 'NFT Collection',
      description: 'NFT collection metadata',
      category: 'nft',
      fields: [
        { key: 'description', value: '', type: 'text', standard: true },
        { key: 'avatar', value: '', type: 'url', standard: true },
        { key: 'url', value: '', type: 'url', standard: true },
        { key: 'banner', value: '', type: 'url', standard: false },
        { key: 'com.opensea', value: '', type: 'text', standard: false },
      ],
    },
  ];

  const standardFields = [
    'avatar',
    'description',
    'url',
    'email',
    'keywords',
    'com.twitter',
    'com.github',
    'com.discord',
    'com.telegram',
  ];

  const metadataHistory = [
    {
      timestamp: '2025-03-15 14:32:10',
      action: 'Updated',
      field: 'description',
      oldValue: 'Main contract for Company',
      newValue: 'Main application contract for Company Protocol',
      user: '0x742d...35a3',
    },
    {
      timestamp: '2025-03-15 14:30:45',
      action: 'Added',
      field: 'com.twitter',
      oldValue: '',
      newValue: '@company',
      user: '0x742d...35a3',
    },
    {
      timestamp: '2025-03-10 09:15:22',
      action: 'Updated',
      field: 'url',
      oldValue: 'https://old.company.com',
      newValue: 'https://company.eth',
      user: '0x8a2f...91b4',
    },
  ];

  const handleApplyTemplate = (template: MetadataTemplate) => {
    const newFields = template.fields.map((field) => ({
      ...field,
      verified: false,
      lastModified: new Date().toISOString().split('T')[0],
    }));
    setMetadataFields([...metadataFields, ...newFields]);
    toast.success('Template applied', {
      description: `Added ${template.fields.length} fields from ${template.name}`,
    });
  };

  const handleVerifyField = (key: string) => {
    setMetadataFields(
      metadataFields.map((field) =>
        field.key === key ? { ...field, verified: !field.verified } : field
      )
    );
    toast.success('Verification status updated');
  };

  const handleBulkExport = () => {
    const exportData = {
      domain: selectedDomain,
      timestamp: new Date().toISOString(),
      metadata: metadataFields,
    };
    toast.success('Metadata exported', {
      description: 'Downloaded as JSON file',
    });
  };

  const handleBulkImport = () => {
    toast.success('Import functionality', {
      description: 'Upload a JSON file with metadata fields',
    });
  };

  const validationIssues = [
    {
      field: 'email',
      severity: 'warning' as const,
      message: 'Email address not verified',
    },
    {
      field: 'com.discord',
      severity: 'warning' as const,
      message: 'Discord username not verified',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">Advanced Metadata Tools</h2>
          <p className="text-slate-600">Comprehensive ENS metadata management and verification</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBulkImport}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleBulkExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save All
          </Button>
        </div>
      </div>

      {/* Domain Selector */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Select Domain</Label>
                <Select value={localSelectedDomain} onValueChange={handleDomainSelect}>
                <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDomains.length > 0 ? (
                      availableDomains.map((domain) => (
                        <SelectItem key={domain.name} value={domain.name}>
                          {domain.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No domains available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label>Quick Actions</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Status */}
      {validationIssues.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Validation Issues Found</AlertTitle>
          <AlertDescription className="text-amber-800">
            <ul className="list-disc list-inside mt-2 space-y-1">
              {validationIssues.map((issue, index) => (
                <li key={index}>
                  <strong>{issue.field}:</strong> {issue.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="editor" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="editor">Metadata Editor</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
        </TabsList>

        {/* Metadata Editor */}
        <TabsContent value="editor" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Metadata Fields for {selectedDomain}</CardTitle>
                  <CardDescription>
                    Manage all resolution records and metadata
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metadataFields.map((field, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-slate-700">{field.key}</code>
                          {field.standard && (
                            <Badge variant="outline" className="text-xs">
                              Standard
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={field.value}
                          onChange={(e) => {
                            const newFields = [...metadataFields];
                            newFields[index].value = e.target.value;
                            setMetadataFields(newFields);
                          }}
                          className="max-w-md"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {field.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {field.verified ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-slate-400" />
                          )}
                          <span className={field.verified ? 'text-emerald-700' : 'text-slate-600'}>
                            {field.verified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-600">
                          <Clock className="h-3 w-3" />
                          {field.lastModified}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerifyField(field.key)}
                        >
                          {field.verified ? 'Unverify' : 'Verify'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Alert className="border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Metadata Best Practices</AlertTitle>
            <AlertDescription className="text-blue-800">
              • Use standard field names when possible (avatar, description, url, email)
              <br />• Always verify critical fields before publishing
              <br />• Keep metadata up-to-date with current contract state
              <br />• Use IPFS for avatar and media assets
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Metadata Templates</CardTitle>
              <CardDescription>
                Pre-configured metadata sets for common contract types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {metadataTemplates.map((template, index) => (
                  <Card key={index} className="border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileJson className="h-5 w-5 text-blue-600" />
                        {template.name}
                      </CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-slate-700 mb-2">Includes {template.fields.length} fields:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.fields.slice(0, 4).map((field, i) => (
                            <Badge key={i} variant="secondary">
                              {field.key}
                            </Badge>
                          ))}
                          {template.fields.length > 4 && (
                            <Badge variant="outline">+{template.fields.length - 4} more</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleApplyTemplate(template)}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Apply Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Custom Templates</CardTitle>
              <CardDescription>Create and save your own metadata templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input placeholder="My Custom Template" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="Description of this template" />
                </div>
                <Button className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save as Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification */}
        <TabsContent value="verification" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Metadata Verification</CardTitle>
              <CardDescription>Verify metadata integrity and authenticity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-2 border-emerald-200 bg-emerald-50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
                      <p className="text-emerald-900 mb-1">{metadataFields.filter((f) => f.verified).length}</p>
                      <p className="text-emerald-700">Verified Fields</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-amber-200 bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <XCircle className="h-12 w-12 text-amber-600 mx-auto mb-2" />
                      <p className="text-amber-900 mb-1">{metadataFields.filter((f) => !f.verified).length}</p>
                      <p className="text-amber-700">Unverified Fields</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Shield className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                      <p className="text-blue-900 mb-1">
                        {Math.round((metadataFields.filter((f) => f.verified).length / metadataFields.length) * 100)}%
                      </p>
                      <p className="text-blue-700">Verification Rate</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <p className="text-slate-700">Verification Checklist:</p>
                {metadataFields.map((field, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={field.verified}
                        onCheckedChange={() => handleVerifyField(field.key)}
                      />
                      <div>
                        <p className="text-slate-900">{field.key}</p>
                        <p className="text-slate-600 truncate max-w-md">{field.value}</p>
                      </div>
                    </div>
                    {field.verified ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                ))}
              </div>

              <Button className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Verify All Fields
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Metadata Change History</CardTitle>
              <CardDescription>Audit trail of all metadata modifications</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Old Value</TableHead>
                    <TableHead>New Value</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metadataHistory.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-600">{entry.timestamp}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.action === 'Updated' ? 'default' : 'secondary'}>
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-slate-700">{entry.field}</code>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600 line-through">{entry.oldValue || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-emerald-700">{entry.newValue}</span>
                      </TableCell>
                      <TableCell>
                        <code className="text-slate-600">{entry.user}</code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Alert className="border-blue-200 bg-blue-50">
            <History className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Change Tracking</AlertTitle>
            <AlertDescription className="text-blue-800">
              All metadata changes are recorded on-chain and can be audited. Recent changes require
              multisig approval before finalization.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Bulk Operations */}
        <TabsContent value="bulk" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Bulk Metadata Operations</CardTitle>
              <CardDescription>Manage metadata across multiple domains</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Domains for Bulk Update</Label>
                <div className="space-y-2">
                  {['company.eth', 'app.company.eth', 'dao.company.eth', 'vault.company.eth'].map(
                    (domain) => (
                      <div key={domain} className="flex items-center gap-2">
                        <Checkbox id={domain} />
                        <Label htmlFor={domain} className="cursor-pointer">
                          {domain}
                        </Label>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bulk Operation Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select operation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Field to All</SelectItem>
                    <SelectItem value="update">Update Existing Field</SelectItem>
                    <SelectItem value="remove">Remove Field from All</SelectItem>
                    <SelectItem value="verify">Bulk Verify Fields</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Field Key</Label>
                <Input placeholder="com.twitter" />
              </div>

              <div className="space-y-2">
                <Label>Field Value</Label>
                <Input placeholder="@company" />
              </div>

              <Button className="w-full">
                <Database className="h-4 w-4 mr-2" />
                Execute Bulk Operation
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Import Metadata</CardTitle>
                <CardDescription>Upload JSON file with metadata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={`{\n  "avatar": "ipfs://...",\n  "description": "...",\n  "url": "https://..."\n}`}
                  rows={6}
                  className="font-mono"
                />
                <Button className="w-full" variant="outline" onClick={handleBulkImport}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import JSON
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Export Metadata</CardTitle>
                <CardDescription>Download as JSON or CSV</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-50 rounded border">
                  <p className="text-slate-600 mb-2">Export Format:</p>
                  <Select defaultValue="json">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="yaml">YAML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" variant="outline" onClick={handleBulkExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Metadata
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
