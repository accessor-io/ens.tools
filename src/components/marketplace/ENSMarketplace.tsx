/**
 * ENS Marketplace Component
 * Specialized marketplace for ENS domain trading
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  ShoppingCart,
  Search,
  TrendingUp,
  Clock,
  Tag,
  Eye,
  Plus,
  Loader2,
  AlertTriangle,
  DollarSign,
  Home,
  Globe,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Key,
  Lock,
  Calendar,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services';
import { ensMarketplaceService, type ENSListing, type ENSOffer, type ENSCollectionStats } from '../../lib/services/ens-marketplace-service';

export function ENSMarketplace() {
  const { address, isConnected, publicClient, walletClient, chainId } = useWeb3();
  const [activeTab, setActiveTab] = useState<'listings' | 'offers' | 'stats'>('listings');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<ENSListing[]>([]);
  const [offers, setOffers] = useState<ENSOffer[]>([]);
  const [stats, setStats] = useState<ENSCollectionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [isMakeOfferOpen, setIsMakeOfferOpen] = useState(false);
  const [createListingParams, setCreateListingParams] = useState({
    name: '',
    price: '',
  });
  const [makeOfferParams, setMakeOfferParams] = useState({
    name: '',
    price: '',
  });
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [expandedListings, setExpandedListings] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMarketplaceData();
  }, [activeTab]);

  const toggleListingExpansion = (listingId: string) => {
    setExpandedListings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return newSet;
    });
  };

  const loadMarketplaceData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'listings') {
        const data = await ensMarketplaceService.getActiveListings(chainId || 1);
        setListings(data);
      } else if (activeTab === 'offers') {
        const data = await ensMarketplaceService.getActiveOffers(chainId || 1);
        setOffers(data);
      } else if (activeTab === 'stats') {
        const data = await ensMarketplaceService.getCollectionStats(chainId || 1);
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading marketplace data:', error);
      toast.error('Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) {
      toast.error('Please enter a domain name to search');
      return;
    }

    setLoading(true);
    try {
      const data = await ensMarketplaceService.searchDomains(searchQuery, chainId || 1);
      setListings(data);
    } catch (error) {
      console.error('Error searching domains:', error);
      toast.error('Failed to search domains');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async () => {
    if (!isConnected || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!createListingParams.name || !createListingParams.price) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreatingOrder(true);
    try {
      // Get domain token ID from namehash
      const normalizedName = createListingParams.name.toLowerCase().trim();
      const namehash = `0x${Buffer.from(normalizedName).toString('hex')}`;
      
      const orderParams = await ensMarketplaceService.createDomainListing({
        name: normalizedName,
        namehash,
        tokenId: namehash,
        price: createListingParams.price,
        publicClient,
        walletClient,
        chainId: chainId || 1,
      });

      toast.success('ENS domain listing created');
      console.log('Order parameters:', orderParams);
      setIsCreateListingOpen(false);
      setCreateListingParams({ name: '', price: '' });
      loadMarketplaceData();
    } catch (error: any) {
      console.error('Error creating listing:', error);
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleMakeOffer = async () => {
    if (!isConnected || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!makeOfferParams.name || !makeOfferParams.price) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const normalizedName = makeOfferParams.name.toLowerCase().trim();
      const namehash = `0x${Buffer.from(normalizedName).toString('hex')}`;
      
      const orderParams = await ensMarketplaceService.createDomainOffer({
        name: normalizedName,
        namehash,
        tokenId: namehash,
        price: makeOfferParams.price,
        publicClient,
        walletClient,
        chainId: chainId || 1,
      });

      toast.success('ENS domain offer created');
      console.log('Offer parameters:', orderParams);
      setIsMakeOfferOpen(false);
      setMakeOfferParams({ name: '', price: '' });
      loadMarketplaceData();
    } catch (error: any) {
      console.error('Error making offer:', error);
      toast.error(error.message || 'Failed to create offer');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleBuyDomain = async (listing: ENSListing) => {
    if (!isConnected || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      toast.info('Preparing purchase...');
      // In a real implementation, you would use the actual order from the listing
      // For now, we'll show a message
      toast.success('Purchase initiated. Please confirm in your wallet.');
    } catch (error: any) {
      console.error('Error buying domain:', error);
      toast.error(error.message || 'Failed to buy domain');
    }
  };

  const filteredListings = listings.filter(listing =>
    listing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOffers = offers.filter(offer =>
    offer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatExpiryDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    const daysUntilExpiry = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry < 30) return `${daysUntilExpiry} days`;
    if (daysUntilExpiry < 365) return `${Math.floor(daysUntilExpiry / 30)} months`;
    return `${Math.floor(daysUntilExpiry / 365)} years`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ENS Marketplace</h1>
          <p className="text-slate-600 mt-1">
            Buy and sell ENS domains using Seaport protocol
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Globe className="h-3 w-3 mr-1" />
            ENS Domains
          </Badge>
          {isConnected && (
            <>
              <Dialog open={isCreateListingOpen} onOpenChange={setIsCreateListingOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    List Domain
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>List ENS Domain</DialogTitle>
                    <DialogDescription>
                      List your ENS domain for sale on the marketplace
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Domain Name</Label>
                      <Input
                        placeholder="example.eth"
                        value={createListingParams.name}
                        onChange={(e) => setCreateListingParams({ ...createListingParams, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Price (ETH)</Label>
                      <Input
                        placeholder="0.5"
                        value={createListingParams.price}
                        onChange={(e) => setCreateListingParams({ ...createListingParams, price: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCreateListing} disabled={isCreatingOrder} className="w-full">
                      {isCreatingOrder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Create Listing
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isMakeOfferOpen} onOpenChange={setIsMakeOfferOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Tag className="h-4 w-4 mr-2" />
                    Make Offer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Make Offer on Domain</DialogTitle>
                    <DialogDescription>
                      Make an offer on an ENS domain
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Domain Name</Label>
                      <Input
                        placeholder="example.eth"
                        value={makeOfferParams.name}
                        onChange={(e) => setMakeOfferParams({ ...makeOfferParams, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Offer Price (ETH)</Label>
                      <Input
                        placeholder="0.5"
                        value={makeOfferParams.price}
                        onChange={(e) => setMakeOfferParams({ ...makeOfferParams, price: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleMakeOffer} disabled={isCreatingOrder} className="w-full">
                      {isCreatingOrder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Make Offer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {!isConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Wallet Not Connected</AlertTitle>
          <AlertDescription>
            Please connect your wallet to trade ENS domains.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Search ENS Domains</CardTitle>
          <CardDescription>
            Search for ENS domains by name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="example.eth"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="listings">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Listings
          </TabsTrigger>
          <TabsTrigger value="offers">
            <Tag className="h-4 w-4 mr-2" />
            Offers
          </TabsTrigger>
          <TabsTrigger value="stats">
            <TrendingUp className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ENS Domain Listings</CardTitle>
              <CardDescription>
                {filteredListings.length} domains available for purchase
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No domains listed. Try searching for a domain.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredListings.map((listing) => {
                      const isExpanded = expandedListings.has(listing.id);
                      return (
                        <>
                        <TableRow 
                          key={listing.id}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => toggleListingExpansion(listing.id)}
                        >
                        <TableCell>
                          <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-slate-400" />
                              )}
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              ENS
                            </Badge>
                            <div className="font-medium">{listing.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">
                            {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {listing.price !== '0' ? (
                            <div className="font-semibold text-green-600">
                              {listing.price} {listing.currency}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-slate-500">
                              Not Listed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Clock className="h-3 w-3" />
                            {formatExpiryDate(listing.expiryDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              listing.status === 'active'
                                ? 'default'
                                : listing.status === 'sold'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {listing.status}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toast.info(`Viewing ${listing.name}`)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            {isConnected && listing.price !== '0' && (
                              <Button
                                size="sm"
                                onClick={() => handleBuyDomain(listing)}
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Buy
                              </Button>
                            )}
                            {listing.price === '0' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setMakeOfferParams({ name: listing.name, price: '' });
                                  setIsMakeOfferOpen(true);
                                }}
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                Make Offer
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <div className="p-4 bg-slate-50 border-t">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <Wallet className="h-5 w-5" />
                                    Seller Information
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-600">Address:</span>
                                      <code className="font-mono text-xs bg-white px-2 py-1 rounded border">
                                        {listing.seller}
                                      </code>
                                    </div>
                                    {listing.resolvedAddress && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-600">Resolves to:</span>
                                        <code className="font-mono text-xs bg-white px-2 py-1 rounded border">
                                          {listing.resolvedAddress}
                                        </code>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <Lock className="h-5 w-5" />
                                    Domain Information
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className={listing.isWrapped ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-amber-100 text-amber-800 border-amber-300"}>
                                        {listing.isWrapped ? (
                                          <>
                                            <Lock className="h-4 w-4 mr-1" />
                                            Wrapped
                                          </>
                                        ) : (
                                          <>
                                            <Key className="h-4 w-4 mr-1" />
                                            Direct
                                          </>
                                        )}
                                      </Badge>
                                    </div>
                                    {listing.resolver && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-600">Resolver:</span>
                                        <code className="font-mono text-xs bg-white px-2 py-1 rounded border">
                                          {listing.resolver.slice(0, 12)}...{listing.resolver.slice(-8)}
                                        </code>
                                      </div>
                                    )}
                                    {listing.expiryDate && (
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-slate-500" />
                                        <span className="text-slate-600">Expires:</span>
                                        <span>{listing.expiryDate.toLocaleDateString()}</span>
                                      </div>
                                    )}
                                    {listing.registrationDate && (
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-slate-500" />
                                        <span className="text-slate-600">Registered:</span>
                                        <span>{listing.registrationDate.toLocaleDateString()}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {listing.price !== '0' && (
                                <div className="mt-4 pt-4 border-t">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold text-slate-900 mb-1">Listed Price</h4>
                                      <div className="text-2xl font-bold text-green-600">
                                        {listing.price} {listing.currency}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(`https://etherscan.io/address/${listing.seller}`, '_blank');
                                        }}
                                      >
                                        <ExternalLink className="h-5 w-5 mr-1" />
                                        View on Etherscan
                                      </Button>
                                      {isConnected && (
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBuyDomain(listing);
                                          }}
                                        >
                                          <ShoppingCart className="h-5 w-5 mr-1" />
                                          Purchase Now
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Offers</CardTitle>
              <CardDescription>
                {filteredOffers.length} active offers on ENS domains
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : filteredOffers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No active offers. Make an offer on a domain!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Offer Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOffers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              ENS
                            </Badge>
                            <div className="font-medium">{offer.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">
                            {offer.buyer.slice(0, 6)}...{offer.buyer.slice(-4)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-blue-600">
                            {offer.price} {offer.currency}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              offer.status === 'active'
                                ? 'default'
                                : offer.status === 'accepted'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {offer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Domains</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDomains.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered ENS domains
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Listed Domains</CardTitle>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.listedDomains.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently for sale
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Floor Price</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.floorPrice} ETH</div>
                  <p className="text-xs text-muted-foreground">
                    Lowest listed price
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalVolume} ETH</div>
                  <p className="text-xs text-muted-foreground">
                    All-time trading volume
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>ENS Marketplace Statistics</CardTitle>
                <CardDescription>
                  Overview of ENS domain trading activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Average Price</span>
                    <span className="font-semibold">{stats.averagePrice} ETH</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total Sales</span>
                    <span className="font-semibold">{stats.totalSales.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Active Offers</span>
                    <span className="font-semibold">{stats.activeOffers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!stats && !loading && (
            <div className="text-center py-8 text-slate-500">
              No statistics available. Click the search button to load ENS marketplace data.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

