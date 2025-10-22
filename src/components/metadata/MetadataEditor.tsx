import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Save, 
  Plus, 
  Trash2, 
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

export function MetadataEditor() {
  const [selectedDomain, setSelectedDomain] = useState('app.company.eth');
  const [textRecords, setTextRecords] = useState([
    { key: 'url', value: 'https://app.company.com' },
    { key: 'description', value: 'Main application contract for Company DAO' },
    { key: 'notice', value: 'Contract is upgradeable via DAO vote. Next upgrade: Q4 2025' },
    { key: 'com.twitter', value: '@company' },
    { key: 'com.github', value: 'company-dao' }
  ]);

  const handleSaveMetadata = () => {
    toast.success('Metadata updated successfully', {
      description: 'Changes have been written to the resolver'
    });
  };

  const handleAddRecord = () => {
    setTextRecords([...textRecords, { key: '', value: '' }]);
  };

  const handleRemoveRecord = (index: number) => {
    setTextRecords(textRecords.filter((_, i) => i !== index));
  };

  const updateRecord = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...textRecords];
    updated[index][field] = value;
    setTextRecords(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">Metadata Editor</h2>
          <p className="text-slate-600">Configure resolution records and contract metadata</p>
        </div>
        <Button onClick={handleSaveMetadata}>
          <Save className="h-4 w-4 mr-2" />
          Save All Changes
        </Button>
      </div>

      {/* Domain Selector */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label>Select Domain to Edit</Label>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company.eth">company.eth</SelectItem>
                <SelectItem value="app.company.eth">app.company.eth</SelectItem>
                <SelectItem value="dao.company.eth">dao.company.eth</SelectItem>
                <SelectItem value="vault.company.eth">vault.company.eth</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          For critical contract names, ensure all metadata is verified before publishing. Address changes should go through DAO governance approval.
        </AlertDescription>
      </Alert>

      {/* Metadata Tabs */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Records for {selectedDomain}</CardTitle>
          <CardDescription>Configure all resolution data</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="addresses">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="text">Text Records</TabsTrigger>
              <TabsTrigger value="content">Content Hash</TabsTrigger>
              <TabsTrigger value="abi">ABI</TabsTrigger>
            </TabsList>

            {/* Address Records */}
            <TabsContent value="addresses" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eth-address">Ethereum Address (ETH)</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="eth-address" 
                      placeholder="0x..." 
                      value="0x742d35Cc6634C0532925a3b844Bc9e7595f35a3"
                    />
                    <Button variant="outline" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-slate-600">
                    ⚠️ For upgradeable contracts, ensure this points to the proxy, not implementation
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="btc-address">Bitcoin Address (BTC)</Label>
                    <Input id="btc-address" placeholder="bc1..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sol-address">Solana Address (SOL)</Label>
                    <Input id="sol-address" placeholder="..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="polygon-address">Polygon Address</Label>
                    <Input id="polygon-address" placeholder="0x..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arbitrum-address">Arbitrum Address</Label>
                    <Input id="arbitrum-address" placeholder="0x..." />
                  </div>
                </div>

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
            </TabsContent>

            {/* Text Records */}
            <TabsContent value="text" className="space-y-4 mt-6">
              <div className="space-y-3">
                {textRecords.map((record, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-[200px_1fr_auto] items-start p-3 border rounded-lg bg-white">
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

              <Button variant="outline" onClick={handleAddRecord}>
                <Plus className="h-4 w-4 mr-2" />
                Add Text Record
              </Button>

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

            {/* Content Hash */}
            <TabsContent value="content" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="protocol">Content Protocol</Label>
                  <Select defaultValue="ipfs">
                    <SelectTrigger id="protocol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ipfs">IPFS</SelectItem>
                      <SelectItem value="ipns">IPNS</SelectItem>
                      <SelectItem value="swarm">Swarm</SelectItem>
                      <SelectItem value="arweave">Arweave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content-hash">Content Identifier (CID)</Label>
                  <Textarea 
                    id="content-hash" 
                    placeholder="QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
                    rows={3}
                  />
                  <p className="text-slate-600">Use for decentralized websites, dApp frontends, or ABI storage</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-slate-900">Large ABI Files</p>
                      <p className="text-slate-600">If your contract ABI is too large for on-chain storage, host it on IPFS and reference it via Content Hash</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABI */}
            <TabsContent value="abi" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="abi-storage">Storage Method</Label>
                  <Select defaultValue="onchain">
                    <SelectTrigger id="abi-storage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onchain">On-Chain (Direct)</SelectItem>
                      <SelectItem value="ipfs">IPFS (Content Hash)</SelectItem>
                      <SelectItem value="url">External URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="abi-json">Contract ABI (JSON)</Label>
                  <Textarea 
                    id="abi-json" 
                    placeholder='[{"inputs":[],"name":"method",...}]'
                    rows={8}
                    className="font-mono"
                  />
                </div>

                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Import from Etherscan
                </Button>

                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-emerald-900">Why Include ABI?</p>
                      <p className="text-emerald-800">The ABI record allows wallets and dApps to automatically discover how to interact with your contract, improving UX and security</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
