import { useState, useEffect } from 'react';
import { useWeb3 } from '../../lib/services';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Globe,
  Key,
  FileText,
  RefreshCw,
  Info,
  ExternalLink
} from 'lucide-react';
import { getENSStatus } from '../../lib/ens/ens-status-indicators'
import { normalize } from 'viem/ens';
import { namehash } from '../../lib/ens/ens-helpers';
import { PUBLIC_RESOLVER_ABI } from '../../lib/ens/ens-contracts';

interface DNSSECStatus {
  isConfigured: boolean;
  isVerified: boolean;
  resolverAddress?: string;
  txtRecord?: string;
  error?: string;
}

export function DNSSECConfig() {
  const { address, isConnected, publicClient, walletClient } = useWeb3();
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState<DNSSECStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [txtRecordValue, setTxtRecordValue] = useState('');
  const [dnsName, setDnsName] = useState('');

  const checkStatus = async () => {
    if (!domain || !publicClient) return;

    setLoading(true);
    setStatus(null);

    try {
      const normalizedName = normalize(domain);
      
      // Check if it's a .eth domain (DNSSEC only works for DNS names)
      if (normalizedName.endsWith('.eth')) {
        setStatus({
          isConfigured: false,
          isVerified: false,
          error: 'DNSSEC is only available for DNS names (e.g., example.com), not .eth domains'
        });
        setLoading(false);
        return;
      }

      const ensStatus = await getENSStatus(publicClient, normalizedName);
      
      if (!ensStatus.hasResolver) {
        setStatus({
          isConfigured: false,
          isVerified: false,
          error: 'No resolver configured for this domain'
        });
        setLoading(false);
        return;
      }

      // Try to read the DNSSEC text record
      let txtRecord = '';
      try {
        const node = namehash(normalizedName);
        const result = await publicClient.readContract({
          address: ensStatus.resolverAddress! as `0x${string}`,
          abi: PUBLIC_RESOLVER_ABI,
          functionName: 'text',
          args: [node, 'dnssec'],
        });
        txtRecord = result as string;
      } catch {
        // Record doesn't exist
      }

      setStatus({
        isConfigured: ensStatus.isDNSSEC || false,
        isVerified: ensStatus.isDNSSEC || false,
        resolverAddress: ensStatus.resolverAddress,
        txtRecord: txtRecord || undefined
      });

      // Generate the expected TXT record value
      if (normalizedName.includes('.')) {
        const parts = normalizedName.split('.');
        const _tld = parts[parts.length - 1];
        const subdomain = parts.slice(0, -1).join('.');
        setTxtRecordValue(`_ens.${subdomain}`);
        setDnsName(normalizedName);
      }

    } catch (error: any) {
      setStatus({
        isConfigured: false,
        isVerified: false,
        error: error.message || 'Failed to check DNSSEC status'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (domain && publicClient) {
      const timeout = setTimeout(() => {
        checkStatus();
      }, 500);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, publicClient]);

  const handleConfigureDNSSEC = async () => {
    if (!domain || !publicClient || !walletClient || !address) return;

    try {
      // This would typically involve setting a DNS TXT record
      // and then verifying it on-chain. For now, we'll show instructions.
      alert('DNSSEC configuration requires:\n1. Setting a DNS TXT record in your DNS provider\n2. Verifying the record on-chain\n\nSee the Configuration Guide tab for detailed instructions.');
    } catch (error: any) {
      console.error('Failed to configure DNSSEC:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-600" />
          DNSSEC Configuration
        </h2>
        <p className="text-slate-600 mt-1">
          Configure and verify DNSSEC (DNS Security Extensions) for ENS domains
        </p>
      </div>

      {/* Domain Input */}
      <Card className="border-2 border-slate-200/80 rounded-xl bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Domain Status Check</CardTitle>
          <CardDescription>Check DNSSEC configuration status for any domain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Domain Name</Label>
            <div className="flex gap-2">
              <Input
                id="domain"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={checkStatus} 
                disabled={!domain || loading || !isConnected}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Check Status
                  </>
                )}
              </Button>
            </div>
            {!isConnected && (
              <p className="text-sm text-amber-600">Connect your wallet to check DNSSEC status</p>
            )}
          </div>

          {/* Status Display */}
          {status && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-slate-50">
                {status.isVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : status.error ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {status.isVerified ? 'DNSSEC Verified' : status.error || 'DNSSEC Not Configured'}
                  </p>
                  {status.resolverAddress && (
                    <p className="text-sm text-slate-600 font-mono mt-1">
                      Resolver: {status.resolverAddress.slice(0, 10)}...{status.resolverAddress.slice(-8)}
                    </p>
                  )}
                </div>
                {status.isVerified && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <Shield className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>

              {status.txtRecord && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <p className="font-medium mb-1">Current DNSSEC Record:</p>
                    <code className="text-xs bg-white px-2 py-1 rounded block">{status.txtRecord}</code>
                  </AlertDescription>
                </Alert>
              )}

              {status.error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {status.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs defaultValue="guide" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="guide">Configuration Guide</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Configuration Guide */}
        <TabsContent value="guide" className="space-y-4 mt-4">
          <Card className="border-2 border-slate-200/80 rounded-xl bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>DNSSEC Configuration Guide</CardTitle>
              <CardDescription>Step-by-step instructions for configuring DNSSEC</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-2">Set DNS TXT Record</h4>
                    <p className="text-slate-600 mb-2">
                      In your DNS provider (e.g., Cloudflare, Route53, Google Domains), add a TXT record:
                    </p>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="text-xs font-mono text-slate-700">
                        <strong>Name:</strong> _ens.{dnsName || 'subdomain'}<br />
                        <strong>Type:</strong> TXT<br />
                        <strong>Value:</strong> {txtRecordValue || 'Your verification string'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-2">Wait for DNS Propagation</h4>
                    <p className="text-slate-600">
                      DNS changes can take up to 48 hours to propagate globally, though typically it's much faster (15 minutes to 1 hour).
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-2">Verify on ENS</h4>
                    <p className="text-slate-600 mb-2">
                      Once the DNS record is set, use the verification tool to claim your domain on ENS.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open('https://docs.ens.domains/dns-registrar-guide', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      View ENS Documentation
                    </Button>
                  </div>
                </div>
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Note:</strong> DNSSEC allows you to claim DNS names (like example.com) through ENS. 
                  This is different from .eth domains which are native to ENS.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification */}
        <TabsContent value="verification" className="space-y-4 mt-4">
          <Card className="border-2 border-slate-200/80 rounded-xl bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>DNSSEC Verification</CardTitle>
              <CardDescription>Verify DNSSEC configuration and test DNS records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Verification Status</Label>
                {status ? (
                  <div className="p-4 border rounded-lg bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">DNSSEC Status</span>
                      {status.isVerified ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Verified</Badge>
                      )}
                    </div>
                    {status.resolverAddress && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <p className="text-sm text-slate-600">
                          <strong>Resolver:</strong>{' '}
                          <code className="text-xs bg-white px-2 py-0.5 rounded">
                            {status.resolverAddress}
                          </code>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Enter a domain name above to check verification status</p>
                )}
              </div>

              <Button 
                onClick={handleConfigureDNSSEC}
                disabled={!domain || !isConnected}
                className="w-full gap-2"
              >
                <Key className="h-4 w-4" />
                Configure DNSSEC
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-4 mt-4">
          <Card className="border-2 border-slate-200/80 rounded-xl bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Advanced DNSSEC Settings</CardTitle>
              <CardDescription>Advanced configuration options and troubleshooting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">DNS Record Details</h4>
                  <p className="text-slate-600 text-sm mb-3">
                    The DNSSEC TXT record must be added to your DNS provider with the following format:
                  </p>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                    <div>
                      <strong className="text-xs text-slate-700">Record Name:</strong>
                      <code className="block text-xs font-mono mt-1 bg-white px-2 py-1 rounded">
                        _ens.{dnsName || 'yourdomain.com'}
                      </code>
                    </div>
                    <div>
                      <strong className="text-xs text-slate-700">Record Type:</strong>
                      <code className="block text-xs font-mono mt-1 bg-white px-2 py-1 rounded">
                        TXT
                      </code>
                    </div>
                    <div>
                      <strong className="text-xs text-slate-700">TTL:</strong>
                      <code className="block text-xs font-mono mt-1 bg-white px-2 py-1 rounded">
                        3600 (recommended)
                      </code>
                    </div>
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>EIP-4021:</strong> DNSSEC integration allows DNS name owners to claim their names 
                    on ENS through a verifiable proof. This enables traditional DNS names to function as ENS names.
                  </AlertDescription>
                </Alert>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Troubleshooting</h4>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <span className="text-purple-600">•</span>
                      <span>Ensure your DNS provider supports DNSSEC</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-purple-600">•</span>
                      <span>Wait for DNS propagation (can take up to 48 hours)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-purple-600">•</span>
                      <span>Verify the TXT record format is correct (no trailing spaces)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-purple-600">•</span>
                      <span>Check that your domain has a resolver configured</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

