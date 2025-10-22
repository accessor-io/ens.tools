import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { 
  Search, 
  Shield, 
  Lock,
  ExternalLink,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Wallet,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../lib/web3-provider';
import { 
  fetchENSNames, 
  getExpirationStatus, 
  getDaysUntilExpiration, 
  ENSDomain,
  formatAddress,
} from '../lib/ens-utils';
import { DomainProfile } from './DomainProfile';

export function DomainManagement() {
  const { address, isConnected, publicClient, chainId } = useWeb3();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<ENSDomain | null>(null);
  const [domains, setDomains] = useState<ENSDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      loadDomains();
    } else {
      setDomains([]);
    }
  }, [isConnected, address]);

  const loadDomains = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      const fetchedDomains = await fetchENSNames(address);
      setDomains(fetchedDomains);
      
      if (fetchedDomains.length > 0) {
        toast.success('Domains loaded successfully');
      } else {
        toast.info('No ENS names found for this address');
      }
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Failed to load domains');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDomains = domains.filter(domain =>
    domain.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const viewOnENSApp = (name: string) => {
    window.open(`https://app.ens.domains/${name}`, '_blank');
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-slate-900">Domain Management</h2>
          <p className="text-slate-600">Manage and configure your ENS domains</p>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <Wallet className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Connect Your Wallet</AlertTitle>
          <AlertDescription className="text-blue-800">
            Please connect your wallet to view and manage your ENS domains.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900">Domain Management</h2>
          <p className="text-slate-600">
            {isLoading ? 'Loading...' : `Managing ${domains.length} ENS name${domains.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={loadDomains} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search your ENS names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Names ({domains.length})</TabsTrigger>
          <TabsTrigger value="wrapped">
            Wrapped ({domains.filter(d => d.isWrapped).length})
          </TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring Soon ({domains.filter(d => {
              const days = getDaysUntilExpiration(d.expiryDate);
              return days !== null && days < 90 && days > 0;
            }).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {isLoading ? (
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filteredDomains.length > 0 ? (
            <Card className="border-2">
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Resolver</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDomains.map((domain, index) => {
                      const expirationStatus = getExpirationStatus(domain.expiryDate);
                      const daysUntilExpiry = getDaysUntilExpiration(domain.expiryDate);
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-blue-600" />
                              <div>
                                <p className="text-slate-900">{domain.name}</p>
                                {domain.labelName && (
                                  <p className="text-slate-600">Label: {domain.labelName}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {expirationStatus === 'active' && (
                              <Badge variant="default" className="bg-emerald-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            )}
                            {expirationStatus === 'expiring-soon' && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Expiring Soon
                              </Badge>
                            )}
                            {expirationStatus === 'expired' && (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Expired
                              </Badge>
                            )}
                            {expirationStatus === 'unknown' && (
                              <Badge variant="outline">Unknown</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {domain.expiryDate ? (
                              <div>
                                <p className="text-slate-900">
                                  {domain.expiryDate.toLocaleDateString()}
                                </p>
                                {daysUntilExpiry !== null && (
                                  <p className="text-slate-600">
                                    {daysUntilExpiry > 0 
                                      ? `${daysUntilExpiry} days left`
                                      : `Expired ${Math.abs(daysUntilExpiry)} days ago`
                                    }
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-600">No data</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {domain.isWrapped ? (
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                <Lock className="h-3 w-3 mr-1" />
                                Wrapped
                              </Badge>
                            ) : (
                              <Badge variant="outline">Standard</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {domain.resolver ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span className="text-slate-700">Set</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <span className="text-slate-600">None</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDomain(domain)}
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewOnENSApp(domain.name)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertTitle>No domains found</AlertTitle>
              <AlertDescription>
                {searchQuery 
                  ? 'No domains match your search query.'
                  : 'This address does not own any ENS names.'}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="wrapped">
          <Card className="border-2">
            <CardContent className="pt-6">
              {domains.filter(d => d.isWrapped).length > 0 ? (
                <div className="space-y-3">
                  {domains.filter(d => d.isWrapped).map((domain, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-slate-900">{domain.name}</p>
                          <p className="text-slate-600">Wrapped name with enhanced security</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDomain(domain)}
                      >
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>No wrapped names</AlertTitle>
                  <AlertDescription>
                    You don't have any wrapped ENS names. Wrapping provides enhanced security features.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card className="border-2">
            <CardContent className="pt-6">
              {domains.filter(d => {
                const days = getDaysUntilExpiration(d.expiryDate);
                return days !== null && days < 90 && days > 0;
              }).length > 0 ? (
                <div className="space-y-3">
                  {domains
                    .filter(d => {
                      const days = getDaysUntilExpiration(d.expiryDate);
                      return days !== null && days < 90 && days > 0;
                    })
                    .map((domain, index) => {
                      const daysUntilExpiry = getDaysUntilExpiration(domain.expiryDate);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg bg-amber-50"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-amber-600" />
                            <div>
                              <p className="text-slate-900">{domain.name}</p>
                              <p className="text-amber-700">
                                Expires in {daysUntilExpiry} days ({domain.expiryDate?.toLocaleDateString()})
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewOnENSApp(domain.name)}
                          >
                            Renew
                          </Button>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-900">All names are current</AlertTitle>
                  <AlertDescription className="text-emerald-800">
                    None of your ENS names are expiring in the next 90 days.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Domain Profile */}
      {selectedDomain && (
        <DomainProfile
          domain={selectedDomain}
          onClose={() => setSelectedDomain(null)}
          onUpdate={loadDomains}
        />
      )}
    </div>
  );
}
